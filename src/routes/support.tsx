import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/support")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Support & Aide — Sam Flash 2.0" },
      { name: "description", content: "Discutez en direct avec l'équipe support Sam Flash 2.0." },
      { property: "og:title", content: "Support & Aide — Sam Flash 2.0" },
      { property: "og:description", content: "Une question ? L'équipe support vous répond en direct." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SupportPage,
});

type Msg = {
  id: string;
  body: string | null;
  is_staff: boolean;
  created_at: string;
  attachment_url: string | null;
  attachment_type: string | null;
};

type Ticket = { id: string; subject: string; status: string; category: string; last_message_at: string };

const CATEGORIES = [
  ["general", "Question générale"],
  ["billing", "Paiement & abonnement"],
  ["technical", "Problème technique"],
  ["account", "Mon compte"],
] as const;

const STATUS_LABEL: Record<string, string> = { new: "Nouveau", open: "En cours", resolved: "Résolu" };

function SupportPage() {
  const { session, loading, user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("general");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  const loadTickets = async (uid: string) => {
    const { data } = await supabase
      .from("support_tickets")
      .select("id, subject, status, category, last_message_at")
      .eq("user_id", uid)
      .order("last_message_at", { ascending: false });
    setTickets((data ?? []) as Ticket[]);
    return (data ?? []) as Ticket[];
  };

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const list = await loadTickets(user.id);
      const open = list.find((t) => t.status !== "resolved");
      if (open) {
        setTicketId(open.id);
        setCategory(open.category);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!ticketId) {
      setMessages([]);
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("id, body, is_staff, created_at, attachment_url, attachment_type")
        .eq("ticket_id", ticketId)
        .order("created_at");
      setMessages((data ?? []) as Msg[]);
    })();
  }, [ticketId]);

  useEffect(() => {
    const missing = messages.filter((m) => m.attachment_url && !urls[m.attachment_url]);
    if (missing.length === 0) return;
    void (async () => {
      const next: Record<string, string> = {};
      for (const m of missing) {
        const { data } = await supabase.storage
          .from("support-attachments")
          .createSignedUrl(m.attachment_url!, 60 * 60);
        if (data?.signedUrl) next[m.attachment_url!] = data.signedUrl;
      }
      if (Object.keys(next).length) setUrls((u) => ({ ...u, ...next }));
    })();
  }, [messages, urls]);

  useEffect(() => {
    if (!ticketId) return;
    const channel = supabase
      .channel(`support-${ticketId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `ticket_id=eq.${ticketId}` },
        (payload) => setMessages((m) => [...m, payload.new as Msg]),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [ticketId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const ensureTicket = async () => {
    if (ticketId) return ticketId;
    if (!user) return null;
    const label = CATEGORIES.find((c) => c[0] === category)?.[1] ?? "Support";
    const { data, error } = await supabase
      .from("support_tickets")
      .insert({ user_id: user.id, subject: label, category })
      .select("id")
      .single();
    if (error) {
      toast.error("Impossible d'ouvrir la conversation.");
      return null;
    }
    setTicketId(data.id);
    return data.id;
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || sending) return;
    const body = text.trim().slice(0, 2000);
    if (!body && !file) return;
    setSending(true);
    try {
      const id = await ensureTicket();
      if (!id) return;

      let path: string | null = null;
      let type: string | null = null;
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error("Fichier trop lourd (max 10 Mo).");
          return;
        }
        const ext = file.name.split(".").pop() ?? "bin";
        path = `${user.id}/${id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("support-attachments")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) {
          toast.error(upErr.message);
          return;
        }
        type = file.type;
      }

      const { error } = await supabase.from("support_messages").insert({
        ticket_id: id,
        sender_id: user.id,
        is_staff: false,
        body: body || null,
        attachment_url: path,
        attachment_type: type,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      setText("");
      setFile(null);
      await supabase
        .from("support_tickets")
        .update({ last_message_at: new Date().toISOString(), status: "new" })
        .eq("id", id);
      await loadTickets(user.id);
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="flex min-h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/90 px-4 py-4 backdrop-blur">
        <Link to="/settings" aria-label="Retour" className="flex h-10 w-10 items-center justify-center">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Support & Aide</h1>
          <p className="text-xs text-muted-foreground">Réponse en général sous quelques minutes</p>
        </div>
      </header>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2">
        <button
          onClick={() => setTicketId(null)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm ${!ticketId ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"}`}
        >
          Nouvelle demande
        </button>
        {tickets.map((t) => (
          <button
            key={t.id}
            onClick={() => setTicketId(t.id)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm ${ticketId === t.id ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"}`}
          >
            {t.subject} · {STATUS_LABEL[t.status] ?? t.status}
          </button>
        ))}
      </div>

      {!ticketId ? (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2">
          {CATEGORIES.map(([v, label]) => (
            <button
              key={v}
              onClick={() => setCategory(v)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm ${category === v ? "bg-surface-2 text-foreground" : "bg-surface text-muted-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex-1 space-y-3 px-4 py-4">
        {messages.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Bonjour 👋 Choisissez une catégorie et décrivez votre problème, l'équipe vous répond ici.
          </p>
        ) : null}
        {messages.map((m) => (
          <div key={m.id} className={m.is_staff ? "flex" : "flex justify-end"}>
            <div
              className={`max-w-[80%] space-y-2 rounded-2xl px-4 py-2.5 text-base ${
                m.is_staff ? "bg-card text-card-foreground" : "bg-primary text-primary-foreground"
              }`}
            >
              {m.attachment_url && urls[m.attachment_url] ? (
                m.attachment_type?.startsWith("audio/") ? (
                  <audio controls src={urls[m.attachment_url]} className="w-56" />
                ) : (
                  <img src={urls[m.attachment_url]} alt="Pièce jointe" className="max-h-60 rounded-xl" />
                )
              ) : null}
              {m.body}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="sticky bottom-0 bg-background/95 p-3 backdrop-blur">
        {file ? (
          <div className="mb-2 flex items-center gap-2 px-2 text-xs text-muted-foreground">
            <Paperclip className="h-3.5 w-3.5" /> {file.name}
            <button type="button" onClick={() => setFile(null)} aria-label="Retirer">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
        <div className="grok-card flex items-center gap-2 p-2 pl-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,audio/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Joindre un fichier"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            placeholder="Écrivez votre message..."
            className="flex-1 bg-transparent py-2 text-base outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={sending}
            aria-label="Envoyer"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-60"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>
      </form>
    </main>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/support")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Support & Aide — Grok" },
      { name: "description", content: "Discutez en direct avec l'équipe support Grok." },
      { property: "og:title", content: "Support & Aide — Grok" },
      { property: "og:description", content: "Une question ? L'équipe support Grok vous répond." },
    ],
  }),
  component: SupportPage,
});

type Msg = {
  id: string;
  body: string | null;
  is_staff: boolean;
  created_at: string;
};

function SupportPage() {
  const { session, loading, user } = useAuth();
  const navigate = useNavigate();
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data: existing } = await supabase
        .from("support_tickets")
        .select("id")
        .eq("user_id", user.id)
        .neq("status", "resolved")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let id = existing?.id ?? null;
      if (!id) {
        const { data: created, error } = await supabase
          .from("support_tickets")
          .insert({ user_id: user.id, subject: "Support & Aide" })
          .select("id")
          .single();
        if (error) {
          toast.error("Impossible d'ouvrir la conversation.");
          return;
        }
        id = created.id;
      }
      setTicketId(id);
      const { data: msgs } = await supabase
        .from("support_messages")
        .select("id, body, is_staff, created_at")
        .eq("ticket_id", id)
        .order("created_at");
      setMessages((msgs ?? []) as Msg[]);
    })();
  }, [user]);

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

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim().slice(0, 2000);
    if (!body || !ticketId || !user) return;
    setText("");
    const { error } = await supabase
      .from("support_messages")
      .insert({ ticket_id: ticketId, sender_id: user.id, is_staff: false, body });
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase
      .from("support_tickets")
      .update({ last_message_at: new Date().toISOString(), status: "new" })
      .eq("id", ticketId);
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

      <div className="flex-1 space-y-3 px-4 py-4">
        {messages.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Bonjour 👋 Décrivez votre problème, l'équipe vous répond ici.
          </p>
        ) : null}
        {messages.map((m) => (
          <div key={m.id} className={m.is_staff ? "flex" : "flex justify-end"}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-base ${
                m.is_staff ? "bg-card text-card-foreground" : "bg-primary text-primary-foreground"
              }`}
            >
              {m.body}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="sticky bottom-0 bg-background/95 p-3 backdrop-blur">
        <div className="grok-card flex items-center gap-2 p-2 pl-4">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            placeholder="Écrivez votre message..."
            className="flex-1 bg-transparent py-2 text-base outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            aria-label="Envoyer"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>
      </form>
    </main>
  );
}

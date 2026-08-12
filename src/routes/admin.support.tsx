import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logAudit } from "@/lib/apiConfig";

export const Route = createFileRoute("/admin/support")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Support & Messagerie — Admin Grok" },
      { name: "description", content: "Helpdesk : répondez aux clients, assignez et clôturez les tickets." },
      { property: "og:title", content: "Support & Messagerie — Admin Grok" },
      { property: "og:description", content: "Inbox support en temps réel." },
    ],
  }),
  component: SupportDesk,
});

type Ticket = {
  id: string;
  subject: string;
  status: "new" | "open" | "resolved";
  user_id: string;
  assigned_to: string | null;
  last_message_at: string;
};

const STATUS_LABEL = { new: "Nouveau", open: "En cours", resolved: "Résolu" } as const;

function SupportDesk() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [filter, setFilter] = useState<"all" | Ticket["status"]>("all");

  const { data: tickets } = useQuery({
    queryKey: ["desk-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, subject, status, user_id, assigned_to, last_message_at")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Ticket[];
    },
  });

  const { data: canned } = useQuery({
    queryKey: ["canned"],
    queryFn: async () => {
      const { data, error } = await supabase.from("canned_responses").select("*").order("title");
      if (error) throw error;
      return data;
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["desk-messages", selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("id, body, is_staff, created_at")
        .eq("ticket_id", selected!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("desk")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages" }, () => {
        void qc.invalidateQueries({ queryKey: ["desk-messages"] });
        void qc.invalidateQueries({ queryKey: ["desk-tickets"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => {
        void qc.invalidateQueries({ queryKey: ["desk-tickets"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  const send = async () => {
    const body = text.trim().slice(0, 2000);
    if (!body || !selected || !user) return;
    setText("");
    const { error } = await supabase
      .from("support_messages")
      .insert({ ticket_id: selected, sender_id: user.id, is_staff: true, body });
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase
      .from("support_tickets")
      .update({ status: "open", last_message_at: new Date().toISOString() })
      .eq("id", selected);
    await qc.invalidateQueries({ queryKey: ["desk-messages", selected] });
  };

  const setStatus = async (id: string, status: Ticket["status"]) => {
    await supabase.from("support_tickets").update({ status }).eq("id", id);
    await logAudit("ticket.status", id, { status });
    await qc.invalidateQueries({ queryKey: ["desk-tickets"] });
  };

  const assignToMe = async (id: string) => {
    if (!user) return;
    await supabase.from("support_tickets").update({ assigned_to: user.id }).eq("id", id);
    await logAudit("ticket.assign", id, { to: user.id });
    await qc.invalidateQueries({ queryKey: ["desk-tickets"] });
    toast.success("Ticket assigné");
  };

  const list = (tickets ?? []).filter((t) => filter === "all" || t.status === filter);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Support & Messagerie</h1>

      <div className="flex gap-2">
        {(["all", "new", "open", "resolved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-sm ${filter === f ? "bg-primary text-primary-foreground" : "bg-surface"}`}
          >
            {f === "all" ? "Tous" : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="grok-card divide-y divide-border overflow-hidden">
          {list.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t.id)}
              className={`block w-full p-4 text-left ${selected === t.id ? "bg-surface" : ""}`}
            >
              <p className="font-medium">{t.subject}</p>
              <p className="text-xs text-muted-foreground">
                {STATUS_LABEL[t.status]} · {new Date(t.last_message_at).toLocaleString("fr-FR")}
              </p>
            </button>
          ))}
          {list.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Aucune conversation.</p> : null}
        </div>

        <div className="grok-card flex min-h-[420px] flex-col p-4">
          {!selected ? (
            <p className="m-auto text-muted-foreground">Sélectionnez une conversation</p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                <button onClick={() => void assignToMe(selected)} className="rounded-full bg-surface px-3 py-1.5 text-xs">
                  M'assigner
                </button>
                <button onClick={() => void setStatus(selected, "open")} className="rounded-full bg-surface px-3 py-1.5 text-xs">
                  En cours
                </button>
                <button
                  onClick={() => void setStatus(selected, "resolved")}
                  className="rounded-full bg-success/20 px-3 py-1.5 text-xs text-success"
                >
                  Marquer résolu
                </button>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto">
                {(messages ?? []).map((m) => (
                  <div key={m.id} className={m.is_staff ? "flex justify-end" : "flex"}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                        m.is_staff ? "bg-primary text-primary-foreground" : "bg-surface"
                      }`}
                    >
                      {m.body}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {(canned ?? []).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setText(c.body)}
                    className="rounded-full bg-surface px-3 py-1.5 text-xs text-muted-foreground"
                  >
                    {c.title}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={2000}
                  placeholder="Votre réponse..."
                  className="flex-1 rounded-full bg-surface px-4 py-3 text-sm outline-none"
                />
                <button
                  onClick={() => void send()}
                  className="rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
                >
                  Envoyer
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

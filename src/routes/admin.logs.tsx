import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/logs")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Journal d'audit — Admin Grok" },
      { name: "description", content: "Historique daté de toutes les actions de l'équipe." },
      { property: "og:title", content: "Journal d'audit — Admin Grok" },
      { property: "og:description", content: "Traçabilité complète des actions administratives." },
    ],
  }),
  component: Logs,
});

function Logs() {
  const { data } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, target, details, created_at, actor_id")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Journal d'audit</h1>
      <div className="grok-card divide-y divide-border">
        {(data ?? []).map((l) => (
          <div key={l.id} className="p-4">
            <p className="text-sm font-medium">{l.action}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(l.created_at).toLocaleString("fr-FR")} · cible : {l.target ?? "—"}
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-surface p-3 text-xs text-muted-foreground">
              {JSON.stringify(l.details, null, 2)}
            </pre>
          </div>
        ))}
        {(data ?? []).length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Aucune action enregistrée.</p>
        ) : null}
      </div>
    </div>
  );
}

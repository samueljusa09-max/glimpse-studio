import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/apiConfig";

export const Route = createFileRoute("/admin/users")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Utilisateurs & Quotas — Admin Grok" },
      { name: "description", content: "Recherchez les comptes, ajustez crédits et statuts." },
      { property: "og:title", content: "Utilisateurs & Quotas — Admin Grok" },
      { property: "og:description", content: "Gestion des comptes, crédits et sanctions." },
    ],
  }),
  component: UsersPage,
});

type Status = "active" | "suspended" | "banned";
const STATUS_LABEL: Record<Status, string> = { active: "Actif", suspended: "Suspendu", banned: "Banni" };

function UsersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | Status>("all");

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, username, credits, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const update = async (id: string, patch: { credits?: number; status?: Status }, action: string) => {
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit(action, id, patch);
    await qc.invalidateQueries({ queryKey: ["admin-users"] });
    toast.success("Compte mis à jour");
  };

  const list = (users ?? []).filter((u) => {
    const term = q.trim().toLowerCase();
    const match =
      !term ||
      [u.email, u.username, u.first_name, u.last_name].some((v) => v?.toLowerCase().includes(term));
    return match && (status === "all" || u.status === status);
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Utilisateurs & Quotas</h1>

      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={80}
          placeholder="Rechercher un e-mail, un nom…"
          className="min-w-56 flex-1 rounded-full bg-surface px-4 py-2.5 text-sm outline-none"
        />
        {(["all", "active", "suspended", "banned"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-4 py-2 text-sm ${status === s ? "bg-primary text-primary-foreground" : "bg-surface"}`}
          >
            {s === "all" ? "Tous" : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="grok-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="p-4">Utilisateur</th>
              <th className="p-4">Crédits</th>
              <th className="p-4">Statut</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-4">
                  <p className="font-medium">
                    {[u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || "Utilisateur"}
                  </p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </td>
                <td className="p-4">{u.credits}</td>
                <td className="p-4">{STATUS_LABEL[u.status as Status]}</td>
                <td className="space-x-2 p-4">
                  <button
                    onClick={() => void update(u.id, { credits: u.credits + 50 }, "user.credits.grant")}
                    className="rounded-full bg-surface px-3 py-1.5 text-xs"
                  >
                    +50 crédits
                  </button>
                  <button
                    onClick={() => void update(u.id, { credits: 0 }, "user.quota.reset")}
                    className="rounded-full bg-surface px-3 py-1.5 text-xs"
                  >
                    Réinitialiser
                  </button>
                  {u.status === "active" ? (
                    <button
                      onClick={() => void update(u.id, { status: "suspended" }, "user.suspend")}
                      className="rounded-full bg-warning/20 px-3 py-1.5 text-xs text-warning"
                    >
                      Suspendre
                    </button>
                  ) : (
                    <button
                      onClick={() => void update(u.id, { status: "active" }, "user.reactivate")}
                      className="rounded-full bg-success/20 px-3 py-1.5 text-xs text-success"
                    >
                      Réactiver
                    </button>
                  )}
                  <button
                    onClick={() => void update(u.id, { status: "banned" }, "user.ban")}
                    className="rounded-full bg-destructive/20 px-3 py-1.5 text-xs text-destructive"
                  >
                    Bannir
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  Aucun utilisateur.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

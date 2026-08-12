import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAudit, API_CONFIG } from "@/lib/apiConfig";
import type { AppRole } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin/team")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Équipe & Rôles — Admin Grok" },
      { name: "description", content: "Invitez des collaborateurs et gérez leurs permissions RBAC." },
      { property: "og:title", content: "Équipe & Rôles — Admin Grok" },
      { property: "og:description", content: "Quatre niveaux de permissions pour votre équipe." },
    ],
  }),
  component: Team,
});

const ROLES: { value: AppRole; label: string; desc: string }[] = [
  { value: "super_admin", label: "Super Admin", desc: "Accès total illimité" },
  { value: "support_operator", label: "Opérateur Support", desc: "Support & chat client uniquement" },
  { value: "content_manager", label: "Manager Contenu", desc: "Modération, galeries, utilisateurs" },
  { value: "accountant", label: "Comptable / Finances", desc: "Ventes, revenus et marges" },
];

function Team() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("support_operator");

  const { data: members } = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const [{ data: roleRows, error }, { data: profiles }] = await Promise.all([
        supabase.from("user_roles").select("id, user_id, role, created_at"),
        supabase.from("profiles").select("id, email, first_name, last_name"),
      ]);
      if (error) throw error;
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return (roleRows ?? []).map((r) => ({ ...r, profile: byId.get(r.user_id) ?? null }));
    },
  });

  const { data: invites } = useQuery({
    queryKey: ["invites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_invites")
        .select("id, email, role, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    const addr = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr) || addr.length > 255) {
      toast.error("Adresse e-mail invalide");
      return;
    }

    const { data: existing } = await supabase.from("profiles").select("id").eq("email", addr).maybeSingle();
    if (existing) {
      const { error } = await supabase.from("user_roles").insert({ user_id: existing.id, role });
      if (error) {
        toast.error(error.message);
        return;
      }
      await logAudit("team.role.grant", addr, { role });
      await qc.invalidateQueries({ queryKey: ["team"] });
      toast.success("Rôle attribué");
    } else {
      const { error } = await supabase.from("team_invites").insert({ email: addr, role });
      if (error) {
        toast.error(error.message);
        return;
      }
      await logAudit("team.invite", addr, { role });
      await qc.invalidateQueries({ queryKey: ["invites"] });
      toast.success("Invitation enregistrée : le rôle sera appliqué à l'inscription.");
    }
    setEmail("");
  };

  const revoke = async (id: string, target: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit("team.role.revoke", target);
    await qc.invalidateQueries({ queryKey: ["team"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Équipe & Rôles</h1>
        <p className="text-sm text-muted-foreground">
          Super Admin par défaut : {API_CONFIG.superAdminEmail}
        </p>
      </div>

      <form onSubmit={invite} className="grok-card flex flex-wrap items-end gap-3 p-5">
        <label className="min-w-56 flex-1">
          <span className="text-xs text-muted-foreground">E-mail du collaborateur</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={255}
            type="email"
            required
            className="mt-1 w-full rounded-lg bg-surface px-3 py-2.5 text-sm outline-none"
          />
        </label>
        <label>
          <span className="text-xs text-muted-foreground">Rôle</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as AppRole)}
            className="mt-1 w-full rounded-lg bg-surface px-3 py-2.5 text-sm outline-none"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">
          Inviter
        </button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ROLES.map((r) => (
          <div key={r.value} className="grok-card p-4">
            <p className="font-medium">{r.label}</p>
            <p className="text-xs text-muted-foreground">{r.desc}</p>
          </div>
        ))}
      </div>

      <div className="grok-card divide-y divide-border">
        {(members ?? []).map((m) => (
          <div key={m.id} className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium">
                {m.profile?.email ?? m.user_id}
              </p>
              <p className="text-xs text-muted-foreground">
                {ROLES.find((r) => r.value === m.role)?.label ?? m.role}
              </p>
            </div>
            <button
              onClick={() => void revoke(m.id, m.profile?.email ?? m.user_id)}
              className="rounded-full bg-destructive/20 px-3 py-1.5 text-xs text-destructive"
            >
              Retirer
            </button>
          </div>
        ))}
      </div>

      {(invites ?? []).length > 0 ? (
        <div className="grok-card divide-y divide-border">
          <p className="p-4 text-sm font-medium">Invitations en attente</p>
          {(invites ?? []).map((i) => (
            <div key={i.id} className="flex items-center justify-between p-4 text-sm">
              <span>{i.email}</span>
              <span className="text-xs text-muted-foreground">
                {ROLES.find((r) => r.value === i.role)?.label} · {i.status}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

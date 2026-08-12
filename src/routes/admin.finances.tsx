import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, logAudit } from "@/lib/apiConfig";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin/finances")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Finances & Tarifs — Admin Grok" },
      { name: "description", content: "Définissez les prix des abonnements et suivez les paiements." },
      { property: "og:title", content: "Finances & Tarifs — Admin Grok" },
      { property: "og:description", content: "Gestion des offres et des paiements Swychr." },
    ],
  }),
  component: Finances,
});

type Plan = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  currency: string;
  interval: string;
  msg_quota: number;
  image_quota: number;
  video_quota: number;
  is_active: boolean;
};

function Finances() {
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const canEdit = hasRole("super_admin", "accountant");

  const { data: plans } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").order("sort_order");
      if (error) throw error;
      return data as unknown as Plan[];
    },
  });

  const { data: payments } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, amount, currency, status, provider, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const save = async (plan: Plan) => {
    const { error } = await supabase
      .from("plans")
      .update({
        name: plan.name,
        description: plan.description,
        price: plan.price,
        currency: plan.currency,
        interval: plan.interval,
        msg_quota: plan.msg_quota,
        image_quota: plan.image_quota,
        video_quota: plan.video_quota,
        is_active: plan.is_active,
      })
      .eq("id", plan.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit("plan.update", plan.slug, { price: plan.price });
    await qc.invalidateQueries({ queryKey: ["admin-plans"] });
    toast.success("Offre mise à jour");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Finances & Tarifs</h1>
        <p className="text-sm text-muted-foreground">
          Les prix définis ici s'appliquent immédiatement côté client. Passerelle : Swychr.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {(plans ?? []).map((p) => (
          <PlanCard key={p.id} plan={p} onSave={save} disabled={!canEdit} />
        ))}
      </div>

      <div className="grok-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Montant</th>
              <th className="p-4">Passerelle</th>
              <th className="p-4">Statut</th>
            </tr>
          </thead>
          <tbody>
            {(payments ?? []).map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-4">{new Date(p.created_at).toLocaleString("fr-FR")}</td>
                <td className="p-4">{formatMoney(Number(p.amount), p.currency)}</td>
                <td className="p-4 capitalize">{p.provider}</td>
                <td className="p-4">{p.status}</td>
              </tr>
            ))}
            {(payments ?? []).length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  Aucun paiement pour le moment.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  onSave,
  disabled,
}: {
  plan: Plan;
  onSave: (p: Plan) => Promise<void>;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState<Plan>(plan);
  const set = <K extends keyof Plan>(k: K, v: Plan[K]) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div className="grok-card space-y-3 p-5">
      <input
        value={draft.name}
        onChange={(e) => set("name", e.target.value)}
        disabled={disabled}
        className="w-full bg-transparent text-xl font-semibold outline-none"
      />
      <textarea
        value={draft.description ?? ""}
        onChange={(e) => set("description", e.target.value)}
        disabled={disabled}
        rows={2}
        className="w-full rounded-xl bg-surface p-3 text-sm outline-none"
      />
      <div className="grid grid-cols-3 gap-3">
        <Field label="Prix" value={draft.price} onChange={(v) => set("price", Number(v))} disabled={disabled} />
        <Field label="Devise" value={draft.currency} onChange={(v) => set("currency", String(v))} disabled={disabled} />
        <Field label="Période" value={draft.interval} onChange={(v) => set("interval", String(v))} disabled={disabled} />
        <Field label="Messages" value={draft.msg_quota} onChange={(v) => set("msg_quota", Number(v))} disabled={disabled} />
        <Field label="Images" value={draft.image_quota} onChange={(v) => set("image_quota", Number(v))} disabled={disabled} />
        <Field label="Vidéos" value={draft.video_quota} onChange={(v) => set("video_quota", Number(v))} disabled={disabled} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.is_active}
          disabled={disabled}
          onChange={(e) => set("is_active", e.target.checked)}
        />
        Offre active
      </label>
      <button
        onClick={() => void onSave(draft)}
        disabled={disabled}
        className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50"
      >
        Enregistrer
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-sm outline-none"
      />
    </label>
  );
}

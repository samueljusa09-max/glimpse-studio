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
      { title: "Finances & Paiements — Admin Sam Flash 2.0" },
      { name: "description", content: "Définissez les prix, les pays, les moyens de paiement et suivez les transactions." },
      { property: "og:title", content: "Finances & Paiements — Admin Sam Flash 2.0" },
      { property: "og:description", content: "Gestion des offres, des passerelles et des paiements mobile money." },
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
  annual_price: number;
  currency: string;
  interval: string;
  msg_quota: number;
  image_quota: number;
  video_quota: number;
  is_active: boolean;
};

type Country = {
  code: string;
  name: string;
  flag: string;
  dial_code: string;
  currency: string;
  is_active: boolean;
};

type Method = {
  id: string;
  country_code: string;
  code: string;
  label: string;
  kind: string;
  is_active: boolean;
};

type Fees = { enabled: boolean; percent: number; fixed_usd: number };

const TABS = [
  ["plans", "Offres & Prix"],
  ["gateway", "Pays & Moyens"],
  ["payments", "Transactions"],
] as const;

function Finances() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("super_admin", "accountant");
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("plans");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Finances & Paiements</h1>
        <p className="text-sm text-muted-foreground">
          Les prix sont en USD et convertis automatiquement dans la devise locale du client au moment du paiement.
        </p>
      </div>

      <div className="pill flex w-fit p-1 text-sm">
        {TABS.map(([v, label]) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className={`rounded-full px-4 py-2 transition ${
              tab === v ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "plans" ? <PlansTab canEdit={canEdit} /> : null}
      {tab === "gateway" ? <GatewayTab canEdit={canEdit} /> : null}
      {tab === "payments" ? <PaymentsTab /> : null}
    </div>
  );
}

/* ---------------------------------- Offres --------------------------------- */

function PlansTab({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const { data: plans } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").order("sort_order");
      if (error) throw error;
      return data as unknown as Plan[];
    },
  });

  const save = async (plan: Plan) => {
    const { error } = await supabase
      .from("plans")
      .update({
        name: plan.name,
        description: plan.description,
        price: plan.price,
        annual_price: plan.annual_price,
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
    await logAudit("plan.update", plan.slug, { price: plan.price, annual: plan.annual_price });
    await qc.invalidateQueries({ queryKey: ["admin-plans"] });
    toast.success("Offre mise à jour — appliquée aux prochains paiements");
  };

  return (
    <div className="space-y-6">
      <FeesCard canEdit={canEdit} />
      <div className="grid gap-4 lg:grid-cols-2">
        {(plans ?? []).map((p) => (
          <PlanCard key={p.id} plan={p} onSave={save} disabled={!canEdit} />
        ))}
      </div>
    </div>
  );
}

function FeesCard({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["pay-fees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_settings").select("value").eq("key", "fees").maybeSingle();
      if (error) throw error;
      return ((data?.value ?? {}) as Partial<Fees>) as Fees;
    },
  });
  const [draft, setDraft] = useState<Fees | null>(null);
  const fees = draft ?? data ?? { enabled: false, percent: 0, fixed_usd: 0 };

  const save = async () => {
    const { error } = await supabase.from("payment_settings").update({ value: fees }).eq("key", "fees");
    if (error) return toast.error(error.message);
    await logAudit("payment.fees.update", "fees", fees as unknown as Record<string, unknown>);
    await qc.invalidateQueries({ queryKey: ["pay-fees"] });
    toast.success("Frais mis à jour");
  };

  return (
    <div className="grok-card space-y-3 p-5">
      <h2 className="font-semibold">Frais de service</h2>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={fees.enabled}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...fees, enabled: e.target.checked })}
        />
        Appliquer des frais au client
      </label>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Pourcentage (%)"
          value={fees.percent}
          disabled={!canEdit}
          onChange={(v) => setDraft({ ...fees, percent: Number(v) || 0 })}
        />
        <Field
          label="Fixe (USD)"
          value={fees.fixed_usd}
          disabled={!canEdit}
          onChange={(v) => setDraft({ ...fees, fixed_usd: Number(v) || 0 })}
        />
      </div>
      <button
        onClick={() => void save()}
        disabled={!canEdit}
        className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        Enregistrer les frais
      </button>
    </div>
  );
}

/* ---------------------------- Pays & moyens ------------------------------- */

function GatewayTab({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const { data: countries } = useQuery({
    queryKey: ["admin-pay-countries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_countries").select("*").order("sort_order");
      if (error) throw error;
      return data as unknown as Country[];
    },
  });
  const { data: methods } = useQuery({
    queryKey: ["admin-pay-methods"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_methods").select("*").order("sort_order");
      if (error) throw error;
      return data as unknown as Method[];
    },
  });

  const toggleCountry = async (c: Country) => {
    const { error } = await supabase
      .from("payment_countries")
      .update({ is_active: !c.is_active })
      .eq("code", c.code);
    if (error) return toast.error(error.message);
    await logAudit("payment.country.toggle", c.code, { active: !c.is_active });
    await qc.invalidateQueries({ queryKey: ["admin-pay-countries"] });
  };

  const toggleMethod = async (m: Method) => {
    const { error } = await supabase.from("payment_methods").update({ is_active: !m.is_active }).eq("id", m.id);
    if (error) return toast.error(error.message);
    await logAudit("payment.method.toggle", `${m.country_code}/${m.code}`, { active: !m.is_active });
    await qc.invalidateQueries({ queryKey: ["admin-pay-methods"] });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {(countries ?? []).map((c) => (
        <div key={c.code} className="grok-card space-y-3 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold">
                {c.flag} {c.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {c.dial_code} · {c.currency}
              </p>
            </div>
            <button
              onClick={() => void toggleCountry(c)}
              disabled={!canEdit}
              className={`rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-50 ${
                c.is_active ? "bg-success/20 text-success" : "bg-surface text-muted-foreground"
              }`}
            >
              {c.is_active ? "Actif" : "Inactif"}
            </button>
          </div>
          <div className="space-y-2">
            {(methods ?? [])
              .filter((m) => m.country_code === c.code)
              .map((m) => (
                <label key={m.id} className="flex items-center justify-between rounded-xl bg-surface px-3 py-2 text-sm">
                  <span>
                    {m.label} <span className="text-xs text-muted-foreground">({m.kind})</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={m.is_active}
                    disabled={!canEdit}
                    onChange={() => void toggleMethod(m)}
                  />
                </label>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ Transactions ------------------------------ */

function PaymentsTab() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const { data: payments } = useQuery({
    queryKey: ["admin-payments", status],
    queryFn: async () => {
      let req = supabase
        .from("payments")
        .select(
          "id, reference, amount, currency, original_amount_usd, exchange_rate, status, provider, payment_method, country_code, created_at, paid_at, error_message, plan_name",
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (status !== "all") req = req.eq("status", status);
      const { data, error } = await req;
      if (error) throw error;
      return data;
    },
  });

  const rows = (payments ?? []).filter((p) =>
    q ? `${p.reference ?? ""} ${p.plan_name ?? ""} ${p.country_code ?? ""}`.toLowerCase().includes(q.toLowerCase()) : true,
  );

  const paid = (payments ?? []).filter((p) => p.status === "paid");
  const revenueUsd = paid.reduce((s, p) => s + Number(p.original_amount_usd ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Transactions" value={String((payments ?? []).length)} />
        <Stat label="Payées" value={String(paid.length)} />
        <Stat label="Revenus (USD)" value={formatMoney(revenueUsd, "USD")} />
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une référence…"
          className="flex-1 rounded-xl bg-surface px-4 py-2.5 text-sm outline-none"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl bg-surface px-4 py-2.5 text-sm outline-none"
        >
          {["all", "pending", "paid", "failed", "cancelled", "expired"].map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "Tous les statuts" : s}
            </option>
          ))}
        </select>
      </div>

      <div className="grok-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Référence</th>
              <th className="p-4">Offre</th>
              <th className="p-4">Montant local</th>
              <th className="p-4">USD</th>
              <th className="p-4">Moyen</th>
              <th className="p-4">Statut</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-border align-top">
                <td className="p-4 whitespace-nowrap">{new Date(p.created_at).toLocaleString("fr-FR")}</td>
                <td className="p-4 font-mono text-xs">{p.reference}</td>
                <td className="p-4">{p.plan_name ?? "—"}</td>
                <td className="p-4 whitespace-nowrap">{formatMoney(Number(p.amount), p.currency)}</td>
                <td className="p-4 whitespace-nowrap">{formatMoney(Number(p.original_amount_usd ?? 0), "USD")}</td>
                <td className="p-4">
                  {p.country_code ?? "—"} · {p.payment_method ?? p.provider}
                </td>
                <td className="p-4">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs ${
                      p.status === "paid"
                        ? "bg-success/20 text-success"
                        : p.status === "pending"
                          ? "bg-surface text-muted-foreground"
                          : "bg-destructive/20 text-destructive"
                    }`}
                  >
                    {p.status}
                  </span>
                  {p.error_message ? (
                    <span className="mt-1 block max-w-[220px] text-xs text-muted-foreground">{p.error_message}</span>
                  ) : null}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  Aucune transaction.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="grok-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

/* -------------------------------- Composants ------------------------------ */

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
        <Field label="Prix / mois" value={draft.price} onChange={(v) => set("price", Number(v))} disabled={disabled} />
        <Field
          label="Prix / an"
          value={draft.annual_price}
          onChange={(v) => set("annual_price", Number(v))}
          disabled={disabled}
        />
        <Field label="Devise" value={draft.currency} onChange={(v) => set("currency", String(v))} disabled={disabled} />
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

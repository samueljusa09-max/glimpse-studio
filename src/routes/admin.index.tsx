import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/apiConfig";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Vue d'ensemble — Admin Grok" },
      { name: "description", content: "Statistiques, revenus, coûts API et marge nette." },
      { property: "og:title", content: "Vue d'ensemble — Admin Grok" },
      { property: "og:description", content: "Pilotage des revenus et de la marge." },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [users, payments, usage, tickets] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("payments").select("amount, currency, status, created_at"),
        supabase.from("usage_events").select("api_cost, created_at, kind"),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).neq("status", "resolved"),
      ]);
      const paid = (payments.data ?? []).filter((p) => p.status === "paid");
      const revenue = paid.reduce((s, p) => s + Number(p.amount), 0);
      const cost = (usage.data ?? []).reduce((s, u) => s + Number(u.api_cost), 0);

      const byDay = new Map<string, { day: string; revenu: number; cout: number }>();
      const key = (d: string) => new Date(d).toISOString().slice(5, 10);
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(5, 10);
        byDay.set(d, { day: d, revenu: 0, cout: 0 });
      }
      paid.forEach((p) => {
        const row = byDay.get(key(p.created_at));
        if (row) row.revenu += Number(p.amount);
      });
      (usage.data ?? []).forEach((u) => {
        const row = byDay.get(key(u.created_at));
        if (row) row.cout += Number(u.api_cost);
      });

      return {
        users: users.count ?? 0,
        openTickets: tickets.count ?? 0,
        revenue,
        cost,
        margin: revenue - cost,
        series: [...byDay.values()],
      };
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Vue d'ensemble</h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Utilisateurs" value={String(data?.users ?? 0)} />
        <Stat label="Chiffre d'affaires" value={formatMoney(data?.revenue ?? 0)} />
        <Stat label="Coûts API" value={formatMoney(data?.cost ?? 0)} />
        <Stat
          label="Marge nette"
          value={formatMoney(data?.margin ?? 0)}
          tone={(data?.margin ?? 0) >= 0 ? "success" : "destructive"}
        />
      </div>

      <div className="grok-card p-4">
        <p className="mb-4 font-medium">Revenus vs coûts API — 14 derniers jours</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.series ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
              />
              <Area type="monotone" dataKey="revenu" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.25} />
              <Area type="monotone" dataKey="cout" stroke="var(--chart-4)" fill="var(--chart-4)" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grok-card p-4">
        <p className="text-muted-foreground">
          Conversations support ouvertes : <span className="text-foreground">{data?.openTickets ?? 0}</span>
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "destructive" }) {
  return (
    <div className="grok-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={`mt-2 text-2xl font-semibold ${
          tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

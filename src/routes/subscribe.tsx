import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatMoney } from "@/lib/apiConfig";
import { createSwychrCheckout } from "@/lib/payments.functions";

export const Route = createFileRoute("/subscribe")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "S'abonner à SuperGrok — Grok" },
      { name: "description", content: "Choisissez votre formule SuperGrok et payez en toute sécurité via Swychr." },
      { property: "og:title", content: "S'abonner à SuperGrok" },
      { property: "og:description", content: "SuperGrok, Plus et Heavy : créez sans limites." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Subscribe,
});

function Subscribe() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState<string | null>(null);
  const [cycle, setCycle] = useState<"month" | "year">("month");
  const checkout = useServerFn(createSwychrCheckout);

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  const { data: plans } = useQuery({
    queryKey: ["plans", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const subscribe = async (planId: string) => {
    setPending(planId);
    try {
      const res = await checkout({
        data: { planId, cycle, returnUrl: `${window.location.origin}/subscribe` },
      });
      if (res.ok && res.url) {
        window.location.href = res.url;
        return;
      }
      toast.info(res.message ?? "Commande enregistrée.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Paiement indisponible");
    } finally {
      setPending(null);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-background pb-16">
      <header className="flex items-center gap-3 px-4 py-4">
        <Link to="/settings" aria-label="Retour" className="flex h-10 w-10 items-center justify-center">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="flex-1 text-center text-xl font-semibold">Abonnements</h1>
        <div className="h-10 w-10" />
      </header>

      <div className="px-4">
        <div className="pill mx-auto flex w-fit p-1 text-sm">
          {(
            [
              ["month", "Mensuel"],
              ["year", "Annuel"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setCycle(v)}
              className={`rounded-full px-6 py-2 transition ${
                cycle === v ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-4 px-4">
        {(plans ?? []).map((p) => {
          const annual = Number(p.annual_price) > 0;
          const price = cycle === "year" && annual ? Number(p.annual_price) : Number(p.price);
          const suffix = cycle === "year" && annual ? "/an" : "/mois";
          return (
            <div key={p.id} className="grok-card overflow-hidden p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-semibold">{p.name}</h2>
                    {p.badge ? (
                      <span className="supergrok-banner rounded-full px-2.5 py-0.5 text-xs font-semibold text-brand-foreground">
                        {p.badge}
                      </span>
                    ) : null}
                  </div>
                  {p.tagline ? <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p> : null}
                </div>
                <p className="shrink-0 text-right text-xl font-semibold">
                  {formatMoney(price, p.currency)}
                  <span className="block text-xs font-normal text-muted-foreground">{suffix}</span>
                </p>
              </div>

              <ul className="mt-4 space-y-2">
                {(Array.isArray(p.features) ? (p.features as string[]) : []).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {f}
                  </li>
                ))}
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  {p.msg_quota} messages · {p.image_quota} images · {p.video_quota} vidéos / mois
                </li>
              </ul>

              <button
                onClick={() => void subscribe(p.id)}
                disabled={pending === p.id}
                className="supergrok-banner mt-5 w-full rounded-full py-3.5 font-semibold text-brand-foreground disabled:opacity-60"
              >
                {pending === p.id ? "Redirection…" : p.cta_label}
              </button>
              {p.trial_days > 0 ? (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {p.trial_days} jours d'essai, annulable à tout moment.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="mt-6 px-6 text-center text-xs text-muted-foreground">
        Paiement sécurisé via Swychr. Les prix sont définis depuis le bureau d'administration.
      </p>
    </main>
  );
}

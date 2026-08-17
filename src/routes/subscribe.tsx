import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, Loader2, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatMoney } from "@/lib/apiConfig";
import { createCheckout, getPaymentQuote } from "@/lib/payments.functions";

export const Route = createFileRoute("/subscribe")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "S'abonner à Sam Flash 2.0" },
      {
        name: "description",
        content: "Choisissez votre formule Sam Flash 2.0 et payez par mobile money en toute sécurité.",
      },
      { property: "og:title", content: "S'abonner à Sam Flash 2.0" },
      { property: "og:description", content: "Formules Sam Flash : créez images et vidéos sans limites." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Subscribe,
});

type Country = {
  code: string;
  name: string;
  flag: string;
  dial_code: string;
  currency: string;
};

type Method = {
  code: string;
  label: string;
  kind: string;
  country_code: string;
};

function Subscribe() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [cycle, setCycle] = useState<"month" | "year">("month");
  const [planId, setPlanId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  const { data: plans } = useQuery({
    queryKey: ["plans", "active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const plan = (plans ?? []).find((p) => p.id === planId) ?? null;

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
                onClick={() => setPlanId(p.id)}
                className="supergrok-banner mt-5 w-full rounded-full py-3.5 font-semibold text-brand-foreground"
              >
                {p.cta_label}
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
        Paiement mobile money sécurisé. Le montant exact est calculé par nos serveurs dans votre devise locale.
      </p>

      {plan ? (
        <CheckoutSheet
          planId={plan.id}
          planName={plan.name}
          cycle={cycle}
          onClose={() => setPlanId(null)}
        />
      ) : null}
    </main>
  );
}

function CheckoutSheet({
  planId,
  planName,
  cycle,
  onClose,
}: {
  planId: string;
  planName: string;
  cycle: "month" | "year";
  onClose: () => void;
}) {
  const quoteFn = useServerFn(getPaymentQuote);
  const checkoutFn = useServerFn(createCheckout);

  const [countryCode, setCountryCode] = useState<string>("");
  const [methodCode, setMethodCode] = useState<string>("");
  const [localNumber, setLocalNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: countries } = useQuery({
    queryKey: ["pay-countries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_countries")
        .select("code, name, flag, dial_code, currency")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as Country[];
    },
  });

  useEffect(() => {
    if (!countryCode && countries?.length) setCountryCode(countries[0]!.code);
  }, [countries, countryCode]);

  const { data: methods } = useQuery({
    queryKey: ["pay-methods", countryCode],
    enabled: !!countryCode,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("code, label, kind, country_code")
        .eq("country_code", countryCode)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as Method[];
    },
  });

  useEffect(() => {
    if (methods?.length) setMethodCode((m) => (methods.some((x) => x.code === m) ? m : methods[0]!.code));
    else setMethodCode("");
  }, [methods]);

  const country = useMemo(() => countries?.find((c) => c.code === countryCode) ?? null, [countries, countryCode]);

  const {
    data: quote,
    isFetching: quoteLoading,
    error: quoteError,
  } = useQuery({
    queryKey: ["pay-quote", planId, cycle, countryCode],
    enabled: !!countryCode,
    retry: false,
    staleTime: 60_000,
    queryFn: () => quoteFn({ data: { planId, cycle, countryCode } }),
  });

  const digits = localNumber.replace(/\D/g, "");
  const fullNumber = country ? `${country.dial_code.replace("+", "")}${digits.replace(/^0+/, "")}` : digits;
  const numberValid = digits.length >= 8 && digits.length <= 12;

  const submit = async () => {
    if (!numberValid || !methodCode || !country) return;
    setSubmitting(true);
    try {
      const res = await checkoutFn({
        data: {
          planId,
          cycle,
          countryCode: country.code,
          methodCode,
          mobileNumber: fullNumber,
          returnUrl: `${window.location.origin}/payment-status`,
        },
      });
      if (res.ok && res.url) {
        sessionStorage.setItem("sf_last_ref", res.reference);
        window.location.href = res.url;
        return;
      }
      toast.error("Lien de paiement indisponible, réessayez.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Paiement indisponible");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70" role="dialog" aria-modal="true">
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-surface p-5 pb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Paiement — {planName}</h2>
          <button onClick={onClose} aria-label="Fermer" className="rounded-full p-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="block text-sm">
          <span className="text-muted-foreground">Pays</span>
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="mt-1 w-full rounded-xl bg-background px-3 py-3 text-base outline-none"
          >
            {(countries ?? []).map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name} ({c.currency})
              </option>
            ))}
          </select>
        </label>

        <div className="mt-4">
          <span className="text-sm text-muted-foreground">Moyen de paiement</span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(methods ?? []).map((m) => (
              <button
                key={m.code}
                onClick={() => setMethodCode(m.code)}
                className={`rounded-xl px-3 py-3 text-sm transition ${
                  methodCode === m.code
                    ? "bg-primary font-semibold text-primary-foreground"
                    : "bg-background text-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
            {(methods ?? []).length === 0 ? (
              <p className="col-span-2 text-sm text-muted-foreground">
                Aucun moyen de paiement disponible pour ce pays.
              </p>
            ) : null}
          </div>
        </div>

        <label className="mt-4 block text-sm">
          <span className="text-muted-foreground">Numéro mobile money</span>
          <div className="mt-1 flex items-center gap-2 rounded-xl bg-background px-3">
            <span className="text-base text-muted-foreground">{country?.dial_code ?? "+"}</span>
            <input
              value={localNumber}
              onChange={(e) => setLocalNumber(e.target.value.replace(/[^\d\s]/g, "").slice(0, 15))}
              inputMode="numeric"
              placeholder="812345678"
              className="w-full bg-transparent py-3 text-base outline-none"
            />
          </div>
          {localNumber && !numberValid ? (
            <span className="mt-1 block text-xs text-destructive">Numéro invalide.</span>
          ) : null}
        </label>

        <div className="mt-5 rounded-2xl bg-background p-4 text-sm">
          {quoteLoading ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Calcul du montant…
            </p>
          ) : quoteError ? (
            <p className="text-destructive">
              {quoteError instanceof Error ? quoteError.message : "Montant indisponible."}
            </p>
          ) : quote ? (
            <>
              <Row label="Offre" value={`${quote.planName} (${quote.cycle === "year" ? "annuel" : "mensuel"})`} />
              <Row label="Prix" value={formatMoney(quote.amountUsd, "USD")} />
              {quote.feeUsd > 0 ? <Row label="Frais" value={formatMoney(quote.feeUsd, "USD")} /> : null}
              <Row label="Taux" value={`1 USD = ${quote.rate.toLocaleString("fr-FR")} ${quote.currency}`} />
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
                <span>Total à payer</span>
                <span>{formatMoney(quote.convertedAmount, quote.currency)}</span>
              </div>
            </>
          ) : null}
        </div>

        <button
          onClick={() => void submit()}
          disabled={submitting || !quote || !numberValid || !methodCode}
          className="supergrok-banner mt-5 w-full rounded-full py-3.5 font-semibold text-brand-foreground disabled:opacity-50"
        >
          {submitting ? "Ouverture du paiement…" : "Payer maintenant"}
        </button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> Montant calculé et vérifié côté serveur.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

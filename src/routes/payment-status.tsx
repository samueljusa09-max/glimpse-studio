import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { formatMoney } from "@/lib/apiConfig";
import { checkPaymentStatus } from "@/lib/payments.functions";

export const Route = createFileRoute("/payment-status")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Statut du paiement — Sam Flash 2.0" },
      { name: "description", content: "Suivi en temps réel de la confirmation de votre paiement Sam Flash 2.0." },
      { property: "og:title", content: "Statut du paiement — Sam Flash 2.0" },
      { property: "og:description", content: "Confirmation sécurisée de votre abonnement Sam Flash 2.0." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentStatus,
});

type State = {
  status: string;
  amount: number;
  currency: string;
  planName: string | null;
};

function PaymentStatus() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const check = useServerFn(checkPaymentStatus);
  const [reference, setReference] = useState<string | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const ref =
      url.searchParams.get("ref") ??
      url.searchParams.get("transaction_id") ??
      sessionStorage.getItem("sf_last_ref");
    setReference(ref);
  }, []);

  useEffect(() => {
    if (!reference || !session) return;
    let cancelled = false;

    const poll = async (n: number) => {
      try {
        const res = await check({ data: { reference } });
        if (cancelled) return;
        setState(res);
        setAttempts(n);
        if (res.status === "pending" && n < 40) {
          timer.current = setTimeout(() => void poll(n + 1), n < 10 ? 3000 : 6000);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Vérification impossible.");
      }
    };

    void poll(0);
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [reference, session, check]);

  const status = state?.status ?? "pending";
  const done = status === "paid";
  const failed = status === "failed" || status === "cancelled" || status === "expired";

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 text-center">
      {!reference ? (
        <>
          <Clock className="h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-semibold">Aucune transaction à suivre</h1>
          <p className="mt-2 text-sm text-muted-foreground">Lancez un abonnement pour démarrer un paiement.</p>
        </>
      ) : error ? (
        <>
          <XCircle className="h-14 w-14 text-destructive" />
          <h1 className="mt-4 text-xl font-semibold">Vérification impossible</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </>
      ) : done ? (
        <>
          <CheckCircle2 className="h-16 w-16 text-success" />
          <h1 className="mt-4 text-2xl font-semibold">Paiement confirmé</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {state?.planName ? `${state.planName} — ` : ""}
            {state ? formatMoney(state.amount, state.currency) : null}. Votre abonnement est actif.
          </p>
        </>
      ) : failed ? (
        <>
          <XCircle className="h-16 w-16 text-destructive" />
          <h1 className="mt-4 text-2xl font-semibold">
            {status === "cancelled" ? "Paiement annulé" : status === "expired" ? "Paiement expiré" : "Paiement échoué"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Aucun abonnement n'a été activé. Vous pouvez réessayer avec un autre moyen de paiement.
          </p>
        </>
      ) : (
        <>
          <Loader2 className="h-14 w-14 animate-spin text-primary" />
          <h1 className="mt-4 text-xl font-semibold">Paiement en cours de confirmation</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Validez la demande sur votre téléphone. Cette page se met à jour automatiquement.
          </p>
          {attempts >= 40 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              La confirmation prend plus de temps que prévu. Contactez le support avec la référence ci-dessous.
            </p>
          ) : null}
        </>
      )}

      {reference ? <p className="mt-6 text-xs text-muted-foreground">Référence : {reference}</p> : null}

      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <Link
          to="/subscribe"
          className="rounded-full bg-surface py-3 font-medium"
        >
          {failed ? "Réessayer" : "Voir les offres"}
        </Link>
        <Link to="/" className="rounded-full bg-primary py-3 font-semibold text-primary-foreground">
          Retour à l'accueil
        </Link>
      </div>
    </main>
  );
}

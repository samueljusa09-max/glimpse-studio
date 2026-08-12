import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatMoney } from "@/lib/apiConfig";

export const Route = createFileRoute("/subscribe")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "S'abonner à SuperGrok — Grok" },
      { name: "description", content: "Choisissez votre formule SuperGrok et débloquez images et vidéos." },
      { property: "og:title", content: "S'abonner à SuperGrok" },
      { property: "og:description", content: "Formules Standard et Pro pour créer sans limites." },
    ],
  }),
  component: Subscribe,
});

function Subscribe() {
  const { session, loading, user } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  const { data: plans } = useQuery({
    queryKey: ["plans"],
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

  const subscribe = async (planId: string, amount: number, currency: string) => {
    if (!user) return;
    setPending(planId);
    // Paiement Swychr : point d'intégration (voir /api/public/payments/swychr/create)
    const { error } = await supabase.from("payments").insert({
      user_id: user.id,
      plan_id: planId,
      amount,
      currency,
      provider: "swychr",
      status: "pending",
    });
    setPending(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Commande créée. Le paiement Swychr sera branché ici.");
  };

  return (
    <main className="min-h-[100dvh] bg-background pb-16">
      <header className="flex items-center gap-3 px-4 py-4">
        <Link to="/settings" aria-label="Retour" className="flex h-10 w-10 items-center justify-center">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="flex-1 text-center text-xl font-semibold">SuperGrok</h1>
        <div className="h-10 w-10" />
      </header>

      <div className="space-y-4 px-4">
        {(plans ?? []).map((p) => (
          <div key={p.id} className="grok-card p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl font-semibold">{p.name}</h2>
              <p className="text-xl font-semibold">
                {formatMoney(Number(p.price), p.currency)}
                <span className="text-sm text-muted-foreground">/{p.interval === "month" ? "mois" : p.interval}</span>
              </p>
            </div>
            <p className="mt-1 text-muted-foreground">{p.description}</p>
            <ul className="mt-4 space-y-2">
              {(Array.isArray(p.features) ? (p.features as string[]) : []).map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success" /> {f}
                </li>
              ))}
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                {p.msg_quota} messages · {p.image_quota} images · {p.video_quota} vidéos / mois
              </li>
            </ul>
            <button
              onClick={() => void subscribe(p.id, Number(p.price), p.currency)}
              disabled={pending === p.id}
              className="supergrok-banner mt-5 w-full rounded-full py-3.5 font-semibold text-brand-foreground disabled:opacity-60"
            >
              S'abonner
            </button>
          </div>
        ))}
      </div>

      <p className="mt-6 px-6 text-center text-xs text-muted-foreground">
        Paiement sécurisé via Swychr (intégration à venir). Les prix sont définis depuis le bureau
        d'administration.
      </p>
    </main>
  );
}

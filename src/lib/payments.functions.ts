import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({
  planId: z.string().uuid(),
  cycle: z.enum(["month", "year"]),
  returnUrl: z.string().url(),
});

type SwychrToken = { auth_token?: string; token?: string; data?: { auth_token?: string; token?: string } };

async function swychrToken(base: string, email: string, password: string) {
  const res = await fetch(`${base}/api/admin/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Swychr auth: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as SwychrToken;
  const token = json.auth_token ?? json.token ?? json.data?.auth_token ?? json.data?.token;
  if (!token) throw new Error("Swychr: jeton d'authentification introuvable");
  return token;
}

/** Crée un lien de paiement Swychr et enregistre la commande en base. */
export const createSwychrCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => input.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: plan, error } = await supabase
      .from("plans")
      .select("*")
      .eq("id", data.planId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!plan) throw new Error("Offre introuvable");

    const amount =
      data.cycle === "year" && Number(plan.annual_price) > 0 ? Number(plan.annual_price) : Number(plan.price);

    const reference = `sg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        plan_id: plan.id,
        amount,
        currency: plan.currency,
        provider: "swychr",
        status: "pending",
        reference,
      })
      .select("id")
      .maybeSingle();
    if (payErr) throw new Error(payErr.message);

    const email = process.env["SWYCHR_EMAIL"];
    const password = process.env["SWYCHR_PASSWORD"];
    const base = process.env["SWYCHR_BASE_URL"] ?? "https://api.accountpay.africa";

    if (!email || !password) {
      return {
        ok: false as const,
        paymentId: payment?.id ?? null,
        reference,
        message:
          "Les identifiants Swychr ne sont pas encore configurés. La commande a été enregistrée en attente.",
      };
    }

    const token = await swychrToken(base, email, password);

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("id", userId)
      .maybeSingle();

    const res = await fetch(`${base}/api/payin/create_payment_links`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        country_code: process.env["SWYCHR_COUNTRY_CODE"] ?? "CM",
        name: [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Client",
        email: profile?.email ?? "",
        mobile: "",
        amount: Math.round(amount),
        transaction_id: reference,
        description: `${plan.name} (${data.cycle === "year" ? "annuel" : "mensuel"})`,
        pass_digital_charge: true,
        return_url: data.returnUrl,
      }),
    });

    const raw = await res.text();
    if (!res.ok) throw new Error(`Swychr: ${res.status} ${raw}`);

    const json = JSON.parse(raw) as {
      data?: { payment_url?: string; link?: string; url?: string };
      payment_url?: string;
    };
    const url = json.data?.payment_url ?? json.data?.link ?? json.data?.url ?? json.payment_url;
    if (!url) throw new Error("Swychr: lien de paiement absent de la réponse");

    return { ok: true as const, url, reference, paymentId: payment?.id ?? null };
  });

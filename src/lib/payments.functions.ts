import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({
  planId: z.string().uuid(),
  cycle: z.enum(["month", "year"]),
  returnUrl: z.string().url(),
});

const DEFAULT_BASE = "https://api.accountpe.com/api";


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

    const apiKey = process.env["SWYCHR_API_KEY"];
    const base = process.env["SWYCHR_BASE_URL"] ?? DEFAULT_BASE;

    if (!apiKey) {
      return {
        ok: false as const,
        paymentId: payment?.id ?? null,
        reference,
        message:
          "La clé API Swychr n'est pas encore configurée. La commande a été enregistrée en attente.",
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("id", userId)
      .maybeSingle();

    const res = await fetch(`${base}/swychpay/create_payment_links`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Api-Key": apiKey },

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
      data?: { payment_url?: string; link?: string; url?: string; id?: number | string };
      payment_url?: string;
    };
    const checkoutBase = process.env["SWYCHR_CHECKOUT_URL"] ?? "https://app.swychrconnect.com/payment";
    const id = json.data?.id;
    const url =
      json.data?.payment_url ??
      json.data?.link ??
      json.data?.url ??
      json.payment_url ??
      (id != null ? `${checkoutBase}/${id}` : undefined);
    if (!url) throw new Error("Swychr: lien de paiement absent de la réponse");


    return { ok: true as const, url, reference, paymentId: payment?.id ?? null };
  });

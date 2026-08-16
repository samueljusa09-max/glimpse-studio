/** Calculs et orchestration du paiement — exécuté uniquement côté serveur. */
import {
  applyPaymentStatus,
  createSwychrLink,
  fetchSwychrStatus,
  getUsdRate,
  newReference,
  normalizeStatus,
  roundForCurrency,
} from "@/lib/payments.server";

type Sb = any;

export type Quote = {
  planId: string;
  planName: string;
  cycle: "month" | "year";
  countryCode: string;
  countryName: string;
  amountUsd: number;
  feeUsd: number;
  totalUsd: number;
  currency: string;
  rate: number;
  rateSource: string;
  convertedAmount: number;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Sb;
}

/** Prix de référence en USD, toujours relu depuis la base au moment du paiement. */
export async function buildQuote(
  supabase: Sb,
  planId: string,
  cycle: "month" | "year",
  countryCode: string,
): Promise<Quote> {
  const { data: plan, error } = await supabase.from("plans").select("*").eq("id", planId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!plan || !plan.is_active) throw new Error("Cette offre n'est plus disponible.");

  const { data: country } = await supabase
    .from("payment_countries")
    .select("code, name, currency, is_active")
    .eq("code", countryCode.toUpperCase())
    .maybeSingle();
  if (!country || !country.is_active) throw new Error("Ce pays n'est pas pris en charge actuellement.");

  const db = await admin();

  // Prix du plan converti en USD si le plan est libellé dans une autre devise.
  const rawPrice = cycle === "year" && Number(plan.annual_price) > 0 ? Number(plan.annual_price) : Number(plan.price);
  const planCurrency = String(plan.currency ?? "USD").toUpperCase();
  let amountUsd = rawPrice;
  if (planCurrency !== "USD") {
    const { rate } = await getUsdRate(db, planCurrency);
    amountUsd = rawPrice / rate;
  }
  if (!(amountUsd > 0)) throw new Error("Le prix de cette offre est invalide.");

  const { data: feeRow } = await supabase.from("payment_settings").select("value").eq("key", "fees").maybeSingle();
  const fees = (feeRow?.value ?? {}) as { enabled?: boolean; percent?: number; fixed_usd?: number };
  const feeUsd = fees.enabled
    ? Math.round((amountUsd * Number(fees.percent ?? 0)) / 100 + Number(fees.fixed_usd ?? 0)) * 1
    : 0;

  const totalUsd = Math.round((amountUsd + feeUsd) * 100) / 100;
  const currency = String(country.currency).toUpperCase();
  const { rate, source } = await getUsdRate(db, currency);
  const convertedAmount = roundForCurrency(currency, totalUsd * rate);

  return {
    planId: plan.id,
    planName: plan.name,
    cycle,
    countryCode: country.code,
    countryName: country.name,
    amountUsd: Math.round(amountUsd * 100) / 100,
    feeUsd,
    totalUsd,
    currency,
    rate,
    rateSource: source,
    convertedAmount,
  };
}

export async function startCheckout(
  supabase: Sb,
  userId: string,
  input: {
    planId: string;
    cycle: "month" | "year";
    countryCode: string;
    methodCode: string;
    mobileNumber: string;
    returnUrl: string;
  },
) {
  const quote = await buildQuote(supabase, input.planId, input.cycle, input.countryCode);

  const { data: method } = await supabase
    .from("payment_methods")
    .select("code, label, is_active")
    .eq("country_code", quote.countryCode)
    .eq("code", input.methodCode)
    .maybeSingle();
  if (!method || !method.is_active) {
    throw new Error("Ce moyen de paiement n'est pas disponible. Veuillez en choisir un autre.");
  }

  const db = await admin();
  const reference = newReference();

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, first_name, last_name")
    .eq("id", userId)
    .maybeSingle();

  const { error: insErr } = await db.from("payments").insert({
    user_id: userId,
    plan_id: quote.planId,
    plan_name: quote.planName,
    amount: quote.convertedAmount,
    currency: quote.currency,
    original_amount_usd: quote.amountUsd,
    fee_amount: quote.feeUsd,
    exchange_rate: quote.rate,
    converted_amount: quote.convertedAmount,
    country_code: quote.countryCode,
    payment_method: method.code,
    payment_channel: "mobile_money",
    mobile_number: input.mobileNumber,
    cycle: quote.cycle,
    provider: "swychr",
    status: "pending",
    reference,
  });
  if (insErr) throw new Error(insErr.message);

  try {
    const { url, gatewayId } = await createSwychrLink({
      countryCode: quote.countryCode,
      name: [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Client",
      email: profile?.email ?? "",
      mobile: input.mobileNumber,
      amount: quote.convertedAmount,
      reference,
      description: `${quote.planName} (${quote.cycle === "year" ? "annuel" : "mensuel"}) — ${method.label}`,
      returnUrl: `${input.returnUrl}${input.returnUrl.includes("?") ? "&" : "?"}ref=${reference}`,
    });

    await db.from("payments").update({ checkout_url: url, gateway_transaction_id: gatewayId }).eq("reference", reference);
    return { ok: true as const, url, reference, quote };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur passerelle";
    console.error("[payments] checkout failed", reference, message);
    await db.from("payments").update({ status: "failed", error_message: message }).eq("reference", reference);
    throw new Error("Impossible d'initialiser le paiement. Veuillez réessayer ou choisir un autre moyen de paiement.");
  }
}

export async function refreshStatus(supabase: Sb, userId: string, reference: string) {
  const { data: payment } = await supabase
    .from("payments")
    .select("reference, status, amount, currency, plan_name, user_id, created_at")
    .eq("reference", reference)
    .maybeSingle();
  if (!payment || payment.user_id !== userId) throw new Error("Transaction introuvable.");

  let status = payment.status as string;
  if (status === "pending") {
    const raw = await fetchSwychrStatus(reference);
    if (raw) {
      const mapped = normalizeStatus(raw);
      const db = await admin();
      const res = await applyPaymentStatus(db, reference, mapped);
      status = res.status ?? status;
    }
  }

  return {
    reference,
    status,
    amount: Number(payment.amount),
    currency: payment.currency as string,
    planName: (payment.plan_name as string | null) ?? null,
  };
}

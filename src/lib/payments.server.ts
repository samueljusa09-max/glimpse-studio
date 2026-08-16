/**
 * Logique serveur du paiement (Swychr / AccountPe).
 * Aucun prix ni taux de change n'est codé en dur : tout vient de la base
 * ou d'une source de taux réelle.
 */

const DEFAULT_BASE = "https://api.accountpe.com/api";
const RATE_SOURCE = "https://open.er-api.com/v6/latest/USD";
const RATE_TTL_MS = 6 * 60 * 60 * 1000; // 6 h

/** Devises sans sous-unité : le montant doit être un entier. */
const ZERO_DECIMAL = new Set(["XAF", "XOF", "CDF", "JPY", "KMF", "GNF", "RWF", "UGX"]);

export type AdminClient = {
  from: (table: string) => any;
};

export function newReference() {
  const year = new Date().getUTCFullYear();
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `SF-${year}-${rand}`;
}

export function roundForCurrency(currency: string, amount: number) {
  return ZERO_DECIMAL.has(currency.toUpperCase())
    ? Math.max(1, Math.round(amount))
    : Math.max(0.01, Math.round(amount * 100) / 100);
}

/**
 * Taux USD -> devise, depuis un cache serveur rafraîchi via une API publique.
 * Ne renvoie jamais un taux inventé : en cas d'échec total, une erreur est levée.
 */
export async function getUsdRate(admin: AdminClient, currency: string): Promise<{ rate: number; source: string }> {
  const cur = currency.toUpperCase();
  if (cur === "USD") return { rate: 1, source: "base" };

  const { data: cached } = await admin
    .from("exchange_rates")
    .select("rate, fetched_at, source")
    .eq("base", "USD")
    .eq("currency", cur)
    .maybeSingle();

  const fresh = cached && Date.now() - new Date(cached.fetched_at).getTime() < RATE_TTL_MS;
  if (fresh) return { rate: Number(cached.rate), source: cached.source };

  try {
    const res = await fetch(RATE_SOURCE);
    if (!res.ok) throw new Error(`rates ${res.status}`);
    const json = (await res.json()) as { result?: string; rates?: Record<string, number> };
    const rate = json.rates?.[cur];
    if (!rate || !Number.isFinite(rate)) throw new Error(`rate ${cur} indisponible`);
    await admin
      .from("exchange_rates")
      .upsert(
        { base: "USD", currency: cur, rate, source: "open.er-api.com", fetched_at: new Date().toISOString() },
        { onConflict: "base,currency" },
      );
    return { rate, source: "open.er-api.com" };
  } catch (e) {
    if (cached) return { rate: Number(cached.rate), source: `${cached.source} (cache)` };
    throw new Error(`Taux de change indisponible pour ${cur}: ${e instanceof Error ? e.message : "erreur"}`);
  }
}

type SwychrArgs = {
  countryCode: string;
  name: string;
  email: string;
  mobile: string;
  amount: number;
  reference: string;
  description: string;
  returnUrl: string;
};

/** Crée le lien de paiement chez Swychr et renvoie l'URL publique + l'id passerelle. */
export async function createSwychrLink(args: SwychrArgs) {
  const apiKey = process.env["SWYCHR_API_KEY"];
  if (!apiKey) throw new Error("Passerelle non configurée (clé API manquante).");
  const base = process.env["SWYCHR_BASE_URL"] ?? DEFAULT_BASE;
  const headers = { "Content-Type": "application/json", "Api-Key": apiKey };

  const res = await fetch(`${base}/swychpay/create_payment_links`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      country_code: args.countryCode,
      name: args.name,
      email: args.email,
      mobile: args.mobile,
      amount: args.amount,
      transaction_id: args.reference,
      description: args.description,
      pass_digital_charge: true,
      return_url: args.returnUrl,
    }),
  });

  const raw = await res.text();
  if (!res.ok) throw new Error(`Swychr ${res.status}: ${raw.slice(0, 300)}`);

  let json: any = {};
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(`Swychr: réponse illisible (${raw.slice(0, 200)})`);
  }

  const gatewayId = json?.data?.id ?? json?.id ?? null;
  let uuid: string | undefined =
    json?.data?.payment_uuid ?? json?.data?.attributes?.payment_uuid ?? json?.payment_uuid;
  let url: string | undefined = json?.data?.payment_url ?? json?.data?.link ?? json?.data?.url ?? json?.payment_url;

  // L'API ne renvoie souvent qu'un id : on récupère le payment_uuid public.
  if (!url && !uuid) {
    const listRes = await fetch(`${base}/swychpay/payment_link_list`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    if (listRes.ok) {
      const list = (await listRes.json()) as {
        data?: { data?: Array<{ attributes?: { transaction_id?: string; payment_uuid?: string; id?: number } }> };
      };
      const items = list.data?.data ?? [];
      const match =
        items.find((i) => i.attributes?.transaction_id === args.reference) ??
        items.find((i) => String(i.attributes?.id) === String(gatewayId));
      uuid = match?.attributes?.payment_uuid;
    }
  }

  if (!url && uuid) {
    const checkout = process.env["SWYCHR_CHECKOUT_URL"] ?? "https://app.swychrconnect.com/payment";
    url = uuid.startsWith("http") ? uuid : `${checkout}/${uuid}`;
  }

  if (!url) throw new Error("Swychr: lien de paiement introuvable dans la réponse.");
  return { url, gatewayId: gatewayId ? String(gatewayId) : null };
}

/** Interroge le statut réel d'une transaction auprès de la passerelle. */
export async function fetchSwychrStatus(reference: string): Promise<string | null> {
  const apiKey = process.env["SWYCHR_API_KEY"];
  if (!apiKey) return null;
  const base = process.env["SWYCHR_BASE_URL"] ?? DEFAULT_BASE;
  try {
    const res = await fetch(`${base}/swychpay/payment_link_status`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Api-Key": apiKey },
      body: JSON.stringify({ transaction_id: reference }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as any;
    const status = json?.data?.status ?? json?.status;
    return typeof status === "string" ? status : null;
  } catch {
    return null;
  }
}

/** Normalise un statut passerelle vers nos statuts internes. */
export function normalizeStatus(raw: string): "paid" | "failed" | "cancelled" | "expired" | "pending" {
  const s = raw.toLowerCase();
  if (s.includes("success") || s === "paid" || s === "completed" || s === "approved") return "paid";
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("expire")) return "expired";
  if (s.includes("fail") || s.includes("declin") || s.includes("error")) return "failed";
  return "pending";
}

/**
 * Applique un statut de manière idempotente : un paiement déjà "paid"
 * n'est jamais retraité, l'abonnement n'est activé qu'une seule fois.
 */
export async function applyPaymentStatus(
  admin: AdminClient,
  reference: string,
  status: "paid" | "failed" | "cancelled" | "expired" | "pending",
  gatewayTransactionId?: string | null,
) {
  const { data: payment } = await admin
    .from("payments")
    .select("id, user_id, plan_id, status, cycle")
    .eq("reference", reference)
    .maybeSingle();

  if (!payment) return { found: false as const, status: null };
  if (payment.status === "paid") return { found: true as const, status: "paid" as const }; // idempotent
  if (status === "pending") return { found: true as const, status: payment.status as string };

  const patch: Record<string, unknown> = { status };
  if (gatewayTransactionId) patch["gateway_transaction_id"] = gatewayTransactionId;
  if (status === "paid") patch["paid_at"] = new Date().toISOString();
  await admin.from("payments").update(patch).eq("id", payment.id).neq("status", "paid");

  if (status === "paid") {
    const end = new Date();
    if (payment.cycle === "year") end.setFullYear(end.getFullYear() + 1);
    else end.setMonth(end.getMonth() + 1);
    await admin.from("subscriptions").upsert(
      {
        user_id: payment.user_id,
        plan_id: payment.plan_id,
        status: "active",
        current_period_end: end.toISOString(),
      },
      { onConflict: "user_id" },
    );
  }

  return { found: true as const, status };
}

/**
 * Service API centralisé.
 * Toutes les routes/endpoints de l'application transitent par ce fichier.
 */

import { supabase } from "@/integrations/supabase/client";

export const API_CONFIG = {
  /** Endpoints internes (server routes TanStack) */
  endpoints: {
    swychrCreatePayment: "/api/public/payments/swychr/create",
    swychrWebhook: "/api/public/payments/swychr/webhook",
  },
  /** Compte super administrateur par défaut */
  superAdminEmail: "samueljusa09@gmail.com",
  /** Tables backend */
  tables: {
    profiles: "profiles",
    roles: "user_roles",
    plans: "plans",
    subscriptions: "subscriptions",
    payments: "payments",
    tickets: "support_tickets",
    messages: "support_messages",
    canned: "canned_responses",
    usage: "usage_events",
    audit: "audit_logs",
    invites: "team_invites",
  },
} as const;

export const db = supabase;

export async function logAudit(action: string, target?: string, details: Record<string, unknown> = {}) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("audit_logs").insert({
    actor_id: data.user.id,
    action,
    target: target ?? null,
    details: details as never,
  });
}

export function formatMoney(amount: number, currency?: string | null) {
  const code = (currency ?? "USD").trim().toUpperCase();
  const safe = /^[A-Z]{3}$/.test(code) ? code : "USD";
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: safe }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${safe}`;
  }
}

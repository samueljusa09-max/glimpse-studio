import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const quoteInput = z.object({
  planId: z.string().uuid(),
  cycle: z.enum(["month", "year"]),
  countryCode: z.string().min(2).max(3),
});

const checkoutInput = z.object({
  planId: z.string().uuid(),
  cycle: z.enum(["month", "year"]),
  countryCode: z.string().min(2).max(3),
  methodCode: z.string().min(2).max(40),
  mobileNumber: z.string().trim().min(6).max(20),
  returnUrl: z.string().url(),
});

const statusInput = z.object({ reference: z.string().min(4).max(64) });

/**
 * Calcule le montant réel à payer (prix du plan en base -> devise du pays).
 * Le montant n'est jamais fourni par le navigateur.
 */
export const getPaymentQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => quoteInput.parse(data))
  .handler(async ({ data, context }) => {
    const { buildQuote } = await import("@/lib/payments.quote.server");
    return buildQuote(context.supabase, data.planId, data.cycle, data.countryCode);
  });

/** Crée la transaction et le lien de paiement de la passerelle. */
export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => checkoutInput.parse(data))
  .handler(async ({ data, context }) => {
    const { startCheckout } = await import("@/lib/payments.quote.server");
    return startCheckout(context.supabase, context.userId, data);
  });

/** Vérifie le statut réel d'une transaction côté serveur (jamais côté client). */
export const checkPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => statusInput.parse(data))
  .handler(async ({ data, context }) => {
    const { refreshStatus } = await import("@/lib/payments.quote.server");
    return refreshStatus(context.supabase, context.userId, data.reference);
  });

/** Ancien nom conservé pour compatibilité. */
export const createSwychrCheckout = createCheckout;

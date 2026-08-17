import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { applyPaymentStatus, normalizeStatus } from "@/lib/payments.server";

const payload = z.object({
  transaction_id: z.string().min(1).max(64).optional(),
  reference: z.string().min(1).max(64).optional(),
  status: z.string().min(1).max(64),
  id: z.union([z.string(), z.number()]).optional(),
});

/**
 * Webhook Swychr : source de vérité du paiement.
 * - Vérifie le secret partagé.
 * - Applique le statut de façon idempotente (jamais de double activation).
 * - Répond toujours 200 sur un payload valide pour éviter les rejeux infinis.
 */
export const Route = createFileRoute("/api/public/payments/swychr/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["SWYCHR_WEBHOOK_SECRET"];
        if (secret) {
          const provided =
            request.headers.get("x-swychr-secret") ??
            request.headers.get("x-webhook-secret") ??
            new URL(request.url).searchParams.get("secret");
          if (provided !== secret) return new Response("Invalid signature", { status: 401 });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const parsed = payload.safeParse(body);
        if (!parsed.success) return new Response("Invalid payload", { status: 400 });

        const reference = parsed.data.transaction_id ?? parsed.data.reference;
        if (!reference) return new Response("Missing reference", { status: 400 });

        const mapped = normalizeStatus(parsed.data.status);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const res = await applyPaymentStatus(
          supabaseAdmin as never,
          reference,
          mapped,
          parsed.data.id != null ? String(parsed.data.id) : null,
        );

        if (!res.found) {
          console.warn("[swychr-webhook] référence inconnue", reference);
          return Response.json({ received: true, known: false });
        }
        return Response.json({ received: true, status: res.status });
      },
    },
  },
});

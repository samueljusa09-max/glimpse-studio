import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const payload = z.object({
  transaction_id: z.string().min(1),
  status: z.string().min(1),
});

/** Webhook Swychr : met à jour le paiement et active l'abonnement. */
export const Route = createFileRoute("/api/public/payments/swychr/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["SWYCHR_WEBHOOK_SECRET"];
        if (secret && request.headers.get("x-swychr-secret") !== secret) {
          return new Response("Invalid signature", { status: 401 });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const parsed = payload.safeParse(body);
        if (!parsed.success) return new Response("Invalid payload", { status: 400 });

        const status = parsed.data.status.toLowerCase();
        const mapped =
          status.includes("success") || status === "paid" || status === "completed"
            ? "paid"
            : status.includes("fail") || status.includes("cancel")
              ? "failed"
              : "pending";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: payment } = await supabaseAdmin
          .from("payments")
          .update({ status: mapped })
          .eq("reference", parsed.data.transaction_id)
          .select("user_id, plan_id")
          .maybeSingle();

        if (mapped === "paid" && payment) {
          const end = new Date();
          end.setMonth(end.getMonth() + 1);
          await supabaseAdmin.from("subscriptions").upsert(
            {
              user_id: payment.user_id,
              plan_id: payment.plan_id,
              status: "active",
              current_period_end: end.toISOString(),
            },
            { onConflict: "user_id" },
          );
        }

        return Response.json({ received: true });
      },
    },
  },
});

import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";

// Stripe calls this, not a signed-in user: the request is authenticated by its signature.
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  let event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), signature, env("STRIPE_WEBHOOK_SECRET"));
  } catch {
    return new Response("Bad signature", { status: 400 });
  }

  const db = createAdminClient();
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const s = event.data.object;
    const paymentId = s.metadata?.payment_id;
    if (paymentId && s.payment_status === "paid") {
      const { error } = await db.rpc("fulfill_payment", { p_payment: paymentId, p_paid_cents: s.amount_total, p_session: s.id });
      if (error) {
        // a mismatch will never succeed on retry; anything else should be retried by Stripe
        const permanent = error.message.includes("amount_mismatch") || error.message.includes("payment_not_found");
        console.error("fulfill_payment failed", paymentId, error.message);
        return new Response("Payment not fulfilled", { status: permanent ? 400 : 500 });
      }
    }
  } else if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    const paymentId = event.data.object.metadata?.payment_id;
    if (paymentId) {
      const { error } = await db.rpc("fail_payment", { p_payment: paymentId });
      if (error) return new Response("Could not close payment", { status: 500 });
    }
  }
  return Response.json({ received: true });
}

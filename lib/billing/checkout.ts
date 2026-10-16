import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { findPack } from "@/lib/billing/packs";

// Starts buying a pack. The payment and its coupon use are created in one database call;
// credits arrive only when the Stripe webhook confirms payment (or at once if a code made it free).
export async function startCheckout(userId: string, email: string | undefined, packId: string, code: string | null): Promise<{ url: string } | { error: string }> {
  const pack = findPack(packId);
  if (!pack) return { error: "Unknown pack" };
  const db = createAdminClient();
  const { data, error } = await db.rpc("start_checkout", { p_user: userId, p_credits: pack.credits, p_list_cents: pack.cents, p_code: code });
  if (error) return { error: error.message.includes("invalid_coupon") ? "That code can't be used" : error.message };
  const { payment_id: paymentId, net_cents: netCents } = data[0] as { payment_id: string; net_cents: number };
  const site = env("SITE_URL");

  if (netCents === 0) {
    const { error: e } = await db.rpc("fulfill_payment", { p_payment: paymentId, p_paid_cents: 0, p_session: null });
    if (e) throw new Error(e.message);
    return { url: `${site}/billing?paid=1` };
  }

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      client_reference_id: userId,
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: netCents, product_data: { name: `${pack.credits} MotionDots credits` } } }],
      metadata: { payment_id: paymentId },
      success_url: `${site}/billing?paid=1`,
      cancel_url: `${site}/billing`,
    });
    await db.from("payments").update({ stripe_session_id: session.id }).eq("id", paymentId);
    return { url: session.url! };
  } catch (e) {
    await db.rpc("fail_payment", { p_payment: paymentId });
    throw e;
  }
}

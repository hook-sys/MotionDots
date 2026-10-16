import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

// Buying credits works only when both Stripe keys are set (without the webhook, paid credits would never arrive).
export const billingEnabled = () => !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET;

let client: Stripe | undefined;
export function stripe() {
  client ??= new Stripe(env("STRIPE_SECRET_KEY"));
  return client;
}

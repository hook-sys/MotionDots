import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

let client: Stripe | undefined;
export function stripe() {
  client ??= new Stripe(env("STRIPE_SECRET_KEY"));
  return client;
}

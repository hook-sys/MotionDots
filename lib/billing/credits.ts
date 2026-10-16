import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Voice generation is the only thing that spends credits. Both go through the database's
// credit_change() (atomic, logged, never below zero).

// false when the balance is too low.
export async function chargeVoice(userId: string, credits: number): Promise<boolean> {
  const { error } = await createAdminClient().rpc("credit_change", { p_user: userId, p_delta: -credits, p_kind: "voice", p_note: "Voice generation" });
  if (!error) return true;
  if (error.message.includes("insufficient_credits")) return false;
  throw new Error(error.message);
}

export async function refundVoice(userId: string, credits: number): Promise<void> {
  const { error } = await createAdminClient().rpc("credit_change", { p_user: userId, p_delta: credits, p_kind: "refund", p_note: "Voice generation failed" });
  if (error) throw new Error(error.message);
}

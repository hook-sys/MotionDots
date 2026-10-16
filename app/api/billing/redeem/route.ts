import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const body = z.object({ code: z.string().trim().min(1).max(32) });

// Redeems a code that gives credits outright.
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { data, error } = await createAdminClient().rpc("redeem_credit_coupon", { p_user: auth.user.id, p_code: parsed.data.code });
  if (error) {
    if (error.message.includes("invalid_coupon")) return Response.json({ error: "That code can't be used" }, { status: 400 });
    throw new Error(error.message);
  }
  return Response.json({ credits: data as number });
}

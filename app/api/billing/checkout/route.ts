import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { startCheckout } from "@/lib/billing/checkout";

const body = z.object({ packId: z.string(), code: z.string().trim().max(32).optional() });

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const result = await startCheckout(auth.user.id, auth.user.email, parsed.data.packId, parsed.data.code || null);
  return "error" in result ? Response.json(result, { status: 400 }) : Response.json(result);
}

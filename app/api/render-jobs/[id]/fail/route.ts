import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnJob } from "@/lib/render/job";

const body = z.object({ error: z.string().trim().min(1).max(200).optional() });

// The render failed in the browser (or was abandoned): close the job and return the credits.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const job = await getOwnJob((await ctx.params).id, auth.user.id);
  if (!job) return Response.json({ error: "Job not found" }, { status: 404 });
  const parsed = body.safeParse(await req.json().catch(() => ({})));

  const { data: refunded, error } = await createAdminClient().rpc("fail_render_job", { p_job: job.id, p_error: (parsed.success && parsed.data.error) || "The render failed" });
  if (error) throw new Error(error.message);
  return Response.json({ refunded });
}

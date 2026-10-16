import { after } from "next/server";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { launchRender } from "@/lib/render/launch";
import { RENDER_CREDITS } from "@/lib/render/cost";

export const maxDuration = 300;

// Starts a render and answers at once with a job id; the client polls /api/render-jobs/[id].
// Credits are taken when the job is created and returned if it fails.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const { data: jobId, error } = await createAdminClient().rpc("start_render_job", { p_user: auth.user.id, p_project: id, p_credits: RENDER_CREDITS });
  if (error) {
    if (error.message.includes("insufficient_credits")) return Response.json({ error: "Not enough credits", needed: RENDER_CREDITS }, { status: 402 });
    if (error.message.includes("project_unavailable")) return Response.json({ error: "Project not found or already rendering" }, { status: 404 });
    throw new Error(error.message);
  }
  after(() => launchRender(jobId as string));
  return Response.json({ jobId }, { status: 202 });
}

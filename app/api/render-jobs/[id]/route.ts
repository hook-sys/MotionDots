import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { pollRender } from "@/lib/render/poll";

// The client polls this for a render job's status (own jobs only).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const { data: job } = await createAdminClient()
    .from("render_jobs")
    .select("id, user_id, project_id, status, sandbox_id, cmd_id, error, created_at")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!job) return Response.json({ error: "Job not found" }, { status: 404 });
  return Response.json(await pollRender(job));
}

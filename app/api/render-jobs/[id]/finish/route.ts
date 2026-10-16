import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnJob, videoPath } from "@/lib/render/job";

// The browser has uploaded the MP4: check it is there, then close the job and mark the project done.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const job = await getOwnJob((await ctx.params).id, auth.user.id);
  if (!job) return Response.json({ error: "Job not found" }, { status: 404 });

  const db = createAdminClient();
  const path = videoPath(auth.user.id, job.project_id);
  const { data: files } = await db.storage.from("renders").list(auth.user.id, { search: `${job.project_id}.mp4` });
  if (!files?.length) return Response.json({ error: "The video was not uploaded" }, { status: 400 });

  const { data: closed, error } = await db.rpc("finish_render_job", { p_job: job.id, p_video_path: path });
  if (error) throw new Error(error.message);
  if (!closed) return Response.json({ error: "This render was already closed" }, { status: 409 });
  return Response.json({ status: "done" });
}

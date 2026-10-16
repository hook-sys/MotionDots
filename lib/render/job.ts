import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// A render job that did not finish within this long (the tab was closed) is failed and its credits returned.
const STALE_MS = 30 * 60_000;

export const videoPath = (userId: string, projectId: string) => `${userId}/${projectId}.mp4`;

// The user's own job, or null.
export async function getOwnJob(jobId: string, userId: string) {
  const { data } = await createAdminClient().from("render_jobs").select("id, user_id, project_id, status").eq("id", jobId).eq("user_id", userId).maybeSingle();
  return data;
}

// Closes this project's abandoned render jobs (refunding them), so the project is not stuck "rendering".
export async function failStaleJobs(projectId: string) {
  const db = createAdminClient();
  const { data: stale } = await db
    .from("render_jobs")
    .select("id")
    .eq("project_id", projectId)
    .in("status", ["starting", "rendering"])
    .lt("created_at", new Date(Date.now() - STALE_MS).toISOString());
  for (const job of stale ?? []) await db.rpc("fail_render_job", { p_job: job.id, p_error: "The render was interrupted" });
}

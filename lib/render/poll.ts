import "server-only";
import { del } from "@vercel/blob";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { checkRender, stopSandbox } from "@/lib/render/sandbox";

// A job still "starting" after this long was lost (its function died): it is failed and refunded.
const STARTING_TIMEOUT_MS = 15 * 60_000;
const SIGNED_URL_SECONDS = 3600;

type Job = { id: string; user_id: string; project_id: string; status: string; sandbox_id: string | null; cmd_id: string | null; error: string | null; created_at: string };
export type JobStatus = { status: "starting" | "rendering" | "done" | "failed"; progress?: number; error?: string; videoUrl?: string };

async function fail(jobId: string, error: string): Promise<JobStatus> {
  await createAdminClient().rpc("fail_render_job", { p_job: jobId, p_error: error });
  return { status: "failed", error };
}

// Where the job is now. When the sandbox has finished, the video is moved to private storage
// and the job closed; when it failed, the job is closed and the credits refunded.
export async function pollRender(job: Job): Promise<JobStatus> {
  if (job.status === "failed") return { status: "failed", error: job.error ?? "Render failed" };
  const db = createAdminClient();
  if (job.status === "done") return { status: "done", videoUrl: await signedVideo(job.user_id, job.project_id) };
  if (job.status === "starting" || !job.sandbox_id || !job.cmd_id) {
    if (Date.now() - Date.parse(job.created_at) > STARTING_TIMEOUT_MS) return fail(job.id, "Render could not be started");
    return { status: "starting", progress: 0 };
  }

  let state;
  try {
    state = await checkRender(job.sandbox_id, job.cmd_id);
  } catch (e) {
    console.warn("render progress check failed", job.id, e); // a passing hiccup: the client asks again
    return { status: "rendering" };
  }
  if (state.state === "failed") return fail(job.id, state.error);
  if (state.state === "running") return { status: "rendering", progress: state.progress };

  try {
    const res = await fetch(state.url, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) throw new Error(`download ${res.status}`);
    const path = `${job.user_id}/${job.project_id}.mp4`;
    const { error } = await db.storage.from("renders").upload(path, await res.arrayBuffer(), { contentType: "video/mp4", upsert: true });
    if (error) throw new Error(error.message);
    const { error: finishError } = await db.rpc("finish_render_job", { p_job: job.id, p_video_path: path });
    if (finishError) throw new Error(finishError.message);
    await del(state.url, { token: env("BLOB_READ_WRITE_TOKEN") }).catch((e) => console.warn("blob cleanup failed", e));
    await stopSandbox(job.sandbox_id).catch((e) => console.warn("sandbox stop failed", e));
    return { status: "done", videoUrl: await signedVideo(job.user_id, job.project_id) };
  } catch (e) {
    console.error("storing render failed", job.id, e);
    return fail(job.id, "Render finished but could not be saved");
  }
}

async function signedVideo(userId: string, projectId: string): Promise<string | undefined> {
  const { data } = await createAdminClient().storage.from("renders").createSignedUrl(`${userId}/${projectId}.mp4`, SIGNED_URL_SECONDS);
  return data?.signedUrl;
}

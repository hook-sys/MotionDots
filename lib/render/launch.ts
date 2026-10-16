import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { startRender } from "@/lib/render/sandbox";
import type { AspectRatio } from "@/lib/aspect";

const SIGNED_URL_SECONDS = 3600;

// Runs in the background after the render request has answered: gets the job's inputs ready,
// starts the sandbox render, and records where it runs. Any failure closes the job (credits refunded).
export async function launchRender(jobId: string): Promise<void> {
  const db = createAdminClient();
  try {
    const { data: job } = await db
      .from("render_jobs")
      .select("projects(logo_path, aspect_ratio, voiceovers(path))")
      .eq("id", jobId)
      .single<{ projects: { logo_path: string; aspect_ratio: AspectRatio; voiceovers: { path: string } } }>();
    if (!job) throw new Error("Render job not found");
    const { logo_path, aspect_ratio, voiceovers } = job.projects;
    const [audio, logo] = await Promise.all([
      db.storage.from("voice").createSignedUrl(voiceovers.path, SIGNED_URL_SECONDS),
      db.storage.from("logos").createSignedUrl(logo_path, SIGNED_URL_SECONDS),
    ]);
    if (!audio.data || !logo.data) throw new Error("Could not sign input files");
    const { sandboxId, cmdId } = await startRender({ audioUrl: audio.data.signedUrl, logoUrl: logo.data.signedUrl, aspectRatio: aspect_ratio });
    const { error } = await db.from("render_jobs").update({ status: "rendering", sandbox_id: sandboxId, cmd_id: cmdId }).eq("id", jobId);
    if (error) throw new Error(error.message);
  } catch (e) {
    console.error("render launch failed", jobId, e);
    await db.rpc("fail_render_job", { p_job: jobId, p_error: "Render could not be started" });
  }
}

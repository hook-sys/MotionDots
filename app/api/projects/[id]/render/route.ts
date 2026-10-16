import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderInSandbox } from "@/lib/render/sandbox";
import type { AspectRatio } from "@/lib/aspect";

export const maxDuration = 800;
const SIGNED_URL_SECONDS = 3600;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const db = createAdminClient();

  // take the render for this request; a project already rendering can't be started twice
  const { data: project } = await db
    .from("projects")
    .update({ status: "rendering", error: null })
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .neq("status", "rendering")
    .select("id, logo_path, aspect_ratio, voiceovers(path)")
    .single<{ id: string; logo_path: string; aspect_ratio: AspectRatio; voiceovers: { path: string } }>();
  if (!project) return Response.json({ error: "Project not found or already rendering" }, { status: 404 });

  try {
    const [audio, logo] = await Promise.all([
      db.storage.from("voice").createSignedUrl(project.voiceovers.path, SIGNED_URL_SECONDS),
      db.storage.from("logos").createSignedUrl(project.logo_path, SIGNED_URL_SECONDS),
    ]);
    if (!audio.data || !logo.data) throw new Error("Could not sign input files");
    const video = await renderInSandbox({ audioUrl: audio.data.signedUrl, logoUrl: logo.data.signedUrl, aspectRatio: project.aspect_ratio });
    const videoPath = `${auth.user.id}/${project.id}.mp4`;
    const { error } = await db.storage.from("renders").upload(videoPath, video, { contentType: "video/mp4", upsert: true });
    if (error) throw new Error(error.message);
    await db.from("projects").update({ status: "done", video_path: videoPath }).eq("id", project.id);
    return Response.json({ status: "done" });
  } catch (e) {
    console.error("render failed", e);
    await db.from("projects").update({ status: "failed", error: "Render failed" }).eq("id", project.id);
    return Response.json({ error: "Render failed" }, { status: 502 });
  }
}

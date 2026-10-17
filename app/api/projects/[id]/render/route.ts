import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { videoPath } from "@/lib/render/job";
import { RENDER_CREDITS } from "@/lib/render/cost";
import { drawLook, lookOf } from "@/lib/video/look";
import { freshSeed } from "@/lib/video/rng";

const SIGNED_URL_SECONDS = 3600;

// Starts a render: the credits are taken and a job is created, and the browser gets what it needs to
// make the video itself (signed links to the voice and logo, and a signed place to upload the MP4).
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const db = createAdminClient();
  const { data: jobId, error } = await db.rpc("start_render_job", { p_user: auth.user.id, p_project: id, p_credits: RENDER_CREDITS });
  if (error) {
    if (error.message.includes("insufficient_credits")) return Response.json({ error: "Not enough credits", needed: RENDER_CREDITS }, { status: 402 });
    if (error.message.includes("project_unavailable")) return Response.json({ error: "Project not found or already rendering" }, { status: 404 });
    throw new Error(error.message);
  }

  try {
    const { data: project } = await db
      .from("projects")
      .select("logo_path, aspect_ratio, voiceovers(path, words)")
      .eq("id", id)
      .single<{ logo_path: string; aspect_ratio: string; voiceovers: { path: string; words: unknown } }>();
    if (!project) throw new Error("Project not found");
    // this video's look: drawn fresh, unlike the user's last five
    const { data: recent } = await db.from("projects").select("look").eq("user_id", auth.user.id).not("look", "is", null).order("created_at", { ascending: false }).limit(5);
    const look = drawLook(freshSeed(), (recent ?? []).map((r) => lookOf(r.look)).filter((l) => l !== null));
    const saved = await db.from("projects").update({ look }).eq("id", id);
    if (saved.error) throw new Error(saved.error.message);
    const path = videoPath(auth.user.id, id);
    const [audio, logo, upload] = await Promise.all([
      db.storage.from("voice").createSignedUrl(project.voiceovers.path, SIGNED_URL_SECONDS),
      db.storage.from("logos").createSignedUrl(project.logo_path, SIGNED_URL_SECONDS),
      db.storage.from("renders").createSignedUploadUrl(path, { upsert: true }),
    ]);
    if (!audio.data || !logo.data || !upload.data) throw new Error("Could not sign the files");
    return Response.json({ jobId, audioUrl: audio.data.signedUrl, logoUrl: logo.data.signedUrl, aspectRatio: project.aspect_ratio, look, words: project.voiceovers.words, upload: { path, token: upload.data.token } }, { status: 201 });
  } catch (e) {
    console.error("render could not be prepared", jobId, e);
    await db.rpc("fail_render_job", { p_job: jobId, p_error: "Render could not be started" });
    return Response.json({ error: "Render could not be started. Your credits were returned." }, { status: 500 });
  }
}

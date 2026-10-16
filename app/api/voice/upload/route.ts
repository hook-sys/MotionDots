import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAiModels } from "@/lib/settings";
import { StepError } from "@/lib/ai/fal";
import { transcribe } from "@/lib/voice/speech";
import { AUDIO_TYPES, MAX_AUDIO_BYTES, checkFile } from "@/lib/voice/rules";

// The user's own recorded voice, used instead of a generated one. Free. Whisper gives its word timestamps.
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Missing file" }, { status: 400 });
  const checked = checkFile(file, AUDIO_TYPES, MAX_AUDIO_BYTES);
  if ("error" in checked) return Response.json(checked, { status: 400 });
  if (!(await getAiModels()).transcription) {
    return Response.json({ error: "Transcription for uploaded voice: no model is set. A super admin must set one in /admin/models." }, { status: 503 });
  }

  const db = createAdminClient();
  const path = `${auth.user.id}/${crypto.randomUUID()}.${checked.ext}`;
  const { error: uploadError } = await db.storage.from("voice").upload(path, file, { contentType: file.type });
  if (uploadError) throw new Error(uploadError.message);
  try {
    const signed = await db.storage.from("voice").createSignedUrl(path, 600);
    if (!signed.data) throw new Error("Could not sign the upload");
    const words = await transcribe(signed.data.signedUrl);
    const { data, error } = await db.from("voiceovers").insert({ user_id: auth.user.id, source: "uploaded", path, words }).select("id").single();
    if (error) throw new Error(error.message);
    return Response.json({ voiceoverId: data.id });
  } catch (e) {
    console.error("voice upload failed", e);
    await db.storage.from("voice").remove([path]);
    return Response.json({ error: e instanceof StepError ? e.message : "Upload could not be saved" }, { status: 502 });
  }
}

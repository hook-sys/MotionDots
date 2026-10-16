import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AUDIO_TYPES, MAX_AUDIO_BYTES, checkFile } from "@/lib/voice/rules";

// The user's own recorded voice, used instead of a generated one. Free.
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Missing file" }, { status: 400 });
  const checked = checkFile(file, AUDIO_TYPES, MAX_AUDIO_BYTES);
  if ("error" in checked) return Response.json(checked, { status: 400 });

  const db = createAdminClient();
  const path = `${auth.user.id}/${crypto.randomUUID()}.${checked.ext}`;
  const { error: uploadError } = await db.storage.from("voice").upload(path, file, { contentType: file.type });
  if (uploadError) throw new Error(uploadError.message);
  const { data, error } = await db.from("voiceovers").insert({ user_id: auth.user.id, source: "uploaded", path }).select("id").single();
  if (error) throw new Error(error.message);
  return Response.json({ voiceoverId: data.id });
}

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ASPECT_RATIOS } from "@/lib/aspect";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_SCRIPT_CHARS, checkFile } from "@/lib/voice/rules";

const fields = z.object({
  voiceoverId: z.string().uuid(),
  aspectRatio: z.enum(ASPECT_RATIOS),
  script: z.string().trim().max(MAX_SCRIPT_CHARS).optional(),
});

// A project from the user's inputs: voiceover (generated or uploaded), logo and aspect ratio.
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const form = await req.formData().catch(() => null);
  const logo = form?.get("logo");
  const parsed = fields.safeParse({ voiceoverId: form?.get("voiceoverId"), aspectRatio: form?.get("aspectRatio"), script: form?.get("script") ?? undefined });
  if (!parsed.success || !(logo instanceof File)) return Response.json({ error: "Invalid request" }, { status: 400 });
  const checked = checkFile(logo, IMAGE_TYPES, MAX_IMAGE_BYTES);
  if ("error" in checked) return Response.json(checked, { status: 400 });

  const db = createAdminClient();
  const { data: voiceover } = await db.from("voiceovers").select("id").eq("id", parsed.data.voiceoverId).eq("user_id", auth.user.id).maybeSingle();
  if (!voiceover) return Response.json({ error: "Voiceover not found" }, { status: 404 });

  const logoPath = `${auth.user.id}/${crypto.randomUUID()}.${checked.ext}`;
  const { error: uploadError } = await db.storage.from("logos").upload(logoPath, logo, { contentType: logo.type });
  if (uploadError) throw new Error(uploadError.message);
  const { data, error } = await db
    .from("projects")
    .insert({ user_id: auth.user.id, script: parsed.data.script || null, voiceover_id: voiceover.id, logo_path: logoPath, aspect_ratio: parsed.data.aspectRatio })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return Response.json({ projectId: data.id });
}

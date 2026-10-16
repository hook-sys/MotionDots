import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAiModels } from "@/lib/settings";
import { chargeVoice, refundVoice } from "@/lib/billing/credits";
import { generateVoice } from "@/lib/voice/generate";
import { MAX_SCRIPT_CHARS, voiceCredits } from "@/lib/voice/rules";

const body = z.object({ script: z.string().trim().min(1).max(MAX_SCRIPT_CHARS), voiceArtist: z.string() });

// Speaks the script with the chosen voice artist. Credits are taken first and given back if anything fails.
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { script, voiceArtist } = parsed.data;

  let models;
  try {
    models = await getAiModels();
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 503 });
  }
  if (!models.voiceArtists.includes(voiceArtist)) return Response.json({ error: "Unknown voice artist" }, { status: 400 });

  const credits = voiceCredits(script);
  if (!(await chargeVoice(auth.user.id, credits))) return Response.json({ error: "Not enough credits", needed: credits }, { status: 402 });

  const db = createAdminClient();
  try {
    const audio = await generateVoice(models.voiceModel, voiceArtist, script);
    const path = `${auth.user.id}/${crypto.randomUUID()}.mp3`;
    const { error: uploadError } = await db.storage.from("voice").upload(path, audio, { contentType: "audio/mpeg" });
    if (uploadError) throw new Error(uploadError.message);
    const { data, error } = await db
      .from("voiceovers")
      .insert({ user_id: auth.user.id, source: "generated", script, voice_artist: voiceArtist, path })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return Response.json({ voiceoverId: data.id, credits });
  } catch (e) {
    console.error("voice generation failed", e);
    await refundVoice(auth.user.id, credits);
    return Response.json({ error: "Voice generation failed. Your credits were returned." }, { status: 502 });
  }
}

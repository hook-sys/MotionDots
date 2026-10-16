import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAiModels } from "@/lib/settings";
import { StepError } from "@/lib/ai/fal";
import { chargeVoice, refundVoice } from "@/lib/billing/credits";
import { speak } from "@/lib/voice/speech";
import { MAX_SCRIPT_CHARS, voiceCredits } from "@/lib/voice/rules";

const body = z.object({ script: z.string().trim().min(1).max(MAX_SCRIPT_CHARS), voiceArtist: z.string() });

// Speaks the script with the chosen voice artist. Credits are taken first and given back if anything fails.
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { script, voiceArtist } = parsed.data;

  const models = await getAiModels();
  if (!models.voice) return Response.json({ error: "Voice generation: no model is set. A super admin must set one in /admin/models." }, { status: 503 });
  if (!models.voiceArtists.includes(voiceArtist)) return Response.json({ error: "Unknown voice artist" }, { status: 400 });

  // the same script with the same artist is never paid for twice: the voice made before is used again
  const db = createAdminClient();
  const { data: existing } = await db.from("voiceovers").select("id").eq("user_id", auth.user.id).eq("source", "generated").eq("script", script).eq("voice_artist", voiceArtist).limit(1).maybeSingle();
  if (existing) return Response.json({ voiceoverId: existing.id, credits: 0 });

  const credits = voiceCredits(script);
  if (!(await chargeVoice(auth.user.id, credits))) return Response.json({ error: "Not enough credits", needed: credits }, { status: 402 });

  try {
    const { audio, words } = await speak(voiceArtist, script);
    const path = `${auth.user.id}/${crypto.randomUUID()}.mp3`;
    const { error: uploadError } = await db.storage.from("voice").upload(path, audio, { contentType: "audio/mpeg" });
    if (uploadError) throw new Error(uploadError.message);
    const { data, error } = await db
      .from("voiceovers")
      .insert({ user_id: auth.user.id, source: "generated", script, voice_artist: voiceArtist, path, words })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return Response.json({ voiceoverId: data.id, credits });
  } catch (e) {
    console.error("voice generation failed", e);
    await refundVoice(auth.user.id, credits);
    const why = e instanceof StepError ? e.message : "Voice could not be saved";
    return Response.json({ error: `${why}. Your credits were returned.` }, { status: 502 });
  }
}

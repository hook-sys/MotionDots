import "server-only";
import { createFalClient } from "@fal-ai/client";
import { env } from "@/lib/env";
import { MAX_AUDIO_BYTES } from "@/lib/voice/rules";

// Speaks the script with the admin-chosen fal voice model (ElevenLabs-style input: text + voice).
// Returns the audio bytes.
export async function generateVoice(model: string, voice: string, text: string): Promise<ArrayBuffer> {
  const fal = createFalClient({ credentials: env("FAL_KEY") });
  const result = await fal.subscribe(model, { input: { text, voice } });
  const url = (result.data as { audio?: { url?: string } }).audio?.url;
  if (!url || new URL(url).protocol !== "https:") throw new Error("Voice model returned no audio");
  const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Audio download failed (${res.status})`);
  const bytes = await res.arrayBuffer();
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_AUDIO_BYTES) throw new Error("Voice audio has an invalid size");
  return bytes;
}

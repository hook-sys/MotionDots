import "server-only";
import { StepError, runStep } from "@/lib/ai/fal";
import { MAX_AUDIO_BYTES } from "@/lib/voice/rules";
import { parseElevenLabsWords, parseWhisperWords, type Word } from "@/lib/voice/words";

// Generated voice: the audio and ElevenLabs' own word timestamps.
export async function speak(voice: string, text: string): Promise<{ audio: ArrayBuffer; words: Word[] }> {
  const { data } = await runStep("voice", { text, voice, timestamps: true });
  const url = (data.audio as { url?: string } | undefined)?.url;
  if (!url || new URL(url).protocol !== "https:") throw new StepError("voice", "the model returned no audio");
  const words = parseElevenLabsWords(data.timestamps);
  if (!words) throw new StepError("voice", "the model returned no word timestamps");
  const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new StepError("voice", `audio download failed (${res.status})`);
  const audio = await res.arrayBuffer();
  if (audio.byteLength === 0 || audio.byteLength > MAX_AUDIO_BYTES) throw new StepError("voice", "the audio has an invalid size");
  return { audio, words };
}

// Uploaded voice: Whisper hears it and gives the word timestamps.
export async function transcribe(audioUrl: string): Promise<Word[]> {
  const { data } = await runStep("transcription", { audio_url: audioUrl, task: "transcribe", chunk_level: "word" });
  const words = parseWhisperWords(data.chunks);
  if (!words) throw new StepError("transcription", "the model returned no word timestamps");
  return words;
}

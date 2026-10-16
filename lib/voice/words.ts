// Word-level timing, in seconds from the start of the audio. Strict parsers: anything that
// isn't the expected shape returns null (times are never guessed).
export type Word = { text: string; start: number; end: number };

const isTime = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;

function inOrder(words: Word[]): Word[] | null {
  return words.length > 0 && words.every((w, i) => w.end >= w.start && (i === 0 || w.start >= words[i - 1].start)) ? words : null;
}

// ElevenLabs on fal: timestamps = [{ text, start, end }, ...] (one per word).
export function parseElevenLabsWords(raw: unknown): Word[] | null {
  if (!Array.isArray(raw)) return null;
  const words: Word[] = [];
  for (const w of raw) {
    const { text, start, end } = (w ?? {}) as Record<string, unknown>;
    if (typeof text !== "string" || !text.trim() || !isTime(start) || !isTime(end)) return null;
    words.push({ text: text.trim(), start, end });
  }
  return inOrder(words);
}

// Whisper on fal with chunk_level "word": chunks = [{ text, timestamp: [start, end] }, ...].
export function parseWhisperWords(raw: unknown): Word[] | null {
  if (!Array.isArray(raw)) return null;
  const words: Word[] = [];
  for (const c of raw) {
    const { text, timestamp } = (c ?? {}) as { text?: unknown; timestamp?: unknown };
    const [start, end] = Array.isArray(timestamp) ? timestamp : [];
    if (typeof text !== "string" || !text.trim() || !isTime(start) || !isTime(end)) return null;
    words.push({ text: text.trim(), start, end });
  }
  return inOrder(words);
}

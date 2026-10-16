// Word-level timing, in seconds from the start of the audio. Strict parsers: anything that
// isn't an expected shape returns null (times are never guessed).
export type Word = { text: string; start: number; end: number };

const isTime = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const pick = (o: Record<string, unknown>, keys: string[]) => keys.map((k) => o[k]).find((v) => v !== undefined);

function inOrder(words: Word[]): Word[] | null {
  return words.length > 0 && words.every((w, i) => w.end >= w.start && (i === 0 || w.start >= words[i - 1].start)) ? words : null;
}

// ElevenLabs character timing → words: a word is the run of characters between spaces, with the
// first character's start and the last character's end.
function fromCharacters(o: Record<string, unknown>): Word[] | null {
  const { characters: chars, character_start_times_seconds: starts, character_end_times_seconds: ends } = o;
  if (!Array.isArray(chars) || !Array.isArray(starts) || !Array.isArray(ends)) return null;
  const words: Word[] = [];
  let current: Word | null = null;
  for (let i = 0; i < chars.length; i++) {
    const [c, s, e] = [chars[i], starts[i], ends[i]];
    if (typeof c !== "string" || !isTime(s) || !isTime(e)) return null;
    if (/^\s+$/.test(c)) {
      current = null;
      continue;
    }
    if (!current) words.push((current = { text: "", start: s, end: e }));
    current.text += c;
    current.end = e;
  }
  return words;
}

// ElevenLabs on fal. Its timestamps are not formally documented, so two shapes are read:
// a word list [{ text|word, start|start_time, end|end_time }] or character alignment
// ({ characters, character_start_times_seconds, character_end_times_seconds }, optionally inside "alignment").
export function parseElevenLabsWords(raw: unknown): Word[] | null {
  const items = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? [raw] : null;
  if (!items) return null;
  const words: Word[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") return null;
    const o = item as Record<string, unknown>;
    const chars = fromCharacters((o.alignment ?? o.normalized_alignment ?? o) as Record<string, unknown>);
    if (chars) {
      words.push(...chars);
      continue;
    }
    const [text, start, end] = [pick(o, ["text", "word"]), pick(o, ["start", "start_time", "start_seconds"]), pick(o, ["end", "end_time", "end_seconds"])];
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

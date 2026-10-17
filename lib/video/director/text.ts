import type { Word } from "@/lib/voice/words";

// Reading the narration: sentences, scenes (at most 6 s each, timed by the voice's word timestamps),
// the numbers the voice says, lists, and the few words a scene shows.

export const MAX_SCENE_SECONDS = 6;
export const MIN_SCENE_SECONDS = 1.4;
// a sentence longer than this is cut where the voice pauses (a comma, a gap), if both halves have room to be seen
const SOFT_SECONDS = 4.2;
const HALF_SECONDS = 1.8;
export const SHOWN_MIN = 2;
export const SHOWN_MAX = 6;

const STOP_END = /[.!?।॥]["”’)]*$/;
const PAUSE_END = /[.,;:!?—–।॥]["”’)]*$/;
export const bare = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}%$€£৳]/gu, "");
export const clean = (t: string) => t.replace(/^[^\p{L}\p{N}$€£৳]+|[^\p{L}\p{N}%]+$/gu, "");
export const STOP = new Set("a an and as at be but by for from in into is it its of on or so than that the then this to was we with you your our are will can just now also even still very really every each all some more most not do does did has have had their them they there here what when where which while who why how if about over under out up down off any one two get gets got make makes made let lets see sees need needs want wants like using use uses way ways thing things".split(" "));

// A unit of the narration: the words from..to (indexes into the voice's words).
export type Unit = { from: number; to: number; end: "." | "?" | "!" | "," | "" };
const endOf = (t: string): Unit["end"] => (/[?]["”’)]*$/.test(t) ? "?" : /[!]["”’)]*$/.test(t) ? "!" : /[।॥]["”’)]*$/.test(t) || (/[.]$/.test(t) && !/\d\.$/.test(t)) ? "." : /[,;:—–]$/.test(t) ? "," : "");

// Sentences by their punctuation; a voice with none is cut at its pauses.
export function sentences(words: Word[]): Unit[] {
  const punctuated = words.some((w) => STOP_END.test(w.text.trim()));
  const out: Unit[] = [];
  let from = 0;
  words.forEach((w, i) => {
    const e = endOf(w.text.trim());
    const gap = (words[i + 1]?.start ?? w.end + 1) - w.end;
    const cut = punctuated ? !!e && e !== "," : gap > 0.45 || i - from >= 13;
    if (cut || i === words.length - 1) {
      out.push({ from, to: i, end: e === "," ? "" : e });
      from = i + 1;
    }
  });
  return out;
}

const seconds = (words: Word[], u: Unit) => words[u.to].end - words[u.from].start;

// A sentence cut into parts of at most MAX_SCENE_SECONDS: at a comma or a pause or a joining word, near the middle.
function split(words: Word[], u: Unit): Unit[] {
  const long = seconds(words, u);
  if (long <= SOFT_SECONDS || u.to - u.from < 3) return [u];
  const mid = (words[u.from].start + words[u.to].end) / 2;
  let best = -1;
  let bestScore = -Infinity;
  for (let i = u.from + 1; i < u.to - 1; i++) {
    const w = words[i];
    const gap = words[i + 1].start - w.end;
    const next = bare(words[i + 1].text);
    const score = (PAUSE_END.test(w.text) ? 3 : 0) + (gap > 0.18 ? 2 : 0) + (["and", "but", "so", "because", "then", "while", "which"].includes(next) ? 1.5 : 0) - Math.abs(w.end - mid) * 0.6;
    const left = w.end - words[u.from].start;
    const right = words[u.to].end - words[i + 1].start;
    const room = long > MAX_SCENE_SECONDS ? MIN_SCENE_SECONDS : HALF_SECONDS;
    if (left >= room && right >= room && score > bestScore) [best, bestScore] = [i, score];
  }
  // (between 4.2 and 6 s only a real pause is worth a cut)
  if (best < 0 || (long <= MAX_SCENE_SECONDS && bestScore < 2)) {
    if (long <= MAX_SCENE_SECONDS) return [u];
    best = Math.floor((u.from + u.to) / 2);
  }
  return [...split(words, { from: u.from, to: best, end: "" }), ...split(words, { from: best + 1, to: u.to, end: u.end })];
}

// The scenes: one per sentence (cut when longer than 6 s), a very short one joined to its neighbour.
export function sceneUnits(words: Word[]): Unit[] {
  const parts = sentences(words).flatMap((u) => split(words, u));
  const out: Unit[] = [];
  parts.forEach((u, k) => {
    const prev = out[out.length - 1];
    // (two very short ones read as one: "No credit card. No time limit."; the closing sentence stays its own)
    if (k < parts.length - 1 && prev && (seconds(words, u) < MIN_SCENE_SECONDS || seconds(words, prev) < MIN_SCENE_SECONDS) && seconds(words, { from: prev.from, to: u.to, end: u.end }) <= MAX_SCENE_SECONDS) out[out.length - 1] = { from: prev.from, to: u.to, end: u.end };
    else out.push(u);
  });
  return out;
}

// ── numbers ───────────────────────────────────────────────────────────────
const NUMBER_WORDS: Record<string, string> = { zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12", fifteen: "15", twenty: "20", thirty: "30", forty: "40", fifty: "50", sixty: "60", ninety: "90", hundred: "100", thousand: "1,000" };
export type Spoken = { index: number; value: string };

// The numbers the voice says in from..to: "40%", "$2,400", "3x", "10k", "five" (as 5; "forty percent" as 40%).
// Only what is said is ever shown.
export function numbersIn(words: Word[], from: number, to: number): Spoken[] {
  const out: Spoken[] = [];
  for (let i = from; i <= to; i++) {
    const t = clean(words[i].text);
    const low = bare(words[i].text);
    let value: string | null = null;
    if (/\d/.test(t)) value = t.replace(/[.,]$/, "");
    else if (low in NUMBER_WORDS) {
      // ("one" alone is a pronoun as often as a number: only before a unit)
      const unit = /^(day|days|hour|hours|minute|minutes|second|seconds|week|weeks|click|clicks|step|steps)$/.test(bare(words[i + 1]?.text ?? ""));
      if (low !== "one" || unit) value = NUMBER_WORDS[low];
    }
    if (!value) continue;
    const next = bare(words[i + 1]?.text ?? "");
    if (/^(percent|per)$/.test(next) && !value.endsWith("%")) value += "%";
    out.push({ index: i, value });
  }
  return out;
}

// ── lists ─────────────────────────────────────────────────────────────────
// "sends the invoice, reminds your client, and collects the money" → three parts.
export function listParts(words: Word[], u: Unit): { from: number; to: number }[] {
  const parts: { from: number; to: number }[] = [];
  let start = u.from;
  for (let i = u.from; i <= u.to; i++) {
    const b = bare(words[i].text);
    if ((b === "and" || b === "or") && i > start) {
      parts.push({ from: start, to: i - 1 });
      start = i + 1;
    } else if (/[,;]["”’)]*$/.test(words[i].text) && i >= start) {
      parts.push({ from: start, to: i });
      start = i + 1;
    }
  }
  if (start <= u.to) parts.push({ from: start, to: u.to });
  return parts.filter((p) => p.to >= p.from);
}

// ── the words a scene shows ───────────────────────────────────────────────
export const LITTLE_WORDS = new Set("a an and as at be but by for from in into is it its of on or so than that the then this to was we with you your our are will can just now also even still very really every each all some more most not".split(" "));
// ("one" is left out: "one place", "one live dashboard" are idioms, not figures)
const NUMBERISH = /\d|^(two|three|four|five|six|seven|eight|nine|ten|twice|half|hundred|thousand)$/;

// [first, last] word index of the 2–6 words a scene shows inside [from, to]: the phrase that carries the scene
// (the keyword, a spoken number, the thing named) — never one starting or ending on a little word ("and", "the", "in"),
// never across a sentence end, always holding `must` (the keyword) when given, and never a word in `ban` (a number
// that a counter shows instead).
export function shownWindow(words: Word[], from: number, to: number, keys: Set<string>, must: number | null, ban: Set<number> = new Set()): [number, number] {
  const maxLen = Math.min(SHOWN_MAX, to - from + 1);
  const banned = (a: number, b: number) => [...ban].some((i) => i >= a && i <= b);
  if (to - from + 1 <= SHOWN_MAX && !banned(from, to)) return [from, to];
  let best: [number, number] = [from, from + maxLen - 1];
  let bestScore = -Infinity;
  for (let a = from; a <= to; a++) {
    for (let len = SHOWN_MIN; len <= SHOWN_MAX && a + len - 1 <= to; len++) {
      const b = a + len - 1;
      if ((must != null && (must < a || must > b)) || banned(a, b)) continue;
      const ws = words.slice(a, b + 1).map((w) => w.text);
      const plain = ws.map(bare);
      let score = 0;
      plain.forEach((w) => {
        if (keys.has(w)) score += 3.5;
        if (NUMBERISH.test(w)) score += 2.5;
        if (w.length > 2 && !LITTLE_WORDS.has(w)) score += 1;
      });
      if (LITTLE_WORDS.has(plain[0])) score -= 1.6;
      if (LITTLE_WORDS.has(plain[len - 1])) score -= 2;
      // a phrase that ends where the voice stops or pauses reads as one
      if (b === to || PAUSE_END.test(ws[len - 1])) score += 1.2;
      else if (LITTLE_WORDS.has(bare(words[b + 1]?.text ?? ""))) score -= 1;
      else score -= 4;
      if (a === from || PAUSE_END.test(words[a - 1]?.text ?? "")) score += 0.8;
      // never across a sentence end (two very short sentences read as one)
      score -= ws.slice(0, -1).filter((w) => STOP_END.test(w)).length * (len <= 6 ? 1 : 6);
      score -= ws.slice(0, -1).filter((w) => PAUSE_END.test(w) && !STOP_END.test(w)).length * 7;
      // (the hook: two to four words read at a glance)
      score -= Math.abs(len - 3.2) * 0.5;
      if (score > bestScore) [best, bestScore] = [[a, b], score];
    }
  }
  return best;
}

// A word as the screen shows it: the first one capitalised, the last without a trailing comma or dash.
export function shownWord(t: string, first: boolean, last: boolean): string {
  let s = t.trim();
  if (last) s = s.replace(/[,;:—–-]+$/, "");
  if (first && /^[a-z][a-z'’-]*[^a-z]*$/.test(s)) s = s.charAt(0).toUpperCase() + s.slice(1);
  return s || t;
}

// The content words of from..to (nouns and the like), once each, in the order said — for the rows of a piece.
// `avoid`: stems already on screen (a piece never repeats the headline).
export const stem = (w: string) => bare(w).replace(/(ing|ed|es|s)$/, "");
export function contentWords(words: Word[], from: number, to: number, avoid: Set<string>): { index: number; text: string }[] {
  const out: { index: number; text: string }[] = [];
  const seen = new Set(avoid);
  for (let i = from; i <= to; i++) {
    const t = clean(words[i].text);
    const low = bare(words[i].text);
    if (t.length < 3 || STOP.has(low) || /\d/.test(t) || /ly$/.test(low) || seen.has(stem(t))) continue;
    seen.add(stem(t));
    out.push({ index: i, text: t.charAt(0).toUpperCase() + t.slice(1) });
  }
  return out;
}

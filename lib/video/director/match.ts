import type { Word } from "@/lib/voice/words";
import type { Match, PieceKind } from "../plan";
import DICTIONARY from "../dictionary.json";
import { bare } from "./text";

// The keyword dictionary: business, ERP and SaaS words → an icon, a UI piece and a label.
// Problem words (slow, manual, mistakes, late…) → the notification stack.

type Entry = { label: string; icon: string; piece: PieceKind | null; problem: boolean; weak: boolean };
// (generic concepts: they may still give an icon, but never lead over a real subject)
const WEAK = new Set(["Speed", "Simple", "Trust", "Savings", "Launch", "Learn", "Ideas", "Time", "Tools", "Global", "Free trial", "AI", "Conversion"]);

const BY_WORD = new Map<string, Entry>();
for (const [label, icon, piece, words] of DICTIONARY.entries as [string, string, PieceKind | null, string[]][]) for (const w of words) BY_WORD.set(w, { label, icon, piece, problem: false, weak: WEAK.has(label) });
for (const [label, icon, words] of DICTIONARY.problems as [string, string, string[]][]) for (const w of words) BY_WORD.set(w, { label, icon, piece: "notifications", problem: true, weak: false });

export const DICTIONARY_SIZE = BY_WORD.size;

// A word's entry: exactly as spoken, else without a plural, "-ed" or "-ing".
function lookup(token: string): Entry | null {
  const hit = BY_WORD.get(token);
  if (hit) return hit;
  for (const suffix of ["es", "s", "ing", "ed"]) if (token.endsWith(suffix) && token.length > suffix.length + 2) {
    const stem = token.slice(0, -suffix.length);
    const e = BY_WORD.get(stem) ?? BY_WORD.get(stem + "e");
    if (e) return e;
  }
  return null;
}

export type Hit = Match & { index: number; entryData: Entry };

// Every dictionary word spoken in from..to, in the order said.
export function matchRange(words: Word[], from: number, to: number): Hit[] {
  const out: Hit[] = [];
  for (let i = from; i <= to; i++) {
    const token = bare(words[i].text);
    const e = token.length > 1 ? lookup(token) : null;
    if (e) out.push({ index: i, word: token, entry: e.label, role: e.problem ? "problem" : "other", entryData: e });
  }
  return out;
}

// (describing words: they name how, not what — a subject beats them)
const DESCRIBING = new Set(["automatic", "automatically", "automated", "automate", "instantly", "quickly", "easily", "simply", "online", "live", "free", "fast", "faster", "fastest", "smart", "secure", "safe"]);

// The scene's keyword: the strongest subject spoken — a real subject (a noun) beats a generic concept, a describing
// word or a problem; the longer, more specific word wins, and of equals the later (the subject comes after its verb).
export function keywordOf(hits: Hit[]): Hit | null {
  const score = (h: Hit) => (h.entryData.problem ? -5 : 0) + (h.entryData.weak ? -3 : 0) + (DESCRIBING.has(h.word) ? -4 : 0) + (/ly$/.test(h.word) ? -2 : 0) + (h.entryData.piece ? 0.5 : 0) + Math.min(h.word.length, 10) * 0.15 + h.index * 0.001;
  return [...hits].sort((a, b) => score(b) - score(a))[0] ?? null;
}

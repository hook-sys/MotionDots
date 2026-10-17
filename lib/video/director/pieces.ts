import type { Word } from "@/lib/voice/words";
import type { PieceKind, PieceSpec, Row, Stat } from "../plan";
import type { Rng } from "../rng";
import type { Hit } from "./match";
import { type Spoken, type Unit, bare, clean, contentWords, listParts, stem } from "./text";

// The UI pieces, each filled from what the voice says in its scene — never placeholder rows, never a number
// the voice does not say, never text already on screen (the headline's words are `onScreen`). A piece that
// cannot be filled honestly is not made (the scene is then words and an icon).

export type PieceInput = {
  words: Word[];
  unit: Unit;
  // stems of the words the scene's headline shows
  onScreen: Set<string>;
  hits: Hit[];
  keyword: Hit | null;
  numbers: Spoken[];
  icon: string;
  R: Rng;
};

const GROWTH = /^(grow|grows|growing|growth|increase|increases|boost|boosts|more|higher|double|doubles|triple|rise|rises|rising|up|scale|scaling|faster|improve|improves)$/;

// A row's text: at most three words on one line (a cell never wraps), the first letter capital.
export function cell(text: string, max = 22): string {
  let ws = text.trim().split(/\s+/).slice(0, 3);
  while (ws.length > 1 && ws.join(" ").length > max) ws = ws.slice(0, -1);
  const t = ws.join(" ").slice(0, max);
  return t.charAt(0).toUpperCase() + t.slice(1);
}
// A text is "on screen already" when every content word of it is.
const shown = (text: string, onScreen: Set<string>) => {
  const stems = text.split(/\s+/).map((w) => stem(w)).filter((s) => s.length > 2);
  return stems.length > 0 && stems.every((s) => onScreen.has(s));
};
const dedupe = (rows: Row[], onScreen: Set<string>, max: number): Row[] => {
  const seen = new Set<string>();
  const out: Row[] = [];
  for (const r of rows) {
    const key = stem(r.title);
    if (!r.title || seen.has(key) || shown(r.title, onScreen)) continue;
    seen.add(key);
    out.push(r);
    if (out.length >= max) break;
  }
  return out;
};

// Rows from the scene: the parts of a list the voice says, else the content words, else the labels of what matched.
function rowsOf(p: PieceInput, max: number): Row[] {
  const iconOf = (index: number) => p.hits.find((h) => h.index === index)?.entryData.icon ?? p.icon;
  const parts = listParts(p.words, p.unit);
  const rows: Row[] = [];
  if (parts.length >= 3) {
    for (const part of parts) {
      const content = contentWords(p.words, part.from, part.to, new Set());
      if (content.length) rows.push({ title: cell(content.slice(0, 2).map((c) => c.text).join(" ")), icon: iconOf(content[0].index) });
    }
  }
  const fresh = contentWords(p.words, p.unit.from, p.unit.to, p.onScreen);
  for (const c of fresh) rows.push({ title: cell(c.text), icon: iconOf(c.index) });
  // (what matched, named by the dictionary: only where it adds a thing the screen does not already say)
  for (const h of p.hits) rows.push({ title: cell(h.entry), icon: h.entryData.icon });
  return dedupe(rows, p.onScreen, max);
}

// Problem rows: each problem word the voice says with the thing it hits ("Late invoices").
function problemRows(p: PieceInput): Row[] {
  const rows: Row[] = [];
  for (const h of p.hits.filter((x) => x.entryData.problem)) {
    const next = contentWords(p.words, h.index + 1, Math.min(p.unit.to, h.index + 3), new Set())[0];
    const head = clean(p.words[h.index].text);
    rows.push({ title: cell(next ? `${head} ${next.text}` : head), icon: h.entryData.icon });
  }
  return dedupe([...rows, ...rowsOf(p, 3)], p.onScreen, 3);
}

// "40% faster, 3x more leads": each number with the word beside it.
function statsOf(p: PieceInput): Stat[] {
  const stats: Stat[] = [];
  for (const n of p.numbers) {
    const after = contentWords(p.words, n.index + 1, Math.min(p.unit.to, n.index + 3), p.onScreen)[0];
    const before = contentWords(p.words, Math.max(p.unit.from, n.index - 3), n.index - 1, p.onScreen).at(-1);
    const title = after?.text ?? before?.text;
    if (title) stats.push({ title: cell(title, 18), value: n.value });
  }
  return stats.slice(0, 4);
}

// A series that grows (a decorative curve: its numbers are never shown unless the voice said one).
const risingValues = (R: Rng) => {
  let v = R.range(2.5, 4);
  return Array.from({ length: 8 }, () => (v += R.range(0.3, 1.5)));
};

// (a title is never also one of its own rows)
const apart = (rows: Row[], title: string | null) => rows.filter((r) => !title || stem(r.title) !== stem(title));

export function buildPiece(kind: PieceKind, p: PieceInput): PieceSpec | null {
  const title = (() => {
    const label = p.keyword?.entry ?? null;
    return label && !shown(label, p.onScreen) ? label : null;
  })();
  const growing = p.words.slice(p.unit.from, p.unit.to + 1).some((w) => GROWTH.test(bare(w.text)));
  switch (kind) {
    case "counter": {
      const n = p.numbers[0];
      if (!n) return null;
      const after = contentWords(p.words, n.index + 1, Math.min(p.unit.to, n.index + 3), p.onScreen)[0];
      const label = after?.text ?? title;
      return growing ? { kind: "chart", title: label ?? null, values: risingValues(p.R), value: n.value } : { kind: "counter", value: n.value, label: label ?? null, icon: p.icon };
    }
    case "dashboard": {
      const stats = statsOf(p);
      if (stats.length >= 2) return { kind: "dashboard", title, stats };
      // (a dashboard needs its numbers said: one number is a counter, none is a list)
      return p.numbers.length === 1 ? buildPiece("counter", p) : buildPiece("list", p);
    }
    case "chart":
      return { kind: "chart", title, values: risingValues(p.R), value: p.numbers[0]?.value ?? null };
    case "list": {
      const rows = apart(rowsOf(p, 5), title).slice(0, 4);
      return rows.length >= 2 ? { kind: "list", title, icon: p.icon, rows } : null;
    }
    case "search": {
      const rows = rowsOf(p, 3);
      const query = (() => {
        const fresh = contentWords(p.words, p.unit.from, p.unit.to, p.onScreen);
        const q = fresh.slice(0, 3).map((c) => c.text.toLowerCase()).join(" ");
        return q.slice(0, 24) || (title ? title.toLowerCase() : "");
      })();
      return query && rows.length ? { kind: "search", query, icon: p.icon, rows: rows.filter((r) => stem(r.title) !== stem(query)) } : null;
    }
    case "notifications": {
      const rows = p.hits.some((h) => h.entryData.problem) ? problemRows(p) : rowsOf(p, 3);
      return rows.length >= 2 ? { kind: "notifications", title: null, icon: p.icon, rows } : null;
    }
    case "phone": {
      const rows = apart(rowsOf(p, 5), title).slice(0, 4);
      return rows.length >= 2 ? { kind: "phone", screen: p.hits.some((h) => h.entryData.problem) ? "notifications" : "list", title, icon: p.icon, rows } : null;
    }
  }
}

// What to try, in order, for a scene's hits (the keyword's own piece first).
export function candidates(p: PieceInput, base: PieceKind | null, kindIsNumber: boolean): PieceKind[] {
  const out: PieceKind[] = [];
  if (kindIsNumber) out.push(p.numbers.length >= 2 ? "dashboard" : "counter");
  if (base) out.push(base);
  out.push("list");
  return [...new Set(out)];
}


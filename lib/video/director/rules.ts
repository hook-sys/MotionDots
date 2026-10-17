import type { Word } from "@/lib/voice/words";
import { ENERGY } from "../energy";
import { geometry } from "../geometry";
import { resolveIcon } from "../icons";
import { type PieceSpec, type VideoPlan, FPS } from "../plan";
import { bare, clean, stem } from "./text";

// The v2 rules, checked on a finished plan: [] means the plan keeps every one of them. The director is built so
// that it does; this is the proof (the tests run it over scripts, seeds and shapes of frame).

const NUMBER_WORDS: Record<string, string> = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", twenty: "20", thirty: "30", fifty: "50", hundred: "100" };
const PEOPLE = /^(user|users|person|contact|baby|face|smile|hand|handshake|bird|cat|dog|fish)(-|$)/;

// Every piece text the viewer reads (cells, titles, values), apart from the chart's drawn curve.
function cellsOf(p: PieceSpec): string[] {
  switch (p.kind) {
    case "dashboard": return [p.title ?? "", ...p.stats.flatMap((s) => [s.title, s.value])];
    case "chart": return [p.title ?? "", p.value ?? ""];
    case "list": case "notifications": case "phone": return [p.title ?? "", ...p.rows.map((r) => r.title)];
    case "search": return [p.query, ...p.rows.map((r) => r.title)];
    case "counter": return [p.value, p.label ?? ""];
  }
}

export function violations(plan: VideoPlan, words: Word[]): string[] {
  const out: string[] = [];
  const bad = (i: number, what: string) => out.push(`scene ${i}: ${what}`);
  const spoken = new Set(words.map((w) => bare(w.text)));
  const spokenDigits = new Set([...words.flatMap((w) => w.text.match(/\d+/g) ?? []), ...words.map((w) => NUMBER_WORDS[bare(w.text)]).filter(Boolean)]);
  const n = plan.scenes.length;
  const energy = ENERGY[plan.energy];

  if (!plan.brand.logoUrl) out.push("no logo: the real uploaded logo must always be shown");
  if (plan.scenes[0].from !== 0) out.push("the first scene does not start at 0");
  if (plan.duration < Math.round(words[words.length - 1].end * FPS)) out.push("the video ends before the voice");

  plan.scenes.forEach((s, i) => {
    if (i && s.from !== plan.scenes[i - 1].to) bad(i, "gap or overlap in time");
    if (s.to - s.from > 6 * FPS) bad(i, `longer than 6 s (${((s.to - s.from) / FPS).toFixed(1)} s)`);
    if ((s.kind === "cta") !== (i === n - 1)) bad(i, "the closing scene (and only it) is the call to action");
    if ((s.template === "cta") !== (i === n - 1)) bad(i, "the cta template is for the closing scene only");
    if (i === n - 1 && !s.cta) bad(i, "the closing scene has no button");

    // the words: 2–6 of the voice's own, one highlighted, in order, none before its scene
    if (s.words.length < 2 || s.words.length > 6) bad(i, `${s.words.length} words on screen`);
    if (s.words.filter((w) => w.key).length !== 1) bad(i, "needs exactly one highlighted keyword");
    s.words.forEach((w, k) => {
      if (!spoken.has(bare(w.t))) bad(i, `"${w.t}" was never spoken`);
      if (k && w.at < s.words[k - 1].at) bad(i, "words out of order");
      if (w.at < s.from) bad(i, "a word comes in before its scene");
    });

    // no duplicate text, short cells, only spoken numbers, no placeholders
    if (s.piece) {
      const cells = cellsOf(s.piece).filter(Boolean);
      const shown = new Set(s.words.map((w) => stem(clean(w.t))).filter((x) => x.length > 2));
      const seen = new Set<string>();
      for (const cell of cells) {
        if ((cell.trim().split(/\s+/).length > 3 || cell.length > 22) && s.piece.kind !== "search") bad(i, `cell too long: "${cell}"`);
        const key = cell.toLowerCase();
        if (seen.has(key)) bad(i, `duplicate text: "${cell}"`);
        seen.add(key);
        const stems = cell.split(/\s+/).map((x) => stem(clean(x))).filter((x) => x.length > 2);
        if (stems.length && stems.every((x) => shown.has(x))) bad(i, `"${cell}" repeats the words on screen`);
        for (const d of cell.match(/\d+/g) ?? []) if (!spokenDigits.has(d)) bad(i, `number ${d} was never spoken`);
        if (/lorem|placeholder|item \d|text here/i.test(cell)) bad(i, `placeholder text: "${cell}"`);
      }
      // headers match their cells: every dashboard stat has a title and a value
      if (s.piece.kind === "dashboard") for (const st of s.piece.stats) if (!st.title || !st.value) bad(i, "a dashboard cell without its header or value");
    }

    // the icon: valid, never a person
    const icon = resolveIcon(s.icon);
    if (!icon || PEOPLE.test(icon)) bad(i, `bad icon "${s.icon}"`);

    // the camera never still and never the same twice; no template twice in a row (kinetic type excepted)
    if (!s.camera) bad(i, "no camera");
    if (i && s.camera === plan.scenes[i - 1].camera) bad(i, "same camera twice in a row");
    if (i && s.template === plan.scenes[i - 1].template && !(plan.shape === "kinetic-type" && s.template === "type")) bad(i, `template "${s.template}" twice in a row`);
    if (!s.enter) bad(i, "no way in (never a cut)");

    // everything inside the frame, nothing on anything else
    const g = geometry(s, i, plan.w, plan.h);
    const parts = Object.entries({ text: g.text, icon: s.template === "cta" ? null : g.icon, piece: g.piece, logo: g.logo, button: g.button }).filter((p): p is [string, NonNullable<typeof g.text>] => !!p[1]);
    parts.forEach(([name, b], a) => {
      if (b.x < -0.5 || b.y < -0.5 || b.x + b.w > plan.w + 0.5 || b.y + b.h > plan.h + 0.5) bad(i, `${name} leaves the frame`);
      for (const [other, c] of parts.slice(a + 1)) if (b.x < c.x + c.w - 0.5 && c.x < b.x + b.w - 0.5 && b.y < c.y + c.h - 0.5 && c.y < b.y + b.h - 0.5) bad(i, `${name} overlaps ${other}`);
    });
    if (i === 0 && !g.logo) bad(i, "the logo is shown in the first scene");
    if (s.template === "cta" && !g.logo) bad(i, "the logo is shown with the call to action");
  });

  // the ways between scenes: about the energy's share of them continuous (morph / zoom through)
  if (n >= 5) {
    const continuous = plan.scenes.filter((s, i) => i && (s.enter === "morph" || s.enter === "zoom")).length;
    if (continuous < Math.floor((n - 1) * energy.share) - 1) out.push(`only ${continuous} continuous transitions in ${n - 1} (${plan.energy} wants about ${Math.round(energy.share * 100)} %)`);
  }
  return out;
}

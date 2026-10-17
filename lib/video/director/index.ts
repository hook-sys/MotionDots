import type { Word } from "@/lib/voice/words";
import { type AspectRatio, DIMENSIONS } from "@/lib/aspect";
import type { Look } from "../look";
import { type Brand, FPS, type Match, type PieceKind, type Scene, type SceneKind, STORY_SHAPES, type StoryShape, type Template, type VideoPlan } from "../plan";
import { rng, stir } from "../rng";
import { planCameras, planCursors, planTransitions } from "./flow";
import { type Hit, keywordOf, matchRange } from "./match";
import { type PieceInput, buildPiece } from "./pieces";
import { applyShape } from "./shapes";
import { LITTLE_WORDS, bare, clean, listParts, numbersIn, sceneUnits, shownWindow, shownWord, stem } from "./text";

// The code director: no AI, deterministic for a seed. It reads the voice's words (with their timestamps), cuts them
// into scenes of at most six seconds by sentence, shows 2–6 of each sentence's own words with one lit, finds what the
// scene is about in the keyword dictionary (an icon and a UI piece), and fills the piece from what the voice says.

const END_CARD_FRAMES = 48;
const FALLBACK_ICONS = ["sparkles", "zap", "target", "lightbulb", "rocket", "star", "layout-grid"];

// `audioSeconds`: the voice's own length, so the video never ends before it.
export type DirectInput = { words: Word[]; look: Look; aspect: AspectRatio; brand: Brand; seed: number; shape?: StoryShape; audioSeconds?: number };

type Draft = Scene & { input: PieceInput | null; base: PieceKind | null };

function kindOf(i: number, n: number, end: string, hits: Hit[], numbers: number, list: boolean): SceneKind {
  if (i === n - 1) return "cta";
  const problems = hits.filter((h) => h.entryData.problem).length;
  // (a question full of problems shows the pain; any other question asks the search bar)
  if (end === "?" && problems < 2) return "question";
  if (numbers) return "number";
  if (problems) return "problem";
  if (list) return "list";
  if (hits.some((h) => h.entryData.piece === "phone")) return "app";
  if (hits.length) return i === 0 ? "hook" : "feature";
  return i === 0 ? "hook" : "statement";
}

// The button's words, from what the closing sentence is asking for (never repeating the headline).
const ASKS: [RegExp, string[]][] = [
  [/\b(book|demo|appointment|schedule)\b/, ["Book a demo", "Reserve a spot"]],
  [/\b(try|free|trial)\b/, ["Start free", "Try it now"]],
  [/\b(download|install)\b/, ["Download", "Get the app"]],
  [/\b(visit|website|site)\b/, ["Visit the site", "Learn more"]],
  [/\b(contact|call|talk|reach)\b/, ["Get in touch", "Talk to us"]],
  [/\b(join|sign|register|subscribe)\b/, ["Join now", "Sign up"]],
];
function ctaLabel(sentence: string, onScreen: Set<string>): string {
  const pool = [...(ASKS.find(([re]) => re.test(sentence.toLowerCase()))?.[1] ?? []), "Get started", "Start now", "Let's go"];
  return pool.find((l) => !l.split(/\s+/).map(stem).filter((s) => s.length > 2).every((s) => onScreen.has(s))) ?? pool[pool.length - 1];
}

export function direct({ words, look, aspect, brand, seed, shape: shapeIn, audioSeconds = 0 }: DirectInput): VideoPlan {
  if (!words.length) throw new Error("There are no words to make a video from.");
  const { width: w, height: h } = DIMENSIONS[aspect];
  const R = rng(stir(seed ^ 0xd1ce5eed));
  const shape = shapeIn ?? R.pick(STORY_SHAPES);
  const units = sceneUnits(words);
  const n = units.length;
  const duration = Math.max(Math.round(words[words.length - 1].end * FPS) + END_CARD_FRAMES, Math.ceil(audioSeconds * FPS));
  const frameOf = (index: number) => Math.round(words[index].start * FPS);
  const portrait = h >= w;

  const drafts: Draft[] = units.map((u, i) => {
    const from = i === 0 ? 0 : frameOf(u.from);
    const to = i === n - 1 ? duration : frameOf(units[i + 1].from);
    const hits = matchRange(words, u.from, u.to);
    const keyword = keywordOf(hits);
    const numbers = numbersIn(words, u.from, u.to);
    const parts = listParts(words, u);
    const kind = kindOf(i, n, u.end, hits, numbers.length, parts.length >= 3);

    // the 2–6 words shown, holding the keyword; a number a piece will show is not also in the words
    const [a, b] = shownWindow(words, u.from, u.to, new Set(hits.map((x) => x.word)), keyword?.index ?? null, kind === "number" ? new Set(numbers.map((x) => x.index)) : new Set());
    const inWindow = (idx: number) => idx >= a && idx <= b;
    const lit =
      (keyword && inWindow(keyword.index) ? keyword.index : null) ??
      hits.find((x) => inWindow(x.index) && !x.entryData.problem)?.index ??
      hits.find((x) => inWindow(x.index))?.index ??
      [...Array(b - a + 1).keys()].map((k) => a + k).filter((idx) => !LITTLE_WORDS.has(bare(words[idx].text))).sort((x, y) => clean(words[y].text).length - clean(words[x].text).length)[0] ??
      a;
    const screen = Array.from({ length: b - a + 1 }, (_, k) => {
      const idx = a + k;
      return { t: shownWord(words[idx].text, idx === a, idx === b), at: frameOf(idx), key: idx === lit };
    });
    const onScreen = new Set(screen.map((x) => stem(clean(x.t))).filter((s) => s.length > 2));

    const icon = keyword?.entryData.icon ?? hits.find((x) => x.entryData.problem)?.entryData.icon ?? hits[0]?.entryData.icon ?? FALLBACK_ICONS[(stir(seed + i) >>> 0) % FALLBACK_ICONS.length];
    const usable = numbers.filter((x) => !inWindow(x.index));
    const input: PieceInput = { words, unit: u, onScreen, hits, keyword, numbers: usable, icon, R };
    const base: PieceKind | null = kind === "question" ? "search" : kind === "problem" ? "notifications" : kind === "number" ? (usable.length >= 2 ? "dashboard" : usable.length === 1 ? "counter" : null) : kind === "list" ? "list" : kind === "app" ? "phone" : (keyword?.entryData.piece ?? null);

    const matched: Match[] = hits.map((x) => ({ word: x.word, entry: x.entry, role: x.index === keyword?.index ? "keyword" : x.entryData.problem ? "problem" : "other" }));
    const sentence = words.slice(u.from, u.to + 1).map((x) => x.text).join(" ");
    const keywordFrame = keyword ? frameOf(keyword.index) : from + 8;
    return {
      from, to, kind, words: screen, icon,
      iconAt: Math.max(from + 4, keywordFrame - 2),
      piece: null, pieceAt: Math.max(from + 8, keywordFrame - 2), hit: null, cursor: null,
      template: "type", cta: kind === "cta" ? ctaLabel(sentence, onScreen) : null,
      camera: "drift", enter: "fade", matched,
      input, base,
    };
  });

  // a scene begins where its words do (the scene before carries on over what is said until then — never past six seconds)
  drafts.forEach((d, i) => {
    if (!i) return;
    const start = Math.min(d.words[0].at - 8, drafts[i - 1].from + 6 * FPS);
    if (start > d.from + 12) {
      d.from = start;
      drafts[i - 1].to = start;
    }
  });

  // the pieces: the keyword's own, else a list where the story shape wants one; none where it cannot be filled honestly
  const make = (d: Draft, order: PieceKind[]) => {
    for (const kind of order) {
      const piece = d.input && buildPiece(kind, d.input);
      if (piece) return piece;
    }
    return null;
  };
  drafts.forEach((d) => {
    if (d.kind === "cta" || !d.input) return;
    d.piece = make(d, d.base ? [d.base, "list"] : []);
  });
  applyShape(drafts, shape, make, R);

  // when each piece's moment happens (a row ticks, a number jumps, the cursor clicks)
  drafts.forEach((d, i) => {
    if (!d.piece && d.kind !== "cta") return;
    const last = d.input ? frameOf(Math.max(d.input.unit.from, d.input.unit.to - 1)) : d.to - 24;
    const hit = Math.min(d.to - 20, Math.max(d.pieceAt + 30, last));
    d.hit = hit >= d.pieceAt + 30 ? hit : null;
    if (i === drafts.length - 1) d.hit = Math.max(d.from + 30, Math.min(d.to - 36, d.from + 54));
  });

  // the templates: words and the main thing share the frame, each filling its part; never the same twice in a row
  const pool = (piece: boolean): Template[] => (piece ? (portrait || w === h ? ["top", "bottom"] : ["split-left", "split-right", "top", "bottom"]) : ["type", "center"]);
  const used = new Map<Template, number>();
  let prev: Template | null = null;
  const withPiece = drafts.filter((d) => d.piece).length;
  const cap = Math.max(2, Math.ceil(withPiece / pool(true).length));
  drafts.forEach((d) => {
    if (d.kind === "cta") {
      d.template = "cta";
      return;
    }
    const options = pool(!!d.piece);
    const free = options.filter((t) => t !== prev && (used.get(t) ?? 0) < cap);
    const t = R.pick(free.length ? free : options.filter((x) => x !== prev).length ? options.filter((x) => x !== prev) : options);
    // (kinetic type may set words-only scenes one after another)
    d.template = shape === "kinetic-type" && !d.piece && prev === "type" ? "type" : t;
    used.set(d.template, (used.get(d.template) ?? 0) + 1);
    prev = d.template;
  });

  // the cameras, the ways between scenes, the cursor
  const plain = drafts.map(({ input: _i, base: _b, ...s }) => s as Scene);
  const cameras = planCameras(plain, look.energy, R);
  const turn = shape === "before-after" && n > 3 ? Math.floor(n / 2) : null;
  const enters = planTransitions(plain, look.energy, seed, turn);
  const scenes = planCursors(plain.map((s, i) => ({ ...s, camera: cameras[i], enter: enters[i] })), seed);

  return { w, h, duration, seed, look, energy: look.energy, shape, brand, scenes };
}


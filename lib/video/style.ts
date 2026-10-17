import { type Rng, rng } from "./rng";

// A video's style: not one of a few finished looks but a set of independent parts (genes) — the
// ground, what is drawn on it, the cards, the icons, the accent, the type's size, the cuts, the
// rhythm, the UI's angle — each chosen on its own and kept compatible by rules (mendStyle), so
// thousands of looks come out of them. The 35 references (recipes.ts) are styles too: a video
// starts from one and changes 2–4 of its parts.

export const GROUNDS = ["black", "night", "deep", "dusk", "plate", "bright", "tint", "paper", "white"] as const;
export const BACKDROPS = ["none", "glow", "spot", "rays", "horizon", "grid", "columns", "dots", "rules", "disc", "arcs", "orb"] as const;
export const TEXTURES = ["none", "grain", "vignette"] as const;
export const SHIFTS = ["none", "scene"] as const;
export const CARDS = ["glass", "solid", "offset", "outline", "hairline", "glow", "lifted"] as const;
export const PANELS = ["light", "dark", "ground"] as const;
export const ICON_LOOKS = ["tile", "ink", "outline", "glow", "bare", "gradient"] as const;
export const ACCENTS = ["brand", "electric", "complement", "mono"] as const;
export const TYPE_SIZES = ["normal", "big", "giant"] as const;
export const CUTS = ["soft", "push", "hard", "graphic"] as const;
export const RHYTHMS = ["calm", "steady", "quick", "rapid"] as const;
export const TILTS = [0, 6, 10] as const;
export const KEYS = ["color", "pill", "underline", "gradient", "box", "outline", "italic", "glow"] as const;
export const HARMONIES = ["mono", "analogous", "complement", "split", "triad"] as const;

export type Ground = (typeof GROUNDS)[number];
export type KeyStyle = (typeof KEYS)[number];
export type Harmony = (typeof HARMONIES)[number];

export type StyleT = {
  ground: Ground;
  backdrop: (typeof BACKDROPS)[number];
  texture: (typeof TEXTURES)[number];
  shift: (typeof SHIFTS)[number];
  card: (typeof CARDS)[number];
  panel: (typeof PANELS)[number];
  icon: (typeof ICON_LOOKS)[number];
  accent: (typeof ACCENTS)[number];
  size: (typeof TYPE_SIZES)[number];
  cuts: (typeof CUTS)[number];
  rhythm: (typeof RHYTHMS)[number];
  tilt: number;
  ghost: boolean;
  frame?: boolean;
  confetti?: boolean;
};

// A recipe: a reference video's style (or the parts of it we can draw), and the faces and highlights it suits.
export type Recipe = { id: string; from: string; note: string; style: Partial<StyleT>; faces?: string[]; keys?: KeyStyle[] };

const DARK = new Set<Ground>(["black", "night", "deep", "dusk", "plate"]);
export const groundIsDark = (g: Ground) => DARK.has(g);
const LIT = new Set<Ground>(["black", "night", "deep", "dusk"]);

// What goes with what (anything else is mended to the nearest that does).
const BACKDROP_ON: Record<(typeof BACKDROPS)[number], Ground[]> = {
  none: [...GROUNDS],
  glow: [...LIT],
  spot: [...LIT],
  rays: [...LIT],
  horizon: [...LIT],
  grid: [...GROUNDS],
  columns: [...GROUNDS],
  dots: [...GROUNDS],
  rules: ["paper", "white", "bright", "tint", "black"],
  disc: ["plate", "bright", "deep", "dusk", "tint"],
  arcs: ["white", "tint", "paper", "bright"],
  orb: [...LIT],
};
const CARDS_OF: Record<(typeof PANELS)[number], (typeof CARDS)[number][]> = {
  light: ["solid", "offset", "outline", "hairline", "lifted"],
  dark: ["glass", "solid", "hairline", "glow", "outline"],
  ground: ["outline", "hairline", "glow"],
};
const ok = {
  backdrop: (s: StyleT) => BACKDROP_ON[s.backdrop].includes(s.ground),
  texture: (s: StyleT) => s.texture !== "vignette" || LIT.has(s.ground),
  shift: (s: StyleT) => s.shift === "none" || ["plate", "bright", "deep", "tint"].includes(s.ground),
  panel: (s: StyleT) => s.panel !== "dark" || LIT.has(s.ground),
  card: (s: StyleT) => CARDS_OF[s.panel].includes(s.card) && !(s.card === "glow" && !LIT.has(s.ground)) && !(s.card === "lifted" && ["white", "tint", "paper"].includes(s.ground)),
  icon: (s: StyleT) => s.icon !== "glow" || LIT.has(s.ground),
  accent: (s: StyleT) => s.accent !== "mono" || ["black", "white", "paper", "plate", "bright"].includes(s.ground),
  ghost: (s: StyleT) => !(s.ghost && s.size === "giant"),
};
const ORDER = ["backdrop", "texture", "shift", "panel", "card", "icon", "accent", "ghost"] as const;
const OPTIONS: { [K in keyof StyleT]-?: readonly StyleT[K][] } = {
  ground: GROUNDS, backdrop: BACKDROPS, texture: TEXTURES, shift: SHIFTS, card: CARDS, panel: PANELS, icon: ICON_LOOKS, accent: ACCENTS, size: TYPE_SIZES, cuts: CUTS, rhythm: RHYTHMS, tilt: TILTS, ghost: [false, true],
  // (a frame or confetti now and then: one in four)
  frame: [false, false, false, true], confetti: [false, false, false, true],
};

// A style made whole and compatible: what is missing drawn, what clashes changed (the ground is kept: it is the base).
export function mendStyle(raw: Partial<StyleT>, R: Rng): StyleT {
  const s = {} as Record<keyof StyleT, unknown>;
  for (const k of Object.keys(OPTIONS) as (keyof StyleT)[]) {
    const xs = OPTIONS[k] as readonly unknown[];
    s[k] = xs.includes(raw[k]) ? raw[k] : R.pick(xs);
  }
  const st = s as StyleT;
  for (const k of ORDER) {
    if (ok[k](st)) continue;
    for (const x of R.shuffle(OPTIONS[k] as readonly StyleT[typeof k][])) {
      (st as Record<string, unknown>)[k] = x;
      if (ok[k](st)) break;
    }
  }
  // (the card follows the panel it was mended to)
  if (!ok.card(st)) st.card = CARDS_OF[st.panel].find((c) => ok.card({ ...st, card: c })) ?? "hairline";
  return st;
}

// How far apart two styles are (the parts that differ; the ground counts twice).
const PARTS = ["ground", "backdrop", "texture", "shift", "card", "panel", "icon", "accent", "size", "cuts", "rhythm", "ghost", "frame", "confetti"] as const;
export function styleDistance(a: StyleT, b: StyleT): number {
  let d = PARTS.filter((k) => a[k] !== b[k]).length + (a.ground !== b.ground ? 1 : 0);
  if (Math.abs(a.tilt - b.tilt) >= 5) d++;
  return d;
}
// (unlike the last ones: another ground than the last, and far from each)
const FAR = 6;
const farFrom = (s: StyleT, others: StyleT[]) => others.every((o) => styleDistance(s, o) >= FAR) && (!others[0] || others[0].ground !== s.ground);

// A style changed in `n` parts (each kept compatible).
export function mutate(s: StyleT, R: Rng, n: number): StyleT {
  const out = { ...s } as Record<string, unknown>;
  for (const k of R.shuffle(PARTS).slice(0, n)) {
    const xs = (OPTIONS[k] as readonly unknown[]).filter((x) => x !== out[k]);
    // (a frame or confetti is an accent: turned on now and then, not whenever it is changed)
    if ((k === "frame" || k === "confetti") && !out[k] && !R.chance(0.3)) continue;
    if (xs.length) out[k] = R.pick(xs);
  }
  if (R.chance(0.3)) out.tilt = R.pick(TILTS.filter((t) => t !== out.tilt));
  return mendStyle(out as Partial<StyleT>, R);
}

// The style a video is built in: a recipe's, changed in 2–4 parts, unlike `avoid` (this customer's last
// styles, most recent first) — the recipe itself unlike the recent ones too where it can be.
export function pickStyle(seed: number, recipes: Recipe[], avoid: StyleT[], avoidRecipes: string[]): { style: StyleT; recipe: Recipe } {
  const R = rng(seed ^ 0x6c8e9cf5);
  const fresh = R.shuffle(recipes.filter((r) => !avoidRecipes.includes(r.id)));
  const order = fresh.length ? fresh : R.shuffle(recipes);
  for (const against of [avoid.slice(0, 3), avoid.slice(0, 1), []]) {
    for (const r of order) {
      for (let t = 0; t < 6; t++) {
        const style = mutate(mendStyle(r.style, R), R, R.int(2, 4));
        if (farFrom(style, against)) return { style, recipe: r };
      }
    }
  }
  const recipe = order[0];
  return { style: mutate(mendStyle(recipe.style, R), R, 2), recipe };
}

// ── what a style means for motion ─────────────────────────────────────────
export const PACE: Record<(typeof RHYTHMS)[number], [number, number]> = { calm: [0.82, 0.92], steady: [0.95, 1.06], quick: [1.1, 1.2], rapid: [1.24, 1.35] };

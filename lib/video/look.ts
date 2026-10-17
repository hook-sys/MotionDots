import { hueOf } from "./color";
import { type Energy, ENERGIES } from "./energy";
import { DISPLAY_FACES, TEXT_FACES } from "./faces";
import { RECIPES } from "./recipes";
import { rng, stir } from "./rng";
import { type Harmony, type KeyStyle, type StyleT, HARMONIES, KEYS, groundIsDark, pickStyle } from "./style";

// A video's look, drawn from its seed: built on one of the 35 reference recipes (changed in 2–4 parts), with its
// own palette treatment (harmony), font pairing, keyword highlight and energy — and unlike this user's last five
// looks wherever the choices allow. Kept with the project (projects.look) so the next video can avoid it.
export type Look = {
  seed: number;
  recipe: string;
  style: StyleT;
  hue: number;
  hueFromLogo: boolean;
  harmony: Harmony;
  display: string;
  text: string;
  key: KeyStyle;
  energy: Energy;
};

const RECENT = 5;
const DISPLAYS = DISPLAY_FACES.map((f) => f.slug).filter((s) => s !== "inter");
const TEXTS = TEXT_FACES.map((f) => f.slug);

// A highlight that suits the style (no colour: a shape; outline and glow read only on a dark ground).
function keyFor(style: StyleT, wanted: KeyStyle[] | undefined, R: ReturnType<typeof rng>): KeyStyle {
  const dark = groundIsDark(style.ground);
  const fits = (k: KeyStyle) => !(style.accent === "mono" && (k === "color" || k === "gradient" || k === "glow")) && !(!dark && (k === "outline" || k === "glow"));
  const own = (wanted ?? []).filter(fits);
  const pool = KEYS.filter(fits);
  return own.length && R.chance(0.6) ? R.pick(own) : R.pick(pool);
}

// How alike a candidate is to the recent looks (0: nothing repeats).
function repeats(l: Look, recent: Look[]) {
  return (
    recent.filter((r) => r.recipe === l.recipe).length * 4 +
    recent.filter((r) => r.display === l.display).length * 3 +
    recent.filter((r) => r.display === l.display && r.text === l.text).length * 2 +
    recent.filter((r) => r.harmony === l.harmony && groundIsDark(r.style.ground) === groundIsDark(l.style.ground)).length * 2 +
    recent.filter((r) => r.energy === l.energy).length * 2 +
    recent.filter((r) => r.key === l.key).length
  );
}

// `recent`: this user's latest looks, newest first (only the last five count).
export function drawLook(seed: number, recent: Look[]): Look {
  const last = recent.slice(0, RECENT);
  let best: Look | null = null;
  let bestScore = Infinity;
  for (let k = 0; k < 40 && bestScore > 0; k++) {
    const s = stir(seed + k * 7919) || 1;
    const R = rng(s);
    const { style, recipe } = pickStyle(s, RECIPES, last.map((r) => r.style), last.map((r) => r.recipe));
    const faces = recipe.faces?.filter((f) => DISPLAYS.includes(f)) ?? [];
    const display = faces.length && R.chance(0.7) ? R.pick(faces) : R.pick(DISPLAYS);
    const look: Look = {
      seed,
      recipe: recipe.id,
      style,
      hue: R.int(0, 359),
      hueFromLogo: false,
      harmony: R.pick(HARMONIES),
      display,
      text: R.pick(TEXTS.filter((t) => t !== display)),
      key: keyFor(style, recipe.keys, R),
      energy: R.pick(ENERGIES),
    };
    const score = repeats(look, last);
    if (score < bestScore) [best, bestScore] = [look, score];
  }
  return best!;
}

// The brand's colour from its logo; a logo with no colour (a grey or a black-and-white mark) keeps the look's own random hue.
export function withBrandColour(look: Look, logoColour: string | null): Look {
  const hue = logoColour ? hueOf(logoColour) : null;
  return hue == null ? { ...look, hueFromLogo: false } : { ...look, hue, hueFromLogo: true };
}

// A look read back from storage (null: none, or not one of ours).
export function lookOf(raw: unknown): Look | null {
  const l = raw as Partial<Look> | null;
  if (!l || typeof l !== "object" || typeof l.seed !== "number" || typeof l.recipe !== "string" || !l.style || typeof l.display !== "string" || typeof l.hue !== "number") return null;
  return RECIPES.some((r) => r.id === l.recipe) ? (l as Look) : null;
}

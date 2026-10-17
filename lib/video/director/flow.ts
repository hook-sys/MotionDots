import { type CameraKind, ENERGY, type Energy } from "../energy";
import type { PieceKind, Scene, Transition } from "../plan";
import { type Rng, rng, stir } from "../rng";

// How a video flows: every scene its own slow camera move (never still, never the same twice in a row), joined to
// the next by a continuous way (an icon morphing into the next scene's icon, a zoom through the icon) on about the
// energy's share of the changes (calm 30 %, medium 40 %, lively 50 % or more), the rest by a slide, a mask wipe or a
// cross-fade — never a plain cut. Placement is seeded: two videos never join the same scenes the same way.

export function planCameras(scenes: Scene[], energy: Energy, R: Rng): CameraKind[] {
  const pool = ENERGY[energy].cameras;
  const out: CameraKind[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const prev = out[i - 1];
    out.push(R.pick(pool.filter((c) => c !== prev)));
  }
  return out;
}

// The icon is on screen in every scene but the closing one (it shows the logo instead).
const iconShown = (s: Scene) => s.template !== "cta";

export function planTransitions(scenes: Scene[], energy: Energy, seed: number, forcedWipe: number | null): Transition[] {
  const R = rng(stir(seed ^ 0x2545f491));
  const e = ENERGY[energy];
  const n = scenes.length;
  const out: Transition[] = Array(n).fill("fade");
  const changes = Array.from({ length: n - 1 }, (_, k) => k + 1).filter((i) => i !== forcedWipe);
  // where an icon can join the two scenes
  const eligible = changes.filter((i) => iconShown(scenes[i - 1]) && iconShown(scenes[i]));
  const target = Math.min(eligible.length, Math.ceil((n - 1) * e.share) + (energy === "lively" ? R.int(0, 1) : 0));
  const chosen = R.shuffle(eligible).slice(0, target);
  for (const i of chosen) {
    // (a morph needs two different icons; otherwise the camera zooms through it)
    const morph = scenes[i - 1].icon !== scenes[i].icon && R.chance(0.55);
    out[i] = morph ? "morph" : "zoom";
  }
  if (forcedWipe != null) out[forcedWipe] = "wipe";
  const plain: Transition[] = ["slide", "wipe", "fade"];
  let k = R.int(0, 2);
  for (let i = 1; i < n; i++) {
    if (out[i] !== "fade" || chosen.includes(i) || i === forcedWipe) continue;
    // (never the same plain way twice in a row)
    const prev = out[i - 1];
    let way = plain[k % plain.length];
    if (way === prev) way = plain[(k + 1) % plain.length];
    out[i] = way;
    k++;
  }
  out[0] = "fade";
  return out;
}

// What a click takes best (the scene's main thing).
const CLICKABLE: Partial<Record<PieceKind, number>> = { list: 4, dashboard: 4, phone: 3, search: 3, notifications: 3, counter: 2, chart: 1 };

// The big cursor: once a chapter (about three scenes) it goes to the scene's main thing and clicks it, and the
// click changes it (a row ticks, a number jumps, a notification arrives, the search runs). The closing scene's
// button has its own click.
export function planCursors(scenes: Scene[], seed: number): Scene[] {
  const R = rng(stir(seed ^ 0x1b873593));
  const body = Array.from({ length: Math.max(0, scenes.length - 2) }, (_, k) => k + 1);
  const chapters = Math.max(1, Math.round(body.length / 3));
  const out = scenes.map((s) => ({ ...s, cursor: null as Scene["cursor"] }));
  for (let c = 0; c < chapters; c++) {
    const part = body.slice(Math.floor((c * body.length) / chapters), Math.floor(((c + 1) * body.length) / chapters));
    const pick = part
      .map((i) => ({ i, score: out[i].piece ? (CLICKABLE[out[i].piece!.kind] ?? 0) : 0 }))
      // (long enough to show the click: the piece is up for at least 2.3 s)
      .filter((x) => x.score > 0 && out[x.i].hit != null && out[x.i].to - out[x.i].pieceAt >= 70)
      .sort((a, b) => b.score - a.score || a.i - b.i)[0];
    if (!pick) continue;
    const s = out[pick.i];
    const click = s.hit!;
    s.cursor = { at: Math.max(s.pieceAt + 6, click - 34 + R.int(-3, 3)), click };
  }
  return out;
}

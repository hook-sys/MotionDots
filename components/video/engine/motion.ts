import type { CSSProperties } from "react";
import { Easing, spring } from "remotion";
import { noise2D } from "@remotion/noise";
import { type EnergySpec } from "@/lib/video/energy";

// How things move: Remotion's physical spring (the energy sets its damping, stiffness and mass), a 50–100 ms
// stagger between things that come in together, and a slow camera on every scene.

export const FPS = 30;
export const IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const ramp = (f: number, at: number, dur: number) => clamp01((f - at) / Math.max(1, dur));

export type Mover = { spring: EnergySpec["spring"]; dur: number; stagger: number };
export const moverOf = (e: EnergySpec): Mover => ({ spring: e.spring, dur: Math.round(22 / e.pace), stagger: e.stagger });

// 0 → 1 from frame `at` on the spring (it may pass 1 and settle: never an excessive bounce).
export const enterK = (m: Mover, f: number, at: number, dur = m.dur) => (f < at ? 0 : spring({ frame: f - at, fps: FPS, config: m.spring, durationInFrames: Math.max(4, dur) }));

const blurOf = (px: number) => (px > 0.3 ? `blur(${px.toFixed(1)}px)` : undefined);

// A thing coming in (k 0 → 1): never from nothing, never with a jump.
export function riseIn(k: number, dy = 60): CSSProperties {
  const r = 1 - k;
  return { opacity: clamp01(k * 1.6), transform: `translateY(${dy * r}px)`, filter: blurOf(r * 10) };
}

// The camera on a scene over its length (p 0 → 1). `depth`: how near the layer is (the background moves less,
// the words more: parallax — 1 is the scene itself).
export function cameraOf(kind: string, p: number, f: number, level: number, depth = 1): string {
  const e = (0.5 + level) * depth;
  // (a hand-held drift — Remotion's noise: never the same loop twice)
  const breathe = `translate(${(noise2D("cam-x", f / 70, 0) * 7 * e).toFixed(1)}px, ${(noise2D("cam-y", 0, f / 85) * 5 * e).toFixed(1)}px)`;
  const q = IN_OUT(clamp01(p));
  const s = (a: number, b: number) => (1 + (mix(a, b, q) - 1) * depth).toFixed(4);
  switch (kind) {
    case "drift": return `${breathe} translateX(${(mix(36, -36, q) * e).toFixed(1)}px)`;
    case "push": return `${breathe} scale(${s(0.975, 1.045)})`;
    case "pull": return `${breathe} scale(${s(1.05, 0.985)})`;
    case "tilt": return `${breathe} rotate(${(mix(-1.1, 0.8, q) * e).toFixed(3)}deg) scale(${s(1.01, 1.03)})`;
    case "orbit": return `${breathe} translateX(${(Math.sin(q * Math.PI - Math.PI / 2) * 28 * e).toFixed(1)}px) rotate(${(mix(-0.8, 0.8, q) * depth).toFixed(3)}deg) scale(1.02)`;
    case "rise": return `${breathe} translateY(${(mix(26, -22, q) * e).toFixed(1)}px)`;
    case "float": return `${breathe} translateY(${(noise2D("cam-float", f / 45, 0.5) * 12 * e).toFixed(1)}px)`;
    // deep into the scene's main thing (the scene sets the origin there)
    case "macro": return `${breathe} scale(${s(1, 1.32)})`;
    default: return breathe;
  }
}

import { type CSSProperties, type ReactNode, createContext, useContext } from "react";
import { type Pal, surfaceStyle } from "@/lib/video/palette";
import { iconData, resolveIcon } from "@/lib/video/icons";
import type { Look } from "@/lib/video/look";
import { type Mover, clamp01, enterK, mix } from "./motion";

// What every part draws with: the frame, the video's palette and look, its motion and faces, the size of the frame.
export type Ctx = { f: number; pal: Pal; look: Look; m: Mover; display: string; text: string; w: number; h: number; radius: number };
export const CtxC = createContext<Ctx | null>(null);
export const useCtx = () => useContext(CtxC)!;

export const surf = (c: Ctx, lift = 1, radius = c.radius): CSSProperties => surfaceStyle(c.pal, radius, lift);
// A row / tile / pill coming in at `at` (0 → 1 on the video's spring).
export const kIn = (c: Ctx, at: number, dur?: number) => enterK(c.m, c.f, at, dur);
export const show = (k: number, dy = 18): CSSProperties => ({ opacity: clamp01(k * 1.5), transform: `translateY(${(1 - k) * dy}px)` });

// An icon: its line, drawn on as `draw` goes 0 → 1 (or a morph's line drawn instead of its own).
export function Icon({ name, size = 24, color = "currentColor", strokeWidth = 2, draw = 1, path }: { name: string | null | undefined; size?: number; color?: string; strokeWidth?: number; draw?: number; path?: string | null }) {
  const data = path ? ([path, ""] as [string, string]) : iconData(name);
  if (!data) return null;
  const [stroke, dots] = data;
  const t = clamp01(draw);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d={stroke} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...(t < 1 && { pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - t })} />
      {dots && <path d={dots} fill={color} stroke={color} strokeWidth={strokeWidth} opacity={t} />}
    </svg>
  );
}

// An icon in the style's icon look (tile, ink, outline, glow, bare, gradient).
export function Glyph({ c, name, size, tone = "accent", k = 1, path }: { c: Ctx; name: string | null | undefined; size: number; tone?: "accent" | "panel" | "fill2"; k?: number; path?: string | null }) {
  const icon = resolveIcon(name) ?? "sparkles";
  const { pal } = c;
  const st = pal.style;
  const fill = tone === "fill2" ? pal.fill2 : pal.fill;
  const onPanel = tone === "panel";
  const r = Math.min(size * 0.32, c.radius * 0.7 + 6);
  const sq = c.radius <= 8 ? { borderRadius: Math.max(2, c.radius * 0.5) } : undefined;
  const box = (bg: string, color: string, extra?: CSSProperties): ReactNode => (
    <div style={{ width: size, height: size, flexShrink: 0, borderRadius: r, background: bg, display: "flex", alignItems: "center", justifyContent: "center", ...extra }}>
      <Icon name={icon} size={size * 0.52} color={color} strokeWidth={2.3} draw={k} path={path} />
    </div>
  );
  switch (st.icon) {
    case "ink": return box(onPanel ? pal.panelInk : pal.ink, onPanel ? pal.panel : pal.bg, sq);
    case "outline": return box("transparent", onPanel ? pal.panelInk : pal.accent, { border: `2px solid ${onPanel ? pal.panelLine : pal.accent}`, ...sq });
    case "glow": return box(pal.panel, pal.accent, { border: `2px solid ${pal.accent}`, boxShadow: `0 0 ${size * 0.35}px ${pal.glow}66`, ...sq });
    case "bare": return <Icon name={icon} size={size * 0.86} color={onPanel ? pal.panelInk : pal.accent} strokeWidth={2} draw={k} path={path} />;
    case "gradient": return box(`linear-gradient(140deg, ${fill}, ${pal.fill2})`, pal.onFill, { boxShadow: pal.dark ? `0 ${size * 0.14}px ${size * 0.4}px rgba(0,0,0,0.4)` : `0 ${size * 0.1}px ${size * 0.3}px ${fill}44`, ...sq });
    default: return box(fill, pal.onFill, sq);
  }
}

export const Tick = ({ c, size = 30, k = 1, color }: { c: Ctx; size?: number; k?: number; color?: string }) => (
  <div style={{ width: size, height: size, borderRadius: 9999, flexShrink: 0, background: color ?? c.pal.fill, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${mix(0.5, 1, clamp01(k))})`, opacity: clamp01(k * 2) }}>
    <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24">
      <path d="M5 12.5 L10 17 L19 7" stroke={c.pal.onFill} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${clamp01(k)} 1`} />
    </svg>
  </div>
);

// The numeric part of "$2,400" / "98%" / "3x", counted from 0 as k goes 0 → 1.
export function countUp(value: string, k: number) {
  const m = /(-?\d[\d,]*(?:\.\d+)?)/.exec(value);
  if (!m) return value;
  const raw = m[1].replace(/,/g, "");
  const n = Number(raw);
  if (!Number.isFinite(n)) return value;
  const dec = raw.includes(".") ? raw.split(".")[1].length : 0;
  const cur = n * clamp01(k);
  const shown = dec ? cur.toFixed(dec) : Math.round(cur).toLocaleString("en-US");
  return value.replace(m[1], m[1].includes(",") || n >= 10000 ? shown : shown.replace(/,/g, ""));
}

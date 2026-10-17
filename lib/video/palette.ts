import type { CSSProperties } from "react";
import { contrast, hsl, readable } from "./color";
import { type Ground, type Harmony, type StyleT, groundIsDark } from "./style";

// A video's colours, made from its style (its ground, accent and UI panels) and a hue and harmony —
// never picked from a list of finished looks; every pair is checked for contrast.
export type Pal = {
  dark: boolean;
  bg: string;
  bg2: string;
  ink: string;
  sub: string;
  faint: string;
  accent: string; // reads on the field (text, lines)
  accent2: string;
  accent3: string;
  fill: string; // a solid accent face (buttons, tiles)
  fill2: string;
  onFill: string;
  glow: string;
  panel: string;
  panelInk: string;
  panelSub: string;
  panelLine: string;
  panelSoft: string; // inner panels (rows, fields)
  panelDark: boolean;
  shadow: string;
  style: StyleT;
};

const partners = (h: number, harmony: Harmony): [number, number] => {
  if (harmony === "mono") return [h + 12, h - 10];
  if (harmony === "analogous") return [h + 34, h - 30];
  if (harmony === "complement") return [h + 180, h + 20];
  if (harmony === "split") return [h + 150, h + 210];
  return [h + 120, h + 240];
};

const GROUND: Record<Ground, (h: number) => [string, string]> = {
  black: () => ["#050506", "#0c0c0e"],
  night: (h) => [hsl(h, 22, 4), hsl(h, 34, 8)],
  deep: (h) => [hsl(h, 55, 11), hsl(h + 18, 55, 15)],
  dusk: (h) => [hsl(h, 60, 11), hsl(h + 45, 62, 22)],
  plate: (h) => [hsl(h, 70, 38), hsl(h, 72, 44)],
  bright: (h) => [hsl(h, 88, 66), hsl(h, 90, 72)],
  tint: (h) => [hsl(h, 45, 92), hsl(h, 50, 86)],
  paper: () => ["#f3ede3", "#ebe3d6"],
  white: () => ["#ffffff", "#f4f4f6"],
};
export const groundColours = (g: Ground, h: number) => GROUND[g](h);

export function stylePalette(st: StyleT, art: { hue: number; harmony: Harmony }): Pal {
  const h = art.hue;
  const [h2, h3] = partners(h, art.harmony);
  const [bg, bg2] = GROUND[st.ground](h);
  const dark = groundIsDark(st.ground);
  const on = (c: string) => (contrast("#ffffff", c) >= 3.2 ? "#ffffff" : "#0b0b0d");
  // the words: white on dark grounds and plates, near-black on light ones
  const ink = dark ? (st.ground === "plate" ? "#ffffff" : "#f4f5f7") : st.ground === "paper" ? "#1d1a16" : st.ground === "bright" ? "#0b0b0d" : hsl(h, 30, 9);
  const sub = dark ? (st.ground === "plate" ? "rgba(255,255,255,0.82)" : hsl(h, 10, 68)) : st.ground === "bright" ? "rgba(0,0,0,0.72)" : st.ground === "paper" ? "#5f584e" : hsl(h, 10, 38);
  const faint = dark ? (st.ground === "plate" ? "rgba(255,255,255,0.4)" : hsl(h, 12, 30)) : st.ground === "bright" ? "rgba(0,0,0,0.28)" : st.ground === "paper" ? "#bdb3a4" : hsl(h, 12, 80);
  // the accent: on a colour ground it is a light (plate) or deep (bright) shade of it
  const colourGround = st.ground === "plate" || st.ground === "bright";
  // (the opposite hue, unless it is a yellow on a pale ground — it reads as mud there: the harmony's partner instead)
  const yellow = (x: number) => (((x % 360) + 360) % 360) >= 40 && (((x % 360) + 360) % 360) <= 88;
  const ah = st.accent === "complement" ? (!dark && st.ground !== "bright" && yellow(h + 180) ? h2 : h + 180) : h;
  const accent = st.accent === "mono" ? ink : st.ground === "plate" ? hsl(ah + 18, 100, 86) : st.ground === "bright" ? hsl(ah, 85, 22) : st.accent === "electric" ? readable(ah, 100, dark ? 62 : 48, bg, 4) : readable(ah, 80, dark ? 66 : 44, bg, 3.6);
  const accent2 = st.accent === "mono" ? sub : colourGround ? accent : readable(h2, 82, dark ? 66 : 46, bg, 3);
  const accent3 = colourGround || st.accent === "mono" ? accent : readable(h3, 72, dark ? 68 : 48, bg, 2.6);
  // a solid face (buttons, tiles): ink on colour grounds and in mono, else the accent's own
  const fill = colourGround || st.accent === "mono" ? (st.ground === "plate" || dark ? "#0d0d10" : "#0b0b0d") : hsl(ah, st.accent === "electric" ? 96 : 80, dark ? 58 : 50);
  const fill2 = colourGround || st.accent === "mono" ? hsl(h, 30, 22) : hsl(h2, 78, dark ? 60 : 54);
  const onFill = on(fill);
  // the UI: white, dark, or drawn in the ground's own colour
  const darkPanel = st.ground === "black" ? ["#111113", "#18181b", "#232327"] : st.ground === "deep" || st.ground === "dusk" ? [hsl(h, 40, 14), hsl(h, 40, 19), hsl(h, 35, 25)] : [hsl(h, 16, 9), hsl(h, 16, 13), hsl(h, 12, 19)];
  const P =
    st.panel === "dark"
      ? { panel: darkPanel[0], panelSoft: darkPanel[1], panelLine: darkPanel[2], panelInk: "#eef0f4", panelSub: hsl(h, 8, 62), panelDark: true }
      : st.panel === "ground"
        ? { panel: bg, panelSoft: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", panelLine: dark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.12)", panelInk: ink, panelSub: sub, panelDark: dark }
        : { panel: st.ground === "paper" ? "#fffdf8" : "#ffffff", panelSoft: st.ground === "paper" ? "#f7f2e9" : hsl(h, 20, 96.5), panelLine: st.ground === "paper" ? "#ddd3c3" : hsl(h, 14, 90), panelInk: hsl(h, 30, 10), panelSub: hsl(h, 10, 44), panelDark: false };
  const glow = st.ground === "plate" ? hsl(h, 100, 80) : hsl(ah, 95, dark ? 62 : 58);
  const shadow = st.card === "glow" ? hsl(ah, 100, 55, 0.32) : dark ? "rgba(0,0,0,0.55)" : st.ground === "paper" ? "rgba(60,45,25,0.12)" : "rgba(10,10,20,0.14)";
  return { dark, bg, bg2, ink, sub, faint, accent, accent2, accent3, fill, fill2, onFill, glow, ...P, shadow, style: st };
}

// A card, pill or tile in the style's card look: glass or softly lifted, with soft shadows (the depth rule).
export function surfaceStyle(pal: Pal, radius: number, lift = 1): CSSProperties {
  const st = pal.style;
  const r = Math.round(radius);
  const lit = `0 ${Math.round(28 * lift)}px ${Math.round(80 * lift)}px ${pal.shadow}`;
  switch (st.card) {
    case "glass": return { background: `linear-gradient(165deg, ${pal.panelSoft}, ${pal.panel})`, border: "1px solid rgba(255,255,255,0.10)", borderTop: "1px solid rgba(255,255,255,0.22)", boxShadow: `0 ${Math.round(40 * lift)}px ${Math.round(120 * lift)}px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.35)`, borderRadius: r };
    case "solid": return { background: pal.panel, boxShadow: pal.dark ? `0 ${Math.round(24 * lift)}px ${Math.round(70 * lift)}px rgba(0,0,0,0.45)` : `0 1px 2px rgba(0,0,0,0.06), 0 ${Math.round(10 * lift)}px ${Math.round(28 * lift)}px rgba(0,0,0,0.08)`, borderRadius: r };
    case "offset": {
      const ink = pal.dark || st.ground === "bright" ? "rgba(0,0,0,0.85)" : pal.ink;
      return { background: pal.panel, ...(pal.dark ? {} : { border: `2px solid ${pal.panelInk}` }), boxShadow: `${Math.round(12 * lift)}px ${Math.round(12 * lift)}px 0 ${st.ground === "plate" ? "rgba(0,0,0,0.25)" : ink}`, borderRadius: Math.min(r, 18) };
    }
    case "outline": return { background: pal.panel, border: `${st.panel === "ground" ? 3 : 2.5}px solid ${pal.panelInk}`, borderRadius: Math.min(r, 10) };
    case "hairline": return { background: pal.panel, border: `1px solid ${pal.panelLine}`, boxShadow: pal.dark ? "none" : `0 1px 0 ${pal.panelLine}`, borderRadius: Math.min(r, 12) };
    case "glow": return { background: `linear-gradient(160deg, ${pal.panelSoft}, ${pal.panel})`, border: `1.5px solid ${pal.accent}`, boxShadow: `0 0 0 1px rgba(0,0,0,0.5), 0 0 ${Math.round(60 * lift)}px ${pal.shadow}`, borderRadius: r };
    default: return { background: pal.panel, boxShadow: `0 ${Math.round(40 * lift)}px ${Math.round(110 * lift)}px rgba(0,0,0,0.35), ${lit}`, borderRadius: Math.max(r, 18) };
  }
}

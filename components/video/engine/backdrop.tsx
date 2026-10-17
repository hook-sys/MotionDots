import { type CSSProperties, type ReactNode, useId } from "react";
import { AbsoluteFill } from "remotion";
import { noise2D } from "@remotion/noise";
import { hsl } from "@/lib/video/color";
import { type Pal, groundColours } from "@/lib/video/palette";

// The background a scene plays on: what the style draws on its ground (glow, spot, rays, horizon, grid, columns, dots,
// rules, disc, arcs, orb), its texture, and a light that leans to one side of the scene. Drawn as SVG where it
// is a gradient (the browser's download paints SVG gradients as the preview does).

export type Anchor = { x: number; y: number; s: number; t: number }; // centre (px), spread (0.6–1.4), turn (0–1)

type Stop = [offset: number, color: string, opacity?: number];
function Radial({ w, h, W, H, at = [0.5, 0.5], stops, place }: { w: number; h: number; W: number; H: number; at?: [number, number]; stops: Stop[]; place: { x: number; y: number } }) {
  const id = "r" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [cx, cy] = at;
  const rx = Math.max(cx, 1 - cx) * w * Math.SQRT2;
  const ry = Math.max(cy, 1 - cy) * h * Math.SQRT2;
  return (
    <svg width={W} height={H} style={{ display: "block", position: "absolute", left: 0, top: 0 }}>
      <defs>
        <radialGradient id={id} gradientUnits="userSpaceOnUse" cx={0} cy={0} r={1} gradientTransform={`translate(${place.x + cx * w} ${place.y + cy * h}) scale(${rx} ${ry})`}>
          {stops.map(([o, c, op = 1], i) => <stop key={i} offset={o} stopColor={c} stopOpacity={op} />)}
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id})`} />
    </svg>
  );
}

function Tiles({ w, h, kind, gap, size, color }: { w: number; h: number; kind: "dots" | "grid"; gap: number; size: number; color: string }) {
  const id = "t" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <svg width={w} height={h} style={{ display: "block", position: "absolute", left: 0, top: 0 }}>
      <defs>
        <pattern id={id} width={gap} height={gap} patternUnits="userSpaceOnUse">
          {kind === "dots" ? <circle cx={gap / 2} cy={gap / 2} r={size} fill={color} /> : <path d={`M0 ${size}H${gap}M${size} 0V${gap}`} stroke={color} strokeWidth={size * 2} fill="none" />}
        </pattern>
      </defs>
      <rect width={w} height={h} fill={`url(#${id})`} />
    </svg>
  );
}

const TURN = [0, 150, 210, 40];

export function Backdrop({ f, pal, hue, anchor: a, level, w: W, h: H, style }: { f: number; pal: Pal; hue: number; anchor: Anchor; level: number; w: number; h: number; style?: CSSProperties }) {
  const st = pal.style;
  const e = 0.6 + level * 0.8;
  // the light wanders (noise: a slow, unrepeating drift)
  const sway = (k: number, amp = 60) => noise2D(`lk${k}`, f / (120 + k * 13), k) * amp * e;
  const u = Math.min(W, H) / 1080;
  const h2 = st.shift === "scene" ? hue + TURN[Math.floor(a.t * 4) % 4] : hue;
  const [bg, bg2] = st.shift === "scene" ? groundColours(st.ground, h2) : [pal.bg, pal.bg2];
  const dark = pal.dark;
  const line = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const glow = (x: number, y: number, w: number, hh: number, color: string, at: [number, number] = [0.5, 0.5], stop = 0.62): ReactNode => (
    <Radial w={w} h={hh} W={W} H={H} at={at} stops={[[0, color], [stop, color, 0]]} place={{ x: x - w / 2, y: y - hh / 2 }} />
  );
  let body: ReactNode = null;
  switch (st.backdrop) {
    case "glow":
      body = (
        <>
          {glow(a.x + sway(1, 80), a.y + sway(2, 60), 1800 * a.s * u, 1200 * a.s * u, hsl(h2, 85, 55, 0.3))}
          {glow(W * 0.85 + sway(3, 60), H * 0.15, 1400 * u, 900 * u, hsl(h2 + 50, 85, 55, 0.2))}
        </>
      );
      break;
    case "spot":
      body = (
        <>
          {glow(a.x + sway(1, 40), a.y + 60 + sway(2, 30), 1700 * a.s * u, 1200 * a.s * u, hsl(h2, 70, 45, 0.22), [0.5, 0.5], 0.6)}
          {glow(W / 2, H + 120 * u, 2600 * u, 700 * u, hsl(h2, 80, 50, 0.16), [0.5, 0.4])}
        </>
      );
      break;
    case "rays":
      body = (
        <>
          {glow(W * 0.2, -100 * u, 1400 * u, 900 * u, hsl(h2, 100, 60, 0.28))}
          {Array.from({ length: 5 }, (_, k) => (
            <div key={k} style={{ position: "absolute", left: W * (0.05 + k * 0.17) + sway(k, 40), top: -H * 0.3, width: (70 + k * 18) * u, height: H * 1.8, transform: "rotate(24deg)", transformOrigin: "50% 0", background: `linear-gradient(180deg, ${hsl(h2, 100, 65, 0.16)}, transparent)` }} />
          ))}
        </>
      );
      break;
    case "horizon": {
      const lines = Array.from({ length: 14 }, (_, k) => {
        const y = H * 0.62 + ((k * k * 7 * u + f * 0.8 * e) % (H * 0.5));
        return <div key={`h${k}`} style={{ position: "absolute", left: 0, right: 0, top: y, height: 1.5, background: hsl(h2, 100, 62, 0.08 + ((y - H * 0.62) / (H * 0.5)) * 0.25) }} />;
      });
      body = (
        <>
          {glow(W / 2 + sway(1, 80), H * 0.6, 2400 * u, 900 * u, hsl(h2, 100, 55, 0.35))}
          {lines}
        </>
      );
      break;
    }
    case "grid":
      body = <Tiles w={W} h={H} kind="grid" gap={90 * u} size={0.7} color={line} />;
      break;
    case "columns":
      body = Array.from({ length: 12 }, (_, k) => <div key={k} style={{ position: "absolute", top: 0, bottom: 0, left: (W / 12) * k, width: 1, background: line }} />);
      break;
    case "dots":
      body = <Tiles w={W} h={H} kind="dots" gap={44 * u} size={1.8 * u} color={dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"} />;
      break;
    case "rules":
      body = (
        <>
          <div style={{ position: "absolute", left: 80 * u, right: 80 * u, top: 64 * u, height: 1.5, background: pal.faint }} />
          <div style={{ position: "absolute", left: 80 * u, right: 80 * u, bottom: 64 * u, height: 1.5, background: pal.faint }} />
        </>
      );
      break;
    case "disc": {
      const tone = st.ground === "tint" ? hsl(h2, 55, 80, 0.9) : hsl(h2, 72, dark ? 20 : 56, dark ? 1 : 0.9);
      body = <div style={{ position: "absolute", left: a.x - 900 * a.s * u + sway(1, 30), top: a.y - 900 * a.s * u, width: 1800 * a.s * u, height: 1800 * a.s * u, borderRadius: 9999, background: tone }} />;
      break;
    }
    case "orb": {
      // a sphere of points turning slowly behind the subject
      const R0 = Math.min(W, H) * 0.36 * Math.max(0.7, a.s);
      const spin = f * 0.006 * e;
      body = (
        <>
          {glow(a.x, a.y, R0 * 3.2, R0 * 3.2, hsl(h2, 95, 55, 0.22))}
          {Array.from({ length: 110 }, (_, k) => {
            const yy = 1 - (k / 109) * 2;
            const rr = Math.sqrt(1 - yy * yy);
            const th = k * 2.39996 + spin;
            const z = Math.sin(th) * rr;
            const sz = (2.5 + (z + 1) * 2.2) * u;
            return <div key={k} style={{ position: "absolute", left: a.x + Math.cos(th) * rr * R0 - sz / 2, top: a.y + yy * R0 - sz / 2, width: sz, height: sz, borderRadius: 99, background: hsl(h2 + z * 30, 100, 72), opacity: 0.18 + (z + 1) * 0.25 }} />;
          })}
        </>
      );
      break;
    }
    case "arcs": {
      const r1 = Math.max(W, H) * 0.55;
      body = (
        <>
          <div style={{ position: "absolute", left: -r1 * 0.55 + sway(1, 20), top: H - r1 * 0.45, width: r1, height: r1, borderRadius: 9999, background: hsl(h2, 80, 62) }} />
          <div style={{ position: "absolute", right: -r1 * 0.5, top: -r1 * 0.55 + sway(2, 20), width: r1 * 0.9, height: r1 * 0.9, borderRadius: 9999, background: hsl(h2 + 150, 80, 68) }} />
        </>
      );
      break;
    }
  }
  return (
    <AbsoluteFill style={{ background: st.ground === "dusk" ? `linear-gradient(${150 + a.t * 40}deg, ${bg}, ${bg2})` : bg, overflow: "hidden", ...style }}>
      {body}
      {st.texture === "vignette" && (
        <Radial w={W} h={H} W={W} H={H} stops={[[0.55, "rgba(0,0,0,0.55)", 0], [1, "rgba(0,0,0,0.55)"]]} place={{ x: 0, y: 0 }} />
      )}
    </AbsoluteFill>
  );
}

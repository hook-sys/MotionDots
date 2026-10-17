import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { ENERGY } from "@/lib/video/energy";
import type { Box } from "@/lib/video/geometry";
import type { VideoPlan } from "@/lib/video/plan";
import { type Ctx, Glyph } from "./kit";
import { IN_OUT, clamp01, mix } from "./motion";
import { morphPath } from "./morph";

// The ways between scenes — continuous, so the video never cuts: an icon morphing into the next scene's icon, the
// camera zooming through the icon into the next scene, a slide, a mask wipe, a cross-fade. Each takes the energy's hop
// of frames and starts a little before the next scene's first word.
export type Moves = { start: number; dur: number }[];

export function movesOf(plan: VideoPlan): Moves {
  const e = ENERGY[plan.energy];
  return plan.scenes.map((s, i) => {
    if (!i) return { start: -1, dur: 1 };
    const long = s.enter === "morph" || s.enter === "zoom";
    const room = s.from - plan.scenes[i - 1].from - 10;
    const dur = Math.max(12, Math.min(e.hop + (long ? 10 : 0), room));
    return { start: Math.max(plan.scenes[i - 1].from + 8, s.from - Math.round(dur * 0.6)), dur };
  });
}

// Which scene is showing, and how far the way into it has come (u: 0 → 1; 1 when it has arrived).
export function segmentAt(f: number, mv: Moves): { i: number; u: number } {
  let i = 0;
  for (let k = 1; k < mv.length; k++) if (mv[k].start <= f) i = k;
  return i === 0 ? { i, u: 1 } : { i, u: clamp01((f - mv[i].start) / mv[i].dur) };
}

type Props = {
  plan: VideoPlan;
  i: number;
  u: number;
  c: Ctx;
  // a scene's background, and its things and words (`hideIcon`: its icon is left out while it morphs)
  back: (i: number) => ReactNode;
  content: (i: number, hideIcon?: boolean) => ReactNode;
  iconBox: (i: number) => Box;
};

const center = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

// Scene i arriving over scene i - 1.
export function Between({ plan, i, u, c, back, content, iconBox }: Props) {
  const A = i - 1, B = i;
  const { w: W, h: H } = plan;
  const kind = plan.scenes[i].enter;
  const layer = (scene: number, style: CSSProperties): ReactNode => (
    <AbsoluteFill style={style}>
      {back(scene)}
      {content(scene)}
    </AbsoluteFill>
  );

  if (kind === "slide") {
    // the next scene slides in over the last, which drifts back the other way (one in three goes up)
    const up = (plan.seed + i) % 3 === 0;
    const d = up ? H : W;
    const move = (px: number) => (up ? `translateY(${px.toFixed(1)}px)` : `translateX(${px.toFixed(1)}px)`);
    return <>{layer(A, { transform: move(-d * 0.28 * u) })}{layer(B, { transform: move(d * (1 - u)), boxShadow: `0 0 ${(80 * Math.sin(u * Math.PI)).toFixed(0)}px rgba(0,0,0,0.35)` })}</>;
  }

  if (kind === "wipe") {
    // a mask wipe: a slanted edge crosses the frame, the next scene behind it
    const x = mix(-0.2 * W, 1.2 * W, u);
    const slant = 0.12 * W;
    const clip = `polygon(0px 0px, ${(x + slant).toFixed(0)}px 0px, ${x.toFixed(0)}px ${H}px, 0px ${H}px)`;
    return <>{layer(A, { transform: `scale(${(1 - 0.03 * u).toFixed(4)})` })}{layer(B, { clipPath: clip, WebkitClipPath: clip, transform: `translateX(${(50 * (1 - u)).toFixed(1)}px)` })}</>;
  }

  if (kind === "zoom") {
    // the camera goes through the last scene's icon into the next scene
    const o = center(iconBox(A));
    const e = IN_OUT(u);
    return (
      <>
        {back(B)}
        <AbsoluteFill style={{ opacity: clamp01((u - 0.25) / 0.5), transform: `scale(${mix(0.8, 1, e).toFixed(4)})` }}>{content(B)}</AbsoluteFill>
        <AbsoluteFill style={{ transformOrigin: `${o.x.toFixed(0)}px ${o.y.toFixed(0)}px`, transform: `scale(${Math.exp(Math.log(7) * e).toFixed(4)})`, opacity: 1 - clamp01((u - 0.35) / 0.45) }}>
          {back(A)}
          {content(A)}
        </AbsoluteFill>
      </>
    );
  }

  // a cross-fade (backgrounds mix, the last scene's things are gone before the next one's come — two headlines never
  // sit on each other); a morph is the same with the icon travelling from one scene's to the other's
  const morph = kind === "morph";
  const a = plan.scenes[A].icon, b = plan.scenes[B].icon;
  const path = morph ? morphPath(a, b, u) : null;
  const ga = iconBox(A), gb = iconBox(B);
  const box = { x: mix(ga.x, gb.x, u), y: mix(ga.y, gb.y, u), w: mix(ga.w, gb.w, u) };
  const over = clamp01(u / 0.06) * (1 - clamp01((u - 0.94) / 0.06));
  return (
    <>
      {back(A)}
      <AbsoluteFill style={{ opacity: clamp01(u * 1.4) }}>{back(B)}</AbsoluteFill>
      <AbsoluteFill style={{ opacity: 1 - clamp01(u / 0.5) }}>{content(A, !!path && u > 0.06)}</AbsoluteFill>
      <AbsoluteFill style={{ opacity: clamp01((u - 0.45) / 0.55) }}>{content(B, !!path && u < 0.94)}</AbsoluteFill>
      {path && (
        <div style={{ position: "absolute", left: box.x, top: box.y, width: box.w, height: box.w, transform: `rotate(${(Math.sin(u * Math.PI) * 6).toFixed(2)}deg)`, opacity: over, zIndex: 30 }}>
          <Glyph c={c} name={u < 0.5 ? a : b} size={box.w} path={path} />
        </div>
      )}
    </>
  );
}


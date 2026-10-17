"use client";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { ENERGY } from "@/lib/video/energy";
import { DISPLAY_FACES, TEXT_FACES, faceOf, familyOf, fontUrl } from "@/lib/video/faces";
import { type Box, geometry, naturalSize } from "@/lib/video/geometry";
import { stylePalette } from "@/lib/video/palette";
import type { VideoPlan } from "@/lib/video/plan";
import { rng } from "@/lib/video/rng";
import { type Anchor, Backdrop } from "./backdrop";
import { BigCursor } from "./cursor";
import { Headline, type Type } from "./headline";
import { type Ctx, Glyph, kIn } from "./kit";
import { LogoPlate, CtaButton } from "./logo";
import { cameraOf, clamp01, mix, moverOf } from "./motion";
import { Piece } from "./pieces";
import { SoundEffects } from "./sfx";
import { Between, movesOf, segmentAt } from "./transitions";

// The film: the code director's plan played scene by scene. Three layers move in parallax on each scene's own camera
// (the background least, the things next, the words most); every way between scenes is continuous.
export const FILM_ID = "MotionDotsFilm";
export type FilmProps = { plan: VideoPlan; audioUrl: string };

const loaded = new Set<string>();
// The faces are loaded before any frame is drawn (the render waits for them).
function loadFaces(slugs: string[]): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  const todo = [...new Set(slugs)].map((s) => [...DISPLAY_FACES, ...TEXT_FACES].find((f) => f.slug === s) ?? DISPLAY_FACES[0]).filter((f) => !loaded.has(f.family));
  if (!todo.length) return Promise.resolve();
  const handle = delayRender("Loading faces");
  return Promise.all(
    todo.map((f) =>
      new FontFace(f.family, `url(${fontUrl(f)}) format("woff2")`, { weight: f.fixed ? String(f.fixed) : "100 900" })
        .load()
        .then((ff) => {
          document.fonts.add(ff);
          loaded.add(f.family);
        })
        .catch(() => loaded.add(f.family)),
    ),
  )
    .then(() => undefined)
    .finally(() => continueRender(handle));
}

function useFaces(slugs: string[]) {
  const [, setV] = useState(0);
  const [loading] = useState(() => loadFaces(slugs));
  useEffect(() => {
    void loading.then(() => setV((v) => v + 1));
  }, [loading]);
}

const RADIUS = { glass: 28, solid: 24, offset: 14, outline: 10, hairline: 12, glow: 26, lifted: 30 } as const;
const SIZE = { normal: 0.1, big: 0.12, giant: 0.16 } as const;
const CONDENSED = new Set(["oswald", "big-shoulders-display", "bebas-neue", "anton"]);
const WIDE = new Set(["unbounded", "krona-one", "dela-gothic-one", "archivo-black", "syne"]);
const SERIF = new Set(["fraunces", "playfair-display", "instrument-serif", "dm-serif-display", "young-serif", "newsreader"]);

export function Film({ plan, audioUrl }: FilmProps) {
  const f = useCurrentFrame();
  const { look, w: W, h: H } = plan;
  const display = faceOf(look.display);
  const textFace = faceOf(look.text, TEXT_FACES);
  useFaces([display.slug, textFace.slug]);
  const spec = ENERGY[plan.energy];
  const pal = useMemo(() => stylePalette(look.style, { hue: look.hue, harmony: look.harmony }), [look]);
  const mv = useMemo(() => movesOf(plan), [plan]);
  const geoms = useMemo(() => plan.scenes.map((s, i) => geometry(s, i, W, H)), [plan, W, H]);
  const anchors = useMemo<Anchor[]>(
    () =>
      plan.scenes.map((s, i) => {
        const R = rng(plan.seed ^ (0x9e3779b9 + i * 7919));
        // the light leans away from the words
        const x = s.template === "split-left" ? R.range(0.55, 0.8) * W : s.template === "split-right" ? R.range(0.2, 0.45) * W : R.range(0.25, 0.75) * W;
        return { x, y: R.range(0.25, 0.75) * H, s: R.range(0.8, 1.3), t: (i * 0.37 + R.next() * 0.3) % 1 };
      }),
    [plan, W, H],
  );
  const c: Ctx = { f, pal, look, m: moverOf(spec), display: familyOf(display), text: familyOf(textFace), w: W, h: H, radius: RADIUS[look.style.card] };
  const condensed = CONDENSED.has(display.slug), wide = WIDE.has(display.slug), serif = SERIF.has(display.slug);
  const type = (max: number): Type => ({ family: familyOf(display), weight: display.fixed ?? (condensed || wide || serif ? 700 : 780), tracking: condensed ? 0.01 : wide ? -0.03 : serif ? -0.02 : -0.04, upper: !!display.upper, max });
  const base = Math.min(W, H) * SIZE[look.style.size];

  const progress = (i: number) => clamp01((f - plan.scenes[i].from) / Math.max(1, plan.scenes[i].to - plan.scenes[i].from));
  // a scene's own background, moving with its camera less than its things do (parallax)
  const back = (i: number): ReactNode => (
    <AbsoluteFill style={{ transform: `${cameraOf(plan.scenes[i].camera, progress(i), f, spec.level, 0.35)} scale(1.06)` }}>
      <Backdrop f={f} pal={pal} hue={look.hue} anchor={anchors[i]} level={spec.level} w={W} h={H} />
    </AbsoluteFill>
  );

  const content = (i: number, hideIcon = false): ReactNode => {
    const s = plan.scenes[i];
    const g = geoms[i];
    const p = progress(i);
    const cta = s.template === "cta";
    const max = base * (cta ? 0.8 : s.template === "type" || s.template === "center" ? 1.35 : i === 0 ? 1.1 : 1);
    const pieceBox: Box | null = g.piece;
    const origin = s.camera === "macro" && pieceBox ? `${Math.round(pieceBox.x + pieceBox.w / 2)}px ${Math.round(pieceBox.y + pieceBox.h / 2)}px` : undefined;
    const iconK = kIn(c, s.iconAt, 24);
    return (
      <AbsoluteFill>
        <AbsoluteFill style={{ transform: cameraOf(s.camera, p, f, spec.level, 1), transformOrigin: origin }}>
          {s.piece && pieceBox && (
            <div style={{ position: "absolute", left: pieceBox.x, top: pieceBox.y, width: pieceBox.w, height: pieceBox.h }}>
              <div style={{ transformOrigin: "0 0", transform: `scale(${(pieceBox.w / naturalSize(s.piece).w).toFixed(4)})` }}>
                <Piece c={c} spec={s.piece} at={s.pieceAt} hit={s.hit} />
              </div>
            </div>
          )}
          {!cta && !hideIcon && (
            <div style={{ position: "absolute", left: g.icon.x, top: g.icon.y, width: g.icon.w, height: g.icon.h, opacity: clamp01(iconK * 1.6), transform: `scale(${mix(0.4, 1, iconK).toFixed(3)})` }}>
              <Glyph c={c} name={s.icon} size={g.icon.w} k={iconK} />
            </div>
          )}
          {g.logo && <LogoPlate c={c} logoUrl={plan.brand.logoUrl} box={g.logo} at={cta ? s.from + 4 : 6} />}
          {cta && g.button && s.cta && s.hit != null && <CtaButton c={c} label={s.cta} box={g.button} at={s.from + 28} click={s.hit} />}
        </AbsoluteFill>
        <AbsoluteFill style={{ transform: cameraOf(s.camera, p, f, spec.level, 1.25), transformOrigin: origin }}>
          <Headline c={c} words={s.words} box={g.text} align={g.align} type={type(max)} />
        </AbsoluteFill>
        {s.cursor && pieceBox && (() => {
          const to = { x: pieceBox.x + pieceBox.w * 0.78, y: pieceBox.y + pieceBox.h * 0.72 };
          const side = to.x < W / 2 ? 1 : -1;
          return <BigCursor c={c} to={to} from={{ x: Math.max(60, Math.min(W - 60, to.x + side * W * 0.2)), y: Math.min(H - 60, to.y + H * 0.18) }} at={s.cursor.at} click={s.cursor.click} />;
        })()}
      </AbsoluteFill>
    );
  };

  const { i: cur, u } = segmentAt(f, mv);
  const iconBox = (i: number) => geoms[i].icon;
  return (
    <AbsoluteFill style={{ background: pal.bg, overflow: "hidden", fontFamily: c.text }}>
      {cur > 0 && u < 1 ? (
        <Between plan={plan} i={cur} u={u} c={c} back={back} content={content} iconBox={iconBox} />
      ) : (
        <>
          {back(cur)}
          {content(cur)}
        </>
      )}
      <Audio src={audioUrl} />
      <SoundEffects plan={plan} moves={mv} />
    </AbsoluteFill>
  );
}

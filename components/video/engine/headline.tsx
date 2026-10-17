import type { CSSProperties } from "react";
import { measureText } from "@remotion/layout-utils";
import { type Box } from "@/lib/video/geometry";
import { type ScreenWord } from "@/lib/video/plan";
import { type Ctx } from "./kit";
import { clamp01, enterK, mix } from "./motion";

// The words on screen: 2–6 of the sentence's own words, each coming in as it is said, set as large as the part of the
// frame the words have allows (the face really measured), the one key word lit in the look's highlight.

export type Type = { family: string; weight: number; tracking: number; upper: boolean; max: number };
const LINE = 1.08;

const widthOf = (text: string, size: number, t: Type) =>
  typeof document === "undefined" ? text.length * size * 0.56 : measureText({ text, fontFamily: t.family, fontSize: size, fontWeight: t.weight, letterSpacing: `${t.tracking}em`, textTransform: t.upper ? "uppercase" : "none", validateFontIsLoaded: false }).width;

// Words broken into lines of an even length (the narrowest width that keeps the line count).
function lines(widths: number[], space: number, maxW: number): number[][] {
  const wrap = (limit: number) => {
    const out: number[][] = [];
    let cur: number[] = [];
    let cw = 0;
    widths.forEach((w, i) => {
      const add = (cur.length ? space : 0) + w;
      if (cur.length && cw + add > limit) {
        out.push(cur);
        cur = [i];
        cw = w;
      } else {
        cur.push(i);
        cw += add;
      }
    });
    if (cur.length) out.push(cur);
    return out;
  };
  const base = wrap(maxW);
  let best = base;
  for (let limit = maxW * 0.95; limit > maxW * 0.5; limit -= maxW * 0.05) {
    const next = wrap(limit);
    if (next.length !== base.length) break;
    best = next;
  }
  return best;
}

const cache = new Map<string, { size: number; lines: number[][] }>();
export function fitWords(texts: string[], box: Box, t: Type): { size: number; lines: number[][] } {
  const key = `${t.family}|${t.weight}|${t.upper}|${t.tracking}|${t.max}|${Math.round(box.w)}x${Math.round(box.h)}|${texts.join(" ")}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let out = { size: 28, lines: [Array.from(texts.keys())] };
  for (let size = t.max; size >= 28; size -= 2) {
    const widths = texts.map((x) => widthOf(x, size, t));
    const space = size * (t.upper ? 0.24 : 0.26);
    const ls = lines(widths, space, box.w);
    const widest = Math.max(...ls.map((l) => l.reduce((s, i) => s + widths[i], 0) + space * (l.length - 1)));
    out = { size, lines: ls };
    if (widest <= box.w && ls.length * size * LINE <= box.h + 1) break;
  }
  // (a measure made before the face has loaded is the fallback face's, so it is not kept)
  if (typeof document !== "undefined" && document.fonts.check(`${t.weight} 20px ${t.family}`)) cache.set(key, out);
  return out;
}

export function Headline({ c, words, box, align, type }: { c: Ctx; words: ScreenWord[]; box: Box; align: "left" | "center"; type: Type }) {
  const texts = words.map((w) => (type.upper ? w.t.toUpperCase() : w.t));
  const { size, lines: ls } = fitWords(texts, box, type);
  return (
    <div style={{ position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: align === "center" ? "center" : "flex-start", textAlign: align }}>
      {ls.map((line, li) => (
        <div key={li} style={{ display: "flex", flexWrap: "nowrap", justifyContent: align === "center" ? "center" : "flex-start", lineHeight: LINE, whiteSpace: "nowrap" }}>
          {line.map((wi) => {
            const w = words[wi];
            // each word comes in as the voice says it
            const k = enterK(c.m, c.f, w.at - 2);
            const r = 1 - k;
            const style: CSSProperties = { display: "inline-block", transform: `translateY(${r * 0.35}em)`, opacity: clamp01(k * 1.5), filter: r > 0.02 ? `blur(${(r * 10).toFixed(1)}px)` : undefined };
            return (
              <span key={wi} style={{ position: "relative", display: "inline-block", marginRight: `${type.upper ? 0.24 : 0.26}em`, fontFamily: c.display, fontSize: size, fontWeight: type.weight, letterSpacing: `${type.tracking}em`, color: c.pal.ink }}>
                <KeyedWord c={c} text={texts[wi]} keyed={w.key} at={w.at} style={style} />
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// A word, and the one that is lit: in the look's highlight (colour, pill, underline, gradient, box, outline, italic, glow).
function KeyedWord({ c, text, keyed, at, style }: { c: Ctx; text: string; keyed: boolean; at: number; style: CSSProperties }) {
  const { pal, look } = c;
  if (!keyed) return <span style={style}>{text}</span>;
  // the key word's moment: just after it is said
  const kk = enterK(c.m, c.f, at + 4, 16);
  switch (look.key) {
    case "pill":
      return (
        <span style={{ ...style, position: "relative", padding: "0 0.22em", margin: "0 -0.1em" }}>
          <span style={{ position: "absolute", inset: "0.06em 0", borderRadius: Math.min(999, c.radius * 2 + 12), background: `linear-gradient(120deg, ${pal.fill}, ${pal.fill2})`, transform: `scaleX(${mix(0.3, 1, kk)})`, opacity: clamp01(kk * 2), zIndex: 0 }} />
          <span style={{ position: "relative", zIndex: 1, color: kk > 0.4 ? pal.onFill : pal.ink }}>{text}</span>
        </span>
      );
    case "underline":
      return (
        <span style={{ ...style, position: "relative" }}>
          {text}
          <span style={{ position: "absolute", left: 0, bottom: "0.02em", height: "0.09em", width: `${kk * 100}%`, borderRadius: 99, background: pal.accent }} />
        </span>
      );
    case "box":
      return (
        <span style={{ ...style, position: "relative" }}>
          <span style={{ position: "absolute", inset: "0.02em -0.14em", border: `0.05em solid ${pal.accent}`, borderRadius: Math.min(24, c.radius), clipPath: `inset(0 ${(1 - kk) * 100}% 0 0)` }} />
          {text}
        </span>
      );
    case "outline": return <span style={{ ...style, color: kk > 0.3 ? "transparent" : pal.ink, WebkitTextStroke: `0.03em ${pal.accent}` }}>{text}</span>;
    case "italic": return <span style={{ ...style, fontStyle: "italic", color: pal.accent }}>{text}</span>;
    case "glow": return <span style={{ ...style, color: pal.accent, textShadow: `0 0 ${Math.round(30 * kk)}px ${pal.glow}` }}>{text}</span>;
    case "gradient": return <span style={{ ...style, background: `linear-gradient(110deg, ${pal.accent}, ${pal.accent2})`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", paddingRight: "0.04em" }}>{text}</span>;
    default: return <span style={{ ...style, color: kk > 0.5 ? pal.accent : pal.ink }}>{text}</span>;
  }
}

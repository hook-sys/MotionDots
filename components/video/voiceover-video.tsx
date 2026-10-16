"use client";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { groupPhrases } from "@/lib/video/phrases";
import type { Word } from "@/lib/voice/words";

// The video: an animated dot-grid background, the logo, the words of the voice as captions (each
// word lights up as it is spoken), a progress line, and the logo large on a closing card. No music.
export const COMPOSITION_ID = "Voiceover";
export const FPS = 30;
export const END_CARD_SECONDS = 1.6;

export type Props = { audioUrl: string; logoUrl: string; words: Word[] };

const BLUE = "#0a66d6";
const VIOLET = "#7c3aed";
const FONT = 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif';

function Background({ frame, width, height }: { frame: number; width: number; height: number }) {
  const size = Math.min(width, height);
  const gap = size / 9;
  const cols = Math.ceil(width / gap) + 1;
  const rows = Math.ceil(height / gap) + 1;
  const dots = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const wave = 0.5 + 0.5 * Math.sin(frame * 0.07 + x * 0.55 + y * 0.4);
      dots.push(<div key={`${x}-${y}`} style={{ position: "absolute", left: x * gap, top: y * gap, width: gap * 0.1, height: gap * 0.1, borderRadius: "50%", background: "#9db8ff", opacity: 0.06 + 0.2 * wave }} />);
    }
  }
  const drift = (speed: number, phase: number) => Math.sin(frame * speed + phase);
  const blob = (color: string, x: number, y: number, r: number) => ({
    position: "absolute" as const,
    left: x - r,
    top: y - r,
    width: r * 2,
    height: r * 2,
    borderRadius: "50%",
    background: `radial-gradient(circle, ${color} 0%, rgba(11,11,15,0) 68%)`,
  });
  return (
    <AbsoluteFill style={{ background: "#0b0b0f", overflow: "hidden" }}>
      <div style={blob("rgba(10,102,214,0.55)", width * (0.25 + 0.1 * drift(0.012, 0)), height * (0.3 + 0.08 * drift(0.01, 1)), size * 0.7)} />
      <div style={blob("rgba(124,58,237,0.5)", width * (0.8 + 0.08 * drift(0.011, 2)), height * (0.75 + 0.08 * drift(0.013, 3)), size * 0.75)} />
      {dots}
    </AbsoluteFill>
  );
}

export const VoiceoverVideo = ({ audioUrl, logoUrl, words }: Props) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const size = Math.min(width, height);
  const t = frame / fps;
  const endCardFrame = durationInFrames - Math.round(END_CARD_SECONDS * fps);
  const phrases = groupPhrases(words);

  // the phrase on screen: the latest one that has started
  const index = phrases.reduce((found, p, i) => (t >= p.start - 0.04 ? i : found), -1);
  const phrase = frame < endCardFrame ? phrases[index] : undefined;
  const sinceStart = phrase ? frame - Math.round((phrase.start - 0.04) * fps) : 0;
  const enter = spring({ frame: sinceStart, fps, config: { damping: 18, stiffness: 160 } });

  // the logo: pops in at the top, then returns large for the closing card
  const logoIn = spring({ frame, fps, config: { damping: 14, stiffness: 140 } });
  const endProgress = spring({ frame: frame - endCardFrame, fps, config: { damping: 16, stiffness: 90 } });
  const small = size * 0.11;
  const big = size * 0.34;
  const logoSize = interpolate(endProgress, [0, 1], [small, big]);
  const logoTop = interpolate(endProgress, [0, 1], [height * 0.08, height / 2 - big / 2]);
  const captionsOut = interpolate(frame, [endCardFrame - 6, endCardFrame], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const fontSize = size * 0.085;
  const progress = Math.min(1, frame / Math.max(1, durationInFrames - 1));

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Background frame={frame} width={width} height={height} />

      <div style={{ position: "absolute", left: 0, right: 0, top: logoTop, height: logoSize, display: "flex", justifyContent: "center", transform: `scale(${frame < endCardFrame ? logoIn : 1})` }}>
        <Img src={logoUrl} style={{ height: logoSize, maxWidth: width * 0.6, objectFit: "contain" }} />
      </div>

      {phrase && (
        <div
          style={{
            position: "absolute",
            left: width * 0.08,
            right: width * 0.08,
            top: height * 0.5 - fontSize,
            minHeight: fontSize * 2.4,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignContent: "center",
            columnGap: fontSize * 0.28,
            rowGap: fontSize * 0.12,
            opacity: enter * captionsOut,
            transform: `translateY(${(1 - enter) * fontSize * 0.5}px)`,
          }}
        >
          {phrase.words.map((word, i) => {
            const next = phrase.words[i + 1];
            const spoken = t >= word.start;
            const active = spoken && (!next || t < next.start);
            return (
              <span key={i} style={{ fontSize, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.02em", color: active ? "#8fd0ff" : "#ffffff", opacity: spoken ? 1 : 0.35, transform: `scale(${active ? 1.08 : 1})` }}>
                {word.text}
              </span>
            );
          })}
        </div>
      )}

      <div style={{ position: "absolute", left: 0, bottom: 0, height: size * 0.012, width: `${progress * 100}%`, background: `linear-gradient(90deg, ${BLUE}, ${VIOLET})` }} />
      <Audio src={audioUrl} />
    </AbsoluteFill>
  );
};

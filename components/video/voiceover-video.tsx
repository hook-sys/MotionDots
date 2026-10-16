"use client";
import { AbsoluteFill, Img } from "remotion";
import { Audio } from "@remotion/media";

// The foundation video: the logo over the voiceover. No music. The scene system is built on top of this later.
export const COMPOSITION_ID = "Voiceover";
export const FPS = 30;

export type Props = { audioUrl: string; logoUrl: string };

export const VoiceoverVideo = ({ audioUrl, logoUrl }: Props) => (
  <AbsoluteFill style={{ backgroundColor: "#0b0b0f", alignItems: "center", justifyContent: "center" }}>
    <Img src={logoUrl} style={{ maxWidth: "40%", maxHeight: "40%" }} />
    <Audio src={audioUrl} />
  </AbsoluteFill>
);

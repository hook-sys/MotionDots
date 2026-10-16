// What the Remotion composition is called and what it takes. Shared by the render route and the
// Remotion bundle, so it must not import remotion itself (no "@/" imports here either).
import type { AspectRatio } from "./aspect";

export const COMPOSITION_ID = "Voiceover";
export type Props = { audioUrl: string; logoUrl: string; aspectRatio: AspectRatio };

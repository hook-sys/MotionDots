import type { CameraKind, Energy } from "./energy";
import type { Look } from "./look";

// What the code director decides and the film plays. Plain data (no React): the same plan can be
// made and checked on the server and in the browser.

export const FPS = 30;

// A row in a piece: the script's own words, never placeholder text.
export type Row = { title: string; icon?: string };
export type Stat = { title: string; value: string };

// The seven UI pieces, each filled from what the voice says in its scene.
export type PieceSpec =
  | { kind: "dashboard"; title: string | null; stats: Stat[] }
  | { kind: "chart"; title: string | null; values: number[]; value: string | null }
  | { kind: "list"; title: string | null; icon: string; rows: Row[] }
  | { kind: "search"; query: string; icon: string; rows: Row[] }
  | { kind: "notifications"; title: string | null; icon: string; rows: Row[] }
  | { kind: "phone"; screen: "list" | "notifications"; title: string | null; icon: string; rows: Row[] }
  | { kind: "counter"; value: string; label: string | null; icon: string };
export type PieceKind = PieceSpec["kind"];
export const PIECE_KINDS: PieceKind[] = ["dashboard", "chart", "list", "search", "notifications", "phone", "counter"];

export type SceneKind = "hook" | "problem" | "question" | "list" | "number" | "app" | "feature" | "cta" | "statement";
// How a scene's words and its main thing share the frame (each fills it; none overlaps another).
export const TEMPLATES = ["split-left", "split-right", "center", "top", "bottom", "type", "cta"] as const;
export type Template = (typeof TEMPLATES)[number];
// The ways between scenes: continuous (morph, zoom through the icon) or plain (slide, mask wipe, fade). Never a cut.
export type Transition = "fade" | "slide" | "wipe" | "morph" | "zoom";
export const STORY_SHAPES = ["problem-led", "demo-first", "before-after", "feature-led", "kinetic-type"] as const;
export type StoryShape = (typeof STORY_SHAPES)[number];

export type ScreenWord = { t: string; at: number; key: boolean };
// Why the director chose what it chose (for the report and the tests): which dictionary words matched.
export type Match = { word: string; entry: string; role: "keyword" | "problem" | "other" };

export type Scene = {
  from: number;
  to: number;
  kind: SceneKind;
  // 2–6 of the sentence's own words, exactly one of them highlighted
  words: ScreenWord[];
  // the keyword's icon, and the frame it comes in on
  icon: string;
  iconAt: number;
  piece: PieceSpec | null;
  pieceAt: number;
  // the frame the piece's moment happens on (a row ticks, a number jumps…); the big cursor clicks on it
  hit: number | null;
  cursor: { at: number; click: number } | null;
  template: Template;
  // the closing scene's button, in the sentence's own intent (null: no button)
  cta: string | null;
  camera: CameraKind;
  // the way into this scene (the first scene fades in)
  enter: Transition;
  matched: Match[];
};

// The user's own uploaded logo, always: never a letter or a placeholder in its place.
export type Brand = { logoUrl: string };
export type VideoPlan = {
  w: number;
  h: number;
  duration: number;
  seed: number;
  look: Look;
  energy: Energy;
  shape: StoryShape;
  brand: Brand;
  scenes: Scene[];
};

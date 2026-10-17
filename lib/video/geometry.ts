import type { PieceSpec, Scene } from "./plan";

// Where everything sits in the frame, for each template and shape (16:9, 9:16, 1:1). The words and the main thing
// each get their own part of the frame, so nothing overlaps; the piece is scaled up to fill its part (never a tiny
// card in an empty frame). Plain numbers: the same boxes are tested here and drawn by the film.
export type Box = { x: number; y: number; w: number; h: number }; // top-left corner and size, in frame pixels
export type Geometry = {
  text: Box;
  align: "left" | "center";
  icon: Box;
  piece: Box | null;
  // the real logo: a small mark on the first scene, large on the closing one
  logo: Box | null;
  button: Box | null;
};

// A piece's natural size (the film draws it at exactly this size, then scales it into its box).
export function naturalSize(p: PieceSpec): { w: number; h: number } {
  switch (p.kind) {
    case "list": return { w: 720, h: (p.title ? 108 : 28) + p.rows.length * 92 + 20 };
    case "dashboard": return { w: 780, h: 112 + Math.ceil(p.stats.length / 2) * 172 + 36 };
    case "chart": return { w: 840, h: 520 };
    case "search": return { w: 760, h: 126 + p.rows.length * 90 + 20 };
    case "notifications": return { w: 740, h: 36 + p.rows.length * 128 };
    case "phone": return { w: 440, h: 900 };
    case "counter": return { w: 780, h: 440 };
  }
}

const MAX_SCALE = 2.1;
// A piece scaled to fill its part of the frame, centred in it.
export function fitPiece(p: PieceSpec, box: Box): Box {
  const n = naturalSize(p);
  const s = Math.min(box.w / n.w, box.h / n.h, MAX_SCALE);
  const w = n.w * s, h = n.h * s;
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}

export function geometry(scene: Pick<Scene, "template" | "piece">, index: number, W: number, H: number): Geometry {
  const min = Math.min(W, H);
  // (a tall phone beside the words on a wide frame: stacked under them it would be a tiny thing in an empty frame)
  if (W > H * 1.2 && scene.piece?.kind === "phone" && (scene.template === "top" || scene.template === "bottom")) return geometry({ ...scene, template: scene.template === "top" ? "split-left" : "split-right" }, index, W, H);
  const m = 0.06 * min;
  const landscape = W > H * 1.2;
  const first = index === 0 && scene.template !== "cta";
  // the first scene carries the logo at the top, so everything starts below it
  const top = m + (first ? 0.1 * min : 0);
  const logo: Box | null = first ? { x: m, y: m * 0.8, w: 0.2 * min, h: 0.085 * min } : null;
  const bottom = H - m;
  const box = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });
  const piece = scene.piece;

  // the icon tile above the headline, and the headline under it
  const stack = (region: Box, align: "left" | "center", iconSize: number, textShare = 0.62): { icon: Box; text: Box } => {
    const gap = 0.025 * min;
    const total = region.h;
    const textH = Math.max(0.1 * min, Math.min(total - iconSize - gap, total * textShare));
    const block = iconSize + gap + textH;
    const y0 = region.y + (total - block) / 2;
    return {
      icon: box(align === "center" ? region.x + (region.w - iconSize) / 2 : region.x, y0, iconSize, iconSize),
      text: box(region.x, y0 + iconSize + gap, region.w, textH),
    };
  };

  if (scene.template === "cta") {
    const logoSize = 0.3 * min;
    const gap = 0.03 * min;
    const buttonH = 0.12 * min;
    const textH = 0.2 * min;
    const total = logoSize + gap + textH + gap + buttonH;
    const y0 = (H - total) / 2;
    const bw = Math.min(W - 2 * m, landscape ? 0.34 * W : 0.78 * W);
    return {
      logo: box((W - logoSize * 1.6) / 2, y0, logoSize * 1.6, logoSize),
      icon: box(W / 2 - 1, y0, 2, 2),
      text: box(m * 2, y0 + logoSize + gap, W - m * 4, textH),
      align: "center",
      piece: null,
      button: box((W - bw) / 2, y0 + logoSize + gap + textH + gap, bw, buttonH),
    };
  }

  if (!piece) {
    // words and an icon: the icon above, the words giant under it, filling the frame
    const iconSize = (scene.template === "center" ? 0.26 : 0.17) * min;
    const region = box(m * 1.4, top, W - m * 2.8, bottom - top - (first ? 0 : m * 0.4));
    const { icon, text } = stack(region, "center", iconSize, scene.template === "center" ? 0.45 : 0.7);
    return { text, align: "center", icon, piece: null, logo, button: null };
  }

  if (landscape && (scene.template === "split-left" || scene.template === "split-right")) {
    const colW = W * 0.42;
    const textCol = box(scene.template === "split-left" ? m * 1.6 : W - m * 1.6 - colW, top, colW, bottom - top);
    const pieceCol = box(scene.template === "split-left" ? W * 0.5 : m * 1.6, top, W * 0.5 - m * 1.6, bottom - top);
    const { icon, text } = stack(textCol, "left", 0.15 * min, 0.55);
    return { text, align: "left", icon, piece: fitPiece(piece, pieceCol), logo, button: null };
  }

  // stacked: the words above the piece (top) or under it (bottom)
  const bandH = (landscape ? 0.36 : 0.3) * H;
  const textRegion = scene.template === "bottom" ? box(m * 1.4, bottom - bandH, W - m * 2.8, bandH) : box(m * 1.4, top, W - m * 2.8, bandH - (top - m));
  const pieceRegion = scene.template === "bottom" ? box(m, top, W - m * 2, bottom - bandH - top - m * 0.4) : box(m, textRegion.y + textRegion.h + m * 0.4, W - m * 2, bottom - (textRegion.y + textRegion.h + m * 0.4));
  // (side by side in the band on a wide frame: the icon beside the words; stacked on a tall or square one)
  const wide = landscape;
  const iconSize = (wide ? 0.13 : 0.1) * min;
  if (wide) {
    const gap = 0.03 * min;
    const text = box(textRegion.x + iconSize + gap, textRegion.y, textRegion.w - iconSize - gap, textRegion.h);
    return { text, align: "left", icon: box(textRegion.x, textRegion.y + (textRegion.h - iconSize) / 2, iconSize, iconSize), piece: fitPiece(piece, pieceRegion), logo, button: null };
  }
  const { icon, text } = stack(textRegion, "center", iconSize, 0.7);
  return { text, align: "center", icon, piece: fitPiece(piece, pieceRegion), logo, button: null };
}

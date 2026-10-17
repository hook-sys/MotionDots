import { describe, expect, it } from "vitest";
import { DIMENSIONS } from "@/lib/aspect";
import { type Box, geometry, naturalSize } from "@/lib/video/geometry";
import type { PieceSpec, Template } from "@/lib/video/plan";

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ title: `Row ${i}` }));
const PIECES: PieceSpec[] = [
  { kind: "list", title: "Invoices", icon: "receipt", rows: rows(4) },
  { kind: "dashboard", title: null, stats: [{ title: "a", value: "1" }, { title: "b", value: "2" }] },
  { kind: "chart", title: null, values: [1, 2, 3], value: null },
  { kind: "search", query: "x", icon: "search", rows: rows(3) },
  { kind: "notifications", title: null, icon: "bell", rows: rows(3) },
  { kind: "phone", screen: "list", title: null, icon: "phone", rows: rows(3) },
  { kind: "counter", value: "40%", label: null, icon: "zap" },
];
const overlap = (a: Box, b: Box) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
const inside = (b: Box, W: number, H: number) => b.x >= -0.5 && b.y >= -0.5 && b.x + b.w <= W + 0.5 && b.y + b.h <= H + 0.5;

describe("frame geometry", () => {
  for (const [ratio, { width: W, height: H }] of Object.entries(DIMENSIONS)) {
    const templates: Template[] = ratio === "16:9" ? ["split-left", "split-right", "top", "bottom"] : ["top", "bottom"];
    for (const index of [0, 3]) {
      for (const template of templates) {
        for (const piece of PIECES) {
          it(`${ratio} ${template} ${piece.kind}${index === 0 ? " (first scene)" : ""}: inside the frame, nothing overlaps, the piece fills its part`, () => {
            const g = geometry({ template, piece }, index, W, H);
            const parts: [string, Box][] = [["text", g.text], ["icon", g.icon], ...(g.piece ? [["piece", g.piece] as [string, Box]] : []), ...(g.logo ? [["logo", g.logo] as [string, Box]] : [])];
            for (const [name, b] of parts) expect(inside(b, W, H), name).toBe(true);
            for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) expect(overlap(parts[i][1], parts[j][1]), `${parts[i][0]} × ${parts[j][0]}`).toBe(false);
            // the piece fills a good part of the frame (no tiny card in an empty frame)
            const p = g.piece!;
            expect((p.w * p.h) / (W * H)).toBeGreaterThan(piece.kind === "phone" ? 0.09 : piece.kind === "chart" || piece.kind === "counter" ? 0.14 : 0.115);
            expect(p.w / naturalSize(piece).w).toBeLessThanOrEqual(2.1 + 1e-6);
          });
        }
      }
    }
    for (const template of ["type", "center", "cta"] as Template[]) {
      it(`${ratio} ${template}: words, icon, logo and button inside the frame and apart`, () => {
        const g = geometry({ template, piece: null }, template === "cta" ? 5 : 2, W, H);
        const parts: [string, Box][] = [["text", g.text], ...(template === "cta" ? [] : [["icon", g.icon] as [string, Box]]), ...(g.logo ? [["logo", g.logo] as [string, Box]] : []), ...(g.button ? [["button", g.button] as [string, Box]] : [])];
        for (const [name, b] of parts) expect(inside(b, W, H), name).toBe(true);
        for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) expect(overlap(parts[i][1], parts[j][1]), `${parts[i][0]} × ${parts[j][0]}`).toBe(false);
      });
    }
  }
});

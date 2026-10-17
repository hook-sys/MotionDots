import type { PieceKind, Scene, StoryShape } from "../plan";
import type { Rng } from "../rng";
import type { PieceInput } from "./pieces";

// The story shapes: the sentences keep the voice's order, but each shape tells them differently — by what it shows.
//   problem-led:   opens on the pain (notifications, problems) and then the answer
//   demo-first:    opens on the product itself (a piece in the first scene)
//   before-after:  the first half on the problem side (lists, notifications), the second on results (charts, numbers),
//                  with a mask wipe where the story turns
//   feature-led:   the product's pieces everywhere a scene has enough of its own words
//   kinetic-type:  the words are the picture: big type alone on most scenes, a piece only where the voice needs one

type Draft = Scene & { input: PieceInput | null; base: PieceKind | null };
type Make = (d: Draft, order: PieceKind[]) => Scene["piece"];

export function applyShape(drafts: Draft[], shape: StoryShape, make: Make, R: Rng) {
  const body = drafts.filter((d) => d.kind !== "cta" && d.input);
  const n = drafts.length;
  switch (shape) {
    case "kinetic-type": {
      // words alone on most scenes about a plain subject; problems, numbers, questions and lists keep their piece
      let kept = 0;
      for (const d of body) {
        if (!d.piece) continue;
        const essential = d.kind === "problem" || d.kind === "number" || d.kind === "question" || d.kind === "list";
        if (essential || kept < 1 || !R.chance(0.6)) kept++;
        else d.piece = null;
      }
      break;
    }
    case "demo-first": {
      // the film opens on the product: the first scene that can show a piece does
      const first = body.find((d) => d.piece) ?? body.find((d) => make(d, ["list"]));
      if (first && !first.piece) first.piece = make(first, ["list"]);
      if (first && first !== body[0]) {
        // (the opening scene shows it too where it can)
        if (!body[0].piece) body[0].piece = make(body[0], ["list"]);
      }
      break;
    }
    case "before-after": {
      body.forEach((d, i) => {
        const before = i < n / 2;
        if (!d.piece) d.piece = make(d, before ? ["notifications", "list"] : ["chart", "list"]);
        else if (!before && d.piece.kind === "notifications") d.piece = make(d, ["chart", "list"]) ?? d.piece;
      });
      break;
    }
    case "feature-led": {
      for (const d of body) if (!d.piece) d.piece = make(d, ["list"]);
      break;
    }
    case "problem-led":
      // the pain first: the opening scene becomes a notification stack where its words allow it
      if (body[0] && !body[0].piece) body[0].piece = make(body[0], ["notifications"]);
      break;
  }
}

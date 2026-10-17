import { Sequence } from "remotion";
import { Audio } from "@remotion/media";
import type { VideoPlan } from "@/lib/video/plan";
import { type Moves } from "./transitions";

// Sound effects (no music): a soft sound on what happens, under the voice — a whoosh as a way between scenes moves
// (none for a cross-fade), a pop as an icon comes in, a reveal for a piece, a click on every cursor click and on the
// closing button, a chime at the end. Never two at once: sounds closer than a few frames keep the stronger one.
export type Sfx = { at: number; name: string; volume: number; rank: number };
const GAP = 9;

export function sfxOf(plan: VideoPlan, moves: Moves): Sfx[] {
  const all: Sfx[] = [];
  plan.scenes.forEach((s, i) => {
    if (i > 0 && s.enter !== "fade") all.push({ at: Math.max(0, moves[i].start + 2), name: "whoosh", volume: s.enter === "morph" ? 0.16 : 0.22, rank: 2 });
    if (s.template !== "cta") all.push({ at: s.iconAt, name: "soft_pop", volume: 0.3, rank: 1 });
    if (s.piece) all.push({ at: s.pieceAt, name: s.piece.kind === "search" ? "typing" : "reveal", volume: s.piece.kind === "search" ? 0.22 : 0.3, rank: 2 });
    if (s.cursor) all.push({ at: s.cursor.click, name: "click", volume: 0.42, rank: 5 });
    if (s.template === "cta" && s.hit != null) {
      all.push({ at: s.hit, name: "click", volume: 0.45, rank: 5 });
      all.push({ at: s.hit + 10, name: "success_chime", volume: 0.34, rank: 6 });
    }
  });
  // never two at once (the stronger kept), never past the end
  const out: Sfx[] = [];
  for (const e of all.filter((x) => x.at < plan.duration - 6).sort((a, b) => a.at - b.at || b.rank - a.rank)) {
    const prev = out[out.length - 1];
    if (prev && e.at - prev.at < GAP) {
      if (e.rank > prev.rank) out[out.length - 1] = e;
      continue;
    }
    out.push(e);
  }
  return out;
}

export function SoundEffects({ plan, moves }: { plan: VideoPlan; moves: Moves }) {
  return (
    <>
      {sfxOf(plan, moves).map((e, i) => (
        <Sequence key={i} from={e.at} durationInFrames={Math.min(90, plan.duration - e.at)} layout="none">
          <Audio src={`/sfx/${e.name}.mp3`} volume={e.volume} />
        </Sequence>
      ))}
    </>
  );
}

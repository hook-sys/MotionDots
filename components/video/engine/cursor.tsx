import { type Ctx, kIn } from "./kit";
import { IN_OUT, clamp01, mix, ramp } from "./motion";

// The big cursor: it glides in on a slight arc to the thing the voice is talking about, clicks it (a press and a ring),
// rests a moment and drifts off. The click is the moment something on screen changes.
export function BigCursor({ c, to, from, at, click }: { c: Ctx; to: { x: number; y: number }; from: { x: number; y: number }; at: number; click: number }) {
  if (c.f < at - 1 || c.f > click + 46) return null;
  const u = Math.min(c.w, c.h) / 1080;
  const tIn = IN_OUT(ramp(c.f, at, Math.max(8, click - 6 - at)));
  const tOut = IN_OUT(ramp(c.f, click + 26, 18));
  const x = mix(from.x, to.x, tIn) + tOut * 80 * u;
  const y = mix(from.y, to.y, tIn) - Math.sin(tIn * Math.PI) * 46 * u + tOut * 60 * u;
  const press = clamp01(kIn(c, click - 3, 4) - kIn(c, click + 3, 8));
  const ring = c.f >= click ? clamp01((c.f - click) / 18) : 0;
  const ink = c.pal.dark ? "#ffffff" : "#111111";
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: c.w, height: c.h, pointerEvents: "none", zIndex: 50, opacity: clamp01((c.f - at) / 6) * (1 - tOut) }}>
      {ring > 0 && ring < 1 && <div style={{ position: "absolute", left: to.x - 46 * u, top: to.y - 46 * u, width: 92 * u, height: 92 * u, borderRadius: 99, border: `4px solid ${c.pal.accent}`, transform: `scale(${mix(0.3, 1.6, ring).toFixed(3)})`, opacity: 1 - ring }} />}
      <svg width={110 * u} height={110 * u} viewBox="0 0 24 24" style={{ position: "absolute", left: x - 26 * u, top: y - 16 * u, transform: `scale(${(1 - press * 0.16).toFixed(3)})`, transformOrigin: "24% 14%" }}>
        <path d="M5 3 L19 12 L12 13.5 L9 20 Z" fill={ink} stroke={c.pal.dark ? "#111" : "#fff"} strokeWidth={1.3} strokeLinejoin="round" />
      </svg>
    </div>
  );
}

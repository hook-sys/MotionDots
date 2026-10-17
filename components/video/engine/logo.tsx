import { Img } from "remotion";
import { type Box } from "@/lib/video/geometry";
import { type Ctx, Icon, kIn, surf } from "./kit";
import { clamp01, mix } from "./motion";

// The user's own uploaded logo, always — never a letter or a placeholder in its place. It sits on a plate in the
// UI's colour so it reads on any background (a dark mark on a dark ground, a white one on a light ground).
export function LogoPlate({ c, logoUrl, box, at }: { c: Ctx; logoUrl: string; box: Box; at: number }) {
  const k = kIn(c, at, 30);
  const pad = box.h * 0.14;
  return (
    <div style={{ position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h, ...surf(c, 0.8, Math.min(box.h * 0.3, c.radius + 10)), display: "flex", alignItems: "center", justifyContent: "center", padding: pad, boxSizing: "border-box", opacity: clamp01(k * 1.5), transform: `scale(${mix(0.8, 1, k)})` }}>
      <Img src={logoUrl} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
    </div>
  );
}

// The closing button: it says the ask, is pressed on the click (a ring and a press), and the click is its moment.
export function CtaButton({ c, label, box, at, click }: { c: Ctx; label: string; box: Box; at: number; click: number }) {
  const k = kIn(c, at);
  const press = clamp01(kIn(c, click - 3, 4) - kIn(c, click + 3, 8));
  const glow = c.f >= click ? clamp01(1 - (c.f - click) / 30) : 0;
  const size = Math.min(box.h * 0.4, (box.w * 0.7) / Math.max(6, label.length * 0.62));
  return (
    <div style={{ position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h, opacity: clamp01(k * 1.6), transform: `translateY(${(1 - k) * 40}px) scale(${1 - press * 0.06})` }}>
      {glow > 0 && <div style={{ position: "absolute", inset: -30 * (1 - glow), borderRadius: 999, border: `3px solid ${c.pal.accent}`, opacity: glow }} />}
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: size * 0.4, borderRadius: Math.max(24, Math.min(999, c.radius * 3)), background: `linear-gradient(140deg, ${c.pal.fill}, ${c.pal.fill2})`, color: c.pal.onFill, fontFamily: c.display, fontSize: size, fontWeight: 750, letterSpacing: "-0.02em", boxShadow: `0 30px 70px ${c.pal.fill}66`, boxSizing: "border-box" }}>
        <span style={{ whiteSpace: "nowrap" }}>{label}</span>
        <Icon name="arrow-right" size={size * 1.1} color={c.pal.onFill} strokeWidth={2.6} />
      </div>
    </div>
  );
}

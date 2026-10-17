import type { CSSProperties, ReactNode } from "react";
import { type Ctx, Glyph, Icon, Tick, countUp, kIn, show, surf } from "./kit";
import { clamp01, mix } from "./motion";
import { naturalSize } from "@/lib/video/geometry";
import type { PieceSpec, Row } from "@/lib/video/plan";

// The product's UI, in the style's colours and in the script's own words: a dashboard card, a growing chart, a list,
// a search bar being typed, a stack of notifications, a phone, a number counting up. Each is drawn at its natural size
// (lib/video/geometry.ts naturalSize) and scaled to fill its part of the frame. Things that come in together arrive
// a 50–100 ms stagger apart, and on `hit` (the big cursor's click) something on screen changes.

type P = { c: Ctx; at: number; hit: number | null };
const hitK = (c: Ctx, hit: number | null, dur = 14) => (hit == null ? 0 : kIn(c, hit, dur));

// (each piece itself arrives, rising and settling, as its moment comes — never an empty card waiting)
export function Piece(props: P & { spec: PieceSpec }) {
  const k = kIn(props.c, props.at - 4, 26);
  return <div style={{ ...show(k, 60), transform: `translateY(${((1 - k) * 60).toFixed(1)}px) scale(${mix(0.94, 1, k).toFixed(4)})`, transformOrigin: "50% 60%" }}><Body {...props} /></div>;
}

function Body({ c, spec, at, hit }: P & { spec: PieceSpec }) {
  const { w, h } = naturalSize(spec);
  const p = { c, at, hit };
  switch (spec.kind) {
    case "list": return <List {...p} spec={spec} w={w} h={h} />;
    case "dashboard": return <Dashboard {...p} spec={spec} w={w} h={h} />;
    case "chart": return <Chart {...p} spec={spec} w={w} h={h} />;
    case "search": return <Search {...p} spec={spec} w={w} h={h} />;
    case "notifications": return <Notifications {...p} spec={spec} w={w} h={h} />;
    case "phone": return <Phone {...p} spec={spec} w={w} h={h} />;
    case "counter": return <Counter {...p} spec={spec} w={w} h={h} />;
  }
}

// frame a row arrives on: the stagger apart, after the piece itself
const rowAt = (c: Ctx, at: number, i: number, gap = c.m.stagger) => at + Math.round(c.m.dur * 0.6) + i * gap;
const card = (c: Ctx, w: number, h: number): CSSProperties => ({ width: w, height: h, ...surf(c, 1, Math.max(c.radius, 18)), overflow: "hidden", fontFamily: c.text, color: c.pal.panelInk, position: "relative", boxSizing: "border-box" });
const line = (c: Ctx): CSSProperties => ({ borderTop: `1.5px solid ${c.pal.panelLine}` });
const ellipsis: CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

function Head({ c, title, icon }: { c: Ctx; title: string; icon: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "26px 32px 18px" }}>
      <Glyph c={c} name={icon} size={52} tone="panel" />
      <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", ...ellipsis }}>{title}</div>
    </div>
  );
}

function RowLine({ c, r, at, i, icon, lit, last }: { c: Ctx; r: Row; at: number; i: number; icon: string; lit: number; last: boolean }) {
  const k = kIn(c, rowAt(c, at, i));
  return (
    <div style={{ ...show(k), display: "flex", alignItems: "center", gap: 18, height: 92, padding: "0 32px", boxSizing: "border-box", ...line(c), background: lit ? `${c.pal.fill}${Math.round(lit * 20).toString(16).padStart(2, "0")}` : undefined }}>
      <Glyph c={c} name={r.icon ?? icon} size={46} tone={i % 2 ? "fill2" : "panel"} />
      <div style={{ flex: 1, minWidth: 0, fontSize: 30, fontWeight: 650, ...ellipsis }}>{r.title}</div>
      {last && lit > 0 && <Tick c={c} size={38} k={lit} />}
    </div>
  );
}

function List({ c, at, hit, spec, w, h }: P & { spec: Extract<PieceSpec, { kind: "list" }>; w: number; h: number }) {
  const hk = hitK(c, hit);
  return (
    <div style={card(c, w, h)}>
      {spec.title && <Head c={c} title={spec.title} icon={spec.icon} />}
      <div style={{ paddingTop: spec.title ? 0 : 8 }}>
        {spec.rows.map((r, i) => <RowLine key={i} c={c} r={r} at={at} i={i} icon={spec.icon} lit={i === spec.rows.length - 1 ? hk : 0} last={i === spec.rows.length - 1} />)}
      </div>
    </div>
  );
}

function Dashboard({ c, at, hit, spec, w, h }: P & { spec: Extract<PieceSpec, { kind: "dashboard" }>; w: number; h: number }) {
  const hk = hitK(c, hit);
  return (
    <div style={card(c, w, h)}>
      <Head c={c} title={spec.title ?? "Overview"} icon="layout-dashboard" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, padding: "4px 32px 32px" }}>
        {spec.stats.map((s, i) => {
          const start = rowAt(c, at, i, c.m.stagger * 2);
          const k = kIn(c, start);
          const n = kIn(c, start, 34);
          const lit = i === 0 ? hk : 0;
          return (
            <div key={i} style={{ ...show(k), background: c.pal.panelSoft, borderRadius: Math.max(12, c.radius * 0.6), padding: "22px 26px", height: 154, boxSizing: "border-box", boxShadow: lit ? `0 0 0 3px ${c.pal.fill}` : undefined, transform: `translateY(${(1 - k) * 18}px) scale(${1 + Math.sin(lit * Math.PI) * 0.04})` }}>
              <div style={{ fontSize: 24, color: c.pal.panelSub, fontWeight: 600, ...ellipsis }}>{s.title}</div>
              <div style={{ fontSize: 60, fontWeight: 760, letterSpacing: "-0.03em", marginTop: 8, fontFamily: c.display }}>{countUp(s.value, n)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Chart({ c, at, hit, spec, w, h }: P & { spec: Extract<PieceSpec, { kind: "chart" }>; w: number; h: number }) {
  const draw = kIn(c, at + 4, 44);
  const hk = hitK(c, hit);
  const vals = spec.values;
  const max = Math.max(...vals, 1);
  const cw = w - 72, ch = h - 190;
  const pts = vals.map((x, i) => [(i / Math.max(1, vals.length - 1)) * cw, ch - (x / max) * ch * 0.9] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const head = Math.min(vals.length - 1, draw * (vals.length - 1));
  const lo = Math.floor(head), hi = Math.min(vals.length - 1, lo + 1);
  const tip = { x: mix(pts[lo][0], pts[hi][0], head - lo), y: mix(pts[lo][1], pts[hi][1], head - lo) };
  const id = `cg${at}`;
  return (
    <div style={card(c, w, h)}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "30px 36px 0" }}>
        <div style={{ fontSize: 30, fontWeight: 650, color: c.pal.panelSub, ...ellipsis }}>{spec.title ?? ""}</div>
        {spec.value && <div style={{ fontFamily: c.display, fontSize: 64, fontWeight: 800, letterSpacing: "-0.03em" }}>{countUp(spec.value, draw)}</div>}
      </div>
      <div style={{ position: "absolute", left: 36, bottom: 36, width: cw, height: ch }}>
        {[0.25, 0.5, 0.75].map((g) => <div key={g} style={{ position: "absolute", left: 0, right: 0, top: ch * g, height: 1.5, background: c.pal.panelLine }} />)}
        <svg width={cw} height={ch} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={c.pal.fill} stopOpacity={0.35} />
              <stop offset="1" stopColor={c.pal.fill} stopOpacity={0} />
            </linearGradient>
            <clipPath id={`${id}c`}><rect x={-10} y={-30} width={Math.max(0, tip.x + 10)} height={ch + 60} /></clipPath>
          </defs>
          <g clipPath={`url(#${id}c)`}>
            <path d={`${d} L${cw} ${ch} L0 ${ch} Z`} fill={`url(#${id})`} />
            <path d={d} stroke={c.pal.fill} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          {draw > 0.05 && <circle cx={tip.x} cy={tip.y} r={13 + hk * 10 * (1 - hk)} fill={c.pal.panel} stroke={c.pal.fill} strokeWidth={6} />}
        </svg>
      </div>
    </div>
  );
}

function Search({ c, at, hit, spec, w, h }: P & { spec: Extract<PieceSpec, { kind: "search" }>; w: number; h: number }) {
  const q = spec.query;
  const typed = clamp01((c.f - at - 6) / Math.max(14, q.length * 2));
  const doneAt = at + 6 + Math.max(14, q.length * 2);
  const hk = hitK(c, hit);
  return (
    <div style={card(c, w, h)}>
      <div style={{ padding: "28px 28px 14px" }}>
        <div style={{ height: 82, borderRadius: Math.max(14, c.radius * 0.6), border: `2.5px solid ${c.pal.fill}`, display: "flex", alignItems: "center", gap: 16, padding: "0 24px", background: c.pal.panelSoft }}>
          <Icon name="search" size={34} color={c.pal.panelSub} />
          <span style={{ fontSize: 32, fontWeight: 600, ...ellipsis }}>{q.slice(0, Math.round(q.length * typed))}</span>
          {typed < 1 && <span style={{ width: 3, height: 38, background: c.pal.fill }} />}
        </div>
      </div>
      {spec.rows.map((r, i) => {
        const k = kIn(c, doneAt + i * c.m.stagger);
        const lit = i === 0 ? hk : 0;
        return (
          <div key={i} style={{ ...show(k, 12), display: "flex", alignItems: "center", gap: 18, height: 90, padding: "0 32px", boxSizing: "border-box", ...line(c), background: lit ? `${c.pal.fill}${Math.round(lit * 20).toString(16).padStart(2, "0")}` : undefined }}>
            <Glyph c={c} name={r.icon ?? spec.icon} size={46} tone="panel" />
            <div style={{ flex: 1, minWidth: 0, fontSize: 30, fontWeight: 650, ...ellipsis }}>{r.title}</div>
            {lit > 0 && <Icon name="arrow-right" size={34} color={c.pal.fill} strokeWidth={2.6} />}
          </div>
        );
      })}
    </div>
  );
}

function Notifications({ c, at, hit, spec, w, h }: P & { spec: Extract<PieceSpec, { kind: "notifications" }>; w: number; h: number }) {
  const hk = hitK(c, hit);
  return (
    <div style={{ width: w, height: h, fontFamily: c.text, position: "relative" }}>
      {spec.rows.map((r, i) => {
        // each notification arrives from above, one after another
        const k = kIn(c, at + 4 + i * Math.max(8, c.m.stagger * 3));
        const lit = i === 0 ? hk : 0;
        return (
          <div key={i} style={{ position: "absolute", left: 0, top: 18 + i * 128, width: w, height: 112, ...surf(c, 0.8, Math.max(c.radius, 18)), display: "flex", alignItems: "center", gap: 20, padding: "0 28px", boxSizing: "border-box", color: c.pal.panelInk, opacity: clamp01(k * 1.5), transform: `translateY(${(1 - k) * -50}px) scale(${mix(0.96, 1, k)})` }}>
            <Glyph c={c} name={r.icon ?? spec.icon} size={60} tone={i % 2 ? "fill2" : "accent"} />
            <div style={{ flex: 1, minWidth: 0, fontSize: 32, fontWeight: 700, ...ellipsis }}>{r.title}</div>
            {lit > 0 ? <Tick c={c} size={44} k={lit} /> : <div style={{ width: 14, height: 14, borderRadius: 99, background: c.pal.fill }} />}
          </div>
        );
      })}
    </div>
  );
}

function Phone({ c, at, hit, spec, w, h }: P & { spec: Extract<PieceSpec, { kind: "phone" }>; w: number; h: number }) {
  const k = kIn(c, at);
  const hk = hitK(c, hit);
  const frame = c.pal.dark ? "#1b1d24" : "#16171d";
  const screenW = w - 32, screenH = h - 32;
  const rows: ReactNode[] = spec.rows.map((r, i) => {
    const rk = kIn(c, rowAt(c, at, i));
    const lit = i === 0 ? hk : 0;
    return (
      <div key={i} style={{ ...show(rk), display: "flex", alignItems: "center", gap: 16, height: 104, padding: "0 28px", boxSizing: "border-box", ...line(c), background: lit ? `${c.pal.fill}${Math.round(lit * 22).toString(16).padStart(2, "0")}` : undefined }}>
        <Glyph c={c} name={r.icon ?? spec.icon} size={50} tone={i % 2 ? "fill2" : spec.screen === "notifications" ? "accent" : "panel"} />
        <div style={{ flex: 1, minWidth: 0, fontSize: 28, fontWeight: 650, ...ellipsis }}>{r.title}</div>
        {lit > 0 && <Tick c={c} size={34} k={lit} />}
      </div>
    );
  });
  return (
    <div style={{ width: w, height: h, borderRadius: 66, background: frame, padding: 16, boxSizing: "border-box", border: "2px solid #3a3d48", boxShadow: `0 50px 120px ${c.pal.shadow}`, opacity: clamp01(k * 1.6), transform: `translateY(${(1 - k) * 60}px)` }}>
      <div style={{ width: screenW, height: screenH, borderRadius: 50, overflow: "hidden", background: c.pal.panel, color: c.pal.panelInk, fontFamily: c.text, position: "relative" }}>
        <div style={{ position: "absolute", top: 14, left: "50%", marginLeft: -62, width: 124, height: 36, borderRadius: 20, background: "#000" }} />
        <div style={{ height: 70, display: "flex", alignItems: "flex-end", justifyContent: "flex-end", gap: 8, padding: "0 34px 10px" }}>
          <Icon name="signal" size={24} color={c.pal.panelInk} /><Icon name="wifi" size={24} color={c.pal.panelInk} /><Icon name="battery-full" size={26} color={c.pal.panelInk} />
        </div>
        {spec.title && <div style={{ padding: "6px 28px 18px", fontSize: 38, fontWeight: 760, letterSpacing: "-0.02em", ...ellipsis }}>{spec.title}</div>}
        <div>{rows}</div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 108, borderTop: `1.5px solid ${c.pal.panelLine}`, display: "flex", alignItems: "center", justifyContent: "space-around", paddingBottom: 14, boxSizing: "border-box", background: c.pal.panel }}>
          {["house", spec.icon, "bell", "settings"].map((ic, i) => (
            <div key={i} style={{ position: "relative", transform: i === 2 ? `scale(${1 + Math.sin(hk * Math.PI) * 0.25})` : undefined }}>
              <Icon name={ic} size={38} color={i === 1 ? c.pal.fill : c.pal.panelSub} />
              {i === 2 && hk > 0.4 && <div style={{ position: "absolute", right: -6, top: -4, width: 16, height: 16, borderRadius: 99, background: c.pal.fill }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Counter({ c, at, hit, spec, w, h }: P & { spec: Extract<PieceSpec, { kind: "counter" }>; w: number; h: number }) {
  const k = kIn(c, at + 2, 36);
  const hk = hitK(c, hit, 20);
  return (
    <div style={{ ...card(c, w, h), display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 56px", transform: `scale(${1 + Math.sin(hk * Math.PI) * 0.035})` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <Glyph c={c} name={spec.icon} size={64} tone="panel" />
        {spec.label && <div style={{ fontSize: 34, fontWeight: 650, color: c.pal.panelSub, ...ellipsis }}>{spec.label}</div>}
      </div>
      <div style={{ fontFamily: c.display, fontSize: 200, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1.05, marginTop: 10, color: c.pal.panelInk, background: `linear-gradient(120deg, ${c.pal.panelInk} 30%, ${c.pal.fill})`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>{countUp(spec.value, k)}</div>
    </div>
  );
}

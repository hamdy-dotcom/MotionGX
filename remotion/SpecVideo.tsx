// The spec interpreter: renders a MotionSpec (data, not code) with the behavior library. Used by the
// Player preview (sandboxed iframe) and by exports. Only `custom` elements carry generated code, and
// those are compiled + vetted before they reach here.
import React, { useMemo } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import * as Remotion from "remotion";
import { AbsoluteFill, Html5Audio, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { measureText } from "@remotion/layout-utils";
import * as Primitives from "@motiongx/primitives";
import { MotionProvider, type MotionInput } from "@motiongx/primitives";
import { BrandLogo, DeviceFrame } from "../packages/primitives/src/media";
import { buildTokens, rgba, type BrandTokens } from "../packages/primitives/src/palette";
import { useBrandFonts } from "../packages/primitives/src/fonts";
import { cameraAt, elementText, pointAlong, resolveAt, routePoints, sec, type EvalEnv, type Resolved } from "../lib/motion/spec-eval";
import type { ColorRole, MotionSpec, SpecElement } from "../lib/motion/spec";
import { clamp01, rand, type Overlay } from "./behaviors";
import { lerpPoints, shapePoints, smoothPath, toPath, type ShapeKind } from "./behaviors/shapes";
import type { RuntimeInput } from "./runtime-input";

export type SpecVideoProps = {
  spec: MotionSpec;
  input: RuntimeInput;
  audio: { music: string | null; sfx: string | null; voiceover: string | null };
  /** vetted custom elements: element id → compiled CommonJS */
  custom?: Record<string, string>;
};

const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿ]/;
type Palette = BrandTokens & { white: string; black: string };
const color = (P: Palette, r: ColorRole | undefined, fallback = P.text) => (r ? (P as unknown as Record<string, string>)[r] ?? fallback : fallback);

// letters that don't connect to the following letter (no kashida after them)
const NON_JOINING = new Set("اأإآدذرزوؤةىءـ".split(""));
function withKashida(word: string, n: number) {
  if (n <= 0 || !ARABIC.test(word)) return word;
  const chars = [...word];
  // stretch at the join closest to the middle
  let best = -1;
  for (let i = 0; i < chars.length - 1; i++) {
    if (ARABIC.test(chars[i]) && ARABIC.test(chars[i + 1]) && !NON_JOINING.has(chars[i]) && (best < 0 || Math.abs(i - chars.length / 2) < Math.abs(best - chars.length / 2))) best = i;
  }
  if (best < 0) return word;
  return chars.slice(0, best + 1).join("") + "ـ".repeat(n) + chars.slice(best + 1).join("");
}

const tf = (s: Resolved["state"], rot: number, scale: number) =>
  `translate(${s.dx}px, ${s.dy}px) rotate(${rot}deg) scale(${scale * s.sx}, ${scale * s.sy}) skewX(${s.skewX}deg)`;

function filterOf(s: Resolved["state"], glowColor: string) {
  const f: string[] = [];
  if (s.blur > 0.05) f.push(`blur(${s.blur.toFixed(2)}px)`);
  if (Math.abs(s.brightness - 1) > 0.01) f.push(`brightness(${s.brightness.toFixed(3)})`);
  if (Math.abs(s.hue) > 0.5) f.push(`hue-rotate(${s.hue.toFixed(1)}deg)`);
  if (s.glow > 0.02) f.push(`drop-shadow(0 0 ${(s.glow * 28).toFixed(1)}px ${glowColor})`);
  return f.length ? f.join(" ") : undefined;
}

// ── overlays ────────────────────────────────────────────────────────────────
const OverlayLayer: React.FC<{ o: Overlay; w: number; h: number; P: Palette; base: string }> = ({ o, w, h, P, base }) => {
  if (o.kind === "burst" || o.kind === "dissolve") {
    const n = o.count;
    const cols = [P.primary, P.accent, P.gradB, P.text];
    return (
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}>
        {Array.from({ length: n }, (_, i) => {
          const seed = o.seed;
          const a = rand(seed, i) * Math.PI * 2;
          const sp = o.kind === "burst" ? (0.4 + rand(seed, i + 7) * 0.6) * (o.spread / 100) * Math.max(w, h) * 3 : (0.2 + rand(seed, i + 7)) * Math.max(w, h) * 0.8;
          const startX = o.kind === "dissolve" ? rand(seed, i + 11) * w : w / 2;
          const startY = o.kind === "dissolve" ? rand(seed, i + 13) * h : h / 2;
          const e = 1 - (1 - o.p) ** 2;
          const x = startX + Math.cos(a) * sp * e;
          const y = startY + Math.sin(a) * sp * e + (o.kind === "burst" ? e * e * h * 0.6 : -e * h * 0.4);
          const op = 1 - o.p;
          const c = cols[i % cols.length];
          const sz = Math.max(3, Math.min(w, h) * 0.035) * (0.6 + rand(seed, i + 5) * 0.8);
          if (o.kind === "burst" && o.shape === "spark") {
            const len = sz * 3 * (1 - o.p);
            return <line key={i} x1={x} y1={y} x2={x - Math.cos(a) * len} y2={y - Math.sin(a) * len} stroke={c} strokeWidth={sz * 0.35} strokeLinecap="round" opacity={op} />;
          }
          if (o.kind === "burst" && o.shape === "confetti") return <rect key={i} x={x} y={y} width={sz} height={sz * 0.5} fill={c} opacity={op} transform={`rotate(${o.p * 720 * (rand(seed, i + 3) - 0.5)} ${x} ${y})`} />;
          if (o.kind === "burst" && o.shape === "square") return <rect key={i} x={x - sz / 2} y={y - sz / 2} width={sz} height={sz} fill={c} opacity={op} />;
          return <circle key={i} cx={x} cy={y} r={sz / 2} fill={o.kind === "dissolve" ? base : c} opacity={op} />;
        })}
      </svg>
    );
  }
  if (o.kind === "ripple") {
    return (
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}>
        {Array.from({ length: o.rings }, (_, i) => {
          const p = clamp01(o.p * 1.3 - i * 0.15);
          return <circle key={i} cx={w / 2} cy={h / 2} r={(Math.max(w, h) / 2) * (1 + p * 1.6)} fill="none" stroke={P.primary} strokeWidth={Math.max(2, w * 0.012) * (1 - p)} opacity={(1 - p) * 0.9} />;
        })}
      </svg>
    );
  }
  if (o.kind === "underline") return <div style={{ position: "absolute", insetInlineStart: 0, bottom: -h * 0.08, height: Math.max(3, (o.thickness / 100) * w * 4), width: `${o.p * 100}%`, background: P.accent, borderRadius: 999 }} />;
  if (o.kind === "highlight") return <div style={{ position: "absolute", insetInlineStart: "-4%", top: "8%", height: "84%", width: `${o.p * 108}%`, background: rgba(P.primary, 0.35), borderRadius: h * 0.12, zIndex: -1 }} />;
  if (o.kind === "glitch") {
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ position: "absolute", insetInline: 0, top: `${rand(o.seed, i) * 90}%`, height: `${4 + rand(o.seed, i + 4) * 8}%`, background: i % 2 ? rgba(P.accent, 0.5 * o.amount) : rgba(P.primary, 0.5 * o.amount), transform: `translateX(${(rand(o.seed, i + 8) - 0.5) * 30 * o.amount}%)` }} />
        ))}
      </div>
    );
  }
  if (o.kind === "shine") {
    if (o.p < 0 || o.p > 1) return null;
    return (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", mixBlendMode: "screen" }}>
        <div style={{ position: "absolute", top: "-20%", height: "140%", width: "30%", left: `${-40 + o.p * 140}%`, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)", transform: "skewX(-20deg)" }} />
      </div>
    );
  }
  return null;
};

// ── element bodies ─────────────────────────────────────────────────────────
function TextBody({ el, r, P, fonts, env }: { el: Extract<SpecElement, { type: "text" | "counter" }>; r: Resolved; P: Palette; fonts: MotionInput["fonts"]; env: EvalEnv }) {
  const s = r.state;
  let text = r.text ?? "";
  if (el.type === "counter") {
    const v = el.from + (el.to - el.from) * (s.count ?? 1);
    text = `${el.prefix ?? ""}${v.toLocaleString("en-US", { minimumFractionDigits: el.decimals, maximumFractionDigits: el.decimals })}${el.suffix ?? ""}`;
  }
  const arabic = ARABIC.test(text);
  const family = el.font === "latin" ? fonts.latin : el.font === "body" ? fonts.body : fonts.head;
  const fontSize = (el.size / 100) * env.width;
  const style: React.CSSProperties = {
    fontFamily: family,
    fontWeight: el.weight,
    fontSize,
    lineHeight: arabic ? 1.45 : 1.15,
    whiteSpace: "nowrap",
    direction: arabic ? "rtl" : "ltr",
    color: color(P, el.color),
    letterSpacing: arabic ? 0 : "-0.01em",
  };
  if (el.type === "text" && el.gradient) Object.assign(style, { backgroundImage: `linear-gradient(90deg, ${P.gradA}, ${P.gradB})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" });
  if (el.type === "text" && el.outline) Object.assign(style, { color: "transparent", WebkitTextStroke: `${Math.max(1.5, fontSize * 0.03)}px ${color(P, el.outline)}` });
  if (s.typed !== undefined) text = [...text].slice(0, Math.round([...text].length * clamp01(s.typed))).join("");

  const words = text.split(/(\s+)/);
  const hl = el.type === "text" ? el.highlight : undefined;
  let wordIdx = -1;
  const split = s.units ? (s.units.split === "letter" && arabic ? "word" : s.units.split) : null;
  const realWords = words.filter((x) => x.trim()).length;
  let unit = -1;
  const totalLetters = [...text.replace(/\s/g, "")].length;
  const parts = words.map((wd, k) => {
    if (!wd.trim()) return <span key={k}>{wd}</span>;
    wordIdx++;
    const wcol = hl && hl.word === wordIdx ? { color: color(P, hl.color), WebkitTextFillColor: color(P, hl.color) } : {};
    const word = withKashida(wd, s.kashida ?? 0);
    if (split === "word") {
      unit++;
      const u = s.units!.fn(unit, realWords);
      return (
        <span key={k} style={{ display: "inline-block", overflow: "hidden", paddingBlock: "0.12em", marginBlock: "-0.12em", verticalAlign: "top" }}>
          <span style={{ display: "inline-block", transform: `translate(${u.dx ?? 0}px, ${u.dy ?? 0}px) rotate(${u.rot ?? 0}deg)`, opacity: u.opacity ?? 1, ...wcol }}>{word}</span>
        </span>
      );
    }
    if (split === "letter") {
      return (
        <span key={k} style={{ display: "inline-block", ...wcol }}>
          {[...word].map((ch, j) => {
            unit++;
            const u = s.units!.fn(unit, totalLetters);
            return (
              <span key={j} style={{ display: "inline-block", transform: `translate(${u.dx ?? 0}px, ${u.dy ?? 0}px) rotate(${u.rot ?? 0}deg)`, opacity: u.opacity ?? 1 }}>
                {ch}
              </span>
            );
          })}
        </span>
      );
    }
    return (
      <span key={k} style={wcol}>
        {word}
      </span>
    );
  });

  // shrink to the box if the measured line is wider than allowed (validator flags real overflow)
  let scale = 1;
  const maxW = el.w !== undefined ? (el.w / 100) * env.width : env.width * 0.88;
  try {
    const m = measureText({ text: r.text ?? text, fontFamily: String(family), fontSize, fontWeight: String(el.weight) });
    if (m.width > maxW) scale = maxW / m.width;
  } catch {
    /* measurement unavailable (SSR) */
  }
  const align = el.type === "text" ? el.align : "center";
  const justify = align === "center" ? "center" : (align === "start") === !arabic ? "flex-start" : "flex-end";
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: justify }}>
      <div style={{ ...style, transform: scale < 1 ? `scale(${scale})` : undefined, position: "relative" }}>{parts}</div>
    </div>
  );
}

function ShapeBody({ el, r, P, t }: { el: Extract<SpecElement, { type: "shape" }>; r: Resolved; P: Palette; t: number }) {
  const { w, h } = r;
  const sw = ((el.strokeW ?? 0) / 100) * Math.max(w, h) * 4;
  const fill = el.shape === "ring" || el.shape === "line" ? "none" : el.gradient ? "url(#g)" : el.fill ? color(P, el.fill) : el.stroke ? "none" : P.primary;
  const stroke = el.stroke ? color(P, el.stroke) : el.shape === "ring" || el.shape === "line" ? color(P, el.fill, P.primary) : "none";
  const strokeWidth = el.shape === "ring" || el.shape === "line" ? Math.max(sw, Math.min(w, h) * 0.06) : sw;
  const draw = r.state.draw;
  const dash = draw !== undefined ? { pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - draw } : {};
  if (el.shape === "line") {
    return (
      <svg width={w} height={Math.max(h, strokeWidth)} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" {...dash} />
      </svg>
    );
  }
  const opts = { radius: el.radius, sides: el.sides, points: el.points, seed: 7, t: el.shape === "blob" ? t : 0 };
  let pts = shapePoints(el.shape as ShapeKind, w, h, opts);
  if (el.to && r.state.morph) pts = lerpPoints(pts, shapePoints(el.to as ShapeKind, w, h, opts), r.state.morph);
  return (
    <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      {el.gradient ? (
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={P.gradA} />
            <stop offset="1" stopColor={P.gradB} />
          </linearGradient>
        </defs>
      ) : null}
      <path d={toPath(pts)} fill={fill} fillOpacity={el.alpha ?? 1} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" {...dash} style={el.glow ? { filter: `drop-shadow(0 0 ${Math.min(w, h) * 0.12}px ${color(P, el.glow)})` } : undefined} />
    </svg>
  );
}

function ParticlesBody({ el, r, P, t }: { el: Extract<SpecElement, { type: "particles" }>; r: Resolved; P: Palette; t: number }) {
  const { w, h } = r;
  const speed = el.speed ?? 1;
  const dir = ((el.dir ?? (el.kind === "rain" ? 100 : el.kind === "bubbles" ? -90 : -60)) * Math.PI) / 180;
  const size = (el.size ?? 1) * Math.min(w, h) * 0.012 + 2;
  const cols = el.colors.map((c) => color(P, c));
  return (
    <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {Array.from({ length: el.count }, (_, i) => {
        const seed = 17;
        const travel = (t * speed * 0.08 + rand(seed, i)) % 1;
        const x = ((rand(seed, i + 100) * w + Math.cos(dir) * travel * w * 0.6) % w + w) % w;
        const y = ((rand(seed, i + 200) * h + Math.sin(dir) * travel * h) % h + h) % h;
        const c = cols[i % cols.length];
        const tw = el.kind === "stars" ? 0.3 + 0.7 * Math.abs(Math.sin(t * 2 + i)) : el.kind === "dust" ? 0.35 : 0.85;
        const sz = size * (0.5 + rand(seed, i + 300));
        if (el.kind === "rain" || el.kind === "sparks") return <line key={i} x1={x} y1={y} x2={x - Math.cos(dir) * sz * 4} y2={y - Math.sin(dir) * sz * 4} stroke={c} strokeWidth={sz * 0.3} strokeLinecap="round" opacity={tw} />;
        if (el.kind === "squares" || el.kind === "confetti") return <rect key={i} x={x} y={y} width={sz} height={el.kind === "confetti" ? sz * 0.5 : sz} fill={c} opacity={tw} transform={`rotate(${t * 90 * (rand(seed, i) - 0.5) * speed} ${x} ${y})`} />;
        if (el.kind === "bubbles") return <circle key={i} cx={x} cy={y} r={sz} fill="none" stroke={c} strokeWidth={sz * 0.15} opacity={tw} />;
        return <circle key={i} cx={x} cy={y} r={sz / 2} fill={c} opacity={tw} />;
      })}
    </svg>
  );
}

function RouteBody({ el, r, P, env }: { el: Extract<SpecElement, { type: "route" }>; r: Resolved; P: Palette; env: EvalEnv }) {
  const pts = routePoints(el, env);
  const d = el.smooth === false ? `M${pts.map((p) => p.join(",")).join("L")}` : smoothPath(pts);
  const draw = r.state.draw ?? 1;
  const sw = (el.strokeW / 100) * env.width * 2;
  // stations appear as the line passes them
  const lens: number[] = [0];
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = lens[lens.length - 1] || 1;
  const head = pointAlong(pts, draw);
  return (
    <svg width={env.width} height={env.height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <path d={d} fill="none" stroke={color(P, el.stroke)} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={el.dashed ? "0.012 0.012" : 1} strokeDashoffset={el.dashed ? 0 : 1 - draw} style={el.dashed ? { clipPath: `inset(0 0 0 0)` } : undefined} />
      {el.nodes
        ? pts.map((p, i) => {
            const k = clamp01((draw - lens[i] / total) * 12 + 0.001);
            return <circle key={i} cx={p[0]} cy={p[1]} r={sw * 1.6 * (0.4 + 0.6 * k)} fill={color(P, el.nodes)} opacity={k} />;
          })
        : null}
      {draw > 0 && draw < 1 ? <circle cx={head[0]} cy={head[1]} r={sw * 1.4} fill={color(P, el.stroke)} /> : null}
    </svg>
  );
}

// custom elements: vetted, compiled snippets (evaluated with a whitelisted require)
const ALLOWED: Record<string, unknown> = { react: React, "react/jsx-runtime": jsxRuntime, remotion: Remotion, "@motiongx/primitives": Primitives };
function loadCustom(code: string): React.ComponentType<{ t: number; frame: number; width: number; height: number; palette: BrandTokens; fonts: MotionInput["fonts"] }> {
  const mod = { exports: {} as Record<string, unknown> };
  const req = (name: string) => {
    if (name in ALLOWED) return ALLOWED[name];
    throw new Error(`Import not allowed in a custom element: ${name}`);
  };
  new Function("require", "module", "exports", code)(req, mod, mod.exports);
  const C = mod.exports.default as React.ComponentType<never> | undefined;
  if (typeof C !== "function") throw new Error("custom element has no default export");
  return C as never;
}

function Background({ spec, P, env, t }: { spec: MotionSpec; P: Palette; env: EvalEnv; t: number }) {
  return (
    <>
      {spec.canvas.bg.map((b, i) => {
        if ((b.in !== undefined && t < sec(b.in, env)) || (b.out !== undefined && t > sec(b.out, env))) return null;
        const c = b.colors.map((x) => color(P, x));
        const a = b.alpha ?? 1;
        const drift = (b.drift ?? 0) * t * 20;
        const sc = b.scale ?? 1;
        const base: React.CSSProperties = { position: "absolute", inset: 0, opacity: a };
        switch (b.kind) {
          case "solid":
            return <div key={i} style={{ ...base, background: c[0] }} />;
          case "gradient":
            return <div key={i} style={{ ...base, background: `linear-gradient(${(b.angle ?? 160) + drift * 0.5}deg, ${c.join(", ")}${c.length === 1 ? `, ${P.bg}` : ""})` }} />;
          case "radial":
            return <div key={i} style={{ ...base, background: `radial-gradient(circle at ${50 + Math.sin(t * 0.3) * 8 * (b.drift ?? 0)}% ${40 + Math.cos(t * 0.25) * 8 * (b.drift ?? 0)}%, ${c[0]}, transparent 60%)` }} />;
          case "grid": {
            const s = 6 * sc;
            return <div key={i} style={{ ...base, backgroundImage: `linear-gradient(${c[0]} 1.5px, transparent 1.5px), linear-gradient(90deg, ${c[0]} 1.5px, transparent 1.5px)`, backgroundSize: `${s}vw ${s}vw`, backgroundPosition: `${drift}px ${drift * 0.6}px` }} />;
          }
          case "dots":
            return <div key={i} style={{ ...base, backgroundImage: `radial-gradient(${c[0]} 1.6px, transparent 1.8px)`, backgroundSize: `${4 * sc}vw ${4 * sc}vw`, backgroundPosition: `${drift}px ${drift}px` }} />;
          case "stripes":
            return <div key={i} style={{ ...base, backgroundImage: `repeating-linear-gradient(${b.angle ?? 45}deg, ${c[0]} 0 ${10 * sc}px, transparent ${10 * sc}px ${28 * sc}px)`, backgroundPosition: `${drift}px 0` }} />;
          case "noise":
            return (
              <svg key={i} width="100%" height="100%" style={{ ...base, mixBlendMode: "overlay" }}>
                <filter id={`n${i}`}>
                  <feTurbulence type="fractalNoise" baseFrequency={0.9 / sc} numOctaves={2} seed={Math.floor(t * 12)} />
                </filter>
                <rect width="100%" height="100%" filter={`url(#n${i})`} />
              </svg>
            );
          case "stars":
            return (
              <svg key={i} width={env.width} height={env.height} style={base}>
                {Array.from({ length: 70 }, (_, k) => (
                  <circle key={k} cx={rand(5, k) * env.width} cy={rand(6, k) * env.height} r={1 + rand(7, k) * 2.2} fill={c[0]} opacity={0.3 + 0.7 * Math.abs(Math.sin(t * (0.6 + rand(8, k)) + k))} />
                ))}
              </svg>
            );
          case "pattern": {
            // 8-point star (khatam) tiling
            const s = 120 * sc;
            const star = shapePoints("star", s * 0.8, s * 0.8, { points: 8 });
            return (
              <svg key={i} width={env.width} height={env.height} style={base}>
                <defs>
                  <pattern id={`p${i}`} width={s} height={s} patternUnits="userSpaceOnUse" patternTransform={`translate(${drift} ${drift * 0.5})`}>
                    <path d={toPath(star)} transform={`translate(${s * 0.1} ${s * 0.1})`} fill="none" stroke={c[0]} strokeWidth={1.6} />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill={`url(#p${i})`} />
              </svg>
            );
          }
        }
        return null;
      })}
    </>
  );
}

function CutOverlay({ spec, P, env, t }: { spec: MotionSpec; P: Palette; env: EvalEnv; t: number }) {
  return (
    <>
      {(spec.cuts ?? []).map((c, i) => {
        const at = sec(c.t, env);
        const d = t - at;
        if (d < -0.25 || d > 0.35) return null;
        const col = color(P, c.color, c.kind === "flash" ? P.white : P.primary);
        if (c.kind === "flash") return <AbsoluteFill key={i} style={{ background: col, opacity: d < 0 ? 0 : Math.max(0, 1 - d / 0.2) * 0.85 }} />;
        if (c.kind === "wipe") {
          const p = clamp01((d + 0.25) / 0.6);
          const horiz = c.dir !== "up" && c.dir !== "down";
          const sign = c.dir === "left" || c.dir === "up" ? -1 : 1;
          const pos = (p * 2 - 1) * 110 * sign;
          return <AbsoluteFill key={i} style={{ background: col, transform: horiz ? `translateX(${pos}%)` : `translateY(${pos}%)` }} />;
        }
        if (c.kind === "iris") {
          const p = clamp01((d + 0.25) / 0.6);
          const r = p < 0.5 ? (1 - p * 2) * 80 : (p - 0.5) * 2 * 80;
          return <AbsoluteFill key={i} style={{ background: col, clipPath: `circle(${80 - r}% at 50% 50%)`, opacity: 1 }} />;
        }
        if (c.kind === "glitch" && d >= 0 && d < 0.2) {
          return (
            <AbsoluteFill key={i}>
              {[0, 1, 2, 3].map((k) => (
                <div key={k} style={{ position: "absolute", insetInline: 0, top: `${rand(i * 9 + Math.floor(d * 60), k) * 100}%`, height: "6%", background: k % 2 ? rgba(P.accent, 0.6) : rgba(P.primary, 0.6) }} />
              ))}
            </AbsoluteFill>
          );
        }
        return null;
      })}
    </>
  );
}

/** stage transform from cuts that move the whole picture (whip, zoom punch) */
function cutStage(spec: MotionSpec, env: EvalEnv, t: number) {
  let dx = 0;
  let scale = 1;
  let blur = 0;
  for (const c of spec.cuts ?? []) {
    const d = t - sec(c.t, env);
    if (c.kind === "whip" && Math.abs(d) < 0.2) {
      const k = 1 - Math.abs(d) / 0.2;
      dx += (c.dir === "left" ? -1 : 1) * k * k * env.width * 0.35 * Math.sign(d || 1);
      blur = Math.max(blur, k * 24);
    }
    if (c.kind === "zoom" && d >= 0 && d < 0.35) scale *= 1 + (1 - d / 0.35) * 0.14;
  }
  return { dx, scale, blur };
}

export const SpecVideo: React.FC<SpecVideoProps> = ({ spec, input, audio, custom }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const P = useMemo(() => ({ ...buildTokens(input.brand.colors), white: "#FFFFFF", black: "#0A0A0A" }) as Palette, [input.brand.colors]);
  const { ready, stacks } = useBrandFonts(input.fontFamilies, [], input.lang);
  const full: MotionInput = { ...input, palette: P, fonts: stacks };
  const lines = useMemo(() => new Map<string, string>(input.script.beats.flatMap((b) => b.lines.map((l, i): [string, string] => [`${b.id}:${i}`, l]))), [input.script.beats]);
  const env: EvalEnv = useMemo(
    () => ({
      width: input.width,
      height: input.height,
      fps: input.fps,
      bpm: input.energy.bpm,
      duration: input.durationInFrames / input.fps,
      hits: input.energy.hits,
      lineText: (ref) => lines.get(ref) ?? null,
      arabic: (s) => ARABIC.test(s),
      shots: new Map(input.script.beats.map((b) => [b.id, { start: b.start_s, end: b.end_s }])),
    }),
    [input, lines],
  );
  const customs = useMemo(() => {
    const m = new Map<string, React.ComponentType<never>>();
    for (const [id, code] of Object.entries(custom ?? {})) {
      try {
        m.set(id, loadCustom(code) as React.ComponentType<never>);
      } catch {
        /* a broken custom element is skipped, never fatal */
      }
    }
    return m;
  }, [custom]);

  const resolved = resolveAt(spec, env, t, { compose: false });
  const byParent = new Map<string | undefined, Resolved[]>();
  for (const r of resolved) {
    const k = r.el.parent;
    byParent.set(k, [...(byParent.get(k) ?? []), r]);
  }
  const cam = cameraAt(spec, env, t);
  const stage = cutStage(spec, env, t);
  const musicVolume = (f: number) => (audio.voiceover ? 0.3 : 1) * interpolate(f, [0, 3, durationInFrames - fps, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const renderEl = (r: Resolved, parent?: Resolved): React.ReactNode => {
    const el = r.el;
    if (!r.visible) return null;
    const left = r.cx - r.w / 2 - (parent ? parent.baseCx - parent.w / 2 : 0);
    const top = r.cy - r.h / 2 - (parent ? parent.baseCy - parent.h / 2 : 0);
    // parallax: depth ≠ 1 moves relative to the camera
    const d = parent ? 1 : r.depth;
    const par = d !== 1 ? `translate(${(-(cam.x / 100) * env.width) * (d - 1)}px, ${(-(cam.y / 100) * env.height) * (d - 1)}px) scale(${(1 + (cam.zoom - 1) * d) / cam.zoom})` : "";
    const children = byParent.get(el.id) ?? [];
    const glowCol = el.type === "shape" && el.glow ? color(P, el.glow) : P.glowA;
    const style: React.CSSProperties = {
      position: "absolute",
      left,
      top,
      width: r.w,
      height: r.h,
      transform: `${par} ${tf(r.state, el.type === "route" ? 0 : r.rot, r.scale)}`.trim(),
      transformOrigin: "50% 50%",
      opacity: r.opacity,
      filter: filterOf(r.state, glowCol),
      clipPath: r.state.clip,
      zIndex: el.z ?? 0,
    };
    let body: React.ReactNode = null;
    if (el.type === "text" || el.type === "counter") body = <TextBody el={el} r={r} P={P} fonts={stacks} env={env} />;
    else if (el.type === "shape") body = <ShapeBody el={el} r={r} P={P} t={t} />;
    else if (el.type === "particles") body = <ParticlesBody el={el} r={r} P={P} t={t} />;
    else if (el.type === "route") body = <RouteBody el={el} r={r} P={P} env={env} />;
    else if (el.type === "svgPath") {
      const draw = r.state.draw;
      body = (
        <svg width={r.w} height={r.h} viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <path d={el.d} fill={el.fill ? color(P, el.fill) : "none"} stroke={color(P, el.stroke)} strokeWidth={el.strokeW} vectorEffect="non-scaling-stroke" strokeLinecap={el.cap ?? "round"} strokeLinejoin="round" {...(draw !== undefined ? { pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - draw } : {})} />
        </svg>
      );
    } else if (el.type === "image") {
      const media =
        el.src === "logo" ? (
          <BrandLogo width={r.w} plate="auto" />
        ) : input.brand.imageUrls.length ? (
          <Img src={input.brand.imageUrls[Number(el.src.split(":")[1]) % input.brand.imageUrls.length]} style={{ width: "100%", height: "100%", objectFit: el.fit, borderRadius: ((el.radius ?? 0) / 100) * Math.min(r.w, r.h) }} />
        ) : null;
      body = el.frame ? <DeviceFrame kind={el.frame} width={r.w} screenColor={P.surface}>{media}</DeviceFrame> : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{media}</div>;
    } else if (el.type === "group") {
      const clip = el.clip ? { overflow: "hidden" as const, borderRadius: el.clip === "circle" ? "50%" : el.clip === "pill" ? 9999 : ((el.radius ?? 0) / 100) * Math.min(r.w, r.h) } : {};
      body = (
        <div style={{ position: "absolute", inset: 0, background: el.fill ? color(P, el.fill) : undefined, borderRadius: ((el.radius ?? 0) / 100) * Math.min(r.w, r.h), border: el.stroke ? `2px solid ${color(P, el.stroke)}` : undefined, boxShadow: el.shadow ? `0 ${r.h * 0.04}px ${r.h * 0.12}px rgba(0,0,0,0.35)` : undefined, ...clip }}>
          {children.sort((a, b) => (a.el.z ?? 0) - (b.el.z ?? 0)).map((c) => renderEl(c, r))}
        </div>
      );
    } else if (el.type === "custom") {
      const C = customs.get(el.id) as React.ComponentType<{ t: number; frame: number; width: number; height: number; palette: BrandTokens; fonts: MotionInput["fonts"] }> | undefined;
      body = C ? <C t={t - sec(el.in, env)} frame={frame} width={r.w} height={r.h} palette={P} fonts={stacks} /> : null;
    }
    return (
      <div key={el.id} style={style}>
        {(r.state.overlays ?? []).filter((o) => o.kind === "highlight").map((o, i) => <OverlayLayer key={`h${i}`} o={o} w={r.w} h={r.h} P={P} base={P.text} />)}
        {body}
        {(r.state.overlays ?? []).filter((o) => o.kind !== "highlight").map((o, i) => <OverlayLayer key={i} o={o} w={r.w} h={r.h} P={P} base={el.type === "text" ? color(P, el.color) : P.primary} />)}
      </div>
    );
  };

  const roots = (byParent.get(undefined) ?? []).sort((a, b) => (a.el.z ?? 0) - (b.el.z ?? 0));
  return (
    <AbsoluteFill style={{ backgroundColor: P.bg, direction: "ltr", overflow: "hidden" }}>
      {audio.music ? <Html5Audio src={audio.music} volume={musicVolume} /> : null}
      {audio.sfx ? <Html5Audio src={audio.sfx} volume={0.9} /> : null}
      {audio.voiceover ? <Html5Audio src={audio.voiceover} /> : null}
      <Background spec={spec} P={P} env={env} t={t} />
      {ready ? (
        <MotionProvider value={full}>
          <AbsoluteFill
            style={{
              transform: `translate(${stage.dx - (cam.x / 100) * env.width}px, ${-(cam.y / 100) * env.height}px) scale(${cam.zoom * stage.scale}) rotate(${cam.rot}deg)`,
              transformOrigin: "50% 50%",
              filter: stage.blur > 0.5 ? `blur(${stage.blur}px)` : undefined,
            }}
          >
            {roots.map((r) => renderEl(r))}
          </AbsoluteFill>
        </MotionProvider>
      ) : null}
      <CutOverlay spec={spec} P={P} env={env} t={t} />
    </AbsoluteFill>
  );
};

/** sound events implied by the timeline (entrances → pop/whoosh, cuts → whoosh, hits → impact) */
export { deriveEvents } from "../lib/motion/events";
export { elementText };

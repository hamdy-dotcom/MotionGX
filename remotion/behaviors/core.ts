// Pure motion math shared by the renderer (SpecVideo) and the validator (Node). No React, no DOM.
// Easings and springs come from Motion (motion.dev, MIT) sampled as pure functions of time — never animate().
import { anticipate, backIn, backInOut, circIn, circInOut, circOut, spring as motionSpring } from "motion";

export type Overlay =
  | { kind: "burst"; p: number; count: number; spread: number; shape: "dot" | "square" | "spark" | "confetti"; seed: number }
  | { kind: "ripple"; p: number; rings: number }
  | { kind: "underline"; p: number; thickness: number }
  | { kind: "highlight"; p: number }
  | { kind: "dissolve"; p: number; count: number; seed: number }
  | { kind: "glitch"; amount: number; seed: number }
  | { kind: "shine"; p: number }
  /** accent bar riding the edge of a wipe (editorial wipe) */
  | { kind: "wipebar"; p: number; dir: "left" | "right" | "up" | "down" }
  /** scanline at the reveal edge */
  | { kind: "scan"; p: number };

/** Per-letter/word motion (text). Arabic never splits by letter (it breaks joins); the renderer falls back to words. */
export type Units = { split: "letter" | "word"; fn: (i: number, n: number) => Partial<BState> & { tint?: number; glyph?: number } };

export type BState = {
  /** px offsets in canvas pixels */
  dx: number;
  dy: number;
  scale: number;
  sx: number;
  sy: number;
  rot: number;
  skewX: number;
  opacity: number;
  blur: number;
  brightness: number;
  hue: number;
  glow: number;
  clip?: string;
  /** stroke draw progress 0–1 (paths, routes, ring/line shapes, text outline) */
  draw?: number;
  /** 0–1 toward a shape's `to` */
  morph?: number;
  /** counter progress 0–1 */
  count?: number;
  /** tatweel characters inserted per word (Arabic emphasis) */
  kashida?: number;
  /** visible characters (typewriter), fraction 0–1 */
  typed?: number;
  /** follow a route / svgPath: progress 0–1 along element `route`; align = turn with the path */
  follow?: { route: string; p: number; align?: boolean };
  units?: Units;
  overlays?: Overlay[];
  // ── Phase 3D engine features ──
  /** 3D rotation (deg) around X / Y, rendered with perspective */
  rx?: number;
  ry?: number;
  /** transform-origin, e.g. "50% 100%" (Animista-style origins) */
  origin?: string;
  /** extra letter-spacing in em (tracking in/out) */
  track?: number;
  /** chromatic (RGB) split offset in px */
  rgb?: number;
  /** wave displacement 0–1 (SVG turbulence) */
  distort?: number;
  /** horizontal band slices shifting sideways */
  slices?: { n: number; amount: number; seed: number };
  /** echo trail: n ghost copies spaced `gap` seconds back */
  trail?: { n: number; gap: number };
  /** content scroll 0–1 (images: a long page scrolls inside its frame) */
  scroll?: number;
  /** liquid fill level 0–1 (shapes) */
  fill?: number;
  /** typewriter caret */
  caret?: boolean;
  /** text decode progress 0–1 (scramble → final text) */
  scramble?: number;
  /** 3D extrusion depth in px (stacked shadow layers) */
  extrude?: number;
  /** shared-element morph: move/resize toward another element's box */
  toward?: { id: string; p: number };
  /** svgPath: GSAP DrawSVG window [start, end] in 0–1 */
  segment?: [number, number];
};

export const IDENTITY: BState = { dx: 0, dy: 0, scale: 1, sx: 1, sy: 1, rot: 0, skewX: 0, opacity: 1, blur: 0, brightness: 1, hue: 0, glow: 0 };

export function combine(a: BState, b: Partial<BState>): BState {
  return {
    dx: a.dx + (b.dx ?? 0),
    dy: a.dy + (b.dy ?? 0),
    scale: a.scale * (b.scale ?? 1),
    sx: a.sx * (b.sx ?? 1),
    sy: a.sy * (b.sy ?? 1),
    rot: a.rot + (b.rot ?? 0),
    skewX: a.skewX + (b.skewX ?? 0),
    opacity: a.opacity * (b.opacity ?? 1),
    blur: a.blur + (b.blur ?? 0),
    brightness: a.brightness * (b.brightness ?? 1),
    hue: a.hue + (b.hue ?? 0),
    glow: Math.max(a.glow, b.glow ?? 0),
    clip: b.clip ?? a.clip,
    draw: b.draw ?? a.draw,
    morph: b.morph ?? a.morph,
    count: b.count ?? a.count,
    kashida: b.kashida ?? a.kashida,
    typed: b.typed ?? a.typed,
    follow: b.follow ?? a.follow,
    units: b.units ?? a.units,
    overlays: b.overlays ? [...(a.overlays ?? []), ...b.overlays] : a.overlays,
    rx: b.rx !== undefined || a.rx !== undefined ? (a.rx ?? 0) + (b.rx ?? 0) : undefined,
    ry: b.ry !== undefined || a.ry !== undefined ? (a.ry ?? 0) + (b.ry ?? 0) : undefined,
    origin: b.origin ?? a.origin,
    track: b.track !== undefined || a.track !== undefined ? (a.track ?? 0) + (b.track ?? 0) : undefined,
    rgb: b.rgb !== undefined || a.rgb !== undefined ? Math.max(a.rgb ?? 0, b.rgb ?? 0) : undefined,
    distort: b.distort !== undefined || a.distort !== undefined ? Math.max(a.distort ?? 0, b.distort ?? 0) : undefined,
    slices: b.slices ?? a.slices,
    trail: b.trail ?? a.trail,
    scroll: b.scroll ?? a.scroll,
    fill: b.fill ?? a.fill,
    caret: b.caret ?? a.caret,
    scramble: b.scramble ?? a.scramble,
    extrude: b.extrude !== undefined || a.extrude !== undefined ? Math.max(a.extrude ?? 0, b.extrude ?? 0) : undefined,
    toward: b.toward ?? a.toward,
    segment: b.segment ?? a.segment,
  };
}

// ── easing ──────────────────────────────────────────────────────────────────
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const EASE = {
  linear: (t: number) => t,
  in: (t: number) => t * t * t,
  out: (t: number) => 1 - (1 - t) ** 3,
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  expoOut: (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
  expoIn: (t: number) => (t <= 0 ? 0 : 2 ** (10 * t - 10)),
  backOut: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
  elastic: (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  bounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  snap: (t: number) => (t >= 1 ? 1 : 1 - (1 - t) ** 5),
  // Motion (motion.dev) easings
  anticipate: (t: number) => anticipate(clamp01(t)),
  backIn: (t: number) => backIn(clamp01(t)),
  backInOut: (t: number) => backInOut(clamp01(t)),
  circIn: (t: number) => circIn(clamp01(t)),
  circOut: (t: number) => circOut(clamp01(t)),
  circInOut: (t: number) => circInOut(clamp01(t)),
  /** a Motion spring (bounce 0.3) normalised to 0→1 over the behavior's duration */
  spring: (t: number) => springAt(clamp01(t) * 1, 0.55, 0.3),
};
export type EaseName = keyof typeof EASE;

/** Damped spring 0→1 (overshoots). `t` in seconds since start. */
export function spring(t: number, stiffness = 170, damping = 14) {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(stiffness);
  const zeta = damping / (2 * w0);
  if (zeta >= 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  const wd = w0 * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
}

/**
 * Motion's closed-form spring sampled at `t` seconds: `visualDuration` = time to (visually) arrive,
 * `bounce` 0–1. Same inputs → same value (generators are cached, `next(ms)` is a pure function of time).
 */
const springCache = new Map<string, ReturnType<typeof motionSpring>>();
export function springAt(t: number, visualDuration = 0.5, bounce = 0.25, from = 0, to = 1, velocity = 0) {
  if (t <= 0) return from;
  const key = `${visualDuration}|${bounce}|${from}|${to}|${velocity}`;
  let g = springCache.get(key);
  if (!g) {
    g = motionSpring({ keyframes: [from, to], visualDuration, bounce, velocity });
    if (springCache.size > 500) springCache.clear();
    springCache.set(key, g);
  }
  return g.next(t * 1000).value as number;
}

// ── deterministic randomness + noise ────────────────────────────────────────
export function hash(n: number) {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
export const rand = (seed: number, i: number) => hash(seed * 7919 + i * 104729);
/** smooth 1-D value noise in [-1, 1] */
export function noise1(seed: number, x: number) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(rand(seed, i) * 2 - 1, rand(seed, i + 1) * 2 - 1, u);
}
export const strSeed = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) % 100000;
};

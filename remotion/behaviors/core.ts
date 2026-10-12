// Pure motion math shared by the renderer (SpecVideo) and the validator (Node). No React, no DOM.

export type Overlay =
  | { kind: "burst"; p: number; count: number; spread: number; shape: "dot" | "square" | "spark" | "confetti"; seed: number }
  | { kind: "ripple"; p: number; rings: number }
  | { kind: "underline"; p: number; thickness: number }
  | { kind: "highlight"; p: number }
  | { kind: "dissolve"; p: number; count: number; seed: number }
  | { kind: "glitch"; amount: number; seed: number }
  | { kind: "shine"; p: number };

/** Per-letter/word motion (text). Arabic never splits by letter (it breaks joins); the renderer falls back to words. */
export type Units = { split: "letter" | "word"; fn: (i: number, n: number) => Partial<BState> };

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
  /** follow a route: progress 0–1 along route `route` */
  follow?: { route: string; p: number };
  units?: Units;
  overlays?: Overlay[];
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

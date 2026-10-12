// Path maths for morph / draw / follow / split — MIT-only, pure functions of progress (same input → same
// output, in the renderer and in the Node validator). Replaces the GSAP helpers removed in Phase 3E.
//   morph  → flubber (MIT) shape interpolation, interpolators cached per (from, to)
//   draw   → native SVG: pathLength=1 + dash array/offset for a [start, end] window
//   follow → svg-path-properties (MIT): getPointAtLength + tangent angle
//   split  → our word-safe splitter (renderer) + Motion stagger/easings for per-unit timing
import { interpolate as flubber } from "flubber";
import { svgPathProperties } from "svg-path-properties";
import { anticipate, backOut, circOut, easeInOut, easeOut, stagger as motionStagger } from "motion";
import { clamp01, hash } from "./core";

const morphCache = new Map<string, (t: number) => string>();
/** any closed path → any closed path; the in-between path string at p (0–1) */
export function morphPath(from: string, to: string, p: number): string {
  if (p <= 0) return from;
  if (p >= 1) return to;
  const key = `${from}→${to}`;
  let f = morphCache.get(key);
  if (!f) {
    try {
      f = flubber(from, to, { maxSegmentLength: 2 });
    } catch {
      f = (t: number) => (t < 0.5 ? from : to);
    }
    if (morphCache.size > 200) morphCache.clear();
    morphCache.set(key, f);
  }
  return f(p).replace(/-?\d+\.\d{3,}/g, (n) => Number(n).toFixed(2));
}

const propsCache = new Map<string, InstanceType<typeof svgPathProperties>>();
function props(d: string) {
  let p = propsCache.get(d);
  if (!p) {
    p = new svgPathProperties(d);
    if (propsCache.size > 300) propsCache.clear();
    propsCache.set(d, p);
  }
  return p;
}

/**
 * The visible [start, end] stretch of a path as a sampled polyline (draw-from-start/centre/end).
 * Geometry, not dashes: dashes are measured in screen space under non-scaling strokes.
 */
export function drawSegment(d: string, start: number, end: number, samples = 96): string {
  const a = clamp01(start);
  const b = Math.max(a, clamp01(end));
  if (b - a >= 0.999) return d;
  if (b - a < 1e-4) return "M0,0";
  const pr = props(d);
  const total = pr.getTotalLength();
  const n = Math.max(2, Math.ceil(samples * (b - a)));
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const q = pr.getPointAtLength(total * (a + ((b - a) * i) / n));
    pts.push(`${q.x.toFixed(2)},${q.y.toFixed(2)}`);
  }
  return `M${pts.join("L")}`;
}

/** point + tangent angle (deg) at progress p along a path (path units) */
export function pathPoint(d: string, p: number): { x: number; y: number; angle: number } {
  const pr = props(d);
  const len = pr.getTotalLength() * clamp01(p);
  const pt = pr.getPointAtLength(len);
  const tg = pr.getTangentAtLength(len);
  return { x: pt.x, y: pt.y, angle: (Math.atan2(tg.y, tg.x) * 180) / Math.PI };
}

export const SPLIT_EASES = { out: easeOut, inOut: easeInOut, backOut, circOut, anticipate } as const;
export type SplitEase = keyof typeof SPLIT_EASES;
export type StaggerFrom = "start" | "center" | "end" | "edges" | "random";

/** per-unit progress of a staggered split (letters/words), sampled at `local` seconds */
export function splitProgress(n: number, local: number, o: { dur: number; each: number; ease: SplitEase; from: StaggerFrom; seed?: number }): number[] {
  const mid = (n - 1) / 2;
  const order = o.from === "random" ? Array.from({ length: n }, (_, i) => i).sort((a, b) => hash((o.seed ?? 1) * 31 + a) - hash((o.seed ?? 1) * 31 + b)) : null;
  return Array.from({ length: n }, (_, i) => {
    const slot = o.from === "edges" ? mid - Math.abs(i - mid) : order ? order.indexOf(i) : motionStagger(1, { from: o.from === "start" ? "first" : o.from === "end" ? "last" : "center" })(i, n);
    const p = clamp01((local - slot * o.each) / o.dur);
    return (SPLIT_EASES[o.ease] ?? backOut)(p); // old specs may carry GSAP ease strings
  });
}

// GSAP, driven by Remotion's frame: every helper is a pure function of progress/time, so the same frame
// always gives the same pixels (verified by scripts/motion/gsap-determinism.ts). We never let GSAP's ticker
// run — timelines are created paused and seeked to the exact time; path maths use GSAP's static helpers.
//   MorphSVG  → MorphSVGPlugin.normalizeStrings (matched point structures) + numeric interpolation
//   DrawSVG   → sliceRawPath (the visible [start, end] window of a path)
//   MotionPath→ getPositionOnPath (position + angle at progress)
//   SplitText-style stagger → a paused timeline over plain objects, seeked to local time
// GSAP license: see docs/licenses.md (GSAP "No Charge" Standard License, Webflow).
import { gsap } from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { hash } from "./core";

gsap.registerPlugin(MorphSVGPlugin, MotionPathPlugin);

type RawPath = ReturnType<typeof MotionPathPlugin.stringToRawPath>;

const rawCache = new Map<string, RawPath>();
function raw(d: string): RawPath {
  let r = rawCache.get(d);
  if (!r) {
    r = MotionPathPlugin.stringToRawPath(d);
    MotionPathPlugin.cacheRawPathMeasurements(r);
    if (rawCache.size > 300) rawCache.clear();
    rawCache.set(d, r);
  }
  return r;
}

const NUM = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
const morphCache = new Map<string, { a: number[]; b: number[]; tpl: string[] }>();
/** MorphSVG: any path → any path. Returns the in-between path string at p (0–1). */
export function morphPath(from: string, to: string, p: number): string {
  if (p <= 0) return from;
  if (p >= 1) return to;
  const key = `${from}→${to}`;
  let m = morphCache.get(key);
  if (!m) {
    const [na, nb] = MorphSVGPlugin.normalizeStrings(from, to, { shapeIndex: "auto", map: "complexity" }) as [string, string];
    const a = (na.match(NUM) ?? []).map(Number);
    const b = (nb.match(NUM) ?? []).map(Number);
    m = { a, b, tpl: na.split(NUM) };
    if (morphCache.size > 200) morphCache.clear();
    morphCache.set(key, m);
  }
  if (m.a.length !== m.b.length) return p < 0.5 ? from : to;
  let out = m.tpl[0];
  for (let i = 0; i < m.a.length; i++) out += (m.a[i] + (m.b[i] - m.a[i]) * p).toFixed(2) + m.tpl[i + 1];
  return out;
}

/** DrawSVG: the visible part of a path between start and end (0–1). */
export function drawSegment(d: string, start: number, end: number): string {
  if (end - start >= 0.999) return d;
  if (end <= start) return "M0,0";
  const sliced = MotionPathPlugin.sliceRawPath(raw(d), Math.max(0, start), Math.min(1, end));
  return MotionPathPlugin.rawPathToString(sliced);
}

/** MotionPath: point + tangent angle (deg) at progress p along a path (path units). */
export function pathPoint(d: string, p: number): { x: number; y: number; angle: number } {
  const r = MotionPathPlugin.getPositionOnPath(raw(d), Math.min(1, Math.max(0, p)), true) as { x: number; y: number; angle: number };
  return { x: r.x, y: r.y, angle: r.angle ?? 0 };
}

const tlCache = new Map<string, { tl: gsap.core.Timeline; objs: { p: number }[] }>();
/**
 * Per-unit progress of a staggered GSAP tween (SplitText-style: letters/words), sampled at `local` seconds.
 * `from`: start | center | end | edges | random (GSAP's stagger distribution, deterministic seed).
 */
export function gsapStagger(n: number, local: number, o: { dur: number; each: number; ease: string; from: "start" | "center" | "end" | "edges" | "random"; seed?: number }): number[] {
  // GSAP's own "random" distribution uses Math.random — not frame-deterministic — so random order is a
  // seeded permutation of a "start" stagger instead.
  if (o.from === "random") {
    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => hash((o.seed ?? 1) * 31 + a) - hash((o.seed ?? 1) * 31 + b));
    const base = gsapStagger(n, local, { ...o, from: "start" });
    const out = new Array<number>(n);
    order.forEach((unit, rank) => (out[unit] = base[rank]));
    return out;
  }
  const key = `${n}|${o.dur}|${o.each}|${o.ease}|${o.from}`;
  let c = tlCache.get(key);
  if (!c) {
    const objs = Array.from({ length: n }, () => ({ p: 0 }));
    const tl = gsap.timeline({ paused: true });
    tl.to(objs, { p: 1, duration: o.dur, ease: o.ease, stagger: { each: o.each, from: o.from } });
    if (tlCache.size > 300) tlCache.clear();
    c = { tl, objs };
    tlCache.set(key, c);
  }
  c.tl.seek(Math.max(0, local), true);
  return c.objs.map((x) => x.p);
}

export const GSAP_EASES = ["power2.out", "power3.out", "power4.out", "expo.out", "back.out(1.7)", "elastic.out(1,0.4)", "circ.out", "sine.inOut", "steps(6)"] as const;

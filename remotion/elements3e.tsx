// Phase 3E element bodies: vector text (HarfBuzz glyph paths shaped in Node), icons, emoji, characters
// (Open Doodles / Open Peeps), Arab-world maps (Natural Earth), flags, charts (d3), Rough.js sketch
// shapes and organic backgrounds (simplex-noise + d3-shape). All pure functions of time.
import React from "react";
import { interpolate as flubber } from "flubber";
import rough from "roughjs/bin/rough";
import { arc as d3arc, area as d3area, curveCatmullRom, line as d3line, pie as d3pie } from "d3-shape";
import { scaleBand, scaleLinear } from "d3-scale";
import { createNoise2D } from "simplex-noise";
import { Effigy } from "@opeepsfun/open-peeps";
import { clamp01, hash, rand } from "./behaviors";
import type { Glyph, GlyphRun } from "./vector-types";

// ── vector text ──────────────────────────────────────────────────────────────
const contours = (glyphs: Glyph[]) =>
  glyphs
    .flatMap((g) => g.d.split(/(?=M)/).map((c) => ({ d: c.trim(), x: g.x })))
    .filter((c) => c.d.length > 6 && /Z\s*$/i.test(c.d.trim()));

const morphCache = new Map<string, ((t: number) => string)[]>();
function lineMorph(a: GlyphRun, b: GlyphRun, key: string) {
  let fns = morphCache.get(key);
  if (!fns) {
    // pair contours in reading order (right→left for Arabic); the shorter list repeats so every contour has a partner
    const order = (r: GlyphRun) => contours(r.glyphs).sort((p, q) => (r.rtl ? q.x - p.x : p.x - q.x));
    const ca = order(a);
    const cb = order(b);
    const n = Math.max(ca.length, cb.length);
    fns = Array.from({ length: n }, (_, i) => {
      const from = ca[Math.floor((i * ca.length) / n)]?.d;
      const to = cb[Math.floor((i * cb.length) / n)]?.d;
      try {
        return flubber(from, to, { maxSegmentLength: 6 });
      } catch {
        return (t: number) => (t < 0.5 ? from : to);
      }
    });
    if (morphCache.size > 50) morphCache.clear();
    morphCache.set(key, fns);
  }
  return fns;
}

export type VectorState = { textDraw?: number; textParticles?: { p: number; mode: "in" | "out" }; kstretch?: number; textMorph?: { to: string; p: number } };

export const VectorText: React.FC<{ run: GlyphRun; morphTo?: GlyphRun | null; morphKey?: string; s: VectorState; color: string; sizePx: number; seed: number }> = ({ run, morphTo, morphKey, s, color, sizePx, seed }) => {
  const W = run.w;
  const H = run.h;
  const sw = Math.max(1.2, sizePx * 0.022);
  let content: React.ReactNode;
  // the stretched kashida line is wider than the plain one
  let totalW = W;
  if (s.textMorph && morphTo && s.textMorph.p > 0) {
    const fns = lineMorph(run, morphTo, morphKey ?? "");
    const p = clamp01(s.textMorph.p);
    // the two lines may differ in width: interpolate the centring offset too
    const dx = ((W - morphTo.w) / 2) * p;
    content = <g transform={`translate(${dx} 0)`}>{fns.map((f, i) => <path key={i} d={p >= 1 ? f(1) : f(p)} fill={color} />)}</g>;
  } else if (s.kstretch !== undefined && s.kstretch > 0.001 && run.kashida) {
    // continuous kashida: each shaped tatweel scales horizontally from its right edge; glyphs to its left
    // shift left by the extra width. At scale 0 the tatweel collapses and the word is the plain word.
    const k = s.kstretch;
    const gs = [...run.kashida].sort((a, b) => b.x - a.x);
    let shift = 0;
    const parts: React.ReactNode[] = [];
    for (const [i, g] of gs.entries()) {
      if (g.tatweel) {
        const right = g.x + g.adv;
        parts.push(<path key={i} d={g.d} fill={color} transform={`translate(${-shift} 0) translate(${right} 0) scale(${k} 1) translate(${-right} 0)`} />);
        shift += g.adv * (k - 1);
      } else parts.push(<path key={i} d={g.d} fill={color} transform={shift ? `translate(${-shift} 0)` : undefined} />);
    }
    const restW = run.kashida.reduce((m, g) => Math.max(m, g.x + g.adv), 0);
    // glyphs left of each tatweel moved left by `shift`: shift everything back so the line spans [0, restW + shift]
    totalW = Math.max(1, restW + shift);
    content = <g transform={`translate(${shift} 0)`}>{parts}</g>;
  } else if (s.textParticles && run.points?.length) {
    const { p, mode } = s.textParticles;
    const pts = run.points;
    const r = Math.max(1.4, sizePx * 0.016);
    const span = Math.max(W, H) * 1.6;
    const fill = mode === "in" ? clamp01((p - 0.78) / 0.22) : 1 - clamp01(p / 0.3);
    content = (
      <>
        {fill > 0 ? <g opacity={fill}>{run.glyphs.map((g, i) => <path key={i} d={g.d} fill={color} />)}</g> : null}
        {pts.map(([x, y], i) => {
          // reading-order stagger: Arabic gathers/dissolves from the right
          const order = run.rtl ? 1 - x / W : x / W;
          const local = mode === "in" ? clamp01((p * 1.35 - order * 0.35)) : clamp01(p * 1.35 - order * 0.35);
          const e = mode === "in" ? 1 - (1 - local) ** 3 : local ** 2;
          const a = rand(seed, i) * Math.PI * 2;
          const d = span * (0.3 + rand(seed + 1, i) * 0.7);
          const sx = x + Math.cos(a) * d;
          const sy = y + Math.sin(a) * d - (mode === "out" ? span * 0.4 * e : 0);
          const k = mode === "in" ? e : 1 - e;
          const px = sx + (x - sx) * k;
          const py = sy + (y - sy) * k;
          const op = mode === "in" ? clamp01(local * 3) * (1 - fill) : (1 - e) * clamp01(p * 6);
          return op > 0.02 ? <circle key={i} cx={px} cy={py} r={r} fill={color} opacity={op} /> : null;
        })}
      </>
    );
  } else if (s.textDraw !== undefined) {
    // calligraphy reveal: glyph outlines draw one after another in reading order, then each fills
    const gs = [...run.glyphs].sort((a, b) => (run.rtl ? b.x - a.x : a.x - b.x));
    const n = gs.length;
    content = gs.map((g, i) => {
      const gp = clamp01((s.textDraw! * 1.15 * (n + 2) - i) / 3);
      const fill = clamp01((gp - 0.65) / 0.35);
      return (
        <g key={i}>
          {gp > 0 && fill < 1 ? <path d={g.d} fill="none" stroke={color} strokeWidth={sw} strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - gp} /> : null}
          {fill > 0 ? <path d={g.d} fill={color} opacity={fill} /> : null}
        </g>
      );
    });
  } else content = run.glyphs.map((g, i) => <path key={i} d={g.d} fill={color} />);
  return (
    <svg width={totalW} height={H} viewBox={`0 0 ${totalW} ${H}`} style={{ overflow: "visible", display: "block" }}>
      {content}
    </svg>
  );
};

// ── inline SVG assets (icons, emoji, doodles, flags) ─────────────────────────
/** an inlined SVG file scaled to the box; currentColor = `color` */
export const InlineSvg: React.FC<{ svg: string; w: number; h: number; color?: string; accent?: string; strokeWidth?: number; fit?: "contain" | "cover"; radius?: number }> = ({ svg, w, h, color, accent, strokeWidth, fit = "contain", radius }) => {
  let s = svg.replace(/<svg\b([^>]*)>/, (_m, attrs: string) => `<svg${attrs.replace(/\s(width|height)="[^"]*"/g, "")} width="100%" height="100%" preserveAspectRatio="${fit === "cover" ? "xMidYMid slice" : "xMidYMid meet"}">`);
  if (strokeWidth !== undefined) s = s.replace(/stroke-width="[^"]*"/, `stroke-width="${strokeWidth}"`);
  return <div style={{ position: "absolute", inset: 0, width: w, height: h, color, overflow: radius ? "hidden" : undefined, borderRadius: radius, ["--doodle-accent" as string]: accent }} dangerouslySetInnerHTML={{ __html: s }} />;
};

export const PeepBody: React.FC<{ peep: { body: string; head: string; face: string }; w: number; h: number; color: string; accent: string; skin?: string }> = ({ peep, w, h, color, accent }) => {
  const opts = { outlineColor: color, accentColor: accent, hairColor: color, hijabColor: accent, clothingColor: accent };
  return (
    <div style={{ position: "absolute", inset: 0, width: w, height: h, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <Effigy style={{ width: "100%", height: "100%" }} body={{ type: peep.body, options: opts }} head={{ type: peep.head, options: opts }} face={{ type: peep.face, options: { outlineColor: color } }} />
    </div>
  );
};

// ── maps (Natural Earth country shapes, region frame) ────────────────────────
export const MapBody: React.FC<{ countries: { iso: string; d: string; c: [number, number] }[]; highlight: Set<string>; route: [number, number][]; w: number; h: number; fill: string; highlightFill: string; stroke: string; draw?: number; routeColor: string }> = ({ countries, highlight, route, w, h, fill, highlightFill, stroke, draw, routeColor }) => {
  // fit the union of the countries' region-frame boxes into the element box
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const c of countries) {
    for (const m of c.d.matchAll(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g)) {
      const x = Number(m[1]);
      const y = Number(m[2]);
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  const bw = Math.max(1, x1 - x0);
  const bh = Math.max(1, y1 - y0);
  const k = Math.min(w / bw, h / bh) * 0.94;
  const ox = (w - bw * k) / 2 - x0 * k;
  const oy = (h - bh * k) / 2 - y0 * k;
  const pts = route.map(([x, y]) => [ox + x * k, oy + y * k]);
  const routeD = pts.length > 1 ? (d3line().curve(curveCatmullRom.alpha(0.5))(pts as [number, number][]) ?? "") : "";
  return (
    <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <g transform={`translate(${ox} ${oy}) scale(${k})`}>
        {countries.map((c) => (
          <path key={c.iso} d={c.d} fill={highlight.has(c.iso) ? highlightFill : fill} stroke={stroke} strokeWidth={0.6 / k} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      {routeD ? <path d={routeD} fill="none" stroke={routeColor} strokeWidth={Math.max(3, w * 0.008)} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - (draw ?? 1)} /> : null}
      {pts.map(([x, y], i) => (draw ?? 1) >= i / Math.max(1, pts.length - 1) - 0.001 ? <circle key={i} cx={x} cy={y} r={Math.max(5, w * 0.014)} fill={routeColor} /> : null)}
    </svg>
  );
};

// ── charts (d3-scale / d3-shape), drawn by the element's draw / count progress ─
export const ChartBody: React.FC<{ kind: "bar" | "line" | "area" | "donut"; values: number[]; colors: string[]; w: number; h: number; p: number; track: string }> = ({ kind, values, colors, w, h, p, track }) => {
  const max = Math.max(...values, 1);
  if (kind === "donut") {
    const arcs = d3pie<number>().sort(null)(values);
    const r = Math.min(w, h) / 2;
    const mk = d3arc<{ startAngle: number; endAngle: number }>().innerRadius(r * 0.62).outerRadius(r).cornerRadius(r * 0.04).padAngle(0.02);
    const end = p * Math.PI * 2;
    return (
      <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(${w / 2} ${h / 2})`}>
          <path d={mk({ startAngle: 0, endAngle: Math.PI * 2 }) ?? ""} fill={track} opacity={0.35} />
          {arcs.map((a, i) => (a.startAngle < end ? <path key={i} d={mk({ startAngle: a.startAngle, endAngle: Math.min(a.endAngle, end) }) ?? ""} fill={colors[i % colors.length]} /> : null))}
        </g>
      </svg>
    );
  }
  const x = scaleBand<number>().domain(values.map((_, i) => i)).range([0, w]).padding(0.28);
  const y = scaleLinear().domain([0, max]).range([h, h * 0.04]);
  if (kind === "bar") {
    return (
      <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
        {values.map((v, i) => {
          const local = clamp01(p * 1.4 - (i / values.length) * 0.4);
          const top = h - (h - y(v)) * (1 - (1 - local) ** 3);
          return <rect key={i} x={x(i)} y={top} width={x.bandwidth()} height={h - top} rx={x.bandwidth() * 0.18} fill={colors[i % colors.length]} />;
        })}
      </svg>
    );
  }
  const pts = values.map((v, i) => [(x(i) ?? 0) + x.bandwidth() / 2, y(v)] as [number, number]);
  const lineD = d3line().curve(curveCatmullRom.alpha(0.5))(pts) ?? "";
  const areaD = d3area().curve(curveCatmullRom.alpha(0.5)).y0(h)(pts) ?? "";
  return (
    <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <defs>
        <clipPath id={`chart-clip-${Math.round(w)}-${Math.round(h)}`}>
          <rect x={0} y={-h} width={w * p} height={h * 3} />
        </clipPath>
      </defs>
      {kind === "area" ? <path d={areaD} fill={colors[0]} opacity={0.3} clipPath={`url(#chart-clip-${Math.round(w)}-${Math.round(h)})`} /> : null}
      <path d={lineD} fill="none" stroke={colors[0]} strokeWidth={Math.max(3, w * 0.012)} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
    </svg>
  );
};

// ── Rough.js sketch shapes (deterministic seed per element) ──────────────────
const gen = rough.generator();
export function sketchPaths(d: string, fill: string | null, stroke: string, strokeWidth: number, seed: number) {
  const drawable = gen.path(d, { seed: (seed % 2147483646) + 1, roughness: 1.4, bowing: 1.2, stroke, strokeWidth, fill: fill ?? undefined, fillStyle: "hachure", hachureGap: Math.max(4, strokeWidth * 3.2), fillWeight: Math.max(1, strokeWidth * 0.6) });
  return gen.toPaths(drawable);
}

// ── organic backgrounds: dunes / waves (simplex noise, sampled at t) ─────────
const noises = new Map<number, ReturnType<typeof createNoise2D>>();
const noiseFor = (seed: number) => {
  let n = noises.get(seed);
  if (!n) {
    let s = seed;
    n = createNoise2D(() => (s = hash(s * 9301 + 49297)));
    noises.set(seed, n);
  }
  return n;
};
export function organicBands(kind: "dunes" | "waves", w: number, h: number, t: number, colors: string[], drift: number, seed = 7) {
  const noise = noiseFor(seed);
  const bands = kind === "dunes" ? 4 : 5;
  return Array.from({ length: bands }, (_, b) => {
    const base = h * (kind === "dunes" ? 0.48 + b * 0.13 : 0.36 + b * 0.14);
    const amp = h * (kind === "dunes" ? 0.07 : 0.035);
    const pts: [number, number][] = Array.from({ length: 41 }, (_, i) => {
      const x = (i / 40) * w;
      const y = base + noise(i * (kind === "dunes" ? 0.09 : 0.16) + b * 3.1, t * 0.08 * (drift || 1) + b) * amp + (kind === "waves" ? Math.sin(i * 0.45 + t * 1.2 * (drift || 1) + b) * amp * 0.6 : 0);
      return [x, y];
    });
    const d = d3area().curve(curveCatmullRom.alpha(0.5)).y0(h)(pts) ?? "";
    return { d, color: colors[b % colors.length], opacity: 0.35 + (b / bands) * 0.5 };
  });
}

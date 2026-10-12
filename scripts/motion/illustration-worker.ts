// Isolated check worker for generated illustrations (own process locally; Vercel Sandbox in production).
// For each component: static check → esbuild → render to SVG markup at progress 0 / 0.5 / 1 (React SSR,
// no browser) → rasterize (resvg) → deterministic checks: not empty, inside its 200 × 200 box, colour
// roles only, one stroke width, every part visibly moves. Optionally writes PNG stills.
//
// Usage: tsx --tsconfig tsconfig.scripts.json scripts/motion/illustration-worker.ts <job.json> <result.json>
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { transform } from "esbuild";
import { Resvg } from "@resvg/resvg-js";
import { svgPathProperties } from "svg-path-properties";
import { illustrationStaticCheck } from "../../lib/motion/illustration-check";
import { COLOR_ROLES } from "../../lib/motion/spec";

export type IllustrationJob = {
  items: { key: string; tsx: string; parts: string[]; sw: number; stills?: { dir: string; palette: Record<string, string>; size?: number } }[];
};
export type IllustrationCheck = { key: string; ok: boolean; js: string | null; problems: string[]; stats?: { fill: number; bbox: [number, number, number, number] }; stills?: string[] };
export type IllustrationResult = { ok: true; results: IllustrationCheck[] } | { ok: false; errors: string[] };

type Comp = React.ComponentType<{ p: Record<string, number>; c: Record<string, string>; sw: number; uid: string }>;

const BOX = 200;
const PAD = 40;
const SIDE = BOX + 2 * PAD;
/** a distinct, recognisable hex per role: any other colour in the markup came from somewhere else */
const SENTINEL: Record<string, string> = Object.fromEntries(COLOR_ROLES.map((r, i) => [r, `#${(0x10 + i * 9).toString(16).padStart(2, "0")}${(0xf0 - i * 11).toString(16).padStart(2, "0")}${(0x30 + i * 13).toString(16).padStart(2, "0")}`]));
const SENTINEL_SW = 3.17;

function load(js: string): Comp {
  const mod = { exports: {} as Record<string, unknown> };
  const allowed: Record<string, unknown> = { react: React, "react/jsx-runtime": jsxRuntime };
  const req = (name: string) => {
    if (name in allowed) return allowed[name];
    throw new Error(`import not allowed: ${name}`);
  };
  new Function("require", "module", "exports", js)(req, mod, mod.exports);
  const C = mod.exports.default;
  if (typeof C !== "function") throw new Error("no default-exported component");
  return C as Comp;
}

export function markup(C: Comp, p: Record<string, number>, c: Record<string, string>, sw: number, opts: { pad?: number; size?: number; bg?: string; mirror?: boolean } = {}) {
  const pad = opts.pad ?? PAD;
  const side = BOX + 2 * pad;
  const size = opts.size ?? side;
  const inner = renderToStaticMarkup(React.createElement(C, { p, c, sw, uid: "i0" }));
  const bg = opts.bg ? `<rect x="${-pad}" y="${-pad}" width="${side}" height="${side}" fill="${opts.bg}"/>` : "";
  const body = opts.mirror ? `<g transform="translate(${BOX} 0) scale(-1 1)">${inner}</g>` : inner;
  return { inner, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${-pad} ${-pad} ${side} ${side}">${bg}${body}</svg>` };
}

/**
 * resvg ignores `pathLength`, so a draw-on animation (pathLength=1 + dasharray/dashoffset) would look
 * static here while Chrome renders it fine: rescale dash values to the real length first.
 */
function normalizePathLength(svg: string) {
  return svg.replace(/<(path|line|circle|polyline|polygon)\b([^>]*?)pathLength="([\d.]+)"([^>]*)>/g, (all, tag: string, a: string, pl: string, b: string) => {
    const attrs = a + b;
    const num = (k: string) => Number(attrs.match(new RegExp(`\\b${k}="([-\\d.]+)"`))?.[1] ?? 0);
    let real = 0;
    try {
      if (tag === "path") real = new svgPathProperties(attrs.match(/\bd="([^"]+)"/)?.[1] ?? "").getTotalLength();
      else if (tag === "line") real = Math.hypot(num("x2") - num("x1"), num("y2") - num("y1"));
      else if (tag === "circle") real = 2 * Math.PI * num("r");
      else {
        const pts = (attrs.match(/\bpoints="([^"]+)"/)?.[1] ?? "").trim().split(/[\s,]+/).map(Number);
        for (let i = 2; i + 1 < pts.length; i += 2) real += Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]);
      }
    } catch {
      return all;
    }
    const k = real / Number(pl);
    if (!Number.isFinite(k) || k <= 0) return all;
    const scale = (v: string) => v.split(/[\s,]+/).map((x) => String(Number(x) * k)).join(" ");
    const fixed = (a + b).replace(/stroke-dasharray="([^"]+)"/, (_, v: string) => `stroke-dasharray="${scale(v)}"`).replace(/stroke-dashoffset="([^"]+)"/, (_, v: string) => `stroke-dashoffset="${scale(v)}"`);
    return `<${tag}${fixed}>`;
  });
}

function raster(svgIn: string) {
  const svg = normalizePathLength(svgIn);
  const img = new Resvg(svg, { fitTo: { mode: "original" }, font: { loadSystemFonts: false } }).render();
  return { px: img.pixels, w: img.width, h: img.height, png: () => img.asPng() };
}

/** drawn-pixel stats: count inside the box, count outside (beyond a small tolerance), bbox in box coords */
function coverage(px: Uint8Array | Buffer, w: number) {
  let inside = 0;
  let outside = 0;
  let x0 = SIDE, y0 = SIDE, x1 = -1, y1 = -1;
  const tol = 4;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 24) continue;
    const k = i / 4;
    const x = k % w;
    const y = Math.floor(k / w);
    if (x >= PAD - tol && x < PAD + BOX + tol && y >= PAD - tol && y < PAD + BOX + tol) inside++;
    else outside++;
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return { inside, outside, bbox: [x0 - PAD, y0 - PAD, x1 - PAD, y1 - PAD] as [number, number, number, number] };
}

function diff(a: Uint8Array | Buffer, b: Uint8Array | Buffer) {
  let n = 0;
  for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) + Math.abs(a[i + 3] - b[i + 3]) > 60) n++;
  return n;
}

const ALLOWED_PAINT = new Set(["none", "transparent", "currentcolor", "inherit", ...Object.values(SENTINEL).map((x) => x.toLowerCase())]);

/** colour + stroke-width audit of the rendered markup */
function audit(inner: string) {
  const problems: string[] = [];
  const paints = [...inner.matchAll(/\b(fill|stroke|stop-color|flood-color|lighting-color|color)="([^"]*)"/g), ...[...inner.matchAll(/style="([^"]*)"/g)].flatMap((m) => [...m[1].matchAll(/(fill|stroke|stop-color|flood-color|color):\s*([^;]+)/g)])];
  const bad = new Set<string>();
  for (const m of paints) {
    const v = m[2].trim().toLowerCase();
    if (!ALLOWED_PAINT.has(v) && !v.startsWith("url(#")) bad.add(`${m[1]}=${m[2]}`);
  }
  if (bad.size) problems.push(`colours not from the palette roles: ${[...bad].slice(0, 6).join(", ")} — use c.<role> only`);
  const widths = new Set([...inner.matchAll(/stroke-width="([^"]*)"/g)].map((m) => Number(m[1])).filter((n) => Number.isFinite(n) && n > 0));
  const other = [...widths].filter((n) => Math.abs(n - SENTINEL_SW) > 0.01);
  if (other.length) problems.push(`stroke widths ${other.slice(0, 5).join(", ")} found — every outline uses strokeWidth={sw}`);
  if (/<text|<image|<foreignObject/i.test(inner)) problems.push("no text or images inside the drawing");
  return problems;
}

async function check(item: IllustrationJob["items"][number]): Promise<IllustrationCheck> {
  const problems = illustrationStaticCheck(item.tsx);
  if (problems.length) return { key: item.key, ok: false, js: null, problems };
  let js: string;
  try {
    js = (await transform(item.tsx, { loader: "tsx", format: "cjs", jsx: "automatic", target: "es2020", sourcefile: "illustration.tsx" })).code;
  } catch (err) {
    return { key: item.key, ok: false, js: null, problems: [`compile: ${err instanceof Error ? err.message.slice(0, 400) : err}`] };
  }
  let C: Comp;
  try {
    C = load(js);
  } catch (err) {
    return { key: item.key, ok: false, js, problems: [`load: ${err instanceof Error ? err.message : err}`] };
  }
  const all = (v: number) => Object.fromEntries(item.parts.map((n) => [n, v]));
  const shots: Record<string, ReturnType<typeof raster>> = {};
  let half = "";
  try {
    for (const v of [0, 0.5, 1]) {
      const m = markup(C, all(v), SENTINEL, SENTINEL_SW);
      if (v === 0.5) half = m.inner;
      shots[v] = raster(m.svg);
    }
  } catch (err) {
    return { key: item.key, ok: false, js, problems: [`render: ${err instanceof Error ? err.message.slice(0, 300) : err}`] };
  }
  problems.push(...audit(half));
  const cov = coverage(shots[0.5].px, shots[0.5].w);
  const area = BOX * BOX;
  if (cov.inside < area * 0.025) problems.push(`nearly empty at progress 0.5 (${((cov.inside / area) * 100).toFixed(1)}% of the box drawn) — draw the object big, filling most of the 200×200 box`);
  for (const v of [0, 0.5, 1]) {
    const c = coverage(shots[v].px, shots[v].w);
    if (c.outside > 40) problems.push(`at progress ${v} the drawing leaves its 0–200 box (bbox ${c.bbox.map((n) => Math.round(n)).join(",")}) — keep every part inside 0..200 at every progress`);
    if (v !== 0.5 && c.inside < area * 0.008) problems.push(`nearly empty at progress ${v} — the object must be visible at every progress (parts change state, the object never vanishes)`);
  }
  // every part must visibly change the drawing
  for (const part of item.parts) {
    const base = all(0.5);
    const a = raster(markup(C, { ...base, [part]: 0 }, SENTINEL, SENTINEL_SW).svg);
    const b = raster(markup(C, { ...base, [part]: 1 }, SENTINEL, SENTINEL_SW).svg);
    const d = diff(a.px, b.px);
    if (d < area * 0.004) problems.push(`part "${part}" barely changes the drawing (${d} px) — p.${part} 0→1 must visibly move/grow/open something`);
  }
  let stills: string[] | undefined;
  if (item.stills) {
    mkdirSync(item.stills.dir, { recursive: true });
    stills = [0, 0.5, 1].map((v) => {
      const file = path.join(item.stills!.dir, `${item.key}-${v}.png`);
      const m = markup(C, all(v), item.stills!.palette, item.sw, { pad: 12, size: item.stills!.size ?? 360, bg: item.stills!.palette.bg });
      writeFileSync(file, raster(m.svg).png());
      return file;
    });
  }
  return { key: item.key, ok: problems.length === 0, js, problems: [...new Set(problems)], stats: { fill: Number((cov.inside / area).toFixed(3)), bbox: cov.bbox }, stills };
}

if (process.argv[2] && process.argv[3]) {
  (async () => {
    const job = JSON.parse(readFileSync(process.argv[2], "utf8")) as IllustrationJob;
    const results: IllustrationCheck[] = [];
    for (const item of job.items) results.push(await check(item));
    writeFileSync(process.argv[3], JSON.stringify({ ok: true, results } satisfies IllustrationResult));
  })().catch((err) => {
    writeFileSync(process.argv[3], JSON.stringify({ ok: false, errors: [err instanceof Error ? err.message : String(err)] } satisfies IllustrationResult));
    process.exit(1);
  });
}

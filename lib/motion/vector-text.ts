// Vector text: lines shaped with HarfBuzz (harfbuzzjs, MIT) into glyph outlines, in Node, so the renderer
// (browser) gets ready-made SVG paths — no WASM in the video bundle. Font metrics via opentype.js (MIT).
// Arabic is shaped as a whole line (correct joins, ligatures, RTL); units never split inside a word.
//   • glyph paths in px (y down), positioned on the line, tagged with their word index
//   • one tatweel (U+0640) shaped into each long Arabic word — the renderer stretches that glyph alone,
//     continuously, so kashida elongation never breaks a join (scale 0 = the plain word)
//   • points sampled evenly along the outlines (text ↔ particles)
import type * as HB from "harfbuzzjs";
import * as opentype from "opentype.js";
import { svgPathProperties } from "svg-path-properties";
import { fontBytes } from "./fonts-node";

import { runKey, type Glyph, type GlyphRun } from "@/remotion/vector-types";

export { runKey, type Glyph, type GlyphRun };

const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿ]/;
const NON_JOINING = new Set("اأإآدذرزوؤةىءـ".split(""));


type Loaded = { hb: typeof HB; font: HB.Font; upem: number; asc: number; desc: number };
// harfbuzzjs is ESM with top-level await (WASM init): load it with a native dynamic import
let hbMod: Promise<typeof HB> | null = null;
const harfbuzz = () => (hbMod ??= import("harfbuzzjs"));
const fonts = new Map<string, Promise<Loaded | null>>();
function loadHb(family: string, weight: number): Promise<Loaded | null> {
  const k = `${family}:${weight}`;
  let p = fonts.get(k);
  if (!p) {
    p = (async () => {
      const bytes = await fontBytes(family, weight);
      if (!bytes) return null;
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const ot = opentype.parse(ab);
      const hb = await harfbuzz();
      const face = new hb.Face(new hb.Blob(ab));
      return { hb, font: new hb.Font(face), upem: ot.unitsPerEm, asc: ot.ascender, desc: ot.descender };
    })().catch(() => null);
    fonts.set(k, p);
  }
  return p;
}

/** transform a glyph path (font units, y up) to px on the line */
function place(d: string, ox: number, oy: number, s: number) {
  let i = 0;
  return d.replace(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi, (n) => {
    const v = Number(n);
    return ((i++ % 2 === 0 ? ox + v * s : oy - v * s)).toFixed(2);
  });
}

/** insert one tatweel at the join nearest the middle of each Arabic word with ≥ 3 letters */
function withTatweel(text: string): { text: string; inserted: Set<number> } {
  const inserted = new Set<number>();
  let out = "";
  for (const part of text.split(/(\s+)/)) {
    const chars = [...part];
    let best = -1;
    if (chars.length >= 3 && ARABIC.test(part)) {
      for (let i = 0; i < chars.length - 1; i++) {
        if (ARABIC.test(chars[i]) && ARABIC.test(chars[i + 1]) && !NON_JOINING.has(chars[i]) && (best < 0 || Math.abs(i - chars.length / 2) < Math.abs(best - chars.length / 2))) best = i;
      }
    }
    if (best >= 0) {
      const head = chars.slice(0, best + 1).join("");
      out += head;
      inserted.add(out.length);
      out += "ـ" + chars.slice(best + 1).join("");
    } else out += part;
  }
  return { text: out, inserted };
}

function shapeLine(L: Loaded, text: string, sizePx: number, tatweelAt?: Set<number>): { glyphs: Glyph[]; w: number; rtl: boolean; baseline: number; h: number; words: number } {
  const s = sizePx / L.upem;
  const { hb } = L;
  const buf = new hb.Buffer();
  buf.addText(text);
  buf.guessSegmentProperties();
  hb.shape(L.font, buf);
  const infos = buf.getGlyphInfos();
  const pos = buf.getGlyphPositions();
  const rtl = ARABIC.test(text);
  // word index per UTF-16 offset (logical order)
  const wordAt: number[] = [];
  let w = -1;
  let inSpace = true;
  for (let i = 0; i < text.length; i++) {
    const sp = /\s/.test(text[i]);
    if (!sp && inSpace) w++;
    inSpace = sp;
    wordAt[i] = Math.max(0, w);
  }
  const h = sizePx * (rtl ? 1.45 : 1.15);
  const baseline = (h - (L.asc - L.desc) * s) / 2 + L.asc * s;
  let pen = 0;
  const glyphs: Glyph[] = [];
  infos.forEach((g, i) => {
    const p = pos[i];
    const d = L.font.glyphToPath(g.codepoint);
    const adv = p.xAdvance * s;
    if (d) glyphs.push({ d: place(d, pen + p.xOffset * s, baseline - p.yOffset * s, s), x: pen, adv, word: wordAt[g.cluster] ?? 0, ...(tatweelAt?.has(g.cluster) ? { tatweel: true } : {}) });
    pen += adv;
  });
  return { glyphs, w: pen, rtl, baseline, h, words: w + 1 };
}

function samplePoints(glyphs: Glyph[], n: number): [number, number][] {
  const contours = glyphs.flatMap((g) => g.d.split(/(?=M)/).filter((c) => c.length > 4));
  const props = contours.map((c) => {
    try {
      return new svgPathProperties(c);
    } catch {
      return null;
    }
  });
  const lens = props.map((p) => p?.getTotalLength() ?? 0);
  const total = lens.reduce((a, b) => a + b, 0) || 1;
  const pts: [number, number][] = [];
  props.forEach((p, i) => {
    if (!p) return;
    const k = Math.max(1, Math.round((lens[i] / total) * n));
    for (let j = 0; j < k; j++) {
      const q = p.getPointAtLength((lens[i] * j) / k);
      pts.push([Number(q.x.toFixed(1)), Number(q.y.toFixed(1))]);
    }
  });
  return pts;
}

/** Shapes one line. `kashida` adds the stretchable-tatweel variant; `points` samples n outline points. */
export async function shapeText(family: string, weight: number, sizePx: number, text: string, opts: { kashida?: boolean; points?: number } = {}): Promise<GlyphRun | null> {
  const L = await loadHb(family, weight);
  if (!L || !text.trim()) return null;
  const base = shapeLine(L, text, sizePx);
  const run: GlyphRun = { w: base.w, h: base.h, rtl: base.rtl, glyphs: base.glyphs, words: base.words };
  if (opts.kashida && base.rtl) {
    const t = withTatweel(text);
    const k = shapeLine(L, t.text, sizePx, t.inserted);
    // the tatweel version is wider by the tatweel advances; at scale 0 those collapse back to the plain line
    run.kashida = k.glyphs;
  }
  if (opts.points) run.points = samplePoints(base.glyphs, opts.points);
  return run;
}

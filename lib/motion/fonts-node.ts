// Real font metrics in Node for the validator: brand fonts fetched from Google Fonts (TTF), cached on
// disk, measured with fontkit (OpenType shaping incl. Arabic joining).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import * as fontkit from "fontkit";

const CACHE = path.join(/* turbopackIgnore: true */ os.tmpdir(), "mgx-fonts");
const loaded = new Map<string, fontkit.Font | null>();

const key = (family: string, weight: number) => `${family.replace(/\s+/g, "_")}-${weight}`;

async function fetchTtf(family: string, weight: number): Promise<Buffer | null> {
  const css = await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@${weight}`, { headers: { "User-Agent": "curl/8" } });
  if (!css.ok) return null;
  const urls = [...(await css.text()).matchAll(/url\((https:[^)]+\.ttf)\)/g)].map((m) => m[1]);
  // a family with several subsets: the last block is usually latin, the first arabic — fetch all, merge by trying each
  if (!urls.length) return null;
  const res = await fetch(urls[0]);
  return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
}

/** Raw TTF bytes (cached on disk), nearest available weight — for HarfBuzz shaping. */
export async function fontBytes(family: string, weight: number): Promise<Buffer | null> {
  mkdirSync(CACHE, { recursive: true });
  const file = path.join(CACHE, `${key(family, weight)}.ttf`);
  if (existsSync(file)) return readFileSync(file);
  await loadFont(family, weight);
  return existsSync(file) ? readFileSync(file) : null;
}

/** Loads (and caches) a font; nearest available weight (700 → 600/800/400 …). */
export async function loadFont(family: string, weight: number): Promise<fontkit.Font | null> {
  const k = key(family, weight);
  if (loaded.has(k)) return loaded.get(k)!;
  mkdirSync(CACHE, { recursive: true });
  const file = path.join(CACHE, `${k}.ttf`);
  let buf: Buffer | null = existsSync(file) ? readFileSync(file) : null;
  if (!buf) {
    for (const w of [weight, ...[100, 200, 300, 400, 500, 600, 700, 800, 900].sort((a, b) => Math.abs(a - weight) - Math.abs(b - weight))]) {
      buf = await fetchTtf(family, w).catch(() => null);
      if (buf) break;
    }
    if (buf) writeFileSync(file, buf);
  }
  let font: fontkit.Font | null = null;
  try {
    font = buf ? (fontkit.create(buf) as fontkit.Font) : null;
  } catch {
    font = null;
  }
  loaded.set(k, font);
  return font;
}

/** Width/height of one line at `sizePx` (shaped). null when the font can't render some glyph. */
export function measureLine(font: fontkit.Font, text: string, sizePx: number): { w: number; h: number; missing: number } {
  const run = font.layout(text);
  const scale = sizePx / font.unitsPerEm;
  const w = run.positions.reduce((s, p) => s + p.xAdvance, 0) * scale;
  const missing = run.glyphs.filter((g) => g.id === 0 && !/\s/.test(String.fromCodePoint(...(g.codePoints ?? [32])))).length;
  return { w, h: sizePx * (/[؀-ۿ]/.test(text) ? 1.45 : 1.15), missing };
}

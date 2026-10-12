// Node-side preparation of what a spec needs at render time, inlined into RuntimeInput so the renderer
// (browser preview, export worker) stays pure: HarfBuzz-shaped glyph runs for vector-text behaviors and
// the icons / emoji / doodles / flags / country shapes / textures the spec uses. Only what's used ships.
import { existsSync, readFileSync } from "node:fs";
import type { RuntimeInput } from "@/remotion/runtime-input";
import { runKey, VECTOR_FX, vectorFamily, type GlyphRun } from "@/remotion/vector-types";
import { projectPath } from "./paths";
import type { MotionSpec, SpecElement } from "./spec";
import { shapeText } from "./vector-text";

const read = (...p: string[]) => {
  const f = projectPath(...p);
  return existsSync(f) ? readFileSync(f, "utf8") : null;
};
const stripComments = (svg: string) => svg.replace(/<!--[\s\S]*?-->/g, "").replace(/<\?xml[^>]*\?>/, "").replace(/<title>[\s\S]*?<\/title>|<desc>[\s\S]*?<\/desc>/g, "").trim();

let geo: { countries: Record<string, { region_d: string; centroid: [number, number]; name_ar: string; name_en: string }> } | null = null;

/** phosphor weight from the video's icon stroke (lucide px at 24) */
export const phosphorWeight = (stroke = 2) => (stroke <= 1.25 ? "thin" : stroke <= 1.75 ? "light" : stroke <= 2.25 ? "regular" : "bold");

export function assetSvg(key: string, iconStroke?: number): string | null {
  const [kind, a, b] = key.split(":");
  if (kind === "icon" && a === "lucide") return read("node_modules", "lucide-static", "icons", `${b}.svg`)?.replace(/<!--[\s\S]*?-->/g, "").trim() ?? null;
  if (kind === "icon" && a === "phosphor") {
    const w = phosphorWeight(iconStroke);
    return read("node_modules", "@phosphor-icons", "core", "assets", w, w === "regular" ? `${b}.svg` : `${b}-${w}.svg`);
  }
  if (kind === "emoji") return read("data", "assets", "emoji", `${a}.svg`);
  if (kind === "doodle") {
    const svg = read("data", "assets", "doodles", `${a}.svg`);
    // line art takes the element colour; the doodle's pink accent takes the brand accent
    return svg ? stripComments(svg).replace(/#000000/gi, "currentColor").replace(/#FF5678/gi, "var(--doodle-accent)") : null;
  }
  if (kind === "flag") return read("node_modules", "flag-icons", "flags", "4x3", `${a}.svg`);
  if (kind === "texture") {
    const f = projectPath("data", "assets", "textures", `${a}.jpg`);
    return existsSync(f) ? `data:image/jpeg;base64,${readFileSync(f).toString("base64")}` : null;
  }
  if (kind === "geo") {
    geo ??= JSON.parse(read("data", "assets", "geo", "arab-countries.json") ?? '{"countries":{}}');
    const c = geo!.countries[a];
    return c ? JSON.stringify({ d: c.region_d, c: c.centroid }) : null;
  }
  return null;
}

/** asset keys an element needs */
export function assetKeys(el: SpecElement): string[] {
  if (el.type === "icon") return [`icon:${el.set}:${el.name}`];
  if (el.type === "emoji") return [`emoji:${el.name}`];
  if (el.type === "character" && el.doodle) return [`doodle:${el.doodle}`];
  if (el.type === "flag") return [`flag:${el.code}`];
  if (el.type === "map") return [...new Set([...el.countries, ...(el.route ?? [])])].map((c) => `geo:${c}`);
  return [];
}

export async function prepareAssets(spec: MotionSpec, input: RuntimeInput): Promise<Pick<RuntimeInput, "glyphs" | "assets">> {
  const lines = new Map<string, string>(input.script.beats.flatMap((b) => b.lines.map((l, i): [string, string] => [`${b.id}:${i}`, l])));
  const textOf = (el: Extract<SpecElement, { type: "text" }>) => (el.line ? lines.get(el.line) ?? el.text ?? "" : el.text ?? "");
  const glyphs: Record<string, GlyphRun> = {};
  const jobs: Promise<void>[] = [];
  const want = (family: string, weight: number, px: number, text: string, opts: { kashida?: boolean; points?: number }) => {
    const k = runKey(family, weight, px, text);
    if (glyphs[k] || !text.trim()) return;
    jobs.push(
      shapeText(family, weight, px, text, opts).then((r) => {
        if (r) glyphs[k] = r;
      }),
    );
  };
  for (const el of spec.elements) {
    if (el.type !== "text") continue;
    const fx = (el.fx ?? []).map((f) => f.fx);
    if (!fx.some((f) => (VECTOR_FX as readonly string[]).includes(f))) continue;
    const family = vectorFamily(el.font, input.fontFamilies, input.lang);
    const px = (el.size / 100) * input.width;
    want(family, el.weight, px, textOf(el), { kashida: fx.includes("kashida-stretch"), points: fx.some((f) => f.includes("particles")) ? 700 : 0 });
    for (const f of el.fx ?? []) {
      if (f.fx !== "text-morph" || typeof f.to !== "string") continue;
      const to = /^[\w-]+:\d+$/.test(f.to) ? lines.get(f.to) ?? f.to : f.to;
      want(family, el.weight, px, to, {});
    }
  }
  await Promise.all(jobs);
  const assets: Record<string, string> = {};
  const keys = new Set(spec.elements.flatMap(assetKeys));
  for (const b of spec.canvas.bg) if (b.kind === "texture" && b.texture) keys.add(`texture:${b.texture}`);
  for (const k of keys) {
    const v = assetSvg(k, spec.iconStroke);
    if (v) assets[k] = v;
  }
  return { glyphs, assets };
}

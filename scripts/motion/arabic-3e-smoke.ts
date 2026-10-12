// Phase 3E Arabic showcase (no AI): every new behavior / element in Arabic → validate → stills → a labelled
// contact sheet (out/3e/arabic-sheet.jpg).
//   npx tsx --tsconfig tsconfig.scripts.json scripts/motion/arabic-3e-smoke.ts
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { EnergyMap, ScriptBeat } from "@motiongx/primitives";
import { prepareAssets } from "../../lib/motion/assets";
import type { MotionSpecInput } from "../../lib/motion/spec";
import { validateSpec } from "../../lib/motion/validate";
import type { RuntimeInput } from "../../remotion/runtime-input";
import type { SpecVideoProps } from "../../remotion/SpecVideo";

const { draft } = JSON.parse(readFileSync(path.resolve("out/five/slllr/draft.json"), "utf8"));
const beat = (id: string, a: number, b: number, lines: string[]) => ({ id, role: "feature", start_s: a, end_s: b, lines, voiceover_line: "" }) as unknown as ScriptBeat;
const beats = [beat("s1", 0, 4, ["ابدأ تجارتك اليوم"]), beat("s2", 4, 8, ["بدون مخزون", "شحن لكل الخليج"]), beat("s3", 8, 12, ["أرباحك تكبر"]), beat("s4", 12, 16, ["سلر معك", "سجّل الحين"])];
const energy = { bpm: 120, length_s: 16, sections: [{ kind: "build", start_s: 0, end_s: 16 }], hits: [{ t: 2, kind: "impact" }, { t: 6, kind: "drop" }, { t: 12.5, kind: "logo" }, { t: 14.5, kind: "cta" }] } as unknown as EnergyMap;

const SPEC: MotionSpecInput = {
  version: 1,
  iconStroke: 1.75,
  canvas: { bg: [{ kind: "gradient", colors: ["bg", "bg2"], angle: 160 }, { kind: "texture", texture: "clay_plaster", colors: ["text"], alpha: 0.5 }, { kind: "dunes", colors: ["surface", "primary", "bg2"], alpha: 0.6, drift: 1, in: "s3", out: "s3e" }] },
  camera: { keys: [{ t: 0, zoom: 1.04 }, { t: 4, zoom: 1 }] },
  elements: [
    // s1 — calligraphy reveal (display font) + kashida on the hit + sketch circle
    { id: "h1", type: "text", line: "s1:0", x: 50, y: 30, size: 12, weight: 700, font: "display", color: "text", in: 0, out: "s1e", fx: [{ fx: "text-stroke-draw", at: 0.1, dur: 1.8 }, { fx: "kashida-stretch", at: 2.0, dur: 1.2, max: 5 }, { fx: "text-to-particles", at: 3.0, dur: 0.95 }] },
    { id: "ring", type: "shape", shape: "circle", sketch: true, stroke: "accent", strokeW: 0.6, x: 50, y: 30, w: 86, h: 30, in: 0.4, out: "s1e", fx: [{ fx: "stroke-draw", at: 1.6, dur: 0.8 }, { fx: "fade-out" }] },
    { id: "peep", type: "character", peep: { body: "Coffee", head: "Hijab", face: "Smile" }, color: "black", accent: "primary", x: 30, y: 66, w: 40, h: 48, in: 0.2, out: "s1e", fx: [{ fx: "rise" }, { fx: "float" }] },
    { id: "doodle", type: "character", doodle: "running", color: "black", accent: "accent", x: 72, y: 70, w: 44, h: 33, in: 0.5, out: "s1e", fx: [{ fx: "slide", from: "right" }, { fx: "float" }] },
    // s2 — particles gather into text, icons, emoji, flags, a map with a route
    { id: "h2", type: "text", line: "s2:0", x: 50, y: 16, size: 10, weight: 800, color: "text", in: "s2", out: "s2e", fx: [{ fx: "particles-to-text", at: 4.05, dur: 1.4 }, { fx: "fade-out" }] },
    { id: "h2b", type: "text", line: "s2:1", x: 50, y: 24, size: 6, weight: 600, color: "textMuted", in: 4.6, out: "s2e", fx: [{ fx: "per-word" }, { fx: "fade-out" }] },
    { id: "map", type: "map", countries: ["SAU", "ARE", "QAT", "KWT", "BHR", "OMN", "YEM", "IRQ", "JOR", "EGY"], highlight: ["SAU", "ARE", "QAT", "KWT", "BHR", "OMN"], route: ["EGY", "SAU", "ARE"], x: 50, y: 52, w: 92, h: 60, in: "s2", out: "s2e", fx: [{ fx: "stroke-draw", at: 5.0, dur: 1.8 }, { fx: "fade-out" }] },
    { id: "f1", type: "flag", code: "sa", x: 22, y: 82, w: 12, h: 9, in: 5.2, out: "s2e", fx: [{ fx: "pop" }] },
    { id: "f2", type: "flag", code: "ae", x: 38, y: 82, w: 12, h: 9, in: 5.4, out: "s2e", fx: [{ fx: "pop" }] },
    { id: "ic1", type: "icon", name: "truck", color: "primary", x: 62, y: 82, w: 10, in: 5.6, out: "s2e", fx: [{ fx: "pop" }] },
    { id: "ic2", type: "icon", set: "phosphor", name: "package", color: "accent", x: 78, y: 82, w: 10, in: 5.8, out: "s2e", fx: [{ fx: "pop" }] },
    { id: "em", type: "emoji", name: "rocket", x: 84, y: 14, w: 12, in: 6.0, out: "s2e", fx: [{ fx: "spring-pop" }, { fx: "wobble" }] },
    // s3 — charts on dunes
    { id: "h3", type: "text", line: "s3:0", x: 50, y: 14, size: 10, weight: 800, color: "text", in: "s3", out: "s3e", fx: [{ fx: "text-stroke-draw", dur: 1.4 }, { fx: "fade-out" }] },
    { id: "bars", type: "chart", kind: "bar", values: [2, 3, 5, 8, 13], colors: ["primary", "accent"], x: 30, y: 40, w: 44, h: 26, in: 8.3, out: "s3e", fx: [{ fx: "count-up", dur: 1.4 }, { fx: "fade-out" }] },
    { id: "donut", type: "chart", kind: "donut", values: [5, 3, 2], colors: ["primary", "accent", "textMuted"], x: 74, y: 40, w: 30, h: 30, in: 8.5, out: "s3e", fx: [{ fx: "count-up", dur: 1.4 }, { fx: "fade-out" }] },
    { id: "line", type: "chart", kind: "area", values: [1, 2, 2, 4, 5, 8], colors: ["accent"], x: 50, y: 64, w: 80, h: 18, in: 8.7, out: "s3e", fx: [{ fx: "count-up", dur: 1.6 }, { fx: "fade-out" }] },
    { id: "under", type: "shape", shape: "line", sketch: true, stroke: "accent", strokeW: 0.8, x: 50, y: 20, w: 50, h: 2, in: 9.6, out: "s3e", fx: [{ fx: "stroke-draw", dur: 0.6 }] },
    // s4 — word → word morph, then CTA
    { id: "h4", type: "text", line: "s4:0", x: 50, y: 36, size: 13, weight: 800, color: "primary", in: "s4", fx: [{ fx: "text-morph", to: "s4:1", at: 13.2, dur: 1.2 }] },
    { id: "logo", type: "image", src: "logo", x: 50, y: 62, w: 30, in: 12.5, fx: [{ fx: "pop" }, { fx: "float" }] },
  ],
};

(async () => {
  const input: RuntimeInput = { brand: { name: draft.name, url: "slllr.com", logoUrl: draft.logoUrl, logoPlate: true, imageUrls: [], colors: draft.colors }, fontFamilies: { arabic: draft.fonts.arabic, latin: draft.fonts.latin, display: "Lalezar" }, lang: "ar", dir: "rtl", width: 1080, height: 1920, fps: 30, durationInFrames: 480, energy, script: { title: "3E", beats } };
  const res = await validateSpec(SPEC, { width: 1080, height: 1920, fps: 30, duration: 16, energy, beats, colors: draft.colors, fonts: { ...draft.fonts, display: "Lalezar" }, lang: "ar", hasLogo: true });
  console.log(`validate: ${res.issues.length} issues`);
  for (const i of res.issues.slice(0, 12)) console.log(`  [${i.code}] ${i.id ?? "-"}: ${i.msg.slice(0, 140)}`);
  if (!res.spec) return;
  const t0 = Date.now();
  const prepared = await prepareAssets(res.spec, input);
  console.log(`assets: ${Object.keys(prepared.glyphs ?? {}).length} glyph runs, ${Object.keys(prepared.assets ?? {}).length} assets (${((JSON.stringify(prepared).length) / 1024).toFixed(0)} KB) in ${Date.now() - t0}ms`);
  const out = path.resolve("out/3e/arabic");
  mkdirSync(out, { recursive: true });
  const props: SpecVideoProps = { spec: res.spec, input: { ...input, ...prepared }, audio: { music: null, sfx: null, voiceover: null } };
  const shots: [number, string][] = [
    [0.5, "text-stroke-draw 15%"], [1.2, "text-stroke-draw 60%"], [1.9, "stroke done + sketch circle"], [2.45, "kashida-stretch (peak)"], [2.95, "kashida settles"], [3.35, "text-to-particles"],
    [4.4, "particles-to-text 25%"], [4.95, "particles-to-text 65%"], [6.3, "map route · flags · icons · emoji"], [7.2, "map complete"],
    [9.2, "charts (bar/donut/area) on dunes"], [10.5, "sketch underline"], [13.6, "text-morph 35%"], [14.6, "text-morph done + logo"], [2.45, "determinism repeat"],
  ];
  writeFileSync(path.join(out, "job.json"), JSON.stringify({ task: "stills", props, times: shots.map((s) => s[0]), outDir: out, scale: 0.5, format: "png" }));
  execFileSync("node_modules/.bin/tsx", ["--tsconfig", "tsconfig.scripts.json", "scripts/motion/spec-worker.ts", path.join(out, "job.json"), path.join(out, "result.json")], { stdio: "inherit" });
  const r = JSON.parse(readFileSync(path.join(out, "result.json"), "utf8")) as { ok: boolean; stills?: { t: number; path: string }[]; errors?: string[] };
  if (!r.ok || !r.stills) return console.log("stills failed", r.errors);
  writeFileSync(path.join(out, "labels.json"), JSON.stringify(r.stills.map((s, i) => ({ path: s.path, label: `t=${shots[i][0]}s · ${shots[i][1]}` }))));
  execFileSync(".venv/bin/python", ["-c", `
import json
from PIL import Image, ImageDraw
L=json.load(open("${out}/labels.json"))[:-1]
ims=[Image.open(x["path"]).convert("RGB") for x in L]
w,h=ims[0].size; tw,th=w*2//3,h*2//3; cols=7; rows=(len(ims)+cols-1)//cols
S=Image.new("RGB",(cols*tw,rows*(th+30)),"white"); d=ImageDraw.Draw(S)
for i,(im,x) in enumerate(zip(ims,L)):
    X=(i%cols)*tw; Y=(i//cols)*(th+30); S.paste(im.resize((tw,th)),(X,Y+30)); d.text((X+6,Y+8),x["label"],fill="black")
S.save("out/3e/arabic-sheet.jpg",quality=85)
`]);
  const { createHash } = await import("node:crypto");
  const h = (f: string) => createHash("sha256").update(readFileSync(f)).digest("hex").slice(0, 16);
  console.log(`determinism (t=2.45 twice, kashida mid-stretch): ${h(r.stills[3].path)} vs ${h(r.stills[14].path)}`);
  console.log("sheet → out/3e/arabic-sheet.jpg");
})();

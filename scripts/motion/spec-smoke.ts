// Engine smoke test (no AI): a hand-written MotionSpec for Slllr → validate → 6 stills.
//   npx tsx --tsconfig tsconfig.scripts.json scripts/motion/spec-smoke.ts
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { MotionSpecInput } from "../../lib/motion/spec";
import { validateSpec } from "../../lib/motion/validate";
import type { SpecVideoProps } from "../../remotion/SpecVideo";

const dir = path.resolve("out/five/slllr");
const { draft, ogImage } = JSON.parse(readFileSync(path.join(dir, "draft.json"), "utf8"));
const script = JSON.parse(readFileSync(path.join(dir, "script.json"), "utf8"));
const energy = JSON.parse(readFileSync(path.join(dir, "treatment.json"), "utf8")).energy;

export const SAMPLE_SPEC: MotionSpecInput = {
  version: 1,
  canvas: { bg: [{ kind: "solid", colors: ["bg"] }, { kind: "radial", colors: ["glowA"], alpha: 0.6, drift: 1 }, { kind: "dots", colors: ["border"], alpha: 0.35, drift: 0.4 }] },
  camera: { shake: 0.5, drift: 0.4, keys: [{ t: 0, zoom: 1.08 }, { t: 4.36, zoom: 1 }, { t: 18.55, zoom: 1.06 }, { t: 21.82, zoom: 1, ease: "expoOut" }] },
  cuts: [{ t: 4.36, kind: "flash" }, { t: 10.91, kind: "wipe", dir: "left", color: "primary" }, { t: 21.82, kind: "zoom" }, { t: 24, kind: "whip", dir: "right" }],
  elements: [
    // b1 — the two worries, stamped
    { id: "q1", type: "text", line: "b1:0", x: 50, y: 40, size: 16, weight: 800, color: "text", font: "head", align: "center", in: 0.2, out: 2.1, fx: [{ fx: "stamp", at: 0.2 }, { fx: "jitter", amp: 0.2 }, { fx: "fade-out" }] },
    { id: "q2", type: "text", line: "b1:1", x: 50, y: 56, size: 16, weight: 800, color: "accent", font: "head", align: "center", in: 0.9, out: 2.1, fx: [{ fx: "stamp", at: 0.9 }, { fx: "jitter", amp: 0.2 }, { fx: "fade-out" }] },
    // b2 — headline + route starts
    { id: "h2a", type: "text", line: "b2:0", x: 50, y: 30, size: 8.5, weight: 700, color: "text", font: "head", align: "center", in: 2.2, out: 4.3, fx: [{ fx: "per-word", at: 2.2 }, { fx: "blur-out" }] },
    { id: "h2b", type: "text", line: "b2:1", x: 50, y: 40, size: 11, weight: 800, color: "primary", font: "head", align: "center", in: 2.5, out: 4.3, fx: [{ fx: "mask-wipe", dir: "left", at: 2.5 }, { fx: "kashida-stretch", at: 3.2, max: 3 }, { fx: "blur-out" }] },
    { id: "h2c", type: "text", line: "b2:2", x: 50, y: 50, size: 11, weight: 800, color: "text", font: "head", align: "center", in: 2.9, out: 4.3, fx: [{ fx: "mask-wipe", dir: "left", at: 2.9 }, { fx: "blur-out" }] },
    // the route through Slllr's stations (drawn across the middle act)
    { id: "route", type: "route", x: 50, y: 50, z: -2, points: [[20, 64], [38, 70], [52, 62], [68, 72], [82, 66]], stroke: "primary", strokeW: 0.9, nodes: "accent", in: 4.36, out: 21.6, fx: [{ fx: "stroke-draw", at: 4.36, dur: 6.4 }, { fx: "fade-out" }] },
    { id: "parcel", type: "shape", shape: "rect", radius: 18, fill: "accent", x: 20, y: 64, w: 6, h: 6, z: 2, in: 4.36, out: 21.6, fx: [{ fx: "route-follow", route: "route", at: 4.36, dur: 6.4 }, { fx: "hit-pulse", amount: 0.25 }, { fx: "fade-out" }] },
    // b3
    { id: "h3a", type: "text", line: "b3:0", x: 50, y: 24, size: 10, weight: 800, color: "text", font: "head", align: "center", in: 4.4, out: 7.5, fx: [{ fx: "rise", at: 4.4 }, { fx: "rise-out" }] },
    { id: "h3b", type: "text", line: "b3:1", x: 50, y: 33, size: 6, weight: 500, color: "textMuted", font: "body", align: "center", in: 4.8, out: 7.5, fx: [{ fx: "per-word", at: 4.8 }, { fx: "rise-out" }] },
    { id: "star", type: "shape", shape: "star", points: 5, fill: "primary", x: 50, y: 47, w: 14, in: 4.6, out: 7.5, fx: [{ fx: "pop", at: 4.6 }, { fx: "spin", rpm: 6 }, { fx: "spark-burst", at: 4.7 }, { fx: "shrink-out" }] },
    // b4 — warehouse box morphs out of a circle
    { id: "h4a", type: "text", line: "b4:0", x: 50, y: 24, size: 10, weight: 800, color: "text", font: "head", align: "center", in: 7.64, out: 10.8, fx: [{ fx: "slide", from: "right", at: 7.64 }, { fx: "slide-out", to: "left" }] },
    { id: "h4b", type: "text", line: "b4:1", x: 50, y: 32, size: 6, weight: 500, color: "textMuted", font: "body", align: "center", in: 8, out: 10.8, fx: [{ fx: "fade", at: 8 }, { fx: "fade-out" }] },
    { id: "h4c", type: "text", line: "b4:2", x: 50, y: 82, size: 7, weight: 700, color: "accent", font: "head", align: "center", in: 9, out: 10.8, fx: [{ fx: "rise", at: 9 }, { fx: "underline-draw", at: 9.4 }, { fx: "fade-out" }] },
    { id: "box", type: "shape", shape: "circle", to: "rect", radius: 14, fill: "surface", stroke: "primary", strokeW: 0.6, x: 50, y: 48, w: 22, in: 7.64, out: 10.8, fx: [{ fx: "pop", at: 7.64 }, { fx: "morph", at: 8.1 }, { fx: "float" }, { fx: "shrink-out" }] },
    // b5 — three support badges, staggered
    { id: "h5a", type: "text", line: "b5:0", x: 50, y: 20, size: 7, weight: 800, color: "text", font: "head", align: "center", in: 10.95, out: 15.2, fx: [{ fx: "per-word", at: 10.95 }, { fx: "fade-out" }] },
    { id: "h5b", type: "text", line: "b5:1", x: 50, y: 28, size: 9, weight: 800, color: "primary", font: "head", align: "center", in: 11.3, out: 15.2, fx: [{ fx: "zoom-in", at: 11.3 }, { fx: "fade-out" }] },
    { id: "h5c", type: "text", line: "b5:2", x: 50, y: 82, size: 5.5, weight: 500, color: "textMuted", font: "body", align: "center", in: 12, out: 15.2, fx: [{ fx: "fade", at: 12 }, { fx: "fade-out" }] },
    { id: "badges", type: "group", x: 50, y: 50, w: 80, h: 30, in: 11, out: 15.2, fx: [{ fx: "pop", at: 11.4, stagger: 0.18 }, { fx: "beat-bob", stagger: 0 }] },
    { id: "bd1", type: "shape", parent: "badges", shape: "circle", fill: "surface", stroke: "primary", strokeW: 0.5, x: 25, y: 50, w: 16 },
    { id: "bd2", type: "shape", parent: "badges", shape: "circle", fill: "surface", stroke: "primary", strokeW: 0.5, x: 50, y: 50, w: 16 },
    { id: "bd3", type: "shape", parent: "badges", shape: "circle", fill: "surface", stroke: "primary", strokeW: 0.5, x: 75, y: 50, w: 16 },
    // b6 — stats: bars race + counter
    { id: "h6a", type: "text", line: "b6:0", x: 50, y: 18, size: 7.5, weight: 800, color: "text", font: "head", align: "center", in: 15.3, out: 18.5, fx: [{ fx: "rise", at: 15.3 }, { fx: "fade-out" }] },
    { id: "h6b", type: "text", line: "b6:1", x: 50, y: 74, size: 7, weight: 700, color: "text", font: "head", align: "center", in: 15.9, out: 18.5, fx: [{ fx: "rise", at: 15.9 }, { fx: "fade-out" }] },
    { id: "h6c", type: "text", line: "b6:2", x: 50, y: 81, size: 6, weight: 700, color: "primary", font: "head", align: "center", in: 16.4, out: 18.5, fx: [{ fx: "highlight-sweep", at: 16.4 }, { fx: "fade", at: 16.4 }, { fx: "fade-out" }] },
    { id: "bars", type: "group", x: 50, y: 46, w: 60, h: 30, in: 15.3, out: 18.5, fx: [{ fx: "bar-grow", at: 15.4, stagger: 0.12 }] },
    { id: "bar1", type: "shape", parent: "bars", shape: "rect", radius: 20, fill: "primary", x: 32, y: 50, w: 7, h: 14 },
    { id: "bar2", type: "shape", parent: "bars", shape: "rect", radius: 20, fill: "accent", x: 44, y: 47, w: 7, h: 19 },
    { id: "bar3", type: "shape", parent: "bars", shape: "rect", radius: 20, fill: "primary", x: 56, y: 44, w: 7, h: 24 },
    { id: "bar4", type: "shape", parent: "bars", shape: "rect", radius: 20, fill: "accent", x: 68, y: 41, w: 7, h: 30 },
    // b7 — breakdown: the one parcel, slow
    { id: "h7a", type: "text", line: "b7:0", x: 50, y: 40, size: 12, weight: 800, color: "text", font: "head", align: "center", in: 18.6, out: 21.7, fx: [{ fx: "blur-in", at: 18.6 }, { fx: "breathe" }, { fx: "fade-out" }] },
    { id: "h7b", type: "text", line: "b7:1", x: 50, y: 52, size: 8, weight: 700, color: "primary", font: "head", align: "center", in: 19.4, out: 21.7, fx: [{ fx: "per-word", at: 19.4 }, { fx: "fade-out" }] },
    { id: "dust", type: "particles", kind: "dust", count: 40, colors: ["textMuted"], x: 50, y: 50, w: 100, h: 178, z: -5, in: 18.55, out: 21.82 },
    // b8 — logo reveal
    { id: "ring", type: "shape", shape: "ring", fill: "primary", x: 50, y: 40, w: 50, in: 21.82, fx: [{ fx: "stroke-draw", at: 21.82, dur: 0.8 }, { fx: "ripple", at: 21.82 }, { fx: "breathe" }] },
    { id: "logo", type: "image", src: "logo", x: 50, y: 40, w: 34, z: 3, in: 21.82, fx: [{ fx: "pop", at: 21.82 }, { fx: "float", amp: 0.6 }, { fx: "shimmer" }] },
    { id: "h8a", type: "text", line: "b8:0", x: 50, y: 62, size: 6.4, weight: 700, color: "text", font: "head", align: "center", in: 22.2, out: 23.95, fx: [{ fx: "rise", at: 22.2 }, { fx: "fade-out" }] },
    { id: "h8b", type: "text", line: "b8:1", x: 50, y: 69, size: 6.4, weight: 700, color: "textMuted", font: "head", align: "center", in: 22.5, out: 23.95, fx: [{ fx: "rise", at: 22.5 }, { fx: "fade-out" }] },
    // b9 — CTA
    { id: "h9a", type: "text", line: "b9:0", x: 50, y: 60, size: 6.4, weight: 700, color: "text", font: "head", align: "center", in: 24, out: 28.3, fx: [{ fx: "per-word", at: 24 }, { fx: "fade-out" }] },
    { id: "h9b", type: "text", line: "b9:1", x: 50, y: 67, size: 6.4, weight: 700, color: "text", font: "head", align: "center", in: 24.3, out: 28.3, highlight: { word: 2, color: "accent" }, fx: [{ fx: "per-word", at: 24.3 }, { fx: "fade-out" }] },
    { id: "btn", type: "shape", shape: "pill", fill: "primary", glow: "glowA", x: 50, y: 80, w: 56, h: 13, z: 1, in: 24.6, out: 28.3, fx: [{ fx: "spring-in", at: 24.6, from: "down" }, { fx: "pulse", amount: 0.04 }, { fx: "fade-out" }] },
    { id: "btnTxt", type: "text", line: "b9:2", x: 50, y: 80, size: 7.5, weight: 800, color: "onPrimary", font: "head", align: "center", z: 2, in: 24.6, out: 28.3, fx: [{ fx: "spring-in", at: 24.6, from: "down" }, { fx: "pulse", amount: 0.04 }, { fx: "fade-out" }] },
    { id: "confetti", type: "particles", kind: "confetti", count: 50, colors: ["primary", "accent", "text"], x: 50, y: 50, w: 100, h: 178, z: -1, in: 24, out: 28.4, dir: 90, speed: 1.5 },
    { id: "url", type: "text", line: "b10:0", x: 50, y: 70, size: 7, weight: 700, color: "primary", font: "latin", align: "center", in: 28.36, fx: [{ fx: "typewriter", at: 28.4, dur: 0.8 }, { fx: "glow-pulse" }] },
  ],
};

if (process.argv[1]?.endsWith("spec-smoke.ts")) (async () => {
  const input = {
    brand: { name: draft.name, url: "slllr.com", logoUrl: draft.logoUrl, logoPlate: true, imageUrls: ogImage ? [ogImage] : [], colors: draft.colors },
    fontFamilies: { arabic: draft.fonts.arabic, latin: draft.fonts.latin },
    lang: "ar" as const,
    dir: "rtl" as const,
    width: 1080,
    height: 1920,
    fps: 30,
    durationInFrames: 900,
    energy,
    script: { title: script.title, beats: script.beats },
  };
  let t0 = Date.now();
  const res = await validateSpec(SAMPLE_SPEC, { width: 1080, height: 1920, fps: 30, duration: 30, energy, beats: script.beats, colors: draft.colors, fonts: draft.fonts, lang: "ar", hasLogo: true });
  const first = Date.now() - t0;
  t0 = Date.now();
  await validateSpec(SAMPLE_SPEC, { width: 1080, height: 1920, fps: 30, duration: 30, energy, beats: script.beats, colors: draft.colors, fonts: draft.fonts, lang: "ar", hasLogo: true });
  console.log(`validate: ${first} ms (cold, fonts fetched) · ${Date.now() - t0} ms (warm) · ${res.issues.length} issues`);
  for (const i of res.issues) console.log(`  [${i.code}] ${i.id ?? "-"}${i.t !== undefined ? ` @${i.t}s` : ""}: ${i.msg}`);

  const out = path.resolve("out/spec-smoke");
  mkdirSync(out, { recursive: true });
  if (!res.spec) return;
  const props: SpecVideoProps = { spec: res.spec, input, audio: { music: null, sfx: null, voiceover: null } };
  if (process.argv.includes("--no-stills")) return;
  const job = { task: "stills", props, times: [1.5, 3.9, 9.6, 12.4, 17.6, 25.6], outDir: out, scale: 0.5 };
  writeFileSync(path.join(out, "job.json"), JSON.stringify(job));
  t0 = Date.now();
  execFileSync("node_modules/.bin/tsx", ["--tsconfig", "tsconfig.scripts.json", "scripts/motion/spec-worker.ts", path.join(out, "job.json"), path.join(out, "result.json")], { stdio: "inherit" });
  console.log(`stills: ${Date.now() - t0} ms →`, readFileSync(path.join(out, "result.json"), "utf8").slice(0, 400));
})();

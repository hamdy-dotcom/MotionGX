// Phase 3D engine showcase (no AI): one spec exercising the new behaviors, engine features and cuts →
// validate → stills mid-animation, plus a GSAP determinism check (the same frame rendered twice must be
// byte-identical).
//   npx tsx --tsconfig tsconfig.scripts.json scripts/motion/behaviors-smoke.ts
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { MotionSpecInput } from "../../lib/motion/spec";
import { validateSpec } from "../../lib/motion/validate";
import type { SpecVideoProps } from "../../remotion/SpecVideo";
import type { EnergyMap, ScriptBeat } from "@motiongx/primitives";

const dir = path.resolve("out/five/slllr");
const { draft } = JSON.parse(readFileSync(path.join(dir, "draft.json"), "utf8"));
const LOGO_D = "M10 50 C10 20 40 10 50 30 C60 10 90 20 90 50 C90 75 60 85 50 95 C40 85 10 75 10 50 Z";
const SQUIGGLE = "M5 80 C25 20 45 90 60 40 S90 10 95 30";

const beat = (id: string, start_s: number, end_s: number, line: string) => ({ id, role: "feature", start_s, end_s, lines: [line], voiceover_line: "" }) as unknown as ScriptBeat;
const beats: ScriptBeat[] = [beat("s1", 0, 3, "Ship in seconds"), beat("s2", 3, 6, "Every order, tracked"), beat("s3", 6, 9, "Drag. Drop. Done."), beat("s4", 9, 12, "Start free today")];
const energy = { bpm: 120, length_s: 12, sections: [{ kind: "build", start_s: 0, end_s: 12 }], hits: [{ t: 3, kind: "drop" }, { t: 6, kind: "impact" }, { t: 9, kind: "logo" }, { t: 10.5, kind: "cta" }] } as unknown as EnergyMap;

export const SHOWCASE: MotionSpecInput = {
  version: 1,
  motionBlur: 0.6,
  canvas: { bg: [{ kind: "gradient", colors: ["bg", "bg2"], angle: 160 }, { kind: "radial", colors: ["glowA"], alpha: 0.5, drift: 1 }] },
  camera: { drift: 0.3, keys: [{ t: 0, zoom: 1.05, ry: -6 }, { t: 3, zoom: 1, ry: 0 }, { t: 6, rx: 4 }, { t: 9, rx: 0, zoom: 1.04 }] },
  cuts: [{ t: 3, kind: "layers", dir: "left" }, { t: 6, kind: "pixels" }, { t: 9, kind: "blinds", color: "accent" }],
  elements: [
    // s1 — tracking-in title + gsap-split + swing card + scramble + rgb split
    { id: "t1", type: "text", text: "Ship in seconds", x: 50, y: 22, size: 9, weight: 800, font: "latin", in: 0, out: "s1e", fx: [{ fx: "tracking-in", at: 0.1 }, { fx: "rgb-split", at: 1.2 }, { fx: "puff-out" }] },
    { id: "t1b", type: "text", text: "Same-day courier API", x: 50, y: 30, size: 5.6, weight: 600, color: "textMuted", font: "latin", in: 0.3, out: "s1e", fx: [{ fx: "gsap-split", split: "letter", from: "center", ease: "back.out(1.7)", at: 0.3 }, { fx: "tracking-out" }] },
    { id: "card", type: "shape", shape: "rect", radius: 16, fill: "surface", stroke: "primary", strokeW: 0.4, x: 50, y: 52, w: 60, h: 34, in: 0.2, out: "s1e", fx: [{ fx: "swing-in", from: "top", at: 0.2 }, { fx: "tilt-3d", deg: 10 }, { fx: "extrude", depth: 10 }, { fx: "flip-out" }] },
    { id: "code", type: "text", text: "ORDER #A1-LIVE", x: 50, y: 52, size: 6, weight: 700, color: "primary", font: "latin", z: 2, in: 0.6, out: "s1e", fx: [{ fx: "scramble", at: 0.6, dur: 1.2 }, { fx: "flip-out" }] },
    { id: "dot", type: "shape", shape: "circle", fill: "accent", x: 50, y: 74, w: 5, in: 0.4, out: "s1e", fx: [{ fx: "ping", period: 1 }] },
    { id: "dot2", type: "shape", shape: "circle", fill: "accent", x: 50, y: 74, w: 3, z: 1, in: 0.4, out: "s1e", fx: [{ fx: "pulsate" }] },
    // s2 — shared morph, liquid fill, route + gsap-draw, karaoke, liquid-move with echo
    { id: "t2", type: "text", line: "s2:0", x: 50, y: 16, size: 7.6, weight: 800, font: "latin", in: "s2", out: "s2e", fx: [{ fx: "blur-words", at: 3.05 }, { fx: "karaoke", at: 4.2, step: 0.3 }, { fx: "scale-out", origin: "top" }] },
    { id: "pill", type: "shape", shape: "rect", radius: 50, fill: "primary", x: 22, y: 36, w: 20, h: 8, in: "s2", out: "s2e", fx: [{ fx: "scale-in", origin: "left", at: 3.1 }, { fx: "shared-morph", to: "panel", at: 3.7 }, { fx: "fade-out" }] },
    { id: "panel", type: "shape", shape: "rect", radius: 10, fill: "surface", x: 50, y: 50, w: 70, h: 30, in: 6, out: 6 },
    { id: "cup", type: "shape", shape: "rect", radius: 22, fill: "accent", stroke: "text", strokeW: 0.3, x: 24, y: 70, w: 18, h: 22, in: "s2", out: "s2e", fx: [{ fx: "liquid-fill", at: 3.4, to: 0.75 }, { fx: "fade-out" }] },
    { id: "road", type: "svgPath", d: SQUIGGLE, x: 64, y: 72, w: 52, h: 26, stroke: "primary", strokeW: 1.2, in: "s2", out: "s2e", fx: [{ fx: "gsap-draw", from: "center", at: 3.2, dur: 1.2 }, { fx: "fade-out" }] },
    { id: "rider", type: "shape", shape: "circle", fill: "accent", x: 64, y: 72, w: 4, z: 3, in: 3.4, out: "s2e", fx: [{ fx: "gsap-path", path: "road", align: true, at: 3.4, dur: 2.2 }, { fx: "echo-trail", n: 4, gap: 0.05 }] },
    { id: "blob", type: "shape", shape: "circle", fill: "gradA", x: 80, y: 40, w: 9, in: 3.3, out: "s2e", fx: [{ fx: "liquid-move", dx: -50, dy: 0, at: 4.4 }, { fx: "fade-out" }] },
    // s3 — cursor drags a slider knob, press, panel stack, roll-text, inertia
    { id: "t3", type: "text", line: "s3:0", x: 50, y: 16, size: 8, weight: 800, font: "latin", in: "s3", out: "s3e", fx: [{ fx: "slam-words", at: 6.05 }, { fx: "shake-x", at: 7.2 }, { fx: "roll-out" }] },
    { id: "track", type: "shape", shape: "rect", radius: 50, fill: "surface2", x: 50, y: 40, w: 70, h: 3, in: "s3", out: "s3e", fx: [{ fx: "unfold", at: 6.1 }, { fx: "fade-out" }] },
    { id: "knob", type: "shape", shape: "circle", fill: "primary", x: 22, y: 40, w: 8, z: 2, in: 6.2, out: "s3e", fx: [{ fx: "spring-pop", at: 6.2 }, { fx: "cursor-move", dx: 52, at: 7.0, dur: 1.0, arc: 0 }, { fx: "fade-out" }] },
    { id: "cursor", type: "shape", shape: "cursor", fill: "white", stroke: "black", strokeW: 0.4, x: 25, y: 43, w: 6, h: 8, z: 5, in: 6.3, out: "s3e", fx: [{ fx: "inertia-glide", from: "downRight", dist: 40, at: 6.3, dur: 0.7 }, { fx: "press", at: 6.85 }, { fx: "cursor-move", dx: 52, at: 7.0, dur: 1.0, arc: 0 }] },
    { id: "stack", type: "group", x: 50, y: 66, w: 70, h: 30, in: 6.3, out: "s3e", fx: [{ fx: "panel-stack", at: 6.4, stagger: 0.14, order: "center" }, { fx: "fade-out" }] },
    { id: "pc1", type: "shape", parent: "stack", shape: "rect", radius: 14, fill: "surface", stroke: "border", strokeW: 0.3, x: 50, y: 58, w: 64, h: 10 },
    { id: "pc2", type: "shape", parent: "stack", shape: "rect", radius: 14, fill: "primary", x: 50, y: 66, w: 64, h: 10 },
    { id: "pc3", type: "shape", parent: "stack", shape: "rect", radius: 14, fill: "surface", stroke: "border", strokeW: 0.3, x: 50, y: 74, w: 64, h: 10 },
    { id: "pt2", type: "text", parent: "stack", text: "Live tracking", x: 50, y: 66, size: 5, weight: 700, color: "onPrimary", font: "latin", z: 2, fx: [{ fx: "roll-text", at: 6.8 }] },
    // s4 — gsap-morph to the mark, clip-morph CTA, typewriter caret, stop-motion stars
    { id: "mark", type: "svgPath", d: "M50 10 L90 90 L10 90 Z", to: LOGO_D, x: 50, y: 34, w: 30, h: 30, stroke: "primary", strokeW: 1.4, fill: "primary", in: "s4", fx: [{ fx: "scale-in", at: 9.05 }, { fx: "gsap-morph", at: 9.3, dur: 0.9 }, { fx: "heartbeat", at: 10.4 }] },
    { id: "cta", type: "shape", shape: "pill", fill: "primary", glow: "glowA", x: 50, y: 66, w: 62, h: 12, in: 10.3, fx: [{ fx: "clip-morph", at: 10.3 }, { fx: "jello", at: 11.1 }] },
    { id: "ctaT", type: "text", line: "s4:0", x: 50, y: 66, size: 6.4, weight: 800, color: "onPrimary", font: "latin", z: 2, in: 10.4, fx: [{ fx: "masked-rise", at: 10.4 }] },
    { id: "url", type: "text", text: "slllr.com", x: 50, y: 78, size: 5, weight: 700, color: "textMuted", font: "latin", z: 2, in: 10.6, fx: [{ fx: "typewriter", caret: true, at: 10.6, dur: 0.6 }] },
    { id: "stars", type: "group", x: 50, y: 50, w: 90, h: 160, steps: 8, in: "s4", fx: [{ fx: "orbit-settle", at: 9.1, stagger: 0.05, order: "random" }] },
    { id: "st1", type: "shape", parent: "stars", shape: "star", fill: "accent", x: 16, y: 18, w: 5 },
    { id: "st2", type: "shape", parent: "stars", shape: "star", fill: "accent", x: 84, y: 22, w: 4 },
    { id: "st3", type: "shape", parent: "stars", shape: "star", fill: "accent", x: 82, y: 88, w: 5 },
  ],
};

if (process.argv[1]?.endsWith("behaviors-smoke.ts")) (async () => {
  const input = {
    brand: { name: draft.name, url: "slllr.com", logoUrl: draft.logoUrl, logoPlate: true, imageUrls: [], colors: draft.colors },
    fontFamilies: { arabic: draft.fonts.arabic, latin: draft.fonts.latin },
    lang: "en" as const,
    dir: "ltr" as const,
    width: 1080,
    height: 1920,
    fps: 30,
    durationInFrames: 360,
    energy,
    script: { title: "showcase", beats },
  };
  const res = await validateSpec(SHOWCASE, { width: 1080, height: 1920, fps: 30, duration: 12, energy, beats, colors: draft.colors, fonts: draft.fonts, lang: "en", hasLogo: false });
  console.log(`validate: ${res.issues.length} issues`);
  for (const i of res.issues.slice(0, 20)) console.log(`  [${i.code}] ${i.id ?? "-"}${i.t !== undefined ? ` @${i.t}s` : ""}: ${i.msg}`);
  if (!res.spec) return;
  const out = path.resolve("out/behaviors-smoke");
  mkdirSync(out, { recursive: true });
  const props: SpecVideoProps = { spec: res.spec, input, audio: { music: null, sfx: null, voiceover: null } };
  // stills mid-animation; 9.75 is rendered twice (GSAP morph mid-way) for the determinism check
  const times = [0.5, 1.0, 1.25, 2.95, 3.6, 4.3, 4.9, 6.0, 6.6, 7.5, 9.0, 9.75, 10.5, 11.2, 9.75];
  const job = { task: "stills", props, times, outDir: out, scale: 0.5 };
  writeFileSync(path.join(out, "job.json"), JSON.stringify(job));
  const t0 = Date.now();
  execFileSync("node_modules/.bin/tsx", ["--tsconfig", "tsconfig.scripts.json", "scripts/motion/spec-worker.ts", path.join(out, "job.json"), path.join(out, "result.json")], { stdio: "inherit" });
  const result = JSON.parse(readFileSync(path.join(out, "result.json"), "utf8")) as { ok: boolean; stills?: { t: number; path: string }[]; errors?: string[] };
  console.log(`stills: ${Date.now() - t0} ms`, result.ok ? "" : result.errors);
  const files = (result.stills ?? []).map((s) => s.path);
  if (files.length >= 2) {
    const h = (f: string) => createHash("sha256").update(readFileSync(f)).digest("hex").slice(0, 16);
    const a = files[11];
    const b = files[files.length - 1];
    console.log(`determinism (t=9.75 twice): ${h(a)} vs ${h(b)} → ${h(a) === h(b) ? "IDENTICAL" : "DIFFERENT"}`);
  }
})();

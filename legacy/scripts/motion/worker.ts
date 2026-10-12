// Isolated motion worker. Runs as its own process (locally) or inside a Vercel Sandbox (production) —
// never inside the app server. Generated code is only compiled here and executed inside the
// renderer's headless browser.
//
// Usage: tsx --tsconfig tsconfig.scripts.json scripts/motion/worker.ts <job.json> <result.json>
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { bundle } from "@remotion/bundler";
import { openBrowser, renderFrames, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { compileComposition } from "../../lib/motion/compile";
import { webpackOverride } from "../../remotion/webpack-override";
import type { MotionVideoProps, RuntimeInput } from "../../remotion/MotionVideo";

export type WorkerJob =
  | { task: "validate"; source: string; input: RuntimeInput; stills: { t: number; label: string }[]; outDir: string; staticScan?: boolean }
  | { task: "render"; source?: string; js?: string; input: RuntimeInput; audio: MotionVideoProps["audio"]; output: string; crf?: number };

export type WorkerResult =
  | { ok: false; stage: "compile" | "render"; errors: string[] }
  | {
      ok: true;
      js: string;
      /** non-blocking type errors, passed back to the coder */
      warnings?: string[];
      stills?: { t: number; label: string; path: string }[];
      staticSpans?: { from_s: number; to_s: number }[];
      output?: string;
      timings: Record<string, number>;
    };

const BUNDLE_DIR = path.resolve(".remotion-bundle");

async function serveUrl() {
  if (existsSync(path.join(BUNDLE_DIR, "index.html"))) return BUNDLE_DIR;
  return bundle({ entryPoint: path.resolve("remotion/index.ts"), outDir: BUNDLE_DIR, webpackOverride });
}

function meanAbsDiff(a: PNG, b: PNG) {
  let sum = 0;
  const n = Math.min(a.data.length, b.data.length);
  for (let i = 0; i < n; i += 4) sum += Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
  return sum / (n / 4) / 3;
}

async function main() {
  const [jobFile, resultFile] = process.argv.slice(2);
  const job = JSON.parse(readFileSync(jobFile, "utf8")) as WorkerJob;
  const timings: Record<string, number> = {};
  const mark = (k: string, t0: number) => (timings[k] = Date.now() - t0);
  const write = (r: WorkerResult) => writeFileSync(resultFile, JSON.stringify(r));

  let t0 = Date.now();
  let js = job.task === "render" ? job.js ?? "" : "";
  let warnings: string[] = [];
  if (job.source) {
    const compiled = await compileComposition(job.source);
    mark("compile", t0);
    if (!compiled.ok) return write({ ok: false, stage: "compile", errors: compiled.errors });
    js = compiled.js;
    warnings = compiled.warnings;
  }

  t0 = Date.now();
  const url = await serveUrl();
  mark("bundle", t0);
  const browser = await openBrowser("chrome", { chromiumOptions: { gl: "angle" } });
  try {
    const audio = job.task === "render" ? job.audio : { music: null, sfx: null, voiceover: null };
    const inputProps: MotionVideoProps = { code: js, input: job.input, audio };
    t0 = Date.now();
    const composition = await selectComposition({ serveUrl: url, id: "MotionVideo", inputProps, puppeteerInstance: browser });
    mark("select", t0);

    if (job.task === "render") {
      t0 = Date.now();
      await renderMedia({ serveUrl: url, composition, inputProps, codec: "h264", crf: job.crf ?? 20, outputLocation: job.output, puppeteerInstance: browser });
      mark("render", t0);
      return write({ ok: true, js, output: job.output, timings });
    }

    mkdirSync(job.outDir, { recursive: true });
    const stills: { t: number; label: string; path: string }[] = [];
    t0 = Date.now();
    for (const s of job.stills) {
      const frame = Math.min(composition.durationInFrames - 1, Math.max(0, Math.round(s.t * composition.fps)));
      const out = path.join(job.outDir, `still-${String(frame).padStart(4, "0")}.jpeg`);
      await renderStill({ serveUrl: url, composition, inputProps, frame, output: out, imageFormat: "jpeg", jpegQuality: 82, scale: 0.5, puppeteerInstance: browser });
      stills.push({ t: frame / composition.fps, label: s.label, path: out });
    }
    mark("stills", t0);

    // Static scan: sample every 0.3 s at low res; a run of near-identical samples longer than 0.6 s is "static".
    let staticSpans: { from_s: number; to_s: number }[] = [];
    if (job.staticScan !== false) {
      t0 = Date.now();
      const scanDir = path.join(job.outDir, "scan");
      rmSync(scanDir, { recursive: true, force: true });
      mkdirSync(scanDir, { recursive: true });
      const every = Math.max(1, Math.round(composition.fps * 0.3));
      await renderFrames({ serveUrl: url, composition, inputProps, outputDir: scanDir, imageFormat: "png", everyNthFrame: every, scale: 0.15, puppeteerInstance: browser, onStart: () => undefined, onFrameUpdate: () => undefined });
      const files = readdirSync(scanDir).filter((f) => f.endsWith(".png")).sort();
      const frames = files.map((f) => PNG.sync.read(readFileSync(path.join(scanDir, f))));
      let runStart = -1;
      for (let i = 1; i < frames.length; i++) {
        const still = meanAbsDiff(frames[i - 1], frames[i]) < 0.35;
        if (still && runStart < 0) runStart = i - 1;
        if ((!still || i === frames.length - 1) && runStart >= 0) {
          const end = still ? i : i - 1;
          const from = (runStart * every) / composition.fps;
          const to = (end * every) / composition.fps;
          if (to - from > 0.6) staticSpans.push({ from_s: Number(from.toFixed(2)), to_s: Number(to.toFixed(2)) });
          runStart = -1;
        }
      }
      // The final hold after the last frame of motion is allowed (the outro rests on the logo).
      staticSpans = staticSpans.filter((s) => s.from_s < composition.durationInFrames / composition.fps - 1.2);
      rmSync(scanDir, { recursive: true, force: true });
      mark("staticScan", t0);
    }
    return write({ ok: true, js, warnings, stills, staticSpans, timings });
  } catch (err) {
    return write({ ok: false, stage: "render", errors: [err instanceof Error ? `${err.message}`.slice(0, 2000) : String(err)] });
  } finally {
    await browser.close({ silent: true }).catch(() => undefined);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

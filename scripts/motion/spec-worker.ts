// Isolated render worker for MotionSpecs (own process locally; Vercel Sandbox in production). Renders
// stills (background taste QA, contact sheets) and exports — exports in parallel chunks, then concat
// + mux the soundtrack once.
//
// Usage: tsx --tsconfig tsconfig.scripts.json scripts/motion/spec-worker.ts <job.json> <result.json>
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { bundle } from "@remotion/bundler";
import { openBrowser, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { webpackOverride } from "../../remotion/webpack-override";
import type { SpecVideoProps } from "../../remotion/SpecVideo";

const run = promisify(execFile);

export type SpecJob =
  | { task: "stills"; props: SpecVideoProps; times: number[]; outDir: string; scale?: number; format?: "jpeg" | "png" }
  | { task: "render"; props: SpecVideoProps; output: string; audioFile?: string | null; chunks?: number; crf?: number };

export type SpecResult = { ok: true; stills?: { t: number; path: string }[]; output?: string; timings: Record<string, number> } | { ok: false; errors: string[] };

const BUNDLE_DIR = path.resolve(".remotion-bundle");
const FFMPEG = path.resolve("node_modules/.bin/remotion");

/** content hash of everything the bundle is built from, so engine changes always rebuild it */
export function sourceHash() {
  const h = createHash("sha256");
  const walk = (d: string) => {
    if (!existsSync(d)) return;
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else if (/\.(tsx?|css|json)$/.test(e.name)) h.update(f).update(readFileSync(f));
    }
  };
  for (const d of ["remotion", "packages/primitives/src", "lib/motion"]) walk(path.resolve(d));
  h.update(readFileSync(path.resolve("package.json")));
  return h.digest("hex").slice(0, 16);
}

async function serveUrl() {
  // deployed functions ship the prebuilt bundle without the engine sources: trust it there
  if (!existsSync(path.resolve("remotion/index.ts"))) return BUNDLE_DIR;
  const want = sourceHash();
  const stamp = path.join(BUNDLE_DIR, ".src-hash");
  if (existsSync(path.join(BUNDLE_DIR, "index.html")) && existsSync(stamp) && readFileSync(stamp, "utf8") === want) return BUNDLE_DIR;
  const url = await bundle({ entryPoint: path.resolve("remotion/index.ts"), outDir: BUNDLE_DIR, webpackOverride });
  writeFileSync(stamp, want);
  return url;
}

async function main() {
  const [jobFile, resultFile] = process.argv.slice(2);
  const job = JSON.parse(readFileSync(jobFile, "utf8")) as SpecJob;
  const timings: Record<string, number> = {};
  const write = (r: SpecResult) => writeFileSync(resultFile, JSON.stringify(r));
  let t0 = Date.now();
  const url = await serveUrl();
  timings.bundle = Date.now() - t0;
  const browser = await openBrowser("chrome", { chromiumOptions: { gl: "angle" } });
  try {
    // audio is muxed after rendering, so chunks render silent
    const inputProps: SpecVideoProps = { ...job.props, audio: { music: null, sfx: null, voiceover: null } };
    t0 = Date.now();
    const composition = await selectComposition({ serveUrl: url, id: "SpecVideo", inputProps, puppeteerInstance: browser });
    timings.select = Date.now() - t0;

    if (job.task === "stills") {
      mkdirSync(job.outDir, { recursive: true });
      t0 = Date.now();
      const stills = await Promise.all(
        job.times.map(async (t, i) => {
          const frame = Math.min(composition.durationInFrames - 1, Math.max(0, Math.round(t * composition.fps)));
          const dup = job.times.findIndex((x) => Math.round(x * composition.fps) === frame) !== i;
          const out = path.join(job.outDir, `still-${String(frame).padStart(4, "0")}${dup ? `-${i}` : ""}.${job.format ?? "jpeg"}`);
          await renderStill({ serveUrl: url, composition, inputProps, frame, output: out, imageFormat: job.format ?? "jpeg", ...(job.format === "png" ? {} : { jpegQuality: 85 }), scale: job.scale ?? 0.5, puppeteerInstance: browser });
          return { t: frame / composition.fps, path: out };
        }),
      );
      timings.stills = Date.now() - t0;
      return write({ ok: true, stills, timings });
    }

    // chunked render
    const total = composition.durationInFrames;
    const chunks = Math.max(1, Math.min(job.chunks ?? Math.max(2, Math.floor(os.cpus().length / 3)), 8));
    const per = Math.ceil(total / chunks);
    const dir = path.join(os.tmpdir(), `mgx-chunks-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const concurrencyEach = Math.max(1, Math.floor(os.cpus().length / chunks));
    t0 = Date.now();
    const parts = await Promise.all(
      Array.from({ length: chunks }, async (_, i) => {
        const from = i * per;
        const to = Math.min(total - 1, from + per - 1);
        if (from > to) return null;
        const out = path.join(dir, `part-${i}.mp4`);
        await renderMedia({ serveUrl: url, composition, inputProps, codec: "h264", crf: job.crf ?? 20, frameRange: [from, to], outputLocation: out, puppeteerInstance: browser, concurrency: concurrencyEach, muted: true, enforceAudioTrack: false });
        return out;
      }),
    );
    timings.chunks = Date.now() - t0;
    t0 = Date.now();
    const list = path.join(dir, "list.txt");
    writeFileSync(list, parts.filter(Boolean).map((p) => `file '${p}'`).join("\n"));
    const joined = path.join(dir, "joined.mp4");
    await run(FFMPEG, ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", joined]);
    if (job.audioFile) {
      await run(FFMPEG, ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", joined, "-i", job.audioFile, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", job.output]);
    } else {
      await run(FFMPEG, ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", joined, "-c", "copy", job.output]);
    }
    timings.concatMux = Date.now() - t0;
    rmSync(dir, { recursive: true, force: true });
    return write({ ok: true, output: job.output, timings });
  } catch (err) {
    return write({ ok: false, errors: [err instanceof Error ? err.message.slice(0, 2000) : String(err)] });
  } finally {
    await browser.close({ silent: true }).catch(() => undefined);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

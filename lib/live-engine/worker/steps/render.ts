/* eslint-disable */
// @ts-nocheck — verbatim port of video-sandbox/steps/render.mjs; the only edits are listed in scripts/live-engine/port-sandbox.py.
// STEP 6 — render. Seek the composition frame by frame in headless Chromium, encode with ffmpeg, mux the music.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { LAYOUTS } from "./script";

// ffmpeg: $FFMPEG_PATH, else the ffmpeg-static binary, else ffmpeg on PATH
const ffmpeg = process.env.FFMPEG_PATH || (await import("ffmpeg-static").then((m) => m.default).catch(() => null)) || "ffmpeg";
const run = (args) => new Promise((ok, no) => { const p = spawn(ffmpeg, ["-loglevel", "error", "-y", ...args]); let e = ""; p.stderr.on("data", (d) => (e += d)); p.on("close", (c) => (c ? no(new Error(e)) : ok())); });

/** Load once and report JS errors / missing assets before spending time on frames. */
export async function checkComposition({ htmlFile, layout }) {
  const [W, H] = LAYOUTS[layout] || LAYOUTS["9:16"];
  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: W, height: H } });
  const problems = [];
  page.on("pageerror", (e) => problems.push("JS error: " + e.message));
  page.on("requestfailed", (r) => problems.push("failed to load: " + r.url().split("/").slice(-3).join("/")));
  await page.goto("file://" + htmlFile + "?render", { waitUntil: "networkidle" }).catch((e) => problems.push(e.message));
  const ok = await page.evaluate(() => typeof window.__seek === "function" && window.__duration > 0).catch(() => false);
  if (!ok) problems.push("composition did not call K.done(tl, duration)");
  await page.screenshot({ path: path.join(path.dirname(htmlFile), "poster.jpg"), type: "jpeg", quality: 80 }).catch(() => {});
  await browser.close();
  return problems;
}

export async function render({ htmlFile, layout, duration, musicFile, outFile, fps = 30, workers = 3, log = console.log }) {
  const [W, H] = LAYOUTS[layout] || LAYOUTS["9:16"];
  const total = Math.round(duration * fps), dir = path.dirname(outFile);
  log(`▶ render: ${total} frames at ${W}×${H}, ${workers} workers`);
  const browser = await chromium.launch();
  let done = 0; const t0 = Date.now();
  const segs = await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const a = Math.floor((total * w) / workers), b = Math.floor((total * (w + 1)) / workers), seg = path.join(dir, `.seg${w}.mp4`);
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    await page.goto("file://" + htmlFile + "?render", { waitUntil: "networkidle" });
    await page.evaluate(() => window.__ready);
    const enc = spawn(ffmpeg, ["-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "18", seg]);
    for (let i = a; i < b; i++) {
      await page.evaluate((t) => window.__seek(t), i / fps);
      const jpg = await page.screenshot({ type: "jpeg", quality: 92, clip: { x: 0, y: 0, width: W, height: H } });
      if (!enc.stdin.write(jpg)) await new Promise((r) => enc.stdin.once("drain", r));
      if (++done % (fps * 5) === 0) log(`  ${Math.round((done / total) * 100)}% · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    enc.stdin.end(); await new Promise((r) => enc.on("close", r));
    return seg;
  }));
  await browser.close();
  const list = path.join(dir, ".segs.txt"); fs.writeFileSync(list, segs.map((s) => `file '${s}'`).join("\n"));
  await run(["-f", "concat", "-safe", "0", "-i", list, "-i", musicFile, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", outFile]);
  for (const s of [...segs, list]) fs.rmSync(s, { force: true });
  log(`✓ render: ${path.basename(outFile)} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  return outFile;
}

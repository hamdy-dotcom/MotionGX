/* eslint-disable */
// @ts-nocheck — verbatim port of video-sandbox/steps/clips.mjs; the only edits are listed in scripts/live-engine/port-sandbox.py.
// Flow clips — an experiment behind brief.flowClips (off by default). The capture records the browser session; every input →
// result flow becomes a short H.264 clip cut from the agent's own action timestamps: each action at 1×, loading over 2 s sped
// up into 2 s, the agent's thinking pauses (gaps over 1.5 s) cut. Only the clips are kept; the full recording is deleted.
// A video can then play a flow's clip inside the window instead of the clone replay (frames decoded once at build time).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ffmpeg = process.env.FFMPEG_PATH || (await import("ffmpeg-static").then((m) => m.default).catch(() => null)) || "ffmpeg";
const run = (args) => { const r = spawnSync(ffmpeg, ["-loglevel", "error", "-y", ...args], { encoding: "utf8", maxBuffer: 1 << 26 }); if (r.status !== 0) throw new Error(String(r.stderr || "ffmpeg failed").trim().slice(0, 300)); };
const ACTIONS = ["type", "click", "select", "press", "key", "scroll", "goto", "wait"];
const LOADING = ["click", "select", "press", "key", "goto", "wait"];

/**
 * The kept segments of one flow, in recording seconds: each action [start − 0.25, done + 0.5] at 1×; what follows a
 * click / wait until the page settled is loading — up to 2 s at 1×, longer sped up into 2 s; then the result held 1.2 s.
 * Gaps between segments up to 1.5 s are kept (merged), longer ones (the agent thinking) are cut.
 */
export function planSegments(events, flow, t0) {
  const ev = events.filter((e) => e.page === flow.page && e.step >= flow.from && e.step <= flow.to && ACTIONS.includes(e.name)).sort((a, b) => a.t0 - b.t0);
  const rel = (t) => (t - t0) / 1000, segs = [];
  for (const e of ev) {
    const a = rel(e.t0) - 0.25, b = rel(e.tA) + 0.5, settled = rel(e.t1);
    if (e.name === "wait") { const L = settled - rel(e.t0); segs.push({ a: rel(e.t0), b: settled, speed: Math.max(1, L / 2), kind: "loading", box: null }); continue; }
    segs.push({ a: Math.max(0, a), b, speed: 1, kind: e.name, box: e.box || null });
    if (LOADING.includes(e.name) && settled - b > 0.1) { const L = settled - b; segs.push({ a: b, b: settled, speed: Math.max(1, L / 2), kind: "loading", box: null }); }
  }
  const last = ev.at(-1); if (last) segs.push({ a: rel(last.t1), b: rel(last.t1) + 1.2, speed: 1, kind: "result", box: flow.result || null });
  // merge: a short gap (≤ 1.5 s) stays in the clip, a longer one is cut
  const out = [];
  for (const s of segs.filter((x) => x.b - x.a > 0.05).sort((x, y) => x.a - y.a)) {
    const mk = { kind: s.kind, at: s.a, box: s.box }, p = out.at(-1);
    if (p && p.speed === 1 && s.speed === 1 && s.a - p.b <= 1.5) { p.b = Math.max(p.b, s.b); p.marks.push(mk); }
    else { const a = p && s.a < p.b ? p.b : s.a; if (s.b - a > 0.05) out.push({ ...s, a, marks: [{ ...mk, at: Math.max(mk.at, a) }] }); }
  }
  return out;
}

/** cut one clip: the segments concatenated, H.264, the short side ≤ 1080 px; returns its meta (clip-time marks for the camera) */
export function cutClip({ src, segs, outFile, view }) {
  const k = Math.min(1, 1080 / Math.min(view.width, view.height)), w = Math.round((view.width * k) / 2) * 2, h = Math.round((view.height * k) / 2) * 2;
  const parts = segs.map((s, i) => `[0:v]trim=start=${s.a.toFixed(3)}:end=${s.b.toFixed(3)},setpts=(PTS-STARTPTS)/${s.speed.toFixed(3)}[v${i}]`);
  const filter = `${parts.join(";")};${segs.map((_, i) => `[v${i}]`).join("")}concat=n=${segs.length}:v=1:a=0,scale=${w}:${h},fps=30,format=yuv420p[out]`;
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  run(["-i", src, "-filter_complex", filter, "-map", "[out]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "24", "-movflags", "+faststart", "-an", outFile]);
  // where the camera should look, in clip seconds and clip px: each action's target, the result's block
  let t = 0; const marks = [];
  for (const s of segs) {
    for (const mk of s.marks) if (mk.box) marks.push({ t: +(t + (mk.at - s.a) / s.speed).toFixed(2), kind: mk.kind, box: [mk.box.x * k, mk.box.y * k, mk.box.width * k, mk.box.height * k].map((v) => Math.round(v)) });
    t += (s.b - s.a) / s.speed;
  }
  return { w, h, view: [view.width, view.height], dur: +t.toFixed(2), raw: +segs.reduce((a, s) => a + (s.b - s.a), 0).toFixed(2), marks, kb: Math.round(fs.statSync(outFile).size / 1024) };
}

/** after the capture (its context closed, so the recordings are final): one clip per input → result flow, then the recordings go */
export function cutFlowClips({ rec, manifest, brandDir, view, log = console.log }) {
  const t0 = Date.now(); let total = 0;
  try {
    // one context, usually one page: every flow maps to its page's recording, else (popups, page objects swapped) to the only
    // recording there is; offsets are relative to that recording's start (its page's creation)
    const recs = [...rec.paths.entries()].filter(([, f]) => f && fs.existsSync(f));
    for (const f of rec.flows) {
      let page = f.page, src = rec.paths.get(page), single = false;
      if (!src || !fs.existsSync(src)) { if (recs.length === 1) { [page, src] = recs[0]; single = true; } else src = null; }
      const start = rec.pageT0.get(page), s = (manifest.app?.screens || []).find((x) => x.id === f.id);
      if (!src) { log(`  🎬 ${f.id}: no recording for its page (${recs.length} recording(s) on disk)`); continue; }
      if (!s) { log(`  🎬 ${f.id}: its screen is not in the capture`); continue; }
      const evs = rec.events.filter((e) => e.step >= f.from && e.step <= f.to && (single || e.page === page));
      const segs = planSegments(evs.map((e) => ({ ...e, page })), { ...f, page }, start);
      if (!segs.length) { log(`  🎬 ${f.id}: no actions to cut (steps ${f.from}–${f.to})`); continue; }
      log(`  🎬 ${f.id}: ${path.basename(src)} · steps ${f.from}–${f.to} · ${segs.map((g) => `${g.a.toFixed(1)}–${g.b.toFixed(1)} s${g.speed > 1 ? ` ×${g.speed.toFixed(1)}` : ""}`).join(", ")}`);
      try {
        const file = `clips/${f.id}.mp4`, meta = cutClip({ src, segs, outFile: path.join(brandDir, file), view });
        s.clones = { ...(s.clones || {}), clip: { file, ...meta } }; total += meta.kb;
        log(`  🎬 clip ${f.id}: ${meta.dur} s (from ${meta.raw} s kept of the recording), ${meta.w}×${meta.h}, ${(meta.kb / 1024).toFixed(2)} MB`);
      } catch (e) { log(`  🎬 ${f.id}: cut failed (${e.message})`); }
    }
  } finally {
    // the full recording never leaves the machine
    fs.rmSync(rec.dir, { recursive: true, force: true });
  }
  if (rec.flows.length) log(`  🎬 flow clips: ${rec.flows.length} flows → ${(total / 1024).toFixed(2)} MB of clips in ${((Date.now() - t0) / 1000).toFixed(1)} s; full recording deleted`);
}

/** build time: a clip's frames as JPEGs (Chromium's own build cannot decode H.264; frames also seek exactly) — dir relative to runDir */
export function clipFrames({ brandDir, runDir, clip, id, fps = 15, width = 1440 }) {
  const src = path.join(brandDir, clip.file); if (!fs.existsSync(src)) return null;
  const rel = `clipframes/${id}`, dir = path.join(runDir, rel);
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  run(["-i", src, "-vf", `fps=${fps},scale=${Math.min(width, clip.w)}:-2`, "-q:v", "3", path.join(dir, "%04d.jpg")]);
  const n = fs.readdirSync(dir).filter((f) => f.endsWith(".jpg")).length;
  return n ? { dir: rel, n, fps } : null;
}

// VIDEO_ENGINE=studio (sandbox): a video made the way the MotionGX launch ads were made (MotionGX-ads/), for the
// client's brand: script (one voiceover line + one title per scene) → the client's screens rebuilt as code
// (screenshot-to-code) → ONE ElevenLabs take cut per line → scene timing from the voice → the director's beat-synced
// music → the ads' scene library on one GSAP timeline, every action on its spoken word → stills → 30fps render → mix.
// Build steps 1–4 are MotionGX-ads/lib/build.mjs, ported. Output is a normal live version (video.mp4, script.json,
// music.wav, qa.json, cost.json, video.src.html, poster.jpg) so the studio page works unchanged.
// To remove: delete lib/studio-engine and the "studio" lines in live-engine (config, protocol, jobs, pipeline).
/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import type { JobFile, Step } from "../../live-engine/protocol";
import { Ledger } from "../../live-engine/worker/claude";
import type { Sync } from "../../live-engine/worker/sync";
import { makeDirectorMusic, hashSeed } from "../../director-engine/worker/music";
import { assetsDir as directorAssets } from "../../director-engine/worker/renderer";
import { fitLength, writeScript, type Scene } from "./script";
import { buildScreens } from "./screens";
import { voiceover, voiceFor } from "./voice";

const here = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(here, "..", "assets");
const VIDEO_STEPS: Step[] = ["script", "build", "music", "qa", "render"];
const DIALECT: [RegExp, string][] = [[/^EG$/, "Egyptian Arabic (masri, natural and warm, not formal)"], [/^SA$/, "Saudi Arabic (natural Saudi dialect)"], [/^AE$/, "Gulf Arabic (khaleeji)"], [/^JO$/, "Levantine Arabic (shami)"], [/^US$/, "English"], [/فصحى|Modern Standard/i, "Modern Standard Arabic (فصحى)"]];
// the ads' render constants (build.mjs); scene lengths now follow the voice (no per-type minimums)
const FPS = 30, WORKERS = 4;
const ffmpegPath = async () => process.env.FFMPEG_PATH || ((await import("ffmpeg-static").then((m: any) => m.default).catch(() => null)) as string | null) || "ffmpeg";

export async function runStudio(job: JobFile, dirs: { root: string; brandDir: string; runDir: string }, sync: Sync) {
  const { brandDir, runDir } = dirs, log = sync.log, t0 = Date.now();
  if (job.mode === "rerender") throw new Error("the studio sandbox does not support Apply edits yet — make a new video");
  const brief = job.brief, length = brief.length, format: "P" | "L" = brief.layout === "16:9" ? "L" : "P";
  const model = job.director?.model || "claude-opus-5-5", maxUsd = job.director?.maxUsd ?? 6;
  const ledger = new Ledger(path.join(runDir, "cost.json"), log, (row) => sync.ledgerRow(row));
  const language = DIALECT.find(([re]) => re.test(brief.country))?.[1] ?? `the language of ${brief.country}`;
  const rtl = !/^(US|GB|CA|AU)$/.test(brief.country);
  const brand = JSON.parse(fs.readFileSync(path.join(brandDir, "brand.json"), "utf8"));
  const ffmpeg = await ffmpegPath();
  const sfxDir = path.join(directorAssets(), "sfx");
  log(`■ job ${job.jobId} (video · studio sandbox${job.mode ? ` · ${job.mode}` : ""})\n  brand ${job.slug} · ${brief.objective} · ${language} · ${format === "P" ? "9:16" : "16:9"} · ~${length}s · ${model}`);
  if (brief.layout !== "9:16" && brief.layout !== "16:9") log(`! studio: the ads' stage is 9:16 or 16:9 — ${brief.layout} is made as 9:16`);
  fs.writeFileSync(path.join(runDir, "brief.json"), JSON.stringify({ ...brief, engine: "studio", model, maxUsd, mode: job.mode, edit: job.edit ?? null }, null, 2));
  const cap$ = () => { if (ledger.total() >= maxUsd) throw new Error(`cost cap reached ($${ledger.total().toFixed(2)} of $${maxUsd})`); };

  // the page folder: the ads' lib (stage.css, scenes.js, gsap), the capture (logo, images, fonts) as capture/
  const pageDir = path.join(runDir, "studio");
  fs.mkdirSync(path.join(pageDir, "lib"), { recursive: true });
  for (const f of ["stage.css", "scenes.js", "gsap.min.js"]) fs.copyFileSync(path.join(ASSETS, f), path.join(pageDir, "lib", f));
  if (!fs.existsSync(path.join(pageDir, "capture"))) fs.symlinkSync(brandDir, path.join(pageDir, "capture"), "dir");
  const fontsCss = path.join(brandDir, "clones", "fonts.css");
  if (fs.existsSync(fontsCss)) fs.writeFileSync(path.join(pageDir, "lib", "brand-fonts.css"), fs.readFileSync(fontsCss, "utf8").replace(/url\((['"]?)(?!data:)(\.\.\/)?assets\//g, "url($1../capture/assets/"));
  const display = brand.fonts?.display || "Readex Pro";
  const google = `https://fonts.googleapis.com/css2?family=Readex+Pro:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700${(brand.fonts?.google_fonts ?? []).filter((f: string) => f !== "Readex Pro").map((f: string) => `&family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600;700`).join("")}&display=block`;
  const fontsHead = `<link rel="stylesheet" href="${google}">${fs.existsSync(path.join(pageDir, "lib", "brand-fonts.css")) ? `<link rel="stylesheet" href="lib/brand-fonts.css">` : ""}`;

  // ── 0. script ─────────────────────────────────────────────────────────
  await sync.stage("script");
  const screens = (brand.screens ?? []).filter((s: any) => !s.empty && (s.view || s.file)).map((s: any) => ({ id: s.id, label: s.label, shows: s.shows, app: !!s.app, mobile: Boolean(s.clones?.mobile), features: s.features }));
  const description = [brief.description, job.mode === "edit" && job.edit?.request ? `Direction from the client: ${job.edit.request}` : ""].filter(Boolean).join("\n");
  // the brand's real photos the story may show (never the capture's test data)
  const images = (brand.images ?? []).filter((i: any) => !i.demo && i.file && fs.existsSync(path.join(brandDir, i.file))).slice(0, 30).map((i: any) => ({ file: `capture/${i.file}`, kind: String(i.kind ?? ""), note: String(i.note ?? i.alt ?? "") }));
  const script = await writeScript({ brand, screens, images, brief: { ...brief, description }, language, length, ledger, model, log });
  cap$();

  // ── 0b. the client's screens, rebuilt as code (screenshot-to-code) ───
  await sync.stage("build");
  await buildScreens({ scenes: script.scenes, brand, brandDir, pageDir, fontsHead, ledger, model, rtl, log });
  cap$();

  // ── 0c. voiceover: one ElevenLabs take, kept whole ───────────────────
  const voiceLines = script.scenes.map((s) => s.vo), voice = voiceFor(brief.country), voDir = path.join(runDir, "vo");
  let take = await voiceover({ lines: voiceLines, voice, dir: voDir, ledger, log });

  // ── 1. timing — the scenes follow the voice: one continuous read, every cut on a pause between lines, the video
  // exactly the brief's length (the studio plays length_s): the read's pace adjusts once if it can't fit ──
  await sync.stage("music");
  const TARGET = length, INTRO = 0.55, HOLD = 1.6, MAX_HOLD = 3.5, MAX_BREATH = 0.8; // the opening frame lands before the first words; the end card holds after the last
  const room = TARGET - INTRO - HOLD;
  if (take.total > room + 0.05) {
    // too long for the video: the lines shortened to what fits at this take's measured pace, then one more take
    const chars = voiceLines.reduce((a, l) => a + l.length, 0), fit = Math.floor((chars * room) / take.total);
    log(`! timing: the read is ${take.total.toFixed(1)}s for ${room.toFixed(1)}s of room — shortening to ~${fit} characters`);
    await fitLength(script.scenes, { length, language, ledger, model, log, max: fit });
    script.scenes.forEach((s, i) => (voiceLines[i] = s.vo));
    take = await voiceover({ lines: voiceLines, voice, dir: voDir, ledger, log });
  }
  // a read shorter than the video: short breaths between the lines (each line keeps its own natural read), the end card
  // holds what is left (at most MAX_HOLD + what the breaths can't take)
  const n = take.lines.length, spare = Math.max(0, TARGET - INTRO - take.total - HOLD);
  const breath = n > 1 ? Math.min(MAX_BREATH, Math.max(0, spare - (MAX_HOLD - HOLD)) / (n - 1)) : 0;
  const lineAt = (i: number) => INTRO + i * breath; // where line i's part of the take is placed
  const total = +Math.max(TARGET, lineAt(n - 1) + take.total + 0.6).toFixed(3);
  if (total > TARGET) log(`! timing: the voice runs ${(total - TARGET).toFixed(1)}s past ${TARGET}s`);
  if (breath > 0) log(`  timing: a ${breath.toFixed(2)}s breath between lines, the end card holds ${(TARGET - lineAt(n - 1) - take.total).toFixed(1)}s`);
  // each scene starts a breath before its line (the first at 0), right after the previous line's last word
  const cuts = take.lines.map((l, i) => (i === 0 ? 0 : +(Math.max(lineAt(i - 1) + take.lines[i - 1].t1 + 0.08, lineAt(i) + l.t0 - 0.3)).toFixed(3)));
  const rough = cuts.map((c, i) => ({ name: `s${i}`, start: c, bars: ((i + 1 < cuts.length ? cuts[i + 1] : total) - c) / 2, purpose: script.scenes[i].purpose }));
  const musicFile = path.join(runDir, "music.wav");
  const mus: any = makeDirectorMusic({ script: { length: total, music: { mood: script.mood }, scenes: rough }, file: musicFile, seed: hashSeed(job.jobId) });
  const scenes = script.scenes.map((s, i) => {
    const l = take.lines[i];
    return { ...s, start: mus.scenes[i].start, end: mus.scenes[i].end, vo: { start: +(lineAt(i) + l.t0).toFixed(3), end: +(lineAt(i) + l.t1).toFixed(3) }, words: l.words.map((w) => ({ w: w.w, t: +(lineAt(i) + w.t).toFixed(3), e: +(lineAt(i) + w.e).toFixed(3) })) };
  });
  log(`✓ timing: ${total.toFixed(1)}s, ${mus.bpm} bpm, one take from ${INTRO}s`);

  // the studio's script.json (same shape as the director's)
  const studioScript = { idea: script.idea, language, music: { mood: script.mood, drops: mus.drops ?? [] }, length: total, bpm: mus.bpm, engine: "studio",
    scenes: scenes.map((s, i) => ({ start: s.start, bars: +((s.end - s.start) / 2).toFixed(4), purpose: s.purpose, headline: s.title, ...(s.sub ? { sub: s.sub } : {}), visual: { type: s.type, detail: s.type === "screen" ? `${s.data?.screen} (${s.data?.device})` : s.type }, name: `s${i}` })) };
  fs.writeFileSync(path.join(runDir, "script.json"), JSON.stringify(studioScript, null, 2));

  // ── 2. page (build.mjs) — the client's brand where the ads had MotionGX's ─
  const p = brand.palette ?? {};
  const primary = p.primary || "#5558e3";
  const B = {
    name: rtl ? brand.name_ar || brand.name : brand.name, latin: String(brand.name ?? "").toUpperCase(), tagline: brand.tagline ?? "",
    colors: [primary, p.ink || "#14141c", p.surface || p.background || "#f6f4ee", p.accent || primary], glyph: String(brand.name_ar || brand.name || "·").trim()[0],
    font: display, url: String(brand.site ?? brief.url ?? "").replace(/^https?:\/\//, "").replace(/\/$/, ""), industry: "",
    logo: brand.logo?.file && fs.existsSync(path.join(brandDir, brand.logo.file)) ? `capture/${brand.logo.file}` : null, logoOnDark: brand.logo?.on_dark === true,
  };
  const theme = { brand: primary, brand2: p.accent || primary, lav: `color-mix(in srgb, ${primary} 22%, white)` };
  const AD = { format, en: !rtl, country: /^(SA|AE|KW|QA|BH|OM)$/.test(brief.country) ? "sa" : "eg", brandKey: job.slug, brand: B, theme, hookArt: script.hook_art === "app" ? "app" : "blank", beat: mus.beat, duration: total, scenes };
  const wm = B.logo ? `<img src="${B.logo}" style="height:${format === "P" ? 64 : 56}px;max-width:320px;object-fit:contain;display:block">` : `${B.latin}`;
  const html = `<!doctype html><html lang="${rtl ? "ar" : "en"}"><head><meta charset="utf-8">${fontsHead}<link rel="stylesheet" href="lib/stage.css"></head>
<body class="${format}"><div id="stage"${rtl ? "" : ' style="direction:ltr"'}><div class="aurora"><i></i><i></i><i></i></div><div class="wm">${wm}</div><div class="flash"></div><div class="grain"></div></div>
<script src="lib/gsap.min.js"></script><script>window.AD=${JSON.stringify(AD).replace(/</g, "\\u003c")};</script>
<script>document.fonts.ready.then(()=>{const s=document.createElement("script");s.src="lib/scenes.js";document.body.appendChild(s);});</script></body></html>`;
  const pageFile = path.join(pageDir, "video.html");
  fs.writeFileSync(pageFile, html);
  fs.copyFileSync(pageFile, path.join(runDir, "video.src.html"));

  // ── 3. audio: the voice (one continuous take) + music (ducked under the voice) + SFX (build.mjs's mix) ─
  async function mix(sfxList: { t: number; src: string; vol: number }[], out: string) {
    const inputs = ["-i", musicFile, "-i", take.file], parts: string[] = [];
    if (breath > 0) {
      // the take in one part per line, cut in the pause between lines, each part moved by its breaths
      const edge = (i: number) => (i === 0 ? 0 : (take.lines[i - 1].t1 + take.lines[i].t0) / 2);
      parts.push(`[1:a]aresample=44100,aformat=channel_layouts=mono,asplit=${n}${take.lines.map((_, i) => `[t${i}]`).join("")}`);
      take.lines.forEach((_, i) => parts.push(`[t${i}]atrim=start=${edge(i).toFixed(3)}${i + 1 < n ? `:end=${edge(i + 1).toFixed(3)}` : ""},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,areverse,afade=t=in:d=0.03,areverse,adelay=${Math.round((lineAt(i) + edge(i)) * 1000)}:all=1[p${i}]`));
      parts.push(`${take.lines.map((_, i) => `[p${i}]`).join("")}amix=inputs=${n}:normalize=0,acompressor=threshold=0.12:ratio=3:attack=5:release=120,volume=1.6,asplit=2[vo][vosc]`);
    } else parts.push(`[1:a]aresample=44100,aformat=channel_layouts=mono,adelay=${Math.round(INTRO * 1000)}:all=1,acompressor=threshold=0.12:ratio=3:attack=5:release=120,volume=1.6,asplit=2[vo][vosc]`);
    parts.push(`[0:a]volume=0.55[mus]`, `[mus][vosc]sidechaincompress=threshold=0.04:ratio=6:attack=25:release=400:makeup=1[duck]`);
    const fx = sfxList.filter((x) => fs.existsSync(path.join(sfxDir, x.src)));
    fx.forEach((x, k) => { inputs.push("-i", path.join(sfxDir, x.src)); parts.push(`[${2 + k}:a]aresample=44100,adelay=${Math.round(x.t * 1000)}:all=1,volume=${x.vol * 0.8}[f${k}]`); });
    parts.push(`[vo][duck]${fx.map((_, k) => `[f${k}]`).join("")}amix=inputs=${2 + fx.length}:normalize=0:duration=longest,apad,atrim=0:${total},loudnorm=I=-14:TP=-1.5:LRA=11[aout]`);
    execFileSync(ffmpeg, ["-loglevel", "error", "-y", ...inputs, "-filter_complex", parts.join(";"), "-map", "[aout]", "-t", String(total), "-ar", "48000", "-c:a", "aac", "-b:a", "192k", out]);
  }

  // ── 4. stills + render (frames split across parallel pages, one H.264 segment each, then joined) (build.mjs) ─
  await sync.stage("qa");
  const [W, H] = format === "P" ? [1080, 1920] : [1920, 1080];
  const browser = await chromium.launch();
  const errors: string[] = [];
  const open = async () => {
    const pg = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    pg.on("pageerror", (e) => errors.push(e.message));
    // the web fonts can be slow when several pages load at once: wait longer, retry once
    for (let k = 0; k < 2; k++) {
      try { await pg.goto("file://" + pageFile, { waitUntil: "domcontentloaded", timeout: 90000 }); await pg.waitForFunction("window.__ready === true", null, { timeout: 90000 }); break; }
      catch (e) { if (k) throw e; }
    }
    return pg;
  };
  const out = path.join(runDir, "video.mp4");
  try {
    const first = await open();
    const sfxList = (await first.evaluate("window.__sfx || []")) as { t: number; src: string; vol: number }[];
    // the stills the ads were checked on: the end of every scene ("--stills ends"), and the poster
    fs.mkdirSync(path.join(pageDir, "frames"), { recursive: true });
    for (const s of scenes) { const ts = +(s.end - 0.45).toFixed(2); await first.evaluate(`window.__seek(${ts})`); await first.screenshot({ path: path.join(pageDir, "frames", `t${ts.toFixed(2)}.jpg`), type: "jpeg", quality: 80 }); }
    const reveal = scenes.find((s) => s.type === "reveal") ?? scenes[0];
    await first.evaluate(`window.__seek(${Math.min(reveal.end - 0.5, reveal.start + 1.6)})`);
    await first.screenshot({ path: path.join(runDir, "poster.jpg"), type: "jpeg", quality: 90 });
    if (errors.length) log(`  page errors: ${errors.slice(0, 5).join(" | ")}`);
    await sync.stage("render");
    const totalFrames = Math.round(total * FPS), per = Math.ceil(totalFrames / WORKERS);
    const pages = [first, ...(await Promise.all(Array.from({ length: WORKERS - 1 }, open)))];
    let doneFrames = 0;
    const segs = await Promise.all(pages.map(async (pg, w) => {
      const seg = path.join(pageDir, `.seg${w}.mp4`), a = w * per, b = Math.min(totalFrames, a + per);
      const enc = spawn(ffmpeg, ["-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "17", "-r", String(FPS), seg]);
      const fin = new Promise<void>((ok, no) => enc.on("close", (c) => (c === 0 ? ok() : no(new Error("encode failed")))));
      for (let f = a; f < b; f++) {
        await pg.evaluate(`window.__seek(${f / FPS})`);
        const jpg = await pg.screenshot({ type: "jpeg", quality: 92 });
        if (!enc.stdin.write(jpg)) await new Promise((r) => enc.stdin.once("drain", r));
        if (++doneFrames % 300 === 0) log(`  render ${doneFrames}/${totalFrames}`);
      }
      enc.stdin.end(); await fin; return seg;
    }));
    const list = path.join(pageDir, ".segs.txt"), silent = path.join(pageDir, ".silent.mp4"), audio = path.join(pageDir, ".audio.m4a");
    fs.writeFileSync(list, segs.map((x) => `file '${x}'`).join("\n"));
    execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", silent]);
    await mix(sfxList, audio);
    execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-i", silent, "-i", audio, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "copy", "-shortest", "-movflags", "+faststart", out]);
    for (const x of [...segs, list, silent, audio]) fs.rmSync(x, { force: true });
  } finally {
    await browser.close();
  }
  log(`✓ render: ${out} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB)`);

  // ── deliver: a normal live version ────────────────────────────────────
  const at = new Date().toISOString();
  fs.writeFileSync(path.join(runDir, "qa.json"), JSON.stringify({ engine: "studio", shipped: "studio", errors: 0, warnings: errors.length, history: [{ tag: "studio", errors: 0, warnings: errors.length, at }], issues: errors.slice(0, 20).map((m) => ({ sev: "warning", code: "page-error", msg: m })) }, null, 2));
  fs.writeFileSync(path.join(runDir, "share-copy.txt"), script.share_copy);
  fs.writeFileSync(path.join(runDir, "studio-script.json"), JSON.stringify({ ...script, scenes: script.scenes.map((s: Scene) => ({ ...s, data: s.data ? { ...s.data, html: s.data.html ? `(${String(s.data.html).length} chars)` : undefined } : undefined })) }, null, 2));
  await sync.uploadRun(["video.mp4", "video.src.html", "script.json", "music.wav", "qa.json", "cost.json", "share-copy.txt", "poster.jpg", "brief.json", "studio-script.json"]);
  for (const s of VIDEO_STEPS) if (!job.doneSteps.includes(s)) await sync.stepDone(s, s === "render" ? { bytes: fs.statSync(out).size } : undefined);
  const summary = {
    jobId: job.jobId, kind: job.kind, engine: "studio", model, brand: job.slug, seconds: Math.round((Date.now() - t0) / 1000),
    qa: { shipped: "studio", errors: 0, history: [] },
    cost: { total: ledger.total(), brand_one_time: 0, per_video: +ledger.total().toFixed(4), cap: maxUsd, byStep: ledger.byStep(), calls: ledger.rows.length },
    share_copy: script.share_copy, angle: script.idea, fingerprint: null,
  };
  fs.writeFileSync(path.join(runDir, "summary.json"), JSON.stringify(summary, null, 2));
  log(`■ done in ${summary.seconds}s · studio · this video $${summary.cost.per_video} (cap $${maxUsd})`);
  return summary;
}

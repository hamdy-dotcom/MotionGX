// Per-video music in seconds: arrange pre-rendered stems (scripts/music/stems.py) along the energy map
// with an ffmpeg filter graph, place SFX from the timeline's events, master to −14 LUFS / −1 dBTP.
//   build    = swept drums ending on the drop + riser (+ pad)
//   drop     = full kit + side-chained 808 + lead (+ crash); the CTA drop gets the bigger lead
//   breakdown= pad + half-time
//   hits     = impact + sub drop (logo/CTA biggest)
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import type { EnergyMap } from "@motiongx/primitives";
import { master, wav16 } from "./loudness";
import { projectPath } from "./paths";
import type { SoundEvent } from "./spec";

const run = promisify(execFile);
const FFMPEG = () => projectPath("node_modules", ".bin", "remotion");
export const STEMS_DIR = () => process.env.MOTIONGX_STEMS_DIR ?? projectPath(".stems");
const BPMS = [90, 110, 128];

type Placement = { file: string; at: number; dur: number; gain: number; loop?: boolean; offset?: number };

export type MusicResult = {
  /** mastered mix (WAV — plays in the preview immediately; encodeMp3() makes the storage copy later) */
  mix: string;
  /** SFX-only bed (music off) */
  sfx: string;
  mixWav: string;
  lufs: number | null;
  truePeak: number | null;
  placements: number;
  /** arrange = plan, measure = ffmpeg mix pass, master = loudness + limiter + mp3 encode */
  ms: { arrange: number; measure: number; master: number };
};

/** Lay stems along the energy map. Pure: returns placements (seconds, linear gain). */
export function arrange(energy: EnergyMap, mood: string, events: SoundEvent[], stems = STEMS_DIR()): { music: Placement[]; sfx: Placement[] } {
  const bpm = BPMS.reduce((a, b) => (Math.abs(b - energy.bpm) < Math.abs(a - energy.bpm) ? b : a));
  const dir = path.join(stems, mood in MOODS ? mood : "energetic", String(bpm));
  const one = (n: string) => path.join(stems, mood in MOODS ? mood : "energetic", `${n}.wav`);
  const f = (n: string) => path.join(dir, `${n}.wav`);
  const beat = 60 / bpm;
  const bar = 4 * beat;
  const L = energy.length_s;
  const music: Placement[] = [];
  /** a bar-locked loop from s0 to s1 (phase-aligned to the song's bar grid) */
  const loop = (n: string, s0: number, s1: number, gain: number, loopBars: number) => {
    if (s1 - s0 < 0.05) return;
    const len = loopBars * bar;
    music.push({ file: f(n), at: s0, dur: s1 - s0, gain, loop: true, offset: ((s0 % len) + len) % len });
  };
  const ctaT = energy.hits.find((h) => h.kind === "cta")?.t;
  const secs = energy.sections;
  secs.forEach((s, i) => {
    const { start_s: s0, end_s: s1, kind } = s;
    const e = Math.max(0, Math.min(1, s.energy ?? 0.5));
    const next = secs[i + 1];
    const prev = secs[i - 1];
    if (kind === "intro") {
      loop("pad_dark", s0, s1, 0.9, 4);
      if (e > 0.25) loop("hats", s0, s1, 0.35 + 0.4 * e, 1);
      if (next && (next.kind === "drop" || next.kind === "build") && s1 - s0 >= bar) music.push({ file: f("revcym_1"), at: s1 - bar, dur: bar, gain: 0.7 });
    } else if (kind === "build") {
      const len = s1 - s0;
      const k = [4, 2, 1].find((b) => b * bar <= len + 0.02) ?? 1;
      const bStart = Math.max(s0, s1 - k * bar);
      if (bStart - s0 > 0.1) loop("drums_half", s0, bStart, 0.55, 1);
      music.push({ file: f(`build_${k}`), at: bStart, dur: s1 - bStart, gain: 0.9, offset: Math.max(0, k * bar - (s1 - bStart)) });
      music.push({ file: f(`riser_${k}`), at: bStart, dur: s1 - bStart, gain: 0.8, offset: Math.max(0, k * bar - (s1 - bStart)) });
      loop("pad", s0, s1, 0.7, 4);
    } else if (kind === "drop") {
      const big = ctaT !== undefined && ctaT >= s0 - 0.02 && ctaT <= s1 + 0.02;
      loop("drums_full", s0, s1, 0.95, 1);
      loop("bass", s0, s1, 0.85, 4);
      loop(big ? "lead_big" : "lead", s0, s1, big ? 0.9 : 0.75, 4);
      loop("pad", s0, s1, 0.45, 4);
      music.push({ file: one("crash"), at: s0, dur: 2.5, gain: big ? 0.9 : 0.65 });
      if (prev?.kind !== "build" && s0 > 0.5) {
        const span = Math.min(bar, s0);
        music.push({ file: f("riser_1"), at: s0 - span, dur: span, gain: 0.75, offset: bar - span });
      }
    } else if (kind === "breakdown") {
      loop("pad", s0, s1, 0.95, 4);
      loop("drums_half", s0, s1, 0.4, 1);
      if (next && s1 - s0 >= 2 * bar) music.push({ file: f("revcym_2"), at: s1 - 2 * bar, dur: 2 * bar, gain: 0.6 });
      else if (next && s1 - s0 >= bar) music.push({ file: f("revcym_1"), at: s1 - bar, dur: bar, gain: 0.6 });
    } else {
      // outro
      loop("drums_half", s0, s1, 0.6, 1);
      loop("pad", s0, s1, 0.7, 4);
      loop("lead", s0, s1, 0.4, 4);
    }
  });
  for (const h of energy.hits) {
    const g = { cta: 1, logo: 0.95, drop: 0.85, impact: 0.75, reveal: 0.6 }[h.kind] ?? 0.7;
    music.push({ file: one("impact"), at: h.t, dur: 2, gain: 1.0 * g });
    music.push({ file: one("subdrop"), at: h.t, dur: 1, gain: 0.95 * g });
  }
  const sfxGain: Record<SoundEvent["kind"], [string, number]> = { whoosh: ["whoosh", 0.45], pop: ["pop", 0.5], click: ["click", 0.35], riser: ["riser", 0.5], impact: ["impact", 0.35], subdrop: ["subdrop", 0.35] };
  const sfx: Placement[] = events
    .filter((e) => e.t < L - 0.05)
    .map((e) => {
      const [name, g] = sfxGain[e.kind];
      return { file: name === "riser" ? f("riser_1") : one(name), at: e.t, dur: Math.min(2, L - e.t), gain: g };
    });
  // keep everything inside the video
  const clip = (p: Placement) => ({ ...p, dur: Math.max(0.01, Math.min(p.dur, L - p.at)) });
  return { music: music.filter((p) => p.at < L).map(clip), sfx: sfx.map(clip) };
}

const MOODS: Record<string, true> = { energetic: true, warm: true, corporate: true, luxury: true };

/** ffmpeg inputs + filter graph for a list of placements, mixed into [label] */
function graph(placements: Placement[], firstInput: number, label: string) {
  const inputs: string[] = [];
  const parts: string[] = [];
  placements.forEach((p, k) => {
    if (p.loop) inputs.push("-stream_loop", "-1");
    inputs.push("-i", p.file);
    const idx = firstInput + k;
    const ms = Math.max(0, Math.round(p.at * 1000));
    parts.push(`[${idx}:a]atrim=start=${(p.offset ?? 0).toFixed(4)}:duration=${p.dur.toFixed(4)},asetpts=PTS-STARTPTS,volume=${p.gain.toFixed(3)},adelay=${ms}|${ms}[${label}${k}]`);
  });
  const mix = `${placements.map((_, k) => `[${label}${k}]`).join("")}amix=inputs=${placements.length}:normalize=0:dropout_transition=0[${label}]`;
  return { inputs, filter: [...parts, mix].join(";") };
}

/** The ffmpeg binary itself (the `remotion ffmpeg` wrapper costs ~1.4 s of Node start-up per call). */
function ffmpegBin(): { cmd: string; pre: string[]; env: NodeJS.ProcessEnv } {
  const root = projectPath("node_modules", ".pnpm");
  try {
    const dir = readdirSync(root).find((d) => d.startsWith(`@remotion+compositor-${process.platform}-${process.arch}`));
    if (dir) {
      const pkg = path.join(root, dir, "node_modules", "@remotion", dir.split("@")[1].replace("remotion+", ""));
      if (existsSync(path.join(pkg, "ffmpeg"))) return { cmd: path.join(pkg, "ffmpeg"), pre: [], env: { ...process.env, DYLD_LIBRARY_PATH: pkg, LD_LIBRARY_PATH: pkg } };
    }
  } catch {
    /* fall through */
  }
  return { cmd: FFMPEG(), pre: ["ffmpeg"], env: process.env };
}

/**
 * Arrange + master in ~1 s: one ffmpeg pass mixes the stems (filter graph) to raw PCM + renders the
 * SFX-only track; loudness (BS.1770) and the limiter run in-process; then the MP3 encode.
 */
export async function renderMusic(opts: { energy: EnergyMap; mood: string; events: SoundEvent[]; outDir: string }): Promise<MusicResult> {
  const t0 = Date.now();
  mkdirSync(opts.outDir, { recursive: true });
  if (!existsSync(STEMS_DIR())) throw new Error(`stem library missing at ${STEMS_DIR()} — run scripts/music/stems.py`);
  const { music, sfx } = arrange(opts.energy, opts.mood, opts.events);
  const L = opts.energy.length_s;
  const silent: Placement = { file: path.join(STEMS_DIR(), "energetic", "click.wav"), at: 0, dur: 0.01, gain: 0 };
  const sfxList = sfx.length ? sfx : [silent];
  const m = graph(music, 0, "m");
  const s = graph(sfxList, music.length, "s");
  const x = graph(sfxList, music.length + sfxList.length, "x");
  // music ducks for 120 ms before every hit so the hit is the dominant transient (a pre-drop gap)
  const dips = opts.energy.hits.map((h) => `between(t,${(h.t - 0.12).toFixed(3)},${(h.t - 0.005).toFixed(3)})`).join("+");
  const duck = dips ? `,volume='if(${dips},0.35,1)':eval=frame` : "";
  // clean ending on the last frame: 0.35 s release (this ffmpeg build has no afade)
  const end = `volume='if(gt(t,${(L - 0.35).toFixed(3)}),max(0,(${L.toFixed(3)}-t)/0.35),1)':eval=frame`;
  const fit = `atrim=duration=${L.toFixed(3)},apad=whole_dur=${L.toFixed(3)}`;
  const fc = [m.filter, s.filter, x.filter, `[m]anull${duck}[md]`, `[md][s]amix=inputs=2:normalize=0:dropout_transition=0,${fit},${end}[mix]`, `[x]${fit},volume=1.6[sfxo]`, `[mix]volume=0.25[mixh]`].join(";");
  const arrangeMs = Date.now() - t0;

  const ff = ffmpegBin();
  const raw = path.join(opts.outDir, "mix-raw.wav");
  const sfxWav = path.join(opts.outDir, "sfx.wav");
  let t1 = Date.now();
  await run(ff.cmd, [...ff.pre, "-hide_banner", "-nostats", "-loglevel", "error", "-y", ...m.inputs, ...s.inputs, ...x.inputs, "-filter_complex", fc, "-map", "[mixh]", "-c:a", "pcm_s24le", "-ac", "2", "-ar", "44100", raw, "-map", "[sfxo]", "-c:a", "pcm_s16le", sfxWav], { env: ff.env, maxBuffer: 1 << 24 });
  const mixMs = Date.now() - t1;

  t1 = Date.now();
  const f = readFileSync(raw);
  // 24-bit WAV with 12 dB headroom (this ffmpeg build has no float PCM encoder); mastering re-gains it
  let off = 12;
  while (off + 8 <= f.length && f.toString("ascii", off, off + 4) !== "data") off += 8 + f.readUInt32LE(off + 4);
  const start = off + 8;
  const frames = Math.floor((f.length - start) / 6);
  const data = new Float32Array(frames * 2);
  for (let i = 0; i < frames * 2; i++) {
    const p = start + i * 3;
    data[i] = (((f[p] | (f[p + 1] << 8) | (f[p + 2] << 16)) << 8) >> 8) / 8388608;
  }
  const n = data.length / 2;
  const Lc = new Float32Array(n);
  const Rc = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    Lc[i] = data[2 * i];
    Rc[i] = data[2 * i + 1];
  }
  const mastered = master(Lc, Rc, -14);
  const mixWav = path.join(opts.outDir, "mix.wav");
  writeFileSync(mixWav, wav16(Lc, Rc));
  rmSync(raw, { force: true });
  const masterMs = Date.now() - t1;

  writeFileSync(path.join(opts.outDir, "arrangement.json"), JSON.stringify({ music, sfx }, null, 1));
  return {
    mix: mixWav,
    sfx: sfxWav,
    mixWav,
    lufs: Number(mastered.lufs.toFixed(2)),
    truePeak: Number(mastered.peakDb.toFixed(2)),
    placements: music.length + sfx.length,
    ms: { arrange: arrangeMs, measure: mixMs, master: masterMs },
  };
}

/**
 * MP3s for storage/export — off the critical path (the preview plays the WAVs; ~1 s per 30 s track on
 * a slow CPU). Returns the mp3 paths in the same order.
 */
export async function encodeMp3(wavs: string[]): Promise<string[]> {
  const ff = ffmpegBin();
  return Promise.all(
    wavs.map(async (w) => {
      const out = w.replace(/\.wav$/, ".mp3");
      await run(ff.cmd, [...ff.pre, "-hide_banner", "-nostats", "-loglevel", "error", "-y", "-i", w, "-c:a", "libmp3lame", "-b:a", "192k", "-compression_level", "7", out], { env: ff.env });
      return out;
    }),
  );
}

/** Hit timing check on the mastered mix (onset within ±200 ms of each planned hit). */
export async function measureHits(mixWav: string, energy: EnergyMap, workDir: string) {
  const ef = path.join(workDir, "energy.json");
  writeFileSync(ef, JSON.stringify(energy));
  const py = existsSync(projectPath(".venv", "bin", "python")) ? projectPath(".venv", "bin", "python") : "python3";
  const { stdout } = await run(py, [projectPath("scripts", "music", "measure_hits.py"), mixWav, ef]);
  return JSON.parse(stdout) as { kind: string; expected_s: number; measured_s: number; offset_ms: number }[];
}

export const readArrangement = (dir: string) => JSON.parse(readFileSync(path.join(dir, "arrangement.json"), "utf8"));

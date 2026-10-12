// Post-encode verification of every exported MP4 (idea from genmotion's probe/attestation, MIT; our code).
// Remotion's trimmed ffmpeg has no blackdetect/freezedetect, so we decode a small grey thumbnail stream
// and a mono PCM track and check them here:
//   • container: duration ≈ expected, fps, size, H.264 video, an audio stream
//   • audio is actually audible (not digital silence)
//   • no black stretches (uniform near-black frames ≥ 0.4 s)
//   • no frozen stretches (no pixel change ≥ 1.5 s), except the final hold
import { execFile } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { projectPath } from "./paths";

const run = promisify(execFile);

function bin(name: "ffmpeg" | "ffprobe") {
  const root = projectPath("node_modules", ".pnpm");
  const dir = readdirSync(root).find((d) => d.startsWith(`@remotion+compositor-${process.platform}-${process.arch}`));
  if (!dir) throw new Error("remotion compositor binaries not found");
  const pkg = path.join(root, dir, "node_modules", "@remotion", dir.split("@")[1].replace("remotion+", ""));
  return { cmd: path.join(pkg, name), env: { ...process.env, DYLD_LIBRARY_PATH: pkg, LD_LIBRARY_PATH: pkg } };
}

export type Mp4Check = { name: string; ok: boolean; detail: string };
export type Mp4Verification = { ok: boolean; checks: Mp4Check[]; problems: string[]; warnings: string[]; stats: { duration: number; fps: number; width: number; height: number; audioDb: number | null } };

const TW = 72;
const TH = 128;
const SAMPLE_FPS = 10;

export async function verifyMp4(file: string, expect: { duration: number; fps: number; width: number; height: number; audio: boolean; finalHoldS?: number }): Promise<Mp4Verification> {
  if (!existsSync(file)) return { ok: false, checks: [{ name: "file", ok: false, detail: "missing" }], problems: ["file missing"], warnings: [], stats: { duration: 0, fps: 0, width: 0, height: 0, audioDb: null } };
  const probe = bin("ffprobe");
  const { stdout } = await run(probe.cmd, ["-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name,width,height,r_frame_rate", "-of", "json", file], { env: probe.env, maxBuffer: 4 << 20 });
  const info = JSON.parse(stdout) as { format: { duration?: string }; streams: { codec_type: string; codec_name: string; width?: number; height?: number; r_frame_rate?: string }[] };
  const v = info.streams.find((s) => s.codec_type === "video");
  const a = info.streams.find((s) => s.codec_type === "audio");
  const duration = Number(info.format.duration ?? 0);
  const [n, d] = (v?.r_frame_rate ?? "0/1").split("/").map(Number);
  const fps = d ? n / d : 0;
  const checks: Mp4Check[] = [];
  const frame = 1 / expect.fps;
  checks.push({ name: "duration", ok: Math.abs(duration - expect.duration) <= 2 * frame + 0.05, detail: `${duration.toFixed(3)}s (expected ${expect.duration}s)` });
  checks.push({ name: "fps", ok: Math.abs(fps - expect.fps) < 0.01, detail: `${fps.toFixed(2)} (expected ${expect.fps})` });
  checks.push({ name: "size", ok: v?.width === expect.width && v?.height === expect.height, detail: `${v?.width}×${v?.height} (expected ${expect.width}×${expect.height})` });
  checks.push({ name: "video codec", ok: v?.codec_name === "h264", detail: v?.codec_name ?? "no video stream" });
  if (expect.audio) checks.push({ name: "audio stream", ok: Boolean(a), detail: a ? a.codec_name : "missing" });

  const ff = bin("ffmpeg");
  // audio level (RMS dBFS of a mono 8 kHz decode)
  let audioDb: number | null = null;
  if (a) {
    // (the trimmed ffmpeg has no raw s16le muxer: decode to WAV and read past the "data" chunk header)
    const { stdout: wav } = await run(ff.cmd, ["-v", "error", "-i", file, "-vn", "-ac", "1", "-ar", "8000", "-f", "wav", "-acodec", "pcm_s16le", "pipe:1"], { env: ff.env, encoding: "buffer", maxBuffer: 64 << 20 });
    const at = wav.indexOf("data");
    const pcm = at >= 0 ? wav.subarray(at + 8) : Buffer.alloc(0);
    let sum = 0;
    const count = Math.floor(pcm.length / 2);
    for (let i = 0; i < count; i++) {
      const s = pcm.readInt16LE(i * 2) / 32768;
      sum += s * s;
    }
    audioDb = count ? 10 * Math.log10(sum / count + 1e-12) : -120;
    if (expect.audio) checks.push({ name: "audio audible", ok: audioDb > -50, detail: `${audioDb.toFixed(1)} dBFS RMS` });
  }

  // grey thumbnails at 10 fps
  const { stdout: raw } = await run(ff.cmd, ["-v", "error", "-i", file, "-an", "-vf", `scale=${TW}:${TH},format=gray`, "-r", String(SAMPLE_FPS), "-f", "image2pipe", "-c:v", "rawvideo", "pipe:1"], { env: ff.env, encoding: "buffer", maxBuffer: 256 << 20 });
  const size = TW * TH;
  const frames = Math.floor(raw.length / size);
  const stats = Array.from({ length: frames }, (_, f) => {
    let sum = 0;
    let sq = 0;
    for (let i = 0; i < size; i++) {
      const p = raw[f * size + i];
      sum += p;
      sq += p * p;
    }
    const mean = sum / size;
    return { mean, std: Math.sqrt(Math.max(0, sq / size - mean * mean)) };
  });
  const diffs = Array.from({ length: frames }, (_, f) => {
    if (f === 0) return Infinity;
    let s = 0;
    for (let i = 0; i < size; i++) s += Math.abs(raw[f * size + i] - raw[(f - 1) * size + i]);
    return s / size;
  });
  const runs = (pred: (i: number) => boolean) => {
    const out: [number, number][] = [];
    let start = -1;
    for (let i = 0; i <= frames; i++) {
      if (i < frames && pred(i)) {
        if (start < 0) start = i;
      } else if (start >= 0) {
        out.push([start / SAMPLE_FPS, i / SAMPLE_FPS]);
        start = -1;
      }
    }
    return out;
  };
  const warnings: string[] = [];
  const blackAll = runs((i) => stats[i].mean < 18 && stats[i].std < 5).filter(([s, e]) => e - s >= 0.4);
  // a short near-black opening (< 1 s, content fading in) is a creative warning, not a broken encode
  const darkOpen = blackAll.filter(([s, e]) => s === 0 && e < 1);
  if (darkOpen.length) warnings.push(`dark opening 0–${darkOpen[0][1].toFixed(1)}s (weak hook)`);
  const black = blackAll.filter((r) => !darkOpen.includes(r));
  checks.push({ name: "no black stretches", ok: black.length === 0, detail: black.length ? black.map(([s, e]) => `${s.toFixed(1)}–${e.toFixed(1)}s`).join(", ") : `${frames} frames checked${darkOpen.length ? " (dark opening: warning)" : ""}` });
  const hold = expect.finalHoldS ?? 2;
  const frozen = runs((i) => diffs[i] < 0.08).filter(([s, e]) => e - s >= 1.5 && s < duration - hold);
  checks.push({ name: "no frozen stretches", ok: frozen.length === 0, detail: frozen.length ? frozen.map(([s, e]) => `${s.toFixed(1)}–${e.toFixed(1)}s`).join(", ") : `max still ${(Math.max(0, ...runs((i) => diffs[i] < 0.08).map(([s, e]) => e - s))).toFixed(1)}s` });
  checks.push({ name: "decoded frames", ok: frames >= Math.floor(expect.duration * SAMPLE_FPS) - 2, detail: `${frames} @${SAMPLE_FPS}fps` });

  const problems = checks.filter((c) => !c.ok).map((c) => `${c.name}: ${c.detail}`);
  return { ok: problems.length === 0, checks, problems, warnings, stats: { duration, fps, width: v?.width ?? 0, height: v?.height ?? 0, audioDb } };
}

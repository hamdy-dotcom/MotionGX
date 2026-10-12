import "server-only";
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { EnergyMap } from "@motiongx/primitives";
import type { SfxEvent } from "./coder";

const run = (cmd: string, args: string[], timeout = 5 * 60_000) =>
  new Promise<string>((resolve, reject) =>
    execFile(cmd, args, { cwd: process.cwd(), timeout, maxBuffer: 16 * 1024 * 1024 }, (err, stdout, stderr) => (err ? reject(new Error(`${cmd} failed: ${err.message}\n${stderr.slice(-1500)}`)) : resolve(stdout))),
  );

export type ScoredAudio = {
  dir: string;
  mix: string;
  sfx: string;
  music: string;
  report: { mix_lufs: number; mix_peak_dbfs: number; length_s: number; samples: number; sfx_events: number };
  hits: { kind: string; expected_s: number; measured_s: number; offset_ms: number }[];
};

const PYTHON = () => (existsSync(path.resolve(".venv/bin/python")) ? path.resolve(".venv/bin/python") : "python3");

/**
 * Renders the per-video score + SFX from the energy map (scripts/music/score.py), encodes MP3s with
 * Remotion's bundled ffmpeg and measures where the hits actually land.
 */
export async function scoreVideo(energy: EnergyMap, sfx: SfxEvent[], mood: string, seed: number, outDir: string): Promise<ScoredAudio> {
  mkdirSync(outDir, { recursive: true });
  const energyFile = path.join(outDir, "energy.json");
  const sfxFile = path.join(outDir, "sfx-events.json");
  writeFileSync(energyFile, JSON.stringify(energy));
  writeFileSync(sfxFile, JSON.stringify({ sfx }));
  await run(PYTHON(), ["scripts/music/score.py", "--energy", energyFile, "--events", sfxFile, "--mood", mood, "--seed", String(seed), "--out-dir", outDir]);
  const npx = path.resolve("node_modules/.bin/remotion");
  for (const name of ["mix", "sfx", "music"]) {
    await run(npx, ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", path.join(outDir, `${name}.wav`), "-codec:a", "libmp3lame", "-b:a", "192k", path.join(outDir, `${name}.mp3`)]);
  }
  const hits = JSON.parse(await run(PYTHON(), ["scripts/music/measure_hits.py", path.join(outDir, "mix.wav"), energyFile]));
  return {
    dir: outDir,
    mix: path.join(outDir, "mix.mp3"),
    sfx: path.join(outDir, "sfx.mp3"),
    music: path.join(outDir, "music.mp3"),
    report: JSON.parse(readFileSync(path.join(outDir, "report.json"), "utf8")),
    hits,
  };
}

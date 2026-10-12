import "server-only";
// Runs the spec render worker in its own process (Vercel Sandbox in production — unverified).
import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { projectPath } from "./paths";
import type { SpecJob, SpecResult } from "@/scripts/motion/spec-worker";

const run = promisify(execFile);

export async function runSpecJob(job: SpecJob, timeoutMs = 15 * 60_000): Promise<SpecResult> {
  const dir = mkdtempSync(path.join(os.tmpdir(), "mgx-spec-"));
  const jobFile = path.join(dir, "job.json");
  const resultFile = path.join(dir, "result.json");
  writeFileSync(jobFile, JSON.stringify(job));
  try {
    await run(process.execPath, [projectPath("node_modules", "tsx", "dist", "cli.mjs"), "--tsconfig", projectPath("tsconfig.scripts.json"), projectPath("scripts", "motion", "spec-worker.ts"), jobFile, resultFile], { cwd: projectPath(), timeout: timeoutMs, maxBuffer: 1 << 24 });
    return JSON.parse(readFileSync(resultFile, "utf8")) as SpecResult;
  } catch (err) {
    return { ok: false, errors: [err instanceof Error ? err.message.slice(0, 1500) : String(err)] };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

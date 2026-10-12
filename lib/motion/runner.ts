import "server-only";
import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { WorkerJob, WorkerResult } from "@/scripts/motion/worker";

export type { WorkerJob, WorkerResult };

/**
 * Runs a motion job (compile / stills / static scan / render) outside the app server:
 * - Vercel: inside a Vercel Sandbox microVM (`runInSandbox`).
 * - Elsewhere: in a separate Node process (`scripts/motion/worker.ts`).
 * Generated code is never imported or evaluated in this process.
 */
export async function runMotionJob(job: WorkerJob, timeoutMs = 15 * 60_000): Promise<WorkerResult> {
  if (process.env.VERCEL && process.env.MOTIONGX_LOCAL_WORKER !== "1") return runInSandbox(job, timeoutMs);
  const dir = mkdtempSync(path.join(os.tmpdir(), "mgx-job-"));
  const jobFile = path.join(dir, "job.json");
  const resultFile = path.join(dir, "result.json");
  writeFileSync(jobFile, JSON.stringify(job));
  await new Promise<void>((resolve, reject) => {
    execFile(
      process.execPath,
      [path.join(process.cwd(), "node_modules/tsx/dist/cli.mjs"), "--tsconfig", "tsconfig.scripts.json", "scripts/motion/worker.ts", jobFile, resultFile],
      { cwd: process.cwd(), timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024, env: { ...process.env, NODE_OPTIONS: "" } },
      (err, _stdout, stderr) => (err ? reject(new Error(`motion worker failed: ${err.message}\n${stderr.slice(-2000)}`)) : resolve()),
    );
  });
  return JSON.parse(readFileSync(resultFile, "utf8")) as WorkerResult;
}

/**
 * Vercel Sandbox runner. Ships the prebuilt worker + runtime bundle into a fresh microVM, runs the job
 * there and copies results back. NOT verified end to end (needs a deployed project with Sandbox enabled).
 */
async function runInSandbox(job: WorkerJob, timeoutMs: number): Promise<WorkerResult> {
  const { Sandbox } = await import("@vercel/sandbox");
  const sandbox = await Sandbox.create({ source: { type: "tarball", url: process.env.MOTIONGX_WORKER_TARBALL_URL ?? "" }, resources: { vcpus: 4 }, timeout: timeoutMs, runtime: "node24" });
  try {
    await sandbox.writeFiles([{ path: "job.json", content: Buffer.from(JSON.stringify(job)) }]);
    const cmd = await sandbox.runCommand({ cmd: "node", args: ["worker.mjs", "job.json", "result.json"] });
    if (cmd.exitCode !== 0) return { ok: false, stage: "render", errors: [`sandbox worker exited ${cmd.exitCode}: ${(await cmd.stderr()).slice(-2000)}`] };
    const result = await sandbox.readFileToBuffer({ path: "result.json" });
    if (!result) return { ok: false, stage: "render", errors: ["sandbox produced no result"] };
    return JSON.parse(Buffer.from(result).toString("utf8")) as WorkerResult;
  } finally {
    await sandbox.stop().catch(() => undefined);
  }
}

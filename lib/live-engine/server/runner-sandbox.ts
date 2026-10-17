import "server-only";
// Vercel Sandbox runner (production). Decision Q2: no custom image — Chromium, ffmpeg and the worker's
// npm packages are installed once at boot and cached as a sandbox snapshot (id kept in storage), so every
// later job boots from the snapshot in seconds. Each job: 4 vCPU, the 45-minute cap; a job that hits the
// cap or crashes is relaunched by the watchdog and resumes from its last finished step.
// UNTESTED: the Vercel CLI token on this machine is expired; the e2e run used the local runner.
import fs from "node:fs";
import path from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import { projectPath } from "@/lib/motion/paths";
import { LIVE_BUCKET, type JobFile } from "../protocol";

const APP = "/vercel/sandbox/live";
const DEPS = { playwright: "1.56.0", "ffmpeg-static": "5.2.0", "@anthropic-ai/sdk": "0.133.0" };
const SNAPSHOT_KEY = "_system/snapshot.json";
const VERSION = 1; // bump when DEPS change → a new snapshot is built
const TIMEOUT_MS = 45 * 60 * 1000;

type Sandbox = import("@vercel/sandbox").Sandbox;

async function sh(sb: Sandbox, cmd: string, sudo = false) {
  const r = await sb.runCommand({ cmd: "bash", args: ["-lc", cmd], cwd: APP, sudo });
  if (r.exitCode !== 0) throw new Error(`sandbox: \`${cmd}\` failed (${r.exitCode}): ${(await r.stderr()).slice(-800)}`);
}

/** the worker bundled into one ESM file (playwright / ffmpeg-static / the SDK stay external: installed in the snapshot) */
async function bundle() {
  const esbuild = await import("esbuild");
  const r = await esbuild.build({ entryPoints: [projectPath("lib", "live-engine", "worker", "worker.ts")], bundle: true, platform: "node", format: "esm", target: "node22", write: false, external: Object.keys(DEPS), banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" } });
  return r.outputFiles[0].contents;
}

async function snapshotId(): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin.storage.from(LIVE_BUCKET).download(SNAPSHOT_KEY);
  if (data) {
    const saved = JSON.parse(await data.text()) as { id: string; version: number };
    if (saved.version === VERSION) return saved.id;
  }
  const { Sandbox } = await import("@vercel/sandbox");
  const sb = await Sandbox.create({ runtime: "node24", resources: { vcpus: 4 }, timeout: 30 * 60 * 1000 });
  try {
    await sb.writeFiles([{ path: `${APP}/package.json`, content: JSON.stringify({ name: "live-worker", private: true, type: "module", dependencies: DEPS }) }]);
    await sh(sb, "npm install --no-audit --no-fund");
    await sh(sb, "npx playwright install --with-deps chromium", true);
    await sh(sb, "npx playwright install chromium");
    const snap = await sb.snapshot({ expiration: 0 });
    await admin.storage.from(LIVE_BUCKET).upload(SNAPSHOT_KEY, JSON.stringify({ id: snap.snapshotId, version: VERSION, at: new Date().toISOString() }), { contentType: "application/json", upsert: true });
    return snap.snapshotId;
  } catch (err) {
    await sb.stop().catch(() => {});
    throw err;
  }
}

export async function startSandbox(job: JobFile, attempt: number): Promise<{ sandboxId?: string }> {
  const { Sandbox } = await import("@vercel/sandbox");
  const worker = projectPath("lib", "live-engine", "worker");
  const sb = await Sandbox.create({ source: { type: "snapshot", snapshotId: await snapshotId() }, resources: { vcpus: 4 }, timeout: TIMEOUT_MS, env: { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "", ...(process.env.TEST_PHONE ? { TEST_PHONE: process.env.TEST_PHONE } : {}), ...(process.env.TEST_EMAIL ? { TEST_EMAIL: process.env.TEST_EMAIL } : {}) } });
  await sb.writeFiles([
    { path: `${APP}/worker.mjs`, content: await bundle() },
    { path: `${APP}/inpage.js`, content: fs.readFileSync(path.join(worker, "inpage.js")) },
    { path: `${APP}/vendor/gsap.min.js`, content: fs.readFileSync(path.join(worker, "vendor", "gsap.min.js")) },
    { path: `${APP}/vendor/kit.js`, content: fs.readFileSync(path.join(worker, "vendor", "kit.js")) },
    { path: `${APP}/job.json`, content: JSON.stringify(job) },
  ]);
  await sb.runCommand({ cmd: "node", args: ["worker.mjs", "job.json", `/tmp/live/a${attempt}`], cwd: APP, detached: true });
  return { sandboxId: sb.name };
}

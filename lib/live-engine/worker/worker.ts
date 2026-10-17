// Live-engine worker entry (own process locally; inside a Vercel Sandbox in production).
//   node worker.mjs <job.json> [workRoot]     (bundled)      ·      tsx lib/live-engine/worker/worker.ts <job.json> [workRoot]
// Lays out the sandbox's folder structure (brands/<slug>, runs/<runId>, vendor/) so every relative path in
// the prompts and in video.html stays exactly as in the sandbox, downloads earlier steps' outputs, runs the job.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { JobFile } from "../protocol";
import { runJob } from "./pipeline";
import { Sync } from "./sync";

const here = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const job = JSON.parse(fs.readFileSync(process.argv[2], "utf8")) as JobFile;
  const root = process.argv[3] || path.join(os.tmpdir(), "live-engine", job.jobId);
  const brandDir = path.join(root, "brands", job.slug);
  const runDir = path.join(root, "runs", job.runId);
  for (const d of [brandDir, runDir, path.join(root, "vendor")]) fs.mkdirSync(d, { recursive: true });
  for (const f of ["gsap.min.js", "kit.js"]) fs.copyFileSync(path.join(here, "vendor", f), path.join(root, "vendor", f));
  if (job.settings && (job.settings.phone || job.settings.email)) fs.writeFileSync(path.join(root, ".sandbox-settings.json"), JSON.stringify(job.settings, null, 2));
  const sync = new Sync(job, { root, brandDir, runDir });
  try {
    sync.log(`▶ worker ${job.jobId}: ${job.downloads.length} files to fetch`);
    await sync.downloadAll();
    const summary = await runJob(job, { root, brandDir, runDir }, sync);
    await sync.done(summary as Record<string, unknown>);
  } catch (err) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
    sync.log(`✗ ${msg.split("\n")[0]}`);
    await sync.failed(msg).catch((e) => console.error("could not report the failure:", e));
    process.exitCode = 1;
  }
}

void main();

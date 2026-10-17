import "server-only";
// Local runner (dev, and the e2e run): the worker as a detached child process of the Next server.
// Each attempt gets its own folder under .work/live/<jobId>/a<n>; the log sits next to it.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { projectPath } from "@/lib/motion/paths";
import type { JobFile } from "../protocol";

export async function startLocal(job: JobFile, attempt: number, onExit: () => unknown): Promise<{ sandboxId?: string }> {
  const dir = projectPath(".work", "live", job.jobId, `a${attempt}`);
  fs.mkdirSync(dir, { recursive: true });
  const jobFile = path.join(dir, "job.json");
  fs.writeFileSync(jobFile, JSON.stringify(job, null, 2));
  const out = fs.openSync(path.join(dir, "worker.log"), "a");
  const child = spawn(projectPath("node_modules", ".bin", "tsx"), [projectPath("lib", "live-engine", "worker", "worker.ts"), jobFile, dir], {
    cwd: projectPath(),
    env: { ...process.env, NODE_OPTIONS: "" },
    stdio: ["ignore", out, out],
    detached: true,
  });
  child.on("exit", (code) => {
    fs.closeSync(out);
    console.log(`[live] worker ${job.jobId} a${attempt} exited (${code})`);
    void Promise.resolve(onExit()).catch((e) => console.error("[live] resume failed", e));
  });
  child.unref();
  console.log(`[live] worker ${job.jobId} a${attempt} started (pid ${child.pid}) → ${path.relative(projectPath(), dir)}/worker.log`);
  return {};
}

// Resume a live-engine job by hand (local runner). A capture whose agent already finished in .work/live/<jobId>/a<n>
// continues at its upload from that folder — no agent, no model calls for the capture (the profile step still runs).
// The dev server must be running (the worker reports to it).
//   pnpm live:resume <jobId>
import { resumeJob } from "@/lib/live-engine/server/jobs";

async function main() {
  const jobId = process.argv[2];
  if (!jobId) throw new Error("usage: pnpm live:resume <jobId>");
  const job = await resumeJob(jobId);
  console.log(`resumed ${job.id}: status ${job.status}, attempt ${job.attempts} — follow .work/live/${job.id}/a${job.attempts}/worker.log`);
}

main().catch((e) => { console.error(String(e instanceof Error ? e.message : e)); process.exit(1); });

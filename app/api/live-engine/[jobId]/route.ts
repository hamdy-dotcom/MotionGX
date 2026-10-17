import type { NextRequest } from "next/server";
import { authJob, handleReport, pollAnswer } from "@/lib/live-engine/server/jobs";
import type { Report } from "@/lib/live-engine/protocol";

/**
 * Live-engine worker callback. The worker authenticates with the per-attempt token from its job.json
 * (only its sha256 is stored on live_jobs).
 *   POST — a progress report (log, stage, ledger row, upload-URL request, step done, SMS-code ask, done, failed)
 *   GET ?ask=1 — the worker polls for the human's SMS code
 */
export const maxDuration = 300;

export async function POST(request: NextRequest, ctx: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await ctx.params;
  const job = await authJob(jobId, request.headers.get("authorization"));
  if (!job) return Response.json({ error: "unauthorized" }, { status: 401 });
  const report = (await request.json().catch(() => null)) as Report | null;
  if (!report?.type) return Response.json({ error: "bad_report" }, { status: 400 });
  try {
    return Response.json((await handleReport(job, report)) ?? { ok: true });
  } catch (err) {
    console.error("[live] report failed", { jobId, type: report.type, err });
    return Response.json({ error: err instanceof Error ? err.message : "failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await ctx.params;
  const job = await authJob(jobId, request.headers.get("authorization"));
  if (!job) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (request.nextUrl.searchParams.get("ask") !== "1") return Response.json({ error: "bad_request" }, { status: 400 });
  return Response.json(await pollAnswer(job));
}

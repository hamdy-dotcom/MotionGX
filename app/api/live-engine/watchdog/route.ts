import type { NextRequest } from "next/server";
import { reviveStalledJobs } from "@/lib/live-engine/server/jobs";

/** Relaunches live-engine jobs whose worker went silent (crash or the sandbox's 45-minute cap); they resume from the last finished step. Call from a cron with CRON_SECRET. */
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization"), ok = [process.env.CRON_SECRET, process.env.LIVE_WATCHDOG_TOKEN].some((t) => t && auth === `Bearer ${t}`);
  if (!ok) return Response.json({ error: "unauthorized" }, { status: 401 }); // CRON_SECRET (Vercel cron) or the local watchdog's token (instrumentation.ts)
  return Response.json({ revived: await reviveStalledJobs() });
}

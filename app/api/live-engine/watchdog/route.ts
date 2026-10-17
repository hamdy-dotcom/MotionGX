import type { NextRequest } from "next/server";
import { reviveStalledJobs } from "@/lib/live-engine/server/jobs";

/** Relaunches live-engine jobs whose worker went silent (crash or the sandbox's 45-minute cap); they resume from the last finished step. Call from a cron with CRON_SECRET. */
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json({ revived: await reviveStalledJobs() });
}

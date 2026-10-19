// The contract between the app (lib/live-engine/server) and the worker (lib/live-engine/worker).
// Pure types + path helpers: imported by both sides, never imports Node or Next.

/** the sandbox's steps, in order; a resumed job skips the finished ones */
export const CAPTURE_STEPS = ["capture", "profile"] as const;
export const VIDEO_STEPS = ["script", "build", "music", "qa", "render"] as const;
export type Step = (typeof CAPTURE_STEPS)[number] | (typeof VIDEO_STEPS)[number];

/** sandbox brief (pipeline.mjs) */
export type Brief = { url: string; objective: string; country: string; layout: string; length: number; description?: string; offer?: string; flowClips?: boolean };

export type JobMode = "new" | "direction" | "lines" | "edit";

/** written to job.json for the worker */
export type JobFile = {
  jobId: string;
  kind: "capture" | "video";
  mode: JobMode | null;
  /** POST here (with the token) for every report; GET `${callbackUrl}?ask=1` for an SMS-code answer */
  callbackUrl: string;
  token: string;
  brief: Brief;
  /** folder names inside the worker root, as in the sandbox: brands/<slug>, runs/<runId> */
  slug: string;
  runId: string;
  models: Record<string, string>;
  doneSteps: Step[];
  /** files to fetch before starting (logical path → signed URL); *.tgz / *.tgz.partNN are packed folders */
  downloads: { path: string; url: string }[];
  /** "Edit lines": the edited headline/sub per scene index; "Request a change": the client's text */
  edit?: { lines?: { scene: number; headline: string; sub?: string }[]; request?: string };
  /** the workspace's last 5 video fingerprints (layout sequence, transition, background, hook, CTA): the art direction must differ */
  history?: Record<string, unknown>[];
  /** remembered test phone/email (the sandbox's .sandbox-settings.json) */
  settings?: { phone?: string; email?: string };
  /** local runner only: a previous attempt's finished brand folder — the capture resumes at its upload (no agent, no model calls) */
  resumeFrom?: string;
};

export type LedgerRow = { step: string; model: string; in: number; out: number; cacheRead: number; cacheWrite: number; usd: number; ms: number };

/** what the worker reports (POST body) */
export type Report =
  | { type: "log"; lines: string[] }
  | { type: "stage"; stage: Step }
  | { type: "ledger"; row: LedgerRow }
  | { type: "upload"; paths: string[] } // → { urls: { path, url }[] }
  | { type: "step_done"; step: Step; info?: Record<string, unknown> }
  | { type: "ask"; sent_to: string }
  | { type: "done"; summary: Record<string, unknown> }
  | { type: "failed"; error: string };

/**
 * Logical paths the worker uploads/downloads, relative to the worker root:
 *   brand/<rel>  → live-engine/{ws}/captures/{capture}/<rel>   (packed folders: brand/_pack/<dir>.tgz[.partNN])
 *   run/<rel>    → live-engine/{ws}/runs/{video}/{job}/<rel>
 *   private/auth.json → live-engine/_private/{ws}/captures/{capture}/auth.json (service role only)
 * A capture is keyed by itself, not by a company: it runs on "Add company", before the company exists.
 */
export type LogicalRoot = "brand" | "run" | "private";

export const LIVE_BUCKET = "live-engine";

export function storagePath(logical: string, ids: { workspaceId: string; captureId: string; videoId?: string | null; runFolder?: string | null }) {
  const [root, ...rest] = logical.split("/");
  const rel = rest.join("/");
  if (!rel || rel.includes("..")) throw new Error(`bad logical path: ${logical}`);
  if (root === "brand") return `${ids.workspaceId}/captures/${ids.captureId}/${rel}`;
  if (root === "private") return `_private/${ids.workspaceId}/captures/${ids.captureId}/${rel}`;
  if (root === "run") {
    if (!ids.videoId || !ids.runFolder) throw new Error("run path without a video job");
    return `${ids.workspaceId}/runs/${ids.videoId}/${ids.runFolder}/${rel}`;
  }
  throw new Error(`bad logical root: ${logical}`);
}

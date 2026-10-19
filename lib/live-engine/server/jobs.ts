import "server-only";
// Live engine orchestration (app side). Starts worker jobs, handles their reports, keeps the UI contract:
// videos.status / videos.generation (stages queued → plan → spec → music → ready → done), video_versions,
// ai_usage. One capture job per company (reused by every video, like the sandbox's brands/<site>); a video
// job waits for it. A stalled or crashed job is relaunched and resumes from its last finished step.
import { createHash, randomBytes } from "node:crypto";
import type { ScriptBeat } from "@motiongx/primitives";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Video } from "@/lib/types";
import { callbackBase, runnerKind, flowClipsEnabled } from "../config";
import { brandSlug, briefFor, linesFromBeats, STAGE_OF } from "../mapping";
import { LIVE_BUCKET, storagePath, type Brief, type JobFile, type JobMode, type LedgerRow, type Report, type Step } from "../protocol";
import { startLocal } from "./runner-local";
import { startSandbox } from "./runner-sandbox";
import { insertLiveVersion } from "./versions";

export type LiveMode = { kind: "new" } | { kind: "direction" } | { kind: "lines"; beats: ScriptBeat[] } | { kind: "edit"; instruction: string };

export type JobRow = {
  id: string;
  workspace_id: string;
  video_id: string | null;
  company_id: string | null;
  capture_id: string | null;
  kind: "capture" | "video";
  mode: JobMode | null;
  input: { edit?: JobFile["edit"]; prevJobId?: string | null; first?: boolean; settings?: JobFile["settings"] };
  status: "queued" | "running" | "waiting_code" | "done" | "failed";
  stage: string | null;
  done_steps: Step[];
  ask: { sent_to: string; asked_at: string; answer?: string | null; answered_at?: string } | null;
  log: string[];
  ledger: LedgerRow[];
  cost_usd: number;
  attempts: number;
  token_hash: string | null;
  created_at: string;
  updated_at: string;
};

const MAX_ATTEMPTS = 3;
const STALL_MS = 12 * 60 * 1000;
const admin = () => createAdminClient();
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const now = () => new Date().toISOString();

const AI_KIND: Record<string, string> = { "capture-agent": "live_capture", profile: "live_profile", script: "live_script", direct: "live_direct", art: "live_direct", build: "live_build", rebuild: "live_build", "qa-vision": "live_qa" };
const aiKind = (step: string) => AI_KIND[step] ?? (step.startsWith("qa-repair") ? "live_repair" : "live_build");

// ── videos.generation (same write rule as the legacy setGeneration: replace the whole object) ────────
async function setGeneration(videoId: string, patch: Record<string, unknown>, status?: Video["status"]) {
  const update: Record<string, unknown> = { generation: { ...patch, engine: "live", updated_at: now() } };
  if (status) update.status = status;
  const { error } = await admin().from("videos").update(update).eq("id", videoId);
  if (error) console.error("[live] progress update failed", { videoId, message: error.message });
}

async function patchJob(id: string, patch: Partial<JobRow> & Record<string, unknown>) {
  const { error } = await admin().from("live_jobs").update({ ...patch, updated_at: now() }).eq("id", id);
  if (error) console.error("[live] job update failed", { id, message: error.message });
}

async function getJob(id: string): Promise<JobRow | null> {
  const { data } = await admin().from("live_jobs").select("*").eq("id", id).maybeSingle();
  return (data as JobRow | null) ?? null;
}

type CaptureRow = { id: string; status: string; version: number; app_screens: number | null; app_status: string | null; company_id: string | null; domain: string | null; created_at: string };
/** the sandbox's reuse rule: a v4 capture that got inside the app, or had nothing to get into */
const usable = (c: CaptureRow | null) => (c && c.status === "done" && c.version >= 4 && ((c.app_screens ?? 0) > 0 || ["no_app_link", "skipped", "captcha"].includes(c.app_status ?? "")) ? c : null);

/** the company's capture: the one saved with it on "Add company" (brand_profiles.raw.capture_id), else its latest */
async function usableCapture(companyId: string) {
  const db = admin();
  const { data: profile } = await db.from("brand_profiles").select("raw").eq("company_id", companyId).maybeSingle();
  const saved = (profile?.raw as { source?: string; capture_id?: string } | null)?.source === "live" ? (profile!.raw as { capture_id: string }).capture_id : null;
  if (saved) {
    const { data } = await db.from("live_brand_captures").select("*").eq("id", saved).maybeSingle();
    if (usable(data as CaptureRow | null)) return data as CaptureRow;
  }
  const { data } = await db.from("live_brand_captures").select("*").eq("company_id", companyId).eq("status", "done").order("created_at", { ascending: false }).limit(1).maybeSingle();
  return usable(data as CaptureRow | null);
}

/** the capture a company's pages show (brand card, brand files): the one its videos use */
export async function companyCaptureId(companyId: string) {
  return (await usableCapture(companyId))?.id ?? null;
}

const domainOf = async (url: string) => (await import("tldts")).parse(url, { allowPrivateDomains: true }).domain;
// appUrl = the site itself, as in the sandbox baseline brief (its form's "App / sign-up URL" field): without it the
// capture only signs up when the homepage has a link matching its auto-detect pattern, else stops at "no_app_link"
const captureBrief = (siteUrl: string): Brief & { appUrl: string } => ({ url: siteUrl, appUrl: siteUrl, objective: "acquire", country: "EG", layout: "9:16", length: 30 });

// ── "Add company" (طلّع الهوية): the sandbox's capture + profile, before the company exists ──────────────
/** start (or reuse, as the sandbox reuses brands/<site> until a re-read) the capture of a site */
export async function startBrandCapture(workspaceId: string, siteUrl: string, opts: { refresh?: boolean; companyId?: string | null } = {}) {
  const db = admin();
  const url = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
  const domain = await domainOf(url);
  if (!domain) throw new Error("invalid url");
  if (!opts.refresh) {
    const { data: rows } = await db.from("live_brand_captures").select("*").eq("workspace_id", workspaceId).eq("domain", domain).order("created_at", { ascending: false }).limit(5);
    const reuse = (rows as CaptureRow[] | null)?.find((c) => usable(c) || ["queued", "running"].includes(c.status));
    if (reuse) return { captureId: reuse.id, reused: true };
  }
  const { data: cap, error } = await db.from("live_brand_captures").insert({ workspace_id: workspaceId, company_id: opts.companyId ?? null, site_url: url, domain, status: "queued" }).select("id").single();
  if (error || !cap) throw new Error(`live_brand_captures insert: ${error?.message}`);
  const { data: job, error: e2 } = await db.from("live_jobs").insert({ workspace_id: workspaceId, video_id: null, company_id: opts.companyId ?? null, capture_id: cap.id, kind: "capture", input: {}, status: "queued" }).select("id").single();
  if (e2 || !job) throw new Error(`live_jobs insert: ${e2?.message}`);
  await launch(job.id);
  return { captureId: cap.id, reused: false };
}

let lastRevive = 0;
/** progress for the "Add company" page: status, the last log lines, an SMS ask, brand.json when done */
export async function captureProgress(workspaceId: string, captureId: string) {
  const db = admin();
  // without a cron (local runs) this poll doubles as the watchdog, at most once a minute: a worker that stopped
  // because the app was gone is relaunched and resumes after its last acknowledged step
  if (Date.now() - lastRevive > 60_000) {
    lastRevive = Date.now();
    void reviveStalledJobs().catch((e) => console.error("[live] revive failed", e));
  }
  const { data: cap } = await db.from("live_brand_captures").select("*").eq("id", captureId).eq("workspace_id", workspaceId).maybeSingle();
  if (!cap) return null;
  const { data: job } = await db.from("live_jobs").select("id, status, stage, log, ask, error, done_steps").eq("capture_id", captureId).eq("kind", "capture").order("created_at", { ascending: false }).limit(1).maybeSingle();
  return {
    status: cap.status as string,
    stage: (job?.stage as string | null) ?? null,
    waitingCode: job?.status === "waiting_code",
    askedTo: (job?.ask as { sent_to?: string } | null)?.sent_to ?? null,
    log: ((job?.log as string[] | null) ?? []).filter((l) => l.trim()).slice(-12),
    error: (cap.error as string | null) ?? (job?.error as string | null) ?? null,
    profile: cap.status === "done" ? (cap.profile as Record<string, unknown> | null) : null,
    prefix: storagePath("brand/x", { workspaceId, captureId }).replace(/\/x$/, ""),
  };
}

/** the SMS code typed on the "Add company" page */
export async function answerCaptureCode(workspaceId: string, captureId: string, code: string) {
  const { data } = await admin().from("live_jobs").select("*").eq("capture_id", captureId).eq("workspace_id", workspaceId).eq("status", "waiting_code").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const job = data as JobRow | null;
  if (!job?.ask) return false;
  await patchJob(job.id, { status: "running", ask: { ...job.ask, answer: code.trim().slice(0, 200), answered_at: now() } });
  return true;
}

/** "تأكيد وحفظ الشركة": the capture (and its brand.json) now belongs to the company */
export async function linkCapture(workspaceId: string, captureId: string, companyId: string) {
  const db = admin();
  await db.from("live_brand_captures").update({ company_id: companyId, updated_at: now() }).eq("id", captureId).eq("workspace_id", workspaceId).is("company_id", null);
  await db.from("live_jobs").update({ company_id: companyId, updated_at: now() }).eq("capture_id", captureId).eq("workspace_id", workspaceId).is("company_id", null);
}

// ── start ─────────────────────────────────────────────────────────────────────────────────────────────
/** runGeneration for VIDEO_ENGINE=live (and for edits of live versions) */
export async function startLiveGeneration(videoId: string, mode: LiveMode) {
  const db = admin();
  const { data: video } = await db.from("videos").select("*").eq("id", videoId).single();
  if (!video) return;
  const { data: company } = await db.from("companies").select("id, website_url").eq("id", video.company_id).single();
  if (!company?.website_url) return setGeneration(videoId, { stage: "error", mode: mode.kind, error: "brand missing" }, "failed");

  let prevJobId: string | null = null;
  if (mode.kind === "lines" || mode.kind === "edit") {
    const { data: prev } = await db.from("video_versions").select("live_job_id").eq("video_id", videoId).eq("engine", "live").order("version", { ascending: false }).limit(1).maybeSingle();
    if (!prev?.live_job_id) return setGeneration(videoId, { stage: "edit_failed", mode: mode.kind }, "ready");
    prevJobId = prev.live_job_id;
  }
  const capture = await usableCapture(company.id);
  const edit = mode.kind === "lines" ? { lines: linesFromBeats(mode.beats) } : mode.kind === "edit" ? { request: mode.instruction } : undefined;
  const { data: job, error } = await db
    .from("live_jobs")
    .insert({ workspace_id: video.workspace_id, video_id: videoId, company_id: company.id, capture_id: capture?.id ?? null, kind: "video", mode: mode.kind, input: { edit, prevJobId, first: !capture }, status: "queued" })
    .select("*")
    .single();
  if (error || !job) {
    console.error("[live] could not create the video job", { videoId, message: error?.message });
    return setGeneration(videoId, { stage: "error", mode: mode.kind, error: "could not start" }, mode.kind === "lines" || mode.kind === "edit" ? "ready" : "needs_direction");
  }
  await setGeneration(videoId, { stage: capture ? "queued" : "plan", mode: mode.kind, first: !capture }, "generating");
  if (capture) return launch(job.id);
  // a company saved before the live "Add company" flow has no capture yet: capture it now (once), the video waits
  await ensureCaptureJob(video, company.website_url);
}

/** one capture job per company at a time; the video job(s) wait for it */
async function ensureCaptureJob(video: { id: string; workspace_id: string; company_id: string }, websiteUrl: string) {
  const db = admin();
  const { data: running } = await db.from("live_jobs").select("id").eq("company_id", video.company_id).eq("kind", "capture").in("status", ["queued", "running", "waiting_code"]).limit(1).maybeSingle();
  if (running) return;
  const url = briefFor({ brief: "", goal: null, dialect: "eg", format: "9:16", length_s: 30 }, websiteUrl).url;
  const { data: cap, error } = await db.from("live_brand_captures").insert({ workspace_id: video.workspace_id, company_id: video.company_id, site_url: url, domain: await domainOf(url), status: "queued" }).select("id").single();
  if (error || !cap) throw new Error(`live_brand_captures insert: ${error?.message}`);
  const { data: job, error: e2 } = await db.from("live_jobs").insert({ workspace_id: video.workspace_id, video_id: video.id, company_id: video.company_id, capture_id: cap.id, kind: "capture", input: {}, status: "queued" }).select("id").single();
  if (e2 || !job) throw new Error(`live_jobs insert: ${e2?.message}`);
  await launch(job.id);
}

// ── launch (first run or resume) ─────────────────────────────────────────────────────────────────────
async function listFiles(prefix: string): Promise<string[]> {
  const { data } = await admin().storage.from(LIVE_BUCKET).list(prefix, { limit: 1000 });
  return (data ?? []).filter((f) => f.id).map((f) => `${prefix}/${f.name}`);
}
async function sign(path: string) {
  const { data, error } = await admin().storage.from(LIVE_BUCKET).createSignedUrl(path, 4 * 3600);
  if (error || !data) throw new Error(`sign ${path}: ${error?.message}`);
  return data.signedUrl;
}

export async function launch(jobId: string) {
  const db = admin();
  const job = await getJob(jobId);
  if (!job || job.status === "done" || job.status === "failed") return;
  const { data: capture } = job.capture_id ? await db.from("live_brand_captures").select("*").eq("id", job.capture_id).single() : { data: null };
  if (!capture) return failJob(job, "missing capture");
  let brief: Brief;
  if (job.kind === "capture") brief = captureBrief(capture.site_url);
  else {
    const { data: video } = await db.from("videos").select("*").eq("id", job.video_id!).single();
    const { data: company } = await db.from("companies").select("website_url").eq("id", job.company_id!).single();
    if (!video || !company?.website_url) return failJob(job, "missing video or company website");
    // the brand folder is the capture's site (brands/<slug> as in the sandbox), the brief the video's
    brief = { ...briefFor(video, company.website_url), url: capture.site_url ?? company.website_url };
  }
  if (flowClipsEnabled()) brief = { ...brief, flowClips: true };
  const ids = { workspaceId: job.workspace_id, captureId: capture.id };
  const brandPrefix = storagePath("brand/x", ids).replace(/\/x$/, "");
  const downloads: JobFile["downloads"] = [];
  const add = async (storage: string, logical: string) => downloads.push({ path: logical, url: await sign(storage) });

  const needBrand = job.kind === "video" || job.done_steps.includes("capture");
  if (needBrand) {
    // a video job reads only the live UI clones, their assets and the library (logo, images) — not the agent / html / probes / screens packs
    const keep = job.kind === "video" ? /^(clips|clones|assets|library)\.tgz(\.part\d+)?$/ : /./; // clips: the flow-clips experiment
    for (const f of await listFiles(`${brandPrefix}/_pack`)) if (keep.test(f.split("/").pop()!)) await add(f, `brand/_pack/${f.split("/").pop()}`);
    for (const f of ["capture.json", "brand.json"]) if ((await listFiles(brandPrefix)).includes(`${brandPrefix}/${f}`)) await add(`${brandPrefix}/${f}`, `brand/${f}`);
  }
  if (job.kind === "video") {
    // edits start from the previous version's saved script (+ its music for "request a change")
    if (job.input.prevJobId) {
      const prevRun = `${job.workspace_id}/runs/${job.video_id}/${job.input.prevJobId}`;
      const want = job.mode === "edit" ? ["script.json", "assets.json", "music.wav", "art.json"] : ["script.json", "assets.json", "art.json"];
      const have = await listFiles(prevRun);
      for (const f of want) if (have.includes(`${prevRun}/${f}`)) await add(`${prevRun}/${f}`, `run/${f}`);
    }
    // resume: this job's own outputs from finished steps
    if (job.done_steps.length) {
      const own = `${job.workspace_id}/runs/${job.video_id}/${job.id}`;
      for (const f of await listFiles(own)) await add(f, `run/${f.split("/").pop()}`);
    }
  }

  // the workspace's last 5 looks: the art director must make this one different
  let history: Record<string, unknown>[] = [];
  if (job.kind === "video") {
    const { data: recent } = await db.from("video_versions").select("qa, created_at, videos!inner(workspace_id)").eq("videos.workspace_id", job.workspace_id).eq("engine", "live").order("created_at", { ascending: false }).limit(20);
    history = (recent ?? []).map((r) => (r.qa as { fingerprint?: Record<string, unknown> } | null)?.fingerprint).filter((f): f is Record<string, unknown> => Boolean(f)).slice(0, 5);
  }

  const token = randomBytes(24).toString("base64url");
  const file: JobFile = {
    jobId: job.id,
    kind: job.kind,
    mode: job.mode,
    callbackUrl: `${callbackBase()}/api/live-engine/${job.id}`,
    token,
    brief,
    slug: brandSlug(brief.url),
    runId: job.id,
    models: {},
    doneSteps: job.done_steps,
    downloads,
    edit: job.input.edit,
    history,
    settings: job.input.settings,
  };
  const attempt = job.attempts + 1;
  await patchJob(job.id, { status: "running", token_hash: sha(token), attempts: attempt, runner: runnerKind(), error: null });
  if (job.kind === "capture") await db.from("live_brand_captures").update({ status: "running", updated_at: now() }).eq("id", capture.id);
  try {
    const started = runnerKind() === "sandbox" ? await startSandbox(file, attempt) : await startLocal(file, attempt, () => onWorkerExit(job.id));
    if (started.sandboxId) await patchJob(job.id, { sandbox_id: started.sandboxId });
  } catch (err) {
    await failJob({ ...job, attempts: attempt }, `could not start the worker: ${err instanceof Error ? err.message : err}`);
  }
}

/** local runner: the child process ended — relaunch (resume) unless the job finished */
async function onWorkerExit(jobId: string) {
  await new Promise((ok) => setTimeout(ok, 2000));
  const job = await getJob(jobId);
  if (!job || job.status === "done" || job.status === "failed") return;
  if (job.attempts >= MAX_ATTEMPTS) return failJob(job, `the worker stopped ${job.attempts} times`);
  console.warn("[live] worker exited early — resuming", { jobId, after: job.done_steps });
  await launch(jobId);
}

/** watchdog: relaunch jobs whose worker went silent (sandbox crash or 45-minute cap), resuming from the last finished step */
export async function reviveStalledJobs() {
  const { data } = await admin().from("live_jobs").select("*").in("status", ["running", "waiting_code"]).lt("updated_at", new Date(Date.now() - STALL_MS).toISOString());
  for (const job of (data ?? []) as JobRow[]) {
    if (job.attempts >= MAX_ATTEMPTS) await failJob(job, "the worker went silent too many times");
    else await launch(job.id);
  }
  return (data ?? []).length;
}

// ── reports from the worker ──────────────────────────────────────────────────────────────────────────
export async function authJob(jobId: string, authorization: string | null): Promise<JobRow | null> {
  const token = authorization?.replace(/^Bearer\s+/i, "") ?? "";
  const job = await getJob(jobId);
  if (!job || !token || job.token_hash !== sha(token)) return null;
  return job;
}

const videoStage = (job: JobRow, step: Step) => (job.kind === "capture" ? "plan" : STAGE_OF[step]);

export async function handleReport(job: JobRow, r: Report): Promise<unknown> {
  const db = admin();
  switch (r.type) {
    case "log": {
      await patchJob(job.id, { log: [...(job.log ?? []), ...r.lines].slice(-600) });
      return { ok: true };
    }
    case "stage": {
      await patchJob(job.id, { stage: r.stage });
      for (const vid of await videosFor(job)) await setGeneration(vid, { stage: videoStage(job, r.stage), mode: job.mode ?? "new", first: job.kind === "capture" || job.input.first });
      return { ok: true };
    }
    case "ledger": {
      const row = r.row;
      const cost = Number((Number(job.cost_usd) + row.usd).toFixed(5));
      await patchJob(job.id, { ledger: [...(job.ledger ?? []), row], cost_usd: cost });
      const { error } = await db.from("ai_usage").insert({ workspace_id: job.workspace_id, video_id: job.video_id, kind: aiKind(row.step), model: row.model, input_tokens: row.in, output_tokens: row.out, cache_read_tokens: row.cacheRead, cache_write_tokens: row.cacheWrite });
      if (error) console.error("[live] ai_usage insert failed", { message: error.message });
      if (job.capture_id && job.kind === "capture") await db.from("live_brand_captures").update({ cost_usd: cost, updated_at: now() }).eq("id", job.capture_id);
      return { ok: true };
    }
    case "upload": {
      const ids = { workspaceId: job.workspace_id, companyId: job.company_id, captureId: job.capture_id!, videoId: job.video_id, runFolder: job.id };
      const urls = [];
      for (const p of r.paths) {
        const target = storagePath(p, ids);
        const { data, error } = await db.storage.from(LIVE_BUCKET).createSignedUploadUrl(target, { upsert: true });
        if (error || !data) throw new Error(`signed upload ${target}: ${error?.message}`);
        urls.push({ path: p, url: data.signedUrl });
      }
      await patchJob(job.id, {});
      return { urls };
    }
    case "step_done": {
      await patchJob(job.id, { done_steps: [...new Set([...(job.done_steps ?? []), r.step])] });
      if (job.kind === "capture" && job.capture_id) {
        const i = (r.info ?? {}) as Record<string, unknown>;
        if (r.step === "capture") await db.from("live_brand_captures").update({ manifest: i.manifest ?? null, pages: i.pages ?? null, app_screens: i.app_screens ?? null, app_status: i.app_status ?? null, steps: i.steps ?? null, identity_email: i.identity_email ?? null, updated_at: now() }).eq("id", job.capture_id);
        if (r.step === "profile") await db.from("live_brand_captures").update({ profile: i.profile ?? null, updated_at: now() }).eq("id", job.capture_id);
      }
      return { ok: true };
    }
    case "ask": {
      await patchJob(job.id, { status: "waiting_code", ask: { sent_to: r.sent_to, asked_at: now() } });
      for (const vid of await videosFor(job)) await setGeneration(vid, { stage: "awaiting_code", mode: job.mode ?? "new", first: true, ask: { sent_to: r.sent_to } });
      return { ok: true };
    }
    case "done":
      return finishJob(job, r.summary);
    case "failed":
      await failJob(job, r.error);
      return { ok: true };
  }
}

/** GET ?ask=1 — the worker polls for the human's SMS code */
export async function pollAnswer(job: JobRow) {
  await patchJob(job.id, {});
  const answered = Boolean(job.ask?.answered_at);
  return { answered, answer: answered ? (job.ask?.answer ?? null) : null };
}

/** the studio's SMS-code input */
export async function answerCode(videoId: string, code: string) {
  const { data } = await admin().from("live_jobs").select("*").eq("video_id", videoId).eq("status", "waiting_code").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const job = data as JobRow | null;
  if (!job?.ask) return false;
  await patchJob(job.id, { status: "running", ask: { ...job.ask, answer: code.trim().slice(0, 200), answered_at: now() } });
  await setGeneration(videoId, { stage: "plan", mode: job.mode ?? "new", first: true });
  return true;
}

/** the videos a job's progress is shown on: its own video, plus video jobs waiting for this capture */
async function videosFor(job: JobRow): Promise<string[]> {
  if (job.kind === "video") return job.video_id ? [job.video_id] : [];
  if (!job.company_id) return [];
  const { data } = await admin().from("live_jobs").select("video_id").eq("company_id", job.company_id).eq("kind", "video").eq("status", "queued").is("capture_id", null);
  return [...new Set([job.video_id, ...(data ?? []).map((d) => d.video_id)].filter(Boolean) as string[])];
}

async function finishJob(job: JobRow, summary: Record<string, unknown>) {
  const db = admin();
  await patchJob(job.id, { status: "done", stage: "done" });
  if (job.kind === "capture") {
    await db.from("live_brand_captures").update({ status: "done", updated_at: now() }).eq("id", job.capture_id!);
    if (!job.company_id) return { ok: true }; // "Add company": the page picks brand.json up from the capture row
    // waiting video jobs continue with this capture (as the sandbox does within one run)
    const { data: waiting } = await db.from("live_jobs").select("id").eq("company_id", job.company_id).eq("kind", "video").eq("status", "queued").is("capture_id", null);
    for (const w of waiting ?? []) {
      await db.from("live_jobs").update({ capture_id: job.capture_id, updated_at: now() }).eq("id", w.id);
      await launch(w.id);
    }
    return { ok: true };
  }
  const fresh = (await getJob(job.id)) ?? job;
  const version = await insertLiveVersion(fresh, summary);
  const seconds = Math.round((Date.now() - new Date(job.created_at).getTime()) / 1000);
  await setGeneration(job.video_id!, { stage: "done", mode: job.mode ?? "new", version, cost_usd: Number(Number(fresh.cost_usd).toFixed(4)), to_preview_s: seconds }, "ready");
  return { ok: true, version };
}

async function failJob(job: JobRow, error: string) {
  const db = admin();
  await patchJob(job.id, { status: "failed", error: error.slice(0, 2000) });
  const targets: { videoId: string; mode: string }[] = [];
  if (job.kind === "capture") {
    if (job.capture_id) await db.from("live_brand_captures").update({ status: "failed", error: error.slice(0, 1000), updated_at: now() }).eq("id", job.capture_id);
    const { data: waiting } = !job.company_id ? { data: [] as { id: string; video_id: string | null; mode: string | null }[] } : await db.from("live_jobs").select("id, video_id, mode").eq("company_id", job.company_id).eq("kind", "video").eq("status", "queued").is("capture_id", null);
    for (const w of waiting ?? []) {
      await db.from("live_jobs").update({ status: "failed", error: "the brand capture failed", updated_at: now() }).eq("id", w.id);
      if (w.video_id) targets.push({ videoId: w.video_id, mode: w.mode ?? "new" });
    }
  } else if (job.video_id) targets.push({ videoId: job.video_id, mode: job.mode ?? "new" });
  for (const t of targets) {
    const { count } = await db.from("video_versions").select("id", { count: "exact", head: true }).eq("video_id", t.videoId);
    await setGeneration(t.videoId, { stage: "error", mode: t.mode, error: error.split("\n")[0].slice(0, 300) }, count ? "ready" : "needs_direction");
  }
}

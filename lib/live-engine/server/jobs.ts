import "server-only";
// Live engine orchestration (app side). Starts worker jobs, handles their reports, keeps the UI contract:
// videos.status / videos.generation (stages queued → plan → spec → music → ready → done), video_versions,
// ai_usage. One capture job per company (reused by every video, like the sandbox's brands/<site>); a video
// job waits for it. A stalled or crashed job is relaunched and resumes from its last finished step.
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { projectPath } from "@/lib/motion/paths";
import type { ScriptBeat } from "@motiongx/primitives";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Video } from "@/lib/types";
import { callbackBase, runnerKind, flowClipsEnabled, directorEngineEnabled, directorSettings } from "../config";
import { brandSlug, briefFor, linesFromBeats, STAGE_OF } from "../mapping";
import { LIVE_BUCKET, storagePath, type Brief, type JobFile, type JobMode, type LedgerRow, type Report, type Step } from "../protocol";
import { startLocal } from "./runner-local";
import { startSandbox } from "./runner-sandbox";
import { insertLiveVersion } from "./versions";
import { postsSettings } from "@/lib/posts/config";
import { insertPostVersion, mergePostGeneration, setPostGeneration } from "@/lib/posts/server/versions";

export type LiveMode = { kind: "new" } | { kind: "direction" } | { kind: "lines"; beats: ScriptBeat[] } | { kind: "edit"; instruction: string } | { kind: "rerender"; edits: NonNullable<NonNullable<JobFile["edit"]>["edits"]> };

export type JobRow = {
  id: string;
  workspace_id: string;
  video_id: string | null;
  post_id: string | null;
  company_id: string | null;
  capture_id: string | null;
  kind: "capture" | "video" | "post";
  mode: JobMode | null;
  input: { edit?: JobFile["edit"]; prevJobId?: string | null; first?: boolean; settings?: JobFile["settings"]; engine?: JobFile["engine"]; request?: string; prevVersion?: number | null };
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

const AI_KIND: Record<string, string> = { "capture-agent": "live_capture", profile: "live_profile", script: "live_script", direct: "live_direct", art: "live_direct", build: "live_build", rebuild: "live_build", "qa-vision": "live_qa", director: "director_agent", "post-write": "post_write", "post-design": "post_design", "post-repair": "post_design", "post-review": "post_design", "post-check": "post_design", "post-image": "post_image" };
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
  const pinned = saved ? usable(((await db.from("live_brand_captures").select("*").eq("id", saved).maybeSingle()).data as CaptureRow | null) ?? null) : null;
  // the latest usable capture — unless an older one has more app screens (a newer capture cut short never replaces it).
  // A capture saved with the company (Add company) is the floor: a newer recapture with at least as many app screens
  // supersedes it (re-reads improve the brand: more screens, seeded data, flow clips), a weaker one never does.
  const { data } = await db.from("live_brand_captures").select("*").eq("company_id", companyId).eq("status", "done").order("created_at", { ascending: false }).limit(10);
  const all = ((data ?? []) as CaptureRow[]).filter((c) => usable(c));
  if (pinned) {
    const newer = all.find((c) => c.id !== pinned.id && c.created_at > pinned.created_at && (c.app_screens ?? 0) >= (pinned.app_screens ?? 0));
    if (newer) console.log(`[live] company ${companyId}: capture ${newer.id} (${newer.app_screens} app screens, ${newer.created_at.slice(0, 16)}) supersedes the saved ${pinned.id} (${pinned.app_screens})`);
    return newer ?? pinned;
  }
  const ok = all;
  let best = ok[0] ?? null;
  for (const c of ok.slice(1)) if ((c.app_screens ?? 0) > (best?.app_screens ?? 0)) best = c;
  if (best && ok[0] && best.id !== ok[0].id) console.warn(`[live] company ${companyId}: kept capture ${best.id} (${best.app_screens} app screens) — the newer ${ok[0].id} has only ${ok[0].app_screens ?? 0} (${ok[0].app_status})`);
  return best;
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
  if (mode.kind === "lines" || mode.kind === "edit" || mode.kind === "rerender") {
    const { data: prev } = await db.from("video_versions").select("live_job_id").eq("video_id", videoId).eq("engine", "live").order("version", { ascending: false }).limit(1).maybeSingle();
    if (!prev?.live_job_id) return setGeneration(videoId, { stage: "edit_failed", mode: mode.kind }, "ready");
    prevJobId = prev.live_job_id;
  }
  const capture = await usableCapture(company.id);
  // the engine: a new video / another direction takes VIDEO_ENGINE; an edit stays on the engine of the version it edits
  const engine: JobFile["engine"] = prevJobId ? (((await db.from("live_jobs").select("input").eq("id", prevJobId).maybeSingle()).data?.input as JobRow["input"] | null)?.engine ?? "live") : directorEngineEnabled() ? "director" : "live";
  const edit = mode.kind === "lines" ? { lines: linesFromBeats(mode.beats) } : mode.kind === "edit" ? { request: mode.instruction } : mode.kind === "rerender" ? { edits: mode.edits } : undefined;
  const { data: job, error } = await db
    .from("live_jobs")
    .insert({ workspace_id: video.workspace_id, video_id: videoId, company_id: company.id, capture_id: capture?.id ?? null, kind: "video", mode: mode.kind, input: { edit, prevJobId, first: !capture, engine }, status: "queued" })
    .select("*")
    .single();
  if (error || !job) {
    console.error("[live] could not create the video job", { videoId, message: error?.message });
    return setGeneration(videoId, { stage: "error", mode: mode.kind, error: "could not start" }, mode.kind === "lines" || mode.kind === "edit" || mode.kind === "rerender" ? "ready" : "needs_direction");
  }
  await setGeneration(videoId, { stage: capture ? "queued" : "plan", mode: mode.kind, first: !capture }, "generating");
  if (capture) return launch(job.id);
  // a company saved before the live "Add company" flow has no capture yet: capture it now (once), the video waits
  await ensureCaptureJob(video, company.website_url);
}

/** the capture a post is made from: a video's capture (it got inside the app) when there is one; otherwise any finished
 *  capture with the brand's profile — a post needs the brand (logo, colours, site, imagery, facts), not app screens
 *  (a site with no app to sign into ends "blocked" with 0 screens and is still a complete brand) */
async function postCapture(companyId: string) {
  const forVideo = await usableCapture(companyId);
  if (forVideo) return forVideo;
  const db = admin();
  const { data: profile } = await db.from("brand_profiles").select("raw").eq("company_id", companyId).maybeSingle();
  const saved = (profile?.raw as { source?: string; capture_id?: string } | null)?.source === "live" ? (profile!.raw as { capture_id: string }).capture_id : null;
  const done = (q: ReturnType<ReturnType<typeof admin>["from"]>) => q.select("*").eq("status", "done").not("profile", "is", null);
  if (saved) {
    const { data } = await done(db.from("live_brand_captures")).eq("id", saved).maybeSingle();
    if (data) return data as CaptureRow;
  }
  const { data } = await done(db.from("live_brand_captures")).eq("company_id", companyId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (data as CaptureRow | null) ?? null;
}

/** a post (lib/posts-engine): a worker job on the company's capture; "Request a change" starts from a version */
export async function startPostGeneration(postId: string, opts: { request?: string; fromVersion?: number } = {}) {
  const db = admin();
  const { data: post } = await db.from("posts").select("*").eq("id", postId).single();
  if (!post) return;
  const capture = await postCapture(post.company_id);
  const mode = opts.request ? "edit" : "new";
  if (!capture) return setPostGeneration(postId, { stage: "error", mode, error: "no_capture" }, opts.request ? "ready" : "failed");
  let prevJobId: string | null = null;
  if (opts.request) {
    const q = db.from("post_versions").select("version, job_id").eq("post_id", postId);
    const { data: prev } = await (opts.fromVersion ? q.eq("version", opts.fromVersion) : q.order("version", { ascending: false }).limit(1)).maybeSingle();
    prevJobId = prev?.job_id ?? null;
    if (!prevJobId) return setPostGeneration(postId, { stage: "error", mode, error: "no_version" }, "ready");
  }
  const { data: job, error } = await db
    .from("live_jobs")
    .insert({ workspace_id: post.workspace_id, video_id: null, post_id: postId, company_id: post.company_id, capture_id: capture.id, kind: "post", mode, input: { prevJobId, request: opts.request ?? null, prevVersion: opts.fromVersion ?? null }, status: "queued" })
    .select("id")
    .single();
  if (error || !job) {
    console.error("[posts] could not create the post job", { postId, message: error?.message });
    return setPostGeneration(postId, { stage: "error", mode, error: "could not start" }, opts.request ? "ready" : "failed");
  }
  await setPostGeneration(postId, { stage: "queued", mode, job_id: job.id, started_at: now(), progress: {} }, "generating");
  return launch(job.id);
}

/** "Cancel" on a post that is being made: its job stops counting (later reports change nothing); a post with an
 *  earlier version goes back to it, a new one is marked failed */
export async function cancelPostJob(postId: string) {
  const db = admin();
  const { data: jobs } = await db.from("live_jobs").select("id").eq("post_id", postId).in("status", ["queued", "running"]);
  for (const j of jobs ?? []) await patchJob(j.id, { status: "failed", error: "cancelled by the user" });
  const { count } = await db.from("post_versions").select("id", { count: "exact", head: true }).eq("post_id", postId);
  await setPostGeneration(postId, { stage: "cancelled" }, count ? "ready" : "failed");
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

/** the brand's industry, countries and — when the client chose to use them — its social handles (0014) */
async function jobMarket(companyId: string): Promise<JobFile["market"] | null> {
  const { data, error } = await admin().from("companies").select("industry, countries, socials").eq("id", companyId).maybeSingle();
  if (error || !data) return null;
  const s = (data.socials ?? {}) as Record<string, unknown>;
  const socials = s.use === true ? Object.entries(s).filter(([k, v]) => k !== "use" && typeof v === "string").map(([platform, url]) => { let parts: string[] = []; try { parts = new URL(String(url)).pathname.split("/").filter(Boolean); } catch { /* kept as saved */ } return { platform, url: String(url), handle: parts.length ? `@${parts.at(-1)!.replace(/^@/, "")}` : "" }; }).filter((x) => x.handle) : [];
  if (!data.industry && !(data.countries as string[] | null)?.length && !socials.length) return null;
  return { industry: (data.industry as string | null) ?? null, countries: (data.countries as string[] | null) ?? [], socials };
}

export async function launch(jobId: string) {
  const db = admin();
  const job = await getJob(jobId);
  if (!job || job.status === "done" || job.status === "failed") return;
  const { data: capture } = job.capture_id ? await db.from("live_brand_captures").select("*").eq("id", job.capture_id).single() : { data: null };
  if (!capture) return failJob(job, "missing capture");
  let brief: Brief;
  // the piece's content type and references (migration 0014; absent before it)
  let piece: { content_type?: string | null; refs?: unknown } | null = null;
  let post: { id: string; type: "single" | "carousel" | "text"; platforms: ("facebook" | "instagram" | "tiktok" | "linkedin" | "x")[]; brief: string; dialect: string; ai_image: "auto" | "yes" | "no"; slides: number | null; placement?: string | null } | null = null;
  if (job.kind === "capture") brief = captureBrief(capture.site_url);
  else if (job.kind === "post") {
    post = (await db.from("posts").select("*").eq("id", job.post_id!).single()).data;
    if (!post) return failJob(job, "missing post");
    piece = post as unknown as { content_type?: string | null; refs?: unknown };
    brief = { ...captureBrief(capture.site_url), objective: "awareness" };
  } else {
    const { data: video } = await db.from("videos").select("*").eq("id", job.video_id!).single();
    const { data: company } = await db.from("companies").select("website_url").eq("id", job.company_id!).single();
    if (!video || !company?.website_url) return failJob(job, "missing video or company website");
    piece = video;
    // the brand folder is the capture's site (brands/<slug> as in the sandbox), the brief the video's
    brief = { ...briefFor(video, company.website_url), url: capture.site_url ?? company.website_url };
  }
  if (flowClipsEnabled() && job.kind !== "post") brief = { ...brief, flowClips: true };
  const ids = { workspaceId: job.workspace_id, captureId: capture.id };
  const brandPrefix = storagePath("brand/x", ids).replace(/\/x$/, "");
  const downloads: JobFile["downloads"] = [];
  const add = async (storage: string, logical: string) => downloads.push({ path: logical, url: await sign(storage) });

  const needBrand = job.kind === "video" || job.kind === "post" || job.done_steps.includes("capture");
  if (needBrand) {
    // a video job reads only the live UI clones, their assets and the library (logo, images) — not the agent / html / probes / screens packs
    // video jobs read the live UI clones, their assets, the library — and the flow clips when the experiment is on;
    // a director job also reads the screenshots and UI blocks (never the agent / html / probes packs, never auth.json)
    const director = job.kind === "video" && job.input.engine === "director";
    const keep = job.kind === "post" ? /^(clones|assets|library)\.tgz(\.part\d+)?$/ : director ? /^(clips|clones|assets|library|screens|parts)\.tgz(\.part\d+)?$/ : job.kind === "video" ? (flowClipsEnabled() ? /^(clips|clones|assets|library)\.tgz(\.part\d+)?$/ : /^(clones|assets|library)\.tgz(\.part\d+)?$/) : /./;
    const packs = await listFiles(`${brandPrefix}/_pack`);
    for (const f of packs) if (keep.test(f.split("/").pop()!)) await add(f, `brand/_pack/${f.split("/").pop()}`);
    if (job.kind === "video" && flowClipsEnabled()) console.log(`[live] video job ${job.id}: capture ${capture.id} — ${packs.some((f) => /\/clips\.tgz(\.part\d+)?$/.test(f)) ? "flow clips downloaded" : "this capture has no flow clips (recapture with LIVE_FLOW_CLIPS=1)"}`);
    for (const f of ["capture.json", "brand.json"]) if ((await listFiles(brandPrefix)).includes(`${brandPrefix}/${f}`)) await add(`${brandPrefix}/${f}`, `brand/${f}`);
  }
  if (job.kind === "video") {
    // edits start from the previous version's saved script (+ its music for "request a change")
    if (job.input.prevJobId) {
      const prevRun = `${job.workspace_id}/runs/${job.video_id}/${job.input.prevJobId}`;
      // a director edit resumes the same agent: its work dir (plan, composition, transcript), the script and the bed
      const want = job.input.engine === "director" ? ["director.tgz", "script.json", "music.wav"] : job.mode === "edit" ? ["script.json", "assets.json", "music.wav", "art.json"] : ["script.json", "assets.json", "art.json"];
      const have = await listFiles(prevRun);
      for (const f of want) if (have.includes(`${prevRun}/${f}`)) await add(`${prevRun}/${f}`, `run/${f}`);
    }
    // resume: this job's own outputs from finished steps
    if (job.done_steps.length) {
      const own = `${job.workspace_id}/runs/${job.video_id}/${job.id}`;
      for (const f of await listFiles(own)) await add(f, `run/${f.split("/").pop()}`);
    }
  }

  // the client's references for this piece: files into the brand folder (refs/…), links as text
  const refs: NonNullable<JobFile["refs"]> = [], links: NonNullable<JobFile["links"]> = [];
  for (const r of (Array.isArray(piece?.refs) ? piece!.refs : []) as { kind?: string; path?: string; url?: string; name?: string; note?: string }[]) {
    if ((r.kind === "image" || r.kind === "video") && r.path?.startsWith(`${job.workspace_id}/refs/`)) {
      const file = `refs/${r.path.split("/").pop()}`;
      await add(r.path, `brand/${file}`);
      refs.push({ file, kind: r.kind, name: String(r.name ?? ""), ...(r.note ? { note: r.note } : {}) });
    } else if (r.kind === "link" && r.url) links.push({ url: r.url, name: String(r.name ?? ""), ...(r.note ? { note: r.note } : {}) });
  }
  const market = job.company_id ? await jobMarket(job.company_id) : null;

  // "Request a change" of a post: the version it changes (its content, design and AI images) as run/prev/…
  // the company's recent posts: a daily feed keeps one identity but never repeats a concept, subject or layout
  const postHistory: { angle: string; headline: string; scene: string; format?: string }[] = [];
  if (job.kind === "post" && !job.input.request) {
    const { data: recent } = await db.from("post_versions").select("content, post_id, posts!inner(company_id)").eq("posts.company_id", job.company_id!).neq("post_id", job.post_id!).order("created_at", { ascending: false }).limit(20);
    const seen = new Set<string>();
    for (const r of (recent ?? []) as { content: { angle?: string; slides?: { headline?: string; scene?: string; format?: string }[] } | null; post_id: string }[]) {
      if (seen.has(r.post_id) || !r.content?.angle) continue;
      seen.add(r.post_id);
      postHistory.push({ angle: r.content.angle, headline: r.content.slides?.[0]?.headline ?? "", scene: String(r.content.slides?.[0]?.scene ?? "").slice(0, 400), ...(r.content.slides?.[0]?.format ? { format: r.content.slides[0].format } : {}) });
      if (postHistory.length >= 8) break;
    }
  }
  if (job.kind === "post" && job.input.prevJobId) {
    const prevRun = `${job.workspace_id}/posts/${job.post_id}/${job.input.prevJobId}`;
    for (const f of await listFiles(prevRun)) if (/\/(post|design)\.json$/.test(f)) await add(f, `run/prev/${f.split("/").pop()}`);
    for (const f of await listFiles(`${prevRun}/ai`)) await add(f, `run/prev/ai/${f.split("/").pop()}`);
    for (const f of await listFiles(`${prevRun}/slides`)) await add(f, `run/prev/slides/${f.split("/").pop()}`);
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
    ...(job.input.engine === "director" ? { engine: "director" as const, director: directorSettings() } : {}),
    ...(piece?.content_type && piece.content_type !== "standard" ? { contentType: piece.content_type } : {}),
    ...(refs.length ? { refs } : {}),
    ...(links.length ? { links } : {}),
    ...(market ? { market } : {}),
    ...(post ? { post: { postId: post.id, type: post.type, platforms: post.platforms, brief: post.brief, dialect: post.dialect, aiImage: post.ai_image, slides: post.slides ?? null, ...(post.placement === "story" || post.placement === "cover" ? { placement: post.placement } : {}), ...(job.input.request ? { request: job.input.request } : {}), ...(postHistory.length ? { history: postHistory } : {}), ...postsSettings() } } : {}),
  };
  // local runner: a capture whose agent already finished on this machine (but whose upload never reached the app) resumes
  // from that folder at the upload — a relaunch never repeats the agent and its model calls
  if (runnerKind() === "local" && job.kind === "capture" && !job.done_steps.includes("capture")) {
    const from = finishedLocalCapture(job.id, file.slug);
    if (from) { file.resumeFrom = from; console.log(`[live] ${job.id}: resuming the capture from ${path.relative(projectPath(), from)}`); }
  }
  const attempt = job.attempts + 1;
  await patchJob(job.id, { status: "running", token_hash: sha(token), attempts: attempt, runner: runnerKind(), error: null });
  if (job.kind === "capture") await db.from("live_brand_captures").update({ status: "running", updated_at: now() }).eq("id", capture.id);
  try {
    const started = runnerKind() === "sandbox" ? await startSandbox(file, attempt) : await startLocal(file, attempt, (code, dir) => onWorkerExit(job.id, code, dir));
    if (started.sandboxId) await patchJob(job.id, { sandbox_id: started.sandboxId });
  } catch (err) {
    await failJob({ ...job, attempts: attempt }, `could not start the worker: ${err instanceof Error ? err.message : err}`);
  }
}

/** the newest local attempt folder of a job whose capture finished there (capture.json written, "✓ capture:" logged) */
function finishedLocalCapture(jobId: string, slug: string): string | null {
  const root = projectPath(".work", "live", jobId);
  if (!fs.existsSync(root)) return null;
  const attempts = fs.readdirSync(root).filter((d) => /^a\d+$/.test(d)).sort((a, b) => Number(b.slice(1)) - Number(a.slice(1)));
  for (const a of attempts) {
    const brand = path.join(root, a, "brands", slug), log = path.join(root, a, "worker.log");
    if (fs.existsSync(path.join(brand, "capture.json")) && fs.existsSync(log) && /✓ capture:|↺ capture: reusing the finished capture/.test(fs.readFileSync(log, "utf8"))) return brand;
  }
  return null;
}

/** resume a capture / video job by hand (scripts/live-engine/resume-local.ts): back to queued, then launched — a capture
 *  that finished locally continues at its upload */
export async function resumeJob(jobId: string) {
  const job = await getJob(jobId);
  if (!job) throw new Error(`no job ${jobId}`);
  if (job.status === "done") throw new Error(`job ${jobId} is already done`);
  await patchJob(job.id, { status: "queued", error: null, attempts: Math.min(job.attempts, MAX_ATTEMPTS - 1) });
  await launch(job.id);
  return (await getJob(job.id)) ?? job;
}

/** local runner: the child process ended — a worker that failed on its own (exit 1: its retries used up) fails the job
 *  with its last error, so the UI stops waiting even when its "failed" report never arrived; any other exit resumes */
async function onWorkerExit(jobId: string, code: number | null = null, dir?: string) {
  await new Promise((ok) => setTimeout(ok, 2000));
  const job = await getJob(jobId);
  if (!job || job.status === "done" || job.status === "failed") return;
  if (code === 1) {
    const log = dir && fs.existsSync(path.join(dir, "worker.log")) ? fs.readFileSync(path.join(dir, "worker.log"), "utf8").split("\n") : [];
    const last = [...log].reverse().find((l) => l.startsWith("✗ "))?.slice(2).trim();
    const hint = log.some((l) => l.includes("pnpm live:resume")) ? ` — the capture is saved locally; resume it with: pnpm live:resume ${jobId}` : "";
    return failJob(job, `the worker failed: ${last ?? "see worker.log"}${hint}`);
  }
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
  if (job.kind === "post" && job.status === "failed" && r.type !== "log" && r.type !== "upload") return { ok: true, cancelled: true };
  switch (r.type) {
    case "log": {
      await patchJob(job.id, { log: [...(job.log ?? []), ...r.lines].slice(-600) });
      return { ok: true };
    }
    case "stage": {
      await patchJob(job.id, { stage: r.stage });
      if (job.kind === "post") { await mergePostGeneration(job.post_id!, { stage: r.stage, [`at_${r.stage}`]: now() }); return { ok: true }; }
      for (const vid of await videosFor(job)) await setGeneration(vid, { stage: videoStage(job, r.stage), mode: job.mode ?? "new", first: job.kind === "capture" || job.input.first });
      return { ok: true };
    }
    case "ledger": {
      const row = r.row;
      const cost = Number((Number(job.cost_usd) + row.usd).toFixed(5));
      await patchJob(job.id, { ledger: [...(job.ledger ?? []), row], cost_usd: cost });
      const { error } = await db.from("ai_usage").insert({ workspace_id: job.workspace_id, video_id: job.video_id, ...(job.post_id ? { post_id: job.post_id } : {}), kind: aiKind(row.step), model: row.model, input_tokens: row.in, output_tokens: row.out, cache_read_tokens: row.cacheRead, cache_write_tokens: row.cacheWrite });
      if (error) console.error("[live] ai_usage insert failed", { message: error.message });
      if (job.capture_id && job.kind === "capture") await db.from("live_brand_captures").update({ cost_usd: cost, updated_at: now() }).eq("id", job.capture_id);
      if (job.kind === "post" && job.post_id) await mergePostGeneration(job.post_id, { cost_usd: cost });
      return { ok: true };
    }
    case "upload": {
      const ids = { workspaceId: job.workspace_id, companyId: job.company_id, captureId: job.capture_id!, videoId: job.video_id, postId: job.post_id, runFolder: job.id };
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
      // a post's live progress: what each step found (the post page shows it as it happens)
      if (job.kind === "post" && job.post_id && r.info) await mergePostGeneration(job.post_id, {}, (g) => {
        const progress = { ...((g.progress as Record<string, unknown>) ?? {}) };
        if (r.step === "image" || r.step === "check") progress[r.step] = [...(((progress[r.step] as unknown[]) ?? [])), r.info];
        else progress[r.step] = r.info;
        return { progress };
      });
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
  if (job.kind === "post") return [];
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
  if (job.kind === "post") {
    const version = await insertPostVersion(fresh, summary);
    await setPostGeneration(job.post_id!, { stage: "done", mode: job.mode ?? "new", version, cost_usd: Number(Number(fresh.cost_usd).toFixed(4)), seconds: Math.round((Date.now() - new Date(job.created_at).getTime()) / 1000) }, "ready");
    return { ok: true, version };
  }
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
  } else if (job.kind === "post" && job.post_id) {
    const { count } = await db.from("post_versions").select("id", { count: "exact", head: true }).eq("post_id", job.post_id);
    await setPostGeneration(job.post_id, { stage: "error", mode: job.mode ?? "new", error: error.split("\n")[0].slice(0, 300) }, count ? "ready" : "failed");
  } else if (job.video_id) targets.push({ videoId: job.video_id, mode: job.mode ?? "new" });
  for (const t of targets) {
    const { count } = await db.from("video_versions").select("id", { count: "exact", head: true }).eq("video_id", t.videoId);
    await setGeneration(t.videoId, { stage: "error", mode: t.mode, error: error.split("\n")[0].slice(0, 300) }, count ? "ready" : "needs_direction");
  }
}

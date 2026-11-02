import "server-only";
// Usage billing (migration 0017). The workspace pays the real AI cost of what it starts × prices.cost_multiplier;
// a brand capture × prices.capture_multiplier, its first capture free. Before a job: estimate → hold (the job never
// runs on an empty wallet); when it ends: wallet_settle charges the billed cost (at most the hold); a failure on our
// side releases the hold. Every amount here that reaches the UI is the billed one, never the raw cost.
import { createAdminClient } from "@/lib/supabase/admin";
import { withRun, costOf, type RunContext } from "@/lib/ai/usage";
import { directorEngineEnabled, directorSettings } from "@/lib/live-engine/config";
import { postsSettings } from "@/lib/posts/config";

export type BillKind = "video" | "post" | "capture" | "idea" | "plan" | "brand";
export type EstimateInput =
  | { kind: "video"; lengthS: number; mode: "new" | "direction" | "edit" | "lines" | "rerender"; engine?: "director" | "live" }
  | { kind: "post"; type: "single" | "carousel" | "text"; placement?: string | null; slides?: number | null; change?: boolean }
  | { kind: "capture" }
  | { kind: "idea" }
  | { kind: "plan" }
  | { kind: "brand" };
/** usd: the billed estimate shown to the user; holdUsd: what is held until the job ends; minimumUsd: the least a new
 *  piece is charged (billed units, USD) */
export type Estimate = { usd: number; holdUsd: number; free: boolean; minimumUsd: number };

/** a new piece (video, post, story, cover, carousel, text) costs at least this — edits, changes, ideas and captures don't */
export const MIN_NEW_PIECE_EGP = 20;
const isNewPiece = (i: EstimateInput) => (i.kind === "video" && i.mode === "new") || (i.kind === "post" && !i.change);
let egp: { at: number; rate: number } | null = null;
/** the minimum in USD at the latest EGP rate */
export async function minimumUsd() {
  if (!egp || Date.now() - egp.at > 10 * 60_000) {
    const { data } = await admin().from("fx_rates").select("usd_rate").eq("currency_code", "EGP").lte("rate_date", new Date().toISOString().slice(0, 10)).order("rate_date", { ascending: false }).limit(1).maybeSingle();
    egp = { at: Date.now(), rate: Number(data?.usd_rate) || 50 };
  }
  return r4(MIN_NEW_PIECE_EGP / egp.rate);
}

export class InsufficientBalance extends Error {
  constructor(public needUsd: number, public availableUsd: number) { super("insufficient_balance"); }
}

const admin = () => createAdminClient();
const r4 = (n: number) => Math.round(n * 10_000) / 10_000;
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

// ── multipliers (prices table), cached a minute ────────────────────────────────────────────────────────
let mult: { at: number; cost: number; capture: number } | null = null;
export async function multipliers() {
  if (mult && Date.now() - mult.at < 60_000) return mult;
  const { data } = await admin().from("prices").select("key, usd, active_from").in("key", ["cost_multiplier", "capture_multiplier"]).lte("active_from", new Date().toISOString()).order("active_from", { ascending: false });
  const latest = (k: string, d: number) => Number(data?.find((p) => p.key === k)?.usd ?? d);
  mult = { at: Date.now(), cost: latest("cost_multiplier", 2), capture: latest("capture_multiplier", 1) };
  return mult;
}

/** the workspace's first capture is free: true while it has no finished capture (other than `except`) */
export async function firstCaptureFree(workspaceId: string, except?: string | null) {
  let q = admin().from("live_brand_captures").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "done");
  if (except) q = q.neq("id", except);
  return ((await q).count ?? 0) === 0;
}

/** a real cost as the user pays it (the same rule as billed_usd() in SQL) */
export async function billed(workspaceId: string, kind: BillKind, costUsd: number, captureId?: string | null) {
  const m = await multipliers();
  if (kind === "capture") return (await firstCaptureFree(workspaceId, captureId)) ? 0 : r4(costUsd * m.capture);
  return r4(costUsd * m.cost);
}

// ── estimates: the median real cost of the last finished jobs like this one, else a default ──────────
const FALLBACK = { director: { 15: 0.3, 30: 0.5, 45: 0.8, 60: 1, 90: 1.5 } as Record<number, number>, live: 0.1, edit: 0.25, lines: 0.05, post: 0.08, perSlide: 0.05, text: 0.02, postChange: 0.06, capture: 1.5, idea: 0.005, plan: 0.03 };
// the least a job holds (real cost) — enough for an ordinary run even when the history is cheap
const FLOOR: Record<BillKind, number> = { video: 1.5, post: 0.3, capture: 3, idea: 0.02, plan: 0.1, brand: 1 };
const cache = new Map<string, { at: number; usd: number }>();

async function history(key: string, load: () => Promise<number[]>, fallback: number) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.usd;
  const xs = (await load().catch(() => [])).filter((x) => x > 0);
  const usd = xs.length >= 3 ? median(xs) : fallback;
  cache.set(key, { at: Date.now(), usd });
  return usd;
}

async function realEstimate(i: EstimateInput): Promise<number> {
  const db = admin();
  if (i.kind === "capture") return history("capture", async () => ((await db.from("live_jobs").select("cost_usd").eq("kind", "capture").eq("status", "done").order("created_at", { ascending: false }).limit(30)).data ?? []).map((j) => Number(j.cost_usd)), FALLBACK.capture);
  if (i.kind === "idea") return FALLBACK.idea;
  if (i.kind === "plan") return FALLBACK.plan;
  if (i.kind === "brand") return 0.6;
  if (i.kind === "video") {
    if (i.mode === "rerender") return 0;
    const engine = i.engine ?? (directorEngineEnabled() ? "director" : "live");
    const modes = i.mode === "edit" || i.mode === "lines" ? [i.mode] : ["new", "direction"];
    const fallback = i.mode === "edit" ? FALLBACK.edit : i.mode === "lines" ? FALLBACK.lines : engine === "director" ? (FALLBACK.director[i.lengthS] ?? 1) : FALLBACK.live;
    return history(`video:${engine}:${modes[0]}:${i.lengthS}`, async () => {
      const { data: jobs } = await db.from("live_jobs").select("cost_usd, video_id, input").eq("kind", "video").eq("status", "done").in("mode", modes).order("created_at", { ascending: false }).limit(80);
      const mine = (jobs ?? []).filter((j) => ((j.input as { engine?: string } | null)?.engine ?? "live") === engine && j.video_id);
      const { data: vids } = await db.from("videos").select("id, length_s").in("id", [...new Set(mine.map((j) => j.video_id as string))]);
      const len = new Map((vids ?? []).map((v) => [v.id, v.length_s]));
      // edits don't depend on the length; new videos do
      return mine.filter((j) => i.mode === "edit" || i.mode === "lines" || len.get(j.video_id as string) === i.lengthS).map((j) => Number(j.cost_usd));
    }, fallback);
  }
  // posts
  if (i.type === "text") return FALLBACK.text;
  const placement = i.placement ?? "feed", slides = i.type === "carousel" ? Math.max(2, i.slides ?? 3) : 1;
  const per = await history(`post:${i.change ? "edit" : "new"}:${i.type}:${placement}`, async () => {
    const { data: jobs } = await db.from("live_jobs").select("cost_usd, post_id").eq("kind", "post").eq("status", "done").eq("mode", i.change ? "edit" : "new").order("created_at", { ascending: false }).limit(80);
    const { data: posts } = await db.from("posts").select("id, type, placement, slides").in("id", [...new Set((jobs ?? []).map((j) => j.post_id as string).filter(Boolean))]);
    const pm = new Map((posts ?? []).map((p) => [p.id, p]));
    return (jobs ?? []).flatMap((j) => { const p = pm.get(j.post_id as string); if (!p || p.type !== i.type || (p.placement ?? "feed") !== placement) return []; return [Number(j.cost_usd) / (p.type === "carousel" ? Math.max(2, p.slides ?? 3) : 1)]; });
  }, i.change ? FALLBACK.postChange : i.type === "carousel" ? FALLBACK.perSlide : FALLBACK.post);
  return per * slides;
}

/** the engine's own cap per job (real cost): a hold never asks for more than a job can spend */
function capOf(i: EstimateInput) {
  if (i.kind === "video") return directorSettings().maxUsd;
  if (i.kind === "post") return postsSettings().maxUsd;
  return { capture: 6, idea: 0.05, plan: 0.3, brand: 3 }[i.kind];
}

export async function estimate(workspaceId: string, i: EstimateInput): Promise<Estimate> {
  const m = await multipliers();
  const free = i.kind === "capture" && (await firstCaptureFree(workspaceId));
  const factor = free ? 0 : i.kind === "capture" ? m.capture : m.cost;
  const real = await realEstimate(i);
  const min = isNewPiece(i) ? await minimumUsd() : 0;
  if (real <= 0 && !min) return { usd: 0, holdUsd: 0, free, minimumUsd: 0 };
  const hold = Math.min(capOf(i), Math.max(real * 3, FLOOR[i.kind]));
  return { usd: r4(Math.max(real * factor, min)), holdUsd: r4(Math.max(hold * factor, min)), free, minimumUsd: min };
}

// ── holds ────────────────────────────────────────────────────────────────────────────────────────────
export async function available(workspaceId: string) {
  const { data } = await admin().rpc("wallet_available", { p_workspace_id: workspaceId });
  return Number(data ?? 0);
}

type Refs = { videoId?: string | null; postId?: string | null; captureId?: string | null };
/** hold an estimate before the job is made; throws InsufficientBalance when it does not fit */
export async function reserve(workspaceId: string, kind: BillKind, est: Estimate, refs: Refs = {}, note?: string | null) {
  const { data, error } = await admin().rpc("wallet_hold", { p_workspace_id: workspaceId, p_kind: kind, p_amount: est.holdUsd, p_video_id: refs.videoId ?? null, p_post_id: refs.postId ?? null, p_capture_id: refs.captureId ?? null, p_note: note?.slice(0, 200) ?? null, p_minimum: est.minimumUsd });
  if (error) {
    if (/insufficient_balance/.test(error.message)) throw new InsufficientBalance(est.holdUsd, await available(workspaceId));
    throw new Error(`wallet_hold: ${error.message}`);
  }
  return data as string;
}

/** the job made for a piece takes over the piece's open hold; a job nobody held for (a capture a video started, an
 *  edit re-render) gets an empty hold so it is settled the same way */
export async function attachHold(job: { id: string; workspace_id: string; kind: "capture" | "video" | "post" }, refs: Refs, note?: string | null) {
  const db = admin();
  let q = db.from("wallet_holds").select("id").eq("workspace_id", job.workspace_id).eq("status", "open").is("job_id", null);
  q = refs.postId ? q.eq("post_id", refs.postId) : refs.videoId && job.kind === "video" ? q.eq("video_id", refs.videoId) : refs.captureId ? q.eq("capture_id", refs.captureId) : q.eq("id", "00000000-0000-0000-0000-000000000000");
  const { data: open } = await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (open) { await db.from("wallet_holds").update({ job_id: job.id }).eq("id", open.id); return; }
  const { data: id } = await db.rpc("wallet_hold", { p_workspace_id: job.workspace_id, p_kind: job.kind, p_amount: 0, p_video_id: refs.videoId ?? null, p_post_id: refs.postId ?? null, p_capture_id: refs.captureId ?? null, p_note: note?.slice(0, 200) ?? null, p_minimum: 0 });
  if (id) await db.from("wallet_holds").update({ job_id: job.id }).eq("id", id as string);
}

/** a job ended: charge (done, or cancelled by the user) or release (failed on our side) */
export async function closeJobHold(jobId: string, charge: boolean) {
  const db = admin();
  const { data: h } = await db.from("wallet_holds").select("id").eq("job_id", jobId).eq("status", "open").maybeSingle();
  if (!h) return 0;
  if (!charge) { await db.rpc("wallet_release", { p_hold_id: h.id }); return 0; }
  const { data: job } = await db.from("live_jobs").select("cost_usd").eq("id", jobId).maybeSingle();
  const { data, error } = await db.rpc("wallet_settle", { p_hold_id: h.id, p_cost: Number(job?.cost_usd) || 0 });
  if (error) console.error("[billing] settle failed", { jobId, message: error.message });
  return Number(data ?? 0);
}

/** an app-side AI action (a plan's ideas, an idea from a notice): hold its estimate, measure its calls, charge them */
export async function metered<T>(workspaceId: string, kind: "idea" | "plan" | "brand", note: string, fn: () => Promise<T>): Promise<T> {
  const est = await estimate(workspaceId, { kind });
  const hold = await reserve(workspaceId, kind, est, {}, note);
  const ctx: RunContext = { usage: [] };
  try {
    const out = await withRun(ctx, fn);
    await admin().rpc("wallet_settle", { p_hold_id: hold, p_cost: costOf(ctx.usage).usd });
    return out;
  } catch (e) {
    await admin().rpc("wallet_release", { p_hold_id: hold });
    throw e;
  }
}

/** a server action's hold for a piece it is about to start: an error code instead of a throw when it does not fit */
export async function holdPiece(workspaceId: string, i: EstimateInput, refs: Refs, note?: string | null): Promise<{ ok: true; holdId: string | null } | { ok: false; error: "insufficient_balance" }> {
  const est = await estimate(workspaceId, i);
  if (est.holdUsd <= 0) return { ok: true, holdId: null };
  try {
    return { ok: true, holdId: await reserve(workspaceId, i.kind, est, refs, note) };
  } catch (e) {
    if (e instanceof InsufficientBalance) return { ok: false, error: "insufficient_balance" };
    throw e;
  }
}

/** a piece's job never started (missing brand, no version…): its open hold goes back */
export async function releasePiece(refs: Refs) {
  const db = admin();
  let q = db.from("wallet_holds").select("id").eq("status", "open").is("job_id", null);
  q = refs.postId ? q.eq("post_id", refs.postId) : refs.videoId ? q.eq("video_id", refs.videoId) : q.eq("capture_id", refs.captureId ?? "");
  for (const h of (await q).data ?? []) await db.rpc("wallet_release", { p_hold_id: h.id });
}

/** the hold an action made before its piece existed now points at the piece (its job will take it over) */
export async function holdFor(holdId: string, refs: Refs) {
  await admin().from("wallet_holds").update({ video_id: refs.videoId ?? null, post_id: refs.postId ?? null, capture_id: refs.captureId ?? null }).eq("id", holdId).eq("status", "open");
}

export async function releaseHold(holdId: string) {
  await admin().rpc("wallet_release", { p_hold_id: holdId });
}

/** the note a capture shows before it starts: free (the first brand) or its estimate, in the workspace's currency */
export async function captureBilling(workspaceId: string, currency: string, fxRate: number, t: (key: "captureFree" | "captureEstimate", v?: { price: string }) => string, money: (local: number) => string) {
  const est = await estimate(workspaceId, { kind: "capture" });
  return { note: est.free ? t("captureFree") : t("captureEstimate", { price: money(Math.round(est.usd * fxRate * 100) / 100) }), fxRate, currency };
}

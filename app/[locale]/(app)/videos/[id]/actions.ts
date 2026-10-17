"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { getAppContext } from "@/lib/context";
import { assertWithinRateLimit, toAiErrorCode, type AiErrorCode } from "@/lib/ai/usage";
import { runGeneration, undoLatest, type UndoResult } from "@/lib/motion/app";
import { historyFor } from "@/lib/motion/revision";
import type { MotionSpec } from "@/lib/motion/spec";
import { runRender } from "@/lib/render/run";
import { promoteCustom, promoteIllustrations } from "@/lib/motion/promote";
import type { ScriptBeat } from "@motiongx/primitives";
import { liveEngineEnabled } from "@/lib/live-engine/config";
import { answerCode, reviveStalledJobs } from "@/lib/live-engine/server/jobs";

export type ActionResult = { ok: true } | { ok: false; error: AiErrorCode | "generic" };

/** Edits on-screen lines: a new version with the same spec (text elements reference lines as "sN:i").
 *  A live version is rebuilt instead (decision Q10): the edited lines go into its saved script, then
 *  build → music → qa → render run again on the same brand capture — `started: true`. */
export async function saveLines(videoId: string, beats: ScriptBeat[]): Promise<{ ok: true; version: number; started?: boolean } | { ok: false; error?: AiErrorCode | "generic" }> {
  const { supabase } = await getAppContext();
  const { data: latest } = await supabase.from("video_versions").select("*").eq("video_id", videoId).order("version", { ascending: false }).limit(1).maybeSingle();
  if (!latest?.spec && latest?.engine !== "live") return { ok: false };
  const byId = new Map(beats.map((b) => [b.id, b]));
  const scenes = (latest.scenes as ScriptBeat[]).map((b) => {
    const next = byId.get(b.id);
    const lines = (next?.lines ?? b.lines).map((l) => String(l).trim().slice(0, 48)).filter(Boolean).slice(0, 3);
    return { ...b, lines: lines.length ? lines : b.lines };
  });
  if (latest.engine === "live") {
    const res = await startGeneration(videoId, { kind: "lines", beats: scenes });
    return res.ok ? { ok: true, version: latest.version, started: true } : res;
  }
  const version = latest.version + 1;
  const { id: _id, created_at: _c, version: _v, ...rest } = latest;
  void _id;
  void _c;
  void _v;
  // same spec, new lines: the lineage keeps an (empty) inverse patch so undo restores the old lines
  const history = historyFor(latest.spec as MotionSpec, "lines", { version: latest.version, spec: latest.spec });
  const { error } = await supabase.from("video_versions").insert({ ...rest, version, scenes, qa: { ...((latest.qa ?? {}) as Record<string, unknown>), history } });
  if (error) {
    console.error("[studio] save lines failed", { videoId, code: error.code, message: error.message });
    return { ok: false };
  }
  revalidatePath(`/videos/${videoId}`);
  return { ok: true, version };
}

async function startGeneration(videoId: string, mode: Parameters<typeof runGeneration>[1]): Promise<ActionResult> {
  const { supabase, workspace } = await getAppContext();
  try {
    await assertWithinRateLimit(workspace.id);
  } catch (err) {
    return { ok: false, error: toAiErrorCode(err) };
  }
  const { error } = await supabase
    .from("videos")
    .update({ status: "generating", generation: { stage: "queued", mode: mode.kind, ...(await liveMarker(videoId, mode.kind)), updated_at: new Date().toISOString() } })
    .eq("id", videoId);
  if (error) return { ok: false, error: "generic" };
  after(() => runGeneration(videoId, mode));
  revalidatePath(`/videos/${videoId}`);
  return { ok: true };
}

/** the progress panel shows the live engine's timing hint from the first poll */
async function liveMarker(videoId: string, kind: string) {
  if (kind === "new" || kind === "direction") return liveEngineEnabled() ? { engine: "live" } : {};
  const { supabase } = await getAppContext();
  const { data } = await supabase.from("video_versions").select("engine").eq("video_id", videoId).order("version", { ascending: false }).limit(1).maybeSingle();
  return data?.engine === "live" ? { engine: "live" } : {};
}

/** "اتجاه تاني": a fresh treatment + composition. Free; counts toward the AI rate limit. */
export async function anotherDirection(videoId: string) {
  return startGeneration(videoId, { kind: "direction" });
}

/** "اطلب تعديلًا": the coder edits the composition through the QA loop; the last passing version stays if it fails. */
export async function requestEdit(videoId: string, instruction: string, baseRevision?: string) {
  const text = instruction.trim().slice(0, 1000);
  if (!text) return { ok: false, error: "generic" } as ActionResult;
  return startGeneration(videoId, { kind: "edit", instruction: text, baseRevision });
}

/** «تراجع»: restores the previous version through the stored inverse patch (as a new version). */
export async function undoLastChange(videoId: string, version: number, revision: string): Promise<UndoResult> {
  const { supabase } = await getAppContext();
  // RLS: only a member of the video's workspace can see it
  const { data } = await supabase.from("videos").select("id, status").eq("id", videoId).maybeSingle();
  if (!data) return { ok: false, error: "failed" };
  if (data.status === "generating") return { ok: false, error: "stale" };
  const res = await undoLatest(videoId, { version, revision });
  if (res.ok) revalidatePath(`/videos/${videoId}`);
  return res;
}

export async function getGenerationStatus(videoId: string): Promise<{ status: string; generation: Record<string, unknown> } | null> {
  const { supabase } = await getAppContext();
  const { data } = await supabase.from("videos").select("status, generation").eq("id", videoId).maybeSingle();
  const generation = (data?.generation ?? {}) as Record<string, unknown>;
  // live engine without a cron (local runs): the studio's poll doubles as the watchdog, at most once a minute
  if (data?.status === "generating" && generation.engine === "live" && Date.now() - lastRevive > 60_000) {
    lastRevive = Date.now();
    after(() => reviveStalledJobs().then(() => undefined));
  }
  return data ? { status: data.status, generation } : null;
}
let lastRevive = 0;

/** the SMS code the live engine's capture agent asked for (the progress panel's input) */
export async function submitCaptureCode(videoId: string, code: string): Promise<boolean> {
  const { supabase, role } = await getAppContext();
  if (role === "viewer") return false;
  const { data } = await supabase.from("videos").select("id").eq("id", videoId).maybeSingle(); // RLS: members only
  if (!data || !code.trim()) return false;
  const ok = await answerCode(videoId, code);
  if (ok) revalidatePath(`/videos/${videoId}`);
  return ok;
}

/** Music on/off (off keeps the SFX layer). Music is included in the export price. */
export async function setMusicEnabled(videoId: string, enabled: boolean): Promise<boolean> {
  const { supabase } = await getAppContext();
  const { error } = await supabase.from("videos").update({ music_enabled: enabled }).eq("id", videoId);
  return !error;
}

export type ExportResult = { ok: true; costUsd: number; renderId: string } | { ok: false; error: "insufficient" | "generic" };

/** export_video() charges the wallet and queues the render; the render runs after the response. */
export async function exportVideoAction(videoId: string): Promise<ExportResult> {
  const { supabase } = await getAppContext();
  const { data: renderId, error } = await supabase.rpc("export_video", { p_video_id: videoId });
  if (error) {
    if (error.message.includes("insufficient_balance")) return { ok: false, error: "insufficient" };
    console.error("export_video", error.message);
    return { ok: false, error: "generic" };
  }
  const { data: render } = await supabase.from("renders").select("cost_usd").eq("id", renderId).single();
  after(() => runRender(String(renderId)));
  revalidatePath("/", "layout");
  return { ok: true, costUsd: Number(render?.cost_usd ?? 0), renderId: String(renderId) };
}

export async function renderDownloadUrl(renderId: string): Promise<string | null> {
  const { supabase } = await getAppContext();
  const { data: render } = await supabase.from("renders").select("output_path, status, version_id, video_id").eq("id", renderId).maybeSingle();
  if (!render?.output_path || render.status !== "done") return null;
  const { data } = await supabase.storage.from("renders").createSignedUrl(render.output_path, 60 * 60, { download: true });
  // a downloaded video's vetted custom effects and illustrations join the libraries
  if (data?.signedUrl && render.version_id) {
    const versionId = render.version_id;
    after(async () => {
      const { data: v } = await supabase.from("video_versions").select("engine").eq("id", versionId).maybeSingle();
      if (v?.engine === "live") return; // no custom effects / illustrations in live versions
      await promoteCustom(render.video_id, versionId);
      await promoteIllustrations(versionId);
    });
  }
  return data?.signedUrl ?? null;
}

export async function getRenderStatus(renderId: string): Promise<{ status: string; progress: number } | null> {
  const { supabase } = await getAppContext();
  const { data } = await supabase.from("renders").select("status, progress").eq("id", renderId).maybeSingle();
  return data ? { status: data.status, progress: Number(data.progress ?? 0) } : null;
}

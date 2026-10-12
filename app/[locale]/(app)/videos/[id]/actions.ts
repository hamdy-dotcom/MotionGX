"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { getAppContext } from "@/lib/context";
import { assertWithinRateLimit, toAiErrorCode, type AiErrorCode } from "@/lib/ai/usage";
import { runGeneration } from "@/lib/motion/app";
import { runRender } from "@/lib/render/run";
import type { ScriptBeat } from "@motiongx/primitives";

export type ActionResult = { ok: true } | { ok: false; error: AiErrorCode | "generic" };

/** Edits on-screen lines: a new version that reuses the same composition (the code reads lines from props). */
export async function saveLines(videoId: string, beats: ScriptBeat[]): Promise<{ ok: true; version: number } | { ok: false }> {
  const { supabase } = await getAppContext();
  const { data: latest } = await supabase.from("video_versions").select("*").eq("video_id", videoId).order("version", { ascending: false }).limit(1).maybeSingle();
  if (!latest?.composition_js) return { ok: false };
  const byId = new Map(beats.map((b) => [b.id, b]));
  const scenes = (latest.scenes as ScriptBeat[]).map((b) => {
    const next = byId.get(b.id);
    const lines = (next?.lines ?? b.lines).map((l) => String(l).trim().slice(0, 48)).filter(Boolean).slice(0, 3);
    return { ...b, lines: lines.length ? lines : b.lines };
  });
  const version = latest.version + 1;
  const { id: _id, created_at: _c, version: _v, ...rest } = latest;
  void _id;
  void _c;
  void _v;
  const { error } = await supabase.from("video_versions").insert({ ...rest, version, scenes });
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
    .update({ status: "generating", generation: { stage: "queued", mode: mode.kind, updated_at: new Date().toISOString() } })
    .eq("id", videoId);
  if (error) return { ok: false, error: "generic" };
  after(() => runGeneration(videoId, mode));
  revalidatePath(`/videos/${videoId}`);
  return { ok: true };
}

/** "اتجاه تاني": a fresh treatment + composition. Free; counts toward the AI rate limit. */
export async function anotherDirection(videoId: string) {
  return startGeneration(videoId, { kind: "direction" });
}

/** "اطلب تعديلًا": the coder edits the composition through the QA loop; the last passing version stays if it fails. */
export async function requestEdit(videoId: string, instruction: string) {
  const text = instruction.trim().slice(0, 1000);
  if (!text) return { ok: false, error: "generic" } as ActionResult;
  return startGeneration(videoId, { kind: "edit", instruction: text });
}

export async function getGenerationStatus(videoId: string): Promise<{ status: string; generation: Record<string, unknown> } | null> {
  const { supabase } = await getAppContext();
  const { data } = await supabase.from("videos").select("status, generation").eq("id", videoId).maybeSingle();
  return data ? { status: data.status, generation: (data.generation ?? {}) as Record<string, unknown> } : null;
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
  const { data: render } = await supabase.from("renders").select("output_path, status").eq("id", renderId).maybeSingle();
  if (!render?.output_path || render.status !== "done") return null;
  const { data } = await supabase.storage.from("renders").createSignedUrl(render.output_path, 60 * 60, { download: true });
  return data?.signedUrl ?? null;
}

export async function getRenderStatus(renderId: string): Promise<{ status: string; progress: number } | null> {
  const { supabase } = await getAppContext();
  const { data } = await supabase.from("renders").select("status, progress").eq("id", renderId).maybeSingle();
  return data ? { status: data.status, progress: Number(data.progress ?? 0) } : null;
}

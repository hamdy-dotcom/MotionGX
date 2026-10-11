"use server";

import { revalidatePath } from "next/cache";
import { getAppContext } from "@/lib/context";
import { rewriteScene } from "@/lib/script/generate";
import type { Dialect, Scene } from "@/lib/types";

function cleanScenes(scenes: Scene[]): Scene[] {
  return scenes.map((s) => ({
    id: String(s.id),
    title: String(s.title).slice(0, 120),
    duration_s: Math.max(1, Math.round(Number(s.duration_s) || 1)),
    on_screen_text: String(s.on_screen_text ?? "").slice(0, 500),
    voiceover_line: String(s.voiceover_line ?? "").slice(0, 1000),
  }));
}

/** Saves edited scenes as a new version. */
export async function saveVersion(videoId: string, scenes: Scene[]): Promise<{ ok: true; version: number } | { ok: false }> {
  const { supabase } = await getAppContext();
  const { data: latest } = await supabase
    .from("video_versions")
    .select("version, script")
    .eq("video_id", videoId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest) return { ok: false };

  const version = latest.version + 1;
  const { error } = await supabase
    .from("video_versions")
    .insert({ video_id: videoId, version, scenes: cleanScenes(scenes), script: latest.script ?? {} });
  if (error) {
    console.error("saveVersion", error.message);
    return { ok: false };
  }
  revalidatePath(`/videos/${videoId}`);
  return { ok: true, version };
}

/** PHASE 2: ask Claude to rewrite the scene. Mock swaps in alternate wording. */
export async function rewriteSceneAction(scene: Scene, dialect: Dialect): Promise<Scene> {
  await getAppContext();
  return rewriteScene(scene, dialect);
}

/** PHASE 2: send the change request to the script model. Mock just acknowledges it. */
export async function requestEditAction(videoId: string, request: string): Promise<{ ok: boolean }> {
  await getAppContext();
  return { ok: Boolean(videoId && request.trim()) };
}

export type ExportResult = { ok: true; costUsd: number } | { ok: false; error: "insufficient" | "generic" };

/** Creates a queued render and charges the wallet in one transaction (export_video → charge_export). */
export async function exportVideoAction(videoId: string): Promise<ExportResult> {
  const { supabase } = await getAppContext();
  const { data: renderId, error } = await supabase.rpc("export_video", { p_video_id: videoId });
  if (error) {
    if (error.message.includes("insufficient_balance")) return { ok: false, error: "insufficient" };
    console.error("export_video", error.message);
    return { ok: false, error: "generic" };
  }

  // PHASE 3: the renderer picks up the queued render; failures call refund_render().
  const { data: render } = await supabase.from("renders").select("cost_usd").eq("id", renderId).single();
  revalidatePath("/", "layout");
  return { ok: true, costUsd: Number(render?.cost_usd ?? 0) };
}

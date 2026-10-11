"use server";

import { revalidatePath } from "next/cache";
import { getAppContext, type AppContext } from "@/lib/context";
import { applyEditRequest, rewriteOneScene } from "@/lib/script/edit";
import { visualSchema } from "@/lib/script/schema";
import { toAiErrorCode, type AiErrorCode } from "@/lib/ai/usage";
import type { BrandProfile, Scene, Video } from "@/lib/types";

function cleanScenes(scenes: Scene[], voiceover: boolean): Scene[] {
  return scenes.map((s) => {
    const visual = visualSchema.safeParse(s.visual);
    return {
      id: String(s.id),
      title: String(s.title).slice(0, 120),
      duration_s: Math.max(1, Math.round(Number(s.duration_s) || 1)),
      on_screen_text: String(s.on_screen_text ?? "").slice(0, 500),
      voiceover_line: voiceover ? String(s.voiceover_line ?? "").slice(0, 1000) : null,
      ...(visual.success ? { visual: visual.data } : {}),
    };
  });
}

async function loadVideo(ctx: AppContext, videoId: string) {
  const { data } = await ctx.supabase
    .from("videos")
    .select("*, companies(name, brand_profiles(colors, fonts, tone, tagline))")
    .eq("id", videoId)
    .maybeSingle();
  if (!data) return null;
  const video = data as Video & { companies: { name: string; brand_profiles: BrandProfile | BrandProfile[] | null } | null };
  const raw = video.companies?.brand_profiles;
  return { video, brand: { name: video.companies?.name ?? "", profile: Array.isArray(raw) ? (raw[0] ?? null) : (raw ?? null) } };
}

async function insertVersion(ctx: AppContext, videoId: string, scenes: Scene[], voiceover: boolean, scriptPatch: Record<string, unknown> = {}) {
  const { data: latest } = await ctx.supabase
    .from("video_versions")
    .select("version, script")
    .eq("video_id", videoId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest) return null;

  const version = latest.version + 1;
  const { error } = await ctx.supabase
    .from("video_versions")
    .insert({ video_id: videoId, version, scenes: cleanScenes(scenes, voiceover), script: { ...(latest.script ?? {}), ...scriptPatch } });
  if (error) {
    console.error("[studio] insert version failed", { videoId, code: error.code, message: error.message });
    return null;
  }
  revalidatePath(`/videos/${videoId}`);
  return version;
}

/** Saves manually edited scenes as a new version. */
export async function saveVersion(videoId: string, scenes: Scene[]): Promise<{ ok: true; version: number } | { ok: false }> {
  const ctx = await getAppContext();
  const loaded = await loadVideo(ctx, videoId);
  if (!loaded) return { ok: false };
  const version = await insertVersion(ctx, videoId, scenes, loaded.video.voiceover);
  return version ? { ok: true, version } : { ok: false };
}

export type AiEditResult =
  | { ok: true; version: number; scenes: Scene[]; summary?: string }
  | { ok: false; error: AiErrorCode | "generic" };

function editContext(ctx: AppContext, loaded: NonNullable<Awaited<ReturnType<typeof loadVideo>>>) {
  const { video, brand } = loaded;
  return { workspaceId: ctx.workspace.id, brief: video.brief, lengthS: video.length_s, dialect: video.dialect, voiceover: video.voiceover, brand };
}

/** "أعد كتابة المشهد": Claude rewrites one scene (same duration + layout); saved as a new version. */
export async function rewriteSceneAction(videoId: string, scenes: Scene[], index: number): Promise<AiEditResult> {
  const ctx = await getAppContext();
  const loaded = await loadVideo(ctx, videoId);
  if (!loaded || !scenes[index]) return { ok: false, error: "generic" };

  try {
    const scene = await rewriteOneScene(editContext(ctx, loaded), scenes, index);
    const next = scenes.map((s, i) => (i === index ? scene : s));
    const version = await insertVersion(ctx, videoId, next, loaded.video.voiceover, { last_edit: { kind: "rewrite_scene", scene: index + 1 } });
    if (!version) return { ok: false, error: "generic" };
    return { ok: true, version, scenes: cleanScenes(next, loaded.video.voiceover) };
  } catch (err) {
    console.error("[studio] rewrite scene failed", { videoId, index, err });
    return { ok: false, error: toAiErrorCode(err) };
  }
}

/** "اطلب تعديلًا": Claude applies the instruction to the whole script; saved as a new version. */
export async function requestEditAction(videoId: string, scenes: Scene[], instruction: string): Promise<AiEditResult> {
  const ctx = await getAppContext();
  const text = instruction.trim().slice(0, 1000);
  if (!text) return { ok: false, error: "generic" };
  const loaded = await loadVideo(ctx, videoId);
  if (!loaded) return { ok: false, error: "generic" };

  try {
    const result = await applyEditRequest(editContext(ctx, loaded), scenes, text, ctx.locale);
    const version = await insertVersion(ctx, videoId, result.scenes, loaded.video.voiceover, {
      last_edit: { kind: "request_edit", instruction: text, summary: result.summary },
    });
    if (!version) return { ok: false, error: "generic" };
    return { ok: true, version, scenes: cleanScenes(result.scenes, loaded.video.voiceover), summary: result.summary };
  } catch (err) {
    console.error("[studio] request edit failed", { videoId, err });
    return { ok: false, error: toAiErrorCode(err) };
  }
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

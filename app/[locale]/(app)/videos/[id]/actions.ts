"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { getAppContext, type AppContext } from "@/lib/context";
import { applyEditRequest, rewriteOneScene } from "@/lib/script/edit";
import { toAiErrorCode, type AiErrorCode } from "@/lib/ai/usage";
import { loadCompanyBrand } from "@/lib/video/brand-props";
import { kitSceneSchema, type KitScene } from "@/lib/video/kit";
import { nextTrack, trackUrl } from "@/lib/video/music";
import { runRender } from "@/lib/render/run";
import type { Video } from "@/lib/types";

function cleanScenes(scenes: unknown[], voiceover: boolean): KitScene[] {
  return scenes
    .map((s) => kitSceneSchema.safeParse(s))
    .filter((r) => r.success)
    .map((r) => ({ ...r.data, voiceover_line: voiceover ? r.data.voiceover_line : null }));
}

async function loadVideo(ctx: AppContext, videoId: string) {
  const { data } = await ctx.supabase.from("videos").select("*").eq("id", videoId).maybeSingle();
  if (!data) return null;
  const video = data as Video;
  const brand = await loadCompanyBrand(ctx.supabase, video.company_id);
  if (!brand) return null;
  return { video, brand };
}

async function insertVersion(ctx: AppContext, videoId: string, scenes: KitScene[], scriptPatch: Record<string, unknown> = {}) {
  const { data: latest } = await ctx.supabase
    .from("video_versions")
    .select("version, script")
    .eq("video_id", videoId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest) return null;
  const version = latest.version + 1;
  const { error } = await ctx.supabase.from("video_versions").insert({ video_id: videoId, version, scenes, script: { ...(latest.script ?? {}), ...scriptPatch, kit: 1 } });
  if (error) {
    console.error("[studio] insert version failed", { videoId, code: error.code, message: error.message });
    return null;
  }
  revalidatePath(`/videos/${videoId}`);
  return version;
}

/** Saves manually edited scenes as a new version. */
export async function saveVersion(videoId: string, scenes: KitScene[]): Promise<{ ok: true; version: number } | { ok: false }> {
  const ctx = await getAppContext();
  const loaded = await loadVideo(ctx, videoId);
  if (!loaded) return { ok: false };
  const clean = cleanScenes(scenes, loaded.video.voiceover);
  if (!clean.length) return { ok: false };
  const version = await insertVersion(ctx, videoId, clean);
  return version ? { ok: true, version } : { ok: false };
}

export type AiEditResult = { ok: true; version: number; scenes: KitScene[]; summary?: string } | { ok: false; error: AiErrorCode | "generic" };

function editContext(ctx: AppContext, loaded: NonNullable<Awaited<ReturnType<typeof loadVideo>>>) {
  const { video, brand } = loaded;
  return {
    workspaceId: ctx.workspace.id,
    brief: video.brief,
    lengthS: video.length_s,
    pace: video.pace,
    dialect: video.dialect,
    voiceover: video.voiceover,
    brand: { name: brand.name, websiteUrl: brand.websiteUrl, profile: brand.profile },
  };
}

/** "أعد كتابة المشهد" (Haiku): one scene, same type + duration; saved as a new version. */
export async function rewriteSceneAction(videoId: string, scenes: KitScene[], index: number): Promise<AiEditResult> {
  const ctx = await getAppContext();
  const loaded = await loadVideo(ctx, videoId);
  const current = loaded ? cleanScenes(scenes, loaded.video.voiceover) : [];
  if (!loaded || !current[index]) return { ok: false, error: "generic" };
  try {
    const scene = await rewriteOneScene(editContext(ctx, loaded), current, index);
    const next = current.map((s, i) => (i === index ? scene : s));
    const version = await insertVersion(ctx, videoId, next, { last_edit: { kind: "rewrite_scene", scene: index + 1 } });
    return version ? { ok: true, version, scenes: next } : { ok: false, error: "generic" };
  } catch (err) {
    console.error("[studio] rewrite scene failed", { videoId, index, err });
    return { ok: false, error: toAiErrorCode(err) };
  }
}

/** "اطلب تعديلًا" (Sonnet): the instruction applied to the whole script; saved as a new version. */
export async function requestEditAction(videoId: string, scenes: KitScene[], instruction: string): Promise<AiEditResult> {
  const ctx = await getAppContext();
  const text = instruction.trim().slice(0, 1000);
  const loaded = text ? await loadVideo(ctx, videoId) : null;
  if (!loaded) return { ok: false, error: "generic" };
  try {
    const result = await applyEditRequest(editContext(ctx, loaded), cleanScenes(scenes, loaded.video.voiceover), text, ctx.locale);
    const version = await insertVersion(ctx, videoId, result.scenes, { last_edit: { kind: "request_edit", instruction: text, summary: result.summary } });
    return version ? { ok: true, version, scenes: result.scenes, summary: result.summary } : { ok: false, error: "generic" };
  } catch (err) {
    console.error("[studio] request edit failed", { videoId, err });
    return { ok: false, error: toAiErrorCode(err) };
  }
}

export type MusicState = { enabled: boolean; music: { url: string; bpm: number } | null; mood: string | null };

async function musicState(ctx: AppContext, enabled: boolean, trackId: string | null): Promise<MusicState> {
  if (!enabled || !trackId) return { enabled, music: null, mood: null };
  const { data: t } = await ctx.supabase.from("music_tracks").select("bpm, mood, storage_path").eq("id", trackId).single();
  return t ? { enabled, music: { url: trackUrl(ctx.supabase, t), bpm: t.bpm }, mood: t.mood } : { enabled, music: null, mood: null };
}

/** Music on/off. Music is included in the export price. */
export async function setMusicEnabled(videoId: string, enabled: boolean): Promise<MusicState | null> {
  const ctx = await getAppContext();
  const { data, error } = await ctx.supabase.from("videos").update({ music_enabled: enabled }).eq("id", videoId).select("pace, music_track_id").single();
  if (error || !data) return null;
  let trackId = data.music_track_id as string | null;
  if (enabled && !trackId) {
    const t = await nextTrack(ctx.supabase, data.pace, null);
    trackId = t?.id ?? null;
    if (t) await ctx.supabase.from("videos").update({ music_track_id: t.id, music_mood: t.mood }).eq("id", videoId);
  }
  return musicState(ctx, enabled, trackId);
}

/** "Change track": next library track at the same pace. */
export async function changeTrack(videoId: string): Promise<MusicState | null> {
  const ctx = await getAppContext();
  const { data } = await ctx.supabase.from("videos").select("pace, music_track_id").eq("id", videoId).single();
  if (!data) return null;
  const t = await nextTrack(ctx.supabase, data.pace, data.music_track_id);
  if (!t) return null;
  const { error } = await ctx.supabase.from("videos").update({ music_track_id: t.id, music_mood: t.mood, music_enabled: true }).eq("id", videoId);
  if (error) return null;
  return musicState(ctx, true, t.id);
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

/** Short-lived download link for a finished render (RLS: members only). */
export async function renderDownloadUrl(renderId: string): Promise<string | null> {
  const { supabase } = await getAppContext();
  const { data: render } = await supabase.from("renders").select("output_path, status").eq("id", renderId).maybeSingle();
  if (!render?.output_path || render.status !== "done") return null;
  const { data } = await supabase.storage.from("renders").createSignedUrl(render.output_path, 60 * 60, { download: true });
  return data?.signedUrl ?? null;
}

/** Polling fallback for render progress (Realtime is primary). */
export async function getRenderStatus(renderId: string): Promise<{ status: string; progress: number } | null> {
  const { supabase } = await getAppContext();
  const { data } = await supabase.from("renders").select("status, progress").eq("id", renderId).maybeSingle();
  return data ? { status: data.status, progress: Number(data.progress ?? 0) } : null;
}

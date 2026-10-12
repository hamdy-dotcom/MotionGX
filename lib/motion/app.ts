import "server-only";
import { mkdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadCompanyBrand } from "@/lib/video/brand-props";
import { EMPTY_FACTS, type BrandFacts } from "@/lib/brand/types";
import { withRun, type RunContext } from "@/lib/ai/usage";
import { pickTrack } from "@/lib/video/music";
import type { Video } from "@/lib/types";
import type { ScriptBeat } from "@motiongx/primitives";
import { codeWithQa, generateMotion, runtimeInput, type PipelineProgress } from "./pipeline";
import { scoreVideo, type ScoredAudio } from "./audio";
import { DbStore, FileStore, type MotionStore } from "./store";
import type { Treatment } from "./director";
import type { QaReport } from "./qa";
import { dimensionsFor, type MotionBrief } from "./types";

export type GenerationMode = { kind: "new" } | { kind: "direction" } | { kind: "edit"; instruction: string };

async function storeFor(): Promise<MotionStore> {
  const admin = createAdminClient();
  const probe = await admin.from("motion_refs").select("id", { count: "exact", head: true });
  // Before 0004 runs (or with an empty library) fall back to the local JSON store.
  if (probe.error || !probe.count) return new FileStore(path.join(os.tmpdir(), "mgx-motion-store.json"));
  return new DbStore(admin);
}

export async function briefFor(video: Video): Promise<MotionBrief | null> {
  const admin = createAdminClient();
  const brand = await loadCompanyBrand(admin, video.company_id);
  if (!brand) return null;
  const { width, height } = dimensionsFor(video.format);
  const facts: BrandFacts = { ...EMPTY_FACTS, cta_url: brand.websiteUrl ?? "", ...(brand.profile?.facts ?? {}) };
  return {
    workspaceId: video.workspace_id,
    videoId: video.id,
    brief: video.brief,
    goal: video.goal,
    format: video.format,
    width,
    height,
    lengthS: video.length_s,
    pace: video.pace,
    dialect: video.dialect,
    voiceover: video.voiceover,
    brand: {
      name: brand.name,
      url: (brand.video.url ?? brand.websiteUrl ?? "").replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, ""),
      tone: brand.profile?.tone ?? "",
      tagline: brand.profile?.tagline ?? "",
      colors: brand.video.colors,
      fonts: brand.video.fonts,
      hasLogo: Boolean(brand.video.logoUrl),
      logoUrl: brand.video.logoUrl,
      logoPlate: brand.video.logoPlate,
      imageUrls: brand.video.imageUrls,
      imageCount: brand.video.imageUrls.length,
    },
    facts,
  };
}

async function setGeneration(videoId: string, patch: Record<string, unknown>, status?: Video["status"]) {
  const admin = createAdminClient();
  const update: Record<string, unknown> = { generation: { ...patch, updated_at: new Date().toISOString() } };
  if (status) update.status = status;
  const { error } = await admin.from("videos").update(update).eq("id", videoId);
  if (error) console.error("[motion] progress update failed", { videoId, code: error.code, message: error.message });
}

async function uploadAudio(workspaceId: string, videoId: string, version: number, audio: ScoredAudio) {
  const admin = createAdminClient();
  const paths: Record<string, string> = {};
  for (const name of ["mix", "sfx", "music"] as const) {
    const p = `generated/${workspaceId}/${videoId}/v${version}/${name}.mp3`;
    const { error } = await admin.storage.from("music").upload(p, readFileSync(audio[name]), { contentType: "audio/mpeg", upsert: true });
    if (error) throw new Error(`audio upload failed: ${error.message}`);
    paths[name] = p;
  }
  return { ...paths, lufs: audio.report.mix_lufs, peak_dbfs: audio.report.mix_peak_dbfs, hits: audio.hits };
}

/** Per-video score when it worked; otherwise the closest track from the 24-track library (no SFX layer). */
async function libraryFallback(video: Video, mood: string) {
  const track = await pickTrack(createAdminClient(), video.pace, mood as Parameters<typeof pickTrack>[2], video.id);
  return track ? { mix: track.storage_path, sfx: null, music: track.storage_path, fallback_track_id: track.id } : {};
}

async function scoreOrNull(...args: Parameters<typeof scoreVideo>): Promise<ScoredAudio | null> {
  try {
    return await scoreVideo(...args);
  } catch (err) {
    console.error("[motion] scoring failed — using the library", err instanceof Error ? err.message : err);
    return null;
  }
}

async function insertVersion(video: Video, data: { script: { title: string; beats: ScriptBeat[] }; code: string; js: string; treatment: Treatment; qa: QaReport[]; audio: ScoredAudio | null }) {
  const admin = createAdminClient();
  const { data: latest } = await admin.from("video_versions").select("version").eq("video_id", video.id).order("version", { ascending: false }).limit(1).maybeSingle();
  const version = (latest?.version ?? 0) + 1;
  const audio = data.audio ? await uploadAudio(video.workspace_id, video.id, version, data.audio) : await libraryFallback(video, data.treatment.music.mood);
  const { error } = await admin.from("video_versions").insert({
    video_id: video.id,
    version,
    scenes: data.script.beats,
    script: { title: data.script.title, generator: "motion", motion_language: data.treatment.motion_language },
    composition_code: data.code,
    composition_js: data.js,
    treatment: data.treatment,
    energy_map: data.treatment.energy,
    qa: data.qa,
    audio,
  });
  if (error) throw new Error(`version insert failed: ${error.message}`);
  return version;
}

async function hasVersion(videoId: string) {
  const { count } = await createAdminClient().from("video_versions").select("id", { count: "exact", head: true }).eq("video_id", videoId);
  return Boolean(count);
}

/**
 * Background generation for a video (runs in `after()`): a new video, "another direction" (fresh
 * treatment + composition) or a change request (coder + QA loop on the current composition).
 * AI calls are free to the user and count toward the hourly AI limit.
 */
export async function runGeneration(videoId: string, mode: GenerationMode) {
  const admin = createAdminClient();
  const { data } = await admin.from("videos").select("*").eq("id", videoId).single();
  const video = data as Video | null;
  if (!video) return;
  const brief = await briefFor(video);
  if (!brief) return setGeneration(videoId, { stage: "error", error: "brand missing" }, "failed");

  const workDir = path.join(os.tmpdir(), "mgx", videoId, String(Date.now()));
  mkdirSync(workDir, { recursive: true });
  let last = 0;
  const progress: PipelineProgress = (stage, detail) => {
    const now = Date.now();
    if (now - last < 1500 && stage !== "done") return;
    last = now;
    void setGeneration(videoId, { stage, detail, mode: mode.kind });
  };

  try {
    if (mode.kind === "edit") {
      const { data: v } = await admin.from("video_versions").select("*").eq("video_id", videoId).order("version", { ascending: false }).limit(1).single();
      if (!v?.composition_code || !v.treatment) throw new Error("no composition to edit");
      const treatment = v.treatment as Treatment;
      const script = { title: (v.script as { title?: string })?.title ?? video.title, beats: v.scenes as ScriptBeat[] };
      await setGeneration(videoId, { stage: "code", mode: "edit" }, "generating");
      const ctx: RunContext = { videoId, usage: [] };
      const coded = await withRun(ctx, () => codeWithQa(brief, treatment, script, runtimeInput(brief, treatment.energy, script), workDir, progress, { instruction: mode.instruction, baseCode: v.composition_code as string }));
      if (!coded.code || !coded.js) {
        // Keep the last passing version; tell the user.
        return setGeneration(videoId, { stage: "edit_failed", mode: "edit", qa: coded.qa.at(-1)?.summary ?? null }, "ready");
      }
      const audio = await scoreOrNull(treatment.energy, coded.sfx, treatment.music.mood, 7, path.join(workDir, "audio"));
      const version = await insertVersion(video, { script, code: coded.code, js: coded.js, treatment, qa: coded.qa, audio });
      return setGeneration(videoId, { stage: "done", mode: "edit", version }, "ready");
    }

    await setGeneration(videoId, { stage: "director", mode: mode.kind }, "generating");
    const store = await storeFor();
    const avoid: string[] = [];
    if (mode.kind === "direction") {
      const { data: v } = await admin.from("video_versions").select("treatment").eq("video_id", videoId).order("version", { ascending: false }).limit(1).maybeSingle();
      const lang = (v?.treatment as Treatment | null)?.motion_language;
      if (lang) avoid.push(lang);
    }
    const result = await generateMotion(brief, store, workDir, { progress, avoidMotionLanguages: avoid, seed: Date.now() % 1000 });
    if (result.status !== "passed" || !result.code || !result.js) {
      // A failed "another direction" keeps the current version playable.
      const { count } = await admin.from("video_versions").select("id", { count: "exact", head: true }).eq("video_id", videoId);
      return setGeneration(videoId, { stage: "needs_direction", mode: mode.kind, qa: result.qa.at(-1)?.summary ?? null }, count ? "ready" : "needs_direction");
    }
    const version = await insertVersion(video, { script: result.script, code: result.code, js: result.js, treatment: result.treatment, qa: result.qa, audio: result.audio });
    await admin.from("videos").update({ title: result.script.title.slice(0, 120), music_mood: result.treatment.music.mood }).eq("id", videoId);
    return setGeneration(videoId, { stage: "done", mode: mode.kind, version }, "ready");
  } catch (err) {
    console.error("[motion] generation failed", { videoId, mode: mode.kind, err });
    return setGeneration(videoId, { stage: "error", mode: mode.kind, error: err instanceof Error ? err.message.slice(0, 300) : String(err) }, mode.kind === "edit" ? "ready" : (await hasVersion(videoId)) ? "ready" : "needs_direction");
  }
}

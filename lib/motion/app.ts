import "server-only";
// App glue for Phase 3C: background generation (runs in `after()`), change requests and storage.
import { mkdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadCompanyBrand } from "@/lib/video/brand-props";
import { EMPTY_FACTS, type BrandFacts } from "@/lib/brand/types";
import { costOf, withRun, type RunContext } from "@/lib/ai/usage";
import type { Video } from "@/lib/types";
import { GENERATION_CAP_USD, generateVideo, runtimeInputFor, type Generation } from "./generate";
import { deriveEvents } from "./events";
import { encodeMp3, renderMusic } from "./music";
import type { Plan } from "./plan";
import { editSpec } from "./spec-gen";
import type { MotionSpec } from "./spec";
import { customLibrary } from "./promote";
import { DbStore } from "./store";
import { dimensionsFor, type MotionBrief } from "./types";
import type { ValidateCtx } from "./validate";

export type GenerationMode = { kind: "new" } | { kind: "direction" } | { kind: "edit"; instruction: string };

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

const audioPath = (video: Video, version: number, name: string) => `generated/${video.workspace_id}/${video.id}/v${version}/${name}`;

async function upload(p: string, file: string, contentType: string) {
  const { error } = await createAdminClient().storage.from("music").upload(p, readFileSync(file), { contentType, upsert: true });
  if (error) throw new Error(`audio upload failed: ${error.message}`);
  return p;
}

async function nextVersion(videoId: string) {
  const { data } = await createAdminClient().from("video_versions").select("version").eq("video_id", videoId).order("version", { ascending: false }).limit(1).maybeSingle();
  return (data?.version ?? 0) + 1;
}

/** Saves a version that plays immediately (WAV); MP3s replace the WAVs when the background encode lands. */
async function insertVersion(video: Video, data: { plan: Plan; spec: MotionSpec; custom: Record<string, string>; validation: unknown; mixWav: string; sfxWav: string; lufs: number | null; peak: number | null }) {
  const admin = createAdminClient();
  const version = await nextVersion(video.id);
  const mix = await upload(audioPath(video, version, "mix.wav"), data.mixWav, "audio/wav");
  const sfx = await upload(audioPath(video, version, "sfx.wav"), data.sfxWav, "audio/wav");
  const { error } = await admin.from("video_versions").insert({
    video_id: video.id,
    version,
    scenes: data.plan.beats,
    script: { title: data.plan.title, generator: "spec", motion_language: data.plan.motion_language },
    spec: data.spec,
    plan: data.plan,
    custom_js: data.custom,
    energy_map: data.plan.energy,
    qa: { validation: data.validation },
    audio: { mix, sfx, lufs: data.lufs, peak_dbfs: data.peak },
  });
  if (error) throw new Error(`version insert failed: ${error.message}`);
  return version;
}

async function finishInBackground(video: Video, version: number, bg: Generation["background"]) {
  try {
    const r = await bg;
    const admin = createAdminClient();
    const { data: v } = await admin.from("video_versions").select("audio, qa").eq("video_id", video.id).eq("version", version).single();
    const audio = { ...((v?.audio ?? {}) as Record<string, unknown>) };
    if (r.mixMp3) audio.mix = await upload(audioPath(video, version, "mix.mp3"), r.mixMp3, "audio/mpeg");
    if (r.sfxMp3) audio.sfx = await upload(audioPath(video, version, "sfx.mp3"), r.sfxMp3, "audio/mpeg");
    await admin.from("video_versions").update({ audio, qa: { ...((v?.qa ?? {}) as Record<string, unknown>), taste: r.taste } }).eq("video_id", video.id).eq("version", version);
  } catch (err) {
    console.error("[motion] background step failed", { videoId: video.id, version, err: err instanceof Error ? err.message : err });
  }
}

const vctxFor = (b: MotionBrief, plan: Plan): ValidateCtx => ({ width: b.width, height: b.height, fps: 30, duration: b.lengthS, energy: plan.energy, beats: plan.beats, colors: b.brand.colors, fonts: b.brand.fonts, lang: b.dialect === "en" ? "en" : "ar", hasLogo: b.brand.hasLogo });

/**
 * Background generation (runs in `after()`): a new video, "another direction" (fresh plan + spec), or
 * a change request (JSON Patch on the current spec + the same validation/repair). AI is free to the
 * user, counts toward the hourly limit and is capped per generation.
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
  const hasVersion = async () => Boolean((await admin.from("video_versions").select("id", { count: "exact", head: true }).eq("video_id", videoId)).count);

  try {
    if (mode.kind === "edit") {
      const { data: v } = await admin.from("video_versions").select("*").eq("video_id", videoId).order("version", { ascending: false }).limit(1).single();
      if (!v?.spec || !v.plan) throw new Error("no spec to edit");
      const plan = { ...(v.plan as Plan), beats: v.scenes } as Plan;
      await setGeneration(videoId, { stage: "spec", mode: "edit" }, "generating");
      const ctx: RunContext = { videoId, usage: [], capUsd: GENERATION_CAP_USD };
      const run = await withRun(ctx, () => editSpec(brief, plan, v.spec as MotionSpec, mode.instruction, vctxFor(brief, plan)));
      if (run.issues.length) return setGeneration(videoId, { stage: "edit_failed", mode: "edit", issues: run.issues.slice(0, 5) }, "ready");
      const events = deriveEvents(run.spec, { width: brief.width, height: brief.height, fps: 30, bpm: plan.energy.bpm, duration: brief.lengthS, hits: plan.energy.hits, lineText: () => null, arabic: () => false, shots: new Map(plan.beats.map((b) => [b.id, { start: b.start_s, end: b.end_s }])) });
      await setGeneration(videoId, { stage: "music", mode: "edit" }, "generating");
      const audio = await renderMusic({ energy: plan.energy, mood: plan.music_mood, events, outDir: path.join(workDir, "audio") });
      const version = await insertVersion(video, { plan, spec: run.spec, custom: (v.custom_js ?? {}) as Record<string, string>, validation: run.rounds, mixWav: audio.mix, sfxWav: audio.sfx, lufs: audio.lufs, peak: audio.truePeak });
      void encodeMp3([audio.mix, audio.sfx]).then(async ([mixMp3, sfxMp3]) => {
        const a = { mix: await upload(audioPath(video, version, "mix.mp3"), mixMp3, "audio/mpeg"), sfx: await upload(audioPath(video, version, "sfx.mp3"), sfxMp3, "audio/mpeg"), lufs: audio.lufs, peak_dbfs: audio.truePeak };
        await admin.from("video_versions").update({ audio: a }).eq("video_id", videoId).eq("version", version);
      });
      return setGeneration(videoId, { stage: "done", mode: "edit", version, cost_usd: Number(costOf(ctx.usage).usd.toFixed(4)) }, "ready");
    }

    await setGeneration(videoId, { stage: "plan", mode: mode.kind }, "generating");
    const avoid: string[] = [];
    if (mode.kind === "direction") {
      const { data: v } = await admin.from("video_versions").select("plan").eq("video_id", videoId).order("version", { ascending: false }).limit(1).maybeSingle();
      const p = v?.plan as Plan | null;
      if (p) avoid.push(`${p.motion_language}: ${p.summary_en}`);
    }
    const g = await generateVideo(brief, new DbStore(admin), workDir, { avoid, customLibrary, progress: (stage) => void setGeneration(videoId, { stage, mode: mode.kind }) });
    if (g.status !== "ready") {
      return setGeneration(videoId, { stage: "needs_direction", mode: mode.kind, issues: g.specRun.issues.slice(0, 5) }, (await hasVersion()) ? "ready" : "needs_direction");
    }
    const version = await insertVersion(video, { plan: g.plan, spec: g.spec, custom: g.custom, validation: g.specRun.rounds, mixWav: g.audio.mix, sfxWav: g.audio.sfx, lufs: g.audio.lufs, peak: g.audio.truePeak });
    await admin.from("videos").update({ title: g.plan.title.slice(0, 120), music_mood: g.plan.music_mood }).eq("id", videoId);
    await setGeneration(videoId, { stage: "done", mode: mode.kind, version, cost_usd: Number(g.costUsd.toFixed(4)), to_preview_s: Number((g.toPreviewMs / 1000).toFixed(1)) }, "ready");
    await finishInBackground(video, version, g.background);
  } catch (err) {
    console.error("[motion] generation failed", { videoId, mode: mode.kind, err });
    return setGeneration(videoId, { stage: "error", mode: mode.kind, error: err instanceof Error ? err.message.slice(0, 300) : String(err) }, mode.kind === "edit" || (await hasVersion()) ? "ready" : "needs_direction");
  }
}

export { runtimeInputFor };

import "server-only";
// Phase 3C pipeline: brief → playable preview in under a minute, ≤ $0.05 of AI.
//   1. plan (director + script, one Sonnet call, cached system) + novelty on the English summary
//   2. in parallel: spec (Haiku, cached system; Sonnet fallback) ‖ music bed from the energy map
//   3. deterministic validation → auto-fixes → ≤ 2 JSON-Patch rounds
//   4. SFX from the finished timeline on the bed → PREVIEW READY
//   5. background: taste QA (Haiku, 4 frames), MP3 encodes, treatment saved to the novelty history
import path from "node:path";
import { CostCapError, costOf, withRun, type RunContext, type UsageEntry } from "@/lib/ai/usage";
import { BEHAVIORS } from "@/remotion/behaviors";
import type { RuntimeInput } from "@/remotion/runtime-input";
import { compileComposition } from "./compile";
import { deriveEvents } from "./events";
import { encodeMp3, renderMusic, type MusicResult } from "./music";
import { makePlan, type Plan } from "./plan";
import { writeSpec, type SpecRun } from "./spec-gen";
import { runSpecJob } from "./spec-runner";
import type { MotionSpec, SoundEvent } from "./spec";
import type { MotionRef, MotionStore } from "./store";
import { tasteQa, type Taste } from "./taste";
import type { MotionBrief } from "./types";
import type { ValidateCtx } from "./validate";

/** Hard cap per generation (the user-facing budget is $0.03; this is the safety net). */
export const GENERATION_CAP_USD = 0.05;

export type Generation = {
  status: "ready" | "needs_direction";
  plan: Plan;
  refs: MotionRef[];
  similarity: number;
  conceptRedos: number;
  spec: MotionSpec;
  specRun: SpecRun;
  custom: Record<string, string>;
  events: SoundEvent[];
  audio: MusicResult;
  input: RuntimeInput;
  usage: UsageEntry[];
  costUsd: number;
  timings: Record<string, number>;
  /** ms from start to a playable preview (spec valid + audio ready) */
  toPreviewMs: number;
  /** resolves when taste QA + MP3s are done */
  background: Promise<{ taste: Taste | null; mixMp3: string | null; sfxMp3: string | null; stills: { t: number; path: string }[]; usage: UsageEntry[]; costUsd: number }>;
};

export function runtimeInputFor(b: MotionBrief, plan: Plan): RuntimeInput {
  return {
    brand: { name: b.brand.name, url: b.brand.url, logoUrl: b.brand.logoUrl, logoPlate: b.brand.logoPlate, imageUrls: b.brand.imageUrls, colors: b.brand.colors },
    fontFamilies: { arabic: b.brand.fonts.arabic, latin: b.brand.fonts.latin },
    lang: b.dialect === "en" ? "en" : "ar",
    dir: b.dialect === "en" ? "ltr" : "rtl",
    width: b.width,
    height: b.height,
    fps: 30,
    durationInFrames: Math.round(b.lengthS * 30),
    energy: plan.energy,
    script: { title: plan.title, beats: plan.beats },
  };
}

/** numbers a video may show: brand facts + any in the client's brief */
export const allowedNumbers = (b: MotionBrief) => [...b.facts.numbers.map((n) => n.value), ...(b.brief.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).match(/\d+(?:\.\d+)?/g) ?? []).map(Number)];

export const behaviorsUsed = (spec: MotionSpec) => [...new Set(spec.elements.flatMap((e) => (e.fx ?? []).map((f) => f.fx)).filter((n) => n in BEHAVIORS))].sort();

/** Compile vetted custom elements; drop any that fail (never fatal). */
async function compileCustom(spec: MotionSpec, library: () => Promise<{ name: string; js: string }[]>) {
  const custom: Record<string, string> = {};
  const dropped: string[] = [];
  let lib: { name: string; js: string }[] | null = null;
  for (const el of spec.elements) {
    if (el.type !== "custom") continue;
    if (el.use) {
      lib ??= await library().catch(() => []);
      const found = lib.find((x) => x.name === el.use);
      if (found) custom[el.id] = found.js;
      else dropped.push(el.id);
      continue;
    }
    const r = el.tsx ? await compileComposition(el.tsx) : null;
    if (r?.ok) custom[el.id] = r.js;
    else dropped.push(el.id);
  }
  return { custom, spec: dropped.length ? { ...spec, elements: spec.elements.filter((e) => !dropped.includes(e.id)) } : spec, dropped };
}

export type GenerationStage = "plan" | "spec" | "music" | "ready";

export async function generateVideo(b: MotionBrief, store: MotionStore, workDir: string, opts: { avoid?: string[]; capUsd?: number; printCost?: boolean; tasteQa?: boolean; progress?: (stage: GenerationStage) => void; customLibrary?: () => Promise<{ name: string; js: string }[]> } = {}): Promise<Generation> {
  const ctx: RunContext = { videoId: b.videoId, usage: [], capUsd: opts.capUsd ?? GENERATION_CAP_USD, printCost: opts.printCost };
  return withRun(ctx, async () => {
    const T0 = Date.now();
    const timings: Record<string, number> = {};
    let t = Date.now();
    opts.progress?.("plan");
    const planned = await makePlan(b, store, { avoid: opts.avoid });
    opts.progress?.("spec");
    timings.plan = Date.now() - t;
    const { plan } = planned;
    const vctx: ValidateCtx = { width: b.width, height: b.height, fps: 30, duration: b.lengthS, energy: plan.energy, beats: plan.beats, colors: b.brand.colors, fonts: b.brand.fonts, lang: b.dialect === "en" ? "en" : "ar", hasLogo: b.brand.hasLogo, allowedNumbers: allowedNumbers(b) };

    // spec ‖ music bed
    t = Date.now();
    const bedP = renderMusic({ energy: plan.energy, mood: plan.music_mood, events: [], outDir: path.join(workDir, "bed") }).then((r) => {
      timings.musicBed = Date.now() - t;
      return r;
    });
    const specP = writeSpec(b, plan, vctx).then((r) => {
      timings.spec = Date.now() - t;
      return r;
    });
    const [bed, specRun] = await Promise.all([bedP, specP]);
    const compiled = await compileCustom(specRun.spec, opts.customLibrary ?? (async () => []));
    const spec = compiled.spec;

    // SFX from the finished timeline on top of the bed
    t = Date.now();
    opts.progress?.("music");
    const env = { width: b.width, height: b.height, fps: 30, bpm: plan.energy.bpm, duration: b.lengthS, hits: plan.energy.hits, lineText: () => null, arabic: () => false, shots: new Map(plan.beats.map((x) => [x.id, { start: x.start_s, end: x.end_s }])) };
    const events = deriveEvents(spec, env);
    const audio = await renderMusic({ energy: plan.energy, mood: plan.music_mood, events, outDir: path.join(workDir, "audio"), bed: bed.mix });
    timings.sfx = Date.now() - t;
    const toPreviewMs = Date.now() - T0;
    opts.progress?.("ready");
    timings.toPreview = toPreviewMs;
    const status = specRun.issues.length ? "needs_direction" : "ready";
    const input = runtimeInputFor(b, plan);

    // background: never blocks the preview
    const bgCtx: RunContext = { videoId: b.videoId, usage: [], capUsd: 0.01, printCost: opts.printCost };
    const background = withRun(bgCtx, async () => {
      const [mixMp3, sfxMp3] = await encodeMp3([audio.mix, audio.sfx]).catch(() => [null, null]);
      let taste: Taste | null = null;
      let stills: { t: number; path: string }[] = [];
      if (opts.tasteQa !== false && status === "ready") {
        const times = [0.18, 0.42, 0.66, 0.9].map((f) => Number((f * b.lengthS).toFixed(2)));
        const r = await runSpecJob({ task: "stills", props: { spec, input, audio: { music: null, sfx: null, voiceover: null }, custom: compiled.custom }, times, outDir: path.join(workDir, "taste"), scale: 0.4 });
        if (r.ok && r.stills) {
          stills = r.stills;
          taste = await tasteQa(b.workspaceId, b.brand.name, plan, stills).catch((err) => {
            if (err instanceof CostCapError) throw err;
            return null;
          });
        }
      }
      await store.saveTreatment({ workspace_id: b.workspaceId, video_id: b.videoId ?? null, concept: plan.summary_en, motion_language: plan.motion_language, ref_ids: planned.refs.map((r) => r.id), embedding: planned.embedding, created_at: new Date().toISOString() });
      return { taste, mixMp3, sfxMp3, stills, usage: bgCtx.usage, costUsd: costOf(bgCtx.usage).usd };
    });

    return {
      status,
      plan,
      refs: planned.refs.map((r) => ({ ...r, embedding: undefined })),
      similarity: planned.similarity,
      conceptRedos: planned.conceptRedos,
      spec,
      specRun,
      custom: compiled.custom,
      events,
      audio,
      input,
      usage: ctx.usage,
      costUsd: costOf(ctx.usage).usd,
      timings,
      toPreviewMs,
      background,
    };
  });
}

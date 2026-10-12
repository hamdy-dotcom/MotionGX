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
import { makePlan, type Plan, type PlanResult } from "./plan";
import { editSpec, writeSpec, type SpecRun } from "./spec-gen";
import { envFor } from "./inspect";
import { slideshowRisk, type SlideshowRisk } from "./slideshow";
import { runSpecJob } from "./spec-runner";
import { prepareAssets } from "./assets";
import type { MotionSpec, SoundEvent } from "./spec";
import type { MotionRef, MotionStore } from "./store";
import { TASTE_FRAMES, tasteQa, type Taste } from "./taste";
import type { MotionBrief } from "./types";
import type { ValidateCtx } from "./validate";

/** Hard cap per generation (the user-facing budget is $0.03; this is the safety net). */
export const GENERATION_CAP_USD = 0.05;

export type Generation = {
  status: "ready" | "needs_direction";
  /** slideshow risk of the delivered spec (+ per-stage log: spec / patch / regenerate) */
  slideshow: SlideshowRisk & { log: { stage: string; score: number }[] };
  plan: Plan;
  refs: (Pick<MotionRef, "id" | "title" | "creator" | "source_url"> & { label: string })[];
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

/** the director's Arabic display face (Arabic videos only; ≤ 2 Arabic families per video) */
export const displayFont = (b: MotionBrief, plan: Plan) => (b.dialect !== "en" && plan.display_font && plan.display_font !== "none" && plan.display_font !== b.brand.fonts.arabic ? plan.display_font : null);

/** runtime input + the glyph runs and assets this spec needs (Node-side; the renderer stays pure) */
export async function runtimeInputWithAssets(b: MotionBrief, plan: Plan, spec: MotionSpec): Promise<RuntimeInput> {
  const input = runtimeInputFor(b, plan);
  return { ...input, ...(await prepareAssets(spec, input)) };
}

export function runtimeInputFor(b: MotionBrief, plan: Plan): RuntimeInput {
  return {
    brand: { name: b.brand.name, url: b.brand.url, logoUrl: b.brand.logoUrl, logoPlate: b.brand.logoPlate, imageUrls: b.brand.imageUrls, colors: b.brand.colors },
    fontFamilies: { arabic: b.brand.fonts.arabic, latin: b.brand.fonts.latin, display: displayFont(b, plan) },
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
/** what the treatment promises on screen (concept + metaphor + motion language + shot visuals) */
export const treatmentText = (plan: Plan) => [plan.concept, plan.summary_en, plan.motion_language, ...plan.shots.map((s) => s.visual)].filter(Boolean).join(" · ");

/** slideshow risk above this → one patch round; still above → regenerate the spec once */
export const SLIDESHOW_MAX = 40;

/** the risk factors that scored, as an instruction for a patch round */
export function riskBrief(r: SlideshowRisk) {
  return r.factors
    .filter((f) => f.points > 0)
    .sort((a, b) => b.points - a.points)
    .map((f) => `${f.detail} → ${f.fix}`)
    .join("; ");
}

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

export async function generateVideo(b: MotionBrief, store: MotionStore, workDir: string, opts: { avoid?: string[]; capUsd?: number; printCost?: boolean; tasteQa?: boolean; progress?: (stage: GenerationStage) => void; planned?: { result: PlanResult; ms: number }; customLibrary?: () => Promise<{ name: string; js: string }[]> } = {}): Promise<Generation> {
  const ctx: RunContext = { videoId: b.videoId, usage: [], capUsd: opts.capUsd ?? GENERATION_CAP_USD, printCost: opts.printCost };
  return withRun(ctx, async () => {
    const T0 = Date.now();
    const timings: Record<string, number> = {};
    let t = Date.now();
    opts.progress?.("plan");
    // A/B harness: a plan made once (with its own duration) can be reused for several spec writers
    const planned = opts.planned?.result ?? (await makePlan(b, store, { avoid: opts.avoid }));
    opts.progress?.("spec");
    timings.plan = opts.planned ? opts.planned.ms : Date.now() - t;
    const { plan } = planned;
    const vctx: ValidateCtx = { width: b.width, height: b.height, fps: 30, duration: b.lengthS, energy: plan.energy, beats: plan.beats, colors: b.brand.colors, fonts: { ...b.brand.fonts, display: displayFont(b, plan) }, lang: b.dialect === "en" ? "en" : "ar", hasLogo: b.brand.hasLogo, allowedNumbers: allowedNumbers(b), treatment: treatmentText(plan) };

    // spec ‖ music bed
    t = Date.now();
    const bedP = renderMusic({ energy: plan.energy, mood: plan.music_mood, events: [], outDir: path.join(workDir, "bed") }).then((r) => {
      timings.musicBed = Date.now() - t;
      return r;
    });
    const env0 = envFor({ width: b.width, height: b.height, fps: 30, duration: b.lengthS, energy: plan.energy, beats: plan.beats });
    const riskLog: { stage: string; score: number }[] = [];
    const specP = writeSpec(b, plan, vctx, planned.refs).then(async (first) => {
      timings.spec = Date.now() - t;
      // slideshow risk: > 40 → one patch round aimed at the worst factors; still > 40 → regenerate once
      let run = first;
      let risk = slideshowRisk(run.spec, env0);
      riskLog.push({ stage: "spec", score: risk.score });
      if (risk.score > SLIDESHOW_MAX && !run.issues.length) {
        const t1 = Date.now();
        const fix = await editSpec(b, plan, run.spec, riskBrief(risk), vctx).catch((err) => {
          if (err instanceof CostCapError) throw err;
          return null;
        });
        if (fix && !fix.issues.length) {
          const r2 = slideshowRisk(fix.spec, env0);
          riskLog.push({ stage: "patch", score: r2.score });
          if (r2.score < risk.score) [run, risk] = [{ ...fix, rounds: [...run.rounds, ...fix.rounds] }, r2];
        }
        timings.slideshowPatch = Date.now() - t1;
        if (risk.score > SLIDESHOW_MAX) {
          const t2 = Date.now();
          const again = await writeSpec(b, plan, vctx, planned.refs, `A previous draft played like a slideshow (risk ${risk.score}/100). Avoid: ${riskBrief(risk)}`).catch((err) => {
            if (err instanceof CostCapError) throw err;
            return null;
          });
          if (again && !again.issues.length) {
            const r3 = slideshowRisk(again.spec, env0);
            riskLog.push({ stage: "regenerate", score: r3.score });
            if (r3.score < risk.score) [run, risk] = [{ ...again, rounds: [...run.rounds, ...again.rounds] }, r3];
          }
          timings.slideshowRegen = Date.now() - t2;
        }
      }
      return { run, risk };
    });
    const [bed, specOut] = await Promise.all([bedP, specP]);
    const specRun = specOut.run;
    const risk = specOut.risk;
    const compiled = await compileCustom(specRun.spec, opts.customLibrary ?? (async () => []));
    const spec = compiled.spec;

    // SFX from the finished timeline on top of the bed
    t = Date.now();
    opts.progress?.("music");
    const env = { width: b.width, height: b.height, fps: 30, bpm: plan.energy.bpm, duration: b.lengthS, hits: plan.energy.hits, lineText: () => null, arabic: () => false, shots: new Map(plan.beats.map((x) => [x.id, { start: x.start_s, end: x.end_s }])) };
    const events = deriveEvents(spec, env);
    const audio = await renderMusic({ energy: plan.energy, mood: plan.music_mood, events, outDir: path.join(workDir, "audio"), bed: bed.mix });
    timings.sfx = Date.now() - t;
    const toPreviewMs = Date.now() - T0 + (opts.planned?.ms ?? 0);
    opts.progress?.("ready");
    timings.toPreview = toPreviewMs;
    const status = specRun.issues.length ? "needs_direction" : "ready";
    const input = await runtimeInputWithAssets(b, plan, spec);

    // background: never blocks the preview
    const bgCtx: RunContext = { videoId: b.videoId, usage: [], capUsd: 0.01, printCost: opts.printCost };
    const background = withRun(bgCtx, async () => {
      const [mixMp3, sfxMp3] = await encodeMp3([audio.mix, audio.sfx]).catch(() => [null, null]);
      let taste: Taste | null = null;
      let stills: { t: number; path: string }[] = [];
      if (opts.tasteQa !== false && status === "ready") {
        const times = TASTE_FRAMES.map((f) => Number((f * b.lengthS).toFixed(2)));
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
      // ids/titles/links only: full reference prompts are internal (AI context), never surfaced
      slideshow: { score: risk.score, factors: risk.factors, log: riskLog },
      refs: planned.refs.map((r) => ({ id: r.id, title: r.title, creator: r.creator, source_url: r.source_url, label: r.card?.motion_language ?? r.title })),
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

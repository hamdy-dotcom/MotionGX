import "server-only";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ScriptBeat } from "@motiongx/primitives";
import { buildTokens } from "@/packages/primitives/src/palette";
import { AiError, withRun, type RunContext, type UsageEntry } from "@/lib/ai/usage";
import type { RuntimeInput } from "@/remotion/MotionVideo";
import { codeComposition, OPUS, SONNET, type CoderFeedback, type SfxEvent } from "./coder";
import { direct, type Treatment } from "./director";
import { visionQa, type QaReport } from "./qa";
import { runMotionJob } from "./runner";
import { writeScript } from "./script";
import { scoreVideo, type ScoredAudio } from "./audio";
import type { MotionStore } from "./store";
import type { MotionBrief } from "./types";

export const MAX_ROUNDS = 4;

export { PRICES, costOf } from "@/lib/ai/usage";

export type PipelineProgress = (stage: "director" | "script" | "code" | "validate" | "qa" | "music" | "done", detail?: string) => void;

export type PipelineResult = {
  status: "passed" | "needs_direction";
  treatment: Treatment;
  refIds: string[];
  similarity: number;
  script: { title: string; beats: ScriptBeat[] };
  code: string | null;
  js: string | null;
  sfx: SfxEvent[];
  qa: QaReport[];
  audio: ScoredAudio | null;
  input: RuntimeInput;
  usage: UsageEntry[];
  timings: Record<string, number>;
};

export function runtimeInput(b: MotionBrief, energy: Treatment["energy"], script: { title: string; beats: ScriptBeat[] }): RuntimeInput {
  return {
    brand: { name: b.brand.name, url: b.brand.url, logoUrl: b.brand.logoUrl, logoPlate: b.brand.logoPlate, imageUrls: b.brand.imageUrls, colors: b.brand.colors },
    fontFamilies: { arabic: b.brand.fonts.arabic, latin: b.brand.fonts.latin },
    lang: b.dialect === "en" ? "en" : "ar",
    dir: b.dialect === "en" ? "ltr" : "rtl",
    width: b.width,
    height: b.height,
    fps: 30,
    durationInFrames: Math.round(b.lengthS * 30),
    energy,
    script,
  };
}

/** QA frames: every hit plus 8 evenly spaced frames. */
export function qaFrames(t: Treatment) {
  const L = t.energy.length_s;
  const even = Array.from({ length: 8 }, (_, i) => ({ t: Number((((i + 0.5) / 8) * L).toFixed(2)), label: `even ${i + 1}/8` }));
  // On the hit itself (spec): the impact frame. Things are mid-entrance there by design; QA knows.
  const hits = t.energy.hits.map((h) => ({ t: Math.min(L - 0.05, h.t), label: `hit: ${h.kind}${h.label ? ` (${h.label})` : ""}` }));
  return [...hits, ...even].sort((a, b) => a.t - b.t);
}

/**
 * Code → validate → vision QA loop (max 4 rounds; rounds 3–4 escalate to Opus).
 * Returns the passing code, or null with every QA report when no round passed.
 */
export async function codeWithQa(
  b: MotionBrief,
  treatment: Treatment,
  script: { title: string; beats: ScriptBeat[] },
  input: RuntimeInput,
  workDir: string,
  progress?: PipelineProgress,
  opts: { instruction?: string; baseCode?: string } = {},
): Promise<{ code: string | null; js: string | null; sfx: SfxEvent[]; qa: QaReport[]; timings: Record<string, number> }> {
  const palette = buildTokens(b.brand.colors);
  const qa: QaReport[] = [];
  const timings: Record<string, number> = {};
  let feedback: CoderFeedback | undefined = opts.baseCode ? { previousCode: opts.baseCode, errors: [] } : undefined;
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    progress?.("code", `round ${round}`);
    let t0 = Date.now();
    const model = round >= 3 ? OPUS : SONNET;
    let coded: Awaited<ReturnType<typeof codeComposition>>;
    try {
      coded = await codeComposition(b, treatment, script, { model, feedback, instruction: round === 1 ? opts.instruction : undefined });
    } catch (err) {
      // A cut-off or malformed answer is a failed round, not a failed video.
      if (!(err instanceof AiError) || err.code !== "ai_invalid") throw err;
      timings[`code_r${round}`] = Date.now() - t0;
      qa.push({ pass: false, score: 0, treatment_followed: false, issues: [{ check: "render_error", severity: "blocking", t: null, detail: err.message }], summary: err.message, static_spans: [], round, checked_frames: [] });
      feedback = { previousCode: feedback?.previousCode ?? opts.baseCode ?? "", errors: [`Your previous answer was unusable (${err.message}). Write a tighter complete file (under 450 lines) with helpers instead of repetition.`], stills: feedback?.stills };
      continue;
    }
    const { code, sfx } = coded;
    timings[`code_r${round}`] = Date.now() - t0;

    progress?.("validate", `round ${round}`);
    t0 = Date.now();
    const frames = qaFrames(treatment);
    const roundDir = path.join(workDir, `r${round}`);
    mkdirSync(roundDir, { recursive: true });
    writeFileSync(path.join(roundDir, "composition.tsx"), code);
    const res = await runMotionJob({ task: "validate", source: code, input, stills: frames, outDir: roundDir });
    if (!res.ok) writeFileSync(path.join(roundDir, "errors.txt"), `${res.stage}\n${res.errors.join("\n")}`);
    timings[`validate_r${round}`] = Date.now() - t0;
    if (!res.ok) {
      console.warn(`[motion] round ${round} ${res.stage} failed: ${res.errors.slice(0, 3).join(" | ").slice(0, 600)}`);
      const report: QaReport = { pass: false, score: 0, treatment_followed: false, issues: res.errors.map((e) => ({ check: "render_error" as const, severity: "blocking" as const, t: null, detail: `${res.stage}: ${e}` })), summary: `${res.stage} failed`, static_spans: [], round, checked_frames: [] };
      qa.push(report);
      feedback = { previousCode: code, errors: res.errors.map((e) => `${res.stage === "compile" ? "Compile/typecheck" : "Render"} error: ${e}`) };
      continue;
    }

    progress?.("qa", `round ${round}`);
    t0 = Date.now();
    const report = await visionQa({ workspaceId: b.workspaceId, stills: res.stills ?? [], treatment, script, palette, staticSpans: res.staticSpans ?? [], round, lang: input.lang });
    timings[`qa_r${round}`] = Date.now() - t0;
    qa.push(report);
    console.log(`[motion] round ${round} QA ${report.pass ? "PASS" : "fail"} score ${report.score}: ${report.issues.map((i) => `${i.check}${i.t !== null ? `@${i.t}` : ""}`).join(", ") || "no issues"}`);
    if (report.pass) return { code, js: res.js, sfx, qa, timings };

    const flagged = new Set(report.issues.map((i) => i.t).filter((t): t is number => t !== null));
    const stills = (res.stills ?? [])
      .filter((s) => flagged.size === 0 || [...flagged].some((t) => Math.abs(t - s.t) < 0.6))
      .slice(0, 6)
      .map((s) => ({ t: s.t, label: s.label, jpegBase64: readFileSync(s.path).toString("base64") }));
    const typeNotes = (res.warnings ?? []).slice(0, 8).map((w) => `TypeScript (non-blocking, fix while you're there): ${w}`);
    feedback = { previousCode: code, errors: [...report.issues.map((i) => `[${i.severity === "minor" ? "minor " : ""}${i.check}${i.t !== null ? ` @${i.t}s` : ""}] ${i.detail}`), ...typeNotes], stills };
  }
  return { code: null, js: null, sfx: [], qa, timings };
}

/** Full generation for one video: director → script → coder/QA loop → per-video music. */
export async function generateMotion(
  b: MotionBrief,
  store: MotionStore,
  workDir: string,
  opts: { progress?: PipelineProgress; avoidMotionLanguages?: string[]; seed?: number } = {},
): Promise<PipelineResult> {
  const ctx: RunContext = { videoId: b.videoId, usage: [] };
  return withRun(ctx, async () => {
    const timings: Record<string, number> = {};
    let t0 = Date.now();
    opts.progress?.("director");
    const dir = await direct(b, store, { avoidMotionLanguages: opts.avoidMotionLanguages });
    timings.director = Date.now() - t0;

    t0 = Date.now();
    opts.progress?.("script");
    const script = await writeScript(b, dir.treatment);
    timings.script = Date.now() - t0;

    const input = runtimeInput(b, dir.treatment.energy, script);
    const coded = await codeWithQa(b, dir.treatment, script, input, workDir, opts.progress);
    Object.assign(timings, coded.timings);

    let audio: ScoredAudio | null = null;
    if (coded.code) {
      t0 = Date.now();
      opts.progress?.("music");
      try {
        audio = await scoreVideo(dir.treatment.energy, coded.sfx, dir.treatment.music.mood, opts.seed ?? 7, path.join(workDir, "audio"));
      } catch (err) {
        // The caller falls back to the 24-track library.
        console.error("[motion] scoring failed", err instanceof Error ? err.message : err);
      }
      timings.music = Date.now() - t0;
      await store.saveTreatment({
        workspace_id: b.workspaceId,
        video_id: b.videoId ?? null,
        concept: dir.treatment.concept,
        motion_language: dir.treatment.motion_language,
        ref_ids: dir.refs.map((r) => r.id),
        embedding: dir.embedding,
        created_at: new Date().toISOString(),
      });
    }
    opts.progress?.("done");
    if (!coded.code && !coded.qa.length) throw new AiError("ai_failed", "no code produced");
    return {
      status: coded.code ? "passed" : "needs_direction",
      treatment: dir.treatment,
      refIds: dir.refs.map((r) => r.id),
      similarity: dir.similarity,
      script,
      code: coded.code,
      js: coded.js,
      sfx: coded.sfx,
      qa: coded.qa,
      audio,
      input,
      usage: ctx.usage,
      timings,
    };
  });
}

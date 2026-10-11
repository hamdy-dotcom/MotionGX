import { z } from "zod";
import { COLOR_ROLES, LAYOUTS, MOTIONS, type Pace, type Scene } from "@/lib/types";

export const SCENE_RANGE: Record<Pace, [number, number]> = {
  calm: [4, 6],
  medium: [6, 8],
  fast: [8, 11],
};

export const MAX_WORDS_PER_LINE = 7;

export const visualSchema = z.object({
  layout: z.enum(LAYOUTS),
  emphasis_color_role: z.enum(COLOR_ROLES),
  motion: z.enum(MOTIONS),
});

export const sceneSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(80),
  duration_s: z.number().int().min(1),
  on_screen_text: z.string().min(1).max(200),
  voiceover_line: z.string().max(600).nullable(),
  visual: visualSchema,
});

export const scriptSchema = z.object({ scenes: z.array(sceneSchema).min(1).max(14) });

/** Strict JSON schema mirror of sceneSchema for the tool definition. */
export const sceneJsonSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    title: { type: "string", description: "Short scene name, in the video's language." },
    duration_s: { type: "integer", description: "Whole seconds, at least 1." },
    on_screen_text: { type: "string", description: `On-screen copy. Max ${MAX_WORDS_PER_LINE} words per line, at most 2 lines separated by \\n. No emoji.` },
    voiceover_line: { anyOf: [{ type: "string" }, { type: "null" }], description: "Spoken line, or null when voiceover is off." },
    visual: {
      type: "object",
      properties: {
        layout: { type: "string", enum: [...LAYOUTS] },
        emphasis_color_role: { type: "string", enum: [...COLOR_ROLES] },
        motion: { type: "string", enum: [...MOTIONS] },
      },
      required: ["layout", "emphasis_color_role", "motion"],
      additionalProperties: false,
    },
  },
  required: ["id", "title", "duration_s", "on_screen_text", "voiceover_line", "visual"],
  additionalProperties: false,
} as const;

const EMOJI = /\p{Extended_Pictographic}/u;

/** Problems the model can fix on retry. Empty array = valid. */
export function scriptProblems(
  scenes: Scene[],
  { lengthS, voiceover, sceneRange }: { lengthS: number; voiceover: boolean; sceneRange?: [number, number] },
): string[] {
  const problems: string[] = [];
  const sum = scenes.reduce((s, x) => s + x.duration_s, 0);
  if (sum !== lengthS) problems.push(`scene durations sum to ${sum}s but must sum to exactly ${lengthS}s`);
  if (sceneRange && (scenes.length < sceneRange[0] || scenes.length > sceneRange[1])) {
    problems.push(`use ${sceneRange[0]}–${sceneRange[1]} scenes (got ${scenes.length})`);
  }
  scenes.forEach((s, i) => {
    const n = i + 1;
    if (EMOJI.test(s.on_screen_text) || (s.voiceover_line && EMOJI.test(s.voiceover_line))) problems.push(`scene ${n}: remove emoji`);
    const longLine = s.on_screen_text.split("\n").find((line) => line.trim().split(/\s+/).length > MAX_WORDS_PER_LINE + 1);
    if (longLine) problems.push(`scene ${n}: on_screen_text line "${longLine}" is too long (max ${MAX_WORDS_PER_LINE} words per line)`);
    if (voiceover && !s.voiceover_line?.trim()) problems.push(`scene ${n}: voiceover_line is required`);
    if (!voiceover && s.voiceover_line !== null) problems.push(`scene ${n}: voiceover_line must be null (voiceover is off)`);
  });
  return problems;
}

/** Last-resort fix after the retry: rescale durations to sum exactly to lengthS (largest remainder, ≥1 s each). */
export function fitDurations(scenes: Scene[], lengthS: number): Scene[] {
  const weights = scenes.map((s) => Math.max(1, s.duration_s));
  const total = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w / total) * lengthS);
  const out = raw.map((r) => Math.max(1, Math.floor(r)));
  let diff = lengthS - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; diff > 0; k = (k + 1) % order.length, diff--) out[order[k].i]++;
  for (let k = 0; diff < 0; k = (k + 1) % out.length) {
    const i = out.indexOf(Math.max(...out));
    if (out[i] > 1) {
      out[i]--;
      diff++;
    }
    if (k > lengthS * 4) break;
  }
  return scenes.map((s, i) => ({ ...s, duration_s: out[i] }));
}

/** Stable ids s1..sN regardless of what the model returned. */
export function withIds(scenes: Scene[]): Scene[] {
  return scenes.map((s, i) => ({ ...s, id: `s${i + 1}` }));
}

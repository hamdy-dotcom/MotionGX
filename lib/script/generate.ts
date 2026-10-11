import "server-only";
import { callTool } from "@/lib/ai/claude";
import { AiError } from "@/lib/ai/usage";
import type { BrandProfile, Dialect, Goal, Pace, Scene, VideoFormat } from "@/lib/types";
import {
  MAX_WORDS_PER_LINE,
  SCENE_RANGE,
  fitDurations,
  sceneJsonSchema,
  scriptProblems,
  scriptSchema,
  withIds,
} from "./schema";

export const DIALECT_GUIDE: Record<Dialect, string> = {
  eg: 'Egyptian Arabic (عامية مصرية), written in Arabic script. Natural Cairo marketing voice: دلوقتي، عايز، إزاي، كده، بتاعك، أوي. Not MSA.',
  sa: 'Saudi Arabic (لهجة سعودية بيضاء), written in Arabic script: الحين، وش، أبغى، مرة (=very)، زين، كذا. Not MSA, not Egyptian.',
  gulf: 'Gulf/Emirati Arabic (لهجة خليجية), written in Arabic script: الحين، شو، أبا، وايد، زين، چذي/كذا. Not MSA, not Egyptian.',
  lev: 'Levantine Arabic (لهجة شامية), written in Arabic script: هلق، شو، بدك، كتير، منيح، هيك. Not MSA, not Egyptian.',
  msa: 'Modern Standard Arabic (فصحى), clear and contemporary, written in Arabic script.',
  en: 'English. Natural, punchy marketing copy.',
};

const GOAL_GUIDE: Record<Goal, string> = {
  sell: "sell a specific product — benefit-led, end with a buy/order CTA",
  launch: "announce a launch — build anticipation, reveal, CTA",
  offer: "promote an offer or discount — make the deal and its deadline unmissable",
  about: "introduce the company — who they are, what they do, why trust them",
  hiring: "recruit — the role, why join, how to apply",
  occasion: "celebrate an occasion (holiday/season) on-brand, soft CTA",
};

const PACE_GUIDE: Record<Pace, string> = {
  calm: "calm: fewer, longer scenes; gentle motion (rise, slide)",
  medium: "medium: balanced rhythm",
  fast: "fast: many short punchy scenes; energetic motion (pop, slide, count)",
};

const FORMAT_GUIDE: Record<VideoFormat, string> = {
  "9:16": "vertical 9:16 (Reels/TikTok) — very short lines, big type",
  "1:1": "square 1:1 (feed)",
  "16:9": "landscape 16:9 (YouTube/web)",
};

export type ScriptInput = {
  workspaceId: string;
  brief: string;
  goal: Goal;
  format: VideoFormat;
  lengthS: number;
  pace: Pace;
  dialect: Dialect;
  voiceover: boolean;
  brand: { name: string; profile: BrandProfile | null };
};

export function brandContext(brand: ScriptInput["brand"]) {
  const p = brand.profile;
  const colors = (p?.colors ?? []).map((c) => `${c.role ?? "color"} ${c.hex}`).join(", ") || "not set";
  return [
    `Brand name: ${brand.name}`,
    `Brand colors (by role): ${colors}`,
    `Tone: ${p?.tone || "not set"}`,
    `Tagline: ${p?.tagline || "not set"}`,
  ].join("\n");
}

export function scriptRules({ dialect, voiceover }: { dialect: Dialect; voiceover: boolean }) {
  return `You write scripts for short motion-graphics marketing videos (animated type, shapes, logo — no actors, no stock footage).

Language: write every title, on_screen_text and voiceover_line in ${DIALECT_GUIDE[dialect]}

Rules:
- on_screen_text: at most ${MAX_WORDS_PER_LINE} words per line, at most 2 lines (separate with \\n). No emoji. No hashtags.
- duration_s: whole seconds, at least 1. Durations MUST add up exactly to the requested length.
- ${voiceover ? `voiceover_line: one spoken line per scene that fits its duration (about ${dialect === "en" ? "2.5" : "2"} words per second). It complements the on-screen text rather than repeating it word for word.` : "voiceover_line: must be null for every scene (no voiceover)."}
- visual.layout: hero (one big statement), split (text + shape/visual side by side), list (2–3 short points), stat (a number/price), logo (brand logo moment), cta (closing call to action). Use logo at most twice; the last scene should normally be cta.
- visual.emphasis_color_role: which brand color highlights the key word — primary, ink, accent or background.
- visual.motion: rise, pop, slide, or count (count only for stat scenes).
- title: 1–4 word internal scene name in the same language.
- Use the brand's real name and offer details from the brief. Never invent prices, dates or claims the brief doesn't support.`;
}

const scriptTool = {
  name: "save_script",
  description: "Save the finished video script as an ordered list of scenes.",
  input_schema: {
    type: "object" as const,
    properties: { scenes: { type: "array", items: sceneJsonSchema } },
    required: ["scenes"],
    additionalProperties: false,
  },
};

export async function generateScript(input: ScriptInput): Promise<{ scenes: Scene[]; script: Record<string, unknown> }> {
  const range = SCENE_RANGE[input.pace];
  const prompt = `${brandContext(input.brand)}

Video:
- Goal: ${GOAL_GUIDE[input.goal]}
- Format: ${FORMAT_GUIDE[input.format]}
- Length: exactly ${input.lengthS} seconds
- Pace: ${PACE_GUIDE[input.pace]} — use ${range[0]}–${range[1]} scenes
- Voiceover: ${input.voiceover ? "on" : "off"}

Brief from the client:
"""
${input.brief}
"""

Call save_script with the scenes.`;

  const check = ({ scenes }: { scenes: Scene[] }) => {
    const problems = scriptProblems(scenes, { lengthS: input.lengthS, voiceover: input.voiceover, sceneRange: range });
    return problems.length ? problems.join("; ") : null;
  };

  const result = await callTool({
    workspaceId: input.workspaceId,
    kind: "script",
    system: scriptRules(input),
    prompt,
    tool: scriptTool,
    schema: scriptSchema,
    check,
  });

  let scenes: Scene[];
  if (result.value) {
    scenes = result.value.scenes;
  } else {
    // Retry still invalid. If the structure is fine, fix the duration sum ourselves; otherwise give up.
    const parsed = scriptSchema.safeParse(result.lastInput);
    if (!parsed.success) throw new AiError("ai_invalid", result.problem);
    scenes = fitDurations(parsed.data.scenes, input.lengthS);
    if (!input.voiceover) scenes = scenes.map((s) => ({ ...s, voiceover_line: null }));
  }

  return {
    scenes: withIds(scenes),
    script: { generator: "claude", model: "claude-haiku-5-5", dialect: input.dialect, length_s: input.lengthS, pace: input.pace },
  };
}


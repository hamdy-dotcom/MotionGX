import { z } from "zod";
import { MUSIC_MOODS, kitSceneSchema, type KitScene } from "@/lib/video/kit";
import type { BrandFacts } from "@/lib/brand/types";
import type { Dialect, Pace } from "@/lib/types";

export const SCENE_RANGE: Record<Pace, [number, number]> = {
  calm: [4, 6],
  medium: [6, 8],
  fast: [8, 11],
};

export const MAX_WORDS_PER_LINE = 7;

export const scriptOutputSchema = z.object({
  title: z.string().trim().min(2).max(60),
  music_mood: z.enum(MUSIC_MOODS),
  scenes: z.array(kitSceneSchema).min(3).max(12),
});
export type ScriptOutput = z.infer<typeof scriptOutputSchema>;

const EMOJI = /\p{Extended_Pictographic}/u;
const ARABIC = /[؀-ۿ]/;
const LATIN = /[A-Za-z]/;

/** Every user-visible string in a scene (lines + text props). */
export function sceneTexts(s: KitScene): string[] {
  const p = s.props as Record<string, unknown>;
  const out = [...s.lines];
  for (const v of Object.values(p)) {
    if (typeof v === "string") out.push(v);
    if (Array.isArray(v)) for (const x of v) out.push(typeof x === "string" ? x : typeof x === "object" && x && "text" in x ? String((x as { text: string }).text) : "");
  }
  return out.filter(Boolean);
}

export function hostOf(url: string) {
  try {
    return new URL(/^https?:\/\//.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export type ScriptRules = {
  lengthS: number;
  bpm: number;
  voiceover: boolean;
  dialect: Dialect;
  facts: BrandFacts | null;
  allowedHosts: string[];
  sceneRange?: [number, number];
  /** request-edit may change structure; generation enforces the hook/CTA shape. */
  structure?: boolean;
};

/** Problems the model can fix on retry. Empty = valid. */
export function scriptProblems(scenes: KitScene[], r: ScriptRules): string[] {
  const problems: string[] = [];
  const targetBeats = (r.lengthS * r.bpm) / 60;
  const beats = scenes.reduce((a, s) => a + s.duration_beats, 0);
  if (Math.abs(beats - targetBeats) > Math.max(4, targetBeats * 0.12)) {
    problems.push(`duration_beats add up to ${beats} but the video is ${Math.round(targetBeats)} beats (${r.lengthS}s at ${r.bpm} BPM)`);
  }
  if (r.sceneRange && (scenes.length < r.sceneRange[0] || scenes.length > r.sceneRange[1])) {
    problems.push(`use ${r.sceneRange[0]}–${r.sceneRange[1]} scenes (got ${scenes.length})`);
  }
  for (let i = 1; i < scenes.length; i++) {
    if (scenes[i].type === scenes[i - 1].type) problems.push(`scenes ${i} and ${i + 1} are both "${scenes[i].type}" — never repeat a type back to back`);
  }
  const distinct = new Set(scenes.map((s) => s.type)).size;
  const minDistinct = Math.min(scenes.length, Math.max(3, Math.ceil(scenes.length * (r.structure ? 0.85 : 0.6))));
  if (distinct < minDistinct) problems.push(`use at least ${minDistinct} different scene types (got ${distinct})`);

  if (r.structure) {
    const first = scenes[0];
    if (first && !["hook", "problem", "stat", "offer"].includes(first.type)) problems.push(`scene 1 must be a hook (or problem/stat/offer) that creates tension in the first 2 seconds`);
    if (first && (first.duration_beats * 60) / r.bpm > 5) problems.push(`scene 1 must be short (≤ 4 seconds) to grab attention`);
    const last = scenes[scenes.length - 1];
    if (last && !["cta", "outro_logo"].includes(last.type)) problems.push(`the last scene must be "cta" (or "outro_logo" right after a cta)`);
    if (!scenes.some((s) => s.type === "cta")) problems.push(`include one "cta" scene with the real URL`);
  }

  const knownNumbers = new Set((r.facts?.numbers ?? []).map((n) => Math.round(n.value)));
  let arabicChars = 0;
  let latinChars = 0;

  scenes.forEach((s, i) => {
    const n = i + 1;
    if (s.type === "stat" && !knownNumbers.has(Math.round(s.props.value))) {
      problems.push(`scene ${n}: stat value ${s.props.value} is not one of the brand facts numbers (${[...knownNumbers].join(", ") || "none — do not use a stat scene"})`);
    }
    const ctaHost = s.type === "cta" ? hostOf(s.props.url) : "";
    if (s.type === "cta" && r.allowedHosts.length && !r.allowedHosts.some((h) => ctaHost === h || ctaHost.endsWith(`.${h}`) || h.endsWith(`.${ctaHost}`))) {
      problems.push(`scene ${n}: cta url must be the real site (${r.allowedHosts.join(" or ")})`);
    }
    for (const text of sceneTexts(s)) {
      if (EMOJI.test(text)) problems.push(`scene ${n}: remove emoji from "${text}"`);
      for (const word of text.split(/[\s/·,،.]+/)) {
        if (ARABIC.test(word) && LATIN.test(word)) problems.push(`scene ${n}: "${word}" mixes Arabic and Latin letters in one word — write the name exactly as on the site`);
      }
      arabicChars += (text.match(/[؀-ۿ]/g) ?? []).length;
      latinChars += (text.match(/[A-Za-z]/g) ?? []).length;
    }
    for (const line of s.lines) {
      if (line.trim().split(/\s+/).length > MAX_WORDS_PER_LINE + 1) problems.push(`scene ${n}: line "${line}" is too long (max ${MAX_WORDS_PER_LINE} words)`);
    }
    if (r.voiceover && !s.voiceover_line?.trim()) problems.push(`scene ${n}: voiceover_line is required`);
    if (!r.voiceover && s.voiceover_line !== null) problems.push(`scene ${n}: voiceover_line must be null (voiceover is off)`);
  });

  if (r.dialect === "en" && arabicChars > 0) problems.push(`the video language is English — no Arabic text`);
  if (r.dialect !== "en" && arabicChars < latinChars) problems.push(`the video language is Arabic — write the copy in Arabic (only brand names/URLs in Latin)`);
  return [...new Set(problems)];
}

/** Stable ids s1..sN regardless of what the model returned. */
export function withIds<T extends { id: string }>(scenes: T[]): T[] {
  return scenes.map((s, i) => ({ ...s, id: `s${i + 1}` }));
}

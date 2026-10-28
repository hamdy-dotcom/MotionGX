// Prand video row ↔ sandbox brief, and sandbox script → the shapes the studio already reads.
// Approved mappings (plan §2 + decisions Q5/Q13).
import type { ScriptBeat } from "@motiongx/primitives";
import type { Brief } from "./protocol";

const OBJECTIVE: Record<string, string> = { sell: "acquire", launch: "launch", offer: "offer", about: "awareness", hiring: "recruit", occasion: "announce" };
const COUNTRY: Record<string, string> = { eg: "EG", sa: "SA", gulf: "AE", lev: "JO", en: "US", msa: "Arab world — Modern Standard Arabic (فصحى)" };

export function briefFor(video: { brief: string; goal: string | null; dialect: string; format: string; length_s: number }, websiteUrl: string): Brief {
  return {
    url: websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`,
    objective: OBJECTIVE[video.goal ?? ""] ?? "acquire",
    country: COUNTRY[video.dialect] ?? "EG",
    layout: video.format,
    length: video.length_s,
    description: video.brief || undefined,
  };
}

/** the sandbox's brands/<slug> folder name */
export const brandSlug = (url: string) => new URL(url.startsWith("http") ? url : "https://" + url).hostname.replace(/^www\./, "").replace(/[^a-z0-9]+/gi, "-");

/** live music moods onto the studio's existing labels (music.mood_*) */
export const MOOD: Record<string, "energetic" | "warm" | "corporate" | "luxury"> = { driving: "energetic", uplifting: "warm", "tense-then-release": "energetic", chill: "warm" };

export type LiveScene = { start: number; bars: number; purpose: string; headline: string; sub?: string; visual?: { type?: string; detail?: string }; motion?: string };
export type LiveScript = { idea: string; language?: string; music?: { mood?: string; drops?: number[] }; scenes: LiveScene[]; length: number; bpm?: number };

/** script scenes → the studio's ScriptBeat list (lines = headline [+ sub]) */
export const beatsFromScript = (s: LiveScript): ScriptBeat[] =>
  s.scenes.map((sc, i) => ({ id: `s${i + 1}`, role: sc.purpose, start_s: sc.start, end_s: sc.start + sc.bars * 2, lines: [sc.headline, ...(sc.sub ? [sc.sub] : [])], voiceover_line: null }));

/** edited ScriptBeats → the edited lines the worker writes into script.json */
export const linesFromBeats = (beats: ScriptBeat[]) => beats.map((b, scene) => ({ scene, headline: String(b.lines[0] ?? "").trim(), ...(b.lines.length > 1 ? { sub: String(b.lines[1] ?? "").trim() } : {}) })).filter((l) => l.headline);

/** the plan fields the studio panel reads, from the script */
export function planFromScript(s: LiveScript) {
  return {
    concept: s.idea,
    summary_en: s.idea,
    motion_language: "live product UI",
    music_mood: MOOD[s.music?.mood ?? ""] ?? "energetic",
    energy: {
      bpm: 120,
      length_s: s.length,
      sections: s.scenes.map((sc) => ({ name: sc.purpose, kind: sc.purpose, start_s: sc.start, end_s: sc.start + sc.bars * 2, energy: ["hook", "problem"].includes(sc.purpose) ? 0.6 : 0.9 })),
      hits: (s.music?.drops ?? []).map((t) => ({ t, kind: "drop" })),
    },
    shots: s.scenes.map((sc, i) => ({ id: `s${i + 1}`, visual: sc.visual?.detail || sc.visual?.type || sc.purpose })),
  };
}

/** which studio progress stage a live step shows (plan §1.3) */
export const STAGE_OF: Record<string, "plan" | "spec" | "music" | "ready"> = { capture: "plan", profile: "plan", script: "plan", build: "spec", qa: "spec", music: "music", render: "ready" };

import "server-only";
import { callTool, SONNET } from "@/lib/ai/claude";
import { AiError } from "@/lib/ai/usage";
import type { BrandFacts } from "@/lib/brand/types";
import { ICONS, MUSIC_MOODS, PACE_BPM, SCENE_TYPES, type KitScene, type MusicMood } from "@/lib/video/kit";
import type { BrandProfile, Dialect, Goal, Pace, VideoFormat } from "@/lib/types";
import { SCENE_RANGE, hostOf, scriptOutputSchema, scriptProblems, withIds, type ScriptRules } from "./schema";

export const DIALECT_GUIDE: Record<Dialect, string> = {
  eg: "Egyptian Arabic (عامية مصرية) in Arabic script — the way a Cairo brand talks on TikTok: دلوقتي، عايز، إزاي، كده، بتاعك، أوي. Not MSA.",
  sa: "Saudi Arabic (لهجة سعودية بيضاء) in Arabic script — the way a Riyadh/Jeddah brand talks on Snapchat: الحين، وش، أبغى، مرة (=very)، زين، كذا، يا هلا. Not MSA, not Egyptian.",
  gulf: "Gulf/Emirati Arabic (لهجة خليجية) in Arabic script: الحين، شو، أبا، وايد، زين، چذي. Not MSA, not Egyptian.",
  lev: "Levantine Arabic (لهجة شامية) in Arabic script: هلق، شو، بدك، كتير، منيح، هيك. Not MSA, not Egyptian.",
  msa: "Modern Standard Arabic (فصحى) — clear, contemporary, punchy, never stiff.",
  en: "English — natural, punchy marketing copy.",
};

const GOAL_GUIDE: Record<Goal, string> = {
  sell: "sell a specific product — benefit-led, end with a buy/order CTA",
  launch: "announce a launch — build anticipation, reveal, CTA",
  offer: "promote an offer or discount — make the deal unmissable",
  about: "introduce the company — who they are, what they do, why trust them",
  hiring: "recruit — the role, why join, how to apply",
  occasion: "celebrate an occasion (holiday/season) on-brand, soft CTA",
};

const FORMAT_GUIDE: Record<VideoFormat, string> = {
  "9:16": "vertical 9:16 (Reels/TikTok/Snap) — very short lines",
  "1:1": "square 1:1 (feed)",
  "16:9": "landscape 16:9 (YouTube/web)",
};

const KIT = `Scene types (internal building blocks — pick the best fit for each idea; "props" must match exactly):
- hook: big kinetic headline. lines: 1–3 short lines. props: { "emphasis_line"?: index of the line to highlight }.
- problem: the pain. lines: 1–2. props: { "pains": 2–3 short pains }.
- logo_reveal: the brand logo moment. lines: 1–2 (tagline). props: {}.
- feature_list: lines: 1–2 headline. props: { "items": 2–4 × { "text": short benefit, "icon": one of ${ICONS.join("|")} } }.
- stat: a big number that counts up. lines: 1 label line. props: { "value": number FROM BRAND FACTS ONLY, "prefix"?: "+"/"$", "suffix"?: "%"/"k"/word, "caption"?: short }.
- steps: 1-2-3 flow. lines: 1–2. props: { "steps": exactly 3 short steps }.
- phone_mock: the product UI in a phone. lines: 1–2. props: { "screen_title", "items": 2–4 short UI rows, "button": CTA label }.
- before_after: lines: 1–2. props: { "before_label", "before": 1–3 items, "after_label", "after": 1–3 items }.
- offer: a deal that stamps in. lines: 1–2. props: { "value": e.g. "50%" or "مجانًا", "badge"?: short }. Only with a real offer.
- quote: lines: the quote (1–3 lines). props: { "author"? }. Only for a real testimonial.
- comparison: us vs others. lines: 1–2. props: { "us_label": brand name, "them_label", "rows": 2–4 advantages }.
- chips_cloud: many short keywords. lines: 1–2. props: { "chips": 4–8 × 1–3 words }.
- split_image: brand image/visual + statement. lines: 1–2. props: { "caption"? }.
- cta: closing call to action. lines: 1–2. props: { "url": the real URL, "button": short action }.
- outro_logo: final logo hold. lines: 1 (tagline). props: { "url"? }.`;

export type ScriptInput = {
  workspaceId: string;
  brief: string;
  goal: Goal;
  format: VideoFormat;
  lengthS: number;
  pace: Pace;
  dialect: Dialect;
  voiceover: boolean;
  brand: { name: string; websiteUrl: string | null; profile: (BrandProfile & { facts?: BrandFacts | null }) | null };
};

export function brandContext(brand: ScriptInput["brand"]) {
  const p = brand.profile;
  const f = p?.facts;
  const lines = [`Brand name (write exactly like this): ${brand.name}`, `Website: ${brand.websiteUrl ?? "unknown"}`, `Tone: ${p?.tone || "not set"}`, `Tagline: ${p?.tagline || "not set"}`];
  if (f?.what_it_does) {
    lines.push(
      "Brand facts (the ONLY facts you may state):",
      `- What it does: ${f.what_it_does}`,
      `- Audience: ${f.audience}`,
      `- Key features: ${f.key_features.join(" | ") || "none listed"}`,
      `- Numbers: ${f.numbers.map((n) => `${n.prefix}${n.value}${n.suffix} ${n.label}`).join(" | ") || "NONE — do not use a stat scene"}`,
      `- Offers: ${f.offers.join(" | ") || "none — do not invent an offer"}`,
      `- CTA URL: ${f.cta_url || brand.websiteUrl}`,
    );
  } else {
    lines.push("Brand facts: none collected — use only what the brief says; no stat or offer scenes.");
  }
  return lines.join("\n");
}

export function scriptSystem({ dialect, voiceover, bpm }: { dialect: Dialect; voiceover: boolean; bpm: number }) {
  return `You are a senior motion-graphics copywriter and editor for Arab-market brands. You write short, punchy, on-brand promo videos built from animated type and UI — no actors, no stock footage.

Video language: ${DIALECT_GUIDE[dialect]}
The brief may be written in any language; the video is ALWAYS in the video language above.

Rhythm: the music is ${bpm} BPM; one beat = ${(60 / bpm).toFixed(2)}s. Every scene is a whole number of beats ("duration_beats"). Scenes of 4–10 beats; the hook ≤ 4 seconds.

${KIT}

Copy rules:
- Keep brand and product names EXACTLY as written on the site. Never transliterate part of a word ("سلر إكسبress" is forbidden — write "Slllr Express" or the official Arabic name).
- Write naturally in the chosen dialect, the way a native copywriter would — never a literal translation.
- The hook must create tension or curiosity in the first 2 seconds (a sharp question, a pain, a bold claim).
- One idea per scene. On-screen lines: max 7 words each, pre-split into "lines" (no line breaks inside a line). No emoji, no hashtags.
- Only use numbers that appear in the brand facts. Never invent stats, prices, customers or offers.
- End with a clear CTA scene using the real URL.
- ${voiceover ? `voiceover_line: one natural spoken line per scene that fits its duration (~${dialect === "en" ? "2.5" : "2"} words per second) and complements the on-screen text.` : "voiceover_line: null for every scene (no voiceover)."}
- Vary the scene types (never the same type twice in a row) and pick a music mood (${MUSIC_MOODS.join(", ")}) that fits the brand and goal.
- title: a short, catchy video title (2–6 words) in the video language — not the brief.`;
}

export const scriptTool = {
  name: "save_video_script",
  description: "Save the finished video: title, music mood and ordered scenes.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: "string" },
      music_mood: { type: "string", enum: [...MUSIC_MOODS] },
      scenes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            type: { type: "string", enum: [...SCENE_TYPES] },
            title: { type: "string", description: "1–3 word internal scene name, video language." },
            duration_beats: { type: "integer" },
            lines: { type: "array", items: { type: "string" } },
            props: { type: "object", description: "Type-specific props exactly as described for the scene type." },
            voiceover_line: { anyOf: [{ type: "string" }, { type: "null" }] },
          },
          required: ["id", "type", "title", "duration_beats", "lines", "props", "voiceover_line"],
        },
      },
    },
    required: ["title", "music_mood", "scenes"],
  },
};

export function rulesFor(input: Pick<ScriptInput, "lengthS" | "pace" | "voiceover" | "dialect" | "brand">, structure: boolean, sceneRange?: [number, number]): ScriptRules {
  const facts = input.brand.profile?.facts ?? null;
  const hosts = [hostOf(facts?.cta_url ?? ""), hostOf(input.brand.websiteUrl ?? "")].filter(Boolean);
  return {
    lengthS: input.lengthS,
    bpm: PACE_BPM[input.pace],
    voiceover: input.voiceover,
    dialect: input.dialect,
    facts,
    allowedHosts: [...new Set(hosts)],
    sceneRange,
    structure,
  };
}

export async function generateScript(input: ScriptInput): Promise<{ title: string; musicMood: MusicMood; scenes: KitScene[]; script: Record<string, unknown> }> {
  const bpm = PACE_BPM[input.pace];
  const range = SCENE_RANGE[input.pace];
  const totalBeats = Math.round((input.lengthS * bpm) / 60);
  const rules = rulesFor(input, true, range);

  const prompt = `${brandContext(input.brand)}

Video:
- Goal: ${GOAL_GUIDE[input.goal]}
- Format: ${FORMAT_GUIDE[input.format]}
- Length: ${input.lengthS} seconds = ${totalBeats} beats at ${bpm} BPM (duration_beats must add up to ${totalBeats})
- Pace: ${input.pace} — ${range[0]}–${range[1]} scenes
- Voiceover: ${input.voiceover ? "on" : "off"}

Brief from the client:
"""
${input.brief}
"""`;

  const result = await callTool({
    workspaceId: input.workspaceId,
    kind: "script",
    model: SONNET,
    strict: false,
    system: scriptSystem({ dialect: input.dialect, voiceover: input.voiceover, bpm }),
    prompt,
    tool: scriptTool,
    schema: scriptOutputSchema,
    check: (out) => {
      const problems = scriptProblems(out.scenes, rules);
      return problems.length ? problems.join("; ") : null;
    },
    maxTokens: 16000,
  });

  let out = result.value;
  if (!out) {
    // Still invalid after the retry. Accept it only if the shape is valid and the problems are soft
    // (the beat grid snaps durations anyway); otherwise give up.
    const failed = result as { lastInput: unknown; problem: string };
    const parsed = scriptOutputSchema.safeParse(failed.lastInput);
    if (!parsed.success) throw new AiError("ai_invalid", failed.problem);
    const hard = scriptProblems(parsed.data.scenes, rules).filter((p) => !/duration_beats add up|scenes \(got|different scene types/.test(p));
    if (hard.length) throw new AiError("ai_invalid", hard.join("; "));
    out = parsed.data;
  }

  const scenes = withIds(out.scenes).map((s) => (input.voiceover ? s : { ...s, voiceover_line: null }));
  return {
    title: out.title,
    musicMood: out.music_mood,
    scenes,
    script: { generator: "claude", model: SONNET, dialect: input.dialect, length_s: input.lengthS, pace: input.pace, bpm, music_mood: out.music_mood, kit: 1 },
  };
}

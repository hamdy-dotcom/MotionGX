import "server-only";
import { z } from "zod";
import { callTool, SONNET } from "@/lib/ai/claude";
import { AiError } from "@/lib/ai/usage";
import type { ScriptBeat } from "@motiongx/primitives";
import type { Treatment } from "./director";
import type { MotionBrief } from "./types";

const DIALECT_GUIDE: Record<string, string> = {
  eg: "Egyptian Arabic (عامية مصرية) in Arabic script — the way a Cairo brand talks on TikTok: دلوقتي، عايز، إزاي، كده. Not MSA.",
  sa: "Saudi Arabic (لهجة سعودية بيضاء) in Arabic script: الحين، وش، أبغى، مرة، زين، كذا. Not MSA, not Egyptian.",
  gulf: "Gulf/Emirati Arabic in Arabic script: الحين، شو، أبا، وايد، زين. Not MSA, not Egyptian.",
  lev: "Levantine Arabic in Arabic script: هلق، شو، بدك، كتير، منيح. Not MSA, not Egyptian.",
  msa: "Modern Standard Arabic (فصحى) — contemporary and punchy, never stiff.",
  en: "English — natural, punchy marketing copy.",
};

const scriptSchema = z.object({
  title: z.string().trim().min(2).max(60),
  beats: z.array(z.object({ id: z.string(), lines: z.array(z.string().trim().min(1).max(48)).min(1).max(3), voiceover_line: z.string().max(400).nullable() })).min(1),
});

const tool = {
  name: "save_script",
  description: "Save the on-screen copy for every beat of the treatment.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: "string", description: "Short video title (2–6 words) in the video language." },
      beats: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "The treatment beat id." },
            lines: { type: "array", items: { type: "string" }, description: "1–3 pre-split on-screen lines, ≤ 7 words each." },
            voiceover_line: { anyOf: [{ type: "string" }, { type: "null" }] },
          },
          required: ["id", "lines", "voiceover_line"],
        },
      },
    },
    required: ["title", "beats"],
  },
};

const EMOJI = /\p{Extended_Pictographic}/u;
const ARABIC = /[؀-ۿ]/;
const LATIN = /[A-Za-z]/;
const toLatinDigits = (s: string) => s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

export function scriptProblems(beats: z.infer<typeof scriptSchema>["beats"], t: Treatment, b: MotionBrief): string[] {
  const p: string[] = [];
  const ids = new Set(t.beats.map((x) => x.id));
  for (const id of ids) if (!beats.some((x) => x.id === id)) p.push(`missing copy for beat "${id}"`);
  const allowedNumbers = new Set([...b.facts.numbers.map((n) => String(Math.round(n.value))), ...(toLatinDigits(b.brief).match(/\d+/g) ?? [])]);
  let ar = 0;
  let la = 0;
  for (const beat of beats) {
    for (const line of beat.lines) {
      if (EMOJI.test(line)) p.push(`beat ${beat.id}: no emoji ("${line}")`);
      if (line.split(/\s+/).length > 8) p.push(`beat ${beat.id}: "${line}" is longer than 7 words`);
      for (const w of line.split(/[\s/·,،.!؟?]+/)) if (ARABIC.test(w) && LATIN.test(w)) p.push(`beat ${beat.id}: "${w}" mixes Arabic and Latin letters — write names exactly as on the site`);
      for (const n of toLatinDigits(line).match(/\d+/g) ?? []) if (n.length > 1 && !allowedNumbers.has(n)) p.push(`beat ${beat.id}: the number ${n} is not in the brand facts — never invent numbers`);
      ar += (line.match(/[؀-ۿ]/g) ?? []).length;
      la += (line.match(/[A-Za-z]/g) ?? []).length;
    }
    if (b.voiceover && !beat.voiceover_line) p.push(`beat ${beat.id}: voiceover_line required`);
  }
  if (b.dialect === "en" && ar > 0) p.push("the video is in English — no Arabic text");
  if (b.dialect !== "en" && ar < la) p.push("the video is in Arabic — write the copy in Arabic (brand names / URLs may stay Latin)");
  return [...new Set(p)];
}

/** Script writer: copy for each treatment beat, in the chosen dialect, under the copy rules. */
export async function writeScript(b: MotionBrief, t: Treatment): Promise<{ title: string; beats: ScriptBeat[] }> {
  const prompt = `Brand: ${b.brand.name} (${b.brand.url}) · tone: ${b.brand.tone} · tagline: ${b.brand.tagline}
Brand facts (the ONLY facts you may state): what it does: ${b.facts.what_it_does} | audience: ${b.facts.audience} | features: ${b.facts.key_features.join(" | ")} | numbers: ${b.facts.numbers.map((n) => `${n.prefix}${n.value}${n.suffix} ${n.label}`).join(" | ") || "none"} | offers: ${b.facts.offers.join(" | ") || "none"} | CTA URL: ${b.facts.cta_url || b.brand.url}
Goal: ${b.goal} · Video language: ${DIALECT_GUIDE[b.dialect]}
Client brief (any language): """${b.brief}"""

Treatment (the copy must serve it):
Concept: ${t.concept}
Motion language: ${t.motion_language} — ${t.motion_language_detail}
Typography: ${t.typography}
Beats:
${t.beats.map((x) => `- ${x.id} [${x.start_s}–${x.end_s}s] ${x.name}: ${x.visual} | copy: ${x.copy_intent}`).join("\n")}`;

  const res = await callTool({
    workspaceId: b.workspaceId,
    kind: "script",
    model: SONNET,
    strict: false,
    system: `You write on-screen copy for short motion-graphics promos for Arab-market brands.
Copy rules:
- Keep brand and product names EXACTLY as written on the site; never transliterate part of a word ("سلر إكسبress" is forbidden).
- Write naturally in the chosen dialect, like a native copywriter — never a literal translation.
- The first beat must create tension or curiosity in the first 2 seconds.
- One idea per beat; lines ≤ 7 words, pre-split (1–3 lines per beat). Short beats get fewer words.
- Only numbers from the brand facts. Never invent stats, prices, customers or offers.
- End with a clear CTA that uses the real URL.
- ${b.voiceover ? "voiceover_line: one spoken line per beat that fits its duration." : "voiceover_line: null for every beat."}`,
    prompt,
    tool,
    schema: scriptSchema,
    check: (out) => {
      const problems = scriptProblems(out.beats, t, b);
      return problems.length ? problems.join("; ") : null;
    },
    maxTokens: 8000,
  });
  if (!res.value) throw new AiError("ai_invalid", res.problem);
  const byId = new Map(res.value.beats.map((x) => [x.id, x]));
  return {
    title: res.value.title,
    beats: t.beats.map((x) => ({
      id: x.id,
      role: x.name,
      start_s: x.start_s,
      end_s: x.end_s,
      lines: byId.get(x.id)?.lines ?? [],
      voiceover_line: b.voiceover ? (byId.get(x.id)?.voiceover_line ?? null) : null,
    })),
  };
}

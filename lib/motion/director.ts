import "server-only";
import { z } from "zod";
import { callTool, SONNET } from "@/lib/ai/claude";
import { AiError } from "@/lib/ai/usage";
import type { EnergyMap } from "@motiongx/primitives";
import { cosine, embed } from "./embed";
import { selectRefs, type MotionRef, type MotionStore, type TreatmentRecord } from "./store";
import type { MotionBrief } from "./types";

export const PACE_BPM = { calm: 90, medium: 110, fast: 128 } as const;
/** Cosine similarity above this to a recent treatment = "already done" → regenerate. */
export const SIMILARITY_THRESHOLD = 0.8;

const sectionKind = z.enum(["intro", "build", "drop", "breakdown", "outro"]);
const hitKind = z.enum(["drop", "impact", "reveal", "logo", "cta"]);

export const treatmentSchema = z.object({
  concept: z.string().min(10).max(1000),
  visual_metaphor: z.string().min(5).max(700),
  motion_language: z.string().min(3).max(80),
  motion_language_detail: z.string().min(10).max(1200),
  typography: z.string().min(10).max(900),
  palette_usage: z.string().min(10).max(900),
  camera: z.string().max(600),
  beats: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().max(60),
        start_s: z.number().min(0),
        end_s: z.number().positive(),
        visual: z.string().min(10).max(1200),
        copy_intent: z.string().max(500),
        transition_out: z.string().max(400),
      }),
    )
    .min(3)
    .max(14),
  energy_map: z.object({
    sections: z.array(z.object({ name: z.string(), kind: sectionKind, start_s: z.number().min(0), end_s: z.number().positive(), energy: z.number().min(0).max(1) })).min(3).max(12),
    hits: z.array(z.object({ t: z.number().min(0), kind: hitKind, label: z.string().max(60).optional() })).min(3).max(24),
  }),
  music: z.object({ mood: z.enum(["energetic", "warm", "corporate", "luxury"]), sound_notes: z.string().max(400) }),
});
export type Treatment = z.infer<typeof treatmentSchema> & { energy: EnergyMap };

const tool = {
  name: "save_treatment",
  description: "Save the creative treatment for this video.",
  input_schema: {
    type: "object" as const,
    properties: {
      concept: { type: "string", description: "The big idea in 2–4 sentences, specific to this brand." },
      visual_metaphor: { type: "string" },
      motion_language: { type: "string", description: "Short label (2–5 words), e.g. 'liquid morphs', 'kinetic grid', 'paper cut-outs'." },
      motion_language_detail: { type: "string", description: "How things move: shapes, easing, rhythm, transitions, what is signature about it." },
      typography: { type: "string", description: "Type treatment: weights, scale contrast, how words enter/exit, Arabic handling." },
      palette_usage: { type: "string", description: "How the brand colors are used (ratios, where the gradient appears, background)." },
      camera: { type: "string" },
      beats: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            start_s: { type: "number" },
            end_s: { type: "number" },
            visual: { type: "string", description: "Exactly what is on screen and how it moves in this beat." },
            copy_intent: { type: "string", description: "What the on-screen words must say (the script writer writes the words)." },
            transition_out: { type: "string" },
          },
          required: ["id", "name", "start_s", "end_s", "visual", "copy_intent", "transition_out"],
        },
      },
      energy_map: {
        type: "object",
        properties: {
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: { name: { type: "string" }, kind: { type: "string", enum: ["intro", "build", "drop", "breakdown", "outro"] }, start_s: { type: "number" }, end_s: { type: "number" }, energy: { type: "number" } },
              required: ["name", "kind", "start_s", "end_s", "energy"],
            },
          },
          hits: {
            type: "array",
            items: { type: "object", properties: { t: { type: "number" }, kind: { type: "string", enum: ["drop", "impact", "reveal", "logo", "cta"] }, label: { type: "string" } }, required: ["t", "kind"] },
          },
        },
        required: ["sections", "hits"],
      },
      music: { type: "object", properties: { mood: { type: "string", enum: ["energetic", "warm", "corporate", "luxury"] }, sound_notes: { type: "string" } }, required: ["mood", "sound_notes"] },
    },
    required: ["concept", "visual_metaphor", "motion_language", "motion_language_detail", "typography", "palette_usage", "camera", "beats", "energy_map", "music"],
  },
};

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Snap hits/sections/beats to the beat grid and make them contiguous over [0, length]. */
export function normalizeTreatment(raw: z.infer<typeof treatmentSchema>, lengthS: number, bpm: number): Treatment {
  const beat = 60 / bpm;
  const snap = (t: number) => r2(Math.min(lengthS, Math.max(0, Math.round(t / beat) * beat)));
  const beats = [...raw.beats].sort((a, b) => a.start_s - b.start_s);
  const fixedBeats = beats.map((b, i) => ({ ...b, start_s: i === 0 ? 0 : snap(b.start_s), end_s: i === beats.length - 1 ? lengthS : snap(beats[i + 1].start_s) }));
  const sections = [...raw.energy_map.sections].sort((a, b) => a.start_s - b.start_s);
  const fixedSections = sections.map((s, i) => ({ ...s, start_s: i === 0 ? 0 : snap(s.start_s), end_s: i === sections.length - 1 ? lengthS : snap(sections[i + 1].start_s) }));
  // Hits at/after the end move to 2 beats before it; when two collide, the more important kind wins.
  const PRIORITY: Record<string, number> = { cta: 5, logo: 4, drop: 3, impact: 2, reveal: 1 };
  const latest = snap(lengthS - 2 * beat);
  const hits = raw.energy_map.hits
    .map((h) => ({ ...h, t: Math.min(latest, snap(h.t)) }))
    .filter((h) => h.t > 0)
    .sort((a, b) => a.t - b.t || PRIORITY[b.kind] - PRIORITY[a.kind])
    .reduce<typeof raw.energy_map.hits>((acc, h) => {
      const prev = acc[acc.length - 1];
      if (prev && h.t - prev.t <= beat * 0.9) {
        if (PRIORITY[h.kind] > PRIORITY[prev.kind]) acc[acc.length - 1] = h;
        return acc;
      }
      acc.push(h);
      return acc;
    }, []);
  return { ...raw, beats: fixedBeats, energy_map: { sections: fixedSections, hits }, energy: { bpm, length_s: lengthS, sections: fixedSections, hits } };
}

function treatmentProblems(t: Treatment): string[] {
  const p: string[] = [];
  const hits = t.energy.hits;
  if (!hits.some((h) => h.kind === "logo")) p.push("energy_map.hits needs a 'logo' hit (the logo reveal)");
  if (!hits.some((h) => h.kind === "cta")) p.push("energy_map.hits needs a 'cta' hit (the final, biggest drop on the CTA)");
  const logo = hits.find((h) => h.kind === "logo");
  if (logo && !t.energy.sections.some((s) => s.kind === "breakdown" && s.end_s <= logo.t + 0.05 && s.end_s >= logo.t - 1.5)) {
    p.push("add a 'breakdown' section that ends right at the logo hit (half-time / near silence before the reveal)");
  }
  if (!t.energy.sections.some((s) => s.kind === "drop")) p.push("needs at least one 'drop' section");
  if (t.energy.sections.some((s) => s.end_s - s.start_s < 0.4)) p.push("a section is too short (< 0.4 s)");
  if (t.beats.some((b) => b.end_s - b.start_s < 0.8)) p.push("a beat is too short (< 0.8 s)");
  const last = t.energy.sections[t.energy.sections.length - 1];
  const cta = hits.filter((h) => h.kind === "cta").pop();
  if (cta && cta.t < t.energy.length_s * 0.6) p.push("the CTA hit should be in the last part of the video");
  if (last && last.kind !== "outro" && last.kind !== "drop") p.push("the last section should be the final drop or an outro");
  return p;
}

export const treatmentText = (t: Pick<Treatment, "concept" | "visual_metaphor" | "motion_language" | "motion_language_detail" | "typography">) =>
  `${t.motion_language}. ${t.concept} ${t.visual_metaphor} ${t.motion_language_detail} ${t.typography}`;

export type DirectorResult = { treatment: Treatment; refs: MotionRef[]; embedding: number[]; attempts: number; similarity: number };

/** Creative director: retrieves 4 inspiration refs (MMR), writes a treatment, rejects near-duplicates of recent work. */
export async function direct(brief: MotionBrief, store: MotionStore, opts: { avoidMotionLanguages?: string[] } = {}): Promise<DirectorResult> {
  const bpm = PACE_BPM[brief.pace];
  const [allRefs, recentWs, recentGlobal] = await Promise.all([store.refs(), store.recentTreatments(brief.workspaceId, 10), store.recentGlobal(50)]);
  const usedRefs = new Set(recentWs.slice(0, 5).flatMap((t) => t.ref_ids));
  const query = await embed(`${brief.brand.name}. ${brief.brand.tone}. ${brief.facts.what_it_does}. ${brief.goal}. ${brief.brief}`);
  const refs = selectRefs(allRefs, query, 4, usedRefs, 0.65, brief.goal);
  const history: TreatmentRecord[] = [...recentWs, ...recentGlobal.filter((g) => !recentWs.includes(g))];

  const avoid = [...new Set([...history.map((h) => `${h.motion_language} — ${h.concept.slice(0, 120)}`), ...(opts.avoidMotionLanguages ?? [])])].slice(0, 30);
  let feedback = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const prompt = directorPrompt(brief, bpm, refs, avoid, feedback);
    const res = await callTool({
      workspaceId: brief.workspaceId,
      kind: "director",
      model: SONNET,
      strict: false,
      system: DIRECTOR_SYSTEM,
      prompt,
      tool,
      schema: treatmentSchema,
      check: (raw) => {
        const problems = treatmentProblems(normalizeTreatment(raw, brief.lengthS, bpm));
        return problems.length ? problems.join("; ") : null;
      },
      maxTokens: 12000,
      retries: 2,
    });
    if (!res.value) throw new AiError("ai_invalid", res.problem);
    const treatment = normalizeTreatment(res.value, brief.lengthS, bpm);
    const embedding = await embed(treatmentText(treatment));
    const scored = history.map((h) => ({ h, sim: cosine(embedding, h.embedding) })).sort((a, b) => b.sim - a.sim);
    const top = scored[0];
    const sameLanguage = history.find((h) => h.motion_language.trim().toLowerCase() === treatment.motion_language.trim().toLowerCase());
    if ((!top || top.sim < SIMILARITY_THRESHOLD) && !sameLanguage) return { treatment, refs, embedding, attempts: attempt, similarity: top?.sim ?? 0 };
    feedback = `Your previous treatment ("${treatment.motion_language}": ${treatment.concept.slice(0, 160)}) was too close to existing work ("${(sameLanguage ?? top!.h).motion_language}"). Invent a clearly different concept AND motion language.`;
    avoid.push(`${treatment.motion_language} — ${treatment.concept.slice(0, 120)}`);
  }
  throw new AiError("ai_invalid", "could not find a novel treatment");
}

const DIRECTOR_SYSTEM = `You are an award-winning motion-design creative director. You design bespoke, custom-coded motion-graphics promos for one brand at a time — never templates. Every film you make has its own concept, motion language, typographic idea and rhythm, so no two look alike.

Your treatment is implemented by a motion coder in React/Remotion using only low-level primitives (shapes, paths, noise, particles, masks, camera, 2.5D parallax, simple three.js, brand logo/images, device frames, kinetic Arabic/English text). Design things that can be built from those — invented shapes and layouts, not stock footage.

Rules:
- Make it unmistakably about THIS brand: its product, audience and tone. A viewer should feel it was hand-made for them.
- Use only the brand's palette and fonts (described below). The logo is used as-is (never redrawn).
- Plan the rhythm with the music: sections (intro / build / drop / breakdown / outro) and hits (drop, impact, reveal, logo, cta) on the beat grid. A riser leads into every drop; a breakdown (half-time or near silence) comes right before the logo reveal; the CTA lands on the final, biggest drop; the video ends cleanly on its last frame.
- Every beat must keep something moving (nothing static for more than 0.6 s).
- Beats are contiguous from 0 to the video length. Hits must sit on whole beats, after 0 and at least 2 beats before the end.
- energy_map.hits must include one "logo" hit and one "cta" hit (the CTA after the logo, in the last third).
- Arabic text: never split words, keep lines short.`;

function directorPrompt(b: MotionBrief, bpm: number, refs: MotionRef[], avoid: string[], feedback: string) {
  return `Brand: ${b.brand.name} (${b.brand.url})
Tone: ${b.brand.tone || "not set"} · Tagline: ${b.brand.tagline || "—"}
Palette (hex, role): ${b.brand.colors.map((c) => `${c.hex}${c.role ? ` ${c.role}` : ""}`).join(", ")}
Fonts: Arabic ${b.brand.fonts.arabic ?? "Readex Pro"}, Latin ${b.brand.fonts.latin ?? "Inter"}
Logo: ${b.brand.hasLogo ? "yes" : "no (use the brand name as a wordmark)"} · Brand images from the site: ${b.brand.imageCount}

Brand facts:
- What it does: ${b.facts.what_it_does}
- Audience: ${b.facts.audience}
- Key features: ${b.facts.key_features.join(" | ") || "—"}
- Real numbers: ${b.facts.numbers.map((n) => `${n.prefix}${n.value}${n.suffix} ${n.label}`).join(" | ") || "none"}
- Offers: ${b.facts.offers.join(" | ") || "none"}

Video: goal ${b.goal}; ${b.lengthS}s; format ${b.format} (${b.width}×${b.height}); pace ${b.pace} = ${bpm} BPM (1 beat = ${(60 / bpm).toFixed(3)}s); language ${b.dialect === "en" ? "English" : `Arabic (${b.dialect})`}.
Client brief (any language): """${b.brief}"""

Inspiration references (borrow ideas, never copy):
${refs.map((r, i) => `${i + 1}. ${r.card?.motion_language ?? r.title} [${r.tags.join(", ") || r.category}] — ${r.prompt_text}${r.code_snippet ? ` (technique: ${r.code_snippet})` : ""}`).join("\n")}

Already used recently — do NOT reuse these concepts or motion languages:
${avoid.length ? avoid.map((a) => `- ${a}`).join("\n") : "- (none yet)"}
${feedback ? `\n${feedback}\n` : ""}
Design the treatment and call save_treatment.`;
}

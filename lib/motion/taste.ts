import "server-only";
// Taste QA — once, optional, Haiku, on 6 frames rendered in the background after the preview is up.
// Layout is already guaranteed by the validator; this judges craft and whether the concept reads.
// Concept legibility: the judge first writes the idea it sees in the frames, THEN compares it with the
// intended concept ("Could a viewer state the idea in one sentence after watching?").
import { readFileSync } from "node:fs";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { callTool, HAIKU } from "@/lib/ai/claude";
import type { Plan } from "./plan";

export const tasteSchema = z.object({
  idea_seen: z.string().max(400),
  score: z.number().min(0).max(10),
  looks_good: z.boolean(),
  brand_clear: z.boolean(),
  concept_legible: z.boolean(),
  note: z.string().max(800),
});
export type Taste = z.infer<typeof tasteSchema>;

/** frame times for the judge (fractions of the length) */
export const TASTE_FRAMES = [0.1, 0.27, 0.44, 0.61, 0.78, 0.93];

const tool = {
  name: "save_taste",
  description: "Save the taste verdict.",
  input_schema: {
    type: "object" as const,
    properties: {
      idea_seen: { type: "string", description: "FROM THE FRAMES ONLY: the idea a viewer would state in one sentence after watching (or 'unclear')" },
      score: { type: "number", description: "overall craft 0–10" },
      looks_good: { type: "boolean" },
      brand_clear: { type: "boolean", description: "would a viewer know which brand this is and what it offers?" },
      concept_legible: { type: "boolean", description: "does idea_seen match the intended concept closely enough that a viewer gets the idea?" },
      note: { type: "string", description: "one sentence: the biggest thing to improve" },
    },
    required: ["idea_seen", "score", "looks_good", "brand_clear", "concept_legible", "note"],
    additionalProperties: false,
  },
};

export async function tasteQa(workspaceId: string, brand: string, plan: Plan, stills: { t: number; path: string }[]): Promise<Taste | null> {
  const content: Anthropic.ContentBlockParam[] = [{ type: "text", text: `${stills.length} frames, in order, from a ${brand} promo. First decide, from the frames alone, the idea a viewer would state in one sentence after watching.` }];
  for (const s of stills) {
    content.push({ type: "text", text: `t=${s.t.toFixed(1)}s` });
    content.push({ type: "image", source: { type: "base64", media_type: s.path.endsWith(".png") ? "image/png" : "image/jpeg", data: readFileSync(s.path).toString("base64") } });
  }
  content.push({ type: "text", text: `The INTENDED concept was: ${plan.concept}${plan.metaphor ? ` (metaphor: ${plan.metaphor.object} = ${plan.metaphor.stands_for})` : ""}. Motion language: ${plan.motion_language}. Now judge: craft and brand (layout was already checked), and whether the idea you saw matches the intended concept.` });
  const res = await callTool({ workspaceId, kind: "vision_qa", model: HAIKU, system: "You are a senior motion designer giving a quick, honest taste check. Be strict about whether the concept actually reads on screen.", prompt: content, tool, schema: tasteSchema, maxTokens: 500, retries: 0 });
  return res.value;
}

import "server-only";
// Taste QA — once, optional, Haiku, on 4 frames rendered in the background after the preview is up.
// Layout is already guaranteed by the validator; this only judges whether it looks good and on-brand.
import { readFileSync } from "node:fs";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { callTool, HAIKU } from "@/lib/ai/claude";
import type { Plan } from "./plan";

export const tasteSchema = z.object({
  score: z.number().min(0).max(10),
  looks_good: z.boolean(),
  brand_clear: z.boolean(),
  note: z.string().max(800),
});
export type Taste = z.infer<typeof tasteSchema>;

const tool = {
  name: "save_taste",
  description: "Save the taste verdict.",
  input_schema: {
    type: "object" as const,
    properties: {
      score: { type: "number", description: "overall craft 0–10" },
      looks_good: { type: "boolean" },
      brand_clear: { type: "boolean", description: "would a viewer know which brand this is and what it offers?" },
      note: { type: "string", description: "one sentence: the biggest thing to improve" },
    },
    required: ["score", "looks_good", "brand_clear", "note"],
    additionalProperties: false,
  },
};

export async function tasteQa(workspaceId: string, brand: string, plan: Plan, stills: { t: number; path: string }[]): Promise<Taste | null> {
  const content: Anthropic.ContentBlockParam[] = [{ type: "text", text: `Four frames from a ${brand} promo. Concept: ${plan.concept} Motion language: ${plan.motion_language}. Judge taste only (layout was already checked): does it look professionally designed and on-brand?` }];
  for (const s of stills) {
    content.push({ type: "text", text: `t=${s.t.toFixed(1)}s` });
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: readFileSync(s.path).toString("base64") } });
  }
  const res = await callTool({ workspaceId, kind: "vision_qa", model: HAIKU, system: "You are a senior motion designer giving a quick, honest taste check.", prompt: content, tool, schema: tasteSchema, maxTokens: 400, retries: 0 });
  return res.value;
}

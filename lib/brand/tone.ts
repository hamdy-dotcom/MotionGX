import "server-only";
import { z } from "zod";
import { callTool } from "@/lib/ai/claude";
import { AiError } from "@/lib/ai/usage";
import { DIALECTS, type Dialect } from "@/lib/types";
import { trimMarkdown, type FirecrawlScrape } from "./map";

const toneSchema = z.object({
  tone: z.string().min(1).max(160),
  tagline: z.string().min(1).max(120),
  default_dialect: z.enum(DIALECTS),
});

const toneTool = {
  name: "save_brand_voice",
  description: "Save the brand's voice, tagline and default video dialect.",
  input_schema: {
    type: "object" as const,
    properties: {
      tone: { type: "string", description: "3–6 comma-separated adjectives for the brand voice, in the site's main language." },
      tagline: { type: "string", description: "The site's own tagline/slogan if it has one; otherwise a short one (max 8 words) in the site's main language." },
      default_dialect: {
        type: "string",
        enum: [...DIALECTS],
        description: "eg = Egyptian, sa = Saudi, gulf = UAE/Kuwait/Qatar/Bahrain/Oman, lev = Levantine, msa = formal Arabic / unclear region, en = English-only site.",
      },
    },
    required: ["tone", "tagline", "default_dialect"],
    additionalProperties: false,
  },
};

export async function analyzeTone(
  workspaceId: string,
  url: string,
  scrape: FirecrawlScrape,
): Promise<{ tone: string; tagline: string; default_dialect: Dialect }> {
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })();
  const m = scrape.metadata ?? {};

  const prompt = `Website: ${url}
Domain: ${host}
Declared page language: ${m.language ?? "unknown"} (often wrong — trust the actual text)
Locale: ${m.ogLocale ?? "unknown"}
Title: ${m.title ?? ""}
Description: ${m.description ?? ""}

Homepage content (markdown, trimmed):
"""
${trimMarkdown(scrape.markdown)}
"""

Decide the default video dialect from the country and the language the site is written in:
- Egyptian site or Egyptian colloquial copy (دلوقتي، عايز، إزاي) → eg
- Saudi site (.sa, SAR prices, Saudi cities, Saudi colloquial like الحين، وش، أبغى) → sa
- UAE/Gulf site (.ae, AED, Dubai/Abu Dhabi, Kuwait, Qatar) → gulf
- Lebanon/Syria/Jordan/Palestine → lev
- Arabic but formal or region unclear → msa
- English only → en
Call save_brand_voice.`;

  const result = await callTool({
    workspaceId,
    kind: "brand_tone",
    system: "You analyze company websites for an Arabic/English motion-graphics video tool. Be concise and factual.",
    prompt,
    tool: toneTool,
    schema: toneSchema,
    maxTokens: 1000,
  });
  if (!result.value) throw new AiError("ai_invalid", result.problem);
  return result.value;
}

import "server-only";
import { z } from "zod";
import { callTool } from "@/lib/ai/claude";
import { AiError, assertWithinRateLimit, logUsage } from "@/lib/ai/usage";
import { FIRECRAWL_MODEL, scrapePage } from "./firecrawl";
import { trimMarkdown } from "./map";
import type { BrandFacts } from "./types";

// Pages most likely to hold features, pricing and "about" facts (English + Arabic slugs/labels).
const PAGE_HINTS: [RegExp, number][] = [
  [/feature|service|solution|product|how-it-works|مميز|خدمات|حلول|كيف/i, 3],
  [/pric|plan|package|اسعار|أسعار|باقات|الباقات/i, 3],
  [/about|who-we-are|company|من-نحن|من نحن|عن-/i, 2],
  [/faq|why|لماذا|ليش/i, 1],
];
const SKIP = /login|signin|sign-in|signup|register|cart|checkout|account|privacy|terms|policy|cookie|blog\/|wp-|\.(pdf|jpg|png|svg|zip)$|#|mailto:|tel:|whatsapp|facebook|instagram|twitter|x\.com|tiktok|youtube|linkedin/i;

/** Up to 3 same-site pages from the homepage links, best-scoring first. */
export function pickFactPages(links: string[] | undefined, homeUrl: string, max = 3): string[] {
  let home: URL;
  try {
    home = new URL(homeUrl);
  } catch {
    return [];
  }
  const host = home.hostname.replace(/^www\./, "");
  const seen = new Set<string>([home.pathname.replace(/\/+$/, "") || "/"]);
  const scored: { url: string; score: number }[] = [];
  for (const raw of links ?? []) {
    let u: URL;
    try {
      u = new URL(raw, home);
    } catch {
      continue;
    }
    if (u.hostname.replace(/^www\./, "") !== host || SKIP.test(u.href)) continue;
    const path = decodeURIComponent(u.pathname).replace(/\/+$/, "") || "/";
    if (seen.has(path)) continue;
    seen.add(path);
    const score = PAGE_HINTS.reduce((s, [re, w]) => (re.test(path) ? s + w : s), 0);
    scored.push({ url: `${u.origin}${u.pathname}`, score: score + (path.split("/").length <= 2 ? 0.5 : 0) });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .filter((s, i) => s.score > 0 || i < max)
    .slice(0, max)
    .map((s) => s.url);
}

const factsSchema = z.object({
  what_it_does: z.string().max(300),
  audience: z.string().max(200),
  key_features: z.array(z.string().max(80)).max(8),
  numbers: z.array(z.object({ value: z.number(), label: z.string().max(80), prefix: z.string().max(6), suffix: z.string().max(14) })).max(8),
  offers: z.array(z.string().max(120)).max(5),
  cta_url: z.string().max(200),
});

const factsTool = {
  name: "save_brand_facts",
  description: "Save the factual summary of the company, taken only from the provided pages.",
  input_schema: {
    type: "object" as const,
    properties: {
      what_it_does: { type: "string", description: "One or two sentences: what the company/product does. In the site's main language." },
      audience: { type: "string", description: "Who it is for. In the site's main language." },
      key_features: { type: "array", items: { type: "string" }, description: "Up to 8 real features/benefits named on the site, short phrases, site language." },
      numbers: {
        type: "array",
        description: "Only numbers that literally appear on the pages (customers, orders, cities, years, prices, %). Empty if none. Never estimate.",
        items: {
          type: "object",
          properties: {
            value: { type: "number", description: "The number as written on the site (e.g. 2500 for 2,500 or +2500)." },
            label: { type: "string", description: "What it counts, in the site's language (e.g. تاجر, orders)." },
            prefix: { type: "string", description: "e.g. + or $, or empty." },
            suffix: { type: "string", description: "e.g. % or k, or empty." },
          },
          required: ["value", "label", "prefix", "suffix"],
          additionalProperties: false,
        },
      },
      offers: { type: "array", items: { type: "string" }, description: "Current offers/discounts/free trials stated on the site. Empty if none." },
      cta_url: { type: "string", description: "The main sign-up / order / app URL a viewer should visit (absolute). Fall back to the homepage URL." },
    },
    required: ["what_it_does", "audience", "key_features", "numbers", "offers", "cta_url"],
    additionalProperties: false,
  },
};

const toLatinDigits = (s: string) => s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

/** Keep only numbers that actually appear in the scraped text (guards against invented stats). */
export function verifiedNumbers(numbers: BrandFacts["numbers"], sourceText: string) {
  const digits = toLatinDigits(sourceText).replace(/(\d)[,٬.\s](?=\d{3}\b)/g, "$1");
  return numbers.filter((n) => {
    const v = String(Math.round(n.value));
    return new RegExp(`(^|\\D)${v}(\\D|$)`).test(digits);
  });
}

export type FactPage = { url: string; markdown: string };

/** Scrape the extra pages (each counts toward the hourly limit). Failures are skipped. */
export async function scrapeFactPages(workspaceId: string, urls: string[]): Promise<FactPage[]> {
  const pages: FactPage[] = [];
  for (const url of urls) {
    try {
      await assertWithinRateLimit(workspaceId);
      const page = await scrapePage(url);
      pages.push({ url, markdown: (page.markdown ?? "").slice(0, 20_000) });
    } catch (err) {
      if (err instanceof AiError && err.code === "rate_limited") throw err;
      console.warn("[facts] page scrape failed", { url, code: err instanceof AiError ? err.code : "unknown" });
    } finally {
      await logUsage(workspaceId, "brand_scrape", FIRECRAWL_MODEL, null);
    }
  }
  return pages;
}

/** Haiku summary of homepage + extra pages into brand facts. */
export async function summarizeFacts(workspaceId: string, homeUrl: string, homeMarkdown: string, pages: FactPage[]): Promise<BrandFacts> {
  const sources = [{ url: homeUrl, markdown: homeMarkdown }, ...pages];
  const prompt = sources.map((p) => `### Page: ${p.url}\n${trimMarkdown(p.markdown, 5000)}`).join("\n\n") + "\n\nCall save_brand_facts.";
  const result = await callTool({
    workspaceId,
    kind: "brand_facts",
    system:
      "You extract factual, verifiable information about a company from its website pages for a marketing-video tool. Only state what the pages say. Never invent numbers, customers, awards or offers. Keep brand and product names exactly as written on the site.",
    prompt,
    tool: factsTool,
    schema: factsSchema,
    maxTokens: 2500,
  });
  if (!result.value) throw new AiError("ai_invalid", result.problem);
  const all = sources.map((s) => s.markdown).join("\n");
  return { ...result.value, numbers: verifiedNumbers(result.value.numbers, all), cta_url: result.value.cta_url || homeUrl };
}

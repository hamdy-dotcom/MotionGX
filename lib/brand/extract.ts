import "server-only";
import { AiError, assertWithinRateLimit, logUsage, toAiErrorCode } from "@/lib/ai/usage";
import { FIRECRAWL_MODEL, scrapeBrand } from "./firecrawl";
import { loadLogo } from "./logo";
import { mapColors, mapFonts, pickLogo, pickName, type FirecrawlScrape } from "./map";
import { EXTRACT_STEPS, emptyDraft, type ExtractEvent } from "./types";
import { analyzeTone } from "./tone";

export { normalizeUrl } from "./url";
export * from "./types";

/** Raw Firecrawl payload we keep in brand_profiles.raw so only "أعد القراءة" re-scrapes. */
function rawFor(url: string, scrape: FirecrawlScrape) {
  return {
    source: "firecrawl",
    url,
    scraped_at: new Date().toISOString(),
    branding: scrape.branding ?? null,
    metadata: scrape.metadata ?? null,
    markdown: (scrape.markdown ?? "").slice(0, 30_000),
  };
}

/**
 * Live extraction. Yields one event per step as it finishes, then the result.
 * Any step can fail; the result always comes, with whatever succeeded.
 */
export async function* extractBrand(workspaceId: string, url: string): AsyncGenerator<ExtractEvent> {
  const draft = emptyDraft(url);

  let scrape: FirecrawlScrape;
  try {
    await assertWithinRateLimit(workspaceId);
    try {
      scrape = await scrapeBrand(url);
    } finally {
      await logUsage(workspaceId, "brand_scrape", FIRECRAWL_MODEL, null);
    }
  } catch (err) {
    yield { type: "error", code: toAiErrorCode(err) };
    for (const step of EXTRACT_STEPS) yield { type: "step", step, status: "failed" };
    yield { type: "result", brand: draft, raw: null, cached: false };
    return;
  }

  draft.name = pickName(scrape, url) || draft.name;
  draft.tagline = scrape.metadata?.description?.split("\n")[0]?.slice(0, 120) ?? "";

  // Logo — must actually load as an image.
  const logoCandidate = pickLogo(scrape.branding);
  const logo = logoCandidate ? await loadLogo(logoCandidate) : null;
  draft.logoUrl = logo ? logoCandidate : null;
  yield { type: "step", step: "logo", status: logo ? "done" : "failed" };

  draft.colors = mapColors(scrape.branding, logoCandidate);
  yield { type: "step", step: "colors", status: draft.colors.length ? "done" : "failed" };

  const fonts = mapFonts(scrape.branding);
  draft.fonts = fonts.fonts;
  yield { type: "step", step: "fonts", status: fonts.found.arabic || fonts.found.latin ? "done" : "failed" };

  try {
    const voice = await analyzeTone(workspaceId, url, scrape);
    draft.tone = voice.tone;
    draft.tagline = voice.tagline;
    draft.defaultDialect = voice.default_dialect;
    yield { type: "step", step: "tone", status: "done" };
  } catch (err) {
    if (err instanceof AiError && err.code !== "ai_invalid") yield { type: "error", code: err.code };
    yield { type: "step", step: "tone", status: "failed" };
  }

  yield { type: "result", brand: draft, raw: rawFor(url, scrape), cached: false };
}

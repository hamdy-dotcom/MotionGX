import "server-only";
import { AiError } from "@/lib/ai/usage";
import type { FirecrawlScrape } from "./map";

export const FIRECRAWL_MODEL = "firecrawl-v2-scrape";

type Format = string | { type: string; [k: string]: unknown };

async function scrape(url: string, formats: Format[], timeoutMs: number): Promise<FirecrawlScrape> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new AiError("not_configured", "FIRECRAWL_API_KEY is not set");

  let res: Response;
  try {
    res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ url, formats, onlyMainContent: false }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    console.error("[firecrawl] request failed", { url, err });
    throw new AiError("scrape_failed");
  }

  const body = (await res.json().catch(() => null)) as { success?: boolean; data?: FirecrawlScrape; error?: string } | null;
  if (!res.ok || !body?.success || !body.data) {
    console.error("[firecrawl] scrape failed", { url, status: res.status, error: body?.error });
    if (res.status === 401 || res.status === 403) throw new AiError("not_configured", body?.error);
    throw new AiError("scrape_failed", body?.error);
  }
  return body.data;
}

/**
 * Homepage: branding + markdown + links (links feed the brand-facts page picker),
 * plus rawHtml + images + a full-page screenshot for the page snapshot.
 */
export function scrapeBrand(url: string): Promise<FirecrawlScrape> {
  return scrape(url, ["branding", "markdown", "links", "rawHtml", "images", { type: "screenshot", fullPage: true }], 90_000);
}

/** Extra page for brand facts: markdown only. */
export function scrapePage(url: string): Promise<FirecrawlScrape> {
  return scrape(url, ["markdown"], 60_000);
}

import "server-only";
import { AiError } from "@/lib/ai/usage";
import type { FirecrawlScrape } from "./map";

export const FIRECRAWL_MODEL = "firecrawl-v2-scrape";

/** POST /v2/scrape with the branding + markdown formats. */
export async function scrapeBrand(url: string): Promise<FirecrawlScrape> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new AiError("not_configured", "FIRECRAWL_API_KEY is not set");

  let res: Response;
  try {
    res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ url, formats: ["branding", "markdown"], onlyMainContent: false }),
      signal: AbortSignal.timeout(90_000),
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

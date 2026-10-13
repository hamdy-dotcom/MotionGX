import type { NextRequest } from "next/server";
import { getApiContext } from "@/lib/context";
import { EXTRACT_STEPS, extractBrand, type BrandDraft, type ExtractEvent } from "@/lib/brand/extract";
import { EMPTY_FACTS, FALLBACK_FONTS, type BrandFacts } from "@/lib/brand/types";
import { normalizeUrl, urlKey } from "@/lib/brand/url";
import { snapshotFolder, snapshotZip, type Snapshot } from "@/lib/brand/snapshot";
import type { BrandProfile, Dialect } from "@/lib/types";

export const maxDuration = 120;

type CachedCompany = {
  name: string;
  website_url: string | null;
  default_dialect: Dialect;
  brand_profiles: (BrandProfile & { raw: Record<string, unknown> | null; facts: Partial<BrandFacts> | null }) | null;
  brand_assets: { kind: string; storage_path: string }[];
};

/**
 * Streams brand extraction as NDJSON: one {"type":"step"} line per finished step, then {"type":"result"}.
 * Reuses the cached Firecrawl payload of a company with the same website unless `refresh` is true
 * ("أعد القراءة" is the only thing that re-calls Firecrawl).
 */
export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (!ctx) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (ctx.role === "viewer") return Response.json({ error: "forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { url?: string; refresh?: boolean };
  const url = normalizeUrl(String(body.url ?? ""));
  const key = urlKey(url);
  if (!key) return Response.json({ error: "invalid_url" }, { status: 400 });

  const cached = body.refresh ? null : await findCached(ctx, key);
  const folder = await snapshotFolder(ctx.workspace.id, key);

  /** Upload every snapshot file + snapshot.zip under the site's folder (overwrites a previous read). */
  const storeSnapshot = async (snapshot: Snapshot) => {
    const bucket = ctx.supabase.storage.from("brand-assets");
    const uploads = [...snapshot.files, { path: "snapshot.zip", bytes: snapshotZip(snapshot), contentType: "application/zip" }];
    for (let i = 0; i < uploads.length; i += 6) {
      const results = await Promise.all(
        uploads.slice(i, i + 6).map((f) => bucket.upload(`${folder}/${f.path}`, f.bytes, { contentType: f.contentType, upsert: true })),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) {
        console.error("[brand/extract] snapshot upload failed", { message: failed.error.message });
        return false;
      }
    }
    return true;
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ExtractEvent) => controller.enqueue(new TextEncoder().encode(`${JSON.stringify(event)}\n`));
      try {
        if (cached) {
          const steps = { ...cached.steps, snapshot: await hasSnapshot(ctx, folder) };
          for (const step of EXTRACT_STEPS) send({ type: "step", step, status: steps[step] ? "done" : "failed" });
          send({ type: "result", brand: cached.brand, raw: cached.raw, cached: true });
        } else {
          for await (const event of extractBrand(ctx.workspace.id, url, storeSnapshot)) send(event);
        }
      } catch (err) {
        console.error("[brand/extract] stream failed", { url, err });
        send({ type: "error", code: "ai_failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function hasSnapshot(ctx: NonNullable<Awaited<ReturnType<typeof getApiContext>>>, folder: string) {
  const { data } = await ctx.supabase.storage.from("brand-assets").list(folder, { search: "snapshot.zip", limit: 1 });
  return Boolean(data?.some((f) => f.name === "snapshot.zip"));
}

async function findCached(ctx: NonNullable<Awaited<ReturnType<typeof getApiContext>>>, key: string) {
  const { data, error } = await ctx.supabase
    .from("companies")
    .select("name, website_url, default_dialect, brand_profiles(colors, fonts, tone, tagline, facts, raw), brand_assets(kind, storage_path)")
    .eq("workspace_id", ctx.workspace.id)
    .not("website_url", "is", null)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[brand/extract] cache lookup failed", { code: error.code, message: error.message });
    return null;
  }

  const company = (data as unknown as CachedCompany[]).find(
    (c) => c.website_url && urlKey(c.website_url) === key && c.brand_profiles?.raw?.source === "firecrawl",
  );
  if (!company?.brand_profiles) return null;

  const profile = company.brand_profiles;
  const logo = company.brand_assets.findLast((a) => a.kind === "logo");
  let logoUrl: string | null = null;
  if (logo) {
    const { data: signed } = await ctx.supabase.storage.from("brand-assets").createSignedUrl(logo.storage_path, 60 * 60);
    logoUrl = signed?.signedUrl ?? null;
  }

  const brand: BrandDraft = {
    name: company.name,
    websiteUrl: company.website_url!,
    logoUrl,
    colors: profile.colors ?? [],
    fonts: { arabic: profile.fonts?.arabic || FALLBACK_FONTS.arabic, latin: profile.fonts?.latin || FALLBACK_FONTS.latin },
    tone: profile.tone ?? "",
    tagline: profile.tagline ?? "",
    defaultDialect: company.default_dialect,
    facts: { ...EMPTY_FACTS, cta_url: company.website_url!, ...(profile.facts ?? {}) },
  };
  return {
    brand,
    raw: profile.raw,
    steps: { logo: Boolean(logoUrl), colors: brand.colors.length > 0, fonts: Boolean(profile.fonts?.arabic || profile.fonts?.latin), tone: Boolean(profile.tone), facts: Boolean(profile.facts?.what_it_does) },
  };
}

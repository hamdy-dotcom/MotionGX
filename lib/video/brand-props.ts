import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildTokens, luminance } from "./tokens";
import { decodeSvgDataUri, normalizeHex, svgFills } from "@/lib/brand/map";
import type { BrandFacts } from "@/lib/brand/types";
import type { BrandColor, BrandProfile, Dialect } from "@/lib/types";
import type { VideoBrand } from "./kit";

const SIGNED_TTL = 60 * 60 * 24; // long enough for a render to start and finish

export type CompanyBrand = {
  companyId: string;
  workspaceId: string;
  name: string;
  websiteUrl: string | null;
  defaultDialect: Dialect;
  profile: (BrandProfile & { facts?: BrandFacts | null; raw?: Record<string, unknown> | null }) | null;
  video: VideoBrand;
};

/** Dark logo on a dark canvas → put it on a light plate. SVGs are checked by their fills; rasters always get the plate. */
export function logoNeedsPlate(svgText: string | null, canvasDark: boolean) {
  if (!canvasDark) return false;
  if (!svgText) return true;
  const fills = svgFills(svgText);
  if (!fills.length) return true;
  const darkShare = fills.filter((f) => luminance(f) < 0.12).length / fills.length;
  return darkShare >= 0.25;
}

/** Loads a company's brand profile and assets and builds the engine's brand props (signed asset URLs). */
export async function loadCompanyBrand(supabase: SupabaseClient, companyId: string, withFacts = true): Promise<CompanyBrand | null> {
  const profileCols = `colors, fonts, tone, tagline${withFacts ? ", facts" : ""}, raw`;
  const { data, error } = await supabase
    .from("companies")
    .select(`id, workspace_id, name, website_url, default_dialect, brand_profiles(${profileCols}), brand_assets(kind, storage_path, meta)`)
    .eq("id", companyId)
    .maybeSingle();
  if (error?.code === "42703" && withFacts) return loadCompanyBrand(supabase, companyId, false); // facts column added in 0003
  if (error || !data) {
    if (error) console.error("[brand-props] load failed", { companyId, code: error.code, message: error.message });
    return null;
  }
  const row = data as unknown as {
    id: string;
    workspace_id: string;
    name: string;
    website_url: string | null;
    default_dialect: Dialect;
    brand_profiles: CompanyBrand["profile"] | CompanyBrand["profile"][];
    brand_assets: { kind: string; storage_path: string; meta: Record<string, unknown> | null }[];
  };
  const profile = (Array.isArray(row.brand_profiles) ? row.brand_profiles[0] : row.brand_profiles) ?? null;
  const colors: BrandColor[] = (profile?.colors ?? []).filter((c) => normalizeHex(c.hex));
  const canvasDark = buildTokens(colors).dark;

  const sign = async (path: string) => (await supabase.storage.from("brand-assets").createSignedUrl(path, SIGNED_TTL)).data?.signedUrl ?? null;

  const logo = row.brand_assets.findLast((a) => a.kind === "logo");
  let logoUrl: string | null = null;
  let svgText: string | null = null;
  if (logo) {
    logoUrl = await sign(logo.storage_path);
    if (logo.storage_path.endsWith(".svg")) {
      const { data: file } = await supabase.storage.from("brand-assets").download(logo.storage_path);
      svgText = file ? await file.text() : null;
    }
  } else {
    // Fall back to the extracted logo still cached in the raw scrape (e.g. an inline SVG data URI).
    const branding = (profile?.raw as { branding?: { images?: { logo?: string }; logo?: string } } | null)?.branding;
    const cached = branding?.images?.logo || branding?.logo;
    if (cached?.startsWith("data:image/")) {
      logoUrl = cached;
      svgText = decodeSvgDataUri(cached);
    }
  }

  const image = row.brand_assets.findLast((a) => a.kind === "image");
  const fontFiles = await Promise.all(
    row.brand_assets
      .filter((a) => a.kind === "font")
      .map(async (a) => ({ family: String(a.meta?.family ?? ""), url: (await sign(a.storage_path)) ?? "" })),
  );

  return {
    companyId: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    websiteUrl: row.website_url,
    defaultDialect: row.default_dialect,
    profile,
    video: {
      name: row.name,
      logoUrl,
      logoPlate: logoUrl ? logoNeedsPlate(svgText, canvasDark) : false,
      colors,
      fonts: { arabic: profile?.fonts?.arabic ?? null, latin: profile?.fonts?.latin ?? null },
      fontFiles: fontFiles.filter((f) => f.family && f.url),
      url: (profile?.facts?.cta_url || row.website_url || "").replace(/^https?:\/\//, "").replace(/\/$/, "") || null,
      imageUrl: image ? await sign(image.storage_path) : null,
    },
  };
}

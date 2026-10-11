import "server-only";
import type { AppContext } from "@/lib/context";
import type { BrandProfile, Company } from "@/lib/types";

/** Companies in the workspace with their brand profile and a short-lived logo URL. */
export async function listCompanies(ctx: AppContext): Promise<Company[]> {
  const { data, error } = await ctx.supabase
    .from("companies")
    .select("id, name, website_url, default_dialect, created_at, brand_profiles(colors, fonts, tone, tagline), brand_assets(kind, storage_path)")
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as unknown as (Omit<Company, "brand_profiles"> & {
    brand_profiles: BrandProfile | BrandProfile[] | null;
    brand_assets: { kind: string; storage_path: string }[];
  })[];

  const logoPaths = rows.flatMap((r) => r.brand_assets.filter((a) => a.kind === "logo").map((a) => a.storage_path));
  const signed = new Map<string, string>();
  if (logoPaths.length) {
    const { data: urls } = await ctx.supabase.storage.from("brand-assets").createSignedUrls(logoPaths, 60 * 60);
    urls?.forEach((u) => u.path && u.signedUrl && signed.set(u.path, u.signedUrl));
  }

  return rows.map(({ brand_assets, brand_profiles, ...company }) => {
    const logo = brand_assets.findLast((a) => a.kind === "logo");
    return {
      ...company,
      brand_profiles: Array.isArray(brand_profiles) ? (brand_profiles[0] ?? null) : brand_profiles,
      logo_url: logo ? (signed.get(logo.storage_path) ?? null) : null,
    };
  });
}

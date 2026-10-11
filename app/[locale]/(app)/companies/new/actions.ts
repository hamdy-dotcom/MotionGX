"use server";

import { revalidatePath } from "next/cache";
import { getAppContext } from "@/lib/context";
import { extractBrand, normalizeUrl, type ExtractedBrand } from "@/lib/brand/extract";
import { redirect } from "@/i18n/navigation";
import { DIALECTS, type BrandColor, type Dialect } from "@/lib/types";

export async function extractBrandAction(url: string): Promise<{ ok: true; brand: ExtractedBrand } | { ok: false }> {
  await getAppContext();
  const normalized = normalizeUrl(url);
  try {
    new URL(normalized);
  } catch {
    return { ok: false };
  }
  return { ok: true, brand: await extractBrand(normalized) };
}

export type SaveCompanyState = { error?: "nameRequired" | "generic" };

const LOGO_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export async function saveCompany(_prev: SaveCompanyState, formData: FormData): Promise<SaveCompanyState> {
  const ctx = await getAppContext();
  const { supabase, workspace, locale } = ctx;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "nameRequired" };

  const dialectInput = String(formData.get("default_dialect") ?? "eg");
  const dialect: Dialect = DIALECTS.includes(dialectInput as Dialect) ? (dialectInput as Dialect) : "eg";

  let colors: BrandColor[] = [];
  try {
    colors = (JSON.parse(String(formData.get("colors") ?? "[]")) as BrandColor[])
      .filter((c) => /^#[0-9a-f]{6}$/i.test(c.hex))
      .slice(0, 6);
  } catch {
    colors = [];
  }

  const { data: company, error } = await supabase
    .from("companies")
    .insert({
      workspace_id: workspace.id,
      name,
      website_url: String(formData.get("website_url") ?? "") || null,
      default_dialect: dialect,
    })
    .select("id")
    .single();
  if (error || !company) {
    console.error("saveCompany", error?.message);
    return { error: "generic" };
  }

  const { error: brandError } = await supabase.from("brand_profiles").insert({
    company_id: company.id,
    colors,
    fonts: {
      arabic: String(formData.get("font_arabic") ?? "").trim() || null,
      latin: String(formData.get("font_latin") ?? "").trim() || null,
    },
    tone: String(formData.get("tone") ?? "").trim() || null,
    tagline: String(formData.get("tagline") ?? "").trim() || null,
    raw: { source: "mock-extract" }, // PHASE 2: store the raw extraction payload
  });
  if (brandError) {
    console.error("saveCompany brand", brandError.message);
    return { error: "generic" };
  }

  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0 && logo.size <= 2 * 1024 * 1024 && LOGO_TYPES[logo.type]) {
    const path = `${workspace.id}/${company.id}/logo-${Date.now()}.${LOGO_TYPES[logo.type]}`;
    const { error: uploadError } = await supabase.storage
      .from("brand-assets")
      .upload(path, logo, { contentType: logo.type, upsert: false });
    if (!uploadError) {
      await supabase.from("brand_assets").insert({
        company_id: company.id,
        kind: "logo",
        storage_path: path,
        meta: { content_type: logo.type, size: logo.size },
      });
    } else {
      console.error("logo upload", uploadError.message);
    }
  }

  revalidatePath("/", "layout");
  redirect({ href: "/", locale });
  return {};
}

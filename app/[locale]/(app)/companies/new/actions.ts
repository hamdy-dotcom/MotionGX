"use server";

import { revalidatePath } from "next/cache";
import { getAppContext } from "@/lib/context";
import { loadLogo, logoFromBytes, type LogoFile } from "@/lib/brand/logo";
import { redirect } from "@/i18n/navigation";
import { DIALECTS, type BrandColor, type Dialect } from "@/lib/types";

export type SaveCompanyState = { error?: "nameRequired" | "generic" };

function parseJson<T>(value: FormDataEntryValue | null, fallback: T): T {
  try {
    return value ? (JSON.parse(String(value)) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Saves the company + brand profile. Never blocked by failed extraction steps — only a name is required. */
export async function saveCompany(_prev: SaveCompanyState, formData: FormData): Promise<SaveCompanyState> {
  const ctx = await getAppContext();
  const { supabase, workspace, locale } = ctx;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "nameRequired" };

  const dialectInput = String(formData.get("default_dialect") ?? "eg");
  const dialect: Dialect = DIALECTS.includes(dialectInput as Dialect) ? (dialectInput as Dialect) : "eg";

  const colors = parseJson<BrandColor[]>(formData.get("colors"), [])
    .filter((c) => /^#[0-9a-f]{6}$/i.test(c?.hex ?? ""))
    .map((c) => (c.role ? { hex: c.hex.toUpperCase(), role: c.role } : { hex: c.hex.toUpperCase() }))
    .slice(0, 6);

  // Raw Firecrawl payload (cached so only "أعد القراءة" re-scrapes); manual entry otherwise.
  const raw = parseJson<Record<string, unknown> | null>(formData.get("raw"), null);
  const rawToStore = raw && raw.source === "firecrawl" ? raw : { source: "manual" };

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
    console.error("[saveCompany] insert company failed", { code: error?.code, message: error?.message });
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
    raw: rawToStore,
  });
  if (brandError) {
    console.error("[saveCompany] insert brand profile failed", { code: brandError.code, message: brandError.message });
    return { error: "generic" };
  }

  // Logo: an uploaded file wins; otherwise download the extracted logo into Storage.
  let logo: LogoFile | null = null;
  let source: "upload" | "extracted" = "upload";
  const file = formData.get("logo");
  if (file instanceof File && file.size > 0) {
    logo = logoFromBytes(new Uint8Array(await file.arrayBuffer()), file.type);
  } else {
    const logoUrl = String(formData.get("logo_url") ?? "");
    if (logoUrl) {
      logo = await loadLogo(logoUrl);
      source = "extracted";
    }
  }

  if (logo) {
    const path = `${workspace.id}/${company.id}/logo.${logo.ext}`;
    const { error: uploadError } = await supabase.storage
      .from("brand-assets")
      .upload(path, logo.bytes, { contentType: logo.contentType, upsert: true });
    if (uploadError) {
      console.error("[saveCompany] logo upload failed", { message: uploadError.message });
    } else {
      const { error: assetError } = await supabase.from("brand_assets").insert({
        company_id: company.id,
        kind: "logo",
        storage_path: path,
        meta: { content_type: logo.contentType, size: logo.bytes.byteLength, source },
      });
      if (assetError) console.error("[saveCompany] brand_assets insert failed", { code: assetError.code, message: assetError.message });
    }
  }

  revalidatePath("/", "layout");
  redirect({ href: "/", locale });
  return {};
}

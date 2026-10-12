"use server";

import { revalidatePath } from "next/cache";
import { getAppContext, type AppContext } from "@/lib/context";
import { loadLogo, logoFromBytes, type LogoFile } from "@/lib/brand/logo";
import type { BrandFacts } from "@/lib/brand/types";
import { redirect } from "@/i18n/navigation";
import { DIALECTS, type BrandColor, type Dialect } from "@/lib/types";

export type SaveCompanyState = { error?: "nameRequired" | "generic"; saved?: boolean };

function parseJson<T>(value: FormDataEntryValue | null, fallback: T): T {
  try {
    return value ? (JSON.parse(String(value)) as T) : fallback;
  } catch {
    return fallback;
  }
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function parseFacts(value: FormDataEntryValue | null): BrandFacts {
  const f = parseJson<Partial<BrandFacts>>(value, {});
  const list = (v: unknown, max: number, n: number) => (Array.isArray(v) ? v.map((x) => str(x, max)).filter(Boolean).slice(0, n) : []);
  return {
    what_it_does: str(f.what_it_does, 300),
    audience: str(f.audience, 200),
    key_features: list(f.key_features, 80, 8),
    numbers: (Array.isArray(f.numbers) ? f.numbers : [])
      .map((n) => ({ value: Number(n?.value), label: str(n?.label, 80), prefix: str(n?.prefix, 6), suffix: str(n?.suffix, 14) }))
      .filter((n) => Number.isFinite(n.value) && n.label)
      .slice(0, 8),
    offers: list(f.offers, 120, 5),
    cta_url: str(f.cta_url, 200),
  };
}

function parseBrand(formData: FormData) {
  const dialectInput = String(formData.get("default_dialect") ?? "eg");
  const raw = parseJson<Record<string, unknown> | null>(formData.get("raw"), null);
  return {
    name: String(formData.get("name") ?? "").trim(),
    websiteUrl: String(formData.get("website_url") ?? "") || null,
    dialect: (DIALECTS.includes(dialectInput as Dialect) ? dialectInput : "eg") as Dialect,
    colors: parseJson<BrandColor[]>(formData.get("colors"), [])
      .filter((c) => /^#[0-9a-f]{6}$/i.test(c?.hex ?? ""))
      .map((c) => (c.role ? { hex: c.hex.toUpperCase(), role: c.role } : { hex: c.hex.toUpperCase() }))
      .slice(0, 6),
    fonts: {
      arabic: String(formData.get("font_arabic") ?? "").trim() || null,
      latin: String(formData.get("font_latin") ?? "").trim() || null,
    },
    tone: String(formData.get("tone") ?? "").trim() || null,
    tagline: String(formData.get("tagline") ?? "").trim() || null,
    facts: parseFacts(formData.get("facts")),
    // Raw Firecrawl payload is cached so only "أعد القراءة" re-scrapes.
    raw: raw && raw.source === "firecrawl" ? raw : null,
  };
}

async function saveLogo(ctx: AppContext, companyId: string, formData: FormData) {
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
  if (!logo) return;

  const path = `${ctx.workspace.id}/${companyId}/logo.${logo.ext}`;
  const { error: uploadError } = await ctx.supabase.storage.from("brand-assets").upload(path, logo.bytes, { contentType: logo.contentType, upsert: true });
  if (uploadError) {
    console.error("[company] logo upload failed", { message: uploadError.message });
    return;
  }
  await ctx.supabase.from("brand_assets").delete().eq("company_id", companyId).eq("kind", "logo").neq("storage_path", path);
  const { data: existing } = await ctx.supabase.from("brand_assets").select("id").eq("company_id", companyId).eq("storage_path", path).maybeSingle();
  const meta = { content_type: logo.contentType, size: logo.bytes.byteLength, source };
  const { error } = existing
    ? await ctx.supabase.from("brand_assets").update({ meta }).eq("id", existing.id)
    : await ctx.supabase.from("brand_assets").insert({ company_id: companyId, kind: "logo", storage_path: path, meta });
  if (error) console.error("[company] brand_assets write failed", { code: error.code, message: error.message });
}

/** Create. Never blocked by failed extraction steps — only a name is required. */
export async function saveCompany(_prev: SaveCompanyState, formData: FormData): Promise<SaveCompanyState> {
  const ctx = await getAppContext();
  const b = parseBrand(formData);
  if (!b.name) return { error: "nameRequired" };

  const { data: company, error } = await ctx.supabase
    .from("companies")
    .insert({ workspace_id: ctx.workspace.id, name: b.name, website_url: b.websiteUrl, default_dialect: b.dialect })
    .select("id")
    .single();
  if (error || !company) {
    console.error("[saveCompany] insert company failed", { code: error?.code, message: error?.message });
    return { error: "generic" };
  }

  const { error: brandError } = await ctx.supabase.from("brand_profiles").insert({
    company_id: company.id,
    colors: b.colors,
    fonts: b.fonts,
    tone: b.tone,
    tagline: b.tagline,
    facts: b.facts,
    raw: b.raw ?? { source: "manual" },
  });
  if (brandError) {
    console.error("[saveCompany] insert brand profile failed", { code: brandError.code, message: brandError.message });
    return { error: "generic" };
  }

  await saveLogo(ctx, company.id, formData);
  revalidatePath("/", "layout");
  redirect({ href: "/", locale: ctx.locale });
  return {};
}

/** Edit an existing company + brand profile (incl. facts). */
export async function updateCompany(companyId: string, _prev: SaveCompanyState, formData: FormData): Promise<SaveCompanyState> {
  const ctx = await getAppContext();
  const b = parseBrand(formData);
  if (!b.name) return { error: "nameRequired" };

  const { error } = await ctx.supabase
    .from("companies")
    .update({ name: b.name, website_url: b.websiteUrl, default_dialect: b.dialect })
    .eq("id", companyId)
    .eq("workspace_id", ctx.workspace.id);
  if (error) {
    console.error("[updateCompany] update company failed", { code: error.code, message: error.message });
    return { error: "generic" };
  }

  const profile: Record<string, unknown> = { company_id: companyId, colors: b.colors, fonts: b.fonts, tone: b.tone, tagline: b.tagline, facts: b.facts };
  if (b.raw) profile.raw = b.raw; // only a fresh "re-read" replaces the cached scrape
  const { error: brandError } = await ctx.supabase.from("brand_profiles").upsert(profile, { onConflict: "company_id" });
  if (brandError) {
    console.error("[updateCompany] upsert brand profile failed", { code: brandError.code, message: brandError.message });
    return { error: "generic" };
  }

  await saveLogo(ctx, companyId, formData);
  revalidatePath("/", "layout");
  return { saved: true };
}

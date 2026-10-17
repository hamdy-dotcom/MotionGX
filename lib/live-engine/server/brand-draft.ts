import "server-only";
// brand.json (the sandbox's profile step) → the existing "Add company" fields. The user still edits them
// before "تأكيد وحفظ الشركة"; brand_profiles.raw keeps {source: "live", capture_id} so every video reuses
// that capture.
import { createAdminClient } from "@/lib/supabase/admin";
import { EMPTY_FACTS, FALLBACK_FONTS, type BrandDraft } from "@/lib/brand/types";
import type { BrandColor } from "@/lib/types";
import { LIVE_BUCKET } from "../protocol";

type BrandJson = {
  name?: string;
  name_ar?: string;
  site?: string;
  tagline?: string;
  summary?: string;
  audience?: string;
  language?: string;
  voice?: string;
  palette?: Partial<Record<"background" | "surface" | "ink" | "muted" | "primary" | "accent", string>>;
  fonts?: { display?: string; body?: string };
  logo?: { file: string; on_dark?: boolean } | null;
  selling_points?: string[];
  features?: { name: string; detail?: string }[];
};

const HEX = /^#[0-9a-f]{6}$/i;
/** selling points that are offers (free tier, trial, discount, price) — brand.json has no separate offers list */
const OFFER = /free|trial|discount|off\b|%|no credit card|money.back|مجان|مجاني|تجرب|خصم|عرض|بدون بطاقة|ضمان|استرجاع|جنيه|ريال|\$|egp|sar/i;

export async function brandDraftFrom(brand: BrandJson, opts: { siteUrl: string; prefix: string }): Promise<BrandDraft> {
  const p = brand.palette ?? {};
  const roles: [keyof NonNullable<BrandJson["palette"]>, BrandColor["role"]][] = [["primary", "primary"], ["accent", "accent"], ["ink", "ink"], ["background", "background"], ["surface", undefined], ["muted", undefined]];
  const colors: BrandColor[] = [];
  for (const [k, role] of roles) {
    const hex = p[k]?.toUpperCase();
    if (hex && HEX.test(hex) && !colors.some((c) => c.hex === hex)) colors.push(role ? { hex, role } : { hex });
  }
  // brand.json fonts are display/body; on an Arabic (rtl) site they are the Arabic fonts
  const rtl = /arab|rtl|عرب/i.test(brand.language ?? "");
  const display = brand.fonts?.display?.trim() || "";
  const body = brand.fonts?.body?.trim() || "";
  const fonts = rtl ? { arabic: display || body || FALLBACK_FONTS.arabic, latin: body && body !== display ? body : FALLBACK_FONTS.latin } : { arabic: FALLBACK_FONTS.arabic, latin: display || body || FALLBACK_FONTS.latin };

  let logoUrl: string | null = null;
  if (brand.logo?.file) {
    const { data } = await createAdminClient().storage.from(LIVE_BUCKET).createSignedUrl(`${opts.prefix}/${brand.logo.file}`, 60 * 60);
    logoUrl = data?.signedUrl ?? null;
  }
  const site = brand.site || opts.siteUrl;
  return {
    name: (rtl && brand.name_ar) || brand.name || "",
    websiteUrl: site,
    logoUrl,
    logoOnDark: brand.logo ? Boolean(brand.logo.on_dark) : null,
    colors,
    fonts,
    tone: brand.voice ?? "",
    tagline: brand.tagline ?? "",
    defaultDialect: "eg",
    facts: {
      ...EMPTY_FACTS,
      what_it_does: brand.summary ?? "",
      audience: brand.audience ?? "",
      key_features: (brand.features ?? []).map((f) => (f.detail ? `${f.name} — ${f.detail}` : f.name)),
      offers: (brand.selling_points ?? []).filter((s) => OFFER.test(s)),
      cta_url: site,
    },
  };
}

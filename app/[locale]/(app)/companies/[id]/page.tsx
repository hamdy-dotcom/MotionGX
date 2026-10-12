import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAppContext } from "@/lib/context";
import { listCompanies } from "@/lib/data/companies";
import { EMPTY_FACTS, FALLBACK_FONTS, type BrandDraft, type BrandFacts } from "@/lib/brand/types";
import { Heading, boldTag } from "@/components/heading";
import { CompanyScreen } from "./company-screen";

export default async function CompanyPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const ctx = await getAppContext();
  const t = await getTranslations("companies");

  const company = (await listCompanies(ctx)).find((c) => c.id === id);
  if (!company) notFound();
  const { data: profile } = await ctx.supabase.from("brand_profiles").select("facts").eq("company_id", id).maybeSingle();
  const facts = { ...EMPTY_FACTS, ...((profile?.facts ?? {}) as Partial<BrandFacts>) };

  const brand: BrandDraft = {
    name: company.name,
    websiteUrl: company.website_url ?? "",
    logoUrl: company.logo_url ?? null,
    colors: company.brand_profiles?.colors ?? [],
    fonts: { arabic: company.brand_profiles?.fonts?.arabic || FALLBACK_FONTS.arabic, latin: company.brand_profiles?.fonts?.latin || FALLBACK_FONTS.latin },
    tone: company.brand_profiles?.tone ?? "",
    tagline: company.brand_profiles?.tagline ?? "",
    defaultDialect: company.default_dialect,
    facts,
  };

  return (
    <div>
      <Heading as="h1" className="text-3xl sm:text-4xl">
        {t.rich("editTitle", { ...boldTag, name: company.name })}
      </Heading>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink-muted">{t("editSubtitle")}</p>
      <div className="mt-6">
        <CompanyScreen companyId={company.id} brand={brand} />
      </div>
    </div>
  );
}

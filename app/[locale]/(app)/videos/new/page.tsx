import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAppContext } from "@/lib/context";
import { listCompanies } from "@/lib/data/companies";
import { getFxRate, getPrices } from "@/lib/pricing";
import type { Voice } from "@/lib/types";
import { Heading, boldTag } from "@/components/heading";
import { FoldersIllustration } from "@/components/illustrations";
import { PlusIcon } from "@/components/icons";
import { NewVideoForm } from "./new-video-form";

export default async function NewVideoPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ company?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { company } = await searchParams;
  const ctx = await getAppContext();
  const t = await getTranslations("videos");
  const td = await getTranslations("dashboard");
  const ta = await getTranslations("art");

  const [companies, voicesRes, prices, fx] = await Promise.all([
    listCompanies(ctx),
    ctx.supabase.from("voices").select("id, display_name, dialect, gender").eq("is_active", true).order("gender"),
    getPrices(ctx.supabase),
    getFxRate(ctx.supabase, ctx.workspace.currency_code),
  ]);

  return (
    <div>
      <Heading as="h1" className="text-3xl sm:text-4xl">
        {t.rich("title", boldTag)}
      </Heading>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink-muted">{t("subtitle")}</p>

      <div className="mt-6">
        {companies.length === 0 ? (
          <div className="panel flex flex-col items-center gap-4 py-10 text-center">
            <FoldersIllustration label={ta("folders")} className="w-36" />
            <p className="text-ink-muted">{t("noCompany")}</p>
            <Link href="/companies/new" className="btn btn-primary">
              <PlusIcon className="size-4" />
              {td("addCompany")}
            </Link>
          </div>
        ) : (
          <NewVideoForm
            companies={companies.map((c) => ({ id: c.id, name: c.name, defaultDialect: c.default_dialect, colors: c.brand_profiles?.colors ?? [], logoUrl: c.logo_url ?? null }))}
            initialCompanyId={companies.some((c) => c.id === company) ? company! : companies[0].id}
            voices={(voicesRes.data ?? []) as Voice[]}
            prices={prices}
            fxRate={fx}
            currency={ctx.workspace.currency_code}
          />
        )}
      </div>
    </div>
  );
}

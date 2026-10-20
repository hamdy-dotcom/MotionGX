import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAppContext } from "@/lib/context";
import { listCompanies } from "@/lib/data/companies";
import { getFxRate } from "@/lib/pricing";
import { getPostPriceUsd } from "@/lib/posts/price";
import { Heading, boldTag } from "@/components/heading";
import { FoldersIllustration } from "@/components/illustrations";
import { PlusIcon } from "@/components/icons";
import { NewPostForm } from "./new-post-form";

// The post job starts in `after()` of this route's create action.
export const maxDuration = 300;

export default async function NewPostPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ company?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { company } = await searchParams;
  const ctx = await getAppContext();
  const t = await getTranslations("posts");
  const td = await getTranslations("dashboard");
  const ta = await getTranslations("art");
  const [companies, priceUsd, fx] = await Promise.all([listCompanies(ctx), getPostPriceUsd(ctx.supabase), getFxRate(ctx.supabase, ctx.workspace.currency_code)]);

  return (
    <div>
      <Heading as="h1" className="text-3xl sm:text-4xl">
        {t.rich("newTitle", boldTag)}
      </Heading>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink-muted">{t("newSubtitle")}</p>
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
          <NewPostForm
            companies={companies.map((c) => ({ id: c.id, name: c.name, defaultDialect: c.default_dialect, colors: c.brand_profiles?.colors ?? [], logoUrl: c.logo_url ?? null, logoOnDark: c.logo_on_dark ?? null }))}
            initialCompanyId={companies.some((c) => c.id === company) ? company! : companies[0].id}
            priceUsd={priceUsd}
            fxRate={fx}
            currency={ctx.workspace.currency_code}
          />
        )}
      </div>
    </div>
  );
}

import { getTranslations, setRequestLocale } from "next-intl/server";
import { Heading, boldTag } from "@/components/heading";
import { getAppContext } from "@/lib/context";
import { getFxRate } from "@/lib/pricing";
import { estimate } from "@/lib/billing";
import { formatMoney } from "@/lib/format";
import { BrandStudio } from "./brand-studio";

export default async function CreateBrandPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("companies.studio");
  const ctx = await getAppContext();
  const fx = await getFxRate(ctx.supabase, ctx.workspace.currency_code);
  const est = await estimate(ctx.workspace.id, { kind: "brand" });
  const price = formatMoney(Math.round(est.usd * fx * 100) / 100, ctx.workspace.currency_code, locale);

  return (
    <div className="mx-auto max-w-5xl">
      <Heading as="h1" className="text-3xl sm:text-4xl">
        {t.rich("title", boldTag)}
      </Heading>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink-muted">{t("subtitle")}</p>
      <div className="mt-6">
        <BrandStudio price={price} />
      </div>
    </div>
  );
}

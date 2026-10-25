import { getTranslations, setRequestLocale } from "next-intl/server";
import { Heading, boldTag } from "@/components/heading";
import { liveEngineEnabled } from "@/lib/live-engine/config";
import { NewCompanyFlow } from "./new-company-flow";
import { getAppContext } from "@/lib/context";
import { getFxRate } from "@/lib/pricing";
import { captureBilling } from "@/lib/billing";
import { formatMoney } from "@/lib/format";

export default async function NewCompanyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("companies");
  const ctx = await getAppContext();
  const billing = await captureBilling(ctx.workspace.id, ctx.workspace.currency_code, await getFxRate(ctx.supabase, ctx.workspace.currency_code), t, (v) => formatMoney(v, ctx.workspace.currency_code, locale));

  return (
    <div className="mx-auto max-w-5xl">
      <Heading as="h1" className="text-3xl sm:text-4xl">
        {t.rich("title", boldTag)}
      </Heading>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink-muted">{t("subtitle")}</p>
      <div className="mt-6">
        <NewCompanyFlow liveEngine={liveEngineEnabled()} billing={billing} />
      </div>
    </div>
  );
}

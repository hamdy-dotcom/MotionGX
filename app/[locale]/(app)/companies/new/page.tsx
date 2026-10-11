import { getTranslations, setRequestLocale } from "next-intl/server";
import { Heading, boldTag } from "@/components/heading";
import { NewCompanyFlow } from "./new-company-flow";

export default async function NewCompanyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("companies");

  return (
    <div className="mx-auto max-w-5xl">
      <Heading as="h1" className="text-3xl sm:text-4xl">
        {t.rich("title", boldTag)}
      </Heading>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink-muted">{t("subtitle")}</p>
      <div className="mt-6">
        <NewCompanyFlow />
      </div>
    </div>
  );
}

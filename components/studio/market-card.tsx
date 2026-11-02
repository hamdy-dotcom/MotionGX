"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SearchSelect } from "@/components/market-pickers";
import { COUNTRIES } from "@/lib/market/countries";
import { INDUSTRIES, INDUSTRY_LABEL } from "@/lib/market/industries";
import { updateCompanyMarket } from "@/app/[locale]/(app)/companies/actions";

/** the brand's industry and countries, seen and edited on its page: its seasons, notices and trends follow them */
export function MarketCard({ companyId, industry: i0, countries: c0 }: { companyId: string; industry: string | null; countries: string[] }) {
  const t = useTranslations("market"), ar = useLocale() === "ar";
  const [industry, setIndustry] = useState(i0);
  const [countries, setCountries] = useState(c0);
  const [saved, setSaved] = useState<boolean | null>(null);
  const [saving, start] = useTransition();
  const complete = Boolean(industry) && countries.length > 0;
  const changed = industry !== i0 || countries.join() !== c0.join();
  return (
    <div>
      {!i0 || !c0.length ? <p role="alert" className="mb-3 text-sm text-warning-ink">{t("required")}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="s-label">{t("industry")} *</p>
          <SearchSelect label={t("industry")} options={INDUSTRIES.map((x) => ({ value: x, label: INDUSTRY_LABEL[x][ar ? "ar" : "en"] }))} value={industry ? [industry] : []} onChange={(v) => { setIndustry(v[0] ?? null); setSaved(null); }} placeholder={t("industryPlaceholder")} empty={t("noMatch")} />
        </div>
        <div>
          <p className="s-label">{t("countries")} *</p>
          <SearchSelect multiple label={t("countries")} options={COUNTRIES.map((c) => ({ value: c.code, label: ar ? c.ar : c.en, hint: c.code, group: t(`group_${c.group}`) }))} value={countries} onChange={(v) => { setCountries(v); setSaved(null); }} placeholder={t("countriesPlaceholder")} empty={t("noMatch")} />
        </div>
      </div>
      <p className="mt-2 text-xs text-ink-muted">{t("countriesHint")}</p>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" className="s-btn lit" disabled={!complete || !changed || saving} onClick={() => start(async () => setSaved((await updateCompanyMarket(companyId, industry, countries)).ok))}>{t("save")}</button>
        {saved === true ? <span className="text-sm text-ink-muted">{t("saved")}</span> : saved === false ? <span role="alert" className="text-sm text-danger-ink">{t("saveFailed")}</span> : null}
      </div>
    </div>
  );
}

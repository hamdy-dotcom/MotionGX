"use client";

import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { COUNTRIES } from "@/lib/market/countries";
import { INDUSTRIES, INDUSTRY_LABEL } from "@/lib/market/industries";
import { updateCompanyMarket } from "@/app/[locale]/(app)/companies/actions";

const norm = (s: string) => s.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");

/** the brand's market on its page, in its own colours: seen at a glance, edited in place. Its seasons, notifications and
 *  trends follow what is chosen here; `next` shows the coming ones so that is plain to see. */
export function MarketCard({ companyId, industry: i0, countries: c0, next, onBrand }: { companyId: string; industry: string | null; countries: string[]; next: { name: string; days: number }[]; onBrand: string }) {
  const t = useTranslations("market"), ar = useLocale() === "ar";
  const missing = !i0 || !c0.length;
  const [editing, setEditing] = useState(missing);
  const [industry, setIndustry] = useState(i0);
  const [countries, setCountries] = useState(c0);
  const [q, setQ] = useState("");
  const [failed, setFailed] = useState(false);
  const [saving, start] = useTransition();
  const label = (x: string) => INDUSTRY_LABEL[x as keyof typeof INDUSTRY_LABEL]?.[ar ? "ar" : "en"] ?? x;
  const name = (code: string) => { const c = COUNTRIES.find((x) => x.code === code); return c ? (ar ? c.ar : c.en) : code; };
  const shown = useMemo(() => { const n = norm(q.trim()); return INDUSTRIES.filter((x) => !n || norm(`${INDUSTRY_LABEL[x].ar} ${INDUSTRY_LABEL[x].en}`).includes(n)); }, [q]);
  const toggle = (code: string) => setCountries((p) => (p.includes(code) ? p.filter((c) => c !== code) : [...p, code]));
  const complete = Boolean(industry) && countries.length > 0;
  const save = () => start(async () => { const { ok } = await updateCompanyMarket(companyId, industry, countries); setFailed(!ok); if (ok) setEditing(false); });
  const cancel = () => { setIndustry(i0); setCountries(c0); setQ(""); setFailed(false); setEditing(false); };

  if (!editing) {
    return (
      <div className="s-mk" style={{ color: onBrand }}>
        <div className="s-mk-cell">
          <p className="s-mk-k">{t("industry")}</p>
          <p className="s-mk-v" dir="auto">{label(i0 ?? "")}</p>
        </div>
        <div className="s-mk-cell">
          <p className="s-mk-k">{t("countries")}</p>
          <div className="s-mk-tags">{c0.map((c) => <span key={c} dir="auto">{name(c)}</span>)}</div>
        </div>
        <div className="s-mk-cell">
          <p className="s-mk-k">{t("comingUp")}</p>
          {next.length ? <ul className="s-mk-next">{next.map((n) => <li key={n.name}><span dir="auto">{n.name}</span><b>{n.days ? t("inDays", { days: n.days }) : t("now")}</b></li>)}</ul> : <p className="s-mk-none">{t("nothingSoon")}</p>}
        </div>
        <button type="button" className="s-mk-edit" onClick={() => setEditing(true)}>{t("edit")}</button>
      </div>
    );
  }

  return (
    <div className="s-mk-form" style={{ ["--s-on-brand" as string]: onBrand }}>
      {missing ? <p role="alert" className="s-mk-warn">{t("required")}</p> : null}
      <div className="s-mk-grid">
        <section>
          <p className="s-label">{t("industry")} *</p>
          <input className="s-mk-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("industryPlaceholder")} aria-label={t("industry")} />
          <div className="s-mk-pills tall">
            {shown.map((x) => <button key={x} type="button" aria-pressed={industry === x} onClick={() => setIndustry(x)}>{INDUSTRY_LABEL[x][ar ? "ar" : "en"]}</button>)}
            {shown.length ? null : <p className="s-mk-none">{t("noMatch")}</p>}
          </div>
        </section>
        <section>
          <p className="s-label">{t("countries")} *</p>
          {(["gcc", "arab"] as const).map((g) => (
            <div key={g} className="s-mk-group">
              <small>{t(`group_${g}`)}</small>
              <div className="s-mk-pills">{COUNTRIES.filter((c) => c.group === g).map((c) => <button key={c.code} type="button" aria-pressed={countries.includes(c.code)} onClick={() => toggle(c.code)}>{ar ? c.ar : c.en}</button>)}</div>
            </div>
          ))}
        </section>
      </div>
      <div className="s-mk-foot">
        <p>{t("countriesHint")}</p>
        {failed ? <span role="alert">{t("saveFailed")}</span> : null}
        {missing ? null : <button type="button" className="s-btn ghost" disabled={saving} onClick={cancel}>{t("cancel")}</button>}
        <button type="button" className="s-btn lit" disabled={!complete || saving} onClick={save}>{t("save")}</button>
      </div>
    </div>
  );
}

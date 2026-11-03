"use client";

import { useTranslations } from "next-intl";
import { SpinnerIcon } from "@/components/icons";
import { iconSvg, type BrandLanguage, type Direction } from "@/lib/brand-studio/types";
import { SiteFrame as Site } from "@/components/studio/created-brand";

/** what a preview has so far: its page and photo arrive after the direction */
export type Extra = { html?: string; photo?: string };

const Waiting = ({ className = "", label }: { className?: string; label: string }) => <div className={`flex items-center justify-center gap-2 rounded-2xl bg-field text-sm text-ink-muted ${className}`}><SpinnerIcon className="size-4" />{label}</div>;

/** a preview: a page designed for this direction and a photo of it in the world */
export function Preview({ d, extra, language, onChoose, label }: { d: Direction; extra?: Extra; language: BrandLanguage; onChoose: () => void; label: string }) {
  const t = useTranslations("companies.studio"), P = d.palette, name = language === "ar" && d.name_ar ? d.name_ar : d.name;
  return (
    <div className="rounded-panel bg-white p-3 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-3">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" width={44} height={44} src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSvg(d.icon, { P: P.primary, A: P.accent, I: P.ink }, 44))}`} />
          <span className="text-2xl font-bold text-navy" dir="auto">{name}</span>
          <span className="flex gap-1">{[P.primary, P.accent, P.ink, P.background].map((c) => <i key={c} className="block size-4 rounded-full ring-1 ring-black/10" style={{ background: c }} />)}</span>
        </div>
        <button type="button" onClick={onChoose} className="btn btn-primary">{label}</button>
      </div>
      <p className="px-2 pb-3 text-sm text-ink-muted" dir="auto">{d.concept}</p>
      <div className="grid items-stretch gap-2 md:grid-cols-5">
        <div className="overflow-hidden rounded-2xl ring-1 ring-black/5 md:col-span-3">{extra?.html ? <Site html={extra.html} /> : <Waiting className="h-72" label={t("designingSite")} />}</div>
        <div className="overflow-hidden rounded-2xl ring-1 ring-black/5 md:col-span-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {extra?.photo ? <img src={extra.photo} alt="" className="size-full object-cover" /> : <Waiting className="h-72" label={t("shootingPhoto")} />}
        </div>
      </div>
    </div>
  );
}

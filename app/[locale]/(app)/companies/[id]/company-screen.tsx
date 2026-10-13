"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { BrandDraft } from "@/lib/brand/types";
import { ArrowIcon, SparkIcon, SpinnerIcon } from "@/components/icons";
import { BrandEditor } from "../brand-editor";
import { ExtractSteps, SnapshotLink, STEP_LABEL } from "../extract-steps";
import { useExtraction } from "../use-extraction";

/** Company screen: edit brand + facts; "أعد القراءة" re-scrapes the site and refills the form. */
export function CompanyScreen({ companyId, brand: initial, hasSnapshot = false }: { companyId: string; brand: BrandDraft; hasSnapshot?: boolean }) {
  const t = useTranslations("companies");
  const td = useTranslations("dashboard");
  const [brand, setBrand] = useState(initial);
  const [raw, setRaw] = useState<Record<string, unknown> | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const x = useExtraction();

  async function reread() {
    if (!brand.websiteUrl) return;
    const result = await x.run(brand.websiteUrl, true);
    if (!result) return;
    // Keep what the user already set when a step failed.
    const next = result.brand;
    setBrand({
      ...next,
      name: next.name || brand.name,
      logoUrl: next.logoUrl ?? brand.logoUrl,
      colors: next.colors.length ? next.colors : brand.colors,
      tone: next.tone || brand.tone,
      tagline: next.tagline || brand.tagline,
      facts: x.steps.facts === "failed" ? brand.facts : next.facts,
    });
    setRaw(result.raw);
    setEditorKey((k) => k + 1);
  }

  return (
    <div className="space-y-6">
      <div className="panel flex flex-wrap items-center gap-3">
        <p className="flex-1 text-sm text-ink-muted" dir="ltr">
          {brand.websiteUrl.replace(/^https?:\/\//, "")}
        </p>
        <Link href={`/videos/new?company=${companyId}`} className="btn btn-white">
          {td("newVideo")}
          <ArrowIcon className="size-4" />
        </Link>
        {brand.websiteUrl && !x.running && (x.started ? x.steps.snapshot === "done" : hasSnapshot) ? <SnapshotLink websiteUrl={brand.websiteUrl} /> : null}
        <button type="button" onClick={() => void reread()} disabled={x.running || !brand.websiteUrl} className="btn btn-soft">
          {x.running ? <SpinnerIcon className="size-4" /> : <SparkIcon className="size-4" />}
          {x.running ? t("extracting") : t("reread")}
        </button>
        {x.started ? (
          <div className="w-full">
            <ExtractSteps steps={x.steps} running={x.running} errorCode={x.errorCode} />
            {!x.running && x.failed.length ? (
              <p className="mt-2 text-sm text-warning-ink">{t("fillManually", { steps: x.failed.map((s) => t(STEP_LABEL[s])).join("، ") })}</p>
            ) : null}
          </div>
        ) : null}
      </div>
      {!x.running ? <BrandEditor key={editorKey} brand={brand} raw={raw} companyId={companyId} /> : null}
    </div>
  );
}

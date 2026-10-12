"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import type { BrandDraft } from "@/lib/brand/types";
import { ArrowIcon, SparkIcon, SpinnerIcon } from "@/components/icons";
import { BrandEditor } from "../brand-editor";
import { ExtractSteps, STEP_LABEL } from "../extract-steps";
import { useExtraction } from "../use-extraction";

export function NewCompanyFlow() {
  const t = useTranslations("companies");
  const [url, setUrl] = useState("");
  const [brand, setBrand] = useState<BrandDraft | null>(null);
  const [raw, setRaw] = useState<Record<string, unknown> | null>(null);
  const [cached, setCached] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const x = useExtraction();

  async function extract(refresh: boolean) {
    const result = await x.run(url, refresh);
    if (!result) return;
    setBrand(result.brand);
    setRaw(result.raw);
    setCached(result.cached);
    setEditorKey((k) => k + 1);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void extract(false);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="panel">
        <label htmlFor="website" className="label mb-2 block">
          {t("urlLabel")}
        </label>
        <div className="flex flex-col gap-2 rounded-[28px] bg-white p-1.5 sm:flex-row sm:rounded-full">
          <input
            id="website"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            dir="ltr"
            inputMode="url"
            placeholder={t("urlPlaceholder")}
            aria-invalid={x.invalidUrl || undefined}
            className="field bg-transparent text-start"
          />
          <button type="submit" disabled={x.running} className="btn btn-primary">
            {x.running ? <SpinnerIcon className="size-4" /> : null}
            {x.running ? t("extracting") : t("extract")}
            {!x.running ? <ArrowIcon className="size-4" /> : null}
          </button>
        </div>
        {x.invalidUrl ? (
          <p role="alert" className="mt-2 text-sm text-danger-ink">
            {t("invalidUrl")}
          </p>
        ) : null}
        {x.started ? <ExtractSteps steps={x.steps} running={x.running} errorCode={x.errorCode} /> : null}
      </form>

      {brand && !x.running ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            {x.failed.length ? (
              <p className="flex-1 text-sm text-warning-ink">{t("fillManually", { steps: x.failed.map((s) => t(STEP_LABEL[s])).join("، ") })}</p>
            ) : (
              <p className="flex-1 text-sm text-ink-muted">{cached ? t("cachedNote") : t("reviewNote")}</p>
            )}
            <button type="button" onClick={() => void extract(true)} className="btn btn-soft">
              <SparkIcon className="size-4" />
              {t("reread")}
            </button>
          </div>
          <BrandEditor key={editorKey} brand={brand} raw={raw} />
        </>
      ) : null}
    </div>
  );
}

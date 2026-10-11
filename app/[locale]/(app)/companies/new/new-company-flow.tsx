"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { saveCompany, type SaveCompanyState } from "./actions";
import { EXTRACT_STEPS, emptyDraft, type BrandDraft, type ExtractEvent, type ExtractStep } from "@/lib/brand/types";
import type { AiErrorCode } from "@/lib/ai/errors";
import { DIALECTS, type BrandColor, type Dialect } from "@/lib/types";
import { FilmStrip } from "@/components/film-strip";
import { Heading, boldTag } from "@/components/heading";
import { CompanyMark } from "@/components/company-mark";
import { ArrowIcon, CheckIcon, PlusIcon, SparkIcon, SpinnerIcon, UploadIcon } from "@/components/icons";

type StepState = "pending" | "done" | "failed";

const STEP_LABEL: Record<ExtractStep, "stepLogo" | "stepColors" | "stepFonts" | "stepTone"> = {
  logo: "stepLogo",
  colors: "stepColors",
  fonts: "stepFonts",
  tone: "stepTone",
};

const idleSteps = (): Record<ExtractStep, StepState> => ({ logo: "pending", colors: "pending", fonts: "pending", tone: "pending" });

function normalize(url: string) {
  const u = url.trim();
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

export function NewCompanyFlow() {
  const t = useTranslations("companies");
  const te = useTranslations("aiErrors");
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<"input" | "extracting" | "preview">("input");
  const [steps, setSteps] = useState(idleSteps);
  const [brand, setBrand] = useState<BrandDraft | null>(null);
  const [raw, setRaw] = useState<Record<string, unknown> | null>(null);
  const [cached, setCached] = useState(false);
  const [errorCode, setErrorCode] = useState<AiErrorCode | null>(null);
  const [urlError, setUrlError] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  async function extract(refresh: boolean) {
    setUrlError(false);
    setErrorCode(null);
    setSteps(idleSteps());
    setPhase("extracting");
    const target = normalize(url);

    let result: Extract<ExtractEvent, { type: "result" }> | null = null;
    try {
      const res = await fetch("/api/brand/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target, refresh }),
      });
      if (res.status === 400) {
        setUrlError(true);
        setPhase(brand ? "preview" : "input");
        return;
      }
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as ExtractEvent;
          if (event.type === "step") setSteps((s) => ({ ...s, [event.step]: event.status }));
          else if (event.type === "error") setErrorCode(event.code);
          else result = event;
        }
      }
    } catch {
      setErrorCode("ai_failed");
    }

    // Whatever happened, open the editor so the user can finish by hand.
    setBrand(result?.brand ?? emptyDraft(target));
    setRaw(result?.raw ?? null);
    setCached(result?.cached ?? false);
    if (!result) setSteps({ logo: "failed", colors: "failed", fonts: "failed", tone: "failed" });
    setEditorKey((k) => k + 1);
    setPhase("preview");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void extract(false);
  }

  const failed = EXTRACT_STEPS.filter((s) => steps[s] === "failed");

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
            aria-invalid={urlError || undefined}
            className="field bg-transparent text-start"
          />
          <button type="submit" disabled={phase === "extracting"} className="btn btn-primary">
            {phase === "extracting" ? <SpinnerIcon className="size-4" /> : null}
            {phase === "extracting" ? t("extracting") : t("extract")}
            {phase !== "extracting" ? <ArrowIcon className="size-4" /> : null}
          </button>
        </div>
        {urlError ? (
          <p role="alert" className="mt-2 text-sm text-danger-ink">
            {t("invalidUrl")}
          </p>
        ) : null}

        {phase !== "input" ? (
          <ol className="mt-4 flex flex-wrap gap-2" aria-live="polite">
            {EXTRACT_STEPS.map((step) => {
              const state = steps[step];
              const active = state === "pending" && phase === "extracting";
              return (
                <li
                  key={step}
                  data-step={step}
                  data-state={state}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm ${
                    state === "done"
                      ? "bg-success-bg text-success-ink"
                      : state === "failed"
                        ? "bg-warning-bg text-warning-ink"
                        : active
                          ? "bg-white text-primary-dark"
                          : "bg-white/60 text-ink-muted"
                  }`}
                >
                  {state === "done" ? (
                    <CheckIcon className="size-4" />
                  ) : state === "failed" ? (
                    <span aria-hidden="true" className="flex size-4 items-center justify-center font-bold">
                      !
                    </span>
                  ) : active ? (
                    <SpinnerIcon className="size-4" />
                  ) : (
                    <span className="size-4" />
                  )}
                  {t(STEP_LABEL[step])}
                  {state === "failed" ? <span className="sr-only">{t("stepFailed")}</span> : null}
                </li>
              );
            })}
          </ol>
        ) : null}

        {errorCode ? (
          <p role="alert" className="mt-3 rounded-2xl bg-warning-bg px-4 py-2 text-sm text-warning-ink">
            {te(errorCode)}
          </p>
        ) : null}
      </form>

      {phase === "preview" && brand ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            {failed.length ? (
              <p className="flex-1 text-sm text-warning-ink">
                {t("fillManually", { steps: failed.map((s) => t(STEP_LABEL[s])).join("، ") })}
              </p>
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

function BrandEditor({ brand, raw }: { brand: BrandDraft; raw: Record<string, unknown> | null }) {
  const t = useTranslations("companies");
  const td = useTranslations("dialects");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState<SaveCompanyState, FormData>(saveCompany, {});
  const [name, setName] = useState(brand.name);
  const [colors, setColors] = useState<BrandColor[]>(brand.colors);
  const [dialect, setDialect] = useState<Dialect>(brand.defaultDialect);
  const [fontArabic, setFontArabic] = useState(brand.fonts.arabic);
  const [fontLatin, setFontLatin] = useState(brand.fonts.latin);
  const [tagline, setTagline] = useState(brand.tagline);
  const [tone, setTone] = useState(brand.tone);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const logoPreview = uploadPreview ?? brand.logoUrl;
  const ink = colors.find((c) => c.role === "ink")?.hex ?? colors[1]?.hex ?? "#10184A";
  const primary = colors.find((c) => c.role === "primary")?.hex ?? colors[0]?.hex ?? "#5558E3";

  useEffect(() => () => void (uploadPreview && URL.revokeObjectURL(uploadPreview)), [uploadPreview]);

  function setColor(i: number, hex: string) {
    setColors((cs) => cs.map((c, j) => (j === i ? { ...c, hex } : c)));
  }

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <input type="hidden" name="website_url" value={brand.websiteUrl} />
      <input type="hidden" name="colors" value={JSON.stringify(colors)} />
      <input type="hidden" name="default_dialect" value={dialect} />
      <input type="hidden" name="logo_url" value={uploadPreview ? "" : (brand.logoUrl ?? "")} />
      <input type="hidden" name="raw" value={raw ? JSON.stringify(raw) : ""} />

      {/* Live brand preview inside a film strip */}
      <div>
        <Heading as="h2" className="mb-3 text-xl">
          {t.rich("previewTitle", boldTag)}
        </Heading>
        <FilmStrip>
          <div className="p-6 sm:p-8" style={{ backgroundColor: ink }}>
            <div className="flex items-center gap-3">
              <CompanyMark name={name || "?"} logoUrl={logoPreview} colors={colors} size="size-14" />
              <div className="min-w-0">
                <p className="truncate text-xl font-bold text-white" style={{ fontFamily: fontArabic || undefined }}>
                  {name}
                </p>
                <p className="truncate text-sm text-white/70" dir="ltr" style={{ fontFamily: fontLatin || undefined }}>
                  {brand.websiteUrl.replace(/^https?:\/\//, "")}
                </p>
              </div>
            </div>
            <p className="mt-8 text-3xl leading-snug font-bold sm:text-4xl" style={{ color: primary, fontFamily: fontArabic || undefined }}>
              {tagline}
            </p>
            <div className="mt-6 flex gap-2">
              {colors.map((c, i) => (
                <span key={i} className="h-3 flex-1 rounded-full" style={{ backgroundColor: c.hex }} />
              ))}
            </div>
            {tone ? (
              <p className="mt-4 text-xs text-white/60">
                {t("tone")}: {tone}
              </p>
            ) : null}
          </div>
        </FilmStrip>
      </div>

      {/* Editable fields */}
      <div className="panel space-y-5">
        <Field label={t("name")} htmlFor="name">
          <input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} required className="field bg-white" />
        </Field>

        <Field label={t("logo")} htmlFor="logo">
          <div className="flex items-center gap-3">
            <CompanyMark name={name || "?"} logoUrl={logoPreview} colors={colors} />
            <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-white">
              <UploadIcon className="size-4" />
              {t("changeLogo")}
            </button>
            <input
              ref={fileRef}
              id="logo"
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setUploadPreview(file ? URL.createObjectURL(file) : null);
              }}
            />
          </div>
        </Field>

        <Field label={t("colors")}>
          <div className="flex flex-wrap gap-2">
            {colors.map((c, i) => (
              <label key={i} className="inline-flex min-h-pill items-center gap-2 rounded-full bg-white p-1.5 pe-3">
                <input
                  type="color"
                  value={c.hex}
                  onChange={(e) => setColor(i, e.target.value.toUpperCase())}
                  aria-label={t("colorLabel", { n: i + 1 })}
                  className="size-8 cursor-pointer rounded-full border-0 bg-transparent p-0 [&::-moz-color-swatch]:rounded-full [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
                />
                <span className="font-mono text-xs text-ink-2" dir="ltr">
                  {c.hex}
                </span>
                {c.role ? <span className="text-xs text-ink-muted">{t(`role_${c.role}` as "role_primary")}</span> : null}
              </label>
            ))}
            {colors.length < 6 ? (
              <button
                type="button"
                onClick={() => setColors((cs) => [...cs, { hex: "#A7A9F3" }])}
                aria-label={t("colorLabel", { n: colors.length + 1 })}
                className="inline-flex size-11 items-center justify-center rounded-full bg-white text-primary hover:bg-primary-light"
              >
                <PlusIcon className="size-4" />
              </button>
            ) : null}
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("arabicFont")} htmlFor="font_arabic">
            <input id="font_arabic" name="font_arabic" value={fontArabic} onChange={(e) => setFontArabic(e.target.value)} className="field bg-white" />
          </Field>
          <Field label={t("latinFont")} htmlFor="font_latin">
            <input id="font_latin" name="font_latin" value={fontLatin} onChange={(e) => setFontLatin(e.target.value)} dir="ltr" className="field bg-white text-start" />
          </Field>
        </div>

        <Field label={t("defaultDialect")}>
          <div role="radiogroup" aria-label={t("defaultDialect")} className="flex flex-wrap gap-2">
            {DIALECTS.map((d) => (
              <button key={d} type="button" role="radio" aria-checked={dialect === d} onClick={() => setDialect(d)} className="chip chip-white">
                {td(d)}
              </button>
            ))}
          </div>
        </Field>

        <Field label={t("tagline")} htmlFor="tagline">
          <input id="tagline" name="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} className="field bg-white" />
        </Field>

        <Field label={t("tone")} htmlFor="tone">
          <input id="tone" name="tone" value={tone} onChange={(e) => setTone(e.target.value)} placeholder={t("tonePlaceholder")} className="field bg-white" />
        </Field>

        <div className="divider" />

        {state.error ? (
          <p role="alert" className="text-sm text-danger-ink">
            {state.error === "nameRequired" ? t("nameRequired") : tc("error")}
          </p>
        ) : null}

        <button type="submit" disabled={pending} className="btn btn-primary w-full">
          {pending ? <SpinnerIcon className="size-4" /> : <CheckIcon className="size-4" />}
          {pending ? tc("saving") : t("confirm")}
        </button>
      </div>
    </form>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div>
      {htmlFor ? (
        <label htmlFor={htmlFor} className="label mb-2 block">
          {label}
        </label>
      ) : (
        <p className="label mb-2">{label}</p>
      )}
      {children}
    </div>
  );
}

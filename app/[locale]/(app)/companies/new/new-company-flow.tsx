"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { extractBrandAction, saveCompany, type SaveCompanyState } from "./actions";
import type { ExtractedBrand } from "@/lib/brand/extract";
import { DIALECTS, type BrandColor, type Dialect } from "@/lib/types";
import { FilmStrip } from "@/components/film-strip";
import { Heading, boldTag } from "@/components/heading";
import { CompanyMark } from "@/components/company-mark";
import { ArrowIcon, CheckIcon, PlusIcon, SpinnerIcon, UploadIcon } from "@/components/icons";

const STEPS = ["stepLogo", "stepColors", "stepFonts", "stepTone"] as const;

export function NewCompanyFlow() {
  const t = useTranslations("companies");
  const tc = useTranslations("common");
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<"input" | "extracting" | "preview">("input");
  const [stepsDone, setStepsDone] = useState(0);
  const [brand, setBrand] = useState<ExtractedBrand | null>(null);
  const [urlError, setUrlError] = useState(false);

  useEffect(() => {
    if (phase !== "extracting") return;
    const id = setInterval(() => setStepsDone((n) => Math.min(n + 1, STEPS.length - 1)), 350);
    return () => clearInterval(id);
  }, [phase]);

  async function onExtract(e: FormEvent) {
    e.preventDefault();
    setUrlError(false);
    setStepsDone(0);
    setPhase("extracting");
    const result = await extractBrandAction(url);
    if (!result.ok) {
      setUrlError(true);
      setPhase("input");
      return;
    }
    setStepsDone(STEPS.length);
    setBrand(result.brand);
    setTimeout(() => setPhase("preview"), 300);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onExtract} className="panel">
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
            {STEPS.map((step, i) => {
              const done = i < stepsDone;
              const active = i === stepsDone && phase === "extracting";
              return (
                <li
                  key={step}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm ${
                    done ? "bg-success-bg text-success-ink" : active ? "bg-white text-primary-dark" : "bg-white/60 text-ink-muted"
                  }`}
                >
                  {done ? <CheckIcon className="size-4" /> : active ? <SpinnerIcon className="size-4" /> : <span className="size-4" />}
                  {t(step)}
                </li>
              );
            })}
          </ol>
        ) : null}
      </form>

      {phase === "preview" && brand ? <BrandEditor key={brand.websiteUrl} brand={brand} savingLabel={tc("saving")} /> : null}
    </div>
  );
}

function BrandEditor({ brand, savingLabel }: { brand: ExtractedBrand; savingLabel: string }) {
  const t = useTranslations("companies");
  const td = useTranslations("dialects");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState<SaveCompanyState, FormData>(saveCompany, {});
  const [name, setName] = useState(brand.name);
  const [colors, setColors] = useState<BrandColor[]>(brand.colors);
  const [dialect, setDialect] = useState<Dialect>(brand.defaultDialect);
  const [fontArabic, setFontArabic] = useState(brand.fonts.arabic ?? "");
  const [fontLatin, setFontLatin] = useState(brand.fonts.latin ?? "");
  const [tagline, setTagline] = useState(brand.tagline);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => void (logoPreview && URL.revokeObjectURL(logoPreview)), [logoPreview]);

  function setColor(i: number, hex: string) {
    setColors((cs) => cs.map((c, j) => (j === i ? { ...c, hex } : c)));
  }

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <input type="hidden" name="website_url" value={brand.websiteUrl} />
      <input type="hidden" name="colors" value={JSON.stringify(colors)} />
      <input type="hidden" name="default_dialect" value={dialect} />
      <input type="hidden" name="tone" value={brand.tone} />

      {/* Live brand preview inside a film strip */}
      <div>
        <Heading as="h2" className="mb-3 text-xl">
          {t.rich("previewTitle", boldTag)}
        </Heading>
        <FilmStrip>
          <div className="p-6 sm:p-8" style={{ backgroundColor: colors[1]?.hex ?? "#10184A" }}>
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
            <p className="mt-8 text-3xl font-bold leading-snug sm:text-4xl" style={{ color: colors[0]?.hex, fontFamily: fontArabic || undefined }}>
              {tagline}
            </p>
            <div className="mt-6 flex gap-2">
              {colors.map((c, i) => (
                <span key={i} className="h-3 flex-1 rounded-full" style={{ backgroundColor: c.hex }} />
              ))}
            </div>
            <p className="mt-4 text-xs text-white/60">
              {t("tone")}: {brand.tone}
            </p>
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
                setLogoPreview(file ? URL.createObjectURL(file) : null);
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
              <button key={d} type="button" role="radio" aria-checked={dialect === d} onClick={() => setDialect(d)} className="chip bg-white">
                {td(d)}
              </button>
            ))}
          </div>
        </Field>

        <Field label={t("tagline")} htmlFor="tagline">
          <input id="tagline" name="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} className="field bg-white" />
        </Field>

        <div className="divider" />

        {state.error ? (
          <p role="alert" className="text-sm text-danger-ink">
            {state.error === "nameRequired" ? t("nameRequired") : tc("error")}
          </p>
        ) : null}

        <button type="submit" disabled={pending} className="btn btn-primary w-full">
          {pending ? <SpinnerIcon className="size-4" /> : <CheckIcon className="size-4" />}
          {pending ? savingLabel : t("confirm")}
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

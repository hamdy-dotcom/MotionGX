"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { saveCompany, updateCompany, type SaveCompanyState } from "./actions";
import type { BrandDraft, BrandFacts } from "@/lib/brand/types";
import { DIALECTS, type BrandColor, type Dialect } from "@/lib/types";
import { FilmStrip } from "@/components/film-strip";
import { Heading, boldTag } from "@/components/heading";
import { CompanyMark } from "@/components/company-mark";
import { CheckIcon, PlusIcon, SpinnerIcon, UploadIcon } from "@/components/icons";

const lines = (value: string) => value.split("\n").map((l) => l.trim()).filter(Boolean);

/** Brand + facts form, shared by "add company" (create) and the company screen (edit). */
export function BrandEditor({
  brand,
  raw,
  companyId,
}: {
  brand: BrandDraft;
  raw: Record<string, unknown> | null;
  companyId?: string;
}) {
  const t = useTranslations("companies");
  const td = useTranslations("dialects");
  const tc = useTranslations("common");
  const action = companyId ? updateCompany.bind(null, companyId) : saveCompany;
  const [state, formAction, pending] = useActionState<SaveCompanyState, FormData>(action, {});
  const [name, setName] = useState(brand.name);
  const [colors, setColors] = useState<BrandColor[]>(brand.colors);
  const [dialect, setDialect] = useState<Dialect>(brand.defaultDialect);
  const [fontArabic, setFontArabic] = useState(brand.fonts.arabic);
  const [fontLatin, setFontLatin] = useState(brand.fonts.latin);
  const [tagline, setTagline] = useState(brand.tagline);
  const [tone, setTone] = useState(brand.tone);
  const [facts, setFacts] = useState<BrandFacts>(brand.facts);
  const [featuresText, setFeaturesText] = useState(brand.facts.key_features.join("\n"));
  const [offersText, setOffersText] = useState(brand.facts.offers.join("\n"));
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const logoPreview = uploadPreview ?? brand.logoUrl;
  const ink = colors.find((c) => c.role === "ink")?.hex ?? colors[1]?.hex ?? "#10184A";
  const primary = colors.find((c) => c.role === "primary")?.hex ?? colors[0]?.hex ?? "#5558E3";
  const factsValue: BrandFacts = { ...facts, key_features: lines(featuresText), offers: lines(offersText) };

  useEffect(() => () => void (uploadPreview && URL.revokeObjectURL(uploadPreview)), [uploadPreview]);

  function setColor(i: number, hex: string) {
    setColors((cs) => cs.map((c, j) => (j === i ? { ...c, hex } : c)));
  }

  function setNumber(i: number, patch: Partial<BrandFacts["numbers"][number]>) {
    setFacts((f) => ({ ...f, numbers: f.numbers.map((n, j) => (j === i ? { ...n, ...patch } : n)) }));
  }

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <input type="hidden" name="website_url" value={brand.websiteUrl} />
      <input type="hidden" name="colors" value={JSON.stringify(colors)} />
      <input type="hidden" name="default_dialect" value={dialect} />
      <input type="hidden" name="logo_url" value={uploadPreview ? "" : (brand.logoUrl ?? "")} />
      <input type="hidden" name="raw" value={raw ? JSON.stringify(raw) : ""} />
      <input type="hidden" name="facts" value={JSON.stringify(factsValue)} />

      <div className="space-y-6">
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

        {/* Brand facts — what scripts are allowed to say */}
        <section className="panel space-y-4">
          <div>
            <Heading as="h3" className="text-lg">
              {t.rich("factsTitle", boldTag)}
            </Heading>
            <p className="mt-1 text-sm text-ink-muted">{t("factsHint")}</p>
          </div>
          <Field label={t("factWhat")} htmlFor="fact_what">
            <textarea id="fact_what" rows={2} value={facts.what_it_does} onChange={(e) => setFacts({ ...facts, what_it_does: e.target.value })} className="w-full resize-y rounded-[20px] bg-white p-3 text-sm outline-none focus:shadow-[inset_0_0_0_1.5px_var(--primary)]" />
          </Field>
          <Field label={t("factAudience")} htmlFor="fact_audience">
            <input id="fact_audience" value={facts.audience} onChange={(e) => setFacts({ ...facts, audience: e.target.value })} className="field bg-white" />
          </Field>
          <Field label={t("factFeatures")} htmlFor="fact_features">
            <textarea id="fact_features" rows={4} value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} placeholder={t("onePerLine")} className="w-full resize-y rounded-[20px] bg-white p-3 text-sm outline-none focus:shadow-[inset_0_0_0_1.5px_var(--primary)]" />
          </Field>
          <Field label={t("factNumbers")}>
            <div className="space-y-2">
              {facts.numbers.map((n, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 rounded-[20px] bg-white p-2">
                  <input aria-label={t("factPrefix")} value={n.prefix} onChange={(e) => setNumber(i, { prefix: e.target.value })} dir="ltr" className="field w-14 px-3 text-center" />
                  <input aria-label={t("factValue")} type="number" value={Number.isFinite(n.value) ? n.value : ""} onChange={(e) => setNumber(i, { value: Number(e.target.value) })} dir="ltr" className="field w-28 px-3 text-center" />
                  <input aria-label={t("factSuffix")} value={n.suffix} onChange={(e) => setNumber(i, { suffix: e.target.value })} dir="ltr" className="field w-16 px-3 text-center" />
                  <input aria-label={t("factLabel")} value={n.label} onChange={(e) => setNumber(i, { label: e.target.value })} className="field min-w-32 flex-1" />
                  <button type="button" onClick={() => setFacts({ ...facts, numbers: facts.numbers.filter((_, j) => j !== i) })} className="btn btn-soft min-h-10 px-3" aria-label={t("remove")}>
                    ×
                  </button>
                </div>
              ))}
              {facts.numbers.length < 8 ? (
                <button type="button" onClick={() => setFacts({ ...facts, numbers: [...facts.numbers, { value: 0, label: "", prefix: "", suffix: "" }] })} className="btn btn-white">
                  <PlusIcon className="size-4" />
                  {t("addNumber")}
                </button>
              ) : null}
              {facts.numbers.length === 0 ? <p className="text-xs text-ink-muted">{t("noNumbers")}</p> : null}
            </div>
          </Field>
          <Field label={t("factOffers")} htmlFor="fact_offers">
            <textarea id="fact_offers" rows={2} value={offersText} onChange={(e) => setOffersText(e.target.value)} placeholder={t("onePerLine")} className="w-full resize-y rounded-[20px] bg-white p-3 text-sm outline-none focus:shadow-[inset_0_0_0_1.5px_var(--primary)]" />
          </Field>
          <Field label={t("factCta")} htmlFor="fact_cta">
            <input id="fact_cta" value={facts.cta_url} onChange={(e) => setFacts({ ...facts, cta_url: e.target.value })} dir="ltr" className="field bg-white text-start" />
          </Field>
        </section>
      </div>

      {/* Brand fields */}
      <div className="panel h-fit space-y-5">
        <Field label={t("name")} htmlFor="name">
          <input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} required className="field bg-white" />
          {brand.nameCheck?.candidates.length ? (
            <div role="status" className="mt-2 rounded-2xl bg-white p-3 text-sm">
              <p className="font-semibold">{t("nameCheckTitle")}</p>
              <p className="mt-1 text-ink-muted">{t("nameCheckBody")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {brand.nameCheck.candidates.map((c) => (
                  <button key={c} type="button" onClick={() => setName(c)} aria-pressed={name === c} className={`chip ${name === c ? "chip-solid" : "chip-white"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
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
        {state.saved ? (
          <p role="status" className="flex items-center gap-2 rounded-full bg-success-bg px-4 py-2 text-sm text-success-ink">
            <CheckIcon className="size-4" />
            {t("savedChanges")}
          </p>
        ) : null}

        <button type="submit" disabled={pending} className="btn btn-primary w-full">
          {pending ? <SpinnerIcon className="size-4" /> : <CheckIcon className="size-4" />}
          {pending ? tc("saving") : companyId ? t("saveChanges") : t("confirm")}
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

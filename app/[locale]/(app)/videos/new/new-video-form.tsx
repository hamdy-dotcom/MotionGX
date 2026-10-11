"use client";

import { useActionState, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createVideo, type CreateVideoState } from "./actions";
import { billedSeconds, exportCostUsd, toLocal, type Prices } from "@/lib/pricing";
import { formatMoney, formatNumber } from "@/lib/format";
import { formatKey } from "@/lib/video-labels";
import { DIALECTS, FORMATS, GOALS, LENGTHS, PACES, type BrandColor, type Dialect, type Goal, type Pace, type VideoFormat, type VideoLength, type Voice } from "@/lib/types";
import { Heading, boldTag } from "@/components/heading";
import { CompanyMark } from "@/components/company-mark";
import { ArrowIcon, SpinnerIcon } from "@/components/icons";

type CompanyOption = { id: string; name: string; defaultDialect: Dialect; colors: BrandColor[]; logoUrl: string | null };

export function NewVideoForm({
  companies,
  initialCompanyId,
  voices,
  prices,
  fxRate,
  currency,
}: {
  companies: CompanyOption[];
  initialCompanyId: string;
  voices: Voice[];
  prices: Prices;
  fxRate: number;
  currency: string;
}) {
  const t = useTranslations("videos");
  const tc = useTranslations("common");
  const tg = useTranslations("goals");
  const tp = useTranslations("paces");
  const td = useTranslations("dialects");
  const tf = useTranslations("formats");
  const tgen = useTranslations("gender");
  const locale = useLocale();
  const [state, action, pending] = useActionState<CreateVideoState, FormData>(createVideo, {});

  const initialCompany = companies.find((c) => c.id === initialCompanyId) ?? companies[0];
  const [companyId, setCompanyId] = useState(initialCompany.id);
  const [goal, setGoal] = useState<Goal>("sell");
  const [format, setFormat] = useState<VideoFormat>("9:16");
  const [length, setLength] = useState<VideoLength>(30);
  const [pace, setPace] = useState<Pace>("medium");
  const [dialect, setDialect] = useState<Dialect>(initialCompany.defaultDialect);
  const [voiceover, setVoiceover] = useState(false);
  const voicesFor = (d: Dialect) => voices.filter((v) => v.dialect === d);
  const [voiceId, setVoiceId] = useState<string | null>(voicesFor(initialCompany.defaultDialect)[0]?.id ?? null);

  function chooseDialect(d: Dialect) {
    setDialect(d);
    setVoiceId(voicesFor(d)[0]?.id ?? null);
  }

  function chooseCompany(c: CompanyOption) {
    setCompanyId(c.id);
    chooseDialect(c.defaultDialect);
  }

  const costUsd = exportCostUsd(length, voiceover, prices);
  const company = companies.find((c) => c.id === companyId)!;
  const voice = voices.find((v) => v.id === voiceId);
  const money = (usd: number) => formatMoney(toLocal(usd, fxRate), currency, locale);

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
      <input type="hidden" name="company_id" value={companyId} />
      <input type="hidden" name="goal" value={goal} />
      <input type="hidden" name="format" value={format} />
      <input type="hidden" name="length_s" value={length} />
      <input type="hidden" name="pace" value={pace} />
      <input type="hidden" name="dialect" value={dialect} />
      {voiceover ? <input type="hidden" name="voiceover" value="on" /> : null}
      {voiceover && voiceId ? <input type="hidden" name="voice_id" value={voiceId} /> : null}

      <div className="space-y-5">
        <Section label={t("company")}>
          <ChipGroup label={t("company")}>
            {companies.map((c) => (
              <button key={c.id} type="button" role="radio" aria-checked={companyId === c.id} onClick={() => chooseCompany(c)} className="chip ps-1.5">
                <CompanyMark name={c.name} logoUrl={c.logoUrl} colors={c.colors} size="size-8" />
                {c.name}
              </button>
            ))}
          </ChipGroup>
        </Section>

        <Section label={t("brief")} htmlFor="brief">
          <textarea
            id="brief"
            name="brief"
            required
            rows={4}
            placeholder={t("briefPlaceholder")}
            className="w-full resize-y rounded-[22px] bg-white p-4 text-sm leading-relaxed text-navy outline-none placeholder:text-ink-muted/70 focus:shadow-[inset_0_0_0_1.5px_var(--primary)]"
          />
        </Section>

        <Section label={t("goal")}>
          <ChipGroup label={t("goal")}>
            {GOALS.map((g) => (
              <button key={g} type="button" role="radio" aria-checked={goal === g} onClick={() => setGoal(g)} className="chip chip-solid chip-white">
                {tg(g)}
              </button>
            ))}
          </ChipGroup>
        </Section>

        <div className="grid gap-5 md:grid-cols-2">
          <Section label={t("format")}>
            <ChipGroup label={t("format")}>
              {FORMATS.map((f) => (
                <button key={f} type="button" role="radio" aria-checked={format === f} onClick={() => setFormat(f)} className="chip chip-white">
                  <FormatGlyph format={f} />
                  <span dir="ltr">{f}</span>
                  <span className="sr-only">{tf(formatKey(f))}</span>
                </button>
              ))}
            </ChipGroup>
          </Section>

          <Section label={t("length")}>
            <ChipGroup label={t("length")}>
              {LENGTHS.map((l) => (
                <button key={l} type="button" role="radio" aria-checked={length === l} onClick={() => setLength(l)} className="chip chip-white">
                  {tc("seconds", { n: formatNumber(l, locale) })}
                </button>
              ))}
            </ChipGroup>
          </Section>
        </div>

        <Section label={t("pace")}>
          <ChipGroup label={t("pace")}>
            {PACES.map((p) => (
              <button key={p} type="button" role="radio" aria-checked={pace === p} onClick={() => setPace(p)} className="chip chip-white">
                {tp(p)}
              </button>
            ))}
          </ChipGroup>
        </Section>

        <Section label={t("dialect")} hint={t("dialectHint")}>
          <ChipGroup label={t("dialect")}>
            {DIALECTS.map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={dialect === d}
                onClick={() => chooseDialect(d)}
                lang={d === "en" ? "en" : "ar"}
                className="chip chip-white"
              >
                {td(d)}
              </button>
            ))}
          </ChipGroup>
        </Section>

        <div className="panel">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p id="vo-label" className="font-semibold">
                {t("voiceover")}
              </p>
              <p className="text-sm text-ink-muted">{t("voiceoverHint", { price: money(prices.voiceoverMinUsd) })}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={voiceover}
              aria-labelledby="vo-label"
              onClick={() => setVoiceover((v) => !v)}
              className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${voiceover ? "bg-primary" : "bg-primary-lavender"}`}
            >
              <span
                className={`absolute top-1 size-6 rounded-full bg-white shadow transition-[inset-inline-start] ${voiceover ? "start-7" : "start-1"}`}
              />
            </button>
          </div>
          {voiceover ? (
            <div className="mt-4">
              <p className="label mb-2">{t("voice")}</p>
              <ChipGroup label={t("voice")}>
                {voicesFor(dialect).map((v) => (
                  <button key={v.id} type="button" role="radio" aria-checked={voiceId === v.id} onClick={() => setVoiceId(v.id)} className="chip chip-white">
                    <span className="font-semibold">{v.display_name}</span>
                    <span className="text-xs text-ink-muted">{tgen(v.gender)}</span>
                  </button>
                ))}
              </ChipGroup>
            </div>
          ) : null}
        </div>
      </div>

      {/* Summary card — periwinkle, not sticky */}
      <aside className="rounded-panel bg-primary p-6 text-white">
        <Heading as="h2" className="text-xl text-white!">
          {t.rich("summary", boldTag)}
        </Heading>
        <div className="mt-4 flex items-center gap-3">
          <CompanyMark name={company.name} logoUrl={company.logoUrl} colors={company.colors} size="size-10" />
          <p className="font-semibold">{company.name}</p>
        </div>
        <ul className="mt-4 flex flex-wrap gap-2 text-sm">
          {[tg(goal), `${tf(formatKey(format))} · ${format}`, tc("seconds", { n: formatNumber(length, locale) }), tp(pace), td(dialect)].map((item) => (
            <li key={item} className="rounded-full bg-white/15 px-3 py-1.5">
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-white/80">
          {voiceover && voice ? t("summaryVoice", { voice: voice.display_name }) : t("summaryNoVoice")}
        </p>

        <div className="my-5 border-t border-dashed border-white/40" />

        <p className="text-sm text-white/80">{t("price")}</p>
        <p className="mt-1 text-4xl font-bold tracking-tight" aria-live="polite">
          {money(costUsd)}
        </p>
        <p className="mt-1 text-sm text-white/80">{tc("approxUsd", { usd: formatMoney(costUsd, "USD", locale) })}</p>
        <p className="mt-3 text-xs leading-relaxed text-white/70">
          {t("priceNote", { seconds: formatNumber(billedSeconds(length), locale) })}
        </p>

        {state.error ? (
          <p role="alert" className="mt-4 rounded-2xl bg-white px-4 py-2 text-sm text-danger-ink">
            {state.error === "briefRequired" ? t("briefRequired") : tc("error")}
          </p>
        ) : null}

        <button type="submit" disabled={pending || (voiceover && !voiceId)} className="btn btn-white mt-5 w-full">
          {pending ? <SpinnerIcon className="size-4" /> : null}
          {pending ? t("writing") : t("writeScript")}
          {!pending ? <ArrowIcon className="size-4" /> : null}
        </button>
      </aside>
    </form>
  );
}

function Section({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <section className="panel">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="label mb-3 block">
          {label}
        </label>
      ) : (
        <p className="label mb-3">{label}</p>
      )}
      {children}
      {hint ? <p className="mt-2 text-xs text-ink-muted">{hint}</p> : null}
    </section>
  );
}

function ChipGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {children}
    </div>
  );
}

function FormatGlyph({ format }: { format: VideoFormat }) {
  const size = format === "9:16" ? "h-5 w-3" : format === "1:1" ? "size-4" : "h-3 w-5";
  return <span aria-hidden="true" className={`${size} rounded-[3px] border-2 border-current`} />;
}

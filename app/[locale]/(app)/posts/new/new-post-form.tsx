"use client";

import { useActionState, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createPost, type CreatePostState } from "./actions";
import { toLocal } from "@/lib/pricing";
import { formatMoney } from "@/lib/format";
import { POST_AI_IMAGE, POST_PLATFORM_INFO, POST_PLATFORMS, POST_TYPES, type PostPlatformKey } from "@/lib/posts/config";
import { PLATFORM_ICON } from "@/lib/posts/mockups";
import { DIALECTS, type BrandColor, type Dialect } from "@/lib/types";
import { Heading, boldTag } from "@/components/heading";
import { CompanyMark } from "@/components/company-mark";
import { ArrowIcon, SpinnerIcon } from "@/components/icons";

type CompanyOption = { id: string; name: string; defaultDialect: Dialect; colors: BrandColor[]; logoUrl: string | null; logoOnDark?: boolean | null };
type PostType = (typeof POST_TYPES)[number];
type AiImage = (typeof POST_AI_IMAGE)[number];
const SLIDE_COUNTS = [0, 3, 4, 5, 6, 7, 8] as const; // 0 = auto

export function NewPostForm({ companies, initialCompanyId, priceUsd, fxRate, currency }: { companies: CompanyOption[]; initialCompanyId: string; priceUsd: number; fxRate: number; currency: string }) {
  const t = useTranslations("posts");
  const tc = useTranslations("common");
  const td = useTranslations("dialects");
  const te = useTranslations("aiErrors");
  const locale = useLocale();
  const [state, action, pending] = useActionState<CreatePostState, FormData>(createPost, {});

  const initialCompany = companies.find((c) => c.id === initialCompanyId) ?? companies[0];
  const [companyId, setCompanyId] = useState(initialCompany.id);
  const [type, setType] = useState<PostType>("single");
  const [platforms, setPlatforms] = useState<PostPlatformKey[]>(["instagram", "facebook"]);
  const [brief, setBrief] = useState("");
  const [slides, setSlides] = useState<number>(0);
  const [aiImage, setAiImage] = useState<AiImage>("auto");
  const [dialect, setDialect] = useState<Dialect>(initialCompany.defaultDialect);
  const company = companies.find((c) => c.id === companyId)!;
  const money = (usd: number) => formatMoney(toLocal(usd, fxRate), currency, locale);
  const toggle = (p: PostPlatformKey) => setPlatforms((list) => (list.includes(p) ? list.filter((x) => x !== p) : [...list, p]));

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
      <input type="hidden" name="company_id" value={companyId} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="dialect" value={dialect} />
      <input type="hidden" name="ai_image" value={aiImage} />
      {type === "carousel" && slides ? <input type="hidden" name="slides" value={slides} /> : null}
      {platforms.map((p) => (
        <input key={p} type="hidden" name="platforms" value={p} />
      ))}

      <div className="space-y-5">
        <Section label={t("company")}>
          <ChipGroup label={t("company")}>
            {companies.map((c) => (
              <button key={c.id} type="button" role="radio" aria-checked={companyId === c.id} onClick={() => { setCompanyId(c.id); setDialect(c.defaultDialect); }} className="chip ps-1.5">
                <CompanyMark name={c.name} logoUrl={c.logoUrl} logoOnDark={c.logoOnDark} colors={c.colors} size="size-8" />
                {c.name}
              </button>
            ))}
          </ChipGroup>
        </Section>

        <Section label={t("type")} hint={t(`typeHints.${type}`)}>
          <ChipGroup label={t("type")}>
            {POST_TYPES.map((x) => (
              <button key={x} type="button" role="radio" aria-checked={type === x} onClick={() => setType(x)} className="chip chip-solid chip-white">
                {t(`types.${x}`)}
              </button>
            ))}
          </ChipGroup>
        </Section>

        <Section label={t("platforms")} hint={t("platformsHint")}>
          <div role="group" aria-label={t("platforms")} className="flex flex-wrap gap-2">
            {POST_PLATFORMS.map((p) => (
              <button key={p} type="button" role="checkbox" aria-checked={platforms.includes(p)} onClick={() => toggle(p)} className="chip chip-white">
                <span aria-hidden="true" className="inline-flex" dangerouslySetInnerHTML={{ __html: PLATFORM_ICON(p, 16) }} />
                {t(`platform.${p}`)}
                <small className="opacity-70" dir="ltr">{POST_PLATFORM_INFO[p].canvas}</small>
              </button>
            ))}
          </div>
        </Section>

        <Section label={t("brief")} htmlFor="brief">
          <textarea
            id="brief"
            name="brief"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            required
            rows={4}
            maxLength={2000}
            placeholder={t("briefPlaceholder")}
            className="w-full resize-y rounded-[22px] bg-white p-4 text-sm leading-relaxed text-navy outline-none placeholder:text-ink-muted/70 focus:shadow-[inset_0_0_0_1.5px_var(--primary)]"
          />
        </Section>

        {type === "carousel" ? (
          <Section label={t("slides")}>
            <ChipGroup label={t("slides")}>
              {SLIDE_COUNTS.map((n) => (
                <button key={n} type="button" role="radio" aria-checked={slides === n} onClick={() => setSlides(n)} className="chip chip-white">
                  {n ? n : t("slidesAuto")}
                </button>
              ))}
            </ChipGroup>
          </Section>
        ) : null}

        {type !== "text" ? (
          <Section label={t("aiImage")} hint={t("aiHint")}>
            <ChipGroup label={t("aiImage")}>
              {POST_AI_IMAGE.map((x) => (
                <button key={x} type="button" role="radio" aria-checked={aiImage === x} onClick={() => setAiImage(x)} className="chip chip-white">
                  {t(`aiImages.${x}`)}
                </button>
              ))}
            </ChipGroup>
          </Section>
        ) : null}

        <Section label={t("dialect")}>
          <ChipGroup label={t("dialect")}>
            {DIALECTS.map((d) => (
              <button key={d} type="button" role="radio" aria-checked={dialect === d} onClick={() => setDialect(d)} lang={d === "en" ? "en" : "ar"} className="chip chip-white">
                {td(d)}
              </button>
            ))}
          </ChipGroup>
        </Section>
      </div>

      <aside className="rounded-panel bg-primary p-6 text-white">
        <Heading as="h2" className="text-xl text-white!">
          {t.rich("summary", boldTag)}
        </Heading>
        <div className="mt-4 flex items-center gap-3">
          <CompanyMark name={company.name} logoUrl={company.logoUrl} logoOnDark={company.logoOnDark} colors={company.colors} size="size-10" />
          <p className="font-semibold">{company.name}</p>
        </div>
        <ul className="mt-4 flex flex-wrap gap-2 text-sm">
          {[t(`types.${type}`), ...platforms.map((p) => t(`platform.${p}`)), td(dialect)].map((item) => (
            <li key={item} className="rounded-full bg-white/15 px-3 py-1.5">
              {item}
            </li>
          ))}
        </ul>
        <div className="my-5 border-t border-dashed border-white/40" />
        <p className="text-sm text-white/80">{t("price")}</p>
        <p className="mt-1 text-4xl font-bold tracking-tight">{money(priceUsd)}</p>
        <p className="mt-1 text-sm text-white/80">{tc("approxUsd", { usd: formatMoney(priceUsd, "USD", locale) })}</p>
        <p className="mt-3 text-xs leading-relaxed text-white/70">{t("priceNote")}</p>
        {state.error || state.aiError ? (
          <p role="alert" className="mt-4 rounded-2xl bg-white px-4 py-2 text-sm text-danger-ink">
            {state.aiError ? te(state.aiError) : state.error === "briefRequired" ? t("briefRequired") : state.error === "platformsRequired" ? t("platformsRequired") : tc("error")}
          </p>
        ) : null}
        <button type="submit" disabled={pending || !platforms.length || !brief.trim()} className="btn btn-white mt-5 w-full">
          {pending ? <SpinnerIcon className="size-4" /> : null}
          {pending ? t("creating") : t("create")}
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

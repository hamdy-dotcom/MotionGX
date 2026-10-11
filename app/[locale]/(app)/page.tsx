import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAppContext } from "@/lib/context";
import { listCompanies } from "@/lib/data/companies";
import { getFxRate, toLocal } from "@/lib/pricing";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import type { Video } from "@/lib/types";
import { Heading, boldTag } from "@/components/heading";
import { FoldersIllustration, HeroIllustration } from "@/components/illustrations";
import { CompanyMark, ColorDots } from "@/components/company-mark";
import { StatusChip } from "@/components/status-chip";
import { TimelineSlider } from "@/components/timeline-slider";
import { ArrowIcon, ChevronIcon, PlusIcon } from "@/components/icons";
import { formatKey } from "@/lib/video-labels";

// PHASE 4: scheduled campaigns come from the campaigns feature; positions are day-of-month for now.
const SCHEDULED_CAMPAIGN_DAYS = [8, 15, 24];

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await getAppContext();
  const { supabase, workspace } = ctx;
  const t = await getTranslations("dashboard");
  const tc = await getTranslations("common");
  const tf = await getTranslations("formats");
  const ta = await getTranslations("art");

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const daysInMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getDate();

  const [companies, videosRes, monthVideosRes, spendRes, fx] = await Promise.all([
    listCompanies(ctx),
    supabase
      .from("videos")
      .select("id, title, format, length_s, status, created_at, companies(name)")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("videos")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .gte("created_at", monthStart),
    supabase
      .from("wallet_ledger")
      .select("amount_usd")
      .eq("workspace_id", workspace.id)
      .in("kind", ["export", "refund"])
      .gte("created_at", monthStart),
    getFxRate(supabase, workspace.currency_code),
  ]);

  const videos = (videosRes.data ?? []) as unknown as (Pick<Video, "id" | "title" | "format" | "length_s" | "status" | "created_at"> & {
    companies: { name: string } | null;
  })[];
  const spentUsd = Math.max(0, -(spendRes.data ?? []).reduce((sum, r) => sum + Number(r.amount_usd), 0));
  const cap = workspace.monthly_cap_usd;
  const spentPct = cap ? Math.min(100, (spentUsd / cap) * 100) : (now.getUTCDate() / daysInMonth) * 100;
  const money = (usd: number) => formatMoney(toLocal(usd, fx), workspace.currency_code, locale);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="grid items-center gap-6 rounded-panel bg-field p-5 sm:p-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <Heading as="h1" className="text-3xl sm:text-5xl">
            {t.rich("hero", boldTag)}
          </Heading>
          <p className="mt-4 max-w-xl leading-relaxed text-ink-muted">{t("heroSub")}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/videos/new" className="btn btn-primary">
              {t("newVideo")}
              <ArrowIcon className="size-4" />
            </Link>
            <Link href="/companies/new" className="btn btn-white">
              <PlusIcon className="size-4" />
              {t("addCompany")}
            </Link>
          </div>
        </div>
        <HeroIllustration label={ta("hero")} className="mx-auto w-full max-w-md" />
      </section>

      {/* Spend + stats */}
      <section className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="panel">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Heading as="h2" className="text-lg">
              {t.rich("spendTitle", boldTag)}
            </Heading>
            <p className="text-sm text-ink-2">
              {cap ? t("spentOfCap", { spent: money(spentUsd), cap: money(cap) }) : t("spentNoCap", { spent: money(spentUsd) })}
            </p>
          </div>
          <TimelineSlider
            className="mt-3"
            value={spentPct}
            markers={SCHEDULED_CAMPAIGN_DAYS.map((d) => (d / daysInMonth) * 100)}
            label={t.markup("spendTitle", { b: (c) => c })}
            valueText={cap ? t("spentOfCap", { spent: money(spentUsd), cap: money(cap) }) : money(spentUsd)}
          />
          <p className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
            <span className="size-2.5 rotate-45 rounded-[2px] bg-primary-mid" aria-hidden="true" />
            {t("scheduled")}
          </p>
        </div>
        <Stat label={t("videosThisMonth")} value={formatNumber(monthVideosRes.count ?? 0, locale)} />
        <Stat label={t("companiesCount")} value={formatNumber(companies.length, locale)} />
        <Stat label={t("balance")} value={money(workspace.wallet_balance_usd)} sub={formatMoney(workspace.wallet_balance_usd, "USD", locale)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Companies */}
        <div className="panel">
          <div className="flex items-center justify-between gap-2">
            <Heading as="h2" className="text-xl">
              {t.rich("companies", boldTag)}
            </Heading>
            <Link href="/companies/new" className="btn btn-soft min-h-10 px-3" aria-label={t("addCompany")}>
              <PlusIcon className="size-4" />
            </Link>
          </div>
          {companies.length === 0 ? (
            <div className="mt-6 flex flex-col items-center gap-3 text-center">
              <FoldersIllustration label={ta("folders")} className="w-32" />
              <p className="text-sm text-ink-muted">{t("noCompanies")}</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {companies.map((c) => (
                <li key={c.id} className="flex items-center gap-3 rounded-full bg-white p-1.5 pe-4">
                  <CompanyMark name={c.name} logoUrl={c.logo_url} colors={c.brand_profiles?.colors} size="size-10" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{c.name}</p>
                    {c.website_url ? (
                      <p className="truncate text-xs text-ink-muted" dir="ltr">
                        {c.website_url.replace(/^https?:\/\//, "")}
                      </p>
                    ) : null}
                  </div>
                  <ColorDots colors={c.brand_profiles?.colors ?? []} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent videos */}
        <div className="panel min-w-0">
          <div className="flex items-center justify-between gap-2">
            <Heading as="h2" className="text-xl">
              {t.rich("recentVideos", boldTag)}
            </Heading>
            <Link href="/videos/new" className="btn btn-soft min-h-10 px-3" aria-label={t("newVideo")}>
              <PlusIcon className="size-4" />
            </Link>
          </div>
          {videos.length === 0 ? (
            <p className="mt-6 text-sm text-ink-muted">{t("noVideos")}</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl bg-white">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-start text-xs text-ink-muted">
                    <th className="px-4 py-3 text-start font-medium">{t("colTitle")}</th>
                    <th className="px-4 py-3 text-start font-medium">{t("colCompany")}</th>
                    <th className="px-4 py-3 text-start font-medium">{t("colFormat")}</th>
                    <th className="px-4 py-3 text-start font-medium">{t("colLength")}</th>
                    <th className="px-4 py-3 text-start font-medium">{t("colDate")}</th>
                    <th className="px-4 py-3 text-start font-medium">{t("colStatus")}</th>
                    <th className="px-2 py-3">
                      <span className="sr-only">{t("open")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map((v) => (
                    <tr key={v.id} className="border-t border-dashed border-dash">
                      <td className="max-w-[220px] truncate px-4 py-3 font-medium">
                        <Link href={`/videos/${v.id}`} className="hover:text-primary">
                          {v.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-ink-2">{v.companies?.name}</td>
                      <td className="px-4 py-3 text-ink-2">
                        {tf(formatKey(v.format))} <span dir="ltr">{v.format}</span>
                      </td>
                      <td className="px-4 py-3 text-ink-2">{tc("seconds", { n: formatNumber(v.length_s, locale) })}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-ink-2">{formatDate(v.created_at, locale)}</td>
                      <td className="px-4 py-3">
                        <StatusChip status={v.status} />
                      </td>
                      <td className="px-2 py-3">
                        <Link
                          href={`/videos/${v.id}`}
                          aria-label={t("open")}
                          className="inline-flex size-9 items-center justify-center rounded-full text-primary hover:bg-primary-light"
                        >
                          <ChevronIcon />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="panel flex flex-col justify-between gap-2">
      <p className="label">{label}</p>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      {sub ? <p className="text-xs text-ink-muted">{sub}</p> : null}
    </div>
  );
}

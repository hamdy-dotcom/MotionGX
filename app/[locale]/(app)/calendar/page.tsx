import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { getAppContext } from "@/lib/context";
import { listCompanies } from "@/lib/data/companies";
import { activeCompany } from "@/lib/data/active-company";
import { listWorks } from "@/lib/data/works";
import { addDays, MONTH_MONO, todayKey, weekday } from "@/lib/dates";
import { IDEA_COLUMNS, type PlanIdea } from "@/lib/plans/types";
import { Rise, escapeMarkup } from "@/components/studio/rise";
import { CalendarView, type CalSeason } from "./calendar-view";
import { companyMarket } from "@/lib/data/market";
import { liveSeasons } from "@/lib/market/live";
import { seasonsBetween } from "@/lib/market/seasons";

// "make" on an idea starts a video or post job from this route
export const maxDuration = 800;

const host = (url?: string | null) => { try { return url ? new URL(url).host.replace(/^www\./, "") : ""; } catch { return url ?? ""; } };
const monthKey = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;

export default async function CalendarPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ m?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { m } = await searchParams;
  const ctx = await getAppContext();
  const t = await getTranslations("calendar");
  const brand = await activeCompany(await listCompanies(ctx));
  if (!brand) redirect({ href: "/companies/new", locale });
  const b = brand!;
  const today = todayKey();
  const [y, mo] = (/^\d{4}-\d{2}$/.test(m ?? "") ? m! : today.slice(0, 7)).split("-").map(Number);
  const first = `${monthKey(y, mo)}-01`, daysIn = new Date(Date.UTC(y, mo, 0)).getUTCDate(), last = `${monthKey(y, mo)}-${String(daysIn).padStart(2, "0")}`;
  // the grid starts on Saturday and fills whole weeks
  const lead = (weekday(first) + 1) % 7, total = Math.ceil((lead + daysIn) / 7) * 7;
  const cells = Array.from({ length: total }, (_, i) => { const key = addDays(first, i - lead); return { key, inMonth: key >= first && key <= last }; });
  const prev = mo === 1 ? monthKey(y - 1, 12) : monthKey(y, mo - 1), next = mo === 12 ? monthKey(y + 1, 1) : monthKey(y, mo + 1);

  const [works, ideasRes] = await Promise.all([
    listWorks(ctx, b.id, { limit: 300, from: cells[0].key, to: cells.at(-1)!.key }),
    ctx.supabase.from("plan_ideas").select(IDEA_COLUMNS).eq("company_id", b.id).eq("status", "ok").gte("scheduled_on", cells[0].key).lte("scheduled_on", cells.at(-1)!.key),
  ]);
  // the brand's seasons in view: its countries and industry, from the live calendar (dates confirmed by the daily check)
  const market = await companyMarket(ctx, b.id);
  const L = locale === "ar" ? "ar" : "en";
  const seasons: CalSeason[] = seasonsBetween({ from: cells[0].key, to: cells.at(-1)!.key, countries: market.countries, industry: market.industry, list: await liveSeasons(market.countries).catch(() => undefined) })
    .map((x) => ({ id: x.id, name: x.name[L], angle: x.angle[L], from: x.from, to: x.to ?? null, approx: Boolean(x.approx), status: x.status && x.status !== "cancelled" ? x.status : null, source: x.source ?? null, kind: x.kind }));
  const monthName = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, mo - 1, 1)));

  return (
    <section className="s-screen">
      <div className="s-slate-line"><span>BRAND CALENDAR</span><i /><span dir="ltr">{MONTH_MONO[mo - 1]} {y} · {(host(b.website_url) || b.name).toUpperCase()}</span></div>
      <div className="s-row" style={{ alignItems: "flex-end", marginBottom: 20 }}>
        <div>
          <Rise markup={t.markup("title", { b: (c) => `<b>${c}</b>`, name: escapeMarkup(b.name), month: monthName })} style={{ margin: 0 }} />
          <p className="s-lead" style={{ margin: "16px 0 0" }}>{t("lead")}</p>
        </div>
        <div className="s-calhead">
          <Link href={`/calendar?m=${prev}`} className="s-btn ghost small" aria-label={t("prev")}>{locale === "ar" ? "→" : "←"}</Link>
          <Link href={`/calendar?m=${next}`} className="s-btn ghost small" aria-label={t("next")}>{locale === "ar" ? "←" : "→"}</Link>
          <Link href="/plans" className="s-btn lit small">{t("newPlan")}</Link>
        </div>
      </div>
      <CalendarView cells={cells} today={today} seasons={seasons} works={works} ideas={(ideasRes.data ?? []) as PlanIdea[]} brand={{ id: b.id, dialect: b.default_dialect }} />
    </section>
  );
}

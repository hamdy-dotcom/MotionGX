import "server-only";
import type { AppContext } from "@/lib/context";
import { addDays, todayKey, weekOf } from "@/lib/dates";
import { upcomingSeasons, type UpcomingSeason } from "@/lib/market/seasons";
import { liveSeasons } from "@/lib/market/live";
import { countryName } from "@/lib/market/countries";
import { trendsFor, type Trend } from "@/lib/trends/daily";
import type { Market } from "@/lib/data/market";

// The studio's pop-ups for the active brand: a season coming up in its countries, a trend in its industry today, and
// a reminder to put ready work on the calendar. Each has a stable key; a member's answer (later / not for me / done)
// hides it (notice_states).

export type Notice = (
  | { key: string; kind: "season"; season: { id: string; name: string; angle: string; from: string; to: string | null; daysAway: number; ongoing: boolean; approx: boolean; countries: string[]; status: "confirmed" | "moved" | "added" | null; source: { url: string; title: string } | null } }
  | { key: string; kind: "trend"; trend: { id: string; title: string; why: string; angle: string; sources: { title: string; url: string }[] } }
  | { key: string; kind: "schedule"; reason: "unscheduled" | "empty_week"; count: number }
) & {
  /** already shown to this member (it stays in the notifications panel; the pop-up shows only new ones) */
  seen?: boolean;
};

type State = { key: string; status: "seen" | "later" | "dismissed" | "acted"; until: string | null };

async function states(ctx: AppContext, companyId: string): Promise<State[]> {
  const { data, error } = await ctx.supabase.from("notice_states").select("key, status, until").eq("company_id", companyId).eq("user_id", ctx.userId);
  return error ? [] : ((data ?? []) as State[]);
}

/** ready pieces that have no day yet, and the coming week's calendar */
async function scheduleGaps(ctx: AppContext, companyId: string) {
  const since = new Date(Date.now() - 21 * 864e5).toISOString();
  const today = todayKey(), weekEnd = addDays(today, 7);
  const q = (t: "videos" | "posts", ready: string[]) => ctx.supabase.from(t).select("id, scheduled_on, status").eq("company_id", companyId).gte("created_at", since).in("status", ready);
  const [v, p] = await Promise.all([q("videos", ["ready", "review"]), q("posts", ["ready"])]);
  if (v.error || p.error) return { unscheduled: 0, nextWeek: 1 }; // before 0013: no calendar — no reminder
  const all = [...(v.data ?? []), ...(p.data ?? [])] as { scheduled_on: string | null }[];
  const { data: ideas } = await ctx.supabase.from("plan_ideas").select("id").eq("company_id", companyId).gte("scheduled_on", today).lte("scheduled_on", weekEnd);
  return {
    unscheduled: all.filter((x) => !x.scheduled_on).length,
    nextWeek: all.filter((x) => x.scheduled_on && x.scheduled_on >= today && x.scheduled_on <= weekEnd).length + (ideas?.length ?? 0),
  };
}

export async function buildNotices(ctx: AppContext, companyId: string, market: Market, locale: string): Promise<{ notices: Notice[]; trendsPending: boolean }> {
  const L = locale === "ar" ? "ar" : "en";
  const today = todayKey();
  const week = weekOf(today)[0];
  const [answers, gaps, trends, calendar] = await Promise.all([
    states(ctx, companyId),
    scheduleGaps(ctx, companyId),
    market.industry ? trendsFor(market.industry, market.countries).catch(() => null) : Promise.resolve(null as Trend[] | null),
    liveSeasons(market.countries).catch(() => undefined),
  ]);
  const hidden = (key: string) => answers.some((a) => a.key === key && a.status !== "seen" && (a.status !== "later" || (a.until && a.until > new Date().toISOString())));
  const seen = new Set(answers.map((a) => a.key));

  const out: Notice[] = [];
  // 1. schedule reminders first: the brand's own work waiting
  if (gaps.unscheduled > 0) out.push({ key: `schedule:unscheduled:${week}`, kind: "schedule", reason: "unscheduled", count: gaps.unscheduled });
  else if (gaps.nextWeek === 0) out.push({ key: `schedule:empty:${week}`, kind: "schedule", reason: "empty_week", count: 0 });

  // 2. today's trends in the industry
  for (const tr of (trends ?? []).slice(0, 3)) out.push({ key: `trend:${tr.id}`, kind: "trend", trend: { id: tr.id, title: tr.title[L], why: tr.why[L], angle: tr.angle[L], sources: tr.sources.slice(0, 2) } });

  // 3. seasons coming up in the brand's countries (pay days only in their own week)
  const seasons: UpcomingSeason[] = upcomingSeasons({ today, countries: market.countries, industry: market.industry, list: calendar }).filter((s) => s.kind !== "payday" || s.daysAway <= 4).slice(0, 4);
  for (const s of seasons) {
    const markets = s.countries === "all" ? [] : s.countries.filter((c) => !market.countries.length || market.countries.includes(c));
    out.push({ key: `season:${s.id}${s.status === "moved" ? `:${s.from}` : ""}`, kind: "season", season: { id: s.id, name: s.name[L], angle: s.angle[L], from: s.from, to: s.to ?? null, daysAway: s.daysAway, ongoing: s.ongoing, approx: Boolean(s.approx), countries: markets.slice(0, 3).map((c) => countryName(c, L)), status: s.status && s.status !== "cancelled" ? s.status : null, source: s.source ?? null } });
  }

  return { notices: out.filter((n) => !hidden(n.key)).map((n) => ({ ...n, seen: seen.has(n.key) })), trendsPending: Boolean(market.industry) && trends === null };
}

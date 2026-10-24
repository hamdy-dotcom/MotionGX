import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAppContext } from "@/lib/context";
import { listCompanies } from "@/lib/data/companies";
import { activeCompany } from "@/lib/data/active-company";
import { brandDetails, listWorks } from "@/lib/data/works";
import { paletteHexes } from "@/lib/brand/light";
import { getFxRate, toLocal } from "@/lib/pricing";
import { formatMoney } from "@/lib/format";
import { dayMono, todayKey, WEEKDAY_MONO, weekday, weekOf } from "@/lib/dates";
import { Rise, escapeMarkup } from "@/components/studio/rise";
import { StudioMark } from "@/components/studio/mark";
import { CountUp } from "@/components/studio/count-up";

// the docked composer starts jobs from this route
export const maxDuration = 800;

const host = (url?: string | null) => { try { return url ? new URL(url).host.replace(/^www\./, "") : ""; } catch { return url ?? ""; } };
const b = (c: string) => `<b>${c}</b>`;

export default async function TodayPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await getAppContext();
  const t = await getTranslations("today");
  const companies = await listCompanies(ctx);
  const brand = await activeCompany(companies);

  if (!brand) {
    return (
      <section className="s-screen">
        <div className="s-slate-line"><span className="live"><span className="s-dot" />STUDIO OPEN</span></div>
        <Rise markup={t.markup("emptyTitle", { b })} />
        <p className="s-lead">{t("emptyLead")}</p>
        <Link href="/companies/new" className="s-btn lit">{t("addCompany")}</Link>
      </section>
    );
  }

  const today = todayKey(), week = weekOf(today), monthStart = `${today.slice(0, 8)}01`;
  const [works, details, spendRes, fx] = await Promise.all([
    listWorks(ctx, brand.id, { limit: 40 }),
    brandDetails(ctx, brand.id),
    ctx.supabase.from("wallet_ledger").select("amount_usd").eq("workspace_id", ctx.workspace.id).in("kind", ["export", "refund"]).gte("created_at", monthStart),
    getFxRate(ctx.supabase, ctx.workspace.currency_code),
  ]);
  const spent = toLocal(Math.max(0, -(spendRes.data ?? []).reduce((s, r) => s + Number(r.amount_usd), 0)), fx);
  const currency = formatMoney(0, ctx.workspace.currency_code, ctx.locale).replace(/[\d.,\s-]/g, "") || ctx.workspace.currency_code;
  const month = works.filter((w) => w.day >= monthStart);
  const latin = (host(brand.website_url) || brand.name).toUpperCase();
  const colors = brand.brand_profiles?.colors ?? [];
  const facts = details.facts;
  const feature = (s?: string) => (s ?? "").split(/\s[—-]\s/)[0].trim();
  const ideas = [
    { text: feature(facts.offers?.[0]) || feature(facts.key_features?.[0]) || details.tagline || brand.name, kind: "image", tag: "POST · IG + FB" },
    { text: feature(facts.key_features?.[0]) || feature(facts.offers?.[1]) || t("howItWorks"), kind: "video", tag: "REEL · 30S" },
    { text: t("reasons", { n: Math.min(3, (facts.key_features?.length ?? 0) + (facts.offers?.length ?? 0)) || 3, name: brand.name }), kind: "carousel", tag: "CAROUSEL · LI + IG" },
  ];
  // the strip shows designs: no text-only posts (no image to show)
  const frames = works.filter((w) => w.status !== "failed" && !(w.kind === "post" && w.type === "text")).slice(0, 14);

  return (
    <section className="s-screen">
      <div className="s-slate-line"><span className="live"><span className="s-dot" />STUDIO OPEN</span><i /><span dir="ltr">{WEEKDAY_MONO[weekday(today)]} · {today.split("-").reverse().join(".")}</span><i /><span dir="ltr">CLIENT · {latin}</span></div>
      <Rise markup={t.markup("title", { b, name: escapeMarkup(brand.name) })} />
      <p className="s-lead">{t("lead")}</p>
      <div className="s-reel" aria-label={t("recent")}>
        <div className="s-track">
          {(frames.length ? [...frames, ...frames] : []).map((w, i) => (
            <Link key={`${w.id}-${i}`} href={w.href} className={`s-frame${(w.kind === "video" && w.type === "9:16") || w.type === "story" ? " v" : w.type === "cover" ? " cover" : ""}`} data-tc={`Nº ${String((i % frames.length) + 1).padStart(3, "0")}`} style={w.thumb ? { backgroundImage: `url(${w.thumb})` } : undefined} aria-label={w.title}>
              {w.thumb ? null : <span className="tile" dir="auto">{w.title}</span>}
            </Link>
          ))}
        </div>
        {frames.length ? null : <p className="s-lead" style={{ margin: 0, paddingInline: "max(16px, 3.2vw)" }}>{t("wallEmpty")}</p>}
      </div>
      <div className="s-grid2">
        <div className="s-stack">
          <div className="s-panel">
            <div className="s-row" style={{ marginBottom: 14 }}><p className="s-label plain" style={{ margin: 0 }}>{t("week")}</p><Link href="/calendar" className="s-btn ghost small">{t("toCalendar")}</Link></div>
            <div className="s-timeline">
              {week.map((d) => {
                const its = works.filter((w) => w.day === d);
                return (
                  <Link key={d} href={d >= today ? `/create?day=${d}` : "/calendar"} className={`s-tday${d === today ? " now" : ""}`}>
                    <b>{WEEKDAY_MONO[weekday(d)]}</b><span className="n">{+d.slice(8)}</span>
                    {its.map((w) => <span key={w.id} className={`s-clip${w.kind === "video" ? " v" : ""}`} dir="auto">{w.kind === "video" ? "▶" : "▣"} {w.title}</span>)}
                    {!its.length && d > today ? <span className="s-clip add">{t("addIdea")}</span> : null}
                  </Link>
                );
              })}
            </div>
          </div>
          <div>
            <p className="s-label">{t("ideas")}</p>
            <div className="s-scenes">
              {ideas.map((it, i) => (
                <div key={i} className="s-scene">
                  <span className="no">0{i + 1}</span>
                  <small>Nº 0{i + 1} · {it.tag}</small>
                  <p dir="auto">{it.text}</p>
                  <Link href={`/create?kind=${it.kind}&brief=${encodeURIComponent(it.text)}`} className="s-btn small">{t("makeIt")}</Link>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="s-stack">
          <div className="s-panel s-brandcard">
            <p className="s-label">{t("brand")}</p>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <StudioMark company={brand} size={52} />
              <div style={{ minWidth: 0 }}><b style={{ font: "800 22px var(--s-brandfont)" }}>{brand.name}</b><div className="s-mono" style={{ fontSize: 11, color: "var(--s-muted)" }} dir="ltr">{host(brand.website_url)}</div></div>
            </div>
            <div className="bars">{paletteHexes(colors).map((h, i) => <i key={`${h}-${i}`} title={h} style={{ background: h }} />)}</div>
            <p className="s-voice" dir="auto">{(details.tone || details.tagline).slice(0, 130)}{(details.tone || details.tagline).length > 130 ? "…" : ""}</p>
            <Link href="/brand" className="s-btn ghost small" style={{ marginTop: 14 }}>{t("lookbook")}</Link>
          </div>
          <div className="s-panel">
            <p className="s-label">{t("month")}</p>
            <div className="s-count"><span>{t("videos")}</span><b><CountUp to={month.filter((w) => w.kind === "video").length} /></b></div>
            <div className="s-count"><span>{t("posts")}</span><b><CountUp to={month.filter((w) => w.kind === "post").length} /></b></div>
            <div className="s-count"><span>{t("spend", { currency })}</span><b><CountUp to={Math.round(spent)} /></b></div>
          </div>
        </div>
      </div>
      <p className="s-mono" style={{ fontSize: 10.5, color: "var(--s-muted)", marginTop: 18 }} dir="ltr">{dayMono(week[0])} → {dayMono(week[6])}</p>
    </section>
  );
}

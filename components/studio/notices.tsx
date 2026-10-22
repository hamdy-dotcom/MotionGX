"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { answerNotice, draftFromNotice, getNotices } from "@/lib/actions/notices";
import type { Notice } from "@/lib/notices/build";

/** The studio's pop-ups (bottom corner, away from the rail): a season coming up in the brand's countries, a trend in
 *  its industry today, a reminder to schedule ready work. One at a time; «لاحقاً» hides it for a day, × for good. */
export function Notices({ companyId }: { companyId: string | null }) {
  const t = useTranslations("notices");
  const router = useRouter();
  const [list, setList] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!companyId) return;
    let live = true;
    const load = () => getNotices(companyId).then((n) => { if (live) { setList(n); setI(0); } }).catch(() => undefined);
    // after the page settles; again later in the session (the day's trends arrive a minute after the first look)
    const first = setTimeout(() => { void load().then(() => live && setOpen(true)); }, 2500);
    const again = setInterval(load, 10 * 60_000);
    return () => { live = false; clearTimeout(first); clearInterval(again); };
  }, [companyId]);

  const n = list[i];
  if (!companyId || !n) return null;

  const drop = (status: "later" | "dismissed" | "acted") => {
    void answerNotice(companyId, n.key, status);
    setList((l) => l.filter((x) => x.key !== n.key));
    setI((k) => Math.max(0, Math.min(k, list.length - 2)));
    setError(null);
  };
  const draft = () => start(async () => {
    const res = await draftFromNotice(companyId, n);
    if (!res.ok) { setError(t("draftFailed")); return; }
    drop("acted");
    router.push(res.href);
  });

  if (!open) return <button type="button" className="s-notice-pill" onClick={() => setOpen(true)} aria-label={t("open", { n: list.length })}><span className="s-dot" />{t("count", { n: list.length })}</button>;

  const when = n.kind === "season" ? (n.season.ongoing ? t("now") : n.season.daysAway === 0 ? t("today") : n.season.daysAway === 1 ? t("tomorrow") : t("inDays", { n: n.season.daysAway })) : "";
  return (
    <aside className={`s-notice ${n.kind}`} role="status" aria-live="polite">
      <div className="s-notice-top">
        <span className="s-notice-eye">{n.kind === "season" ? t("seasonEye") : n.kind === "trend" ? t("trendEye") : t("scheduleEye")}{n.kind === "season" && n.season.countries.length ? ` · ${n.season.countries.join("، ")}` : ""}</span>
        <span className="s-notice-ctl">
          {list.length > 1 ? <button type="button" onClick={() => setI((k) => (k + 1) % list.length)} aria-label={t("next")}><span dir="ltr">{i + 1}/{list.length}</span> ›</button> : null}
          <button type="button" onClick={() => setOpen(false)} aria-label={t("minimize")}>–</button>
          <button type="button" onClick={() => drop("dismissed")} aria-label={t("dismiss")}>×</button>
        </span>
      </div>
      {n.kind === "season" ? (
        <>
          <b className="s-notice-title">{n.season.name} <em>{when}</em></b>
          <p>{t("seasonBody", { angle: n.season.angle })}{n.season.approx && !n.season.status ? ` ${t("approx")}` : ""}</p>
          {n.season.status ? <a className="s-notice-src" href={n.season.source?.url} target="_blank" rel="noreferrer noopener">✓ {t(`status_${n.season.status}`)}{n.season.source?.title ? ` · ${n.season.source.title}` : ""}</a> : null}
        </>
      ) : n.kind === "trend" ? (
        <>
          <b className="s-notice-title">{n.trend.title}</b>
          <p>{n.trend.why}</p>
          {n.trend.sources[0] ? <a className="s-notice-src" href={n.trend.sources[0].url} target="_blank" rel="noreferrer noopener">{t("source")}: {n.trend.sources[0].title || new URL(n.trend.sources[0].url).host}</a> : null}
        </>
      ) : (
        <>
          <b className="s-notice-title">{n.reason === "unscheduled" ? t("unscheduledTitle", { n: n.count }) : t("emptyTitle")}</b>
          <p>{n.reason === "unscheduled" ? t("unscheduledBody") : t("emptyBody")}</p>
        </>
      )}
      {error ? <p className="s-notice-err" role="alert">{error}</p> : null}
      <div className="s-notice-acts">
        {n.kind === "schedule" ? (
          <Link href={n.reason === "unscheduled" ? "/calendar" : "/plans"} className="s-btn lit small" onClick={() => drop("acted")}>{n.reason === "unscheduled" ? t("scheduleGo") : t("planGo")}</Link>
        ) : (
          <button type="button" className="s-btn lit small" onClick={draft} disabled={pending}>{pending ? t("drafting") : n.kind === "trend" ? t("draftTrend") : t("draftSeason")}</button>
        )}
        <button type="button" className="s-btn ghost small" onClick={() => drop("later")}>{t("later")}</button>
      </div>
    </aside>
  );
}

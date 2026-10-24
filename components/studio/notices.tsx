"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { answerNotice, draftFromNotice, getNoticeHistory, getNotices, markSeen, type NoticeHistoryItem } from "@/lib/actions/notices";
import type { Notice } from "@/lib/notices/build";

/** The studio's notifications: a bell (top corner, away from the rail and the composer) with the count; a new notice
 *  pops up once under it; the panel lists what's active now and the history of everything shown (seen, done, later,
 *  hidden) for this brand. */
export function Notices({ companyId }: { companyId: string | null }) {
  const t = useTranslations("notices");
  const locale = useLocale();
  const router = useRouter();
  const [list, setList] = useState<Notice[]>([]);
  const [pop, setPop] = useState<Notice | null>(null);
  const [panel, setPanel] = useState<null | "now" | "history">(null);
  const [history, setHistory] = useState<NoticeHistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();
  const shown = useRef(new Set<string>());

  useEffect(() => {
    if (!companyId) return;
    let live = true;
    const load = () => getNotices(companyId).then((n) => {
      if (!live) return;
      // a notice pops up once — the first time this member sees it; then it lives in the panel
      const fresh = n.find((x) => !x.seen && !shown.current.has(x.key));
      if (fresh) { shown.current.add(fresh.key); setPop(fresh); void markSeen(companyId, [fresh]); }
      setList(n.map((x) => (shown.current.has(x.key) ? { ...x, seen: true } : x)));
    }).catch(() => undefined);
    const first = setTimeout(load, 2500);
    const again = setInterval(load, 10 * 60_000);
    return () => { live = false; clearTimeout(first); clearInterval(again); };
  }, [companyId]);

  useEffect(() => {
    if (panel !== "history" || !companyId) return;
    let live = true;
    void getNoticeHistory(companyId).then((h) => live && setHistory(h));
    return () => { live = false; };
  }, [panel, companyId]);

  if (!companyId) return null;

  const unseen = list.filter((n) => !n.seen).length;
  const drop = (n: Notice, status: "later" | "dismissed" | "acted") => {
    void answerNotice(companyId, n.key, status, n);
    setList((l) => l.filter((x) => x.key !== n.key));
    if (pop?.key === n.key) setPop(null);
    setHistory(null);
    setError(null);
  };
  const draft = (n: Notice) => start(async () => {
    setBusy(n.key);
    const res = await draftFromNotice(companyId, n);
    setBusy(null);
    if (!res.ok) { setError(t("draftFailed")); return; }
    drop(n, "acted");
    setPanel(null);
    router.push(res.href);
  });
  const openPanel = () => { setPop(null); setPanel("now"); const fresh = list.filter((n) => !n.seen); if (fresh.length) { void markSeen(companyId, fresh); setList((l) => l.map((n) => ({ ...n, seen: true }))); } };

  const card = (n: Notice, mode: "pop" | "list") => (
    <article key={n.key} className={`s-notice-card ${n.kind}`}>
      <div className="s-notice-top">
        <span className="s-notice-eye">{eye(n)}</span>
        {mode === "pop" ? (
          <span className="s-notice-ctl">
            <button type="button" onClick={() => setPop(null)} aria-label={t("minimize")}>–</button>
            <button type="button" onClick={() => drop(n, "dismissed")} aria-label={t("dismiss")}>×</button>
          </span>
        ) : <button type="button" className="s-notice-x" onClick={() => drop(n, "dismissed")} aria-label={t("dismiss")}>×</button>}
      </div>
      <Body n={n} />
      <div className="s-notice-acts">
        {n.kind === "schedule" ? (
          <Link href={n.reason === "unscheduled" ? "/calendar" : "/plans"} className="s-btn lit small" onClick={() => { drop(n, "acted"); setPanel(null); }}>{n.reason === "unscheduled" ? t("scheduleGo") : t("planGo")}</Link>
        ) : (
          <button type="button" className="s-btn lit small" onClick={() => draft(n)} disabled={busy === n.key}>{busy === n.key ? t("drafting") : n.kind === "trend" ? t("draftTrend") : t("draftSeason")}</button>
        )}
        <button type="button" className="s-btn ghost small" onClick={() => drop(n, "later")}>{t("later")}</button>
      </div>
    </article>
  );
  const eye = (n: Notice) => (n.kind === "season" ? `${t("seasonEye")}${n.season.countries.length ? ` · ${n.season.countries.join("، ")}` : ""}` : n.kind === "trend" ? t("trendEye") : t("scheduleEye"));

  return (
    <>
      <button type="button" className={`s-bell${list.length ? " on" : ""}`} onClick={() => (panel ? setPanel(null) : openPanel())} aria-label={t("open", { n: list.length })} aria-expanded={Boolean(panel)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" /></svg>
        {list.length ? <span className={`s-bell-n${unseen ? " new" : ""}`}>{list.length}</span> : null}
      </button>

      {pop && !panel ? <div className="s-notice-pop" role="status" aria-live="polite">{card(pop, "pop")}{error ? <p className="s-notice-err">{error}</p> : null}</div> : null}

      {panel ? (
        <>
          <div className="s-notice-shade" onClick={() => setPanel(null)} aria-hidden="true" />
          <aside className="s-notice-panel" role="dialog" aria-label={t("title")}>
            <div className="s-row" style={{ marginBottom: 12 }}>
              <b style={{ fontSize: 18 }}>{t("title")}</b>
              <button type="button" className="s-btn ghost small" onClick={() => setPanel(null)}>{t("close")}</button>
            </div>
            <div className="s-chips" style={{ marginBottom: 14 }}>
              <button type="button" className="s-chip" aria-pressed={panel === "now"} onClick={() => setPanel("now")}>{t("now", { n: list.length })}</button>
              <button type="button" className="s-chip" aria-pressed={panel === "history"} onClick={() => setPanel("history")}>{t("history")}</button>
            </div>
            {error ? <p className="s-notice-err">{error}</p> : null}
            {panel === "now" ? (
              list.length ? <div className="s-notice-list">{list.map((n) => card(n, "list"))}</div> : <p className="s-notice-empty">{t("empty")}</p>
            ) : history === null ? <p className="s-notice-empty">…</p> : history.length ? (
              <ol className="s-notice-history">
                {history.map((h) => (
                  <li key={h.key}>
                    <span className={`s-notice-st ${h.status}`}>{t(`st.${h.status}`)}</span>
                    <div>
                      <span className="s-notice-eye">{h.notice?.kind ? eye(h.notice) : ""}</span>
                      {h.notice?.kind ? <Body n={h.notice} compact /> : null}
                      <small>{new Date(h.at).toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</small>
                    </div>
                    {h.status !== "acted" && h.notice && (h.notice.kind === "season" || h.notice.kind === "trend") ? <button type="button" className="s-btn ghost small" onClick={() => draft(h.notice)} disabled={busy === h.key}>{busy === h.key ? t("drafting") : t("draftShort")}</button> : null}
                  </li>
                ))}
              </ol>
            ) : <p className="s-notice-empty">{t("noHistory")}</p>}
          </aside>
        </>
      ) : null}
    </>
  );
}

/** what a notice says (the same in the pop-up, the panel and the history) */
function Body({ n, compact = false }: { n: Notice; compact?: boolean }) {
  const t = useTranslations("notices");
  if (n.kind === "season") {
    const s = n.season;
    const when = s.ongoing ? t("now_") : s.daysAway === 0 ? t("today") : s.daysAway === 1 ? t("tomorrow") : t("inDays", { n: s.daysAway });
    return (
      <>
        <b className="s-notice-title">{s.name} {compact ? null : <em>{when}</em>}</b>
        {compact ? null : <p>{t("seasonBody", { angle: s.angle })}{s.approx && !s.status ? ` ${t("approx")}` : ""}</p>}
        {!compact && s.status ? <a className="s-notice-src" href={s.source?.url} target="_blank" rel="noreferrer noopener">✓ {t(`status_${s.status}`)}{s.source?.title ? ` · ${s.source.title}` : ""}</a> : null}
      </>
    );
  }
  if (n.kind === "trend")
    return (
      <>
        <b className="s-notice-title">{n.trend.title}</b>
        {compact ? null : <p>{n.trend.why}</p>}
        {!compact && n.trend.sources[0] ? <a className="s-notice-src" href={n.trend.sources[0].url} target="_blank" rel="noreferrer noopener">{t("source")}: {n.trend.sources[0].title || n.trend.sources[0].url}</a> : null}
      </>
    );
  return (
    <>
      <b className="s-notice-title">{n.reason === "unscheduled" ? t("unscheduledTitle", { n: n.count }) : t("emptyTitle")}</b>
      {compact ? null : <p>{n.reason === "unscheduled" ? t("unscheduledBody") : t("emptyBody")}</p>}
    </>
  );
}

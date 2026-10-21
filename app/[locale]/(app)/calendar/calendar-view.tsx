"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { updateIdea } from "@/lib/actions/plans";
import type { PlanIdea } from "@/lib/plans/types";
import type { Work } from "@/lib/data/works";
import { dayLabel, dayMono } from "@/lib/dates";
import { KindIcon, PlatformIcon } from "@/components/studio/platform-icon";
import { PlanCard, makeIdea, useBestTime, type IdeaBrand } from "@/components/studio/plan-bits";

const HEADS = ["SAT", "SUN", "MON", "TUE", "WED", "THU", "FRI"];

/** The month grid: finished work and accepted plan ideas in their days; ideas drag to another day. */
export function CalendarView({ cells, today, works, ideas: initial, brand }: { cells: { key: string; inMonth: boolean }[]; today: string; works: Work[]; ideas: PlanIdea[]; brand: IdeaBrand }) {
  const t = useTranslations("calendar");
  const tk = useTranslations("compose.kinds");
  const locale = useLocale();
  const router = useRouter();
  const best = useBestTime();
  const [ideas, setIdeas] = useState(initial);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [open, setOpen] = useState<PlanIdea | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  // a refresh brings the server's ideas; take them (React's "adjust state when a prop changes" pattern)
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) { setSeen(initial); setIdeas(initial); }
  useEffect(() => { if (!msg) return; const h = setTimeout(() => setMsg(null), 2600); return () => clearTimeout(h); }, [msg]);

  async function move(id: string, day: string | null) {
    setIdeas((xs) => xs.map((x) => (x.id === id ? { ...x, scheduled_on: day } : x)));
    const r = await updateIdea(id, { scheduledOn: day });
    if (!r.ok) { setMsg("—"); router.refresh(); return; }
    setMsg(day ? t("moved", { day: dayLabel(day, locale) }) : t("removed"));
    router.refresh();
  }

  return (
    <>
      <div className="s-panel">
        <div className="s-cal">
          {HEADS.map((h) => <div key={h} className="h">{h}</div>)}
          {cells.map(({ key, inMonth }) => {
            if (!inMonth) return <div key={key} className="s-cell out"><span className="d">{key.slice(8)}</span></div>;
            const its = works.filter((w) => w.day === key), pl = ideas.filter((i) => i.scheduled_on === key);
            const future = key >= today;
            return (
              <div
                key={key}
                className={`s-cell${key === today ? " now" : ""}${key < today ? " past" : ""}${over === key ? " over" : ""}`}
                role="button"
                tabIndex={0}
                aria-label={dayLabel(key, locale)}
                onClick={() => future && router.push(`/create?day=${key}`)}
                onKeyDown={(e) => { if (e.key === "Enter" && future) router.push(`/create?day=${key}`); }}
                onDragOver={(e) => { if (!drag || !future) return; e.preventDefault(); setOver(key); }}
                onDragLeave={() => setOver((o) => (o === key ? null : o))}
                onDrop={(e) => { e.preventDefault(); const id = drag; setDrag(null); setOver(null); if (id) move(id, key); }}
              >
                <span className="d">{key.slice(8)}</span>
                {its.map((w) => <Link key={w.id} href={w.href} className={`s-clip${w.kind === "video" ? " v" : ""}`} onClick={(e) => e.stopPropagation()} dir="auto">{w.kind === "video" ? "▶" : "▣"} {w.title}</Link>)}
                {pl.map((i) => <PlanCard key={i.id} idea={i} onOpen={() => setOpen(i)} onMake={() => makeIdea(i, brand)} onDragStart={(e) => { setDrag(i.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", i.id); }} />)}
                {future ? <span className="add">{t("add")}</span> : null}
              </div>
            );
          })}
        </div>
      </div>
      {open ? (
        <div className="s-modal" onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
          <div className="s-panel" role="dialog" aria-modal="true" aria-label={open.title}>
            <div className="s-slate-line"><span>PLANNED IDEA</span><i /><span dir="ltr">{open.scheduled_on ? dayMono(open.scheduled_on) : ""}</span></div>
            <h2 className="s-h2" style={{ fontFamily: "var(--s-brandfont)" }} dir="auto">{open.title}</h2>
            <p style={{ color: "var(--s-ink-2)", margin: "0 0 12px" }} dir="auto">{open.why}</p>
            <div className="s-pop-grid">
              <div><small>{t("opens")}</small><span dir="auto">«{open.hook}»</span></div>
              <div><small>{t("best")}</small><b>{open.scheduled_on ? dayLabel(open.scheduled_on, locale) : ""} · {best(open)}</b></div>
            </div>
            <div className="s-chips" style={{ marginBottom: 14 }}>
              <span className="s-chip"><KindIcon k={open.kind} size={14} />{tk(open.kind)}</span>
              <span className="s-chip">{open.angle}</span>
              {open.platforms.map((p) => <span key={p} className="s-chip"><PlatformIcon p={p} /></span>)}
            </div>
            <label className="s-label" htmlFor="ip-day">{t("day")}</label>
            <input className="s-input" type="date" id="ip-day" value={open.scheduled_on ?? ""} min={today} onChange={(e) => { if (!e.target.value) return; setOpen({ ...open, scheduled_on: e.target.value }); move(open.id, e.target.value); }} />
            <div className="s-row" style={{ marginTop: 16 }}>
              <button type="button" className="s-btn ghost small" onClick={() => { const id = open.id; setOpen(null); move(id, null); }}>{t("remove")}</button>
              <span className="s-chips"><button type="button" className="s-btn ghost small" onClick={() => setOpen(null)}>{t("close")}</button><button type="button" className="s-btn lit small" onClick={() => { const i = open; setOpen(null); makeIdea(i, brand); }}>{t("makeNow")}</button></span>
            </div>
          </div>
        </div>
      ) : null}
      <div className={`s-toast${msg ? " on" : ""}`} role="status">{msg}</div>
    </>
  );
}

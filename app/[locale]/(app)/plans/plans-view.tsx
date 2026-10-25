"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { autoAssign, savePlan, suggestIdeas, swapIdea, updateIdea } from "@/lib/actions/plans";
import { ideasToSuggest, postsNeeded, PLAN_GOALS, type Plan, type PlanIdea } from "@/lib/plans/types";
import { addDays, dayLabel, dayMono, daysBetween, WEEKDAY_MONO, weekday } from "@/lib/dates";
import { Rise, escapeMarkup } from "@/components/studio/rise";
import { KindIcon, PlatformIcon } from "@/components/studio/platform-icon";
import { PlanCard, makeIdea, useBestTime } from "@/components/studio/plan-bits";
import type { Work } from "@/lib/data/works";

type Len = "w1" | "w2" | "m1" | "custom";
const KINDS = ["image", "carousel", "video", "text"] as const;
const PLATFORMS = ["instagram", "facebook", "tiktok", "linkedin", "x"] as const;
const LEN_DAYS: Record<Exclude<Len, "custom">, number> = { w1: 7, w2: 14, m1: 30 };

export type PlansProps = {
  brand: { id: string; name: string; latin: string; dialect: string; palette: string[]; mark: ReactNode };
  /** the billed estimate of writing a batch of ideas, formatted */
  ideasCost: string;
  today: string;
  plan: Plan | null;
  ideas: PlanIdea[];
  works: Work[];
};

export function PlansView({ brand, today, plan: initialPlan, ideas: initialIdeas, works, ideasCost }: PlansProps) {
  const t = useTranslations("plans");
  const tk = useTranslations("compose.kinds");
  const tp = useTranslations("posts.platform");
  const te = useTranslations("aiErrors");
  const locale = useLocale();
  const best = useBestTime();
  const [plan, setPlan] = useState<Plan | null>(initialPlan);
  const [ideas, setIdeas] = useState<PlanIdea[]>(initialIdeas);
  const [phase, setPhase] = useState<"setup" | "work">(initialPlan && initialIdeas.length ? "work" : "setup");
  const [shown, setShown] = useState(initialIdeas.length);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "new" | "ok" | "no">("all");
  const [msg, setMsg] = useState<string | null>(null);
  const [gen, startGen] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  // settings
  const init = initialPlan;
  const initDays = init ? daysBetween(init.starts_on, init.ends_on) + 1 : 14;
  const [len, setLen] = useState<Len>(init ? (initDays === 7 ? "w1" : initDays === 14 ? "w2" : initDays === 30 ? "m1" : "custom") : "w2");
  const [start, setStart] = useState(init?.starts_on ?? addDays(today, 1));
  const [end, setEnd] = useState(init?.ends_on ?? addDays(today, 14));
  const [per, setPer] = useState(init?.per_week ?? 4);
  const [goals, setGoals] = useState<string[]>(init?.goals ?? ["sales", "awareness"]);
  const [mix, setMix] = useState<string[]>(init?.mix ?? ["image", "carousel", "video"]);
  const [plats, setPlats] = useState<string[]>(init?.platforms ?? ["instagram", "facebook"]);
  const [notes, setNotes] = useState(init?.notes ?? "");
  const endsOn = len === "custom" ? (end >= start ? end : start) : addDays(start, LEN_DAYS[len] - 1);
  const n = daysBetween(start, endsOn) + 1;
  const need = postsNeeded(n, per), want = ideasToSuggest(need);

  const period = plan ? { from: plan.starts_on, days: Array.from({ length: daysBetween(plan.starts_on, plan.ends_on) + 1 }, (_, i) => addDays(plan.starts_on, i)) } : { from: start, days: [] as string[] };
  const planNeed = plan ? postsNeeded(period.days.length, plan.per_week) : need;
  const accepted = ideas.filter((i) => i.status === "ok" || i.status === "made");
  const dated = accepted.filter((i) => i.scheduled_on).length;
  const made = ideas.filter((i) => i.status === "made").length;

  useEffect(() => { if (shown >= ideas.length) return; const h = setTimeout(() => setShown((s) => s + 1), 160); return () => clearTimeout(h); }, [shown, ideas.length]);
  useEffect(() => { if (!msg) return; const h = setTimeout(() => setMsg(null), 3000); return () => clearTimeout(h); }, [msg]);
  const fail = (e: string) => setMsg(e === "generic" || e === "notFound" ? t("failed") : te(e as "ai_failed"));
  const tog = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  function suggest() {
    if (!goals.length || !mix.length) { setMsg(t("needGoal")); return; }
    startGen(async () => {
      const saved = await savePlan({ id: plan?.id, companyId: brand.id, startsOn: start, endsOn, perWeek: per, goals, mix, platforms: plats, notes });
      if (!saved.ok) return fail(saved.error);
      const kept = ideas.filter((i) => i.status === "ok" || i.status === "made");
      setPlan(saved.value); setIdeas(kept); setShown(kept.length); setPhase("work"); window.scrollTo({ top: 0 });
      const res = await suggestIdeas(saved.value.id, want, true);
      if (!res.ok) return fail(res.error);
      setShown(res.value.filter((i) => i.status !== "new").length); setIdeas(res.value);
      setMsg(t("ready", { n: res.value.filter((i) => i.status === "new").length }));
    });
  }
  function more() { if (!plan) return; startGen(async () => { const before = ideas.length; const res = await suggestIdeas(plan.id, 8, false); if (!res.ok) return fail(res.error); setShown(before); setIdeas(res.value); }); }
  async function act(i: PlanIdea, run: () => Promise<{ ok: true; value: PlanIdea[] } | { ok: false; error: string }>) {
    setBusy(i.id); const res = await run(); setBusy(null);
    if (!res.ok) return fail(res.error);
    const next = res.value.find((x) => x.id === i.id);
    if (next && next.status === "ok" && !i.scheduled_on && next.scheduled_on && next.occasion) setMsg(t("onOccasion", { name: next.occasion }));
    setShown((s) => Math.max(s, res.value.length)); setIdeas(res.value);
  }
  async function place(id: string, day: string | null) {
    const i = ideas.find((x) => x.id === id); if (!i) return;
    await act(i, () => updateIdea(id, { scheduledOn: day }));
    if (day) setMsg(t("inCalendar", { day: dayLabel(day, locale) }));
  }
  const freeDays = (i: PlanIdea) => { const taken = new Set(ideas.filter((x) => x.id !== i.id && x.scheduled_on && (x.status === "ok" || x.status === "made")).map((x) => x.scheduled_on)); return period.days.filter((d) => d === i.scheduled_on || !taken.has(d)); };
  const visible = useMemo(() => ideas.slice(0, shown).filter((i) => filter === "all" || (filter === "ok" ? i.status === "ok" || i.status === "made" : i.status === filter)), [ideas, shown, filter]);
  const madeHref = (i: PlanIdea) => (i.video_id ? `/videos/${i.video_id}` : i.post_id ? `/posts/${i.post_id}` : "/library");
  const workOf = (i: PlanIdea) => works.find((w) => w.id === i.video_id || w.id === i.post_id);
  const chip = (on: boolean, onClick: () => void, children: ReactNode, key: string) => <button key={key} type="button" className="s-chip" aria-pressed={on} onClick={onClick}>{children}</button>;
  const lenLabel = plan ? (() => { const d = period.days.length; return d === 7 ? t("lens.w1") : d === 14 ? t("lens.w2") : d === 30 ? t("lens.m1") : t("lensDays", { n: d }); })() : "";
  const toast = <div className={`s-toast${msg ? " on" : ""}`} role="status">{msg}</div>;

  if (phase === "setup") {
    return (
      <>
        <div className="s-slate-line"><span>CONTENT PLAN</span><i /><span dir="ltr">{brand.latin}</span><i /><span dir="ltr">{dayMono(start)} → {dayMono(endsOn)}</span></div>
        <Rise markup={t.markup("title", { b: (c) => `<b>${c}</b>`, name: escapeMarkup(brand.name) })} />
        <p className="s-lead">{t("lead")}</p>
        <div className="s-grid2">
          <div className="s-stack">
            <div className="s-panel s-slate s-pset">
              <div className="s-clap" aria-hidden="true">{brand.palette.map((h, i) => <i key={`${h}-${i}`} style={{ background: h }} />)}</div>
              <div className="s-slate-body">
                <div className="s-slate-meta"><div><small>CLIENT</small><b>{brand.latin}</b></div><div><small>PERIOD</small><b dir="ltr">{n} DAYS</b></div><div><small>POSTS</small><b>{need}</b></div><div><small>IDEAS</small><b>{want}</b></div></div>
                <p className="s-label">{t("period")}</p>
                <div className="s-chips">{(["w1", "w2", "m1", "custom"] as const).map((l) => chip(len === l, () => { setLen(l); if (l === "custom" && end <= start) setEnd(addDays(start, 9)); }, t(`lens.${l}`), l))}</div>
                <div className="s-dates">
                  <label>{t("from")} <input type="date" value={start} min={today} onChange={(e) => e.target.value && setStart(e.target.value < today ? today : e.target.value)} /></label>
                  {len === "custom" ? <label>{t("to")} <input type="date" value={end} min={start} onChange={(e) => e.target.value && setEnd(e.target.value)} /></label> : null}
                </div>
                <p className="s-label" style={{ marginTop: 18 }}>{t("perWeek")}</p>
                <div className="s-chips">{[3, 4, 5, 7].map((v) => chip(per === v, () => setPer(v), v === 7 ? t("daily") : t("times", { n: v }), String(v)))}</div>
                <p className="s-label">{t("goal")}</p>
                <div className="s-chips">{PLAN_GOALS.map((g) => chip(goals.includes(g), () => setGoals(tog(goals, g)), t(`goals.${g}`), g))}</div>
                <p className="s-label">{t("kinds")}</p>
                <div className="s-chips">{KINDS.map((k) => chip(mix.includes(k), () => setMix(tog(mix, k)), <><KindIcon k={k} />{tk(k)}</>, k))}</div>
                <p className="s-label">{t("platforms")}</p>
                <div className="s-chips">{PLATFORMS.map((p) => chip(plats.includes(p), () => setPlats(tog(plats, p)), <><PlatformIcon p={p} />{tp(p)}</>, p))}</div>
                <label className="s-label" htmlFor="p-notes" style={{ marginTop: 18 }}>{t("notes")}</label>
                <textarea id="p-notes" className="s-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder={t("notesPh")} />
              </div>
            </div>
          </div>
          <aside className="s-sum">
            <p className="s-label">{t("summary")}</p>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>{brand.mark}<b style={{ fontSize: 17 }}>{brand.name}</b></div>
            <div className="rowx"><span>{t("period")}</span><b>{t("days", { n })}</b></div>
            <div className="rowx"><span>{t("from")}</span><b dir="ltr">{dayMono(start)}</b></div>
            <div className="rowx"><span>{t("to")}</span><b dir="ltr">{dayMono(endsOn)}</b></div>
            <div className="rowx"><span>{t("postsNeeded")}</span><b>{need}</b></div>
            <p className="fine" style={{ marginTop: 16 }}>{t("weSuggest")}</p>
            <div className="big-n">{want}</div>
            <p className="fine">{t("ideasNote")}</p>
            <button type="button" className="go" onClick={suggest} disabled={gen}>{t("suggest")}</button>
            <p className="fine" style={{ marginTop: 8 }} dir="auto">{t("ideasCost", { price: ideasCost })}</p>
          </aside>
        </div>
        {toast}
      </>
    );
  }

  const cnt = (f: typeof filter) => ideas.filter((i) => f === "all" || (f === "ok" ? i.status === "ok" || i.status === "made" : i.status === f)).length;
  return (
    <>
      <div className="s-slate-line"><span className="live"><span className="s-dot" />CONTENT PLAN</span><i /><span dir="ltr">{dayMono(period.days[0])} → {dayMono(period.days.at(-1)!)}</span><i /><span dir="ltr">{brand.latin}</span></div>
      <div className="s-row" style={{ alignItems: "flex-end", marginBottom: 18 }}>
        <Rise markup={t.markup("workTitle", { b: (c) => `<b>${c}</b>`, name: escapeMarkup(brand.name), len: lenLabel })} style={{ margin: 0 }} />
        <div className="s-chips">
          <button type="button" className="s-btn ghost small" onClick={() => setPhase("setup")}>{t("edit")}</button>
          <button type="button" className="s-btn ghost small" onClick={more} disabled={gen} title={t("ideasCost", { price: ideasCost })}>{t("more")} <small dir="ltr">~{ideasCost}</small></button>
          <button type="button" className="s-btn lit small" onClick={async () => { if (!plan) return; const r = await autoAssign(plan.id); if (!r.ok) return fail(r.error); setIdeas(r.value.ideas); setMsg(r.value.placed ? t("placed", { n: r.value.placed }) : t("nothingToPlace")); }}>{t("auto")}</button>
        </div>
      </div>
      <div className="s-panel s-pbar">
        <div className="s-pstat"><b>{accepted.length}<small style={{ fontSize: 14, color: "var(--s-muted)" }}>/{planNeed}</small></b><span>{t("accepted")}</span></div>
        <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={planNeed} aria-valuenow={accepted.length}><i style={{ width: `${Math.min(100, (accepted.length / planNeed) * 100)}%` }} /></div>
        <div className="s-pstat"><b>{dated}</b><span>{t("inCal")}</span></div>
        <div className="s-pstat"><b>{made}</b><span>{t("made")}</span></div>
        {gen || shown < ideas.length ? <div className="s-thinking"><span className="s-dot" />{t("thinking", { name: brand.name })}{ideas.length ? ` ${Math.min(shown, ideas.length)}/${ideas.length}` : ""}</div> : null}
      </div>
      <div className="s-grid2 s-plan-grid">
        <div className="s-stack">
          <div className="s-chips">{(["all", "new", "ok", "no"] as const).map((f) => <button key={f} type="button" className="s-chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>{t(`f.${f}`)} <span className="s-num" style={{ opacity: 0.6 }}>{cnt(f)}</span></button>)}</div>
          <div className="s-ideas">
            {visible.map((i) => {
              const nIdx = ideas.indexOf(i) + 1, w = workOf(i);
              const cls = i.status === "ok" ? " ok" : i.status === "no" ? " out" : i.status === "made" ? " made" : "";
              return (
                <article key={i.id} className={`s-idea${cls}${busy === i.id ? " busy" : ""}${dragId === i.id ? " dragging" : ""}`} draggable={i.status === "ok"} onDragStart={(e) => { setDragId(i.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", i.id); }} onDragEnd={() => { setDragId(null); setOver(null); }}>
                  <span className="no">{String(nIdx).padStart(2, "0")}</span>
                  {i.status === "ok" ? <span className="badge">{i.scheduled_on ? t("badgeDated") : t("badgeOk")}</span> : i.status === "made" ? <span className="badge">{t("badgeMade")}</span> : null}
                  <div className="top"><span className="ang">{i.angle}</span><span className="kd"><KindIcon k={i.kind} size={12} />{tk(i.kind)}</span>{i.occasion ? <span className="occ">{i.occasion}</span> : null}</div>
                  {i.status === "made" && w?.thumb ? <div className="thumb" style={{ backgroundImage: `url(${w.thumb})` }} /> : null}
                  <h4 dir="auto">{i.title}</h4>
                  <p className="why" dir="auto">{i.why}</p>
                  {i.status === "no" ? null : <div className="meta2"><span>{t("opens")} <q dir="auto">{i.hook.slice(0, 60)}{i.hook.length > 60 ? "…" : ""}</q></span><span>{t("best")} <b>{best(i)}</b>{i.scheduled_on ? <> · <b>{dayLabel(i.scheduled_on, locale)}</b></> : null}</span></div>}
                  <div className="pl">{i.platforms.map((p) => <PlatformIcon key={p} p={p} />)}</div>
                  <div className="acts">
                    {i.status === "new" ? (
                      <>
                        <button type="button" className="s-btn lit small" onClick={() => act(i, () => updateIdea(i.id, { status: "ok" }))}>{t("accept")}</button>
                        <button type="button" className="s-btn ghost small" onClick={() => act(i, () => swapIdea(i.id))}>{t("swap")}</button>
                        <button type="button" className="s-btn ghost small" aria-label={t("reject")} onClick={() => act(i, () => updateIdea(i.id, { status: "no" }))}>✕</button>
                      </>
                    ) : i.status === "no" ? (
                      <button type="button" className="s-btn ghost small" onClick={() => act(i, () => updateIdea(i.id, { status: "new" }))}>{t("undo")}</button>
                    ) : i.status === "made" ? (
                      <><Link href={madeHref(i)} className="s-btn small">{t("open")}</Link>{i.scheduled_on ? <span className="s-mono" style={{ fontSize: 10.5, color: "var(--s-muted)" }} dir="ltr">{dayMono(i.scheduled_on)}</span> : null}</>
                    ) : (
                      <>
                        <select aria-label={t("pickDay")} value={i.scheduled_on ?? ""} onChange={(e) => place(i.id, e.target.value || null)}>
                          <option value="">{i.scheduled_on ? t("noDay") : t("pickDay")}</option>
                          {freeDays(i).map((d) => <option key={d} value={d}>{dayLabel(d, locale)}</option>)}
                        </select>
                        {i.scheduled_on ? <button type="button" className="s-btn lit small" onClick={async () => { setBusy(i.id); const r = await makeIdea(i, brand); setBusy(null); if (r?.error || r?.aiError) setMsg(t("failed")); }}>{t("make")}</button> : null}
                        <button type="button" className="s-btn ghost small" aria-label={t("unaccept")} onClick={() => act(i, () => updateIdea(i.id, { status: "new" }))}>✕</button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
        <aside className="s-panel s-days-panel">
          <p className="s-label">{t("daysTitle")}</p>
          <div className="s-days">
            {period.days.map((d) => {
              const its = works.filter((w) => w.day === d && w.scheduled), ids = ideas.filter((i) => i.scheduled_on === d && i.status === "ok");
              return (
                <div key={d} className={`s-dayrow${over === d ? " over" : ""}`} onDragOver={(e) => { if (!dragId) return; e.preventDefault(); setOver(d); }} onDragLeave={() => setOver((o) => (o === d ? null : o))} onDrop={(e) => { e.preventDefault(); const id = dragId; setDragId(null); setOver(null); if (id) place(id, d); }}>
                  <div><span className="dn">{WEEKDAY_MONO[weekday(d)]}</span><b>{d.slice(8)}</b></div>
                  <div className="its">
                    {its.map((w) => <Link key={w.id} href={w.href} className={`s-clip${w.kind === "video" ? " v" : ""}`} dir="auto">{w.kind === "video" ? "▶" : "▣"} {w.title}</Link>)}
                    {ids.map((i) => <PlanCard key={i.id} idea={i} onOpen={() => setFilter("ok")} onMake={() => makeIdea(i, brand)} onDragStart={(e) => { setDragId(i.id); e.dataTransfer.setData("text/plain", i.id); }} />)}
                    {!its.length && !ids.length ? <span className="empty">{t("empty")}</span> : null}
                  </div>
                </div>
              );
            })}
          </div>
          <Link href="/calendar" className="s-btn ghost small">{t("fullCal")}</Link>
        </aside>
      </div>
      {toast}
    </>
  );
}

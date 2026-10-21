"use client";

// The live creation screen for a video — the posts creating studio (pst-*) in motion: each step lights up when the
// job reaches it, and what the director does appears as it happens (reading the brand, watching the real screens,
// the storyboard, building scenes, looking at frames, the music, the check, the export). Driven by the job's stage
// and its log, read on the server — nothing here is on a timer except the animation itself.
import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Heading, boldTag } from "@/components/heading";
import type { VideoEvent, VideoProgress } from "@/lib/live-engine/server/video-progress";
import type { BrandColor } from "@/lib/types";

// the director's real order: it reads the brand, plans, sets the music, then builds the scenes on it
const STEPS = ["brand", "idea", "music", "scenes", "check", "export"] as const;
const DUR = [40, 60, 30, 180, 60, 90];
const STEP_OF: Record<string, number> = { capture: 0, profile: 0, script: 1, music: 2, build: 3, qa: 4, render: 5 };
const GEN_OF: Record<string, number> = { queued: 0, awaiting_code: 0, plan: 1, music: 2, spec: 3, ready: 5, done: 6 };

export type CreatingBrand = { name: string; colors: BrandColor[]; logoUrl: string | null; logoOnDark: boolean | null; screens: string[] };

export function CreatingVideo({ title, format, lengthS, generation, progress, brand, edit, codeForm }: { title: string; format: string; lengthS: number; generation: Record<string, unknown> | null; progress: VideoProgress | null; brand: CreatingBrand; edit: boolean; codeForm: ReactNode }) {
  const t = useTranslations("videoStudio");
  const stage = String(generation?.stage ?? "queued");
  const first = Boolean(generation?.first);
  const ev = progress?.events ?? [];
  const has = (k: VideoEvent["k"]) => ev.some((e) => e.k === k);
  const last = <K extends VideoEvent["k"]>(k: K) => ev.findLast((e) => e.k === k) as Extract<VideoEvent, { k: K }> | undefined;
  // the step reached: the job's own step when known, else the video's stage; it never goes back
  const reachedNow = Math.max(progress?.step ? STEP_OF[progress.step] ?? 0 : 0, GEN_OF[stage] ?? 0, has("storyboard") ? 3 : has("music") ? 2 : has("plan") ? 1 : 0, has("render") ? 5 : 0);
  const [reached, setReached] = useState(reachedNow);
  if (reachedNow > reached) setReached(reachedNow);
  const current = Math.min(reached, STEPS.length - 1);
  const state = (i: number) => (reached >= 6 || i < current || (i === 0 && !first && current > 0) ? "done" : i === current ? "active" : "pending");

  const palette = brand.colors.map((c) => c.hex).filter((h) => /^#[0-9a-f]{6}$/i.test(h));
  const storyboard = last("storyboard");
  const builds = last("build")?.n ?? 0, snaps = last("snapshot")?.n ?? 0;
  const [w, h] = format === "16:9" ? [16, 9] : format === "1:1" ? [1, 1] : [9, 16];

  // the clock and the cost, ticking
  const started = progress?.startedAt ? new Date(progress.startedAt).getTime() : null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 100); return () => clearInterval(iv); }, []);
  const target = progress?.cost ?? 0;
  const [cost, setCost] = useState(target);
  useEffect(() => { const iv = setInterval(() => setCost((c) => (Math.abs(target - c) < 0.0005 ? target : c + (target - c) * 0.15)), 60); return () => clearInterval(iv); }, [target]);

  // the brand's real screens become the scenes: one after another while the director works on them
  const screens = brand.screens.length ? brand.screens : [];
  const filming = current >= 1 && screens.length > 0;
  const [shot, setShot] = useState(0);
  useEffect(() => { if (!filming) return; const iv = setInterval(() => setShot((s) => s + 1), 3200); return () => clearInterval(iv); }, [filming]);
  // a white flash for every look at the frames
  const [flash, setFlash] = useState(0);
  const [seenSnaps, setSeenSnaps] = useState(snaps);
  if (snaps > seenSnaps) { setSeenSnaps(snaps); setFlash((f) => f + 1); }
  // the export: frames counted up while it renders
  const total = lengthS * 30;
  const [renderStart, setRenderStart] = useState<number | null>(null);
  if (current === 5 && renderStart == null) setRenderStart(now);
  const frames = renderStart ? Math.min(total - 1, Math.round(((now - renderStart) / 1000 / Math.max(30, lengthS * 2.2)) * total)) : 0;

  const scenes = storyboard?.scenes ?? 0;
  const sceneNo = scenes ? (shot % scenes) + 1 : 0;
  const forming = ["pst-forming", "pst-v", palette.length ? "pst-palette" : "", brand.logoUrl ? "pst-logo" : "", filming ? "pst-film" : "", current === 3 ? "pst-working" : "", current >= 2 ? "pst-music" : ""].join(" ");

  // the feed, newest first
  const events: ReactNode[] = [];
  events.push(
    <Event key="start" icon="◐" ok={current > 0}>
      <p>{t.rich(stage === "queued" && !first ? "starting" : first && current === 0 ? "capture" : "brandKnown", { ...boldTag, name: brand.name })}</p>
      <div className="pst-swatchRow">{palette.map((v, i) => <i key={`${v}-${i}`} style={{ background: v, animation: `pst-pop .4s ${i * 0.12}s both` }} />)}</div>
      {current === 0 ? <span className="pst-dots" aria-hidden="true"><i /><i /><i /></span> : null}
      {stage === "awaiting_code" ? codeForm : null}
    </Event>,
  );
  ev.forEach((e, i) => {
    const key = `${e.k}-${i}`;
    if (e.k === "explore") events.push(<Event key={key} icon="◉"><p>{t.rich("explore", { ...boldTag, n: e.n })}</p><div className="pst-thumbs">{screens.slice(0, 6).map((s, j) => <i key={s} style={{ backgroundImage: `url(${JSON.stringify(s)})`, animationDelay: `${j * 0.1}s` }} />)}</div></Event>);
    else if (e.k === "plan") events.push(<Event key={key} icon="✎"><p>{t.rich("plan", boldTag)}</p><div className="pst-cap" dir="auto"><Type text={title} speed={45} /></div></Event>);
    else if (e.k === "storyboard") events.push(<Event key={key} icon="▦" ok><p>{t.rich("storyboard", { ...boldTag, n: e.scenes, mood: e.mood })}</p></Event>);
    else if (e.k === "clip") events.push(<Event key={key} icon="✂"><p>{t.rich("clip", boldTag)}</p></Event>);
    else if (e.k === "build") events.push(<Event key={key} icon="✦"><p>{t.rich("build", { ...boldTag, n: e.n })}</p></Event>);
    else if (e.k === "snapshot") events.push(<Event key={key} icon="◎"><p>{t.rich("snapshot", { ...boldTag, n: e.n })}</p></Event>);
    else if (e.k === "music") events.push(<Event key={key} icon="♪" ok><p>{t.rich("music", { ...boldTag, mood: e.mood })}</p>{e.bpm ? <small dir="ltr">{t("bpm", { n: e.bpm })}</small> : null}</Event>);
    else if (e.k === "check") events.push(<Event key={key} icon="⌕" ok={e.errors === 0}><p>{t.rich("check", boldTag)}</p>{e.errors != null ? <small>{e.errors === 0 ? t("checkOk") : t("checkFix", { n: e.errors })}</small> : <span className="pst-dots" aria-hidden="true"><i /><i /><i /></span>}</Event>);
    else if (e.k === "retry") events.push(<Event key={key} icon="↻"><p>{t("retry")}</p></Event>);
    else if (e.k === "render") events.push(<Event key={key} icon="▶"><p>{t.rich("render", boldTag)}</p><small dir="ltr" className="s-num">{t("frames", { n: frames, total })}</small></Event>);
    else if (e.k === "finish") events.push(<Event key={key} icon="✓" ok><p>{t.rich("finish", boldTag)}</p></Event>);
  });

  return (
    <div>
      <Heading as="h1" className="mt-2 text-3xl sm:text-4xl">{t.rich(edit ? "titleEdit" : "title", boldTag)}</Heading>
      <p className="mt-2 mb-5 leading-relaxed text-ink-2">{t("sub")}</p>
      <div className="pst-rail">
        {STEPS.map((s, i) => (
          <div key={s} className={`pst-step ${state(i) === "active" ? "pst-active" : state(i) === "done" ? "pst-done" : ""}`} style={{ ["--dur" as string]: `${DUR[i]}s` }}>
            <span>{t(`stepsSub.${s}`)}</span>
            <b>{t(`steps.${s}`)}</b>
            <span className="pst-bar" />
          </div>
        ))}
      </div>
      <div className="pst-studio">
        <div className="pst-stageCard">
          <div className="pst-canvasWrap">
            <div className={forming} style={{ ["--ar" as string]: `${w} / ${h}`, ["--w" as string]: w > h ? "520px" : w === h ? "400px" : "300px" }}>
              <div className="pst-swatches">{palette.map((v, i) => <i key={`${v}-${i}`} style={{ background: v }} />)}</div>
              <div className="pst-scenes" aria-hidden="true">{screens.map((s, i) => <i key={s} className={filming && i === shot % screens.length ? "on" : ""} style={{ backgroundImage: `url(${JSON.stringify(s)})` }} />)}</div>
              {scenes && current >= 3 ? <span className="pst-sceneNo">{t("scene", { n: sceneNo, total: scenes })}</span> : null}
              <div className="pst-sweep" />
              <div className={`pst-logoIn ${brand.logoOnDark ? "pst-dark" : ""}`}>
                {brand.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a signed storage URL
                  <img src={brand.logoUrl} alt="" />
                ) : null}
              </div>
              <div className="pst-head" dir="auto">{current >= 1 ? <Type text={title} speed={60} delay={300} /> : null}</div>
              <div className="pst-eq" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ animationDelay: `${(i * 0.13) % 1}s`, animationDuration: `${0.6 + ((i * 7) % 5) / 10}s` }} />)}</div>
              {current === 5 ? <div className="pst-render"><i style={{ width: `${(frames / total) * 100}%` }} /></div> : null}
              <div key={flash} className={`pst-flash${flash ? " go" : ""}`} />
            </div>
          </div>
          {scenes ? (
            <div className="pst-strip" aria-hidden="true">
              {Array.from({ length: scenes }, (_, i) => <span key={i} className={current >= 3 && i === (builds + shot) % scenes ? "lit" : ""} style={screens.length ? { backgroundImage: `url(${JSON.stringify(screens[i % screens.length])})` } : undefined}><b>{String(i + 1).padStart(2, "0")}</b></span>)}
            </div>
          ) : null}
          <div className="pst-meters">
            <div className="pst-meter"><span>{t("time")}</span><b>{t("seconds", { n: started ? ((now - started) / 1000).toFixed(1) : "0.0" })}</b></div>
            <div className="pst-meter"><span>{t("cost")}</span><b dir="ltr">${cost.toFixed(3)}</b></div>
            <div className="pst-meter"><span>{t("step")}</span><b style={{ fontSize: 15 }}>{stage === "queued" && !progress ? t("queued") : t(`steps.${STEPS[current]}`)}</b></div>
          </div>
        </div>
        <div className="pst-feed" aria-live="polite">{events.reverse()}</div>
      </div>
    </div>
  );
}

function Event({ icon, ok, children }: { icon: string; ok?: boolean; children: ReactNode }) {
  return (
    <div className={`pst-event ${ok ? "pst-ok" : ""}`}>
      <span className="pst-dot">{icon}</span>
      <div>{children}</div>
    </div>
  );
}

/** text typed out once (it never restarts when the page polls) */
function Type({ text, speed = 38, delay = 0 }: { text: string; speed?: number; delay?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let i = 0, iv: ReturnType<typeof setInterval> | undefined;
    const to = setTimeout(() => { iv = setInterval(() => { i += 1; setN(i); if (i >= text.length && iv) clearInterval(iv); }, speed); }, delay);
    return () => { clearTimeout(to); if (iv) clearInterval(iv); };
  }, [text, speed, delay]);
  return <span className={n < text.length ? "pst-caret" : undefined}>{text.slice(0, n)}</span>;
}

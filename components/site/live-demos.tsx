"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import gsap from "gsap";
import { Heading, boldTag } from "@/components/heading";
import { SpinnerIcon, SparkIcon, ArrowIcon } from "@/components/icons";
import { KindIcon, PlatformIcon } from "@/components/studio/platform-icon";
import { CreatedBrandFiles } from "@/components/studio/created-brand";
import { TabBar } from "@/components/studio/nav";
import { CreatingStudio } from "@/app/[locale]/(app)/posts/[id]/creating-studio";
import { PlatformPreview } from "@/app/[locale]/(app)/posts/[id]/platform-preview";
import { CreatingVideo } from "@/app/[locale]/(app)/videos/[id]/creating-video";
import { Preview } from "@/app/[locale]/(app)/companies/create/brand-preview";
import { BRAND_LANGUAGES, type BrandLanguage, type Direction } from "@/lib/brand-studio/types";
import type { VideoEvent, VideoProgress } from "@/lib/live-engine/server/video-progress";

// The homepage's phones: the app's own screens (the same components and classes a customer sees), at phone width, played
// by a script instead of a job. Everything on screen comes from the time `s`; the brand and its pictures are a real output
// of the brand creator for an invented bakery.

export type LiveText = {
  brand: { business: string; turns: { q: string; options: string[]; a: string }[]; concepts: [string, string]; notes: string; world: string[] };
  post: { brief: string; title: string; headline: string; texts: { instagram: string; facebook: string; x: string }; tags: string[] };
  video: { brief: string; title: string; mood: string };
  name: string;
};

const A = "/site/demo/";
const COLORS = ["#B5483A", "#E8B04B", "#3A2420", "#8C6E63", "#FBF3E8", "#F3E3D0"].map((hex) => ({ hex }));
const LOGO = `${A}logo.png`;
const page = (...images: string[]) => `<!doctype html><body style="margin:0;background:#fff">${images.map((i) => `<img src="${A}${i}" style="display:block;width:100%">`).join("")}</body>`;
const TETA: Direction = { name: "Teta's Table", name_ar: "سفرة تيتا", tagline: "", concept: "", palette: { primary: "#B5483A", accent: "#E8B04B", ink: "#3A2420", muted: "#8C6E63", background: "#FBF3E8", surface: "#F3E3D0" }, fonts: { display: "Fraunces", body: "DM Sans", arabic_display: "Aref Ruqaa", arabic_body: "IBM Plex Sans Arabic" }, icon: '<rect x="10" y="60" width="80" height="12" fill="P"/><rect x="20" y="38" width="60" height="22" fill="A"/><rect x="28" y="72" width="8" height="20" fill="P"/><rect x="64" y="72" width="8" height="20" fill="P"/><rect x="48" y="18" width="4" height="20" fill="P"/><circle cx="50" cy="14" r="6" fill="P"/>', headline: "", cta: "", radius: 14, scene: "" };
const CRUMB: Direction = { name: "Maadi Crumb", name_ar: "فتفوتة", tagline: "", concept: "", palette: { primary: "#2F6B5A", accent: "#F2A58E", ink: "#1F2E29", muted: "#6B8179", background: "#F7F4EC", surface: "#E5EDE3" }, fonts: { display: "Bricolage Grotesque", body: "Nunito", arabic_display: "Lemonada", arabic_body: "Almarai" }, icon: '<path d="M12 80 L12 50 Q50 20 88 50 L88 80 Z" fill="P"/><circle cx="34" cy="58" r="5" fill="A"/><circle cx="54" cy="48" r="5" fill="A"/><circle cx="70" cy="64" r="5" fill="A"/><circle cx="44" cy="72" r="4" fill="A"/>', headline: "", cta: "", radius: 24, scene: "" };

/** where an element sits in the page, whatever the phone's tilt and scale */
function topOf(el: HTMLElement, page: HTMLElement) {
  let top = 0, left = 0, e: HTMLElement | null = el;
  while (e && e !== page) { top += e.offsetTop; left += e.offsetLeft; e = e.offsetParent as HTMLElement | null; }
  return { top, left };
}

type Cue = [number, string | 0];
/** one phone: a 390-wide screen scaled to fit, its clock, and the finger that scrolls and taps */
function Live({ total, scrolls, taps, children }: { total: number; scrolls: Cue[]; taps: [number, string][]; children: (s: number, now: number) => ReactNode }) {
  const root = useRef<HTMLDivElement>(null), body = useRef<HTMLDivElement>(null), dot = useRef<HTMLElement>(null);
  const [box, setBox] = useState({ z: 0.7, h: 800 });
  const [clock, setClock] = useState({ s: 0, run: 0, now: 0 });
  const seen = useRef(-1);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ro = new ResizeObserver(() => { const z = el.clientWidth / 390; if (z) setBox({ z, h: el.clientHeight / z }); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setClock({ s: total - 0.1, run: 0, now: Date.now() }); return; } // eslint-disable-line react-hooks/set-state-in-effect -- only the browser knows this
    let on = false;
    const io = new IntersectionObserver(([e]) => { on = e.isIntersecting; }, { threshold: 0.1 });
    io.observe(el);
    const iv = setInterval(() => { if (on && !document.hidden) { const now = Date.now(); setClock((c) => (c.s + 0.1 >= total ? { s: 0, run: c.run + 1, now } : { ...c, s: c.s + 0.1, now })); }; }, 100);
    return () => { clearInterval(iv); io.disconnect(); };
  }, [total]);

  useEffect(() => {
    const b = body.current, d = dot.current;
    if (!b || !d) return;
    if (clock.s < seen.current) { seen.current = -1; gsap.set(b, { y: 0 }); }
    const crossed = (at: number) => at > seen.current && at <= clock.s;
    for (const [at, what] of scrolls) {
      if (!crossed(at)) continue;
      const el = what ? b.querySelector<HTMLElement>(what) : null;
      const y = el ? topOf(el, b).top - 12 : 0;
      gsap.to(b, { y: -Math.max(0, Math.min(y, b.offsetHeight - box.h)), duration: 0.7, ease: "power2.inOut", overwrite: true });
    }
    for (const [at, what] of taps) {
      if (!crossed(at)) continue;
      const el = b.querySelector<HTMLElement>(what);
      if (!el) continue;
      const { top, left } = topOf(el, b), y = Number(gsap.getProperty(b, "y"));
      gsap.fromTo(d, { x: left + el.offsetWidth / 2 - 21, y: top + el.offsetHeight / 2 + y - 21, scale: 1.5, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.22, ease: "power2.out" });
      gsap.to(d, { scale: 1.8, autoAlpha: 0, duration: 0.3, delay: 0.3 });
      gsap.fromTo(el, { scale: 1 }, { scale: 0.96, duration: 0.1, yoyo: true, repeat: 1, delay: 0.14, clearProps: "scale" });
    }
    seen.current = clock.s;
  }, [clock.s, box.h, scrolls, taps]);

  return (
    <div ref={root} className="d-live" inert>
      <div className="d-live-z" style={{ transform: `scale(${box.z})`, height: box.h }}>
        <div ref={body} className="d-live-y"><div key={clock.run} className="d-live-page">{children(clock.s, clock.now)}</div></div>
        <TabBar />
        <i ref={dot} className="d-tap" />
      </div>
    </div>
  );
}

const typed = (text: string, s: number, from: number, to: number) => { const c = Array.from(text); return c.slice(0, Math.round(c.length * Math.max(0, Math.min(1, (s - from) / (to - from))))).join(""); };
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const Top = ({ name }: { name: string }) => <div className="d-live-top">
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img src={LOGO} alt="" /><b dir="auto">{name}</b></div>;

/** the create screen as the customer fills it in */
function Form({ kind, name, brief, price, currency }: { kind: "video" | "image"; name: string; brief: string; price: string; currency: string }) {
  const t = useTranslations("create"), tg = useTranslations("goals"), td = useTranslations("dialects"), tp = useTranslations("posts.platform");
  const video = kind === "video";
  const chip = (on: boolean, children: ReactNode, key: string) => <span key={key} className="s-chip" aria-pressed={on}>{children}</span>;
  return (
    <div className="s-grid2">
      <Heading as="h1" className="text-3xl">{t.rich("title", { ...boldTag, name })}</Heading>
      <div className="s-stack">
        <div className="s-panel">
          <p className="s-label">{t("what")}</p>
          <div className="s-types">
            {(["video", "image", "carousel", "story"] as const).map((k) => { const [label, desc] = t.raw(`types.${k}`) as [string, string]; return (
              <div key={k} data-k={k} className="s-type" role="radio" aria-checked={kind === k}><span className="ico"><KindIcon k={k} size={22} /></span><b>{label}</b><small>{desc}</small></div>
            ); })}
          </div>
        </div>
        <div className="s-panel">
          {video ? (
            <>
              <div className="s-opt"><p className="s-label">{t("size")}</p><div className="s-chips">{["9:16", "4:5", "1:1", "16:9"].map((f) => chip(f === "9:16", <span dir="ltr">{f}</span>, f))}</div></div>
              <div className="s-opt"><p className="s-label">{t("length")}</p><div className="s-chips">{[15, 30, 60].map((n) => chip(n === 30, t("seconds", { n }), String(n)))}</div></div>
              <div className="s-opt"><p className="s-label">{t("goal")}</p><div className="s-chips">{(["sell", "launch"] as const).map((g) => chip(g === "sell", tg(g), g))}</div></div>
            </>
          ) : (
            <div className="s-opt"><p className="s-label">{t("platforms")}</p><div className="s-chips">{(["instagram", "facebook", "x"] as const).map((p) => chip(true, <><PlatformIcon p={p} size={15} />{tp(p)}</>, p))}</div></div>
          )}
          <div className="s-opt"><p className="s-label">{t("dialect")}</p><div className="s-chips">{chip(true, td("eg"), "e")}</div></div>
        </div>
        <div className="s-panel d-brief">
          <label className="s-label">{t("brief")}</label>
          <textarea className="s-textarea" readOnly dir="auto" value={brief} placeholder={t("briefPlaceholder")} />
        </div>
      </div>
      <aside className="s-sum">
        <p className="s-label">{t("summary")}</p>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}><b style={{ fontSize: 17 }} dir="auto">{name}</b></div>
        <div className="tags"><span>{(t.raw(`types.${kind}`) as [string, string])[0]}</span>{video ? <span dir="ltr">9:16 · 30S</span> : <><span>INSTAGRAM</span><span>FACEBOOK</span><span>X</span></>}<span>{td("eg")}</span></div>
        <div className="fine">{t("priceAt", { currency })}</div>
        <div className="price" dir="ltr" style={{ textAlign: "start" }}><small>~</small>{price}</div>
        <button type="button" className="go">{t("go")}</button>
      </aside>
    </div>
  );
}

const money = (v: number) => `EGP ${v.toFixed(v < 10 ? 2 : 1)}`;

const POST = { go: 8.4, done: 27 };
const POST_SCROLLS: Cue[] = [[0, 0], [2.4, ".d-brief"], [6.6, ".s-sum"], [POST.go, 0], [POST.go + 1, ".pst-stageCard"], [POST.go + 3.4, ".pst-feed"], [POST.go + 9.2, ".pst-stageCard"], [POST.go + 15, ".pst-feed"], [POST.done, 0]];
const POST_TAPS: [number, string][] = [[1, "[data-k=image]"], [7.5, ".go"]];

/** a first post: the real create form, the real creating studio, the real preview */
export function LivePost({ t, price }: { t: LiveText; price: number }) {
  return <Live total={POST.done + 6} scrolls={POST_SCROLLS} taps={POST_TAPS}>{(s, now) => <PostRun t={t} price={price} s={s} now={now} />}</Live>;
}
function PostRun({ t, price, s, now }: { t: LiveText; price: number; s: number; now: number }) {
  const ts = useTranslations("posts.studio"), tp = useTranslations("posts.platform");
  const brand = { name: t.name, logoUrl: LOGO, logoOnDark: false, colors: COLORS, site: "tetastable.com" };
  if (s < POST.go) return <><Top name={t.name} /><Form kind={s < 1.1 ? "video" : "image"} name={t.name} brief={typed(t.post.brief, s, 3.2, 6.2)} price={String(price)} currency="EGP" /></>;
  if (s >= POST.done) return (
    <>
      <Top name={t.name} />
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <Heading as="h1" className="text-3xl">{t.post.title}</Heading>
        <span className="rounded-full bg-success-bg px-3 py-1.5 text-xs font-semibold text-success-ink">● {ts("readyChip")}</span>
      </div>
      <p className="mt-2 text-ink-2">{ts.rich("ready", { ...boldTag, n: 58 })}</p>
      <div className="mt-3 mb-3 flex flex-wrap gap-2">{(["instagram", "facebook", "x"] as const).map((p) => <span key={p} className="chip chip-white" aria-pressed={p === "instagram"}>{tp(p)}</span>)}</div>
      <PlatformPreview platform="instagram" device="mobile" image={`${A}post.jpg`} text={t.post.texts.instagram} hashtags={t.post.tags} brand={brand} />
    </>
  );
  const r = s - POST.go;
  const stage = r < 1 ? "queued" : r < 3 ? "brand" : r < 7 ? "write" : r < 9 ? "format" : r < 13 ? "image" : r < 15 ? "check" : "sizes";
  const progress: Record<string, unknown> = {};
  if (r >= 3) progress.brand = { palette: { primary: "#B5483A", accent: "#E8B04B", ink: "#3A2420", background: "#FBF3E8", surface: "#F3E3D0" }, display: "Fraunces", theme: "light" };
  if (r >= 3.6) progress.write = { headline: t.post.headline, texts: t.post.texts };
  if (r >= 7) progress.format = { format: "product_in_use", recent: ["people_moment", "typographic", "place_scene"] };
  if (r >= 12) progress.image = [{ path: "x" }];
  if (r >= 14.4) progress.check = [{ ok: true, problems: [], attempt: 0 }];
  if (r >= 16.4) progress.sizes = { sizes: { "4:5": [1080, 1350], "16:9": [1600, 900] } };
  const generation = { stage, started_at: new Date(now - r * 3200).toISOString(), cost_usd: price * clamp01(r / 16) ** 1.4, progress };
  return <><Top name={t.name} /><CreatingStudio money={money} generation={generation} imageUrl={progress.image ? `${A}post.jpg` : null} brand={brand} platforms={["instagram", "facebook", "x"]} change={false} onCancel={() => {}} cancelling={false} /></>;
}

const VIDEO = { go: 8.4, done: 31 };
const VIDEO_SCROLLS: Cue[] = [[0, 0], [2.4, ".d-brief"], [6.6, ".s-sum"], [VIDEO.go, 0], [VIDEO.go + 1, ".pst-feed"], [VIDEO.go + 8, ".pst-stageCard"], [VIDEO.go + 15, ".pst-feed"], [VIDEO.go + 18.4, ".pst-stageCard"], [VIDEO.done, 0]];
const VIDEO_TAPS: [number, string][] = [[1, "[data-k=video]"], [7.5, ".go"]];
const SCREENS = ["site-hero.jpg", "site-cakes.jpg", "site-sofra.jpg", "storefront.jpg", "packaging.jpg", "site-order.jpg"].map((f) => `${A}${f}`);

/** a first video: the real create form, the director's real run (its own log, replayed), then the film */
export function LiveVideo({ t }: { t: LiveText }) {
  return <Live total={VIDEO.done + 6} scrolls={VIDEO_SCROLLS} taps={VIDEO_TAPS}>{(s, now) => <VideoRun t={t} s={s} now={now} />}</Live>;
}
function VideoRun({ t, s, now }: { t: LiveText; s: number; now: number }) {
  const ts = useTranslations("videoStudio");
  if (s < VIDEO.go) return <><Top name={t.name} /><Form kind={s < 1.1 ? "image" : "video"} name={t.name} brief={typed(t.video.brief, s, 3.2, 6.2)} price="50–200" currency="EGP" /></>;
  if (s >= VIDEO.done) {
    const r = s - VIDEO.done, shot = Math.floor(r / 1.3) % SCREENS.length;
    return (
      <>
        <Top name={t.name} />
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3"><Heading as="h1" className="text-3xl">{t.video.title}</Heading></div>
        <p className="mt-2 mb-3 text-ink-2">{ts.rich("finish", boldTag)}</p>
        <div className="d-film">
          {SCREENS.map((f, i) => <i key={f} className={i === shot ? "on" : ""} style={{ backgroundImage: `url(${f})` }} />)}
          <b dir="auto">{t.video.title}</b>
          <u style={{ width: `${clamp01(r / 6) * 100}%` }} />
        </div>
      </>
    );
  }
  const r = s - VIDEO.go;
  const events: VideoEvent[] = [];
  if (r >= 2) events.push({ k: "explore", n: r < 3.5 ? 3 : 11 });
  if (r >= 4.5) events.push({ k: "plan" });
  if (r >= 7) events.push({ k: "music", mood: t.video.mood, bpm: 96 });
  if (r >= 8) events.push({ k: "storyboard", scenes: 6, mood: t.video.mood });
  if (r >= 10) events.push({ k: "build", n: r < 12 ? 1 : r < 14 ? 3 : 6 });
  if (r >= 11.5) events.push({ k: "snapshot", n: r < 14 ? 2 : 6 });
  if (r >= 15) events.push({ k: "check", errors: r < 16.6 ? 1 : 0 });
  if (r >= 18) events.push({ k: "render" });
  const step = r < 2 ? null : r < 7 ? "script" : r < 8 ? "music" : r < 15 ? "build" : r < 18 ? "qa" : "render";
  const stage = !step ? "queued" : step === "script" ? "plan" : step === "render" ? "ready" : step === "music" ? "music" : "spec";
  const createdAt = new Date(now - r * 12000).toISOString();
  const progress: VideoProgress = { kind: "video", startedAt: createdAt, cost: 96 * clamp01(r / 22), step, events };
  return <><Top name={t.name} /><CreatingVideo title={t.video.title} format="9:16" lengthS={30} createdAt={createdAt} generation={{ stage, engine: "live", first: false }} progress={progress} brand={{ name: t.name, colors: COLORS, logoUrl: LOGO, logoOnDark: false, screens: SCREENS }} edit={false} codeForm={null} money={money} /></>;
}

const B = { talk: 6.6, a1: 8.8, q2: 10, a2: 12, making: 12.6, choose: 14.6, refine: 24, build: 26.4, done: 31.4, end: 42 };
const BRAND_SCROLLS: Cue[] = [[0, 0], [B.choose, 0], [B.choose + 5.4, ".d-dir1"], [B.choose + 7.4, ".d-dir0"], [B.refine, 0], [B.refine + 1, ".d-refine"], [B.done, 0], [B.done + 2.6, ".d-done iframe"], [B.done + 5, "figure"], [B.done + 8, "figure:nth-of-type(3)"]];
const BRAND_TAPS: [number, string][] = [[5.8, ".d-start"], [B.a1 - 0.4, ".d-o1"], [B.a2 - 0.4, ".d-o2"], [B.refine - 0.5, ".d-dir0 .btn-primary"], [B.build - 0.4, ".d-build"]];

/** a first brand: the real brand creator, from the first sentence to the pack */
export function LiveBrand({ t, price }: { t: LiveText; price: number }) {
  return <Live total={B.end} scrolls={BRAND_SCROLLS} taps={BRAND_TAPS}>{(s) => <BrandRun t={t} price={price} s={s} />}</Live>;
}
function BrandRun({ t, price, s }: { t: LiveText; price: number; s: number }) {
  const ts = useTranslations("companies.studio"), locale = useLocale();
  const language: BrandLanguage = locale === "ar" ? "ar" : "en";
  const [q1, q2] = t.brand.turns;
  const teta = { ...TETA, concept: t.brand.concepts[0] }, crumb = { ...CRUMB, concept: t.brand.concepts[1] };
  const head = <div className="mb-4"><Heading as="h1" className="text-3xl">{ts.rich("title", boldTag)}</Heading></div>;
  if (s < B.talk) return (
    <>
      {head}
      <div className="panel space-y-5">
        <fieldset>
          <legend className="label mb-2 block">{ts("languageLabel")}</legend>
          <div className="flex flex-wrap gap-2">{BRAND_LANGUAGES.map((l) => <span key={l} role="radio" aria-checked={l === language} className="chip chip-white">{ts(`language_${l}`)}</span>)}</div>
        </fieldset>
        <div>
          <label className="label mb-2 block">{ts("businessLabel")}</label>
          <textarea dir="auto" rows={4} readOnly value={typed(t.brand.business, s, 0.8, 4.6)} placeholder={ts("businessPlaceholder")} className="w-full rounded-3xl bg-white p-4 text-base outline-none" />
        </div>
        <div><p className="label mb-2">{ts("filesLabel")}</p><div className="flex flex-wrap items-center gap-3"><span className="btn btn-soft">{ts("filesAdd")}</span></div></div>
        <span className="btn btn-primary d-start">{s > 6 ? <><SpinnerIcon className="size-4" />{ts("thinking")}</> : <>{ts("start")}<ArrowIcon className="size-4" /></>}</span>
      </div>
    </>
  );
  if (s < B.choose) {
    const turns = [...(s >= B.a1 ? [q1] : []), ...(s >= B.a2 ? [q2] : [])];
    const q = s < B.a1 ? q1 : q2, thinking = (s >= B.a1 && s < B.q2) || s >= B.a2;
    return (
      <>
        {head}
        <div className="panel space-y-4">
          {turns.map((turn) => <div key={turn.q} className="space-y-1 text-sm" dir="auto"><p className="text-ink-muted">{turn.q}</p><p className="font-medium text-navy">{turn.a}</p></div>)}
          {s >= B.making ? <p className="flex items-center gap-2 text-sm text-ink-muted"><SpinnerIcon className="size-4" />{ts("makingPreviews")}</p> : thinking ? <p className="flex items-center gap-2 text-sm text-ink-muted"><SpinnerIcon className="size-4" />{ts("thinking")}</p> : (
            <div className="divider space-y-3 pt-4">
              <p className="label">{ts("questionOf", { n: turns.length + 1 })}</p>
              <p className="text-lg font-medium text-navy" dir="auto">{q.q}</p>
              <div className="flex flex-wrap gap-2">{q.options.map((x) => <span key={x} className={`chip chip-white${x === q.a ? (q === q1 ? " d-o1" : " d-o2") : ""}`}>{x}</span>)}</div>
              <div className="flex flex-col gap-2 rounded-[28px] bg-white p-1.5"><input dir="auto" readOnly placeholder={ts("answerPlaceholder")} className="field bg-transparent text-start" /><span className="btn btn-primary">{ts("send")}</span></div>
              <div className="flex flex-wrap gap-2"><span className="btn btn-soft">{ts("skip")}</span>{turns.length >= 3 ? <span className="btn btn-soft"><SparkIcon className="size-4" />{ts("makePreviews")}</span> : null}</div>
            </div>
          )}
        </div>
      </>
    );
  }
  const r = s - B.choose;
  if (s < B.refine) return (
    <>
      <div className="mb-4"><h2 className="text-xl font-semibold text-navy">{ts("chooseTitle")}</h2><p className="text-sm text-ink-muted">{ts("chooseHint")}</p></div>
      <div className="grid gap-6">
        <div className="d-dir0"><Preview d={teta} language={language} label={ts("choose")} onChoose={() => {}} extra={{ html: r > 1.4 ? page("site-hero.jpg") : undefined, photo: r > 3 ? `${A}packaging.jpg` : undefined }} /></div>
        <div className="d-dir1"><Preview d={crumb} language={language} label={ts("choose")} onChoose={() => {}} extra={{ html: r > 2.2 ? page("crumb-site.jpg") : undefined, photo: r > 4.2 ? `${A}crumb-world.jpg` : undefined }} /></div>
      </div>
    </>
  );
  if (s < B.done) {
    const steps = (["identity", "website", "photos", "pack"] as const).filter((_, i) => s >= B.build + 1 + i);
    return (
      <div className="grid gap-5">
        <Preview d={teta} language={language} label={ts("back")} onChoose={() => {}} extra={{ html: page("site-hero.jpg"), photo: `${A}packaging.jpg` }} />
        <div className="panel space-y-4 d-refine">
          <label className="label block">{ts("notesLabel")}</label>
          <textarea dir="auto" rows={3} readOnly value={typed(t.brand.notes, s, B.refine + 0.8, B.build - 0.7)} placeholder={ts("notesPlaceholder")} className="w-full rounded-3xl bg-white p-4 text-base outline-none" />
          <p className="text-sm text-ink-muted">{ts("priceNote", { price: `EGP ${price}` })}</p>
          <span className="btn btn-primary d-build">{s >= B.build ? <SpinnerIcon className="size-4" /> : null}{ts("buildCta")}</span>
          {s >= B.build ? (
            <div className="space-y-2">
              <p className="text-sm text-ink-muted">{ts("building")}</p>
              <ul className="space-y-1 text-sm">{(["identity", "website", "photos", "pack"] as const).map((k) => <li key={k} className={`flex items-center gap-2 ${steps.includes(k) ? "text-navy" : "text-ink-muted"}`}>{steps.includes(k) ? <span aria-hidden>✓</span> : <SpinnerIcon className="size-3" />}{ts(`step_${k}`)}</li>)}</ul>
            </div>
          ) : null}
        </div>
      </div>
    );
  }
  const WORLD = ["storefront", "packaging", "tshirt", "uniform", "billboard", "card"];
  return (
    <div className="space-y-5 d-done">
      <div className="panel space-y-3"><h2 className="text-2xl font-semibold text-navy">{ts.rich("doneTitle", { ...boldTag, name: language === "ar" ? TETA.name_ar! : TETA.name })}</h2></div>
      <CreatedBrandFiles brand={{ name: TETA.name, files: 47, packUrl: "#", logoUrl: LOGO, siteHtml: page("site-hero.jpg", "site-sofra.jpg", "site-cakes.jpg"), world: WORLD.map((k, i) => ({ kind: k, label: t.brand.world[i], url: `${A}${k}.jpg` })), docs: ["BRAND.md", "DESIGN.md", "CLAUDE.md", "guidelines.pdf", "tokens.json", "website/index.html"].map((path) => ({ path, url: "#" })), logos: ["logo-color.svg", "logo-ar-color.svg", "logo-on-dark.svg"].map((path) => ({ path, url: "#" })) }} />
    </div>
  );
}

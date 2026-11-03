"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";

// The homepage's live scenes: the product's real moments, drawn in code and running on a loop. Each pauses off screen,
// and shows its finished state when the visitor prefers less motion.

type Build = (q: (s: string) => HTMLElement[], tl: gsap.core.Timeline) => void;
function useScene(build: Build) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.6, paused: true, defaults: { ease: "power3.out" } });
      build((s) => gsap.utils.toArray<HTMLElement>(s, el), tl);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { tl.progress(0.9).pause(); return; }
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) tl.play(); else tl.pause(); }, { threshold: 0.1 });
      io.observe(el);
      tl.eventCallback("onInterrupt", () => io.disconnect());
    }, el);
    return () => ctx.revert();
  }, [build]);
  return root;
}
/** letters appear one by one */
const typeIn = (tl: gsap.core.Timeline, el: HTMLElement, at: string | number, dur = 1) => {
  const text = el.dataset.t ?? "", s = { n: 0 };
  tl.set(el, { textContent: "" }, 0);
  tl.to(s, { n: Array.from(text).length, duration: dur, ease: "none", onUpdate() { el.textContent = Array.from(text).slice(0, Math.round(s.n)).join(""); } }, at);
};
const pop = { scale: 0.6, autoAlpha: 0 }, rise = { y: 16, autoAlpha: 0 };

export function Phone({ children, label }: { children: ReactNode; label?: string }) {
  return <div className="d-phone" role="img" aria-label={label}><i className="d-notch" aria-hidden="true" /><div className="d-screen">{children}</div></div>;
}

export type DemoText = {
  site: { url: string; read: string; logo: string; colors: string; fonts: string; voice: string; ready: string };
  edit: { ask: string; before: string; after: string };
  look: { name: string; palette: string; roles: string[]; font: string; specimen: string; tagline: string; voice: string; voiceD: string; audience: string; audienceD: string; features: string; featuresD: string[]; made: string };
};

/** reading a website: the address goes in, the brand comes out */
export function SiteDemo({ t }: { t: DemoText["site"] }) {
  const root = useScene((q, tl) => {
    typeIn(tl, q(".url span")[0], 0.3, 0.9);
    tl.from(q(".scan"), { top: "0%", autoAlpha: 0, duration: 0.2 }, 1.4);
    tl.to(q(".scan"), { top: "100%", duration: 1.4, ease: "power1.inOut" }, 1.5);
    tl.to(q(".scan"), { autoAlpha: 0, duration: 0.2 }, 2.9);
    tl.from(q(".wline"), { scaleX: 0, stagger: 0.07, duration: 0.3, transformOrigin: "100% 50%" }, 1.5);
    tl.from(q(".out"), { scale: 0.4, autoAlpha: 0, y: -40, stagger: 0.22, duration: 0.55, ease: "back.out(1.8)" }, 2.9);
    tl.from(q(".rdy"), { ...pop, duration: 0.35, ease: "back.out(2.4)" }, 4.2);
    tl.to({}, { duration: 1.6 }, 4.6);
  });
  return (
    <div ref={root} className="d-site">
      <p className="url" dir="ltr"><span data-t={t.url} /></p>
      <div className="wpage"><i className="wline w1" /><i className="wline w2" /><i className="wline w3" /><i className="wline w4" /><u className="scan" /></div>
      <div className="outs">
        <span className="out"><i className="lg" />{t.logo}</span>
        <span className="out"><i className="sw" /><i className="sw two" />{t.colors}</span>
        <span className="out"><b>Aa أب</b>{t.fonts}</span>
        <span className="out"><u className="vc" />{t.voice}</span>
      </div>
      <p className="rdy">✓ {t.ready}</p>
    </div>
  );
}

/** one post becoming every size */
export function SizesDemo() {
  const root = useScene((q, tl) => {
    const sizes = [[1, 1, "1:1"], [4, 5, "4:5"], [9, 16, "9:16"], [16, 9, "16:9"]] as const;
    sizes.forEach(([w, h], i) => tl.to(q(".frame"), { width: w > h ? "100%" : h > w ? `${(w / h) * 92}%` : "62%", aspectRatio: `${w}/${h}`, duration: 0.7, ease: "power3.inOut" }, i * 1.5));
    sizes.forEach(([, , n], i) => tl.call(() => { q(".fl")[0].textContent = n; }, undefined, i * 1.5 + 0.3));
    tl.to({}, { duration: 1 }, 5.2);
  });
  return <div ref={root} className="d-sizes"><div className="frame"><i className="orb" /><b /><b className="s" /><em className="fl" dir="ltr">1:1</em></div></div>;
}

/** a month filling up */
export function CalendarDemo({ labels }: { labels: string[] }) {
  const root = useScene((q, tl) => {
    tl.from(q(".day"), { autoAlpha: 0.2, duration: 0.2 }, 0);
    tl.from(q(".ev"), { scale: 0, autoAlpha: 0, stagger: { each: 0.22, from: "random" }, duration: 0.4, ease: "back.out(2.6)" }, 0.2);
    tl.to({}, { duration: 1.8 }, 2.4);
  });
  const spots = [2, 5, 9, 11, 16, 19, 23, 26];
  return <div ref={root} className="d-month">{Array.from({ length: 28 }, (_, i) => <div key={i} className="day">{spots.includes(i) ? <span className={`ev e${spots.indexOf(i) % 3}`}>{labels[spots.indexOf(i) % labels.length]}</span> : null}</div>)}</div>;
}

/** changing a piece by saying what you want */
export function EditDemo({ t }: { t: DemoText["edit"] }) {
  const root = useScene((q, tl) => {
    typeIn(tl, q(".say span")[0], 0.4, 1);
    tl.from(q(".say"), { ...rise, duration: 0.3 }, 0.2);
    tl.to(q(".card"), { background: "var(--lp-b)", color: "#16151c", duration: 0.7, ease: "power2.inOut" }, 1.8);
    tl.to(q(".cw"), { yPercent: -100, autoAlpha: 0, duration: 0.3 }, 1.9);
    tl.from(q(".cn"), { yPercent: 100, autoAlpha: 0, duration: 0.4 }, 2.1);
    tl.to({}, { duration: 2 }, 2.6);
  });
  return <div ref={root} className="d-edit"><div className="card"><b className="cw">{t.before}</b><b className="cn">{t.after}</b></div><p className="say"><span data-t={t.ask} /></p></div>;
}

/** the voice, in the customer's dialect */
export function VoiceDemo({ dialects }: { dialects: string[] }) {
  const root = useScene((q, tl) => {
    tl.to(q(".vb"), { scaleY: () => gsap.utils.random(0.15, 1), duration: 0.24, stagger: { each: 0.012, repeat: 13, yoyo: true }, ease: "sine.inOut" }, 0);
    dialects.forEach((_, i) => tl.to(q(".dl"), { yPercent: -100 * i, duration: 0.45, ease: "back.inOut(1.6)" }, i * 1.8));
    tl.to({}, { duration: 0.4 }, 3.6);
  });
  return <div ref={root} className="d-voice"><div className="rl"><div className="dls">{dialects.map((d) => <b key={d} className="dl">{d}</b>)}</div></div><div className="vs">{Array.from({ length: 40 }, (_, i) => <i key={i} className="vb" />)}</div></div>;
}

/** the page wears a different brand every few seconds */
export function BrandStage({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

/** objects drifting around the phones, a little closer as the pointer moves */
export function Drift({ children }: { children: ReactNode }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = el.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".fl-o", node).forEach((o, i) => gsap.to(o, { y: i % 2 ? 18 : -18, rotate: i % 2 ? -5 : 5, duration: 3 + (i % 3), repeat: -1, yoyo: true, ease: "sine.inOut" }));
    }, node);
    const move = (e: PointerEvent) => { node.style.setProperty("--mx", String(e.clientX / window.innerWidth - 0.5)); node.style.setProperty("--my", String(e.clientY / window.innerHeight - 0.5)); };
    window.addEventListener("pointermove", move, { passive: true });
    return () => { ctx.revert(); window.removeEventListener("pointermove", move); };
  }, []);
  return <div ref={el} className="d-stage">{children}</div>;
}

/** a feed that stays on brand: post after post, the same identity */
export function FeedDemo() {
  const root = useScene((q, tl) => {
    tl.from(q(".ft"), { scale: 0.5, autoAlpha: 0, stagger: 0.16, duration: 0.45, ease: "back.out(1.8)" }, 0.2);
    tl.to({}, { duration: 2.2 }, 1.8);
  });
  return <div ref={root} className="d-feed">{Array.from({ length: 9 }, (_, i) => <div key={i} className={`ft t${i % 3}`}><i /><b /></div>)}</div>;
}

/** what a month would cost, from what this company makes and what it pays today */
export function CostCalc({ t, post, carousel, video, money, team }: { t: CalcText; post: number; carousel: number; video: [number, number]; money: string; team: number }) {
  const [posts, setPosts] = useState(12), [videos, setVideos] = useState(4), [today, setToday] = useState(String(team));
  const low = posts * post + videos * video[0], high = posts * carousel + videos * video[1];
  const paid = Number(today.replace(/[^\d]/g, "")) || 0, fmt = (n: number) => n.toLocaleString("en");
  const share = (n: number) => (n < 10 ? n.toFixed(1) : String(Math.round(n)));
  const saveLow = Math.max(0, paid - high), saveHigh = Math.max(0, paid - low);
  return (
    <div className="d-calc">
      <div className="in">
        <label><span>{t.posts}<b dir="ltr">{posts}</b></span><input type="range" min={0} max={60} value={posts} onChange={(e) => setPosts(+e.target.value)} /></label>
        <label><span>{t.videos}<b dir="ltr">{videos}</b></span><input type="range" min={0} max={20} value={videos} onChange={(e) => setVideos(+e.target.value)} /></label>
        <label><span>{t.today}</span><input type="text" inputMode="numeric" dir="ltr" value={today} onChange={(e) => setToday(e.target.value)} placeholder={t.todayHint} /></label>
      </div>
      <div className="out" aria-live="polite">
        <small>{t.month}</small>
        <p className="sum"><span dir="ltr">{fmt(low)}–{fmt(high)}</span> {money}</p>
        {saveHigh > 0 ? <p className="save">{t.save} <b dir="ltr">{saveLow > 0 ? `${fmt(saveLow)}–${fmt(saveHigh)}` : fmt(saveHigh)}</b> {money}</p> : <p className="hint">{t.noCommit}</p>}
        {paid > 0 ? <p className="hint">{t.share} <b dir="ltr">{share(((low + high) / 2 / paid) * 100)}%</b></p> : null}
        <small className="fine">{t.fine}</small>
      </div>
    </div>
  );
}
export type CalcText = { posts: string; videos: string; today: string; todayHint: string; month: string; save: string; noCommit: string; fine: string; share: string };

/** the lookbook, as it sits in the app: a real brand made with the brand creator, then what gets made from it */
export function LookbookDemo({ t }: { t: DemoText["look"] }) {
  const root = useScene((q, tl) => {
    tl.from(q(".s-chart div"), { scaleY: 0, transformOrigin: "50% 100%", stagger: 0.09, duration: 0.5 }, 0.2);
    tl.from(q(".lk-mark img"), { ...pop, duration: 0.5, ease: "back.out(2)" }, 0.8);
    tl.to({}, { duration: 6 }, 1.4);
  });
  return (
    <div ref={root} className="d-look">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@800&display=swap" />
      <div className="s-slate-line"><span>LOOKBOOK</span><i /><span dir="ltr">{t.name}</span></div>
      <div className="s-look">
        <div className="s-panel span4"><p className="s-label">{t.palette}</p><div className="s-chart">{[["#3F4A2F", 0], ["#D8A25E", 1], ["#1D2117", 2], ["#7B8068", 3], ["#EFE9DA", 4], ["#DDD6C0", 5]].map(([c, i]) => <div key={c} style={{ background: c as string }}><span dir="ltr">{t.roles[i as number]}</span></div>)}</div></div>
        <div className="s-panel span2 lk-mark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/site/demo/ouwra/logo.png" alt={t.name} />
        </div>
        <div className="s-panel span3"><p className="s-label">{t.font}</p><div className="lk-spec" dir="auto">{t.specimen}</div><p className="lk-b" dir="auto">{t.tagline}</p></div>
        <div className="s-panel span3"><p className="s-label">{t.voice}</p><p className="lk-b" dir="auto">{t.voiceD}</p></div>
        <div className="s-panel span3"><p className="s-label">{t.audience}</p><p className="lk-b" dir="auto">{t.audienceD}</p></div>
        <div className="s-panel span3"><p className="s-label">{t.features}</p><ul className="s-list">{t.featuresD.map((f) => <li key={f} dir="auto">{f}</li>)}</ul></div>
      </div>
      <div className="lk-made"><p className="s-label">{t.made}</p><div>{["post", "storefront", "packaging", "tshirt", "booth", "card"].map((f) => <i key={f} style={{ backgroundImage: `url(/site/demo/ouwra/${f}.jpg)` }} />)}</div></div>
    </div>
  );
}

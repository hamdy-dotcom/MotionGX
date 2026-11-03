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
  brand: { head: string; q1: string; a1: string; q2: string; chips: string[]; making: string; names: string[]; done: string };
  post: { head: string; prompt: string; make: string; h1: string; h2: string; tag: string; done: string; cal: string };
  video: { head: string; lines: string[]; voice: string; done: string };
  site: { url: string; read: string; logo: string; colors: string; fonts: string; voice: string; ready: string };
  edit: { ask: string; before: string; after: string };
};

/** someone making their first brand: the talk, three directions, the one they chose */
export function BrandDemo({ t }: { t: DemoText["brand"] }) {
  const root = useScene((q, tl) => {
    tl.from(q(".q1"), { ...rise, duration: 0.4 }, 0.3);
    tl.from(q(".a1"), { ...rise, duration: 0.3 }, 1);
    typeIn(tl, q(".a1 span")[0], 1.1, 1.1);
    tl.from(q(".q2"), { ...rise, duration: 0.4 }, 2.5);
    tl.from(q(".chip"), { ...pop, stagger: 0.1, duration: 0.3, ease: "back.out(2)" }, 2.9);
    tl.to(q(".chip")[1], { background: "var(--lp-a)", color: "#fff", duration: 0.2 }, 3.9);
    tl.to(q(".talk"), { y: -60, autoAlpha: 0, duration: 0.5, ease: "power2.in" }, 4.5);
    tl.from(q(".making"), { autoAlpha: 0, duration: 0.3 }, 5);
    tl.to(q(".making"), { autoAlpha: 0, duration: 0.2 }, 5.9);
    tl.from(q(".dir"), { y: 70, autoAlpha: 0, stagger: 0.14, duration: 0.5, ease: "back.out(1.4)" }, 6);
    tl.to(q(".dir")[1], { scale: 1.05, boxShadow: "0 0 0 3px var(--lp-a)", duration: 0.25 }, 7.5);
    tl.to([q(".dir")[0], q(".dir")[2]], { autoAlpha: 0, x: (i) => (i ? 90 : -90), duration: 0.4, ease: "power2.in" }, 8);
    tl.to(q(".dir")[1], { autoAlpha: 0, scale: 1.5, duration: 0.35 }, 8.4);
    tl.from(q(".mark"), { scale: 0, rotate: -120, duration: 0.8, ease: "back.out(1.6)" }, 8.6);
    tl.from(q(".mname"), { ...rise, duration: 0.4 }, 9.2);
    tl.from(q(".dot"), { ...pop, stagger: 0.08, duration: 0.3, ease: "back.out(3)" }, 9.5);
    tl.from(q(".ok"), { ...pop, duration: 0.4, ease: "back.out(2.4)" }, 10.1);
    tl.to({}, { duration: 1.6 }, 10.5);
  });
  return (
    <div ref={root} className="d-fill">
      <p className="d-head">{t.head}</p>
      <div className="talk">
        <p className="b ai q1">{t.q1}</p>
        <p className="b me a1"><span data-t={t.a1} /></p>
        <p className="b ai q2">{t.q2}</p>
        <div className="chips">{t.chips.map((c) => <span key={c} className="chip">{c}</span>)}</div>
      </div>
      <p className="making d-abs">{t.making}<i /><i /><i /></p>
      <div className="dirs d-abs">{t.names.map((n, i) => <div key={n} className={`dir v${i}`}><i className="sh" /><b>{n}</b></div>)}</div>
      <div className="result d-abs">
        <svg className="mark" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" fill="var(--lp-a)" /><path d="M50 50 94 50A44 44 0 0 1 50 94Z" fill="var(--lp-b)" /></svg>
        <b className="mname">{t.names[1]}</b>
        <div className="dots"><i className="dot" style={{ background: "var(--lp-a)" }} /><i className="dot" style={{ background: "var(--lp-b)" }} /><i className="dot" style={{ background: "#16151c" }} /><i className="dot" style={{ background: "#f4efe6" }} /></div>
        <p className="ok">✓ {t.done}</p>
      </div>
    </div>
  );
}

/** someone making their first post: the words, the design coming together, then a place on the calendar */
export function PostDemo({ t }: { t: DemoText["post"] }) {
  const root = useScene((q, tl) => {
    typeIn(tl, q(".pr span")[0], 0.3, 1.2);
    tl.to(q(".go"), { scale: 0.92, duration: 0.08, yoyo: true, repeat: 1 }, 1.7);
    tl.to(q(".ask"), { y: -20, autoAlpha: 0, duration: 0.35 }, 1.95);
    tl.from(q(".pc"), { y: 40, autoAlpha: 0, duration: 0.5 }, 2.1);
    tl.from(q(".fillbg"), { clipPath: "circle(0% at 50% 100%)", duration: 0.9, ease: "power2.inOut" }, 2.5);
    tl.from(q(".orb"), { scale: 0, duration: 0.7, ease: "back.out(1.8)" }, 3.1);
    tl.from(q(".pl"), { yPercent: 110, autoAlpha: 0, stagger: 0.14, duration: 0.5 }, 3.4);
    tl.from(q(".pt"), { ...pop, duration: 0.35, ease: "back.out(2.4)" }, 3.9);
    tl.from(q(".pm"), { ...pop, duration: 0.35, ease: "back.out(2.4)" }, 4.2);
    tl.from(q(".pok"), { ...pop, duration: 0.35, ease: "back.out(2.4)" }, 4.6);
    tl.to(q(".pc"), { scale: 0.2, y: 120, x: 40, autoAlpha: 0, duration: 0.6, ease: "power3.in" }, 5.7);
    tl.to(q(".pok"), { autoAlpha: 0, duration: 0.2 }, 5.7);
    tl.from(q(".cal"), { ...rise, duration: 0.4 }, 6);
    tl.from(q(".cal i"), { scale: 0, stagger: { each: 0.015, from: "random" }, duration: 0.25 }, 6.1);
    tl.from(q(".pin"), { y: -90, autoAlpha: 0, duration: 0.5, ease: "bounce.out" }, 6.7);
    tl.to({}, { duration: 1.4 }, 7.3);
  });
  return (
    <div ref={root} className="d-fill">
      <p className="d-head">{t.head}</p>
      <div className="ask"><p className="pr"><span data-t={t.prompt} /><u /></p><span className="go">{t.make}</span></div>
      <div className="pc d-abs">
        <div className="fillbg"><i className="orb" /><b className="pl-w"><span className="pl">{t.h1}</span></b><b className="pl-w big"><span className="pl">{t.h2}</span></b><em className="pt">{t.tag}</em><svg className="pm" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="#fff" /><path d="M50 50 96 50A46 46 0 0 1 50 96Z" fill="var(--lp-b)" /></svg></div>
      </div>
      <p className="pok d-abs">✓ {t.done}</p>
      <div className="cal d-abs"><p>{t.cal}</p><div>{Array.from({ length: 28 }, (_, i) => <i key={i} />)}<b className="pin" /></div></div>
    </div>
  );
}

/** someone making their first video: the script becomes scenes on a timeline, the voice runs under them */
export function VideoDemo({ t }: { t: DemoText["video"] }) {
  const root = useScene((q, tl) => {
    tl.from(q(".st"), { ...rise, stagger: 0.35, duration: 0.35 }, 0.3);
    tl.to(q(".script"), { autoAlpha: 0, y: -30, duration: 0.35 }, 1.9);
    tl.from(q(".vbox"), { scale: 0.85, autoAlpha: 0, duration: 0.5, ease: "back.out(1.5)" }, 2.2);
    tl.from(q(".tr"), { scaleX: 0, stagger: 0.18, duration: 0.5, transformOrigin: "100% 50%" }, 2.5);
    tl.from(q(".wave i"), { scaleY: 0.1, stagger: { each: 0.02, from: "center" }, duration: 0.35 }, 3);
    tl.to(q(".wave i"), { scaleY: () => gsap.utils.random(0.25, 1), duration: 0.22, stagger: { each: 0.02, repeat: 9, yoyo: true } }, 3.4);
    tl.from(q(".vl"), { autoAlpha: 0, duration: 0.3 }, 3.2);
    tl.fromTo(q(".head"), { insetInlineStart: "0%" }, { insetInlineStart: "100%", duration: 4.5, ease: "none" }, 3.4);
    [0, 1, 2].forEach((i) => {
      tl.set(q(".sc"), { autoAlpha: 0 }, 3.4 + i * 1.5);
      tl.set(q(".sc")[i], { autoAlpha: 1 }, 3.4 + i * 1.5);
      tl.from(q(".sc")[i].querySelector("b"), { scale: 0.7, autoAlpha: 0, duration: 0.45, ease: "back.out(2.2)" }, 3.45 + i * 1.5);
    });
    tl.from(q(".vok"), { ...pop, duration: 0.35, ease: "back.out(2.4)" }, 8);
    tl.to({}, { duration: 1.3 }, 8.4);
  });
  return (
    <div ref={root} className="d-fill">
      <p className="d-head">{t.head}</p>
      <div className="script d-abs">{t.lines.map((l) => <p key={l} className="st">{l}</p>)}</div>
      <div className="vbox d-abs">
        {t.lines.map((l, i) => <div key={l} className={`sc s${i}`}><b>{l}</b></div>)}
        <em className="vl">▶ {t.voice}</em>
      </div>
      <div className="tracks d-abs">
        <div className="rail"><i className="tr a" /><i className="tr b" /><i className="tr c" /><u className="head" /></div>
        <div className="wave">{Array.from({ length: 26 }, (_, i) => <i key={i} />)}</div>
      </div>
      <p className="vok d-abs">✓ {t.done}</p>
    </div>
  );
}

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
const THEMES = [["#5558e3", "#ffb454"], ["#e4502e", "#ffd166"], ["#0d8a6f", "#a8f0d1"], ["#d72c6b", "#ffc2d9"], ["#1d6fe0", "#7ee8fa"]];
export function ThemeCycle({ children, className = "" }: { children: ReactNode; className?: string }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let i = 0;
    const id = setInterval(() => {
      if (document.hidden || !el.current) return;
      i = (i + 1) % THEMES.length;
      el.current.style.setProperty("--lp-a", THEMES[i][0]);
      el.current.style.setProperty("--lp-b", THEMES[i][1]);
    }, 4200);
    return () => clearInterval(id);
  }, []);
  return <div ref={el} className={className}>{children}</div>;
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
export function CostCalc({ t, post, carousel, video, money }: { t: CalcText; post: number; carousel: number; video: [number, number]; money: string }) {
  const [posts, setPosts] = useState(12), [videos, setVideos] = useState(4), [today, setToday] = useState("");
  const low = posts * post + videos * video[0], high = posts * carousel + videos * video[1];
  const paid = Number(today.replace(/[^\d]/g, "")) || 0, fmt = (n: number) => n.toLocaleString("en");
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
        <small className="fine">{t.fine}</small>
      </div>
    </div>
  );
}
export type CalcText = { posts: string; videos: string; today: string; todayHint: string; month: string; save: string; noCommit: string; fine: string };

// Studio engine (VIDEO_ENGINE=studio) — the MotionGX ads' scene library, unchanged except where a client brand replaces
// MotionGX (logo, reveal, price, CTA) and the new "screen" scene (the client's screens rebuilt as code). Original header:
// MotionGX ads — scene library. window.AD (from build.mjs) → one paused GSAP timeline; the renderer seeks it frame by
// frame (window.__seek / __duration) and mixes window.__sfx. Every scene: a title (head) + a visual (vis), timed to its
// voiceover words (s.words: [{w, t, e}] absolute seconds).
(() => {
  const AD = window.AD, P = AD.format === "P", EG = AD.country === "eg", B = AD.brand, BEAT = AD.beat;
  const stage = document.getElementById("stage");
  const tl = gsap.timeline({ paused: true });
  const SFX = [];
  const sfx = (t, src, vol = 0.5) => SFX.push({ t: +t.toFixed(3), src, vol });
  const T = (eg, sa) => (EG ? eg : sa);
  const N = (n) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
  const $ = (tag, cls, html, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
  const css = (e, o) => Object.assign(e.style, o);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const root = document.documentElement.style;
  B.colors.forEach((c, i) => root.setProperty(`--b${i + 1}`, c));
  root.setProperty("--bf", `"${B.font}", "Readex Pro", sans-serif`);
  // the stage's accent is the client's colour (the ads used MotionGX's own)
  if (AD.theme) Object.entries(AD.theme).forEach(([k, v]) => root.setProperty(`--${k}`, v));

  // ── helpers ──────────────────────────────────────────────────────────
  const strip = (w) => w.replace(/[ً-ْـ.,،؟?!…:«»"]/g, "");
  /** the time a word is spoken (first word containing the needle), else a fraction of the line */
  const at = (s, needle, frac = 0.5) => {
    const n = strip(needle);
    const hit = s.words.find((w) => strip(w.w).includes(n));
    return hit ? hit.t : s.vo.start + frac * (s.vo.end - s.vo.start);
  };
  const split = (text) => text.split(/(\s+)/).map((p) => (/^\s+$/.test(p) ? p : `<span class="w">${p}</span>`)).join("");
  function rise(els, t, opts = {}) {
    els = [].concat(...[els].flat().map((e) => (e.querySelectorAll ? [...e.querySelectorAll(".w")].length ? [...e.querySelectorAll(".w")] : [e] : [e])));
    gsap.set(els, { opacity: 0, y: opts.y ?? 70, filter: "blur(10px)" });
    tl.to(els, { opacity: 1, y: 0, filter: "blur(0px)", duration: opts.d ?? 0.6, ease: "power3.out", stagger: opts.stagger ?? 0.07 }, t);
  }
  function pop(e, t, o = {}) { gsap.set(e, { opacity: 0, scale: o.from ?? 0.82, y: o.y ?? 0, rotation: o.rot ?? 0 }); tl.to(e, { opacity: 1, scale: 1, y: 0, rotation: o.toRot ?? 0, duration: o.d ?? 0.55, ease: o.ease ?? "back.out(1.6)" }, t); }
  function fadeIn(e, t, d = 0.4, y = 30) { gsap.set(e, { opacity: 0, y }); tl.to(e, { opacity: 1, y: 0, duration: d, ease: "power2.out" }, t); }
  function type(e, text, t, d, keys = true) {
    const o = { n: 0 }; e.textContent = "";
    tl.to(o, { n: text.length, duration: d, ease: "none", onUpdate: () => { e.textContent = text.slice(0, Math.round(o.n)); } }, t);
    if (keys) for (let k = 0; k < Math.min(14, Math.floor(d / 0.09)); k++) sfx(t + k * (d / Math.min(14, Math.floor(d / 0.09))), `keyboard/keypress-${String(1 + (k % 12)).padStart(3, "0")}.wav`, 0.22);
  }
  function blink(e, t, d) { tl.to(e, { opacity: 0, duration: 0.42, ease: "steps(1)", repeat: Math.max(1, Math.floor(d / 0.42)), yoyo: true }, t); }
  /** element centre in stage px (measure before giving it a transform) */
  const centre = (e) => { const r = e.getBoundingClientRect(), s = stage.getBoundingClientRect(); return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2 }; };
  const CURSOR = `<svg viewBox="0 0 24 24" width="54" height="54"><path d="M4 2l16 9.5-7 1.6 4.2 7.4-3 1.7-4.2-7.4L5 20z" fill="#14141c" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  function cursor(sc, from) { const c = $("div", "cursor", CURSOR, sc); css(c, { left: from.x + "px", top: from.y + "px", opacity: 0 }); const r = $("div", "ring", null, sc); return { c, r, at: { ...from } }; }
  function moveClick(cur, to, t, d = 0.6, click = true) {
    tl.to(cur.c, { opacity: 1, duration: 0.2 }, t - d);
    tl.to(cur.c, { left: to.x - 6, top: to.y - 4, duration: d, ease: "power3.inOut" }, t - d);
    if (!click) return;
    tl.to(cur.c, { scale: 0.82, duration: 0.08, yoyo: true, repeat: 1 }, t);
    tl.set(cur.r, { left: to.x, top: to.y, opacity: 0.9, scale: 0.3 }, t);
    tl.to(cur.r, { scale: 1.4, opacity: 0, duration: 0.5, ease: "power2.out" }, t);
    sfx(t, "ui/click2.ogg", 0.6);
  }
  const ICON = {
    video: `<svg viewBox="0 0 24 24"><rect x="2" y="5" width="15" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M17 10l5-3v10l-5-3z" fill="currentColor"/></svg>`,
    image: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="9" r="2" fill="currentColor"/><path d="M4 18l5-5 4 4 3-3 4 4" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
    carousel: `<svg viewBox="0 0 24 24"><rect x="6" y="4" width="12" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 7v10M21 7v10" stroke="currentColor" stroke-width="2"/></svg>`,
    story: `<svg viewBox="0 0 24 24"><rect x="6" y="2" width="12" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 5h6" stroke="currentColor" stroke-width="2"/></svg>`,
    cover: `<svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="7" cy="17" r="3" fill="currentColor"/></svg>`,
    text: `<svg viewBox="0 0 24 24"><path d="M4 6h16M4 11h16M4 16h10" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
    bell: `<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0112 0v5l2 2H4z M10 20a2 2 0 004 0" fill="currentColor"/></svg>`,
    cal: `<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="2"/></svg>`,
    spark: `<svg viewBox="0 0 24 24"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" fill="currentColor"/></svg>`,
    check: `<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    up: `<svg viewBox="0 0 24 24"><path d="M12 20V5M5 11l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    play: `<svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>`,
  };
  const icon = (k, size, color) => `<span style="display:inline-flex;width:${size}px;height:${size}px;color:${color || "currentColor"}">${ICON[k]}</span>`;

  // ── the demo brand's art ─────────────────────────────────────────────
  const ART = {
    sekka: (w) => `<svg viewBox="0 0 200 200" width="${w}" height="${w}"><ellipse cx="100" cy="168" rx="78" ry="14" fill="var(--b2)" opacity=".18"/><path d="M48 92h104l-10 62a18 18 0 01-18 15H76a18 18 0 01-18-15z" fill="var(--b1)"/><path d="M152 104h10a18 18 0 010 36h-14" fill="none" stroke="var(--b1)" stroke-width="10"/><ellipse cx="100" cy="92" rx="52" ry="9" fill="var(--b2)"/><path d="M80 70c-8-14 8-18 0-34M100 66c-8-14 8-18 0-34M120 70c-8-14 8-18 0-34" fill="none" stroke="var(--b4)" stroke-width="6" stroke-linecap="round"/><text x="100" y="138" text-anchor="middle" font-family="Lalezar" font-size="34" fill="var(--b3)">سكّة</text></svg>`,
    nakheel: (w) => `<svg viewBox="0 0 200 200" width="${w}" height="${w}"><path d="M100 120C92 80 70 52 30 44c34-2 56 10 70 40 4-34 22-56 58-64-26 18-40 44-44 76z" fill="#3f8a63"/><path d="M100 118c-4-30 6-50 30-62" stroke="#3f8a63" stroke-width="6" fill="none"/><path d="M34 128h132a66 40 0 01-132 0z" fill="var(--b1)"/><g fill="var(--b4)"><ellipse cx="70" cy="122" rx="14" ry="9"/><ellipse cx="96" cy="116" rx="14" ry="9"/><ellipse cx="122" cy="120" rx="14" ry="9"/><ellipse cx="144" cy="126" rx="12" ry="8"/><ellipse cx="84" cy="128" rx="13" ry="8"/></g></svg>`,
    daftar: (w) => `<svg viewBox="0 0 200 200" width="${w}" height="${w}"><rect x="58" y="20" width="84" height="160" rx="16" fill="var(--b2)"/><rect x="66" y="34" width="68" height="132" rx="8" fill="#fff"/><g fill="var(--b1)"><rect x="74" y="120" width="10" height="34" rx="3"/><rect x="88" y="104" width="10" height="50" rx="3"/><rect x="102" y="86" width="10" height="68" rx="3"/><rect x="116" y="96" width="10" height="58" rx="3" fill="var(--b4)"/></g><rect x="74" y="46" width="52" height="8" rx="4" fill="var(--b3)"/><rect x="74" y="60" width="34" height="14" rx="4" fill="var(--b1)"/></svg>`,
  };
  const COPY = {
    sekka: { post: "قهوة الصبح<br>على السكة", story: "عرض أول الشهر<br>٢ بـ ١", carousel: "٥ مشروبات<br>للصيف", video: "اتحمّصت<br>النهارده", caption: "صباحك قهوة مظبوطة ☕ عدّي علينا في السكة" },
    nakheel: { post: "ضيافة تليق<br>بمجلسك", story: "عرض الراتب<br>٢٥٪", carousel: "ضيافة<br>العيد", video: "من النخلة<br>للعلبة", caption: "تمرة الصباح غير ✨ اطلبها الحين من تمور نخيل" },
    daftar: { post: "تقارير المبيعات<br>كل أحد", story: "حساباتك<br>في جيبك", carousel: "٣ حاجات<br>جديدة", video: "تقارير أسبوعية<br>على الواتساب", caption: "التحديث الجديد نزل 🚀 تقاريرك هتوصلك كل أحد" },
  };
  const C = COPY[AD.brandKey] || {}, art = ART[AD.brandKey] || (() => "");
  // the client's real logo on a round tile when the capture has one; else its first letter (as the ads' demo brands)
  const logo = (size) => B.logo ? `<span class="logo" style="width:${size}px;height:${size}px;background:${B.logoOnDark ? "var(--b2)" : "#fff"};box-shadow:inset 0 0 0 1px var(--hair)"><img src="${B.logo}" style="width:72%;height:72%;object-fit:contain"></span>` : `<span class="logo" style="width:${size}px;height:${size}px;font-size:${size * 0.5}px">${B.glyph}</span>`;
  /** the logo as a wide mark (reveal, CTA): the image itself, no tile */
  const mark = (h) => B.logo ? `<img src="${B.logo}" style="height:${h}px;max-width:${P ? 860 : 1100}px;object-fit:contain;display:inline-block">` : `<span dir="auto" style="font:700 ${h}px var(--bf)">${B.name}</span>`;
  /** one of the brand's pieces: post (4:5), story (9:16), cover (wide), square, video (with a play badge) */
  function design(kind, w, opts = {}) {
    const ratio = { post: 1.25, story: 16 / 9, cover: 624 / 1640, square: 1, video: 16 / 9 }[kind];
    const h = Math.round(w * ratio), d = $("div", "design");
    const dark = opts.dark ?? (kind === "story" || kind === "video");
    css(d, { width: w + "px", height: h + "px", background: dark ? "var(--b2)" : "var(--b3)", color: dark ? "var(--b3)" : "var(--b2)" });
    const fs = Math.round(w * (kind === "cover" ? 0.062 : kind === "story" ? 0.13 : 0.115));
    const text = kind === "story" ? C.story : kind === "video" ? C.video : kind === "cover" ? B.tagline : opts.text || C.post;
    if (kind === "cover") {
      d.innerHTML = `<div style="position:absolute;inset:0;background:radial-gradient(circle at 18% 50%, var(--b1) 0 22%, transparent 23%)"></div>
        <div style="position:absolute;left:4%;top:50%;transform:translateY(-50%)">${art(h * 0.9)}</div>
        <div style="position:absolute;right:7%;top:50%;transform:translateY(-50%);text-align:right"><div class="bt" style="font-size:${fs * 1.5}px">${B.name}</div><div style="font:500 ${fs * 0.7}px var(--display);opacity:.75;margin-top:${fs * 0.25}px">${B.tagline}</div></div>`;
    } else {
      d.innerHTML = `<div style="position:absolute;top:${w * 0.07}px;right:${w * 0.07}px;display:flex;align-items:center;gap:${w * 0.025}px;font:600 ${w * 0.045}px var(--display)">${logo(w * 0.1)}<span>${B.name}</span></div>
        <div class="dtitle bt" style="position:absolute;right:${w * 0.07}px;left:${w * 0.07}px;top:${kind === "story" ? h * 0.2 : w * 0.24}px;font-size:${fs}px;text-align:right">${text}</div>
        <div class="dart" style="position:absolute;left:50%;bottom:${kind === "story" ? h * 0.1 : w * 0.02}px;transform:translateX(-50%)">${art(w * (kind === "story" ? 0.8 : 0.62))}</div>
        <div style="position:absolute;inset:auto 0 0 0;height:${w * 0.03}px;background:var(--b1)"></div>`;
      if (kind === "video") d.insertAdjacentHTML("beforeend", `<div style="position:absolute;top:50%;left:50%;width:${w * 0.18}px;height:${w * 0.18}px;margin:-${w * 0.09}px;border-radius:50%;background:rgba(255,255,255,.92);color:var(--b2);display:flex;align-items:center;justify-content:center">${icon("play", w * 0.08)}</div>`);
    }
    return d;
  }

  // ── scene frame: enter / exit, title ─────────────────────────────────
  function frame(s, i, full) {
    const sc = $("div", "scene" + (full ? " full" : ""), null, stage);
    const head = $("div", "head", null, sc), vis = $("div", "vis", null, sc);
    if (s.slate) $("div", "slate", s.slate, head);
    const title = $("div", "title", split(s.title), head);
    let sub = null;
    if (s.sub) sub = $("div", "sub", `<em>${split(s.sub)}</em>`, head);
    tl.set(sc, { visibility: "visible" }, s.start);
    if (i > 0) { gsap.set(sc, { opacity: 0 }); tl.to(sc, { opacity: 1, duration: 0.3, ease: "power1.out" }, s.start); }
    if (i < AD.scenes.length - 1) { tl.to(sc, { opacity: 0, scale: 0.97, duration: 0.32, ease: "power1.in" }, s.end - 0.3); tl.set(sc, { visibility: "hidden" }, s.end); }
    if (s.type !== "reveal") rise(title, s.start + 0.08);
    if (sub) rise(sub, s.start + 0.45, { stagger: 0.06 });
    if (i > 0) sfx(s.start - 0.05, ["impact/impactSoft_medium_001.ogg", "impact/impactSoft_medium_002.ogg", "impact/impactSoft_medium_004.ogg"][i % 3], 0.35);
    return { sc, head, vis, title, sub };
  }

  // ── scenes ────────────────────────────────────────────────────────────
  const S = {};

  S.hook = (s, f) => {
    const { vis } = f;
    if (s.data?.words) {
      // the season names, one after another, before the title lands
      f.head.style.opacity = 0;
      const big = $("div", null, null, vis); css(big, { position: "relative", width: "100%", height: "100%" });
      const words = s.data.words.map((w, k) => { const e = $("div", "title", w, big); css(e, { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: P ? "150px" : "150px", color: k % 2 ? "var(--ink)" : "var(--brand)" }); gsap.set(e, { opacity: 0 }); return e; });
      words.forEach((e, k) => {
        const t = at(s, s.data.words[k], (k + 0.5) / (words.length + 1));
        tl.fromTo(e, { opacity: 0, scale: 1.35, filter: "blur(16px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.35, ease: "power3.out", immediateRender: false }, t - 0.1);
        tl.to(e, { opacity: 0, scale: 0.9, duration: 0.25 }, (k < words.length - 1 ? at(s, s.data.words[k + 1], 0.5) : s.vo.end - 0.9) - 0.15);
        sfx(t - 0.1, "impact/impactSoft_heavy_00" + (k % 4) + ".ogg", 0.35);
      });
      const tEnd = s.vo.end - 0.8;
      tl.to(f.head, { opacity: 1, duration: 0.01 }, tEnd);
      if (P) { css(f.head, { top: "0", bottom: "0", justifyContent: "center" }); }
      gsap.set(f.title.querySelectorAll(".w"), { opacity: 0 }); rise(f.title, tEnd);
      if (f.sub) rise(f.sub, tEnd + 0.3);
      return;
    }
    if (AD.hookArt === "timer") {
      const dial = $("div", "panel", null, vis); css(dial, { width: "560px", height: "560px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" });
      dial.innerHTML = `<svg viewBox="0 0 200 200" width="520" height="520" style="position:absolute"><circle cx="100" cy="100" r="88" fill="none" stroke="var(--panel2)" stroke-width="12"/><circle class="arc" cx="100" cy="100" r="88" fill="none" stroke="var(--brand)" stroke-width="12" stroke-linecap="round" stroke-dasharray="553" stroke-dashoffset="553" transform="rotate(-90 100 100)"/></svg><div style="text-align:center"><div class="num mono" style="font:700 150px var(--mono)">60</div><div class="label">SECONDS</div></div>`;
      pop(dial, s.start + 0.3);
      tl.to(dial.querySelector(".arc"), { strokeDashoffset: 0, duration: s.end - s.start - 0.6, ease: "none" }, s.start + 0.4);
      const num = dial.querySelector(".num"), o = { v: 60 };
      tl.to(o, { v: 0, duration: s.end - s.start - 0.6, ease: "none", onUpdate: () => (num.textContent = String(Math.ceil(o.v)).padStart(2, "0")) }, s.start + 0.4);
      return;
    }
    if (AD.hookArt === "app") {
      const ph = $("div", "phone", `<div class="notch"></div><div class="scr"></div>`, vis); css(ph, { transform: `scale(${P ? 0.95 : 0.74})`, margin: P ? "0" : "-125px 0" });
      const scr = ph.querySelector(".scr"); css(scr, { background: "linear-gradient(160deg, var(--b3), #fff)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "26px" });
      scr.innerHTML = `<div style="width:180px;height:180px;border-radius:44px;background:var(--b1);display:flex;align-items:center;justify-content:center;color:#fff;font:700 96px var(--display);box-shadow:0 30px 60px -20px var(--b1)">${B.glyph}</div><div style="font:700 52px var(--display);color:var(--b2)">${B.name}</div><div class="label">V 2.4 · NEW</div>`;
      pop(ph, s.start + 0.2, { from: 0.9, y: 60 });
      const q = $("div", "panel", `<span style="font:700 70px var(--display)">؟</span><span style="font:500 40px var(--display)">الفيديو؟</span>`, vis);
      css(q, { position: "absolute", top: P ? "40px" : "120px", right: P ? "60px" : "60px", padding: "26px 44px", display: "flex", gap: "16px", alignItems: "center", borderRadius: "40px 40px 8px 40px" });
      pop(q, at(s, "مين", 0.6), { rot: -8 }); sfx(at(s, "مين", 0.6), "interface/bong_001.ogg", 0.5);
      return;
    }
    // the blank post: an empty frame with a blinking caret
    const card = $("div", "panel", null, vis);
    css(card, { width: P ? "700px" : "600px", height: P ? "875px" : "750px", border: "5px dashed rgba(20,20,30,.18)", background: "rgba(255,255,255,.55)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "34px" });
    card.innerHTML = `<div style="font:300 220px var(--display);color:rgba(20,20,30,.14);line-height:1">+</div><div style="font:500 44px var(--display);color:var(--muted)">${s.data?.blank ?? "بوست جديد"}<span class="caret"></span></div>`;
    pop(card, s.start + 0.25, { from: 0.92, y: 40 });
    blink(card.querySelector(".caret"), s.start + 0.5, s.end - s.start);
    tl.to(card, { rotation: -1.5, duration: 0.12, yoyo: true, repeat: 5, ease: "sine.inOut" }, s.vo.end - 0.6);
  };

  S.chaos = (s, f) => {
    const box = $("div", null, null, f.vis); css(box, { position: "relative", width: "100%", height: "100%" });
    const W = P ? 960 : 960, H = P ? 1150 : 900;
    const spots = P ? [[110, 90], [560, 200], [80, 470], [520, 560], [140, 840], [600, 900]] : [[60, 90], [520, 170], [80, 420], [560, 470], [140, 700], [600, 740]];
    const chips = s.data.chips.map((c, k) => {
      const e = $("div", "chip", c, box);
      css(e, { position: "absolute", left: spots[k][0] + "px", top: spots[k][1] + "px", fontSize: "44px", padding: "22px 40px" });
      if (k % 3 === 2) css(e, { background: "var(--ink)", color: "#fff" });
      if (k === 3) css(e, { background: "var(--rec)", color: "#fff", borderColor: "var(--rec)" });
      return e;
    });
    const d = s.vo.end - s.vo.start;
    chips.forEach((e, k) => { const t = s.vo.start + 0.1 + (k * d * 0.8) / chips.length; pop(e, t, { rot: (rnd() - 0.5) * 30, toRot: (rnd() - 0.5) * 14, from: 0.5 }); sfx(t, `interface/drop_00${1 + (k % 3)}.ogg`, 0.35); tl.to(e, { x: (rnd() - 0.5) * 60, y: (rnd() - 0.5) * 50, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: 3 }, t + 0.5); });
    const badge = $("div", null, "٩٩+", box);
    css(badge, { position: "absolute", top: "0", left: P ? "420px" : "420px", padding: "12px 26px", borderRadius: "999px", background: "var(--rec)", color: "#fff", font: "700 46px var(--display)", boxShadow: "0 16px 40px -14px var(--rec)" });
    pop(badge, s.vo.start + 0.3, { from: 0.2 });
    tl.to(badge, { scale: 1.15, duration: BEAT / 2, yoyo: true, repeat: Math.floor(d / BEAT) * 2 - 1, ease: "sine.inOut" }, s.vo.start + 0.9);
    tl.to(chips, { x: "+=12", duration: 0.05, yoyo: true, repeat: 7, ease: "none" }, s.end - 0.75);
  };

  S.reveal = (s, f) => {
    f.sc.classList.add("full");
    f.title.innerHTML = `<span class="wmk" style="display:inline-block">${mark(P ? 190 : 230)}</span>`;
    const slate = $("div", "slate", B.latin || B.url, null); f.head.insertBefore(slate, f.sub);
    const wm = f.title.querySelector(".wmk");
    gsap.set(wm, { opacity: 0, scale: 0.7, letterSpacing: "0.35em", filter: "blur(20px)" });
    tl.to(wm, { opacity: 1, scale: 1, letterSpacing: "-0.03em", filter: "blur(0px)", duration: 0.9, ease: "expo.out" }, s.start + 0.05);
    fadeIn(slate, s.start + 0.55);
    for (let k = 0; k < 3; k++) {
      const r = $("div", null, null, f.sc); css(r, { position: "absolute", left: "50%", top: "50%", width: "300px", height: "300px", margin: "-150px", borderRadius: "50%", border: "4px solid var(--brand)", opacity: 0 });
      tl.fromTo(r, { scale: 0.4, opacity: 0.7 }, { scale: 4.5, opacity: 0, duration: 1.6, ease: "power2.out", immediateRender: false }, s.start + k * 0.18);
    }
    tl.fromTo(".flash", { opacity: 0.85 }, { opacity: 0, duration: 0.6, immediateRender: false }, s.start);
    tl.to(".aurora", { opacity: 0.7, duration: 0.6 }, s.start).to(".aurora", { opacity: 0.42, duration: 1.4 }, s.start + 1);
    tl.to(wm, { scale: 1.04, duration: s.end - s.start - 1, ease: "none" }, s.start + 0.95);
    sfx(s.start, "impact/impactSoft_heavy_002.ogg", 0.6);
  };

  S.capture = (s, f) => {
    const col = $("div", null, null, f.vis); css(col, { display: "flex", flexDirection: "column", gap: P ? "34px" : "26px", width: P ? "920px" : "900px" });
    const bar = $("div", "panel", null, col); css(bar, { padding: "26px 30px", display: "flex", alignItems: "center", gap: "20px" });
    bar.innerHTML = `<div style="display:flex;gap:10px" dir="ltr"><i style="width:18px;height:18px;border-radius:50%;background:#ff5f57"></i><i style="width:18px;height:18px;border-radius:50%;background:#febc2e"></i><i style="width:18px;height:18px;border-radius:50%;background:#28c840"></i></div><div style="flex:1;background:var(--panel2);border-radius:999px;padding:16px 28px;font:500 34px var(--mono);direction:ltr;text-align:left"><span class="u"></span><span class="caret"></span></div><div class="btn lit go" style="padding:18px 34px;font-size:32px">${T("اطّلع الهوية", "اطلع الهوية")}</div>`;
    const card = $("div", "panel", null, col); css(card, { padding: P ? "44px" : "34px", display: "grid", gap: P ? "30px" : "22px" });
    card.innerHTML = `<div style="display:flex;align-items:center;gap:26px"><span class="lg">${logo(P ? 120 : 100)}</span><div><div class="nm" style="font:700 ${P ? 58 : 50}px var(--display)">${B.name}</div><div class="label" style="margin-top:6px">${B.latin} · ${B.industry}</div></div></div>
      <div class="pal" style="display:flex;gap:18px">${B.colors.map((c) => `<div style="flex:1;height:${P ? 130 : 96}px;border-radius:22px;background:${c};position:relative"><span class="mono" style="position:absolute;bottom:10px;right:14px;font-size:20px;color:${c === B.colors[2] ? "#000" : "#fff"};opacity:.8">${c}</span></div>`).join("")}</div>
      <div class="fnt" style="display:flex;align-items:baseline;justify-content:space-between;gap:20px;border-top:1px solid var(--hair);padding-top:${P ? 26 : 18}px"><span style="font:400 ${P ? 64 : 54}px var(--bf);color:var(--b1)">${B.tagline}</span><span class="label">${B.font}</span></div>
      <div class="tone" style="display:flex;gap:14px;flex-wrap:wrap">${T(["دافي", "قريب", "بيهزّر"], ["راقي", "دافئ", "كريم"]).map((x) => `<span class="chip" style="font-size:34px;padding:12px 28px">${x}</span>`).join("")}</div>`;
    const log = $("div", null, null, col); css(log, { display: "flex", gap: "14px", flexWrap: "wrap", justifyContent: "center" });
    fadeIn(bar, s.start + 0.15);
    const tType = s.start + 0.35, dType = Math.min(1.4, B.url.length * 0.07);
    type(bar.querySelector(".u"), B.url, tType, dType);
    const go = bar.querySelector(".go"), cur = cursor(f.sc, { x: P ? 900 : 1100, y: P ? 1500 : 900 });
    moveClick(cur, centre(go), tType + dType + 0.5, 0.5);
    tl.to(cur.c, { opacity: 0, duration: 0.3 }, tType + dType + 1.1);
    tl.to(bar.querySelector(".caret"), { opacity: 0, duration: 0.1 }, tType + dType + 0.5);
    fadeIn(card, tType + dType + 0.7, 0.5, 40);
    pop(card.querySelector(".lg"), at(s, T("اللوجو", "الشعار"), 0.35));
    fadeIn(card.querySelector(".nm"), at(s, T("اللوجو", "الشعار"), 0.35) + 0.15);
    const sw = card.querySelectorAll(".pal > div"); gsap.set(sw, { scaleY: 0, transformOrigin: "bottom" });
    tl.to(sw, { scaleY: 1, duration: 0.45, ease: "back.out(1.5)", stagger: 0.1 }, at(s, "الألوان", 0.55));
    fadeIn(card.querySelector(".fnt"), at(s, "الخطوط", 0.7));
    const tone = card.querySelectorAll(".tone .chip"); tone.forEach((c, k) => pop(c, at(s, T("كلامك", "أسلوبك"), 0.85) + k * 0.12));
    ["الصفحات", "الشاشات", "الألوان", "الخطوط"].forEach((x, k) => { const c = $("span", "chip", `<span class="dot"></span>${x}`, log); css(c, { fontSize: "30px", padding: "12px 24px" }); pop(c, tType + dType + 0.9 + k * 0.35); sfx(tType + dType + 0.9 + k * 0.35, "ui/rollover2.ogg", 0.3); });
    if (!P) css(log, { display: "none" });
  };

  S.kinds = (s, f) => {
    const K = [["video", "فيديو موشن", "فيديو"], ["image", "بوست", "بوست"], ["carousel", "كاروسيل", "كاروسيل"], ["story", "ستوري", "ستوري"], ["cover", T("غلاف الصفحة", "غلاف الصفحة"), "غلاف"], ["text", "نص بس", null]];
    const g = $("div", null, null, f.vis); css(g, { display: "grid", gridTemplateColumns: P ? "1fr 1fr" : "1fr 1fr 1fr", gap: "28px", width: P ? "900px" : "920px" });
    const cards = K.map(([k, l]) => { const c = $("div", "panel", `${icon(k, P ? 92 : 80)}<div style="font:600 ${P ? 46 : 40}px var(--display);margin-top:20px">${l}</div>`, g); css(c, { padding: P ? "46px 40px" : "40px 34px", color: "var(--ink)" }); return c; });
    const centres = cards.map(centre);
    cards.forEach((c, k) => pop(c, s.start + 0.2 + k * 0.08, { from: 0.9, y: 30 }));
    const cur = cursor(f.sc, { x: P ? 540 : 700, y: P ? 1700 : 1000 });
    let prev = null;
    K.forEach(([, , key], k) => {
      if (!key) return;
      const t = at(s, key, 0.2 + k * 0.14);
      moveClick(cur, { x: centres[k].x + 40, y: centres[k].y + 30 }, t, 0.45);
      tl.to(cards[k], { backgroundColor: "#5558e3", color: "#ffffff", scale: 1.06, duration: 0.25, ease: "back.out(2)" }, t);
      if (prev != null) tl.to(cards[prev], { backgroundColor: "#ffffff", color: "#14141c", scale: 1, duration: 0.25 }, t);
      prev = k;
    });
  };

  S.wall = (s, f) => {
    const box = $("div", null, null, f.vis); css(box, { position: "relative", width: "100%", height: "100%" });
    // [kind, width, left, top, tag] inside the visual box (P 960×1150, L 960×900)
    const items = P
      ? [["post", 360, 580, 20, "INSTAGRAM 4:5"], ["story", 250, 300, 30, "STORY 9:16"], ["video", 250, 20, 30, "REELS"], ["cover", 920, 20, 540, "FACEBOOK COVER"]]
      : [["post", 330, 610, 30, "INSTAGRAM 4:5"], ["story", 235, 340, 20, "STORY 9:16"], ["video", 235, 60, 20, "REELS"], ["cover", 900, 30, 500, "FACEBOOK COVER"]];
    const els = items.map(([k, w, x, y, tag], idx) => {
      const wrap = $("div", null, null, box); css(wrap, { position: "absolute", left: x + "px", top: y + "px" });
      const d = design(k, w); wrap.appendChild(d);
      const tg = $("div", "tag", tag, wrap); css(tg, { top: "-18px", left: "18px" });
      return wrap;
    });
    // a carousel stack behind
    const car = $("div", null, null, box); css(car, { position: "absolute", left: "350px", top: "900px", display: P ? "block" : "none" });
    for (let k = 2; k >= 0; k--) { const d = design("square", 200, { text: C.carousel, dark: k === 0 }); css(d, { position: "absolute", left: k * 22 + "px", top: k * 14 + "px", opacity: 1 - k * 0.2 }); car.appendChild(d); }
    const ctag = $("div", "tag", "CAROUSEL", car); css(ctag, { top: "-18px", left: "18px" });
    const t0 = s.start + 0.35;
    els.forEach((e, k) => { const t = t0 + k * BEAT; gsap.set(e, { opacity: 0, y: 160, rotation: (k % 2 ? 6 : -6), scale: 0.85 }); tl.to(e, { opacity: 1, y: 0, rotation: (k % 2 ? 2 : -2), scale: 1, duration: 0.7, ease: "expo.out" }, t); sfx(t, "casino/card-place-" + (1 + (k % 4)) + ".ogg", 0.45); tl.to(e, { y: -24 - k * 6, duration: s.end - t, ease: "none" }, t + 0.7); });
    if (P) { pop(car, t0 + 2 * BEAT + BEAT / 2, { from: 0.8, rot: 8, toRot: 4 }); sfx(t0 + 2.5 * BEAT, "casino/card-fan-1.ogg", 0.4); }
  };

  S.phone = (s, f) => {
    const row = $("div", null, null, f.vis); css(row, { position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" });
    const ph = $("div", "phone", `<div class="notch"></div><div class="scr"></div>`, row);
    css(ph, { transform: `scale(${P ? 1.16 : 0.86})`, transformOrigin: "center" });
    const scr = ph.querySelector(".scr");
    scr.innerHTML = `<div style="padding:84px 26px 18px;display:flex;align-items:center;gap:16px;font:600 26px var(--display)">${logo(64)}<div><div>${B.name}</div><div style="font:400 20px var(--display);color:var(--muted)">${T("ممول", "ممول")}</div></div><div style="margin-inline-start:auto;font-size:30px">···</div></div><div class="img"></div><div style="display:flex;gap:26px;padding:18px 26px;font-size:40px">♡ <span>💬</span> <span>↗</span></div><div style="padding:0 26px;font:400 25px/1.5 var(--display)"><b>${B.name}</b> ${C.caption}</div>`;
    const d = design("post", 434); scr.querySelector(".img").appendChild(d); css(d, { borderRadius: "0", boxShadow: "none" });
    pop(ph, s.start + 0.2, { from: 0.9, y: 80 });
    const ask = $("div", "panel", `<div class="label">${T("طلب تعديل", "طلب تعديل")}</div><div style="display:flex;align-items:center;gap:18px;margin-top:12px"><span class="q" style="font:500 40px var(--display)"></span><span class="caret"></span></div>`, row);
    css(ask, { position: "absolute", padding: "26px 34px", borderRadius: "34px 34px 34px 8px", bottom: P ? "40px" : "120px", right: P ? "0" : "-20px", maxWidth: "680px" });
    const send = $("div", "btn lit", T("ابعت", "أرسل"), ask); css(send, { marginTop: "18px", padding: "14px 34px", fontSize: "32px" });
    const tAsk = at(s, T("تغيّر", "تعدّل"), 0.55);
    fadeIn(ask, tAsk - 0.5, 0.4, 40);
    type(ask.querySelector(".q"), s.data.ask, tAsk - 0.3, 1.0);
    const cur = cursor(f.sc, { x: P ? 900 : 1400, y: P ? 1750 : 1000 });
    moveClick(cur, centre(send), tAsk + 0.9, 0.45);
    // the change lands: a shimmer, then the post updates
    const sh = $("div", null, null, d); css(sh, { position: "absolute", inset: 0, background: "linear-gradient(100deg, transparent 30%, rgba(255,255,255,.75) 50%, transparent 70%)", transform: "translateX(-120%)" });
    tl.to(sh, { x: "240%", duration: 0.9, ease: "power2.inOut" }, tAsk + 1.1);
    if (/أكبر/.test(s.data.ask)) tl.to(d.querySelector(".dtitle"), { scale: 1.22, transformOrigin: "right top", duration: 0.5, ease: "back.out(1.6)" }, tAsk + 1.5);
    else tl.to(d, { backgroundColor: "#fffaf3", duration: 0.6 }, tAsk + 1.5);
    const ok = $("div", "chip", `${icon("check", 30, "var(--ok)")} ${T("اتعدّل", "تم التعديل")}`, row); css(ok, { position: "absolute", top: P ? "30px" : "80px", left: P ? "40px" : "60px", fontSize: "34px" });
    pop(ok, tAsk + 1.8); sfx(tAsk + 1.8, "interface/bong_001.ogg", 0.5);
  };

  S.price = (s, f) => {
    const t = $("div", "panel", null, f.vis); css(t, { width: P ? "860px" : "820px", padding: P ? "54px 60px" : "44px 54px", position: "relative" });
    const free = s.data?.stamp ?? T("ببلاش", "مجاناً");
    const rows = s.data?.rows ?? [["المسودّات", free], ["التعديلات", free], [T("طلبات التغيير", "طلبات التغيير"), free]];
    const total = s.data?.total ?? [T("بتدفع على", "تدفع على"), T("اللي تنزّله بس", "اللي تنزّله بس")];
    t.innerHTML = `<div class="label">${B.latin || B.name}</div>` + rows.map(([a, b]) => `<div class="r" style="display:flex;justify-content:space-between;align-items:center;padding:${P ? 30 : 22}px 0;border-bottom:2px dashed var(--hair);font:500 ${P ? 48 : 42}px var(--display)"><span>${a}</span><span style="color:var(--ok);font-weight:700">${b}</span></div>`).join("") +
      `<div class="r" style="display:flex;justify-content:space-between;align-items:center;padding-top:${P ? 34 : 26}px;font:700 ${P ? 50 : 44}px var(--display)"><span>${total[0]}</span><span style="color:var(--gold)">${total[1]}</span></div>`;
    const rs = t.querySelectorAll(".r");
    fadeIn(t, s.start + 0.15, 0.4, 50);
    rs.forEach((r, k) => { fadeIn(r, s.start + 0.45 + k * 0.32, 0.35, 20); sfx(s.start + 0.45 + k * 0.32, "ui/rollover2.ogg", 0.3); });
    const st = $("div", null, `<div style="font:800 54px var(--display)">${free}</div>${s.data?.stampSub === "" ? "" : `<div class="mono" style="font-size:20px;letter-spacing:.2em">${s.data?.stampSub ?? "FREE TO TRY"}</div>`}`, t);
    css(st, { position: "absolute", top: P ? "-70px" : "-60px", left: "-30px", padding: "22px 36px", border: "6px solid var(--rec)", color: "var(--rec)", borderRadius: "20px", textAlign: "center", background: "rgba(255,255,255,.9)" });
    const tSt = at(s, s.data?.stampWord ?? T("ببلاش", "مجانية"), 0.4);
    gsap.set(st, { opacity: 0, scale: 2.4, rotation: -24 }); tl.to(st, { opacity: 1, scale: 1, rotation: -12, duration: 0.35, ease: "power4.in" }, tSt);
    tl.to(t, { x: 10, duration: 0.05, yoyo: true, repeat: 3 }, tSt + 0.35); sfx(tSt + 0.33, "impact/impactSoft_heavy_001.ogg", 0.55);
  };

  S.cta = (s, f) => {
    f.sc.classList.add("full");
    const wm = $("div", null, mark(P ? 110 : 96), null);
    f.head.insertBefore(wm, f.title); fadeIn(wm, s.start + 0.05);
    const btn = $("div", "btn lit", `${s.data?.button ?? T("الوصول المبكر", "الوصول المبكر")} ←`, f.head); css(btn, { fontSize: P ? "52px" : "48px", padding: "30px 70px", marginTop: "30px" });
    const bio = $("div", null, `${icon("up", 44)}<span>${s.sub ?? ""}</span>`, f.head);
    css(bio, { display: "flex", alignItems: "center", gap: "14px", font: "500 44px var(--display)", color: "var(--brand)", marginTop: "10px" });
    if (f.sub) f.sub.remove();
    pop(btn, s.start + 0.7, { from: 0.7 });
    tl.to(btn, { scale: 1.06, duration: BEAT, yoyo: true, repeat: Math.max(1, Math.floor((s.end - s.start - 1) / BEAT)), ease: "sine.inOut" }, s.start + 1.3);
    fadeIn(bio, s.start + 1.0);
    tl.to(bio.querySelector("span"), { y: -12, duration: 0.4, yoyo: true, repeat: 7, ease: "sine.inOut" }, s.start + 1.2);
    const cur = cursor(f.sc, { x: P ? 900 : 1500, y: P ? 1700 : 950 });
    moveClick(cur, (() => { const c = centre(btn); return { x: c.x + 80, y: c.y + 10 }; })(), Math.min(s.end - 1, s.vo.end + 0.2), 0.6);
    tl.to(".aurora", { opacity: 0.62, duration: 1 }, s.start);
  };

  S.calendar = (s, f) => {
    const col = $("div", null, null, f.vis); css(col, { display: "flex", flexDirection: "column", gap: "26px", width: P ? "940px" : "920px" });
    const cal = $("div", "panel", null, col); css(cal, { padding: P ? "34px" : "26px" });
    const cw = P ? 120 : 118, ch = P ? 104 : 74;
    cal.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px"><span style="font:700 46px var(--display)">${s.data.month}</span><span class="label">${T("مواسم مصر", "مواسم السعودية")}</span></div>
      <div class="g" style="display:grid;grid-template-columns:repeat(7, 1fr);gap:8px">${["س", "ح", "ن", "ث", "ر", "خ", "ج"].map((d) => `<div style="text-align:center;font:600 26px var(--display);color:var(--muted)">${d}</div>`).join("")}${Array.from({ length: 35 }, (_, k) => `<div class="c" data-d="${k + 1}" style="height:${ch}px;border-radius:16px;background:var(--panel2);display:flex;align-items:flex-start;justify-content:flex-start;padding:8px 12px;font:500 28px var(--display);color:var(--ink2);position:relative">${k < 31 ? N(k + 1) : ""}</div>`).join("")}</div>`;
    const list = $("div", null, null, col); css(list, { display: "flex", flexDirection: "column", gap: "14px", minHeight: P ? "420px" : "0" });
    fadeIn(cal, s.start + 0.15, 0.45, 40);
    const KC = { big: "var(--brand)", pay: "var(--gold)", nat: "var(--ok)", fest: "var(--rec)", shop: "var(--ink)", edu: "var(--brand2)" };
    const show = P ? s.data.seasons.length : 3;
    s.data.seasons.forEach((x, k) => {
      const t = at(s, x.n.split(" ")[x.n.startsWith("ال") || x.n.split(" ").length === 1 ? 0 : 1], 0.25 + (k * 0.6) / s.data.seasons.length);
      const cell = cal.querySelector(`.c[data-d="${x.d}"]`);
      tl.to(cell, { backgroundColor: KC[x.k], color: "#ffffff", duration: 0.25 }, t);
      tl.fromTo(cell, { scale: 1.25 }, { scale: 1, duration: 0.45, ease: "back.out(2)", immediateRender: false }, t);
      sfx(t, "interface/drop_002.ogg", 0.35);
      if (k >= show && !P) return;
      const r = $("div", "panel", `<span style="width:16px;height:52px;border-radius:8px;background:${KC[x.k]}"></span><span style="font:600 ${P ? 40 : 34}px var(--display)">${x.n}</span><span class="mono" style="margin-inline-start:auto;font-size:28px;color:var(--muted)">${N(x.d)} ${s.data.month}</span><span class="chip" style="font-size:24px;padding:8px 18px">${x.k === "big" ? "~ متوقّع" : "◆ ثابت"}</span>`, list);
      css(r, { display: "flex", alignItems: "center", gap: "20px", padding: P ? "18px 26px" : "12px 22px", borderRadius: "22px" });
      if (k >= (P ? 4 : 3)) { css(r, { display: "none" }); return; }
      fadeIn(r, t + 0.05, 0.35, 20);
    });
    if (s.data.work) {
      const kinds = ["ريلز", "بوست", "ستوري", "بوست", "كاروسيل", "ريلز", "بوست", "ستوري"], days = [4, 6, 11, 13, 15, 20, 25, 29], t0 = s.vo.start + (s.vo.end - s.vo.start) * 0.45;
      days.forEach((d, k) => { const cell = cal.querySelector(`.c[data-d="${d}"]`); const c = $("div", null, kinds[k], cell); css(c, { position: "absolute", bottom: "6px", insetInline: "6px", borderRadius: "10px", background: "var(--lav)", color: "var(--brand)", font: "600 20px var(--display)", textAlign: "center", padding: "3px 0" }); pop(c, t0 + k * 0.12, { from: 0.4, y: -30 }); sfx(t0 + k * 0.12, "casino/card-place-" + (1 + (k % 4)) + ".ogg", 0.25); });
    }
  };

  S.notice = (s, f) => {
    const box = $("div", null, null, f.vis); css(box, { position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" });
    // the studio behind, quiet
    const bg = $("div", "panel", null, box); css(bg, { width: P ? "880px" : "900px", height: P ? "1000px" : "760px", opacity: 0.55, padding: "40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignContent: "start", filter: "blur(2px)" });
    bg.innerHTML = Array.from({ length: 6 }, (_, k) => `<div style="height:${P ? 260 : 190}px;border-radius:22px;background:${k % 3 === 0 ? "var(--lav)" : "var(--panel2)"}"></div>`).join("");
    fadeIn(bg, s.start + 0.1, 0.4, 0);
    const bell = $("div", "panel", `${icon("bell", 56)}<i style="position:absolute;top:14px;right:16px;width:24px;height:24px;border-radius:50%;background:var(--rec);border:4px solid #fff"></i>`, box);
    css(bell, { position: "absolute", top: "0", left: P ? "40px" : "20px", width: "110px", height: "110px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" });
    pop(bell, s.start + 0.25); tl.to(bell, { rotation: 16, duration: 0.08, yoyo: true, repeat: 7, ease: "sine.inOut" }, s.start + 0.5); sfx(s.start + 0.5, "interface/bong_001.ogg", 0.55);
    const trend = s.data.kind === "trend";
    const card = $("div", "panel", null, box);
    css(card, { position: "absolute", top: P ? "150px" : "140px", width: P ? "860px" : "840px", padding: "40px 44px", boxShadow: "var(--pop)", borderRadius: "34px" });
    card.innerHTML = `<div style="display:flex;align-items:center;gap:16px"><span style="width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${trend ? "rgba(255,77,61,.12)" : "rgba(185,132,42,.14)"};color:${trend ? "var(--rec)" : "var(--gold)"}">${icon(trend ? "spark" : "cal", 36)}</span><span class="label" style="color:${trend ? "var(--rec)" : "var(--gold)"}">${trend ? "TREND · LIVE" : "SEASON"}</span>${trend ? `<span class="live" style="width:16px;height:16px;border-radius:50%;background:var(--rec)"></span>` : ""}</div>
      <div style="font:700 ${P ? 52 : 46}px/1.25 var(--display);margin-top:22px">${s.data.head}</div><div style="font:400 ${P ? 40 : 36}px/1.45 var(--display);color:var(--ink2);margin-top:12px">${s.data.body}</div>
      <div style="display:flex;gap:18px;margin-top:30px"><div class="btn lit go" style="font-size:36px;padding:20px 40px">${icon("spark", 32)} ${s.data.cta}</div><div class="btn ghost" style="font-size:36px;padding:20px 40px">${T("بعدين", "بعدين")}</div></div>
      <div class="done" style="display:flex;align-items:center;gap:14px;margin-top:26px;padding-top:24px;border-top:1px solid var(--hair);font:500 36px var(--display);color:var(--ok)">${icon("check", 36)} ${T("الفكرة جاهزة… افتحها في «اصنع جديد»", "الفكرة جاهزة… افتحها في «اصنع جديد»")}</div>`;
    const t0 = s.start + 0.65, gc = centre(card.querySelector(".go"));
    gsap.set(card, { opacity: 0, y: -120, scale: 0.94 }); tl.to(card, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "expo.out" }, t0); sfx(t0, "ui/switch1.ogg", 0.4);
    if (trend) tl.to(card.querySelector(".live"), { opacity: 0.2, duration: 0.4, yoyo: true, repeat: 9 }, t0);
    const go = card.querySelector(".go"), done = card.querySelector(".done");
    gsap.set(done, { opacity: 0, height: 0, marginTop: 0, paddingTop: 0 });
    const tClick = Math.min(s.end - 1.2, at(s, T("فكرة", "فكرة"), 0.75) + 0.3);
    const cur = cursor(f.sc, { x: P ? 900 : 1300, y: P ? 1750 : 1000 });
    moveClick(cur, gc, tClick, 0.5);
    tl.to(done, { opacity: 1, height: "auto", marginTop: 26, paddingTop: 24, duration: 0.4, ease: "power2.out" }, tClick + 0.2);
    sfx(tClick + 0.25, "interface/bong_001.ogg", 0.45);
  };

  S.plan = (s, f) => {
    const col = $("div", null, null, f.vis); css(col, { display: "flex", flexDirection: "column", gap: P ? "24px" : "18px", width: P ? "920px" : "900px" });
    const days = T(["السبت ٤", "الإثنين ٦", "الأربع ٨", "الجمعة ١٠"], ["السبت ٤", "الاثنين ٦", "الأربعاء ٨", "الجمعة ١٠"]);
    const rows = s.data.ideas.map((x, k) => {
      const [kind, text] = x.split(": ");
      const r = $("div", "panel", `<span class="chip" style="font-size:28px;padding:10px 22px;background:var(--lav);color:var(--brand);border:0">${kind}</span><span style="font:600 ${P ? 40 : 36}px var(--display);flex:1">${text}</span><span class="day mono" style="font-size:26px;color:var(--muted)"></span><span class="ok" style="width:58px;height:58px;border-radius:50%;border:3px solid var(--hair);display:flex;align-items:center;justify-content:center;color:#fff">${icon("check", 32)}</span>`, col);
      css(r, { display: "flex", alignItems: "center", gap: "22px", padding: P ? "28px 30px" : "20px 26px", borderRadius: "26px" });
      return r;
    });
    const btn = $("div", "btn", `${icon("cal", 34)} ${T("وزّع تلقائي", "وزّع تلقائياً")}`, col); css(btn, { alignSelf: "flex-start", marginTop: "10px" });
    const d = s.vo.end - s.vo.start;
    rows.forEach((r, k) => { const t = s.start + 0.3 + k * 0.28; fadeIn(r, t, 0.4, 40); sfx(t, "casino/card-slide-1.ogg", 0.3); });
    rows.forEach((r, k) => { const t = s.vo.start + d * 0.35 + k * 0.3; tl.to(r.querySelector(".ok"), { backgroundColor: "#0e9f78", borderColor: "#0e9f78", duration: 0.2 }, t); sfx(t, "interface/click_003.ogg", 0.5); });
    const tAuto = Math.min(s.end - 0.9, s.vo.start + d * 0.8);
    const cur = cursor(f.sc, { x: P ? 900 : 1300, y: P ? 1780 : 1000 });
    fadeIn(btn, s.start + 1.2);
    moveClick(cur, centre(btn), tAuto, 0.5);
    rows.forEach((r, k) => { const e = r.querySelector(".day"); tl.set(e, { textContent: days[k] }, tAuto + 0.15 + k * 0.1); tl.fromTo(e, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.3, immediateRender: false }, tAuto + 0.15 + k * 0.1); });
  };

  S.plansetup = (s, f) => {
    const p = $("div", "panel", null, f.vis); css(p, { width: P ? "920px" : "900px", padding: P ? "46px" : "34px", display: "grid", gap: P ? "36px" : "24px" });
    const R = [
      ["المدّة", ["أسبوع", "أسبوعين", "شهر"], [2], "المدّة"],
      ["في الأسبوع", ["٣", "٤", "٥", "يومي"], [3], "منشور"],
      ["الأهداف", ["مبيعات", "وعي", "موسم", "إطلاق"], [0, 1, 2], "أهدافك"],
      ["المنصّات", ["إنستقرام", "تيك توك", "سناب", "إكس"], [0, 1, 2], "المنصّات"],
    ];
    const cur = cursor(f.sc, { x: P ? 900 : 1300, y: P ? 1750 : 1000 });
    const rows = R.map(([label, opts]) => { const r = $("div", null, `<div class="label" style="margin-bottom:16px">${label}</div>`, p); const cs = $("div", null, null, r); css(cs, { display: "flex", gap: "14px", flexWrap: "wrap" }); return opts.map((o) => { const c = $("span", "chip", o, cs); css(c, { fontSize: P ? "38px" : "34px", boxShadow: "none" }); return c; }); });
    const cents = rows.map((cs) => cs.map(centre));
    fadeIn(p, s.start + 0.15, 0.45, 40);
    R.forEach(([, , on, key], k) => { const t = at(s, key, 0.15 + k * 0.2); on.forEach((j, n) => { const tt = t + n * 0.18; if (n === 0) moveClick(cur, cents[k][j], tt, 0.4); else { tl.to(cur.c, { left: cents[k][j].x - 6, top: cents[k][j].y - 4, duration: 0.16 }, tt - 0.16); sfx(tt, "ui/click2.ogg", 0.5); } tl.to(rows[k][j], { backgroundColor: "#14141c", color: "#ffffff", duration: 0.15 }, tt); }); });
    const go = $("div", "btn lit", `${icon("spark", 34)} ${T("اقترح أفكار", "اقترح أفكار")}`, p); css(go, { justifySelf: "start" });
    pop(go, s.vo.end - 0.4);
    tl.to(go, { scale: 1.06, duration: BEAT / 2, yoyo: true, repeat: 3 }, s.vo.end + 0.1);
  };

  S.livecheck = (s, f) => {
    const p = $("div", "panel", null, f.vis); css(p, { width: P ? "920px" : "900px", padding: P ? "40px" : "32px", position: "relative", overflow: "hidden" });
    const rows = [["يوم التأسيس", "٢٢ فبراير", "fixed"], ["رمضان", "~ ١٨ فبراير", "confirm"], ["موسم الرياض", "١٠ أكتوبر", "move"], ["اليوم الوطني", "٢٣ سبتمبر", "fixed"]];
    p.innerHTML = `<div style="display:flex;align-items:center;gap:14px;margin-bottom:22px"><span class="lv" style="width:18px;height:18px;border-radius:50%;background:var(--rec)"></span><span class="label" style="color:var(--rec)">LIVE · ${T("فحص يومي", "فحص يومي")}</span><span class="mono" style="margin-inline-start:auto;color:var(--muted);font-size:26px">06:00</span></div>` +
      rows.map(([n, d, k]) => `<div class="r" data-k="${k}" style="display:flex;align-items:center;gap:20px;padding:${P ? 26 : 18}px 0;border-top:1px solid var(--hair)"><span style="font:600 ${P ? 42 : 36}px var(--display);flex:1">${n}</span><span class="dt mono" style="font-size:30px;color:var(--ink2)">${d}</span><span class="st chip" style="font-size:24px;padding:8px 18px;box-shadow:none">${k === "fixed" ? "◆ ثابت" : "~ متوقّع"}</span></div>`).join("") +
      `<div class="src chip" style="margin-top:22px;font-size:28px;box-shadow:none">${icon("check", 26, "var(--ok)")} ${T("مصدر رسمي", "مصدر رسمي")} · <span class="mono" style="font-size:22px">spa.gov.sa</span></div>`;
    const scan = $("div", null, null, p); css(scan, { position: "absolute", insetInline: "0", height: "120px", top: "60px", background: "linear-gradient(transparent, rgba(85,88,227,.16), transparent)" });
    fadeIn(p, s.start + 0.15, 0.45, 40);
    tl.to(p.querySelector(".lv"), { opacity: 0.2, duration: 0.45, yoyo: true, repeat: 11 }, s.start + 0.3);
    gsap.set(scan, { opacity: 0 }); tl.to(scan, { opacity: 1, duration: 0.2 }, s.start + 0.7); tl.to(scan, { top: P ? 520 : 400, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: 1 }, s.start + 0.7); tl.to(scan, { opacity: 0, duration: 0.3 }, s.start + 3.9);
    const conf = p.querySelector('.r[data-k="confirm"]'), mv = p.querySelector('.r[data-k="move"]');
    const t1 = at(s, "يتأكد", 0.35) + 0.3, t2 = at(s, T("يعدّله", "يعدّله"), 0.75) - 0.2;
    tl.set(conf.querySelector(".st"), { innerHTML: "✓ مؤكّد" }, t1); tl.to(conf.querySelector(".st"), { backgroundColor: "#0e9f78", color: "#fff", duration: 0.2 }, t1); tl.set(conf.querySelector(".dt"), { textContent: "١٨ فبراير" }, t1); sfx(t1, "interface/bong_001.ogg", 0.45);
    const dt = mv.querySelector(".dt");
    tl.to(dt, { opacity: 0.35, textDecoration: "line-through", duration: 0.2 }, t2); tl.set(dt, { textContent: "١٧ أكتوبر", opacity: 1, textDecoration: "none", color: "#b9842a" }, t2 + 0.45);
    tl.set(mv.querySelector(".st"), { innerHTML: T("↻ اتعدّل", "↻ تعدّل") }, t2 + 0.45); tl.to(mv.querySelector(".st"), { backgroundColor: "#b9842a", color: "#fff", duration: 0.2 }, t2 + 0.45); sfx(t2 + 0.45, "ui/switch1.ogg", 0.45);
    pop(p.querySelector(".src"), t1 - 0.4);
  };

  // the founder's app (دفتر): a few real-looking screens
  const APP = [
    `<div style="padding:90px 30px 0"><div style="font:500 26px var(--display);color:var(--muted)">مبيعات النهارده</div><div style="font:700 70px var(--display);color:var(--b2);margin:6px 0 26px">١٢٬٤٥٠ <span style="font-size:34px">ج.م</span></div><div style="display:flex;align-items:flex-end;gap:14px;height:260px;padding:20px;border-radius:26px;background:var(--b3)">${[40, 64, 52, 80, 70, 95, 60].map((h, k) => `<div style="flex:1;height:${h}%;border-radius:10px;background:${k === 5 ? "var(--b4)" : "var(--b1)"}"></div>`).join("")}</div>${["فاتورة #٢٠٤ — ٨٥٠ ج.م", "فاتورة #٢٠٣ — ١٬٢٠٠ ج.م", "فاتورة #٢٠٢ — ٤٣٠ ج.م"].map((x) => `<div style="margin-top:18px;padding:22px;border-radius:20px;background:#f4f6fb;font:500 26px var(--display)">${x}</div>`).join("")}</div>`,
    `<div style="padding:90px 30px 0"><div style="font:700 44px var(--display);color:var(--b2);margin-bottom:24px">العملاء</div>${["محل الأمل", "سوبر ماركت النور", "صيدلية الشفا", "مكتبة الفجر", "كافيه ركن"].map((x, k) => `<div style="display:flex;align-items:center;gap:18px;padding:20px 0;border-bottom:1px solid #eef0f6"><span style="width:64px;height:64px;border-radius:50%;background:${k % 2 ? "var(--b3)" : "var(--b1)"};display:flex;align-items:center;justify-content:center;color:${k % 2 ? "var(--b1)" : "#fff"};font:700 30px var(--display)">${x[0]}</span><span style="font:500 28px var(--display)">${x}</span><span style="margin-inline-start:auto;font:600 24px var(--mono);color:var(--b4)">+${(k + 2) * 3}%</span></div>`).join("")}</div>`,
    `<div style="padding:90px 30px 0"><div style="font:700 44px var(--display);color:var(--b2)">التقرير الأسبوعي</div><div style="margin:26px 0;padding:30px;border-radius:26px;background:var(--b2);color:#fff"><div style="font:500 26px var(--display);opacity:.7">الأسبوع ده</div><div style="font:700 64px var(--display)">٨٤٬٢٠٠ ج.م</div><div style="font:600 28px var(--display);color:var(--b4)">▲ ١٨٪</div></div><div style="padding:24px;border-radius:22px;background:#e7f9f0;display:flex;align-items:center;gap:16px;font:500 26px var(--display)"><span style="width:52px;height:52px;border-radius:50%;background:#25d366"></span>بيتبعت على الواتساب كل أحد</div></div>`,
  ];

  S.appcapture = (s, f) => {
    const row = $("div", null, null, f.vis); css(row, { position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "40px", flexDirection: P ? "column" : "row-reverse" });
    const ph = $("div", "phone", `<div class="notch"></div><div class="scr"></div>`, row); css(ph, { transform: `scale(${P ? 0.68 : 0.7})`, margin: P ? "-120px 0 -170px" : "-144px -70px" });
    const scr = ph.querySelector(".scr");
    const pages = APP.map((h) => { const pg = $("div", null, h, scr); css(pg, { position: "absolute", inset: 0, background: "#fff" }); return pg; });
    const vf = $("div", null, `<i style="position:absolute;top:0;left:0;width:70px;height:70px;border-top:8px solid var(--rec);border-left:8px solid var(--rec)"></i><i style="position:absolute;top:0;right:0;width:70px;height:70px;border-top:8px solid var(--rec);border-right:8px solid var(--rec)"></i><i style="position:absolute;bottom:0;left:0;width:70px;height:70px;border-bottom:8px solid var(--rec);border-left:8px solid var(--rec)"></i><i style="position:absolute;bottom:0;right:0;width:70px;height:70px;border-bottom:8px solid var(--rec);border-right:8px solid var(--rec)"></i><span class="label" style="position:absolute;top:-46px;left:0;color:var(--rec)">● REC · CAPTURE</span>`, ph);
    css(vf, { position: "absolute", inset: "-34px" });
    const strip = $("div", null, null, row); css(strip, { display: "flex", flexDirection: P ? "row" : "column", gap: "20px" });
    const thumbs = APP.map(() => { const t = $("div", "panel", null, strip); css(t, { width: P ? "150px" : "130px", height: P ? "300px" : "260px", overflow: "hidden", padding: "0", borderRadius: "22px", position: "relative" }); return t; });
    APP.forEach((h, k) => { const m = $("div", null, h, thumbs[k]); css(m, { width: "434px", height: "900px", transform: `scale(${P ? 150 / 434 : 130 / 434})`, transformOrigin: "top right", position: "absolute", top: 0, right: 0 }); });
    pop(ph, s.start + 0.2, { from: 0.92, y: 60 });
    pages.forEach((pg, k) => gsap.set(pg, { opacity: k === 0 ? 1 : 0 }));
    gsap.set(vf, { opacity: 0 }); tl.to(vf, { opacity: 1, duration: 0.3 }, s.start + 0.6);
    tl.to(vf, { scale: 1.03, duration: 0.5, yoyo: true, repeat: 7, ease: "sine.inOut" }, s.start + 0.6);
    const d = s.vo.end - s.vo.start;
    thumbs.forEach((th, k) => {
      const t = s.vo.start + 0.6 + (k * d * 0.75) / 3;
      if (k > 0) { tl.to(pages[k], { opacity: 1, duration: 0.25 }, t - 0.35); }
      tl.fromTo(scr, { filter: "brightness(2)" }, { filter: "brightness(1)", duration: 0.35, immediateRender: false }, t);
      sfx(t, "ui/switch10.ogg", 0.5);
      pop(th, t + 0.1, { from: 0.4, y: P ? 60 : 0 });
    });
    const cnt = $("div", "chip", `<span class="dot" style="background:var(--rec)"></span><span class="n">٠</span> ${T("شاشات اتصوّرت", "شاشات")}`, f.vis);
    css(cnt, { position: "absolute", top: P ? "-40px" : "20px", left: P ? "0" : "0", fontSize: "34px" });
    pop(cnt, s.vo.start + 0.5);
    const o = { v: 0 }; tl.to(o, { v: 12, duration: d * 0.85, ease: "none", onUpdate: () => (cnt.querySelector(".n").textContent = N(Math.round(o.v))) }, s.vo.start + 0.6);
  };

  S.update = (s, f) => {
    const p = $("div", "panel", null, f.vis); css(p, { width: P ? "920px" : "900px", padding: P ? "44px" : "34px", display: "grid", gap: P ? "30px" : "22px" });
    p.innerHTML = `<div style="display:flex;gap:14px;flex-wrap:wrap">${["فيديو", "بوست", "ستوري"].map((x, k) => `<span class="chip ${k === 0 ? "on" : ""}" style="font-size:32px;box-shadow:none">${x}</span>`).join("")}</div>
      <div><div class="label" style="margin-bottom:14px">CONTENT TYPE</div><div style="display:flex;gap:14px"><span class="chip ct0" style="font-size:34px;box-shadow:none">عام</span><span class="chip ct1" style="font-size:34px;box-shadow:none">${icon("spark", 28)} تحديث في المنتج</span></div></div>
      <div><div style="font:600 40px var(--display);margin-bottom:14px">إيه اللي اتغيّر؟</div><div style="min-height:${P ? 230 : 170}px;border-radius:24px;background:var(--panel2);padding:26px 30px;font:400 ${P ? 40 : 36}px/1.55 var(--display)"><span class="b"></span><span class="caret"></span></div></div>
      <div style="display:flex;gap:18px;align-items:center"><div class="up" style="width:${P ? 170 : 140}px;height:${P ? 170 : 140}px;border-radius:24px;border:4px dashed rgba(20,20,30,.2);display:flex;align-items:center;justify-content:center;font:300 80px var(--display);color:var(--muted)">+</div><div class="r1" style="width:${P ? 170 : 140}px;height:${P ? 170 : 140}px;border-radius:24px;overflow:hidden;position:relative;background:var(--b3)"></div><div class="r2" style="width:${P ? 170 : 140}px;height:${P ? 170 : 140}px;border-radius:24px;overflow:hidden;position:relative;background:var(--b2);display:flex;align-items:center;justify-content:center;color:#fff">${icon("play", 60)}</div><div class="btn lit go" style="margin-inline-start:auto">${icon("spark", 34)} اصنع</div></div>`;
    const r1 = p.querySelector(".r1"); const m = $("div", null, APP[2], r1); css(m, { width: "434px", height: "900px", transform: `scale(${(P ? 170 : 140) / 434})`, transformOrigin: "top right", position: "absolute", top: 0, right: 0 });
    fadeIn(p, s.start + 0.15, 0.45, 40);
    const cur = cursor(f.sc, { x: P ? 900 : 1300, y: P ? 1780 : 1000 });
    const ct1 = p.querySelector(".ct1"), up = p.querySelector(".up"), go = p.querySelector(".go");
    const cC = centre(ct1), cU = centre(up), cG = centre(go);
    moveClick(cur, cC, s.start + 0.8, 0.45); tl.to(ct1, { backgroundColor: "#5558e3", color: "#fff", duration: 0.2 }, s.start + 0.8);
    const tB = at(s, "اكتبله", 0.05) + 0.2, dB = Math.min(2.6, (s.vo.end - s.vo.start) * 0.55);
    type(p.querySelector(".b"), s.data.brief, tB, dB);
    const tU = at(s, "ارفع", 0.7);
    moveClick(cur, cU, tU, 0.45);
    [p.querySelector(".r1"), p.querySelector(".r2")].forEach((e, k) => pop(e, tU + 0.25 + k * 0.25, { from: 0.5 }));
    moveClick(cur, cG, Math.min(s.end - 0.5, s.vo.end + 0.25), 0.45);
  };

  S.appvideo = (s, f) => {
    const col = $("div", null, null, f.vis); css(col, { display: "flex", flexDirection: "column", alignItems: "center", gap: "26px" });
    const pw = P ? 560 : 900, phh = P ? 996 : 506;
    const pl = $("div", null, null, col); css(pl, { width: pw + "px", height: phh + "px", borderRadius: "34px", overflow: "hidden", position: "relative", background: "var(--b2)", boxShadow: "var(--pop)" });
    const glow = $("div", null, null, pl); css(glow, { position: "absolute", inset: "-20%", background: "radial-gradient(circle at 70% 30%, var(--b1), transparent 55%)", opacity: 0.8 });
    const hl = $("div", null, C.video, pl); css(hl, { position: "absolute", right: P ? "44px" : "50px", top: P ? "70px" : "70px", width: P ? "470px" : "400px", font: `700 ${P ? 66 : 58}px/1.15 var(--display)`, color: "#fff", textAlign: "right" });
    const ph = $("div", "phone", `<div class="notch"></div><div class="scr">${APP[2]}</div>`, pl); css(ph, { position: "absolute", left: "50%", top: P ? "300px" : "50px", marginLeft: P ? "-235px" : "-470px", transform: `scale(${P ? 0.72 : 0.5})`, transformOrigin: "top center" });
    const msg = $("div", null, `<div style="font:600 26px var(--display);color:#075e54">دفتر</div><div style="font:500 30px/1.4 var(--display)">تقرير الأسبوع: ٨٤٬٢٠٠ ج.م ▲ ١٨٪</div>`, pl);
    css(msg, { position: "absolute", left: P ? "40px" : "auto", right: P ? "auto" : "60px", bottom: P ? "120px" : "70px", padding: "20px 26px", borderRadius: "22px 22px 22px 6px", background: "#dcf8c6", maxWidth: "420px", boxShadow: "0 20px 40px -16px rgba(0,0,0,.4)" });
    const bar = $("div", null, `<div class="fill" style="height:100%;width:0;background:var(--brand);border-radius:999px"></div>`, col); css(bar, { width: pw + "px", height: "12px", borderRadius: "999px", background: "rgba(20,20,30,.1)" });
    const wave = $("div", null, null, col); css(wave, { display: "flex", gap: "8px", height: "70px", alignItems: "center" });
    const bars = Array.from({ length: 28 }, () => { const b = $("i", null, null, wave); css(b, { width: "10px", height: "20px", borderRadius: "6px", background: "var(--brand)", opacity: 0.7 }); return b; });
    const tags = $("div", null, ["9:16", "30s", "♫ على المزيكا"].map((x) => `<span class="chip" style="font-size:28px;padding:10px 22px">${x}</span>`).join(""), col); css(tags, { display: "flex", gap: "12px" });
    if (!P) css(tags, { display: "none" });
    pop(pl, s.start + 0.2, { from: 0.85 });
    const d = s.end - s.start;
    tl.to(bar.querySelector(".fill"), { width: "100%", duration: d - 0.5, ease: "none" }, s.start + 0.3);
    rise(hl, s.start + 0.6, { stagger: 0.09 });
    gsap.set(ph, { y: 300, opacity: 0 }); tl.to(ph, { y: 0, opacity: 1, duration: 0.8, ease: "expo.out" }, s.start + 0.9 + BEAT);
    pop(msg, s.start + 0.9 + 3 * BEAT, { from: 0.5, y: 40 }); sfx(s.start + 0.9 + 3 * BEAT, "interface/bong_001.ogg", 0.5);
    for (let t = s.start + 0.5, k = 0; t < s.end - 0.3; t += BEAT, k++) {
      tl.to(glow, { scale: 1.12, duration: 0.08 }, t).to(glow, { scale: 1, duration: BEAT * 0.8 }, t + 0.08);
      bars.forEach((b, j) => tl.to(b, { height: 14 + Math.abs(Math.sin(j * 1.7 + k * 0.9)) * 56, duration: BEAT * 0.45, ease: "sine.out" }, t));
    }
  };

  S.editroom = (s, f) => {
    const p = $("div", "panel", null, f.vis); css(p, { width: P ? "940px" : "920px", padding: P ? "30px" : "24px", display: "flex", flexDirection: "column", gap: "22px", background: "#17171f", color: "#fff", border: "0" });
    const vw = P ? 880 : 860, vh = P ? 640 : 420;
    p.innerHTML = `<div style="display:flex;align-items:center;gap:14px"><span class="label" style="color:#9a99a8">EDIT ROOM</span><span class="mono" style="margin-inline-start:auto;color:#9a99a8;font-size:24px">00:14 / 00:30</span></div>
      <div class="pv" style="position:relative;width:${vw}px;height:${vh}px;border-radius:20px;overflow:hidden;background:var(--b2)"></div>
      <div class="tlx" style="display:flex;gap:6px;height:64px">${[18, 14, 20, 16, 12, 20].map((w, k) => `<div style="flex:${w};border-radius:12px;background:${k === 2 ? "#5558e3" : "#2a2a35"};display:flex;align-items:center;justify-content:center;font:500 22px var(--mono);color:${k === 2 ? "#fff" : "#9a99a8"}">S${k + 1}</div>`).join("")}</div>
      <div style="display:flex;gap:16px"><div class="btn ask" style="background:#fff;color:#14141c;font-size:34px;padding:20px 38px">${icon("spark", 30)} ${s.data.ask}</div><div class="btn" style="background:#2a2a35;font-size:34px;padding:20px 38px">${T("تصدير", "تصدير")}</div></div>`;
    const pv = p.querySelector(".pv");
    const gl = $("div", null, null, pv); css(gl, { position: "absolute", inset: 0, background: "radial-gradient(circle at 25% 60%, var(--b1), transparent 55%)" });
    const artE = $("div", null, art(vh * 0.8), pv); css(artE, { position: "absolute", left: "6%", bottom: "4%" });
    const hl = $("div", null, C.post, pv); css(hl, { position: "absolute", right: "7%", top: "16%", font: `400 ${P ? 76 : 60}px/1.1 var(--bf)`, color: "var(--b3)", padding: "10px 16px" });
    const sel = $("div", null, `<i style="position:absolute;top:-10px;left:-10px;width:20px;height:20px;background:#fff;border:3px solid #5558e3"></i><i style="position:absolute;bottom:-10px;right:-10px;width:20px;height:20px;background:#fff;border:3px solid #5558e3"></i>`, hl); css(sel, { position: "absolute", inset: 0, border: "3px solid #5558e3", borderRadius: "6px", opacity: 0 });
    fadeIn(p, s.start + 0.15, 0.45, 40);
    const cur = cursor(f.sc, { x: P ? 900 : 1300, y: P ? 1780 : 1000 });
    const cH = centre(hl), tMove = at(s, T("حرّك", "تعدّل"), 0.25);
    moveClick(cur, cH, tMove, 0.5); tl.to(sel, { opacity: 1, duration: 0.15 }, tMove);
    tl.to([hl], { y: P ? 160 : 110, x: -40, duration: 0.7, ease: "power2.inOut" }, tMove + 0.25);
    tl.to(cur.c, { top: `+=${P ? 160 : 110}`, left: "-=40", duration: 0.7, ease: "power2.inOut" }, tMove + 0.25);
    const tText = at(s, T("الكلام", "بنفسك"), 0.45);
    const newText = AD.brandKey === "daftar" ? "تقاريرك<br>كل أحد" : AD.brandKey === "sekka" ? "صباحك<br>على السكة" : "ضيافتك<br>غير";
    tl.set(hl, { innerHTML: newText }, tText); tl.fromTo(hl, { opacity: 0.2 }, { opacity: 1, duration: 0.3, immediateRender: false }, tText); sfx(tText, "keyboard/keypress-004.wav", 0.4);
    tl.add(() => {}, tText); tl.set(sel, { opacity: 0 }, tText + 0.6);
    const ask = p.querySelector(".ask"), tAsk = Math.min(s.end - 1.6, at(s, "المخرج", 0.75));
    moveClick(cur, centre(ask), tAsk, 0.5);
    const ov = $("div", null, `<div style="width:64px;height:64px;border-radius:50%;border:6px solid rgba(255,255,255,.25);border-top-color:#fff" class="spin"></div><div style="font:500 36px var(--display)">${T("المخرج بيعيد المشهد…", "المخرج يعيد المشهد…")}</div>`, pv);
    css(ov, { position: "absolute", inset: 0, background: "rgba(10,10,16,.72)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "22px", color: "#fff", opacity: 0 });
    tl.to(ov, { opacity: 1, duration: 0.25 }, tAsk + 0.15);
    tl.to(ov.querySelector(".spin"), { rotation: 720, duration: 1.4, ease: "none" }, tAsk + 0.15);
    tl.to(ov, { opacity: 0, duration: 0.3 }, tAsk + 1.3);
    tl.to(gl, { background: "radial-gradient(circle at 75% 40%, var(--b4), transparent 55%)", duration: 0.01 }, tAsk + 1.3);
    const ok = $("div", "chip", `${icon("check", 28, "var(--ok)")} ${T("نسخة جديدة", "نسخة جديدة")}`, f.vis); css(ok, { position: "absolute", top: P ? "-10px" : "20px", left: "40px", fontSize: "32px", color: "var(--ink)" });
    pop(ok, tAsk + 1.4); sfx(tAsk + 1.4, "interface/bong_001.ogg", 0.5);
  };

  // ── the client's real screen, rebuilt as code (studio engine: the screenshot-to-code step) ──
  // s.data: { device: "phone" | "desktop", html (the rebuilt screen, sized w×h), w, h, dir, actions: [{ k, do, text?, word }],
  // callout?, calloutWord? } — every action fires on its word in the voiceover, like the ads' hand-built UI scenes.
  S.screen = (s, f) => {
    const d = s.data, desk = d.device === "desktop";
    const row = $("div", null, null, f.vis); css(row, { position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" });
    let dev;
    if (desk) {
      dev = $("div", "panel", null, row); css(dev, { width: d.w + "px", overflow: "hidden" });
      dev.innerHTML = `<div style="display:flex;align-items:center;gap:18px;padding:16px 22px;border-bottom:1px solid var(--hair)"><div style="display:flex;gap:9px" dir="ltr"><i style="width:16px;height:16px;border-radius:50%;background:#ff5f57"></i><i style="width:16px;height:16px;border-radius:50%;background:#febc2e"></i><i style="width:16px;height:16px;border-radius:50%;background:#28c840"></i></div><div style="flex:1;background:var(--panel2);border-radius:999px;padding:10px 22px;font:500 24px var(--mono);direction:ltr;text-align:left">${B.url}</div></div><div class="scr" style="position:relative;width:${d.w}px;height:${d.h}px;overflow:hidden;background:#fff"></div>`;
    } else {
      dev = $("div", "phone", `<div class="notch"></div><div class="scr"></div>`, row);
      css(dev, { transform: `scale(${P ? 1.16 : 0.86})`, transformOrigin: "center" });
    }
    const scr = dev.querySelector(".scr");
    // the rebuilt screen in its own shadow root: its styles never touch the stage's
    const host = $("div", null, null, scr); css(host, { position: "absolute", left: 0, top: 0, width: d.w + "px" });
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `<div class="ui" dir="${d.dir || "rtl"}" style="position:relative;width:${d.w}px;min-height:${d.h}px">${d.html}</div>`;
    const ui = shadow.querySelector(".ui");
    const el = (k) => shadow.querySelector(`[data-k="${k}"]`);
    // measure every target before anything moves (centre() reads the box as laid out now)
    const acts = (d.actions || []).map((a, k) => ({ ...a, el: el(a.k), t: at(s, a.word || "", 0.25 + (0.6 * k) / Math.max(1, (d.actions || []).length)) })).filter((a) => a.el).sort((a, b) => a.t - b.t);
    for (const a of acts) { a.c = centre(a.el); a.top = a.el.getBoundingClientRect().top - scr.getBoundingClientRect().top; }
    pop(dev, s.start + 0.2, { from: 0.9, y: 80 });
    const cur = acts.some((a) => a.do === "tap") ? cursor(f.sc, { x: P ? 900 : 1400, y: P ? 1750 : 1000 }) : null;
    let scrolled = 0, lastTap = 0;
    for (const a of acts) {
      if (a.do === "tap") { moveClick(cur, { x: a.c.x, y: a.c.y - scrolled }, a.t, 0.5); tl.to(a.el, { scale: 0.95, duration: 0.08, yoyo: true, repeat: 1 }, a.t); lastTap = a.t; }
      else if (a.do === "type") type(a.el, a.text || a.el.textContent || "", a.t - 0.2, Math.min(1.4, (a.text || "").length * 0.07 || 0.8));
      else if (a.do === "pop") { pop(a.el, a.t); sfx(a.t, "ui/rollover2.ogg", 0.3); }
      else if (a.do === "focus") {
        const r = a.el.getBoundingClientRect(), sr = scr.getBoundingClientRect(), k = desk ? 1 : (P ? 1.16 : 0.86);
        const ring = $("div", null, null, scr); css(ring, { position: "absolute", left: (r.left - sr.left) / k - 8 + "px", top: (r.top - sr.top) / k - 8 - scrolled / k + "px", width: r.width / k + 16 + "px", height: r.height / k + 16 + "px", border: "5px solid var(--brand)", borderRadius: "18px", opacity: 0, zIndex: 9 });
        tl.fromTo(ring, { opacity: 0, scale: 1.15 }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2)", immediateRender: false }, a.t);
        tl.to(ring, { opacity: 0, duration: 0.3 }, a.t + 1.3);
        sfx(a.t, "ui/rollover2.ogg", 0.35);
      } else if (a.do === "scroll") {
        const k = desk ? 1 : (P ? 1.16 : 0.86), to = Math.max(0, Math.min(ui.scrollHeight - d.h, a.top / k - d.h * 0.25));
        tl.to(host, { y: -to, duration: 0.8, ease: "power2.inOut" }, a.t - 0.4);
        scrolled = to * k;
      }
    }
    if (cur) tl.to(cur.c, { opacity: 0, duration: 0.3 }, Math.min(s.end - 0.4, lastTap + 0.7));
    if (d.callout) {
      const ok = $("div", "chip", `${icon("check", 30, "var(--ok)")} ${d.callout}`, row); css(ok, { position: "absolute", top: P ? "10px" : "60px", left: P ? "20px" : "40px", fontSize: "34px", zIndex: 8 });
      const tc = at(s, d.calloutWord || "", 0.7); pop(ok, tc); sfx(tc, "interface/bong_001.ogg", 0.5);
    }
  };

  // ── story scenes (studio engine): things the voice tells, shown — a chat, a notification, a deal splitting, the
  // brand's real photos, a number, before / after. Same helpers and motion as the ads' scenes. ──
  const phoneIn = (f, scale) => {
    const row = $("div", null, null, f.vis); css(row, { position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" });
    const ph = $("div", "phone", `<div class="notch"></div><div class="scr"></div>`, row);
    css(ph, { transform: `scale(${scale ?? (P ? 1.16 : 0.86)})`, transformOrigin: "center" });
    return { row, ph, scr: ph.querySelector(".scr") };
  };
  const when = (s, w, k, n) => at(s, w || "", 0.15 + (0.7 * k) / Math.max(1, n));

  /** a chat between two people: bubbles land on their words, the other side "types" first */
  S.chat = (s, f) => {
    const d = s.data || {}, msgs = d.messages || [];
    const { row, ph, scr } = phoneIn(f);
    css(scr, { background: "#efe7dd", display: "flex", flexDirection: "column" });
    scr.innerHTML = `<div style="padding:78px 22px 16px;display:flex;align-items:center;gap:14px;background:#fff;border-bottom:1px solid var(--hair)"><span style="width:58px;height:58px;border-radius:50%;background:var(--brand);color:#fff;display:inline-flex;align-items:center;justify-content:center;font:700 28px var(--display)">${(d.with || "؟").trim()[0]}</span><div><div style="font:700 28px var(--display)">${d.with || ""}</div><div style="font:400 20px var(--display);color:var(--ok)">${d.status || "online"}</div></div></div><div class="log" style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;gap:14px;padding:20px 18px 34px"></div>`;
    const log = scr.querySelector(".log");
    pop(ph, s.start + 0.15, { from: 0.9, y: 80 });
    msgs.forEach((m, k) => {
      const me = m.from === "me", t = when(s, m.word, k, msgs.length);
      const b = $("div", null, m.text, log);
      css(b, { alignSelf: me ? "flex-start" : "flex-end", maxWidth: "82%", padding: "16px 22px", borderRadius: me ? "26px 26px 26px 8px" : "26px 26px 8px 26px", background: me ? "#d9fdd3" : "#fff", font: "500 28px/1.35 var(--display)", boxShadow: "0 2px 6px rgba(0,0,0,.08)" });
      if (m.image) { b.insertAdjacentHTML("afterbegin", `<img src="${m.image}" style="display:block;width:100%;max-height:300px;object-fit:cover;border-radius:16px;margin-bottom:10px">`); }
      if (!me) { const dots = $("div", null, "• • •", log); css(dots, { alignSelf: "flex-end", padding: "10px 20px", borderRadius: "20px", background: "#fff", font: "700 26px var(--display)", color: "var(--muted)" }); log.insertBefore(dots, b); gsap.set(dots, { opacity: 0, display: "none" }); tl.set(dots, { display: "block" }, t - 0.6); tl.to(dots, { opacity: 1, duration: 0.15 }, t - 0.6); tl.set(dots, { display: "none" }, t); }
      gsap.set(b, { display: "none" }); tl.set(b, { display: "block" }, t);
      tl.fromTo(b, { opacity: 0, y: 30, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "back.out(1.8)", immediateRender: false }, t);
      sfx(t, me ? "interface/drop_002.ogg" : "interface/drop_001.ogg", 0.4);
    });
    if (d.reaction) { const r = $("div", "chip", d.reaction, row); css(r, { position: "absolute", top: P ? "10px" : "60px", left: P ? "30px" : "40px", fontSize: "40px" }); const tr = at(s, d.reactionWord || "", 0.85); pop(r, tr, { rot: -8 }); sfx(tr, "interface/bong_001.ogg", 0.45); }
  };

  /** the phone's lock screen: notifications slide down on their words */
  S.notify = (s, f) => {
    const d = s.data || {}, items = d.items || [];
    const { ph, scr } = phoneIn(f);
    css(scr, { background: `linear-gradient(170deg, var(--brand), var(--ink))`, color: "#fff", display: "flex", flexDirection: "column", alignItems: "center" });
    scr.innerHTML = `<div style="margin-top:120px;font:300 30px var(--display);opacity:.85">${d.date || ""}</div><div style="font:600 150px/1 var(--display);direction:ltr;margin-top:6px">${d.time || "9:41"}</div><div class="nl" style="width:100%;padding:40px 18px;display:flex;flex-direction:column;gap:14px"></div>`;
    const nl = scr.querySelector(".nl");
    pop(ph, s.start + 0.15, { from: 0.9, y: 80 });
    items.forEach((it, k) => {
      const t = when(s, it.word, k, items.length), brandApp = it.app === "brand" || !it.app;
      const n = $("div", null, `<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px"><span style="width:44px;height:44px;border-radius:12px;background:#fff;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;color:var(--ink);font:700 22px var(--display)">${brandApp && B.logo ? `<img src="${B.logo}" style="width:80%;height:80%;object-fit:contain">` : (it.app || "•").trim()[0]}</span><span style="font:600 22px var(--display);opacity:.9">${brandApp ? B.name : it.app}</span><span style="margin-inline-start:auto;font:400 20px var(--display);opacity:.7">${it.when || "now"}</span></div><div style="font:700 28px/1.3 var(--display)">${it.title || ""}</div><div style="font:400 25px/1.35 var(--display);opacity:.9;margin-top:4px">${it.body || ""}</div>`, nl);
      css(n, { width: "100%", padding: "20px 22px", borderRadius: "30px", background: "rgba(255,255,255,.2)", backdropFilter: "blur(16px)", color: "#fff" });
      gsap.set(n, { opacity: 0, y: -80 }); tl.to(n, { opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.4)" }, t);
      sfx(t, "interface/bong_001.ogg", 0.5);
    });
  };

  /** things the line talks about: 1–3 product cards (a real photo or a drawn card) with price tags, on their words,
   *  and an optional tag that lands on its word (a want, a problem: «مش معاك فلوسها») */
  S.items = (s, f) => {
    const d = s.data || {}, list = (d.items || []).slice(0, 3), one = list.length === 1;
    const box = $("div", null, null, f.vis); css(box, { position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "26px", flexWrap: "wrap" });
    const w = one ? (P ? 640 : 560) : list.length === 2 ? (P ? 440 : 420) : (P ? 300 : 290);
    const cards = list.map((it, k) => {
      const c = $("div", "panel", null, box); css(c, { width: w + "px", padding: "0", overflow: "hidden", position: "relative" });
      const ih = Math.round(w * (one ? 0.95 : 1.1));
      c.innerHTML = (it.image ? `<img src="${it.image}" style="width:100%;height:${ih}px;object-fit:cover;display:block">` : `<div style="height:${ih}px;display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg,var(--lav),var(--panel2));font-size:${Math.round(w * 0.42)}px">${it.emoji || "🛍️"}</div>`)
        + `<div style="padding:${one ? 30 : 22}px"><div style="font:600 ${one ? 44 : 32}px/1.25 var(--display)">${it.name || ""}</div>${it.price ? `<div style="font:800 ${one ? 60 : 42}px var(--display);margin-top:10px;color:var(--ink)">${it.price} <span style="font-size:.5em;color:var(--muted)">${it.currency || ""}</span></div>` : ""}</div>`;
      const heart = $("div", null, `<svg viewBox="0 0 24 24" width="${one ? 44 : 34}" height="${one ? 44 : 34}"><path d="M12 21s-7.5-4.6-9.5-9.2C1 8.2 3.4 5 6.8 5c2 0 3.4 1.1 4.2 2.3.8-1.2 2.2-2.3 4.2-2.3C18.6 5 21 8.2 21.5 11.8 19.5 16.4 12 21 12 21z" fill="var(--rec)"/></svg>`, c);
      css(heart, { position: "absolute", top: "18px", left: "18px", width: (one ? 76 : 60) + "px", height: (one ? 76 : 60) + "px", borderRadius: "50%", background: "rgba(255,255,255,.92)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--lift)" });
      return { c, heart, t: when(s, it.word, k, list.length) };
    });
    cards.forEach(({ c, heart, t }, k) => {
      gsap.set(c, { opacity: 0, y: 120, rotation: (k - (cards.length - 1) / 2) * 5, scale: 0.88 });
      tl.to(c, { opacity: 1, y: 0, rotation: (k - (cards.length - 1) / 2) * 3, scale: 1, duration: 0.6, ease: "expo.out" }, t);
      sfx(t, "casino/card-place-" + (1 + (k % 4)) + ".ogg", 0.4);
      pop(heart, t + 0.45, { from: 0.2 }); sfx(t + 0.45, "ui/click2.ogg", 0.4);
      tl.to(c, { y: -16, duration: Math.max(0.5, s.end - t - 0.6), ease: "sine.inOut" }, t + 0.6);
    });
    if (d.tag) {
      const tg = $("div", null, d.tag, box); css(tg, { position: "absolute", bottom: P ? "40px" : "20px", padding: "20px 40px", borderRadius: "999px", background: d.tagTone === "good" ? "var(--ok)" : "var(--rec)", color: "#fff", font: `700 ${P ? 46 : 40}px var(--display)`, boxShadow: "var(--pop)", zIndex: 5 });
      const tt = at(s, d.tagWord || "", 0.75); pop(tg, tt, { rot: -6, from: 1.5 });
      if (d.tagTone !== "good") tl.to(cards.map((x) => x.c), { x: "+=10", duration: 0.05, yoyo: true, repeat: 5, ease: "none" }, tt + 0.1);
      sfx(tt, "impact/impactSoft_heavy_001.ogg", 0.45);
    }
  };

  /** a deal: the item and its price, then the price splits into parts (instalments, a discount, a bundle) */
  S.deal = (s, f) => {
    const d = s.data || {}, parts = d.parts || [];
    const card = $("div", "panel", null, f.vis); css(card, { width: P ? "880px" : "860px", padding: P ? "40px" : "34px", display: "grid", gap: "26px" });
    card.innerHTML = `<div style="display:flex;align-items:center;gap:28px">${d.image ? `<img src="${d.image}" style="width:${P ? 230 : 200}px;height:${P ? 230 : 200}px;object-fit:cover;border-radius:24px;box-shadow:var(--lift)">` : `<span style="width:${P ? 200 : 170}px;height:${P ? 200 : 170}px;border-radius:24px;background:var(--lav);display:inline-flex;align-items:center;justify-content:center">${logo(P ? 120 : 100)}</span>`}<div style="flex:1"><div style="font:600 ${P ? 46 : 40}px/1.2 var(--display)">${d.item || ""}</div>${d.store ? `<div class="label" style="margin-top:10px">${d.store}</div>` : ""}<div class="pr" style="font:800 ${P ? 88 : 76}px var(--display);margin-top:14px;color:var(--ink)"><span class="n">${d.price || ""}</span> <span style="font-size:.45em;color:var(--muted)">${d.currency || ""}</span></div></div></div><div class="parts" style="display:grid;grid-template-columns:repeat(${Math.max(1, Math.min(5, parts.length))},1fr);gap:16px"></div>`;
    const box = card.querySelector(".parts");
    const els = parts.map((x) => { const e = $("div", null, `<div style="font:800 ${P ? 44 : 38}px var(--display);color:var(--brand)">${x.amount}</div><div style="font:500 ${P ? 26 : 22}px var(--display);color:var(--ink2);margin-top:6px">${x.label || ""}</div>`, box); css(e, { padding: "22px 10px", borderRadius: "22px", background: "var(--panel2)", textAlign: "center", border: "2px solid var(--hair)" }); return e; });
    fadeIn(card, s.start + 0.15, 0.45, 50);
    const tSplit = at(s, d.splitWord || "", 0.55);
    tl.to(card.querySelector(".pr"), { scale: 0.86, opacity: 0.45, transformOrigin: "right center", duration: 0.4, ease: "power2.out" }, tSplit);
    els.forEach((e, k) => { pop(e, tSplit + 0.12 + k * 0.16, { from: 0.6, y: -40 }); sfx(tSplit + 0.12 + k * 0.16, "casino/card-place-" + (1 + (k % 4)) + ".ogg", 0.4); });
    if (d.badge) { const b = $("div", null, d.badge, card); css(b, { position: "absolute", top: "-34px", left: "30px", padding: "14px 30px", borderRadius: "999px", background: "var(--ok)", color: "#fff", font: "700 36px var(--display)" }); const tb = at(s, d.badgeWord || "", 0.8); pop(b, tb, { rot: -6, from: 1.6 }); sfx(tb, "impact/impactSoft_heavy_001.ogg", 0.45); }
  };

  /** the brand's real photos / partners, landing on the beat */
  S.gallery = (s, f) => {
    const d = s.data || {}, imgs = (d.images || []).slice(0, 6);
    const g = $("div", null, null, f.vis); css(g, { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "22px", width: P ? "940px" : "920px" });
    const h = P ? 380 : 300;
    const els = imgs.map((im, k) => { const c = $("div", null, `<img src="${im.file}" style="width:100%;height:100%;object-fit:cover;display:block">${im.label ? `<span class="tag" style="bottom:14px;right:14px">${im.label}</span>` : ""}`, g); css(c, { position: "relative", height: (k % 3 === 1 ? h + 60 : h) + "px", marginTop: k % 3 === 1 ? "-30px" : "0", borderRadius: "26px", overflow: "hidden", boxShadow: "var(--pop)", background: "var(--panel2)" }); return c; });
    const t0 = s.start + 0.3;
    els.forEach((e, k) => { const t = d.words?.[k] ? at(s, d.words[k], 0.3) : t0 + k * BEAT; gsap.set(e, { opacity: 0, y: 140, rotation: k % 2 ? 5 : -5, scale: 0.85 }); tl.to(e, { opacity: 1, y: 0, rotation: 0, scale: 1, duration: 0.65, ease: "expo.out" }, t); sfx(t, "casino/card-place-" + (1 + (k % 4)) + ".ogg", 0.4); tl.to(e, { y: -18 - k * 4, duration: Math.max(0.5, s.end - t - 0.7), ease: "none" }, t + 0.65); });
  };

  /** one big number that counts up on its word */
  S.stat = (s, f) => {
    const d = s.data || {};
    const box = $("div", null, null, f.vis); css(box, { display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", textAlign: "center" });
    box.innerHTML = `<div class="num" style="font:800 ${P ? 260 : 240}px/1 var(--display);color:var(--brand);letter-spacing:-.03em"><span class="n">0</span><span style="font-size:.5em">${d.suffix || ""}</span></div><div style="font:600 ${P ? 56 : 50}px var(--display);max-width:860px">${d.label || ""}</div>`;
    const n = box.querySelector(".n"), t = at(s, d.word || "", 0.3), o = { v: 0 }, target = Number(d.value) || 0, ar = !AD.en;
    fadeIn(box, s.start + 0.2);
    tl.to(o, { v: target, duration: 1.2, ease: "power2.out", onUpdate: () => { const v = Math.round(o.v); n.textContent = ar ? N(v) : String(v); } }, t);
    for (let k = 0; k < 3; k++) { const r = $("div", null, null, f.vis); css(r, { position: "absolute", left: "50%", top: "50%", width: "300px", height: "300px", margin: "-150px", borderRadius: "50%", border: "4px solid var(--brand)", opacity: 0 }); tl.fromTo(r, { scale: 0.4, opacity: 0.6 }, { scale: 3.4, opacity: 0, duration: 1.4, ease: "power2.out", immediateRender: false }, t + 1.1 + k * 0.15); }
    sfx(t + 1.15, "impact/impactSoft_heavy_002.ogg", 0.5);
  };

  /** before / after: the old way crossed out, the brand's way checked */
  S.compare = (s, f) => {
    const d = s.data || {}, sides = [d.before || {}, d.after || {}];
    const g = $("div", null, null, f.vis); css(g, { display: "flex", flexDirection: P ? "column" : "row", gap: "26px", width: P ? "900px" : "940px" });
    const cards = sides.map((x, k) => { const c = $("div", "panel", `<div style="font:700 ${P ? 46 : 40}px var(--display);margin-bottom:18px;color:${k ? "var(--brand)" : "var(--muted)"}">${x.title || ""}</div>` + (x.points || []).map((p) => `<div class="pt" style="display:flex;align-items:center;gap:16px;font:500 ${P ? 38 : 34}px var(--display);padding:10px 0">${k ? icon("check", 40, "var(--ok)") : `<span style="width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;color:var(--rec);font:700 40px var(--display)">✕</span>`}<span style="${k ? "" : "color:var(--ink2);text-decoration:line-through;text-decoration-color:var(--rec)"}">${p}</span></div>`).join(""), g); css(c, { flex: 1, padding: P ? "36px 40px" : "30px 34px", background: k ? "var(--panel)" : "var(--panel2)", border: k ? "3px solid var(--brand)" : "1px solid var(--hair)" }); return c; });
    const tA = at(s, d.afterWord || "", 0.5);
    fadeIn(cards[0], s.start + 0.2, 0.4, 40);
    cards[0].querySelectorAll(".pt").forEach((p, k) => { fadeIn(p, s.start + 0.45 + k * 0.25, 0.3, 14); sfx(s.start + 0.45 + k * 0.25, "ui/rollover2.ogg", 0.25); });
    tl.to(cards[0], { opacity: 0.6, scale: 0.97, duration: 0.4 }, tA);
    pop(cards[1], tA, { from: 0.9, y: 40 });
    cards[1].querySelectorAll(".pt").forEach((p, k) => { pop(p, tA + 0.3 + k * 0.22); sfx(tA + 0.3 + k * 0.22, "interface/drop_001.ogg", 0.35); });
  };

  // ── build ─────────────────────────────────────────────────────────────
  AD.scenes.forEach((s, i) => { const fr = frame(s, i, s.type === "reveal" || s.type === "cta" || s.type === "title"); (S[s.type] || (() => {}))(s, fr); });
  // the aurora drifts the whole time
  const blobs = document.querySelectorAll(".aurora i");
  blobs.forEach((b, k) => tl.to(b, { x: (k % 2 ? -1 : 1) * 260, y: (k ? -1 : 1) * 200, scale: 1.15, duration: AD.duration / 2, yoyo: true, repeat: 1, ease: "sine.inOut" }, 0));
  tl.set({}, {}, AD.duration);
  window.__duration = AD.duration;
  window.__sfx = SFX;
  window.__seek = (t) => { tl.seek(Math.min(t, AD.duration - 0.001), false); };
  window.__ready = true;
})();

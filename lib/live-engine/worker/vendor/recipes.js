/* Motion recipes: every scene type as tested choreography, so a video is alive no matter how little the model writes.
   Loaded after kit.js. compose.mjs writes the markup; these functions put all motion on the timeline. */
(function () {
  const K = window.K, R = {};
  const $ = (s, r = document) => (typeof s === "string" ? r.querySelector(s) : s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const BEAT = 0.5;
  // scenes overlap by 2×X: the old one whooshes out (scale-up + blur) while the next one is already on screen
  const X = 0.15;
  R.ZMAX = 3.2; // camera zoom cap inside live screens
  const snap = (t) => Math.round(t / BEAT) * BEAT;
  const meta = (ui) => { const el = $(ui); return el && (window.__clones || {})[el.dataset.clone]; };
  const inBox = (b, r) => b[0] >= r[0] - 4 && b[1] >= r[1] - 4 && b[0] + b[2] <= r[0] + r[2] + 4 && b[1] + b[3] <= r[1] + r[3] + 4;
  const area = (b) => b[2] * b[3];

  // ---------- numbers: count real values up, keeping the digit system and the unit ----------
  const AR = "٠١٢٣٤٥٦٧٨٩";
  const toLatin = (s) => s.replace(/[٠-٩]/g, (d) => AR.indexOf(d));
  const parseNum = (t) => { const m = toLatin(t).replace(/[,٬]/g, "").match(/-?\d+(\.\d+)?/); return m ? { v: parseFloat(m[0]), raw: m[0], dec: (m[1] || "").length - 1 } : null; };
  R.countUp = (tl, el, at, dur = 1) => {
    const t0 = el.textContent, p = parseNum(t0); if (!p || p.v === 0) return false;
    const arabic = /[٠-٩]/.test(t0), o = { v: 0 };
    const fmt = (v) => { let s = Math.max(0, p.dec) ? v.toFixed(p.dec) : Math.round(v).toLocaleString("en-US"); if (arabic) s = s.replace(/\d/g, (d) => AR[d]); return toLatin(t0) === t0 ? t0.replace(/-?[\d,]+(\.\d+)?/, s) : t0.replace(/[٠-٩][٠-٩٬,.]*/, s); };
    tl.fromTo(o, { v: 0 }, { v: p.v, duration: dur, ease: "power2.out", immediateRender: false, onUpdate: () => { el.textContent = fmt(o.v); } }, at);
    return true;
  };

  /** bring the real elements inside a region of a live screen to life: rows slide in, stats count, chips pop, one button presses */
  R.inside = (tl, ui, region, at) => {
    const m = meta(ui), root = $(ui); if (!m || !m.info) return;
    const keys = Object.entries(m.keys).filter(([k, b]) => inBox(b, region));
    const of = (role) => keys.filter(([k]) => m.info[k] && m.info[k][0] === role).map(([k]) => root.querySelector(`[data-k="${k}"]`)).filter(Boolean);
    const rows = [...of("row"), ...of("item")].slice(0, 8);
    if (rows.length) tl.fromTo(rows, { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.45, stagger: 0.12, ease: "power3.out" }, at);
    let c = 0; for (const el of of("stat").slice(0, 4)) { if (R.countUp(tl, el, at + 0.1 * c, 1.1)) c++; else tl.fromTo(el, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2.5)" }, at + 0.1 * c++); }
    const imgs = of("image").slice(0, 4); if (imgs.length) tl.fromTo(imgs, { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, stagger: 0.1, ease: "back.out(1.8)" }, at);
    const btn = of("button")[0]; if (btn) K.press(tl, btn, snap(at + 0.9));
  };

  // the most telling regions of a screen: blocks (parts) with content, biggest first, skipping the nav sidebar
  R.regions = (ui) => {
    const m = meta(ui); if (!m) return [];
    const parts = Object.entries(m.parts || {}).map(([i, b]) => ({ t: "part:" + i, b }));
    const W = m.w; const good = parts.filter((p) => p.b[2] < W * 0.9 && !(p.b[2] < W * 0.2 && p.b[3] > m.h * 0.6) && area(p.b) > 15000);
    const score = (p) => { const inside = Object.entries(m.keys).filter(([k, b]) => inBox(b, p.b) && m.info && ["stat", "row", "field", "button", "chart", "image"].includes(m.info[k]?.[0])).length; return inside * 4 + Math.min(area(p.b) / 40000, 6) - p.b[1] / 900; };
    return good.sort((a, b) => score(b) - score(a));
  };
  const boxOf = (ui, t) => { const m = meta(ui); if (!m) return null; if (Array.isArray(t)) return t; if (t === "all") return [0, 0, m.w, m.h]; if (String(t).startsWith("part:")) return m.parts[String(t).slice(5)]; return m.keys[t]; };
  // a field/button to act on: what the agent actually did first, else the first one inside the screen
  R.acted = (ui, kind) => { const m = meta(ui); if (!m || !m.info) return null; const want = kind === "type" ? "field" : "button"; const e = Object.entries(m.info); return (e.find(([k, v]) => v[1] === kind) || e.find(([k, v]) => v[0] === want && v[2]) || [])[0] || null; };

  // ---------- the living layer: background, brand mark, progress, transitions ----------
  R.bg = (tl, len, drops = []) => {
    const b = $$("#bg .blob"), grid = $("#bg .grid");
    const path = [[-120, -80, 140, 90], [100, 60, -130, -70], [-60, 120, 90, -100]];
    b.forEach((el, i) => { const [x0, y0, x1, y1] = path[i % 3]; tl.fromTo(el, { x: x0, y: y0 }, { x: x1, y: y1, duration: 7 + i * 1.5, repeat: Math.ceil(len / (7 + i * 1.5)), yoyo: true, ease: "sine.inOut", immediateRender: true }, 0); });
    if (grid) tl.fromTo(grid, { backgroundPositionY: "0px" }, { backgroundPositionY: `${len * 24}px`, duration: len, ease: "none" }, 0);
    for (const d of drops) { K.flash(tl, d, 0.3); if (b[0]) tl.fromTo(b[0], { scale: 1.35 }, { scale: 1, duration: 0.9, ease: "power2.out", immediateRender: false }, d); }
    const bar = $("#bar"); if (bar) tl.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: len, ease: "none" }, 0);
  };
  R.mark = (tl, from, to) => { const m = $("#mark"); if (!m) return; tl.fromTo(m, { autoAlpha: 0, y: -20 }, { autoAlpha: 1, y: 0, duration: 0.5 }, from); tl.to(m, { autoAlpha: 0, duration: 0.3 }, to); };

  /** scene in/out + kinetic headline (words rise out of a blur, highlight sweeps in) */
  R.scene = (tl, sc, s, e, o = {}) => {
    sc = $(sc); const last = R.len && e >= R.len - 0.01;
    tl.set(sc, { autoAlpha: 1 }, Math.max(0, s - X));
    if (s - X <= 0) gsap.set(sc, { autoAlpha: 1 }); // the first scene is on screen from frame 0 (a set at exactly 0 is skipped by seek(0))
    if (!last) tl.fromTo(sc, { scale: 1, filter: "blur(0px)" }, { scale: 1.12, filter: "blur(16px)", autoAlpha: 0, duration: 2 * X, ease: "power2.in", immediateRender: false }, e - X); // whoosh out
    const words = $$(".hl .w", sc);
    if (words.length) tl.fromTo(words, { opacity: 0, y: o.slam ? 0 : 70, scale: o.slam ? 1.6 : 1, filter: "blur(14px)" }, { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", duration: o.slam ? 0.35 : 0.55, stagger: o.slam ? BEAT / 2 : 0.07, ease: o.slam ? "power4.out" : "power3.out" }, s + 0.05);
    const hi = $$(".hl .hi-line", sc); if (hi.length) tl.fromTo(hi, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "power3.inOut" }, s + 0.6);
    const sub = $(".sub", sc); if (sub) tl.fromTo(sub, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5 }, s + 0.45);
    const cos = $$(".co", sc); if (cos.length) tl.fromTo(cos, { opacity: 0, y: 30, scale: 0.8 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: BEAT, ease: "back.out(2)" }, s + (e - s) * 0.35); // chips at 35% of the scene
    // gentle push-in of the whole visual while the scene holds: never a still frame
    const vis = $(".vis", sc); if (vis) tl.fromTo(vis, { scale: 1 }, { scale: 1.08, duration: e - s, ease: "none", immediateRender: false }, s);
  };
  /** a device flies in (perspective tilt) at s and leaves before e */
  R.device = (tl, dev, s, e) => {
    dev = $(dev); if (!dev) return;
    tl.fromTo(dev, { opacity: 0, y: 260, rotationX: 22, scale: 0.9, transformPerspective: 1800 }, { opacity: 1, y: 0, rotationX: 0, scale: 1, duration: 0.8, ease: "power3.out" }, s + 0.1);
    // while it holds the device keeps drifting (rise + slight tilt): never a still frame
    const hold = e - X - (s + 0.9); if (hold > 0.6) tl.to(dev, { y: -36, rotationY: 4, duration: hold, ease: "none" }, s + 0.9);
    if (!(R.len && e >= R.len - 0.01)) tl.to(dev, { y: -60, scale: 1.04, opacity: 0, duration: 2 * X, ease: "power2.in" }, e - X);
  };

  /** lift a real block out of the laptop toward the viewer: the laptop dims, the block grows big and comes alive */
  R.pop = (tl, sc, pop, at, e) => {
    const el = $(pop); if (!el) return; const box = el.parentElement, dev = $(`${sc} .dev`), m = meta(pop);
    tl.fromTo(box, { opacity: 0, scale: 0.45, y: 140, rotationX: 25, transformPerspective: 1600 }, { opacity: 1, scale: 1, y: 0, rotationX: 0, duration: 0.7, ease: "back.out(1.4)" }, at);
    if (dev) tl.to(dev, { opacity: 0.25, filter: "blur(4px)", scale: 0.94, duration: 0.5 }, at);
    if (m) { K.focus(tl, pop, "all", at, { dur: 0 }); R.inside(tl, pop, [0, 0, m.w, m.h], at + 0.45); }
    tl.to(box, { y: -40, scale: 1.06, duration: Math.max(0.5, e - at - 0.9), ease: "sine.inOut" }, at + 0.7); // float + keep growing while it holds
  };

  // ---------- scene recipes ----------
  /** live screen on the laptop: whole screen → glide into the blocks that prove the headline, elements come alive inside */
  R.tour = (tl, { sc, ui, s, d, focus = [], pop }) => {
    // the scene and its device live for the whole scene (s → s+d); a pop only ends the camera tour inside the laptop
    const e0 = s + d, popAt = pop ? snap(s + Math.max(2, d * 0.5)) : null, e = pop ? popAt + 0.2 : e0;
    R.scene(tl, sc, s, e0); R.device(tl, `${sc} .dev`, s, e0); if (pop) R.pop(tl, sc, pop, popAt, e0);
    K.focus(tl, ui, "all", s, { dur: 0 });
    const regs = focus.map((t) => ({ t, b: boxOf(ui, t) })).filter((x) => x.b);
    for (const r of R.regions(ui)) if (regs.length < 3 && !regs.some((x) => x.t === r.t)) regs.push(r);
    const stops = regs.slice(0, pop ? 1 : d >= 5.5 ? 3 : d >= 3.5 ? 2 : 1);
    const t0 = snap(s + 1), span = ((pop ? e - 0.5 : e0 - X) - t0) / Math.max(1, stops.length); // the last push-in runs until the scene exits
    stops.forEach((r, i) => {
      const at = snap(t0 + i * span);
      K.focus(tl, ui, r.b, at, { dur: 0.8, max: R.ZMAX });
      const sh = [r.b[0] + r.b[2] * 0.04, r.b[1] + r.b[3] * 0.04, r.b[2] * 0.92, r.b[3] * 0.92];
      K.focus(tl, ui, sh, at + 0.8, { dur: Math.max(0.4, span - 0.9), max: R.ZMAX, ease: "none" }); // slow push-in while holding: never a still frame
      R.inside(tl, ui, r.b, at + 0.5);
    });
  };
  /** replay a recorded action: before screen → zoom to the field, type the real value → tap the real button → the result screen → zoom into it */
  R.replay = (tl, { sc, a, b, s, d, typeKey, tapKey, result, pop }) => {
    const e = s + d; R.scene(tl, sc, s, e); R.device(tl, `${sc} .dev`, s, e);
    typeKey = typeKey || R.acted(a, "type"); tapKey = tapKey || R.acted(a, "click");
    const ma = meta(a), navTap = tapKey && ma && ma.info && ma.info[tapKey] && ma.info[tapKey][0] === "nav";
    K.focus(tl, a, "all", s, { dur: 0 }); tl.set(b, { autoAlpha: 0 }, s);
    let t = snap(s + 0.8);
    if (typeKey && !navTap) { const dt = Math.min(1.4, d * 0.22); K.focus(tl, a, typeKey, t, { dur: 0.6, max: R.ZMAX }); K.typeInto(tl, a, typeKey, t + 0.5, dt); t = snap(t + 0.6 + dt); }
    else { const tgt = (tapKey && boxOf(a, tapKey)) || (R.regions(a)[0] || {}).b; if (tgt) K.focus(tl, a, tgt, t, { dur: 0.6, max: R.ZMAX }); } // never hold the whole "before" screen
    if (tapKey) {
      if (navTap) { K.tap(tl, a, tapKey, snap(t + 0.8), { dur: 0.6, from: [700, 1450] }); t = snap(t + 1.2); } // menu click: quick, the page is the point
      else { K.focus(tl, a, tapKey, t, { dur: 0.5, max: R.ZMAX }); K.tap(tl, a, tapKey, snap(t + 0.9), { dur: 0.6, from: [760, 1500] }); t = snap(t + 1.2); }
    }
    // the result appears, then the camera tours it
    K.swap(tl, a, b, t, 0.35); K.flash(tl, t + 0.15, 0.25);
    K.focus(tl, b, "all", t, { dur: 0 });
    const regs = []; if (result && boxOf(b, result)) regs.push({ b: boxOf(b, result) });
    for (const r of R.regions(b)) if (regs.length < 2) regs.push(r);
    const popAt = pop && e - t >= 1.4 ? Math.min(snap(Math.max(t + 0.6, e - 2.2)), e - 1) : null;
    if (popAt) R.pop(tl, sc, pop, popAt, e);
    const t0 = snap(t + 0.6), left = (popAt || e - X) - t0, n = Math.max(1, Math.min(regs.length, left >= 3 ? 2 : 1)), span = left / n;
    regs.slice(0, n).forEach((r, i) => {
      const at = snap(t0 + i * span);
      K.focus(tl, b, r.b, at, { dur: 0.7, max: R.ZMAX });
      const sh = [r.b[0] + r.b[2] * 0.04, r.b[1] + r.b[3] * 0.04, r.b[2] * 0.92, r.b[3] * 0.92];
      K.focus(tl, b, sh, at + 0.7, { dur: Math.max(0.4, span - 0.8), max: R.ZMAX, ease: "none" });
      R.inside(tl, b, r.b, at + 0.4);
    });
    const ok = $(`${sc} .ok`); if (ok && !navTap) tl.fromTo(ok, { scale: 0, opacity: 0, rotation: -30 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.45, ease: "back.out(3)" }, snap(t + 0.6));
  };
  /** customer view on a phone: scroll the real page like a thumb would, stop on what matters, tap the main button */
  R.phone = (tl, { sc, ui, s, d, tapKey }) => {
    const e = s + d; R.scene(tl, sc, s, e); R.device(tl, `${sc} .dev`, s, e);
    const m = meta(ui), el = $(ui); if (!m) return;
    const s1 = +el.dataset.scale, vh = +el.dataset.vh / s1;
    const maxY = Math.max(0, m.h - vh), stops = [0, Math.min(maxY, vh * 0.75), Math.min(maxY, vh * 1.6)];
    K.focus(tl, ui, "all", s, { dur: 0 });
    const t1 = snap(s + 1.2), step = (e - 1 - t1) / 2;
    if (stops[1] > 0) K.scrollTo(tl, ui, stops[1], t1, Math.min(1.2, step * 0.7));
    if (stops[2] > stops[1]) K.scrollTo(tl, ui, stops[2], snap(t1 + step), Math.min(1.2, step * 0.7));
    tapKey = tapKey || R.acted(ui, "click");
    if (tapKey && m.keys[tapKey]) { const kb = m.keys[tapKey]; K.scrollTo(tl, ui, Math.max(0, Math.min(maxY, kb[1] - vh * 0.55)), snap(e - 2.2), 0.6); K.tap(tl, ui, tapKey, snap(e - 1.2), { dur: 0.6, from: [880, 1650] }); }
  };
  /** one real block, big: tilts in, its insides come alive */
  R.hero = (tl, { sc, ui, s, d }) => {
    const e = s + d; R.scene(tl, sc, s, e); R.device(tl, `${sc} .dev`, s, e);
    const m = meta(ui); if (m) { K.focus(tl, ui, "all", s, { dur: 0 }); R.inside(tl, ui, [0, 0, m.w, m.h], snap(s + 0.9)); }
    const glow = $(`${sc} .glow`); if (glow) K.pulse(tl, glow, s + 1, e - 0.4, { scale: 1.08, opacity: 1 }, 1);
  };
  /** hook: words slam in on the beat, logo flashes in */
  R.hook = (tl, { sc, s, d }) => {
    const e = s + d; R.scene(tl, sc, s, e, { slam: true });
    const lg = $(`${sc} .biglogo`); if (lg) tl.fromTo(lg, { scale: 0.3, opacity: 0, filter: "blur(20px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.6, ease: "expo.out" }, s);
    K.flash(tl, s + 0.05, 0.35);
    // a long hook keeps moving after the slam: the headline grows slowly, the logo pulses on the beat
    if (d > 2.5) { tl.fromTo($(`${sc} .head`), { scale: 1 }, { scale: 1.12, duration: e - s - 1, ease: "none", immediateRender: false }, s + 0.9); if (lg) K.pulse(tl, lg, s + 1, e - X, { scale: 1.08 }, BEAT); }
  };
  /** problem: pain cards pile up on the beat, then get wiped */
  R.stack = (tl, { sc, s, d }) => {
    const e = s + d; R.scene(tl, sc, s, e);
    const cards = $$(`${sc} .pain`); const rot = [-6, 5, -3, 7, -5];
    cards.forEach((c, i) => tl.fromTo(c, { opacity: 0, y: -260, rotation: rot[i % 5] * 3, scale: 1.2 }, { opacity: 1, y: 0, rotation: rot[i % 5], scale: 1, duration: 0.45, ease: "bounce.out" }, snap(s + 0.5 + i * BEAT)));
    if (cards.length) { tl.to(cards, { x: (i) => (i % 2 ? 900 : -900), rotation: (i) => rot[i % 5] * 6, opacity: 0, duration: 0.5, stagger: 0.06, ease: "power3.in" }, e - 0.85); }
    const x = $(`${sc} .xmark`); if (x) tl.fromTo(x, { scale: 2.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "power4.out" }, e - 1.1);
  };
  /** offer: the number counts up huge, rings pulse on the beat */
  R.stat = (tl, { sc, s, d }) => {
    const e = s + d; R.scene(tl, sc, s, e);
    const n = $(`${sc} .bignum`); if (n) { tl.fromTo(n, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2.2)" }, s + 0.2); R.countUp(tl, n, s + 0.25, 1.2); }
    $$(`${sc} .ring`).forEach((r, i) => tl.fromTo(r, { scale: 0.5, opacity: 0.8 }, { scale: 2.2, opacity: 0, duration: 1.4, repeat: Math.max(0, Math.floor((d - 1) / 1.4) - 1), ease: "power2.out" }, s + 0.4 + i * 0.7));
  };
  /** call to action: the logo builds in, the button pulses on the beat, a pointer taps it */
  R.cta = (tl, { sc, s, d }) => {
    const e = s + d; R.scene(tl, sc, s, e);
    const lg = $(`${sc} .biglogo`); if (lg) tl.fromTo(lg, { scale: 0.2, opacity: 0, rotation: -12 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.8, ease: "expo.out" }, s + 0.1);
    const halo = $(`${sc} .halo`); if (halo) tl.fromTo(halo, { rotation: 0, opacity: 0 }, { rotation: 200, opacity: 1, duration: d, ease: "none" }, s);
    const btn = $(`${sc} .cta-btn`); if (btn) { tl.fromTo(btn, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, s + 0.9); K.pulse(tl, btn, snap(s + 1.5), e - 1.5, { scale: 1.06 }, 0.5); }
    const url = $(`${sc} .url`); if (url) K.type(tl, `${sc} .url`, url.dataset.text, s + 1.3, 1);
  };
  /** after the fonts load: text that could run off the frame shrinks until it fits (−4% steps), the ✓ badge moves off the headline */
  R.fit = () => {
    const stage = $("#stage"); if (!stage) return;
    const W = stage.clientWidth, margin = Math.round(W * 0.07), max = W - 2 * margin;
    for (const el of $$(".bignum, .url, .cta-btn, .hl", stage)) {
      el.style.maxWidth = max + "px"; el.style.boxSizing = "border-box";
      if (el.matches(".bignum, .url")) { el.style.marginLeft = "auto"; el.style.marginRight = "auto"; }
      const typed = el.matches(".url") && !el.textContent.trim() && el.dataset.text; if (typed) el.textContent = el.dataset.text; // measure the full URL K.type will write
      if (el.matches(".bignum, .url, .cta-btn")) el.style.whiteSpace = "nowrap";
      let fs = parseFloat(getComputedStyle(el).fontSize);
      for (let i = 0; i < 40 && el.scrollWidth > el.clientWidth + 1; i++) { fs *= 0.96; el.style.fontSize = fs.toFixed(1) + "px"; }
      if (typed) el.textContent = "";
    }
    // the ✓ badge sits on the laptop's top corner: if the headline/sub reaches down to it, move it to the bottom corner
    const top = (el) => { let y = 0; for (let e = el; e && e !== stage; e = e.offsetParent) y += e.offsetTop; return y; };
    for (const ok of $$(".ok", stage)) {
      const sc = ok.closest(".scene"), head = sc && $(".head", sc); if (!head) continue;
      if (top(ok) < top(head) + head.offsetHeight + 16) { ok.style.top = "auto"; ok.style.bottom = "-40px"; }
    }
  };

  K.R = R;
})();

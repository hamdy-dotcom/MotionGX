/* Motion recipes: the motion MECHANICS of a video (camera inside live screens, typing, taps, counting, pops, devices,
   transitions, layout motion), so a video is alive no matter how little the model writes. Loaded after kit.js.
   The LOOK (layout, background, type, shapes, hook / CTA design) comes from the art direction; compose.mjs writes it. */
(function () {
  const K = window.K, R = {};
  const $ = (s, r = document) => (typeof s === "string" ? r.querySelector(s) : s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const BEAT = 0.5;
  // scenes overlap by 2×X: the old one whooshes out (scale-up + blur) while the next one is already on screen
  const X = 0.15;
  R.ZMAX = 3.2; // camera zoom cap inside live screens
  // set by the composition from the art direction: transition family, tempo (duration factor), stage size
  R.tx = "zoom"; R.tempo = 1; R.W = 1080; R.H = 1920;
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
    const b = $$("#bg .blob"), grid = $("#bg .grid"), mesh = $("#bg .mesh"), tex = $("#bg .tex"), photo = $("#bg .bgph img");
    if (mesh) tl.fromTo(mesh, { backgroundPosition: "0% 0%, 100% 0%, 50% 100%", rotation: 0 }, { backgroundPosition: "35% 25%, 65% 30%, 45% 65%", rotation: 8, duration: len, ease: "none" }, 0);
    if (tex) tl.fromTo(tex, { backgroundPosition: "0px 0px" }, { backgroundPosition: `${len * 18}px ${len * 30}px`, duration: len, ease: "none" }, 0);
    if (photo) tl.fromTo(photo, { scale: 1.04, xPercent: 0 }, { scale: 1.2, xPercent: -3, duration: len, ease: "none" }, 0);
    const path = [[-120, -80, 140, 90], [100, 60, -130, -70], [-60, 120, 90, -100]];
    b.forEach((el, i) => { const [x0, y0, x1, y1] = path[i % 3]; tl.fromTo(el, { x: x0, y: y0 }, { x: x1, y: y1, duration: 7 + i * 1.5, repeat: Math.ceil(len / (7 + i * 1.5)), yoyo: true, ease: "sine.inOut", immediateRender: true }, 0); });
    if (grid) tl.fromTo(grid, { backgroundPositionY: "0px" }, { backgroundPositionY: `${len * 24}px`, duration: len, ease: "none" }, 0);
    for (const d of drops) { K.flash(tl, d, 0.3); if (b[0]) tl.fromTo(b[0], { scale: 1.35 }, { scale: 1, duration: 0.9, ease: "power2.out", immediateRender: false }, d); }
    const bar = $("#bar"); if (bar) tl.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: len, ease: "none" }, 0);
  };
  R.mark = (tl, from, to) => { const m = $("#mark"); if (!m) return; tl.fromTo(m, { autoAlpha: 0, y: -20 }, { autoAlpha: 1, y: 0, duration: 0.5 }, from); tl.to(m, { autoAlpha: 0, duration: 0.3 }, to); };

  /** scene in/out + kinetic headline (words rise out of a blur, highlight sweeps in) */
  R.scene = (tl, sc, s, e, o = {}) => {
    sc = $(sc); const last = R.len && e >= R.len - 0.01, f = R.tx, T = R.tempo || 1;
    const dir = $("#stage")?.getAttribute("dir") === "rtl" ? -1 : 1;
    // transition family (art direction): cut / whip / mask wipe / zoom-through / slide; scenes overlap by 2×X except on cuts
    const tIn = f === "cut" ? s : Math.max(0, s - X), first = tIn <= 0;
    tl.set(sc, { autoAlpha: 1 }, tIn);
    if (first) gsap.set(sc, { autoAlpha: 1 }); // the first scene is on screen from frame 0 (a set at exactly 0 is skipped by seek(0))
    else if (f === "whip") tl.fromTo(sc, { x: dir * R.W * 0.55, filter: "blur(18px)" }, { x: 0, filter: "blur(0px)", duration: 2 * X + 0.05, ease: "power3.out", immediateRender: false }, tIn);
    else if (f === "slide") tl.fromTo(sc, { y: R.H * 0.28 }, { y: 0, duration: 2 * X + 0.1, ease: "power3.out", immediateRender: false }, tIn);
    else if (f === "mask") tl.fromTo(sc, { clipPath: "circle(0% at 50% 55%)" }, { clipPath: "circle(150% at 50% 55%)", duration: 0.55, ease: "power2.inOut", immediateRender: false }, tIn);
    else if (f === "zoom") tl.fromTo(sc, { scale: 0.86 }, { scale: 1, duration: 2 * X + 0.1, ease: "power3.out", immediateRender: false }, tIn);
    if (!last) {
      if (f === "cut") tl.set(sc, { autoAlpha: 0 }, e);
      else if (f === "whip") tl.to(sc, { x: -dir * R.W * 0.55, filter: "blur(18px)", autoAlpha: 0, duration: 2 * X, ease: "power3.in" }, e - X);
      else if (f === "slide") tl.to(sc, { y: -R.H * 0.28, autoAlpha: 0, duration: 2 * X, ease: "power2.in" }, e - X);
      else if (f === "mask") tl.set(sc, { autoAlpha: 0 }, e + 0.45); // the next scene's circle opens over this one
      else tl.fromTo(sc, { scale: 1, filter: "blur(0px)" }, { scale: 1.12, filter: "blur(16px)", autoAlpha: 0, duration: 2 * X, ease: "power2.in", immediateRender: false }, e - X); // zoom-through
    }
    const words = $$(".hl .w", sc);
    if (words.length) tl.fromTo(words, { opacity: 0, y: o.slam ? 0 : 70, scale: o.slam ? 1.6 : 1, filter: "blur(14px)" }, { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", duration: (o.slam ? 0.35 : 0.55) * T, stagger: (o.slam ? BEAT / 2 : 0.07) * T, ease: o.slam ? "power4.out" : "power3.out" }, s + 0.05);
    const hi = $$(".hl .hi-line", sc); if (hi.length) tl.fromTo(hi, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "power3.inOut" }, s + 0.6);
    const sub = $(".sub", sc); if (sub) tl.fromTo(sub, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5 }, s + 0.45);
    const cos = $$(".co", sc); if (cos.length) tl.fromTo(cos, { opacity: 0, y: 30, scale: 0.8 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: BEAT, ease: "back.out(2)" }, s + (e - s) * 0.35); // chips at 35% of the scene
    // gentle push-in of the whole visual while the scene holds: never a still frame
    const vis = $(".vis", sc); if (vis) tl.fromTo(vis, { scale: 1 }, { scale: 1.03, duration: e - s, ease: "none", immediateRender: false }, s); // small: the visual stays inside the safe area
  };
  /** layout motion (art direction): full-bleed photo push, card pop, tiles, ticker, tilted stack, big type drift */
  R.layout = (tl, sc, s, e) => {
    sc = $(sc); if (!sc) return; const d = e - s, T = R.tempo || 1, t0 = Math.max(0, s - X);
    const ph = $(".ph img", sc); if (ph) tl.fromTo(ph, { scale: 1.02, xPercent: 0 }, { scale: 1.15, xPercent: -2.5, duration: d + 2 * X, ease: "none", immediateRender: false }, t0);
    const card = $(".card", sc); if (card) tl.fromTo(card, { scale: 0.86, opacity: 0, y: 60 }, { scale: 1, opacity: 1, y: 0, duration: 0.55 * T, ease: "back.out(1.6)" }, s + 0.05);
    const tiles = $$(".tile", sc);
    if (tiles.length) tl.fromTo(tiles, { opacity: 0, scale: 0.8, y: 50 }, { opacity: 1, scale: 1, y: 0, duration: 0.45, stagger: BEAT * 0.6 * T, ease: "power3.out" }, s + 0.5); // then still (UI blocks never float)
    $$(".tick .track", sc).forEach((tr, i) => tl.fromTo(tr, { xPercent: i % 2 ? -50 : 0 }, { xPercent: i % 2 ? 0 : -50, duration: d + 2 * X, ease: "none", immediateRender: false }, t0));
    // stacks: straight, offset cards sliding in (no angles)
    const stk = $$(".stackcard", sc); if (stk.length) tl.fromTo(stk, { opacity: 0, y: 100 }, { opacity: 1, y: 0, duration: 0.6 * T, stagger: 0.2, ease: "power3.out" }, s + 1);
    if (sc.classList.contains("l-bigtype") && !sc.classList.contains("r-type")) tl.fromTo($(".head", sc), { y: 0 }, { y: -36, duration: d, ease: "none", immediateRender: false }, s); // a vertical drift: never wider than the safe area (type scenes drift in R.type)
  };

  /** a device flies in (perspective tilt) at s and leaves before e */
  R.device = (tl, dev, s, e) => {
    dev = $(dev); if (!dev) return;
    // product UI stays level: it slides in straight (no tilt), then holds still — only camera zooms / pans move it
    tl.fromTo(dev, { opacity: 0, y: 220, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "power3.out" }, s + 0.1);
    if (!(R.len && e >= R.len - 0.01)) tl.to(dev, { y: -60, scale: 1.04, opacity: 0, duration: 2 * X, ease: "power2.in" }, e - X);
  };

  /** lift a real block out of the laptop toward the viewer: the laptop dims, the block grows big and comes alive */
  R.pop = (tl, sc, pop, at, e) => {
    const el = $(pop); if (!el) return; const box = el.parentElement, dev = $(`${sc} .dev`), m = meta(pop);
    tl.fromTo(box, { opacity: 0, scale: 0.6, y: 120 }, { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: "power3.out" }, at); // straight, no tilt, no overshoot
    if (dev) tl.to(dev, { opacity: 0.25, filter: "blur(4px)", scale: 0.94, duration: 0.5 }, at);
    if (m) { K.focus(tl, pop, "all", at, { dur: 0 }); R.inside(tl, pop, [0, 0, m.w, m.h], at + 0.45); }
    tl.to(box, { scale: 1.05, duration: Math.max(0.5, e - at - 0.9), ease: "none" }, at + 0.7); // a slow zoom while it holds (no float, no sway)
  };

  /** a promised input with no real field on the screen: a field in the brand's style appears, the value is typed, enter, the result */
  R.fake = (tl, sc, at, text, dur = 1.2) => {
    const f = $(`${sc} .fakefield`); if (!f) return at;
    tl.fromTo(f, { opacity: 0, y: 30, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(1.8)" }, at);
    K.type(tl, `${sc} .ff-text`, String(text || ""), at + 0.35, dur);
    K.press(tl, f, at + 0.45 + dur); K.flash(tl, at + 0.6 + dur, 0.2);
    tl.to(f, { opacity: 0, y: -30, duration: 0.3 }, at + 1.15 + dur);
    return at + 1.3 + dur;
  };
  /** a promised input on a real field: zoom to it, type the value; returns when the result can be shown */
  const typeIn = (tl, sc, ui, s, typeKey, typeText, fake) => {
    if (fake) return snap(R.fake(tl, sc, s + 0.6, fake));
    if (!typeKey) return null;
    const t = snap(s + 0.8), dt = 1.2;
    K.focus(tl, ui, typeKey, t, { dur: 0.6, max: R.ZMAX }); K.typeInto(tl, ui, typeKey, t + 0.5, dt, typeText || undefined);
    return snap(t + 0.7 + dt);
  };

  // ---------- scene recipes ----------
  /** live screen on the laptop: whole screen → glide into the blocks that prove the headline, elements come alive inside */
  R.tour = (tl, { sc, ui, s, d, focus = [], pop, typeKey, typeText, fake }) => {
    // the scene and its device live for the whole scene (s → s+d); a pop only ends the camera tour inside the laptop
    const e0 = s + d, popAt = pop ? snap(s + Math.max(2, d * 0.5)) : null, e = pop ? popAt + 0.2 : e0;
    R.scene(tl, sc, s, e0); R.device(tl, `${sc} .dev`, s, e0); if (pop) R.pop(tl, sc, pop, popAt, e0);
    K.focus(tl, ui, "all", s, { dur: 0 });
    const regs = focus.map((t) => ({ t, b: boxOf(ui, t) })).filter((x) => x.b);
    for (const r of R.regions(ui)) if (regs.length < 3 && !regs.some((x) => x.t === r.t)) regs.push(r);
    const stops = regs.slice(0, pop ? 1 : d >= 5.5 ? 3 : d >= 3.5 ? 2 : 1);
    const typed = typeIn(tl, sc, ui, s, typeKey, typeText, fake); // a promised input first, then the result
    const t0 = typed ? Math.max(typed, snap(s + 1)) : snap(s + 1), span = ((pop ? Math.max(e, t0 + 1) - 0.5 : e0 - X) - t0) / Math.max(1, stops.length); // the last push-in runs until the scene exits
    stops.forEach((r, i) => {
      const at = snap(t0 + i * span);
      K.focus(tl, ui, r.b, at, { dur: 0.8, max: R.ZMAX });
      const sh = [r.b[0] + r.b[2] * 0.04, r.b[1] + r.b[3] * 0.04, r.b[2] * 0.92, r.b[3] * 0.92];
      K.focus(tl, ui, sh, at + 0.8, { dur: Math.max(0.4, span - 0.9), max: R.ZMAX, ease: "none" }); // slow push-in while holding: never a still frame
      R.inside(tl, ui, r.b, at + 0.5);
    });
  };
  /** replay a recorded action: before screen → zoom to the field, type the real value → tap the real button → the result screen → zoom into it */
  R.replay = (tl, { sc, a, b, s, d, typeKey, tapKey, result, pop, fake, then = [] }) => {
    const e = s + d; R.scene(tl, sc, s, e); R.device(tl, `${sc} .dev`, s, e);
    const typedAt = fake ? snap(R.fake(tl, sc, s + 0.4, fake, Math.min(1.2, d * 0.2))) : null;
    typeKey = typeKey || R.acted(a, "type"); tapKey = tapKey || R.acted(a, "click");
    const ma = meta(a), navTap = tapKey && ma && ma.info && ma.info[tapKey] && ma.info[tapKey][0] === "nav";
    K.focus(tl, a, "all", s, { dur: 0 }); tl.set(b, { autoAlpha: 0 }, s);
    let t = typedAt || snap(s + 0.8);
    if (typeKey && !navTap) { const dt = Math.min(1.4, d * 0.22); K.focus(tl, a, typeKey, t, { dur: 0.6, max: R.ZMAX }); K.typeInto(tl, a, typeKey, t + 0.5, dt); t = snap(t + 0.6 + dt); }
    else { const tgt = (tapKey && boxOf(a, tapKey)) || (R.regions(a)[0] || {}).b; if (tgt) K.focus(tl, a, tgt, t, { dur: 0.6, max: R.ZMAX }); } // never hold the whole "before" screen
    if (tapKey) {
      if (navTap) { K.tap(tl, a, tapKey, snap(t + 0.8), { dur: 0.6, from: [700, 1450] }); t = snap(t + 1.2); } // menu click: quick, the page is the point
      else { K.focus(tl, a, tapKey, t, { dur: 0.5, max: R.ZMAX }); K.tap(tl, a, tapKey, snap(t + 0.9), { dur: 0.6, from: [760, 1500] }); t = snap(t + 1.2); }
    }
    // a short loading beat, then the result appears and the camera tours it
    const sp = $(`${sc} .spin`);
    if (sp) { tl.fromTo(sp, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.2 }, t - 0.1); tl.fromTo(sp, { rotation: 0 }, { rotation: 600, duration: 0.75, ease: "none", immediateRender: false }, t - 0.1); tl.to(sp, { opacity: 0, duration: 0.15 }, t + 0.5); t = snap(t + 0.6); }
    K.swap(tl, a, b, t, 0.35); K.flash(tl, t + 0.15, 0.25);
    K.focus(tl, b, "all", t, { dur: 0 });
    const regs = []; if (result && boxOf(b, result)) regs.push({ b: boxOf(b, result) });
    for (const r of R.regions(b)) if (regs.length < 2) regs.push(r);
    const popAt = pop && !then.length && e - t >= 1.4 ? Math.min(snap(Math.max(t + 0.6, e - 2.2)), e - 1) : null;
    if (popAt) R.pop(tl, sc, pop, popAt, e);
    // a merged flow scene: after the result, the camera moves on to the screens it leads to (product page, order form…)
    const chain = then.map((x) => $(x)).filter(Boolean), slot = chain.length ? Math.min(3, (e - X - t - 0.6) / (chain.length + 1)) : 0, endR = e - X - slot * chain.length;
    chain.forEach((el, k) => {
      const at = snap(endR + k * slot), prev = k ? chain[k - 1] : $(b);
      K.swap(tl, prev, el, at, 0.35); K.focus(tl, el, "all", at, { dur: 0 });
      const r = R.regions(el)[0]; if (r) { K.focus(tl, el, r.b, at + 0.4, { dur: 0.7, max: R.ZMAX }); K.focus(tl, el, [r.b[0] + r.b[2] * 0.04, r.b[1] + r.b[3] * 0.04, r.b[2] * 0.92, r.b[3] * 0.92], at + 1.1, { dur: Math.max(0.4, slot - 1.2), max: R.ZMAX, ease: "none" }); R.inside(tl, el, r.b, at + 0.5); }
    });
    const t0 = snap(t + 0.6), left = (popAt || endR) - t0, n = Math.max(1, Math.min(regs.length, left >= 3 ? 2 : 1)), span = left / n;
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
  R.phone = (tl, { sc, ui, s, d, tapKey, typeKey, typeText, fake }) => {
    const e = s + d; R.scene(tl, sc, s, e); R.device(tl, `${sc} .dev`, s, e);
    const m = meta(ui), el = $(ui); if (!m) return;
    const s1 = +el.dataset.scale, vh = +el.dataset.vh / s1;
    const maxY = Math.max(0, m.h - vh), stops = [0, Math.min(maxY, vh * 0.75), Math.min(maxY, vh * 1.6)];
    K.focus(tl, ui, "all", s, { dur: 0 });
    const typed = typeIn(tl, sc, ui, s, typeKey, typeText, fake); if (typed && !fake) K.focus(tl, ui, "all", typed, { dur: 0.6 });
    const t1 = typed ? Math.max(typed + 0.6, snap(s + 1.2)) : snap(s + 1.2), step = Math.max(0.8, (e - 1 - t1) / 2);
    if (stops[1] > 0) K.scrollTo(tl, ui, stops[1], t1, Math.min(1.2, step * 0.7));
    if (stops[2] > stops[1]) K.scrollTo(tl, ui, stops[2], snap(t1 + step), Math.min(1.2, step * 0.7));
    tapKey = tapKey || R.acted(ui, "click");
    if (tapKey && m.keys[tapKey]) { const kb = m.keys[tapKey]; K.scrollTo(tl, ui, Math.max(0, Math.min(maxY, kb[1] - vh * 0.55)), snap(e - 2.2), 0.6); K.tap(tl, ui, tapKey, snap(e - 1.2), { dur: 0.6, from: [880, 1650] }); }
  };
  /** one real block, big: tilts in, its insides come alive */
  R.hero = (tl, { sc, ui, s, d, typeKey, typeText, fake }) => {
    const e = s + d; R.scene(tl, sc, s, e); R.device(tl, `${sc} .dev`, s, e);
    const m = meta(ui), el = $(ui);
    if (m && el) {
      const typed = typeIn(tl, sc, ui, s, typeKey, typeText, fake), t = typed || snap(s + 0.9);
      const sc1 = +el.dataset.scale, vw = +el.dataset.vw, vh = +el.dataset.vh;
      if (m.h * sc1 < vh * 0.6) {
        // a wide, thin block: fill the window's height and pan across it (never a thin strip in an empty frame)
        const bw = Math.min(m.w, m.h * (vw / vh));
        K.focus(tl, ui, [0, 0, bw, m.h], s, { dur: 0, max: R.ZMAX });
        K.focus(tl, ui, [Math.max(0, m.w - bw), 0, bw, m.h], t, { dur: Math.max(1, e - X - t), max: R.ZMAX, ease: "none" });
      } else K.focus(tl, ui, "all", s, { dur: 0 });
      R.inside(tl, ui, [0, 0, m.w, m.h], t);
    }
    const glow = $(`${sc} .glow`); if (glow) K.pulse(tl, glow, s + 1, e - 0.4, { scale: 1.08, opacity: 1 }, 1);
  };
  /** hook: words slam in on the beat, logo flashes in */
  R.hook = (tl, { sc, s, d }) => {
    const e = s + d; R.scene(tl, sc, s, e, { slam: true });
    const lg = $(`${sc} .biglogo`); if (lg) tl.fromTo(lg, { scale: 0.3, opacity: 0, filter: "blur(20px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.6, ease: "expo.out" }, s);
    K.flash(tl, s + 0.05, 0.35);
    // a long hook keeps moving after the slam: the headline grows slowly, the logo pulses on the beat
    if (d > 2.5) { tl.fromTo($(`${sc} .head`), { y: 0 }, { y: -40, duration: e - s - 1, ease: "none", immediateRender: false }, s + 0.9); if (lg) K.pulse(tl, lg, s + 1, e - X, { scale: 1.08 }, BEAT); } // drifts up: never wider than the safe area
  };
  /** problem: pain cards pile up on the beat, then get wiped */
  R.stack = (tl, { sc, s, d }) => {
    const e = s + d; R.scene(tl, sc, s, e);
    const cards = $$(`${sc} .pain`); const rot = [0, 0, 0, 0, 0]; // large cards drop in straight (a rotated full-width card would leave the safe area)
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
    // timings fit the scene: a short CTA still shows the button and the whole URL
    const btn = $(`${sc} .cta-btn`); if (btn) { tl.fromTo(btn, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, s + Math.min(0.9, d * 0.2)); if (d > 3) K.pulse(tl, btn, snap(s + 1.5), e - 1.5, { scale: 1.06 }, 0.5); }
    const url = $(`${sc} .url`); if (url) K.type(tl, `${sc} .url`, url.dataset.text, s + Math.min(1.3, d * 0.25), Math.min(1, d * 0.3));
  };
  // non-device mechanics: kinetic type, items piling up, a counting number, the logo outro
  R.type = R.hook; R.pains = R.stack; R.count = R.stat; R.logo = R.cta;
  R.none = (tl, { sc, s, d }) => R.scene(tl, sc, s, s + d);

  /** pace: no scene goes more than 3 s without visible movement — a beat (camera to another region, a chip, the highlight) fills longer gaps */
  R.pace = (tl, wins) => {
    const moves = [];
    for (const tw of tl.getChildren(true, true, false)) {
      const d = tw.duration(), st = tw.startTime(), el = (tw.targets ? tw.targets() : []).find((x) => x && x.nodeType === 1);
      if (el && (el.closest("#bg") || el.id === "bar" || el.id === "mark")) continue;
      // slow drifts (push-ins, device drift, photo push, floats) are not "visible movement"; ticker rows are
      if (d > 2.5 && ["none", "sine.inOut"].includes(tw.vars.ease) && !(el && (el.closest(".tick") || el.classList.contains("ui-cam")))) continue; // a camera push-in inside a screen is a camera move
      moves.push({ a: st, b: st + Math.max(d, 0.2), el });
    }
    for (const [s, e, sel] of wins) {
      const root = $(sel); if (!root) continue;
      const mine = moves.filter((m) => m.b > s && m.a < e && (!m.el || root.contains(m.el))).sort((x, y) => x.a - y.a);
      const gaps = []; let t = s;
      for (const m of mine) { if (m.a - t > 3) gaps.push([t, m.a]); t = Math.max(t, m.b); }
      if (e - t > 3) gaps.push([t, e]);
      let k = 0; for (const [g0, g1] of gaps) for (let at = g0 + 1.5; at < g1 - 0.5; at += 2.5) beat(tl, root, snap(at), k++, s, e);
    }
  };
  const beat = (tl, root, at, k, s, e) => {
    // the screen on show at that moment: a replay's result screen after its swap, never a pop-out
    const cl = [...root.querySelectorAll("[data-clone]")].filter((u) => meta(u) && u.querySelector(".ui-cam") && !u.closest(".pop"));
    const after = cl.find((u) => u.classList.contains("ui-after")), ui = after && at > s + (e - s) * 0.45 ? after : cl.find((u) => !u.classList.contains("ui-after"));
    if (ui) { const regs = R.regions(ui), r = regs[(k + 1) % Math.max(1, regs.length)]; if (r) { K.focus(tl, ui, r.b, at, { dur: 0.8, max: R.ZMAX }); return; } }
    const items = $$(".co, .stackcard, .pain", root); // text cards only: product UI blocks (tiles) never pulse
    if (items.length) { tl.fromTo(items[k % items.length], { scale: 1 }, { scale: 1.07, duration: 0.25, yoyo: true, repeat: 1, ease: "power2.out", immediateRender: false }, at); return; }
    const hi = $(".hl .hi", root) || $(".head", root); if (hi) tl.fromTo(hi, { scale: 1 }, { scale: 1.07, duration: 0.3, yoyo: true, repeat: 1, ease: "power2.out", immediateRender: false }, at);
  };

  /** after the fonts load: text that could run off the frame shrinks until it fits (−4% steps), the ✓ badge moves off the headline */
  R.fit = () => {
    const stage = $("#stage"); if (!stage) return;
    const W = stage.clientWidth, H = stage.clientHeight, margin = Math.round((W * 80) / 1080), max = W - 2 * margin, SYb = H - Math.round((H * 140) / 1920);
    for (const el of $$(".bignum, .url, .cta-btn, .hl, .cos", stage)) {
      el.style.maxWidth = (el.closest(".vis") ? Math.floor(max / 1.03) - 8 : max) + "px"; el.style.boxSizing = "border-box"; // inside the visual layer: room for its 3% push-in
      if (el.matches(".bignum, .url")) { el.style.marginLeft = "auto"; el.style.marginRight = "auto"; }
      const typed = el.matches(".url") && !el.textContent.trim() && el.dataset.text; if (typed) el.textContent = el.dataset.text; // measure the full URL K.type will write
      if (el.matches(".bignum, .url, .cta-btn")) el.style.whiteSpace = "nowrap"; // .cos: a one-line chip row (flex nowrap)
      let fs = parseFloat(getComputedStyle(el).fontSize);
      // a centred one-line chip row overflows on both sides (scrollWidth misses it): measure its chips
      const wide = el.matches(".cos") ? () => [...el.children].reduce((a, c) => a + c.offsetWidth, 0) + 22 * Math.max(0, el.children.length - 1) > el.clientWidth + 1 : () => el.scrollWidth > el.clientWidth + 1;
      for (let i = 0; i < 40 && wide(); i++) { fs *= 0.96; el.style.fontSize = fs.toFixed(1) + "px"; }
      // headlines: at most 2 lines (same −4% steps)
      if (el.matches(".hl")) { const lines = () => Math.round(el.offsetHeight / (parseFloat(getComputedStyle(el).lineHeight) || fs * 1.3)); for (let i = 0; i < 40 && lines() > 2; i++) { fs *= 0.96; el.style.fontSize = fs.toFixed(1) + "px"; } }
      if (typed) el.textContent = "";
    }
    const top = (el) => { let y = 0; for (let e = el; e && e !== stage; e = e.offsetParent) y += e.offsetTop; return y; };
    // a head block that still reaches the device: the device starts 40 px under it
    for (const dev of $$(".scene:not(.l-split):not(.l-photo) .dev", stage)) {
      const head = $(".head", dev.closest(".scene")); if (!head) continue;
      const cos = $(".cos", dev.closest(".scene"));
      const below = top(head) + head.offsetHeight + 40, delta = Math.min(below - top(dev), SYb - (top(dev) + dev.offsetHeight), cos ? SYb - (cos.offsetTop + cos.offsetHeight) : Infinity);
      if (top(dev) < below && delta > 0) { dev.style.top = dev.offsetTop + delta + "px"; if (cos) cos.style.top = cos.offsetTop + delta + "px"; }
    }
    // the ✓ badge sits on the laptop's top corner: if the headline/sub reaches down to it, move it to the bottom corner
    for (const ok of $$(".ok", stage)) {
      const sc = ok.closest(".scene"), head = sc && $(".head", sc); if (!head) continue;
      if (top(ok) < top(head) + head.offsetHeight + 16) { ok.style.top = "auto"; ok.style.bottom = "-40px"; }
    }
  };

  K.R = R;
})();

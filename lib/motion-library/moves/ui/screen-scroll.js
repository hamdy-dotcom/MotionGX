// Screen scroll (thumb scroll): the page inside a device scrolls smoothly. One stop: the page tweens up over ~0.8 s
// (power2.inOut), starting 0.4 s before its word, until the element being talked about sits ~25 % down the view —
// to = clamp(element top − 25 % of the view, 0, page height − view) (our studio S.screen scroll + live K.scrollTo).
// Thumb: stops at 0.75 and 1.6 views (clamped), each min(1.2, step × 0.7) s, then the focus element (R.phone). With
// tap_at_end the page settles the main button at 55 % and a pointer glides in and taps it 1.2 s before the end (K.tap).
// Strip: MengTo html-reel's tall strip of stacked screens, translateY 0 → −(strip − box) across the piece.
// Works on the target's own scrolling content (a screen taller than its box, or an image scrolled by its position),
// else on a phone built in the picture region with a page drawn from the look.
// Sources: MotionGX lib/studio-engine/assets/scenes.js S.screen, lib/live-engine/worker/vendor/kit.js K.scrollTo / K.tap,
// recipes.js R.phone (own); MengTo/Skills agent-skills/media/html-reel structures.md + choreo-example.mjs (MIT).
ML.define({
  id: "ui.screen-scroll",
  category: "ui",
  name: "Screen scrolls (thumb scroll)",
  does: "The page inside a device scrolls smoothly — once to bring the element being talked about near the top, or in two thumb-like moves — optionally ending with a tap on the main button.",
  says: ["flow", "step"],
  energy: 2,
  targets: ["screen", "cursor", "image"],
  duration: [0.6, 4],
  params: {
    stops: { type: "number", range: [1, 3], default: 1 },
    target_position: { type: "number", range: [20, 55], default: 25, unit: "%" },
    duration: { type: "number", range: [0.6, 1.2], default: 0.8, unit: "s" },
    tap_at_end: { type: "bool", default: false },
    strip: { type: "bool", default: false },
    easing: { type: "choice", options: ["in-out", "linear"], default: "in-out" },
    word: { type: "text" },
  },
  pairs: ["ui.cursor-glide-click", "ui.floating-ui-card"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "own:lib/studio-engine/assets/scenes.js#S.screen", license: "own", note: "with live-engine K.scrollTo / K.tap / R.phone and MengTo/Skills html-reel strip scroll (MIT)" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const pw2 = (t, a, b) => (p.easing === "linear" ? ML.lin(t, a, b) : ML.ease(t, a, b)); // power2.inOut ≈ the kit's in-out

    // ── what scrolls: an image by its position, a screen's own content, or a phone we build ──
    let mode, view, page = null, focusEl = null, tapEl = null, device = null;
    if (el && el.tagName === "IMG") {
      mode = "img"; view = el;
    } else if (el && el.scrollHeight > el.clientHeight + 20) {
      mode = "own"; view = el;
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      el.style.overflow = "hidden";
      page = mk("div", "position:relative;will-change:translate;", el);
      for (const c of [...el.childNodes]) if (c !== page) page.append(c);
      focusEl = el.querySelector("[data-focus]") || el.querySelector("[data-k]") || el.querySelector("button, .btn");
      tapEl = el.querySelector("[data-tap]") || focusEl;
    } else {
      mode = "phone";
      const host = el || ctx.scene || ctx.stage;
      if (el && getComputedStyle(el).position === "static") el.style.position = "relative";
      const R = el ? { x: 0, y: 0, w: el.clientWidth, h: el.clientHeight } : f.pic;
      const H = Math.min(R.h, 1500 * k), W = Math.min(R.w, H * 0.49);
      const bez = Math.max(6, 14 * k), rad = Math.min(W * 0.16, 74 * k);
      device = mk("div", `position:absolute;left:${(R.x + (R.w - W) / 2).toFixed(1)}px;top:${(R.y + (R.h - H) / 2).toFixed(1)}px;width:${W.toFixed(1)}px;height:${H.toFixed(1)}px;box-sizing:border-box;padding:${bez.toFixed(1)}px;background:var(--x-device);border-radius:${rad.toFixed(1)}px;box-shadow:var(--x-shadow);z-index:5;pointer-events:none;`, host);
      view = mk("div", `position:relative;width:100%;height:100%;overflow:hidden;background:var(--x-ground);border-radius:${(rad - bez).toFixed(1)}px;`, device);
      mk("div", `position:absolute;top:${(bez * 0.8).toFixed(1)}px;left:50%;translate:-50% 0;width:${(W * 0.28).toFixed(1)}px;height:${(W * 0.075).toFixed(1)}px;border-radius:99px;background:var(--x-device);z-index:3;`, view);
      const u = W / 400; // the page is drawn for a 400 px-wide phone
      page = mk("div", `position:relative;display:flex;flex-direction:column;gap:${(14 * u).toFixed(1)}px;padding:${(48 * u).toFixed(1)}px ${(16 * u).toFixed(1)}px ${(40 * u).toFixed(1)}px;font-family:var(--x-body-font);color:var(--x-ink);`, view);
      page.dir = rtl ? "rtl" : "ltr";
      const T = (en, ar) => (rtl ? ar : en);
      const bar = mk("div", `display:flex;align-items:center;justify-content:space-between;font:700 ${(20 * u).toFixed(1)}px var(--x-head-font);`, page, null);
      mk("span", "", bar, T("Shop", "المتجر"));
      mk("span", `width:${(30 * u).toFixed(1)}px;height:${(30 * u).toFixed(1)}px;border-radius:50%;background:var(--x-panel-2);`, bar);
      const hero = mk("div", `height:${(210 * u).toFixed(1)}px;border-radius:calc(var(--x-radius) * 0.6);background:linear-gradient(135deg, var(--x-accent), var(--x-accent-2));color:var(--x-accent-ink);padding:${(20 * u).toFixed(1)}px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:flex-end;gap:${(6 * u).toFixed(1)}px;`, page);
      mk("div", `font:700 ${(28 * u).toFixed(1)}px/1.1 var(--x-head-font);`, hero, T("New season", "الموسم الجديد"));
      mk("div", `font:400 ${(15 * u).toFixed(1)}px var(--x-body-font);opacity:.85;`, hero, T("Fresh picks for you", "اختيارات جديدة ليك"));
      const card = (i, tall) => {
        const c = mk("div", `display:flex;gap:${(12 * u).toFixed(1)}px;align-items:center;padding:${(12 * u).toFixed(1)}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * 0.45);`, page);
        mk("div", `flex:none;width:${(tall ? 84 : 58) * u}px;height:${(tall ? 84 : 58) * u}px;border-radius:calc(var(--x-radius) * 0.3);background:color-mix(in srgb, var(--x-accent) ${(15 + ML.rnd(i, 2) * 35).toFixed(0)}%, var(--x-panel-2));`, c);
        const col = mk("div", `flex:1;display:flex;flex-direction:column;gap:${(8 * u).toFixed(1)}px;`, c);
        mk("div", `height:${(11 * u).toFixed(1)}px;width:${(50 + ML.rnd(i, 4) * 40).toFixed(0)}%;border-radius:99px;background:color-mix(in srgb, var(--x-ink) 70%, transparent);`, col);
        mk("div", `height:${(9 * u).toFixed(1)}px;width:${(30 + ML.rnd(i, 6) * 40).toFixed(0)}%;border-radius:99px;background:var(--x-line);`, col);
        return c;
      };
      for (let i = 0; i < 4; i++) card(i, false);
      const grid = mk("div", `display:grid;grid-template-columns:1fr 1fr;gap:${(12 * u).toFixed(1)}px;`, page);
      for (let i = 0; i < 4; i++) mk("div", `height:${(150 * u).toFixed(1)}px;border-radius:calc(var(--x-radius) * 0.45);background:color-mix(in srgb, var(--x-accent-2) ${(12 + ML.rnd(i, 9) * 30).toFixed(0)}%, var(--x-panel));border:var(--x-edge) solid var(--x-edge-color);`, grid);
      for (let i = 4; i < 7; i++) card(i, false);
      // the thing being talked about: a featured card with the main button
      focusEl = mk("div", `display:flex;flex-direction:column;gap:${(12 * u).toFixed(1)}px;padding:${(18 * u).toFixed(1)}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * 0.6);box-shadow:var(--x-shadow);`, page);
      mk("div", `font:700 ${(22 * u).toFixed(1)}px var(--x-head-font);`, focusEl, T("Your plan", "خطتك"));
      mk("div", `font:400 ${(15 * u).toFixed(1)}px/1.4 var(--x-body-font);color:var(--x-dim);`, focusEl, T("Split it into four, no interest.", "قسّطها على أربعة من غير فوايد."));
      tapEl = mk("div", `align-self:stretch;text-align:center;padding:${(14 * u).toFixed(1)}px;border-radius:var(--x-radius-s);background:var(--x-accent);color:var(--x-accent-ink);font:600 ${(17 * u).toFixed(1)}px var(--x-body-font);`, focusEl, T("Continue", "كمّل"));
      for (let i = 7; i < 10; i++) card(i, true);
    }

    // ── where it stops: planned from layout (offsets, never our transforms), re-read each frame because web fonts
    // may land after setup; the same layout always gives the same plan ──
    const offTop = (e) => { let y = 0, n = e; while (n && n !== page && n !== view) { y += n.offsetTop; n = n.offsetParent; } return y; };
    const pct = ML.clamp(p.target_position, 20, 55) / 100;
    const d = ML.clamp(p.duration, 0.6, 1.2);
    const tapAt = p.tap_at_end && tapEl ? Math.max(at + 0.9, end - 1.2) : null;
    const spoken = p.word ? ctx.word(p.word, -1) : -1;
    const plan = () => {
      const vh = mode === "img" ? view.clientHeight : view.clientHeight;
      const ph = mode === "img" ? Math.max(vh, (view.naturalHeight / (view.naturalWidth || 1)) * view.clientWidth) : page.scrollHeight;
      const maxY = Math.max(0, ph - vh), clampY = (y) => ML.clamp(y, 0, maxY);
      const focusY = focusEl ? clampY(offTop(focusEl) - vh * pct) : maxY;
      const tapY = tapEl ? clampY(offTop(tapEl) + tapEl.offsetHeight / 2 - vh * 0.55) : maxY;
      const keys = []; // [start, dur, from, to]
      if (p.strip) keys.push([at + 0.2, Math.max(0.4, end - 0.6 - (at + 0.2)), 0, maxY]);
      else {
        const n = Math.round(ML.clamp(p.stops, 1, 3));
        const ys = n === 1 ? [focusY] : n === 2 ? [clampY(vh * 0.75), focusY] : [clampY(vh * 0.75), clampY(vh * 1.6), focusY];
        const lastEnd = tapAt ? tapAt - 1.0 : end - 0.5;
        const t0 = n === 1 && spoken > 0 ? Math.max(at, spoken - 0.4) : at + 0.3;
        const step = n === 1 ? 0 : Math.max(0.5, (lastEnd - d - t0) / (n - 1));
        const dd = n === 1 ? d : Math.min(d, Math.max(0.4, step * 0.7));
        let from = 0;
        ys.forEach((y, i) => { const s0 = Math.min(t0 + i * step, Math.max(at, lastEnd - dd)); if (Math.abs(y - from) > 1) keys.push([s0, dd, from, y]); from = y; });
        if (tapAt && Math.abs(tapY - from) > 1) { const l = keys[keys.length - 1]; keys.push([Math.max(l ? l[0] + l[1] : at, tapAt - 1.0), 0.6, from, tapY]); }
      }
      return { keys, maxY };
    };
    plan().keys.forEach(([s0]) => ctx.sfx(s0, "whoosh.soft", 0.22));

    // ── the pointer (K.tap): glides from low on the frame to the button, taps at tapAt ──
    let ptr = null, ripple = null;
    const from0 = { x: f.W * (rtl ? 0.2 : 0.8), y: f.H * 0.88 };
    if (tapAt) {
      const st = ctx.scene || ctx.stage, s = 58 * k;
      ripple = mk("div", `position:absolute;left:0;top:0;width:${(90 * k).toFixed(1)}px;height:${(90 * k).toFixed(1)}px;margin:${(-45 * k).toFixed(1)}px 0 0 ${(-45 * k).toFixed(1)}px;border-radius:50%;border:${(5 * k).toFixed(1)}px solid var(--x-pointer-edge);box-shadow:0 0 ${(24 * k).toFixed(1)}px color-mix(in srgb, var(--x-pointer-edge) 60%, transparent);z-index:20;opacity:0;pointer-events:none;`, st);
      ptr = mk("div", `position:absolute;left:0;top:0;width:${s.toFixed(1)}px;height:${s.toFixed(1)}px;z-index:21;opacity:0;pointer-events:none;filter:drop-shadow(0 ${(6 * k).toFixed(1)}px ${(10 * k).toFixed(1)}px rgba(0,0,0,.3));`, st);
      ptr.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 24 24"><path d="M5 2.5l13.5 12.2-6.2.6 3.7 7.1-2.6 1.3-3.6-7.2L5 21z" fill="var(--x-pointer)" stroke="var(--x-pointer-edge)" stroke-width="1.3" stroke-linejoin="round"/></svg>`;
      ctx.sfx(tapAt, "click", 0.4);
    }

    const posAt = (t, keys) => { let y = 0; for (const [s0, dd, a, b] of keys) { if (t < s0) break; y = a + (b - a) * pw2(t, s0, s0 + dd); } return y; };
    return {
      draw(t) {
        if (device) { const u = ML.out(t, at - 0.1, at + 0.35), l = ML.lin(t, end - 0.25, end); device.style.opacity = (t < at - 0.1 ? 0 : u * (1 - l)).toFixed(4); device.style.translate = `0 ${((1 - u) * 60 * k).toFixed(2)}px`; }
        const { keys, maxY } = plan(), y = posAt(t, keys);
        if (mode === "img") { view.style.objectFit = "cover"; view.style.objectPosition = `50% ${(maxY ? (y / maxY) * 100 : 0).toFixed(3)}%`; }
        else page.style.translate = `0 ${(-y).toFixed(2)}px`;
        if (ptr) {
          // the button's centre in stage px with the page where it settles (the view's box: the device has landed by now)
          const vb = ctx.box(view), r = vb.h / (view.offsetHeight || 1), yEnd = keys.length ? keys[keys.length - 1][3] : 0;
          let ox = 0, n = tapEl; while (n && n !== page) { ox += n.offsetLeft; n = n.offsetParent; }
          const tapC = { x: vb.x + (ox + tapEl.offsetWidth / 2) * r, y: vb.y + (offTop(tapEl) + tapEl.offsetHeight / 2 - yEnd) * r };
          const g = ML.ease(t, tapAt - 0.6, tapAt), x = from0.x + (tapC.x - from0.x) * g, yy = from0.y + (tapC.y - from0.y) * g;
          const o = t < tapAt - 0.6 ? 0 : Math.min(1, ML.lin(t, tapAt - 0.6, tapAt - 0.45)) * (1 - ML.lin(t, tapAt + 0.6, tapAt + 0.85));
          ptr.style.opacity = o.toFixed(4);
          ptr.style.translate = `${(x - 6 * k).toFixed(2)}px ${(yy - 4 * k).toFixed(2)}px`;
          ptr.style.scale = t >= tapAt && t < tapAt + 0.3 ? (0.85 + 0.15 * ML.out(t, tapAt + 0.1, tapAt + 0.3)).toFixed(4) : "none";
          ptr.style.transformOrigin = "10% 10%";
          const q = ML.out(t, tapAt, tapAt + 0.5);
          ripple.style.opacity = t < tapAt || q >= 1 ? "0" : (0.9 * (1 - q)).toFixed(4);
          ripple.style.translate = `${tapC.x.toFixed(2)}px ${tapC.y.toFixed(2)}px`;
          ripple.style.scale = (0.3 + 1.3 * q).toFixed(4);
          const pr = t < tapAt ? 0 : t < tapAt + 0.1 ? ML.lin(t, tapAt, tapAt + 0.1) : 1 - ML.back(t, tapAt + 0.1, tapAt + 0.4, 3);
          tapEl.style.scale = pr ? (1 - 0.08 * pr).toFixed(4) : "none";
        }
      },
    };
  },
});

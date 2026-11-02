// Glass booking bar: a frosted booking strip rises from the bottom of a hero. A 1 px gradient rim (to bottom-right:
// light at 20 % → 5 % → transparent, the look's radius) with the look's shadow; inside, a glass panel (ink at 80 %,
// backdrop blur, padding 24) holding the fields in a grid split by hairlines (light at 10 %), each an 11 px
// uppercase label at 50 %, a 16 px value and an icon (a size up from the source, so a phone can read them); then a CTA (accent, 12 px uppercase widest) with an
// arrow that points the reading way. Enter: y 30 → 0 with opacity over 1 s power3.out, 0.2 s after `at` (after the
// hero title). With `fill_demo` the values then type in field by field for a demo beat. The hero behind is the look's
// own colour field (no photo is ever enlarged or blurred); on a target the director gives, the bar sits at its bottom.
// Source: MengTo/Skills web-design/dither-laser-dark-mode demo (the booking bar, MIT).
ML.define({
  id: "ui.glass-booking-bar",
  category: "ui",
  name: "Glass booking strip rises over hero",
  does: "A frosted booking bar with date, room and guests fields and a call to action rises from the bottom of the hero.",
  says: ["choice", "luxury", "simplicity"],
  energy: 2,
  targets: ["card", "screen"],
  duration: [1, 3],
  params: {
    fields: { type: "number", range: [2, 5], default: 4 },
    fill_demo: { type: "bool", default: true },
    cta: { type: "text", default: "Check availability" },
  },
  pairs: ["text-in.mask-rise", "camera.slow-push"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:web-design/dither-laser-dark-mode", license: "MIT", note: "booking bar markup and shadow from the demo; motion ours on one clock" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); parent.append(e); return e; };
    const U = (n) => `calc(var(--u) * ${n})`;
    const host = ctx.scene || ctx.stage;
    const inEl = ctx.el && ctx.el !== ctx.stage;
    const R = inEl ? ctx.box(ctx.el) : f.pic;
    const stack = R.w < 1200;
    // the hero: the look's own colour field
    const hero = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;border-radius:var(--x-pic-radius);overflow:hidden;pointer-events:none;z-index:5;display:flex;align-items:flex-end;justify-content:center;box-sizing:border-box;padding:${(Math.min(R.w, R.h) * 0.05).toFixed(1)}px;`, host);
    if (!inEl) hero.style.background = "radial-gradient(120% 80% at 70% 20%, color-mix(in srgb, var(--x-accent-2) 70%, transparent), transparent 60%), linear-gradient(160deg, color-mix(in srgb, var(--x-accent) 75%, var(--x-ink)), var(--x-ink))";

    const LIGHT = "var(--x-ground)", ON = (a) => `color-mix(in srgb, ${LIGHT} ${a}%, transparent)`;
    const wrap = mk("div", `--u:1px;width:${U(stack ? 420 : 940)};position:relative;box-sizing:border-box;padding:max(1px, ${U(1)});font-family:var(--x-body-font);`, hero);
    // the rim fades as its own layer and the panel by its own opacity: opacity on a shared parent would cut the panel's
    // backdrop blur off from the hero until the fade ended, and the frost would pop in
    const rim = mk("div", `position:absolute;inset:0;border-radius:var(--x-radius);background:linear-gradient(to bottom right, ${ON(20)}, ${ON(5)}, transparent);box-shadow:var(--x-shadow);`, wrap);
    const inner = mk("div", `position:relative;border-radius:calc(var(--x-radius) * 0.95);padding:${U(24)};background:color-mix(in srgb, var(--x-ink) 80%, transparent);backdrop-filter:blur(${U(24)});-webkit-backdrop-filter:blur(${U(24)});display:flex;flex-direction:${stack ? "column" : "row"};gap:${U(16)};align-items:${stack ? "stretch" : "center"};color:${LIGHT};`, wrap);
    const n = Math.round(ML.clamp(p.fields, 2, 5));
    const ALL = rtl
      ? [["تسجيل الوصول", "١٢ أكتوبر", "cal"], ["المغادرة", "١٥ أكتوبر", "cal"], ["الغرفة", "جناح بإطلالة", "bed"], ["الضيوف", "ضيفان", "user"], ["رمز العرض", "WINTER", "tag"]]
      : [["Check in", "Oct 12", "cal"], ["Check out", "Oct 15", "cal"], ["Room", "Sea suite", "bed"], ["Guests", "2 adults", "user"], ["Promo code", "WINTER", "tag"]];
    const ICON = {
      cal: "M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z M4 10h16 M9 3v4 M15 3v4",
      bed: "M3 18V8 M3 14h18v4 M21 14v-2a3 3 0 0 0-3-3h-7v5 M6.5 12a1.5 1.5 0 1 0 0-.01",
      user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 20a8 8 0 0 1 16 0",
      tag: "M3 12V4h8l10 10-8 8z M7.5 7.5h.01",
    };
    const grid = mk("div", `flex:1;display:grid;grid-template-columns:repeat(${stack ? 2 : n}, 1fr);`, inner);
    const vals = ALL.slice(0, n).map(([lab, val, ic], i) => {
      const col = stack ? i % 2 : i, row = stack ? Math.floor(i / 2) : 0, cols = stack ? 2 : n;
      const lastCol = col === cols - 1 || i === n - 1;
      const c = mk("div", `display:flex;flex-direction:column;padding:${U(stack ? 10 : 2)} ${U(16)};${lastCol ? "" : `border-inline-end:1px solid ${ON(10)};`}${stack && row > 0 ? `border-top:1px solid ${ON(10)};` : ""}`, grid);
      mk("span", `font:var(--x-label-weight) ${U(11)} var(--x-label-font);text-transform:uppercase;letter-spacing:${rtl ? 0 : "0.2em"};color:${ON(50)};margin-bottom:${U(4)};white-space:nowrap;`, c, lab);
      const r = mk("div", `display:flex;align-items:center;justify-content:space-between;gap:${U(8)};font-size:${U(16)};`, c);
      const v = mk("span", "white-space:nowrap;min-height:1.3em;", r, "");
      const s = sv("svg", { viewBox: "0 0 24 24", width: "1.1em", height: "1.1em" }, r);
      sv("path", { d: ICON[ic], fill: "none", stroke: ON(55), "stroke-width": 1.6, "stroke-linecap": "round", "stroke-linejoin": "round" }, s);
      return { v, val };
    });
    const cta = mk("div", `display:flex;align-items:center;justify-content:center;gap:${U(10)};padding:${U(15)} ${U(22)};border-radius:calc(var(--x-radius) * 0.7);background:var(--x-accent);color:var(--x-accent-ink);font:600 ${U(12)} var(--x-label-font);text-transform:uppercase;letter-spacing:${rtl ? 0 : "0.2em"};white-space:nowrap;`, inner, rtl && p.cta === "Check availability" ? "تحقّق من التوفّر" : p.cta);
    const ar = sv("svg", { viewBox: "0 0 24 24", width: "1.2em", height: "1.2em" }, cta);
    sv("path", { d: rtl ? "M19 12H5 M11 6l-6 6 6 6" : "M5 12h14 M13 6l6 6-6 6", fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }, ar);

    // fit to the hero's width (and never taller than half of it)
    const pad = Math.min(R.w, R.h) * 0.05;
    const u = Math.min((R.w - pad * 2) / wrap.offsetWidth, (R.h * 0.62) / wrap.offsetHeight);
    wrap.style.setProperty("--u", u.toFixed(4) + "px");

    const a0 = at + 0.2;
    const fillAt = a0 + 0.75, per = Math.max(0.18, Math.min(0.42, (end - 0.5 - fillAt) / n));
    ctx.sfx(a0, "whoosh.soft", 0.35);
    if (p.fill_demo) vals.forEach((_, i) => ctx.sfx(fillAt + i * per, "key", 0.18));
    const p3 = (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), 3);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.22);
        hero.style.opacity = (inEl ? 1 : ML.lin(t, at - 0.1, at + 0.2)) * (1 - leave) + "";
        const e = p3(t, a0, a0 + 1);
        const o = ML.lin(t, a0, a0 + 0.6).toFixed(4);
        rim.style.opacity = o;
        inner.style.opacity = o;
        wrap.style.translate = `0 ${((1 - e) * 30 * u).toFixed(2)}px`;
        vals.forEach(({ v, val }, i) => {
          if (!p.fill_demo) { v.textContent = val; return; }
          const s = ML.typed(val, t, fillAt + i * per, fillAt + i * per + per * 0.85);
          v.textContent = s || "—";
          v.style.opacity = s ? "1" : "0.35";
        });
      },
    };
  },
});

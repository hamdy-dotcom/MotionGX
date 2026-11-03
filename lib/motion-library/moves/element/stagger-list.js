// List rows and chips stagger in: the rows of a list, or a row of short chips, appear one after another in a quick
// cascade. Rows: show(row, t, at + i × stagger, leave, { dur: 0.3 }) in the look's motion (or the motion asked for).
// Chips: opacity 0, y 30, scale 0.8 → 1 over 0.45 s back.out(2), 0.12 s apart (or each on its spoken word). They leave
// together, in reverse, or not at all. Guidance for `stagger`: 40–90 ms per element; cards 0.06–0.1 s, words
// 0.035–0.07 s, lines 0.08–0.14 s. A one-line chip row fits by shrinking its type in 4 % steps (down to 72 %); if it still
// does not fit it wraps at its full size, centred (small and wrapped would be the worst of both) — never past the edge.
// Works on several targets of one slot, on the target's own items (rows of a list, chips of a row), or builds a list.
// Source: MengTo/Skills media/html-explainer-video demo film.js step2 (the style chips: show(c, t, T + i × 0.12, …,
// { dur: 0.3 })) (MIT) + MotionGX lib/live-engine/worker/vendor/recipes.js R.scene chips (fromTo opacity 0, y 30,
// scale 0.8 → 0.45 s back.out(2)) and R.fit (the 4 % / 72 % chip-row fit) (own).
ML.define({
  id: "element.stagger-list",
  category: "element",
  name: "List rows and chips stagger in",
  does: "Rows of a list or a row of short chips appear one after another in a quick cascade, chips with a small pop.",
  says: ["list", "step", "simplicity", "proof"],
  energy: 2,
  targets: ["list", "label", "card"],
  duration: [0.6, 3],
  params: {
    item: { type: "choice", options: ["rows", "chips"], default: "rows" },
    stagger: { type: "number", range: [0.04, 0.5], default: 0.09, unit: "s" },
    motion: { type: "choice", options: ["auto", "rise", "fade", "snap", "pop"], default: "auto" },
    exit: { type: "choice", options: ["together", "reverse", "none"], default: "together" },
    sync: { type: "choice", options: ["stagger", "spoken"], default: "stagger" },
  },
  pairs: ["text-in.punchline", "ui.list-row-highlight", "element.stagger-grid"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "MengTo/Skills:agent-skills/media/html-explainer-video", license: "MIT", note: "film.js step2 chips; R.scene chip pop + R.fit chip-row fit from lib/live-engine/worker/vendor/recipes.js (own); every frame from t" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const k = Math.min(f.W, f.H) / 1080;
    const chips = p.item === "chips";

    // the items: the target's own children, or a built list / chip row in the picture region
    let row = null, items = [];
    const kids = own ? [...own.children].filter((c) => c.getBoundingClientRect().width > 0) : [];
    const many = (ctx.els || []).filter((e) => e !== ctx.stage);
    if (many.length > 1) items = many;
    else if (kids.length > 1) { row = own; items = kids; }
    else {
      const R = f.pic;
      const T = rtl ? ["اختار الخطة", "اكتب رقمك", "أكّد في ثانية", "ابدأ على طول"] : ["Pick a plan", "Add your number", "Confirm in a tap", "Start right away"];
      if (chips) {
        row = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;display:flex;flex-wrap:nowrap;justify-content:center;align-items:center;align-content:center;gap:${22 * k}px;pointer-events:none;z-index:6;`, host);
        items = T.map((x, i) => mk("span", `flex:none;white-space:nowrap;padding:${18 * k}px ${30 * k}px;border-radius:var(--x-radius-s);font:var(--x-body-weight) ${40 * k}px var(--x-body-font);${i === 0 ? "background:var(--x-accent);color:var(--x-accent-ink);" : "background:var(--x-panel);color:var(--x-ink);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);"}`, row, x));
      } else {
        const w = Math.min(R.w, 820 * k);
        row = mk("div", `position:absolute;left:${R.x + (R.w - w) / 2}px;top:${R.y}px;width:${w}px;height:${R.h}px;display:flex;flex-direction:column;justify-content:center;gap:${18 * k}px;pointer-events:none;z-index:6;`, host);
        items = T.map((x, i) => {
          const r = mk("div", `display:flex;align-items:center;gap:${24 * k}px;padding:${26 * k}px ${30 * k}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * 0.7);box-shadow:var(--x-shadow);`, row);
          mk("span", `flex:none;width:${56 * k}px;height:${56 * k}px;border-radius:50%;display:grid;place-items:center;background:${i === 0 ? "var(--x-accent)" : "color-mix(in srgb, var(--x-accent) 14%, transparent)"};color:${i === 0 ? "var(--x-accent-ink)" : "var(--x-accent)"};font:var(--x-head-weight) ${26 * k}px var(--x-head-font);`, r, rtl ? String.fromCharCode(0x0661 + i) : String(i + 1));
          mk("span", `font:var(--x-body-weight) ${40 * k}px var(--x-body-font);color:var(--x-ink);`, r, x);
          return r;
        });
      }
    }

    // one-line chip row: shrink the type 4 % at a time down to 72 %, then wrap to two lines (R.fit)
    if (chips && row) {
      const cs = getComputedStyle(row), gap = parseFloat(cs.columnGap) || parseFloat(cs.gap) || 0;
      const wide = () => items.reduce((a, c) => a + c.offsetWidth, 0) + gap * (items.length - 1) > row.clientWidth + 1;
      const fs0 = items.map((c) => parseFloat(getComputedStyle(c).fontSize));
      let s = 1;
      for (let i = 0; i < 40 && wide() && s > 0.72; i++) { s *= 0.96; items.forEach((c, j) => (c.style.fontSize = (fs0[j] * s).toFixed(1) + "px")); }
      if (wide()) { items.forEach((c, j) => (c.style.fontSize = fs0[j] + "px")); row.style.flexWrap = "wrap"; row.style.rowGap = 14 * k + "px"; row.style.justifyContent = "center"; }
    }

    // times: a steady cascade, or each item on its spoken word
    const times = items.map((c, i) => {
      const base = at + i * p.stagger;
      if (p.sync !== "spoken") return base;
      return Math.max(at, ctx.word((c.textContent || "").trim().split(/\s+/)[0], base));
    });
    for (let i = 1; i < times.length; i++) times[i] = Math.max(times[i], times[i - 1] + 0.04);
    const per = chips ? 0.45 : 0.3;
    times.forEach((t, i) => (i % 2 === 0 || p.stagger >= 0.25) && ctx.sfx(t, chips ? "pop.soft" : "tap", 0.22));
    const lastIn = times[times.length - 1] + per;
    const outGap = p.exit === "reverse" ? Math.min(0.06, p.stagger) : 0;
    const exitAt = p.exit === "none" ? Infinity : Math.max(lastIn + 0.3, end - 0.3 - outGap * (items.length - 1));
    const leaves = items.map((_, i) => (p.exit === "reverse" ? exitAt + (items.length - 1 - i) * outGap : exitAt));
    const kind = p.motion === "auto" ? (chips ? "pop" : null) : p.motion;

    return {
      draw(t) {
        items.forEach((el, i) => {
          const a = times[i], L = leaves[i];
          if (kind !== "pop") { ML.show(el, t, a, L, kind ? { kind, dur: per } : { dur: per }); return; }
          // the chip pop: opacity 0, y 30, scale 0.8 → 1, back.out(2), 0.45 s; leaving drops back and fades
          if (t < a - 1e-6 || t > L + 0.25) { el.style.visibility = "hidden"; return; }
          el.style.visibility = "visible";
          const u = ML.back(t, a, a + 0.45, 2), q = ML.ease(t, L, L + 0.22);
          el.style.opacity = (Math.min(1, ML.lin(t, a, a + 0.2)) * (1 - q)).toFixed(4);
          el.style.translate = `0 ${((1 - u) * 30 * k + q * 12 * k).toFixed(2)}px`;
          const s = (0.8 + 0.2 * u) * (1 - 0.1 * q);
          el.style.scale = Math.abs(s - 1) < 1e-4 ? "none" : s.toFixed(4);
        });
      },
    };
  },
});

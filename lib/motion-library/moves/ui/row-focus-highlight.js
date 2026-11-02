// List row focus (MengTo's curriculum rows, .les:hover): a list of rows on hairlines (64 px number | title | copy |
// time). The focused row indents from the reading side 0 → 8–18 px over 0.5 s on --ease-out, a warm wash fades in behind
// it (linear-gradient from the accent at `wash` to transparent at 46 %, opacity 0 → 1 over 0.55 s), its number turns the
// accent over 0.4 s and a 1 px accent underline draws across from the reading side (scaleX 0 → 1, 0.7 s --ease-out).
// mode one: a single row takes focus; sequence: each row in turn, the previous letting go. On a list of its own target
// the target's children are the rows; without one it builds the four-column list in the picture region.
// Source: MengTo/Skills web-design/build-threejs-scroll-worlds demo (.les / .les::before / .les .k / .les .bar, MIT).
ML.define({
  id: "ui.row-focus-highlight",
  category: "ui",
  name: "List row focus",
  does: "A list row indents a step, a warm accent wash fades in behind it, its number turns accent and an underline draws across.",
  says: ["list", "focus", "step"],
  energy: 2,
  targets: ["list", "line"],
  duration: [0.6, 4],
  params: {
    wash: { type: "number", range: [0.04, 0.2], default: 0.09 },
    underline: { type: "bool", default: true },
    mode: { type: "choice", options: ["one", "sequence"], default: "one" },
    row: { type: "number", range: [1, 6], default: 2 },
    indent: { type: "number", range: [8, 18], default: 14, unit: "px" },
  },
  pairs: ["ui.cursor-glide-click", "text-in.punchline"],
  avoid: ["energy", "celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/build-threejs-scroll-worlds", license: "MIT", note: "demo/index.html curriculum rows (.les hover state)" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const px = (v) => (v * k).toFixed(1) + "px";
    const easeOut = ML.bezier(0.16, 1, 0.3, 1);

    // the rows: the target's children, else a list of our own
    let rows = [], built = null;
    const tgt = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    if (tgt && tgt.children.length >= 2) {
      rows = [...tgt.children].map((r) => ({ r, num: null }));
    } else {
      const R = f.pic, w = Math.min(R.w, 1400 * k);
      const narrow = w < 1100 * k;
      const data = rtl
        ? [["01", "البداية", "اعرف إيه المهم فعلاً", "٢ د"], ["02", "التخطيط", "رتّب الخطوات بالترتيب", "٤ د"], ["03", "التنفيذ", "اشتغل على أول نسخة", "٦ د"], ["04", "المراجعة", "شوف النتيجة وعدّل", "٣ د"]]
        : [["01", "Discover", "Find what really matters", "2 min"], ["02", "Plan", "Put the steps in order", "4 min"], ["03", "Build", "Ship the first version", "6 min"], ["04", "Review", "Check the result, adjust", "3 min"]];
      built = mk("div", `position:absolute;left:${(R.x + (R.w - w) / 2).toFixed(1)}px;top:0;width:${w.toFixed(1)}px;border-top:1px solid var(--x-line);color:var(--x-ink);z-index:5;direction:${rtl ? "rtl" : "ltr"};`, ctx.scene || ctx.stage);
      rows = data.map(([n, title, copy, time]) => {
        const r = mk("div", `position:relative;display:grid;align-items:center;grid-template-columns:${px(64)} minmax(0,1.05fr) ${narrow ? "" : "minmax(0,1.25fr) "}${px(110)};gap:${px(28)};padding:${px(34)} 0;border-bottom:1px solid var(--x-line);`, built);
        const num = mk("div", `font:var(--x-label-weight) ${px(22)} var(--x-mono-font);letter-spacing:0.16em;color:var(--x-dim);font-variant-numeric:tabular-nums;`, r, n);
        mk("div", `font:var(--x-head-weight) ${px(40)}/1.15 var(--x-head-font);`, r, title);
        if (!narrow) mk("div", `font:var(--x-body-weight) ${px(26)}/1.5 var(--x-body-font);color:var(--x-dim);`, r, copy);
        mk("div", `text-align:end;font:500 ${px(22)} var(--x-mono-font);letter-spacing:0.14em;color:var(--x-dim);`, r, time);
        return { r, num };
      });
      built.style.top = (R.y + Math.max(0, (R.h - built.offsetHeight) / 2)).toFixed(1) + "px";
    }
    // each row gets its wash and its underline; its own padding is where the indent grows from
    for (const o of rows) {
      const cs = getComputedStyle(o.r);
      if (cs.position === "static") o.r.style.position = "relative";
      o.pad = parseFloat(rtl ? cs.paddingRight : cs.paddingLeft) || 0;
      o.wash = mk("div", `position:absolute;inset:0;pointer-events:none;opacity:0;border-radius:inherit;background:linear-gradient(${rtl ? 270 : 90}deg, color-mix(in srgb, var(--x-accent) ${(p.wash * 100).toFixed(1)}%, transparent), transparent 46%);`, o.r);
      o.r.prepend(o.wash);
      o.bar = p.underline ? mk("div", `position:absolute;left:0;right:0;bottom:-1px;height:${Math.max(1, k).toFixed(1)}px;background:var(--x-accent);transform-origin:${rtl ? "100%" : "0"} 50%;transform:scaleX(0);pointer-events:none;`, o.r) : null;
      [...o.r.children].forEach((c) => { if (c !== o.wash && c !== o.bar && getComputedStyle(c).position === "static") c.style.position = "relative"; });
    }

    // focus windows: [on, off] per row
    const n = rows.length, t0 = at + (built ? 0.45 : 0.1);
    const spans = rows.map(() => null);
    if (p.mode === "sequence") {
      const each = Math.max(0.5, (end - 0.3 - t0) / n);
      rows.forEach((_, i) => (spans[i] = [t0 + i * each, i < n - 1 ? t0 + (i + 1) * each : Infinity]));
    } else {
      const i = Math.round(ML.clamp(p.row, 1, n)) - 1;
      spans[i] = [t0, Infinity];
    }
    spans.forEach((s) => s && ctx.sfx(s[0], "tap", 0.18));
    // a state that eases in at `on` and back out at `off` over d seconds
    const st = (t, s, d, curve) => (s ? curve(ML.lin(t, s[0], s[0] + d)) * (1 - curve(ML.lin(t, s[1], s[1] + d))) : 0);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        if (built) { const u = ML.out(t, at, at + 0.4); built.style.opacity = (t < at ? 0 : u * (1 - leave)).toFixed(4); built.style.translate = `0 ${((1 - u) * 20 * k).toFixed(2)}px`; }
        rows.forEach((o, i) => {
          const s = spans[i];
          const ind = st(t, s, 0.5, easeOut), wa = st(t, s, 0.55, (x) => ML.ease(x, 0, 1)), nu = st(t, s, 0.4, (x) => x), ba = st(t, s, 0.7, easeOut);
          o.r.style[rtl ? "paddingRight" : "paddingLeft"] = ind > 0 ? (o.pad + ind * p.indent * k * 1.4).toFixed(2) + "px" : "";
          o.wash.style.opacity = wa.toFixed(4);
          if (o.bar) o.bar.style.transform = `scaleX(${ba.toFixed(4)})`;
          if (o.num) o.num.style.color = nu > 0 ? `color-mix(in srgb, var(--x-accent) ${(nu * 100).toFixed(1)}%, var(--x-dim))` : "var(--x-dim)";
        });
      },
    };
  },
});

// Asymmetric metric index (editorial portfolio chapters): big metrics land on irregular beats at irregular places and
// sizes (1,247 big at the top's reading start; 43 smaller mid-way across …). Per entry: a hairline rule grows from the
// reading-start side (scaleX 0 → 1, 0.5 s power2.inOut); the condensed-caps numeral rises out of a mask (0.5 s) and
// counts 0 → value (1.2 s power3.out) with its separators every frame and the exact written value at the end; a mono
// label (tracking .3em) rise-fades at +0.2 s and a muted note at +0.35 s. The next entry ~0.9 s later; the index
// drifts up a little as entries arrive. Values, labels and notes are params (the director passes the real ones);
// with none, the target's own number leads and the rest are sample figures.
// Source: MengTo/Skills web-design/editorial-portfolio-chapters/ARTICLE.md (MIT): our code from the article's spec.
ML.define({
  id: "data.metric-scatter",
  category: "data",
  name: "Asymmetric metric index",
  does: "Big metrics appear at different scales and positions: a rule draws, the numeral unmasks and counts up, then its label and note resolve.",
  says: ["proof", "scale", "growth", "result"],
  energy: 3,
  targets: ["number", "label"],
  duration: [2, 6],
  params: {
    entries: { type: "number", range: [2, 5], default: 3 },
    count_duration: { type: "number", range: [0.8, 1.6], default: 1.2, unit: "s" },
    gap: { type: "number", range: [0.6, 1.2], default: 0.9, unit: "s" },
    values: { type: "text", default: "" },
    labels: { type: "text", default: "" },
    notes: { type: "text", default: "" },
  },
  pairs: ["data.odometer", "data.multiplier-tag"],
  avoid: ["playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/editorial-portfolio-chapters/ARTICLE.md", license: "MIT", note: "our own code from the article's motion spec" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const mk = (tag, css, text, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const AR = "٠١٢٣٤٥٦٧٨٩";
    const latin = (s) => String(s).replace(/[٠-٩]/g, (d) => String(AR.indexOf(d))).replace(/٬/g, ",").replace(/٫/g, ".");
    /** "$1,247.5M" → { pre: "$", v: 1247.5, dec: 1, sep: true, post: "M", text } */
    const parse = (s) => {
      const raw = String(s).trim(), m = latin(raw).match(/^([^\d]*?)([\d][\d,]*(?:\.\d+)?)(.*)$/);
      if (!m) return null;
      const num = m[2].replace(/,/g, ""), dec = (num.split(".")[1] || "").length;
      return { pre: m[1], v: parseFloat(num), dec, sep: m[2].includes(",") || parseFloat(num) >= 10000, post: m[3], text: raw, arabic: /[٠-٩]/.test(raw) };
    };
    const fmt = (x, e) => {
      let s = e.dec ? x.toFixed(e.dec) : String(Math.round(x));
      if (e.sep) { const [i, d] = s.split("."); s = i.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (d ? "." + d : ""); }
      if (e.arabic) s = s.replace(/\d/g, (d) => AR[d]).replace(/,/g, "٬").replace(/\./g, "٫");
      return e.pre + s + e.post;
    };
    const n = Math.round(ML.clamp(p.entries, 2, 5));
    const list = (s, sep) => String(s || "").split(sep).map((x) => x.trim()).filter(Boolean);
    const sample = rtl
      ? { v: ["1,247", "43", "98%", "12", "3.6M"], l: ["فريق شغّال", "دولة", "رضا العملاء", "سنة خبرة", "عملية"], n: ["من أول يوم", "في ٤ قارات", "على آخر ١٠٠٠ طلب", "من غير توقّف", "في الشهر"] }
      : { v: ["1,247", "43", "98%", "12", "3.6M"], l: ["Teams onboard", "Countries", "Satisfaction", "Years running", "Transactions"], n: ["since day one", "across 4 continents", "last 1,000 orders", "without a pause", "every month"] };
    const vals = list(p.values, ","), labs = list(p.labels, "|"), notes = list(p.notes, "|");
    const own = el && parse(el.textContent);
    const entries = Array.from({ length: n }, (_, i) => {
      const v = parse(vals[i] ?? (i === 0 && own ? own.text : sample.v[i])) || parse(sample.v[i]);
      return { e: v, label: labs[i] ?? sample.l[i], note: notes[i] ?? sample.n[i] };
    });
    // the index covers the picture region (a stat layout of its own); the target's own number becomes entry one
    const host = mk("div", "position:absolute;left:var(--pic-x);top:var(--pic-y);width:var(--pic-w);height:var(--pic-h);z-index:4;background:var(--x-ground);overflow:hidden", null, ctx.scene || ctx.stage);
    const inner = mk("div", "position:absolute;inset:0", null, host);
    const HW = host.clientWidth, HH = host.clientHeight;
    // irregular slots: [x share, y share, size share], mirrored for Arabic (anchored at the right)
    const SLOTS = f.wide
      ? [[0.0, 0.04, 1], [0.56, 0.3, 0.58], [0.16, 0.6, 0.72], [0.66, 0.7, 0.5], [0.4, 0.06, 0.44]]
      : [[0.0, 0.02, 1], [0.42, 0.27, 0.6], [0.06, 0.49, 0.74], [0.5, 0.72, 0.52], [0.02, 0.8, 0.46]];
    const base = Math.min(HW * (f.wide ? 0.17 : 0.32), HH * 0.2);
    const ySpread = n <= 3 ? 1.35 : 1; // fewer entries spread further down the region
    const items = entries.map((en, i) => {
      const [sx, sy0, ss] = SLOTS[i], sy = sy0 * ySpread, size = base * ss;
      const box = mk("div", `position:absolute;top:${(sy * HH).toFixed(1)}px;${rtl ? "right" : "left"}:${(sx * HW).toFixed(1)}px;display:grid;gap:${(size * 0.08).toFixed(1)}px;text-align:start`, null, inner);
      const rule = mk("div", `height:max(1px, calc(var(--x-edge) * ${(size / 120).toFixed(2)}));background:var(--x-ink);transform-origin:${rtl ? "right" : "left"} center`, null, box);
      const mask = mk("div", "overflow:hidden;line-height:1", null, box);
      const num = mk("div", `font:var(--x-head-weight) ${size.toFixed(1)}px/1 var(--x-head-font);letter-spacing:var(--x-hero-track);text-transform:uppercase;font-variant-numeric:tabular-nums lining-nums;font-stretch:condensed;color:var(--x-ink);white-space:nowrap;direction:ltr;unicode-bidi:isolate;padding-block:0.06em`, en.e.text, mask);
      if (rtl) num.style.textAlign = "right";
      const lab = mk("div", `font:var(--x-label-weight) ${Math.max(16, size * 0.13).toFixed(1)}px var(--x-label-font);letter-spacing:${rtl ? "0" : "0.3em"};text-transform:var(--x-label-case);color:var(--x-ink);white-space:nowrap`, en.label, box);
      const note = mk("div", `font:var(--x-body-weight) ${Math.max(18, size * 0.16).toFixed(1)}px/1.3 var(--x-body-font);color:var(--x-dim);white-space:nowrap`, en.note, box);
      // the numeral's box is set to its final width so counting never shifts the layout
      const w = num.getBoundingClientRect().width / ((ctx.stage.getBoundingClientRect().width / ctx.stage.offsetWidth) || 1);
      mask.style.width = Math.ceil(w + 2) + "px";
      return { ...en, box, rule, num, lab, note, T: at + i * p.gap };
    });
    // keep every entry on the region: pull a box back in if a long label runs past the edge
    for (const it of items) {
      const r = it.box.offsetWidth, x = rtl ? HW - it.box.offsetLeft - r : it.box.offsetLeft;
      if (x + r > HW) it.box.style[rtl ? "right" : "left"] = Math.max(0, HW - r) + "px";
    }
    items.forEach((it) => ctx.sfx(it.T + 0.2, "tap", 0.3));
    const p4out = (x) => 1 - Math.pow(1 - x, 4);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        host.style.opacity = (t >= at - 1e-6 ? 1 - leave : 0).toFixed(4);
        const shown = items.reduce((s, it) => s + ML.ease(t, it.T, it.T + 0.6), 0);
        inner.style.translate = `0 ${(-Math.max(0, shown - 1) * HH * 0.012).toFixed(2)}px`;
        for (const it of items) {
          const T = it.T;
          it.rule.style.transform = `scaleX(${ML.ease(t, T, T + 0.5).toFixed(4)})`;
          const rise = ML.land(t, T + 0.2, T + 0.7);
          it.num.style.transform = `translateY(${((1 - rise) * 105).toFixed(2)}%)`;
          const c = ML.lin(t, T + 0.2, T + 0.2 + p.count_duration);
          it.num.textContent = c >= 1 ? it.e.text : fmt(it.e.v * p4out(c), it.e);
          const l = ML.expo(t, T + 0.4, T + 0.8), q = ML.expo(t, T + 0.55, T + 0.95);
          it.lab.style.opacity = l.toFixed(4); it.lab.style.translate = `0 ${((1 - l) * 10).toFixed(2)}px`;
          it.note.style.opacity = q.toFixed(4); it.note.style.translate = `0 ${((1 - q) * 10).toFixed(2)}px`;
        }
      },
    };
  },
});

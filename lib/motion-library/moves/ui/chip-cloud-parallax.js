// Floating keyword chips in depth layers: 30–100 small pill tags (the panel, semibold text, a tiny mono score badge
// like "KD 29") drift sideways across an accent field in three depth layers — far (0.6 size, 3 px blur, 0.4, 10 px/s),
// mid (0.85, 1 px blur, 0.7, 20 px/s), near (1.1, sharp, full, 35 px/s) — with a slight vertical float, wrapping
// round the field. Then a few near chips are chosen: each eases to a stop, turns dark (the ink, panel text, an accent
// dot) and pops to 1.1 on back.out over 0.25 s, staggered 0.2 s, while the unchosen near chips blur out. A section
// title sits at the top start corner (an italic serif numeral + sans). Chip sizes are set by type size, not scale,
// so nothing is enlarged past its pixels; drift runs toward the start side in RTL when "left".
// Source: prompt-motion "utopyaszx-opus-5-5-medium-make" (reference only: rebuilt as our own code).
ML.define({
  id: "ui.chip-cloud-parallax",
  category: "ui",
  name: "Floating keyword chips in depth layers",
  does: "Dozens of small pill tags with scores drift across a red field in several depth layers — blurry far ones, sharp near ones — and a few get selected.",
  says: ["choice", "precision", "scale", "focus"],
  energy: 3,
  targets: ["list", "label", "stage"],
  duration: [2.5, 6],
  params: {
    chips: { type: "number", range: [30, 100], default: 70 },
    content: { type: "choice", options: ["keywords", "tags", "names"], default: "keywords" },
    selected: { type: "number", range: [1, 8], default: 4 },
    direction: { type: "choice", options: ["left", "right"], default: "left" },
    title: { type: "text", default: "" },
    select_at: { type: "number", range: [0.3, 0.7], default: 0.45 },
  },
  pairs: ["ui.winner-isolate", "camera.push-in"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "prompt-motion:utopyaszx-opus-5-5-medium-make", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { el, p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const target = el && el !== ctx.stage ? el : null;
    // the field: the whole stage for a stage target, else the picture region as a rounded field
    const full = !target;
    const R = full ? { x: 0, y: 0, w: f.W, h: f.H } : f.pic;
    const field = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;overflow:hidden;background:var(--x-accent);z-index:6;pointer-events:none;${full ? "" : "border-radius:var(--x-radius);box-shadow:var(--x-shadow);"}`, ctx.scene || ctx.stage);
    field.dir = rtl ? "rtl" : "ltr";
    // the words: the target's own items lead (they are the ones chosen), the rest from a pool
    const own = target ? (target.children.length >= 2 ? [...target.children].map((c) => c.textContent.trim()) : [target.textContent.trim()]).filter(Boolean) : [];
    if (target) target.style.visibility = "hidden";
    const POOL = {
      keywords: rtl ? ["تقسيط", "بدون فوايد", "دفع آمن", "خطة شهرية", "موبايل", "لابتوب", "قسط أول", "توصيل", "عروض", "كاش باك", "تمويل", "سداد", "محفظة", "فيزا", "أونلاين", "تخفيض", "رصيد", "حساب", "أقساط", "ضمان"] : ["buy now pay later", "no interest", "split pay", "monthly plan", "phone deals", "laptop finance", "first payment", "free delivery", "cashback", "instalments", "safe checkout", "credit limit", "pay in 4", "wallet", "student offer", "trade-in", "low deposit", "zero fees", "flex pay", "big sale"],
      tags: rtl ? ["#تقنية", "#تسوق", "#عروض", "#موضة", "#بيت", "#سفر", "#ألعاب", "#صحة", "#أكل", "#رياضة", "#كتب", "#جمال"] : ["#tech", "#shopping", "#deals", "#fashion", "#home", "#travel", "#gaming", "#health", "#food", "#sport", "#books", "#beauty"],
      names: rtl ? ["سارة", "عمر", "ليلى", "يوسف", "نور", "مريم", "كريم", "هنا", "آدم", "سلمى", "زياد", "فرح"] : ["Sara", "Omar", "Leila", "Yusuf", "Nour", "Maryam", "Karim", "Hana", "Adam", "Salma", "Ziad", "Farah"],
    }[p.content] || [];
    const N = Math.round(ML.clamp(p.chips, 30, 100));
    const base = 30 * k;
    // the three depth layers (sizes by type, never by scale)
    const LAYERS = [
      { size: 0.6, blur: 3, o: 0.4, v: 10 },
      { size: 0.85, blur: 1, o: 0.7, v: 20 },
      { size: 1.1, blur: 0, o: 1, v: 35 },
    ];
    const dir = (p.direction === "right" ? 1 : -1) * (rtl ? -1 : 1);
    const pxs = 2.2 * k; // the reference's px/s on a web page → film px
    const badge = (i) => (p.content === "keywords" ? `KD ${10 + Math.floor(ML.rnd(i, 3) * 80)}` : p.content === "tags" ? `${(1 + ML.rnd(i, 4) * 9).toFixed(1)}k` : "");
    const chips = [];
    // far first so near ones paint on top; own words go to the near layer
    const order = Array.from({ length: N }, (_, i) => i).map((i) => ({ i, layer: i < own.length ? 2 : Math.floor(ML.rnd(i, 1) * 3) })).sort((a, b) => a.layer - b.layer);
    for (const { i, layer } of order) {
      const L = LAYERS[layer];
      const fs = base * L.size;
      const c = mk("div", `position:absolute;left:0;top:0;display:flex;align-items:center;gap:${(fs * 0.45).toFixed(1)}px;padding:${(fs * 0.42).toFixed(1)}px ${(fs * 0.75).toFixed(1)}px;border-radius:var(--x-radius-s);background:var(--x-panel);color:var(--x-ink);font:600 ${fs.toFixed(1)}px/1 var(--x-body-font);white-space:nowrap;box-shadow:0 ${(4 * k).toFixed(1)}px ${(14 * k).toFixed(1)}px color-mix(in srgb, var(--x-ink) 18%, transparent);will-change:transform`, field);
      const dot = mk("span", `display:none;width:${(fs * 0.36).toFixed(1)}px;height:${(fs * 0.36).toFixed(1)}px;border-radius:50%;background:var(--x-accent)`, c);
      mk("span", "", c, i < own.length ? own[i] : POOL[i % POOL.length]);
      const b = badge(i);
      let bEl = null;
      if (b) bEl = mk("span", `font:600 ${(fs * 0.62).toFixed(1)}px/1 var(--x-mono-font);padding:${(fs * 0.18).toFixed(1)}px ${(fs * 0.3).toFixed(1)}px;border-radius:${(fs * 0.25).toFixed(1)}px;background:var(--x-panel-2);color:var(--x-dim)`, c, b);
      chips.push({ c, dot, bEl, i, layer, L, own: i < own.length, x0: ML.rnd(i, 2), y0: ML.rnd(i, 5), ph: ML.rnd(i, 6) * Math.PI * 2 });
    }
    chips.forEach((ch) => { ch.w = ch.c.offsetWidth; ch.h = ch.c.offsetHeight; });
    // the section title
    const tFs = Math.max(28, 46 * k);
    const titleBox = mk("div", `position:absolute;top:${(full ? f.safe.y : 36 * k).toFixed(1)}px;inset-inline-start:${(full ? f.m : 40 * k).toFixed(1)}px;display:flex;align-items:baseline;gap:${(14 * k).toFixed(1)}px;color:var(--x-accent-ink);z-index:2;max-width:80%`, field);
    mk("span", `font:italic 400 ${(tFs * 1.25).toFixed(1)}px/1 var(--x-serif-font)`, titleBox, rtl ? "٠١" : "01");
    mk("span", `font:600 ${tFs.toFixed(1)}px/1.15 var(--x-head-font)`, titleBox, p.title || (rtl ? "لاقي الكلمات اللي تكسب بيها" : "Find keywords you can win"));
    // positions: x wraps round the field (plus the chip's width), a slight float on y
    const span = (ch) => R.w + ch.w + 40 * k;
    const yBand = (ch) => R.h * 0.16 + ch.y0 * (R.h * 0.8 - ch.h);
    const tSel0 = at + (end - at) * p.select_at;
    const tau = (t, ts) => (t <= ts ? t - at : ts - at + 0.3 * (1 - Math.exp(-(t - ts) / 0.3))); // drift easing to a stop
    const xAt = (ch, tt) => { const s = span(ch); let x = ch.x0 * s + dir * ch.L.v * pxs * tt; x = ((x % s) + s) % s; return x - ch.w - 20 * k; };
    // the target's own words are placed so they sit well inside the field, spread out, when the choosing comes
    const ownCh = chips.filter((ch) => ch.own);
    ownCh.forEach((ch, j) => {
      const n = ownCh.length, sp = span(ch);
      const want = R.w * 0.12 + (R.w * 0.76 - ch.w) * (n > 1 ? j / (n - 1) : 0.5) * (rtl ? -1 : 1) + (rtl ? R.w * 0.76 - ch.w : 0);
      const raw = want + ch.w + 20 * k - dir * ch.L.v * pxs * (tSel0 + j * 0.2 - at);
      ch.x0 = (((raw % sp) + sp) % sp) / sp;
      ch.y0 = 0.1 + 0.8 * ((j + 0.5) / n);
    });
    // choose: own words first, then near chips sitting well inside the field at the choosing moment
    const want = Math.round(ML.clamp(p.selected, 1, 8));
    const near = chips.filter((ch) => ch.layer === 2);
    const inView = (ch) => { const x = xAt(ch, tSel0 - at); return x > R.w * 0.08 && x + ch.w < R.w * 0.92; };
    const picked = [...near.filter((ch) => ch.own), ...near.filter((ch) => !ch.own && inView(ch)).sort((a, b) => a.y0 - b.y0)];
    const chosen = [];
    for (const ch of picked) { if (chosen.length >= want) break; if (chosen.every((o) => Math.abs(yBand(o) - yBand(ch)) > ch.h * 1.1 || Math.abs(xAt(o, tSel0 - at) - xAt(ch, tSel0 - at)) > ch.w)) chosen.push(ch); }
    chosen.forEach((ch, j) => { ch.ts = tSel0 + j * 0.2; ch.c.style.zIndex = "3"; ch.dot.style.display = "block"; });
    chosen.forEach((ch) => ctx.sfx(ch.ts, "pop.soft", 0.35));
    const backOut = (u) => { const c = 1.70158, x = u - 1; return u >= 1 ? 1 : 1 + (c + 1) * x * x * x + c * x * x; };
    return {
      draw(t) {
        const vis = ML.out(t, at - 0.1, at + 0.35) * (1 - ML.clamp((t - (end - 0.3)) / 0.25));
        field.style.opacity = vis.toFixed(4);
        const anyOn = t >= tSel0;
        chips.forEach((ch) => {
          const tt = ch.ts != null ? tau(t, ch.ts) : t - at;
          const x = xAt(ch, tt);
          const y = yBand(ch) + Math.sin((t - at) * 0.9 + ch.ph) * 6 * k * ch.L.size;
          let blur = ch.L.blur, o = ch.L.o, sc = 1;
          if (ch.ts != null) {
            const u = ML.clamp((t - ch.ts) / 0.25), on = t >= ch.ts;
            sc = on ? 1 + 0.1 * backOut(u) : 1;
            ch.c.style.background = on ? "var(--x-ink)" : "var(--x-panel)";
            ch.c.style.color = on ? "var(--x-panel)" : "var(--x-ink)";
            ch.dot.style.opacity = on ? u.toFixed(4) : "0";
            if (ch.bEl) { ch.bEl.style.background = on ? "color-mix(in srgb, var(--x-panel) 16%, transparent)" : "var(--x-panel-2)"; ch.bEl.style.color = on ? "var(--x-panel)" : "var(--x-dim)"; }
          } else if (ch.layer === 2 && anyOn) {
            // the unchosen near chips blur out
            const u = ML.ease(t, tSel0, tSel0 + 0.5);
            blur = 4 * u; o = 1 - 0.55 * u;
          }
          ch.c.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)${sc !== 1 ? ` scale(${sc.toFixed(4)})` : ""}`;
          ch.c.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
          ch.c.style.opacity = o.toFixed(4);
        });
      },
    };
  },
});

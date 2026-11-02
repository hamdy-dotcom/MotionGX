// Index counter: a zero-padded counter ("01 / 04", "00/12", "07 / 19", "42%") ticks to the next number at each
// chapter, step or filled item. Formats: "01" (padStart 2), "01 / 04" (current bold, " / " + total dim), "00/NN"
// (counts up from 00), fraction (unpadded "7 / 19"), percent (current / total as a percent over a 2 px track).
// Sizes: big — the serif face, tracking −.07em, tabular numerals, the total small and dim beside it on the baseline;
// corner — small mono caps, tracking .16em, tabular, the current bold. Change: a hard swap on the beat, a masked roll
// (old y 0 → −100%, new 100% → 0 in 0.32 s power3.inOut) or a slide-up (new from +10 px in 0.12 s power2.out).
// Steps land on the spoken words after `at` when the voice has enough of them, else evenly through the run. An
// optional continuous readout rides beside it: (p · 360).toFixed(1) + "°" or a percent over a 2 px track.
// Sources: MengTo/Skills web-design/scroll-progress-timeline + scroll-world-storytelling video demo (MIT);
// prompt-motion "quickdesignio-opus-5-5-this-entire" (reference only).
ML.define({
  id: "data.index-counter",
  category: "data",
  name: "Index counter 01 / 04",
  does: "A zero-padded counter ('01 / 06', '00/12') ticks to the next number at each chapter, step or filled item.",
  says: ["step", "precision", "time", "proof"],
  energy: 1,
  targets: ["number", "label"],
  duration: [0.5, 10],
  params: {
    format: { type: "choice", options: ["01", "01 / 04", "00/NN", "fraction", "percent"], default: "01 / 04" },
    change: { type: "choice", options: ["swap", "roll", "slide"], default: "roll" },
    size: { type: "choice", options: ["corner", "big"], default: "corner" },
    total: { type: "number", range: [2, 30], default: 4 },
    extra_readout: { type: "choice", options: ["none", "degrees", "percent"], default: "none" },
    sync: { type: "choice", options: ["even", "spoken"], default: "even" },
    label: { type: "text", default: "" },
  },
  pairs: ["data.timecode-hud", "data.readout-swap"],
  avoid: ["celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/scroll-progress-timeline/demo/index.html", license: "MIT", note: "+ scroll-world-storytelling demo/video; prompt-motion quickdesignio-opus-5-5-this-entire (reference)" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const mk = (tag, css, parent, text) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const u = Math.min(f.W, f.H) / 1080;
    const total = Math.round(ML.clamp(p.total, 2, 30));
    const fromZero = p.format === "00/NN";
    const first = fromZero ? 0 : 1;
    const pad = (n) => String(n).padStart(2, "0");
    const big = p.size === "big";
    // the host: the target in place, else a corner of the safe area
    let host;
    if (el) { el.textContent = ""; host = el; }
    else host = mk("div", `position:absolute;top:${f.safe.y + 32 * u}px;${rtl ? "right" : "left"}:${f.m + 32 * u}px;z-index:20`, ctx.scene || stage);
    const own = el ? parseFloat(getComputedStyle(el).fontSize) || 40 : 40;
    const fsBig = Math.max(own, Math.min(f.W, f.H) * 0.15), fsCorner = 28 * u;
    const fs = big ? fsBig : fsCorner;
    const wrap = mk("div", `display:inline-flex;flex-direction:column;gap:${(10 * u).toFixed(1)}px;align-items:${rtl ? "flex-end" : "flex-start"};visibility:hidden`, host);
    if (p.label) mk("div", `font:var(--x-label-weight) ${(big ? 20 : 18) * u}px var(--x-label-font);letter-spacing:var(--x-label-track);text-transform:var(--x-label-case);color:var(--x-dim)`, wrap, p.label);
    const row = mk("div", `display:flex;align-items:${big ? "flex-end" : "baseline"};direction:ltr;unicode-bidi:isolate;gap:${big ? (12 * u).toFixed(1) : 0}px;color:var(--x-ink);font-variant-numeric:tabular-nums lining-nums;${big ? `font:400 ${fs.toFixed(1)}px/0.9 var(--x-serif-font);letter-spacing:-0.07em` : `font:500 ${fs.toFixed(1)}px/1.2 var(--x-mono-font);letter-spacing:.16em;text-transform:uppercase`}`, wrap);
    // the current number: a mask holding the outgoing and incoming values
    const mask = mk("span", `position:relative;display:inline-block;overflow:hidden;line-height:1.05;${big ? "" : "font-weight:700;"}padding:0 .02em`, row);
    const sizer = mk("span", "visibility:hidden;display:inline-block", mask);
    const oldV = mk("span", "position:absolute;left:0;top:0", mask);
    const newV = mk("span", "position:absolute;left:0;top:0", mask);
    const fmt = (n) => {
      if (p.format === "percent") return Math.round((n / total) * 100) + "%";
      if (p.format === "fraction") return String(n);
      return pad(n);
    };
    sizer.textContent = p.format === "percent" ? "100%" : p.format === "fraction" ? String(total).replace(/\d/g, "0") : pad(Math.max(total, 10)).replace(/\d/g, "0");
    let tot = null;
    if (p.format === "01 / 04" || p.format === "fraction") tot = mk("span", big ? `font:400 ${(fs * 0.2).toFixed(1)}px/1 var(--x-mono-font);letter-spacing:.08em;color:var(--x-dim);margin-bottom:${(fs * 0.12).toFixed(1)}px` : "color:var(--x-dim);white-space:pre", row, big ? `/ ${p.format === "fraction" ? total : pad(total)}` : ` / ${p.format === "fraction" ? total : pad(total)}`);
    else if (p.format === "00/NN") tot = mk("span", big ? `font:400 ${(fs * 0.2).toFixed(1)}px/1 var(--x-mono-font);color:var(--x-dim);margin-bottom:${(fs * 0.12).toFixed(1)}px` : "color:var(--x-dim)", row, `/${pad(total)}`);
    // the percent track and the continuous readout
    let track = null, fill = null;
    if (p.format === "percent" || p.extra_readout === "percent") {
      track = mk("div", `position:relative;width:${(big ? fs * 2.4 : 220 * u).toFixed(1)}px;height:2px;background:var(--x-line);overflow:hidden`, wrap);
      fill = mk("i", `position:absolute;top:0;bottom:0;${rtl ? "right" : "left"}:0;width:0;background:var(--x-accent)`, track);
    }
    const extra = p.extra_readout !== "none" ? mk("div", `font:500 ${(18 * u).toFixed(1)}px var(--x-mono-font);font-variant-numeric:tabular-nums;letter-spacing:.08em;color:var(--x-dim);direction:ltr`, wrap) : null;
    // when each step lands
    const n = total - first; // the number of changes
    const t0 = at + 0.25, t1 = Math.max(t0 + 0.2, end - 0.5);
    let times = Array.from({ length: n }, (_, i) => t0 + ((i + 1) * (t1 - t0)) / (n + 0.5));
    if (p.sync === "spoken") {
      const ws = (ctx.words || []).filter((w) => w.t > at + 0.1 && w.t < end - 0.3);
      if (ws.length >= n) times = Array.from({ length: n }, (_, i) => ws[Math.floor(((i + 1) * ws.length) / (n + 1))].t);
    }
    times.forEach((t, i) => (n <= 8 || i % 2 === 0) && ctx.sfx(t, "tap", 0.2));
    const dur = p.change === "roll" ? 0.32 : 0.12;
    const p3io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const p2o = (x) => 1 - (1 - x) * (1 - x);
    return {
      draw(t) {
        if (t < at - 1e-6) { wrap.style.visibility = "hidden"; return; }
        wrap.style.visibility = "visible";
        const leave = ML.clamp((t - (end - 0.25)) / 0.2), e = ML.out(t, at, at + 0.3);
        wrap.style.opacity = (e * (1 - leave)).toFixed(4);
        let k = 0; for (let i = 0; i < times.length; i++) if (t >= times[i]) k = i + 1;
        const cur = first + k, prev = Math.max(first, cur - 1);
        const x = k === 0 ? 1 : ML.lin(t, times[k - 1], times[k - 1] + dur);
        const a = fmt(prev), b = fmt(cur);
        if (newV.textContent !== b) newV.textContent = b;
        if (oldV.textContent !== a) oldV.textContent = a;
        if (p.change === "swap" || k === 0 || x >= 1) {
          oldV.style.display = "none"; newV.style.translate = "none"; newV.style.opacity = "1";
        } else if (p.change === "roll") {
          const q = p3io(x);
          oldV.style.display = "block"; oldV.style.translate = `0 ${(-100 * q).toFixed(2)}%`; oldV.style.opacity = "1";
          newV.style.translate = `0 ${(100 * (1 - q)).toFixed(2)}%`; newV.style.opacity = "1";
        } else {
          const q = p2o(x);
          oldV.style.display = "none";
          newV.style.translate = `0 ${((1 - q) * 10 * u * (big ? 2 : 1)).toFixed(2)}px`; newV.style.opacity = q.toFixed(4);
        }
        const prog = ML.lin(t, at, end - 0.3);
        if (fill) fill.style.width = `${((p.format === "percent" ? (cur / total) : prog) * 100).toFixed(2)}%`;
        if (extra) {
          const txt = p.extra_readout === "degrees" ? (prog * 360).toFixed(1).padStart(5, "0") + "°" : (prog * 100).toFixed(0).padStart(3, "0") + "%";
          if (extra.textContent !== txt) extra.textContent = txt;
        }
        if (tot) tot.style.opacity = "1";
      },
    };
  },
});

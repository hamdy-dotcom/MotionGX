// Ruler playhead drops event markers: a thin ruler (1 px on a 360 px reference, ink at 30%) runs under the action
// across ~80% of the width, ticks every 20 px (10 units; every 5th taller and numbered in mono 8 px). A playhead (a
// 1 px vertical with a small flag head, in --x-bad unless `colour` is set) moves across linearly, x = t / T · width;
// at every event it passes a marker pops below the ruler — a 5 px accent dot or a 6 px ink keyframe diamond — scale
// 0 → 1 in 0.15 s on back-out. Events: explicit seconds (`times`), the spoken words in the move's span (`on_words`), or
// an even seeded spread. A running timecode sits at the ruler's end. In Arabic the ruler runs right to left.
// Source: prompt-motion leonkohli-opus-5-5-is-crazy + levabashidze-i-made-this-15 (reference only: rebuilt as our own code).
ML.define({
  id: "data.timeline-playhead-markers",
  category: "data",
  name: "Ruler playhead drops event markers",
  does: "A ruler runs under the action; a red playhead moves across and a marker (dot or keyframe diamond) pops wherever an event happens.",
  says: ["time", "precision", "tech", "step"],
  energy: 2,
  targets: ["chart", "stage"],
  duration: [1.5, 8],
  params: {
    marker: { type: "choice", options: ["dot", "diamond"], default: "diamond" },
    numbers: { type: "bool", default: true },
    colour: { type: "text", default: "var(--x-bad)" },
    timecode: { type: "bool", default: true },
    events: { type: "number", range: [2, 12], default: 5 },
    times: { type: "text", default: "" },
    on_words: { type: "bool", default: false },
    head: { type: "choice", options: ["flag", "block"], default: "flag" },
  },
  pairs: ["data.timecode-hud", "data.timeline-lanes-build"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:leonkohli-opus-5-5-is-crazy", license: "reference", note: "with prompt-motion:levabashidze-i-made-this-15; our own rebuild of the technique" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const NS = "http://www.w3.org/2000/svg";
    const S = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.append(e); return e; };
    const R0 = el && el !== stage ? ctx.box(el) : f.safe;
    const R = R0.h < 120 ? f.pic : R0;
    const k = Math.min(f.W, f.H) / 360;
    const L = R.w * 0.8, x0 = R.x + (R.w - L) / 2, y = R.y + R.h * (el === stage || !el ? 0.86 : 0.82);
    const X = (u) => (rtl ? x0 + L - u * L : x0 + u * L); // share of the ruler → stage x, in reading order
    const svg = S("svg", { width: f.W, height: f.H, viewBox: `0 0 ${f.W} ${f.H}` });
    svg.style.cssText = "position:absolute;left:0;top:0;overflow:visible;pointer-events:none;z-index:24;visibility:hidden;will-change:opacity";
    (ctx.scene || stage).append(svg);
    const lw = Math.max(1, k * 0.5);
    const ink30 = "color-mix(in srgb, var(--x-ink) 30%, transparent)";
    S("line", { x1: x0, y1: y, x2: x0 + L, y2: y, style: `stroke:${ink30};stroke-width:${lw}px` }, svg);
    const step = 20 * k, nT = Math.max(5, Math.floor(L / step));
    const fsN = 8 * k;
    for (let i = 0; i <= nT; i++) {
      const big = i % 5 === 0, x = X(i / nT);
      S("line", { x1: x, y1: y, x2: x, y2: y - (big ? 5 : 2.5) * k, style: `stroke:${ink30};stroke-width:${lw}px` }, svg);
      if (big && p.numbers) { const tx = S("text", { x, y: y - 7 * k, "text-anchor": "middle", style: `fill:var(--x-dim);font:500 ${fsN.toFixed(1)}px var(--x-mono-font)` }, svg); tx.textContent = String(i * 10); }
    }
    // the events, as shares of the run
    const t0 = at + 0.15, t1 = Math.max(t0 + 0.5, end - 0.35), run = t1 - t0;
    let ev = [];
    if (p.times) ev = String(p.times).split(/[\s,|]+/).map(Number).filter((v) => Number.isFinite(v) && v >= 0).map((v) => v / run);
    else if (p.on_words && ctx.words && ctx.words.length) ev = ctx.words.filter((w) => w.t > t0 && w.t < t1).map((w) => (w.t - t0) / run);
    if (!ev.length) { const n = Math.round(ML.clamp(p.events, 2, 12)); ev = Array.from({ length: n }, (_, i) => (i + 0.5 + (ML.rnd(i, 17) - 0.5) * 0.6) / n); }
    ev = ev.filter((u) => u > 0 && u <= 1).sort((a, b) => a - b);
    const colour = p.colour || "var(--x-bad)";
    const markers = ev.map((u, i) => {
      const g = S("g", {}, svg), cx = X(u), cy = y + 7 * k;
      if (p.marker === "dot") S("circle", { cx: 0, cy: 0, r: 2.5 * k, style: "fill:var(--x-accent)" }, g);
      else S("path", { d: `M0 ${-3 * k} L${3 * k} 0 L0 ${3 * k} L${-3 * k} 0 Z`, style: "fill:var(--x-ink)" }, g);
      ctx.sfx(t0 + u * run, "tap", 0.22);
      return { g, cx, cy, t: t0 + u * run };
    });
    // the playhead: a 1 px line with a flag (or a 10 × 14 block) at its head
    const ph = S("g", {}, svg), hh = Math.min(R.h * 0.22, 40 * k);
    S("line", { x1: 0, y1: -hh, x2: 0, y2: 10 * k, style: `stroke:${colour};stroke-width:${lw}px` }, ph);
    if (p.head === "block") S("rect", { x: -1.67 * k, y: -hh - 2.33 * k, width: 3.33 * k, height: 4.67 * k, style: `fill:${colour}` }, ph);
    else S("path", { d: `M0 ${-hh} h${(rtl ? -1 : 1) * 4.5 * k} l${(rtl ? 1 : -1) * 1.5 * k} ${1.5 * k} l${(rtl ? -1 : 1) * 1.5 * k} ${1.5 * k} h${(rtl ? 1 : -1) * 4.5 * k} Z`, style: `fill:${colour}` }, ph);
    let tc = null;
    if (p.timecode) { tc = S("text", { x: rtl ? x0 : x0 + L, y: y + 18 * k, "text-anchor": rtl ? "start" : "end", style: `fill:var(--x-dim);font:500 ${(fsN * 1.1).toFixed(1)}px var(--x-mono-font);font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate` }, svg); }
    const backOut = (t, a, b) => ML.back(t, a, b, 1.7);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        if (t < at - 1e-6) { svg.style.visibility = "hidden"; return; }
        svg.style.visibility = "visible";
        svg.style.opacity = (ML.lin(t, at, at + 0.2) * (1 - leave)).toFixed(4);
        const u = ML.lin(t, t0, t1);
        ph.setAttribute("transform", `translate(${X(u).toFixed(2)} ${y})`);
        for (const m of markers) {
          const s = t < m.t ? 0 : Math.max(0, backOut(t, m.t, m.t + 0.15));
          m.g.setAttribute("transform", `translate(${m.cx.toFixed(2)} ${m.cy.toFixed(2)}) scale(${s.toFixed(4)})`);
          m.g.style.visibility = s > 0.001 ? "visible" : "hidden";
        }
        if (tc) { const v = Math.max(0, t - t0); tc.textContent = `${String(Math.floor(v)).padStart(2, "0")}:${String(Math.floor((v % 1) * 30)).padStart(2, "0")}`; }
      },
    };
  },
});

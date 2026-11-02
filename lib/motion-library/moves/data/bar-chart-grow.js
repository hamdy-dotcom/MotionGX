// Bar chart grows: bars rise from a baseline, one lit in the accent. Three triggers from three sources —
//  · stagger (MengTo corner-lasers' faux graph): bars with a small gap, rounded tops, heights like 20/30/50/40/70/90/60%,
//    each scaleY 0 → 1 from the bottom (0.5 s power3.out, 0.05 s apart); the accent bar lands last (+0.15 s) with a
//    back.out(1.6) overshoot and its glow (0 0 8 px accent / 50%) fades in over 0.3 s;
//  · per-beat (MengTo scroll-world-storytelling's .bars): equal columns over a 1 px ink baseline, bar heights = value %,
//    each held at scaleY .05 until its beat (index ≤ current beat), then .25 s CSS ease to 1; the current bar takes
//    the accent, earlier ones ink. Beats are the spoken words after `at`, else a steady 0.35 s;
//  · per-eighth (product-film's Product UI opening): bars grow on the glide spring, one musical eighth apart (0.25 s).
// `direction: left-to-right` lays the bars as rows growing from the reading-start side (right in Arabic).
// On a chart the bars fill it; on a card they sit along its lower part; with no target, a panel in the picture region.
// Sources: MengTo/Skills web-design/corner-lasers + scroll-world-storytelling demos (MIT), product-film-skill (MIT).
ML.define({
  id: "data.bar-chart-grow",
  category: "data",
  name: "Bar chart grows",
  does: "A bar chart grows up from its baseline, bar by bar or beat by beat, with one bar lit in the accent colour.",
  says: ["growth", "proof", "focus", "step", "result"],
  energy: 2,
  targets: ["chart", "card"],
  duration: [1.2, 3],
  params: {
    bars: { type: "number", range: [4, 12], default: 7 },
    trigger: { type: "choice", options: ["stagger", "per-beat", "per-eighth"], default: "stagger" },
    highlight: { type: "choice", options: ["one", "current", "all-accent", "none"], default: "one" },
    highlight_index: { type: "number", range: [0, 11], default: 5 },
    stagger: { type: "number", range: [0.03, 0.12], default: 0.05, unit: "s" },
    ease: { type: "choice", options: ["power3.out", "back.out", "spring"], default: "power3.out" },
    direction: { type: "choice", options: ["up", "left-to-right"], default: "up" },
    values: { type: "text", default: "" },
  },
  pairs: ["data.count-up", "data.segment-bars-grow"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "MengTo/Skills:web-design/corner-lasers/demo/index.html", license: "MIT", note: "+ scroll-world-storytelling html-data bars; product-film Product UI opening" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const mk = (tag, css, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (parent) parent.append(e); return e; };
    const n = Math.round(ML.clamp(p.bars, 4, 12));
    // values: the `values` param ("20, 30, 50…"), else the source's 20/30/50/40/70/90/60 extended with seeded values
    const BASE = [20, 30, 50, 40, 70, 90, 60];
    const given = String(p.values || "").split(/[\s,|]+/).map(Number).filter((v) => Number.isFinite(v) && v > 0);
    const vals = Array.from({ length: n }, (_, i) => (given.length ? given[i % given.length] : i < 7 ? BASE[i] : Math.round(25 + ML.rnd(i, 7) * 65)));
    const vmax = Math.max(...vals);
    const hi = Math.round(ML.clamp(p.highlight_index, 0, n - 1));
    const horiz = p.direction === "left-to-right";
    // the host box
    const scene = ctx.scene || ctx.stage, hb = ctx.box(scene);
    let bx;
    if (el) {
      const b = ctx.box(el), isCard = (el.getAttribute("data-slot") || "") === "card";
      bx = isCard && b.h > 200 ? { x: b.x + b.w * 0.08, y: b.y + b.h * 0.5, w: b.w * 0.84, h: b.h * 0.42 } : { x: b.x, y: b.y, w: b.w, h: b.h };
    } else {
      const w = Math.min(f.pic.w * 0.9, f.wide ? f.W * 0.46 : f.W * 0.8), h = Math.min(f.pic.h * 0.62, w * (horiz ? 0.8 : 0.62));
      bx = { x: f.pic.x + (f.pic.w - w) / 2, y: f.pic.y + (f.pic.h - h) / 2, w, h };
    }
    const k = Math.min(f.W, f.H) / 1080;
    const wrap = mk("div", `position:absolute;left:${(bx.x - hb.x).toFixed(1)}px;top:${(bx.y - hb.y).toFixed(1)}px;width:${bx.w.toFixed(1)}px;height:${bx.h.toFixed(1)}px;z-index:12;pointer-events:none;box-sizing:border-box`, scene);
    if (!el) { wrap.className = "ml-panel"; wrap.style.padding = `${(40 * k).toFixed(1)}px`; }
    const stepped = p.trigger === "per-beat";
    const gap = (stepped ? 12 : 8) * k * (n > 9 ? 0.7 : 1);
    const plot = mk("div", `position:relative;width:100%;height:100%;display:flex;gap:${gap.toFixed(1)}px;${horiz ? `flex-direction:column;justify-content:center;border-inline-start:${Math.max(1, 1.5 * k).toFixed(1)}px solid var(--x-ink)` : `align-items:flex-end;border-bottom:${Math.max(1, 1.5 * k).toFixed(1)}px solid var(--x-ink)`};box-sizing:border-box`, wrap);
    const r = Math.max(2, 4 * k);
    const bars = vals.map((v) => {
      const b = mk("i", `display:block;flex:1 1 0;${horiz ? `height:auto;width:${((v / vmax) * 100).toFixed(2)}%;border-start-end-radius:${r}px;border-end-end-radius:${r}px;transform-origin:${rtl ? "100%" : "0%"} 50%` : `width:auto;height:${((v / vmax) * 100).toFixed(2)}%;border-radius:${r}px ${r}px 0 0;transform-origin:50% 100%`};min-height:2px;min-width:2px;background:color-mix(in srgb, var(--x-ink) ${stepped ? 100 : 72}%, transparent)`, plot);
      return b;
    });
    if (horiz) plot.style.alignItems = "flex-start";
    // timing per trigger
    const st = ML.clamp(p.stagger, 0.03, 0.12);
    let starts, durs = 0.5;
    if (stepped) {
      const after = (ctx.words || []).filter((w) => w.t >= at - 0.05 && w.t <= end - 0.4).map((w) => w.t);
      starts = vals.map((_, i) => (after.length >= n ? after[i] : at + 0.15 + i * 0.35));
      for (let i = 1; i < n; i++) starts[i] = Math.max(starts[i], starts[i - 1] + 0.12);
      durs = 0.25;
    } else if (p.trigger === "per-eighth") starts = vals.map((_, i) => at + i * 0.25);
    else starts = vals.map((_, i) => at + i * st);
    // the accent bar lands last (+0.15 s) in the "one" highlight
    if (p.highlight === "one" && !stepped) starts[hi] = Math.max(...starts) + 0.15;
    const easeOf = (x, isHi) => {
      if (p.ease === "back.out" || (isHi && p.highlight === "one")) { const c = 1.6, y = x - 1; return x <= 0 ? 0 : 1 + (c + 1) * y * y * y + c * y * y; }
      return 1 - Math.pow(1 - x, 4); // power3.out
    };
    const cssEase = ML.bezier(0.25, 0.1, 0.25, 1);
    const springy = p.ease === "spring" || p.trigger === "per-eighth";
    const lit = (i, t) => {
      if (p.highlight === "all-accent") return 1;
      if (p.highlight === "none") return 0;
      if (p.highlight === "current" || (stepped && p.highlight !== "one")) { const cur = starts.reduce((c, s, j) => (t >= s ? j : c), -1); return i === cur ? 1 : 0; }
      return i === hi && (!stepped || t >= starts[i]) ? 1 : 0; // on the beats, the lit bar waits for its own
    };
    // sound: about one per beat
    if (stepped || p.trigger === "per-eighth") starts.forEach((s, i) => i % 2 === 0 && ctx.sfx(s, "pop.soft", 0.22));
    else { ctx.sfx(at, "pop.soft", 0.22); if (p.highlight === "one") ctx.sfx(starts[hi] + 0.2, "pop", 0.3); }
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        wrap.style.visibility = t >= at - 1e-6 ? "visible" : "hidden";
        wrap.style.opacity = (Math.min(1, ML.lin(t, at - 0.05, at + 0.15) + (el ? 1 : 0)) * (1 - leave)).toFixed(4);
        bars.forEach((b, i) => {
          let s;
          if (stepped) s = 0.05 + 0.95 * cssEase(ML.lin(t, starts[i], starts[i] + durs));
          else if (springy) s = Math.max(0, ML.step(t - starts[i], ML.SPRING.glide));
          else s = easeOf(ML.lin(t, starts[i], starts[i] + durs), i === hi);
          b.style.transform = horiz ? `scaleX(${s.toFixed(4)})` : `scaleY(${s.toFixed(4)})`;
          const a = lit(i, t);
          const glowOn = p.highlight === "one" && i === hi ? ML.lin(t, starts[i] + 0.2, starts[i] + 0.5) : a;
          b.style.background = a ? "var(--x-accent)" : `color-mix(in srgb, var(--x-ink) ${stepped ? 100 : 72}%, transparent)`;
          b.style.boxShadow = a && glowOn > 0.01 ? `0 0 ${(10 * k).toFixed(1)}px color-mix(in srgb, var(--x-accent) ${(glowOn * 50).toFixed(1)}%, transparent)` : "none";
        });
      },
    };
  },
});

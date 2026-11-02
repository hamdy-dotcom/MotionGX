// Data point step highlight: along a line chart, the vertex for the current beat turns solid (fill + stroke in the
// active colour, opacity 1) while the others stay faint hollow rings (paper fill, 3 px stroke, opacity .2); opacity
// and fill cross over in .2 s, and (video polish) the active vertex bumps 1 → 1.25 → 1 in .3 s by its radius (no
// transform). One active at a time (index = beat), or every past vertex filled. On a chart / shape that already holds
// circles it lights those; otherwise it builds the source's evidence chart (gridlines, axis labels, a trend with its
// soft shadow drawn up to the current vertex, six vertices) — mirrored for RTL so the series reads right to left.
// Source: MengTo/Skills web-design/scroll-world-storytelling/demo/html-data (MIT: .point / .point.is-active, the
// trend + trend-shadow paths and the chapter index → active vertex), made a pure function of t.
ML.define({
  id: "data.data-point-step-highlight",
  category: "data",
  name: "Data point step highlight",
  does: "Along a line chart the vertex for the current beat turns solid accent while the others stay faint hollow rings.",
  says: ["proof", "step", "focus"],
  energy: 2,
  targets: ["chart", "shape"],
  duration: [0.5, 4],
  params: {
    mode: { type: "choice", options: ["only-current", "all-past"], default: "only-current" },
    pop: { type: "choice", options: ["none", "scale-bump"], default: "scale-bump" },
    radius: { type: "number", range: [4, 10], default: 7, unit: "px" },
    step: { type: "number", range: [0, 1.5], default: 0, unit: "s" },
    active: { type: "choice", options: ["accent", "bad", "good", "ink"], default: "accent" },
  },
  pairs: ["data.digit-write", "data.dimension-callouts"],
  avoid: ["celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/scroll-world-storytelling", license: "MIT", note: "demo/html-data: point styles, trend paths, index → active vertex; seekable rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl, stage, f } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const sv = (tag, attrs, parent, text) => { const e = doc.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v); if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    // an attribute written only when its value changes: Chrome re-rasterises an SVG shape whose geometry is re-set
    // (even to the same value) with different edge pixels, so the same t must not rewrite it
    const setA = (e, k, v) => { if (e.getAttribute(k) !== v) e.setAttribute(k, v); };
    const ACTIVE = `var(--x-${["bad", "good", "ink"].includes(p.active) ? p.active : "accent"})`;
    const BASE = p.active === "accent" ? "var(--x-ink)" : "var(--x-accent)";

    // the vertices: circles already in the target, or the source's chart built in the target / the picture region
    let pts = el ? [...el.querySelectorAll("circle")] : [];
    let host = null, trend = null, shadow = null, frac = null, R = +p.radius || 7, built = false;
    if (pts.length < 2) {
      built = true;
      const u = Math.min(f.W, f.H) / 1080;
      if (el) { host = mk("div", "position:relative;width:100%;height:100%;min-height:40%", el); }
      else {
        // a card of its own over the picture region (the chart needs a quiet ground)
        const pad = 48 * u, w = Math.min(f.pic.w, (f.pic.h - 2 * pad - 60 * u) * 1.72 + 2 * pad) * 0.96, h = (w - 2 * pad) * (360 / 620) + 2 * pad + 70 * u;
        host = mk("div", `position:absolute;left:${f.pic.x + (f.pic.w - w) / 2}px;top:${f.pic.y + (f.pic.h - h) / 2}px;width:${w}px;height:${h}px;box-sizing:border-box;padding:${pad}px;z-index:20`, stage);
        host.className = "ml-panel";
        const head = mk("div", `display:flex;justify-content:space-between;margin-bottom:${18 * u}px;font-size:${Math.round(20 * u)}px`, host);
        head.className = "ml-label";
        mk("span", "", head, rtl ? "سجلّ الأدلة" : "Evidence ledger"); mk("span", "", head, rtl ? "سلسلة ٠٦" : "Series EC–06");
      }
      const X = (x) => (rtl ? 652 - x : x); // RTL: the series runs right to left, the axis labels sit on the right
      const svg = sv("svg", { viewBox: "0 0 620 360", width: "100%", style: "display:block;overflow:visible" }, host);
      for (const y of [40, 140, 240, 320]) sv("line", { x1: X(52), y1: y, x2: X(600), y2: y, stroke: "var(--x-line)", "stroke-width": 1 }, svg);
      [["100", 43], ["066", 143], ["033", 243], ["000", 323]].forEach(([s, y]) => sv("text", { x: rtl ? 612 : 8, y, "text-anchor": rtl ? "end" : "start", fill: "var(--x-dim)", style: "font:14px var(--x-mono-font);letter-spacing:.08em" }, svg, s));
      const P = [[62, 270], [168, 234], [274, 186], [380, 142], [486, 88], [592, 54]].map(([x, y]) => [X(x), y]);
      const d = "M" + P.map(([x, y]) => `${x} ${y}`).join(" L");
      shadow = sv("path", { d, fill: "none", stroke: BASE, "stroke-opacity": 0.14, "stroke-width": 13 }, svg);
      trend = sv("path", { d, fill: "none", stroke: BASE, "stroke-width": 4, "stroke-linecap": "square", "stroke-linejoin": "bevel" }, svg);
      const segs = P.slice(1).map((q, i) => Math.hypot(q[0] - P[i][0], q[1] - P[i][1])), L = segs.reduce((a, b) => a + b, 0);
      frac = P.map((_, i) => segs.slice(0, i).reduce((a, b) => a + b, 0) / L);
      trend.setAttribute("stroke-dasharray", L.toFixed(2)); trend.dataset.len = String(L);
      pts = P.map(([x, y]) => sv("circle", { cx: x, cy: y, r: R }, svg));
    } else {
      R = parseFloat(pts[0].getAttribute("r")) || R;
    }
    // each vertex rasterised on its own (will-change): a radius bump then repaints the whole vertex, never a partial
    // tile that would leave the same t with different edge pixels depending on the frame before
    for (const c of pts) { c.style.strokeWidth = "3"; c.style.vectorEffect = "none"; c.style.willChange = "transform"; }

    // one beat per vertex: a fixed step, or the span shared out evenly
    const n = pts.length, lead = built ? 0.3 : 0;
    const span = Math.max(0.3, end - 0.45 - at - lead);
    const dt = +p.step > 0 ? +p.step : span / n;
    const times = pts.map((_, i) => at + lead + i * dt);
    times.forEach((tt) => ctx.sfx(tt, "tap", 0.22));

    return {
      draw(t) {
        if (host) {
          ML.show(host, t, at, end - 0.25);
          // the trend draws up to the current vertex (source: --progress drives the dash offset)
          const L = +trend.dataset.len;
          let prog = 0;
          times.forEach((ti, i) => { prog += (frac[i] - (i ? frac[i - 1] : 0)) * ML.ease(t, ti - 0.25, ti); });
          setA(trend, "stroke-dashoffset", (L * (1 - prog)).toFixed(2));
          shadow.style.opacity = ML.ease(t, at, at + 0.4).toFixed(3);
        }
        pts.forEach((c, i) => {
          const ti = times[i], next = times[i + 1];
          const on = ML.lin(t, ti, ti + 0.2);
          const off = p.mode === "all-past" || next == null ? 0 : ML.lin(t, next, next + 0.2);
          const a = on * (1 - off), pc = (a * 100).toFixed(1);
          c.style.opacity = (0.2 + 0.8 * a).toFixed(4);
          c.style.fill = `color-mix(in srgb, ${ACTIVE} ${pc}%, var(--x-panel))`;
          c.style.stroke = `color-mix(in srgb, ${ACTIVE} ${pc}%, ${BASE})`;
          const x = ML.lin(t, ti, ti + 0.3);
          const bump = p.pop === "scale-bump" && x > 0 && x < 1 ? Math.sin(Math.PI * x) * (1.1 - 0.2 * x) : 0;
          setA(c, "r", (R * (1 + 0.25 * bump)).toFixed(3));
        });
      },
    };
  },
});

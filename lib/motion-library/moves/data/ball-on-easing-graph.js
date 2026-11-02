// Ball on an easing graph: empty axes (a 1 px ink L, ~40% of the frame) with a dashed target line at the top; an
// accent ball lands at the origin, then its x advances linearly with time while its y follows the chosen easing
// (ease-out, back, bounce, linear, elastic), and a 2 px accent trail draws behind it by stroke-dashoffset synced to
// the same t (the trail's drawn length is the arc length up to the ball). An optional mono label names the curve.
// In Arabic time runs right to left (the graph is mirrored). On a chart / shape target the graph is drawn over it;
// with no target it sits in the picture region.
// Source: prompt-motion "ultimaxbt-bbebf5" (reference only: rebuilt as our own code).
ML.define({
  id: "data.ball-on-easing-graph",
  category: "data",
  name: "Ball traces its path on a graph",
  does: "A ball lands on empty axes and moves along them while its own path draws as a curve behind it.",
  says: ["precision", "growth", "tech"],
  energy: 3,
  targets: ["chart", "shape"],
  duration: [1, 2],
  params: {
    curve: { type: "choice", options: ["ease-out", "back", "bounce", "linear", "elastic"], default: "back" },
    trail: { type: "bool", default: true },
    label: { type: "bool", default: true },
    duration: { type: "number", range: [1, 1.5], default: 1.2, unit: "s" },
  },
  pairs: ["data.bezier-curve-plot", "data.count-up"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "land.light",
  source: { from: "prompt-motion:ultimaxbt-bbebf5", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const NS = "http://www.w3.org/2000/svg";
    const svgEl = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, String(v)); if (parent) parent.append(e); return e; };
    // the easing functions (GSAP's out curves)
    const EASE = {
      "ease-out": (x) => 1 - Math.pow(1 - x, 3),
      back: (x) => { const c = 1.70158, y = x - 1; return 1 + (c + 1) * y * y * y + c * y * y; },
      bounce: (x) => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; },
      linear: (x) => x,
      elastic: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin(((x * 10 - 0.75) * 2 * Math.PI) / 3) + 1),
    };
    const NAME = { "ease-out": "power2.out", back: "back.out(1.7)", bounce: "bounce.out", linear: "linear", elastic: "elastic.out" };
    const E = EASE[p.curve] || EASE.back;
    // the graph's box: over the target, else in the picture region (~40% of the frame's short side, larger on tall frames)
    const scene = ctx.scene || ctx.stage, hb = ctx.box(scene);
    let bx;
    if (el) { const b = ctx.box(el); bx = { x: b.x, y: b.y, w: b.w, h: b.h }; }
    else { const w = Math.min(f.pic.w * 0.86, f.wide ? f.W * 0.42 : f.W * 0.78), h = Math.min(f.pic.h * 0.8, w * 0.8); bx = { x: f.pic.x + (f.pic.w - w) / 2, y: f.pic.y + (f.pic.h - h) / 2, w, h }; }
    const k = Math.min(f.W, f.H) / 1080;
    const ball = Math.max(14, 30 * k), stroke = Math.max(2, 4 * k), lab = Math.max(14, 24 * k);
    const svg = svgEl("svg", { width: bx.w.toFixed(1), height: bx.h.toFixed(1), viewBox: `0 0 ${bx.w.toFixed(1)} ${bx.h.toFixed(1)}`, overflow: "visible" });
    svg.style.cssText = `position:absolute;left:${(bx.x - hb.x).toFixed(1)}px;top:${(bx.y - hb.y).toFixed(1)}px;z-index:12;pointer-events:none;overflow:visible;will-change:transform`;
    // free-standing, the graph sits on its own panel (the look's surface)
    let panel = null;
    if (!el) {
      const pd = 36 * Math.min(f.W, f.H) / 1080;
      panel = document.createElement("div");
      panel.className = "ml-panel";
      panel.style.cssText += `;position:absolute;left:${(bx.x - hb.x - pd).toFixed(1)}px;top:${(bx.y - hb.y - pd).toFixed(1)}px;width:${(bx.w + 2 * pd).toFixed(1)}px;height:${(bx.h + 2 * pd).toFixed(1)}px;z-index:11;pointer-events:none;box-sizing:border-box;will-change:transform`;
      scene.append(panel);
    }
    scene.append(svg);
    // plot area: y from 0 (origin) to 1 (target line) with headroom for overshoot; x from the reading-start side
    const padL = ball, padR = ball, top = bx.h * 0.2, bottom = bx.h - (p.label ? lab * 2.2 : ball);
    const X = (u) => (rtl ? bx.w - padL - u * (bx.w - padL - padR) : padL + u * (bx.w - padL - padR));
    const Y = (v) => bottom - v * (bottom - top - bx.h * 0.06);
    const ox = X(0), oy = Y(0);
    const g = svgEl("g", {}, svg);
    const axes = svgEl("path", { d: `M${ox.toFixed(1)} ${(top - bx.h * 0.08).toFixed(1)} L${ox.toFixed(1)} ${oy.toFixed(1)} L${X(1).toFixed(1)} ${oy.toFixed(1)}`, fill: "none", stroke: "var(--x-ink)", "stroke-width": Math.max(1, 1.5 * k) }, g);
    const target = svgEl("line", { x1: ox, y1: Y(1), x2: X(1), y2: Y(1), stroke: "var(--x-dim)", "stroke-width": Math.max(1, 1.5 * k), "stroke-dasharray": `${(8 * k).toFixed(1)} ${(8 * k).toFixed(1)}` }, g);
    // the trail: the curve sampled finely; drawn length = arc length up to the ball's u
    const N = 240, pts = [], acc = [0];
    for (let i = 0; i <= N; i++) { const u = i / N; pts.push([X(u), Y(E(u))]); if (i) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); }
    const total = acc[N];
    const trail = svgEl("path", { d: "M" + pts.map((q) => q[0].toFixed(2) + " " + q[1].toFixed(2)).join(" L"), fill: "none", stroke: "var(--x-accent)", "stroke-width": stroke, "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": `${total.toFixed(2)} ${(total + 10).toFixed(2)}`, "stroke-dashoffset": total.toFixed(2) }, g);
    if (!p.trail) trail.setAttribute("display", "none");
    const dot = svgEl("circle", { cx: ox, cy: oy, r: (ball / 2).toFixed(2), fill: "var(--x-accent)" }, g);
    let label = null;
    if (p.label) {
      label = svgEl("text", { x: rtl ? X(0) : X(0), y: (bx.h - lab * 0.4).toFixed(1), "font-size": lab.toFixed(1), fill: "var(--x-dim)", "text-anchor": rtl ? "end" : "start", direction: "ltr" }, g);
      label.style.fontFamily = "var(--x-mono-font)";
      label.style.letterSpacing = "0.06em";
      label.textContent = NAME[p.curve] || p.curve;
    }
    // timing: the axes draw in, the ball lands at the origin, then travels over `duration`
    const land = at + 0.3, go = land + 0.25, dur = ML.clamp(p.duration, 1, 1.5), done = go + dur;
    ctx.sfx(land, "land.light", 0.35);
    ctx.sfx(done, "tap", 0.2);
    const axLen = 1;
    axes.setAttribute("pathLength", "1");
    axes.setAttribute("stroke-dasharray", "1 2");
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        svg.style.visibility = t >= at - 1e-6 ? "visible" : "hidden";
        svg.style.opacity = (1 - leave).toFixed(4);
        if (panel) { panel.style.visibility = svg.style.visibility; panel.style.opacity = (ML.out(t, at - 0.1, at + 0.2) * (1 - leave)).toFixed(4); }
        axes.setAttribute("stroke-dashoffset", (axLen * (1 - ML.out(t, at, at + 0.35))).toFixed(4));
        target.setAttribute("opacity", ML.lin(t, at + 0.15, at + 0.4).toFixed(3));
        if (label) label.setAttribute("opacity", ML.lin(t, at + 0.2, at + 0.45).toFixed(3));
        // the ball drops onto the origin (a short fall + a squash), then rides the curve
        const u = ML.lin(t, go, done), v = E(u);
        const fall = ML.lin(t, at + 0.05, land);
        const yLand = oy - (1 - fall * fall) * bx.h * 0.18;
        const cy = t < land ? yLand : Y(v), cx = X(u);
        const squash = t >= land ? ML.pulse(t, land, 0.01, 0.08) * 0.25 : 0;
        dot.setAttribute("cx", cx.toFixed(2));
        dot.setAttribute("cy", (cy + squash * ball * 0.25).toFixed(2));
        dot.setAttribute("r", (ball / 2).toFixed(2));
        if (squash > 0.002) dot.setAttribute("transform", `translate(${cx.toFixed(2)} ${cy.toFixed(2)}) scale(${(1 + squash).toFixed(3)} ${(1 - squash).toFixed(3)}) translate(${(-cx).toFixed(2)} ${(-cy).toFixed(2)})`);
        else dot.removeAttribute("transform");
        dot.setAttribute("opacity", ML.lin(t, at + 0.05, at + 0.15).toFixed(3));
        // the trail: arc length to u (interpolated between samples)
        const fi = u * N, i0 = Math.floor(fi), i1 = Math.min(N, i0 + 1), len = acc[i0] + (acc[i1] - acc[i0]) * (fi - i0);
        trail.setAttribute("stroke-dashoffset", (total - len).toFixed(2));
      },
    };
  },
});

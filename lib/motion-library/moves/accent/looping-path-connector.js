// Looping path between two points: a start node (a ring r 10 with an inner dot r 4, 2 px stroke) and an end node,
// joined by a thin line with cursive loops (a prolate trochoid: x = a·u − b·sin u, y = b·(1 − cos u) with b > a, so
// every turn closes into a loop like joined handwriting). The stroke draws on its dash offset (length → 0, power2.inOut
// 1.2 s) with a dot riding its head; the end node pops (back.out 1.6) as the stroke arrives. Options: a small mono code
// label above that fades in, and 2–3 thin branch strokes that draw off the end node (0.3 s each) ending in dots.
// In Arabic the journey runs right to left. 0 loops gives a soft S between the nodes.
// Source: prompt-motion reflex-cloud + souravbhar871 (reference only) — rebuilt as our own SVG code.
ML.define({
  id: "accent.looping-path-connector",
  category: "accent",
  name: "Looping path between two points",
  does: "A thin line draws through cursive loops from a start node to an end node, picturing a journey, process or train of thought.",
  says: ["flow", "connection", "step", "story"],
  energy: 2,
  targets: ["shape", "line"],
  duration: [1, 2.5],
  params: {
    loops: { type: "number", range: [0, 6], default: 4 },
    end: { type: "choice", options: ["square", "circle", "arrow", "dot"], default: "square" },
    label: { type: "bool", default: false },
    branches: { type: "bool", default: false },
    text: { type: "text", default: "" },
  },
  pairs: ["text-in.typewriter", "accent.callout-leader"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "prompt-motion:reflex-cloud-this-is-legit-insane", license: "reference", note: "with souravbhar871-my-first-experiment-with; our own SVG rebuild" },
  setup(ctx) {
    const { p, at, end, f, stage, el } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, k = Math.min(W, H) / 1080;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); if (parent) parent.append(e); return e; };
    const s = 1.6 * k; // source px → stage px

    // the span: across a target shape's middle, under a text line, else across the picture region
    let x0 = f.pic.x + f.pic.w * 0.12, x1 = f.pic.x + f.pic.w * 0.88, y = f.pic.y + f.pic.h * 0.55;
    if (el && el !== stage) {
      const b = ctx.box(el);
      if (el instanceof SVGElement || !el.textContent.trim()) { x0 = b.x; x1 = b.x + b.w; y = b.y + b.h / 2; }
      else { x0 = Math.max(f.safe.x + 20 * s, b.x); x1 = Math.min(f.safe.x + f.safe.w - 20 * s, b.x + b.w); y = Math.min(H - 80 * s, b.y + b.h + 70 * s); }
    }
    if (ctx.rtl) [x0, x1] = [x1, x0];
    const dir = Math.sign(x1 - x0) || 1;
    const nodeR = 10 * s, endS = 34 * s;
    const ax0 = x0 + dir * (nodeR + 4 * s), ax1 = x1 - dir * (endS * 0.5 + 6 * s);
    const span = ax1 - ax0;

    // the path: cursive loops (trochoid) between short lead-in / lead-out strokes
    const n = Math.round(p.loops);
    const pts = [];
    if (n <= 0) {
      for (let i = 0; i <= 120; i++) { const u = i / 120; pts.push([ax0 + span * u, y - Math.sin(u * Math.PI * 2) * Math.abs(span) * 0.08]); }
    } else {
      const lead = 0.14, body = 1 - lead * 2;
      const a = Math.abs(span * body) / (2 * Math.PI * n), b = Math.min(a * 1.9, 70 * s);
      for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([ax0 + span * lead * u, y]); }
      const steps = 70 * n;
      for (let i = 1; i <= steps; i++) {
        const u = (i / steps) * Math.PI * 2 * n;
        pts.push([ax0 + span * lead + dir * (a * u - b * Math.sin(u)), y - b * (1 - Math.cos(u))]);
      }
      for (let i = 1; i <= 40; i++) { const u = i / 40; pts.push([ax0 + span * (lead + body) + span * lead * u, y]); }
    }
    const d = pts.map((q, i) => `${i ? "L" : "M"}${q[0].toFixed(2)} ${q[1].toFixed(2)}`).join("");
    // cumulative length, to put the head dot exactly on the drawn tip
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const LEN = cum[cum.length - 1];
    const pointAt = (len) => {
      let lo = 0, hi = cum.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] < len) lo = mid; else hi = mid; }
      const u = (len - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]);
      return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * u, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * u];
    };

    const svg = mk("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
    svg.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:6;visibility:hidden;will-change:transform" // its own layer: the frame under it rasterises the same every time;
    host.append(svg);
    const path = mk("path", { d, fill: "none", "stroke-width": 1.5 * s, "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": `${LEN} ${LEN + 10}`, style: "stroke:var(--x-accent)" }, svg);
    const start = mk("g", { transform: `translate(${x0} ${y})` }, svg);
    mk("circle", { r: nodeR, fill: "none", "stroke-width": 2 * s, style: "stroke:var(--x-ink)" }, start);
    mk("circle", { r: 4 * s, style: "fill:var(--x-ink)" }, start);
    const head = mk("circle", { r: 3.2 * s, style: "fill:var(--x-accent)" }, svg);
    const endG = mk("g", {}, svg);
    const endInner = mk("g", {}, endG);
    if (p.end === "square") mk("rect", { x: -endS / 2, y: -endS / 2, width: endS, height: endS, rx: 4 * s, style: "fill:var(--x-accent)" }, endInner);
    else if (p.end === "circle") mk("circle", { r: endS / 2, style: "fill:var(--x-accent)" }, endInner);
    else if (p.end === "dot") mk("circle", { r: endS / 4, style: "fill:var(--x-accent)" }, endInner);
    else mk("path", { d: `M${-endS * 0.35} ${-endS * 0.45} L${endS * 0.45} 0 L${-endS * 0.35} ${endS * 0.45} Z`, transform: dir < 0 ? "scale(-1 1)" : "", style: "fill:var(--x-accent)" }, endInner);
    endG.setAttribute("transform", `translate(${x1} ${y})`);

    // branches off the end node: thin strokes, each ending in a small dot
    const branches = [];
    if (p.branches) {
      const angles = [-55, -15, 30];
      angles.forEach((ang0, i) => {
        const ang = ((dir > 0 ? ang0 : 180 - ang0) * Math.PI) / 180, L = (60 + 22 * ML.rnd(i, 3)) * s;
        const bx0 = x1 + Math.cos(ang) * endS * 0.7, by0 = y + Math.sin(ang) * endS * 0.7;
        const bx1 = bx0 + Math.cos(ang) * L, by1 = by0 + Math.sin(ang) * L;
        const ln = mk("path", { d: `M${bx0} ${by0} L${bx1} ${by1}`, fill: "none", "stroke-width": 1.2 * s, "stroke-linecap": "round", "stroke-dasharray": `${L} ${L + 4}`, style: "stroke:var(--x-ink);opacity:0.7" }, svg);
        const dt = mk("circle", { cx: bx1, cy: by1, r: 3 * s, style: "fill:var(--x-ink)" }, svg);
        branches.push({ ln, dt, L });
      });
    }
    // the code label above
    let label = null;
    if (p.label) {
      let text = (p.text || "").trim();
      if (!text) { const h = host.querySelector(".ml-label"); text = h ? h.textContent.trim() : ""; }
      if (text) {
        label = document.createElement("div");
        label.textContent = text;
        label.style.cssText = `position:absolute;left:${(x0 + x1) / 2}px;top:${y - (n > 0 ? 170 : 80) * s}px;translate:-50% -50%;white-space:nowrap;font:500 ${Math.round(12 * s)}px var(--x-mono-font);color:var(--x-dim);pointer-events:none;z-index:6;opacity:0`;
        host.append(label);
      }
    }

    const D = Math.max(0.6, end - at), ts = Math.min(1, D / 1.9);
    const T = { node: 0, draw0: 0.15 * ts, drawDur: 1.2 * ts };
    const arrive = T.draw0 + T.drawDur;
    const easeIO = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    ctx.sfx(at + T.draw0, "whoosh.soft", 0.15);
    ctx.sfx(at + arrive, "pop.soft", 0.3);
    return {
      draw(t) {
        const r = t - at;
        const leave = ML.lin(t, end - 0.3, end);
        const on = r >= 0 && leave < 1;
        svg.style.visibility = on ? "visible" : "hidden";
        if (label) label.style.opacity = "0";
        if (!on) return;
        svg.style.opacity = (1 - leave).toFixed(3);
        start.setAttribute("transform", `translate(${x0} ${y}) scale(${ML.back(r, 0, 0.25, 1.6).toFixed(4)})`);
        const u = easeIO(ML.lin(r, T.draw0, arrive));
        path.setAttribute("stroke-dashoffset", (LEN * (1 - u)).toFixed(2));
        const [hx, hy] = pointAt(LEN * u);
        head.setAttribute("cx", hx.toFixed(2)); head.setAttribute("cy", hy.toFixed(2));
        head.setAttribute("opacity", u > 0 && u < 1 ? "1" : "0");
        const pop = Math.max(0, ML.back(r, arrive - 0.04, arrive + 0.3, 1.6));
        endInner.setAttribute("transform", `scale(${pop.toFixed(4)})`);
        branches.forEach((b, i) => {
          const v = ML.out(r, arrive + 0.1 + i * 0.12, arrive + 0.4 + i * 0.12);
          b.ln.setAttribute("stroke-dashoffset", (b.L * (1 - v)).toFixed(2));
          b.dt.setAttribute("opacity", v >= 1 ? "1" : "0");
        });
        if (label) label.style.opacity = (ML.ease(r, T.draw0, T.draw0 + 0.4) * (1 - leave)).toFixed(3);
      },
    };
  },
});

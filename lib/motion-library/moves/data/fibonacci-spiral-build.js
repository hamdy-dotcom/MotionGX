// Fibonacci spiral build: squares of growing size (1, 1, 2, 3, 5, 8, 13…) appear one after another, each placed
// against the growing rectangle in rotating order (right, down, left, up — mirrored in RTL), scaling 0.9 → 1 and
// fading in over 0.25 s ease-out. Fill: accent at alpha falling 60% → 20% as the size grows; 1 px separators in the
// panel colour; a semibold label at each square's corner. The spiral is quarter-circle arcs (1.5 px) drawn in step with
// the squares. The whole group pulls back in log space (scale = e^(spring over ln(fit))) so the newest square always
// fits. SVG geometry set from t — vector at every zoom, nothing rasterised and enlarged.
// Source: prompt-motion ddryo-loos-bgm-opus-5-5-lism-css (reference only: our own rebuild).
ML.define({
  id: "data.fibonacci-spiral-build",
  category: "data",
  name: "Golden-ratio squares and spiral build",
  does: "Squares of growing size appear one after another, each labelled, while a spiral sweeps through them and the view keeps pulling back.",
  says: ["growth", "scale", "precision", "step"],
  energy: 3,
  targets: ["chart", "shape"],
  duration: [2, 5],
  params: {
    sequence: { type: "choice", options: ["fibonacci", "doubling", "linear"], default: "fibonacci" },
    labels: { type: "bool", default: true },
    spiral: { type: "bool", default: true },
    steps: { type: "number", range: [5, 10], default: 8 },
    label_prefix: { type: "text", default: "s" },
    unit: { type: "number", range: [1, 20], default: 10 },
  },
  pairs: ["data.globe-columns", "camera.infinite-zoom"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "prompt-motion:ddryo-loos-bgm-opus-5-5-lism-css", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, end, stage } = ctx;
    const NS = "http://www.w3.org/2000/svg";
    // the layer: inside the target when it is a real element, else the picture region with its own ground
    const host = ctx.el && ctx.el !== stage && ctx.el !== ctx.scene ? ctx.el : null;
    const layer = document.createElement("div");
    if (host) { if (getComputedStyle(host).position === "static") host.style.position = "relative"; layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:2;visibility:hidden"; host.append(layer); }
    else { layer.style.cssText = "position:absolute;left:var(--pic-x);top:var(--pic-y);width:var(--pic-w);height:var(--pic-h);pointer-events:none;z-index:5;visibility:hidden"; const back = document.createElement("div"); back.style.cssText = "position:absolute;left:calc(var(--pic-x) - 80px);top:var(--pic-y);width:calc(var(--pic-w) + 160px);height:calc(var(--pic-h) + 120px);z-index:5;visibility:hidden;background:var(--x-ground);background-image:var(--x-ground-image)"; layer.back = back; (ctx.scene || stage).append(back); (ctx.scene || stage).append(layer); }
    const W = layer.offsetWidth || ctx.f.pic.w, H = layer.offsetHeight || ctx.f.pic.h;
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("width", W); svg.setAttribute("height", H);
    svg.style.cssText = "position:absolute;inset:0;overflow:hidden";
    layer.append(svg);
    const world = document.createElementNS(NS, "g");
    svg.append(world);

    // sizes and placement against the growing bounding box: up (first), right, down, left, up…
    const n = Math.round(p.steps);
    const sizes = [];
    for (let i = 0; i < n; i++) sizes.push(p.sequence === "doubling" ? (i < 2 ? 1 : sizes[i - 1] * 2) : p.sequence === "linear" ? i + 1 : i < 2 ? 1 : sizes[i - 1] + sizes[i - 2]);
    const DIRS = ["up", "right", "down", "left"], mir = ctx.rtl ? -1 : 1;
    let bx0 = 0, by0 = 0, bx1 = 0, by1 = 0;
    const sq = sizes.map((s, i) => {
      const d = DIRS[i % 4];
      let x, y;
      if (i === 0) { x = 0; y = 0; }
      else if (d === "right") { x = bx1; y = by0; }
      else if (d === "down") { x = bx0; y = by1; }
      else if (d === "left") { x = bx0 - s; y = by0; }
      else { x = bx0; y = by0 - s; }
      if (i === 0) { bx0 = 0; by0 = 0; bx1 = s; by1 = s; } else { bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x + s); by1 = Math.max(by1, y + s); }
      // the quarter arc through this square (centre at a corner, radius s), as angles from that centre
      const arc = { right: [x, y + s, -90, 0], down: [x, y, 0, 90], left: [x + s, y, 90, 180], up: [x + s, y + s, 180, 270] }[d];
      return { s, x, y, d, arc, box: [bx0, by0, bx1, by1] };
    });
    // mirror for RTL: x → −x (the spiral then turns the other way)
    const X = (x) => x * mir;
    // the look: accent fill falling 60% → 20%, panel separators, ink spiral, label type
    const smax = sizes[n - 1];
    const step = Math.max(0.22, Math.min(0.5, (end - at - 0.9) / n));
    const T = sq.map((_, i) => at + 0.15 + i * step);
    sq.forEach((q, i) => {
      const g = document.createElementNS(NS, "g");
      const r = document.createElementNS(NS, "rect");
      const fillA = 60 - 40 * Math.log(q.s) / Math.log(Math.max(2, smax));
      r.setAttribute("fill", `color-mix(in srgb, var(--x-accent) ${fillA.toFixed(1)}%, transparent)`);
      r.setAttribute("stroke", "var(--x-panel)"); r.setAttribute("vector-effect", "non-scaling-stroke"); r.setAttribute("stroke-width", "1");
      g.append(r);
      let label = null;
      if (p.labels) {
        label = document.createElementNS(NS, "text");
        label.textContent = `${p.label_prefix}${Math.round(q.s * p.unit)}`;
        label.setAttribute("fill", "var(--x-ink)"); label.setAttribute("direction", "ltr"); label.style.direction = "ltr";
        label.style.font = `600 1px var(--x-label-font)`;
        g.append(label);
      }
      world.append(g);
      q.g = g; q.r = r; q.label = label;
      if (i % (n > 7 ? 2 : 1) === 0 && T[i] < end - 0.4) ctx.sfx(T[i], "pop.soft", 0.18);
    });
    const spiral = document.createElementNS(NS, "path");
    spiral.setAttribute("fill", "none"); spiral.setAttribute("stroke", "var(--x-ink)"); spiral.setAttribute("stroke-width", "1.5");
    spiral.setAttribute("vector-effect", "non-scaling-stroke"); spiral.setAttribute("stroke-linecap", "round");
    if (p.spiral) world.append(spiral);
    // the camera: centre and zoom of the boxes so far, retargeted at each square on a spring in log space
    const keys = sq.map((q, i) => { const [a, b, c, d] = q.box, bw = c - a, bh = d - b; return [T[i] - 0.05, X((a + c) / 2), (b + d) / 2, Math.min((W * 0.82) / bw, (H * 0.82) / bh)]; });
    const cfg = { stiffness: 60, damping: 15 };
    return {
      draw(t) {
        const vis = ML.out(t, at, at + 0.3) * (1 - ML.ease(t, end - 0.35, end));
        layer.style.visibility = t < at || vis <= 0.001 ? "hidden" : "visible";
        layer.style.opacity = vis.toFixed(4);
        if (layer.back) { layer.back.style.visibility = layer.style.visibility; layer.back.style.opacity = layer.style.opacity; }
        if (t < at) return;
        const cam = ML.camera(Math.max(t, keys[0][0]), keys, cfg);
        world.setAttribute("transform", `translate(${(W / 2).toFixed(2)} ${(H / 2).toFixed(2)}) scale(${cam.zoom.toFixed(5)}) translate(${(-cam.x).toFixed(4)} ${(-cam.y).toFixed(4)})`);
        let d = "";
        sq.forEach((q, i) => {
          const u = ML.out(t, T[i], T[i] + 0.25), sc = 0.9 + 0.1 * u;
          const cx = X(q.x + q.s / 2), cy = q.y + q.s / 2, s = q.s * sc;
          q.g.style.opacity = u.toFixed(4);
          q.g.style.visibility = u > 0 ? "visible" : "hidden";
          q.r.setAttribute("x", (cx - s / 2).toFixed(4)); q.r.setAttribute("y", (cy - s / 2).toFixed(4));
          q.r.setAttribute("width", s.toFixed(4)); q.r.setAttribute("height", s.toFixed(4));
          if (q.label) {
            const fs = q.s * 0.14;
            q.label.style.fontSize = fs.toFixed(4) + "px";
            q.label.setAttribute("x", (ctx.rtl ? cx + s / 2 - fs * 0.5 : cx - s / 2 + fs * 0.5).toFixed(4));
            q.label.setAttribute("y", (cy - s / 2 + fs * 1.3).toFixed(4));
            q.label.setAttribute("text-anchor", ctx.rtl ? "end" : "start");
          }
          // the spiral's quarter in this square, drawn in step with the squares
          const k = ML.lin(t, T[i], T[i] + step);
          if (k > 0 && p.spiral) {
            const [ax, ay, a0, a1] = q.arc, e = a0 + (a1 - a0) * k;
            const P = (deg) => [X(ax + q.s * Math.cos((deg * Math.PI) / 180)), ay + q.s * Math.sin((deg * Math.PI) / 180)];
            const [sx, sy] = P(a0), [ex, ey] = P(e);
            d += `${d ? "L" : "M"}${sx.toFixed(4)} ${sy.toFixed(4)} A${q.s} ${q.s} 0 0 ${ctx.rtl ? 0 : 1} ${ex.toFixed(4)} ${ey.toFixed(4)} `;
          }
        });
        spiral.setAttribute("d", d || "M0 0");
        spiral.style.visibility = d ? "visible" : "hidden";
      },
    };
  },
});

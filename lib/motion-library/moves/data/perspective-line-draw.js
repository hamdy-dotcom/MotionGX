// Perspective line draw: coloured strips paint themselves along a ground surface seen from a high camera, like a
// broadcast first-down line drawn under the players. A ground plane (a field with yard lines, a tiled floor, or a map
// grid with roads) is projected in true perspective (x = cx + X·F/Z, y = horizon + h·F/Z); two parallel strips on it
// grow near → far (or far → near) over ~0.8 s power2.out, each an exact projected quad so its width tapers like a
// trapezoid, with a soft glow copy under it. The whole surface is laid as the scene's first layer, so everything in
// the scene stays in front of it (the strips pass under the foreground). Strip colours come from the look (accent,
// accent-2…) unless the director names others.
// Source: prompt-motion "blueoctopusai-make-a-motion-graphics" (reference only: rebuilt as our own code).
ML.define({
  id: "data.perspective-line-draw",
  category: "data",
  name: "Line draws onto a 3D surface",
  does: "Coloured lines paint themselves along a surface in perspective, like a broadcast first-down line under the players.",
  says: ["focus", "precision", "step"],
  energy: 3,
  targets: ["stage", "shape"],
  duration: [0.8, 2],
  params: {
    colours: { type: "text", default: "accent,accent-2" },
    direction: { type: "choice", options: ["near-far", "far-near"], default: "near-far" },
    surface: { type: "choice", options: ["field", "floor", "map"], default: "field" },
    duration: { type: "number", range: [0.5, 1.2], default: 0.8, unit: "s" },
    lane: { type: "number", range: [-1, 1], default: 0 },
    spacing: { type: "number", range: [0.2, 1.5], default: 0.7 },
    horizon: { type: "number", range: [0.2, 0.6], default: 0.36 },
  },
  pairs: ["camera.push-in"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:blueoctopusai-make-a-motion-graphics", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { p, at, end, rtl, f } = ctx;
    const NS = "http://www.w3.org/2000/svg";
    const S = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.append(e); return e; };
    const parent = ctx.scene || ctx.stage, W = f.W, H = f.H;
    const svg = S("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
    svg.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;z-index:0";
    parent.insertBefore(svg, parent.firstChild);
    const uid = "mlpld" + document.querySelectorAll("[data-ml-pld]").length;
    svg.dataset.mlPld = uid;
    // the camera: high, looking down the plane; Z from near (bottom edge) to far
    const yh = H * ML.clamp(p.horizon, 0.2, 0.6), zn = 1, zf = 10, Fy = (H - yh) * zn, Fx = W * (f.wide ? 0.42 : 0.62);
    const P = (X, Z) => [W / 2 + (X * Fx) / Z, yh + Fy / Z];
    const quad = (x0, x1, z0, z1) => [P(x0, z0), P(x1, z0), P(x1, z1), P(x0, z1)].map((q) => q[0].toFixed(1) + "," + q[1].toFixed(1)).join(" ");
    const defs = S("defs", {}, svg);
    const fade = S("linearGradient", { id: uid + "-fade", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    S("stop", { offset: "0", style: "stop-color:var(--x-ground);stop-opacity:1" }, fade);
    S("stop", { offset: "1", style: "stop-color:var(--x-ground);stop-opacity:0" }, fade);
    const glow = S("filter", { id: uid + "-glow", x: "-50%", y: "-50%", width: "200%", height: "200%" }, defs);
    S("feGaussianBlur", { stdDeviation: Math.max(4, W * 0.006) }, glow);
    const ground = S("g", {}, svg);
    const lw = Math.max(1, W * 0.0012), XS = 3.2;
    const line = (x0, z0, x1, z1, extra = "") => { const a = P(x0, z0), b = P(x1, z1); return S("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], style: `stroke:var(--x-dim);opacity:.38;stroke-width:${lw}px;${extra}` }, ground); };
    S("polygon", { points: quad(-XS, XS, zn * 0.98, zf), style: "fill:var(--x-panel-2)" }, ground);
    if (p.surface === "field") {
      for (let z = 1; z <= zf; z += 0.5) line(-XS, z, XS, z, Number.isInteger(z) ? "" : "opacity:.2");
      for (const x of [-XS, XS]) line(x, zn, x, zf, `stroke-width:${lw * 2}px`);
      for (let z = 1; z <= zf; z += 0.25) for (const x of [-1.1, 1.1]) line(x - 0.06, z, x + 0.06, z);
    } else if (p.surface === "floor") {
      for (let z = 1; z <= zf; z += 0.6) line(-XS, z, XS, z);
      for (let x = -XS; x <= XS + 1e-6; x += 0.6) line(x, zn, x, zf);
    } else {
      for (let z = 1; z <= zf; z += 0.4) line(-XS, z, XS, z, "opacity:.2");
      for (let x = -XS; x <= XS + 1e-6; x += 0.4) line(x, zn, x, zf, "opacity:.2");
      // a few roads: gentle seeded curves across the plane
      for (let r = 0; r < 4; r++) {
        const pts = [];
        for (let i = 0; i <= 24; i++) { const z = zn + (zf - zn) * (i / 24), x = -XS + ML.rnd(r, 3) * XS * 2 + Math.sin(i * 0.35 + r * 2) * 0.5; pts.push(P(ML.clamp(x, -XS, XS), z)); }
        S("polyline", { points: pts.map((q) => q.join(",")).join(" "), style: `fill:none;stroke:var(--x-dim);opacity:.45;stroke-width:${lw * 3}px;stroke-linecap:round` }, ground);
      }
    }
    S("rect", { x: 0, y: yh - 2, width: W, height: (H - yh) * 0.3, style: `fill:url(#${uid}-fade)` }, ground);
    // the strips
    const tok = { accent: "var(--x-accent)", "accent-2": "var(--x-accent-2)", ink: "var(--x-ink)", good: "var(--x-good)", bad: "var(--x-bad)", dim: "var(--x-dim)" };
    const cols = String(p.colours || "accent,accent-2").split(",").map((c) => c.trim()).filter(Boolean).map((c) => tok[c] || c);
    if (!cols.length) cols.push(tok.accent);
    const sw = 0.09, laneX = (rtl ? -1 : 1) * ML.clamp(p.lane, -1, 1) * 1.4;
    const strips = cols.slice(0, 4).map((col, i) => {
      const x = laneX + (i - (Math.min(cols.length, 4) - 1) / 2) * p.spacing * (rtl ? -1 : 1);
      const g = S("g", {}, svg);
      const halo = S("polygon", { points: "", style: `fill:${col};opacity:.45`, filter: `url(#${uid}-glow)` }, g);
      const body = S("polygon", { points: "", style: `fill:${col}` }, g);
      return { x, halo, body };
    });
    const zEnd = zf * 0.8;
    // fitted to the span: the strips finish painting before the surface leaves
    const span = end - 0.3 - at, T = at + Math.min(0.25, span * 0.2), D = Math.min(p.duration, Math.max(0.3, end - 0.3 - T - 0.06 * (strips.length - 1)));
    ctx.sfx(T, "whoosh.soft", 0.4);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        svg.style.opacity = (ML.out(t, at - 0.05, at + 0.3) * (1 - leave)).toFixed(4);
        for (const [i, s] of strips.entries()) {
          const a = T + i * 0.06, u = 1 - Math.pow(1 - ML.lin(t, a, a + D), 3);
          let z0 = zn, z1 = zn + (zEnd - zn) * u;
          if (p.direction === "far-near") { z1 = zEnd; z0 = zEnd - (zEnd - zn) * u; }
          if (u <= 0) { s.body.setAttribute("points", ""); s.halo.setAttribute("points", ""); continue; }
          const pts = quad(s.x - sw / 2, s.x + sw / 2, z0, Math.max(z1, z0 + 1e-3));
          s.body.setAttribute("points", pts); s.halo.setAttribute("points", pts);
        }
      },
    };
  },
});

// Open strokes close and fill with glow: a set of open U-shaped strokes each morph into a closed rounded shape
// (rounded triangle, square, pentagon, hexagon, near-circle), point-matched so the two arms swing up and meet at the
// top (flubber-style: both shapes sampled to the same number of points from the same start, interpolated per point),
// 0.6 s power2.inOut, staggered 0.05 s around the set; then the fill rises 0 → 30 % grey (0.3 s) and on to the fill
// colour with a soft glow (drop-shadow, 0.4 s) while each shape breathes 1 → 1.08 → 1 (2D, vector: stays sharp). The
// whole run tightens (down to 60 %) when the scene is too short for it.
// Colours come from the look (the fill names a look colour); the order sweeps right-to-left in Arabic.
// Source: prompt-motion "micheleharmonic-i-made-this-with" (reference only — rebuilt as our own code).
ML.define({
  id: "element.open-to-closed-fill",
  category: "element",
  name: "Open strokes close and fill with glow",
  does: "Open curves close into rounded shapes, fill grey and then bright with a soft glow.",
  says: ["result", "change", "arrival"],
  energy: 3,
  targets: ["shape"],
  duration: [1.3, 3],
  params: {
    fill: { type: "choice", options: ["accent", "accent-2", "ink", "panel", "good"], default: "accent" },
    glow: { type: "bool", default: true },
    count: { type: "number", range: [1, 8], default: 5 },
    layout: { type: "choice", options: ["row", "ring", "grid"], default: "row" },
    stagger: { type: "number", range: [0.02, 0.12], default: 0.05, unit: "s" },
    stroke: { type: "number", range: [2, 8], default: 4, unit: "px" },
  },
  pairs: ["text-in.punchline"],
  avoid: ["problem"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "prompt-motion:micheleharmonic-i-made-this-with", license: "reference", note: "point-matched open-to-closed morph rebuilt as our own code; every frame from t" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const NS = "http://www.w3.org/2000/svg";
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const ob = own ? ctx.box(own) : null;
    const big = ob && ob.w > f.W * 0.3 && ob.h > f.H * 0.12;
    const R = big ? ob : f.pic;
    const k = Math.min(f.W, f.H) / 1080;
    const layer = doc.createElement("div");
    layer.style.cssText = `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;`;
    host.append(layer);
    const back = doc.createElement("div"); back.style.cssText = "position:absolute;inset:0;border-radius:var(--x-radius);background:var(--x-ground);"; layer.append(back);
    const svg = doc.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${R.w} ${R.h}`); svg.setAttribute("width", R.w); svg.setAttribute("height", R.h);
    svg.style.cssText = "position:absolute;inset:0;overflow:visible;";
    layer.append(svg);
    const n = Math.round(ML.clamp(p.count, 1, 8));
    // layout: centres and a radius per shape
    let cols = n, rows = 1;
    if (p.layout === "grid") { cols = Math.ceil(Math.sqrt(n * (R.w / R.h))); cols = ML.clamp(cols, 1, n); rows = Math.ceil(n / cols); }
    else if (p.layout === "row" && R.h > R.w * 1.1 && n > 3) { cols = Math.ceil(n / 2); rows = 2; }
    const cell = p.layout === "ring" ? Math.min(R.w, R.h) * 0.28 : Math.min(R.w / cols, R.h / rows);
    const rad = Math.min(cell * 0.36, 150 * k * 1.4);
    const centres = Array.from({ length: n }, (_, i) => {
      if (p.layout === "ring" && n > 1) { const a = -Math.PI / 2 + (i / n) * Math.PI * 2 * (rtl ? -1 : 1); const RR = Math.min(R.w, R.h) * 0.32; return [R.w / 2 + Math.cos(a) * RR, R.h / 2 + Math.sin(a) * RR]; }
      if (p.layout === "ring") return [R.w / 2, R.h / 2];
      const c = i % cols, r = Math.floor(i / cols), inRow = Math.min(cols, n - r * cols);
      const cw = R.w / cols, x0 = (R.w - inRow * cw) / 2;
      const cc = rtl ? inRow - 1 - c : c;
      return [x0 + cw * (cc + 0.5), R.h / 2 + (r - (rows - 1) / 2) * (R.h / rows)];
    });
    const M = 96;
    // closed target: a rounded polygon (k sides blended toward a circle), sampled from the top going round
    const sidesOf = (i) => [3, 4, 5, 6, 0, 4, 3, 5][i % 8];
    // a polygon grown by a disc (straight edges, round corners), read back as radius per angle
    const radial = (sides, rot) => {
      if (!sides) return () => 0.86;
      const a = 0.62, c = 0.26, V = Array.from({ length: sides }, (_, m) => rot + (m / sides) * Math.PI * 2);
      const pts = [];
      V.forEach((v, m) => {
        const half = Math.PI / sides; // the corner arc spans from the previous edge's normal to the next one's
        for (let q = 0; q <= 12; q++) { const n = v - half + (q / 12) * 2 * half; pts.push([Math.cos(v) * a + Math.cos(n) * c, Math.sin(v) * a + Math.sin(n) * c]); }
        const nx = V[(m + 1) % sides], n2 = v + half;
        for (let q = 1; q < 12; q++) { const s = q / 12, x0 = Math.cos(v) * a + Math.cos(n2) * c, y0 = Math.sin(v) * a + Math.sin(n2) * c, x1 = Math.cos(nx) * a + Math.cos(n2) * c, y1 = Math.sin(nx) * a + Math.sin(n2) * c; pts.push([x0 + (x1 - x0) * s, y0 + (y1 - y0) * s]); }
      });
      const polar = pts.map(([x, y]) => [Math.atan2(y, x), Math.hypot(x, y)]).sort((u, w) => u[0] - w[0]);
      const max = Math.max(...polar.map((q) => q[1]));
      return (th) => {
        const x = Math.atan2(Math.sin(th), Math.cos(th));
        let i = polar.findIndex((q) => q[0] >= x); if (i < 0) i = polar.length; const A = polar[(i - 1 + polar.length) % polar.length], B = polar[i % polar.length];
        let span = B[0] - A[0]; if (span <= 0) span += Math.PI * 2; let d = x - A[0]; if (d < 0) d += Math.PI * 2;
        return ((A[1] + (B[1] - A[1]) * (d / span)) / max) * 0.92;
      };
    };
    const closed = (sides, rot) => { const rf = radial(sides, rot); return Array.from({ length: M }, (_, j) => { const th = -Math.PI / 2 - (j / (M - 1)) * Math.PI * 2, r = rf(th); return [Math.cos(th) * r, Math.sin(th) * r]; }); };
    // open source: a U (left arm down, round bottom, right arm up), sampled by arc length in the same order
    const U = (() => {
      const arm = 0.9, L = arm + Math.PI + arm;
      return Array.from({ length: M }, (_, j) => {
        const d = (j / (M - 1)) * L;
        if (d < arm) return [-0.8, -0.9 + d];
        if (d < arm + Math.PI) { const a = Math.PI - (d - arm); return [Math.cos(a) * 0.8, Math.sin(a) * 0.8 * 1.0 + 0]; }
        return [0.8, -(d - arm - Math.PI)];
      }).map(([x, y]) => [x, y + 0.1]);
    })();
    const fillVar = `var(--x-${p.fill})`;
    const shapes = centres.map(([cx, cy], i) => {
      const g = doc.createElementNS(NS, "g");
      const path = doc.createElementNS(NS, "path");
      path.setAttribute("stroke", "var(--x-ink)"); path.setAttribute("stroke-width", String(p.stroke * k * 1.2));
      path.setAttribute("stroke-linecap", "round"); path.setAttribute("stroke-linejoin", "round");
      g.append(path); svg.append(g);
      // a flat edge on top where the arms meet (odd polygons point down)
      const sides = sidesOf(i), rot = sides ? -Math.PI / 2 + Math.PI / sides : 0;
      const C = closed(sides, rot);
      return { g, path, cx, cy, C };
    });
    const st0 = ML.clamp(p.stagger, 0.02, 0.12);
    const tS = ML.clamp((end - at - 0.45) / ((n - 1) * st0 + 1.3 + 0.15), 0.6, 1); // fits the run inside the scene
    const st = st0 * tS, morph = 0.6 * tS, greyD = 0.3 * tS, brightD = 0.4 * tS;
    const mT = (i) => at + 0.15 + i * st;
    const greyT = (i) => mT(i) + morph, brightT = (i) => greyT(i) + greyD;
    ctx.sfx(mT(0), "whoosh.soft", 0.25);
    ctx.sfx(brightT(0), "pop.soft", 0.35);
    if (n > 3) ctx.sfx(brightT(n - 1), "pop.soft", 0.25);
    const leaveA = Math.max(brightT(n - 1) + brightD + 0.1, end - 0.3);
    const p2io = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    return {
      draw(t) {
        const leave = ML.clamp((t - leaveA) / 0.25);
        layer.style.opacity = (ML.lin(t, at - 0.05, at + 0.15) * (1 - leave)).toFixed(4);
        layer.style.visibility = t < at - 0.06 ? "hidden" : "visible";
        shapes.forEach((s, i) => {
          const u = p2io(ML.lin(t, mT(i), mT(i) + morph));
          let d = "";
          for (let j = 0; j < M; j++) {
            const x = U[j][0] + (s.C[j][0] - U[j][0]) * u, y = U[j][1] + (s.C[j][1] - U[j][1]) * u;
            d += (j ? "L" : "M") + (s.cx + x * rad).toFixed(2) + " " + (s.cy + y * rad).toFixed(2);
          }
          if (u >= 0.999) d += "Z";
          s.path.setAttribute("d", d);
          const grey = ML.out(t, greyT(i), greyT(i) + greyD), bright = ML.ease(t, brightT(i), brightT(i) + brightD);
          // grey 30 % first, then the fill colour at full
          s.path.setAttribute("fill", bright > 0 ? `color-mix(in srgb, ${fillVar} ${(bright * 100).toFixed(1)}%, color-mix(in srgb, var(--x-dim) 30%, transparent))` : "var(--x-dim)");
          s.path.setAttribute("fill-opacity", bright > 0 ? "1" : (grey * 0.3).toFixed(4));
          s.path.setAttribute("stroke", bright > 0 ? `color-mix(in srgb, ${fillVar} ${(bright * 100).toFixed(1)}%, var(--x-ink))` : "var(--x-ink)");
          s.g.style.filter = p.glow && bright > 0.01 ? `drop-shadow(0 0 ${(10 * k * 1.4 * bright).toFixed(2)}px color-mix(in srgb, ${fillVar} ${(60 * bright).toFixed(1)}%, transparent))` : "none";
          const breathe = 1 + 0.08 * Math.sin(Math.PI * ML.lin(t, brightT(i), brightT(i) + brightD + 0.1));
          s.g.style.transformOrigin = `${s.cx}px ${s.cy}px`;
          s.g.style.transform = breathe === 1 ? "none" : `scale(${breathe.toFixed(4)})`;
        });
      },
    };
  },
});

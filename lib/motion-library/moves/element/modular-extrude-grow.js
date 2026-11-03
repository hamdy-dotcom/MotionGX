// Grows module by module: a structure of N isometric box modules extends as each new section extrudes up out of the
// ground (scaleY 0 → 1 from its base, 0.4 s back.out(1.2), 0.08–0.3 s apart along its length), a rooftop unit pops on
// top of each module once it stands (scale 0 → 1 from its base, 0.2 s, back.out(2)), and an accent end-facade panel
// slides along with the growing front. axis x: the row grows sideways; z: it grows toward the viewer; y: modules stack
// into a tower and the facade is the roof slab riding up. Every face is a polygon recomputed from t in an isometric
// projection (so nothing is CSS-scaled); colours come from the look (panel faces, accent tints, line edges).
// RTL mirrors the drawing so the row grows from the right.
// Source: prompt-motion "mdaman010-one-prompt-to-claude" (reference only — rebuilt as our own code).
ML.define({
  id: "element.modular-extrude-grow",
  category: "element",
  name: "Grows module by module",
  does: "A structure extends as new sections and rooftop units extrude into place one after another.",
  says: ["growth", "scale", "step"],
  energy: 2,
  targets: ["shape", "stage", "chart"],
  duration: [1.5, 4],
  params: {
    axis: { type: "choice", options: ["x", "y", "z"], default: "x" },
    modules: { type: "number", range: [3, 12], default: 6 },
    stagger: { type: "number", range: [0.08, 0.3], default: 0.15, unit: "s" },
    rooftops: { type: "bool", default: true },
    facade: { type: "bool", default: true },
  },
  pairs: ["data.bar-chart-grow", "camera.push-in"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:mdaman010-one-prompt-to-claude", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const N = Math.round(ML.clamp(p.modules, 3, 12));
    const st = ML.clamp(p.stagger, 0.08, 0.3), growD = 0.4, roofD = 0.2;
    const axis = ["x", "y", "z"].includes(p.axis) ? p.axis : "x";
    const C = Math.cos(Math.PI / 6), S = 0.5, mir = rtl ? -1 : 1;
    const proj = (x, y, z) => [mir * (x - z) * C, (x + z) * S - y];

    // the modules' footprints and heights (seeded)
    const L = 1, D = axis === "y" ? 1.6 : 1.25, Hb = axis === "y" ? 0.55 : 1.5;
    const mods = Array.from({ length: N }, (_, i) => {
      const h = axis === "y" ? Hb * (0.8 + ML.rnd(i, 3) * 0.4) : Hb * (0.7 + ML.rnd(i, 3) * 0.6);
      const start = at + 0.1 + i * st;
      if (axis === "x") return { i, x0: i * L, x1: (i + 1) * L, z0: 0, z1: D, h, start };
      if (axis === "z") return { i, x0: 0, x1: D, z0: i * L, z1: (i + 1) * L, h, start };
      return { i, x0: 0, x1: D, z0: 0, z1: D * 0.85, h, start };
    });
    const totalH = axis === "y" ? mods.reduce((a, m) => a + m.h, 0) : Math.max(...mods.map((m) => m.h));

    // fit: the projected box of the finished structure (with overshoot and rooftops)
    const ext = [];
    const X1 = Math.max(...mods.map((m) => m.x1)) + 0.15, Z1 = Math.max(...mods.map((m) => m.z1)) + 0.15, Y1 = totalH * 1.3 + 0.4;
    for (const x of [-0.1, X1]) for (const z of [-0.1, Z1]) for (const y of [0, Y1]) ext.push(proj(x, y, z));
    const minX = Math.min(...ext.map((q) => q[0])), maxX = Math.max(...ext.map((q) => q[0])), minY = Math.min(...ext.map((q) => q[1])), maxY = Math.max(...ext.map((q) => q[1]));
    const ownB = own ? ctx.box(own) : null, fits = ownB && ownB.w >= f.pic.w * 0.25 && ownB.h >= f.pic.h * 0.25; // a tiny target: the picture region
    const R = fits ? ownB : f.pic;
    const svg = doc.createElementNS(NS, "svg");
    const pad = 0.06 * (maxX - minX);
    svg.setAttribute("viewBox", `${(minX - pad).toFixed(3)} ${(minY - pad).toFixed(3)} ${(maxX - minX + pad * 2).toFixed(3)} ${(maxY - minY + pad * 2).toFixed(3)}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    const fw = R.w * (fits ? 1 : f.wide ? 0.8 : 0.92), fh = R.h * (fits ? 1 : 0.86);
    svg.style.cssText = `position:absolute;left:${(R.x + (R.w - fw) / 2).toFixed(1)}px;top:${(R.y + (R.h - fh) / 2).toFixed(1)}px;width:${fw.toFixed(1)}px;height:${fh.toFixed(1)}px;overflow:visible;z-index:5;pointer-events:none;visibility:hidden;will-change:transform;background-image:linear-gradient(transparent, transparent);`; // own layer
    host.append(svg);
    const unit = (maxX - minX + pad * 2) / fw; // svg units per px
    const edge = (1.2 * unit).toFixed(4);

    // light falls from above in every look: on a dark ground the ink is light, so the shading turns around
    svg.style.color = "var(--x-ground)";
    const gc = (getComputedStyle(svg).color.match(/[\d.]+/g) || ["255", "255", "255"]).slice(0, 3).map(Number), gMax = /^color\(/.test(getComputedStyle(svg).color) ? 1 : 255;
    svg.style.color = "";
    const dark = (0.3 * gc[0] + 0.59 * gc[1] + 0.11 * gc[2]) / gMax < 0.5;
    const top = dark ? "color-mix(in srgb, var(--x-panel), var(--x-ink) 26%)" : "var(--x-panel)";
    const right = (tint) => (dark ? `color-mix(in srgb, ${tint}, var(--x-ink) 8%)` : `color-mix(in srgb, ${tint}, var(--x-ink) 10%)`);
    const left = (tint) => (dark ? `color-mix(in srgb, ${tint}, var(--x-ground) 35%)` : `color-mix(in srgb, ${tint}, var(--x-ink) 24%)`);
    const poly = (g) => { const e = doc.createElementNS(NS, "polygon"); e.setAttribute("stroke", "var(--x-line)"); e.setAttribute("stroke-width", edge); e.setAttribute("stroke-linejoin", "round"); g.append(e); return e; };
    /** a box [x0,x1]×[y0,y1]×[z0,z1]: its three visible faces */
    const mkBox = (tint, topFill) => {
      const g = doc.createElementNS(NS, "g"); svg.append(g);
      const fx = poly(g), fz = poly(g), ft = poly(g);
      fx.setAttribute("fill", right(tint)); fz.setAttribute("fill", left(tint)); ft.setAttribute("fill", topFill || top);
      const pts = (a) => a.map((q) => proj(...q)).map((q) => `${q[0].toFixed(3)},${q[1].toFixed(3)}`).join(" ");
      return {
        g,
        set(x0, x1, y0, y1, z0, z1) {
          if (y1 - y0 < 1e-4) { g.style.display = "none"; return; }
          g.style.display = "";
          fx.setAttribute("points", pts([[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]]));
          fz.setAttribute("points", pts([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]));
          ft.setAttribute("points", pts([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]));
        },
      };
    };
    // ground shadow plate (very light), then modules in painter's order, each followed by its rooftop
    const tints = ["var(--x-panel-2)", "color-mix(in srgb, var(--x-accent) 22%, var(--x-panel))"];
    mods.forEach((m, i) => {
      m.box = mkBox(tints[i % 2]);
      if (p.rooftops && (axis !== "y" || i === N - 1)) m.roof = mkBox("color-mix(in srgb, var(--x-accent) 55%, var(--x-panel))", "color-mix(in srgb, var(--x-accent) 35%, var(--x-panel))");
    });
    const plate = p.facade ? mkBox("var(--x-accent)", "color-mix(in srgb, var(--x-accent) 70%, var(--x-panel))") : null;
    // a tower's roof slab sits under the rooftop unit
    if (plate && axis === "y" && mods[N - 1].roof) svg.insertBefore(plate.g, mods[N - 1].roof.g);
    const th = 0.07;

    const backOut = (t, a, b, c) => (t <= a ? 0 : ML.back(t, a, b, c));
    const last = mods[N - 1];
    const leave = Math.max(last.start + growD + roofD + 0.6, end - 0.3);
    mods.forEach((m, i) => (i % 2 === 0) && ctx.sfx(m.start + 0.05, "tap", 0.2));
    ctx.sfx(last.start + growD, "land.light", 0.25);

    return {
      draw(t) {
        svg.style.visibility = t < at - 1e-6 ? "hidden" : "visible";
        const q = ML.ease(t, leave, leave + 0.3);
        if (own) own.style.visibility = t < at - 1e-6 || (q >= 1 && end < ctx.to - 0.01) ? "" : "hidden"; // back when the move ends before its scene
        svg.style.opacity = (ML.ease(t, at, at + 0.15) * (1 - q)).toFixed(4);
        // repaint the whole drawing every frame, so a frame rasters the same whatever frame came before
        svg.style.backgroundPosition = `${((t * 1000) % 7).toFixed(3)}px 0`;
        let base = 0, front = 0;
        mods.forEach((m) => {
          const s = backOut(t, m.start, m.start + growD, 1.2);
          const h = m.h * s;
          const y0 = axis === "y" ? base : 0, y1 = y0 + h;
          m.box.set(m.x0, m.x1, y0, y1, m.z0, m.z1);
          const g = ML.out(t, m.start, m.start + growD);
          front += (axis === "y" ? m.h : L) * g;
          if (axis === "y") base += h;
          if (m.roof) {
            const r = backOut(t, m.start + growD, m.start + growD + roofD, 2);
            const cx = (m.x0 + m.x1) / 2, cz = (m.z0 + m.z1) / 2, rw = (m.x1 - m.x0) * 0.36 * r, rd = (m.z1 - m.z0) * 0.36 * r, rh = Hb * 0.28 * r * (axis === "y" ? 1.6 : 1);
            const ry = y1 + (axis === "y" && plate ? th : 0);
            m.roof.set(cx - rw / 2, cx + rw / 2, ry, ry + Math.max(0, rh), cz - rd / 2, cz + rd / 2);
          }
        });
        if (plate) {
          const on = ML.ease(t, mods[0].start, mods[0].start + 0.2);
          if (on < 0.01) plate.set(0, 0, 0, 0, 0, 0);
          else if (axis === "x") plate.set(front + 0.02, front + 0.02 + th, 0, totalH * 0.9 * on, -0.06, D + 0.06);
          else if (axis === "z") plate.set(-0.06, D + 0.06, 0, totalH * 0.9 * on, front + 0.02, front + 0.02 + th);
          else plate.set(-0.08, D + 0.08, base, base + th * on, -0.08, D * 0.85 + 0.08);
        }
      },
    };
  },
});

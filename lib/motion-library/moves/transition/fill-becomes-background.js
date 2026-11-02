// Fill becomes background: a grid of squares fills in (cell by cell, along the reading side, from the centre, or in a
// seeded scatter) until the frame — or the chart it grows from — is a full grid; then its gaps close (`gap` 6 -> 0 px
// on a 1080 frame, `duration` 0.2 s) and the grid is one solid colour field: the ground the next scene's type enters
// on at once. On a chart target the grid covers the chart's box, then the closed field opens out to the frame.
// Source: prompt-motion fionntobin-the-new-opus-5-5 (reference only: our own rebuild).
ML.define({
  id: "transition.fill-becomes-background",
  category: "transition",
  name: "Fill becomes background",
  does: "A filling grid of squares closes its gaps until it is a solid colour field, the ground for the next scene.",
  says: ["transition", "growth", "result"],
  energy: 3,
  targets: ["scene", "chart"],
  duration: [0.2, 2],
  params: {
    gap: { type: "number", range: [2, 12], default: 6, unit: "px" },
    duration: { type: "number", range: [0.15, 0.4], default: 0.2, unit: "s" },
    fill: { type: "number", range: [0, 1.2], default: 0.5, unit: "s" },
    order: { type: "choice", options: ["sweep", "centre", "scatter"], default: "sweep" },
    cells: { type: "number", range: [4, 16], default: 8 },
    colour: { type: "text", default: "accent" },
  },
  pairs: ["data.grid-fill", "text-in.punchline"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "prompt-motion:fionntobin-the-new-opus-5-5", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const W = f.W, H = f.H, k = Math.min(W, H) / 1080;
    const host = ctx.scene || stage;
    const c = String(p.colour || "accent").trim().replace(/\s+/g, "-");
    const col = c.startsWith("--x-") ? `var(${c})` : /^(accent|accent-2|ink|dim|good|bad|panel|panel-2|ground|device)$/.test(c) ? `var(--x-${c})` : "var(--x-accent)";
    const real = ctx.el && ctx.el !== stage ? ctx.el : null;
    const B = real ? ctx.box(real) : { x: 0, y: 0, w: W, h: H };
    const gap = ML.clamp(p.gap, 2, 12) * k;
    // square cells: `cells` across the short side of the box
    const n = Math.round(ML.clamp(p.cells, 4, 16));
    const cell = Math.min(B.w, B.h) / n;
    const cols = Math.ceil(B.w / cell), rows = Math.ceil(B.h / cell);
    const ox = B.x + (B.w - cols * cell) / 2, oy = B.y + (B.h - rows * cell) / 2;
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:6;overflow:hidden;visibility:hidden";
    host.append(layer);
    const clip = document.createElement("div");
    clip.style.cssText = `position:absolute;left:${B.x}px;top:${B.y}px;width:${B.w}px;height:${B.h}px;overflow:hidden`;
    layer.append(clip);
    const rtl = !!ctx.rtl;
    const fillT = ML.clamp(p.fill, 0, 1.2), per = Math.min(0.18, Math.max(0.06, fillT * 0.35));
    const sq = [];
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
      // each cell: its own patch of ground (the busy layout never peeks through the gaps), the square inside it
      const box = document.createElement("div");
      box.style.cssText = `position:absolute;left:${(ox + q * cell - B.x).toFixed(2)}px;top:${(oy + r * cell - B.y).toFixed(2)}px;width:${(cell + 0.6).toFixed(2)}px;height:${(cell + 0.6).toFixed(2)}px;background:var(--x-ground);visibility:hidden`;
      const d = document.createElement("div");
      d.style.cssText = `position:absolute;background:${col}`;
      box.append(d);
      clip.append(box);
      // when this cell fills: along the reading side (row by row), out from the centre, or a seeded scatter
      const across = rtl ? cols - 1 - q : q;
      let o;
      if (p.order === "centre") o = Math.hypot(q + 0.5 - cols / 2, r + 0.5 - rows / 2) / Math.hypot(cols / 2, rows / 2);
      else if (p.order === "scatter") o = ML.rnd(r * 97 + q, 5);
      else o = (r * cols + across) / Math.max(1, rows * cols - 1);
      const x = ox + q * cell - B.x, y = oy + r * cell - B.y;
      sq.push({ box, d, x, y, t: at + o * Math.max(0, fillT - per) });
    }
    const full = at + fillT;
    const close = ML.clamp(p.duration, 0.15, 0.4);
    const solidAt = full + close;
    // the solid field (and, from a chart, its opening out to the frame)
    const field = document.createElement("div");
    field.style.cssText = `position:absolute;background:${col};visibility:hidden`;
    layer.append(field);
    const openD = real ? 0.4 : 0;
    const p3io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const p2io = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    // a soft click per few cells while it fills, a land on the close
    for (let i = 0; i < 4 && fillT > 0.15; i++) ctx.sfx(at + (i * fillT) / 4, "pop.soft", 0.14);
    ctx.sfx(full, "pop", 0.3);
    if (real) ctx.sfx(solidAt, "whoosh.soft", 0.25);
    return {
      draw(t) {
        const on = t >= at - (fillT === 0 ? 0.001 : 0);
        layer.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        const solid = t >= solidAt;
        clip.style.visibility = solid ? "hidden" : "visible";
        field.style.visibility = solid ? "visible" : "hidden";
        if (solid) {
          const u = openD ? p3io(ML.lin(t, solidAt, solidAt + openD)) : 1;
          field.style.left = (B.x * (1 - u)).toFixed(2) + "px";
          field.style.top = (B.y * (1 - u)).toFixed(2) + "px";
          field.style.width = (B.w + (W - B.w) * u).toFixed(2) + "px";
          field.style.height = (B.h + (H - B.h) * u).toFixed(2) + "px";
          return;
        }
        // the gap closes once the grid is full
        const g = gap * (1 - p2io(ML.lin(t, full, solidAt)));
        for (const s of sq) {
          const a = ML.back(t, s.t, s.t + per, 1.4); // each square pops into its cell
          const lit = t >= s.t;
          s.box.style.visibility = lit ? "visible" : "hidden";
          if (!lit) continue;
          // its patch of ground opens with the square, so no pale box flashes up before it
          s.box.style.clipPath = a < 0.8 ? `inset(${((cell + 0.6) * (0.5 - Math.max(0, a) / 1.6)).toFixed(2)}px)` : "none";
          const size = Math.max(0, Math.min(cell - g * 0.5, (cell - g) * a));
          const off = (cell - size) / 2;
          s.d.style.left = off.toFixed(2) + "px";
          s.d.style.top = off.toFixed(2) + "px";
          s.d.style.width = s.d.style.height = (size + (g < 0.3 ? 0.6 : 0)).toFixed(2) + "px";
          s.d.style.borderRadius = (g * 0.35).toFixed(2) + "px";
        }
      },
    };
  },
});

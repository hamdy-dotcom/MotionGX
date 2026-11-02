// Ordered-dither (Bayer) reveal: the target dissolves into view in crisp pixel cells that light in 4×4 Bayer order
// under a front sweeping across it. Ported from product-film's kit/dither.ts bayerPath: the element is cut into cells
// of `cell` px (scaled with the frame); a cell is lit when BAYER[row & 3][col & 3] < clamp01((front − position) / band),
// front = progress · (1 + band), position = 1 − v (up), v (down), 1 − u (left), u (right), the radial distance (out)
// or 1 − it (in). The lit cells become one SVG path used as the element's clip-path, so it stays sharp and fully
// deterministic (no random). progress 0 → 1 over `duration` on power2.inOut; direction "out" runs it 1 → 0 to
// dissolve the element away. Arabic: left and right swap, so a sideways sweep follows the reading direction.
// Source: Rieranthony/product-film-skill, templates/kit/dither.ts (MIT).
ML.define({
  id: "mask.bayer-dither-reveal",
  category: "mask",
  name: "Ordered-dither (Bayer) reveal",
  does: "An element dissolves into view in a crisp pixel-dither pattern that sweeps across it in one direction.",
  says: ["reveal", "tech", "brand"],
  energy: 3,
  targets: ["logo", "image", "card", "screen", "shape"],
  duration: [0.5, 1.4],
  params: {
    sweep: { type: "choice", options: ["up", "down", "left", "right", "out", "in"], default: "up" },
    cell: { type: "number", range: [4, 16], default: 8, unit: "px" },
    band: { type: "number", range: [0.15, 0.8], default: 0.45 },
    direction: { type: "choice", options: ["in", "out"], default: "in" },
    duration: { type: "number", range: [0.5, 1.4], default: 0.9, unit: "s" },
  },
  pairs: ["background.dither-field", "text-in.scramble"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "product-film-skill:templates/kit/dither.ts", license: "MIT", note: "bayerPath ported; clip-path instead of a canvas mask" },
  setup(ctx) {
    const { el, p, at, stage } = ctx;
    if (!el) return null;
    const host = ctx.scene || stage;
    const target = el === stage ? host : el;
    // the 4×4 Bayer matrix, normalised (v + 0.5) / 16 — dither.ts
    const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map((r) => r.map((v) => (v + 0.5) / 16));
    const b = target === host ? { w: ctx.f.W, h: ctx.f.H } : ctx.box(target);
    const k = Math.min(ctx.f.W, ctx.f.H) / 1080;
    const cell = Math.max(2, Math.round(ML.clamp(+p.cell, 4, 16) * k));
    const band = ML.clamp(+p.band, 0.15, 0.8), dur = ML.clamp(+p.duration, 0.5, 1.4);
    let sweep = p.sweep;
    if (ctx.rtl && (sweep === "left" || sweep === "right")) sweep = sweep === "left" ? "right" : "left";
    const cols = Math.ceil(b.w / cell), rows = Math.ceil(b.h / cell);
    // each cell's place in the sweep and its Bayer threshold, worked out once
    const cells = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const u = (col + 0.5) / cols, v = (row + 0.5) / rows;
        const radial = Math.min(1, Math.hypot(u - 0.5, v - 0.5) * Math.SQRT2);
        const pos = sweep === "up" ? 1 - v : sweep === "down" ? v : sweep === "left" ? 1 - u : sweep === "right" ? u : sweep === "out" ? radial : 1 - radial;
        cells.push({ pos, th: BAYER[row & 3][col & 3], d: `M${col * cell} ${row * cell}h${cell}v${cell}h${-cell}z` });
      }
    }
    const quad = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2); // power2.inOut
    ctx.sfx(at, "blip", 0.3);
    ctx.sfx(at + dur * 0.55, "blip", 0.2);
    return {
      draw(t) {
        const e = quad(ML.lin(t, at, at + dur)), progress = p.direction === "out" ? 1 - e : e;
        if (progress >= 1) { target.style.clipPath = "none"; target.style.visibility = ""; return; }
        if (progress <= 0) { target.style.clipPath = "none"; target.style.visibility = "hidden"; return; }
        target.style.visibility = "";
        const front = progress * (1 + band);
        let d = "";
        for (const c of cells) if (c.th < ML.clamp((front - c.pos) / band)) d += c.d;
        target.style.clipPath = d ? `path("${d}")` : "inset(50%)";
      },
    };
  },
});

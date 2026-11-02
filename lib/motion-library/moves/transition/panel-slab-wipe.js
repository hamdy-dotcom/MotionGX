// Panel slab wipe: 2-6 flat rectangles of the next ground slide in from the frame's edges in pieces — the column on the
// reading-end side first (the right in English, the left in Arabic), then the smaller slabs filling what is left — each
// travelling from fully off its nearest edge to its place in 0.25 s on cubic-bezier(0.7, 0, 0.2, 1), staggered 0.06 s,
// until the frame is covered. The headline under them is cropped by their hard edges, never faded. The colour is the
// next scene's ground (--x-next-ground when the film sets it, else the ink) or any look colour by name.
// Source: prompt-motion blue-clarity-ok-so-seeing-lots (reference only: our own rebuild).
ML.define({
  id: "transition.panel-slab-wipe",
  category: "transition",
  name: "Panel slab wipe",
  does: "Rectangles of the next colour slide in from the edges in pieces, eating the headline until the frame is covered.",
  says: ["transition", "energy"],
  energy: 4,
  targets: ["scene"],
  duration: [0.4, 0.8],
  params: {
    pieces: { type: "number", range: [2, 6], default: 4 },
    stagger: { type: "number", range: [0.03, 0.1], default: 0.06, unit: "s" },
    colour: { type: "text", default: "next ground" },
  },
  pairs: ["transition.colour-field-cut", "text-in.mask-rise"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:blue-clarity-ok-so-seeing-lots", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H;
    const n = Math.round(ML.clamp(+p.pieces || 4, 2, 6));
    const stg = ML.clamp(+p.stagger || 0.06, 0.03, 0.1);
    const c = String(p.colour || "next ground").trim().toLowerCase().replace(/\s+/g, "-");
    const col = c === "next-ground" || c === "next" ? "var(--x-next-ground, var(--x-ink))"
      : c.startsWith("--x-") ? `var(${c})`
      : /^(accent|accent-2|accent-ink|ink|dim|good|bad|panel|panel-2|ground|device)$/.test(c) ? `var(--x-${c})` : "var(--x-next-ground, var(--x-ink))";
    const bez = ML.bezier(0.7, 0, 0.2, 1);
    // the pieces, in shares of the frame, laid out as if reading left to right (mirrored for Arabic)
    const colW = n === 2 ? 0.5 : 0.4;
    const rects = [{ x: 1 - colW, y: 0, w: colW, h: 1, from: "right" }];
    const rest = n - 1, rx = 0, rw = 1 - colW;
    if (rest <= 3) {
      for (let i = 0; i < rest; i++) rects.push({ x: rx, y: i / rest, w: rw, h: 1 / rest });
    } else {
      // two columns of slabs (the smaller squares), rows split as evenly as they go
      const left = Math.ceil(rest / 2), right = rest - left;
      for (let i = 0; i < left; i++) rects.push({ x: rx + rw / 2, y: i / left, w: rw / 2, h: 1 / left });
      for (let i = 0; i < right; i++) rects.push({ x: rx, y: i / right, w: rw / 2, h: 1 / right });
    }
    // each slab enters from its nearest frame edge: top / bottom slabs vertically by turns, the rest from the side
    rects.forEach((r, i) => {
      if (r.from) return;
      const top = r.y <= 0.001, bottom = r.y + r.h >= 0.999, leftEdge = r.x <= 0.001;
      r.from = top && (!bottom || i % 2) ? "top" : bottom && !top ? "bottom" : leftEdge ? "left" : i % 2 ? "top" : "bottom";
    });
    const layer = document.createElement("div");
    layer.setAttribute("aria-hidden", "true");
    layer.style.cssText = "position:absolute;inset:0;z-index:6;pointer-events:none;overflow:hidden;visibility:hidden";
    host.append(layer);
    const seam = 1; // px of overlap so no hairline of the old scene shows between two slabs
    const slabs = rects.map((r, i) => {
      const x = ctx.rtl ? 1 - r.x - r.w : r.x;
      const from = ctx.rtl ? (r.from === "right" ? "left" : r.from === "left" ? "right" : r.from) : r.from;
      const el = document.createElement("div");
      el.style.cssText = `position:absolute;left:${(x * W - seam).toFixed(1)}px;top:${(r.y * H - seam).toFixed(1)}px;width:${(r.w * W + seam * 2).toFixed(1)}px;height:${(r.h * H + seam * 2).toFixed(1)}px;background:${col}`;
      layer.append(el);
      // the distance to be fully off its edge
      const px = x * W, py = r.y * H;
      const off = from === "right" ? { x: W - px + seam, y: 0 } : from === "left" ? { x: -(px + r.w * W + seam), y: 0 } : from === "top" ? { x: 0, y: -(py + r.h * H + seam) } : { x: 0, y: H - py + seam };
      return { el, off, a: at + i * stg };
    });
    ctx.sfx(at, "whoosh.soft", 0.45);
    if (n >= 4) ctx.sfx(at + (n - 1) * stg, "whoosh.soft", 0.2);
    return {
      draw(t) {
        layer.style.visibility = t >= at ? "visible" : "hidden";
        if (t < at) return;
        for (const s of slabs) {
          const u = bez(ML.lin(t, s.a, s.a + 0.25));
          s.el.style.transform = `translate3d(${((1 - u) * s.off.x).toFixed(1)}px, ${((1 - u) * s.off.y).toFixed(1)}px, 0)`;
        }
      },
    };
  },
});

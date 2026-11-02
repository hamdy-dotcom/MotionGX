// Layered circle wipe: two or three discs share one centre — the frame's centre, an element, or a point off the frame
// past the lower end corner (110 %, 110 %; mirrored in RTL) — and grow from 0 to past the farthest corner over 0.55 s
// power3.inOut. The last disc (the next scene's ground) runs a fixed band behind the first (the colour), so a ring
// `band` px wide sweeps across on its edge; with three layers a thin sliver of a second colour leads ahead. Edges hard,
// no blur. When the last disc covers the frame the scene's content is cut away (the next scene plays on that ground).
// Colours: "look palette" = accent (+ accent-2 as the sliver) over the look's ground; or a comma list of look names /
// --x- variables, first the leading colour(s), last the covering ground.
// Source: prompt-motion shinskinakamoto-claude-opus-5-5-is + paulo-kombucha-i-played-with-the (reference only: our own
// rebuild).
ML.define({
  id: "transition.layered-circle-wipe",
  category: "transition",
  name: "Layered circle wipe",
  does: "Two or three concentric discs of different colours grow one just behind the other, so a coloured ring sweeps across before the new ground fills the frame.",
  says: ["transition", "playful", "energy"],
  energy: 4,
  targets: ["scene"],
  duration: [0.5, 0.8],
  params: {
    origin: { type: "choice", options: ["centre", "corner", "element"], default: "centre" },
    layers: { type: "number", range: [2, 3], default: 2 },
    band: { type: "number", range: [30, 140], default: 60, unit: "px" },
    colours: { type: "text", default: "look palette" },
    speed: { type: "number", range: [0.4, 0.8], default: 0.55, unit: "s" },
  },
  pairs: ["transition.colour-field-cut", "text-in.pop-in", "element.pop"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:shinskinakamoto-claude-opus-5-5-is", license: "reference", note: "with paulo-kombucha-i-played-with-the; our own rebuild" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const W = f.W, H = f.H, k = Math.min(W, H) / 1080, rtl = !!ctx.rtl;
    const n = Math.round(ML.clamp(+p.layers || 2, 2, 3));
    // the colours: leading (sliver, colour) ... covering ground last
    const NAMES = /^(accent|accent-2|accent-ink|ink|dim|panel|panel-2|ground|good|bad|device)$/;
    const asCol = (c) => (c.startsWith("--x-") ? `var(${c})` : NAMES.test(c) ? `var(--x-${c})` : null);
    let list = String(p.colours || "").split(",").map((s) => asCol(s.trim())).filter(Boolean);
    if (list.length < 2) list = n === 3 ? ["var(--x-accent-2)", "var(--x-accent)", "var(--x-ground)"] : ["var(--x-accent)", "var(--x-ground)"];
    while (list.length < n) list.unshift("var(--x-accent-2)");
    list = list.slice(-n);
    // the centre
    let C = { x: W / 2, y: H / 2 };
    if (p.origin === "corner") C = { x: rtl ? -0.1 * W : 1.1 * W, y: 1.1 * H };
    else if (p.origin === "element") {
      const own = ctx.el && ctx.el !== stage && ctx.el !== scene ? ctx.el : scene.querySelector("[data-slot-sample='logo'], .ml-title, [data-slot-sample='headline']");
      if (own) { const b = ctx.box(own); C = { x: b.x + b.w / 2, y: b.y + b.h / 2 }; }
    }
    const R = Math.hypot(Math.max(Math.abs(C.x), Math.abs(W - C.x)), Math.max(Math.abs(C.y), Math.abs(H - C.y))) + 2;
    const band = ML.clamp(+p.band || 60, 30, 140) * k, sliver = Math.max(6 * k, band * 0.3);
    // radii behind the lead: the covering disc a band behind the colour, the sliver a thin edge ahead of it
    const lag = n === 3 ? [0, sliver, sliver + band] : [0, band];
    const total = R + lag[lag.length - 1];
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:8;overflow:hidden;visibility:hidden";
    const discs = list.map((col, i) => {
      const d = document.createElement("div");
      d.style.cssText = `position:absolute;inset:0;background:${col};${i === list.length - 1 ? "background-image:var(--x-ground-image);" : ""}clip-path:circle(0px at ${C.x.toFixed(1)}px ${C.y.toFixed(1)}px)`;
      layer.append(d);
      return d;
    });
    stage.append(layer);
    const dur = ML.clamp(+p.speed || 0.55, 0.4, 0.8);
    const p3io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    ctx.sfx(at, "whoosh.soft", 0.45);
    return {
      draw(t) {
        if (t < at) { layer.style.visibility = "hidden"; scene.style.visibility = ""; return; }
        layer.style.visibility = "visible";
        const r = total * p3io(ML.lin(t, at, at + dur));
        let covered = false;
        discs.forEach((d, i) => {
          const ri = Math.max(0, r - lag[i]);
          d.style.clipPath = `circle(${ri.toFixed(2)}px at ${C.x.toFixed(1)}px ${C.y.toFixed(1)}px)`;
          if (i === discs.length - 1 && ri >= R) covered = true;
        });
        // the last disc has covered the frame: content cut to the next scene
        scene.style.visibility = covered ? "hidden" : "";
      },
    };
  },
});

// Progressive edge blur: one edge of the frame (or of a list / screen) melts into an ever stronger blur, so content
// sliding toward it softens away instead of being cut. Ported from MengTo's progressive-blur: an overlay box on the
// edge (height 8–65 %, pointer-events none) holding `steps` stacked layers (8 in the source: ::before, 6 divs, ::after)
// whose backdrop-filter blur doubles layer by layer up to max_blur (0.5, 1, 2 … 64 px), z-index 1…n; layer k masks a
// linear-gradient band three steps wide: 0 at s·k, 1 at s·(k+1) and s·(k+2), 0 at s·(k+3) (s = 100 / steps, 12.5 % for
// 8), the last layers clamped to 1 at 100 %. Direction: "to bottom" / "to top" / "to left" / "to right" toward the edge.
// It fades in over 0.4 s from `at` (its radii grow) and stays; it blurs what is behind it (backdrop), never a picture's own pixels.
// Source: MengTo/Skills agent-skills/web-design/progressive-blur (SKILL.md + demo, MIT).
ML.define({
  id: "mask.progressive-edge-blur",
  category: "mask",
  name: "Progressive edge blur",
  does: "One edge of the frame melts into an ever stronger blur, so content sliding toward it softens away instead of being cut.",
  says: ["focus", "calm", "flow"],
  energy: 1,
  targets: ["stage", "list", "screen"],
  duration: [1, 10],
  params: {
    edge: { type: "choice", options: ["bottom", "top", "left", "right"], default: "bottom" },
    height: { type: "number", range: [8, 65], default: 12, unit: "%" },
    max_blur: { type: "number", range: [16, 64], default: 64, unit: "px" },
    steps: { type: "number", range: [4, 8], default: 8 },
  },
  pairs: ["camera.horizontal-track", "element.card-rail-advance"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:agent-skills/web-design/progressive-blur", license: "MIT", note: "demo/index.html .progressive-blur layers and masks, generalised to 4–8 steps and four edges" },
  setup(ctx) {
    const { el, p, at, stage } = ctx;
    if (!el) return null;
    // on the stage the overlay rides on the scene (so it leaves with it); on a list or screen it sits inside it
    const host = el === stage ? ctx.scene || stage : el;
    if (host !== (ctx.scene || stage) && getComputedStyle(host).position === "static") host.style.position = "relative";
    const edge = ["bottom", "top", "left", "right"].includes(p.edge) ? p.edge : "bottom";
    const vertical = edge === "bottom" || edge === "top", n = Math.round(ML.clamp(+p.steps, 4, 8)), max = ML.clamp(+p.max_blur, 16, 64);
    const size = ML.clamp(+p.height, 8, 65), s = 100 / n;
    const box = document.createElement("div");
    box.style.cssText = `position:absolute;${edge}:0;${vertical ? `left:0;right:0;height:${size}%` : `top:0;bottom:0;width:${size}%`};pointer-events:none;z-index:5`;
    const layers = [];
    const dir = `to ${edge}`, pc = (v) => `${ML.clamp(v, 0, 100).toFixed(3)}%`;
    for (let k = 0; k < n; k++) {
      const layer = document.createElement("div");
      const blur = max / Math.pow(2, n - 1 - k);
      // the band: 0 at s·k, 1 at s·(k+1) … s·(k+2), 0 at s·(k+3); the last two clamp to 1 at the edge
      const stops = k >= n - 2
        ? `rgba(0,0,0,0) ${pc(s * k)}, rgba(0,0,0,1) ${pc(s * (k + 1))}, rgba(0,0,0,1) 100%`
        : `rgba(0,0,0,0) ${pc(s * k)}, rgba(0,0,0,1) ${pc(s * (k + 1))}, rgba(0,0,0,1) ${pc(s * (k + 2))}, rgba(0,0,0,0) ${pc(s * (k + 3))}`;
      const mask = `linear-gradient(${dir}, ${stops})`;
      layer.style.cssText = `position:absolute;inset:0;z-index:${k + 1};backdrop-filter:blur(${blur}px);-webkit-backdrop-filter:blur(${blur}px)`;
      layer.style.webkitMaskImage = mask; layer.style.maskImage = mask;
      box.append(layer);
      layers.push({ layer, blur });
    }
    host.append(box);
    return {
      draw(t) {
        const u = ML.ease(t, at, at + 0.4);
        // the fade-in runs on the radii: opacity on the box would make it a backdrop root and blank every layer
        box.style.visibility = u > 0 ? "visible" : "hidden";
        for (const { layer, blur } of layers) { const v = `blur(${(blur * u).toFixed(3)}px)`; layer.style.backdropFilter = v; layer.style.webkitBackdropFilter = v; }
      },
    };
  },
});

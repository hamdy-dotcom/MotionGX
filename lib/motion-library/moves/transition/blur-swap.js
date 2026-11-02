// Blur swap: product-film's default enter / leave for every act. Content enters `delay` (0.18 s) after the move starts —
// so a travelling element lands first and attention follows it — opacity 0 -> 1 linear over `ramp` (0.18 s) with
// blur((1 - v) x 10 px), and leaves over the last `out` (0.1 s) before the next move with the same ramp reversed; at
// value 0 it is not rendered at all. Scene / stage scope swaps every piece of the scene's content.
// Source: Rieranthony/product-film-skill templates/kit/move.ts swapIn + reference/engine.md (MIT).
ML.define({
  id: "transition.blur-swap",
  category: "transition",
  name: "Blur swap",
  does: "Scene content softly blurs into view just after a transition lands and blurs out just before the next one.",
  says: ["transition", "flow", "calm"],
  energy: 2,
  targets: ["headline", "card", "list", "label", "screen", "scene"],
  duration: [0.3, 0.8],
  params: {
    delay: { type: "number", range: [0, 0.4], default: 0.18, unit: "s" },
    ramp: { type: "number", range: [0.1, 0.4], default: 0.18, unit: "s" },
    out: { type: "number", range: [0.05, 0.3], default: 0.1, unit: "s" },
    blur: { type: "number", range: [4, 16], default: 10, unit: "px" },
    leave: { type: "bool", default: true },
  },
  pairs: ["transition.magic-move", "camera.push-in"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "product-film-skill:templates/kit/move.ts", license: "MIT", note: "swapIn; rules in reference/engine.md" },
  setup(ctx) {
    const { p, at, end, stage } = ctx;
    const scene = ctx.scene || stage;
    const whole = !ctx.el || ctx.el === stage || ctx.el === scene;
    const els = whole ? [...scene.children] : ctx.els.length ? ctx.els : [ctx.el];
    const delay = ML.clamp(p.delay, 0, 0.4), ramp = ML.clamp(p.ramp, 0.1, 0.4), outD = ML.clamp(p.out, 0.05, 0.3), blur = ML.clamp(p.blur, 4, 16);
    return {
      draw(t) {
        const e = ML.clamp((t - at - delay) / ramp), l = p.leave && Number.isFinite(end) ? ML.clamp((t - (end - outD)) / outD) : 0, v = e * (1 - l);
        for (const el of els) {
          el.style.visibility = v > 0 ? "visible" : "hidden";
          el.style.opacity = v.toFixed(4);
          el.style.filter = v < 1 && v > 0 ? `blur(${((1 - v) * blur).toFixed(2)}px)` : "none";
        }
      },
    };
  },
});

// Big type drift: an oversized headline keeps moving while it holds — a slow, linear vertical drift (up by default,
// 20–60 px, 36 px as shipped) across the whole scene, never sideways so it can't leave the safe area. On a hook it
// starts 0.9 s in and travels 40 px (delay 0.9, distance 40). Pure hold motion: it layers on top of any entrance (it
// moves the headline's `translate`, nothing else). Distances are in 1080-stage px, scaled to the stage's short side.
// Source: MotionGX's own live engine, lib/live-engine/worker/vendor/recipes.js (R.layout l-bigtype drift, R.hook).
ML.define({
  id: "kinetic.big-type-drift",
  category: "kinetic",
  name: "Big type drifts",
  does: "An oversized headline drifts slowly upward while it holds.",
  says: ["ambient", "story", "calm"],
  energy: 1,
  targets: ["headline"],
  duration: [2, 10],
  params: {
    distance: { type: "number", range: [20, 60], default: 36, unit: "px" },
    direction: { type: "choice", options: ["up", "down"], default: "up" },
    delay: { type: "number", range: [0, 1], default: 0, unit: "s" },
  },
  pairs: ["text-in.punchline", "kinetic.billboard-stair-headline", "camera.push-in"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "own:lib/live-engine/worker/vendor/recipes.js", license: "own", note: "R.layout l-bigtype drift and R.hook's late drift" },
  setup(ctx) {
    const { el, p, at, end, f } = ctx;
    if (!el) return null;
    const k = Math.min(f.W, f.H) / 1080;
    const dist = ML.clamp(p.distance, 20, 60) * k * (p.direction === "down" ? 1 : -1);
    const from = at + ML.clamp(p.delay, 0, 1);
    return {
      draw(t) {
        // linear ("none" ease) from the start of the hold to the end of the scene: a constant, calm drift
        const y = dist * ML.lin(t, from, Math.max(from + 0.5, end));
        el.style.translate = Math.abs(y) < 0.005 ? "none" : `0 ${y.toFixed(2)}px`;
      },
    };
  },
});

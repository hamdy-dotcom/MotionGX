// Punchline: big words landing one by one, each on its own spoken word (or on a steady stagger), blurring in from
// 16 px and rising 36 px on cubic-bezier(0.22, 1, 0.36, 1) in 0.3 s. Every word keeps its slot from the first frame
// (opacity, never removed), so a centred line never re-centres while it builds.
// Source: Rieranthony/product-film-skill, templates/kit/punchlines.tsx + reference/ingredients.md (MIT).
ML.define({
  id: "text-in.punchline",
  category: "text-in",
  name: "Punchline",
  does: "Big words land one by one on the voice, each blurring in and rising into its kept slot.",
  says: ["reveal", "arrival", "story", "energy"],
  energy: 3,
  targets: ["headline", "line"],
  duration: [0.8, 4],
  params: {
    sync: { type: "choice", options: ["spoken", "stagger"], default: "spoken" },
    stagger: { type: "number", range: [0.05, 0.3], default: 0.12, unit: "s" },
    blur: { type: "number", range: [0, 24], default: 16, unit: "px" },
    rise: { type: "number", range: [0, 80], default: 36, unit: "px" },
    land: { type: "number", range: [0.18, 0.6], default: 0.3, unit: "s" },
  },
  pairs: ["text-emphasis.accent-word", "camera.push-in"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "product-film-skill:templates/kit/punchlines.tsx", license: "MIT" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const words = ML.split(el, "words");
    // each word's landing time: on its spoken word when the voice says it, else a steady stagger from `at`
    const times = words.map((w, i) => (p.sync === "spoken" ? Math.max(at, ctx.word(w.textContent, at + i * p.stagger)) : at + i * p.stagger));
    for (let i = 1; i < times.length; i++) times[i] = Math.max(times[i], times[i - 1] + 0.06);
    times.forEach((t, i) => i % 2 === 0 && ctx.sfx(t, "tap", 0.25));
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.18);
        el.style.opacity = String(1 - leave);
        el.style.filter = leave > 0 ? `blur(${(leave * 12).toFixed(2)}px)` : "none";
        words.forEach((w, i) => {
          const u = ML.land(t, times[i], times[i] + p.land);
          w.style.opacity = u.toFixed(4);
          w.style.filter = u < 1 ? `blur(${((1 - u) * p.blur).toFixed(2)}px)` : "none";
          w.style.translate = `0 ${((1 - u) * p.rise - leave * 16).toFixed(2)}px`;
        });
      },
    };
  },
});

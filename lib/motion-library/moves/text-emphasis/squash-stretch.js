// Squash & stretch: once the word lands it flattens — scaleY 1 → 1 − amount, scaleX 1 → 1 + amount × 0.55 (0.22 →
// 0.78 / 1.12) — from its bottom centre (or its centre) over 0.12 s ease-in, then springs back to 1 / 1 on a spring of
// stiffness 300, damping 14 (~0.4 s, a little overshoot past round). With pre-stretch the word drops in from above
// on the way, stretched tall and thin (scaleY 1 + amount × 0.7, scaleX 1 − amount × 0.36 → 1.15 / 0.92), and the squash
// lands where it touches down. The lands on the target's first spoken word when the voice says it. 2D scale only.
// Source: prompt-motion:hanifproduktif-use-this-prompt-in (reference) — our own rebuild on ML.step (spring).
ML.define({
  id: "text-emphasis.squash-stretch",
  category: "text-emphasis",
  name: "Word squashes like a landing object",
  does: "Once the word lands it flattens wider and shorter for a beat and springs back, as if it had weight.",
  says: ["playful", "energy", "arrival"],
  energy: 4,
  targets: ["headline", "word", "logo"],
  duration: [0.4, 1],
  params: {
    amount: { type: "number", range: [0.1, 0.3], default: 0.22 },
    origin: { type: "choice", options: ["bottom", "centre"], default: "bottom" },
    "pre-stretch": { type: "bool", default: false },
    drop: { type: "number", range: [0.15, 0.4], default: 0.22, unit: "s" },
  },
  pairs: ["text-in.drop-in", "text-in.spring-up"],
  avoid: ["luxury", "calm", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "land",
  source: { from: "prompt-motion:hanifproduktif-use-this-prompt-in", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at } = ctx;
    if (!el) return null;
    const isSvg = el instanceof SVGElement;
    let core = el;
    if (!isSvg) {
      core = document.createElement("span");
      Object.assign(core.style, { display: "inline-block", maxWidth: "100%" });
      while (el.firstChild) core.append(el.firstChild);
      el.append(core);
    }
    core.style.transformOrigin = p.origin === "centre" ? "50% 50%" : "50% 100%";
    if (isSvg) core.style.transformBox = "fill-box";
    const h = isSvg ? ctx.box(el).h : core.offsetHeight || 100;
    const a = ML.clamp(p.amount, 0.1, 0.3);
    const pre = p["pre-stretch"];
    // touch-down: on the spoken word (if the voice says it soon), else at `at` (+ the drop when it falls in)
    const first = (el.textContent || "").trim().split(/\s+/)[0] || "";
    const L = Math.max(at + (pre ? p.drop : 0), Math.min(ctx.word(first, at + (pre ? p.drop : 0)), ctx.end - 0.5));
    const S0 = L, S1 = L + 0.12;
    ctx.sfx(L, "land", 0.5);
    const ein = (x) => x * x * x;
    return {
      draw(t) {
        let sx = 1, sy = 1, ty = 0, o = 1;
        if (pre) {
          const a0 = L - p.drop;
          if (t < a0) o = 0;
          else if (t < L) {
            const u = ML.lin(t, a0, L), g = u * u; // falling: accelerates into the floor
            ty = -(1 - g) * h * 1.6;
            const s = ML.clamp(u * 3); // stretches as it gains speed
            sy = 1 + a * 0.7 * s; sx = 1 - a * 0.36 * s;
            o = Math.min(1, u * 4);
          }
        }
        if (t >= S0) {
          if (t < S1) {
            const u = ein(ML.lin(t, S0, S1)), fy = pre ? 1 + a * 0.7 : 1, fx = pre ? 1 - a * 0.36 : 1;
            sy = fy + (1 - a - fy) * u; sx = fx + (1 + a * 0.55 - fx) * u;
          } else {
            const k = ML.step(t - S1, { stiffness: 300, damping: 14 });
            sy = 1 - a + a * k; sx = 1 + a * 0.55 - a * 0.55 * k;
          }
        }
        core.style.opacity = o.toFixed(4);
        core.style.translate = ty ? `0 ${ty.toFixed(2)}px` : "none";
        core.style.scale = sx === 1 && sy === 1 ? "none" : `${sx.toFixed(4)} ${sy.toFixed(4)}`;
      },
    };
  },
});

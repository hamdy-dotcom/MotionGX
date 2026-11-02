// 3D letter flip-in: giant letters swing in from a strong perspective tilt (rotateY 70deg + rotateX 20deg under an
// 800px perspective), shadow-dark at first, then flatten to 0 and take their true ink — 0.4 s power3.out, 0.05 s
// stagger. Each letter carries its own perspective so the tilt reads per glyph; the slot itself never moves. The
// reference's 1.2 → 1 scale is dropped: nothing is scaled above 1 under a 3D transform (it would soften the glyphs),
// the tilt alone gives the depth. Axis x swings the letters down from above instead of in from the side. Latin only
// (a letter flip needs letters; Arabic letters join).
// Source: prompt-motion safarkhanshuvo "this is insane claude" (reference only — our own code).
ML.define({
  id: "text-in.3d-letter-flip-in",
  category: "text-in",
  name: "Letters flip in with 3D perspective",
  does: "Giant letters swing in from a strong perspective tilt, dark shadow-coloured, then flatten.",
  says: ["energy", "arrival"],
  energy: 4,
  targets: ["word", "headline"],
  duration: [0.5, 1.2],
  params: {
    axis: { type: "choice", options: ["y", "x"], default: "y" },
    stagger: { type: "number", range: [0.02, 0.1], default: 0.05, unit: "s" },
    angle: { type: "number", range: [40, 90], default: 70, unit: "deg" },
    tilt: { type: "number", range: [0, 35], default: 20, unit: "deg" },
    perspective: { type: "number", range: [400, 1600], default: 800, unit: "px" },
    land: { type: "number", range: [0.25, 0.7], default: 0.4, unit: "s" },
    shade: { type: "number", range: [0, 1], default: 0.75 },
  },
  pairs: ["text-emphasis.accent-word", "camera.push-in"],
  avoid: ["calm", "luxury"],
  rtl: false,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:safarkhanshuvo-this-is-insane-claude", license: "reference", note: "our own rebuild; scale 1.2 dropped for sharpness under 3D" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const letters = ML.split(el, "chars");
    if (!letters.length) return null;
    const fs = parseFloat(getComputedStyle(el).fontSize) || 100;
    // perspective scaled to the type: the reference's 800px is for 400px letters
    const persp = (p.perspective * Math.max(0.35, fs / 400)).toFixed(1);
    letters.forEach((l) => { l.style.transformOrigin = p.axis === "x" ? "50% 0%" : "0% 50%"; l.style.backfaceVisibility = "hidden"; });
    const times = letters.map((_, i) => at + i * p.stagger);
    ctx.sfx(at, "whoosh.soft", 0.4);
    ctx.sfx(times[times.length - 1] + p.land * 0.5, "land.light", 0.25);
    const shade = `color-mix(in srgb, var(--x-accent) 25%, var(--x-device))`;
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.18);
        el.style.opacity = (1 - leave).toFixed(4);
        letters.forEach((l, i) => {
          const u = ML.out(t, times[i], times[i] + p.land);
          if (t < times[i]) { l.style.opacity = "0"; l.style.transform = "none"; return; }
          l.style.opacity = Math.min(1, ML.lin(t, times[i], times[i] + p.land * 0.35)).toFixed(4);
          const a = (1 - u) * p.angle, b = (1 - u) * p.tilt;
          l.style.transform = u >= 1 ? "none" : p.axis === "x"
            ? `perspective(${persp}px) rotateX(${a.toFixed(2)}deg) rotateY(${(-b).toFixed(2)}deg)`
            : `perspective(${persp}px) rotateY(${a.toFixed(2)}deg) rotateX(${b.toFixed(2)}deg)`;
          const k = ML.clamp(1 - ML.lin(t, times[i] + p.land * 0.3, times[i] + p.land)) * p.shade;
          l.style.color = k > 0.002 ? `color-mix(in srgb, ${shade} ${(k * 100).toFixed(1)}%, currentColor)` : "";
        });
      },
    };
  },
});

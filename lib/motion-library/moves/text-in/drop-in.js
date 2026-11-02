// Drop in: letters (Latin) or whole words (always for Arabic: ML.split keeps joined words whole) fall in from above
// with weight — tilted, smeared vertically while fast — and land with the chosen ease: expo / power4 slam, back
// overshoot below the baseline, a physical bounce with diminishing rebounds, elastic, or a closed-form spring. On
// impact they squash (scaleY down, scaleX up) and spring back. Options: a top mask, a final unit (period / i-dot) that
// drops separately in an arc with two small bounces, and heavy words going grey → ink after landing.
// Source: prompt-motion drop-in family (12 references, e.g. crazyalphaaa-wtf-made-with-claude) — our own rebuild.
ML.define({
  id: "text-in.drop-in",
  category: "text-in",
  name: "Drop in",
  does: "Letters or heavy words fall in from above with weight — motion-blurred, tumbling or tilted — and bounce or squash as they land in place.",
  says: ["playful", "energy", "arrival", "speed", "brand"],
  energy: 4,
  targets: ["word", "headline", "logo"],
  duration: [0.6, 2.5],
  params: {
    split: { type: "choice", options: ["letters", "words"], default: "letters" },
    height: { type: "number", range: [20, 400], default: 120, unit: "px" },
    rotation: { type: "number", range: [0, 40], default: 12, unit: "deg" },
    ease: { type: "choice", options: ["expo.out", "back.out", "bounce.out", "elastic.out", "spring", "power4.out"], default: "back.out" },
    bounces: { type: "number", range: [0, 3], default: 1 },
    blur: { type: "number", range: [0, 14], default: 6, unit: "px" },
    squash: { type: "bool", default: true },
    stagger: { type: "number", range: [0.04, 0.2], default: 0.05, unit: "s" },
    duration: { type: "number", range: [0.12, 0.7], default: 0.4, unit: "s" },
    mask: { type: "bool", default: false },
    dot: { type: "bool", default: false },
    tone: { type: "choice", options: ["none", "grey-to-ink"], default: "none" },
  },
  pairs: ["camera.shake", "text-emphasis.accent-word"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "land",
  source: { from: "prompt-motion:crazyalphaaa-wtf-made-with-claude", license: "reference", note: "our own rebuild of the drop-in family" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const units = ML.split(el, p.split === "letters" ? "chars" : "words");
    if (!units.length) return null;
    const n = units.length, D = p.duration;
    const nb = Math.round(p.bounces);
    // a physical bounce: fall (power2.in), then nb rebounds with restitution e; returns progress (1 = on the ground)
    const bounceOf = (x, k) => {
      const e = 0.42, segs = [1]; for (let i = 0; i < k; i++) segs.push(2 * Math.pow(e, i + 1));
      const total = segs.reduce((a, b) => a + b, 0); let tau = x * total;
      if (tau <= 1) return tau * tau;
      tau -= 1;
      for (let i = 1; i < segs.length; i++) { const d = segs[i]; if (tau <= d) { const h = Math.pow(e, 2 * i), c = (tau - d / 2) / (d / 2); return 1 - h * (1 - c * c); } tau -= d; }
      return 1;
    };
    const firstContact = (k) => { const e = 0.42; let total = 1; for (let i = 0; i < k; i++) total += 2 * Math.pow(e, i + 1); return 1 / total; };
    const curves = {
      "expo.out": [(x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)), 0.3],
      "power4.out": [(x) => 1 - Math.pow(1 - x, 4), 0.4],
      "back.out": [(x) => { const c = 1.7, y = x - 1; return 1 + (c + 1) * y * y * y + c * y * y; }, 0.42],
      "elastic.out": [(x) => (x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1), 0.22],
      "bounce.out": [(x) => bounceOf(x, nb), firstContact(nb)],
    };
    const spring = { stiffness: 260, damping: 15 };
    // the (possibly overshooting) landing progress of a unit started at s
    const isDot = (i) => p.dot && i === n - 1;
    const prog = (t, s, i) => {
      if (t <= s) return 0;
      if (isDot(i)) return bounceOf(ML.clamp((t - s) / Math.max(0.6, D)), 2);
      if (p.ease === "spring") return ML.step(t - s, spring);
      return curves[p.ease][0](ML.clamp((t - s) / D));
    };
    const starts = units.map((_, i) => at + i * p.stagger + (isDot(i) ? 0.15 : 0));
    const impact = units.map((_, i) => {
      if (isDot(i)) return starts[i] + Math.max(0.6, D) * firstContact(2);
      if (p.ease === "spring") return starts[i] + 0.12;
      return starts[i] + D * curves[p.ease][1];
    });
    const lastLand = Math.max(...impact) + Math.max(0.6, D);
    const seed = units.map((_, i) => ({ rot: (ML.rnd(i, 3) < 0.5 ? -1 : 1) * p.rotation * (0.4 + 0.6 * ML.rnd(i, 4)), h: p.height * (0.85 + 0.3 * ML.rnd(i, 5)) }));
    const dir = rtl ? -1 : 1;
    // one landing sound per word (the word's last unit), not per letter
    const wordOf = units.map((u) => u.closest(".ml-w") || u);
    units.forEach((u, i) => { if (i === n - 1 || wordOf[i + 1] !== wordOf[i]) ctx.sfx(impact[i], isDot(i) ? "tap" : "land", 0.32); });
    for (const u of units) u.style.transformOrigin = "50% 100%";
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.18);
        el.style.opacity = String(1 - leave);
        el.style.clipPath = p.mask && t < lastLand ? "polygon(-50% -6%, 150% -6%, 150% 160%, -50% 160%)" : "none";
        units.forEach((u, i) => {
          const s = starts[i], q = prog(t, s, i);
          if (t < s) { u.style.opacity = "0"; u.style.translate = `0 ${(-seed[i].h).toFixed(2)}px`; u.style.rotate = "none"; u.style.scale = "none"; u.style.filter = "none"; u.style.color = ""; return; }
          const v = Math.abs(prog(t + 0.008, s, i) - prog(t - 0.008, s, i)) / 0.016; // landing speed (progress / s)
          const fast = ML.clamp((v * seed[i].h) / 2000);
          const y = -(1 - q) * seed[i].h;
          const x = isDot(i) ? (1 - ML.clamp((t - s) / Math.max(0.6, D))) * 0.6 * seed[i].h * dir : 0;
          let sx = 1, sy = 1;
          if (p.squash) {
            const k = t >= impact[i] ? Math.exp(-(t - impact[i]) / 0.09) * Math.cos((t - impact[i]) * 26) : 0;
            const stretch = t < impact[i] ? 0.3 * fast : 0;
            sy = 1 - 0.18 * k + stretch; sx = 1 + 0.15 * k - stretch * 0.4;
          }
          u.style.opacity = (p.mask ? 1 : ML.clamp((t - s) / Math.max(0.05, D * 0.15))).toFixed(4);
          u.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
          u.style.rotate = `${(seed[i].rot * (1 - ML.clamp(q))).toFixed(3)}deg`;
          u.style.scale = sx === 1 && sy === 1 ? "none" : `${sx.toFixed(4)} ${sy.toFixed(4)}`;
          const b = p.blur * fast;
          u.style.filter = b > 0.15 ? `blur(${b.toFixed(2)}px)` : "none";
          if (p.tone === "grey-to-ink") { const c = ML.lin(t, impact[i], impact[i] + 0.3); u.style.color = c >= 1 ? "" : `color-mix(in srgb, var(--x-ink) ${(c * 100).toFixed(1)}%, var(--x-dim))`; }
          else u.style.color = "";
        });
      },
    };
  },
});

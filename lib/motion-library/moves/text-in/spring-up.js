// Spring up: glyphs (or words) pop up off the baseline one after another on back.out(overshoot), y distance% of
// their own height → 0, opacity 0 → 1, a short stagger so the last ones are mid-air while the first settle.
// Flavours, all params: a line mask (rise out of the baseline), a starting tilt that straightens (origin bottom on the
// leading side), jelly squash (scaleY .3 → 1.25 → 1, scaleX 1.3 → .9 → 1, seeded ±12° and amplitude .8–1.3×),
// a wave (explicit 40 → −6 → 0 overshoot, a sine baseline with ±3° tilt that stays, or words from alternating ±14px
// with a 3px blur), cycling accent colours and a hard 4px offset shadow. Exit: drop back through the mask, or blur.
// Arabic springs whole words (ML.split never cuts joined letters).
// Source: prompt-motion (slvdev, jasonzhou1993, hqmank, tequilafunks, buildfastwithai, grace-sunnyy, amol909s,
// imthatcarlos) — reference only, our own rebuild.
ML.define({
  id: "text-in.spring-up",
  category: "text-in",
  name: "Spring up",
  does: "Letters (or words) pop up off the baseline one after another with a springy overshoot, squash or tilt, then settle into a level word.",
  says: ["playful", "arrival", "brand", "energy"],
  energy: 3,
  targets: ["word", "headline", "logo", "line"],
  duration: [0.6, 2],
  params: {
    split: { type: "choice", options: ["letters", "words"], default: "letters" },
    distance: { type: "number", range: [14, 100], default: 60, unit: "%" },
    overshoot: { type: "number", range: [1.2, 2.6], default: 2, unit: "x" },
    stagger: { type: "number", range: [0.02, 0.35], default: 0.05, unit: "s" },
    duration: { type: "number", range: [0.3, 0.5], default: 0.4, unit: "s" },
    mask: { type: "bool", default: false },
    rotate: { type: "number", range: [0, 18], default: 0, unit: "deg" },
    squash: { type: "bool", default: false },
    wave: { type: "choice", options: ["none", "overshoot", "sine-baseline", "alternate"], default: "none" },
    colour_cycle: { type: "bool", default: false },
    shadow: { type: "bool", default: false },
    exit: { type: "choice", options: ["none", "drop", "blur"], default: "none" },
  },
  pairs: ["accent.confetti-burst", "text-emphasis.accent-word"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "prompt-motion:slvdev-opus-5-5-max-motion", license: "reference", note: "with jasonzhou1993, hqmank, tequilafunks, buildfastwithai, grace-sunnyy, amol909s, imthatcarlos; our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    // a logo that is a picture springs whole (text inside an svg cannot be split into spans)
    const pic = el.tagName === "IMG" || el instanceof SVGElement;
    const words = pic ? [el] : ML.split(el, p.split === "letters" ? "chars" : "words");
    // rising out of a mask needs to start fully below it
    const dist = p.mask ? Math.max(p.distance, 110) : p.distance;
    // with letters, a long line still lands inside its run: shorten the stagger to fit
    const n = Math.max(1, words.length);
    const stg = Math.min(p.stagger, Math.max(0.015, (end - at - p.duration - 0.5) / n));
    const COLORS = ["var(--x-ink)", "var(--x-accent)", "var(--x-accent-2)"];
    const g = words.map((w, i) => ({
      w, t0: at + i * stg, amp: p.squash ? 0.8 + ML.rnd(i + 1, 4.2) * 0.5 : 1,
      spin: p.squash ? (ML.rnd(i + 1, 8.8) * 2 - 1) * 12 : 0,
      rest: p.wave === "sine-baseline" ? Math.sin(i * 0.6) : 0,
      tilt: p.wave === "sine-baseline" ? (ML.rnd(i + 1, 2.7) * 2 - 1) * 3 : 0,
      alt: i % 2 ? -1 : 1, px: parseFloat(getComputedStyle(w).fontSize) / 100 || 1,
    }));
    // the mask must not move with what it masks: letters use their word as the mask, a whole word or picture gets a holder
    if (p.mask) for (const m of new Set(words.map((w) => {
      if (w.parentElement.classList.contains("ml-w")) return w.parentElement;
      const hold = document.createElement("span");
      hold.style.display = "inline-block";
      if (pic) hold.style.width = ctx.box(w).w.toFixed(2) + "px";
      w.replaceWith(hold); hold.append(w);
      return hold;
    }))) m.style.clipPath = "inset(-60% -30% -8% -30%)";
    for (const x of g) {
      x.w.style.transformOrigin = p.rotate ? (rtl ? "100% 100%" : "0 100%") : "50% 100%";
      const c = g.indexOf(x) % COLORS.length;
      if (p.colour_cycle) x.w.style.color = COLORS[c];
      // the hard shadow always contrasts with its own glyph
      if (p.shadow) x.w.style.textShadow = `0.04em 0.04em 0 ${p.colour_cycle && c ? "var(--x-ink)" : "var(--x-accent)"}`;
    }
    const beat = Math.max(1, Math.round(0.25 / stg));
    g.forEach((x, i) => i % beat === 0 && ctx.sfx(x.t0 + p.duration * 0.35, "pop.soft", 0.22));
    const exitAt = p.exit === "none" ? Infinity : end - 0.3 - Math.min(0.03 * n, 0.3);
    if (p.exit !== "none") ctx.sfx(exitAt, "whoosh.soft", 0.2);
    return {
      draw(t) {
        g.forEach((x, i) => {
          const d = p.duration, a = x.t0, b = a + d;
          const u = ML.lin(t, a, b);
          let y, altPx = 0, sx = 1, sy = 1, rot = 0, blur = 0, op = ML.clamp((t - a) / (d * 0.3));
          if (p.wave === "overshoot") {
            // 40 → −6 → 0 (as shares of distance)
            y = u < 0.6 ? 1 - 1.15 * ML.out(u, 0, 0.6) : -0.15 * (1 - ML.ease(u, 0.6, 1));
          } else if (p.wave === "alternate") {
            const e = 1 - Math.pow(1 - u, 3);
            y = 0; altPx = x.alt * (1 - e) * 14 * x.px;
            blur = (1 - e) * 3;
          } else y = 1 - ML.back(t, a, b, p.overshoot);
          y *= dist * x.amp;
          if (p.rotate) rot = p.rotate * (rtl ? -1 : 1) * (1 - ML.out(t, a, a + d * 1.25));
          if (p.squash) {
            // jelly: .3 → 1.25 → 1 vertically, 1.3 → .9 → 1 horizontally
            sy = u < 0.45 ? 0.3 + 0.95 * ML.out(u, 0, 0.45) : 1.25 - 0.25 * ML.ease(u, 0.45, 1);
            sx = u < 0.45 ? 1.3 - 0.4 * ML.out(u, 0, 0.45) : 0.9 + 0.1 * ML.ease(u, 0.45, 1);
            rot += x.spin * (1 - ML.ease(u, 0, 1));
            if (t < a) { sy = 0.3; sx = 1.3; }
          }
          // the resting pose (a sine baseline keeps its gentle wave and tilt)
          const restY = x.rest * 6, restR = x.tilt;
          if (t >= exitAt) {
            const e = ML.ease(t, exitAt + i * Math.min(0.03, 0.3 / n), exitAt + i * Math.min(0.03, 0.3 / n) + 0.22);
            if (p.exit === "drop") y += e * 110;
            else blur += e * 10;
            op *= 1 - (p.exit === "blur" ? e : ML.clamp(e * 1.4));
          }
          x.w.style.opacity = op.toFixed(4);
          x.w.style.translate = `0 calc(${y.toFixed(2)}% + ${(restY * x.px + altPx).toFixed(2)}px)`;
          x.w.style.rotate = rot + restR ? `${(rot + restR).toFixed(2)}deg` : "none";
          x.w.style.scale = sx !== 1 || sy !== 1 ? `${sx.toFixed(4)} ${sy.toFixed(4)}` : "none";
          x.w.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
        });
      },
    };
  },
});

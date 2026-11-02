// Pop in: each letter (or word, or the whole thing) pops from nothing (or a seeded smaller scale) past an overshoot and
// back to 1 — a back-out landing in `duration` seconds, staggered — dropping a seeded y jitter and a seeded tilt that
// settles to a third on landing, then eases straight once everything has landed (or keeps the jitter). Styles:
// comic outline (ink stroke + hard offset shadow), stacked colour shadow (two offsets whose depth grows in as the
// letter settles, so the depth appears last), 3D extrusion (stacked 1 px copies shaded accent → accent-2 growing over
// 0.15 s while the letter stretches up 0 → 1.15 → 1) and a chunky outlined number (thick stroke under the fill, hard
// shadow). make_room: once landed, the whole thing shrinks and moves up to clear the stage below. spin_o: an O / 0 pops
// in last and turns once on its vertical axis (after its overshoot: nothing above scale 1 under 3D). A long line
// tightens its stagger to fit the run. Arabic pops per word with the same styling (its letters join), its shadows
// falling to the other side.
// Sources: prompt-motion ror-fly, sudo-kiran, shinskinakamoto, deebeeeff (reference only — our own rebuild).
ML.define({
  id: "text-in.pop-in",
  category: "text-in",
  name: "Pop in",
  does: "Chunky letters or a big number pop onto the page from nothing with a back-out overshoot, often with an outline and a stacked offset shadow that grows in last.",
  says: ["playful", "celebration", "energy", "brand", "arrival", "scale"],
  energy: 4,
  targets: ["headline", "word", "logo", "number"],
  duration: [0.5, 2],
  params: {
    split: { type: "choice", options: ["letters", "words", "whole"], default: "letters" },
    overshoot: { type: "number", range: [1.05, 1.2], default: 1.15, unit: "x" },
    from_scale: { type: "number", range: [0, 0.7], default: 0 },
    stagger: { type: "number", range: [0.04, 0.1], default: 0.07, unit: "s" },
    duration: { type: "number", range: [0.2, 0.45], default: 0.3, unit: "s" },
    jitter: { type: "number", range: [0, 20], default: 6, unit: "px" },
    rotation: { type: "number", range: [0, 10], default: 10, unit: "deg" },
    settle: { type: "choice", options: ["straight", "keep-jitter"], default: "straight" },
    style: { type: "choice", options: ["plain", "comic-outline", "stacked-shadow", "extrude", "outlined-number"], default: "plain" },
    depth: { type: "number", range: [0, 20], default: 6, unit: "px" },
    make_room: { type: "bool", default: false },
    spin_o: { type: "bool", default: false },
    seed: { type: "number", range: [1, 99], default: 3 },
  },
  pairs: ["text-emphasis.shake", "accent.impact-burst"],
  avoid: ["luxury", "calm", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "prompt-motion:ror-fly-opus-5-5-rendered-this", license: "reference", note: "also sudo-kiran-no-storyboard-no-detailed, shinskinakamoto-claude-opus-5-5-is, deebeeeff-gave-this-image-to; our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const S = p.seed, sx = rtl ? -1 : 1;
    const isText = !(el instanceof SVGElement) && el.tagName !== "IMG";
    let units;
    if (!isText || p.split === "whole") {
      if (isText) { const w = document.createElement("span"); w.style.display = "inline-block"; w.append(...el.childNodes); el.append(w); units = [w]; }
      else units = [el];
    } else units = ML.split(el, p.split === "letters" ? "chars" : "words");
    // a Latin word / number split into letters inside right-to-left text keeps its own left-to-right order
    for (const w of el.querySelectorAll(".ml-w")) if (!ML.ARABIC.test(w.textContent)) w.style.direction = "ltr";
    if (!units.length) return null;
    const fs = isText ? parseFloat(getComputedStyle(el).fontSize) || 100 : 100;
    const k = fs / 100; // style sizes are given for ~100 px type
    const D = p.depth * k;
    // fixed parts of the style (on the target; letters inherit)
    if (isText) {
      if (p.style === "comic-outline") { el.style.color = "var(--x-accent)"; el.style.webkitTextStroke = `${(2 * k).toFixed(2)}px var(--x-ink)`; el.style.paintOrder = "stroke fill"; }
      if (p.style === "outlined-number") { el.style.color = "var(--x-accent)"; el.style.webkitTextStroke = `${(fs * 0.06).toFixed(2)}px var(--x-ink)`; el.style.paintOrder = "stroke fill"; el.style.fontWeight = "900"; }
    }
    const shadow = (g) => {
      if (g <= 0.001 || !D) return "none";
      switch (p.style) {
        case "comic-outline": case "outlined-number": return `${(sx * D * g).toFixed(2)}px ${(D * g).toFixed(2)}px 0 var(--x-ink)`;
        case "stacked-shadow": return `${(sx * D * g * 0.5).toFixed(2)}px ${(D * g * 0.5).toFixed(2)}px 0 var(--x-accent-2), ${(sx * D * g).toFixed(2)}px ${(D * g).toFixed(2)}px 0 var(--x-accent)`;
        case "extrude": {
          const nL = Math.max(1, Math.round(D * 1.8 * g)), out = [];
          for (let i = 1; i <= nL; i++) out.push(`${(sx * i * 0.6).toFixed(1)}px ${(i * 0.6).toFixed(1)}px 0 color-mix(in srgb, var(--x-accent) ${Math.round(100 - (i / nL) * 100)}%, var(--x-accent-2))`);
          return out.join(", ");
        }
        default: return "none";
      }
    };
    const n = units.length;
    const stag = n > 1 ? Math.min(p.stagger, Math.max(0.012, (end - 0.35 - at - p.duration) / (n - 1))) : 0;
    // spin_o: the first O / 0 waits its turn until everything else has landed
    const spinner = p.spin_o && isText ? units.findIndex((u) => /^[Oo0]$/.test(u.textContent)) : -1;
    let seq = 0;
    const times = units.map((_, i) => (i === spinner ? 0 : at + seq++ * stag));
    if (spinner >= 0) times[spinner] = at + seq * stag;
    const landed = Math.max(...times) + p.duration;
    const elH = isText ? el.offsetHeight : 0;
    const seeds = units.map((_, i) => ({ y: (ML.rnd(i, S) * 2 - 1) * p.jitter * k, r: (ML.rnd(i, S + 1) * 2 - 1) * p.rotation, s0: p.from_scale > 0 ? Math.min(0.95, p.from_scale * (0.85 + 0.3 * ML.rnd(i, S + 2))) : 0 }));
    units.forEach((u) => (u.style.transformOrigin = "50% 65%"));
    const every = Math.max(1, Math.ceil(0.07 / (stag || 0.07))), maxSfx = 12;
    let c = 0; times.forEach((t0, i) => { if (i % every === 0 && c++ < maxSfx) ctx.sfx(t0, "pop", 0.3); });
    // scale: from → overshoot on a quick out (60% of the time), overshoot → 1 on a sine (the rest)
    const scaleAt = (x, s0) => (x <= 0 ? s0 : x < 0.6 ? s0 + (p.overshoot - s0) * (1 - Math.pow(1 - x / 0.6, 2)) : p.overshoot + (1 - p.overshoot) * (0.5 - 0.5 * Math.cos(Math.PI * ((x - 0.6) / 0.4))));
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        el.style.opacity = (1 - leave).toFixed(4);
        if (p.make_room && isText) {
          const m = ML.ease(t, landed + 0.35, landed + 0.85);
          el.style.scale = m > 0 ? (1 - 0.4 * m).toFixed(4) : "none";
          el.style.translate = m > 0 ? `0 ${(-0.45 * elH * m).toFixed(2)}px` : "none";
        }
        const straighten = p.settle === "straight" ? ML.ease(t, landed, landed + 0.3) : 0;
        units.forEach((u, i) => {
          const sd = seeds[i], x = ML.lin(t, times[i], times[i] + p.duration);
          const s = scaleAt(x, sd.s0);
          const on = sd.s0 > 0 ? ML.lin(t, times[i], times[i] + 0.08) : x > 0 ? 1 : 0;
          const y = sd.y * (1 - ML.out(t, times[i], times[i] + p.duration));
          const r = sd.r * (1 - 0.7 * ML.out(t, times[i], times[i] + p.duration)) * (1 - straighten);
          // a logo's one unit is el itself, so it carries the exit too
          u.style.opacity = (u === el ? on * (1 - leave) : on).toFixed(4);
          if (i === spinner) {
            const sp = ML.ease(t, times[i] + p.duration, times[i] + p.duration + 1.2);
            u.style.transform = sp > 0 && sp < 1 ? `perspective(${(fs * 8).toFixed(0)}px) rotateY(${(sp * 360).toFixed(2)}deg)` : "none";
          }
          u.style.translate = y ? `0 ${y.toFixed(2)}px` : "none";
          u.style.rotate = Math.abs(r) > 0.001 ? `${r.toFixed(3)}deg` : "none";
          // extrude stretches up (scaleY); the others scale evenly
          u.style.scale = s === 1 ? "none" : p.style === "extrude" ? `1 ${s.toFixed(4)}` : s.toFixed(4);
          if (isText) {
            const g = p.style === "extrude" ? ML.lin(t, times[i] + p.duration * 0.4, times[i] + p.duration * 0.4 + 0.15) : p.style === "stacked-shadow" ? ML.out(t, times[i] + p.duration * 0.5, times[i] + p.duration + 0.1) : ML.lin(t, times[i] + p.duration * 0.3, times[i] + p.duration);
            u.style.textShadow = shadow(g);
          }
        });
      },
    };
  },
});

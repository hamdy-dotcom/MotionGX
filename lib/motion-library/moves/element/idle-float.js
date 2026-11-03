// Idle float: settled objects keep moving a little, out of step with each other, so the frame never freezes. Closed
// form, so any frame can be drawn alone: y = −A·(0.5 − 0.5·cos(2π(t + i·offset)/P)) — the GSAP `y: -A, yoyo,
// sine.inOut` loop (the cloudy hero's widget −15 px / 4 s, the paper tag 4 px, the shield 6 px), phase-shifted per item.
//   bob       the yoyo float above
//   rock      bob + a rotation of ±(0.5–2)°, a quarter period behind
//   tilted    a panel held at perspective 1000, rotateY −10° rotateX 5°, with the book index's deep two-layer shadow,
//             and the bob adds +2° to both tilts (scaled down so nothing passes its own size under the 3D)
//   wander    x ±30 / y ±25 px to a seeded point and back, 2.4 s sine.inOut yoyo (studio scenes' chaos drift)
//   lift      y −16 px slowly over the rest of the scene
//   parallax  every item drifts up −18 − k·4 px to the scene's end, each at its own speed (studio gallery / wall)
// Items: the targets, or a list's children, each with its own seeded phase. Product UI never floats: give it devices.
// The motion fades in over 0.8 s from `at`, so a settled object starts moving without a jump.
// Source: MengTo/Skills blue-cloudy-clean-modern, book-serif-index, orange-clean-paper-saas, gsap demos (MIT) +
// MotionGX lib/studio-engine/assets/scenes.js (S.chaos, S.items, S.gallery, S.wall).
ML.define({
  id: "element.idle-float",
  category: "element",
  name: "Idle float",
  does: "Settled objects keep bobbing, rocking or drifting a little, out of step with each other, so the frame never freezes.",
  says: ["calm", "ambient", "playful", "tech", "focus"],
  energy: 1,
  targets: ["label", "card", "logo", "shape", "image", "screen"],
  duration: [2, 30],
  params: {
    mode: { type: "choice", options: ["bob", "rock", "tilted", "wander", "lift", "parallax"], default: "bob" },
    amplitude: { type: "number", range: [2, 60], default: 8, unit: "px" },
    period: { type: "number", range: [2, 8], default: 4, unit: "s" },
    rotation: { type: "number", range: [0, 2], default: 0, unit: "deg" },
    phase_offset: { type: "number", range: [0, 2], default: 1, unit: "s" },
  },
  pairs: ["element.pop-in", "element.hard-offset-shadow", "element.icon-constellation"],
  avoid: ["urgency", "speed"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:agent-skills/web-design/blue-cloudy-clean-modern/demo/index.html", license: "MIT", note: "with book-serif-index, orange-clean-paper-saas and gsap demo floats (MIT) and MotionGX scenes.js S.chaos / S.items / S.gallery / S.wall; rewritten as closed forms of t" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    let items = (ctx.els || []).filter((e) => e && e !== ctx.stage);
    // one container of several things (a list, a row of cards): each child floats on its own phase
    if (items.length === 1 && items[0].children.length >= 2 && !/^(svg|img|picture|video|canvas)$/i.test(items[0].tagName) && [...items[0].children].every((c) => c.offsetWidth > 0 && !c.matches(".ml-w, .ml-c, br"))) items = [...items[0].children];
    if (!items.length) return null;
    const k = Math.min(f.W, f.H) / 1080;
    const A = p.amplitude * Math.max(0.75, k);
    const P = p.period, dir = rtl ? -1 : 1;
    const seeds = items.map((e, i) => ({
      ph: i * p.phase_offset + ML.rnd(i, 3) * 0.35, // ~1 s between items, a little seeded play
      pk: P * (0.9 + ML.rnd(i, 5) * 0.2), // each item's own period
      sx: ML.rnd(i, 7) * 2 - 1, sy: ML.rnd(i, 11) * 2 - 1,
      sp: 1 + ML.rnd(i, 13) * 0.6,
    }));
    // tilted: the perspective and a scale that keeps the nearest edge at or under its own size
    const tilt = items.map((e) => {
      const w = e.offsetWidth || 100, h = e.offsetHeight || 100, per = Math.max(1000, 2.4 * Math.max(w, h));
      const rad = Math.PI / 180, zmax = Math.sin(12 * rad) * w / 2 + Math.sin(7 * rad) * h / 2;
      return { per, s: per / (per + zmax) };
    });
    if (p.mode === "tilted") items.forEach((e) => { e.style.boxShadow = `0 ${(41.8 * k).toFixed(1)}px ${(33.4 * k).toFixed(1)}px color-mix(in srgb, var(--x-ink) 8.6%, transparent), 0 ${(100 * k).toFixed(0)}px ${(80 * k).toFixed(0)}px color-mix(in srgb, var(--x-ink) 12%, transparent)`; });
    const yo = (t, per) => 0.5 - 0.5 * Math.cos((Math.PI * 2 * t) / per); // 0 → 1 → 0, sine.inOut yoyo
    return {
      draw(t) {
        const on = ML.ease(t, at, at + 0.8); // starts moving without a jump
        const tau = Math.max(0, t - at), span = Math.max(0.5, end - at);
        items.forEach((e, i) => {
          const s = seeds[i];
          let x = 0, y = 0, r = 0, tiltCss = "";
          if (p.mode === "bob" || p.mode === "rock" || p.mode === "tilted") {
            const u = yo(tau + s.ph, s.pk);
            y = -A * u;
            const rot = p.mode === "rock" ? Math.max(p.rotation, 1.2) : p.rotation;
            r = rot * Math.sin((Math.PI * 2 * (tau + s.ph - s.pk / 4)) / s.pk) * (i % 2 ? -1 : 1) * dir;
            if (p.mode === "tilted") {
              const T = tilt[i], b = u * 2;
              tiltCss = ` perspective(${T.per.toFixed(0)}px) rotateY(${(-10 * dir + b * dir).toFixed(3)}deg) rotateX(${(5 + b).toFixed(3)}deg) scale(${T.s.toFixed(4)})`;
            }
          } else if (p.mode === "wander") {
            const u = yo(tau + s.ph, P * 1.2); // at the default period: there in 2.4 s, back in 2.4 s
            x = s.sx * A * 3.75 * u; y = s.sy * A * 3.1 * u;
            r = p.rotation * s.sx * u;
          } else if (p.mode === "lift") {
            y = -2 * A * (0.5 - 0.5 * Math.cos(Math.PI * ML.clamp(tau / span)));
            r = p.rotation * ML.clamp(tau / span) * dir;
          } else {
            // parallax: each item at its own speed to the scene's end
            y = -(18 + i * 4) * (A / 8) * s.sp * ML.clamp(tau / span);
          }
          // on `transform`: an entrance on the same object (ML.show, pop-in) drives translate / scale, and the two add up
          e.style.transform = `translate(${(x * on).toFixed(2)}px, ${(y * on).toFixed(2)}px) rotate(${(r * on).toFixed(3)}deg)${tiltCss}`;
        });
      },
    };
  },
});

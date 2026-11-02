// Shake: the element rattles side to side (or up and down) — x "+=amplitude" over 0.05 s, yoyo, ease none, repeated
// 3 times (a recoil after a stamp lands, 10 px) up to 7 (chaos: everything targeted rattles together). Ported from
// MotionGX's studio scenes (S.chaos / S.price / S.items) onto a paused GSAP timeline seeked to t; the repeat count is
// kept odd so the yoyo always ends back at rest. In Arabic the first push goes the other way (the reading direction).
// Source: own — lib/studio-engine/assets/scenes.js (S.chaos, S.price, S.items).
ML.define({
  id: "text-emphasis.shake",
  category: "text-emphasis",
  name: "Rattle shake",
  does: "The element shakes quickly side to side — a short recoil after an impact or a long chaos rattle.",
  says: ["problem", "energy", "urgency"],
  energy: 4,
  targets: ["headline", "card", "list", "label", "word"],
  duration: [0.2, 0.8],
  params: {
    amplitude: { type: "number", range: [6, 14], default: 10, unit: "px" },
    repeats: { type: "number", range: [3, 7], default: 3 },
    axis: { type: "choice", options: ["x", "y"], default: "x" },
  },
  pairs: ["text-emphasis.sticker-slam", "text-emphasis.punch-slam"],
  avoid: ["calm", "luxury", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "own:lib/studio-engine/assets/scenes.js", license: "own", note: "S.chaos, S.price, S.items" },
  setup(ctx) {
    const { els, p, at, rtl } = ctx;
    const list = els.filter(Boolean);
    if (!list.length) return null;
    const rep = 2 * Math.floor(Math.round(ML.clamp(p.repeats, 3, 7)) / 2) + 1;
    const amp = ML.clamp(p.amplitude, 6, 14) * (p.axis === "x" && rtl ? -1 : 1);
    const prop = p.axis === "y" ? "y" : "x";
    // the source's tween, verbatim in shape: tl.to(chips, { x: "+=12", duration: 0.05, yoyo: true, repeat: 7, ease: "none" })
    const seek = ctx.gsapAt((tl) => { tl.set(list, { [prop]: 0 }, 0); tl.to(list, { [prop]: `+=${amp}`, duration: 0.05, yoyo: true, repeat: rep, ease: "none" }, 0); });
    ctx.sfx(at, "hit", 0.45);
    return { draw(t) { seek(t, at); } };
  },
});

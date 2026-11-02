// Retro pastel film grade: the photo takes a faded pastel film look — contrast .9, blacks lifted ~8%, sepia .15, a
// split tone (one tint in the shadows, its partner in the highlights), film grain at ~8% shifted every frame from a
// seed, a soft vignette — and a small vertical red seal (an outlined box with stacked text) fades into a corner in
// 0.3 s. The grade eases in over the look's motion seconds from `at` and stays. Grain: one seeded noise tile made in
// setup, its offset picked per film frame (24 fps) from ML.rnd, so the same t always shows the same grain. The
// split-tone pairs are the film stock's own toning (like its grain), not brand colours; the seal takes the look's red
// (--x-bad). RTL: the seal sits in the top-left corner (the reading end) and Arabic text is never letter-spaced.
// Source: prompt-motion listudio-tell-opus-5-5-prompt (reference only — our own rebuild of the grade).
ML.define({
  id: "photo.retro-film-grade",
  category: "photo",
  name: "Retro pastel film grade",
  does: "The photo takes a faded pastel film look with lifted blacks and grain, plus a small vertical red seal in the corner.",
  says: ["calm", "luxury", "story"],
  energy: 1,
  targets: ["image"],
  duration: [1, 20],
  params: {
    tint: { type: "choice", options: ["pink", "teal", "warm"], default: "pink" },
    grain: { type: "number", range: [0, 0.15], default: 0.08 },
    seal: { type: "bool", default: true },
    seal_text: { type: "text", default: "" },
  },
  pairs: ["camera.slow-push", "photo.settle-glint", "text-in.punchline"],
  avoid: ["urgency", "tech", "speed"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "prompt-motion:listudio-tell-opus-5-5-prompt", license: "reference", note: "the grade, grain and seal rebuilt as our own code; nothing copied" },
  setup(ctx) {
    const { el, p, at, rtl } = ctx;
    if (!el) return null;
    const grainA = ML.clamp(p.grain, 0, 0.15);

    // a box over the picture that holds the grade's layers (a wrapper takes the picture's place in the layout)
    const replaced = /^(img|video|canvas|svg|picture)$/i.test(el.tagName);
    const b = ctx.box(el);
    let host = el;
    const cs = getComputedStyle(el);
    if (replaced) {
      host = document.createElement("div");
      host.style.cssText = `position:relative;display:${cs.display === "inline" ? "inline-block" : cs.display};width:${b.w}px;height:${b.h}px;flex:${cs.flex};align-self:${cs.alignSelf};margin:${cs.margin};border-radius:${cs.borderRadius};overflow:hidden;isolation:isolate;line-height:0`;
      el.parentNode.insertBefore(host, el);
      host.append(el);
      el.style.width = "100%"; el.style.height = "100%"; el.style.margin = "0"; el.style.display = "block"; el.style.borderRadius = "0";
    } else { if (cs.position === "static") el.style.position = "relative"; el.style.isolation = "isolate"; }
    const layer = (css) => { const d = document.createElement("div"); d.style.cssText = "position:absolute;inset:0;pointer-events:none;border-radius:inherit;opacity:0;" + css; host.append(d); return d; };

    // split tone: shadows / highlights (oklch, soft pastel chroma)
    const TONES = {
      pink: ["oklch(0.55 0.09 200)", "oklch(0.86 0.09 355)"], // teal shadows, pink highlights
      teal: ["oklch(0.5 0.08 330)", "oklch(0.86 0.08 190)"], // mauve shadows, teal highlights
      warm: ["oklch(0.5 0.06 250)", "oklch(0.86 0.09 70)"], // cool shadows, warm cream highlights
    };
    const [toneLo, toneHi] = TONES[p.tint] || TONES.pink;
    // lifted blacks: the look's ground screened over at ~8% (black → ~8% grey, whites barely touched)
    const lift = layer("background:var(--x-ground);mix-blend-mode:screen");
    // split tone: the shadow tint lightens what is darker than it, the highlight tint colours the top through soft-light
    const lo = layer(`background:${toneLo};mix-blend-mode:lighten`);
    const hi = layer(`background:${toneHi};mix-blend-mode:soft-light`);
    // vignette: soft, the look's ink at the corners
    const vig = layer("background:radial-gradient(ellipse 75% 70% at 50% 50%, transparent 55%, color-mix(in srgb, var(--x-ink) 38%, transparent) 100%);mix-blend-mode:multiply");
    // grain: one seeded tile (luminance noise around mid grey), overlaid
    const T = 192, cv = document.createElement("canvas"); cv.width = cv.height = T;
    const g = cv.getContext("2d"), id = g.createImageData(T, T);
    for (let i = 0; i < T * T; i++) { const v = 128 + (ML.rnd(i, 11) + ML.rnd(i, 23) - 1) * 150; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = Math.max(0, Math.min(255, v)); id.data[i * 4 + 3] = 255; }
    g.putImageData(id, 0, 0);
    const grain = layer(`background-image:url(${cv.toDataURL("image/png")});background-size:${T}px ${T}px;mix-blend-mode:overlay;image-rendering:pixelated`);

    // the seal: a small vertical outlined box in the look's red, stacked text
    let seal = null;
    if (p.seal) {
      const text = (p.seal_text || "").trim() || (rtl ? "فيلم" : "FILM");
      const ar = ML.ARABIC.test(text);
      const sz = ML.clamp(Math.min(b.w, b.h) * 0.07, 11, 30);
      seal = document.createElement("div");
      seal.style.cssText = `position:absolute;top:${(sz * 0.9).toFixed(1)}px;${rtl ? "left" : "right"}:${(sz * 0.9).toFixed(1)}px;padding:${(sz * 0.45).toFixed(1)}px ${(sz * 0.3).toFixed(1)}px;border:max(1.5px, ${(sz * 0.09).toFixed(2)}px) solid var(--x-bad);color:var(--x-bad);font:var(--x-head-weight) ${sz.toFixed(1)}px/1 ${ar ? "var(--x-arabic)" : "var(--x-serif-font)"};writing-mode:vertical-rl;text-orientation:${ar ? "mixed" : "upright"};letter-spacing:${ar ? "0" : "0.12em"};opacity:0;pointer-events:none;line-height:1;white-space:nowrap`;
      seal.textContent = text;
      host.append(seal);
    }

    const dur = Math.max(0.3, ctx.look.dur || 0.55) * 1.4;
    const sealAt = at + dur * 0.6;

    return {
      draw(t) {
        const k = ML.ease(t, at, at + dur);
        // the film filters on the picture itself (never a blur): contrast .9, sepia .15, a touch less saturation
        el.style.filter = k > 0 ? `contrast(${(1 - 0.1 * k).toFixed(4)}) sepia(${(0.15 * k).toFixed(4)}) saturate(${(1 - 0.08 * k).toFixed(4)})` : "";
        lift.style.opacity = (0.08 * k).toFixed(4);
        lo.style.opacity = (0.22 * k).toFixed(4);
        hi.style.opacity = (0.6 * k).toFixed(4);
        vig.style.opacity = (0.9 * k).toFixed(4);
        // grain: a new seeded offset every film frame
        const fr = Math.floor(Math.max(0, t) * 24);
        grain.style.opacity = (grainA * k * 1.6).toFixed(4);
        grain.style.backgroundPosition = `${Math.floor(ML.rnd(fr, 3) * T)}px ${Math.floor(ML.rnd(fr, 7) * T)}px`;
        if (seal) seal.style.opacity = ML.ease(t, sealAt, sealAt + 0.3).toFixed(4);
      },
    };
  },
});

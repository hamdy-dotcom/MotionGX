// Caustic light dapples across an element: moving water-light ripples over a photo, card or product, brightening as
// it passes through a beam. The caustic is the source's lens form — the light through a rippled surface focuses where
// the surface map's Jacobian collapses: brightness = 1 / max(|det J|, 0.09) of the map x → x + s·∇h, h a sum of 7
// travelling waves at 29–71 rad/m in seven never-aligned directions, each moving at its own (deep-water, slowed)
// phase speed; only what rises above 1.35 lights, scaled by 0.45, so you see the bright web, not a wash. A warm white
// (0.95, 0.82, 0.58 of the look's panel white) with a 0.014 dispersion split (red and blue sampled a hair apart), or a
// cool white (0.75, 0.88, 1). The dapple form multiplies it by a soft shaft — a slanted beam that sweeps slowly
// across, so the light swells as the pattern passes through it. Hint ≈ the source's dry-surface weight, hero ≈ the
// under-water weight. Painted per frame from t on a canvas over the element (clipped to its corners) or the whole
// frame, screen-blended so it only ever adds light; the picture under it is never blurred or scaled.
// Source: MengTo/Skills game-combat/water-crystal-skill-vfx assets/tide-crystal.mjs (MIT; caustic lens spots, the
// shaft focus of 3d-underwater-god-rays' dapple) — ported from its shader to a seeded 2D canvas, a function of t.
ML.define({
  id: "accent.caustic-dapple",
  category: "accent",
  name: "Caustic light dapples across an element",
  does: "Moving water-light patterns ripple over a photo, card or product, brightening as it passes through a beam.",
  says: ["calm", "ambient", "luxury", "flow"],
  energy: 2,
  targets: ["image", "card", "logo", "screen", "scene"],
  duration: [2, 10],
  params: {
    tint: { type: "choice", options: ["warm", "cool"], default: "warm" },
    strength: { type: "choice", options: ["hint", "hero"], default: "hint" },
    scope: { type: "choice", options: ["one-element", "whole-frame"], default: "one-element" },
  },
  pairs: ["camera.slow-push", "accent.corner-brackets"],
  avoid: ["urgency", "energy", "problem"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:game-combat/water-crystal-skill-vfx", license: "MIT", note: "assets/tide-crystal.mjs caustic lens spots + the underwater dapple's shaft focus; ported to a seeded 2D canvas" },
  setup(ctx) {
    const { el, p, at, end, rtl, stage, f } = ctx;
    const doc = document;
    const whole = p.scope === "whole-frame" || !el || el === stage;
    const b = whole ? { x: 0, y: 0, w: f.W, h: f.H } : ctx.box(el);
    // the light layer: over the element (its own corners) or the frame
    const cv = doc.createElement("canvas");
    const radius = !whole ? getComputedStyle(el).borderRadius : "0";
    cv.style.cssText = `position:absolute;left:${b.x.toFixed(1)}px;top:${b.y.toFixed(1)}px;width:${b.w.toFixed(1)}px;height:${b.h.toFixed(1)}px;border-radius:${radius};pointer-events:none;z-index:${whole ? 26 : 24};mix-blend-mode:screen;visibility:hidden;will-change:opacity`;
    stage.append(cv);
    // a coarse field, drawn up to the box: the light is soft by nature (a picture under it is never touched)
    const cell = whole ? 6 : 4;
    const gw = Math.max(8, Math.ceil(b.w / cell)), gh = Math.max(8, Math.ceil(b.h / cell));
    const small = doc.createElement("canvas"); small.width = gw; small.height = gh;
    const sg = small.getContext("2d", { willReadFrequently: true });
    const img = sg.createImageData(gw, gh);
    cv.width = Math.round(b.w); cv.height = Math.round(b.h);
    const g = cv.getContext("2d", { willReadFrequently: true }); // software canvas: the same pixels every time
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";

    // the light's white: the look's panel colour, tinted warm or cool
    const probe = doc.createElement("span"); probe.style.color = "var(--x-panel)"; stage.append(probe);
    const m = getComputedStyle(probe).color.match(/[\d.]+/g) || ["255", "255", "255"]; probe.remove();
    const white = [+m[0], +m[1], +m[2]].map((v) => Math.max(v, 200)); // a light, even on a dark look's panel
    const tint = p.tint === "cool" ? [0.75, 0.88, 1] : [0.95, 0.82, 0.58];
    const disp = p.tint === "cool" ? 0 : 0.014;
    const gain = p.strength === "hero" ? 1 : 0.42;

    // seven waves, 29–71 rad/m, directions spread so no two align; the world: the box's long side is 1.4 m
    const metres = 1.4 / Math.max(gw, gh); // per field cell
    const K = [29, 36, 43, 50, 57, 64, 71];
    const W = K.map((k, i) => {
      const ang = (i * 2.399963 + ML.rnd(i, 3) * 0.4) % (2 * Math.PI); // the golden angle: never aligned
      const kc = k * metres;                                         // rad per cell
      const amp = 1.5 / (kc * kc * K.length);                        // curvature share: caustics form, never all at once
      return { kx: Math.cos(ang) * kc, ky: Math.sin(ang) * kc, amp, w: 0.55 * Math.sqrt(k / 29) * (ML.rnd(i, 9) < 0.5 ? -1 : 1), ph: ML.rnd(i, 5) * 6.283 };
    });
    // the beam: a soft slanted band sweeping across over the run (reading direction)
    const sweep = Math.max(2, end - at);
    const field = (x, y, t) => {
      let hxx = 0, hyy = 0, hxy = 0;
      for (const w of W) {
        const s = -w.amp * Math.sin(w.kx * x + w.ky * y - w.w * t + w.ph);
        hxx += s * w.kx * w.kx; hyy += s * w.ky * w.ky; hxy += s * w.kx * w.ky;
      }
      const det = (1 + hxx) * (1 + hyy) - hxy * hxy;
      const bright = 1 / Math.max(Math.abs(det), 0.09);
      return Math.max(0, bright - 1.35) * 0.45;
    };

    return {
      draw(t) {
        const leave = ML.ease(t, end - 0.5, end - 0.05);
        const fade = ML.ease(t, at, at + 0.7) * (1 - leave);
        const vis = t >= at - 1e-6 && fade > 0.001;
        cv.style.visibility = vis ? "visible" : "hidden";
        if (!vis) return;
        cv.style.opacity = fade.toFixed(4);
        const tt = t - at;
        const prog = ML.lin(t, at, at + sweep);
        const d = img.data;
        for (let j = 0; j < gh; j++) {
          for (let i = 0; i < gw; i++) {
            const x = i, y = j;
            // the shaft: a slanted band moving across (dapple brightens where it passes)
            const u2 = (rtl ? gw - x : x) / gw + (y / gh) * 0.35;
            const band = Math.exp(-Math.pow((u2 - (-0.25 + prog * 1.6)) / 0.32, 2));
            const shaft = 0.35 + 0.65 * band;
            let r, gg, bb;
            if (disp) {
              const dx = disp * gw * 0.08;
              r = field(x - dx, y, tt); gg = field(x, y, tt); bb = field(x + dx, y, tt);
            } else { gg = field(x, y, tt); r = bb = gg; }
            const k = shaft * gain;
            const o = (j * gw + i) * 4;
            const R = Math.min(1, r * k) * tint[0], G = Math.min(1, gg * k) * tint[1], B = Math.min(1, bb * k) * tint[2];
            d[o] = Math.round(white[0] * R); d[o + 1] = Math.round(white[1] * G); d[o + 2] = Math.round(white[2] * B);
            d[o + 3] = 255;
          }
        }
        sg.putImageData(img, 0, 0);
        g.clearRect(0, 0, cv.width, cv.height);
        g.drawImage(small, 0, 0, gw, gh, 0, 0, cv.width, cv.height);
      },
    };
  },
});

// Heat haze shimmer: the air above a hot source (or round a headline, or across the lower frame) ripples and wavers as
// if from heat. Ported from MengTo/Skills fire-smoke-skill-vfx (fire-fx.mjs, HAZE_FRAG): a Gaussian profile of hot air
// of radius R·(1.4 + 0.5·h/H) + a little, rising from 2% to 45% of 2.4·H above the source, carrying a fine shimmer
// noise sampled at (7, 4.5) per unit and rising 4.8 units / s, written as a signed screen offset of 0.0032 × haze.
// The page cannot sample its own pixels in a shader, so the pass is rebuilt as the deterministic SVG route the master
// notes allow: feTurbulence (fixed seed, fractal noise, finer across than up — the 7 : 4.5 ratio) scrolled upward by
// feOffset at the rising speed; two copies half a period apart cross-fade so the scroll never jumps (a pure function
// of t, no state); the noise is masked by the hot-air profile (an ellipse widening with height, softened by a blur
// in the filter — the blur is on the mask, never on a picture) over a neutral grey, so only that region moves; then
// feDisplacementMap offsets the scene's pixels by it. Strength: subtle ≈ 0.8% of the short side, strong ≈ 2%.
// "behind-text" makes a ring round the target headline's box that stays still inside it, so the words stay crisp.
// Source: MengTo/Skills game-combat/fire-smoke-skill-vfx/assets/fire-fx.mjs (MIT).
ML.define({
  id: "accent.heat-haze",
  category: "accent",
  name: "Heat haze shimmer",
  does: "The air above a hot source (or behind a headline) ripples and wavers as if from heat.",
  says: ["energy", "urgency", "ambient", "problem"],
  energy: 2,
  targets: ["scene", "headline", "image", "stage"],
  duration: [2, 10],
  params: {
    strength: { type: "choice", options: ["subtle", "strong"], default: "subtle" },
    region: { type: "choice", options: ["above-source", "whole-lower-frame", "behind-text"], default: "above-source" },
    rise: { type: "number", range: [0.5, 2], default: 1, unit: "x" },
  },
  pairs: ["background.ember-sparks", "text-in.punchline"],
  avoid: ["calm", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "MengTo/Skills:game-combat/fire-smoke-skill-vfx", license: "MIT", note: "HAZE_FRAG's hot-air profile + rising shimmer offset, rebuilt as a seekable SVG displacement pass" },
  setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const W = f.W, H = f.H, minSide = Math.min(W, H);
    const el = ctx.el && ctx.el !== stage ? ctx.el : null;
    const tb = el ? ctx.box(el) : null;
    // what gets distorted: the scene (all of it); the target only names where the heat is
    const victim = ctx.scene || stage;
    const id = "ml-haze-" + Math.round(ML.rnd(at * 97 + W, H) * 1e9);
    const sv = (tag, a, parent) => { const e = doc.createElementNS(NS, tag); for (const [kk, v] of Object.entries(a)) e.setAttribute(kk, String(v)); parent.append(e); return e; };
    const svg = sv("svg", { width: 0, height: 0, "aria-hidden": "true" }, stage);
    svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
    const defs = sv("defs", {}, svg);

    // ── the hot-air mask (white = hot), shapes in the scene's px ──
    const mg = sv("g", { id: id + "-m" }, defs);
    const grad = sv("radialGradient", { id: id + "-rg", cx: "50%", cy: "100%", r: "100%", fx: "50%", fy: "100%" }, defs);
    sv("stop", { offset: 0, "stop-color": "#fff" }, grad); sv("stop", { offset: 0.55, "stop-color": "#fff", "stop-opacity": 0.8 }, grad); sv("stop", { offset: 1, "stop-color": "#fff", "stop-opacity": 0 }, grad);
    sv("rect", { x: 0, y: 0, width: W, height: H, fill: "#000" }, mg);
    let blurMask = minSide * 0.03;
    if (p.region === "whole-lower-frame") {
      const lg = sv("linearGradient", { id: id + "-lg", x1: 0, y1: 1, x2: 0, y2: 0 }, defs);
      sv("stop", { offset: 0, "stop-color": "#fff" }, lg); sv("stop", { offset: 0.5, "stop-color": "#fff", "stop-opacity": 0 }, lg);
      sv("rect", { x: 0, y: 0, width: W, height: H, fill: `url(#${id}-lg)` }, mg);
    } else if (p.region === "behind-text") {
      // a band of hot air round the words, still inside them so they stay crisp
      const b = tb || f.head, pad = minSide * 0.09;
      sv("rect", { x: b.x - pad, y: b.y - pad, width: b.w + pad * 2, height: b.h + pad * 2, rx: pad, fill: "#fff" }, mg);
      sv("rect", { x: b.x - pad * 0.15, y: b.y - pad * 0.15, width: b.w + pad * 0.3, height: b.h + pad * 0.3, rx: pad * 0.3, fill: "#000" }, mg);
      blurMask = pad * 0.25;
    } else {
      // above a source: the target's top edge (or a source at the bottom centre of the frame); the column widens
      // with height (R·(1.4 + 0.5·h/H)) and rises to 45% of 2.4·H
      const src = tb ? { x: tb.x + tb.w / 2, y: tb.y + tb.h * 0.15, r: Math.max(tb.w * 0.3, minSide * 0.12), h: Math.max(tb.h, minSide * 0.2) } : { x: W / 2, y: H - f.safe.y * 0.4, r: minSide * 0.2, h: H * 0.22 };
      const top = Math.max(0, src.y - 2.4 * src.h * 0.45), Rt = src.r * (1.4 + 0.5 * 1.08) * 1.15, Rb = src.r * 1.4;
      sv("path", { d: `M${src.x - Rb} ${src.y} C${src.x - Rb} ${(src.y + top) / 2} ${src.x - Rt} ${top + (src.y - top) * 0.25} ${src.x} ${top} C${src.x + Rt} ${top + (src.y - top) * 0.25} ${src.x + Rb} ${(src.y + top) / 2} ${src.x + Rb} ${src.y} Z`, fill: `url(#${id}-rg)` }, mg);
      blurMask = src.r * 0.35;
    }

    // ── the filter ──
    const P = minSide * 0.6; // the scroll period (px): the two noise copies are P/2 apart
    const filt = sv("filter", { id, x: 0, y: 0, width: W, height: H, filterUnits: "userSpaceOnUse", primitiveUnits: "userSpaceOnUse", "color-interpolation-filters": "sRGB" }, defs);
    const fx = 0.011 * (1080 / minSide), fy = fx * (4.5 / 7); // finer across than up: 7 : 4.5
    const turb = (seed, res) => {
      sv("feTurbulence", { type: "fractalNoise", baseFrequency: `${fx.toFixed(5)} ${fy.toFixed(5)}`, numOctaves: 2, seed, x: 0, y: 0, width: W, height: H + P, result: res + "n" }, filt);
      return sv("feOffset", { in: res + "n", dx: 0, dy: 0, result: res }, filt);
    };
    const offA = turb(7, "a"), offB = turb(7, "b");
    const mixN = sv("feComposite", { in: "a", in2: "b", operator: "arithmetic", k1: 0, k2: 0.5, k3: 0.5, k4: 0, result: "mix" }, filt);
    sv("feColorMatrix", { in: "mix", type: "matrix", values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0 1", result: "noise" }, filt);
    sv("feImage", { href: `#${id}-m`, x: 0, y: 0, width: W, height: H, result: "maskRaw" }, filt);
    sv("feGaussianBlur", { in: "maskRaw", stdDeviation: blurMask.toFixed(1), result: "maskSoft" }, filt);
    // mask luminance → alpha
    sv("feColorMatrix", { in: "maskSoft", type: "matrix", values: "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0", result: "maskA" }, filt);
    sv("feComposite", { in: "noise", in2: "maskA", operator: "in", result: "hotNoise" }, filt);
    sv("feFlood", { "flood-color": "rgb(128,128,128)", "flood-opacity": 1, x: 0, y: 0, width: W, height: H, result: "grey" }, filt);
    sv("feComposite", { in: "hotNoise", in2: "grey", operator: "over", result: "map" }, filt);
    const disp = sv("feDisplacementMap", { in: "SourceGraphic", in2: "map", scale: 0, xChannelSelector: "R", yChannelSelector: "G" }, filt);

    const amp = (p.strength === "strong" ? 0.02 : 0.008) * minSide * 2.2; // map noise spans ~±0.25 → px offset
    const speed = 4.8 * (minSide / 1080) * 22 * ML.clamp(+p.rise || 1, 0.5, 2); // px / s upward
    ctx.sfx(at, "swell", 0.2);
    let applied = false;

    return {
      draw(t) {
        const on = t >= at - 1e-6 && t <= end + 0.05;
        const s = on ? ML.ease(t, at, at + 0.6) * (1 - ML.ease(t, end - 0.5, end)) : 0;
        if (s <= 0.001) { if (applied) { victim.style.filter = ""; applied = false; } return; }
        if (!applied) { victim.style.filter = `url(#${id})`; applied = true; }
        // two copies scrolling up, half a period apart, each weighted by a triangle so its wrap is never seen
        const ph = (((t - at) * speed) % P + P) % P, pa = ph / P, pb = ((ph + P / 2) % P) / P;
        offA.setAttribute("dy", (-ph).toFixed(2));
        offB.setAttribute("dy", (-((ph + P / 2) % P)).toFixed(2));
        const wa = 1 - Math.abs(2 * pa - 1), wb = 1 - Math.abs(2 * pb - 1), sum = wa + wb || 1;
        mixN.setAttribute("k2", (wa / sum).toFixed(4)); mixN.setAttribute("k3", (wb / sum).toFixed(4));
        disp.setAttribute("scale", (amp * s).toFixed(2));
      },
    };
  },
});

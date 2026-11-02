// Line boil: every edge of the target trembles like hand-drawn animation. Two displacement passes (an SVG filter on the
// target): a low-frequency warp that bends the whole drawing a little, then a fine fractal-noise roughening
// (baseFrequency 0.45, the ink-sketch "rough" filter) that frays each edge. The boil is the noise seed changing 8–12
// times a second, cycling four fixed seeds: seed = seeds[floor((t − at) · rate) % 4] — so the wobble is redrawn a few
// times a second and the same t always shows the same seed. Displacement only: nothing is blurred or enlarged.
// Source: MengTo/Skills agent-skills/illustration/illustration-ink-sketch (scripts/ink-kit.mjs "rough" filter, MIT).
ML.define({
  id: "photo.line-boil",
  category: "photo",
  name: "Hand-drawn line boil",
  does: "Every edge in the picture trembles slightly like hand-drawn animation, the wobble redrawn a few times a second.",
  says: ["playful", "story", "energy"],
  energy: 2,
  targets: ["image", "logo", "headline", "shape", "scene"],
  duration: [1, 20],
  params: {
    rate: { type: "number", range: [6, 12], default: 10, unit: "fps" },
    strength: { type: "choice", options: ["subtle", "sketchy"], default: "subtle" },
  },
  pairs: ["photo.mono-ramp-tint", "text-in.ink-wick"],
  avoid: ["luxury", "precision"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:agent-skills/illustration/illustration-ink-sketch", license: "MIT", note: "the rough filter (feTurbulence 0.45 + feDisplacementMap) plus a low-frequency warp, its seed cycled per frame for the boil" },
  setup(ctx) {
    const { el, p, at, end, stage } = ctx;
    if (!el) return null;
    const NS = "http://www.w3.org/2000/svg";
    const uid = "mlboil" + (window.__mlBoilN = (window.__mlBoilN || 0) + 1); // one filter set per instance (setup order)
    // the source's scales were drawn for a 480 px card; ours are about twice that, so the scales are doubled
    const [warp, rough] = p.strength === "sketchy" ? [9, 3.2] : [4.6, 1.5];
    // the warp runs at a frequency relative to the target, so a small logo and a full scene wobble alike
    const b = ctx.box(el), size = Math.max(80, Math.min(b.w || 400, b.h || 400));
    const warpFreq = (2.4 / size).toFixed(5);
    const SEEDS = [3, 17, 29, 41];
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.setAttribute("aria-hidden", "true");
    svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
    const filters = SEEDS.map((s, k) => {
      const f = document.createElementNS(NS, "filter");
      f.setAttribute("id", `${uid}-${k}`);
      for (const [a, v] of [["x", "-4%"], ["y", "-4%"], ["width", "108%"], ["height", "108%"], ["color-interpolation-filters", "sRGB"]]) f.setAttribute(a, v);
      f.innerHTML = `<feTurbulence type="fractalNoise" baseFrequency="${warpFreq}" numOctaves="2" seed="${s}" result="w"/>` +
        `<feDisplacementMap in="SourceGraphic" in2="w" scale="0" xChannelSelector="R" yChannelSelector="G" result="a"/>` +
        `<feTurbulence type="fractalNoise" baseFrequency="0.45" numOctaves="1" seed="${s + 7}" result="n"/>` +
        `<feDisplacementMap in="a" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G"/>`;
      svg.append(f);
      return { warp: f.children[1], rough: f.children[3] };
    });
    stage.append(svg);
    ctx.sfx(at, "tap", 0.18);
    const fade = 0.3;
    return {
      draw(t) {
        // strength comes in over 0.3 s and goes before the end, so the boil starts and stops cleanly
        const amt = ML.ease(t, at, at + fade) * (1 - ML.ease(t, end - fade, end));
        if (amt <= 0.001) { el.style.filter = "none"; return; }
        const k = ((Math.floor(Math.max(0, t - at) * p.rate) % SEEDS.length) + SEEDS.length) % SEEDS.length;
        const f = filters[k];
        f.warp.setAttribute("scale", (warp * amt).toFixed(3));
        f.rough.setAttribute("scale", (rough * amt).toFixed(3));
        el.style.filter = `url(#${uid}-${k})`;
      },
    };
  },
});

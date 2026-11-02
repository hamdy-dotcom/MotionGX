// Single-hue ramp tint: the target is recoloured entirely from one hue ramp. An SVG filter takes its luminance
// (feColorMatrix saturate 0) and maps it through a 5–7 stop single-hue table (feComponentTransfer, sRGB): the darkest
// tones land on the ramp's deep outline shade, the lightest on its paper tint — the isometric-mono palette (#fbf8f1,
// #c9f3d6, #8de8a6, #5cc58a, #2f9e6c, #0b4a3a, outline #0f3d30) rebuilt around the look's accent (or any hue given).
// It arrives as a cross-fade from the original (feComposite arithmetic, k2 = 1 − u, k3 = u, set from t), and a soft
// same-hue light pool settles under the subject (drop-shadow offset 4, blur 4, .2). No blur on the picture itself.
// Source: MengTo/Skills agent-skills/illustration/illustration-isometric-mono (scripts/iso.mjs ramp + shade-by-face, MIT).
ML.define({
  id: "photo.mono-ramp-tint",
  category: "photo",
  name: "Single-hue ramp tint",
  does: "An image or icon set is recoloured entirely from one hue ramp, giving a calm monochrome technical look.",
  says: ["tech", "precision", "calm", "brand"],
  energy: 1,
  targets: ["image", "screen", "logo", "chart"],
  duration: [1, 20],
  params: {
    hue: { type: "text", default: "brand accent" },
    stops: { type: "number", range: [5, 7], default: 7 },
  },
  pairs: ["photo.line-boil", "photo.molded-mount"],
  avoid: ["celebration", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/illustration/illustration-isometric-mono", license: "MIT", note: "the 7-stop single-hue ramp and its light pool, applied as a luminance → ramp table filter" },
  setup(ctx) {
    const { el, p, at, end, stage } = ctx;
    if (!el) return null;
    const host = el.tagName === "IMG" || el instanceof SVGElement ? el.parentElement : el;
    // a look colour (or a colour the director named) as rgb 0–255, read through a 1 px canvas so color-mix resolves too
    const rgbOf = (expr) => {
      const s = document.createElement("span"); s.style.display = "none"; s.style.color = expr; host.append(s);
      const c = getComputedStyle(s).color; s.remove();
      const cv = document.createElement("canvas"); cv.width = cv.height = 1;
      const g = cv.getContext("2d"); g.fillStyle = "#000"; g.fillStyle = c; g.fillRect(0, 0, 1, 1);
      const d = g.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]];
    };
    const want = String(p.hue || "").trim().toLowerCase();
    const named = { "": "var(--x-accent)", "brand accent": "var(--x-accent)", accent: "var(--x-accent)", "brand": "var(--x-accent)", "accent 2": "var(--x-accent-2)", "accent-2": "var(--x-accent-2)", good: "var(--x-good)", ink: "var(--x-ink)" };
    const hueExpr = named[want] || (want.startsWith("--") ? `var(${want})` : p.hue);
    const base = rgbOf(hueExpr);
    const paper = rgbOf("var(--x-panel)"), deep = rgbOf("var(--x-ink)");
    // the ramp, light → dark: paper-tinted highs, the hue in the middle, ink-deepened shadows (the source's shape)
    const mixC = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
    const lightest = mixC(base, [255, 255, 255], 0.9).map((v, i) => v * 0.6 + paper[i] * 0.4);
    const n = Math.round(ML.clamp(p.stops, 5, 7));
    const plan = {
      7: [["l", 1], ["w", 0.75], ["w", 0.5], ["w", 0.22], ["h", 0], ["k", 0.38], ["k", 0.66]],
      6: [["l", 1], ["w", 0.65], ["w", 0.3], ["h", 0], ["k", 0.4], ["k", 0.68]],
      5: [["l", 1], ["w", 0.55], ["h", 0], ["k", 0.42], ["k", 0.7]],
    }[n];
    const ramp = plan.map(([kind, k]) => (kind === "l" ? lightest : kind === "w" ? mixC(base, [255, 255, 255], k) : kind === "k" ? mixC(base, deep.map((v) => v * 0.55), k) : base));
    const dark2light = ramp.slice().reverse();
    const table = (ch) => dark2light.map((c) => (c[ch] / 255).toFixed(4)).join(" ");
    const NS = "http://www.w3.org/2000/svg";
    const uid = "mlramp" + (window.__mlRampN = (window.__mlRampN || 0) + 1);
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.setAttribute("aria-hidden", "true");
    svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
    svg.innerHTML = `<filter id="${uid}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">` +
      `<feColorMatrix in="SourceGraphic" type="saturate" values="0" result="lum"/>` +
      `<feComponentTransfer in="lum" result="ramp"><feFuncR type="table" tableValues="${table(0)}"/><feFuncG type="table" tableValues="${table(1)}"/><feFuncB type="table" tableValues="${table(2)}"/></feComponentTransfer>` +
      `<feComposite in="SourceGraphic" in2="ramp" operator="arithmetic" k1="0" k2="1" k3="0" k4="0"/></filter>`;
    stage.append(svg);
    const comp = svg.querySelector("feComposite");
    const pool = ramp[Math.min(ramp.length - 1, Math.floor(ramp.length / 2))].map(Math.round);
    ctx.sfx(at, "whoosh.soft", 0.14);
    return {
      draw(t) {
        // the tint arrives over 0.8 s and gives back the original colour just before the end
        const u = ML.ease(t, at, at + 0.8) * (1 - ML.ease(t, end - 0.3, end));
        if (u <= 0.001) { el.style.filter = "none"; return; }
        comp.setAttribute("k2", (1 - u).toFixed(4));
        comp.setAttribute("k3", u.toFixed(4));
        el.style.filter = `url(#${uid}) drop-shadow(0 4px 4px rgba(${pool.join(",")}, ${(0.2 * u).toFixed(3)}))`;
      },
    };
  },
});

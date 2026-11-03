// Shimmer sweep: the title's own ink is turned into a gradient clipped to its letters — ink 0–40 %, a bright band at
// 50 %, ink 60–100 %, background-size 300 % — and background-position runs 100 % → 0 % over 1.2 s power1.inOut, so
// one glint travels across the letters once (or again and again, with a rest between). Per word: each word carries
// its own band, the next starting as the last is halfway. Direction follows the script (right to left in Arabic)
// unless set. Before and after the glint the letters read exactly as before. Arabic words keep their joins (the
// gradient lies on whole words).
// Source: prompt-motion:ezshine-opus-5-5-16-9-mp4 (reference) — our own rebuild.
ML.define({
  id: "text-emphasis.shimmer-sweep",
  category: "text-emphasis",
  name: "Shimmer band travels across the title",
  does: "After the title lands, a bright band in the look's accent glints across its letters, colouring each briefly.",
  says: ["luxury", "brand", "focus"],
  energy: 2,
  targets: ["headline", "word", "logo"],
  duration: [1, 3],
  params: {
    colour: { type: "text", default: "accent" },
    duration: { type: "number", range: [0.6, 2], default: 1.2, unit: "s" },
    repeat: { type: "choice", options: ["once", "loop"], default: "once" },
    "per-word": { type: "bool", default: false },
    direction: { type: "choice", options: ["ltr", "rtl", "by-script"], default: "by-script" },
  },
  pairs: ["text-in.punchline", "text-emphasis.gradient-fill"],
  avoid: ["problem", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:ezshine-opus-5-5-16-9-mp4", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    // the band: a look colour by name (accent, accent-2, good…); an explicit colour only when the director names one
    const c = String(p.colour || "accent").trim();
    let band = /^(#|rgb|hsl|oklch|color-mix)/i.test(c) ? c : `var(--x-${c.replace(/^--x-/, "")}, var(--x-accent))`;
    if (!(el instanceof SVGElement)) {
      // a word already set in the band's colour would show no glint: take the next look colour that differs
      const seen = (col) => { const s = document.createElement("span"); s.style.display = "none"; s.style.color = col; el.append(s); const v = getComputedStyle(s).color; s.remove(); return v; };
      const own = getComputedStyle(el).color;
      band = [band, "var(--x-accent-2)", "var(--x-ink)"].find((col) => seen(col) !== own) || band;
    }
    const ltr = p.direction === "ltr" || (p.direction === "by-script" && !rtl);
    const D = ML.clamp(p.duration, 0.6, 2);
    const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2); // power1.inOut
    const paint = (n) => Object.assign(n.style, {
      backgroundImage: `linear-gradient(90deg, currentColor 0%, currentColor 40%, ${band} 50%, currentColor 60%, currentColor 100%)`,
      backgroundSize: "300% 100%", backgroundRepeat: "no-repeat", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
      // the fill paints only inside the box: room for Arabic's deep marks and italic overhang, taken back from the layout
      padding: "0.3em 0.08em", margin: "-0.3em -0.08em",
    });
    let parts;
    if (el instanceof SVGElement) {
      // a logo: the band is a gradient in the SVG's defs, its offset moved per frame, laid over the logo's fills
      const id = "ml-shim-" + document.querySelectorAll("[data-ml-shim]").length;
      const ns = "http://www.w3.org/2000/svg", vb = el.viewBox && el.viewBox.baseVal;
      const defs = document.createElementNS(ns, "defs");
      defs.innerHTML = `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${vb ? vb.width : 100}" y2="0"><stop offset="0" stop-color="${band}" stop-opacity="0"/><stop offset="0.5" stop-color="${band}" stop-opacity="0.9"/><stop offset="1" stop-color="${band}" stop-opacity="0"/></linearGradient>`;
      el.setAttribute("data-ml-shim", "1");
      el.prepend(defs);
      const g = document.createElementNS(ns, "g");
      g.setAttribute("style", "mix-blend-mode: screen; pointer-events: none");
      for (const n of [...el.querySelectorAll("rect,circle,path,text,polygon,ellipse")]) { const cl = n.cloneNode(true); cl.setAttribute("fill", `url(#${id})`); cl.removeAttribute("stroke"); g.append(cl); }
      el.append(g);
      const grad = defs.firstElementChild, W = vb ? vb.width : 100;
      return {
        draw(t) {
          const x = (t - at) / D, u = p.repeat === "loop" ? ((t - at) % (D + 0.6)) / D : x;
          const e = t < at || u > 1 ? (ltr ? 0 : 1) : ease(u);
          const shift = -0.25 * W + (ltr ? e : 1 - e) * 1.5 * W; // the band's centre, from just off one edge to just off the other
          grad.setAttribute("x1", (shift - W * 0.25).toFixed(1)); grad.setAttribute("x2", (shift + W * 0.25).toFixed(1));
          g.style.opacity = t < at || u > 1 ? "0" : "1";
        },
      };
    }
    if (p["per-word"]) parts = ML.split(el, "words");
    else {
      const s = document.createElement("span");
      while (el.firstChild) s.append(el.firstChild);
      Object.assign(s.style, { display: "inline-block", maxWidth: "100%" });
      el.append(s);
      parts = [s];
    }
    parts.forEach(paint);
    // each part's sweep: per word, the next starts as the last is halfway
    const n = parts.length, each = n > 1 ? (D * 2) / (n + 1) : D;
    const starts = parts.map((_, i) => at + i * each * 0.5);
    const cycle = starts[n - 1] - at + each + 0.6;
    ctx.sfx(at, "swell", 0.25);
    if (p.repeat === "loop") for (let k = 1; at + k * cycle < end - 0.3; k++) ctx.sfx(at + k * cycle, "swell", 0.15);
    const pos = (e) => (ltr ? 100 - 100 * e : 100 * e); // 100 % → 0 % moves the band left to right
    return {
      draw(t) {
        let local = t;
        if (p.repeat === "loop" && t > at) local = at + ((t - at) % cycle);
        parts.forEach((w, i) => {
          const x = ML.lin(local, starts[i], starts[i] + each);
          w.style.backgroundPosition = `${pos(ease(x)).toFixed(3)}% 0`;
        });
      },
    };
  },
});

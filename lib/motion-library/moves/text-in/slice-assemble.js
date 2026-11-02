// Slice assemble: the word is cloned into N horizontal bands (clip-path inset per band, a hair of gap between them).
// Each band starts pushed sideways ±offset% of the word's width (alternating or all one way, mirrored for RTL) with a
// horizontal-only motion blur (an SVG feGaussianBlur "s 0" per band) and slides home on expo.out, staggered by a seeded
// spread, until the bands lock into one word. Exit: bands slide off again with a skewX smear (slide) or scatter at
// seeded speeds with a stretch (shatter). seal closes the hair gap once all have landed, so a headline rests clean;
// seal off keeps the cut lines (the source's look on a giant word). The bands cut the whole word: Arabic never separates.
// Source: prompt-motion:lukasersil-ten-claudeai-me-neprestava (reference only — our own rebuild).
ML.define({
  id: "text-in.slice-assemble",
  category: "text-in",
  name: "Slice assemble",
  does: "A giant word cut into horizontal bands slides together band by band with motion blur until it locks into place.",
  says: ["energy", "tech", "arrival", "change"],
  energy: 4,
  targets: ["headline", "word", "logo"],
  duration: [0.5, 1.5],
  params: {
    bands: { type: "number", range: [4, 10], default: 7 },
    offset: { type: "number", range: [30, 80], default: 55, unit: "%" },
    directions: { type: "choice", options: ["alternating", "same"], default: "alternating" },
    blur: { type: "number", range: [0, 12], default: 6, unit: "px" },
    duration: { type: "number", range: [0.25, 0.5], default: 0.35, unit: "s" },
    spread: { type: "number", range: [0, 0.2], default: 0.15, unit: "s" },
    gap: { type: "number", range: [0, 3], default: 1.5, unit: "px" },
    seal: { type: "bool", default: true },
    exit: { type: "choice", options: ["none", "slide", "shatter"], default: "none" },
  },
  pairs: ["camera.push-in", "background.dither-grain"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.heavy",
  source: { from: "prompt-motion:lukasersil-ten-claudeai-me-neprestava", license: "reference", note: "our own rebuild: clip-path bands + per-band horizontal SVG blur" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const n = Math.max(2, Math.round(p.bands)), dir = rtl ? -1 : 1;
    const b0 = ctx.box(el), W = b0.w || 1, H = b0.h || 1;
    // a logo that is itself a picture cannot hold bands: it gets a host of its own size
    const pic = el.tagName === "IMG" || el instanceof SVGElement;
    let host = el;
    if (pic) {
      host = document.createElement("span");
      Object.assign(host.style, { display: "inline-block", position: "relative", flex: "none", width: W.toFixed(2) + "px", height: H.toFixed(2) + "px", lineHeight: "0" });
      el.replaceWith(host); host.append(el);
    } else if (getComputedStyle(el).position === "static") el.style.position = "relative";
    const cs = getComputedStyle(host);
    const html = pic ? "" : el.innerHTML;
    // the original keeps the layout and is never painted while the bands paint the word
    const uid = "mlslice" + Math.floor(ML.rnd(at * 13.7 + W, H + html.length) * 1e8);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
    Object.assign(svg.style, { position: "absolute", width: "0", height: "0", overflow: "hidden" });
    host.append(svg);
    const bands = [];
    for (let i = 0; i < n; i++) {
      const f = document.createElementNS("http://www.w3.org/2000/svg", "filter");
      f.setAttribute("id", `${uid}-${i}`); f.setAttribute("x", "-50%"); f.setAttribute("width", "200%"); f.setAttribute("y", "-40%"); f.setAttribute("height", "180%");
      const g = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
      g.setAttribute("stdDeviation", "0 0"); f.append(g); svg.append(f);
      const b = document.createElement("div");
      if (pic) { const c = el.cloneNode(true); c.removeAttribute("data-slot"); b.append(c); } else b.innerHTML = html;
      b.setAttribute("aria-hidden", "true");
      const top = (i / n) * 100, bot = 100 - ((i + 1) / n) * 100, half = p.gap / 2;
      // the outer bands run past the box: tall marks and descenders (Arabic above all) overflow the line box
      const clipAt = (gap) => `inset(${i ? `calc(${top.toFixed(3)}% + ${gap}px)` : "-40%"} -200% ${i < n - 1 ? `calc(${bot.toFixed(3)}% + ${gap}px)` : "-40%"} -200%)`;
      Object.assign(b.style, {
        position: "absolute", inset: "0", boxSizing: "border-box", pointerEvents: "none", visibility: "visible", clipPath: clipAt(half),
        padding: cs.padding, display: cs.display, flexDirection: cs.flexDirection, alignItems: cs.alignItems, justifyContent: cs.justifyContent, gap: cs.gap,
      });
      host.append(b);
      // "slide" exit: thin vertical lines stay a moment where the strokes were
      const lines = p.exit !== "slide" ? [] : [0, 1].map((j) => {
        const l = document.createElement("div");
        Object.assign(l.style, { position: "absolute", top: top.toFixed(3) + "%", height: (100 / n).toFixed(3) + "%", left: (6 + ML.rnd(i + 1, 11.3 + j) * 88).toFixed(2) + "%", width: "max(1px, 0.012em)", background: "var(--x-dim)", visibility: "visible", opacity: "0", pointerEvents: "none" });
        host.append(l);
        return l;
      });
      const sign = (p.directions === "alternating" ? (i % 2 ? -1 : 1) : 1) * dir;
      const delay = ML.rnd(i + 1, 7.3) * p.spread;
      const outSign = p.exit === "shatter" ? (ML.rnd(i + 1, 19) < 0.5 ? -1 : 1) : (i % 2 ? 1 : -1) * dir;
      bands.push({ b, g, lines, sign, t0: at + delay, outSign, outDelay: ML.rnd(i + 1, 3.1) * 0.1, speed: 0.7 + ML.rnd(i + 1, 5.9) * 0.6 });
    }
    const lockAt = Math.max(...bands.map((s) => s.t0)) + p.duration;
    const exitAt = p.exit === "none" ? Infinity : Math.max(lockAt + 0.05, end - 0.42);
    ctx.sfx(at, "whoosh.heavy", 0.45);
    ctx.sfx(lockAt, "hit", 0.3);
    if (p.exit !== "none") ctx.sfx(exitAt, "whoosh.soft", 0.3);
    const target = pic ? el : host, bandDisplay = cs.display;
    return {
      draw(t) {
        // sealed: the bands are gone and the real word shows, with no seam through it
        const sealed = p.seal && t >= lockAt && t < exitAt;
        target.style.visibility = sealed ? "visible" : "hidden";
        for (const s of bands) {
          s.b.style.display = sealed ? "none" : bandDisplay;
          if (sealed) { s.g.setAttribute("stdDeviation", "0 0"); continue; }
          const u = ML.expo(t, s.t0, s.t0 + p.duration);
          const v = t < s.t0 ? 0 : 1 - u; // 1 at start, 0 home
          let x = s.sign * v * (p.offset / 100) * W, skew = 0, o = t < s.t0 ? 0 : Math.min(1, u * 3 + 0.25), sx = 1;
          let blur = v * p.blur * 1.6;
          let e = 0;
          if (t >= exitAt) {
            e = ML.ease(t, exitAt + s.outDelay, exitAt + s.outDelay + 0.3 * s.speed);
            x += s.outSign * e * W * (p.exit === "shatter" ? 0.9 * s.speed : 1.1);
            skew = (p.exit === "slide" ? -20 : -10 * s.outSign) * Math.min(1, e * 4);
            sx = 1 + e * (p.exit === "shatter" ? 0.6 : 0.25);
            blur += e * p.blur * 1.6;
            o *= 1 - ML.clamp((e - 0.55) / 0.45);
          }
          for (const l of s.lines) l.style.opacity = (Math.sin(e * Math.PI) * 0.7).toFixed(4);
          s.b.style.opacity = o.toFixed(4);
          s.b.style.transform = `translateX(${x.toFixed(2)}px)${skew ? ` skewX(${skew.toFixed(2)}deg)` : ""}${sx !== 1 ? ` scaleX(${sx.toFixed(4)})` : ""}`;
          s.g.setAttribute("stdDeviation", `${blur.toFixed(2)} 0`);
          s.b.style.filter = blur > 0.05 ? `url(#${s.g.parentNode.id})` : "none";
        }
      },
    };
  },
});

// Stroke draw then fill: the title's glyph outlines are rebuilt as SVG text laid exactly over the target (a glyph per
// Latin letter, a whole word for Arabic, so joined letters stay joined). Each outline draws itself with a dash offset
// (a manim "Write" feel, smooth in-out), staggered per glyph — or all at once in "stroke" mode; then the fill floods in
// under the stroke from the dim ink to the fill colour (accent by default) while the stroke fades away.
// Optional subtitle (the next sibling) arrives with opacity, blur 6px → 0 and y 8px. The target keeps its layout;
// its own glyphs are hidden once the SVG is placed. A vector logo draws its real shapes and fills to its own colours.
// The stroke param is its width at 72 px type and grows with larger type, so it stays visible on a headline.
// Source: prompt-motion:linearuncle-opus-5-5-manim-opus-5-5-manim (reference only — our own rebuild).
ML.define({
  id: "text-in.stroke-draw-fill",
  category: "text-in",
  name: "Stroke draw then fill",
  does: "A title's glyph outlines draw themselves stroke by stroke, then the fill floods in (grey to gold) as the stroke fades.",
  says: ["reveal", "precision", "story", "brand"],
  energy: 2,
  targets: ["headline", "word", "logo"],
  duration: [1, 3],
  params: {
    stroke: { type: "number", range: [1, 3], default: 1.5, unit: "px" },
    per_glyph: { type: "number", range: [0.3, 0.8], default: 0.5, unit: "s" },
    stagger: { type: "number", range: [0.04, 0.12], default: 0.08, unit: "s" },
    fill: { type: "text", default: "accent" },
    fill_time: { type: "number", range: [0.4, 1.2], default: 0.8, unit: "s" },
    split: { type: "choice", options: ["glyph", "stroke"], default: "glyph" },
    subtitle: { type: "bool", default: false },
  },
  pairs: ["background.grid-texture", "text-in.soft-rise"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:linearuncle-opus-5-5-manim-opus-5-5-manim", license: "reference", note: "our own rebuild with SVG text dash offsets" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const NS = "http://www.w3.org/2000/svg";
    const fillVar = /^--/.test(p.fill) ? `var(${p.fill})` : /^[a-z0-9-]+$/.test(p.fill || "") ? `var(--x-${p.fill})` : "var(--x-accent)";
    const nodes = []; // { tx, L, t0Share, len, fill, keepStroke }
    const isSvg = el instanceof SVGElement;
    let glyphCount = 0;
    if (isSvg) {
      // a vector logo: its real shapes draw themselves and fill to their own colours (a brand keeps its colours)
      const b = ctx.box(el), vbw = el.viewBox?.baseVal?.width || b.w, sc = b.w / vbw || 1;
      for (const s of el.querySelectorAll("path, rect, circle, ellipse, line, polyline, polygon, text")) {
        const cs = getComputedStyle(s), isText = s.tagName.toLowerCase() === "text";
        const fs = parseFloat(cs.fontSize) || 16;
        const L = (isText ? s.getComputedTextLength() * 3.2 + fs * 2.2 : s.getTotalLength()) * 1.02 + 1;
        const keepStroke = cs.stroke !== "none" && cs.stroke !== "";
        const fill = cs.fill;
        if (!keepStroke) { s.style.stroke = "var(--x-ink)"; s.style.strokeWidth = (p.stroke / sc).toFixed(3) + "px"; s.style.strokeLinejoin = "round"; }
        s.style.strokeDasharray = `${L.toFixed(1)} ${(L * 4).toFixed(1)}`;
        nodes.push({ tx: s, L, i: glyphCount++, len: p.per_glyph, fill: fill === "none" ? null : fill, keepStroke });
      }
    } else if (el.tagName !== "IMG") {
      const glyphs = ML.split(el, "chars");
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      const k = el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1;
      const eb = el.getBoundingClientRect();
      const W = el.offsetWidth, H = el.offsetHeight;
      // each glyph's baseline: a zero-size inline-block on its baseline
      const items = glyphs.map((g) => {
        const probe = document.createElement("span");
        Object.assign(probe.style, { display: "inline-block", width: "0", height: "0", verticalAlign: "baseline" });
        g.append(probe);
        const r = g.getBoundingClientRect(), pr = probe.getBoundingClientRect();
        probe.remove();
        return { g, text: g.textContent, x: (r.left - eb.left) / k, w: r.width / k, base: (pr.top - eb.top) / k };
      });
      if (items.length) {
        const svg = document.createElementNS(NS, "svg");
        svg.setAttribute("width", String(W)); svg.setAttribute("height", String(H));
        svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
        Object.assign(svg.style, { position: "absolute", left: "0", top: "0", overflow: "visible", pointerEvents: "none" });
        for (const it of items) {
          const tx = document.createElementNS(NS, "text"), ar = ML.ARABIC.test(it.text);
          tx.textContent = it.text;
          // an Arabic word runs right to left from its right edge, so its punctuation stays where the line set it
          tx.setAttribute("x", (ar ? it.x + it.w : it.x).toFixed(2)); tx.setAttribute("y", it.base.toFixed(2));
          const gcs = getComputedStyle(it.g), fs = parseFloat(gcs.fontSize), count = Array.from(it.text).length;
          Object.assign(tx.style, {
            direction: ar ? "rtl" : "ltr", fontFamily: gcs.fontFamily, fontWeight: gcs.fontWeight, fontSize: gcs.fontSize, fontStyle: gcs.fontStyle,
            letterSpacing: gcs.letterSpacing, stroke: "var(--x-ink)", strokeWidth: (p.stroke * Math.max(1, fs / 72)).toFixed(2) + "px", strokeLinejoin: "round", strokeLinecap: "round",
            fill: "var(--x-dim)", fillOpacity: "0",
          });
          // an outline's length, estimated from the glyph's width: long enough to close it, close enough that the pen
          // keeps moving for the whole of its time rather than finishing early and idling
          const L = it.w * (ar ? 4.2 : 3.2) + fs * 2.2;
          tx.style.strokeDasharray = `${L.toFixed(0)} ${(L * 4).toFixed(0)}`;
          svg.append(tx);
          // a whole Arabic word carries many letters: it takes longer to write than one Latin glyph
          nodes.push({ tx, L, i: glyphCount++, len: p.per_glyph * ML.clamp(count * 0.5, 1, 3), fill: fillVar, keepStroke: false });
        }
        el.append(svg);
        for (const it of items) it.g.style.visibility = "hidden";
      }
    }
    if (!nodes.length) {
      // a bitmap logo has no outlines to draw: it fades in on the same beat
      return { draw(t) { const leave = ML.clamp((t - (end - 0.25)) / 0.2); el.style.opacity = (ML.ease(t, at, at + p.per_glyph) * (1 - leave)).toFixed(4); } };
    }
    // the whole write + fill lands inside the run: a long headline writes faster rather than leaving before it fills
    const longest = Math.max(...nodes.map((x) => (p.split === "stroke" ? 0 : x.i * p.stagger) + (p.split === "stroke" ? p.per_glyph * 1.6 : x.len)));
    const fit = Math.min(1, Math.max(0.3, end - at - 0.3) / (longest - 0.1 + p.fill_time));
    for (const x of nodes) {
      x.t0 = p.split === "stroke" ? at : at + x.i * p.stagger * fit;
      x.t1 = x.t0 + (p.split === "stroke" ? p.per_glyph * 1.6 : x.len) * fit;
    }
    const drawn = Math.max(...nodes.map((x) => x.t1));
    const fillAt = drawn - 0.1 * fit, filled = fillAt + p.fill_time * fit;
    const sub = p.subtitle ? el.nextElementSibling : null;
    ctx.sfx(at, "swell", 0.3);
    ctx.sfx(fillAt + p.fill_time * fit * 0.4, "land.light", 0.25);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        el.style.opacity = String(1 - leave);
        const fu = ML.ease(t, fillAt, filled);
        for (const x of nodes) {
          // the outline grows along its path as the dash offset runs out
          const u = ML.ease(t, x.t0, x.t1);
          x.tx.style.strokeDashoffset = (x.L * (1 - u)).toFixed(1);
          x.tx.style.strokeOpacity = (t < x.t0 ? 0 : x.keepStroke ? 1 : 1 - fu).toFixed(4);
          if (x.fill) {
            x.tx.style.fillOpacity = fu.toFixed(4);
            x.tx.style.fill = fu >= 1 ? x.fill : `color-mix(in srgb, ${x.fill} ${(fu * 100).toFixed(1)}%, var(--x-dim))`;
          }
        }
        if (sub) {
          const s = ML.out(t, filled - 0.3, filled + 0.2);
          sub.style.opacity = s.toFixed(4);
          sub.style.filter = s < 1 ? `blur(${((1 - s) * 6).toFixed(2)}px)` : "none";
          sub.style.translate = `0 ${((1 - s) * 8).toFixed(2)}px`;
        }
      },
    };
  },
});

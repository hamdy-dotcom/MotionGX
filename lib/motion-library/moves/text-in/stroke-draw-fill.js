// Stroke draw then fill: the title's glyph outlines are rebuilt as SVG text laid exactly over the target (a glyph per
// Latin letter, a whole word for Arabic, so joined letters stay joined). Each outline draws itself with a dash offset
// (a manim "Write" feel, smooth in-out), staggered per glyph — or all at once in "stroke" mode; then the fill floods in
// under the stroke from the dim ink to the fill colour (accent by default) while the stroke fades away.
// Optional subtitle (the next sibling) arrives with opacity, blur 6px → 0 and y 8px. The target keeps its layout;
// its own glyphs go transparent once the SVG is placed.
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
  pairs: ["background.grid", "text-in.soft-rise"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:linearuncle-opus-5-5-manim-opus-5-5-manim", license: "reference", note: "our own rebuild with SVG text dash offsets" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const NS = "http://www.w3.org/2000/svg";
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
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", String(W)); svg.setAttribute("height", String(H));
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    Object.assign(svg.style, { position: "absolute", left: "0", top: "0", overflow: "visible", pointerEvents: "none" });
    const fillVar = /^--/.test(p.fill) ? `var(${p.fill})` : /^[a-z0-9-]+$/.test(p.fill || "") ? `var(--x-${p.fill})` : "var(--x-accent)";
    const nodes = items.map((it, i) => {
      const tx = document.createElementNS(NS, "text");
      tx.textContent = it.text;
      tx.setAttribute("x", it.x.toFixed(2)); tx.setAttribute("y", it.base.toFixed(2));
      tx.setAttribute("direction", "ltr");
      const gcs = getComputedStyle(it.g);
      Object.assign(tx.style, {
        fontFamily: gcs.fontFamily, fontWeight: gcs.fontWeight, fontSize: gcs.fontSize, fontStyle: gcs.fontStyle,
        letterSpacing: gcs.letterSpacing, stroke: "var(--x-ink)", strokeWidth: p.stroke + "px", strokeLinejoin: "round", strokeLinecap: "round",
        fill: "var(--x-dim)", fillOpacity: "0", paintOrder: "stroke",
      });
      // a dash long enough for the whole outline (Arabic words carry many letters), and a gap longer still
      const L = parseFloat(gcs.fontSize) * 7 * Math.max(1, Array.from(it.text).length);
      tx.style.strokeDasharray = `${L.toFixed(0)} ${(L * 4).toFixed(0)}`;
      svg.append(tx);
      const t0 = p.split === "stroke" ? at : at + i * p.stagger;
      return { tx, L, t0, t1: t0 + (p.split === "stroke" ? p.per_glyph * 1.6 : p.per_glyph) };
    });
    el.append(svg);
    el.style.webkitTextFillColor = "transparent";
    el.style.color = "transparent";
    const drawn = Math.max(...nodes.map((x) => x.t1));
    const fillAt = drawn - 0.1, filled = fillAt + p.fill_time;
    const sub = p.subtitle ? el.nextElementSibling : null;
    ctx.sfx(at, "swell", 0.3);
    ctx.sfx(fillAt + p.fill_time * 0.4, "land.light", 0.25);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        el.style.opacity = String(1 - leave);
        const fu = ML.ease(t, fillAt, filled);
        for (const x of nodes) {
          // the outline grows along its path as the dash offset runs out
          const u = ML.ease(t, x.t0, x.t1);
          x.tx.style.strokeDashoffset = (x.L * (1 - u)).toFixed(1);
          x.tx.style.strokeOpacity = (t < x.t0 ? 0 : 1 - fu).toFixed(4);
          x.tx.style.fillOpacity = fu.toFixed(4);
          x.tx.style.fill = fu >= 1 ? fillVar : `color-mix(in srgb, ${fillVar} ${(fu * 100).toFixed(1)}%, var(--x-dim))`;
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

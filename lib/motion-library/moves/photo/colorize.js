// Grayscale to colour: a muted picture (grayscale / sepia / desaturated, opacity 0.8) blooms into full colour when it
// becomes the subject — filter and opacity over `duration` on CSS ease (transition-all duration-500), with an optional
// pop zoom 1 → zoom (capped at the picture's own pixels). One-by-one: several targets (a row of logos, a strip of
// photos) colourise in turn on a stagger while the others stay muted. The look's own picture filter is kept under it.
// Source: MengTo/Skills web-design/editorial-tech + globe-particles + webgl-3d-object (MIT: the grayscale → colour
// hover state, the logo-strip variant, the staggered row).
ML.define({
  id: "photo.colorize",
  category: "photo",
  name: "Grayscale to colour",
  does: "A muted grayscale picture blooms into full colour when it becomes the subject, optionally zooming in a touch.",
  says: ["focus", "reveal", "story", "before-after", "trust"],
  energy: 2,
  targets: ["image", "card", "logo"],
  duration: [0.5, 2],
  params: {
    from: { type: "choice", options: ["grayscale", "sepia", "desaturate"], default: "grayscale" },
    duration: { type: "number", range: [0.3, 0.8], default: 0.5, unit: "s" },
    zoom: { type: "number", range: [1, 1.08], default: 1 },
    sequence: { type: "choice", options: ["all", "one-by-one"], default: "all" },
    stagger: { type: "number", range: [0.1, 0.4], default: 0.25, unit: "s" },
  },
  pairs: ["photo.card-focus-zoom", "photo.before-after-slider"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "MengTo/Skills:agent-skills/web-design/editorial-tech", license: "MIT", note: "with globe-particles and webgl-3d-object (the logo strip, the staggered row)" },
  setup(ctx) {
    const { p, at } = ctx;
    const list = (ctx.els.length ? ctx.els : [ctx.el]).filter(Boolean);
    if (!list.length) return null;
    const css = ML.bezier(0.25, 0.1, 0.25, 1); // CSS ease
    const muted = (m) => (p.from === "sepia" ? `sepia(${m.toFixed(4)}) saturate(${(1 - 0.35 * m).toFixed(4)})` : p.from === "desaturate" ? `saturate(${(1 - 0.75 * m).toFixed(4)})` : `grayscale(${m.toFixed(4)})`);
    const items = list.map((el, i) => {
      const cs = getComputedStyle(el), img = el.tagName === "IMG" ? el : null;
      const W = el.offsetWidth || el.getBoundingClientRect().width, H = el.offsetHeight || el.getBoundingClientRect().height;
      const cap = img && img.naturalWidth ? Math.max(1, 1 / Math.max(W / img.naturalWidth, H / img.naturalHeight)) : p.zoom;
      return { el, base: cs.filter === "none" ? "" : cs.filter + " ", o0: parseFloat(cs.opacity) || 1, zoom: Math.min(p.zoom, cap), t0: at + (p.sequence === "one-by-one" ? i * p.stagger : 0) };
    });
    items.forEach((it, i) => (i === 0 || p.sequence === "one-by-one") && ctx.sfx(it.t0, "swell", i === 0 ? 0.22 : 0.12));
    return {
      draw(t) {
        for (const it of items) {
          const u = css(ML.lin(t, it.t0, it.t0 + p.duration)), m = 1 - u;
          it.el.style.filter = m > 0.0005 ? it.base + muted(m) : it.base.trim() || "none";
          it.el.style.opacity = (it.o0 * (0.8 + 0.2 * u)).toFixed(4);
          const sc = 1 + (it.zoom - 1) * u;
          it.el.style.scale = sc > 1.00001 ? sc.toFixed(5) : "none";
        }
      },
    };
  },
});

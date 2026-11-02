// Gradient hairline border: a card (or button, or screen) gets a 1 px edge whose brightness fades across it, as if
// light catches one corner. Ported from MengTo/Skills framed-tech-dark-border-gradient's .showcase::before — a layer at
// inset 0 with padding = the hairline, border-radius inherit, a linear gradient as its background and
// mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude — so only the 1 px
// ring of the gradient shows. Gradients after the source family: "accent+white" = accent → transparent 36% → light
// .55 → transparent 76% → accent (framed-tech); "white-only" = light .46 → .18 → .04 at 145deg (mesh-gradient dark
// blue / agency). Tone "light" swaps the light catch for a soft ink shade (the light-paper variant). Motion:
// static (the edge reveals once: the gradient's stops grow from all-transparent to final over 0.8 s), slow-spin (the
// angle orbits 360° every 8 s, linear) or sheen-pass (the angle travels +60° over the run and one highlight stop sweeps
// along the edge on entrance, 1.2 s in-out). Every value is a function of t; colours are look variables only.
// Sources: MengTo/Skills web-design/framed-tech-dark-border-gradient + agency-grid-layout-minimal +
// mesh-gradient-dark-blue-clean (MIT).
ML.define({
  id: "accent.gradient-hairline-border",
  category: "accent",
  name: "Gradient hairline border",
  does: "A card or button gets a 1px edge whose brightness fades across it, as if light catches one corner.",
  says: ["luxury", "precision", "focus", "tech"],
  energy: 1,
  targets: ["card", "label", "screen", "stage"],
  duration: [1, 10],
  params: {
    angle: { type: "number", range: [0, 360], default: 135, unit: "deg" },
    colours: { type: "choice", options: ["accent+white", "white-only"], default: "accent+white" },
    tone: { type: "choice", options: ["dark", "light"], default: "dark" },
    motion: { type: "choice", options: ["static", "slow-spin", "sheen-pass"], default: "static" },
    width: { type: "number", range: [1, 3], default: 1, unit: "px" },
    spin_period: { type: "number", range: [6, 10], default: 8, unit: "s" },
  },
  pairs: ["accent.callout-leader", "element.card-rise", "ui.cta-button-rise"],
  avoid: ["playful", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:web-design/framed-tech-dark-border-gradient", license: "MIT", note: "mask-composite hairline shell; gradients also from agency-grid-layout-minimal and mesh-gradient-dark-blue-clean; seekable port" },
  setup(ctx) {
    const { p, at, end, stage, rtl, f } = ctx;
    const doc = document;
    const host = ctx.scene || stage;
    // the thing that gets the edge: the target, or (stage / no slot) the scene's main panel
    let el = ctx.el && ctx.el !== stage ? ctx.el : host.querySelector(".ml-panel") || null;
    const replaced = (e) => /^(IMG|SVG|CANVAS|VIDEO|INPUT|svg)$/.test(e.tagName);
    let ring;
    const k = Math.min(f.W, f.H) / 1080;
    const w = Math.max(1, ML.clamp(+p.width || 1, 1, 3) * k);
    const css = `position:absolute;pointer-events:none;box-sizing:border-box;will-change:transform;padding:${w.toFixed(2)}px;z-index:3;` +
      "-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;" +
      "mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);";
    if (el && !replaced(el)) {
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      ring = doc.createElement("div");
      ring.style.cssText = css + "inset:0;border-radius:inherit;";
      el.append(ring);
    } else {
      // a picture or an svg cannot hold a child: the ring sits over its box on the scene
      const b = el ? ctx.box(el) : { x: f.safe.x, y: f.safe.y, w: f.safe.w, h: f.safe.h };
      const rad = el ? getComputedStyle(el).borderRadius : "var(--x-radius)";
      ring = doc.createElement("div");
      ring.style.cssText = css + `left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;border-radius:${rad === "0px" ? "var(--x-radius)" : rad};`;
      host.append(ring);
    }
    // a second ring for the sheen highlight (only drawn in sheen-pass)
    const sheen = ring.cloneNode(false);
    ring.after(sheen);

    // the light catch and its fall-off: on dark the light is the accent's ink, on light paper a soft shade of ink
    const lightOf = (a) => (p.tone === "light" ? `color-mix(in srgb, var(--x-ink) ${(a * 0.4).toFixed(1)}%, transparent)` : `color-mix(in srgb, var(--x-accent-ink) ${a.toFixed(1)}%, transparent)`);
    const accent = (a) => `color-mix(in srgb, var(--x-accent) ${a.toFixed(1)}%, transparent)`;
    const base = +p.angle || 0;
    const dirSign = rtl ? -1 : 1; // the light comes from the reading side: mirror the angle in Arabic
    const life = Math.max(0.6, end - at);
    ctx.sfx(at, "tap", 0.12);

    const gradient = (ang, grow) => {
      // grow 0 → 1: every stop starts transparent and reaches its final strength (the entrance reveal)
      const g = ML.clamp(grow);
      if (p.colours === "white-only")
        return `linear-gradient(${ang.toFixed(2)}deg, ${lightOf(46 * g)}, ${lightOf(18 * g)} ${(50).toFixed(0)}%, ${lightOf(4 * g)})`;
      return `linear-gradient(${ang.toFixed(2)}deg, ${accent(100 * g)}, transparent ${(36 * g).toFixed(1)}%, ${lightOf(55 * g)} ${(18 + 32 * g).toFixed(1)}%, transparent ${(100 - 24 * g).toFixed(1)}%, ${accent(100 * g)})`;
    };

    return {
      draw(t) {
        const vis = t >= at - 1e-6 && t <= end + 0.3;
        ring.style.visibility = vis ? "visible" : "hidden";
        sheen.style.visibility = vis && p.motion === "sheen-pass" ? "visible" : "hidden";
        if (!vis) return;
        const leave = ML.ease(t, end - 0.3, end);
        const grow = ML.out(t, at, at + 0.8);
        let ang = base;
        if (p.motion === "slow-spin") ang = base + (360 * (t - at)) / ML.clamp(+p.spin_period || 8, 4, 20);
        else if (p.motion === "sheen-pass") ang = base + 10 + 60 * ML.lin(t, at, at + life);
        const a = dirSign < 0 ? 360 - ang : ang;
        ring.style.background = gradient(a, p.motion === "static" ? grow : ML.out(t, at, at + 0.4));
        ring.style.opacity = (1 - leave).toFixed(4);
        if (p.motion === "sheen-pass") {
          // one bright stop travels along the edge once on entrance
          const u = ML.ease(t, at + 0.15, at + 1.35), pos = -20 + 140 * u;
          const s = Math.sin(Math.PI * ML.clamp(u)) * (1 - leave);
          sheen.style.background = `linear-gradient(${(a + 10).toFixed(2)}deg, transparent ${(pos - 14).toFixed(1)}%, ${lightOf(85)} ${pos.toFixed(1)}%, transparent ${(pos + 14).toFixed(1)}%)`;
          sheen.style.opacity = s.toFixed(4);
        }
      },
    };
  },
});

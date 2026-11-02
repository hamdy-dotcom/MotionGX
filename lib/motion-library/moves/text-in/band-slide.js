// Band slide: a solid colour band (full stage width × ~140px, the look's second accent) slides in across the frame on
// cubic-bezier(0.8, 0, 0.2, 1) in 0.35 s, a thin caret-like line riding its leading edge; it carries the word, which
// sits on the band in the accent ink at weight 800 and whose wide letter-spacing (0.6em) snaps tight (0.02em) over
// 0.45 s — starting with the band, ending 0.1 s after it. The tracking is drawn as per-letter offsets from each line's
// centre (the slot never reflows or rewraps), capped so no letter leaves the frame. Arabic: spacing stays 0 (the joins
// must not break) and the band simply carries the word. RTL enters from the other side.
// Source: prompt-motion blue-clarity "ok so seeing lots" (reference only — our own code).
ML.define({
  id: "text-in.band-slide",
  category: "text-in",
  name: "Band slide",
  does: "A solid colour band slides in across the frame carrying a word whose wide letter-spacing snaps tight as the band settles.",
  says: ["focus", "energy", "brand", "time"],
  energy: 4,
  targets: ["headline", "word", "line"],
  duration: [0.5, 1.5],
  params: {
    direction: { type: "choice", options: ["right", "left"], default: "right" },
    height: { type: "number", range: [80, 220], default: 140, unit: "px" },
    spacing_from: { type: "number", range: [0, 0.6], default: 0.6, unit: "em" },
    duration: { type: "number", range: [0.25, 0.5], default: 0.35, unit: "s" },
    colour: { type: "choice", options: ["accent2", "accent", "ink", "panel"], default: "accent2" },
    caret: { type: "bool", default: true },
  },
  pairs: ["text-in.tracking-collapse", "transition.flash-cut"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:blue-clarity-ok-so-seeing-lots", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const W = ctx.f.W;
    const FILL = { accent2: ["var(--x-accent-2)", "var(--x-accent-ink)"], accent: ["var(--x-accent)", "var(--x-accent-ink)"], ink: ["var(--x-ink)", "var(--x-ground)"], panel: ["var(--x-panel)", "var(--x-ink)"] };
    const [fill, ink] = FILL[p.colour] || FILL.accent2;
    // the word sits on the band: heavy, in the band's ink, above it
    el.style.fontWeight = "800";
    el.style.color = ink;
    el.style.position = "relative";
    el.style.zIndex = "2";
    const units = ML.split(el, "chars");
    if (!units.length) return null;
    const fs = parseFloat(getComputedStyle(el).fontSize) || 100;
    const info = units.map((u) => ({ u, b: ctx.box(u), ar: ML.ARABIC.test(u.textContent) }));
    const T = Math.min(...info.map((x) => x.b.y)), B = Math.max(...info.map((x) => x.b.y + x.b.h));
    // lines, letters ranked inside each from its centre, spread capped by the room to the frame edge
    const lines = [];
    for (const x of info) { let g = lines.find((l) => Math.abs(l.y - x.b.y) < fs * 0.5); if (!g) lines.push((g = { y: x.b.y, items: [] })); g.items.push(x); }
    for (const g of lines) {
      g.items.sort((a, b) => a.b.x - b.b.x);
      const l = Math.min(...g.items.map((x) => x.b.x)), r = Math.max(...g.items.map((x) => x.b.x + x.b.w)), k = g.items.length;
      const room = Math.max(0, Math.min(l, W - r) - 16);
      g.max = k > 1 ? (2 * room) / ((k - 1) * fs) : 0;
      g.items.forEach((x, i) => (x.k = i - (k - 1) / 2));
      g.ar = g.items.every((x) => x.ar);
    }
    // the band: full stage width, at least the type's height plus air
    const host = ctx.scene || ctx.stage;
    const h = Math.max(p.height * Math.max(0.6, fs / 104), B - T + fs * 0.36);
    const band = document.createElement("div");
    band.setAttribute("aria-hidden", "true");
    band.style.cssText = `position:absolute;left:0;top:${((T + B) / 2 - h / 2).toFixed(1)}px;width:${W}px;height:${h.toFixed(1)}px;background:${fill};z-index:1;pointer-events:none;will-change:transform;`;
    const caret = document.createElement("div");
    const cw = Math.max(3, fs * 0.04);
    caret.style.cssText = `position:absolute;top:${(-h * 0.12).toFixed(1)}px;height:${(h * 1.24).toFixed(1)}px;width:${cw.toFixed(1)}px;background:var(--x-accent);`;
    band.append(caret);
    host.append(band);
    // from the right (default) the band's leading edge is its left; RTL mirrors
    const fromRight = (p.direction === "right") !== !!rtl;
    caret.style[fromRight ? "left" : "right"] = `${(-cw / 2).toFixed(1)}px`;
    const curve = ML.bezier(0.8, 0, 0.2, 1);
    const track = p.duration + 0.1;
    ctx.sfx(at, "whoosh.soft", 0.45);
    ctx.sfx(at + p.duration, "land.light", 0.2);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.18);
        const on = t >= at && t < end;
        band.style.display = on ? "block" : "none";
        el.style.visibility = t < at ? "hidden" : "visible";
        const e = curve(ML.lin(t, at, at + p.duration));
        const shift = (fromRight ? 1 : -1) * (1 - e) * W;
        band.style.transform = shift === 0 ? "none" : `translateX(${shift.toFixed(2)}px)`;
        band.style.opacity = (1 - leave).toFixed(4);
        caret.style.opacity = (1 - ML.lin(t, at + p.duration, at + p.duration + 0.2)).toFixed(4);
        el.style.opacity = (1 - leave).toFixed(4);
        const s = ML.out(t, at, at + track);
        for (const g of lines) {
          const sp = g.ar ? 0 : Math.min(p.spacing_from + (0.02 - p.spacing_from) * s, g.max);
          for (const x of g.items) {
            const dx = (x.ar ? 0 : x.k * sp * fs) + shift;
            x.u.style.translate = Math.abs(dx) > 0.01 ? `${dx.toFixed(2)}px 0` : "none";
          }
        }
      },
    };
  },
});

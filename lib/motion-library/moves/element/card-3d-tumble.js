// Card tumbles in 3D: a flat card shows it is a real plane — perspective 1200 px, keyed segments of segment s each on
// easeInOutCubic: skew (rotateZ 0 → −8°), lie back (rotateX → 55°, rotateY → −20°), then turn edge-on (rotateY → 80°,
// rotateZ → −75°). "lie-back" lies back and returns flat; "edge-on" skews then turns edge-on; "full" runs all three.
// A shade darkens the face as it turns away (1 − |cos rx · cos ry|), and a small accent dot rides along its surface.
// Mirrored in Arabic. Nothing scales above 1.
// Source: prompt-motion "ayushunleashed-motion-designers-are-about" (reference only — rebuilt as our own code).
ML.define({
  id: "element.card-3d-tumble",
  category: "element",
  name: "Card tumbles in 3D",
  does: "A flat card tilts and rotates in perspective - skewing, lying back, then turning edge-on - showing it is a real plane.",
  says: ["change", "tech", "energy"],
  energy: 3,
  targets: ["card", "logo", "screen"],
  duration: [1, 2.5],
  params: {
    path: { type: "choice", options: ["lie-back", "edge-on", "full"], default: "full" },
    segment: { type: "number", range: [0.3, 0.6], default: 0.45, unit: "s" },
  },
  pairs: ["element.card-3d-swing-in", "camera.orbit-by-progress"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:ayushunleashed-motion-designers-are-about", license: "reference", note: "rebuilt as our own code: keyed rotation segments, facing shade, a dot riding the plane" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const dir = rtl ? -1 : 1;

    let card, layer = null, back = null;
    if (own) {
      card = own;
      if (getComputedStyle(own).position === "static") own.style.position = "relative";
    } else {
      back = mk("div", `position:absolute;left:${f.pic.x}px;top:${f.pic.y}px;width:${f.pic.w}px;height:${f.pic.h}px;border-radius:var(--x-radius);background:var(--x-ground);pointer-events:none;z-index:5;opacity:0;`, host); // clears the region the built piece takes
      const cw = Math.min(f.pic.w * 0.78, 760 * k * (f.wide ? 1.2 : 1)), ch = Math.min(cw * 0.62, f.pic.h * 0.8);
      const s = cw / 760;
      layer = mk("div", `position:absolute;left:${f.pic.x + (f.pic.w - cw) / 2}px;top:${f.pic.y + (f.pic.h - ch) / 2}px;width:${cw}px;height:${ch}px;pointer-events:none;z-index:6;`, host);
      card = mk("div", `position:absolute;inset:0;box-sizing:border-box;padding:${40 * s}px ${44 * s}px;display:flex;flex-direction:column;gap:${18 * s}px;background:linear-gradient(135deg, var(--x-panel), var(--x-panel-2));border:var(--x-edge) solid var(--x-edge-color);border-radius:var(--x-radius);box-shadow:var(--x-shadow);overflow:hidden;`, layer);
      const T = rtl ? { label: "خطة التقسيط", big: "٤٬٥٠٠ ج", sub: "على ٦ شهور" } : { label: "Instalment plan", big: "$4,500", sub: "over 6 months" };
      const top = mk("div", `display:flex;align-items:center;justify-content:space-between;`, card);
      mk("div", `font:var(--x-label-weight) ${22 * s}px var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:${rtl ? "none" : "var(--x-label-case)"};color:var(--x-dim);`, top, T.label);
      mk("div", `width:${64 * s}px;height:${44 * s}px;border-radius:${10 * s}px;background:linear-gradient(135deg, var(--x-accent-2), var(--x-accent));`, top);
      mk("div", `margin-top:auto;font:var(--x-head-weight) ${92 * s}px/1 var(--x-head-font);letter-spacing:var(--x-head-track);color:var(--x-ink);`, card, T.big);
      mk("div", `font:var(--x-body-weight) ${30 * s}px var(--x-body-font);color:var(--x-dim);`, card, T.sub);
    }
    card.style.transformOrigin = "50% 50%";
    const html = card instanceof HTMLElement;
    const cr = card.getBoundingClientRect(), CW = html ? card.offsetWidth : cr.width, CH = html ? card.offsetHeight : cr.height;
    const shade = !html ? null : mk("div", "position:absolute;inset:0;border-radius:inherit;background:var(--x-ink);opacity:0;pointer-events:none;", card);
    const dot = !html ? null : mk("div", `position:absolute;left:0;top:0;width:${22 * k}px;height:${22 * k}px;margin:${-11 * k}px 0 0 ${-11 * k}px;border-radius:50%;background:var(--x-accent);box-shadow:0 0 0 ${6 * k}px color-mix(in srgb, var(--x-accent) 22%, transparent);pointer-events:none;`, card);

    // poses [rz, rx, ry] and the segments between them
    const P0 = [0, 0, 0], SKEW = [-8, 0, 0], BACK = [-8, 55, -20], EDGE = [-75, 0, 80];
    const poses = p.path === "lie-back" ? [P0, SKEW, BACK, P0] : p.path === "edge-on" ? [P0, SKEW, [-75, 20, 80]] : [P0, SKEW, BACK, EDGE];
    const seg = Math.min(p.segment, Math.max(0.2, (end - at - 0.45) / (poses.length - 1)));
    const t0 = at + 0.3; // shown flat for a beat first
    const keys = poses.map((_, i) => t0 + i * seg);
    keys.slice(1).forEach((t, i) => ctx.sfx(t - seg * 0.6, "whoosh.soft", 0.22 + 0.06 * i));
    const dotT = [t0, keys[keys.length - 1]];

    return {
      draw(t) {
        if (layer) layer.style.visibility = t < at - 1e-6 ? "hidden" : "visible";
        if (back) back.style.opacity = ML.out(t, at - 0.15, at + 0.15).toFixed(4);
        let q = poses[0];
        for (let i = 1; i < poses.length; i++) {
          const u = ML.ease(t, keys[i - 1], keys[i]);
          if (t < keys[i - 1]) break;
          q = poses[i - 1].map((v, j) => v + (poses[i][j] - v) * u);
        }
        const [rz, rx, ry] = q;
        card.style.transform = `perspective(1200px) rotateZ(${(rz * dir).toFixed(3)}deg) rotateX(${rx.toFixed(3)}deg) rotateY(${(ry * dir).toFixed(3)}deg)`;
        card.style.opacity = ML.out(t, at, at + 0.25).toFixed(4);
        const face = Math.abs(Math.cos((rx * Math.PI) / 180) * Math.cos((ry * Math.PI) / 180));
        if (!html) return;
        shade.style.opacity = ((1 - face) * 0.55).toFixed(4);
        // the dot rides the surface along a gentle curve
        const u = ML.ease(t, dotT[0], dotT[1]);
        const dx = rtl ? 1 - (0.18 + 0.64 * u) : 0.18 + 0.64 * u, dy = 0.3 + 0.35 * Math.sin(Math.PI * u);
        dot.style.translate = `${(dx * CW).toFixed(2)}px ${(dy * CH).toFixed(2)}px`;
        dot.style.opacity = ML.out(t, t0 - 0.1, t0 + 0.2).toFixed(4);
      },
    };
  },
});

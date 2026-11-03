// Breathing scale: a hub, icon or glow swells and relaxes almost imperceptibly — scale = 1 + sin(2π(t − at)/P + 2π·phase)·A,
// A 0.02 for a hub (the source's sin(3t)·.02, a 2.1 s period) up to a glow wrapper's .93 ↔ 1.07. A pure function of t;
// several items (the target's siblings, or a built hub's glow and satellites) take seeded phase offsets so they never
// pulse in unison. It eases in over its first beat and out with the scene, so it never jumps.
// Source: MengTo/Skills web-design/blue-cloudy-clean-modern demo/index.html (the breathing hub) (MIT).
ML.define({
  id: "element.breathe-scale",
  category: "element",
  name: "Breathing scale",
  does: "A hub, icon or glow swells and relaxes almost imperceptibly.",
  says: ["calm", "time", "ambient"],
  energy: 1,
  targets: ["shape", "logo", "card"],
  duration: [2, 30],
  params: {
    amount: { type: "number", range: [0.01, 0.07], default: 0.02 },
    period: { type: "number", range: [2, 6], default: 2.1, unit: "s" },
    phase: { type: "number", range: [0, 1], default: 0 },
  },
  pairs: ["element.orbit-ring", "element.liquid-orb-wobble", "element.dot-ripple-rings"],
  avoid: ["urgency", "speed"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:agent-skills/web-design/blue-cloudy-clean-modern", license: "MIT", note: "demo/index.html hub scale 1 + sin(3t)·.02 and glow .93 ↔ 1.07, rebuilt as a pure function of t" },
  setup(ctx) {
    const { p, at, end, f } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent) => { const e = doc.createElement(tag); e.style.cssText = css; parent.append(e); return e; };
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const TAU = Math.PI * 2;

    // what breathes: [element, amount, phase offset]
    let parts = [], layer = null, glow = null, back = null;
    if (own) {
      own.style.transformOrigin = "50% 50%";
      parts.push([own, p.amount, 0]);
      for (const [i, e] of (ctx.els || []).slice(1).entries()) { e.style.transformOrigin = "50% 50%"; parts.push([e, p.amount, ML.rnd(i + 1, 3)]); }
    } else {
      // a built hub: a soft glow wrapper (the big .93 ↔ 1.07 swing), the hub disc, and three satellites
      const cx0 = Math.max(0, f.pic.x - 48 * k), cy0 = f.pic.y, cw0 = Math.min(f.W - cx0, f.pic.w + 96 * k), ch0 = Math.min(f.H - cy0, f.pic.h + 72 * k);
    back = mk("div", `position:absolute;left:${cx0}px;top:${cy0}px;width:${cw0}px;height:${ch0}px;background:var(--x-ground);background-image:var(--x-ground-image);background-size:${f.W}px ${f.H}px;background-position:${-cx0}px ${-cy0}px;pointer-events:none;z-index:5;opacity:0;`, host); // clears the region the built piece takes, shadows included
      const S = Math.min(f.pic.w, f.pic.h) * 0.42;
      layer = mk("div", `position:absolute;left:${f.pic.x + f.pic.w / 2 - S / 2}px;top:${f.pic.y + f.pic.h / 2 - S / 2}px;width:${S}px;height:${S}px;pointer-events:none;z-index:5;`, host);
      glow = mk("div", `position:absolute;inset:-28%;border-radius:50%;background:radial-gradient(closest-side, color-mix(in srgb, var(--x-glow-1) calc(var(--x-glow-o) * 100%), transparent), transparent);transform-origin:50% 50%;will-change:transform;`, layer); // its own layer: a soft gradient repainted in place came out different per visit
      const ring = mk("div", `position:absolute;inset:-9%;border-radius:50%;border:var(--x-ring-w) solid color-mix(in srgb, var(--x-accent) 26%, transparent);transform-origin:50% 50%;`, layer);
      const hub = mk("div", `position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 35% 30%, var(--x-accent-2), var(--x-accent));box-shadow:var(--x-shadow);transform-origin:50% 50%;display:grid;place-items:center;`, layer);
      mk("div", `width:34%;height:34%;border-radius:28%;background:var(--x-accent-ink);opacity:.9;`, hub);
      parts.push([glow, Math.min(0.07, p.amount * 3.5), 0.37], [ring, p.amount * 1.6, 0.18], [hub, p.amount, 0]);
      [[-0.62, -0.38], [0.66, -0.1], [-0.2, 0.7]].forEach(([dx, dy], i) => {
        const d = mk("div", `position:absolute;left:${(0.5 + dx * 0.9) * S - 18 * k}px;top:${(0.5 + dy * 0.9) * S - 18 * k}px;width:${36 * k}px;height:${36 * k}px;border-radius:50%;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);transform-origin:50% 50%;`, layer);
        parts.push([d, p.amount * 2, ML.rnd(i, 7)]);
      });
    }

    return {
      draw(t) {
        // the breath comes in over its first beat and settles before the end: no jump at either edge
        const env = ML.ease(t, at, at + Math.min(0.8, p.period * 0.4)) * (1 - ML.ease(t, end - 0.4, end));
        if (layer) {
          // fades each part, not the layer: an opacity group over scaled children rasterised differently per visit
          const o = ML.out(t, at - 0.2, at + 0.35);
          layer.style.visibility = o < 0.001 ? "hidden" : "visible";
          back.style.opacity = ML.out(t, at - 0.2, at + 0.1).toFixed(4);
          for (const [e] of parts) e.style.opacity = o >= 0.9999 ? "" : o.toFixed(4);
        }
        for (const [e, A, ph] of parts) {
          const s = 1 + Math.sin((TAU * (t - at)) / p.period + TAU * (p.phase + ph)) * A * env;
          e.style.scale = Math.abs(s - 1) < 0.0015 ? "none" : s.toFixed(4); // a near-1 scale can keep a stale raster: snap it
        }
      },
    };
  },
});

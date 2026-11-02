// Drop squashes and sends out rings. A dot (r 28 px, the accent) — or the target itself — falls 300 px in 0.35 s on
// power2.in, stretched like a drop (scaleY 1.4, scaleX 0.75); on impact it squashes (scaleX 1.25, scaleY 0.75) for
// 0.06 s, then springs back to 1 on back.out over 0.25 s. On impact hairline rings (1 px, 40 %) expand from r 40 to
// 160 / 200 / 240 px, staggered 0.08 s, expo.out over 0.8 s, fading. From the side it arcs in from the leading edge
// (the reading direction's start), its stretch along the path. All SVG / transforms from t.
// Source: prompt-motion "leadnotifi-opus-5-5-i-made" (reference only — rebuilt as our own code).
ML.define({
  id: "element.drop-squash-ripple",
  category: "element",
  name: "Drop squashes and sends out rings",
  does: "A dot falls stretched like a drop, squashes on landing and emits thin concentric ripple rings.",
  says: ["arrival", "energy", "playful"],
  energy: 3,
  targets: ["shape", "logo"],
  duration: [0.8, 1.6],
  params: {
    rings: { type: "number", range: [1, 5], default: 3 },
    fall: { type: "number", range: [150, 400], default: 300, unit: "px" },
    from: { type: "choice", options: ["top", "side"], default: "top" },
  },
  pairs: ["element.dot-to-logo-tile", "element.dot-ripple-rings", "text-in.punchline"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "drop",
  source: { from: "prompt-motion:leadnotifi-opus-5-5-i-made", license: "reference", note: "rebuilt as our own code" },
  setup(ctx) {
    const { p, at, f, rtl } = ctx;
    const doc = document;
    const NS = "http://www.w3.org/2000/svg";
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    // where it lands: the target's centre, else the middle of the picture region
    const b = own ? ctx.box(own) : { x: f.pic.x + f.pic.w / 2 - 28 * k, y: f.pic.y + f.pic.h / 2 - 28 * k, w: 56 * k, h: 56 * k };
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const svg = doc.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${f.W} ${f.H}`);
    svg.style.cssText = `position:absolute;left:0;top:0;width:${f.W}px;height:${f.H}px;overflow:visible;pointer-events:none;z-index:6;will-change:transform;`;
    host.append(svg);
    const n = Math.round(ML.clamp(p.rings, 1, 5));
    const scale = Math.max(1, Math.max(b.w, b.h) / (56 * k)); // rings grow with what lands
    const rings = Array.from({ length: n }, (_, i) => ({ el: sv("circle", { cx, cy, r: 0, fill: "none", stroke: "var(--x-accent)", "stroke-width": Math.max(1, 1.5 * k), opacity: 0 }, svg), r1: (160 + 40 * i) * k * Math.min(scale, 2.2), d: i * 0.08 }));
    let dot = null;
    if (!own) dot = sv("circle", { cx: 0, cy: 0, r: 28 * k, fill: "var(--x-accent)" }, svg);
    if (own) own.style.transformOrigin = "50% 100%";
    const fall = ML.clamp(p.fall, 150, 400) * k;
    const side = p.from === "side";
    const dir = rtl ? -1 : 1; // from the side it comes in from where reading starts
    const F = 0.35, hit = at + F;
    ctx.sfx(hit, "drop", 0.45);
    const backOut = (x, c = 1.7) => { const y = x - 1; return 1 + (c + 1) * y * y * y + c * y * y; };
    return {
      draw(t) {
        // the fall
        let dx = 0, dy = 0, sx = 1, sy = 1, ang = 0, o = 1;
        if (t < at) o = 0;
        else if (t < hit) {
          const x = ML.lin(t, at, hit), e = x * x; // power2.in
          dy = -(1 - e) * fall;
          if (side) { dx = -dir * (1 - x) * fall * 0.8; ang = Math.atan2(2 * fall * x, dir * fall * 0.8) * (180 / Math.PI) - 90; }
          const st = Math.min(1, x * 2.5);
          sx = 1 - 0.25 * st; sy = 1 + 0.4 * st;
          o = ML.lin(t, at, at + 0.06);
        } else if (t < hit + 0.06) { sx = 1.25; sy = 0.75; }
        else { const u = backOut(ML.lin(t, hit + 0.06, hit + 0.31)); sx = 1.25 + (1 - 1.25) * u; sy = 0.75 + (1 - 0.75) * u; }
        if (dot) {
          const r = 28 * k;
          // squash anchored on the ground (the bottom of the dot)
          dot.setAttribute("transform", `translate(${(cx + dx).toFixed(2)} ${(cy + r + dy).toFixed(2)}) rotate(${(t < hit ? ang : 0).toFixed(2)} 0 ${-r}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(0 ${-r})`);
          dot.setAttribute("opacity", o.toFixed(4));
        } else {
          own.style.opacity = o.toFixed(4);
          own.style.translate = Math.abs(dx) + Math.abs(dy) < 0.01 ? "none" : `${dx.toFixed(2)}px ${dy.toFixed(2)}px`;
          own.style.scale = Math.abs(sx - 1) + Math.abs(sy - 1) < 1e-4 ? "none" : `${sx.toFixed(4)} ${sy.toFixed(4)}`;
          own.style.rotate = t < hit && side && Math.abs(ang) > 1e-3 ? `${ang.toFixed(2)}deg` : "none";
        }
        // the rings: from r 40, expo.out 0.8 s, staggered, fading
        for (const g of rings) {
          const a = hit + g.d;
          const e = t < a ? 0 : ML.expo(t, a, a + 0.8);
          g.el.setAttribute("r", (40 * k + (g.r1 - 40 * k) * e).toFixed(2));
          g.el.setAttribute("opacity", t < a ? "0" : (0.4 * (1 - ML.lin(t, a, a + 0.8))).toFixed(4));
        }
      },
    };
  },
});

// Ground line dents and springs back. A thin SVG line under the object, drawn as one quadratic: M0,y Q cx,y+d 2cx,y.
// The object falls onto it (a short power2.in drop); at impact d jumps to `depth` px (scaled by the impact speed), then
// d → 0 on elastic.out(1, damping) over 0.5 s — GSAP's elastic: 1 + 2^(−10x)·sin((x − s)·2π / p), s = p/2π·asin(1).
// The control point cx follows the object's centre; the object rides the dent (the curve's low point is d/2).
// Source: prompt-motion "shneural-after-opus-5-5-it" (reference only — rebuilt as our own code).
ML.define({
  id: "element.elastic-ground-line",
  category: "element",
  name: "Ground line dents and springs back",
  does: "A thin line bends where an object lands and wobbles back to straight.",
  says: ["playful", "precision"],
  energy: 2,
  targets: ["shape", "line"],
  duration: [0.5, 1],
  params: {
    depth: { type: "number", range: [4, 20], default: 10, unit: "px" },
    damping: { type: "number", range: [0.2, 0.5], default: 0.3 },
    fall: { type: "number", range: [0, 300], default: 140, unit: "px" },
    backdrop: { type: "bool", default: true },
  },
  pairs: ["element.ball-bounce", "element.drop-and-pin", "element.drop-squash-ripple"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "prompt-motion:shneural-after-opus-5-5-it", license: "reference", note: "rebuilt as our own code" },
  setup(ctx) {
    const { p, at, f } = ctx;
    const doc = document;
    const NS = "http://www.w3.org/2000/svg";
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    let b;
    if (own) {
      b = ctx.box(own);
      // text: the ground sits on its last line's baseline-ish (the box's foot)
    } else {
      const r = 36 * k;
      b = { x: f.pic.x + f.pic.w / 2 - r, y: f.pic.y + f.pic.h * 0.55 - 2 * r, w: 2 * r, h: 2 * r };
    }
    const span = Math.min(f.W - f.m * 2, Math.max(b.w * 1.5, f.W * 0.5));
    const x0 = Math.max(f.m, b.x + b.w / 2 - span / 2), gy = b.y + b.h + 6 * k;
    const svg = doc.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${f.W} ${f.H}`);
    svg.style.cssText = `position:absolute;left:0;top:0;width:${f.W}px;height:${f.H}px;overflow:visible;pointer-events:none;z-index:6;will-change:transform;`;
    host.append(svg);
    const fall = ML.clamp(p.fall, 0, 300) * k;
    // with no target of its own, the stand-in ball and its line sit on a quiet patch of ground
    const pad = 48 * k;
    const back = !own && p.backdrop ? sv("rect", { x: x0 - pad, y: b.y - fall - pad, width: span + pad * 2, height: gy - b.y + fall + pad * 2, rx: 28 * k, fill: "var(--x-ground)", opacity: 0 }, svg) : null;
    const line = sv("path", { d: "", fill: "none", stroke: "var(--x-ink)", "stroke-width": Math.max(1.5, 2.5 * k), "stroke-linecap": "round" }, svg);
    let ball = null;
    if (!own) ball = sv("circle", { cx: b.x + b.w / 2, cy: b.y + b.h / 2, r: b.w / 2, fill: "var(--x-accent)" }, svg);
    const cx = b.x + b.w / 2 - x0; // the control point under the object's centre (relative to the line's start)
    const F = fall > 0 ? Math.max(0.18, Math.sqrt(fall / (1400 * k))) : 0; // a short gravity drop
    const hit = at + F;
    const speed = fall > 0 ? Math.min(1.2, 0.6 + fall / (300 * k) * 0.6) : 0.8; // deeper dent for a harder landing
    const depth = ML.clamp(p.depth, 4, 20) * k * speed * 1.6;
    const P = ML.clamp(p.damping, 0.2, 0.5), S = (P / (2 * Math.PI)) * Math.asin(1);
    const elastic = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin(((x - S) * 2 * Math.PI) / P) + 1);
    ctx.sfx(hit, "land.light", 0.3);
    const curve = (d) => {
      // M0,y Q cx,y+d 2cx,y — mirrored segments so the line keeps its full span with the dent under the object
      const xa = x0, xb = x0 + span, c = x0 + cx, w = Math.min(cx, span - cx, span * 0.32);
      return `M${xa.toFixed(2)},${gy.toFixed(2)} L${(c - w).toFixed(2)},${gy.toFixed(2)} Q${c.toFixed(2)},${(gy + 2 * d).toFixed(2)} ${(c + w).toFixed(2)},${gy.toFixed(2)} L${xb.toFixed(2)},${gy.toFixed(2)}`;
    };
    return {
      draw(t) {
        const lineIn = ML.ease(t, at - 0.3, at);
        line.setAttribute("opacity", lineIn.toFixed(4));
        if (back) back.setAttribute("opacity", lineIn.toFixed(4));
        let y = 0, d = 0, o = 1;
        if (t < hit) {
          const x = F ? ML.lin(t, at, hit) : 1;
          y = -(1 - x * x) * fall;
          o = t < at ? 0 : ML.lin(t, at, at + 0.08);
        } else {
          // dent: in fast (40 ms), out on the elastic
          const inn = ML.out(t, hit, hit + 0.04);
          d = depth * inn * (1 - elastic(ML.lin(t, hit + 0.04, hit + 0.54)));
          y = d; // the curve's low point (d / 2 of the control offset, which is 2d)
        }
        line.setAttribute("d", curve(d));
        if (ball) {
          ball.setAttribute("transform", `translate(0 ${y.toFixed(2)})`);
          ball.setAttribute("opacity", o.toFixed(4));
        } else {
          own.style.opacity = o.toFixed(4);
          own.style.translate = Math.abs(y) < 0.01 ? "none" : `0 ${y.toFixed(2)}px`;
        }
      },
    };
  },
});

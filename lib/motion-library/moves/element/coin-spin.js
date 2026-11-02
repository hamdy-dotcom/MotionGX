// Icon spins like a coin: the emblem inside a static rounded tile turns edge-on and round like a coin — its width
// follows |cos θ| (scaleX for a spin about the vertical axis, scaleY about the horizontal one), θ 0 → 360° × turns over
// `duration` on power2.inOut — narrowing to a 2 px sliver edge-on and widening again, a touch darker while its back
// faces us. At the end the tile pulses 1 → 1.04 → 1. Scope "emblem" turns the mark only (an SVG logo's shapes, its
// lettering staying put); "tile" turns the whole logo. A flat 2D squeeze: no 3D transform, so nothing goes soft; a
// picture logo pulses down (0.97) rather than past its pixels.
// Source: prompt-motion "jacksonfall-opus-5-5-on-xhigh" (reference only — rebuilt as our own code).
ML.define({
  id: "element.coin-spin",
  category: "element",
  name: "Icon spins like a coin",
  does: "An icon's emblem turns edge-on and around like a coin, narrowing to a sliver and widening again.",
  says: ["brand", "playful"],
  energy: 2,
  targets: ["logo"],
  duration: [0.8, 2.5],
  params: {
    turns: { type: "number", range: [0.5, 3], default: 1 },
    axis: { type: "choice", options: ["y", "x"], default: "y" },
    scope: { type: "choice", options: ["emblem", "tile"], default: "emblem" },
    duration: { type: "number", range: [0.6, 2], default: 1.2, unit: "s" },
    pulse: { type: "bool", default: true },
  },
  pairs: ["element.dot-to-logo-tile", "element.app-icon-reveal"],
  avoid: ["problem", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:jacksonfall-opus-5-5-on-xhigh", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, el } = ctx;
    if (!el || el === ctx.stage) return null;
    const svgNS = "http://www.w3.org/2000/svg";
    const isSvg = el.tagName.toLowerCase() === "svg";
    const isImg = el.tagName === "IMG";
    // what turns: an SVG logo's mark (its shapes, gathered in one group, lettering left out), else its first child, else all
    let coin = el;
    if (p.scope === "emblem") {
      if (isSvg) {
        const shapes = [...el.children].filter((c) => !["text", "defs", "style", "title"].includes(c.tagName.toLowerCase()));
        if (shapes.length && shapes.length < el.children.length + 1) {
          const g = document.createElementNS(svgNS, "g");
          el.insertBefore(g, shapes[0]);
          shapes.forEach((s) => g.append(s));
          coin = g;
        }
      } else if (el.firstElementChild && el.children.length > 1) coin = el.firstElementChild;
    }
    if (coin !== el) { coin.style.transformBox = "fill-box"; coin.style.transformOrigin = "center"; }
    else el.style.transformOrigin = "center";
    // the sliver: 2 px edge-on (as a share of the coin's measured width / height)
    let span = 0;
    try { const r = coin.getBoundingClientRect(); span = p.axis === "x" ? r.height : r.width; } catch (e) { span = 0; }
    const k = (ctx.stage.getBoundingClientRect().width / (ctx.stage.offsetWidth || 1)) || 1;
    const minS = span > 0 ? Math.min(0.2, 2 / (span / k)) : 0.03;
    const dur = ML.clamp(p.duration, 0.6, 2), turns = ML.clamp(p.turns, 0.5, 3);
    const a = at, b = at + dur;
    const pa = b - 0.04, pb = pa + 0.36; // the tile's pulse as the coin lands
    const peak = isImg ? -0.03 : 0.04;
    ctx.sfx(a, "whoosh.soft", 0.3);
    if (p.pulse) ctx.sfx(pa + 0.06, "pop.soft", 0.3);
    // power2.inOut
    const io = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    return {
      draw(t) {
        const u = io(ML.lin(t, a, b));
        const th = u * turns * Math.PI * 2;
        const c = Math.cos(th);
        const s = t <= a || t >= b ? 1 : Math.max(Math.abs(c), minS);
        const sq = s === 1 ? "none" : p.axis === "x" ? `scale(1, ${s.toFixed(4)})` : `scale(${s.toFixed(4)}, 1)`;
        // the back face a little darker, a glint as it comes round to face us
        const back = t > a && t < b && c < 0 ? -c : 0;
        const glint = t > a && t < b ? Math.pow(Math.max(0, c), 24) * Math.min(1, u * 4) * (1 - u) : 0;
        const fil = back > 0.01 ? `brightness(${(1 - 0.22 * back).toFixed(3)})` : glint > 0.01 ? `brightness(${(1 + 0.25 * glint).toFixed(3)})` : "none";
        const pul = p.pulse ? 1 + peak * Math.sin(Math.PI * ML.lin(t, pa, pb)) * (t > pa && t < pb ? 1 : 0) : 1;
        if (coin === el) {
          const all = pul !== 1 ? `${sq === "none" ? "" : sq + " "}scale(${pul.toFixed(4)})` : sq;
          el.style.transform = all;
          el.style.filter = fil;
        } else {
          coin.style.transform = sq;
          coin.style.filter = fil;
          el.style.transformOrigin = "center";
          el.style.transform = pul !== 1 ? `scale(${pul.toFixed(4)})` : "none";
        }
      },
    };
  },
});

// Freehand sketch cursor: a touch cursor (a 24 px ring of 1.5 px around an inner dot, or an arrow, or a pen nib) first
// appears with a scale pulse, then travels a predefined polyline — low on one side, up, down, up again — and leaves a
// shaky hand-drawn line behind it. The line is the polyline resampled every 6 px with a smooth seeded noise offset
// (±`jitter` px, perpendicular to the stroke), drawn incrementally by its dash offset so its end is always under the
// cursor. The cursor moves segment by segment, each on power1.inOut with slightly different speeds (seeded), `draw` s
// in all. Round joins and caps, a 2 px stroke. Arabic starts from the right. On a target the director gives, the sketch
// runs across that target's box; alone it runs across the picture region.
// Source: prompt-motion adamdesgns "SKETCH IT" (reference only: rebuilt as our own code).
ML.define({
  id: "ui.freehand-sketch-cursor",
  category: "ui",
  name: "Cursor draws a shaky freehand line",
  does: "A circular touch cursor moves and leaves a jittery hand-drawn line behind it.",
  says: ["story", "step", "playful"],
  energy: 2,
  targets: ["cursor", "line"],
  duration: [1, 2.5],
  params: {
    jitter: { type: "number", range: [0, 8], default: 4, unit: "px" },
    cursor: { type: "choice", options: ["touch-ring", "arrow", "pen"], default: "touch-ring" },
    draw: { type: "number", range: [0.9, 2.2], default: 1.5, unit: "s" },
    stroke: { type: "number", range: [1.5, 5], default: 2, unit: "px" },
    colour: { type: "choice", options: ["ink", "accent"], default: "ink" },
  },
  pairs: ["accent.progressive-stroke-draw", "text-in.slam"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:adamdesgns-wtf-made-with-single", license: "reference", note: "our own rebuild of the technique; no pixels or assets copied" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const R = ctx.el && ctx.el !== ctx.stage ? ctx.box(ctx.el) : f.pic, k = Math.min(f.W, f.H) / 1080, s = 2 * k; // web px → stage px
    const INK = p.colour === "accent" ? "var(--x-accent)" : "var(--x-ink)";
    const svg = sv("svg", { width: R.w, height: R.h, viewBox: `0 0 ${R.w} ${R.h}` }, host);
    svg.style.cssText = `position:absolute;left:${R.x}px;top:${R.y}px;overflow:visible;pointer-events:none;z-index:7;`;

    // the base polyline (shares of the region), mirrored for RTL
    const base = [[0.06, 0.72], [0.3, 0.68], [0.46, 0.3], [0.62, 0.78], [0.8, 0.32], [0.94, 0.42]]
      .map(([x, y]) => ({ x: (rtl ? 1 - x : x) * R.w, y: y * R.h }));
    // smooth seeded 1D noise in [-1, 1]
    const noise = (x, seed) => { const i = Math.floor(x), u = x - i, a = ML.rnd(i, seed), b = ML.rnd(i + 1, seed), w = u * u * (3 - 2 * u); return (a + (b - a) * w) * 2 - 1; };
    // resample every 6 px with a perpendicular wobble; remember where each base segment ends
    const step = 6 * s, pts = [], segEnd = [];
    let along = 0;
    for (let i = 0; i < base.length - 1; i++) {
      const a = base[i], b = base[i + 1], L = Math.hypot(b.x - a.x, b.y - a.y), nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L;
      const m = Math.max(1, Math.round(L / step));
      for (let j = i === 0 ? 0 : 1; j <= m; j++) {
        const u = j / m, d = along + u * L, amp = p.jitter * s * (j === 0 && i === 0 ? 0 : 1);
        const o = (noise(d / (step * 3), 7) * 0.55 + noise(d / (step * 0.9), 13) * 0.65) * amp; // a nervous hand: mostly tremor, a little drift
        pts.push({ x: a.x + (b.x - a.x) * u + nx * o, y: a.y + (b.y - a.y) * u + ny * o });
      }
      along += L;
      segEnd.push(pts.length - 1);
    }
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    const total = cum[cum.length - 1];
    const line = sv("path", { d: "M" + pts.map((q) => `${q.x.toFixed(2)} ${q.y.toFixed(2)}`).join(" L"), fill: "none", stroke: INK, "stroke-width": (p.stroke * s).toFixed(2), "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": `${total.toFixed(2)} ${(total + 10).toFixed(2)}`, "stroke-dashoffset": total.toFixed(2) }, svg);

    // the cursor
    const cur = sv("g", {}, svg), inner = sv("g", {}, cur);
    const cs = 24 * s;
    if (p.cursor === "arrow") {
      const a = sv("path", { d: "M0 0 L0 17 L4.5 13.5 L7.5 20 L10.5 18.5 L7.5 12 L13.5 12 Z", fill: "var(--x-pointer)", stroke: "var(--x-pointer-edge)", "stroke-width": 1.4, "stroke-linejoin": "round" }, inner);
      a.setAttribute("transform", `scale(${(cs / 22).toFixed(3)})`);
    } else if (p.cursor === "pen") {
      const a = sv("path", { d: "M0 0 L3 -9 L17 -23 L23 -17 L9 -3 Z M3 -9 L9 -3", fill: "var(--x-panel)", stroke: INK, "stroke-width": 1.5, "stroke-linejoin": "round" }, inner);
      a.setAttribute("transform", `scale(${(cs / 24).toFixed(3)})${rtl ? " scale(-1 1)" : ""}`);
    } else {
      sv("circle", { cx: 0, cy: 0, r: (cs / 2).toFixed(2), fill: "none", stroke: INK, "stroke-width": (1.5 * s).toFixed(2) }, inner);
      sv("circle", { cx: 0, cy: 0, r: (3 * s).toFixed(2), fill: INK }, inner);
    }

    // timing: the pulse, then segment by segment, each a share of `draw` by length, nudged ± 20 % (seeded)
    const pulseEnd = at + 0.35, d0 = pulseEnd + 0.05;
    const segLen = segEnd.map((e, i) => cum[e] - (i ? cum[segEnd[i - 1]] : 0));
    const w = segLen.map((L, i) => L * (0.8 + 0.4 * ML.rnd(i, 3)));
    const wSum = w.reduce((a, b) => a + b, 0);
    const span = Math.max(0.4, Math.min(p.draw, end - 0.4 - d0));
    const segT = []; let acc = d0;
    for (const x of w) { segT.push([acc, acc + (span * x) / wSum]); acc += (span * x) / wSum; }
    ctx.sfx(at, "tap", 0.3);
    const p1 = (x) => (1 - Math.cos(Math.PI * x)) / 2; // power1.inOut (sine-like)
    const atLen = (L) => {
      let lo = 0, hi = cum.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= L) lo = m; else hi = m; }
      const u = cum[hi] === cum[lo] ? 0 : (L - cum[lo]) / (cum[hi] - cum[lo]);
      return { x: pts[lo].x + (pts[hi].x - pts[lo].x) * u, y: pts[lo].y + (pts[hi].y - pts[lo].y) * u };
    };
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.22);
        svg.style.opacity = (1 - leave).toFixed(4);
        // how far the hand has drawn
        let L = 0;
        segT.forEach(([a, b], i) => { const from = i ? cum[segEnd[i - 1]] : 0; if (t >= a) L = from + segLen[i] * p1(ML.lin(t, a, b)); });
        line.setAttribute("stroke-dashoffset", (total - L).toFixed(2));
        line.style.opacity = L > 0.5 ? "1" : "0";
        const q = atLen(L);
        const vis = t < at ? 0 : ML.clamp((t - at) / 0.12);
        const pul = t < at ? 0 : t < pulseEnd ? 1 + 0.35 * Math.sin(Math.PI * ML.lin(t, at, pulseEnd)) * (1 - ML.lin(t, at, pulseEnd)) : 1;
        cur.setAttribute("transform", `translate(${q.x.toFixed(2)} ${q.y.toFixed(2)})`);
        inner.setAttribute("transform", `scale(${(Math.min(1, ML.out(t, at, at + 0.15)) * pul).toFixed(4)})`);
        cur.setAttribute("opacity", vis.toFixed(4));
      },
    };
  },
});

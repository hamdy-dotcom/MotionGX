// Graph editor easing morph: an animation-curve editor, the way a motion tool shows timing. A square plot (~35 % of the
// frame height) with a faint 4×4 grid and mono axis labels TIME / POSITION.Y; a straight line (0,0) → (1,1) draws on
// over 0.5 s (dash offset); two handles (6 px dots on 1 px stems) appear at their linear thirds; a cursor arcs to the
// first handle (0.4 s), drags it to the preset's (a, b), then arcs to the second and drags it to (c, d). The curve is
// recomputed every frame as the cubic bézier through the handles' current positions (accent, 2 px), endpoint diamonds
// hold the ends, and under the plot a mono caption cubic-bezier(a, b, c, d) updates each frame to 2 decimals with the
// numbers being changed tinted accent. Without the cursor the handles slide on their own. The plot stays left → right
// in Arabic too (time runs that way on every graph editor); only the labels change language.
// Rebuilt as our own code from a prompt-motion reference (reference only: no pixels or code copied).
ML.define({
  id: "ui.graph-editor-curve-morph",
  category: "ui",
  name: "Graph editor easing morph",
  does: "An animation-curve graph draws a straight line, then a cursor drags the bezier handles and the line bends into an S-curve while the cubic-bezier numbers update live.",
  says: ["precision", "tech", "change", "step"],
  energy: 2,
  targets: ["chart", "cursor", "screen"],
  duration: [2, 4],
  params: {
    preset: { type: "choice", options: ["ease-in", "ease-out", "in-out", "overshoot"], default: "in-out" },
    cursor: { type: "bool", default: true },
    size: { type: "number", range: [0.25, 0.45], default: 0.35 },
  },
  pairs: ["ui.cursor-glide-click", "camera.push-in"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click",
  source: { from: "prompt-motion:tequilafunks-opus-5-5-remotion-make", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage && ctx.el.offsetWidth > 200 * k ? ctx.el : null;
    const R = own ? ctx.box(own) : f.pic;

    // the plot: P px square, headroom above / below for an overshooting curve
    const P = Math.min(f.H * p.size, R.w * 0.72, R.h * 0.62);
    const pad = P * 0.16, head = P * 0.22, W = P + pad * 2, H = P + head * 2;
    const ox = pad, oy = head; // plot origin (top-left of the unit square)
    const X = (u) => ox + u * P, Y = (v) => oy + (1 - v) * P;
    const wrap = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${(P * 0.02).toFixed(1)}px;z-index:6;pointer-events:none;`, host);
    const panel = mk("div", `position:relative;direction:ltr;padding:${(P * 0.05).toFixed(1)}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * 0.6);box-shadow:var(--x-shadow);`, wrap);
    const svg = sv("svg", { width: W.toFixed(1), height: H.toFixed(1), viewBox: `0 0 ${W.toFixed(1)} ${H.toFixed(1)}`, style: "display:block;overflow:visible;" }, panel);
    const hair = Math.max(1, 1.6 * k);
    for (let i = 0; i <= 4; i++) {
      const g = i / 4, edge = i === 0 || i === 4;
      sv("line", { x1: X(g), y1: Y(0), x2: X(g), y2: Y(1), stroke: "var(--x-ink)", "stroke-opacity": edge ? 0.16 : 0.07, "stroke-width": hair }, svg);
      sv("line", { x1: X(0), y1: Y(g), x2: X(1), y2: Y(g), stroke: "var(--x-ink)", "stroke-opacity": edge ? 0.16 : 0.07, "stroke-width": hair }, svg);
    }
    const fs = Math.max(9 * 2 * k, P * 0.034);
    const lab = (x, y, text, rot, anchor) => { const e = sv("text", { x, y, fill: "var(--x-dim)", "font-size": fs.toFixed(1), "font-family": "var(--x-mono-font)", "font-weight": 600, "letter-spacing": rtl ? 0 : "0.12em", "text-anchor": anchor, transform: rot ? `rotate(-90 ${x} ${y})` : "" }, svg); e.textContent = text; return e; };
    lab(X(1), Y(0) + fs * 1.9, rtl ? "الزمن" : "TIME", false, "end");
    lab(X(0) - fs * 0.9, Y(1), rtl ? "الموضع" : "POSITION.Y", true, "end");

    const stem1 = sv("line", { stroke: "var(--x-ink)", "stroke-opacity": 0.45, "stroke-width": hair }, svg);
    const stem2 = sv("line", { stroke: "var(--x-ink)", "stroke-opacity": 0.45, "stroke-width": hair }, svg);
    const curve = sv("path", { fill: "none", stroke: "var(--x-accent)", "stroke-width": (Math.max(2, 4 * k)).toFixed(2), "stroke-linecap": "round", pathLength: 1 }, svg);
    const dsz = Math.max(6, 11 * k);
    const diamond = (u, v) => sv("rect", { x: X(u) - dsz / 2, y: Y(v) - dsz / 2, width: dsz, height: dsz, fill: "var(--x-ink)", transform: `rotate(45 ${X(u)} ${Y(v)})` }, svg);
    diamond(0, 0); diamond(1, 1);
    const hr = Math.max(4, 6 * 2 * k * 0.75);
    const dot1 = sv("circle", { r: hr, fill: "var(--x-panel)", stroke: "var(--x-ink)", "stroke-width": hair * 1.4 }, svg);
    const dot2 = sv("circle", { r: hr, fill: "var(--x-panel)", stroke: "var(--x-ink)", "stroke-width": hair * 1.4 }, svg);

    // the caption: cubic-bezier(a, b, c, d), each number its own span
    const cap = mk("div", `direction:ltr;text-align:center;font:600 ${(fs * 1.55).toFixed(1)}px var(--x-mono-font);color:var(--x-ink);letter-spacing:0;white-space:pre;font-variant-numeric:tabular-nums;margin-top:${(P * 0.02).toFixed(1)}px;padding-top:${(P * 0.04).toFixed(1)}px;border-top:${hair}px solid var(--x-line);`, panel);
    cap.append("cubic-bezier(");
    const nums = [0, 1, 2, 3].map((i) => { const s = mk("span", "", cap); if (i < 3) cap.append(", "); return s; });
    cap.append(")");

    // the cursor (tip-anchored arrow)
    const cs = Math.max(30, 52 * k);
    const cur = sv("svg", { width: cs, height: cs, viewBox: "0 0 24 24", style: `position:absolute;left:0;top:0;overflow:visible;margin:${(-cs * 2 / 24).toFixed(1)}px 0 0 ${(-cs * 5 / 24).toFixed(1)}px;filter:drop-shadow(0 ${(3 * k).toFixed(1)}px ${(6 * k).toFixed(1)}px rgba(0,0,0,.25));` }, panel);
    sv("path", { d: "M5 2 L5 19 L9.5 15.5 L12.5 22 L15.5 20.5 L12.5 14 L18.5 14 Z", fill: "var(--x-pointer)", stroke: "var(--x-pointer-edge)", "stroke-width": 1.4, "stroke-linejoin": "round" }, cur);

    // timing, compressed to fit the room the director gave
    const target = { "ease-in": [0.42, 0, 1, 1], "ease-out": [0, 0, 0.58, 1], "in-out": [0.83, 0, 0.17, 1], overshoot: [0.34, 1.56, 0.64, 1] }[p.preset] || [0.83, 0, 0.17, 1];
    const sc = Math.min(1, Math.max(0.45, (end - at - 0.45) / 2.85));
    const t0 = at + 0.1, tDraw = t0 + 0.5 * sc, tH = tDraw + 0.05 * sc;
    const g1 = tH + 0.2 * sc, a1 = g1 + 0.4 * sc, d1 = a1 + 0.12 * sc, e1 = d1 + 0.6 * sc;
    const g2 = e1 + 0.1 * sc, a2 = g2 + 0.4 * sc, d2 = a2 + 0.12 * sc, e2 = d2 + 0.6 * sc;
    ctx.sfx(a1, "click", 0.35); ctx.sfx(a2, "click", 0.35);
    const inout = (t, a, b) => ML.ease(t, a, b);
    const h1At = (t) => { const u = inout(t, d1, e1); return [1 / 3 + (target[0] - 1 / 3) * u, 1 / 3 + (target[1] - 1 / 3) * u]; };
    const h2At = (t) => { const u = inout(t, d2, e2); return [2 / 3 + (target[2] - 2 / 3) * u, 2 / 3 + (target[3] - 2 / 3) * u]; };
    const panelPad = P * 0.05;
    const arc = (t, a, b, from, to) => { const u = ML.ease(t, a, b), dx = to[0] - from[0], dy = to[1] - from[1], len = Math.hypot(dx, dy) || 1, bulge = Math.sin(Math.PI * u) * Math.min(60 * k, 0.12 * len); return [from[0] + dx * u - (dy / len) * bulge, from[1] + dy * u + (dx / len) * bulge]; };
    const px = (h) => [X(h[0]) + panelPad, Y(h[1]) + panelPad];
    const startPt = [W + pad * 1.5, H + head * 0.6];

    return {
      draw(t) {
        const h1 = h1At(t), h2 = h2At(t);
        curve.setAttribute("d", `M${X(0).toFixed(2)} ${Y(0).toFixed(2)} C${X(h1[0]).toFixed(2)} ${Y(h1[1]).toFixed(2)} ${X(h2[0]).toFixed(2)} ${Y(h2[1]).toFixed(2)} ${X(1).toFixed(2)} ${Y(1).toFixed(2)}`);
        const draw = ML.out(t, t0, tDraw);
        curve.setAttribute("stroke-dasharray", draw < 1 ? "1 1" : "none");
        curve.setAttribute("stroke-dashoffset", (1 - draw).toFixed(4));
        curve.style.opacity = t < t0 ? "0" : "1";
        const ho = ML.out(t, tH, tH + 0.2);
        for (const [dot, stem, h, a, b] of [[dot1, stem1, h1, 0, 0], [dot2, stem2, h2, 1, 1]]) {
          dot.setAttribute("cx", X(h[0]).toFixed(2)); dot.setAttribute("cy", Y(h[1]).toFixed(2));
          stem.setAttribute("x1", X(a).toFixed(2)); stem.setAttribute("y1", Y(b).toFixed(2)); stem.setAttribute("x2", X(h[0]).toFixed(2)); stem.setAttribute("y2", Y(h[1]).toFixed(2));
          dot.style.opacity = stem.style.opacity = ho.toFixed(4);
        }
        const grab1 = t >= a1 && t < e1 + 0.05, grab2 = t >= a2 && t < e2 + 0.05;
        dot1.setAttribute("fill", grab1 ? "var(--x-accent)" : "var(--x-panel)");
        dot2.setAttribute("fill", grab2 ? "var(--x-accent)" : "var(--x-panel)");
        const v = [h1[0], h1[1], h2[0], h2[1]], live = [t >= d1 && t < e1, t >= d1 && t < e1, t >= d2 && t < e2, t >= d2 && t < e2];
        nums.forEach((s, i) => { s.textContent = v[i].toFixed(2); s.style.color = live[i] ? "var(--x-accent)" : "var(--x-ink)"; });
        cap.style.opacity = ho.toFixed(4);
        // the cursor: arc in, drag handle 1, arc over, drag handle 2, drift off a little
        if (p.cursor) {
          let pt;
          if (t < a1) pt = arc(t, g1, a1, startPt.map((x, i) => x + (i ? 0 : 0)), px([1 / 3, 1 / 3]));
          else if (t < a2) pt = t < e1 ? px(h1) : arc(t, g2, a2, px(h1At(e1)), px([2 / 3, 2 / 3]));
          else pt = t < e2 + 0.15 ? px(h2) : arc(t, e2 + 0.15, e2 + 0.6, px(h2), [px(h2)[0] + 40 * k, px(h2)[1] + 50 * k]);
          const press = grab1 || grab2 ? 0.9 : 1;
          cur.style.translate = `${pt[0].toFixed(2)}px ${pt[1].toFixed(2)}px`;
          cur.style.scale = press.toFixed(3);
          cur.style.opacity = (ML.lin(t, g1, g1 + 0.15)).toFixed(4);
        } else cur.style.display = "none";
        const e = ML.out(t, at, at + 0.35), l = ML.clamp((t - (end - 0.25)) / 0.22);
        wrap.style.opacity = (t < at ? 0 : e * (1 - l)).toFixed(4);
        wrap.style.translate = `0 ${((1 - e) * 20 * k).toFixed(2)}px`;
      },
    };
  },
});

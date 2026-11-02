// Bezier curve plot: a small graph-editor panel (thin axes, a mono "GRAPH EDITOR" label, the curve's name in italic
// serif) where an easing curve draws in (2 px, stroke-dashoffset 0.5 s) with its two hollow handle circles on thin
// handle lines, while a dot rides it (x = time, y = progress) and a mono header types "cubic-bezier(…)" with a cursor;
// t / v readouts update every frame. Variants —
//  · build "keyframes-to-curve" (grace-sunnyy): key 1 diamond pops (0.25 s back.out, an outline diamond pulsing),
//    a straight line extends to key 2 (0.5 s power2.out), key 2 pops, then the straight path bends into the cubic
//    (control points tween from on-line to their handle spots, 0.6 s power3.inOut) and the handles fade in;
//  · morph: the curve morphs through `curves` presets (ease-in, ease-out, spring overshoot…), 0.4 s each, the header
//    swapping with it; · companion_ball: a ball beside the graph moving on the same ease with a ghost trail;
//  · loop: the dot keeps riding; · panel_position: corner (the reading-start top corner) | center | beside the target.
// With a chart / shape target the panel takes that target's corner, centre or side; with none, the picture region's.
// Code text (cubic-bezier, t / v) stays left-to-right in Arabic; the panel sits on the Arabic reading-start side.
// Sources: prompt-motion "johnsavage-ai-opus-5-5-prompt-make", "levabashidze-i-made-this-15",
// "grace-sunnyy-opus5-5-15" (reference only: rebuilt as our own code).
ML.define({
  id: "data.bezier-curve-plot",
  category: "data",
  name: "Bezier curve plot with travelling dot",
  does: "An easing curve draws on a small graph with its bezier handles while a dot rides along it and its cubic-bezier values type out above.",
  says: ["precision", "tech"],
  energy: 2,
  targets: ["chart", "shape"],
  duration: [1, 3],
  params: {
    ease: { type: "text", default: "cubic-bezier(0.83, 0, 0.17, 1)" },
    morph: { type: "bool", default: false },
    curves: { type: "number", range: [1, 4], default: 1 },
    companion_ball: { type: "bool", default: false },
    loop: { type: "bool", default: true },
    panel_position: { type: "choice", options: ["corner", "center", "beside"], default: "corner" },
    build: { type: "choice", options: ["draw", "keyframes-to-curve"], default: "draw" },
  },
  pairs: ["data.ball-on-easing-graph", "text-in.punchline"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "prompt-motion:grace-sunnyy-opus5-5-15", license: "reference", note: "+ johnsavage-ai-opus-5-5-prompt-make, levabashidze-i-made-this-15; our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const NS = "http://www.w3.org/2000/svg";
    const S = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, String(v)); if (parent) parent.append(e); return e; };
    const mk = (tag, css, text, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    // the curves: the given one first, then presets for the morph
    const NAMED = { ease: [0.25, 0.1, 0.25, 1], linear: [0, 0, 1, 1], "ease-in": [0.42, 0, 1, 1], "ease-out": [0, 0, 0.58, 1], "ease-in-out": [0.42, 0, 0.58, 1] };
    const parse = (s) => { const m = String(s).match(/-?\d*\.?\d+/g); return m && m.length >= 4 ? m.slice(0, 4).map(Number) : NAMED[String(s).trim()] || null; };
    const first = parse(p.ease) || [0.83, 0, 0.17, 1];
    const fmt = (c) => `cubic-bezier(${c.map((v) => +v.toFixed(2)).join(", ")})`;
    const nameOf = (c) => { const k = c.map((v) => v.toFixed(2)).join(","); return { "0.42,0.00,1.00,1.00": "ease-in", "0.00,0.00,0.58,1.00": "ease-out", "0.42,0.00,0.58,1.00": "ease-in-out", "0.34,1.56,0.64,1.00": "spring", "0.25,0.10,0.25,1.00": "ease" }[k] || (c[1] > 1 || c[3] > 1 ? "overshoot" : c[0] > c[2] ? "ease-in-out" : c[1] < c[0] ? "ease-in" : "ease-out"); };
    const PRESETS = [[0.42, 0, 1, 1], [0, 0, 0.58, 1], [0.34, 1.56, 0.64, 1], [0.42, 0, 0.58, 1]];
    const nC = p.morph ? Math.max(2, Math.round(ML.clamp(p.curves, 1, 4))) : 1;
    const list = [first, ...PRESETS.filter((c) => fmt(c) !== fmt(first))].slice(0, nC);
    // panel size and place
    const k = Math.min(f.W, f.H) / 1080;
    const gw = Math.round((f.wide ? 400 : 520) * k * (p.panel_position === "center" ? 1.35 : 1)), gh = Math.round(gw * 0.72);
    const pad = 26 * k, head = 76 * k, foot = 60 * k, ballW = p.companion_ball ? 70 * k : 0;
    const PW = gw + pad * 2 + ballW, PH = gh + head + foot + pad * 2;
    const scene = ctx.scene || ctx.stage, hb = ctx.box(scene);
    let x, y;
    if (p.panel_position === "beside" && el) {
      const b = ctx.box(el);
      x = rtl ? b.x - PW - 32 * k : b.x + b.w + 32 * k;
      if (x < f.m * 0.5 || x + PW > f.W - f.m * 0.5) x = rtl ? b.x + b.w - PW : b.x;
      y = ML.clamp(b.y + (b.h - PH) / 2, f.safe.y, f.safe.y + f.safe.h - PH);
      if (x === b.x || x === b.x + b.w - PW) y = ML.clamp(b.y + b.h + 24 * k, f.safe.y, f.safe.y + f.safe.h - PH);
    } else if (p.panel_position === "center" || p.panel_position === "beside") {
      const b = el ? ctx.box(el) : f.pic;
      x = b.x + (b.w - PW) / 2; y = b.y + (b.h - PH) / 2;
    } else {
      const b = el ? ctx.box(el) : { x: f.m, y: f.pic.y, w: f.W - 2 * f.m };
      x = rtl ? b.x + b.w - PW : b.x; y = b.y;
    }
    x = ML.clamp(x, f.m * 0.5, f.W - f.m * 0.5 - PW); y = ML.clamp(y, 8, f.H - PH - 8);
    const panel = mk("div", `position:absolute;left:${(x - hb.x).toFixed(1)}px;top:${(y - hb.y).toFixed(1)}px;width:${PW.toFixed(1)}px;height:${PH.toFixed(1)}px;z-index:12;pointer-events:none;box-sizing:border-box;padding:${pad.toFixed(1)}px;direction:ltr;will-change:transform`, null, scene);
    panel.className = "ml-panel";
    const monoFs = Math.max(13, Math.min(24 * k, gw / 18.6)); // the 30 characters of a cubic-bezier always fit the graph's width
    const hdr = mk("div", `display:flex;flex-direction:column;justify-content:flex-start;height:${head.toFixed(1)}px;gap:${(6 * k).toFixed(1)}px;white-space:nowrap;overflow:hidden`, null, panel);
    const hrow = mk("div", "display:flex;justify-content:space-between;align-items:baseline", null, hdr);
    const tag = mk("span", `font:var(--x-label-weight) ${(monoFs * 0.72).toFixed(1)}px var(--x-label-font);letter-spacing:var(--x-label-track);color:var(--x-dim)`, "GRAPH EDITOR", hrow);
    // the curve's name up here, clear of any handle wherever the curve puts them
    const name = mk("span", `font:italic 400 ${(monoFs * 1.2).toFixed(1)}px var(--x-serif-font);color:var(--x-dim)`, "", hrow);
    const code = mk("span", `font:500 ${monoFs.toFixed(1)}px var(--x-mono-font);color:var(--x-ink);white-space:pre`, "", hdr);
    const body = mk("div", "position:relative;display:flex;gap:0", null, panel);
    const svg = S("svg", { width: gw, height: gh, viewBox: `0 0 ${gw} ${gh}`, overflow: "visible" }, body);
    svg.style.overflow = "visible";
    // the plot: x 0..1 → left..right, y wide enough for every handle of every curve it will show
    const ys = list.flatMap((c) => [c[1], c[3]]), vLo = Math.min(0, ...ys) - 0.14, vHi = Math.max(1, ...ys) + 0.14;
    const X = (u) => u * gw, Y = (v) => gh - ((v - vLo) / (vHi - vLo)) * gh;
    const hair = Math.max(1, 1.2 * k);
    S("path", { d: `M0 0 L0 ${Y(0)} L${gw} ${Y(0)}`, fill: "none", stroke: "var(--x-line)", "stroke-width": hair * 1.4 }, svg);
    S("line", { x1: 0, y1: Y(1), x2: gw, y2: Y(1), stroke: "var(--x-line)", "stroke-width": hair, "stroke-dasharray": `${4 * k} ${5 * k}` }, svg);
    const hl1 = S("line", { stroke: "var(--x-dim)", "stroke-width": hair }, svg), hl2 = S("line", { stroke: "var(--x-dim)", "stroke-width": hair }, svg);
    const curve = S("path", { fill: "none", stroke: "var(--x-accent)", "stroke-width": Math.max(2, 3.2 * k), "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "1 2" }, svg);
    const hr = Math.max(4, 7 * k);
    const h1 = S("circle", { r: hr, fill: "var(--x-panel)", stroke: "var(--x-ink)", "stroke-width": hair * 1.4 }, svg), h2 = S("circle", { r: hr, fill: "var(--x-panel)", stroke: "var(--x-ink)", "stroke-width": hair * 1.4 }, svg);
    // keyframe diamonds (keyframes-to-curve build) / end points (draw build)
    const dm = Math.max(7, 12 * k);
    const diamond = (cx, cy) => { const g = S("g", { transform: `translate(${cx} ${cy})` }, svg); const o = S("rect", { x: -dm, y: -dm, width: dm * 2, height: dm * 2, fill: "none", stroke: "var(--x-accent)", "stroke-width": hair, transform: "rotate(45)" }, g); const i = S("rect", { x: -dm / 2, y: -dm / 2, width: dm, height: dm, fill: "var(--x-accent)", transform: "rotate(45)" }, g); return { g, o, i }; };
    const k1 = diamond(X(0), Y(0)), k2 = diamond(X(1), Y(1));
    const dotR = Math.max(5, 9 * k);
    const dot = S("circle", { r: dotR, fill: "var(--x-ink)", stroke: "var(--x-panel)", "stroke-width": hair * 1.5 }, svg);
    // the companion ball: a vertical track beside the graph, the ball on the same ease, ghosts behind it
    let ghosts = [], cball = null;
    if (p.companion_ball) {
      const cs = S("svg", { width: ballW, height: gh, overflow: "visible" }, body);
      cs.style.overflow = "visible";
      S("line", { x1: ballW / 2, y1: Y(0), x2: ballW / 2, y2: Y(1), stroke: "var(--x-line)", "stroke-width": hair }, cs);
      ghosts = [0.24, 0.16, 0.08].map((o) => S("circle", { cx: ballW / 2, r: dotR * 1.3, fill: "var(--x-accent)", opacity: o }, cs));
      cball = S("circle", { cx: ballW / 2, r: dotR * 1.3, fill: "var(--x-accent)" }, cs);
    }
    const ro = mk("div", `display:flex;justify-content:space-between;height:${foot.toFixed(1)}px;align-items:flex-end;font:500 ${monoFs.toFixed(1)}px var(--x-mono-font);color:var(--x-dim);font-variant-numeric:tabular-nums`, null, panel);
    const rt = mk("span", "", "t 0.00", ro), rv = mk("span", "", "v 0.00", ro);
    // timing
    const kf = p.build === "keyframes-to-curve";
    const T = kf ? { k1: at + 0.1, line: at + 0.35, k2: at + 0.8, bend: at + 0.95, ready: at + 1.55 } : { draw: at + 0.15, ready: at + 0.65 };
    const morphGap = list.length > 1 ? ML.clamp((end - 0.4 - T.ready - 0.3) / (list.length - 1), 0.5, 0.9) : 0.9; // every curve gets its turn inside the run
    const morphAt = list.map((_, i) => T.ready + 0.3 + i * morphGap); // when curve i is fully in (i ≥ 1 morphs over the 0.4 s before)
    const typeEnd = at + 0.15 + fmt(first).length * 0.025;
    ctx.sfx(at + 0.15, "key", 0.2);
    if (kf) { ctx.sfx(T.k1, "tap", 0.22); ctx.sfx(T.k2, "tap", 0.22); }
    list.forEach((_, i) => i && ctx.sfx(morphAt[i] - 0.4, "key", 0.2));
    const lerp = (a, b, u) => a + (b - a) * u;
    const io3 = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const curveAt = (t) => {
      let c = list[0];
      for (let i = 1; i < list.length; i++) { const u = io3(ML.lin(t, morphAt[i] - 0.4, morphAt[i])); if (u > 0) c = c.map((v, j) => lerp(v, list[i][j], u)); }
      return c;
    };
    // one ride 1.4 s; looping, the dot rests 0.25 s at the end of the curve before it starts over
    const ride = (t) => { const a = T.ready + 0.1, per = 1.4, rest = 0.25; if (t < a) return 0; const e = t - a; if (!p.loop) return Math.min(1, e / per); return Math.min(1, (e % (per + rest)) / per); };
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        panel.style.visibility = t >= at - 1e-6 ? "visible" : "hidden";
        panel.style.opacity = (ML.out(t, at, at + 0.25) * (1 - leave)).toFixed(4);
        let c = curveAt(t), bend = 1, drawn = 1, handles = 1;
        if (kf) {
          bend = io3(ML.lin(t, T.bend, T.bend + 0.6));
          handles = ML.lin(t, T.bend + 0.3, T.bend + 0.6);
          const pop = (g, a0) => { const u = ML.lin(t, a0, a0 + 0.25), cc = 1.7, y = u - 1, s = u <= 0 ? 0 : 1 + (cc + 1) * y * y * y + cc * y * y; return s; };
          const s1 = pop(k1, T.k1), s2 = pop(k2, T.k2);
          k1.g.setAttribute("transform", `translate(${X(0)} ${Y(0)}) scale(${s1.toFixed(4)})`);
          k2.g.setAttribute("transform", `translate(${X(1)} ${Y(1)}) scale(${s2.toFixed(4)})`);
          const pulse = (t - T.k1) % 1.2 / 1.2;
          k1.o.setAttribute("opacity", (t > T.k1 ? 1 - pulse : 0).toFixed(3)); k2.o.setAttribute("opacity", (t > T.k2 ? 1 - ((t - T.k2) % 1.2) / 1.2 : 0).toFixed(3));
          const lineU = 1 - Math.pow(1 - ML.lin(t, T.line, T.line + 0.5), 3);
          drawn = lineU;
          // control points from on-line (1/3, 2/3 of the straight key line) to their handle spots
          c = [lerp(1 / 3, c[0], bend), lerp(1 / 3, c[1], bend), lerp(2 / 3, c[2], bend), lerp(2 / 3, c[3], bend)];
        } else {
          k1.g.setAttribute("transform", `translate(${X(0)} ${Y(0)}) scale(${ML.lin(t, T.draw, T.draw + 0.15).toFixed(3)})`);
          k2.g.setAttribute("transform", `translate(${X(1)} ${Y(1)}) scale(${ML.lin(t, T.draw + 0.45, T.draw + 0.6).toFixed(3)})`);
          k1.o.setAttribute("opacity", "0"); k2.o.setAttribute("opacity", "0");
          drawn = ML.ease(t, T.draw, T.draw + 0.5);
          handles = ML.lin(t, T.draw + 0.3, T.ready);
        }
        const [x1, y1, x2, y2] = c;
        curve.setAttribute("d", `M${X(0)} ${Y(0)} C${X(x1).toFixed(2)} ${Y(y1).toFixed(2)} ${X(x2).toFixed(2)} ${Y(y2).toFixed(2)} ${X(1)} ${Y(1)}`);
        curve.setAttribute("stroke-dashoffset", (1 - drawn).toFixed(4));
        for (const [l, hc, ax, ay, bx2, by] of [[hl1, h1, 0, 0, x1, y1], [hl2, h2, 1, 1, x2, y2]]) {
          l.setAttribute("x1", X(ax)); l.setAttribute("y1", Y(ay)); l.setAttribute("x2", X(bx2).toFixed(2)); l.setAttribute("y2", Y(by).toFixed(2)); l.setAttribute("opacity", handles.toFixed(3));
          hc.setAttribute("cx", X(bx2).toFixed(2)); hc.setAttribute("cy", Y(by).toFixed(2)); hc.setAttribute("opacity", handles.toFixed(3));
        }
        // the dot: x = time, y = progress on the live curve
        const u = ride(t), v = ML.bezier(x1, y1, x2, y2)(u);
        const on = t >= T.ready + 0.1 ? 1 : 0;
        dot.setAttribute("cx", X(u).toFixed(2)); dot.setAttribute("cy", Y(v).toFixed(2)); dot.setAttribute("opacity", String(on));
        if (cball) { cball.setAttribute("cy", Y(v).toFixed(2)); cball.setAttribute("opacity", String(on)); ghosts.forEach((g, i) => { const ug = Math.max(0, u - (i + 1) * 0.06); g.setAttribute("cy", Y(ML.bezier(x1, y1, x2, y2)(ug)).toFixed(2)); g.setAttribute("opacity", (on * [0.24, 0.16, 0.08][i]).toFixed(3)); }); }
        // header: typed with a cursor, then swapped with the morph
        const label = fmt(c.map((q) => +q.toFixed(2)));
        const typed = t < typeEnd ? ML.typed(label, t, at + 0.15, typeEnd) : label;
        code.textContent = typed + (t < typeEnd + 0.6 && ML.blink(t, 0.5) ? "▍" : " ");
        name.textContent = nameOf(c.map((q) => +q.toFixed(2)));
        name.style.opacity = ML.lin(t, T.ready - 0.2, T.ready + 0.1).toFixed(3);
        tag.style.opacity = ML.lin(t, at + 0.1, at + 0.35).toFixed(3);
        rt.textContent = `t ${u.toFixed(2)}`; rv.textContent = `v ${v.toFixed(2)}`;
        ro.style.opacity = String(on);
      },
    };
  },
});

// Playhead scrub: a graph with two keyframe diamonds and the easing curve between them. A thin accent playhead with a
// small flag on top (the frame number, or the percent) sweeps linearly from key 1 to key 2 in `speed` seconds while a
// dot rides the curve at the intersection (y = curve(x)) and the traversed part of the curve turns ink. Under it a
// timeline with ticks and an accent progress bar advances in sync, with a frame counter. Arabic: time runs right to
// left (key 1 on the right). Rebuilt as our own code from the reference's technique (no code or pixels copied).
// Source: prompt-motion grace-sunnyy-opus5-5-15 (reference).
ML.define({
  id: "data.playhead-scrub",
  category: "data",
  name: "Playhead scrubs along a curve",
  does: "A vertical playhead with a frame flag sweeps across a graph while a dot rides the curve and a timeline bar advances.",
  says: ["time", "precision", "tech"],
  energy: 2,
  targets: ["chart", "stage"],
  duration: [0.8, 3],
  params: {
    speed: { type: "number", range: [0.4, 2], default: 0.8, unit: "s" },
    flag: { type: "choice", options: ["frame", "percent"], default: "frame" },
    timeline: { type: "bool", default: true },
    curve: { type: "choice", options: ["in-out", "out", "in", "linear"], default: "in-out" },
    fps: { type: "number", range: [24, 60], default: 30 },
  },
  pairs: ["data.playhead-ruler", "data.ball-on-easing-graph"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:grace-sunnyy-opus5-5-15", license: "reference", note: "technique rebuilt as our own SVG code" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const k = Math.min(f.W, f.H) / 1080;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, text, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const sv = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs || {})) e.setAttribute(a, String(v)); if (parent) parent.append(e); return e; };
    // where it lives: inside its target when that is a chart box, else across the picture region
    const parent = ctx.scene || ctx.stage;
    const asBox = el && el !== ctx.stage && el.offsetHeight > 260 * k && el.offsetWidth > 360 * k;
    if (asBox && getComputedStyle(el).position === "static") el.style.position = "relative";
    const host = asBox
      ? mk("div", "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:4", null, el)
      : mk("div", "position:absolute;left:var(--pic-x);top:var(--pic-y);width:var(--pic-w);height:var(--pic-h);z-index:4;background:var(--x-ground);display:flex;align-items:center;justify-content:center", null, parent);
    const BW = asBox ? el.clientWidth : f.pic.w, BH = asBox ? el.clientHeight : f.pic.h;
    const SW = Math.min(BW * 0.96, 1500 * k), SH = Math.min(BH * 0.94, SW * (p.timeline ? 0.8 : 0.66));
    const svg = sv("svg", { width: SW.toFixed(1), height: SH.toFixed(1), viewBox: `0 0 ${SW.toFixed(1)} ${SH.toFixed(1)}`, overflow: "visible" }, host);
    const x0 = SW * 0.08, x1 = SW * 0.92, yTop = Math.max(SH * (p.timeline ? 0.2 : 0.22), 130 * k), yBot = SH * (p.timeline ? 0.68 : 0.86);
    const curves = { "in-out": [0.65, 0, 0.35, 1], out: [0.22, 1, 0.36, 1], in: [0.55, 0, 1, 0.45], linear: [0, 0, 1, 1] };
    const cb = curves[p.curve] || curves["in-out"], fn = p.curve === "linear" ? (x) => x : ML.bezier(...cb);
    const X = (u) => (rtl ? x1 - u * (x1 - x0) : x0 + u * (x1 - x0)), Y = (v) => yBot - v * (yBot - yTop);
    const lineW = Math.max(1, 1.6 * k), mono = `font-family:var(--x-mono-font);direction:ltr;unicode-bidi:isolate`;
    // code label over the graph, on the reading-start side
    const code = sv("text", { x: rtl ? x1 : x0, y: yTop - 104 * k, "text-anchor": rtl ? "end" : "start", "font-size": (24 * k).toFixed(1), fill: "var(--x-dim)", style: mono }, svg);
    code.textContent = p.curve === "linear" ? "ease: linear" : `cubic-bezier(${cb.join(", ")})`;
    // grid: baseline, a dashed top line, the value axis at key 1
    sv("line", { x1: x0, x2: x1, y1: yBot, y2: yBot, stroke: "var(--x-line)", "stroke-width": lineW }, svg);
    sv("line", { x1: x0, x2: x1, y1: yTop, y2: yTop, stroke: "var(--x-line)", "stroke-width": lineW, "stroke-dasharray": `${6 * k} ${8 * k}` }, svg);
    sv("line", { x1: X(0), x2: X(0), y1: yTop - 20 * k, y2: yBot + 20 * k, stroke: "var(--x-line)", "stroke-width": lineW }, svg);
    const tagA = sv("text", { x: X(0) + (rtl ? -14 : 14) * k, y: yBot + 40 * k, "text-anchor": rtl ? "end" : "start", "font-size": (20 * k).toFixed(1), fill: "var(--x-dim)", style: mono }, svg); tagA.textContent = "0.0";
    const tagB = sv("text", { x: X(1) + (rtl ? -26 : 26) * k, y: yTop + 7 * k, "text-anchor": rtl ? "end" : "start", "font-size": (20 * k).toFixed(1), fill: "var(--x-dim)", style: mono }, svg); tagB.textContent = "1.0";
    // the curve: faint in full, ink up to the playhead (the inked path is rebuilt each frame up to u)
    const curveTo = (u1) => { const N = Math.max(1, Math.ceil(80 * u1)); let d = ""; for (let i = 0; i <= N; i++) { const u = (u1 * i) / N; d += `${i ? "L" : "M"}${X(u).toFixed(2)} ${Y(fn(u)).toFixed(2)}`; } return d; };
    const faint = sv("path", { d: curveTo(1), fill: "none", stroke: "var(--x-dim)", "stroke-width": (2.5 * k).toFixed(2), "stroke-opacity": 0.35, "stroke-linecap": "round" }, svg);
    const inked = sv("path", { d: "M0 0", fill: "none", stroke: "var(--x-ink)", "stroke-width": (3.5 * k).toFixed(2), "stroke-linecap": "round" }, svg);
    // movers carry a transparent rect spanning the whole graph, so each move repaints the graph, not a small patch
    const cover = (g) => sv("rect", { x: -SW * 1.5, y: -SH * 1.5, width: SW * 3, height: SH * 3, fill: "transparent" }, g);
    // the two keyframe diamonds
    const dia = (u) => { const s = 15 * k, cx = X(u), cy = Y(fn(u)); return sv("path", { d: `M${cx} ${cy - s}L${cx + s} ${cy}L${cx} ${cy + s}L${cx - s} ${cy}Z`, fill: "var(--x-ground)", stroke: "var(--x-accent)", "stroke-width": (2.5 * k).toFixed(2) }, svg); };
    const keyA = dia(0), keyB = dia(1);
    // the playhead: line, flag with its counter, the riding dot
    const head = sv("g", {}, svg);
    cover(head);
    sv("line", { x1: 0, x2: 0, y1: yTop - 34 * k, y2: yBot + 12 * k, stroke: "var(--x-accent)", "stroke-width": Math.max(1.5, 2 * k).toFixed(2) }, head);
    const fw = 92 * k, fh = 36 * k;
    sv("rect", { x: -fw / 2, y: yTop - 34 * k - fh, width: fw, height: fh, rx: 4 * k, fill: "var(--x-accent)" }, head);
    const flag = sv("text", { x: 0, y: yTop - 34 * k - fh * 0.3, "text-anchor": "middle", "font-size": (21 * k).toFixed(1), "font-weight": 600, fill: "var(--x-accent-ink)", style: mono }, head);
    const dotG = sv("g", {}, svg);
    cover(dotG);
    sv("circle", { r: (9 * k).toFixed(2), fill: "var(--x-accent)", stroke: "var(--x-ground)", "stroke-width": (3 * k).toFixed(2) }, dotG);
    // the timeline under the graph
    const tl = sv("g", {}, svg), ty = SH * 0.88, ticks = 24;
    if (p.timeline) {
      sv("line", { x1: x0, x2: x1, y1: ty, y2: ty, stroke: "var(--x-line)", "stroke-width": (4 * k).toFixed(2), "stroke-linecap": "round" }, tl);
      for (let i = 0; i <= ticks; i++) { const x = x0 + (i / ticks) * (x1 - x0); sv("line", { x1: x, x2: x, y1: ty - (i % 4 === 0 ? 16 : 9) * k, y2: ty - 5 * k, stroke: "var(--x-dim)", "stroke-opacity": 0.5, "stroke-width": lineW }, tl); }
    }
    const bar = sv("line", { y1: ty, y2: ty, stroke: "var(--x-accent)", "stroke-width": (4 * k).toFixed(2), "stroke-linecap": "round" }, tl);
    const counter = sv("text", { x: rtl ? x0 : x1, y: ty + 46 * k, "text-anchor": rtl ? "start" : "end", "font-size": (22 * k).toFixed(1), fill: "var(--x-dim)", style: mono }, tl);
    if (!p.timeline) tl.style.display = "none";
    const s0 = at + 0.4, s1 = Math.min(s0 + p.speed, Math.max(s0 + 0.3, end - 0.15)), total = Math.max(1, Math.round(p.speed * p.fps));
    ctx.sfx(s0, "tap", 0.3);
    ctx.sfx(s1, "blip", 0.35);
    return {
      draw(t) {
        ML.show(host, t, at);
        const u = ML.lin(t, s0, s1), px = X(u), py = Y(fn(u)), frame = Math.round(u * total);
        const showK = ML.out(t, at + 0.1, at + 0.35);
        faint.style.opacity = showK.toFixed(4);
        keyA.style.opacity = showK.toFixed(4);
        keyA.setAttribute("fill", t >= s0 ? "var(--x-accent)" : "var(--x-ground)");
        keyB.style.opacity = ML.out(t, at + 0.2, at + 0.45).toFixed(4);
        keyB.setAttribute("fill", u >= 1 ? "var(--x-accent)" : "var(--x-ground)");
        inked.setAttribute("d", u > 0 ? curveTo(u) : "M0 0");
        inked.style.opacity = u > 0 ? "1" : "0";
        const hk = ML.out(t, at + 0.25, s0);
        head.setAttribute("transform", `translate(${px.toFixed(2)} 0)`);
        head.style.opacity = hk.toFixed(4);
        dotG.setAttribute("transform", `translate(${px.toFixed(2)} ${py.toFixed(2)})`);
        dotG.style.opacity = hk.toFixed(4);
        flag.textContent = p.flag === "percent" ? `${Math.round(u * 100)}%` : String(frame).padStart(3, "0");
        tagB.textContent = fn(u).toFixed(2);
        bar.setAttribute("x1", X(0).toFixed(2)); bar.setAttribute("x2", px.toFixed(2));
        bar.style.opacity = u > 0.002 ? "1" : "0";
        counter.textContent = `f ${String(frame).padStart(3, "0")} / ${String(total).padStart(3, "0")}`;
        tl.style.opacity = showK.toFixed(4);
      },
    };
  },
});

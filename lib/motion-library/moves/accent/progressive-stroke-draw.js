// Pattern builds stroke by stroke: a geometric pattern (a kumiko lattice, seigaiha wave arcs, a joinery grid, or the
// target SVG's own strokes) builds itself as the chapter runs, like a craftsman fitting the pieces. Ported from
// MengTo/Skills horizontal-scroll-scenes (MIT): every stroke has pathLength=1 and a delay k; it draws with
// stroke-dashoffset = 1 − clamp((e·gain − k)·5, 0, 1), e = smoothstep(progress), gain 1.35 (lattice / grid) or 1.5
// (waves) — so each stroke draws over a fifth of the progress and the wave of drawing travels across the panel. The
// bare skeleton (k = −1) is there from the start. Progress is the move's own dwell clock (at → end).
// Sweep: diagonal (the source's (row + col) delays), left-right (inline start → end: right to left in Arabic), radial
// (from the middle out). Target: the shape is built as a panel in the picture region; on an image the pattern is
// drawn over it; custom-svg draws a target SVG's own geometry (a logo) and fades its fill in once the strokes close.
ML.define({
  id: "accent.progressive-stroke-draw",
  category: "accent",
  name: "Pattern builds stroke by stroke",
  does: "A geometric pattern (lattice, waves) builds itself stroke by stroke in a sweep as the chapter progresses, like a craftsman fitting the pieces.",
  says: ["step", "growth", "precision", "story"],
  energy: 2,
  targets: ["shape", "image", "logo"],
  duration: [1, 4],
  params: {
    pattern: { type: "choice", options: ["lattice", "waves", "grid", "custom-svg"], default: "lattice" },
    sweep: { type: "choice", options: ["diagonal", "left-right", "radial"], default: "diagonal" },
  },
  pairs: ["camera.push-in", "accent.callout-leader"],
  avoid: ["urgency", "speed"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/horizontal-scroll-scenes", license: "MIT", note: "demo.html art() lattice + seigaiha strokes and the .st0 / .st1 dash-offset rule, generalised to any box, sweep and look" },
  setup(ctx) {
    const { el, p, at, end, rtl, stage, f } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v); if (parent) parent.append(e); return e; };
    const host = ctx.scene || stage;
    const target = el && el !== stage ? el : null;
    const isSvg = target && target.namespaceURI === NS && target.tagName.toLowerCase() === "svg";
    const pattern = p.pattern === "custom-svg" && !isSvg ? "lattice" : p.pattern;
    const onImage = target && !isSvg && target.tagName === "IMG";

    // the box: over the target (image / svg), else a 4:3 panel built in the picture region
    let B;
    if (target) B = ctx.box(target);
    else {
      const w0 = Math.min(f.pic.w * 0.9, f.pic.h * 0.9 * (4 / 3)), h0 = w0 * 0.75;
      B = { x: f.pic.x + (f.pic.w - w0) / 2, y: f.pic.y + (f.pic.h - h0) / 2, w: w0, h: h0 };
    }
    const framed = !target; // the built panel has a frame (the source's board); over a picture only the strokes
    const DW = 640, DH = (DW * B.h) / Math.max(1, B.w);
    const layer = doc.createElement("div");
    layer.style.cssText = `position:absolute;left:${B.x}px;top:${B.y}px;width:${B.w}px;height:${B.h}px;pointer-events:none;z-index:${framed ? 6 : 20};visibility:hidden`;
    host.append(layer);
    const svg = sv("svg", { viewBox: `0 0 ${DW} ${DH.toFixed(2)}`, width: "100%", height: "100%", preserveAspectRatio: "none", style: "display:block;overflow:visible" }, layer);
    const M = framed ? 24 : 0; // inner margin (the frame)
    if (framed) {
      sv("rect", { x: 8, y: 8, width: DW - 16, height: (DH - 16).toFixed(2), rx: 6, style: "fill:color-mix(in srgb, var(--x-ink) 10%, var(--x-panel-2));stroke:color-mix(in srgb, var(--x-ink) 30%, var(--x-panel-2));stroke-width:16" }, svg);
      sv("rect", { x: M, y: M, width: DW - 2 * M, height: (DH - 2 * M).toFixed(2), style: "fill:var(--x-panel)" }, svg);
    }
    const IW = DW - 2 * M, IH = DH - 2 * M;
    const g = sv("g", { fill: "none", "stroke-linecap": "round", style: `stroke:var(--x-accent);stroke-width:${pattern === "waves" ? 4 : 5}` }, svg);

    // the sweep coordinate s ∈ [0, 1] of a point (design units); inline start is the right in Arabic
    const xn = (x) => { const v = ML.clamp((x - M) / IW); return rtl ? 1 - v : v; };
    const yn = (y) => ML.clamp((y - M) / IH);
    const rn = (x, y) => ML.clamp(Math.hypot(x - DW / 2, y - DH / 2) / Math.hypot(IW / 2, IH / 2));
    const strokes = []; // { e, k }
    const add = (e, k) => { e.setAttribute("pathLength", "1"); e.setAttribute("stroke-dasharray", "1"); strokes.push({ e, k }); };
    const line = (x1, y1, x2, y2, k) => add(sv("line", { x1: x1.toFixed(2), y1: y1.toFixed(2), x2: x2.toFixed(2), y2: y2.toFixed(2) }, g), k);
    let gain = 1.35;

    if (pattern === "lattice") {
      // kumiko: the bare grid is there at the opening; the diagonals are fitted over the dwell
      const C = 8, R = Math.max(2, Math.round((IH / IW) * C * (74 / 72))), cw = IW / C, ch = IH / R;
      for (let r = 1; r < R; r++) line(M, M + r * ch, M + IW, M + r * ch, -1);
      for (let c = 1; c < C; c++) line(M + c * cw, M, M + c * cw, M + IH, -1);
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        const x = M + c * cw, y = M + r * ch, cx = x + cw / 2, cy = y + ch / 2;
        // the source: k = 0.02 + (row + col)·0.075 on its 6 × 8 board → 0.02 + 0.525·col share + 0.375·row share
        const k = p.sweep === "radial" ? 0.02 + 0.9 * rn(cx, cy) : p.sweep === "left-right" ? 0.02 + 0.9 * xn(cx) : 0.02 + 0.525 * xn(cx) + 0.375 * yn(cy);
        line(x, y, x + cw, y + ch, k); line(x + cw, y, x, y + ch, k + 0.01);
      }
    } else if (pattern === "waves") {
      // seigaiha: rows of concentric arcs, carved in across the board (bottom rows first, as in the source)
      gain = 1.5;
      const RAD = [46, 34, 22, 10], dx = 92, dy = 68;
      const rows = Math.max(2, Math.floor((IH - 30) / dy) + 1);
      for (let r = 0; r < rows; r++) for (let c = 0; c < 8; c++) {
        const cx = M + 46 + c * dx + (r % 2 ? 46 : 0), cy = M + IH - 10 - r * dy;
        if (cx - 46 < M - 4 || cx + 46 > M + IW + 2 || cy - 66 < M - 4) continue;
        RAD.forEach((rad, j) => {
          const s = p.sweep === "radial" ? 0.415 * rn(cx, cy) : p.sweep === "left-right" ? 0.415 * xn(cx) : 0.315 * xn(cx) + 0.1 * (1 - yn(cy));
          add(sv("path", { d: `M${(cx - rad).toFixed(2)} ${(cy - 20).toFixed(2)} A${rad} ${rad} 0 0 1 ${(cx + rad).toFixed(2)} ${(cy - 20).toFixed(2)}` }, g), s + j * 0.012);
        });
      }
    } else if (pattern === "grid") {
      // joinery grid: the outer edge is there; every cell edge is fitted in turn
      const C = 6, R = Math.max(2, Math.round((IH / IW) * C)), cw = IW / C, ch = IH / R;
      add(sv("rect", { x: M, y: M, width: IW, height: IH.toFixed(2) }, g), -1);
      const kOf = (x, y) => (p.sweep === "radial" ? 0.02 + 0.9 * rn(x, y) : p.sweep === "left-right" ? 0.02 + 0.9 * xn(x) : 0.02 + 0.5 * xn(x) + 0.4 * yn(y));
      for (let r = 1; r < R; r++) for (let c = 0; c < C; c++) { const y = M + r * ch, x = M + c * cw; line(rtl ? x + cw : x, y, rtl ? x : x + cw, y, kOf(x + cw / 2, y)); }
      for (let c = 1; c < C; c++) for (let r = 0; r < R; r++) { const x = M + c * cw, y = M + r * ch; line(x, y, x, y + ch, kOf(x, y + ch / 2) + 0.01); }
    } else {
      // custom-svg: the target's own geometry, redrawn as strokes over it in its own coordinates
      const vb = target.viewBox && target.viewBox.baseVal && target.viewBox.baseVal.width ? target.viewBox.baseVal : { x: 0, y: 0, width: B.w, height: B.h };
      svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
      svg.setAttribute("preserveAspectRatio", target.getAttribute("preserveAspectRatio") || "xMidYMid meet");
      g.style.strokeWidth = String(Math.max(vb.width, vb.height) / 160);
      const parts = [...target.querySelectorAll("path, line, rect, circle, ellipse, polyline, polygon, text")];
      const boxes = parts.map((e) => { try { return e.getBBox(); } catch { return { x: 0, y: 0, width: 0, height: 0 }; } });
      parts.forEach((e, i) => {
        const b = boxes[i], cx = b.x + b.width / 2, cy = b.y + b.height / 2;
        const sx = ML.clamp((cx - vb.x) / vb.width), sy = ML.clamp((cy - vb.y) / vb.height), s = rtl ? 1 - sx : sx;
        const k = p.sweep === "radial" ? 0.9 * ML.clamp(Math.hypot(sx - 0.5, sy - 0.5) / 0.71) : p.sweep === "left-right" ? 0.9 * s : 0.5 * s + 0.4 * sy;
        if (e.tagName === "text") {
          // text has no length: its outline is traced by a stroked copy whose dashes run along the glyphs
          const c = e.cloneNode(true); c.removeAttribute("fill"); c.style.fill = "none"; c.style.stroke = "var(--x-accent)"; g.append(c);
          c.setAttribute("stroke-dasharray", "1"); c.setAttribute("pathLength", "1");
          strokes.push({ e: c, k, text: true });
        } else {
          const c = e.cloneNode(false); c.removeAttribute("fill"); c.removeAttribute("style"); c.style.fill = "none"; g.append(c);
          add(c, k);
        }
      });
    }
    // the original SVG's fill arrives once its strokes have closed
    if (pattern === "custom-svg") target.style.opacity = "0";
    ctx.sfx(at, "tap", 0.2);
    ctx.sfx(at + (end - at) * 0.5, "tap", 0.15);
    const span = Math.max(0.3, end - at - (framed ? 0.3 : 0.1));

    return {
      draw(t) {
        const vis = t >= at - 0.3 && t < end;
        layer.style.visibility = vis ? "visible" : "hidden";
        if (!vis) { if (pattern === "custom-svg") target.style.opacity = t >= end ? "1" : "0"; return; }
        // the panel arrives the look's way just before the build starts, and leaves at the end
        if (framed) ML.show(layer, t, at - 0.3, end - 0.25);
        else layer.style.opacity = String(1 - ML.ease(t, end - 0.25, end));
        const x = ML.clamp((t - at) / span), e = x * x * (3 - 2 * x); // smoothstep(progress)
        for (const s of strokes) {
          const d = s.k < 0 ? 1 : ML.clamp((e * gain - s.k) * 5);
          s.e.setAttribute("stroke-dashoffset", (1 - d).toFixed(4));
          s.e.style.visibility = d > 0.001 ? "visible" : "hidden";
          if (s.text) s.e.style.strokeWidth = (0.6 + 0.4 * d).toFixed(2);
        }
        if (pattern === "custom-svg") {
          const fill = ML.ease(t, at + span * 0.8, at + span);
          target.style.opacity = fill.toFixed(4);
          g.style.opacity = String(1 - fill * 0.85);
        }
      },
    };
  },
});

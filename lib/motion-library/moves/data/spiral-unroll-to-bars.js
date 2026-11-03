// Spiral unroll to bars: a Fibonacci tiling of tinted squares (1, 1, 2, 3, 5, 8, 13 …) with the golden spiral drawn
// through them; the squares detach, slide along the curve and line up in reading order, smallest → largest on a 1 px
// floor line, while the curve itself flattens into that floor with a slight upturn at its end. Each square tweens its
// rect from its tiling slot to its floor slot over 0.8 s on cubic-bezier(0.65, 0, 0.35, 1), 0.04 s apart from the
// smallest (or the largest), with a 4 px blur only while it travels (shapes, never a picture). The curve is sampled as
// one polyline and interpolated point by point to the floor. Ends: bars (equal columns, height by size), row (the
// squares at their own sizes, a staircase) or grid (equal squares). Before the unroll the tiling builds square by square.
// Source: prompt-motion:ddryo-loos-bgm-opus-5-5-lism-css (reference only — rebuilt as our own SVG code).
ML.define({
  id: "data.spiral-unroll-to-bars",
  category: "data",
  name: "Spiral squares unroll into bars",
  does: "Squares detach from a spiral, slide along the curve and line up as an ascending staircase while the curve flattens into the floor line.",
  says: ["growth", "change", "scale", "list"],
  energy: 3,
  targets: ["chart", "shape", "list"],
  duration: [1.2, 2.5],
  params: {
    target: { type: "choice", options: ["bars", "grid", "row"], default: "bars" },
    order: { type: "choice", options: ["smallest-first", "largest-first"], default: "smallest-first" },
    stagger: { type: "number", range: [0.02, 0.1], default: 0.04, unit: "s" },
    squares: { type: "number", range: [5, 10], default: 8 },
    labels: { type: "bool", default: true },
  },
  pairs: ["data.segment-bars-grow", "data.ringed-stat"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:ddryo-loos-bgm-opus-5-5-lism-css", license: "reference", note: "technique rebuilt as our own SVG code" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const NS = "http://www.w3.org/2000/svg";
    const sv = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const a in attrs) e.setAttribute(a, attrs[a]); if (parent) parent.append(e); return e; };
    const u = Math.min(f.W, f.H) / 1080;
    const host = ctx.scene || stage, hb = ctx.box(host);
    // the area: the target's box when it is big enough, else the picture region
    let area = f.pic;
    if (el) { const b = ctx.box(el); if (b.h > 0.25 * Math.min(f.W, f.H)) area = b; }
    const n = Math.round(ML.clamp(p.squares, 5, 10));
    const F = [1, 1]; while (F.length < n) F.push(F[F.length - 1] + F[F.length - 2]);
    // Fibonacci tiling: square 0 at the origin, 1 to its right, then above, left, below, right … around the box
    const sq = [{ x: 0, y: 0, s: 1 }, { x: 1, y: 0, s: 1 }];
    let bx0 = 0, by0 = 0, bx1 = 2, by1 = 1;
    for (let i = 2; i < n; i++) {
      const s = F[i], d = (i - 2) % 4;
      let q;
      if (d === 0) { q = { x: bx0, y: by0 - s, s }; by0 -= s; }
      else if (d === 1) { q = { x: bx0 - s, y: by0, s }; bx0 -= s; }
      else if (d === 2) { q = { x: bx0, y: by1, s }; by1 += s; }
      else { q = { x: bx1, y: by0, s }; bx1 += s; }
      sq.push(q);
    }
    // the golden spiral: a quarter arc through each square, corner to opposite corner, centred on the inner corner
    const corners = (q) => [[q.x, q.y], [q.x + q.s, q.y], [q.x + q.s, q.y + q.s], [q.x, q.y + q.s]];
    const same = (a, b) => Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
    let P = [1, 1]; // the point square 0 and square 1 share, where the next arc continues
    const arcs = [];
    arcs.push({ from: [0, 0], to: P, c: [0, 1] });
    for (let i = 1; i < n; i++) {
      const cs = corners(sq[i]);
      let k = cs.findIndex((c) => same(c, P));
      if (k < 0) k = 0;
      const to = cs[(k + 2) % 4];
      const o1 = cs[(k + 1) % 4], o2 = cs[(k + 3) % 4];
      // the inner corner: nearer the tiling built so far
      const prev = sq.slice(0, i), mx = prev.reduce((a, q) => a + (q.x + q.s / 2) * q.s * q.s, 0) / prev.reduce((a, q) => a + q.s * q.s, 0), my = prev.reduce((a, q) => a + (q.y + q.s / 2) * q.s * q.s, 0) / prev.reduce((a, q) => a + q.s * q.s, 0);
      const dist = (c) => Math.hypot(c[0] - mx, c[1] - my);
      arcs.push({ from: P, to, c: dist(o1) < dist(o2) ? o1 : o2 });
      P = to;
    }
    // fit the tiling into the area (mirrored in Arabic so the spiral opens toward the reading end)
    const TW = bx1 - bx0, TH = by1 - by0;
    const sc = Math.min((area.w * 0.86) / TW, (area.h * 0.62) / TH);
    const ox = area.x + (area.w - TW * sc) / 2, oy = area.y + area.h * 0.06 + (area.h * 0.62 - TH * sc) / 2;
    const map = (x, y) => { const X = (x - bx0) * sc, Y = (y - by0) * sc; return [rtl ? ox + TW * sc - X : ox + X, oy + Y]; };
    // the floor: bottom of the area, the row of finals across most of its width, in reading order
    const floorY = area.y + area.h * 0.9, floorW = area.w * 0.86, floorX = area.x + (area.w - floorW) / 2;
    const gap = 10 * u;
    let finals;
    if (p.target === "row") {
      const k2 = Math.min((floorW - gap * (n - 1)) / F.reduce((a, b) => a + b, 0), (area.h * 0.8) / F[n - 1]);
      let x = 0; finals = F.map((s) => { const r = { x, w: s * k2, h: s * k2 }; x += s * k2 + gap; return r; });
      const used = x - gap, off = (floorW - used) / 2; finals.forEach((r) => (r.x += off));
    } else if (p.target === "grid") {
      const cols = Math.ceil(n / 2), cw = Math.min((floorW - gap * (cols - 1)) / cols, (area.h * 0.36));
      const used = cols * cw + (cols - 1) * gap, off = (floorW - used) / 2;
      finals = F.map((_, i) => ({ x: off + (i % cols) * (cw + gap), w: cw, h: cw, row: Math.floor(i / cols) }));
    } else {
      const cw = (floorW - gap * (n - 1)) / n, hmax = area.h * 0.72;
      finals = F.map((s, i) => ({ x: i * (cw + gap), w: cw, h: Math.max(cw * 0.25, (hmax * Math.sqrt(s)) / Math.sqrt(F[n - 1])) }));
    }
    const endRect = (i) => {
      const r = finals[i];
      const y = p.target === "grid" /* grid: the second row on the floor, the first above it */ ? floorY - r.h - (r.row === 0 ? r.h + gap : 0) : floorY - r.h;
      const x = rtl ? floorX + floorW - r.x - r.w : floorX + r.x;
      return { x, y, w: r.w, h: r.h };
    };
    const startRect = (i) => { const q = sq[i], a = map(q.x, q.y), b = map(q.x + q.s, q.y + q.s); return { x: Math.min(a[0], b[0]), y: a[1], w: Math.abs(b[0] - a[0]), h: b[1] - a[1] }; };

    // the svg over the stage
    const svg = sv("svg", { width: f.W, height: f.H, viewBox: `0 0 ${f.W} ${f.H}` });
    svg.style.cssText = `position:absolute;left:${-hb.x}px;top:${-hb.y}px;overflow:visible;pointer-events:none;z-index:15;will-change:opacity`; // its own layer: the same pixels whatever frame came before
    host.append(svg);
    const floor = sv("line", { x1: floorX, x2: floorX + floorW, y1: floorY + 0.5, y2: floorY + 0.5 }, svg);
    floor.setAttribute("style", `stroke:color-mix(in srgb, var(--x-ink) 45%, transparent);stroke-width:${Math.max(1, u)}`);
    const rects = sq.map((_, i) => {
      const g = sv("g", {}, svg);
      const r = sv("rect", {}, g);
      const mixA = Math.round(70 - (i / (n - 1)) * 52); // small squares deeper, large ones paler
      r.setAttribute("style", `fill:color-mix(in srgb, var(--x-accent) ${mixA}%, var(--x-panel));stroke:color-mix(in srgb, var(--x-accent) 40%, transparent);stroke-width:${Math.max(1, u)}`);
      let txt = null;
      if (p.labels && i >= 2) { txt = sv("text", {}, g); txt.textContent = String(F[i]); txt.setAttribute("style", `fill:color-mix(in srgb, var(--x-ink) 70%, transparent);font:var(--x-label-weight) 1px var(--x-mono-font);direction:ltr`); }
      return { g, r, txt };
    });
    // the curve: sampled arcs → floor points (the spiral's length mapped along the floor, a slight upturn at its end)
    const pts = [];
    arcs.forEach((a, i) => {
      const a0 = Math.atan2(a.from[1] - a.c[1], a.from[0] - a.c[0]);
      let a1 = Math.atan2(a.to[1] - a.c[1], a.to[0] - a.c[0]);
      let d = a1 - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      const R = Math.hypot(a.from[0] - a.c[0], a.from[1] - a.c[1]);
      for (let j = i === 0 ? 0 : 1; j <= 10; j++) { const ang = a0 + (d * j) / 10; pts.push(map(a.c[0] + R * Math.cos(ang), a.c[1] + R * Math.sin(ang))); }
    });
    const M = pts.length;
    const flat = pts.map((_, j) => { const s = j / (M - 1), x = rtl ? floorX + floorW - s * floorW : floorX + s * floorW; return [x, floorY - Math.pow(s, 5) * area.h * 0.22]; });
    const curve = sv("path", {}, svg);
    curve.setAttribute("style", `fill:none;stroke:color-mix(in srgb, var(--x-ink) 75%, transparent);stroke-width:${Math.max(1.2, 1.6 * u)};stroke-linecap:round`);
    let curveLen = 0; for (let j = 1; j < M; j++) curveLen += Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]);

    // timing: the tiling builds (squares pop in, the curve draws), holds a beat, then unrolls
    const span = Math.max(1.2, end - at);
    const build = Math.min(0.9, span * 0.35);
    const pop = (i) => at + (i / n) * build * 0.8;
    const u0 = at + build + 0.15;
    // the unroll lands before the move leaves, however short the run: travel and stagger compress together
    const stGiven = ML.clamp(p.stagger, 0.02, 0.1), room = Math.max(0.4, end - 0.35 - u0), fitK = Math.min(1, room / (0.8 + stGiven * (n - 1)));
    const st = stGiven * fitK, travel = 0.8 * fitK;
    const seq = (i) => (p.order === "largest-first" ? n - 1 - i : i);
    const curveEnd = u0 + travel + st * (n - 1);
    const bz = ML.bezier(0.65, 0, 0.35, 1);
    ctx.sfx(at, "pop.soft", 0.22);
    ctx.sfx(u0, "whoosh.soft", 0.4);
    ctx.sfx(curveEnd, "land.light", 0.25);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        svg.style.visibility = t >= at - 1e-6 ? "visible" : "hidden";
        svg.style.opacity = (1 - leave).toFixed(4);
        const cq = bz(ML.lin(t, u0, curveEnd));
        let dpath = "";
        for (let j = 0; j < M; j++) { const x = pts[j][0] + (flat[j][0] - pts[j][0]) * cq, y = pts[j][1] + (flat[j][1] - pts[j][1]) * cq; dpath += (j ? "L" : "M") + x.toFixed(2) + " " + y.toFixed(2); }
        curve.setAttribute("d", dpath);
        const draw = ML.ease(t, at + 0.1, at + build + 0.1);
        curve.style.strokeDasharray = cq > 0 ? "none" : `${(curveLen * draw).toFixed(2)} ${(curveLen * 2).toFixed(2)}`;
        floor.style.opacity = ML.ease(t, u0 + travel * 0.5, curveEnd).toFixed(4);
        rects.forEach(({ g, r, txt }, i) => {
          const a = u0 + seq(i) * st, q = bz(ML.lin(t, a, a + travel));
          const A = startRect(i), B = endRect(i);
          // travel along the curve: a lift that peaks mid-way so squares slide off the spiral rather than cut across it
          const lift = Math.sin(Math.PI * q) * Math.min(80 * u, A.h * 0.6);
          const x = A.x + (B.x - A.x) * q, y = A.y + (B.y - A.y) * q - lift, w = A.w + (B.w - A.w) * q, h = A.h + (B.h - A.h) * q;
          r.setAttribute("x", x.toFixed(2)); r.setAttribute("y", y.toFixed(2));
          r.setAttribute("width", Math.max(0, w).toFixed(2)); r.setAttribute("height", Math.max(0, h).toFixed(2));
          r.setAttribute("rx", (Math.min(w, h) * 0.04).toFixed(2));
          const pin = ML.out(t, pop(i), pop(i) + 0.3);
          g.style.opacity = pin.toFixed(4);
          const blur = 4 * u * Math.sin(Math.PI * q);
          if (blur > 0.05) g.style.filter = `blur(${blur.toFixed(2)}px)`; else g.style.removeProperty("filter");
          if (txt) {
            const fs = Math.max(10 * u, Math.min(w, h) * 0.2);
            txt.style.fontSize = fs.toFixed(1) + "px";
            txt.setAttribute("x", (rtl ? x + w - fs * 0.5 : x + fs * 0.5).toFixed(2));
            txt.setAttribute("text-anchor", rtl ? "end" : "start");
            txt.setAttribute("y", (y + h - fs * 0.6).toFixed(2));
            txt.style.display = fs < 16 * u ? "none" : "";
          }
        });
      },
    };
  },
});

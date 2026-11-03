// Circle point traces a wave: on the start side a circle (3 px, second accent) with a point orbiting it, θ = ωt
// (one turn per `turn` seconds, linear); the radius to the point (ink, 2 px), the vertical leg (sin, accent) and the
// horizontal leg (cos, second accent) form the triangle, a small angle arc with θ. Beside it the wave y = sin θ is
// drawn as θ advances (amplitude = radius, 4 px accent with a soft glow and a head dot, a dashed link from the
// point), a ghost of the other function pre-drawn at 20% ink behind; once `periods` turns are drawn the trace scrolls
// so its head stays at the far end. Labels "sin θ" / "cos θ", mono readouts per frame (θ = 1.73 rad), a serif
// "y = sin θ" at the bottom. Cause on the start side, effect on the end side: mirrored in Arabic. A panel hugs the
// figure and both arrive the way the look moves.
// The whole figure is repainted on a software canvas every frame from t (an SVG repainted in dirty rects was not
// pixel-stable where its strokes overlap).
// Source: prompt-motion math-files-i-made-this-using (reference only: rebuilt as our own code).
ML.define({
  id: "data.unit-circle-wave-trace",
  category: "data",
  name: "Circle point traces a wave",
  does: "A point orbits a circle with its triangle drawn while a sine curve is drawn beside it in sync, a ghost cosine behind.",
  says: ["precision", "connection", "tech", "change", "time"],
  energy: 3,
  targets: ["chart", "shape"],
  duration: [2, 8],
  params: {
    function: { type: "choice", options: ["sin", "cos", "both"], default: "sin" },
    periods: { type: "number", range: [1, 3], default: 1 },
    readouts: { type: "bool", default: true },
    turn: { type: "number", range: [1.5, 4], default: 2.4, unit: "s" },
    ghost: { type: "bool", default: true },
    panel: { type: "bool", default: true },
  },
  pairs: ["data.waveform-bars", "data.timeline-playhead-markers"],
  avoid: ["luxury", "playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:math-files-i-made-this-using", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const doc = document;
    const host = ctx.scene || stage;
    let R = el && el !== stage ? ctx.box(el) : f.pic;
    if (R.h < 200 || R.w < 300) R = f.pic;
    const u = Math.min(f.W, f.H) / 720;
    const per = ML.clamp(p.periods, 1, 3);
    // geometry: circle radius r, gap g, wave of per · Lp (Lp = 2.2 r per turn), fitted to the region
    const padX = R.w * 0.06;
    const r = Math.min((R.w - padX * 2) / (2 + 0.55 + per * 2.2), (R.h - 90 * u) / 3.4);
    const g = 0.55 * r, Lp = 2.2 * r, total = 2 * r + g + per * Lp;
    const left = R.x + (R.w - total) / 2;
    const Hb = 3.05 * r + 16 * u, blockTop = R.y + (R.h - Hb) / 2;
    const cy = blockTop + 1.5 * r, x0L = left + 2 * r + g, footY = cy + 1.55 * r;
    const X = (x) => (rtl ? 2 * R.x + R.w - x : x); // mirror around the region in Arabic
    const cx = X(left + r), dir = rtl ? -1 : 1;

    // the canvas, on the stage, sized to the region (+ a margin for the labels)
    const M = Math.round(40 * u), cvX = Math.floor(R.x - M), cvY = Math.floor(R.y - M), cvW = Math.ceil(R.w + 2 * M), cvH = Math.ceil(R.h + 2 * M);
    const cv = doc.createElement("canvas");
    cv.width = cvW; cv.height = cvH;
    const hb = ctx.box(host);
    cv.style.cssText = `position:absolute;left:${cvX - hb.x}px;top:${cvY - hb.y}px;width:${cvW}px;height:${cvH}px;pointer-events:none;z-index:22;visibility:hidden`;
    cv.dir = "ltr";
    // a panel under the figure, so it reads over whatever the scene has there
    const padY = 28 * u;
    const panel = p.panel ? doc.createElement("div") : null;
    const panelW = Math.min(R.w, total + 2 * padX);
    if (panel) { panel.className = "ml-panel"; panel.style.cssText += `;position:absolute;left:${(R.x + (R.w - panelW) / 2 - hb.x).toFixed(1)}px;top:${(blockTop - padY - hb.y).toFixed(1)}px;width:${panelW.toFixed(1)}px;height:${(Hb + 2 * padY).toFixed(1)}px;box-sizing:border-box;z-index:21;pointer-events:none;visibility:hidden`; host.append(panel); }
    host.append(cv);
    const c = cv.getContext("2d", { willReadFrequently: true }); // software canvas: the same pixels for the same t
    c.direction = "ltr";
    // look colours and faces, resolved once
    const probe = (css) => { const s = doc.createElement("span"); s.style.cssText = css; host.append(s); const cs = getComputedStyle(s); const o = { color: cs.color, font: cs.fontFamily }; s.remove(); return o; };
    const col = { ink: probe("color:var(--x-ink)").color, dim: probe("color:var(--x-dim)").color, a: probe("color:var(--x-accent)").color, a2: probe("color:var(--x-accent-2)").color, good: probe("color:var(--x-good)").color };
    const monoF = probe("font-family:var(--x-mono-font)").font, serifF = probe("font-family:var(--x-serif-font)").font;
    const fade = (colour, a) => `color-mix(in srgb, ${colour} ${a * 100}%, transparent)`; // any colour a look resolves to, oklch or lab too
    const colour = { sin: col.a, cos: col.a2 };
    const main = p.function === "cos" ? "cos" : "sin", other = main === "sin" ? "cos" : "sin";
    const fns = p.function === "both" ? ["sin", "cos"] : [main];
    const full = per * 2 * Math.PI;
    const fnY = (fn, th) => cy - r * (fn === "sin" ? Math.sin(th) : Math.cos(th));
    const path = (fn, a, b, n) => { c.beginPath(); for (let i = 0; i <= n; i++) { const th = a + ((b - a) * i) / n, x = X(x0L + ((th - a) / (2 * Math.PI)) * Lp) - cvX, y = fnY(fn, th) - cvY; i ? c.lineTo(x, y) : c.moveTo(x, y); } };
    const line = (x1, y1, x2, y2, stroke, w) => { c.beginPath(); c.moveTo(x1 - cvX, y1 - cvY); c.lineTo(x2 - cvX, y2 - cvY); c.strokeStyle = stroke; c.lineWidth = w; c.stroke(); };
    const dot = (x, y, rr, fill) => { c.beginPath(); c.arc(x - cvX, y - cvY, rr, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); };
    // text with every θ in the mono face (it carries Greek; the serif may not)
    const text = (s, x, y, fill, size, face, align, italic) => {
      const parts = s.split(/(θ)/).filter(Boolean);
      const fontOf = (part) => `${italic && part !== "θ" ? "italic " : ""}400 ${size.toFixed(1)}px ${part === "θ" ? monoF : face}`;
      const widths = parts.map((part) => { c.font = fontOf(part); return c.measureText(part).width; });
      const W = widths.reduce((a, b) => a + b, 0);
      let x0 = align === "center" ? x - W / 2 : align === "end" ? x - W : x;
      c.fillStyle = fill; c.textBaseline = "alphabetic"; c.textAlign = "left";
      parts.forEach((part, i) => { c.font = fontOf(part); c.fillText(part, x0 - cvX, y - cvY); x0 += widths[i]; });
    };
    const turn = ML.clamp(p.turn, 1.5, 4), T0 = at + 0.45, w = (2 * Math.PI) / turn;
    const arrive = ctx.look.kind === "scale" ? { kind: "fade" } : {}; // a canvas never goes above its pixels
    ctx.sfx(at, "whoosh.soft", 0.25);
    for (let k = 1; T0 + k * turn < end - 0.3 && k < 6; k++) ctx.sfx(T0 + k * turn, "blip", 0.15);
    const labY = cy - r * 1.3, eqTxt = p.function === "both" ? "y = sin θ, cos θ" : `y = ${main} θ`;
    return {
      draw(t) {
        ML.show(cv, t, at, end - 0.25, arrive);
        if (panel) ML.show(panel, t, at, end - 0.25, arrive);
        if (t < at - 1e-6) return;
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, cvW, cvH);
        c.lineCap = "round"; c.lineJoin = "round"; c.setLineDash([]);
        const axis = fade(col.ink, 0.14);
        line(X(left - r * 0.2), cy, X(left + total + r * 0.1), cy, axis, Math.max(1, u));
        line(cx, cy - r * 1.25, cx, cy + r * 1.25, axis, Math.max(1, u));
        // the circle draws itself in, from the reading-start of its rim
        const draw = ML.ease(t, at, at + 0.45);
        const rim0 = rtl ? Math.PI : 0;
        c.beginPath(); c.arc(cx - cvX, cy - cvY, r, rim0, rim0 + Math.PI * 2 * draw * dir, rtl); c.strokeStyle = col.a2; c.lineWidth = 3 * u; c.stroke();
        dot(cx, cy, 3 * u, col.ink);
        const th = Math.max(0, t - T0) * w, live = t >= T0;
        // the ghost of the other function, its window following the trace once it scrolls
        if (p.ghost && p.function !== "both") {
          c.globalAlpha = ML.lin(t, at + 0.2, at + 0.6);
          path(other, Math.max(0, th - full), Math.max(0, th - full) + full, 160);
          c.strokeStyle = fade(col.ink, 0.2); c.lineWidth = 2 * u; c.stroke();
          c.globalAlpha = 1;
        }
        const a = th % (2 * Math.PI);
        if (p.readouts) {
          const rx = X(left + total), ry = footY - 18 * u, al = rtl ? "start" : "end";
          text(`θ = ${a.toFixed(2)} rad`, rx, ry, col.dim, 12 * u, monoF, al);
          text(`${main} θ = ${(main === "sin" ? Math.sin(th) : Math.cos(th)).toFixed(2)}`, rx, ry + 18 * u, col.dim, 12 * u, monoF, al);
        }
        text(eqTxt, X(left), footY, col.ink, 20 * u, serifF, rtl ? "end" : "start", true);
        if (!live) return;
        const px = cx + dir * r * Math.cos(th), py = cy - r * Math.sin(th);
        text("sin θ", X(x0L + Lp * 0.3), labY, colour.sin, 18 * u, serifF, "center", true);
        text("cos θ", X(x0L + Lp * 0.3 + 3.2 * 18 * u), labY, colour.cos, 18 * u, serifF, "center", true);
        // the traces, growing until `periods` turns are drawn, then a window whose head stays at the far end
        const a0 = Math.max(0, th - full), n = Math.max(2, Math.ceil(((th - a0) / full) * 160));
        for (const fn of fns) {
          path(fn, a0, th, n); c.strokeStyle = fade(colour[fn], 0.18); c.lineWidth = 12 * u; c.stroke();
          c.strokeStyle = colour[fn]; c.lineWidth = 4 * u; c.stroke();
          const hx = X(x0L + ((th - a0) / (2 * Math.PI)) * Lp), hy = fnY(fn, th);
          c.setLineDash([4 * u, 4 * u]); c.globalAlpha = 0.55;
          line(fn === "sin" ? px : cx, fn === "sin" ? py : cy - r * Math.cos(th), hx, hy, colour[fn], Math.max(1, u));
          c.setLineDash([]); c.globalAlpha = 1;
          dot(hx, hy, 5 * u, colour[fn]);
        }
        // the triangle: cos leg, sin leg, radius, angle arc + θ, the point
        line(cx, cy, px, cy, col.a2, 2.5 * u);
        line(px, cy, px, py, col.a, 2.5 * u);
        line(cx, cy, px, py, col.ink, 2 * u);
        const ar = r * 0.22;
        if (a > 0.01) { c.beginPath(); c.arc(cx - cvX, cy - cvY, ar, rtl ? Math.PI : 0, rtl ? Math.PI + a : -a, !rtl); c.strokeStyle = col.good; c.lineWidth = 2 * u; c.stroke(); }
        text("θ", cx + dir * ar * 1.7 * Math.cos(a / 2), cy - ar * 1.7 * Math.sin(a / 2) + 6 * u, col.good, 16 * u, monoF, "center");
        dot(px, py, 5 * u, col.ink);
      },
    };
  },
});

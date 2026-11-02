// Blueprint dimension callouts: thin measurement lines appear along a drawn shape like a technical drawing. Per
// segment: a line parallel to it 18 px out (or in), 8 px perpendicular end ticks, a small mono label centred in a gap
// of the line ("24'-0\""); each line draws from its centre outward in 0.3 s, the ticks land as it reaches its ends and
// the label fades in 0.2 s after; callouts follow the main path as it passes each segment (at least `stagger` apart).
// Options: angle labels at the corners; a counting label (the figure counts up with the line, from the line-reveal
// variant), tick marks every 10 % as the line passes, and a glint running along it once. On a target the callouts
// measure its box (top and inline-end sides; just the length on a thin line); with no target a floor-plan outline is
// drawn on the stage first. RTL mirrors the plan and runs the callouts from the right.
// Sources: prompt-motion:adamdesgns-wtf-made-with-single + prompt-motion:ayushunleashed-motion-designers-are-about
// (reference only — rebuilt as our own code).
ML.define({
  id: "data.dimension-callouts",
  category: "data",
  name: "Blueprint dimension callouts",
  does: "Thin measurement lines with tick ends and small labels appear along a drawn shape like a technical drawing.",
  says: ["precision", "proof", "tech"],
  energy: 2,
  targets: ["shape", "line", "chart", "label"],
  duration: [0.8, 3],
  params: {
    units: { type: "text", default: "ft-in" },
    side: { type: "choice", options: ["outside", "inside"], default: "outside" },
    angle_labels: { type: "bool", default: false },
    stagger: { type: "number", range: [0.08, 0.3], default: 0.15, unit: "s" },
    count_label: { type: "bool", default: false },
    ticks: { type: "bool", default: false },
    glint: { type: "bool", default: false },
  },
  pairs: ["data.data-point-step-highlight", "data.digit-write"],
  avoid: ["playful", "celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "prompt-motion:adamdesgns-wtf-made-with-single", license: "reference", note: "with the line-reveal variant from prompt-motion:ayushunleashed-motion-designers-are-about; our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl, stage, f } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const sv = (tag, attrs, parent, text) => { const e = doc.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v); if (text != null) e.textContent = text; if (parent) parent.append(e); e.style.willChange = "transform"; return e; };
    // geometry written only when it changes, and each piece on its own layer: the same t always rasterises the same
    const setA = (e, k, v) => { if (e.getAttribute(k) !== v) e.setAttribute(k, v); };
    const u = Math.min(f.W, f.H) / 1080;
    const OFF = 36 * u, TICK = 16 * u, LS = Math.round(22 * u), SW = Math.max(1.5, 2 * u);

    const svg = sv("svg", { width: f.W, height: f.H, viewBox: `0 0 ${f.W} ${f.H}`, style: `position:absolute;left:0;top:0;overflow:visible;pointer-events:none;z-index:25` }, stage);

    // the shape: the target's box, or a floor plan drawn first
    let poly, segIdx, plan = null, card = null, drawA = at, drawB = at;
    if (el) {
      const b = ctx.box(el);
      poly = [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]];
      const thin = b.h < 14 * u;
      segIdx = thin ? [0] : rtl ? [0, 3] : [0, 1]; // top, then the inline-end side
    } else {
      // a drawing sheet of its own over the picture region, the plan inside it with room for the callouts
      const sheet = { x: f.pic.x + 20 * u, y: f.pic.y + 10 * u, w: f.pic.w - 40 * u, h: f.pic.h - 20 * u };
      card = doc.createElement("div");
      card.className = "ml-panel";
      card.style.cssText = `position:absolute;left:${sheet.x}px;top:${sheet.y}px;width:${sheet.w}px;height:${sheet.h}px;box-sizing:border-box;z-index:24;background-image:linear-gradient(var(--x-line) 1px, transparent 1px),linear-gradient(90deg, var(--x-line) 1px, transparent 1px);background-size:${Math.round(40 * u)}px ${Math.round(40 * u)}px;background-position:center`;
      stage.append(card);
      const room = { x: sheet.x + 120 * u, y: sheet.y + 100 * u, w: sheet.w - 240 * u, h: sheet.h - 200 * u };
      const ar = 1.25, w = Math.min(room.w, room.h * ar), h = w / ar, x0 = room.x + (room.w - w) / 2, y0 = room.y + (room.h - h) / 2;
      const N = [[0, 0], [1, 0], [1, 0.55], [0.6, 0.55], [0.6, 1], [0, 1]];
      poly = N.map(([x, y]) => [x0 + (rtl ? 1 - x : x) * w, y0 + y * h]);
      segIdx = poly.map((_, i) => i);
      const d = "M" + poly.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L") + " Z";
      plan = sv("path", { d, fill: "color-mix(in srgb, var(--x-accent) 6%, transparent)", stroke: "var(--x-ink)", "stroke-width": Math.max(2, 3 * u), "stroke-linejoin": "miter" }, svg);
      drawA = at + 0.25;
      drawB = drawA + Math.min(1.3, Math.max(0.5, (end - at) * 0.4));
    }
    // signed area: which way is outside
    let area = 0;
    poly.forEach(([x, y], i) => { const [x2, y2] = poly[(i + 1) % poly.length]; area += x * y2 - x2 * y; });
    const outward = (area > 0 ? 1 : -1) * (p.side === "inside" ? -1 : 1);
    const lens = poly.map(([x, y], i) => { const [x2, y2] = poly[(i + 1) % poly.length]; return Math.hypot(x2 - x, y2 - y); });
    const perim = lens.reduce((a, b) => a + b, 0);
    if (plan) { plan.setAttribute("stroke-dasharray", perim.toFixed(1)); }
    const maxLen = Math.max(...segIdx.map((i) => lens[i]));

    // the figures: px → a drawing scale (the longest side reads 24 ft / 7.2 m), or plain px / a custom unit
    const unit = String(p.units || "ft-in").trim();
    const label = (len, k = 1) => {
      const v = len * k;
      if (unit === "ft-in") { const inch = Math.round((v / maxLen) * 24 * 12), ft = Math.floor(inch / 12); return `${ft}'-${inch - ft * 12}"`; }
      if (unit === "m") return `${((v / maxLen) * 7.2).toFixed(1)} m`;
      if (unit === "cm") return `${Math.round((v / maxLen) * 720)} cm`;
      if (unit === "px" || unit === "PX") return `${Math.round(v / u)} PX`;
      return `${Math.round(v / u)} ${unit}`;
    };

    // when the main path passes each corner
    const cum = [0]; lens.forEach((l, i) => cum.push(cum[i] + l));
    const passAt = (d) => drawA + (drawB - drawA) * (d / perim);
    const st = ML.clamp(+p.stagger || 0.15, 0.04, 0.5);
    let prev = -Infinity;
    const callouts = segIdx.map((i, k) => {
      const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
      const L = lens[i], tx = (x2 - x1) / L, ty = (y2 - y1) / L, nx = ty * outward, ny = -tx * outward;
      const ax = x1 + nx * OFF, ay = y1 + ny * OFF, bx = x2 + nx * OFF, by = y2 + ny * OFF, cx = (ax + bx) / 2, cy = (ay + by) / 2;
      let t0 = plan ? Math.max(passAt(cum[i] + L * 0.5), prev + st) : at + k * st;
      prev = t0;
      const g = sv("g", {}, svg);
      const h1 = sv("line", { stroke: "var(--x-dim)", "stroke-width": SW }, g), h2 = sv("line", { stroke: "var(--x-dim)", "stroke-width": SW }, g);
      const tk1 = sv("line", { x1: ax - nx * TICK / 2, y1: ay - ny * TICK / 2, x2: ax + nx * TICK / 2, y2: ay + ny * TICK / 2, stroke: "var(--x-dim)", "stroke-width": SW }, g);
      const tk2 = sv("line", { x1: bx - nx * TICK / 2, y1: by - ny * TICK / 2, x2: bx + nx * TICK / 2, y2: by + ny * TICK / 2, stroke: "var(--x-dim)", "stroke-width": SW }, g);
      // the label reads along the segment, never upside down
      let ang = (Math.atan2(ty, tx) * 180) / Math.PI;
      if (ang >= 90) ang -= 180; if (ang < -90) ang += 180; // verticals read bottom to top, as on a drawing
      const txt = sv("text", { x: cx, y: cy, "text-anchor": "middle", "dominant-baseline": "central", transform: `rotate(${ang.toFixed(2)} ${cx.toFixed(1)} ${cy.toFixed(1)})`, fill: "var(--x-ink)", style: `font:600 ${LS}px var(--x-mono-font);letter-spacing:0.04em;direction:ltr;unicode-bidi:isolate` }, g, label(L));
      const gap = Math.min(L * 0.8, txt.getComputedTextLength() + 24 * u);
      const minor = p.ticks ? Array.from({ length: 9 }, (_, j) => { const s = (j + 1) / 10, px = ax + (bx - ax) * s, py = ay + (by - ay) * s; return { s, e: sv("line", { x1: px, y1: py, x2: px + nx * TICK * 0.4, y2: py + ny * TICK * 0.4, stroke: "var(--x-dim)", "stroke-width": SW * 0.8 }, g) }; }) : [];
      const glint = p.glint ? sv("line", { stroke: "var(--x-accent)", "stroke-width": SW * 2, "stroke-linecap": "round" }, g) : null;
      return { g, h1, h2, tk1, tk2, txt, minor, glint, ax, ay, bx, by, cx, cy, tx, ty, L, gap, t0 };
    });
    // corners: a small arc and its angle, as the path passes
    const corners = p.angle_labels ? poly.map((c, i) => {
      const pr = poly[(i - 1 + poly.length) % poly.length], nx2 = poly[(i + 1) % poly.length];
      const a1 = Math.atan2(pr[1] - c[1], pr[0] - c[0]), a2 = Math.atan2(nx2[1] - c[1], nx2[0] - c[0]);
      let da = a2 - a1; while (da <= -Math.PI) da += 2 * Math.PI; while (da > Math.PI) da -= 2 * Math.PI;
      // convex when the turn agrees with the outline's winding; a reflex (inner) corner takes the long way round
      const cross = (c[0] - pr[0]) * (nx2[1] - c[1]) - (c[1] - pr[1]) * (nx2[0] - c[0]);
      const convex = Math.sign(cross) === Math.sign(area);
      const sweep = convex ? da : da - Math.sign(da) * 2 * Math.PI;
      const deg = Math.round(Math.abs((sweep * 180) / Math.PI)), r = 26 * u, mid = a1 + sweep / 2;
      const pA = [c[0] + Math.cos(a1) * r, c[1] + Math.sin(a1) * r], pB = [c[0] + Math.cos(a2) * r, c[1] + Math.sin(a2) * r];
      const g = sv("g", {}, svg);
      sv("path", { d: `M${pA[0].toFixed(1)} ${pA[1].toFixed(1)} A${r} ${r} 0 ${convex ? 0 : 1} ${sweep > 0 ? 1 : 0} ${pB[0].toFixed(1)} ${pB[1].toFixed(1)}`, fill: "none", stroke: "var(--x-accent)", "stroke-width": SW }, g);
      sv("text", { x: c[0] + Math.cos(mid) * r * 2.1, y: c[1] + Math.sin(mid) * r * 2.1, "text-anchor": "middle", "dominant-baseline": "central", fill: "var(--x-accent)", style: `font:600 ${Math.round(LS * 0.85)}px var(--x-mono-font)` }, g, `${deg}°`);
      return { g, t0: plan ? passAt(cum[i]) + 0.1 : at + 0.2 + i * st };
    }) : [];
    if (plan) ctx.sfx(drawA, "whoosh.soft", 0.2);
    callouts.forEach((c, i) => i % 2 === 0 && ctx.sfx(c.t0, "tap", 0.18));

    return {
      draw(t) {
        const leave = ML.ease(t, end - 0.3, end - 0.05);
        const vis = t >= at - 1e-6 && leave < 1;
        svg.style.visibility = vis ? "visible" : "hidden";
        svg.style.opacity = (1 - leave).toFixed(4);
        if (!vis) return;
        if (card) ML.show(card, t, at, end - 0.25);
        if (plan) {
          setA(plan, "stroke-dashoffset", (perim * (1 - ML.ease(t, drawA, drawB))).toFixed(1));
          plan.style.fillOpacity = ML.ease(t, drawB - 0.2, drawB + 0.3).toFixed(3); // the floor fills once the outline closes
        }
        for (const c of callouts) {
          const pr = ML.out(t, c.t0, c.t0 + 0.3), half = c.L / 2, g2 = c.gap / 2;
          const reach = g2 + (half - g2) * pr; // each half grows from the label gap out to its end
          const on = pr > 0;
          c.g.style.visibility = on ? "visible" : "hidden";
          if (!on) continue;
          const P = (s) => [(c.cx + c.tx * s).toFixed(1), (c.cy + c.ty * s).toFixed(1)];
          const [a1x, a1y] = P(-g2), [a2x, a2y] = P(-reach), [b1x, b1y] = P(g2), [b2x, b2y] = P(reach);
          setA(c.h1, "x1", a1x); setA(c.h1, "y1", a1y); setA(c.h1, "x2", a2x); setA(c.h1, "y2", a2y);
          setA(c.h2, "x1", b1x); setA(c.h2, "y1", b1y); setA(c.h2, "x2", b2x); setA(c.h2, "y2", b2y);
          const tk = ML.clamp((pr - 0.9) / 0.1);
          c.tk1.style.opacity = c.tk2.style.opacity = tk.toFixed(3);
          const la = ML.ease(t, c.t0 + 0.2, c.t0 + 0.4);
          c.txt.style.opacity = la.toFixed(3);
          if (p.count_label) { const s = label(c.L, ML.out(t, c.t0, c.t0 + 0.6)); if (c.txt.textContent !== s) c.txt.textContent = s; }
          for (const m of c.minor) m.e.style.opacity = Math.abs(m.s - 0.5) * c.L <= reach ? "1" : "0";
          if (c.glint) {
            const gx = ML.ease(t, c.t0 + 0.35, c.t0 + 0.75), on2 = gx > 0 && gx < 1, s0 = -half + c.L * gx;
            c.glint.style.opacity = on2 ? "0.9" : "0";
            const [x1, y1] = P(Math.max(-half, s0 - 20 * u)), [x2, y2] = P(Math.min(half, s0 + 20 * u));
            setA(c.glint, "x1", x1); setA(c.glint, "y1", y1); setA(c.glint, "x2", x2); setA(c.glint, "y2", y2);
          }
        }
        for (const k of corners) k.g.style.opacity = ML.ease(t, k.t0, k.t0 + 0.25).toFixed(3);
      },
    };
  },
});

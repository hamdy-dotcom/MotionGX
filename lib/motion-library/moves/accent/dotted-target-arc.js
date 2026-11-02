// Dotted aiming arc: a quadratic bezier from the selected card's centre to a target, its control point lifted above the
// midpoint (curvature × the distance). Round dots (dash px, a gap twice their size) are revealed by a stroke-dash draw
// in 0.25 s, then march along the path (dash offset moving 40 px/s, scaled to the stage); the target gets a solid ring
// and a pulsing ring. From: the target element (or a point in the scene); to: a second target if given, else a point
// ahead in reading direction (left in Arabic) and up. Colour: the look's accent or ink.
// Source: prompt-motion aisongman-this-is-insane-i (reference only: our own rebuild).
ML.define({
  id: "accent.dotted-target-arc",
  category: "accent",
  name: "Dotted aiming arc",
  does: "A dotted curved line arcs from the selected card to a target, showing intent before an action.",
  says: ["connection", "focus", "step"],
  energy: 2,
  targets: ["shape", "card", "cursor"],
  duration: [0.5, 2],
  params: {
    colour: { type: "choice", options: ["accent", "ink"], default: "accent" },
    dash: { type: "number", range: [2, 10], default: 4, unit: "px" },
    curvature: { type: "number", range: [0.1, 0.8], default: 0.35 },
  },
  pairs: ["ui.cursor-glide-click", "element.card-stack"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:aisongman-this-is-insane-i", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, end, f, stage, el, els, rtl } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, k = Math.min(W, H) / 1080, dir = rtl ? -1 : 1;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); parent.append(e); return e; };
    const centre = (e) => { const b = ctx.box(e); return { x: b.x + b.w / 2, y: b.y + b.h / 2, r: Math.max(b.w, b.h) / 2 }; };
    // from: the target; else a point low in the scene, on the reading side it starts from
    const A = el && el !== stage ? centre(el) : { x: W / 2 - dir * W * 0.22, y: H * 0.64, r: 0 };
    // to: a second target, else ahead and up, kept inside the safe area
    let B;
    if (els && els[1]) B = centre(els[1]);
    else {
      const s = f.safe, pad = 90 * k;
      B = { x: ML.clamp(A.x + dir * Math.max(W * 0.36, 300 * k), s.x + pad, s.x + s.w - pad), y: ML.clamp(A.y - H * 0.18, s.y + pad, s.y + s.h - pad), r: 0 };
      if (Math.abs(B.x - A.x) < 200 * k) B.x = ML.clamp(A.x - dir * W * 0.36, s.x + pad, s.x + s.w - pad);
    }
    // start and end on the edges of what they mark (a little clear space), not in their middles
    const dx = B.x - A.x, dy = B.y - A.y, dist = Math.hypot(dx, dy) || 1, ux = dx / dist, uy = dy / dist;
    const a0 = Math.min(A.r * 0.55, dist * 0.25), b0 = 38 * k;
    const P0 = { x: A.x + ux * a0, y: A.y + uy * a0 }, P2 = { x: B.x - ux * b0, y: B.y - uy * b0 };
    // control point: above the midpoint, curvature × distance along the normal that points up
    let nx = -uy, ny = ux; if (ny > 0) { nx = -nx; ny = -ny; }
    const off = p.curvature * dist, P1 = { x: (P0.x + P2.x) / 2 + nx * off, y: (P0.y + P2.y) / 2 + ny * off };
    const d = `M${P0.x.toFixed(1)} ${P0.y.toFixed(1)} Q${P1.x.toFixed(1)} ${P1.y.toFixed(1)} ${P2.x.toFixed(1)} ${P2.y.toFixed(1)}`;
    const col = p.colour === "ink" ? "var(--x-ink)" : "var(--x-accent)";
    const dot = Math.max(2, p.dash) * k * 1.6, gap = dot * 2.2; // 3 px dots every 8 px at web scale → video scale

    const svg = mk("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}` }, host);
    svg.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;overflow:visible;z-index:7;visibility:hidden";
    const id = "mlarc" + Math.round(ML.rnd(at * 7.3, dist) * 1e8);
    const defs = mk("defs", {}, svg), mask = mk("mask", { id, maskUnits: "userSpaceOnUse", x: 0, y: 0, width: W, height: H }, defs);
    const reveal = mk("path", { d, fill: "none", stroke: "#fff", "stroke-width": dot * 3, "stroke-linecap": "round" }, mask);
    const g = mk("g", { mask: `url(#${id})` }, svg);
    const dots = mk("path", { d, fill: "none", stroke: col, "stroke-width": dot, "stroke-linecap": "round", "stroke-dasharray": `0.01 ${(dot + gap).toFixed(2)}` }, g);
    const tail = mk("circle", { cx: P0.x, cy: P0.y, r: dot * 1.1, fill: col }, svg);
    const ringR = 26 * k, ring = mk("circle", { cx: B.x, cy: B.y, r: ringR, fill: "none", stroke: col, "stroke-width": 3 * k }, svg);
    const pulses = [0, 1].map(() => mk("circle", { cx: B.x, cy: B.y, r: ringR, fill: "none", stroke: col, "stroke-width": 2.5 * k }, svg));
    const pip = mk("circle", { cx: B.x, cy: B.y, r: 6 * k, fill: col }, svg);
    const L = dots.getTotalLength();
    reveal.setAttribute("stroke-dasharray", `${L.toFixed(2)} ${(L + 10).toFixed(2)}`);

    const drawT = 0.25, hit = at + drawT;
    ctx.sfx(at, "tap", 0.22);
    ctx.sfx(hit, "blip", 0.25);
    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.2, end);
        const on = t >= at && leave < 1;
        svg.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        svg.style.opacity = (1 - leave).toFixed(4);
        const u = ML.ease(t, at, hit);
        reveal.setAttribute("stroke-dashoffset", (L * (1 - u)).toFixed(2));
        // the dots march toward the target: 40 px/s at web scale
        dots.setAttribute("stroke-dashoffset", (-(t - at) * 40 * k * 1.6).toFixed(2));
        tail.setAttribute("r", (dot * 1.1 * ML.out(t, at, at + 0.12)).toFixed(2));
        const rIn = ML.back(t, hit - 0.05, hit + 0.25, 2);
        ring.setAttribute("r", Math.max(0.01, ringR * rIn).toFixed(2));
        ring.setAttribute("opacity", ML.clamp(rIn * 1.5).toFixed(3));
        pip.setAttribute("r", Math.max(0.01, 6 * k * ML.out(t, hit, hit + 0.15)).toFixed(2));
        // the pulsing ring: two staggered rings breathing out every 0.9 s
        pulses.forEach((c, i) => {
          const s = t - hit - i * 0.45;
          if (s < 0) { c.setAttribute("opacity", "0"); return; }
          const ph = (s % 0.9) / 0.9;
          c.setAttribute("r", (ringR * (1 + ph * 1.1)).toFixed(2));
          c.setAttribute("opacity", ((1 - ph) * 0.7).toFixed(3));
        });
      },
    };
  },
});

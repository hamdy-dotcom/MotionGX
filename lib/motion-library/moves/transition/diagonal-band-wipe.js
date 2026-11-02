// Diagonal band wipe: one to five slanted bands (parallelograms leaning `angle` degrees, each ~32% of the frame wide)
// sweep across the frame on expo.inOut in 0.5 s, staggered 0.06 s; with one colour the earlier bands run at 30% -> 60%
// opacity and the last is solid, with a list of colours (e.g. "accent, accent-2") each band takes the next one. The
// last band carries the new colour in: behind its trailing edge the frame is that colour (the next scene's ground).
// Edges are straight, a lightning zigzag (steps ~11% of the short side) or a wave; a light highlight runs along each
// leading edge and a soft shadow trails it. The sweep follows the reading side (mirrored in Arabic).
// Source: prompt-motion astrodevil-insane-made-with-claude, m1n9-k7-this-is-insane-opus,
// shinskinakamoto-claude-opus-5-5-is (reference only: our own rebuild).
ML.define({
  id: "transition.diagonal-band-wipe",
  category: "transition",
  name: "Diagonal band wipe",
  does: "One or more slanted bands (straight or zigzag-edged) sweep across the frame, the last one carrying the new colour in.",
  says: ["transition", "speed", "energy", "playful"],
  energy: 4,
  targets: ["scene"],
  duration: [0.5, 0.75],
  params: {
    bands: { type: "number", range: [1, 5], default: 1 },
    angle: { type: "number", range: [8, 30], default: 20, unit: "deg" },
    edge: { type: "choice", options: ["straight", "zigzag", "wave"], default: "straight" },
    direction: { type: "choice", options: ["ltr", "rtl"], default: "ltr" },
    colours: { type: "text", default: "accent" },
  },
  pairs: ["text-in.mask-rise", "transition.colour-field-cut"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:astrodevil-insane-made-with-claude", license: "reference", note: "our own rebuild; also m1n9-k7-this-is-insane-opus, shinskinakamoto-claude-opus-5-5-is" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, v = Math.min(W, H) / 100;
    const NS = "http://www.w3.org/2000/svg";
    const VARS = /^(accent|accent-2|accent-ink|ink|dim|good|bad|panel|panel-2|ground|device)$/;
    const colOf = (c) => { c = String(c || "").trim().replace(/\s+/g, "-"); return c.startsWith("--x-") ? `var(${c})` : VARS.test(c) ? `var(--x-${c})` : "var(--x-accent)"; };
    const list = String(p.colours || "accent").split(/[,/]+/).map((s) => s.trim()).filter(Boolean).map(colOf);
    if (!list.length) list.push("var(--x-accent)");
    const n = Math.round(ML.clamp(p.bands, 1, 5));
    const tan = Math.tan((ML.clamp(p.angle, 8, 30) * Math.PI) / 180);
    const B = W * (n > 1 ? 0.3 : 0.36); // band width
    const step = 11 * v; // zigzag step
    const amp = p.edge === "zigzag" ? step * 0.45 : p.edge === "wave" ? step * 0.3 : 0;
    // the sweep follows the reading side: ltr is "from where reading starts"
    const flip = (p.direction === "rtl") !== !!ctx.rtl;
    const sweep = 0.5, stagger = 0.06;
    const expoIO = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2);
    // edge offset along y (the same on both edges, so a band keeps its width)
    const off = (y) => {
      if (p.edge === "zigzag") { const k = y / step, i = Math.floor(k), fr = k - i; return amp * (i % 2 === 0 ? -1 + 2 * fr : 1 - 2 * fr); }
      if (p.edge === "wave") return amp * Math.sin((y / (step * 4)) * Math.PI * 2);
      return 0;
    };
    const ys = [];
    if (p.edge === "zigzag") for (let y = 0; y <= H + step; y += step) ys.push(Math.min(y, H + step));
    else if (p.edge === "wave") for (let y = 0; y <= H + 12; y += 12) ys.push(y);
    else ys.push(0, H);
    // leading edge of a band whose bottom-leading corner is at X
    const lead = (X, y) => X + (H - y) * tan + off(y);
    const X0 = -H * tan - amp - 4 * v, X1 = W + B + amp + 4 * v;
    const fx = (x) => (flip ? W - x : x);
    const pts = (arr) => arr.map(([x, y]) => `${fx(x).toFixed(1)},${y.toFixed(1)}`).join(" ");

    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W); svg.setAttribute("height", H);
    svg.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;z-index:6;overflow:visible;visibility:hidden";
    const defs = document.createElementNS(NS, "defs");
    svg.append(defs);
    host.append(svg);
    const field = document.createElementNS(NS, "polygon");
    const last = list[(n - 1) % list.length];
    field.setAttribute("style", `fill:${last}`);
    svg.append(field);
    const bands = Array.from({ length: n }, (_, i) => {
      const c = list.length > 1 ? list[i % list.length] : list[0];
      const gid = `mlbw${Math.round(at * 1000)}-${i}`; // unique per placement: a second wipe in the film keeps its own colours
      const g = document.createElementNS(NS, "linearGradient");
      g.setAttribute("id", gid);
      g.setAttribute("x1", flip ? "1" : "0"); g.setAttribute("x2", flip ? "0" : "1"); g.setAttribute("y1", "0"); g.setAttribute("y2", "0");
      g.innerHTML = `<stop offset="0" style="stop-color:color-mix(in srgb, ${c} 82%, var(--x-device))"/><stop offset="0.85" style="stop-color:${c}"/><stop offset="1" style="stop-color:color-mix(in srgb, ${c} 80%, var(--x-accent-ink))"/>`;
      defs.append(g);
      const opacity = list.length > 1 || i === n - 1 ? 1 : n === 2 ? 0.45 : 0.3 + (0.6 - 0.3) * (i / Math.max(1, n - 2));
      const body = document.createElementNS(NS, "polygon");
      body.setAttribute("style", `fill:url(#${gid});opacity:${opacity.toFixed(3)};filter:drop-shadow(${flip ? "" : "-"}${(0.8 * v).toFixed(1)}px 0 ${(1.4 * v).toFixed(1)}px color-mix(in srgb, var(--x-device) 35%, transparent))`);
      const hi = document.createElementNS(NS, "polyline");
      hi.setAttribute("style", `fill:none;stroke:color-mix(in srgb, var(--x-accent-ink) 55%, transparent);stroke-width:${Math.max(2, 0.28 * v).toFixed(1)};opacity:${opacity.toFixed(3)}`);
      svg.append(body, hi);
      return { body, hi, start: at + i * stagger };
    });
    const doneAt = at + (n - 1) * stagger + sweep;
    ctx.sfx(at, "whoosh.soft", 0.45);
    if (n >= 3) ctx.sfx(at + (n - 1) * stagger, "whoosh.soft", 0.25);
    return {
      draw(t) {
        svg.style.visibility = t >= at ? "visible" : "hidden";
        if (t < at) return;
        let trail = X0 - B;
        bands.forEach((b, i) => {
          const X = X0 + (X1 - X0) * expoIO(ML.lin(t, b.start, b.start + sweep));
          const L = ys.map((y) => [lead(X, y), y]);
          const T = ys.map((y) => [lead(X, y) - B, y]).reverse();
          b.body.setAttribute("points", pts([...L, ...T]));
          b.hi.setAttribute("points", pts(L));
          const live = t >= b.start && t < b.start + sweep;
          b.body.style.visibility = b.hi.style.visibility = live ? "visible" : "hidden";
          if (i === n - 1) trail = X - B;
        });
        // the new colour fills everything behind the last band's trailing edge
        if (t >= doneAt) field.setAttribute("points", pts([[-10, -10], [W + 10, -10], [W + 10, H + 10], [-10, H + 10]]));
        else field.setAttribute("points", pts([[-10 - W, -10], ...ys.map((y) => [lead(trail, y), y]), [-10 - W, H + 10]]));
      },
    };
  },
});

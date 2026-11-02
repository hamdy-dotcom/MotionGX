// Dot rides an eased path with a comet trail: a 14 px accent dot (at 720p, scaled to the stage) with an outer glow
// travels a curved SVG path, its place along it (getPointAtLength) = easing(progress) — by default the very bezier the
// S-curve plots, so the dot speeds up and slows exactly as the graph says. Its trail is its own last `trail` places
// (sampled back in time from t, so it stays a pure function of t) drawn as a tapered stroke, opacity 0.5 → 0; it
// gathers into the dot as it lands. The graph around it (axes, the faint guide) fades out over 0.3 s as it travels,
// leaving only the motion. Paths: the easing curve plotted (s-curve), an arc, or any path data (custom, in a 0–100
// box). In Arabic the path runs right to left.
// Source: prompt-motion "tequilafunks-opus-5-5-remotion-make" (reference only — rebuilt as our own code).
ML.define({
  id: "element.comet-path-trail",
  category: "element",
  name: "Dot rides an eased path with a comet trail",
  does: "A dot rides along a curved path with a fading comet trail, speeding up and slowing according to its easing curve.",
  says: ["flow", "precision", "speed"],
  energy: 3,
  targets: ["shape", "cursor"],
  duration: [0.6, 1.5],
  params: {
    path: { type: "choice", options: ["s-curve", "arc", "custom"], default: "s-curve" },
    trail: { type: "number", range: [5, 40], default: 20 },
    easing: { type: "text", default: "cubic-bezier(.7,0,.3,1)" },
    duration: { type: "number", range: [0.5, 1.5], default: 0.8, unit: "s" },
    custom_d: { type: "text", default: "" },
    graph: { type: "bool", default: true },
    fade_graph: { type: "bool", default: true },
  },
  pairs: ["data.ball-on-easing-graph", "text-in.punchline"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:tequilafunks-opus-5-5-remotion-make", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, f, el, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const host = ctx.scene || ctx.stage;
    const own = el && el !== ctx.stage ? el : null;
    const ob = own ? ctx.box(own) : null;
    const big = ob && ob.w > f.W * 0.3 && ob.h > f.H * 0.15;
    const k = Math.min(f.W, f.H) / 720;
    // the box the path lives in: the target's own box when it is roomy, else a graph-shaped box in the picture region
    const R0 = big ? ob : f.pic;
    let gw = Math.min(R0.w * 0.86, (f.wide ? 1.5 : 1) * R0.h * 0.78), gh = Math.min(R0.h * 0.78, gw / (f.wide ? 1.5 : 1));
    const R = { x: R0.x + (R0.w - gw) / 2, y: R0.y + (R0.h - gh) / 2, w: gw, h: gh };

    // the easing: cubic-bezier(a,b,c,d), a named CSS ease, or GSAP's power names
    const NAMED = { linear: [0, 0, 1, 1], ease: [0.25, 0.1, 0.25, 1], "ease-in": [0.42, 0, 1, 1], "ease-out": [0, 0, 0.58, 1], "ease-in-out": [0.42, 0, 0.58, 1], "power2.inout": [0.45, 0, 0.55, 1], "power3.inout": [0.65, 0, 0.35, 1], "power4.inout": [0.76, 0, 0.24, 1], "power2.out": [0.33, 1, 0.68, 1], "power3.out": [0.22, 1, 0.36, 1], "expo.out": [0.16, 1, 0.3, 1], "expo.inout": [0.87, 0, 0.13, 1] };
    const txt = String(p.easing || "").trim().toLowerCase();
    const m = txt.match(/cubic-bezier\(([^)]+)\)/);
    let cp = m ? m[1].split(",").map(Number) : NAMED[txt];
    if (!cp || cp.length !== 4 || cp.some((v) => !Number.isFinite(v))) cp = [0.7, 0, 0.3, 1];
    cp[0] = ML.clamp(cp[0]); cp[2] = ML.clamp(cp[2]);
    const curve = ML.bezier(cp[0], cp[1], cp[2], cp[3]);

    // the path, in the box's own px (mirrored in Arabic: it runs right to left)
    const X = (u) => (rtl ? R.w * (1 - u) : R.w * u), Y = (v) => R.h * (1 - v);
    let d;
    if (p.path === "arc") d = `M ${X(0)} ${Y(0.08)} C ${X(0.12)} ${Y(1.25)}, ${X(0.88)} ${Y(1.25)}, ${X(1)} ${Y(0.08)}`;
    else if (p.path === "custom" && /^[\sMmLlCcQqSsTtAaHhVvZz0-9.,-]+$/.test(p.custom_d || "") && /[0-9]/.test(p.custom_d || "")) {
      // numbers in a 0–100 box, x then y: scaled into the box (x mirrored in Arabic)
      let n = 0;
      d = String(p.custom_d).replace(/-?\d*\.?\d+/g, (v) => { const q = +v / 100, s = n++ % 2 === 0 ? X(q) : R.h * q; return s.toFixed(2); });
    } else d = `M ${X(0)} ${Y(0)} C ${X(cp[0])} ${Y(cp[1])}, ${X(cp[2])} ${Y(cp[3])}, ${X(1)} ${Y(1)}`; // the easing plotted
    const pad = 24 * k;
    const svg = doc.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `${-pad} ${-pad} ${R.w + pad * 2} ${R.h + pad * 2}`);
    svg.style.cssText = `position:absolute;left:${R.x - pad}px;top:${R.y - pad}px;width:${R.w + pad * 2}px;height:${R.h + pad * 2}px;overflow:visible;pointer-events:none;z-index:6;will-change:transform;`;
    host.append(svg);
    const mk = (tag, attrs, parent = svg) => { const e = doc.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); parent.append(e); return e; };
    // the graph around it: axes, ticks and the faint guide
    const ui = mk("g", {});
    if (p.graph) {
      const sw = Math.max(1, 1.4 * k);
      mk("path", { d: `M ${X(0)} ${Y(1.08)} L ${X(0)} ${Y(0)} L ${X(1.04)} ${Y(0)}`, fill: "none", stroke: "var(--x-dim)", "stroke-opacity": "0.45", "stroke-width": sw }, ui);
      for (let i = 1; i < 4; i++) mk("line", { x1: X(i / 4), y1: Y(0), x2: X(i / 4), y2: Y(1), stroke: "var(--x-line)", "stroke-width": sw }, ui);
      const lab = mk("text", { x: X(0.02), y: Y(-0.08) + 14 * k, fill: "var(--x-dim)", "text-anchor": rtl ? "end" : "start", direction: "ltr" }, ui);
      lab.style.font = `500 ${(13 * k).toFixed(1)}px var(--x-mono-font)`;
      lab.textContent = m ? `cubic-bezier(${cp.join(", ")})` : txt || "ease";
    }
    const guide = mk("path", { d, fill: "none", stroke: "var(--x-dim)", "stroke-opacity": "0.35", "stroke-width": Math.max(1, 1.6 * k), "stroke-dasharray": `${3 * k} ${5 * k}` }, ui);
    const L = guide.getTotalLength();
    // the trail: tapered segments (fat and bright near the dot, thin and gone at its tail)
    const n = Math.round(ML.clamp(p.trail, 5, 40));
    const trail = [];
    for (let i = 0; i < n; i++) trail.push(mk("line", { stroke: "var(--x-accent)", "stroke-linecap": "round" }));
    const r = 7 * k;
    // the outer glow: a soft radial halo (a gradient, no filter) behind the dot
    const gid = "ml-comet-" + Math.round(ML.rnd(at * 97 + n, 7) * 1e9);
    const defs = mk("defs", {}), rg = mk("radialGradient", { id: gid }, defs);
    mk("stop", { offset: "0", "stop-color": "var(--x-accent)", "stop-opacity": "0.55" }, rg);
    mk("stop", { offset: "0.45", "stop-color": "var(--x-accent)", "stop-opacity": "0.16" }, rg);
    mk("stop", { offset: "1", "stop-color": "var(--x-accent)", "stop-opacity": "0" }, rg);
    const halo = mk("circle", { r: r * 2.6, fill: `url(#${gid})` });
    const dot = mk("circle", { r, fill: "var(--x-accent)" });
    const core = mk("circle", { r: r * 0.38, fill: "var(--x-accent-ink)", "fill-opacity": "0.7" });

    const dur = ML.clamp(p.duration, 0.5, 1.5);
    const a = at, b = at + dur;
    const dt = Math.min(dur / 3, 0.5) / n; // the trail looks this far back in time
    const go = Math.max(b + 0.4, end - 0.3);
    const pos = (t) => guide.getPointAtLength(L * ML.clamp(curve(ML.lin(t, a, b))));
    ctx.sfx(a, "whoosh.soft", 0.3);
    ctx.sfx(b, "blip", 0.25);
    return {
      draw(t) {
        const on = t >= a - 0.25 && t < go + 0.3;
        svg.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        const show = ML.out(t, a - 0.25, a);
        svg.style.opacity = (show * (1 - ML.clamp((t - go) / 0.3))).toFixed(4);
        // the graph gives way as the dot travels (0.3 s), leaving only the motion
        ui.style.opacity = p.fade_graph ? (1 - ML.ease(t, a + dur * 0.15, a + dur * 0.15 + 0.3)).toFixed(4) : "1";
        const q = pos(t);
        for (const c of [halo, dot, core]) { c.setAttribute("cx", q.x.toFixed(2)); c.setAttribute("cy", q.y.toFixed(2)); }
        const land = ML.pulse(t, b, 0.04, 0.25);
        halo.setAttribute("r", (r * (2.6 + 1.4 * land)).toFixed(2));
        halo.setAttribute("opacity", (0.8 + 0.2 * land).toFixed(3));
        let prev = q;
        for (let i = 0; i < n; i++) {
          const c = pos(t - (i + 1) * dt), seg = trail[i];
          const fade = 1 - i / n;
          seg.setAttribute("x1", prev.x.toFixed(2)); seg.setAttribute("y1", prev.y.toFixed(2));
          seg.setAttribute("x2", c.x.toFixed(2)); seg.setAttribute("y2", c.y.toFixed(2));
          seg.setAttribute("stroke-width", (r * 1.7 * fade + 0.5).toFixed(2));
          seg.setAttribute("stroke-opacity", (0.5 * fade).toFixed(3));
          // a segment with no length (before it sets off, after it lands) is not drawn: the dot covers it
          seg.setAttribute("visibility", Math.hypot(c.x - prev.x, c.y - prev.y) < 0.5 ? "hidden" : "visible");
          prev = c;
        }
      },
    };
  },
});

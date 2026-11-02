// Watercolor wash fills a drawn shape: a pale wash bleeds in under a drawn ink line (a hill, a ground, any path),
// filling the region below it with soft, uneven colour and a slightly darker pigment edge, laid over the paper in
// multiply. Rebuilt from the technique: the fill is clipped to the region under the ink path; its texture is SVG
// turbulence (feTurbulence baseFrequency ≈ 0.02, feDisplacementMap scale ≈ 20) displacing a flat tint, with long
// darker streaks from a second, stretched turbulence; the pigment edge is the region's outline stroked a shade darker
// and softened (a vector edge, not a picture). The reveal is a soft-edged mask — feathered 80–120 px, its front
// itself displaced so it bleeds unevenly — running from the line down (bleed-from-line), from one side (sweep; from
// the right in Arabic) or a plain fade; the whole wash's opacity rises 0 → 0.9 with power2.out. On the stage (or a
// scene) the move draws its own hill line first (stroke drawn in), then washes under it; on an SVG path it washes
// under that path inside its own drawing. The colour is the look's (a pale tint of --x-good by default), never fixed.
// Source: prompt-motion "abderrahmen-g — opus 5.5 is mind…" (reference only; rebuilt as our own code).
ML.define({
  id: "mask.watercolor-wash-fill",
  category: "mask",
  name: "Watercolor wash fills a drawn shape",
  does: "A pale watercolor wash bleeds in under a drawn ink line, filling the ground below it with soft, uneven colour.",
  says: ["calm", "story", "growth"],
  energy: 1,
  targets: ["stage", "shape", "scene"],
  duration: [0.6, 2],
  params: {
    reveal: { type: "choice", options: ["bleed-from-line", "fade", "sweep"], default: "bleed-from-line" },
    tint: { type: "choice", options: ["good", "accent", "accent-2"], default: "good" },
    colour: { type: "text", default: "" },
    strength: { type: "number", range: [0.25, 0.7], default: 0.45 },
    duration: { type: "number", range: [0.6, 2], default: 1.2, unit: "s" },
    line: { type: "bool", default: true },
    seed: { type: "number", range: [0, 9999], default: 4 },
  },
  pairs: ["accent.hand-drawn-underline", "text-in.punchline"],
  avoid: ["urgency", "tech", "speed"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:abderrahmen-g-opus-5-5-is-mind", license: "reference", note: "our own rebuild: SVG turbulence wash clipped under the ink path, feathered displaced mask front; colour from the look" },
  setup(ctx) {
    const { el, p, at, end, stage } = ctx;
    if (!el) return null;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, attrs = {}, parent) => { const n = document.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) n.setAttribute(a, String(v)); if (parent) parent.append(n); return n; };
    const k = Math.min(ctx.f.W, ctx.f.H) / 1080;
    const uid = "ml-wc-" + document.querySelectorAll("[id^='ml-wc-']").length;
    const seed = Math.round(+p.seed || 0);
    const rtl = ctx.rtl;
    const span = Math.min(ML.clamp(+p.duration, 0.6, 2), Math.max(0.5, end - at - 0.1));
    const tintVar = { good: "var(--x-good)", accent: "var(--x-accent)", "accent-2": "var(--x-accent-2)" }[p.tint] || "var(--x-good)";
    const pigment = String(p.colour || "").trim() || `color-mix(in srgb, ${tintVar} ${Math.round(ML.clamp(+p.strength, 0.25, 0.7) * 100)}%, var(--x-panel))`;

    // where the wash goes: our own hill on the stage / a scene, or under the target's own path
    let svg, regionD, lineD = null, top, bottom, left, right, inkPath = null, own = false;
    const isPath = el instanceof SVGGeometryElement;
    const svgEl = isPath ? el.ownerSVGElement : el instanceof SVGSVGElement ? el : null;
    const srcPath = isPath ? el : svgEl ? svgEl.querySelector("path") : null;
    if (srcPath && svgEl) {
      svg = svgEl;
      const L = srcPath.getTotalLength(), a = srcPath.getPointAtLength(0), z = srcPath.getPointAtLength(L);
      const vb = svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.height ? svg.viewBox.baseVal : { x: 0, y: 0, width: svg.clientWidth, height: svg.clientHeight };
      const bb = srcPath.getBBox();
      const closed = /z\s*$/i.test(srcPath.getAttribute("d") || "");
      regionD = closed ? srcPath.getAttribute("d") : `${srcPath.getAttribute("d")} L ${z.x} ${vb.y + vb.height} L ${a.x} ${vb.y + vb.height} Z`;
      top = bb.y; bottom = closed ? bb.y + bb.height : vb.y + vb.height; left = bb.x; right = bb.x + bb.width;
    } else {
      own = true;
      const holder = el === stage ? ctx.scene || stage : el;
      const W = el === stage ? ctx.f.W : el.clientWidth, H = el === stage ? ctx.f.H : el.clientHeight;
      svg = mk("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, "aria-hidden": "true" });
      svg.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;overflow:visible;z-index:0";
      if (getComputedStyle(holder).position === "static") holder.style.position = "relative";
      holder.insertBefore(svg, holder.firstChild);
      // a hand-drawn hill: two slow seeded swells and a little wander
      const base = H * (ctx.f.tall ? 0.76 : 0.7), ph1 = ML.rnd(seed, 2) * 6.28, ph2 = ML.rnd(seed, 5) * 6.28;
      const pts = [];
      for (let i = 0; i <= 64; i++) {
        const x = -W * 0.02 + (W * 1.04 * i) / 64, u = x / W;
        pts.push([x, base - A * (0.075 * Math.sin(u * 6.28 * 0.9 + ph1) + 0.028 * Math.sin(u * 6.28 * 2.2 + ph2) + 0.004 * Math.sin(u * 6.28 * 7 + ph1 * 2))]);
      }
      lineD = "M" + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L");
      regionD = `${lineD} L ${(W * 1.02).toFixed(1)} ${H + 4} L ${(-W * 0.02).toFixed(1)} ${H + 4} Z`;
      top = Math.min(...pts.map((q) => q[1])); bottom = H; left = 0; right = W;
    }
    const RW = right - left, RH = bottom - top;
    const defs = mk("defs", {}, svg);
    // the region clip
    const clip = mk("clipPath", { id: uid + "-clip" }, defs);
    mk("path", { d: regionD }, clip);
    // texture: displaced flat tint, uneven alpha
    const fw = mk("filter", { id: uid + "-tex", x: "-10%", y: "-10%", width: "120%", height: "120%", "color-interpolation-filters": "sRGB" }, defs);
    mk("feTurbulence", { type: "fractalNoise", baseFrequency: (0.02 / Math.max(0.5, k)).toFixed(4), numOctaves: 3, seed, result: "n" }, fw);
    mk("feDisplacementMap", { in: "SourceGraphic", in2: "n", scale: (20 * k).toFixed(1), xChannelSelector: "R", yChannelSelector: "G", result: "d" }, fw);
    mk("feColorMatrix", { in: "n", type: "matrix", values: "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.6 -0.2", result: "a" }, fw);
    mk("feComposite", { in: "d", in2: "a", operator: "in", result: "patchy" }, fw);
    mk("feComposite", { in: "patchy", in2: "d", operator: "arithmetic", k1: 0, k2: 0.55, k3: 0.45, k4: 0 }, fw);
    // streaks: a stretched turbulence, darker
    const fs = mk("filter", { id: uid + "-streak", x: "0", y: "0", width: "100%", height: "100%", "color-interpolation-filters": "sRGB" }, defs);
    mk("feTurbulence", { type: "fractalNoise", baseFrequency: `${(0.004 / Math.max(0.5, k)).toFixed(4)} ${(0.05 / Math.max(0.5, k)).toFixed(4)}`, numOctaves: 2, seed: seed + 11, result: "s" }, fs);
    mk("feColorMatrix", { in: "s", type: "matrix", values: "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 4 -2.1", result: "sa" }, fs);
    mk("feComposite", { in: "SourceGraphic", in2: "sa", operator: "in" }, fs);
    // the pigment edge: softened, wandering
    const fe = mk("filter", { id: uid + "-edge", x: "-5%", y: "-5%", width: "110%", height: "110%" }, defs);
    mk("feTurbulence", { type: "fractalNoise", baseFrequency: (0.03 / Math.max(0.5, k)).toFixed(4), numOctaves: 2, seed: seed + 3, result: "n" }, fe);
    mk("feDisplacementMap", { in: "SourceGraphic", in2: "n", scale: (14 * k).toFixed(1), xChannelSelector: "R", yChannelSelector: "G", result: "d" }, fe);
    mk("feGaussianBlur", { in: "d", stdDeviation: (2.5 * k).toFixed(2) }, fe);
    // the reveal mask: a feathered front, itself displaced so it bleeds unevenly
    const feather = 100 * k;
    const across = p.reveal === "sweep";
    const grad = mk("linearGradient", { id: uid + "-g", gradientUnits: "userSpaceOnUse", x1: 0, y1: 0, x2: across ? 1 : 0, y2: across ? 0 : 1 }, defs);
    const s0 = mk("stop", { offset: 0, "stop-color": "#fff" }, grad), s1 = mk("stop", { offset: 1, "stop-color": "#000" }, grad);
    s0.style.stopColor = "#fff"; s1.style.stopColor = "#000";
    const fm = mk("filter", { id: uid + "-mf", x: "-10%", y: "-10%", width: "120%", height: "120%" }, defs);
    mk("feTurbulence", { type: "fractalNoise", baseFrequency: (0.012 / Math.max(0.5, k)).toFixed(4), numOctaves: 2, seed: seed + 7, result: "n" }, fm);
    mk("feDisplacementMap", { in: "SourceGraphic", in2: "n", scale: (60 * k).toFixed(1), xChannelSelector: "R", yChannelSelector: "G" }, fm);
    const mask = mk("mask", { id: uid + "-m", maskUnits: "userSpaceOnUse", x: left - RW * 0.1, y: top - RH * 0.2 - feather, width: RW * 1.2, height: RH * 1.4 + feather * 2 }, defs);
    mk("rect", { x: left - RW * 0.1, y: top - RH * 0.2 - feather, width: RW * 1.2, height: RH * 1.4 + feather * 2, fill: `url(#${uid}-g)`, filter: `url(#${uid}-mf)` }, mask);

    // the wash
    const g = mk("g", { "clip-path": `url(#${uid}-clip)` });
    g.style.mixBlendMode = "multiply";
    const inner = mk("g", { mask: `url(#${uid}-m)` }, g);
    const flat = mk("rect", { x: left - 40 * k, y: top - 40 * k, width: RW + 80 * k, height: RH + 80 * k, filter: `url(#${uid}-tex)` }, inner);
    flat.style.fill = pigment;
    const streak = mk("rect", { x: left, y: top, width: RW, height: RH, filter: `url(#${uid}-streak)`, opacity: 0.35 }, inner);
    streak.style.fill = `color-mix(in srgb, ${pigment} 70%, var(--x-ink))`;
    const edge = mk("path", { d: regionD, fill: "none", "stroke-width": (9 * k).toFixed(1), filter: `url(#${uid}-edge)`, opacity: 0.55 }, inner);
    edge.style.stroke = `color-mix(in srgb, ${pigment} 72%, var(--x-ink))`;
    if (own) svg.append(g); else svg.insertBefore(g, srcPath);
    // our own ink line, drawn in first
    let lineLen = 0, lineT = 0;
    if (own && lineD && p.line) {
      inkPath = mk("path", { d: lineD, fill: "none", "stroke-width": (3.2 * k).toFixed(2), "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      inkPath.style.stroke = "var(--x-ink)";
      lineLen = inkPath.getTotalLength();
      lineT = Math.min(0.6, span * 0.45);
    }
    const washAt = at + (inkPath ? lineT * 0.7 : 0);
    ctx.sfx(washAt, "swell", 0.2);
    return {
      draw(t) {
        const started = t >= at - 1e-6;
        svg.style.visibility = own && !started ? "hidden" : "visible";
        if (inkPath) {
          const u = ML.out(t, at, at + lineT);
          inkPath.style.strokeDasharray = `${lineLen.toFixed(1)} ${lineLen.toFixed(1)}`;
          inkPath.style.strokeDashoffset = ((rtl ? -1 : 1) * (1 - u) * lineLen).toFixed(2);
        }
        const x = ML.lin(t, washAt, washAt + span), op = 0.9 * (1 - (1 - ML.lin(t, washAt, washAt + Math.min(0.6, span))) ** 2);
        g.style.display = t < washAt || op < 0.002 ? "none" : "";
        g.style.opacity = op.toFixed(4);
        const e = 1 - (1 - x) ** 2;
        // the front, in user space, feathered behind it
        if (p.reveal === "fade") { grad.setAttribute("y1", bottom + RH); grad.setAttribute("y2", bottom + RH + 1); }
        else if (across) {
          const f = rtl ? right - e * (RW + feather * 2) + feather : left + e * (RW + feather * 2) - feather;
          grad.setAttribute("x1", (rtl ? f + feather : f - feather).toFixed(2)); grad.setAttribute("x2", (rtl ? f - feather : f + feather).toFixed(2));
        } else {
          const f = top - feather + e * (RH + feather * 2.5);
          grad.setAttribute("y1", (f - feather).toFixed(2)); grad.setAttribute("y2", (f + feather).toFixed(2));
        }
      },
    };
  },
});

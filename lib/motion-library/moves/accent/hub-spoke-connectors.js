// Hub and spoke connectors: curved hairlines connect a central hub to labelled pills around it. Ported from MengTo/Skills
// blue-cloudy-clean-modern's "Custom Vocabulary" card: cubic spokes from the hub (50,50) like "M50,50 C30,40 25,35
// 25,25" (first control at hub + (0.8·dx, 0.4·dy), second straight above / below the end) stroked with a gradient
// 0 → .3 → 0 along the spoke; glass pills at the ends (a 6 px dot + a 12 px label, full radius, a light border); a
// 56 px rounded-14 glass hub with an icon and a breathing scale. The source is static: the draw-in is our animation of
// it (stroke-dashoffset length → 0 over 0.8 s power2.out, staggered 0.12 s, then each pill pops as its line lands),
// then a small pulse travels each spoke out to its pill. Spokes 2–6 are spread around the hub (3 gives the source's
// up-left / up-right / down), curved or straight; labels follow reading order (counter-clockwise in Arabic). Drawn
// in stage px (not a stretched 100×100 box) so hairlines stay even. Colours, type and radii from the look.
// Source: MengTo/Skills web-design/blue-cloudy-clean-modern (MIT).
ML.define({
  id: "accent.hub-spoke-connectors",
  category: "accent",
  name: "Hub and spoke connectors",
  does: "Curved hairlines connect a central hub to labelled pills around it.",
  says: ["connection", "list", "tech"],
  energy: 2,
  targets: ["shape", "label", "list"],
  duration: [1, 4],
  params: {
    spokes: { type: "number", range: [2, 6], default: 4 },
    route: { type: "choice", options: ["curve", "straight"], default: "curve" },
    labels: { type: "text", default: "" },
    pulse: { type: "bool", default: true },
  },
  pairs: ["accent.calibration-dial", "data.stat-row"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "MengTo/Skills:web-design/blue-cloudy-clean-modern", license: "MIT", note: "Custom Vocabulary card's hub + spokes; draw-in, pops and pulses are our animation of the static source" },
  setup(ctx) {
    const { p, at, end, stage, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const host = ctx.scene || stage;
    const el = ctx.el && ctx.el !== stage ? ctx.el : null;
    const minSide = Math.min(f.W, f.H), k = minSide / 1080;
    const N = Math.round(ML.clamp(+p.spokes || 4, 2, 6));
    // labels: given, else the target list's items / label text, else samples in the film's language
    let names = String(p.labels || "").split(/[,،|]/).map((s) => s.trim()).filter(Boolean);
    if (!names.length && el) {
      const kids = [...el.children].map((c) => c.textContent.trim()).filter(Boolean);
      names = kids.length > 1 ? kids : [];
    }
    if (!names.length) names = rtl ? ["مصطلحات", "أسماء", "اختصارات", "منتجات", "فريقك", "عملاء"] : ["Jargon", "Nickname", "Acronym", "Products", "Team", "Clients"];
    while (names.length < N) names = names.concat(names);
    names = names.slice(0, N);
    // the region it draws in: the target's own box when it is big enough, else the picture region
    const tb = el ? ctx.box(el) : null;
    const R = tb && tb.w > f.W * 0.45 && tb.h > f.H * 0.18 ? tb : f.pic;
    const cx = R.x + R.w / 2, cy = R.y + R.h / 2;
    const rx = Math.min(R.w * 0.36, minSide * 0.38), ry = Math.min(R.h * 0.36, minSide * 0.32);

    const layer = doc.createElement("div");
    layer.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:18;visibility:hidden;will-change:transform";
    host.append(layer);
    const sv = (tag, a, parent) => { const e = doc.createElementNS(NS, tag); for (const [kk, v] of Object.entries(a)) e.setAttribute(kk, v); parent.append(e); return e; };
    const svg = sv("svg", { width: f.W, height: f.H, viewBox: `0 0 ${f.W} ${f.H}` }, layer);
    svg.style.cssText = "position:absolute;left:0;top:0;overflow:visible;will-change:transform"; // its own layer: what is under it rasterises the same every time
    const defs = sv("defs", {}, svg);
    const sw = Math.max(1.5, 2.4 * k);

    // the hub: rounded-14 glass square with a scanner glyph
    const H = 56 * k * 1.9;
    const hub = doc.createElement("div");
    hub.innerHTML = `<svg viewBox="0 0 24 24" width="${(H * 0.44).toFixed(1)}" height="${(H * 0.44).toFixed(1)}" fill="none" stroke-width="1.5" stroke-linecap="round" style="stroke:var(--x-accent)"><path d="M3 8V6a3 3 0 0 1 3-3h2M16 3h2a3 3 0 0 1 3 3v2M21 16v2a3 3 0 0 1-3 3h-2M8 21H6a3 3 0 0 1-3-3v-2M7 12h10"/></svg>`;
    hub.style.cssText = `position:absolute;left:${(cx - H / 2).toFixed(1)}px;top:${(cy - H / 2).toFixed(1)}px;width:${H.toFixed(1)}px;height:${H.toFixed(1)}px;border-radius:${(14 * k * 1.9).toFixed(1)}px;` +
      "background:color-mix(in srgb, var(--x-panel) 78%, transparent);border:var(--x-edge) solid color-mix(in srgb, var(--x-ink) 16%, transparent);box-shadow:var(--x-shadow);display:flex;align-items:center;justify-content:center;z-index:2;";
    layer.append(hub);

    // spokes and pills
    const fsz = Math.max(22 * k, Math.min(30 * k, R.h * 0.05));
    const spokes = names.map((name, i) => {
      // around the hub: 3 → up-left, up-right, down (the source); reading order runs counter-clockwise in Arabic
      const a = (-90 - 180 / N + (360 * i) / N) * (Math.PI / 180) * (rtl ? -1 : 1) + (rtl ? Math.PI : 0);
      const ex = cx + Math.cos(a) * rx, ey = cy + Math.sin(a) * ry;
      const dx = ex - cx, dy = ey - cy;
      const d = p.route === "straight"
        ? `M${cx.toFixed(1)} ${cy.toFixed(1)} L${ex.toFixed(1)} ${ey.toFixed(1)}`
        : `M${cx.toFixed(1)} ${cy.toFixed(1)} C${(cx + 0.8 * dx).toFixed(1)} ${(cy + 0.4 * dy).toFixed(1)} ${ex.toFixed(1)} ${(ey - 0.4 * dy).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
      const gid = `hsg-${Math.round(cx)}-${i}-${Math.round(ML.rnd(i, cx) * 1e6)}`;
      const lg = sv("linearGradient", { id: gid, gradientUnits: "userSpaceOnUse", x1: cx, y1: cy, x2: ex, y2: ey }, defs);
      [[0, 0.15], [0.5, 0.75], [1, 0.2]].forEach(([o, op]) => { const s = sv("stop", { offset: o }, lg); s.style.stopColor = "var(--x-ink)"; s.style.stopOpacity = String(op * 0.6); });
      const path = sv("path", { d, fill: "none", "stroke-width": sw.toFixed(2), "stroke-linecap": "round", stroke: `url(#${gid})` }, svg);
      const len = path.getTotalLength();
      path.setAttribute("stroke-dasharray", `${len.toFixed(2)} ${(len + 10).toFixed(2)}`);
      const dot = sv("circle", { r: (sw * 2.2).toFixed(2), cx: cx, cy: cy }, svg);
      dot.style.fill = "var(--x-accent)";
      const pill = doc.createElement("div");
      pill.setAttribute("dir", rtl ? "rtl" : "ltr");
      pill.innerHTML = `<span style="width:${(6 * k * 1.9).toFixed(1)}px;height:${(6 * k * 1.9).toFixed(1)}px;border-radius:50%;background:var(--x-accent);flex:none"></span><span></span>`;
      pill.lastChild.textContent = name;
      pill.style.cssText = `position:absolute;left:0;top:0;display:flex;align-items:center;gap:${(10 * k).toFixed(1)}px;white-space:nowrap;padding:${(10 * k).toFixed(1)}px ${(20 * k).toFixed(1)}px;` +
        `border-radius:var(--x-radius-s);background:color-mix(in srgb, var(--x-panel) 82%, transparent);border:var(--x-edge) solid color-mix(in srgb, var(--x-ink) 14%, transparent);box-shadow:var(--x-shadow);` +
        `font:var(--x-body-weight) ${fsz.toFixed(1)}px/1.1 var(--x-body-font);color:var(--x-ink);z-index:3;transform-origin:50% 50%;`; // no own layer: a scaled layer keeps the raster scale it was first drawn at
      layer.append(pill);
      const pw = pill.offsetWidth, ph = pill.offsetHeight;
      // the pill sits on the spoke's end, kept inside the frame
      const px = ML.clamp(ex - pw / 2, f.m * 0.5, f.W - f.m * 0.5 - pw), py = ML.clamp(ey - ph / 2, f.safe.y * 0.5, f.H - ph - f.safe.y * 0.5);
      pill.style.left = px.toFixed(1) + "px"; pill.style.top = py.toFixed(1) + "px";
      const t0 = at + 0.25 + i * 0.12, t1 = t0 + 0.8;
      return { path, len, pill, dot, t0, t1 };
    });
    ctx.sfx(at, "tap", 0.25);
    spokes.forEach((s, i) => i % 2 === 0 && ctx.sfx(s.t1 - 0.1, "pop.soft", 0.25));
    const power2out = (x) => 1 - (1 - x) * (1 - x);

    return {
      draw(t) {
        if (t < at - 1e-6 || t > end + 0.05) { layer.style.visibility = "hidden"; return; }
        layer.style.visibility = "visible";
        const leave = ML.ease(t, end - 0.3, end);
        layer.style.opacity = (1 - leave).toFixed(4);
        // the hub pops in, then breathes (2D scale, ≤ 1.04)
        const hp = ML.step(t - at, ML.SPRING.pop);
        const breathe = 1 + 0.04 * Math.sin(((t - at) / 2.4) * Math.PI * 2) * ML.lin(t, at + 0.5, at + 1);
        hub.style.opacity = ML.lin(t, at, at + 0.1).toFixed(4);
        hub.style.transform = `scale(${(0.6 * (1 - hp) + hp * breathe).toFixed(4)})`;
        for (const s of spokes) {
          const u = power2out(ML.lin(t, s.t0, s.t1));
          s.path.setAttribute("stroke-dashoffset", (s.len * (1 - u)).toFixed(2));
          s.path.style.opacity = u > 0 ? "1" : "0";
          const pp = ML.back(t, s.t1 - 0.12, s.t1 + 0.2, 1.8);
          s.pill.style.opacity = ML.lin(t, s.t1 - 0.12, s.t1).toFixed(4);
          s.pill.style.transform = `scale(${(0.7 + 0.3 * pp).toFixed(4)})`;
          // a pulse runs out along the spoke every 1.6 s once it is drawn
          if (p.pulse && t > s.t1) {
            const ph = ((t - s.t1) / 1.6) % 1, q = s.path.getPointAtLength(s.len * ph);
            s.dot.setAttribute("cx", q.x.toFixed(2)); s.dot.setAttribute("cy", q.y.toFixed(2));
            s.dot.style.opacity = (Math.sin(Math.PI * ph) * 0.9).toFixed(3);
          } else s.dot.style.opacity = "0";
        }
      },
    };
  },
});

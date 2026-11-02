// Exploded layer stack build: stacked isometric planes of a diagram rise into place one after another — each layer
// from y +distance, scale .95, opacity 0, rotationX 2° to rest on 1.4 s power3.out, 0.2 s apart (bottom layer first,
// or top-down), after a 0.2 s delay — then the vertical connectors draw between them ("-=0.8", 1 s power1.inOut,
// 0.1 s apart), the annotation leaders project out to the side ("-=0.4", 0.8 s power2.inOut, 0.15 s apart) and the
// label pills fade in ("-=0.4", 0.5 s, 0.05 s apart). Ported from MengTo/Skills technical-wireframe-info-layout's GSAP
// build sequence, on a paused timeline seeked to t. A target SVG with two or more top-level groups has those groups
// built as its layers; otherwise the move draws its own stack (2–5 planes, nodes, links, pills) in the target or the
// picture region. Annotations sit on the reading end (left in Arabic). Nothing is scaled above 1 under 3D.
// Source: MengTo/Skills agent-skills/web-design/technical-wireframe-info-layout (MIT).
ML.define({
  id: "element.layer-stack-build",
  category: "element",
  name: "Exploded layer stack build",
  does: "Stacked isometric planes of a diagram rise into position one after another, tipping back from a slight tilt, then connectors and labels follow.",
  says: ["tech", "scale", "reveal", "step"],
  energy: 2,
  targets: ["stage", "chart", "shape"],
  duration: [1.5, 3.5],
  params: {
    order: { type: "choice", options: ["bottom-up", "top-down"], default: "bottom-up" },
    layers: { type: "number", range: [2, 5], default: 3 },
    distance: { type: "number", range: [24, 60], default: 40, unit: "px" },
    labels: { type: "text", default: "" },
    annotations: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "camera.push-in"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:agent-skills/web-design/technical-wireframe-info-layout", license: "MIT", note: "GSAP build timeline ported; diagram drawn from look variables" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const n = Math.round(ML.clamp(p.layers, 2, 5));
    const dist = ML.clamp(p.distance, 24, 60) * (Math.min(f.W, f.H) / 1080);
    const svgEl = (tag, attrs, parent, style) => { const e = doc.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (style) e.setAttribute("style", style); if (parent) parent.append(e); return e; };

    let layerEls = [], links = [], leaders = [], pills = [], root = null;
    // a target SVG of its own groups: build those
    const groups = own && own.tagName && own.tagName.toLowerCase() === "svg" ? [...own.children].filter((c) => c.tagName.toLowerCase() === "g") : [];
    if (groups.length >= 2) {
      layerEls = groups;
    } else {
      const R = own ? ctx.box(own) : f.pic;
      root = doc.createElement("div");
      root.style.cssText = `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;`;
      host.append(root);
      if (!own) { const back = doc.createElement("div"); back.style.cssText = "position:absolute;inset:-48px;background:var(--x-ground);"; root.append(back); }
      const VW = 1000, VH = 800;
      const cx = p.annotations ? (rtl ? 590 : 410) : 500, hw = p.annotations ? 250 : 320, hh = hw * 0.32;
      const span = Math.min(230 * (n - 1), 520), gap = n > 1 ? span / (n - 1) : 0;
      const y0 = VH / 2 + span / 2 + 10; // bottom plane's centre
      const planeY = (i) => y0 - i * gap;
      const stackWrap = doc.createElement("div");
      stackWrap.style.cssText = "position:absolute;inset:0;perspective:1400px;";
      root.append(stackWrap);
      const nodesOf = (i) => { const y = planeY(i); return [[cx - hw * 0.5, y - hh * 0.12], [cx, y + hh * 0.38], [cx + hw * 0.5, y - hh * 0.12]]; };
      for (let i = 0; i < n; i++) {
        const d = doc.createElement("div");
        d.style.cssText = "position:absolute;inset:0;transform-origin:50% 50%;";
        const s = svgEl("svg", { viewBox: `0 0 ${VW} ${VH}`, preserveAspectRatio: "xMidYMid meet", width: "100%", height: "100%" }, null, "display:block;overflow:visible;");
        const y = planeY(i), top = i === n - 1;
        svgEl("polygon", { points: `${cx - hw},${y} ${cx},${y + hh} ${cx + hw},${y} ${cx},${y - hh}` }, s, `fill:color-mix(in srgb, var(--x-${top ? "accent" : "ink"}) ${top ? 12 : 5}%, var(--x-panel) 60%);stroke:var(--x-${top ? "accent" : "dim"});stroke-width:1.6;fill-opacity:0.85;`);
        svgEl("polygon", { points: `${cx - hw * 0.9},${y} ${cx},${y + hh * 0.9} ${cx + hw * 0.9},${y} ${cx},${y - hh * 0.9}` }, s, "fill:none;stroke:var(--x-dim);stroke-opacity:0.45;stroke-width:1;stroke-dasharray:3 4;");
        svgEl("line", { x1: cx, y1: y - hh, x2: cx, y2: y + hh }, s, "stroke:var(--x-dim);stroke-opacity:0.35;stroke-width:0.8;stroke-dasharray:1 4;");
        svgEl("line", { x1: cx - hw, y1: y, x2: cx + hw, y2: y }, s, "stroke:var(--x-dim);stroke-opacity:0.35;stroke-width:0.8;stroke-dasharray:1 4;");
        const nodes = nodesOf(i);
        if (i > 0) { svgEl("path", { d: `M${nodes[0][0]},${nodes[0][1]} L${nodes[1][0]},${nodes[1][1]} L${nodes[2][0]},${nodes[2][1]} M${nodes[0][0]},${nodes[0][1]} L${cx},${y - hh * 0.55} L${nodes[2][0]},${nodes[2][1]}` }, s, "fill:none;stroke:var(--x-dim);stroke-opacity:0.7;stroke-width:1.2;"); }
        nodes.forEach(([x, yy], j) => {
          if (i === 0) { // storage cylinders on the bottom layer
            svgEl("path", { d: `M${x - 18},${yy - 14} v18 a18,8 0 0,0 36,0 v-18` }, s, "fill:var(--x-panel);stroke:var(--x-dim);stroke-width:1.4;");
            svgEl("ellipse", { cx: x, cy: yy - 14, rx: 18, ry: 8 }, s, "fill:var(--x-panel);stroke:var(--x-dim);stroke-width:1.4;");
          } else svgEl("circle", { cx: x, cy: yy, r: j === 1 ? 9 : 7 }, s, `fill:var(--x-${top ? "accent" : "panel"});stroke:var(--x-${top ? "accent" : "ink"});stroke-width:1.4;`);
        });
        d.append(s);
        stackWrap.append(d);
        layerEls.push(d);
      }
      const over = svgEl("svg", { viewBox: `0 0 ${VW} ${VH}`, preserveAspectRatio: "xMidYMid meet", width: "100%", height: "100%" }, null, "position:absolute;inset:0;display:block;overflow:visible;");
      root.append(over);
      for (let i = 0; i < n - 1; i++) {
        const a = nodesOf(i), b = nodesOf(i + 1);
        a.forEach((pa, j) => {
          const pb = b[j], mx = (pa[0] + pb[0]) / 2 + (cx - pa[0]) * 0.25;
          links.push(svgEl("path", { d: `M${pa[0]},${pa[1] - (i === 0 ? 22 : 8)} Q${mx},${(pa[1] + pb[1]) / 2} ${pb[0]},${pb[1] + 8}` }, over, "fill:none;stroke:var(--x-accent);stroke-opacity:0.75;stroke-width:1.4;"));
        });
      }
      if (p.annotations) {
        const names = String(p.labels || "").split(/[,،|]/).map((x) => x.trim()).filter(Boolean);
        const dir = rtl ? -1 : 1, sx = cx + dir * hw, ex = cx + dir * (hw + 120);
        for (let i = 0; i < n; i++) {
          const y = planeY(i), label = names[i] || String(i + 1).padStart(2, "0");
          leaders.push(svgEl("path", { d: `M${sx},${y} L${sx + dir * 30},${y} L${ex},${y - 30}` }, over, "fill:none;stroke:var(--x-dim);stroke-width:1.2;"));
          const g = svgEl("g", {}, over);
          const tw = Math.max(46, Array.from(label).length * 17 + 30);
          const rx = rtl ? ex - tw : ex;
          svgEl("circle", { cx: ex, cy: y - 30, r: 4 }, g, "fill:var(--x-accent);");
          svgEl("rect", { x: rx + dir * 10 - (rtl ? 0 : 0), y: y - 52, width: tw, height: 44, rx: 22 }, g, "fill:var(--x-panel);stroke:var(--x-line);stroke-width:1.2;");
          const tx = svgEl("text", { x: rx + dir * 10 + tw / 2, y: y - 22, "text-anchor": "middle" }, g, `font:var(--x-label-weight) 26px var(--x-label-font);fill:var(--x-ink);letter-spacing:${rtl ? 0 : "0.08em"};`);
          tx.textContent = label;
          pills.push(...g.children);
        }
      }
    }
    // dash-draw the connectors and leaders (solid while drawing, as the source does)
    const lens = new Map();
    for (const pth of [...links, ...leaders]) { const L = pth.getTotalLength ? pth.getTotalLength() || 1 : 1; lens.set(pth, L); pth.style.strokeDasharray = `${L}`; pth.style.strokeDashoffset = `${L}`; }
    const ordered = p.order === "top-down" ? [...layerEls].reverse() : layerEls;
    const isSvgG = groups.length >= 2;
    let total = 1;
    const seek = ctx.gsapAt((tl) => {
      tl.fromTo(ordered, isSvgG ? { y: dist, scale: 0.95, opacity: 0, transformOrigin: "50% 50%" } : { y: dist, scale: 0.95, opacity: 0, rotationX: 2 }, isSvgG ? { y: 0, scale: 1, opacity: 1, duration: 1.4, stagger: 0.2, ease: "power3.out", immediateRender: true } : { y: 0, scale: 1, opacity: 1, rotationX: 0, duration: 1.4, stagger: 0.2, ease: "power3.out", immediateRender: true }, 0.2);
      if (links.length) tl.fromTo(links, { strokeDashoffset: (i, e) => lens.get(e) }, { strokeDashoffset: 0, duration: 1, stagger: 0.1, ease: "power1.inOut", immediateRender: true }, "-=0.8");
      if (leaders.length) tl.fromTo(leaders, { strokeDashoffset: (i, e) => lens.get(e) }, { strokeDashoffset: 0, duration: 0.8, stagger: 0.15, ease: "power2.inOut", immediateRender: true }, "-=0.4");
      if (pills.length) tl.fromTo(pills, { opacity: 0 }, { opacity: 1, duration: 0.5, stagger: 0.05, ease: "power1.out", immediateRender: true }, "-=0.4");
      total = tl.duration();
    });
    // the source's pace, quickened only when the move has less time than the whole build needs
    const pace = Math.max(1, total / Math.max(0.8, end - at - 0.45));
    // a tap as each layer settles, about one a beat
    ordered.forEach((_, i) => i < 3 && ctx.sfx(at + (0.2 + i * 0.2 + 0.45) / pace, "tap", 0.22));
    const leave0 = Math.max(at + 1.2, end - 0.3);
    return {
      draw(t) {
        seek(at + (t - at) * pace, at);
        const target = root || own;
        if (target) {
          const lv = ML.clamp((t - leave0) / 0.25);
          target.style.opacity = (1 - lv).toFixed(4);
          if (root) root.style.visibility = t < at - 0.2 ? "hidden" : "visible";
        }
      },
    };
  },
});

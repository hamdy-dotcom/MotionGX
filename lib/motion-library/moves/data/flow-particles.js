// Flow particles: coloured dashes stream along routes into and out of an object — power in, heat out, data through.
// Each flow is a polyline (an orthogonal route with rounded corners); its particles are short dashes (12×3 px at
// 1080) spaced 40 px, offset += speed·t, coloured by a legend (power = accent, data = accent-2, heat = bad). The
// dashed-line variant is one stroke with dasharray 10 14 and dashoffset −speed·t. Heat rises from the object as
// vertical wavy streaks with seeded phases fading out by 120 px. Endpoints pulse as dashes arrive. A legend lists the
// colours. The routes draw on first; everything is set from t.
// Source: prompt-motion sayan-shanky-one-prompt-to-claude + mdaman010-one-prompt-to-claude (reference only: our own rebuild).
ML.define({
  id: "data.flow-particles",
  category: "data",
  name: "Particles flow along routes",
  does: "Coloured dashes stream along paths into and out of an object, showing what moves through it (power in, heat out, data through).",
  says: ["flow", "connection", "tech", "proof"],
  energy: 2,
  targets: ["chart", "scene", "shape", "stage"],
  duration: [2, 8],
  params: {
    flows: { type: "number", range: [1, 6], default: 2 },
    direction: { type: "choice", options: ["in", "out", "through"], default: "through" },
    speed: { type: "number", range: [100, 500], default: 300, unit: "px/s" },
    legend: { type: "bool", default: true },
    dash: { type: "choice", options: ["dashes", "dashed-line"], default: "dashes" },
    kinds: { type: "choice", options: ["mixed", "power", "data", "heat"], default: "mixed" },
    heat: { type: "bool", default: true },
    hub_label: { type: "text", default: "" },
  },
  pairs: ["data.game-hud", "camera.iso-orbit"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:mdaman010-one-prompt-to-claude", license: "reference", note: "our own rebuild; also prompt-motion:sayan-shanky-one-prompt-to-claude" },
  setup(ctx) {
    const { p, at, end, stage } = ctx;
    const NS = "http://www.w3.org/2000/svg";
    const scene = ctx.scene || stage;
    // the object the flows pass through: the target when it is a real element (routes drawn under it), else our own hub
    const target = ctx.el && ctx.el !== stage && ctx.el !== ctx.scene ? ctx.el : null;
    const layer = document.createElement("div");
    if (target) { layer.style.cssText = "position:absolute;inset:0;pointer-events:none;visibility:hidden"; scene.prepend(layer); }
    else { layer.style.cssText = "position:absolute;left:var(--pic-x);top:var(--pic-y);width:var(--pic-w);height:var(--pic-h);pointer-events:none;z-index:5;visibility:hidden"; const back = document.createElement("div"); back.style.cssText = "position:absolute;left:calc(var(--pic-x) - 80px);top:var(--pic-y);width:calc(var(--pic-w) + 160px);height:calc(var(--pic-h) + 120px);z-index:5;visibility:hidden;background:var(--x-ground);background-image:var(--x-ground-image)"; layer.back = back; (ctx.scene || stage).append(back); scene.append(layer); }
    const W = layer.offsetWidth || ctx.f.pic.w, H = layer.offsetHeight || ctx.f.pic.h;
    const k = Math.min(ctx.f.W, ctx.f.H) / 1080;
    const lb = layer.getBoundingClientRect(), sk = lb.width / (W || 1) || 1;
    let hub;
    if (target) { const r = target.getBoundingClientRect(); hub = { x: (r.left - lb.left) / sk, y: (r.top - lb.top) / sk, w: r.width / sk, h: r.height / sk }; }
    else { const s = Math.min(W, H) * 0.3; hub = { x: W / 2 - s / 2, y: H / 2 - s / 2 + (p.heat ? s * 0.25 : 0), w: s, h: s }; }
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("width", W); svg.setAttribute("height", H);
    svg.style.cssText = "position:absolute;inset:0;overflow:visible";
    layer.append(svg);
    const el = (tag, attrs, parent = svg) => { const e = document.createElementNS(NS, tag); for (const a in attrs) e.setAttribute(a, attrs[a]); parent.append(e); return e; };

    // kinds and their look colours
    const KIND = { power: ["var(--x-accent)", "Power", "طاقة"], data: ["var(--x-accent-2)", "Data", "بيانات"], heat: ["var(--x-bad)", "Heat", "حرارة"] };
    const n = Math.round(p.flows), order = p.kinds === "mixed" ? ["power", "heat", "data"] : [p.kinds];
    // routes: from the reading side into the object, out of it to the far side (mirrored in RTL)
    const inSide = ctx.rtl ? W : 0, outSide = ctx.rtl ? 0 : W, sgn = ctx.rtl ? -1 : 1;
    const hubIn = ctx.rtl ? hub.x + hub.w : hub.x, hubOut = ctx.rtl ? hub.x : hub.x + hub.w;
    const r0 = 18 * k;
    const route = (pts) => {
      // a polyline with rounded corners as a path, and its sampled points for walking along it
      let d = `M${pts[0][0]} ${pts[0][1]}`;
      for (let i = 1; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i], [cx, cy] = pts[i + 1];
        const l1 = Math.hypot(bx - ax, by - ay), l2 = Math.hypot(cx - bx, cy - by), r = Math.min(r0, l1 / 2, l2 / 2);
        d += ` L${bx - ((bx - ax) / (l1 || 1)) * r} ${by - ((by - ay) / (l1 || 1)) * r} Q${bx} ${by} ${bx + ((cx - bx) / (l2 || 1)) * r} ${by + ((cy - by) / (l2 || 1)) * r}`;
      }
      d += ` L${pts[pts.length - 1][0]} ${pts[pts.length - 1][1]}`;
      return d;
    };
    const flows = [];
    for (let i = 0; i < n; i++) {
      const kind = order[i % order.length];
      const f = (i + 1) / (n + 1), yHub = hub.y + hub.h * (0.2 + 0.6 * f), yEdge = H * (0.12 + 0.76 * f);
      const legs = [];
      const dirOf = p.direction === "through" ? ["in", "out"] : [p.direction];
      for (const d of dirOf) {
        if (d === "in") { const mx = (inSide + hubIn) / 2 + sgn * (i - (n - 1) / 2) * 14 * k; legs.push([[inSide, yEdge], [mx, yEdge], [mx, yHub], [hubIn, yHub]]); }
        else { const mx = (hubOut + outSide) / 2 - sgn * (i - (n - 1) / 2) * 14 * k; const ye = H * (0.12 + 0.76 * (1 - f)); legs.push([[hubOut, yHub], [mx, yHub], [mx, ye], [outSide, ye]]); }
      }
      for (const pts of legs) {
        const track = el("path", { d: route(pts), fill: "none", stroke: KIND[kind][0], "stroke-opacity": "0.22", "stroke-width": (2 * k).toFixed(2) });
        const L = track.getTotalLength();
        const flow = { kind, track, L, pts, i };
        if (p.dash === "dashed-line") flow.line = el("path", { d: route(pts), fill: "none", stroke: KIND[kind][0], "stroke-width": (2.4 * k).toFixed(2), "stroke-dasharray": `${10 * k} ${14 * k}`, "stroke-linecap": "round" });
        else { flow.dots = []; const m = Math.ceil(L / (40 * k)) + 1; for (let j = 0; j < m; j++) flow.dots.push(el("rect", { width: (12 * k).toFixed(2), height: (3 * k).toFixed(2), rx: (1.5 * k).toFixed(2), fill: KIND[kind][0] })); }
        // posts (pylons) at the corners, the end that pulses on arrival
        for (const [x, y] of pts.slice(1, -1)) el("circle", { cx: x, cy: y, r: (3 * k).toFixed(2), fill: KIND[kind][0], "fill-opacity": "0.5" });
        const tip = pts[pts.length - 1];
        flow.end = el("circle", { cx: tip[0], cy: tip[1], r: (5 * k).toFixed(2), fill: KIND[kind][0] });
        flows.push(flow);
      }
    }
    // the object: our hub (a panel with a chip mark) when there is no target
    if (!target) {
      const g = el("g", {});
      el("rect", { x: hub.x, y: hub.y, width: hub.w, height: hub.h, fill: "var(--x-panel)", stroke: "var(--x-edge-color)", "stroke-width": "1.5" }, g).style.rx = "min(calc(var(--x-radius) * 0.6), 40px)";
      const cs = hub.w * 0.34, cx = hub.x + hub.w / 2, cy = hub.y + hub.h / 2;
      el("rect", { x: cx - cs / 2, y: cy - cs / 2, width: cs, height: cs, rx: cs * 0.14, fill: "none", stroke: "var(--x-ink)", "stroke-width": (3 * k).toFixed(2) }, g);
      for (let j = 0; j < 3; j++) { const o = cs * (0.25 + j * 0.25) - cs / 2; for (const [x1, y1, x2, y2] of [[cx + o, cy - cs / 2, cx + o, cy - cs / 2 - cs * 0.22], [cx + o, cy + cs / 2, cx + o, cy + cs / 2 + cs * 0.22], [cx - cs / 2, cy + o, cx - cs / 2 - cs * 0.22, cy + o], [cx + cs / 2, cy + o, cx + cs / 2 + cs * 0.22, cy + o]]) el("line", { x1, y1, x2, y2, stroke: "var(--x-ink)", "stroke-width": (3 * k).toFixed(2), "stroke-linecap": "round" }, g); }
      el("rect", { x: cx - cs * 0.22, y: cy - cs * 0.22, width: cs * 0.44, height: cs * 0.44, rx: cs * 0.06, fill: "var(--x-accent)" }, g);
      if (p.hub_label) { const tx = el("text", { x: cx, y: hub.y + hub.h + 34 * k, "text-anchor": "middle", fill: "var(--x-dim)" }, g); tx.textContent = p.hub_label; tx.style.font = `var(--x-label-weight) ${(20 * k).toFixed(1)}px var(--x-label-font)`; }
    }
    // heat: wavy streaks rising from the object's top, seeded phases, fading by 120 px
    const hasHeat = p.heat && flows.some((f) => f.kind === "heat");
    const streaks = hasHeat ? Array.from({ length: 6 }, (_, j) => ({ x: hub.x + hub.w * (0.15 + 0.7 * (j + 0.5) / 6), ph: ML.rnd(j, 41) * 6.28, sp: 0.7 + 0.5 * ML.rnd(j, 42), e: el("path", { fill: "none", stroke: "var(--x-bad)", "stroke-width": (2.2 * k).toFixed(2), "stroke-linecap": "round" }) })) : [];
    // the legend, top corner on the far side
    let legend = null;
    if (p.legend) {
      legend = document.createElement("div");
      legend.style.cssText = `position:absolute;top:${16 * k}px;${ctx.rtl ? "left" : "right"}:${16 * k}px;display:grid;gap:${8 * k}px;padding:${12 * k}px ${16 * k}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * 0.4);font:var(--x-label-weight) ${(17 * k).toFixed(1)}px var(--x-label-font);color:var(--x-ink);${ctx.rtl ? "" : "letter-spacing:var(--x-label-track);text-transform:var(--x-label-case);"}`;
      for (const kind of [...new Set(flows.map((f) => f.kind))]) { const row = document.createElement("div"); row.style.cssText = `display:flex;align-items:center;gap:${10 * k}px`; row.innerHTML = `<i style="display:inline-block;width:${22 * k}px;height:${4 * k}px;border-radius:2px;background:${KIND[kind][0]}"></i>`; row.append(ctx.rtl ? KIND[kind][2] : KIND[kind][1]); legend.append(row); }
      layer.append(legend);
    }
    ctx.sfx(at, "whoosh.soft", 0.2);
    const spacing = 40 * k, v = p.speed * k, drawOn = 0.6;
    return {
      draw(t) {
        const vis = ML.out(t, at, at + 0.35) * (1 - ML.ease(t, end - 0.35, end));
        layer.style.visibility = t < at || vis <= 0.001 ? "hidden" : "visible";
        layer.style.opacity = vis.toFixed(4);
        if (layer.back) { layer.back.style.visibility = layer.style.visibility; layer.back.style.opacity = layer.style.opacity; }
        if (t < at) return;
        const tt = t - at, grow = ML.ease(t, at, at + drawOn), flowOn = ML.lin(t, at + drawOn * 0.6, at + drawOn + 0.2);
        for (const f of flows) {
          f.track.setAttribute("stroke-dasharray", `${f.L} ${f.L}`);
          f.track.setAttribute("stroke-dashoffset", (f.L * (1 - grow)).toFixed(2));
          const run = v * Math.max(0, tt - drawOn * 0.6) + f.i * 13 * k;
          if (f.line) { f.line.setAttribute("stroke-dashoffset", (-run).toFixed(2)); f.line.style.opacity = flowOn.toFixed(3); }
          else f.dots.forEach((d, j) => {
            const s = j * spacing + (run % spacing);
            if (s > f.L || flowOn <= 0) { d.style.visibility = "hidden"; return; }
            const a = f.track.getPointAtLength(s), b = f.track.getPointAtLength(Math.min(f.L, s + 1)), ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
            d.style.visibility = "visible";
            d.setAttribute("transform", `translate(${a.x.toFixed(2)} ${a.y.toFixed(2)}) rotate(${ang.toFixed(2)}) translate(${(-6 * k).toFixed(2)} ${(-1.5 * k).toFixed(2)})`);
            d.style.opacity = (flowOn * Math.min(1, s / (30 * k), (f.L - s) / (30 * k) + 0.2)).toFixed(3);
          });
          // the end pulses each time a dash arrives (every spacing / speed seconds)
          const ph = ((f.L - run) % spacing + spacing) % spacing / spacing, hit = Math.exp(-ph * 6) * flowOn;
          f.end.setAttribute("r", ((5 + 5 * hit) * k).toFixed(2));
          f.end.style.opacity = (0.5 + 0.5 * hit).toFixed(3);
        }
        for (const s of streaks) {
          const cyc = ((tt * s.sp + s.ph) % 1.6) / 1.6, y0 = hub.y - 6 * k - cyc * 120 * k, len = 44 * k;
          let d = "";
          for (let q = 0; q <= 10; q++) { const y = y0 - (q / 10) * len, x = s.x + Math.sin(y * 0.06 / k + s.ph + tt * 3) * 6 * k; d += `${q ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`; }
          s.e.setAttribute("d", d);
          s.e.style.opacity = (flowOn * Math.max(0, 1 - cyc) * 0.9).toFixed(3);
        }
        if (legend) legend.style.opacity = ML.out(t, at + 0.3, at + 0.7).toFixed(3);
      },
    };
  },
});

// Step chart behind a playhead: axes 0–10 up and 0–12 s across (hairline grey, small mono labels). A stepped value
// line (accent, thin) is plotted only up to the playhead — a 1 px vertical line sweeping across with the move's time.
// Under the axis an event lane marks each event as the playhead passes it: a 1 × 12 tick in good (taken) or bad
// (refused). The series is a rate limiter's story: a steady phase holding near the top with small dips and recoveries
// (one refusal at each dip), then a burst that stairs the line down to 0 while refusals pile up. Step or linear
// joins; in Arabic time runs right to left.
// Source: prompt-motion "parkerrex-3-ole-lehmann-s-list" (reference only: rebuilt as our own code).
ML.define({
  id: "data.step-chart-playhead",
  category: "data",
  name: "Step chart behind a playhead",
  does: "A stepped value line draws left to right following a vertical playhead, with event ticks marked green or red along the bottom.",
  says: ["proof", "time", "precision"],
  energy: 2,
  targets: ["chart"],
  duration: [2, 8],
  params: {
    mode: { type: "choice", options: ["step", "linear"], default: "step" },
    tick_lane: { type: "bool", default: true },
    burst_at: { type: "number", range: [4, 10], default: 7.5, unit: "s" },
  },
  pairs: ["data.token-bucket", "data.timeline-playhead-markers"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:parkerrex-3-ole-lehmann-s-list", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs || {})) e.setAttribute(a, String(v)); if (parent) parent.append(e); return e; };
    const scene = ctx.scene || ctx.stage, hb = ctx.box(scene);
    let bx;
    if (el) bx = ctx.box(el);
    else { const w = Math.min(f.pic.w * 0.92, f.wide ? f.W * 0.56 : f.W * 0.86), h = Math.min(f.pic.h * 0.7, w * (f.wide ? 0.56 : 0.72)); bx = { x: f.pic.x + (f.pic.w - w) / 2, y: f.pic.y + (f.pic.h - h) / 2, w, h }; }
    const wrap = document.createElement("div");
    wrap.style.cssText = `position:absolute;left:${(bx.x - hb.x).toFixed(1)}px;top:${(bx.y - hb.y).toFixed(1)}px;width:${bx.w.toFixed(1)}px;height:${bx.h.toFixed(1)}px;z-index:12;pointer-events:none;box-sizing:border-box;will-change:transform`;
    if (!el) wrap.className = "ml-panel";
    scene.append(wrap);
    const W = bx.w, H = bx.h, u = Math.min(f.W, f.H) / 1080;
    const svg = mk("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}` }, wrap);
    svg.style.cssText = "position:absolute;inset:0;overflow:visible";
    const fsz = Math.max(16, 20 * u), padX = 70 * u, padT = 40 * u, lane = p.tick_lane ? 56 * u : 0, padB = 56 * u + lane;
    const L = rtl ? 40 * u : padX, R = rtl ? W - padX : W - 40 * u, T = padT, B = H - padB;
    const X = (s) => (rtl ? R - ((R - L) * s) / 12 : L + ((R - L) * s) / 12), Y = (v) => B - ((B - T) * v) / 10;
    const label = (x, y, txt, anchor) => { const e = mk("text", { x, y, "text-anchor": anchor, fill: "var(--x-dim)", "font-size": fsz.toFixed(1), "font-family": "var(--x-mono-font)" }, svg); e.style.fontFamily = "var(--x-mono-font)"; e.textContent = txt; return e; };
    // axes and labels
    mk("line", { x1: X(0), y1: B, x2: X(12), y2: B, stroke: "var(--x-line)", "stroke-width": Math.max(1, 2 * u) }, svg);
    mk("line", { x1: X(0), y1: T, x2: X(0), y2: B, stroke: "var(--x-line)", "stroke-width": Math.max(1, 2 * u) }, svg);
    for (const v of [0, 5, 10]) { mk("line", { x1: X(0), y1: Y(v), x2: X(12), y2: Y(v), stroke: "var(--x-line)", "stroke-width": 1, "stroke-dasharray": `${4 * u} ${6 * u}`, opacity: v ? 0.7 : 0 }, svg); label(X(0) + (rtl ? 14 : -14) * u, Y(v) + fsz * 0.35, String(v), rtl ? "start" : "end"); }
    for (const s of [0, 3, 6, 9, 12]) label(X(s), B + fsz * 1.5, `${s}s`, "middle");
    // the series: steady with dips, then a burst stairs it down; events taken / refused
    const burst = ML.clamp(p.burst_at, 4, 10);
    const pts = [[0, 8]], ev = [];
    for (let s = 0.5; s < burst; s += 0.5) {
      const dip = ML.rnd(Math.round(s * 2), 5) < 0.28;
      const prev = pts[pts.length - 1][1];
      const v = dip ? Math.max(5, prev - 1 - Math.round(ML.rnd(Math.round(s * 2), 9))) : Math.min(8, prev + 1);
      pts.push([s, v]);
      ev.push([s - 0.25 + ML.rnd(Math.round(s * 2), 2) * 0.2, true]);
      if (dip) ev.push([s - 0.05, false]);
    }
    let v = pts[pts.length - 1][1];
    for (let s = Math.ceil(burst * 2) / 2; s <= 12 + 1e-6; s += 0.5) {
      v = Math.max(0, v - (ML.rnd(Math.round(s * 2), 4) < 0.75 ? 1 : 2));
      pts.push([s, v]);
      ev.push([s - 0.3, v > 0 && ML.rnd(Math.round(s * 2), 6) < 0.35]);
      ev.push([s - 0.15, false]);
    }
    const path = mk("path", { d: "", fill: "none", stroke: "var(--x-accent)", "stroke-width": Math.max(2, 3 * u), "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);
    const ticks = ev.filter(([s]) => s > 0 && s < 12).map(([s, ok]) => ({ s, ok, r: mk("rect", { x: X(s) - Math.max(1, 1.5 * u), y: B + fsz * 2.2, width: Math.max(2, 3 * u), height: 30 * u, fill: ok ? "var(--x-good)" : "var(--x-bad)" }, svg) }));
    if (!p.tick_lane) ticks.forEach((k) => k.r.setAttribute("display", "none"));
    const head = mk("line", { y1: T - 10 * u, y2: B + lane, stroke: "var(--x-dim)", "stroke-width": Math.max(1, 2 * u) }, svg);
    const dot = mk("circle", { r: 6 * u, fill: "var(--x-accent)" }, svg);
    const valueAt = (s) => {
      let i = 0; while (i < pts.length - 1 && pts[i + 1][0] <= s) i++;
      if (p.mode === "step" || i >= pts.length - 1) return pts[i][1];
      const [a, va] = pts[i], [b, vb] = pts[i + 1]; return va + ((vb - va) * (s - a)) / (b - a);
    };
    const t0 = at + 0.3, t1 = Math.max(t0 + 1.2, end - 0.45);
    const chartT = (t) => 12 * ML.lin(t, t0, t1);
    ctx.sfx(t0, "tap", 0.2);
    ctx.sfx(t0 + ((t1 - t0) * burst) / 12, "blip", 0.3);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        wrap.style.opacity = (ML.out(t, at, at + 0.3) * (1 - leave)).toFixed(4);
        const s = chartT(t);
        let d = `M${X(0).toFixed(1)} ${Y(pts[0][1]).toFixed(1)}`;
        for (let i = 1; i < pts.length && pts[i][0] <= s; i++) {
          if (p.mode === "step") d += ` H${X(pts[i][0]).toFixed(1)} V${Y(pts[i][1]).toFixed(1)}`;
          else d += ` L${X(pts[i][0]).toFixed(1)} ${Y(pts[i][1]).toFixed(1)}`;
        }
        const cur = valueAt(s);
        d += p.mode === "step" ? ` H${X(s).toFixed(1)}` : ` L${X(s).toFixed(1)} ${Y(cur).toFixed(1)}`;
        path.setAttribute("d", d);
        head.setAttribute("x1", X(s).toFixed(1)); head.setAttribute("x2", X(s).toFixed(1));
        dot.setAttribute("cx", X(s).toFixed(1)); dot.setAttribute("cy", Y(cur).toFixed(1));
        for (const k of ticks) { const q = ML.lin(s, k.s, k.s + 0.25); k.r.setAttribute("opacity", s >= k.s ? (0.55 + 0.45 * q).toFixed(3) : "0"); }
      },
    };
  },
});

// Line chart draws in (MengTo scroll-world-storytelling html-data, ported): an SVG at viewBox 620 × 360 with four
// hairlines (ink 14%, 1 px) at y 40 / 140 / 240 / 320 and mono 9-unit axis labels 100 / 066 / 033 / 000; the trend
// path (the source's M62 270 … 592 54, re-sampled to `points` with seeded wiggle) is stroked in the accent, 4 units,
// square or round caps, stroke-dasharray = its length L and dashoffset = L · (1 − p). p is driven three ways:
// continuous (power1.inOut over `duration`), stepped (one segment a beat, 0.4 s power2.out each) or bars (linear, like
// a playhead over musical bars). Options: the route shadow (the same path 13 units wide at 14% under it, previewing the
// route while the crisp line commits), a leading dot with a halo at the tip (getPointAtLength), an area under the curve
// (accent 22% → 0, following the tip or fading in 0.4 s after), a counter above it counting start → end with p
// (11,686 → 25,567 USD, tabular, separators), milestone badges that pop as the head passes, range tabs (1M 3M 1Y ALL)
// and a peak tooltip at the end. In Arabic the chart reads right to left (time runs leftwards, labels on the right).
// Sources: MengTo/Skills web-design/scroll-world-storytelling demo/html-data (MIT); product-film-skill ingredients
// (Opening: Product UI); prompt-motion "rammanq-wow-just-tried-this", "daniel-haida-claude-code-opus-5-5" (reference).
ML.define({
  id: "data.line-chart-draw",
  category: "data",
  name: "Line chart draws in",
  does: "A trend line draws itself across the chart, optionally with a glowing dot at its tip, a soft area fill and a value counting up in sync.",
  says: ["growth", "proof", "result", "money"],
  energy: 3,
  targets: ["chart", "number"],
  duration: [1.2, 4],
  params: {
    drive: { type: "choice", options: ["continuous", "stepped", "bars"], default: "continuous" },
    duration: { type: "number", range: [1, 2.5], default: 1.5, unit: "s" },
    points: { type: "number", range: [4, 12], default: 6 },
    shadow_route: { type: "bool", default: false },
    leading_dot: { type: "bool", default: true },
    area: { type: "choice", options: ["none", "follow", "after"], default: "after" },
    counter: { type: "bool", default: false },
    from_value: { type: "number", range: [0, 100000000], default: 11686 },
    to_value: { type: "number", range: [0, 100000000], default: 25567 },
    unit: { type: "text", default: "USD" },
    milestones: { type: "number", range: [0, 4], default: 0 },
    tabs: { type: "bool", default: false },
    tooltip: { type: "bool", default: false },
    cap: { type: "choice", options: ["round", "square"], default: "round" },
  },
  pairs: ["data.odometer", "data.bar-chart-grow"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "riser",
  source: { from: "MengTo/Skills:web-design/scroll-world-storytelling/demo/html-data/index.html", license: "MIT", note: "+ product-film ingredients (Opening: Product UI); prompt-motion rammanq / daniel-haida (reference)" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const sv = (tag, attrs, parent, style) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, String(v)); if (style) e.style.cssText = style; if (parent) parent.append(e); return e; };
    const u = Math.min(f.W, f.H) / 1080;
    // the counter's end value: the number slot's own value when it has one
    let toV = p.to_value;
    if (el && el.getAttribute("data-slot") === "number") { const v = parseFloat(String(el.textContent || "").replace(/[^\d.]/g, "")); if (v > 0) toV = v; }
    const showCounter = p.counter || (el && el.getAttribute("data-slot") === "number");
    // the host: a chart slot's box when big enough, else a panel in the picture region
    const scene = ctx.scene || stage, hb = ctx.box(scene);
    let R = el && el.getAttribute("data-slot") === "chart" ? ctx.box(el) : null;
    if (!R || R.w < 320 * u || R.h < 220 * u) {
      const w = Math.min(f.pic.w * 0.94, f.wide ? f.W * 0.56 : f.W * 0.88);
      const h = Math.min(f.pic.h * 0.9, w * 0.58 + (showCounter ? 150 : 40) * u + (p.tabs ? 60 * u : 0));
      R = { x: f.pic.x + (f.pic.w - w) / 2, y: f.pic.y + (f.pic.h - h) / 2, w, h };
    }
    const pad = 32 * u;
    const box = mk("div", `position:absolute;left:${(R.x - hb.x).toFixed(1)}px;top:${(R.y - hb.y).toFixed(1)}px;width:${R.w.toFixed(1)}px;height:${R.h.toFixed(1)}px;z-index:20;box-sizing:border-box;padding:${pad.toFixed(1)}px;display:flex;flex-direction:column;gap:${(10 * u).toFixed(1)}px;visibility:hidden;direction:${rtl ? "rtl" : "ltr"}`, scene);
    box.className = "ml-panel";
    box.style.willChange = "opacity, translate"; // its own layer: the scene under it is never re-rastered mid-fade (same pixels twice)
    let counter = null;
    if (showCounter || p.tabs) {
      const top = mk("div", "display:flex;justify-content:space-between;align-items:flex-end;gap:12px", box);
      if (showCounter) {
        const c = mk("div", `display:flex;align-items:baseline;gap:${(10 * u).toFixed(1)}px;direction:ltr;unicode-bidi:isolate`, top);
        counter = mk("span", `font:var(--x-head-weight) ${(64 * u).toFixed(1)}px/1 var(--x-head-font);font-variant-numeric:tabular-nums lining-nums;letter-spacing:-0.02em;color:var(--x-ink)`, c, "0");
        if (p.unit) mk("span", `font:var(--x-label-weight) ${(20 * u).toFixed(1)}px var(--x-label-font);letter-spacing:.12em;color:var(--x-dim)`, c, p.unit);
      } else mk("span", "", top);
      if (p.tabs) {
        const tabs = mk("div", `display:flex;gap:${(6 * u).toFixed(1)}px;direction:ltr`, top);
        ["1M", "3M", "1Y", "ALL"].forEach((x, i) => mk("span", `font:var(--x-label-weight) ${(16 * u).toFixed(1)}px var(--x-mono-font);padding:${(6 * u).toFixed(1)}px ${(12 * u).toFixed(1)}px;border-radius:var(--x-radius-s);${i === 3 ? "background:var(--x-ink);color:var(--x-panel)" : "color:var(--x-dim)"}`, tabs, x));
      }
    }
    const svgWrap = mk("div", "flex:1;min-height:0;position:relative", box);
    const svg = sv("svg", { viewBox: "0 0 620 360", preserveAspectRatio: "xMidYMid meet" }, svgWrap, "position:absolute;inset:0;width:100%;height:100%;overflow:visible");
    // the data: from the source's polyline, re-sampled to `points` with a seeded wiggle (ends kept)
    const n = Math.round(ML.clamp(p.points, 4, 12));
    const X = (x) => (rtl ? 620 - x : x);
    const pts = Array.from({ length: n }, (_, i) => {
      const q = i / (n - 1), x = 62 + q * 530, base = 270 - 216 * Math.pow(q, 1.1);
      const wig = i === 0 || i === n - 1 ? 0 : (ML.rnd(i, 21) - 0.5) * 70;
      return [X(x), ML.clamp(base + wig, 48, 300)];
    });
    const d = "M" + pts.map((q) => q[0].toFixed(1) + " " + q[1].toFixed(1)).join(" L");
    // grid
    const gGrid = sv("g", {}, svg);
    [[40, "100"], [140, "066"], [240, "033"], [320, "000"]].forEach(([y, lab]) => {
      sv("line", { x1: X(52), y1: y, x2: X(600), y2: y }, gGrid, "stroke:color-mix(in srgb, var(--x-ink) 14%, transparent);stroke-width:1");
      const tx = sv("text", { x: X(rtl ? 4 : 0), y: y + 3, "text-anchor": rtl ? "end" : "start" }, gGrid, "font:500 11px var(--x-mono-font);letter-spacing:.08em;fill:var(--x-dim)");
      tx.setAttribute("x", rtl ? "620" : "0"); tx.textContent = lab;
    });
    // area
    const gid = "mllc" + document.querySelectorAll("[data-ml-lc]").length;
    box.dataset.mlLc = gid;
    const defs = sv("defs", {}, svg);
    const grad = sv("linearGradient", { id: gid + "g", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    sv("stop", { offset: 0 }, grad, "stop-color:var(--x-accent);stop-opacity:.22");
    sv("stop", { offset: 1 }, grad, "stop-color:var(--x-accent);stop-opacity:0");
    const clip = sv("clipPath", { id: gid + "c" }, defs);
    const clipR = sv("rect", { x: 0, y: 0, width: 0, height: 360 }, clip);
    let area = null;
    if (p.area !== "none") {
      area = sv("path", { d: `${d} L${pts[n - 1][0]} 320 L${pts[0][0]} 320 Z`, fill: `url(#${gid}g)` }, svg);
      if (p.area === "follow") area.setAttribute("clip-path", `url(#${gid}c)`);
    }
    const shadow = p.shadow_route ? sv("path", { d }, svg, "fill:none;stroke:var(--x-accent);stroke-opacity:.14;stroke-width:13;stroke-linejoin:round;stroke-linecap:round") : null;
    const line = sv("path", { d }, svg, `fill:none;stroke:var(--x-accent);stroke-width:4;stroke-linecap:${p.cap};stroke-linejoin:${p.cap === "square" ? "bevel" : "round"}`);
    const L = line.getTotalLength();
    line.style.strokeDasharray = `${L.toFixed(2)} ${(L + 10).toFixed(2)}`;
    // the leading dot and its halo
    const halo = p.leading_dot ? sv("circle", { r: 15 }, svg, "fill:var(--x-accent);fill-opacity:.2") : null;
    const dot = p.leading_dot ? sv("circle", { r: 7 }, svg, "fill:var(--x-accent);stroke:var(--x-panel);stroke-width:2.5") : null;
    // the cumulative length at each point (for stepped drive and milestones)
    const segL = [0]; for (let i = 1; i < n; i++) segL.push(segL[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const mN = Math.round(ML.clamp(p.milestones, 0, 4));
    const ms = Array.from({ length: mN }, (_, i) => {
      const idx = Math.max(1, Math.min(n - 2, Math.round(((i + 1) * (n - 1)) / (mN + 1))));
      const g = sv("g", { transform: `translate(${pts[idx][0]} ${pts[idx][1]})` }, svg);
      const inner = sv("g", {}, g);
      sv("circle", { r: 14 }, inner, "fill:var(--x-panel);stroke:var(--x-accent);stroke-width:2.5");
      const tx = sv("text", { y: 5, "text-anchor": "middle" }, inner, "font:700 14px var(--x-mono-font);fill:var(--x-accent)");
      tx.textContent = String(i + 1);
      return { inner, frac: segL[idx] / L };
    });
    let tip = null;
    if (p.tooltip) {
      const last = pts[n - 1];
      tip = sv("g", { transform: `translate(${last[0]} ${last[1] - 30})` }, svg);
      const ti = sv("g", {}, tip);
      sv("rect", { x: -46, y: -20, width: 92, height: 30, rx: 15 }, ti, "fill:var(--x-ink)");
      const tt = sv("text", { y: 1, "text-anchor": "middle" }, ti, "font:700 15px var(--x-mono-font);fill:var(--x-panel)");
      tt.textContent = "+" + Math.round(((toV - p.from_value) / Math.max(1, p.from_value)) * 100) + "%";
    }
    // the drive
    const t0 = at + 0.25, D = ML.clamp(p.duration, 1, 2.5), t1 = Math.min(end - 0.4, t0 + D);
    const span = Math.max(0.3, t1 - t0);
    const stepGap = span / (n - 1);
    const p1io = (x) => -(Math.cos(Math.PI * x) - 1) / 2;
    const prog = (t) => {
      if (p.drive === "bars") return ML.lin(t, t0, t0 + span);
      if (p.drive === "stepped") {
        let len = 0;
        for (let i = 1; i < n; i++) { const a = t0 + (i - 1) * stepGap; len += (segL[i] - segL[i - 1]) * (1 - Math.pow(1 - ML.lin(t, a, a + Math.min(0.4, stepGap)), 2)); }
        return len / L;
      }
      return p1io(ML.lin(t, t0, t0 + span));
    };
    ctx.sfx(t0, "riser", 0.3);
    if (p.drive === "stepped") for (let i = 1; i < n; i += 2) ctx.sfx(t0 + (i - 1) * stepGap, "tap", 0.18);
    ms.forEach((m) => ctx.sfx(t0 + span * m.frac * 0.95, "pop.soft", 0.22));
    if (tip) ctx.sfx(t0 + span + 0.05, "pop", 0.25);
    const fmtN = (v) => Math.round(v).toLocaleString("en-US");
    return {
      draw(t) {
        if (t < at - 1e-6) { box.style.visibility = "hidden"; return; }
        box.style.visibility = "visible";
        const leave = ML.clamp((t - (end - 0.25)) / 0.2), e = ML.out(t, at, at + 0.35);
        box.style.opacity = (e * (1 - leave)).toFixed(4);
        box.style.translate = `0 ${Math.round((1 - e) * 20 * u)}px`;
        const q = ML.clamp(prog(t));
        line.style.strokeDashoffset = (L * (1 - q)).toFixed(2);
        line.style.opacity = q > 0.001 ? "1" : "0";
        const pt = line.getPointAtLength(L * q);
        if (dot) {
          const on = q > 0.001 ? 1 : 0;
          dot.setAttribute("cx", pt.x.toFixed(2)); dot.setAttribute("cy", pt.y.toFixed(2));
          halo.setAttribute("cx", pt.x.toFixed(2)); halo.setAttribute("cy", pt.y.toFixed(2));
          const breathe = 1 + 0.18 * Math.sin((t - t0) * Math.PI * 2 * 1.2);
          halo.setAttribute("r", (15 * breathe).toFixed(2));
          dot.style.opacity = halo.style.opacity = String(on);
        }
        if (shadow) shadow.style.opacity = ML.out(t, at, at + 0.4).toFixed(4);
        if (area) {
          if (p.area === "follow") {
            const w = Math.abs(pt.x - pts[0][0]);
            clipR.setAttribute("x", (rtl ? pt.x : 0).toFixed(2)); clipR.setAttribute("width", (rtl ? 620 - pt.x : pt.x).toFixed(2));
            area.style.opacity = w > 0.5 ? "1" : "0";
          } else area.style.opacity = ML.ease(t, t0 + span, t0 + span + 0.4).toFixed(4);
        }
        ms.forEach((m) => { const s = ML.clamp(ML.back(t, t0 + span * m.frac * 0.95, t0 + span * m.frac * 0.95 + 0.3, 1.8), 0, 1.2); m.inner.setAttribute("transform", `scale(${Math.max(0, s).toFixed(4)})`); });
        if (tip) { const s = ML.back(t, t0 + span + 0.05, t0 + span + 0.4, 1.6); tip.firstChild.setAttribute("transform", `scale(${Math.max(0, s).toFixed(4)})`); tip.style.opacity = s > 0.01 ? "1" : "0"; }
        if (counter) { const txt = fmtN(p.from_value + (toV - p.from_value) * q); if (counter.textContent !== txt) counter.textContent = txt; }
      },
    };
  },
});

// Radial gauge overshoot: an outer ring of 120 ticks (1 × 6, every 10th 10 long, 30 % ink), a 2 px track circle
// (15 % ink, r 80) and a 6 px ink progress arc from 12 o'clock that fills 0 → 100 % over `duration` (power2.inOut)
// with a synced centre % counter. At 100 % the arc turns the warning tone and the ticks inside it light up; then it
// overshoots to `max` (e.g. 118 %): a bad-tone segment continues past the full turn on top and the label flips to
// "OVERAGE" in the bad tone. A small index dot rides the arc head. Rebuilt as our own SVG from the reference.
// Source: prompt-motion sudeepsd-opus-5-5-is-goated (reference).
ML.define({
  id: "data.radial-gauge-overshoot",
  category: "data",
  name: "Tick gauge fills and overshoots",
  does: "A circular tick gauge fills to 100% and turns the warning colour, then overshoots past it with an overage segment in the alarm colour.",
  says: ["growth", "urgency", "result", "precision"],
  energy: 4,
  targets: ["number", "chart"],
  duration: [1.2, 3],
  params: {
    max: { type: "number", range: [100, 150], default: 118, unit: "%" },
    duration: { type: "number", range: [0.8, 2], default: 1, unit: "s" },
    overshoot: { type: "bool", default: true },
    label: { type: "text", default: "" },
  },
  pairs: ["data.ringed-stat", "data.progress-fill"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "prompt-motion:sudeepsd-opus-5-5-is-goated", license: "reference", note: "technique rebuilt as our own SVG code" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const k = Math.min(f.W, f.H) / 1080;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, text, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const sv = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs || {})) e.setAttribute(a, String(v)); if (parent) parent.append(e); return e; };
    const parent = ctx.scene || ctx.stage;
    const asBox = el && el !== ctx.stage && el.offsetHeight > 360 * k && el.offsetWidth > 360 * k;
    if (asBox && getComputedStyle(el).position === "static") el.style.position = "relative";
    const host = asBox
      ? mk("div", "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:4;background:var(--x-ground);border-radius:inherit", null, el)
      : mk("div", "position:absolute;left:var(--pic-x);top:var(--pic-y);width:var(--pic-w);height:var(--pic-h);z-index:4;background:var(--x-ground);display:flex;align-items:center;justify-content:center", null, parent);
    const BW = asBox ? el.clientWidth : f.pic.w, BH = asBox ? el.clientHeight : f.pic.h;
    const S = Math.min(BW, BH) * 0.86;
    const WARN = "color-mix(in oklch, var(--x-bad) 55%, var(--x-good))";
    const svg = sv("svg", { width: S.toFixed(1), height: S.toFixed(1), viewBox: "0 0 240 240", overflow: "visible" }, host);
    const cx = 120, cy = 120;
    // ticks as three paths (dim, lit, over): each frame rewrites a path's d, never 120 separate strokes
    const tickD = (i) => { const a = (i / 120) * Math.PI * 2 - Math.PI / 2, r1 = 110, r0 = i % 10 === 0 ? 100 : 104; return `M${(cx + Math.cos(a) * r0).toFixed(2)} ${(cy + Math.sin(a) * r0).toFixed(2)}L${(cx + Math.cos(a) * r1).toFixed(2)} ${(cy + Math.sin(a) * r1).toFixed(2)}`; };
    const ticksD = (from, to) => { let d = ""; for (let i = from; i < to; i++) d += tickD(i); return d || "M0 0"; };
    sv("path", { d: ticksD(0, 120), stroke: "color-mix(in srgb, var(--x-ink) 30%, var(--x-ground))", "stroke-width": 1.1, fill: "none" }, svg);
    const litTicks = sv("path", { d: "M0 0", stroke: WARN, "stroke-width": 1.1, fill: "none" }, svg);
    const redTicks = sv("path", { d: "M0 0", stroke: "var(--x-bad)", "stroke-width": 1.1, fill: "none" }, svg);
    sv("circle", { cx, cy, r: 80, fill: "none", stroke: "color-mix(in srgb, var(--x-ink) 15%, var(--x-ground))", "stroke-width": 2 }, svg);
    const arc = sv("circle", { cx, cy, r: 80, fill: "none", stroke: "var(--x-ink)", "stroke-width": 6, pathLength: 100, "stroke-dasharray": "0 100", transform: `rotate(-90 ${cx} ${cy})` }, svg);
    const over = sv("circle", { cx, cy, r: 80, fill: "none", stroke: "var(--x-bad)", "stroke-width": 6, pathLength: 100, "stroke-dasharray": "0 100", transform: `rotate(-90 ${cx} ${cy})` }, svg);
    // the index dot turns with a group that spans the whole dial, so each move repaints the dial, not a dot-sized patch
    const dotG = sv("g", {}, svg);
    sv("circle", { cx, cy, r: 118, fill: "none", stroke: "transparent", "stroke-width": 1 }, dotG);
    const dot = sv("circle", { cx, cy: cy - 80, r: 4.5, fill: "var(--x-ink)", stroke: "var(--x-ground)", "stroke-width": 1.5 }, dotG);
    const big = sv("text", { x: cx, y: cy + 8, "text-anchor": "middle", "font-size": 40, "font-weight": "var(--x-head-weight)", fill: "var(--x-ink)", style: "font-family:var(--x-head-font);direction:ltr;unicode-bidi:isolate;letter-spacing:-0.03em;font-variant-numeric:tabular-nums" }, svg);
    const cap = sv("text", { x: cx, y: cy + 30, "text-anchor": "middle", "font-size": 11, fill: "var(--x-dim)", style: `font-family:var(--x-label-font);font-weight:var(--x-label-weight);${rtl ? "" : "letter-spacing:var(--x-label-track)"}` }, svg);
    const L = rtl ? { use: p.label || "الاستهلاك", full: "الحد الكامل", over: "تجاوز" } : { use: p.label || "USAGE", full: "AT LIMIT", over: "OVERAGE" };
    // the whole run fits its slot: 0.3 in, the fill, a hold at 100, the overshoot, all shortened together when the slot is short
    const top = p.overshoot ? Math.max(100, p.max) : 100, need = 0.3 + p.duration + (top > 100 ? 0.95 : 0), fitK = Math.min(1, Math.max(0.5, (end - at - 0.25) / need));
    const t0 = at + 0.3 * fitK, t100 = t0 + p.duration * fitK, t2 = t100 + 0.35 * fitK, t3 = t2 + 0.6 * fitK;
    ctx.sfx(t0, "tap", 0.25);
    ctx.sfx(t100, top > 100 ? "blip" : "success", 0.35); // reaching a limit is no win when it is about to be passed
    if (top > 100) ctx.sfx(t2 + 0.15, "hit", 0.45);
    return {
      draw(t) {
        ML.show(host, t, at, end - 0.22);
        const pop = ML.out(t, at, at + 0.3);
        svg.style.opacity = pop.toFixed(4);
        svg.style.scale = pop < 1 ? (0.9 + 0.1 * pop).toFixed(4) : "none";
        let v = 100 * ML.ease(t, t0, t100);
        if (top > 100 && t > t2) v = 100 + (top - 100) * ML.out(t, t2, t3);
        const warm = ML.lin(t, t100, t100 + 0.3);
        const main = Math.min(v, 100);
        arc.setAttribute("stroke-dasharray", `${main.toFixed(3)} 100`);
        arc.setAttribute("stroke", warm > 0 ? `color-mix(in srgb, ${WARN} ${(warm * 100).toFixed(1)}%, var(--x-ink))` : "var(--x-ink)");
        arc.style.opacity = main > 0.05 ? "1" : "0";
        const ov = Math.max(0, v - 100);
        over.setAttribute("stroke-dasharray", `${ov.toFixed(3)} 100`);
        over.style.opacity = ov > 0.05 ? "1" : "0";
        const nLit = Math.min(120, Math.floor((main / 100) * 120 + 1e-6) + 1), nRed = Math.min(120, Math.floor((ov / 100) * 120 + 1e-6) + 1);
        litTicks.setAttribute("d", warm > 0 ? ticksD(0, nLit) : "M0 0");
        litTicks.style.opacity = warm.toFixed(4);
        redTicks.setAttribute("d", ov > 0 ? ticksD(0, nRed) : "M0 0");
        dotG.setAttribute("transform", `rotate(${(v * 3.6).toFixed(3)} ${cx} ${cy})`);
        dot.setAttribute("fill", ov > 0 ? "var(--x-bad)" : warm > 0.5 ? WARN : "var(--x-ink)");
        dot.style.opacity = t >= t0 ? "1" : "0";
        big.textContent = `${Math.round(v)}%`;
        const isOver = ov > 0.5;
        cap.textContent = isOver ? L.over : v >= 99.5 ? L.full : L.use;
        cap.setAttribute("fill", isOver ? "var(--x-bad)" : "var(--x-dim)");
      },
    };
  },
});

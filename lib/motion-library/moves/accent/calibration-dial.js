// Rotating calibration dial: a layered instrument dial turns, each layer at its own rate and direction — an outer
// mono text ring on a circular textPath (slowest), degree / hour labels and a 120-tick ring (majors every 10) turning
// the other way, thin and dashed rings, a slow hex frame, and a frosted core with an emblem, a readout or the target
// itself at its centre; crosshair hairlines across it and four indicator dots at N / E / S / W. Enter: layers
// scale .92 → 1 and fade in 0.15 s apart, the ticks sweep in around the ring (~1.2 s), the text ring fades last.
// Every angle is 360 · (t − at) / period, so the dial is seekable. Needle sweep: a 1 px needle + dot turns from 0 to
// the target angle on an in-out curve with a small overshoot settle; ticks it passes brighten and a mono readout in
// the core counts with it. Arabic: the ring text is one string on the path (never per glyph), so letters stay joined.
// Sources: MengTo/Skills web-design/glass-dark-mode-clock (SKILL.md) + web-design/company-logos demo (MIT; the
// textPath ring r=80 in a 200 viewBox, the dashed counter-ring, the N/E/S/W dots), ported to a function of t.
ML.define({
  id: "accent.calibration-dial",
  category: "accent",
  name: "Rotating calibration dial",
  does: "A layered instrument dial - text ring, degree ticks, core - slowly turns, and can sweep its needle to settle on a reading.",
  says: ["time", "precision", "calm", "tech", "result", "brand"],
  energy: 2,
  targets: ["shape", "logo", "stage", "number"],
  duration: [1.5, 10],
  params: {
    complexity: { type: "choice", options: ["full", "minimal"], default: "full" },
    labels: { type: "choice", options: ["degrees", "brand-words", "time"], default: "degrees" },
    ring_period: { type: "number", range: [8, 60], default: 20, unit: "s" },
    needle_sweep: { type: "bool", default: false },
    target: { type: "number", range: [0, 360], default: 220, unit: "deg" },
    overshoot: { type: "number", range: [0, 12], default: 4, unit: "deg" },
    direction: { type: "choice", options: ["cw", "ccw"], default: "cw" },
    centre: { type: "choice", options: ["none", "icon", "logo", "number"], default: "none" },
  },
  pairs: ["accent.corner-markers", "accent.callout-leader", "data.readout-swap"],
  avoid: ["playful", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "MengTo/Skills:web-design/company-logos", license: "MIT", note: "with web-design/glass-dark-mode-clock's dial layers and needle sweep; seekable port" },
  setup(ctx) {
    const { el, p, at, end, rtl, stage, f } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const sv = (tag, attrs, parent, text) => { const e = doc.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v); if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const setA = (e, k, v) => { if (e.getAttribute(k) !== v) e.setAttribute(k, v); };
    const full = p.complexity !== "minimal";
    const dir = p.direction === "ccw" ? -1 : 1;
    const period = ML.clamp(+p.ring_period || 20, 4, 120);

    // where the dial sits: around a target (behind it, the target is its centre), or on its own over the picture region
    const onTarget = el && el !== stage;
    let cx, cy, D;
    if (onTarget) {
      const b = ctx.box(el);
      cx = b.x + b.w / 2; cy = b.y + b.h / 2;
      D = ML.clamp(Math.max(b.w, b.h) * 1.35, Math.min(f.W, f.H) * 0.3, Math.min(f.W, f.H) * 0.92);
    } else {
      cx = f.pic.x + f.pic.w / 2; cy = f.pic.y + f.pic.h / 2;
      D = Math.min(f.pic.w, f.pic.h, f.H * 0.8) * 0.9;
    }
    const svg = sv("svg", { viewBox: "0 0 200 200", width: D.toFixed(1), height: D.toFixed(1) });
    svg.style.cssText = `position:absolute;left:${(cx - D / 2).toFixed(1)}px;top:${(cy - D / 2).toFixed(1)}px;overflow:visible;pointer-events:none;z-index:${onTarget ? 0 : 22};visibility:hidden`;
    if (onTarget) (ctx.scene || stage).prepend(svg); else stage.append(svg);
    const ink = (a) => `color-mix(in srgb, var(--x-ink) ${a}%, transparent)`;
    const defs = sv("defs", {}, svg);
    const uid = "cd" + Math.round(ML.rnd(D, cx) * 1e6);
    const grad = sv("radialGradient", { id: uid + "g", cx: "50%", cy: "40%", r: "55%" }, defs);
    sv("stop", { offset: "0", style: "stop-color:var(--x-accent);stop-opacity:.14" }, grad);
    sv("stop", { offset: "1", style: "stop-color:var(--x-accent);stop-opacity:0" }, grad);
    const edge = sv("linearGradient", { id: uid + "e", x1: "0", y1: "0", x2: "1", y2: "1" }, defs);
    sv("stop", { offset: "0", style: "stop-color:var(--x-ink);stop-opacity:.45" }, edge);
    sv("stop", { offset: ".5", style: "stop-color:var(--x-ink);stop-opacity:.06" }, edge);
    sv("stop", { offset: "1", style: "stop-color:var(--x-ink);stop-opacity:.3" }, edge);
    sv("path", { id: uid + "p", d: "M 100,100 m -86,0 a 86,86 0 1,1 172,0 a 86,86 0 1,1 -172,0", fill: "none" }, defs);

    // layers, back to front; each { g, delay, rate (turns / s), scaleIn }
    const layers = [];
    const layer = (delay, rate, scaleIn = true) => { const g = sv("g", {}, svg); layers.push({ g, delay, rate, scaleIn }); return g; };

    // (0) glow + crosshair
    const base = layer(0, 0, false);
    sv("circle", { cx: 100, cy: 100, r: 96, style: `fill:url(#${uid}g)` }, base);
    sv("line", { x1: -6, y1: 100, x2: 206, y2: 100, style: `stroke:${ink(10)};stroke-width:.45` }, base);
    sv("line", { x1: 100, y1: -6, x2: 100, y2: 206, style: `stroke:${ink(10)};stroke-width:.45` }, base);
    // (1) thin outer shell
    const shell = layer(0.05, 0);
    sv("circle", { cx: 100, cy: 100, r: 95, style: `fill:none;stroke:url(#${uid}e);stroke-width:.6` }, shell);
    if (full) for (const a of [0, 90, 180, 270]) { const r = (a * Math.PI) / 180; sv("circle", { cx: 100 + Math.sin(r) * 69, cy: 100 - Math.cos(r) * 69, r: 1.1, style: `fill:${ink(45)}` }, shell); }

    // (2) the tick ring + its labels, turning against the text ring
    const tickG = layer(0.15, (-dir) / (period * 1.5));
    const ticks = [];
    for (let k = 0; k < 120; k++) {
      const a = k * 3, r = (a * Math.PI) / 180, major = k % 10 === 0, r1 = 64, r2 = major ? 57.5 : 61;
      const ln = sv("line", { x1: (100 + Math.sin(r) * r1).toFixed(2), y1: (100 - Math.cos(r) * r1).toFixed(2), x2: (100 + Math.sin(r) * r2).toFixed(2), y2: (100 - Math.cos(r) * r2).toFixed(2), style: `stroke:var(--x-ink);stroke-width:${major ? 0.7 : 0.45}` }, tickG);
      ticks.push({ ln, a, major, base: major ? 0.6 : 0.25 });
    }
    if (full) {
      const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      for (let i = 0; i < 12; i++) {
        const a = i * 30, r = (a * Math.PI) / 180, x = 100 + Math.sin(r) * 51, y = 100 - Math.cos(r) * 51;
        const txt = p.labels === "time" ? String(hours[i]).padStart(2, "0") : String(a).padStart(3, "0");
        sv("text", { x: x.toFixed(2), y: y.toFixed(2), "text-anchor": "middle", "dominant-baseline": "central", transform: `rotate(${a} ${x.toFixed(2)} ${y.toFixed(2)})`, style: `fill:${ink(55)};font:500 3.9px var(--x-mono-font);direction:ltr;unicode-bidi:isolate` }, tickG, txt);
      }
    }
    // (3) rings: thin static ones and a dashed counter-ring
    if (full) {
      const rings = layer(0.3, 0);
      sv("circle", { cx: 100, cy: 100, r: 45, style: `fill:none;stroke:${ink(14)};stroke-width:.4` }, rings);
      sv("circle", { cx: 100, cy: 100, r: 41.5, style: `fill:none;stroke:${ink(9)};stroke-width:.4` }, rings);
      const dashed = layer(0.38, (-dir) / (period * 1.5));
      sv("circle", { cx: 100, cy: 100, r: 76, style: `fill:none;stroke:${ink(22)};stroke-width:.45;stroke-dasharray:1.6 2.4` }, dashed);
      // (4) hex frame, one slow turn
      const hex = layer(0.45, dir / (period * 4));
      const pts = Array.from({ length: 6 }, (_, i) => { const r = (i * 60 * Math.PI) / 180; return `${(100 + Math.sin(r) * 37).toFixed(2)},${(100 - Math.cos(r) * 37).toFixed(2)}`; }).join(" ");
      sv("polygon", { points: pts, style: `fill:none;stroke:${ink(22)};stroke-width:.5` }, hex);
      for (let i = 0; i < 6; i++) { const r = (i * 60 * Math.PI) / 180; sv("circle", { cx: (100 + Math.sin(r) * 37).toFixed(2), cy: (100 - Math.cos(r) * 37).toFixed(2), r: 0.8, style: "fill:var(--x-accent)" }, hex); }
    }
    // (5) the core: a frosted disc with an edge (left open when the target sits at the centre)
    const core = layer(0.55, 0);
    let readout = null;
    if (!onTarget) {
      sv("circle", { cx: 100, cy: 100, r: 27, style: "fill:color-mix(in srgb, var(--x-panel) 88%, transparent)" }, core);
      sv("circle", { cx: 100, cy: 100, r: 27, style: `fill:none;stroke:url(#${uid}e);stroke-width:.6` }, core);
      sv("ellipse", { cx: 96, cy: 90, rx: 15, ry: 7, style: "fill:var(--x-panel);opacity:.35" }, core);
      const c = p.centre;
      if (c === "icon") {
        const em = sv("g", { transform: "rotate(45 100 100)" }, core);
        sv("rect", { x: 93, y: 93, width: 14, height: 14, rx: 2.5, style: "fill:none;stroke:var(--x-accent);stroke-width:1.1" }, em);
        sv("circle", { cx: 100, cy: 100, r: 2.4, style: "fill:var(--x-accent)" }, em);
      } else if (c === "logo") {
        sv("rect", { x: 91, y: 91, width: 18, height: 18, rx: 5, style: "fill:var(--x-accent)" }, core);
        sv("circle", { cx: 100, cy: 100, r: 4, style: "fill:var(--x-accent-ink)" }, core);
      }
      if (c === "number" || (p.needle_sweep && c === "none")) {
        readout = sv("text", { x: 100, y: 100.5, "text-anchor": "middle", "dominant-baseline": "central", style: "fill:var(--x-ink);font:600 9px var(--x-mono-font);direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums" }, core, "000°");
        sv("text", { x: 100, y: 110, "text-anchor": "middle", "dominant-baseline": "central", style: `fill:${ink(45)};font:500 3.2px var(--x-mono-font);letter-spacing:.2em` }, core, p.labels === "time" ? "TIME" : "DEG");
      }
    }

    // (6) the outer text ring, slowest; one string on the path so Arabic stays joined
    const ringG = layer(0.9, dir / period, false);
    const words = p.labels === "time" ? (rtl ? "ساعات • دقائق • ثوانٍ • " : "HOURS • MINUTES • SECONDS • ")
      : p.labels === "brand-words" ? (rtl ? "معايرة النظام • تدفّق السيولة • " : "SYSTEM CALIBRATION • LIQUIDITY FLOW • ")
        : (rtl ? "معايرة • ٠٠٠° • ٠٩٠° • ١٨٠° • ٢٧٠° • " : "CALIBRATION • 000° • 090° • 180° • 270° • ");
    // direction ltr on the text: an Arabic run still reads right to left inside it (bidi) and keeps its shaping, but
    // the run starts at the path's start instead of falling off its end
    const text = sv("text", { style: `fill:${ink(60)};font:600 6.2px var(--x-mono-font);direction:ltr;unicode-bidi:normal;${rtl ? "" : "letter-spacing:.3em;"}` }, ringG);
    const tp = sv("textPath", { href: `#${uid}p`, startOffset: "0" }, text, words);
    const circ = 2 * Math.PI * 86, one = tp.getComputedTextLength() || circ / 2;
    const n = Math.max(1, Math.floor(circ / one));
    tp.textContent = words.repeat(n);
    if (!rtl) tp.setAttribute("textLength", (circ * 0.995).toFixed(1));

    // the needle
    let needle = null, tip = null;
    if (p.needle_sweep) {
      needle = sv("g", {}, null);
      svg.insertBefore(needle, core); // under the core, so the readout stays clear
      sv("line", { x1: 100, y1: 100, x2: 100, y2: 37, style: "stroke:var(--x-accent);stroke-width:.8;stroke-linecap:round" }, needle);
      tip = sv("circle", { cx: 100, cy: 37, r: 2, style: "fill:var(--x-accent)" }, needle);
      sv("circle", { cx: 100, cy: 100, r: 2.4, style: "fill:var(--x-accent)" }, needle);
    }
    const tgt = ML.clamp(+p.target || 0, 0, 360), over = ML.clamp(+p.overshoot || 0, 0, 20);
    void tip;
    const n0 = at + 0.9, n1 = n0 + ML.clamp((end - at) * 0.35, 1.2, 1.8);
    const needleAt = (t) => {
      const e = ML.ease(t, n0, n1);
      const settle = Math.sin(Math.PI * ML.lin(t, n1 - (n1 - n0) * 0.3, n1 + 0.35)); // a small overshoot, then back
      return (tgt * e + over * Math.max(0, settle) * (tgt > 0 ? 1 : 0)) * dir;
    };
    const fmt = (deg) => {
      const a = ((Math.abs(deg) % 360) + 360) % 360;
      if (p.labels === "time") { const mins = Math.round((a / 360) * 720), h = Math.floor(mins / 60) || 12; return `${String(h).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`; }
      return `${String(Math.round(a)).padStart(3, "0")}°`;
    };

    ctx.sfx(at + 0.05, "blip", 0.2);
    if (p.needle_sweep) { ctx.sfx(n0, "whoosh.soft", 0.15); ctx.sfx(n1, "click.confirm", 0.25); }

    return {
      draw(t) {
        const leave = ML.ease(t, end - 0.35, end - 0.05);
        const vis = t >= at - 1e-6 && leave < 1;
        svg.style.visibility = vis ? "visible" : "hidden";
        if (!vis) return;
        svg.style.opacity = (1 - leave).toFixed(4);
        const run = t - at;
        for (const L of layers) {
          const e = ML.out(t, at + L.delay, at + L.delay + 0.5);
          const s = L.scaleIn ? 0.92 + 0.08 * e : 1;
          const rot = ((L.rate * run * 360) % 360 + 360) % 360;
          setA(L.g, "opacity", e.toFixed(3));
          setA(L.g, "transform", `rotate(${rot.toFixed(3)} 100 100) translate(100 100) scale(${s.toFixed(4)}) translate(-100 -100)`);
        }
        // ticks sweep in around the ring, then brighten where the needle has passed
        const sweep = ML.out(t, at + 0.2, at + 1.4) * 120;
        const nd = needle ? needleAt(t) : 0;
        const tickRot = ((-dir) / (period * 1.5)) * run * 360;
        for (let k = 0; k < 120; k++) {
          const T = ticks[k];
          let o = ML.clamp(sweep - k) * T.base;
          if (needle) {
            const world = (((T.a + tickRot) % 360) + 360) % 360, reach = Math.abs(nd);
            const ang = dir > 0 ? world : (360 - world) % 360;
            if (ang <= reach) o = Math.max(o, 0.85 * ML.clamp(sweep - k));
          }
          setA(T.ln, "opacity", o.toFixed(3));
        }
        if (needle) {
          setA(needle, "transform", `rotate(${nd.toFixed(3)} 100 100)`);
          setA(needle, "opacity", ML.lin(t, n0 - 0.25, n0).toFixed(3));
        }
        if (readout) { const v = needle ? fmt(nd) : fmt(((run / period) * 360) % 360); if (readout.textContent !== v) readout.textContent = v; }
      },
    };
  },
});

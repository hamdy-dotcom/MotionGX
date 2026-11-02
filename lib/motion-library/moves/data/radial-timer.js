// Radial timer: an SVG ring — a track (r 88, 12 wide in panel-2; or a tiny r 24 hairline at 30 % dim) and an arc in
// the accent (12 wide; tiny: 2 wide in the warning tone), round caps, dasharray 2πr, rotated −90° so it starts at 12
// o'clock. Drain: dashoffset 0 → full; fill: full → 0; linear across the scene (start + 0.4 → end − 0.2). A proxy
// from → 0 (or 0 → from) writes a big mono number (ceil, padded "00") over a caps units caption, or a three-decimal
// mono readout ("0.867 s") under a 3 px centre dot. The dial pops in at +0.3 s (scale 0.8 → 1); an optional label is
// typed above it. Optional dot on the arc head.
// Source: MotionGX studio engine S.hook (hookArt "timer", lib/studio-engine/assets/scenes.js) + prompt-motion
// nolkeeg-with-everyone-sharing-opus (reference, the tiny decimal timer).
ML.define({
  id: "data.radial-timer",
  category: "data",
  name: "Radial timer ring",
  does: "A ring arc drains (or sweeps) around a dial while the number inside or below counts down or up in seconds.",
  says: ["time", "urgency", "speed", "precision"],
  energy: 3,
  targets: ["number", "shape"],
  duration: [1.5, 10],
  params: {
    from: { type: "number", range: [1, 600], default: 60, unit: "s" },
    direction: { type: "choice", options: ["drain", "fill"], default: "drain" },
    size: { type: "choice", options: ["large", "tiny"], default: "large" },
    readout: { type: "choice", options: ["integer", "decimal"], default: "integer" },
    head_dot: { type: "bool", default: false },
    units_label: { type: "text", default: "SECONDS" },
    label: { type: "text", default: "" },
  },
  pairs: ["data.odometer", "data.timecode-hud"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "own:lib/studio-engine/assets/scenes.js#S.hook", license: "own", note: "ported from the studio engine's hook timer; the tiny decimal variant rebuilt from prompt-motion nolkeeg-with-everyone-sharing-opus (reference)" },
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
      ? mk("div", "position:absolute;inset:0;display:flex;flex-direction:column;gap:24px;align-items:center;justify-content:center;z-index:4;background:var(--x-ground)", null, el)
      : mk("div", "position:absolute;left:var(--pic-x);top:var(--pic-y);width:var(--pic-w);height:var(--pic-h);z-index:4;background:var(--x-ground);display:flex;flex-direction:column;align-items:center;justify-content:center", null, parent);
    const BW = asBox ? el.clientWidth : f.pic.w, BH = asBox ? el.clientHeight : f.pic.h;
    const tiny = p.size === "tiny", decimal = p.readout === "decimal";
    const WARN = "color-mix(in oklch, var(--x-bad) 55%, var(--x-good))";
    const labelText = String(p.label || "");
    const lab = labelText ? mk("div", `font:var(--x-label-weight) ${(30 * k).toFixed(1)}px var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:var(--x-label-case);color:var(--x-dim);margin-bottom:${(36 * k).toFixed(1)}px;min-height:1.2em;white-space:nowrap`, "", host) : null;
    const D = tiny ? Math.min(BW, BH) * 0.3 : Math.min(BW * 0.82, BH * (labelText ? 0.7 : 0.82), 620 * k * 1.4);
    const dial = mk("div", `position:relative;width:${D.toFixed(1)}px;height:${D.toFixed(1)}px;border-radius:50%;display:flex;align-items:center;justify-content:center;${tiny ? "" : "background:var(--x-panel);box-shadow:var(--x-shadow);border:var(--x-edge) solid var(--x-edge-color)"}`, null, host);
    const r = tiny ? 24 : 88, vb = tiny ? 60 : 200, c = vb / 2, C = 2 * Math.PI * r;
    const svg = sv("svg", { viewBox: `0 0 ${vb} ${vb}`, width: (D * (tiny ? 1 : 0.93)).toFixed(1), height: (D * (tiny ? 1 : 0.93)).toFixed(1), style: "position:absolute" }, dial);
    sv("circle", { cx: c, cy: c, r, fill: "none", stroke: tiny ? "color-mix(in srgb, var(--x-dim) 30%, transparent)" : "var(--x-panel-2)", "stroke-width": tiny ? 1 : 12 }, svg);
    const arc = sv("circle", { cx: c, cy: c, r, fill: "none", stroke: tiny ? WARN : "var(--x-accent)", "stroke-width": tiny ? 2 : 12, "stroke-linecap": "round", "stroke-dasharray": C.toFixed(3), "stroke-dashoffset": 0, transform: `rotate(-90 ${c} ${c})` }, svg);
    const headDot = p.head_dot ? sv("circle", { r: tiny ? 2.6 : 9, fill: "var(--x-ground)", stroke: tiny ? WARN : "var(--x-accent)", "stroke-width": tiny ? 1.2 : 4 }, svg) : null;
    // the readout: a big mono integer over its caption, or a tiny centre dot over a three-decimal readout
    const num = "direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums;white-space:nowrap";
    let big = null, small = null;
    if (!tiny && !decimal) {
      const inner = mk("div", "position:relative;text-align:center", null, dial);
      big = mk("div", `font:700 ${(D * 0.27).toFixed(1)}px/1 var(--x-mono-font);color:var(--x-ink);${num}`, "00", inner);
      mk("div", `font:var(--x-label-weight) ${(D * 0.045).toFixed(1)}px var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:var(--x-label-case);color:var(--x-dim);margin-top:${(D * 0.03).toFixed(1)}px`, p.units_label || "", inner);
    } else if (!tiny) {
      const inner = mk("div", "position:relative;text-align:center", null, dial);
      big = mk("div", `font:600 ${(D * 0.13).toFixed(1)}px/1 var(--x-mono-font);color:var(--x-ink);${num}`, "0.000 s", inner);
      mk("div", `font:var(--x-label-weight) ${(D * 0.045).toFixed(1)}px var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:var(--x-label-case);color:var(--x-dim);margin-top:${(D * 0.04).toFixed(1)}px`, p.units_label || "", inner);
    } else {
      mk("div", `width:${Math.max(3, 4 * k).toFixed(1)}px;height:${Math.max(3, 4 * k).toFixed(1)}px;border-radius:50%;background:var(--x-ink)`, null, dial);
      small = mk("div", `margin-top:${(26 * k).toFixed(1)}px;font:500 ${(28 * k).toFixed(1)}px var(--x-mono-font);color:var(--x-dim);${num}`, "", host);
      if (!decimal && p.units_label) mk("div", `margin-top:${(8 * k).toFixed(1)}px;font:var(--x-label-weight) ${(20 * k).toFixed(1)}px var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:var(--x-label-case);color:var(--x-dim)`, p.units_label, host);
    }
    const from = Math.max(1, p.from), tPop = at + 0.3, r0 = at + 0.4, r1 = Math.max(r0 + 0.5, end - 0.2), drain = p.direction === "drain";
    const valueAt = (t) => { const u = ML.lin(t, r0, r1); return drain ? from * (1 - u) : from * u; };
    ctx.sfx(tPop, "pop.soft", 0.35);
    if (!decimal) for (const s of [3, 2, 1]) { const tt = drain ? r0 + (1 - s / from) * (r1 - r0) : r0 + ((from - s) / from) * (r1 - r0); if (from > s && tt - r0 > 0.4 && (r1 - r0) / from > 0.22) ctx.sfx(tt, "tap", 0.22); }
    ctx.sfx(r1, "bell", 0.3);
    const ARW = labelText && ML.ARABIC.test(labelText);
    return {
      draw(t) {
        ML.show(host, t, at);
        const o = ML.lin(t, tPop, tPop + 0.12);
        dial.style.opacity = o.toFixed(4);
        dial.style.scale = t < tPop ? "0.8" : (0.8 + 0.2 * ML.back(t, tPop, tPop + 0.45, 1.6)).toFixed(4);
        const u = ML.lin(t, r0, r1), off = drain ? C * u : C * (1 - u);
        arc.setAttribute("stroke-dashoffset", off.toFixed(3));
        arc.style.opacity = (drain ? u < 0.999 : u > 0.001) ? "1" : "0";
        if (headDot) {
          const a = (drain ? 1 - u : u) * Math.PI * 2 - Math.PI / 2;
          headDot.setAttribute("cx", (c + Math.cos(a) * r).toFixed(3)); headDot.setAttribute("cy", (c + Math.sin(a) * r).toFixed(3));
          headDot.style.opacity = t >= r0 - 0.05 ? "1" : "0";
        }
        const v = valueAt(t);
        const txt = decimal ? `${v.toFixed(3)} s` : String(drain ? Math.ceil(v - 1e-9) : Math.floor(v + 1e-9)).padStart(2, "0");
        if (big) big.textContent = txt;
        if (small) small.textContent = txt;
        if (lab) {
          if (ARW) { const ws = labelText.split(/\s+/); lab.textContent = ws.slice(0, Math.round(ws.length * ML.lin(t, at, at + 0.5))).join(" "); }
          else lab.textContent = ML.typed(labelText, t, at, at + 0.5);
        }
      },
    };
  },
});

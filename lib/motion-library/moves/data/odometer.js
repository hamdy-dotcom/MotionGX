// Odometer counter: a huge number climbs with its digits rolling vertically in columns. The value v(t) eases from 0 to
// the target (expo.out by default) or, live, keeps growing linearly after it lands. Each digit column is a 0–9 strip
// moved by −(its digit, fractional) × the line height: the units column rolls continuously and blurs vertically with
// its speed (an SVG blur on the y axis only, from the derivative of v), each higher column ticks over in the last tenth
// of its lower column's turn. Thousands separators stay fixed; tabular numerals ~8% of the frame height; columns the
// number has not reached yet sit as ghost zeros at 20% (or stay folded away). A mono caps label under it with a
// pulsing live dot when live ("CLICKS · LIVE").
// Source: prompt-motion "steventey-claude-opus-5-5-feels" (reference only: rebuilt as our own code).
ML.define({
  id: "data.odometer",
  category: "data",
  name: "Odometer counter",
  does: "A huge number climbs with its digits rolling vertically in columns, the right digits blurring and the left ones ticking.",
  says: ["growth", "proof", "scale", "result"],
  energy: 4,
  targets: ["number"],
  duration: [1, 4],
  params: {
    target: { type: "number", range: [100, 100000000], default: 1000000 },
    from_target: { type: "bool", default: true },
    ease: { type: "choice", options: ["expo.out", "power2.out", "none"], default: "expo.out" },
    live: { type: "bool", default: false },
    live_rate: { type: "number", range: [0.005, 0.2], default: 0.03 },
    ghost_digits: { type: "bool", default: true },
    duration: { type: "number", range: [1, 3], default: 1.6, unit: "s" },
    label: { type: "text", default: "" },
  },
  pairs: ["data.metric-scatter", "data.multiplier-tag"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "riser",
  source: { from: "prompt-motion:steventey-claude-opus-5-5-feels", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    if (!el) return null;
    const mk = (tag, css, text, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const AR = "٠١٢٣٤٥٦٧٨٩";
    const own = String(el.textContent || "");
    const arabicDigits = /[٠-٩]/.test(own);
    const ownV = parseFloat(own.replace(/[٠-٩]/g, (d) => String(AR.indexOf(d))).replace(/[^\d.]/g, ""));
    const target = Math.round(p.from_target && ownV >= 1 ? ownV : p.target);
    const dur = p.duration;
    const E = p.ease === "none" ? (x) => x : p.ease === "power2.out" ? (x) => 1 - Math.pow(1 - x, 3) : (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
    const value = (t) => {
      const x = ML.lin(t, at, at + dur), v = target * E(x);
      return p.live && t > at + dur ? target + target * p.live_rate * (t - at - dur) : v;
    };
    const vmax = value(end);
    const nd = Math.max(String(Math.floor(vmax)).length, String(target).length);
    // size: ~8% of the frame height (never smaller than the slot's own type), fitted to the slot's width
    const elFs = parseFloat(getComputedStyle(el).fontSize) || 100;
    let fs = Math.max(f.H * 0.08, elFs);
    const room = el.clientWidth || f.W - 2 * f.m;
    const k = Math.min(f.W, f.H) / 360;
    el.textContent = "";
    const wrap = mk("div", `display:inline-grid;gap:${(4 * k).toFixed(1)}px;justify-items:${rtl ? "end" : "start"}`, null, el);
    const row = mk("div", `display:flex;direction:ltr;font:var(--x-head-weight) ${fs.toFixed(1)}px/1 var(--x-head-font);font-variant-numeric:tabular-nums lining-nums;letter-spacing:0;color:var(--x-ink)`, null, wrap);
    const svgNS = "http://www.w3.org/2000/svg";
    const defs = document.createElementNS(svgNS, "svg");
    defs.setAttribute("width", "0"); defs.setAttribute("height", "0"); defs.style.position = "absolute";
    wrap.append(defs);
    const uid = "mlodo" + document.querySelectorAll("[data-ml-odo]").length;
    wrap.dataset.mlOdo = uid;
    const glyph = (d) => (arabicDigits ? AR[d] : String(d));
    const cols = [];
    for (let i = nd - 1; i >= 0; i--) {
      const col = mk("span", "display:inline-block;height:1em;overflow:hidden;position:relative;text-align:center", null, row);
      const strip = mk("span", "display:block;will-change:transform", null, col);
      for (let d = 0; d <= 10; d++) mk("span", "display:block;height:1em;line-height:1", glyph(d % 10), strip);
      const flt = document.createElementNS(svgNS, "filter");
      flt.setAttribute("id", `${uid}-${i}`); flt.setAttribute("x", "-20%"); flt.setAttribute("y", "-50%"); flt.setAttribute("width", "140%"); flt.setAttribute("height", "200%");
      const gb = document.createElementNS(svgNS, "feGaussianBlur");
      gb.setAttribute("stdDeviation", "0 0");
      flt.append(gb); defs.append(flt);
      const c = { i, col, strip, gb, sep: null };
      cols.push(c);
      if (i > 0 && i % 3 === 0) c.sep = mk("span", "display:inline-block", arabicDigits ? "٬" : ",", row);
    }
    // fit: shrink the type until the widest state fits the slot
    const scaleK = (ctx.stage.getBoundingClientRect().width / ctx.stage.offsetWidth) || 1;
    const w0 = row.getBoundingClientRect().width / scaleK;
    if (w0 > room) { fs *= room / w0; row.style.fontSize = fs.toFixed(1) + "px"; }
    const colW = cols[0].col.getBoundingClientRect().width / scaleK;
    for (const c of cols) c.col.style.width = colW.toFixed(2) + "px";
    const labelText = p.label || (rtl ? (p.live ? "نقرات · مباشر" : "نقرات") : p.live ? "CLICKS · LIVE" : "CLICKS");
    const lab = mk("div", `display:flex;align-items:center;gap:${(3 * k).toFixed(1)}px;font:var(--x-label-weight) ${(7 * k).toFixed(1)}px var(--x-label-font);letter-spacing:var(--x-label-track);text-transform:var(--x-label-case);color:var(--x-dim)`, null, wrap);
    const dot = mk("i", `display:${p.live ? "block" : "none"};width:${(4 * k).toFixed(1)}px;height:${(4 * k).toFixed(1)}px;border-radius:50%;background:var(--x-bad)`, null, lab);
    mk("span", "", labelText, lab);
    const pos = (v, i) => {
      if (i === 0) return v % 10;
      const q = Math.pow(10, i), base = Math.floor(v / q) % 10, lower = (v % q) / q;
      return base + ML.clamp((lower - 0.9) * 10);
    };
    ctx.sfx(at, "riser", 0.35);
    ctx.sfx(at + dur * 0.55, "tap", 0.25);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        const enter = ML.out(t, at - 0.05, at + 0.25);
        el.style.opacity = (enter * (1 - leave)).toFixed(4);
        const v = value(t), dv = (value(t + 1 / 60) - value(t - 1 / 60)) * 30;
        for (const c of cols) {
          let y = pos(v, c.i);
          if (y > 9.999) y = 0;
          c.strip.style.transform = `translateY(${(-y).toFixed(4)}em)`;
          const speed = Math.abs(dv) / Math.pow(10, c.i); // digit turns a second
          const blur = c.i === 0 || speed > 12 ? Math.min(fs * 0.12, speed * fs * 0.0025) : 0;
          c.gb.setAttribute("stdDeviation", `0 ${blur.toFixed(2)}`);
          c.col.style.filter = blur > 0.3 ? `url(#${uid}-${c.i})` : "none";
          const reached = c.i === 0 || v >= Math.pow(10, c.i) - 1e-9;
          if (p.ghost_digits) {
            const o = reached ? 1 : 0.2;
            c.col.style.opacity = String(o);
            if (c.sep) c.sep.style.opacity = String(reached ? 1 : 0.2);
          } else {
            const pres = c.i === 0 ? 1 : ML.clamp((Math.log10(Math.max(v, 1)) - c.i) * 4 + 1);
            c.col.style.width = (colW * pres).toFixed(2) + "px";
            c.col.style.opacity = pres.toFixed(3);
            if (c.sep) { c.sep.style.opacity = pres.toFixed(3); c.sep.style.width = pres < 1 ? `${(pres * 0.3).toFixed(3)}em` : ""; c.sep.style.overflow = "hidden"; }
          }
        }
        dot.style.opacity = (0.35 + 0.65 * (0.5 + 0.5 * Math.cos((t - at) * Math.PI * 2 * 0.9))).toFixed(3);
        dot.style.scale = (0.85 + 0.15 * (0.5 + 0.5 * Math.cos((t - at) * Math.PI * 2 * 0.9))).toFixed(3);
      },
    };
  },
});

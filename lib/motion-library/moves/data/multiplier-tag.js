// Rolling multiplier tag: a sticker-like tag ("× 5,235 DECISIONS") slaps on and its number spins up to a round total.
// The tag: panel box, 2 px ink border, hard (unblurred) offset shadow, bold caps. Enter: tilted −3° (+3° in Arabic),
// scale 1.2 → 1 in 0.15 s with a hit. The number counts ~1 → target on expo.out over 1.2 s; every digit is an odometer
// column (a 0–9 strip), so while the value changes fast each column rolls with a vertical motion blur (from the
// derivative of the count); columns the number has not reached are folded away so the tag grows as it counts. It lands
// exactly on the round number and holds. The tag sits over its target (a number, or a label that becomes its unit); a
// target like $1.5M keeps its decimals and its marks, and a figure written without separators (a year) gets none.
// Source: prompt-motion "polydao-claude-opus-5-5-is" (reference only: rebuilt as our own code).
ML.define({
  id: "data.multiplier-tag",
  category: "data",
  name: "Rolling multiplier tag",
  does: "A sticker-like tag ('x 5,235 DECISIONS') slaps on and its number spins up fast to a round total.",
  says: ["scale", "money", "proof", "growth"],
  energy: 4,
  targets: ["number", "label"],
  duration: [1, 2.5],
  params: {
    target: { type: "number", range: [10, 1000000], default: 10000 },
    from_target: { type: "bool", default: true },
    prefix: { type: "choice", options: ["x", "+", "none"], default: "x" },
    unit: { type: "text", default: "DECISIONS" },
    duration: { type: "number", range: [0.8, 1.6], default: 1.2, unit: "s" },
    tilt: { type: "number", range: [0, 8], default: 3, unit: "deg" },
  },
  pairs: ["data.odometer", "data.metric-scatter"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "prompt-motion:polydao-claude-opus-5-5-is", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const mk = (tag, css, text, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const AR = "٠١٢٣٤٥٦٧٨٩";
    const own = el ? String(el.textContent || "").trim() : "";
    const m = own.replace(/[٠-٩]/g, (d) => String(AR.indexOf(d))).replace(/٬/g, ",").replace(/٫/g, ".").match(/^([^\d]{0,3}?)(\d[\d,]*(?:\.\d+)?)([^\d]{0,4})$/);
    const isNum = !!m, rawDec = m ? (m[2].split(".")[1] || "").length : 0;
    // the count runs on whole units of the written precision: 1.5 counts to 15 with its point fixed between two columns
    const ownN = m ? Math.round(parseFloat(m[2].replace(/,/g, "")) * Math.pow(10, rawDec)) : NaN, fromOwn = p.from_target && ownN >= 1;
    const dec = fromOwn ? rawDec : 0, target = Math.max(1, Math.round(fromOwn ? ownN : p.target));
    const seps = fromOwn ? m[2].includes(",") || ownN / Math.pow(10, dec) >= 10000 : true;
    const pre = fromOwn ? m[1].trim() : "", post = fromOwn ? m[3].trim() : "";
    let unit = p.unit;
    if (el && !isNum && own && unit === "DECISIONS") unit = own; // a label target becomes the tag's unit
    else if (rtl && unit === "DECISIONS") unit = "قرار";
    const arabicDigits = /[٠-٩]/.test(own);
    const scaleK = (ctx.stage.getBoundingClientRect().width / ctx.stage.offsetWidth) || 1;
    const host = ctx.scene || ctx.stage, hb = ctx.box(host);
    // where the tag lands: centred on the target's text (its glyphs, not its block), else the picture region's centre
    let cx = f.pic.x + f.pic.w / 2, cy = f.pic.y + f.pic.h / 2, elFs = Math.min(f.W, f.H) * 0.08;
    if (el) {
      const r = document.createRange(); r.selectNodeContents(el);
      const rb = r.getBoundingClientRect(), sb = ctx.stage.getBoundingClientRect();
      if (rb.width > 0) { cx = (rb.left - sb.left + rb.width / 2) / scaleK; cy = (rb.top - sb.top + rb.height / 2) / scaleK; }
      elFs = parseFloat(getComputedStyle(el).fontSize) || elFs;
    }
    let fs = ML.clamp(elFs * 0.55, Math.min(f.W, f.H) * 0.04, Math.min(f.W, f.H) * 0.085);
    const tag = mk("div", `position:absolute;left:0;top:0;z-index:7;display:inline-flex;align-items:center;gap:0.32em;padding:0.32em 0.55em;background:var(--x-panel);color:var(--x-ink);border:max(2px, 0.035em) solid var(--x-ink);border-radius:calc(var(--x-radius) * 0.12);box-shadow:0.16em 0.16em 0 var(--x-ink);font:var(--x-head-weight) ${fs.toFixed(1)}px/1 var(--x-head-font);text-transform:uppercase;letter-spacing:0.01em;white-space:nowrap;direction:${rtl ? "rtl" : "ltr"};transform-origin:50% 50%`, null, host);
    if (p.prefix !== "none") mk("span", "", p.prefix === "x" ? "×" : "+", tag);
    const row = mk("span", "display:inline-flex;direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums lining-nums", null, tag);
    if (unit) mk("span", rtl || ML.ARABIC.test(unit) ? "letter-spacing:0;text-transform:none" : "", unit, tag);
    // the number's own marks sit in its LTR row: Latin ones where they were written, Arabic ones on the reading side
    const preAr = ML.ARABIC.test(pre), postAr = ML.ARABIC.test(post);
    for (const x of [preAr ? "" : pre, postAr ? post : ""]) if (x) mk("span", ML.ARABIC.test(x) ? "margin-right:0.2em" : "", x, row);
    const svgNS = "http://www.w3.org/2000/svg";
    const defs = document.createElementNS(svgNS, "svg");
    defs.setAttribute("width", "0"); defs.setAttribute("height", "0"); defs.style.cssText = "position:absolute;width:0;height:0";
    tag.append(defs);
    const uid = "mltag" + document.querySelectorAll("[data-ml-tag]").length;
    tag.dataset.mlTag = uid;
    const nd = Math.max(String(target).length, dec + 1), cols = [];
    for (let i = nd - 1; i >= 0; i--) {
      const col = mk("span", "display:inline-block;height:1em;overflow:hidden;text-align:center", null, row);
      const strip = mk("span", "display:block", null, col);
      for (let d = 0; d <= 10; d++) mk("span", "display:block;height:1em;line-height:1", arabicDigits ? AR[d % 10] : String(d % 10), strip);
      const flt = document.createElementNS(svgNS, "filter");
      flt.setAttribute("id", `${uid}-${i}`); flt.setAttribute("x", "-20%"); flt.setAttribute("y", "-50%"); flt.setAttribute("width", "140%"); flt.setAttribute("height", "200%");
      const gb = document.createElementNS(svgNS, "feGaussianBlur"); gb.setAttribute("stdDeviation", "0 0");
      flt.append(gb); defs.append(flt);
      const c = { i, col, strip, gb, sep: null };
      cols.push(c);
      const mark = dec && i === dec ? (arabicDigits ? "٫" : ".") : seps && i > dec && (i - dec) % 3 === 0 ? (arabicDigits ? "٬" : ",") : "";
      if (mark) c.sep = mk("span", "display:inline-block;overflow:hidden", mark, row);
    }
    for (const x of [postAr ? "" : post, preAr ? pre : ""]) if (x) mk("span", ML.ARABIC.test(x) ? "margin-left:0.2em" : "", x, row);
    // fit the full tag on the frame, then centre it on the target (kept inside the margins)
    const maxW = f.W - 2 * f.m;
    let tw = tag.getBoundingClientRect().width / scaleK;
    if (tw > maxW) { fs *= maxW / tw; tag.style.fontSize = fs.toFixed(1) + "px"; tw = maxW; }
    const colW = cols[0].col.getBoundingClientRect().width / scaleK;
    for (const c of cols) { c.col.style.width = colW.toFixed(2) + "px"; if (c.sep) c.sepW = c.sep.getBoundingClientRect().width / scaleK; }
    const th = tag.getBoundingClientRect().height / scaleK;
    const left = ML.clamp(cx, f.m + tw / 2, f.W - f.m - tw / 2) - hb.x, top = ML.clamp(cy, f.m + th / 2, f.H - f.m - th / 2) - hb.y;
    tag.style.left = left.toFixed(1) + "px"; tag.style.top = top.toFixed(1) + "px";
    const dur = Math.min(p.duration, Math.max(0.4, end - at - 0.3)); // it lands exactly before it leaves, however short the span
    const value = (t) => { const x = ML.lin(t, at, at + dur); return x >= 1 ? target : 1 + (target - 1) * (1 - Math.pow(2, -10 * x)); };
    const pos = (v, i) => {
      if (i === 0) return v % 10;
      const q = Math.pow(10, i), base = Math.floor(v / q) % 10, lower = (v % q) / q;
      return base + ML.clamp((lower - 0.9) * 10);
    };
    const tilt = (rtl ? 1 : -1) * p.tilt;
    ctx.sfx(at, "hit", 0.5);
    ctx.sfx(at + dur, "tap", 0.3);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.2)) / 0.16);
        const on = t >= at - 1e-6;
        tag.style.visibility = on && leave < 1 ? "visible" : "hidden";
        if (el) el.style.opacity = on ? "0" : "1";
        const s = ML.out(t, at, at + 0.15);
        tag.style.transform = `translate(-50%, -50%) rotate(${tilt}deg) scale(${(1.2 - 0.2 * s - leave * 0.1).toFixed(4)})`;
        tag.style.opacity = (Math.min(1, ML.lin(t, at, at + 0.04)) * (1 - leave)).toFixed(4);
        const v = value(t), dv = (value(t + 1 / 60) - value(t - 1 / 60)) * 30;
        for (const c of cols) {
          let y = pos(v, c.i);
          if (y > 9.999) y = 0;
          c.strip.style.transform = `translateY(${(-y).toFixed(4)}em)`;
          const speed = Math.abs(dv) / Math.pow(10, c.i);
          const blur = speed > 4 ? Math.min(fs * 0.14, speed * fs * 0.003) : 0;
          c.gb.setAttribute("stdDeviation", `0 ${blur.toFixed(2)}`);
          c.col.style.filter = blur > 0.3 ? `url(#${uid}-${c.i})` : "none";
          const pres = c.i <= dec ? 1 : ML.clamp((Math.log10(Math.max(v, 1)) - c.i) * 4 + 1);
          c.col.style.width = (colW * pres).toFixed(2) + "px";
          c.col.style.opacity = pres.toFixed(3);
          if (c.sep) { c.sep.style.width = (c.sepW * pres).toFixed(2) + "px"; c.sep.style.opacity = pres.toFixed(3); }
        }
      },
    };
  },
});

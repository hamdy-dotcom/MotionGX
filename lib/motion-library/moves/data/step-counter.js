// Step counter: a big figure that jumps to its next value on each beat or story step (18 → 31 → 48 …, or 1, 2, 4,
// 8 …). The figure: serif, line-height .72, letter-spacing −.09em, zero-padded to two digits, tabular so its width
// holds, with a small accent unit hanging at its shoulder and a tiny uppercase dim label under it; at small sizes it
// becomes a bold tabular corner counter with an italic unit. The step index is floor(p × N) over the run, or
// floor((t − start) / (beat/2 | beat/4)) for eighths / sixteenths, or one per click; the change is an instant cut on the
// beat, a 0.6 s power2.out count from the previous value, or (doubling) snaps per beat then the last step rolls fast to
// the final in 0.4 s expo.out. The target's own number, when it has one, is the final value.
// Source: MengTo/Skills web-design scroll-world-storytelling demo html-data (values [18,31,48,63,81,94],
// index = floor(progress × N), padStart(2, "0"), .metric-value) (MIT); product-film reference/story.md (something
// happens on every beat).
ML.define({
  id: "data.step-counter",
  category: "data",
  name: "Value steps on the beat",
  does: "A big figure jumps to its next value on each beat or story step (18 -> 31 -> 48, or 1, 2, 4, 8 ...), then may roll quickly to its final number.",
  says: ["proof", "growth", "result", "scale", "energy"],
  energy: 3,
  targets: ["number"],
  duration: [1, 6],
  params: {
    change: { type: "choice", options: ["instant", "count", "snap-then-roll"], default: "instant" },
    sequence: { type: "choice", options: ["data", "doubling", "linear"], default: "data" },
    rate: { type: "choice", options: ["story-beat", "eighth", "sixteenth", "click"], default: "story-beat" },
    unit: { type: "choice", options: ["%", "x", "$", "none"], default: "%" },
    size: { type: "number", range: [18, 196], default: 120, unit: "px" },
    bpm: { type: "number", range: [70, 160], default: 110 },
    steps: { type: "number", range: [3, 12], default: 6 },
    label: { type: "text", default: "" },
  },
  pairs: ["data.bar-chart-grow", "rhythm.beat-cut"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/scroll-world-storytelling/demo/html-data/index.html", license: "MIT" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const mk = (tag, css, parent, text) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const scene = ctx.scene || ctx.stage, hb = ctx.box(scene);
    // the target's own number is the final value, always: its decimals, its digits and its symbol are kept
    const text = el ? (el.textContent || "").trim() : "", arDigits = /[٠-٩]/.test(text);
    const hit = text.replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/٫/g, ".").replace(/[,٬]/g, "").match(/\d+(?:\.\d+)?/);
    const own = hit ? parseFloat(hit[0]) : NaN, dec = hit ? (hit[0].split(".")[1] || "").length : 0;
    const rd = (x) => +x.toFixed(dec);
    // its own symbol wins over the param; a figure past 100 is no percentage, so it drops the sign rather than the figure
    const unitKey = /[%٪]/.test(text) ? "%" : /\$/.test(text) ? "$" : /\d\s*[x×]/i.test(text) ? "x" : p.unit === "%" && own > 100 ? "none" : p.unit;
    const N = Math.round(ML.clamp(p.steps, 3, 12));
    // the values
    let vals;
    if (p.sequence === "doubling") { vals = Array.from({ length: N }, (_, i) => Math.pow(2, i)); if (Number.isFinite(own)) vals = [...vals.filter((v) => v < own), own]; else if (p.change === "snap-then-roll") vals.push(12480); }
    else if (p.sequence === "linear") { const to = Number.isFinite(own) ? own : 100; vals = Array.from({ length: N }, (_, i) => rd((to * (i + 1)) / N)); }
    else { const base = [18, 31, 48, 63, 81, 94]; vals = Array.from({ length: N }, (_, i) => base[Math.min(base.length - 1, Math.round((i * (base.length - 1)) / Math.max(1, N - 1)))]); if (Number.isFinite(own) && own > 0) { const k = own / vals[vals.length - 1]; vals = vals.map((v, i) => (i === vals.length - 1 ? own : rd(v * k))); } }
    const M = vals.length;
    // the step times
    const span = Math.max(0.6, end - at - 0.35);
    let times;
    if (p.rate === "eighth" || p.rate === "sixteenth") { const beat = 60 / p.bpm, d = Math.min(p.rate === "eighth" ? beat / 2 : beat / 4, span / M); times = vals.map((_, i) => at + i * d); }
    else if (p.rate === "click") times = vals.map((_, i) => at + i * Math.min(0.5, span / M));
    else {
      const spoken = (ctx.words || []).map((w) => w.t).filter((x) => x >= at && x < end - 0.3);
      times = spoken.length >= M ? vals.map((_, i) => spoken[Math.floor((i * spoken.length) / M)]) : vals.map((_, i) => at + (i * span) / M);
    }
    times[0] = Math.min(times[0], at);
    // the figure
    let host = el;
    if (!host) { host = mk("div", `position:absolute;left:${(f.pic.x - hb.x).toFixed(1)}px;top:${(f.pic.y - hb.y).toFixed(1)}px;width:${f.pic.w}px;height:${f.pic.h}px;display:grid;place-items:center;z-index:12`, scene); }
    const room = Math.max(200, host.clientWidth || f.pic.w);
    const u = Math.min(f.W, f.H) / 1080, slotH = el ? ctx.box(el).h : 0; // measured before it empties
    host.textContent = "";
    const small = p.size < 40;
    // the figure lives in its slot: it never grows the target and pushes the layout around it
    const fs = Math.min(p.size * (Math.min(f.W, f.H) / 600), slotH ? slotH / (small ? 1.8 : 1.2) : Infinity);
    if (slotH) host.style.height = `${slotH.toFixed(1)}px`;
    const wrap = mk("div", `display:inline-grid;vertical-align:top;justify-items:start;gap:${small ? fs * 0.2 : fs * 0.16}px;direction:${rtl ? "rtl" : "ltr"};max-width:100%;will-change:transform`, host);
    const fig = mk("div", `display:flex;align-items:flex-start;direction:ltr;white-space:nowrap;color:var(--x-ink)`, wrap);
    const pre = unitKey === "$", ux = unitKey === "none" ? "" : unitKey === "x" ? "×" : unitKey;
    const num = mk("span", small ? `font:700 ${fs.toFixed(1)}px/1 var(--x-body-font);font-variant-numeric:tabular-nums lining-nums` : `font:400 ${fs.toFixed(1)}px/0.72 var(--x-serif-font);letter-spacing:-0.09em;font-variant-numeric:tabular-nums lining-nums;padding-top:${(fs * 0.06).toFixed(1)}px`, null);
    const unit = mk("span", small ? `font:italic 400 ${(fs * 0.5).toFixed(1)}px/1 var(--x-serif-font);color:var(--x-dim);margin:0 ${(fs * 0.25).toFixed(1)}px;align-self:flex-end` : `font:var(--x-head-weight) ${(fs * 0.18).toFixed(1)}px/1 var(--x-head-font);letter-spacing:0;color:var(--x-accent);margin:${(fs * 0.04).toFixed(1)}px ${(fs * 0.06).toFixed(1)}px 0`, null, ux);
    if (pre) fig.append(unit, num); else fig.append(num, unit);
    if (!ux) unit.style.display = "none";
    const labelText = p.label || (rtl ? "مؤشّر الوضوح" : "Clarity index");
    const latin = !ML.ARABIC.test(labelText);
    mk("div", `font:var(--x-label-weight) ${Math.max(20 * u, fs * (small ? 0.5 : 0.1)).toFixed(1)}px/1.2 var(--x-label-font);letter-spacing:${latin ? "var(--x-label-track)" : "0"};text-transform:${latin ? "var(--x-label-case)" : "none"};color:var(--x-dim);${small && latin ? "font-style:italic" : ""}`, wrap, labelText);
    const fmt = (v) => {
      const r = Math.round(v), s = dec ? v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) : r < 10 ? String(r).padStart(2, "0") : r.toLocaleString("en-US");
      return arDigits ? s.replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]).replace(/,/g, "٬").replace(/\./g, "٫") : s;
    };
    // fit: the widest value fits the host
    num.textContent = fmt(Math.max(...vals));
    if (!small && num.textContent.length > 3) num.style.letterSpacing = "-0.05em"; // -0.09em is for two digits: a comma would collide
    const sc = ctx.stage.getBoundingClientRect().width / (ctx.stage.offsetWidth || 1) || 1;
    const w0 = fig.getBoundingClientRect().width / sc;
    if (w0 > room * 0.96) { const kk = (room * 0.96) / w0; num.style.fontSize = (fs * kk).toFixed(1) + "px"; unit.style.fontSize = (parseFloat(unit.style.fontSize) * kk).toFixed(1) + "px"; }
    num.style.minWidth = (num.getBoundingClientRect().width / sc).toFixed(1) + "px";
    num.style.textAlign = "right";
    let last = -1; times.forEach((s) => { if (s - last >= 0.2) { ctx.sfx(s, "tap", 0.25); last = s; } });
    const p2 = (x) => 1 - Math.pow(1 - x, 3), ex = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        wrap.style.opacity = (ML.lin(t, at - 0.01, at + 0.08) * (1 - leave)).toFixed(4);
        let i = 0; while (i < M - 1 && t >= times[i + 1]) i++;
        let v = vals[i];
        if (i > 0) {
          const prev = vals[i - 1], s = times[i];
          if (p.change === "count") v = prev + (vals[i] - prev) * p2(ML.lin(t, s, s + Math.min(0.6, Math.max(0.15, (times[i] - times[i - 1]) * 0.9))));
          if (p.change === "snap-then-roll" && i === M - 1) v = prev + (vals[i] - prev) * ex(ML.lin(t, s, s + 0.4));
        }
        num.textContent = fmt(v);
        // a beat lands with a small kick of the figure
        const kick = ML.pulse(t, times[i], 0.02, 0.12) * (p.change === "instant" ? 1 : 0.4);
        fig.style.translate = `0 ${(-kick * fs * 0.03).toFixed(2)}px`;
      },
    };
  },
});

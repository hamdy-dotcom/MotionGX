// Live telemetry counters ticking: a small HUD block in a corner — a 2-column grid of dim caps labels and mono values
// that tick every frame (30 per second) with jittery increments from seeded noise, counters padded with leading zeros
// ("0000542") — plus, in the opposite corner, a "● LIVE / subject" tag with a tiny subtitle. Fades in over 0.3 s.
// When the move is put on a number, that number becomes a live readout too (it ticks up from its own value, keeping
// its separators); on a label, the label's words become the tag's subject. Every value is a closed form of the frame
// index, so any frame renders alone.
// Source: prompt-motion "apoorvjain25-i-gave-claude-opus" (reference only: rebuilt as our own code).
ML.define({
  id: "ui.live-telemetry-hud",
  category: "ui",
  name: "Live telemetry counters ticking",
  does: "A small HUD block in the corner shows several labeled readouts that tick every frame (years, depth, temperature, bounces).",
  says: ["tech", "proof", "time"],
  energy: 2,
  targets: ["number", "label", "stage"],
  duration: [2, 10],
  params: {
    fields: { type: "number", range: [2, 6], default: 4 },
    corner: { type: "choice", options: ["tl", "tr", "bl", "br"], default: "tl" },
    tag: { type: "bool", default: true },
    rate: { type: "number", range: [0.3, 3], default: 1 },
    tick_target: { type: "bool", default: true },
  },
  pairs: ["ui.live-pill-dot", "background.grain"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:apoorvjain25-i-gave-claude-opus", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const W = f.W, H = f.H, u = Math.min(W, H) / 1080; // the source's 8 / 10 px HUD at 1080 → ~18 / 22 px
    const lab = 17 * u, val = 22 * u;
    const L = rtl
      ? [["السنين", 7, 542, 3.1], ["العمق كم", 1, 1274.6, 0.37], ["الحرارة ك", 0, 7000000, 911], ["الارتدادات", 7, 18, 0.21], ["السرعة كم/ث", 2, 29.78, 0.004], ["الإشارة", 1, 96.4, 0.0]]
      : [["YEARS", 7, 542, 3.1], ["DEPTH KM", 1, 1274.6, 0.37], ["TEMP K", 0, 7000000, 911], ["BOUNCES", 7, 18, 0.21], ["VEL KM/S", 2, 29.78, 0.004], ["SIGNAL %", 1, 96.4, 0.0]];
    const n = Math.round(ML.clamp(p.fields, 2, 6));
    // where it sits: the corner band outside the safe area, so it never covers the headline
    const top = p.corner[0] === "t", left = (p.corner[1] === "l") !== rtl; // mirrored in RTL
    const hudH = n / 2 * (lab + val) * 1.5;
    const yTop = Math.max(f.m * 0.35, f.safe.y - hudH - f.m * 0.25), yBot = f.safe.y + f.safe.h + f.m * 0.25;
    const pos = (l) => `${l ? "left" : "right"}:${f.m}px;${top ? `top:${yTop}px` : `top:${yBot}px`}`;
    const hud = mk("div", `position:absolute;${pos(left)};z-index:6;display:grid;grid-template-columns:auto auto;column-gap:${(28 * u).toFixed(1)}px;row-gap:${(10 * u).toFixed(1)}px;opacity:0;pointer-events:none`, host);
    const cells = [];
    for (let i = 0; i < n; i++) {
      const [name, pad, base, inc] = L[i];
      const c = mk("div", "display:flex;flex-direction:column;gap:0.2em", hud);
      mk("span", `font:var(--x-label-weight) ${lab.toFixed(1)}px var(--x-label-font), var(--x-arabic);letter-spacing:${rtl ? "0" : "var(--x-label-track)"};text-transform:var(--x-label-case);color:var(--x-dim)`, c, name);
      const v = mk("span", `font:600 ${val.toFixed(1)}px var(--x-mono-font), var(--x-arabic);color:var(--x-ink);font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate;text-align:start`, c, "");
      cells.push({ v, pad, base, inc, i });
    }
    // the tag in the other corner
    let tag = null;
    if (p.tag) {
      tag = mk("div", `position:absolute;${pos(!left)};z-index:6;display:flex;flex-direction:column;align-items:${left ? "flex-end" : "flex-start"};gap:${(6 * u).toFixed(1)}px;opacity:0;pointer-events:none`, host);
      const row = mk("div", `display:flex;align-items:center;gap:0.5em;font:700 ${val.toFixed(1)}px var(--x-label-font), var(--x-arabic);letter-spacing:${rtl ? "0" : "var(--x-label-track)"};text-transform:uppercase;color:var(--x-ink)`, tag);
      tag.dot = mk("i", "width:0.5em;height:0.5em;border-radius:50%;background:var(--x-bad);display:inline-block", row);
      const subj = el && el.dataset.slot === "label" ? el.textContent.trim() : rtl ? "الشمس" : "SOL";
      mk("span", null, row, (rtl ? "مباشر / " : "LIVE / ") + subj);
      mk("span", `font:var(--x-label-weight) ${lab.toFixed(1)}px var(--x-label-font), var(--x-arabic);letter-spacing:${rtl ? "0" : "var(--x-label-track)"};text-transform:var(--x-label-case);color:var(--x-dim)`, tag, rtl ? "المنطقة الإشعاعية" : "RADIATIVE ZONE");
    }
    // the target number as a live readout
    let num = null;
    if (el && p.tick_target && el.dataset.slot === "number") {
      const txt = el.textContent.trim(), digits = txt.replace(/[^0-9.]/g, "");
      const base = parseFloat(digits);
      if (Number.isFinite(base)) {
        num = { base, grouped: /,/.test(txt), dec: (digits.split(".")[1] || "").length, inc: Math.max(1, base * 0.0005) };
        el.style.fontVariantNumeric = "tabular-nums";
      }
    }
    const fmt = (x, pad, dec) => { const s = x.toFixed(dec); return pad ? s.padStart(pad, "0") : s; };
    // a jittery but monotonic value after `k` frames: k steady steps plus a seeded wobble smaller than one step
    const valAt = (base, inc, k, seed) => base + inc * k + (inc ? (ML.rnd(k, seed) - 0.5) * inc * 0.9 : (ML.rnd(Math.floor(k / 4), seed) - 0.5) * 0.6);
    ctx.sfx(at, "blip", 0.2);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        const o = ML.ease(t, at, at + 0.3) * (1 - leave);
        hud.style.opacity = o.toFixed(4);
        const k = Math.max(0, Math.floor((t - at) * 30 * p.rate));
        for (const c of cells) {
          const dec = c.pad === 7 ? 0 : c.pad === 0 ? 0 : c.pad;
          c.v.textContent = fmt(valAt(c.base, c.inc, k, 11 + c.i), c.pad === 7 ? 7 : 0, dec);
        }
        if (tag) {
          tag.style.opacity = o.toFixed(4);
          tag.dot.style.opacity = t < at ? "0" : ((t - at) % 1) < 0.6 ? "1" : "0.3";
        }
        if (num) {
          const x = t < at ? num.base : valAt(num.base, num.inc, k, 3);
          el.textContent = num.grouped ? x.toLocaleString("en-US", { minimumFractionDigits: num.dec, maximumFractionDigits: num.dec }) : x.toFixed(num.dec);
        }
      },
    };
  },
});

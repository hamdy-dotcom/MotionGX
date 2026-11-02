// LIVE pill with pulsing dot: a small pill — a dot in the look's "good" colour with a ring pulsing out of it (scale
// 1 -> 2.4, opacity 0.6 -> 0, every 1 s) and a bold caps "LIVE" — fades in next to a caption in 0.3 s and keeps
// pulsing for as long as it is on. The pulse is a pure function of t (its phase is (t - at) mod period).
// Source: prompt-motion "aistocksavvy-wow-made-this-motion" (reference only: rebuilt as our own code).
ML.define({
  id: "ui.live-pill-dot",
  category: "ui",
  name: "LIVE pill with pulsing dot",
  does: "A small coloured dot + 'LIVE' label pulses next to a caption.",
  says: ["time", "proof", "urgency"],
  energy: 2,
  targets: ["label"],
  duration: [1, 10],
  params: {
    colour: { type: "text", default: "var(--x-good)" },
    text: { type: "text", default: "" },
    period: { type: "number", range: [0.7, 1.6], default: 1, unit: "s" },
    pill: { type: "bool", default: true },
  },
  pairs: ["ui.live-telemetry-hud", "data.count-up"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:aistocksavvy-wow-made-this-motion", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const col = p.colour || "var(--x-good)";
    const fsz = parseFloat(getComputedStyle(el).fontSize) || 22;
    const pill = mk("span", `display:inline-flex;align-items:center;gap:0.55em;vertical-align:middle;margin-inline-end:0.8em;padding:${p.pill ? "0.3em 0.75em" : "0"};border-radius:var(--x-radius-s);${p.pill ? `background:color-mix(in srgb, ${col} 14%, var(--x-panel));border:var(--x-edge) solid color-mix(in srgb, ${col} 35%, transparent);` : ""}font:800 ${(fsz * 0.85).toFixed(1)}px var(--x-label-font), var(--x-arabic);letter-spacing:${rtl ? "0" : "var(--x-label-track)"};text-transform:uppercase;color:var(--x-ink);opacity:0`);
    const dotWrap = mk("span", `position:relative;display:inline-block;width:0.62em;height:0.62em;flex:none`, pill);
    const ringE = mk("i", `position:absolute;inset:0;border-radius:50%;background:${col}`, dotWrap);
    mk("i", `position:absolute;inset:0;border-radius:50%;background:${col}`, dotWrap);
    mk("span", null, pill, p.text || (rtl ? "مباشر" : "LIVE"));
    el.prepend(pill);
    ctx.sfx(at, "blip", 0.25);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        const o = ML.ease(t, at, at + 0.3) * (1 - leave);
        pill.style.opacity = o.toFixed(4);
        const ph = t < at ? 0 : ((t - at) % p.period) / p.period;
        const e = 1 - Math.pow(1 - ph, 2);
        ringE.style.scale = (1 + 1.4 * e).toFixed(4);
        ringE.style.opacity = (t < at ? 0 : 0.6 * (1 - e)).toFixed(4);
      },
    };
  },
});

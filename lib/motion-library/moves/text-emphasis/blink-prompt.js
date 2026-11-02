// Blink prompt: a short prompt line ("PRESS START") blinks on and off like an arcade attract screen — opacity toggles
// 1 / 0 every `rate` seconds in hard steps (no easing), set in the look's mono face in the accent, tracked caps in
// Latin (Arabic stays untracked). It is its own new line under the title (place below), or the target itself blinks
// when the target already is that prompt (a label). An optional tiny meta line in the look's dim sits under it.
// Source: prompt-motion ibrahimwasim240-opus-5-5-max-effort (reference) — our own code.
ML.define({
  id: "text-emphasis.blink-prompt",
  category: "text-emphasis",
  name: "Blinking prompt line",
  does: "A short prompt line ('PRESS START') blinks on and off below the title like an arcade attract screen.",
  says: ["playful", "step"],
  energy: 2,
  targets: ["label", "line"],
  duration: [1, 6],
  params: {
    text: { type: "text", default: "PRESS START" },
    rate: { type: "number", range: [0.25, 1], default: 0.5, unit: "s" },
    meta: { type: "bool", default: false },
    place: { type: "choice", options: ["auto", "self", "below"], default: "auto" },
    "meta-text": { type: "text", default: "" },
    colour: { type: "choice", options: ["accent", "accent-2", "ink", "good"], default: "accent" },
  },
  pairs: ["text-in.punchline", "text-emphasis.char-select-sweep"],
  avoid: ["luxury", "calm", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:ibrahimwasim240-opus-5-5-max-effort", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const self = p.place === "self" || (p.place === "auto" && (el.classList.contains("ml-label") || el.dataset.slot === "label"));
    const colour = `var(--x-${p.colour || "accent"})`;
    const arabic = rtl || ML.ARABIC.test(el.textContent || "");
    let line = el, meta = null;
    const fsT = parseFloat(getComputedStyle(el).fontSize) || 56;
    if (!self) {
      // a new prompt line under the target, its size relative to the target's type
      let txt = String(p.text ?? "").trim() || "PRESS START";
      if (arabic && !ML.ARABIC.test(txt) && txt.toUpperCase() === "PRESS START") txt = "اضغط للبدء";
      line = document.createElement("div");
      line.textContent = txt;
      const size = Math.max(18, fsT * (fsT > 80 ? 0.26 : 0.5));
      Object.assign(line.style, { font: `var(--x-label-weight) ${size.toFixed(1)}px var(--x-mono-font)`, letterSpacing: ML.ARABIC.test(txt) ? "0" : "0.16em", textTransform: ML.ARABIC.test(txt) ? "none" : "uppercase", marginTop: (fsT * 0.3).toFixed(1) + "px", textAlign: "center", lineHeight: "1.2" });
      el.after(line);
    } else if (String(p.text ?? "").trim() && p.place === "self") line.textContent = String(p.text).trim();
    line.style.color = colour;
    if (p.meta) {
      meta = document.createElement("div");
      let mt = String(p["meta-text"] || "").trim() || (arabic ? "لاعب ١ · رصيد ٠٠" : "1P · CREDIT 00");
      meta.textContent = mt;
      const lfs = parseFloat(getComputedStyle(line).fontSize) || 22;
      Object.assign(meta.style, { font: `var(--x-label-weight) ${Math.max(12, lfs * 0.55).toFixed(1)}px var(--x-mono-font)`, color: "var(--x-dim)", letterSpacing: ML.ARABIC.test(mt) ? "0" : "0.12em", marginTop: (lfs * 0.5).toFixed(1) + "px", textAlign: getComputedStyle(line).textAlign, opacity: "0" });
      line.after(meta);
    }
    const rate = ML.clamp(p.rate, 0.1, 2);
    // a blip on the first few "on" steps (about one per beat, not every blink)
    for (let k = 0, s = at; s < end && k < 3; k++, s += rate * 4) ctx.sfx(s, "blip", 0.16);
    return {
      draw(t) {
        const live = t >= at && t < end - 0.04;
        const on = live && Math.floor((t - at) / rate + 1e-6) % 2 === 0;
        // a target that is the prompt itself stays shown outside the blink; a new line exists only inside it
        line.style.opacity = on || (self && !live) ? "1" : "0";
        if (meta) meta.style.opacity = live ? "1" : "0";
      },
    };
  },
});

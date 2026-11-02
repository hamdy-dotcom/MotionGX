// Unfold between rules: two hairline rules (1 px, half-strength ink) start together at the word's centre line and move
// apart to ±spread while the word, squashed to scaleY 0.02 so it reads as one more line, unfolds to full height on
// expo out (0.5 s). Optionally a dot (the last scene's point) shrinks into the centre first. The horizontal axis
// unfolds scaleX between two vertical rules that part sideways. The whole word moves as one, so any script works.
// Source: prompt-motion:sahildesigner23-ok-opus-5-5-max (reference only — our own code).
ML.define({
  id: "text-in.unfold-between-rules",
  category: "text-in",
  name: "Unfold between rules",
  does: "A word starts squashed flat into a line and unfolds vertically as two hairline rules move apart above and below it.",
  says: ["arrival", "reveal", "precision"],
  energy: 3,
  targets: ["word", "headline"],
  duration: [0.5, 1.5],
  params: {
    axis: { type: "choice", options: ["vertical", "horizontal"], default: "vertical" },
    rules: { type: "bool", default: true },
    spread: { type: "number", range: [30, 120], default: 60, unit: "px" },
    duration: { type: "number", range: [0.3, 0.8], default: 0.5, unit: "s" },
    dot: { type: "bool", default: false },
  },
  pairs: ["text-in.tracking-collapse", "accent.hairline-draw"],
  avoid: ["playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:sahildesigner23-ok-opus-5-5-max", license: "reference", note: "our own code after the technique" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    // the word's own content in one block, so the unfold never moves the slot or the rules
    const inner = document.createElement("span");
    inner.style.cssText = "display:inline-block;max-width:100%";
    while (el.firstChild) inner.append(el.firstChild);
    el.append(inner);
    const eb = ctx.box(el), ib = ctx.box(inner), fs = parseFloat(getComputedStyle(el).fontSize) || 60;
    const cx = ib.x - eb.x - el.clientLeft + ib.w / 2, cy = ib.y - eb.y - el.clientTop + ib.h / 2;
    const vert = p.axis !== "horizontal";
    inner.style.transformOrigin = "50% 50%";
    // the rules never cut the type: at least clear of its half-size, scaled with the type
    const k = fs / 104;
    const reach = vert ? Math.max(p.spread * k, ib.h * 0.5 + fs * 0.1) : Math.max(p.spread * k, ib.w * 0.5 + fs * 0.25);
    const rules = [];
    if (p.rules) for (const s of [-1, 1]) {
      const r = document.createElement("span");
      r.style.cssText = vert
        ? `position:absolute;left:${(cx - ib.w * 0.6).toFixed(1)}px;top:${cy.toFixed(1)}px;width:${(ib.w * 1.2).toFixed(1)}px;height:1px;background:color-mix(in srgb, var(--x-ink) 50%, transparent);pointer-events:none`
        : `position:absolute;left:${cx.toFixed(1)}px;top:${(cy - ib.h * 0.65).toFixed(1)}px;width:1px;height:${(ib.h * 1.3).toFixed(1)}px;background:color-mix(in srgb, var(--x-ink) 50%, transparent);pointer-events:none`;
      el.append(r); rules.push({ r, s });
    }
    let dot = null;
    if (p.dot) {
      dot = document.createElement("span");
      const d = Math.max(10, fs * 0.16);
      dot.style.cssText = `position:absolute;left:${(cx - d / 2).toFixed(1)}px;top:${(cy - d / 2).toFixed(1)}px;width:${d.toFixed(1)}px;height:${d.toFixed(1)}px;border-radius:50%;background:var(--x-accent);pointer-events:none`;
      el.append(dot);
    }
    const t0 = at + (dot ? 0.2 : 0), t1 = t0 + p.duration;
    ctx.sfx(t0, "whoosh.soft", 0.35);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        el.style.opacity = (t < at ? 0 : 1 - leave).toFixed(4);
        if (dot) { const u = ML.ease(t, at, t0); dot.style.scale = (1 - u).toFixed(4); dot.style.opacity = t < t0 ? "1" : "0"; }
        const e = ML.expo(t, t0, t1), s = 0.02 + 0.98 * e;
        inner.style.opacity = t >= t0 ? "1" : "0";
        inner.style.scale = s >= 0.9999 ? "none" : vert ? `1 ${s.toFixed(4)}` : `${s.toFixed(4)} 1`;
        for (const { r, s: side } of rules) {
          r.style.opacity = t >= t0 ? "1" : "0";
          const d = side * reach * e;
          r.style.translate = vert ? `0 ${d.toFixed(2)}px` : `${d.toFixed(2)}px 0`;
        }
      },
    };
  },
});

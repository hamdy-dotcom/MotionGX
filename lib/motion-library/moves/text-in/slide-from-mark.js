// Slide out from the mark: a mark (the target's own img / svg / [data-mark], a built accent tile or dot, or an operator
// "=", "≠", "→") pops in at the centre of the lockup (scale 0.6 → 1, back.out, 0.4 s), then travels to its lockup
// place (power3.inOut-like cubic in-out) while the text is clipped at the mark's trailing edge: either the text slides
// out from behind it (slide) or stays still while the clip edge travels with the mark and uncovers it (mask).
// The operator variant reads "= Word"; strike crosses the word out near the end (the "≠ recast" beat). Mirrored for RTL.
// Source: prompt-motion:robj3d3-opus-5-5-max-effort + ratheejaisal-bro-i-just-one (reference only — our own rebuild).
ML.define({
  id: "text-in.slide-from-mark",
  category: "text-in",
  name: "Slide out from the mark",
  does: "A mark or icon steps aside and text slides or is uncovered out from behind it — a wordmark completing the lockup, or '= Word' recasting what the mark means.",
  says: ["brand", "arrival", "reveal", "change"],
  energy: 3,
  targets: ["word", "logo", "headline"],
  duration: [0.8, 2],
  params: {
    reveal: { type: "choice", options: ["slide", "mask"], default: "slide" },
    mark: { type: "choice", options: ["auto", "tile", "dot"], default: "auto" },
    operator: { type: "choice", options: ["none", "=", "≠", "→"], default: "none" },
    direction: { type: "choice", options: ["ltr", "rtl"], default: "ltr" },
    icon_pop: { type: "bool", default: true },
    duration: { type: "number", range: [0.35, 0.7], default: 0.5, unit: "s" },
    glow: { type: "bool", default: false },
    strike: { type: "bool", default: false },
  },
  pairs: ["text-emphasis.accent-word", "camera.push-in"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:robj3d3-opus-5-5-max-effort", license: "reference", note: "also ratheejaisal-bro-i-just-one; our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    // reading direction: Arabic always runs right to left; otherwise the param decides
    const dir = rtl || p.direction === "rtl" ? -1 : 1;
    const own = p.mark === "auto" && p.operator === "none" ? el.querySelector("img, svg, [data-mark]") : null;
    const text = document.createElement("span");
    if (own) own.remove();
    text.innerHTML = el.innerHTML;
    text.setAttribute("dir", rtl ? "rtl" : "ltr");
    Object.assign(text.style, { display: "inline-block", whiteSpace: "nowrap", position: "relative" });
    const clip = document.createElement("span");
    Object.assign(clip.style, { display: "inline-block", position: "relative" });
    clip.append(text);
    let mark = own;
    if (!mark) {
      mark = document.createElement("span");
      if (p.operator !== "none") {
        mark.textContent = p.operator;
        Object.assign(mark.style, { color: "var(--x-accent)", fontWeight: "inherit", lineHeight: "1" });
      } else {
        const dot = p.mark === "dot";
        Object.assign(mark.style, {
          width: dot ? "0.62em" : "0.86em", height: dot ? "0.62em" : "0.86em", background: "var(--x-accent)",
          borderRadius: dot ? "50%" : "min(var(--x-radius), 0.24em)", boxShadow: "var(--x-shadow)",
        });
      }
    }
    Object.assign(mark.style, { display: "inline-block", flex: "none", position: "relative", zIndex: "1" });
    if (own) Object.assign(mark.style, { height: "1em", width: "auto" });
    const row = document.createElement("span");
    Object.assign(row.style, { display: "inline-flex", alignItems: "center", gap: "0.32em", direction: "ltr", flexDirection: dir < 0 ? "row-reverse" : "row", maxWidth: "100%" });
    row.append(mark, clip);
    el.innerHTML = ""; el.append(row);
    let strike = null;
    if (p.strike) {
      strike = document.createElement("span");
      Object.assign(strike.style, { position: "absolute", left: "-4%", right: "-4%", top: "52%", height: "0.08em", background: "var(--x-bad)", borderRadius: "var(--x-radius-s)", transformOrigin: dir > 0 ? "0 50%" : "100% 50%", transform: "scaleX(0)" });
      clip.append(strike);
    }
    const tw = clip.getBoundingClientRect().width;
    const k = el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1;
    const TW = tw / k, gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    // the mark starts at the centre of the lockup: shifted toward the text by half of (text + gap)
    const S = (TW + gap) / 2;
    const popEnd = p.icon_pop ? at + 0.4 : at, go = popEnd + 0.05, done = go + p.duration;
    const strikeAt = Math.max(done + 0.3, end - 0.9);
    ctx.sfx(at, "pop.soft", 0.3);
    ctx.sfx(go, "whoosh.soft", 0.4);
    if (strike) ctx.sfx(strikeAt, "snap", 0.35);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        el.style.opacity = t < at ? "0" : String(1 - leave);
        const pop = p.icon_pop ? ML.clamp(ML.back(t, at, at + 0.4, 1.7), 0, 1.08) : 1;
        const sc = 0.6 + 0.4 * pop;
        const u = ML.ease(t, go, done);
        const shift = S * (1 - u); // px toward the text side
        mark.style.translate = `${(dir * shift).toFixed(2)}px 0`;
        mark.style.scale = Math.abs(sc - 1) < 1e-4 ? "none" : Math.min(1, sc).toFixed(4);
        mark.style.opacity = p.icon_pop ? ML.clamp((t - at) / 0.12).toFixed(4) : "1";
        mark.style.filter = p.glow ? `drop-shadow(0 0 ${(0.25 + 0.15 * ML.pulse(t, done, 0.1, 0.6)).toFixed(3)}em color-mix(in srgb, var(--x-accent) 55%, transparent))` : "none";
        // the clip edge rides the mark's trailing edge (in the text's own box: shift − gap from its leading side)
        const edge = Math.max(0, Math.min(TW, shift - gap));
        const c = (edge / TW) * 100;
        clip.style.clipPath = u >= 1 ? "none" : dir > 0 ? `inset(-30% -10% -30% ${c.toFixed(3)}%)` : `inset(-30% ${c.toFixed(3)}% -30% -10%)`;
        text.style.translate = p.reveal === "slide" ? `${(-dir * TW * (1 - u)).toFixed(2)}px 0` : "none";
        clip.style.visibility = t < go ? "hidden" : "visible";
        if (strike) strike.style.transform = `scaleX(${ML.out(t, strikeAt, strikeAt + 0.25).toFixed(4)})`;
      },
    };
  },
});

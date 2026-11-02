// Label swap: a small persistent label (tracked caps at the bottom of the frame, or a vertical title in a top corner)
// cross-fades to the next chapter's text in place. The old text (param `from`, the previous chapter) fades 1 → 0 over
// `out` (optionally blurring to 6 px); then the new one — the slot's own text — fades 0 → 1 while its tracking settles
// 0.5em → 0.35em over `in` (ease-out), or its characters stagger in (top to bottom when vertical). Both texts share
// one grid cell, so the label never jumps. It holds for the chapter and leaves with it. Arabic: no tracking animation,
// no letter stagger (words stay whole), and a vertical label sets horizontally (Arabic is not set top to bottom).
// Source: prompt-motion (nft-chen three.js prompt, chrisjdimarco) — reference only; our own code.
ML.define({
  id: "text-in.label-swap",
  category: "text-in",
  name: "Label swap",
  does: "A small persistent label (tracked caps or a vertical title) cross-fades to the next chapter's text in place.",
  says: ["calm", "story", "step", "luxury"],
  energy: 1,
  targets: ["label"],
  duration: [0.8, 3],
  params: {
    tracking_anim: { type: "bool", default: true },
    orientation: { type: "choice", options: ["horizontal", "vertical"], default: "horizontal" },
    position: { type: "choice", options: ["bottom", "top-right", "top-left", "in-place"], default: "bottom" },
    stagger: { type: "number", range: [0, 0.1], default: 0, unit: "s" },
    out: { type: "number", range: [0.2, 0.4], default: 0.3, unit: "s" },
    in: { type: "number", range: [0.3, 0.7], default: 0.5, unit: "s" },
    from: { type: "text", default: "" },
    blur: { type: "bool", default: true },
  },
  pairs: ["text-in.kicker-rule", "transition.crossfade"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:nft-chen-opus-5-5-three-js-prompt", license: "reference", note: "also chrisjdimarco-another-opus-5-5-test — rebuilt as our own code" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const text = el.textContent.trim();
    const arabic = ML.ARABIC.test(text) || ML.ARABIC.test(p.from);
    const vertical = p.orientation === "vertical" && !arabic;
    const fs = parseFloat(getComputedStyle(el).fontSize) || 22;
    // a persistent label lives on the frame, not in the layout: move it to the scene at its place
    if (p.position !== "in-place") {
      const host = ctx.scene || ctx.stage;
      host.append(el);
      Object.assign(el.style, { position: "absolute", margin: "0", zIndex: "5" });
      // bottom 10% of the frame, or higher where a phone's own buttons cover it (the safe area)
      if (p.position === "bottom") Object.assign(el.style, { left: "var(--m)", right: "var(--m)", bottom: "max(calc(var(--H) * 0.1), calc(var(--H) - var(--safe-y) - var(--safe-h)))", textAlign: "center" });
      else if (p.position === "top-right") Object.assign(el.style, { right: "var(--m)", top: "var(--safe-y)", textAlign: "right" });
      else Object.assign(el.style, { left: "var(--m)", top: "var(--safe-y)", textAlign: "left" });
    }
    el.textContent = "";
    Object.assign(el.style, { display: "grid", justifyItems: p.position === "bottom" ? "center" : p.position === "top-right" ? "end" : p.position === "top-left" ? "start" : "stretch" });
    const track = arabic ? "0" : "0.35em";
    const mk = (s) => {
      const x = document.createElement("span"); x.textContent = s;
      Object.assign(x.style, { gridArea: "1 / 1", whiteSpace: "nowrap", letterSpacing: track });
      if (vertical) Object.assign(x.style, { writingMode: "vertical-rl", font: `400 ${(fs * 2).toFixed(1)}px/1.1 var(--x-serif-font)`, color: "var(--x-accent)", letterSpacing: "0.12em", textShadow: "0 0 0.4em color-mix(in srgb, var(--x-accent) 45%, transparent)", textTransform: "none" });
      else Object.assign(x.style, { font: `var(--x-label-weight) ${fs.toFixed(1)}px/1.3 ${arabic ? "var(--x-arabic)" : "var(--x-label-font)"}`, textTransform: arabic ? "none" : "var(--x-label-case)", color: "color-mix(in srgb, var(--x-ink) 80%, transparent)", marginInlineEnd: arabic ? "0" : "-0.35em" }); // the tracking's trailing gap doesn't count, so the label sits true on its edge or centre
      el.append(x);
      return x;
    };
    const oldEl = p.from ? mk(p.from) : null, newEl = mk(text);
    const stag = p.stagger > 0 ? p.stagger : vertical ? 0.08 : 0;
    const parts = stag > 0 ? ML.split(newEl, "chars") : null;
    const tOut = at, tIn = oldEl ? at + p.out : at;
    const settle = p.tracking_anim && !arabic && !vertical && !parts;
    ctx.sfx(tIn, "tap", 0.15);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.22);
        if (oldEl) {
          const o = 1 - ML.ease(t, tOut, tOut + p.out);
          oldEl.style.opacity = o.toFixed(4);
          oldEl.style.filter = p.blur && o < 1 ? `blur(${((1 - o) * 6).toFixed(2)}px)` : "none";
        }
        if (parts) {
          newEl.style.opacity = (1 - leave).toFixed(4);
          parts.forEach((c, i) => { const u = ML.out(t, tIn + i * stag, tIn + i * stag + p.in * 0.6); c.style.opacity = u.toFixed(4); c.style.translate = vertical ? `0 ${((1 - u) * -fs * 0.3).toFixed(2)}px` : "none"; });
        } else {
          const u = ML.out(t, tIn, tIn + p.in);
          newEl.style.opacity = (u * (1 - leave)).toFixed(4);
          if (settle) { const ls = (0.5 - 0.15 * u).toFixed(4); newEl.style.letterSpacing = `${ls}em`; newEl.style.marginInlineEnd = `-${ls}em`; }
        }
        newEl.style.filter = leave > 0 && p.blur ? `blur(${(leave * 6).toFixed(2)}px)` : "none";
      },
    };
  },
});

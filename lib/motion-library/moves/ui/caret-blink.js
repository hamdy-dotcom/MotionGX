// Blinking caret: a text caret at the end of a line blinks hard on / off while it waits for input. Ported from MotionGX's
// studio scenes (blink(): opacity → 0 over 0.42 s, ease steps(1), yoyo, repeat ⌊d / 0.42⌋ — a square wave locked to the
// timeline) on a paused GSAP timeline seeked to t. The caret: inline-block, the width param (4 px at a 48 px line, scaled
// with the type) × 1em, the brand colour, vertical-align −0.12em, margin-inline-start so it follows the text in RTL too.
// Source: MotionGX lib/studio-engine/assets/scenes.js (blink + .caret).
ML.define({
  id: "ui.caret-blink",
  category: "ui",
  name: "Blinking caret",
  does: "A text caret blinks on and off waiting for input.",
  says: ["time", "simplicity"],
  energy: 1,
  targets: ["line", "label"],
  duration: [0.5, 4],
  params: {
    period: { type: "number", range: [0.35, 0.5], default: 0.42, unit: "s" },
    width: { type: "number", range: [2, 6], default: 4, unit: "px" },
    colour: { type: "choice", options: ["accent", "ink"], default: "accent" },
  },
  pairs: ["text-in.typewriter", "ui.cursor-glide-click"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "own:lib/studio-engine/assets/scenes.js", license: "own", note: "blink() and .caret" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    let el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    if (!el) {
      // no line to sit on: an empty input line of our own in the picture region
      const host = ctx.scene || ctx.stage;
      const box = doc.createElement("div");
      box.className = "ml-panel";
      box.style.cssText = `position:absolute;left:${f.pic.x + f.pic.w * 0.1}px;top:${f.pic.y + f.pic.h / 2}px;translate:0 -50%;width:${f.pic.w * 0.8}px;box-sizing:border-box;padding:28px 36px;font:var(--x-body-weight) 48px var(--x-body-font);color:var(--x-dim);z-index:6;`;
      box.textContent = rtl ? "اكتب هنا" : "Type here";
      host.append(box);
      el = box;
    }
    const ownBox = el !== ctx.el ? el : null; // our own field: the caret stands before its placeholder and the field lives only with the move
    const caret = doc.createElement("span");
    caret.className = "ml-caret";
    caret.setAttribute("aria-hidden", "true");
    caret.style.cssText = `display:inline-block;width:${(p.width / 48).toFixed(4)}em;min-width:${Math.max(1, p.width * 0.5)}px;height:1em;vertical-align:-0.12em;margin-inline-${ownBox ? "end" : "start"}:${(4 / 48).toFixed(4)}em;background:var(--x-${p.colour === "ink" ? "ink" : "accent"});border-radius:1px;`;
    if (ownBox) el.prepend(caret); else el.append(caret);
    const d = Math.max(p.period, end - at);
    const seek = ctx.gsapAt((tl) => {
      tl.fromTo(caret, { opacity: 1 }, { opacity: 0, duration: p.period, ease: "steps(1)", repeat: Math.max(1, Math.floor(d / p.period)), yoyo: true, immediateRender: false }, 0);
    });
    return {
      draw(t) {
        const on = t >= at && t <= end;
        if (ownBox) ownBox.style.visibility = on ? "visible" : "hidden";
        if (!on) { caret.style.visibility = "hidden"; return; }
        caret.style.visibility = "visible";
        seek(t, at);
      },
    };
  },
});

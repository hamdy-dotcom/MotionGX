// Success chip: a small panel-coloured pill with a "good" check icon (and a short word) pops in at the confirmation
// time — scale 0.82 → 1, opacity 0 → 1 over 0.55 s back.out(1.6) — placed over the top-start corner of the visual,
// with the success sound (vol 0.5). Pinned variant (live engine): a round ✓ badge pinned inside the target at its
// corner, sized from the target (24–90 px scaled to the frame) so it moves with whatever moves the target; it pops
// scale 0 → 1 in 0.45 s back.out(3). Lands on its spoken word when the chip's text is said.
// Source: MotionGX lib/studio-engine/assets/scenes.js (S.phone / S.screen / S.editroom: chip + icon("check") + pop +
// interface bong) and lib/live-engine/worker/vendor/recipes.js R.replay (the pinned ✓ badge) — own.
ML.define({
  id: "ui.success-chip",
  category: "ui",
  name: "Success chip",
  does: "A small pill with a green check pops in to confirm the change.",
  says: ["result", "relief", "proof"],
  energy: 2,
  targets: ["label", "card", "screen", "image"],
  duration: [0.4, 1.2],
  params: {
    placement: { type: "choice", options: ["corner-of-visual", "pinned-to-ui"], default: "corner-of-visual" },
    icon: { type: "choice", options: ["check", "custom"], default: "check" },
    glyph: { type: "text", default: "✦" },
    text: { type: "text" },
  },
  pairs: ["ui.cursor-glide-click", "ui.live-edit-apply", "ui.typed-form-submit-check"],
  avoid: ["problem"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "success",
  source: { from: "own:lib/studio-engine/assets/scenes.js", license: "own", note: "S.phone / S.screen / S.editroom ok chip + pop(back.out(1.6)) + bong; live-engine recipes.js R.replay pinned ✓ badge" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const icon = (size, colour, parent) => {
      if (p.icon === "custom") return mk("span", `display:inline-grid;place-items:center;width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;font:700 ${(size * 0.8).toFixed(1)}px/1 var(--x-body-font);color:${colour};`, parent, p.glyph || "✦");
      const s = doc.createElementNS(NS, "svg");
      s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("width", size.toFixed(1)); s.setAttribute("height", size.toFixed(1)); s.style.flex = "none";
      const c = doc.createElementNS(NS, "path");
      c.setAttribute("d", "M5 12.5 L10 17 L19 7"); c.setAttribute("fill", "none"); c.setAttribute("stroke", colour); c.setAttribute("stroke-width", "3"); c.setAttribute("stroke-linecap", "round"); c.setAttribute("stroke-linejoin", "round");
      s.append(c); parent.append(s); return s;
    };
    const tgt = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const word = p.text || (rtl ? "تم" : "Done");
    // land on the chip's word when it is spoken, else a beat after the start
    const T = Math.min(Math.max(at + 0.25, ctx.word(word.split(/\s+/)[0], at + 0.25)), Math.max(at, end - 0.45));
    ctx.sfx(T, "success", 0.5);

    let el, pinned = p.placement === "pinned-to-ui";
    if (pinned) {
      // a round badge inside the target's corner (so it rides any camera that moves the target)
      const host = tgt || ctx.scene || ctx.stage;
      const b = tgt ? ctx.box(tgt) : f.pic;
      const size = ML.clamp(Math.min(b.w, b.h) * 0.22, 24 * k * 1.6, 90 * k);
      // on a target too small to hold it (a label) the badge sits just past the corner, off the text
      const small = Math.min(b.w, b.h) < size * 2, side = -size * (small ? 1.1 : 0.35), lift = -size * (small ? 0.5 : 0.35);
      if (tgt && getComputedStyle(tgt).position === "static") tgt.style.position = "relative";
      const pos = tgt ? `top:${lift.toFixed(1)}px;${rtl ? "left" : "right"}:${side.toFixed(1)}px;` : `top:${(b.y + 20 * k).toFixed(1)}px;left:${(rtl ? b.x + 20 * k : b.x + b.w - size - 20 * k).toFixed(1)}px;`;
      el = mk("div", `position:absolute;${pos}width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;border-radius:50%;background:var(--x-good);display:grid;place-items:center;box-shadow:0 0 0 ${(4 * k).toFixed(1)}px var(--x-panel), var(--x-shadow);z-index:7;pointer-events:none;`, host);
      icon(size * 0.62, "var(--x-accent-ink)", el);
    } else {
      // a pill over the top-start corner of the visual (the target's panel, else the picture region)
      const vis = tgt ? tgt.closest(".ml-panel") || tgt : null;
      const b = vis ? ctx.box(vis) : f.pic;
      const host = ctx.scene || ctx.stage;
      const ih = 36 * k * 1.25;
      el = mk("div", `position:absolute;top:${(b.y - ih * 0.55).toFixed(1)}px;${rtl ? "right" : "left"}:${(rtl ? f.W - (b.x + b.w) + 28 * k : b.x + 28 * k).toFixed(1)}px;display:flex;align-items:center;gap:${(12 * k).toFixed(1)}px;padding:${(14 * k).toFixed(1)}px ${(30 * k).toFixed(1)}px ${(14 * k).toFixed(1)}px ${(22 * k).toFixed(1)}px;border-radius:var(--x-radius-s);background:var(--x-panel);color:var(--x-ink);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);font:600 ${(34 * k).toFixed(1)}px/1.1 var(--x-body-font);white-space:nowrap;z-index:7;pointer-events:none;transform-origin:${rtl ? "100%" : "0"} 50%;`, host);
      el.dir = rtl ? "rtl" : "ltr";
      if (rtl) el.style.padding = `${(14 * k).toFixed(1)}px ${(22 * k).toFixed(1)}px ${(14 * k).toFixed(1)}px ${(30 * k).toFixed(1)}px`;
      icon(30 * k * 1.25, "var(--x-good)", el);
      mk("span", "", el, word);
    }
    // the pop always finishes before the move's exit, however short its span
    const dur = Math.min(pinned ? 0.45 : 0.55, Math.max(0.2, end - T - 0.2)), c = pinned ? 3 : 1.6, from = pinned ? 0 : 0.82;
    const backOut = (x) => { const y = x - 1; return 1 + (c + 1) * y * y * y + c * y * y; };

    return {
      draw(t) {
        if (t < T) { el.style.opacity = "0"; el.style.transform = `scale(${from})`; return; }
        const u = ML.lin(t, T, T + dur), s = from + (1 - from) * backOut(u);
        const leave = ML.lin(t, end - 0.2, end);
        el.style.opacity = (Math.min(1, u * 3) * (1 - leave)).toFixed(4);
        el.style.transform = `scale(${Math.max(0, s).toFixed(4)})`;
      },
    };
  },
});

// Figure plate marks: a picture labelled like a technical figure. A plate frame 8 px (stage-scaled) outside the picture —
// a 1 px gradient edge, strongest at the bottom-left (the look's ink at 20 %) fading to nothing — a mono caption
// ("FIG. 01") set just above the frame's top-right corner (top-left in Arabic), and 1–3 short hairlines (48 px, ink at
// 20 %) overhanging the frame by 24 px: at the top-left 40 px down, at the bottom-right 40 px up, and a third on the
// top-right. Entrance: the frame fades in, the hairlines draw outward (scaleX 0 → 1, 0.5 s) and the caption types in
// behind a block cursor. Sizes are the source's web sizes scaled to the stage; colours and faces from the look.
// Source: MengTo/Skills web-design/book-serif-index (demo/index.html: the figure plate, MIT).
ML.define({
  id: "accent.figure-plate-marks",
  category: "accent",
  name: "Figure plate marks",
  does: "A picture is labelled like a technical figure: a small FIG code at its corner and short hairlines poking out of its sides.",
  says: ["precision", "proof", "tech"],
  energy: 1,
  targets: ["image", "screen"],
  duration: [1, 10],
  params: {
    label: { type: "text", default: "FIG. 01" },
    hairlines: { type: "number", range: [1, 3], default: 2 },
  },
  pairs: [],
  avoid: ["playful", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "MengTo/Skills:web-design/book-serif-index", license: "MIT", note: "the figure plate of demo/index.html" },
  setup(ctx) {
    const { p, at, end, f, stage, el, rtl } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, k = (Math.min(W, H) / 1080) * 1.8; // the source's web px → a 1080 stage
    const b = el && el !== stage ? ctx.box(el) : { x: f.pic.x + f.pic.w * 0.1, y: f.pic.y + f.pic.h * 0.1, w: f.pic.w * 0.8, h: f.pic.h * 0.8 };
    const pad = 8 * k * 0.6, over = 24 * k, len = 48 * k, inset = 40 * k * 0.7;
    const fx = b.x - pad, fy = b.y - pad, fw = b.w + pad * 2, fh = b.h + pad * 2;
    const layer = document.createElement("div");
    layer.setAttribute("aria-hidden", "true");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:6;visibility:hidden";
    host.append(layer);
    const mk = (css, text) => { const e = document.createElement("div"); e.style.cssText = css; if (text != null) e.textContent = text; layer.append(e); return e; };
    // the frame: a 1 px gradient edge, strongest at the bottom-left (bottom-right in Arabic: the plate mirrors)
    const frame = mk(`position:absolute;left:${fx.toFixed(1)}px;top:${fy.toFixed(1)}px;width:${fw.toFixed(1)}px;height:${fh.toFixed(1)}px;box-sizing:border-box;` +
      `border:${Math.max(1, Math.round(k * 0.6))}px solid transparent;border-image:linear-gradient(${rtl ? "to top left" : "to top right"}, color-mix(in srgb, var(--x-ink) 32%, transparent), color-mix(in srgb, var(--x-ink) 10%, transparent) 55%, transparent 85%) 1`);
    // hairlines: [y, side (−1 left / 1 right), from the top?]
    const lw = Math.max(1, Math.round(k * 0.6));
    const spots = [[fy + inset, -1], [fy + fh - inset, 1], [fy + inset * 1.8, 1]].slice(0, Math.round(ML.clamp(p.hairlines, 1, 3)));
    const hairs = spots.map(([y, side0]) => {
      const side = rtl ? -side0 : side0;
      // it runs from inside the frame (len − over) out past the edge by `over`, drawn outward from its inner end
      const x = side < 0 ? fx - over : fx + fw + over - len;
      const e = mk(`position:absolute;left:${x.toFixed(1)}px;top:${(y - lw / 2).toFixed(1)}px;width:${len.toFixed(1)}px;height:${lw}px;` +
        `background:color-mix(in srgb, var(--x-ink) 30%, transparent);transform-origin:${side < 0 ? "100%" : "0%"} 50%;transform:scaleX(0)`);
      return e;
    });
    // the caption: mono, above the frame's top-right corner (top-left in Arabic)
    let label = String(p.label ?? "FIG. 01");
    if (rtl && label === "FIG. 01") label = "شكل ٠١";
    const ar = ML.ARABIC.test(label);
    const capSize = Math.max(16, 10 * k * 1.15);
    const cap = mk(`position:absolute;top:${(fy - capSize * 1.25 - 6 * k * 0.6).toFixed(1)}px;${rtl ? `left:${fx.toFixed(1)}px` : `right:${(W - fx - fw).toFixed(1)}px`};` +
      `font:var(--x-label-weight) ${capSize.toFixed(1)}px/1.2 var(--x-mono-font);letter-spacing:${ar ? 0 : "0.12em"};color:var(--x-dim);white-space:pre;direction:${ar ? "rtl" : "ltr"}`);
    const txt = document.createElement("span"), caret = document.createElement("span");
    caret.style.cssText = `display:inline-block;width:0.6em;height:1em;vertical-align:-0.12em;background:var(--x-dim);margin-inline-start:0.12em`;
    cap.append(txt, caret);

    const tHair = at + 0.15, tType = at + 0.35, typeDur = Math.min(0.6, 0.06 * Array.from(label).length + 0.1);
    ctx.sfx(tHair, "tap", 0.15);
    ctx.sfx(tType, "key", 0.2);
    ctx.sfx(tType + typeDur * 0.6, "key", 0.15);
    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.3, end);
        const on = t >= at && leave < 1;
        layer.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        layer.style.opacity = (1 - leave).toFixed(4);
        frame.style.opacity = ML.ease(t, at, at + 0.35).toFixed(4);
        hairs.forEach((h, i) => { h.style.transform = `scaleX(${ML.ease(t, tHair + i * 0.08, tHair + i * 0.08 + 0.5).toFixed(4)})`; });
        txt.textContent = ML.typed(label, t, tType, tType + typeDur);
        // the cursor shows while typing and blinks a moment after, then goes
        const done = tType + typeDur;
        caret.style.opacity = t < tType ? "0" : t < done ? "1" : t < done + 0.9 ? String(ML.blink(t - done, 0.45)) : "0";
      },
    };
  },
});

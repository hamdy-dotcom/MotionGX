// Reaction icon pops onto a card: right after a product card lands, a red heart in a white circle pops onto its
// top-left corner (top-right in Arabic). Ported from MotionGX's own studio engine (lib/studio-engine/assets/scenes.js,
// S.items): a 60–76 px circle at .92 white with the heart path, shadow --lift, placed 18 px in from the corner, popping
// from 0.2 at the card's time + 0.45 s with a click. Here the circle's size follows the card (≈ 12% of its short side,
// kept in the source's 60–76 px band at 1080), the pop is the kit's closed-form "pop" spring (a 2D scale, no 3D),
// the colours come from the look (panel at .92, the bad hue for the heart, the accent for a star, the good hue for a
// check) and the shadow is the look's own.
// Source: MotionGX lib/studio-engine/assets/scenes.js (own).
ML.define({
  id: "accent.heart-pop",
  category: "accent",
  name: "Reaction icon pops onto a card",
  does: "A red heart in a white circle pops onto the product card right after it lands.",
  says: ["playful", "celebration"],
  energy: 3,
  targets: ["shape", "card"],
  duration: [0.4, 1.2],
  params: {
    icon: { type: "choice", options: ["heart", "star", "check"], default: "heart" },
    delay: { type: "number", range: [0, 1], default: 0.45, unit: "s" },
    corner: { type: "choice", options: ["top-start", "top-end"], default: "top-start" },
  },
  pairs: ["element.card-rise", "ui.card-drop-to-slot"],
  avoid: ["problem", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "own:lib/studio-engine/assets/scenes.js", license: "own", note: "S.items heart badge: pop from 0.2 at card time + 0.45 with a click" },
  setup(ctx) {
    const { p, at, end, stage, f, rtl } = ctx;
    const doc = document;
    const host = ctx.scene || stage;
    // the card it sits on: the target, or (no slot) the scene's main panel
    const card = ctx.el && ctx.el !== stage ? ctx.el : host.querySelector(".ml-panel");
    const k = Math.min(f.W, f.H) / 1080;
    const ICONS = {
      heart: { d: "M12 21s-7.5-4.6-9.5-9.2C1 8.2 3.4 5 6.8 5c2 0 3.4 1.1 4.2 2.3.8-1.2 2.2-2.3 4.2-2.3C18.6 5 21 8.2 21.5 11.8 19.5 16.4 12 21 12 21z", fill: "var(--x-bad)" },
      star: { d: "M12 2.8l2.75 5.75 6.3.8-4.6 4.4 1.15 6.25L12 16.95 6.4 20l1.15-6.25-4.6-4.4 6.3-.8z", fill: "var(--x-accent)" },
      check: { d: "M9.4 16.6 4.8 12l-1.6 1.6 6.2 6.2L21 8.2l-1.6-1.6z", fill: "var(--x-good)" },
    };
    const ic = ICONS[p.icon] || ICONS.heart;
    const replaced = card && /^(IMG|SVG|CANVAS|VIDEO|svg)$/.test(card.tagName);
    const cb = card ? ctx.box(card) : { x: f.pic.x, y: f.pic.y, w: f.pic.w, h: f.pic.h };
    const D = ML.clamp(Math.min(cb.w, cb.h) * 0.12, 60 * k, 76 * k), inset = 18 * k;
    const startSide = p.corner !== "top-end"; // top-start: top-left in English, top-right in Arabic
    const onLeft = startSide !== rtl;
    const badge = doc.createElement("div");
    badge.innerHTML = `<svg viewBox="0 0 24 24" width="${(D * 0.58).toFixed(1)}" height="${(D * 0.58).toFixed(1)}"><path d="${ic.d}" style="fill:${ic.fill}"/></svg>`;
    badge.style.cssText = `position:absolute;top:${inset}px;${onLeft ? "left" : "right"}:${inset}px;width:${D}px;height:${D}px;border-radius:50%;` +
      "background:color-mix(in srgb, var(--x-panel) 92%, transparent);display:flex;align-items:center;justify-content:center;" +
      "box-shadow:var(--x-shadow);z-index:8;pointer-events:none;visibility:hidden;transform-origin:50% 50%;";
    if (card && !replaced) {
      if (getComputedStyle(card).position === "static") card.style.position = "relative";
      card.append(badge);
    } else {
      // a picture holds no children: the badge sits over its corner on the scene
      badge.style.top = cb.y + inset + "px";
      if (onLeft) badge.style.left = cb.x + inset + "px"; else { badge.style.right = ""; badge.style.left = cb.x + cb.w - inset - D + "px"; }
      host.append(badge);
    }
    const t0 = at + ML.clamp(+p.delay, 0, 1);
    ctx.sfx(t0, "pop", 0.4);

    return {
      draw(t) {
        if (t < t0 - 1e-6 || t > end + 0.05) { badge.style.visibility = "hidden"; return; }
        badge.style.visibility = "visible";
        const s = 0.2 + 0.8 * ML.step(t - t0, ML.SPRING.pop);
        const leave = ML.ease(t, end - 0.2, end);
        badge.style.opacity = (Math.min(1, ML.lin(t, t0, t0 + 0.06)) * (1 - leave)).toFixed(4);
        badge.style.transform = `scale(${(s * (1 - 0.3 * leave)).toFixed(4)})`;
      },
    };
  },
});

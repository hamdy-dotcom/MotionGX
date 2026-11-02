// Settle with glint: right after the picture appears it is a touch overbright and saturated, and settles to normal
// while one diagonal sheen slides across it. settle = ease(t, done, done + d); filter brightness(1.35 − .35·settle)
// saturate(1.1 − .1·settle). The glint is an inset-0 layer, linear-gradient(115deg, transparent 35%, light .22 50%,
// transparent 65%), translateX(−100% → +100%) over the same window and shown only during it (RTL: it travels right to
// left and its angle mirrors). With `appear`, the picture itself fades in over 0.2 s at `at` (the "appears" moment);
// without it, the picture is already there and only the settle + glint play.
// Source: MengTo/Skills web-design/html-demo demo/index.html — the .fd-glint layer and the GENERATE result settle (MIT).
ML.define({
  id: "photo.settle-glint",
  category: "photo",
  name: "Settle with glint",
  does: "Right after it appears, the picture is a touch overbright and saturated and settles to normal while a diagonal sheen slides across it.",
  says: ["result", "luxury", "celebration"],
  energy: 2,
  targets: ["image", "card", "logo"],
  duration: [0.6, 1.5],
  params: {
    duration: { type: "number", range: [0.6, 1.2], default: 0.9, unit: "s" },
    glint_angle: { type: "number", range: [100, 130], default: 115, unit: "deg" },
    glint_alpha: { type: "number", range: [0.15, 0.3], default: 0.22 },
    appear: { type: "bool", default: true },
  },
  pairs: ["element.pop-in", "photo.stack-fan", "text-in.punchline"],
  avoid: ["problem", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "success",
  source: { from: "MengTo/Skills:web-design/html-demo", license: "MIT", note: "demo/index.html .fd-glint gradient and the generate-result settle, rebuilt as a function of t" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const d = ML.clamp(p.duration, 0.6, 1.2);
    const alpha = ML.clamp(p.glint_alpha, 0.15, 0.3);
    const ang = ML.clamp(p.glint_angle, 100, 130);
    const rtl = ctx.rtl;

    // a box over the target that may hold the glint: replaced elements (img, svg, video, canvas) get a wrapper that
    // takes their place in the layout; anything else holds the layer itself
    const replaced = /^(img|video|canvas|svg|picture)$/i.test(el.tagName);
    let host = el;
    if (replaced) {
      const cs = getComputedStyle(el), b = ctx.box(el);
      host = document.createElement("span");
      host.style.cssText = `position:relative;display:${cs.display === "inline" ? "inline-block" : cs.display === "none" ? "block" : cs.display};width:${b.w}px;height:${b.h}px;flex:${cs.flex};align-self:${cs.alignSelf};margin:${cs.margin};border-radius:${cs.borderRadius};vertical-align:${cs.verticalAlign};line-height:0`;
      el.parentNode.insertBefore(host, el);
      host.append(el);
      el.style.width = "100%"; el.style.height = "100%"; el.style.margin = "0"; el.style.display = "block";
    } else if (getComputedStyle(el).position === "static") el.style.position = "relative";
    const clip = document.createElement("span");
    clip.style.cssText = "position:absolute;inset:0;overflow:hidden;border-radius:inherit;pointer-events:none;visibility:hidden";
    if (replaced) clip.style.borderRadius = getComputedStyle(el).borderRadius;
    const glint = document.createElement("span");
    const a = (alpha * 100).toFixed(1);
    glint.style.cssText = `position:absolute;inset:0;mix-blend-mode:screen;background:linear-gradient(${rtl ? 360 - ang : ang}deg, transparent 35%, color-mix(in srgb, var(--x-accent-ink) ${a}%, transparent) 50%, transparent 65%)`;
    clip.append(glint);
    host.append(clip);

    const fadeIn = 0.2;
    const done = p.appear ? at + fadeIn * 0.6 : at; // the settle starts as the picture is (almost) all there
    ctx.sfx(done + 0.05, "success", 0.3);

    return {
      draw(t) {
        // appear
        const o = p.appear ? ML.out(t, at, at + fadeIn) : 1;
        el.style.opacity = o >= 1 ? "" : o.toFixed(4);
        // settle: overbright and saturated → normal
        const s = ML.ease(t, done, done + d);
        const on = !p.appear || t >= at;
        el.style.filter = on && s < 1 ? `brightness(${(1.35 - 0.35 * s).toFixed(4)}) saturate(${(1.1 - 0.1 * s).toFixed(4)})` : "";
        // the glint: only during the settle window
        const g = ML.ease(t, done, done + d);
        const shown = t >= done && t <= done + d && end > done;
        clip.style.visibility = shown ? "visible" : "hidden";
        const x = (-100 + 200 * g) * (rtl ? -1 : 1);
        glint.style.transform = `translateX(${x.toFixed(2)}%)`;
      },
    };
  },
});

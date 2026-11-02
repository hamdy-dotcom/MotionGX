// Button fill sweep: an outlined button (1 px border, pill or square, overflow hidden, small uppercase tracked label)
// floods with solid colour from a fill layer behind its label — up (translateY 101 % → 0, the scroll-worlds .cta),
// left-to-right / right-to-left (translateX ∓100 % → 0), centre-out (scaleX 0 → 1 from the middle) or a fade — on
// cubic-bezier(.16, 1, .3, 1) over `duration`; the label turns from ink to the fill's ink over 0.45 s and the border
// takes the fill colour. With `press`, a 0.12 s press to 0.97 follows the sweep. Arabic mirrors the side sweeps.
// On a label the director gives, that label becomes the button; alone it builds "Add to cart".
// Source: MengTo/Skills web-design/build-threejs-scroll-worlds demo (.cta, MIT); gsap-scrolltrigger-storytelling and
// progressive-blur demos (button fills, MIT).
ML.define({
  id: "ui.button-fill",
  category: "ui",
  name: "Button fill sweep",
  does: "An outlined button floods with solid colour (sweeping up from its bottom, across, or fading) while its label inverts.",
  says: ["focus", "change", "step", "choice", "urgency", "brand", "money"],
  energy: 2,
  targets: ["label", "card"],
  duration: [0.8, 1.4],
  params: {
    direction: { type: "choice", options: ["up", "left-to-right", "right-to-left", "centre-out", "fade"], default: "up" },
    duration: { type: "number", range: [0.3, 0.62], default: 0.45, unit: "s" },
    press: { type: "bool", default: true },
    shape: { type: "choice", options: ["pill", "rect"], default: "pill" },
    fill: { type: "choice", options: ["ink", "accent"], default: "accent" },
    label: { type: "text", default: "Add to cart" },
  },
  pairs: ["ui.brutal-hover-snap"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click",
  source: { from: "MengTo/Skills:web-design/build-threejs-scroll-worlds", license: "MIT" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = !ctx.el || ctx.el === ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    let layer = null, btn;
    const FILL = p.fill === "ink" ? "var(--x-ink)" : "var(--x-accent)", FINK = p.fill === "ink" ? "var(--x-ground)" : "var(--x-accent-ink)";
    if (own) {
      layer = mk("div", `position:absolute;left:${f.pic.x}px;top:${f.pic.y}px;width:${f.pic.w}px;height:${f.pic.h}px;display:grid;place-items:center;pointer-events:none;z-index:6;`, host);
      btn = mk("div", `font:var(--x-label-weight) ${(34 * k).toFixed(1)}px var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:${rtl ? "none" : "var(--x-label-case)"};padding:${(40 * k).toFixed(1)}px ${(72 * k).toFixed(1)}px;background:var(--x-panel);`, layer,
        rtl && p.label === "Add to cart" ? "أضف للسلة" : p.label);
    } else btn = ctx.el;
    // the button: its label above a fill layer, clipped to its shape
    const inner = doc.createElement("span");
    inner.style.cssText = "position:relative;z-index:1;display:inline-block;";
    while (btn.firstChild) inner.append(btn.firstChild);
    btn.append(inner);
    const fs = parseFloat(getComputedStyle(btn).fontSize) || 24;
    btn.style.position = "relative";
    btn.style.overflow = "hidden";
    btn.style.isolation = "isolate";
    btn.style.boxSizing = "border-box";
    btn.style.borderRadius = p.shape === "pill" ? "var(--x-radius-s)" : "calc(var(--x-radius) * 0.2)";
    if (!own) btn.style.padding = `${(fs * 0.55).toFixed(1)}px ${(fs * 1.1).toFixed(1)}px`;
    btn.style.width = "fit-content";
    const layerFill = mk("span", `position:absolute;inset:0;z-index:0;background:${FILL};`, btn);
    btn.insertBefore(layerFill, inner);
    let dir = p.direction;
    if (rtl && dir === "left-to-right") dir = "right-to-left"; else if (rtl && dir === "right-to-left") dir = "left-to-right";
    const curve = ML.bezier(0.16, 1, 0.3, 1);
    const tS = at + 0.1, tE = tS + p.duration, tP = tE + 0.02;
    ctx.sfx(tS, "click", 0.4);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        const u = curve(ML.lin(t, tS, tE));
        let tr = "none", op = 1;
        if (dir === "up") tr = `translateY(${((1 - u) * 101).toFixed(3)}%)`;
        else if (dir === "left-to-right") tr = `translateX(${(-(1 - u) * 101).toFixed(3)}%)`;
        else if (dir === "right-to-left") tr = `translateX(${((1 - u) * 101).toFixed(3)}%)`;
        else if (dir === "centre-out") tr = `scaleX(${u.toFixed(4)})`;
        else op = u;
        layerFill.style.transform = tr;
        layerFill.style.opacity = op.toFixed(4);
        const c = ML.ease(t, tS + 0.05, tS + 0.5);
        inner.style.color = `color-mix(in srgb, ${FINK} ${(c * 100).toFixed(1)}%, var(--x-ink))`;
        btn.style.border = `${Math.max(1, 2 * k).toFixed(1)}px solid color-mix(in srgb, ${FILL} ${(c * 100).toFixed(1)}%, var(--x-ink))`;
        const pr = p.press ? ML.lin(t, tP, tP + 0.06) * (1 - ML.lin(t, tP + 0.06, tP + 0.18)) : 0;
        btn.style.scale = pr > 0 ? (1 - 0.03 * pr).toFixed(4) : "none";
        if (layer) layer.style.opacity = (1 - leave).toFixed(4);
      },
    };
  },
});

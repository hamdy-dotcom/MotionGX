// Burger line swap: the two-line menu icon from the scroll-worlds nav (lines 1.5 px; the top 26 px long at y 4, the
// second 17 px at y 11, right-aligned). "swap": the lines trade lengths (26 ↔ 17) in 0.45 s on --ease-out
// cubic-bezier(.16, 1, .3, 1) and trade back before the end; "cross": both move to y 7 at 26 px and turn ±45° into an
// X, a beat after it shows (the viewer has to see the menu first). Drawn at the source's proportions, scaled to the stage, on a round panel button; aligned to the left in Arabic.
// Source: MengTo/Skills web-design/build-threejs-scroll-worlds demo (.nav-burger, MIT).
ML.define({
  id: "ui.burger-line-swap",
  category: "ui",
  name: "Menu lines swap",
  does: "Two menu lines trade lengths, or cross into an X.",
  says: ["change"],
  energy: 1,
  targets: ["shape"],
  duration: [0.7, 1.4],
  params: {
    mode: { type: "choice", options: ["swap", "cross"], default: "cross" },
    size: { type: "number", range: [0.08, 0.4], default: 0.18 },
    plate: { type: "bool", default: true },
  },
  pairs: [],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/build-threejs-scroll-worlds", license: "MIT" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent) => { const e = doc.createElement(tag); e.style.cssText = css; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = !ctx.el || ctx.el === ctx.stage;
    const R = own ? f.pic : ctx.box(ctx.el);
    const D = Math.min(R.w, R.h) * (own ? p.size * 2 : 0.9);
    const k = (D * 0.55) / 26; // icon px → stage px (26 px wide icon fills 55 % of the plate)
    const layer = mk("div", "position:absolute;inset:0;pointer-events:none;z-index:6;", host);
    const plate = mk("div", `position:absolute;left:${R.x + R.w / 2 - D / 2}px;top:${R.y + R.h / 2 - D / 2}px;width:${D}px;height:${D}px;border-radius:50%;${p.plate ? "background:var(--x-panel);box-shadow:var(--x-shadow);border:var(--x-edge) solid var(--x-edge-color);" : ""}`, layer);
    const icon = mk("div", `position:absolute;left:${D / 2 - 13 * k}px;top:${D / 2 - 8 * k}px;width:${26 * k}px;height:${16 * k}px;`, plate);
    const line = () => mk("i", `position:absolute;${rtl ? "left" : "right"}:0;height:${(1.5 * k).toFixed(2)}px;background:var(--x-ink);border-radius:${k}px;transform-origin:center;`, icon);
    const a = line(), b = line();
    const eo = ML.bezier(0.16, 1, 0.3, 1);
    const tS = at + 0.12, t2 = Math.max(tS + 0.5, end - 0.75);
    ctx.sfx(tS, "tap", 0.35);
    if (p.mode === "swap") ctx.sfx(t2, "tap", 0.2);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        const u = eo(ML.lin(t, tS, tS + 0.45)) - (p.mode === "swap" ? eo(ML.lin(t, t2, t2 + 0.45)) : 0);
        let ya = 4, yb = 11, wa = 26, wb = 17, ra = 0, rb = 0;
        if (p.mode === "swap") { wa = 26 - 9 * u; wb = 17 + 9 * u; }
        else { ya = 4 + 3 * u; yb = 11 - 4 * u; wb = 17 + 9 * u; ra = 45 * u; rb = -45 * u; }
        a.style.top = (ya * k).toFixed(2) + "px"; a.style.width = (wa * k).toFixed(2) + "px"; a.style.transform = `rotate(${ra.toFixed(3)}deg)`;
        b.style.top = (yb * k).toFixed(2) + "px"; b.style.width = (wb * k).toFixed(2) + "px"; b.style.transform = `rotate(${rb.toFixed(3)}deg)`;
        plate.style.scale = (1 - 0.04 * ML.pulse(t, tS, 0.04, 0.18)).toFixed(4);
        if (own) layer.style.opacity = (1 - leave).toFixed(4);
      },
    };
  },
});

// Glass capsule pill: an eyebrow label set in a capsule of dark glass. Outer: 1 px padding, fully round, a vertical
// gradient from light at 25 % to light at 3 % (the hairline highlight edge); inner: ink at 80 % with a 12 px backdrop
// blur, padding 6 × 12, the label in light ink, an optional status dot (accent, soft halo). Enter: opacity 0 → 1 and
// y 8 → 0 over 0.5 s power2.out; then, once, a narrow light gradient sweeps along the edge (background-position
// −100 % → 200 %, 0.8 s) — only the 1 px rim shows it, because the inner glass covers the rest. In Arabic the sweep runs
// right to left. On a label the director gives, that label goes into the capsule (it keeps its own type); alone it
// builds a small "New" eyebrow over the headline band.
// Source: MengTo/Skills web-design/glass-dark-mode-clock SKILL.md (MIT).
ML.define({
  id: "ui.glass-capsule-pill",
  category: "ui",
  name: "Glass-dark capsule pill",
  does: "An eyebrow pill made of dark glass with a hairline highlight edge fades in above the headline.",
  says: ["tech", "luxury", "arrival"],
  energy: 1,
  targets: ["label"],
  duration: [0.5, 1.5],
  params: {
    edge_sweep: { type: "bool", default: true },
    dot: { type: "bool", default: false },
    text: { type: "text", default: "New · Version 2.0" },
  },
  pairs: ["text-in.punchline", "text-in.mask-rise"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:web-design/glass-dark-mode-clock", license: "MIT" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080, s = 2 * k; // web px → stage px
    let el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    if (!el) {
      const H = f.head;
      const band = mk("div", `position:absolute;left:${H.x}px;top:${Math.max(0, H.y - 70 * k).toFixed(1)}px;width:${H.w}px;text-align:var(--x-head-align);pointer-events:none;z-index:6;`, host);
      el = mk("div", `font:var(--x-label-weight) ${(22 * k).toFixed(1)}px var(--x-label-font);letter-spacing:var(--x-label-track);text-transform:var(--x-label-case);`, band, rtl && p.text === "New · Version 2.0" ? "جديد · الإصدار ٢٫٠" : p.text);
    }
    const fs = parseFloat(getComputedStyle(el).fontSize) || 22 * k;
    const LIGHT = "var(--x-ground)", ON = (a) => `color-mix(in srgb, ${LIGHT} ${a}%, transparent)`;
    const rim = Math.max(1.5, s).toFixed(1);
    const outer = doc.createElement("span");
    outer.style.cssText = `display:inline-block;vertical-align:middle;padding:${rim}px;border-radius:999px;background-image:linear-gradient(${rtl ? 270 : 90}deg, transparent 42%, ${ON(95)} 50%, transparent 58%), linear-gradient(180deg, ${ON(25)}, ${ON(3)});background-size:300% 100%, 100% 100%;background-repeat:no-repeat;background-position:${rtl ? -100 : 200}% 0, 0 0;`;
    const inner = mk("span", `display:inline-flex;align-items:center;gap:${(fs * 0.55).toFixed(1)}px;padding:${(fs * 0.55).toFixed(1)}px ${(fs * 1.1).toFixed(1)}px;border-radius:999px;background:color-mix(in srgb, var(--x-ink) 80%, transparent);backdrop-filter:blur(${(12 * s).toFixed(1)}px);-webkit-backdrop-filter:blur(${(12 * s).toFixed(1)}px);color:${LIGHT};white-space:nowrap;line-height:1.2;`, outer);
    if (p.dot) mk("i", `width:${(fs * 0.42).toFixed(1)}px;height:${(fs * 0.42).toFixed(1)}px;border-radius:50%;background:var(--x-accent);box-shadow:0 0 0 ${(fs * 0.22).toFixed(1)}px color-mix(in srgb, var(--x-accent) 25%, transparent);flex:none;`, inner);
    const txt = mk("span", "", inner);
    while (el.firstChild) txt.append(el.firstChild);
    el.append(outer);
    // if the capsule would be wider than its box, it shrinks its type to fit
    const room = el.clientWidth || f.W;
    if (outer.offsetWidth > room) inner.style.fontSize = ((fs * room) / outer.offsetWidth).toFixed(2) + "px";

    const sweepA = at + 0.35, sweepB = sweepA + 0.8;
    const p2 = (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), 2);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.22);
        const e = p2(t, at, at + 0.5);
        outer.style.opacity = (ML.lin(t, at, at + 0.5) * (1 - leave)).toFixed(4);
        outer.style.translate = `0 ${((1 - e) * 8 * s).toFixed(2)}px`;
        // background-position on a 300 % layer: −100 % → 200 % reads as the glint crossing the rim once
        const x = p.edge_sweep ? ML.ease(t, sweepA, sweepB) : 0;
        const pos = t < sweepA || !p.edge_sweep ? -100 : -100 + 300 * x;
        // (with a layer wider than the box, a rising % moves it leftwards: LTR runs the range backwards so the glint goes right)
        outer.style.backgroundPosition = `${(rtl ? pos : 100 - pos).toFixed(2)}% 0, 0 0`;
      },
    };
  },
});

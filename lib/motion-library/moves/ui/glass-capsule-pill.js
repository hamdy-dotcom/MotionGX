// Glass capsule pill: an eyebrow label set in a capsule of dark glass. Inner: ink at 80 % with a 12 px backdrop blur,
// padding 6 × 12, the label in light ink, an optional status dot (accent, soft halo). On it, a hairline rim (a ring
// masked out of a layer): a vertical gradient from light at 25 % to light at 3 %. The rim sits on the glass, not outside
// it, so it reads on a light ground too. Enter: opacity 0 → 1 and y 8 → 0 over 0.5 s power2.out; then, once, a narrow
// light gradient sweeps along the rim for a full 0.8 s (the position runs only over the part where the glint is in
// view, or the crossing would last two frames). In Arabic the sweep runs right to left. On a label the director gives, that label goes into the capsule (it keeps its own type); alone it
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
  duration: [0.9, 3],
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
      const band = mk("div", `position:absolute;left:${H.x}px;top:${Math.max(28 * k, H.y - 70 * k).toFixed(1)}px;width:${H.w}px;text-align:var(--x-head-align);pointer-events:none;z-index:6;`, host);
      el = mk("div", `font:var(--x-label-weight) ${(22 * k).toFixed(1)}px var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:var(--x-label-case);`, band, rtl && p.text === "New · Version 2.0" ? "جديد · الإصدار ٢٫٠" : p.text);
    }
    const fs = parseFloat(getComputedStyle(el).fontSize) || 22 * k;
    const LIGHT = "var(--x-ground)", ON = (a) => `color-mix(in srgb, ${LIGHT} ${a}%, transparent)`;
    const rim = Math.max(1.5, s).toFixed(1);
    const outer = doc.createElement("span");
    outer.style.cssText = "position:relative;display:inline-block;vertical-align:middle;border-radius:999px;";
    const inner = mk("span", `display:flex;align-items:center;gap:${(fs * 0.55).toFixed(1)}px;padding:${(fs * 0.55).toFixed(1)}px ${(fs * 1.1).toFixed(1)}px;border-radius:999px;background:color-mix(in srgb, var(--x-ink) 80%, transparent);backdrop-filter:blur(${(12 * s).toFixed(1)}px);-webkit-backdrop-filter:blur(${(12 * s).toFixed(1)}px);color:${LIGHT};white-space:nowrap;line-height:1.2;`, outer);
    if (p.dot) mk("i", `width:${(fs * 0.42).toFixed(1)}px;height:${(fs * 0.42).toFixed(1)}px;border-radius:50%;background:var(--x-accent);box-shadow:0 0 0 ${(fs * 0.22).toFixed(1)}px color-mix(in srgb, var(--x-accent) 25%, transparent);flex:none;`, inner);
    const txt = mk("span", "", inner);
    if (ML.ARABIC.test(el.textContent)) txt.style.letterSpacing = "0"; // joined letters are never spaced
    while (el.firstChild) txt.append(el.firstChild);
    // inner and edge fade each by its own opacity: on a shared parent it would cut the glass off from what is behind it
    const edge = mk("span", `position:absolute;inset:0;box-sizing:border-box;padding:${rim}px;border-radius:999px;pointer-events:none;background-image:linear-gradient(90deg, transparent 42%, ${ON(95)} 50%, transparent 58%), linear-gradient(180deg, ${ON(25)}, ${ON(3)});background-size:300% 100%, 100% 100%;background-repeat:no-repeat;background-position:${rtl ? -50 : 150}% 0, 0 0;-webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;`, outer);
    el.append(outer);
    // if the capsule would be wider than its box, it shrinks its type to fit
    const room = el.clientWidth || f.W;
    if (outer.offsetWidth > room) inner.style.fontSize = ((fs * room) / outer.offsetWidth).toFixed(2) + "px";

    const sweepA = at + 0.35, sweepB = Math.min(sweepA + 0.8, end - 0.25);
    const p2 = (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), 2);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.22);
        const e = p2(t, at, at + 0.5);
        const o = (ML.lin(t, at, at + 0.5) * (1 - leave)).toFixed(4);
        inner.style.opacity = o;
        edge.style.opacity = o;
        outer.style.translate = `0 ${((1 - e) * 8 * s).toFixed(2)}px`;
        // on a 300 % layer the glint is off the rim at 100 % and at 0 %, and a falling % moves it towards the right
        if (!p.edge_sweep) return;
        const x = (1 - Math.cos(Math.PI * ML.lin(t, sweepA, sweepB))) / 2;
        const pos = t >= sweepB ? 150 : rtl ? x * 100 : 100 - x * 100; // parked out of view before and after
        edge.style.backgroundPosition = `${(t < sweepA ? (rtl ? -50 : 150) : pos).toFixed(2)}% 0, 0 0`;
      },
    };
  },
});

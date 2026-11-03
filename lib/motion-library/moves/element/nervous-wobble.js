// Nervous wobble: a card tips to −1.5° and back over 0.12 s, yoyo, repeat 5, sine.inOut — uneasy. It starts on the `on`
// word, else on the move's `at`; when the move is given an end, or it built its own blank post, it is timed like the
// source ("0.6 s before the line ends"), finishing just before that end. With no card to wobble (or `empty_state`), it
// first builds the empty-state hook: a dashed blank post with a big light "+" and a blinking caret after its placeholder
// line, popping in (scale .92 → 1, y 40 → 0), then the wobble. RTL tips the other way.
// Source: MotionGX's own studio engine, lib/studio-engine/assets/scenes.js S.hook (the blank post and
// tl.to(card, { rotation: -1.5, duration: 0.12, yoyo: true, repeat: 5, ease: "sine.inOut" }, vo.end - 0.6)).
ML.define({
  id: "element.nervous-wobble",
  category: "element",
  name: "Nervous wobble",
  does: "A card wobbles back and forth a few times as if uneasy; with no card, a blank dashed post pops in first and then wobbles.",
  says: ["problem", "playful"],
  energy: 2,
  targets: ["card", "shape"],
  duration: [0.6, 1.8],
  params: {
    angle: { type: "number", range: [1, 3], default: 1.5, unit: "deg" },
    repeats: { type: "number", range: [3, 7], default: 5 },
    half: { type: "number", range: [0.08, 0.2], default: 0.12, unit: "s" },
    empty_state: { type: "bool", default: false },
    blank: { type: "text", default: "" },
    on: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "element.pop-in"],
  avoid: ["luxury", "celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "own:lib/studio-engine/assets/scenes.js", license: "own", note: "S.hook: the blank post and its rotation -1.5° yoyo wobble, now a function of t" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const k = Math.min(f.W, f.H) / 1080;
    const half = ML.clamp(p.half, 0.08, 0.2), plays = Math.round(ML.clamp(p.repeats, 3, 7)) + 1;
    const ang = -ML.clamp(p.angle, 1, 3) * (rtl ? -1 : 1);
    let card = own, built = false, caret = null;
    if (!own || p.empty_state) {
      // the empty-state hook: a dashed blank post
      built = true;
      const R = f.pic, w = Math.min(R.w * 0.8, (f.tall ? 700 : 600) * k * 1.1), h = Math.min(R.h * 0.92, w * 1.25);
      card = doc.createElement("div");
      card.style.cssText = `position:absolute;left:${(R.x + (R.w - w) / 2).toFixed(1)}px;top:${(R.y + (R.h - h) / 2).toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;box-sizing:border-box;border:${(5 * k).toFixed(1)}px dashed color-mix(in srgb, var(--x-ink) 18%, transparent);background:var(--x-panel);border-radius:var(--x-radius);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${(34 * k).toFixed(1)}px;z-index:5;pointer-events:none;visibility:hidden;`;
      const plus = doc.createElement("div");
      plus.style.cssText = `font:300 ${(220 * k).toFixed(1)}px/1 var(--x-head-font);color:color-mix(in srgb, var(--x-ink) 14%, transparent);`;
      plus.textContent = "+";
      const line = doc.createElement("div");
      line.style.cssText = `font:500 ${(44 * k).toFixed(1)}px var(--x-head-font);color:var(--x-dim);display:flex;align-items:center;gap:${(6 * k).toFixed(1)}px;`;
      line.append(doc.createTextNode(p.blank || (rtl ? "بوست جديد" : "New post")));
      caret = doc.createElement("span");
      caret.style.cssText = `display:inline-block;width:${(4 * k).toFixed(1)}px;height:${(50 * k).toFixed(1)}px;background:var(--x-accent);border-radius:2px;`;
      line.append(caret);
      card.append(plus, line);
      host.append(card);
    }
    card.style.transformOrigin = "50% 50%";
    const intro = built ? 0.45 : 0;
    const total = plays * half;
    const spoken = p.on ? ctx.word(String(p.on), NaN) : NaN;
    // on its word; else on `at`; before the end (the studio engine's "0.6 s before the line ends") when an end was asked or the post is its own
    const toEnd = built || end < ctx.to - 0.01;
    const w0 = Number.isFinite(spoken) ? Math.max(at + intro, spoken) : toEnd ? Math.max(at + intro, end - 0.12 - total) : at;
    if (built) ctx.sfx(at, "pop.soft", 0.25);
    for (let i = 0; i < plays; i += 2) ctx.sfx(w0 + i * half, "tap", 0.12);
    const sineIO = (u) => -(Math.cos(Math.PI * u) - 1) / 2;

    return {
      draw(t) {
        if (built) {
          card.style.visibility = t < at - 1e-6 ? "hidden" : "visible";
          const e = ML.back(t, at, at + 0.45, 1.4), o = ML.ease(t, at, at + 0.2);
          card.style.opacity = o.toFixed(4);
          card.style.scale = Math.min(1, 0.92 + 0.08 * Math.max(0, e)).toFixed(4);
          card.style.translate = `0 ${((1 - Math.min(1, e)) * 40 * k).toFixed(2)}px`;
          caret.style.opacity = t < at + 0.5 ? "0" : String(ML.blink(t - at - 0.5, 1));
        }
        // the yoyo: plays half-cycles 0 → angle → 0 …, each sine.inOut; it holds where GSAP's last play leaves it
        let r = 0;
        if (t >= w0) {
          const x = (t - w0) / half, i = Math.min(plays - 1, Math.floor(x)), u = t >= w0 + total ? 1 : x - i;
          const v = sineIO(ML.clamp(u));
          r = ang * (i % 2 === 0 ? v : 1 - v);
        }
        card.style.rotate = `${r.toFixed(4)}deg`;
      },
    };
  },
});

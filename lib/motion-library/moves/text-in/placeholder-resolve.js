// Placeholder resolve: where the line will be, a few small placeholder marks (dashes, dots or blocks) sit spaced across
// its width and flicker at 12 fps (seeded opacity 0.2–1) for `flicker` seconds as if it is being computed; near the
// end the last one shrinks into a dot. Then the line enters with a mask rise (0.35 s expo out; whole line, per word or
// per letter with a stagger) and the marks vanish. Cursor-ahead: two small dashes travel just ahead of the reveal
// while each unit rises from a hard bottom clip (0.15 s). Arabic splits by words only (its letters join).
// Sources: prompt-motion astrodevil "insane made with claude", itsuki-dev "opus 5.5 cooked this" (reference only —
// our own rebuild).
ML.define({
  id: "text-in.placeholder-resolve",
  category: "text-in",
  name: "Placeholder resolve",
  does: "Little dashes or dots flicker where the next line will be, as if it is being computed, then the real letters rise in and replace them.",
  says: ["tech", "step", "reveal", "precision"],
  energy: 2,
  targets: ["line", "headline", "logo"],
  duration: [0.6, 2],
  params: {
    glyphs: { type: "choice", options: ["dashes", "dots", "blocks"], default: "dashes" },
    count: { type: "number", range: [2, 6], default: 5 },
    flicker: { type: "number", range: [0.2, 0.6], default: 0.4, unit: "s" },
    mode: { type: "choice", options: ["swap-line", "cursor-ahead"], default: "swap-line" },
    split: { type: "choice", options: ["line", "words", "letters"], default: "line" },
    stagger: { type: "number", range: [0, 0.08], default: 0.06, unit: "s" },
  },
  pairs: ["text-in.mask-rise", "text-in.typewriter"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:astrodevil-insane-made-with-claude", license: "reference", note: "also itsuki-dev-opus-5-5-cooked-this; our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const isText = !(el instanceof SVGElement) && el.tagName !== "IMG";
    if (isText && getComputedStyle(el).position === "static") el.style.position = "relative";
    // the units that rise
    let units;
    if (!isText) units = [el];
    else if (p.split === "line") {
      const w = document.createElement("span"); w.style.display = "inline-block"; w.append(...el.childNodes); el.append(w); units = [w];
    } else units = ML.split(el, p.split === "letters" ? "chars" : "words");
    // a Latin word / number split into letters inside right-to-left text keeps its own left-to-right order
    for (const w of el.querySelectorAll(".ml-w")) if (!ML.ARABIC.test(w.textContent)) w.style.direction = "ltr";
    // where the text is (stage px) and how big it is
    const host = ctx.scene || ctx.stage;
    let tb;
    if (isText) { const r = document.createRange(); r.selectNodeContents(el); const a = r.getBoundingClientRect(), s = ctx.stage.getBoundingClientRect(); tb = { x: a.left - s.left, y: a.top - s.top, w: a.width, h: a.height }; }
    else tb = ctx.box(el);
    const fs = isText ? parseFloat(getComputedStyle(el).fontSize) || 100 : tb.h;
    const ub = units.map((u) => ctx.box(u));
    // the marks: an overlay in the scene over the text's place
    const n = Math.round(p.count), bw = fs * 0.12, bh = Math.max(3, fs * 0.04);
    const size = { dashes: [bw, bh], dots: [bh * 1.6, bh * 1.6], blocks: [bw * 0.7, bh * 3] }[p.glyphs];
    const midY = tb.y + tb.h * 0.58;
    const marks = [];
    for (let i = 0; i < n; i++) {
      const m = document.createElement("div");
      const k = n === 1 ? 0.5 : i / (n - 1), cxp = tb.x + tb.w * (0.08 + 0.84 * (rtl ? 1 - k : k));
      Object.assign(m.style, { position: "absolute", left: (cxp - size[0] / 2).toFixed(1) + "px", top: (midY - size[1] / 2).toFixed(1) + "px", width: size[0].toFixed(1) + "px", height: size[1].toFixed(1) + "px", background: "var(--x-accent)", borderRadius: p.glyphs === "dots" ? "50%" : (bh / 3).toFixed(1) + "px", pointerEvents: "none", zIndex: "3", opacity: "0" });
      host.append(m); marks.push({ m, cx: cxp });
    }
    const T = at + p.flicker; // the line starts entering
    const cursor = p.mode === "cursor-ahead";
    const rise = cursor ? 0.15 : 0.35;
    const times = units.map((_, i) => T + i * p.stagger);
    const span = times[times.length - 1] + rise - T;
    // text extent in reading order (for the travelling dashes)
    const xs = rtl ? tb.x + tb.w : tb.x, xe = rtl ? tb.x : tb.x + tb.w;
    ctx.sfx(at, "tap", 0.25);
    ctx.sfx(T, "tap", 0.35);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        el.style.opacity = (1 - leave).toFixed(4);
        // units: a mask rise (the mask stays at the unit's own place: the clip shrinks as the unit moves down)
        units.forEach((u, i) => {
          const x = cursor ? ML.out(t, times[i], times[i] + rise) : ML.expo(t, times[i], times[i] + rise);
          const h = ub[i].h, d = (1 - x) * h * 1.05;
          u.style.visibility = x > 0 ? "visible" : "hidden";
          u.style.translate = x >= 1 ? "none" : `0 ${d.toFixed(2)}px`;
          u.style.clipPath = x >= 1 ? "none" : `inset(-30% -15% ${d.toFixed(2)}px -15%)`;
        });
        // marks: flicker at 12 fps while computing, the last turns into a dot, then they vanish (or two run ahead)
        const fr = Math.floor((t - at) * 12), gone = 1 - ML.lin(t, T, T + 0.1);
        marks.forEach((o, i) => {
          if (t < at) { o.m.style.opacity = "0"; return; }
          if (cursor && i < 2 && t >= T) {
            const u = ML.lin(t, T, T + span), x = xs + (xe - xs) * u + (rtl ? -1 : 1) * (fs * 0.12 + i * size[0] * 1.5);
            o.m.style.left = (x - size[0] / 2).toFixed(1) + "px";
            o.m.style.width = size[0].toFixed(1) + "px";
            o.m.style.opacity = ((1 - ML.lin(t, T + span, T + span + 0.15)) * (1 - leave)).toFixed(4);
            return;
          }
          const f = t < T ? 0.2 + 0.8 * ML.rnd(i * 31 + fr, 5) : gone;
          const toDot = i === n - 1 ? ML.ease(t, at + p.flicker * 0.6, T) : 0;
          const w = size[0] + (Math.min(size[0], size[1]) - size[0]) * toDot;
          o.m.style.left = (o.cx - w / 2).toFixed(1) + "px";
          o.m.style.width = w.toFixed(1) + "px";
          o.m.style.borderRadius = toDot > 0.5 ? "50%" : p.glyphs === "dots" ? "50%" : (bh / 3).toFixed(1) + "px";
          o.m.style.opacity = (t >= T ? gone : f).toFixed(4);
        });
      },
    };
  },
});

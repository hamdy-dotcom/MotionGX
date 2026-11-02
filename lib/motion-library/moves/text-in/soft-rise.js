// Soft rise: the workhorse entrance for copy that must never compete with the headline. Each part (the whole block,
// its lines, its words, or its child blocks) drifts up a few px while fading and un-blurring, in strict reading order:
// from opacity 0, y +distance, blur → its target opacity, y 0, blur 0, on a soft decelerating ease, staggered.
// "eyebrow-title-lede-meta" uses the sliced-clock cascade: one arrive clock per group and each part takes its slice
// (0–.30, .12–.42, .40–.70, .60–.90) through a smoothstep, y = (1 − o)·distance; the leave mirrors it.
// tone "grey-to-ink" turns the part from the dim ink to the full ink as it rises (the long-travel variant).
// Source: MengTo/Skills web-design (light-mode-paper-technical, solar-duotone-bold, animation-on-scroll, webgl-3d-object,
// dither-laser-dark-mode, horizontal-scroll-scenes) (MIT), rebuilt as a pure function of t.
ML.define({
  id: "text-in.soft-rise",
  category: "text-in",
  name: "Soft rise",
  does: "Blocks of copy (eyebrow, title, lede, CTA, proof, meta line) drift up a few pixels while fading (and optionally un-blurring) into place, one after another in reading order.",
  says: ["arrival", "calm", "simplicity", "step", "story", "trust", "time"],
  energy: 2,
  targets: ["line", "label", "card", "headline", "list", "logo"],
  duration: [0.5, 2.5],
  params: {
    distance: { type: "number", range: [4, 250], default: 20, unit: "px" },
    blur: { type: "number", range: [0, 10], default: 6, unit: "px" },
    duration: { type: "number", range: [0.4, 1.2], default: 0.8, unit: "s" },
    stagger: { type: "number", range: [0.035, 0.2], default: 0.12, unit: "s" },
    delay: { type: "number", range: [0, 0.6], default: 0.3, unit: "s" },
    split: { type: "choice", options: ["block", "lines", "words", "children"], default: "block" },
    ease: { type: "choice", options: ["power3.out", "expo.out", "ease", "power2.out", "power3.inOut"], default: "power3.out" },
    targetOpacity: { type: "number", range: [0.4, 1], default: 1 },
    tone: { type: "choice", options: ["none", "grey-to-ink"], default: "none" },
    order: { type: "choice", options: ["reading", "eyebrow-title-lede-meta"], default: "reading" },
    leave: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "mask.line-reveal"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:web-design/light-mode-paper-technical", license: "MIT", note: "values from solar-duotone-bold, animation-on-scroll, webgl-3d-object, dither-laser-dark-mode, horizontal-scroll-scenes" },
  setup(ctx) {
    const { el, els, p, at, end } = ctx;
    if (!el) return null;
    const cssEase = ML.bezier(0.25, 0.1, 0.25, 1);
    const EASE = {
      "power3.out": (x) => 1 - Math.pow(1 - x, 3),
      "power2.out": (x) => 1 - Math.pow(1 - x, 2),
      "expo.out": (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
      ease: cssEase,
      "power3.inOut": (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    };
    const curve = EASE[p.ease] || EASE["power3.out"];
    // the parts, in reading order
    let parts;
    if (p.split === "children") parts = els.length > 1 ? els : [...el.children].filter((c) => c.offsetParent !== null);
    else if (p.split === "words" || p.split === "lines") {
      const words = ML.split(el, "words");
      if (p.split === "words") parts = words.map((w) => [w]);
      else {
        // group words by the line they sit on (measured once, as laid out)
        const rows = [];
        for (const w of words) { const y = w.offsetTop; let r = rows.find((x) => Math.abs(x.y - y) < 4); if (!r) rows.push((r = { y, ws: [] })); r.ws.push(w); }
        parts = rows.sort((a, b) => a.y - b.y).map((r) => r.ws);
      }
    } else parts = els.length > 1 ? els : [el];
    if (!parts || !parts.length) parts = [el];
    parts = parts.map((x) => (Array.isArray(x) ? x : [x]));
    const n = parts.length, start = at + p.delay;
    const isPic = (e) => e.tagName === "IMG" || e.tagName === "VIDEO" || e.tagName === "CANVAS" || !!e.querySelector?.("img, video, canvas");
    const SLICE = [0, 0.12, 0.4, 0.6];
    const smooth = (a, b, x) => { const u = ML.clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
    // each part's [from, to] in seconds
    const spans = parts.map((_, i) => {
      if (p.order === "eyebrow-title-lede-meta") {
        // one arrive clock: each slice is .30 of it and lasts `duration`
        const T = p.duration / 0.3, a0 = i < 4 ? SLICE[i] : Math.min(0.7, 0.6 + (i - 3) * 0.1);
        return [start + a0 * T, start + (a0 + 0.3) * T];
      }
      return [start + i * p.stagger, start + i * p.stagger + p.duration];
    });
    const lastIn = Math.max(...spans.map((s) => s[1]));
    const leaveAt = p.leave ? Math.max(lastIn + 0.2, end - 0.32) : Infinity;
    spans.forEach((s, i) => (i === 0 || i % 2 === 0) && i < 6 && ctx.sfx(s[0], "whoosh.soft", i ? 0.12 : 0.2));
    for (const ws of parts) for (const w of ws) if (p.split === "words" || p.split === "lines") w.style.willChange = "translate, opacity";
    return {
      draw(t) {
        parts.forEach((ws, i) => {
          const [a, b] = spans[i];
          const x = ML.lin(t, a, b);
          const o = p.order === "eyebrow-title-lede-meta" ? smooth(0, 1, x) : curve(x);
          // the leave mirrors the arrival in reverse order, quickly
          const k = n - 1 - i, lv = ML.clamp((t - (leaveAt + k * Math.min(0.04, p.stagger * 0.4))) / 0.24);
          const lo = lv * lv * (3 - 2 * lv);
          for (const w of ws) {
            const vis = o * (1 - lo);
            w.style.opacity = (vis * p.targetOpacity).toFixed(4);
            w.style.translate = `0 ${((1 - o) * p.distance - lo * Math.min(14, p.distance * 0.6)).toFixed(2)}px`;
            const bl = isPic(w) ? 0 : (1 - o) * p.blur + lo * p.blur * 0.6;
            w.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : "none";
            if (p.tone === "grey-to-ink") w.style.color = o >= 1 ? "" : `color-mix(in srgb, var(--x-ink) ${(o * 100).toFixed(1)}%, var(--x-dim))`;
          }
        });
      },
    };
  },
});

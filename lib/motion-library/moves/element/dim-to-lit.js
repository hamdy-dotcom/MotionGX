// Waiting placeholder that lights on its word: every part sits faintly in place from the scene's start (opacity
// `rest_opacity`), so the frame is never empty, and each brightens with a tiny pop exactly when the voice names it —
// p = cubic ease over (at − 0.06 … at + 0.18), opacity = rest + (1 − rest) p, scale = 1 − pop + pop × back-out over
// (at … at + 0.3). Better than empty-then-appear for a list said aloud. Parts: a list's items, or every element the
// target names; each lands on its own spoken word (its first word heard after the move starts), else on a steady
// stagger. A soft pop per part.
// Source: MengTo/Skills media/html-explainer-video demo/film.js `waits` (MIT).
ML.define({
  id: "element.dim-to-lit",
  category: "element",
  name: "Waiting placeholder that lights on its word",
  does: "Parts sit faintly in place from the scene start and each brightens with a tiny pop exactly when the voice names it, so the frame is never empty.",
  says: ["list", "step", "calm"],
  energy: 2,
  targets: ["list", "card", "screen", "label"],
  duration: [1, 8],
  params: {
    rest_opacity: { type: "number", range: [0.15, 0.35], default: 0.22 },
    pop: { type: "number", range: [0.01, 0.02], default: 0.015 },
    sync: { type: "choice", options: ["spoken", "stagger"], default: "spoken" },
    stagger: { type: "number", range: [0.15, 1.2], default: 0.45, unit: "s" },
    sound: { type: "choice", options: ["pop.soft", "pop", "tap", "none"], default: "pop.soft" },
  },
  pairs: ["text-emphasis.accent-word", "element.stagger-list"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "MengTo/Skills:agent-skills/media/html-explainer-video/demo/film.js", license: "MIT", note: "waits(el, t, at, wait = 0.22)" },
  setup(ctx) {
    const { p, at, els, el } = ctx;
    if (!el || el === ctx.stage) return null;
    // the parts: a single list's items, else every element the target names
    const parts = els.length === 1 && el.children.length > 1 ? [...el.children] : els.slice();
    if (!parts.length) return null;
    const rest = ML.clamp(p.rest_opacity, 0.15, 0.35), pop = ML.clamp(p.pop, 0.01, 0.02);
    // each part's moment: the first of its words the voice says after the move starts, else a steady stagger
    const times = parts.map((e, i) => {
      const fb = at + i * p.stagger;
      if (p.sync !== "spoken") return fb;
      const ws = (e.textContent || "").trim().split(/\s+/).filter((w) => ML.plain(w).length > 1);
      for (const w of ws) for (let n = 1; n <= 4; n++) { const s = ctx.word(w, -1, n); if (s < 0) break; if (s >= at - 0.05) return s; }
      return fb;
    });
    for (let i = 1; i < times.length; i++) times[i] = Math.max(times[i], times[i - 1] + 0.12);
    if (p.sound !== "none") times.forEach((s) => ctx.sfx(s, p.sound, 0.3));
    const from = ctx.from ?? 0;
    return {
      draw(t) {
        parts.forEach((e, i) => {
          const a = times[i];
          if (t < from) { e.style.opacity = ""; e.style.scale = ""; return; }
          const q = ML.ease(t, a - 0.06, a + 0.18);
          e.style.visibility = "visible";
          e.style.opacity = (rest + (1 - rest) * q).toFixed(4);
          const s = t <= a ? 1 - pop : 1 - pop + pop * ML.back(t, a, a + 0.3);
          e.style.scale = Math.abs(s - 1) < 1e-5 ? "none" : s.toFixed(5);
        });
      },
    };
  },
});

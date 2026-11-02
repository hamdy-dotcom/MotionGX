// Word illumination: a dim (optionally blurred) sentence lights word by word to full ink as it is read, and stays lit.
// Words are wrapped once (the whole sentence kept as the aria-label). Start: each word at opacity .1–.3 with 0–6 px
// blur. Driven by the voice's word timings (best) or by scene time (word i lights when the run reaches i / n). Smooth:
// each word tweens to opacity 1, blur 0 over ~.25 s, overlapped so ~`front` words are mid-way — a soft reading front.
// Flip (MengTo's explainer "makes" scene): lit = ease(t, said − 0.08, said + 0.12) and the colour switches dim → ink
// (or the accent) at mid-ease, a hard flip. Phrase unit lights a clause at a time. Holds lit to the end; `exit:
// reverse` dims back from the last word.
// Source: MengTo/Skills agent-skills/media/html-explainer-video/demo/film.js#makes (MIT) + editorial-portfolio-chapters
// ARTICLE.md (MIT); our own code.
ML.define({
  id: "text-emphasis.word-illumination",
  category: "text-emphasis",
  name: "Words light up as they are read",
  does: "A dim (optionally blurred) sentence lights word by word to full ink as it is spoken, and stays lit.",
  says: ["story", "focus", "calm", "list"],
  energy: 2,
  targets: ["line", "headline", "word"],
  duration: [1, 8],
  params: {
    drive: { type: "choice", options: ["words", "time"], default: "words" },
    mode: { type: "choice", options: ["smooth", "flip"], default: "smooth" },
    front: { type: "number", range: [1, 5], default: 3 },
    blur: { type: "number", range: [0, 6], default: 4, unit: "px" },
    dim: { type: "number", range: [0.1, 0.3], default: 0.15 },
    "lit-colour": { type: "choice", options: ["ink", "accent"], default: "ink" },
    unit: { type: "choice", options: ["word", "phrase"], default: "word" },
    exit: { type: "choice", options: ["hold", "reverse"], default: "hold" },
  },
  pairs: ["text-in.punchline", "text-emphasis.karaoke-highlight"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:agent-skills/media/html-explainer-video/demo/film.js", license: "MIT", note: "the makes scene's dim → ink flip; also editorial-portfolio-chapters ARTICLE.md; our own code" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", el.textContent.trim().replace(/\s+/g, " "));
    const words = ML.split(el, "words");
    if (!words.length) return null;
    // units: words, or phrases (broken at punctuation, else every ~3 words)
    let units = words.map((w) => [w]);
    if (p.unit === "phrase") {
      units = []; let cur = [];
      words.forEach((w, i) => {
        cur.push(w);
        const stop = /[.,،؛;:!?؟…—-]$/.test(w.textContent.trim());
        if (stop || cur.length >= 3 || i === words.length - 1) { units.push(cur); cur = []; }
      });
    }
    const n = units.length;
    const hold = 0.6, span = Math.max(0.3, end - at - hold - 0.3);
    const stepT = span / n;
    const seen = new Map();
    const times = units.map((g, i) => {
      const fb = at + 0.1 + i * stepT;
      if (p.drive !== "words") return fb;
      const q = ML.plain(g[0].textContent), k = (seen.get(q) || 0) + 1; seen.set(q, k);
      return Math.max(at, ctx.word(g[0].textContent, fb, k));
    });
    for (let i = 1; i < n; i++) times[i] = Math.max(times[i], times[i - 1] + 0.05);
    // smooth: overlap so ~`front` units are mid-transition at once
    const gapAvg = n > 1 ? (times[n - 1] - times[0]) / (n - 1) : 0.25;
    const dur = Math.max(0.25, Math.min(1.2, gapAvg * p.front));
    const lit = p["lit-colour"] === "accent" ? "var(--x-accent)" : "var(--x-ink)";
    const revAt = (i) => end - 0.15 - 0.6 + ((n - 1 - i) / Math.max(1, n - 1)) * 0.45;
    return {
      draw(t) {
        units.forEach((g, i) => {
          const a = times[i];
          let on = p.mode === "flip" ? ML.ease(t, a - 0.08, a + 0.12) : ML.out(t, a, a + dur);
          if (p.exit === "reverse") on *= 1 - ML.ease(t, revAt(i), revAt(i) + 0.25);
          const op = p.mode === "flip" ? 1 : p.dim + (1 - p.dim) * on; // flip dims by colour (var(--x-dim)), smooth by opacity
          const bl = p.blur * (1 - on);
          const colour = p.mode === "flip" ? (on > 0.5 ? lit : "var(--x-dim)") : p["lit-colour"] === "accent" && on > 0.001 ? `color-mix(in srgb, var(--x-accent) ${(on * 100).toFixed(1)}%, var(--x-ink))` : "";
          g.forEach((w) => {
            w.style.opacity = op >= 0.9999 ? "" : op.toFixed(4);
            w.style.filter = bl > 0.01 ? `blur(${bl.toFixed(2)}px)` : "none";
            w.style.color = colour;
          });
        });
      },
    };
  },
});

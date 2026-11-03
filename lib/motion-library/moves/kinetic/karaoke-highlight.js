// Karaoke sentence: the line is split into whole-word spans driven by the voice's word timings. Per frame a word is
// "now" while t is in [start, end + lead_out) → accent; "said" once t ≥ start → ink; else dim. Spans carry radius
// 0.12em and padding 0 0.04em, so the chip variant (accent ground, accent-ink type) sits on the same boxes. Size
// min(7.4cqw, 12.6cqh) (tall: min(9.2cqw, 8.4cqh)), line-height 1.08 — "headline" runs at 80 % of that. The line
// enters with the look's show(), holds for the sentence and leaves with the scene. Words the voice never says get an
// even share of the gap they fall in. RTL-safe: spans are whole words.
// Source: MengTo/Skills html-explainer-video demo/film.js step3 + film.css .s3-line (MIT).
ML.define({
  id: "kinetic.karaoke-highlight",
  category: "kinetic",
  name: "Karaoke sentence with the spoken word lit",
  does: "A big sentence sits on screen in dim ink; each word turns accent as it is spoken and stays ink once said.",
  says: ["time", "focus", "story"],
  energy: 3,
  targets: ["line", "headline", "word"],
  duration: [2, 8],
  params: {
    size: { type: "choice", options: ["hero", "headline"], default: "hero" },
    highlight: { type: "choice", options: ["colour", "chip"], default: "colour" },
    lead_out: { type: "number", range: [0, 0.15], default: 0.06, unit: "s" },
  },
  pairs: ["text-in.punchline", "camera.push-in"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:html-explainer-video/demo/film.js#step3", license: "MIT" },
  setup(ctx) {
    const { el, p, at, end, f } = ctx;
    if (!el) return null;
    // size: the explainer's container-query sizes, in stage px
    const base = f.tall ? Math.min(f.W * 0.092, f.H * 0.084) : Math.min(f.W * 0.074, f.H * 0.126);
    el.style.fontSize = (base * (p.size === "headline" ? 0.8 : 1)).toFixed(2) + "px";
    el.style.lineHeight = "1.08";
    const spans = ML.split(el, "words");
    if (!spans.length) return null;
    spans.forEach((s) => Object.assign(s.style, { borderRadius: "0.12em", padding: "0 0.04em", color: "var(--x-dim)" }));
    // timings: each span matched in order to the voice's words, looking a few words ahead only (a stray match far off
    // must not throw away the rest); the words the voice skips share the gap between their neighbours
    const voice = ctx.words || [];
    let k = 0;
    const span0 = at + 0.2, span1 = Math.max(span0 + 0.4, end - 0.6);
    while (k < voice.length && voice[k].t < at - 0.05) k++;
    const times = spans.map((s) => {
      const q = ML.plain(s.textContent);
      if (!q) return null;
      const stop = Math.min(voice.length, k + 5), same = (a, b) => a === b || (Math.min(a.length, b.length) >= 3 && (a.includes(b) || b.includes(a)));
      for (const test of [(w) => w === q, (w) => same(w, q)]) for (let j = k; j < stop; j++) {
        const w = ML.plain(voice[j].w);
        if (w && voice[j].t < end && test(w)) { k = j + 1; return [voice[j].t, voice[j].e ?? voice[j].t + 0.3]; }
      }
      return null;
    });
    for (let i = 0; i < times.length; i++) {
      if (times[i]) continue;
      let n = i; while (n < times.length && !times[n]) n++;
      const a = i ? times[i - 1][1] : span0, b = n < times.length ? times[n][0] : Math.max(a + 0.2 * (n - i), span1), share = (b - a) / (n - i);
      for (let m = i; m < n; m++) times[m] = [a + (m - i) * share, a + (m - i + 0.85) * share];
    }
    for (let i = 1; i < times.length; i++) if (times[i][0] < times[i - 1][0]) times[i] = [times[i - 1][0] + 0.05, Math.max(times[i - 1][0] + 0.3, times[i][1])];
    times.forEach(([a], i) => i % 3 === 0 && ctx.sfx(a, "tap", 0.12));
    const chip = p.highlight === "chip";
    return {
      draw(t) {
        ML.show(el, t, at, end - 0.25);
        spans.forEach((s, i) => {
          const [a, b] = times[i];
          const now = t >= a && t < b + p.lead_out, said = t >= a;
          s.style.color = now ? (chip ? "var(--x-accent-ink)" : "var(--x-accent)") : said ? "var(--x-ink)" : "var(--x-dim)";
          s.style.background = now && chip ? "var(--x-accent)" : "transparent";
        });
      },
    };
  },
});

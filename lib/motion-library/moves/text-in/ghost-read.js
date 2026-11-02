// Ghost read-in: every word sits at its final place from the first frame (layout never changes), faint, and lights up
// to full ink as the voice reads it. Ported from MengTo/Skills scroll-scrubbed-word-reveal (MIT): whole-word tokens
// from a walk over the text nodes (so <em> / <strong> keep their styling, whitespace kept), per word progress wp →
// opacity hidden + wp·(1 − hidden), blur (1 − wp)·blur, translateY (1 − wp)·offset em; the reading head with
// ~`overlap` words mid-transition. Here the head is driven by time: per spoken word wp = clamp((t − tᵢ + 0.15) / 0.35),
// or linear across the move. Variants: two-step (ghost → grey 0.55 → ink) and arrive-grey (each word fades in grey and
// brightens when the next arrives); the end either brings all to ink or keeps the contrast clause (after the last
// comma) grey.
// Source: MengTo/Skills agent-skills/web-design/scroll-scrubbed-word-reveal (MIT) + prompt-motion references.
ML.define({
  id: "text-in.ghost-read",
  category: "text-in",
  name: "Ghost read-in",
  does: "The whole line sits faint (or each word arrives grey) and the words light up to full ink one by one as the voice reads them.",
  says: ["story", "focus", "calm", "reveal"],
  energy: 2,
  targets: ["headline", "line", "word"],
  duration: [1, 8],
  params: {
    hidden: { type: "number", range: [0, 0.3], default: 0.15 },
    blur: { type: "number", range: [0, 10], default: 4, unit: "px" },
    offset: { type: "number", range: [0, 0.22], default: 0.12, unit: "em" },
    overlap: { type: "number", range: [1, 4], default: 2.4, unit: "words" },
    driver: { type: "choice", options: ["spoken", "linear"], default: "spoken" },
    stages: { type: "choice", options: ["direct", "two-step", "arrive-grey"], default: "direct" },
    end: { type: "choice", options: ["all-ink", "keep-contrast"], default: "all-ink" },
  },
  pairs: ["text-emphasis.highlighter", "text-emphasis.accent-word"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:web-design/scroll-scrubbed-word-reveal", license: "MIT" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const words = ML.split(el, "words"), n = words.length;
    if (!n) return null;
    // per word: the time it is read
    const span = Math.max(0.6, Math.min(end - 0.6, at + n * 0.32) - at);
    const tw = words.map((w, i) => (p.driver === "spoken" ? Math.max(at, ctx.word(w.textContent, at + (i * span) / n)) : at + (i * span) / n));
    for (let i = 1; i < n; i++) tw[i] = Math.max(tw[i], tw[i - 1] + 0.05);
    const readEnd = at + span;
    // the contrast clause: words after the last comma stay grey (keep-contrast)
    let cut = n;
    if (p.end === "keep-contrast") for (let i = n - 2; i >= 0; i--) if (/[,،;؛—–]$/.test(words[i].textContent)) { cut = i + 1; break; }
    const finalAt = Math.max(readEnd, tw[n - 1]) + 0.45;
    words.forEach((w, i) => i % 3 === 0 && ctx.sfx(tw[i], "tap", 0.12));
    const grey = (k) => (k >= 1 ? "" : `color-mix(in srgb, var(--x-ink) ${(k * 100).toFixed(1)}%, var(--x-dim))`);
    const p2 = (x) => 1 - (1 - x) * (1 - x);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        el.style.opacity = (1 - leave).toFixed(4);
        // the linear reading head (MengTo's head, run on time): ~overlap words mid-transition
        const head = ML.lin(t, at, readEnd) * (n + p.overlap);
        words.forEach((w, i) => {
          const contrast = i >= cut;
          let op, blur, y, col = "";
          if (p.stages === "arrive-grey") {
            const a = ML.lin(t, tw[i], tw[i] + 0.15);
            const nextT = i < n - 1 ? tw[i + 1] : tw[i] + 0.15; // the last (payoff) word lands bright
            const b = contrast ? 0 : Math.max(ML.lin(t, nextT, nextT + 0.3), p.end === "all-ink" ? ML.lin(t, finalAt, finalAt + 0.4) : 0);
            op = a * (0.45 + 0.55 * b); blur = 0; y = (1 - a) * 10; col = grey(b);
            w.style.translate = `0 ${y.toFixed(2)}px`;
          } else {
            const wp = p.driver === "spoken" ? ML.clamp((t - tw[i] + 0.15) / 0.35) : ML.clamp((head - i) / p.overlap);
            if (p.stages === "two-step") {
              const s1 = ML.clamp(wp / 0.4), s2 = p2(ML.lin(t, (p.driver === "spoken" ? tw[i] : at + ((i + p.overlap * 0.4) / (n + p.overlap)) * span) + 0.2, (p.driver === "spoken" ? tw[i] : at + ((i + p.overlap * 0.4) / (n + p.overlap)) * span) + 0.65));
              op = p.hidden + s1 * (0.55 - p.hidden) + s2 * 0.45; blur = (1 - s1) * Math.max(3, p.blur); y = (1 - s1) * p.offset;
              col = contrast ? grey(0) : grey(s2);
            } else {
              op = p.hidden + wp * (1 - p.hidden); blur = (1 - wp) * p.blur; y = (1 - wp) * p.offset;
              col = contrast ? grey(0) : "";
            }
            w.style.translate = y > 0.0005 ? `0 ${y.toFixed(4)}em` : "none";
          }
          if (contrast) { op = Math.min(op, 0.75); w.style.fontWeight = "300"; }
          w.style.opacity = op.toFixed(4);
          w.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
          w.style.color = col;
        });
      },
    };
  },
});

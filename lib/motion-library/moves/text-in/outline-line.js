// Outline line: a line set in outline-only type (a thin stroke, no fill) rises in under a solid headline — as one line
// from its mask, word by word, or letter by letter clipped at the baseline so letters show half-height mid-rise
// (letters stay whole words in Arabic) — and may fill to solid on a later beat. The solid / outline pair is the read.
// Source: our own rebuild of prompt-motion "blue-clarity-ok-so-seeing-lots" + "oliahmed205-just-tried-opus-5-5" —
// reference only.
ML.define({
  id: "text-in.outline-line",
  category: "text-in",
  name: "Outline line",
  does: "A line in outline-only type rises in under a solid headline (letter by letter or from a mask), and may fill to solid on a beat.",
  says: ["arrival", "story", "brand", "focus", "calm"],
  energy: 3,
  targets: ["line", "word", "headline"],
  duration: [0.5, 2],
  params: {
    stroke: { type: "number", range: [1, 3], default: 1.5, unit: "px" },
    ink: { type: "choice", options: ["ink", "accent"], default: "ink" },
    split: { type: "choice", options: ["line", "words", "letters"], default: "line" },
    delay: { type: "number", range: [0, 0.4], default: 0.15, unit: "s" },
    fill_on_beat: { type: "bool", default: false },
    stagger: { type: "number", range: [0, 0.06], default: 0.04, unit: "s" },
    knockout: { type: "bool", default: true },
  },
  pairs: ["text-in.mask-rise", "text-in.punchline"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:blue-clarity-ok-so-seeing-lots", license: "reference", note: "also oliahmed205-just-tried-opus-5-5; our own code" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const doc = el.ownerDocument;
    const fs = parseFloat(getComputedStyle(el).fontSize) || 100;
    const colour = p.ink === "accent" ? "var(--x-accent)" : "var(--x-ink)";
    // the stroke is given at ~80 px type; bigger type keeps the same look
    const sw = p.stroke * Math.max(1, fs / 80);
    // knockout: the stroke is painted under a ground-coloured fill (paint-order), so the overlapping contours of a
    // variable font never show inside the letters; the stroke is doubled because the fill covers its inner half
    const hollow = p.knockout ? "var(--x-ground)" : "transparent";
    el.style.webkitTextStroke = `${(sw * (p.knockout ? 2 : 1)).toFixed(2)}px ${colour}`;
    if (p.knockout) el.style.paintOrder = "stroke fill";
    el.style.color = hollow;
    // masks: a block for the whole line, inline-blocks for words / letters; clipped at the baseline
    const maskCss = (block) => ({ display: block ? "block" : "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.2em 0.06em 0.22em", margin: "-0.2em -0.06em -0.22em" });
    const wrap = (node, block) => { const m = doc.createElement(block ? "div" : "span"); Object.assign(m.style, maskCss(block)); node.parentNode.insertBefore(m, node); m.append(node); return m; };
    let units;
    if (p.split === "line") {
      const inner = doc.createElement("span");
      inner.style.display = "inline-block";
      while (el.firstChild) inner.append(el.firstChild);
      const m = doc.createElement("div"); Object.assign(m.style, maskCss(true)); m.append(inner); el.append(m);
      units = [inner];
    } else if (p.split === "words") {
      units = ML.split(el, "words");
      units.forEach((w) => wrap(w, false));
    } else {
      units = ML.split(el, "chars");
      units.forEach((c) => wrap(c, false));
    }
    const start = at + p.delay;
    const times = units.map((_, i) => start + i * (p.split === "line" ? 0 : p.split === "words" ? Math.max(p.stagger, 0.06) : p.stagger));
    const landed = times[times.length - 1] + 0.3;
    // the fill lands on a later beat: the line's last spoken word, at least 0.4 s after the rise
    const lastWord = (el.textContent || "").trim().split(/\s+/).pop() || "";
    const fillAt = p.fill_on_beat ? Math.min(Math.max(landed + 0.4, ctx.word(lastWord, landed + 0.6)), Math.max(landed + 0.1, end - 0.4)) : Infinity;
    ctx.sfx(start, "whoosh.soft", 0.3);
    if (p.fill_on_beat) ctx.sfx(fillAt, "pop.soft", 0.3);
    const rise = 1.35; // a share of the unit's own height: hidden under the baseline
    return {
      draw(t) {
        units.forEach((u, i) => {
          const e = ML.out(t, times[i], times[i] + (p.split === "line" ? 0.5 : 0.3));
          u.style.translate = `0 ${((1 - e) * rise * 100).toFixed(3)}%`;
          u.style.opacity = (p.split === "line" ? 1 : ML.clamp((t - times[i]) / 0.3)).toFixed(4);
          u.style.visibility = t >= times[i] - 1e-6 ? "visible" : "hidden";
        });
        const f = ML.ease(t, fillAt, fillAt + 0.3);
        el.style.color = f > 0.001 ? `color-mix(in srgb, ${colour} ${(f * 100).toFixed(1)}%, ${hollow})` : hollow;
      },
    };
  },
});

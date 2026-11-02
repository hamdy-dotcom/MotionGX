// Tonal line contrast: a multi-line headline where one line sits in the look's dim tone (var(--x-dim), the neutral-400
// of the book index) while the others are full ink, so the outer lines carry the meaning. The lines come in by a masked
// line rise (each line slides up out of its own clip, 0.1 s apart, cubic-bezier(0.22, 1, 0.36, 1)). Optional beat: the
// dim line lights dim → ink over 0.5 s on its spoken word. A one-line headline is broken into balanced lines so there
// is a line to dim. Whole words only, so Arabic stays joined; lines keep the target's own alignment.
// Source: MengTo/Skills agent-skills/web-design/book-serif-index/demo/index.html (MIT) — the dim second title line.
ML.define({
  id: "text-emphasis.tonal-line-contrast",
  category: "text-emphasis",
  name: "One line set dim",
  does: "One line of a multi-line headline sits in a dimmer tone so the outer lines carry the meaning; optionally it lights up on its spoken word.",
  says: ["focus", "story", "precision"],
  energy: 1,
  targets: ["headline", "line"],
  duration: [1, 6],
  params: {
    line: { type: "number", range: [1, 4], default: 2 },
    "light-on-beat": { type: "bool", default: false },
    rise: { type: "bool", default: true },
    stagger: { type: "number", range: [0, 0.25], default: 0.1, unit: "s" },
    lines: { type: "number", range: [2, 4], default: 2 },
  },
  pairs: ["text-in.punchline", "text-emphasis.accent-word"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:agent-skills/web-design/book-serif-index/demo/index.html", license: "MIT", note: "the dim title line; our own code" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const words = ML.split(el, "words");
    if (!words.length) return null;
    // group the words into the lines they sit on
    let lines = [];
    for (const w of words) {
      const top = w.offsetTop, last = lines[lines.length - 1];
      if (last && Math.abs(last.top - top) < w.offsetHeight * 0.5) last.words.push(w);
      else lines.push({ top, words: [w] });
    }
    lines = lines.map((l) => l.words);
    const h0 = el.offsetHeight;
    let forced = false;
    // one line only: balance the words over `lines` lines (by length) so one of them can be dim
    if (lines.length < 2 && words.length > 1) {
      const n = Math.min(words.length, Math.round(p.lines));
      const len = words.map((w) => ML.plain(w.textContent).length + 1), total = len.reduce((a, b) => a + b, 0);
      lines = Array.from({ length: n }, () => []);
      let acc = 0;
      words.forEach((w, i) => { const k = Math.min(n - 1, Math.floor(((acc + len[i] / 2) / total) * n)); lines[k].push(w); acc += len[i]; });
      lines = lines.filter((l) => l.length);
      forced = lines.length > 1;
    }
    // rebuild: each line a clip (the mask) holding an inner block that rises
    el.textContent = "";
    const rows = lines.map((ws) => {
      const clip = document.createElement("span"), inner = document.createElement("span");
      Object.assign(clip.style, { display: "block", overflow: "hidden", paddingBottom: "0.12em", marginBottom: "-0.12em" });
      inner.style.display = "inline-block";
      ws.forEach((w, i) => { if (i) inner.append(" "); inner.append(w); });
      clip.append(inner); el.append(clip);
      return { clip, inner, ws };
    });
    // forced lines must still fit the room the headline had (its band, less its neighbours)
    if (forced && el.parentElement) {
      const P = el.parentElement, cs = getComputedStyle(P);
      const sibs = [...P.children].filter((c) => c !== el && getComputedStyle(c).position !== "absolute");
      const gap = parseFloat(cs.rowGap) || 0;
      const room = Math.max(h0, P.clientHeight - sibs.reduce((a, c) => a + c.offsetHeight, 0) - gap * sibs.length);
      for (let i = 0; i < 2 && el.offsetHeight > room + 1; i++) el.style.fontSize = ((parseFloat(getComputedStyle(el).fontSize) * room) / el.offsetHeight).toFixed(2) + "px";
    }
    const k = Math.min(rows.length, Math.max(1, Math.round(p.line))) - 1;
    const dimRow = rows[k];
    const beat = p["light-on-beat"] ? Math.max(at + 0.4, ctx.word(dimRow.ws[0].textContent, at + (end - at) * 0.5)) : Infinity;
    const starts = rows.map((_, i) => at + i * p.stagger);
    if (p.rise) ctx.sfx(at, "whoosh.soft", 0.2);
    if (beat < end) ctx.sfx(beat, "blip", 0.2);
    return {
      draw(t) {
        const leave = ML.ease(t, end - 0.3, end - 0.05);
        el.style.opacity = (1 - leave).toFixed(4);
        rows.forEach((r, i) => {
          const u = p.rise ? ML.land(t, starts[i], starts[i] + 0.6) : 1;
          r.inner.style.translate = u >= 1 ? "none" : `0 ${((1 - u) * 110).toFixed(2)}%`;
        });
        const lit = ML.lin(t, beat, beat + 0.5);
        const e = lit < 0.5 ? 2 * lit * lit : 1 - Math.pow(-2 * lit + 2, 2) / 2;
        dimRow.inner.style.color = e <= 0 ? "var(--x-dim)" : e >= 1 ? "" : `color-mix(in srgb, var(--x-ink) ${(e * 100).toFixed(1)}%, var(--x-dim))`;
      },
    };
  },
});

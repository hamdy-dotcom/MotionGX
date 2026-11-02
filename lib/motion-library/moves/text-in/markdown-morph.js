// Markdown render morph: the raw source of the headline types in grey mono (markup characters in accent, a 2 px
// accent caret), then renders: the mono letters blur and fade while each throws 2-4 small markup glyphs outward
// (seeded), and the styled headline fades in at the same centre and rises into place; the marked last word lands in
// accent italic, its letters rippling in on a small wave, and a tilted "**bold**" chip floats in at a corner.
// Works as code -> UI (JSX) or html -> page too. Latin only: the source characters are typed one by one.
// Source: our own rebuild of prompt-motion "ho-ba-i-made-this-using" — reference only.
ML.define({
  id: "text-in.markdown-morph",
  category: "text-in",
  name: "Markdown render morph",
  does: "Raw markdown types in grey mono, then its symbols burst away and the text re-forms as the rendered, styled headline.",
  says: ["change", "simplicity", "tech", "before-after"],
  energy: 3,
  targets: ["headline", "word", "line"],
  duration: [2, 5],
  params: {
    syntax: { type: "choice", options: ["markdown", "code", "html"], default: "markdown" },
    rate: { type: "number", range: [6, 14], default: 9, unit: "chars/s" },
    particles: { type: "bool", default: true },
    shift: { type: "number", range: [0, 60], default: 30, unit: "px" },
    chip: { type: "bool", default: true },
    italic_last: { type: "bool", default: true },
  },
  pairs: ["text-emphasis.accent-word", "ui.typing-window"],
  avoid: ["luxury", "calm"],
  rtl: false,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "prompt-motion:ho-ba-i-made-this-using", license: "reference", note: "our own code" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const doc = el.ownerDocument;
    const mk = (tag, css, text) => { const n = doc.createElement(tag); Object.assign(n.style, css); if (text != null) n.textContent = text; return n; };
    const text = (el.textContent || "").trim().replace(/\s+/g, " ");
    const words = text.split(" ");
    const last = p.italic_last && words.length > 1 ? words.pop() : "";
    const head = words.join(" ");

    // the source, as [text, isMarkup] runs
    const runs =
      p.syntax === "code" ? [["<Title>", 1], [head, 0], ...(last ? [[" ", 0], ["<em>", 1], [last, 0], ["</em>", 1]] : []), ["</Title>", 1]]
      : p.syntax === "html" ? [["<h1>", 1], [head, 0], ...(last ? [[" ", 0], ["<i>", 1], [last, 0], ["</i>", 1]] : []), ["</h1>", 1]]
      : [["# ", 1], [head, 0], ...(last ? [[" ", 0], ["*", 1], [last, 0], ["*", 1]] : [])];
    const glyphs = p.syntax === "markdown" ? ["#", "*", "~", "_"] : ["<", ">", "/", "{", "}"];
    const chipText = p.syntax === "markdown" ? "**bold**" : p.syntax === "code" ? "</>" : "<h1>";

    // layout: the rendered headline stays in flow (the slot keeps its size); the source sits over it, centred
    const base = parseFloat(getComputedStyle(el).fontSize) || 100;
    el.textContent = "";
    el.style.position = "relative";
    const rendered = mk("span", { display: "inline-block", position: "relative" });
    const headSpan = mk("span", {}, head);
    rendered.append(headSpan);
    let lastChars = [];
    if (last) {
      rendered.append(" ");
      const em = mk("span", { display: "inline-block", fontStyle: "italic", color: "var(--x-accent)", whiteSpace: "nowrap" });
      lastChars = Array.from(last).map((ch) => { const c = mk("span", { display: "inline-block" }, ch); em.append(c); return c; });
      rendered.append(em);
    }
    el.append(rendered);
    const layer = mk("div", { position: "absolute", left: "0", right: "0", top: "50%", height: "0", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", overflow: "visible" });
    const src = mk("div", { position: "relative", whiteSpace: "pre", font: `500 ${(base * 0.4).toFixed(1)}px/1.2 var(--x-mono-font)`, letterSpacing: "0", color: "var(--x-dim)", textTransform: "none" });
    const chars = [];
    for (const [s, m] of runs) for (const ch of Array.from(s)) { const c = mk("span", { display: "inline-block", whiteSpace: "pre", color: m ? "var(--x-accent)" : "inherit" }, ch); chars.push(c); src.append(c); }
    const caret = mk("span", { position: "absolute", top: "0.1em", width: "2px", height: "1em", background: "var(--x-accent)" });
    src.append(caret);
    layer.append(src);
    el.append(layer);
    ML.fit(src, el.clientWidth * 0.94);
    const srcSize = parseFloat(src.style.fontSize || getComputedStyle(src).fontSize);
    const pos = chars.map((c) => ({ x: c.offsetLeft, y: c.offsetTop, w: c.offsetWidth, h: c.offsetHeight }));

    // particles: 2-4 markup glyphs per source character, bursting 20-40 px (relative to the type) and fading in 0.4 s
    const k = srcSize / 32;
    const parts = [];
    if (p.particles) chars.forEach((c, i) => {
      const n = 2 + Math.floor(ML.rnd(i, 3) * 3);
      for (let j = 0; j < n; j++) {
        const a = ML.rnd(i * 7 + j, 11) * Math.PI * 2, d = (20 + ML.rnd(i * 7 + j, 13) * 20) * k;
        const g = mk("span", { position: "absolute", left: `${(pos[i].x + pos[i].w / 2).toFixed(1)}px`, top: `${(pos[i].y + pos[i].h / 2).toFixed(1)}px`, font: `600 ${(10 * k * 1.2).toFixed(1)}px var(--x-mono-font)`, color: "color-mix(in srgb, var(--x-accent) 60%, transparent)", opacity: "0", translate: "-50% -50%" }, glyphs[Math.floor(ML.rnd(i * 7 + j, 17) * glyphs.length)]);
        src.append(g);
        parts.push({ g, dx: Math.cos(a) * d, dy: Math.sin(a) * d, rot: (ML.rnd(i * 7 + j, 19) - 0.5) * 160, lag: ML.rnd(i * 7 + j, 23) * 0.08 });
      }
    });

    let chip = null;
    if (p.chip) {
      chip = mk("span", { position: "absolute", top: "0", right: "0", translate: "30% -70%", padding: "0.35em 0.7em", font: `600 ${Math.max(14, base * 0.2).toFixed(1)}px var(--x-mono-font)`, color: "var(--x-accent-ink)", background: "var(--x-accent)", borderRadius: "var(--x-radius-s)", boxShadow: "var(--x-shadow)", rotate: "-8deg", opacity: "0", letterSpacing: "0" }, chipText);
      rendered.append(chip);
    }

    // timing: typing at `rate` (faster if the scene is short), a short hold, then the render
    const n = chars.length;
    const room = Math.max(1, (end - at) * 0.55);
    const rate = Math.max(p.rate, n / room);
    const typeEnd = at + n / rate;
    const rnd0 = typeEnd + 0.3;
    for (let i = 0; i < n; i += 3) ctx.sfx(at + i / rate, "key", 0.16);
    ctx.sfx(rnd0, "whoosh.soft", 0.35);
    ctx.sfx(rnd0 + 0.35, "pop.soft", 0.25);
    const caretAt = (i) => (i <= 0 ? 0 : pos[i - 1].x + pos[i - 1].w);
    return {
      draw(t) {
        // the source: typed, then blurring away on the render
        const shown = t < at ? 0 : Math.min(n, Math.floor((t - at) * rate + 1e-6));
        const gone = ML.lin(t, rnd0, rnd0 + 0.35);
        chars.forEach((c, i) => { c.style.visibility = i < shown ? "visible" : "hidden"; });
        src.style.opacity = (1 - gone).toFixed(4);
        src.style.filter = gone > 0.001 ? `blur(${(gone * 4).toFixed(2)}px)` : "none";
        src.style.visibility = gone >= 1 ? "hidden" : "visible";
        layer.style.visibility = t < at - 0.001 ? "hidden" : "visible";
        caret.style.left = `${caretAt(shown).toFixed(1)}px`;
        caret.style.opacity = t < at || gone > 0 ? "0" : t < typeEnd ? "1" : String(ML.blink(t - typeEnd + 0.01, 0.6));
        for (const q of parts) {
          const u = ML.lin(t, rnd0 + q.lag, rnd0 + q.lag + 0.4);
          const e = 1 - Math.pow(1 - u, 3);
          q.g.style.opacity = u > 0 && u < 1 ? (1 - u).toFixed(4) : "0";
          q.g.style.transform = `translate(${(q.dx * e).toFixed(2)}px, ${(q.dy * e).toFixed(2)}px) rotate(${(q.rot * e).toFixed(1)}deg)`;
        }
        // the rendered headline: fades / unblurs at the same centre, then rises `shift` px into place
        const a = ML.lin(t, rnd0 + 0.05, rnd0 + 0.4);
        const rise = ML.land(t, rnd0 + 0.25, rnd0 + 0.85);
        rendered.style.opacity = a.toFixed(4);
        rendered.style.filter = a < 1 ? `blur(${((1 - a) * 8).toFixed(2)}px)` : "none";
        rendered.style.translate = `0 ${((1 - rise) * p.shift * (base / 100)).toFixed(2)}px`;
        lastChars.forEach((c, i) => {
          const u = ML.out(t, rnd0 + 0.3 + i * 0.045, rnd0 + 0.75 + i * 0.045);
          c.style.translate = `0 ${((1 - u) * base * 0.28 + Math.sin(i * 1.3 + t * 9) * (1 - u) * base * 0.06).toFixed(2)}px`;
          c.style.opacity = u.toFixed(4);
        });
        if (chip) {
          const c = ML.back(t, rnd0 + 0.6, rnd0 + 1.05, 1.8);
          chip.style.opacity = ML.lin(t, rnd0 + 0.6, rnd0 + 0.75).toFixed(4);
          chip.style.translate = `30% ${(-70 + (1 - c) * 60).toFixed(2)}%`;
          chip.style.rotate = `${(-8 - (1 - c) * 10).toFixed(2)}deg`;
        }
      },
    };
  },
});

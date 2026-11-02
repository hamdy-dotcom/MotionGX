// Wipe on: a line — or a stack of headings / list items — is revealed from the reading start behind a moving edge
// while the type itself never moves. Hard edge: clip-path inset(0 100% 0 0) → inset(0) on cubic-bezier(.22,.61,.36,1),
// items 0.07 s apart. Feathered edge: a mask gradient with a 0–40 % feather travels across so letters come out of a
// soft fade, ease-out. Then, optionally, one item is emphasised without moving the layout — it thickens (a growing
// text stroke in its own colour, so widths never change), gains an accent underline, or takes the accent tone — while
// the others dim to .35. Whole words only (nothing is split): Arabic safe; the edge starts on the right in RTL.
// Source: prompt-motion:ismailfahmi-bikin-showreel-15-detik + MengTo/Skills editorial-portfolio-chapters (MIT) — our code.
ML.define({
  id: "text-in.wipe-on",
  category: "text-in",
  name: "Wipe on",
  does: "A line or a stack of headings is revealed from its reading start behind a moving edge — hard clip or a soft feathered fade — without the type itself moving.",
  says: ["reveal", "list", "calm", "precision", "choice"],
  energy: 2,
  targets: ["line", "headline", "list", "label"],
  duration: [0.9, 2.5],
  params: {
    edge: { type: "choice", options: ["hard", "feathered"], default: "hard" },
    feather: { type: "number", range: [0, 40], default: 20, unit: "%" },
    duration: { type: "number", range: [0.4, 1.2], default: 0.6, unit: "s" },
    stagger: { type: "number", range: [0, 0.15], default: 0.07, unit: "s" },
    from: { type: "choice", options: ["reading-start", "left", "right"], default: "reading-start" },
    emphasis: { type: "choice", options: ["none", "weight", "underline", "tone"], default: "none" },
    items: { type: "number", range: [1, 6], default: 1 },
    focus: { type: "number", range: [1, 6], default: 1 },
  },
  pairs: ["text-emphasis.dim-out", "text-emphasis.underline-draw"],
  avoid: ["energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:editorial-portfolio-chapters", license: "MIT", note: "clip-path heading wipe; the feathered mask variant after prompt-motion ismailfahmi (reference, our code)" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    // the items: a list's own children, or the line split into a stack of headings, or the whole line
    const origH = el.offsetHeight, align = getComputedStyle(el).textAlign;
    let items = [...el.children].filter((c) => c.nodeType === 1);
    if (items.length < 2) {
      const words = (el.textContent || "").trim().split(/\s+/).filter(Boolean);
      const n = Math.max(1, Math.min(Math.round(p.items), words.length));
      if (n > 1) {
        el.textContent = "";
        const per = Math.ceil(words.length / n);
        items = [];
        // each heading's box hugs its words, so the edge never spends its time on empty margin and an underline fits
        const hug = `width:fit-content;max-width:100%;margin-inline:${align === "center" ? "auto" : align === "end" || (align === "right" && !rtl) || (align === "left" && rtl) ? "auto 0" : "0 auto"}`;
        for (let i = 0; i < words.length; i += per) { const d = document.createElement("div"); d.style.cssText = hug; d.textContent = words.slice(i, i + per).join(" "); el.append(d); items.push(d); }
        // the stack may grow a little past the slot's own height, never far past the headline band
        const maxH = Math.max(origH * 1.25, ctx.f.head.h * 0.66), h = el.offsetHeight;
        if (h > maxH) el.style.fontSize = ((parseFloat(getComputedStyle(el).fontSize) * maxH) / h).toFixed(1) + "px";
      } else {
        const inner = document.createElement("span");
        inner.style.cssText = "display:inline-block;max-width:100%";
        while (el.firstChild) inner.append(el.firstChild);
        el.append(inner); items = [inner];
      }
    }
    const fromRight = p.from === "right" || (p.from === "reading-start" && rtl);
    const fi = Math.round(ML.clamp(p.focus, 1, items.length)) - 1;
    const curve = ML.bezier(0.22, 0.61, 0.36, 1);
    const fs = parseFloat(getComputedStyle(el).fontSize) || 60;
    const T = items.map((it, i) => ({ it, t: at + i * p.stagger }));
    const done = T[T.length - 1].t + p.duration;
    let bar = null;
    if (p.emphasis === "underline") {
      const it = items[fi];
      if (getComputedStyle(it).position === "static") it.style.position = "relative";
      bar = document.createElement("span");
      bar.style.cssText = `position:absolute;left:0;right:0;bottom:-0.06em;height:${Math.max(3, fs * 0.05).toFixed(1)}px;background:var(--x-accent);border-radius:var(--x-radius-s);transform-origin:${fromRight ? "100%" : "0%"} 50%;scale:0 1;pointer-events:none`;
      it.append(bar);
    }
    ctx.sfx(at, "whoosh.soft", 0.3);
    if (p.emphasis !== "none") ctx.sfx(done + 0.1, "tap", 0.2);
    const ink = getComputedStyle(items[fi]).color;
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        el.style.opacity = (1 - leave).toFixed(4);
        const em = p.emphasis === "none" ? 0 : ML.ease(t, done + 0.1, done + 0.3);
        T.forEach(({ it, t: a }, i) => {
          const s = it.style;
          if (p.edge === "hard") {
            const u = curve(ML.lin(t, a, a + p.duration)), hide = ((1 - u) * 100).toFixed(2);
            s.clipPath = u >= 1 ? "none" : fromRight ? `inset(-25% -2% -25% ${hide}%)` : `inset(-25% ${hide}% -25% -2%)`;
            s.opacity = t >= a ? "1" : "0";
          } else {
            const u = ML.out(t, a, a + p.duration), fe = p.feather, pos = -fe + (100 + 2 * fe) * u;
            const g = `linear-gradient(${fromRight ? 270 : 90}deg, #000 ${(pos - fe).toFixed(2)}%, transparent ${pos.toFixed(2)}%)`;
            s.webkitMaskImage = u >= 1 ? "none" : g; s.maskImage = u >= 1 ? "none" : g;
            s.maskClip = "no-clip"; // Arabic's marks reach past the box: the mask must not cut them
            s.opacity = t >= a ? "1" : "0";
          }
          // the emphasis: the chosen item changes, the rest dim — widths never change
          if (p.emphasis !== "none" && items.length > 1 && i !== fi) s.opacity = t >= a ? (1 - 0.65 * em).toFixed(4) : "0";
          if (i === fi) {
            if (p.emphasis === "weight") s.webkitTextStroke = em > 0 ? `${(em * 0.035).toFixed(4)}em currentColor` : "";
            if (p.emphasis === "tone") s.color = em > 0 ? `color-mix(in srgb, var(--x-accent) ${(em * 100).toFixed(1)}%, ${ink})` : "";
          }
        });
        if (bar) bar.style.scale = `${em.toFixed(4)} 1`;
      },
    };
  },
});

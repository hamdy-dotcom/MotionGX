// Sans + serif pair: the headline is set as two lines in contrasting voices — a heavy sans line answered by an italic
// display-serif line in the accent, about 1.2x the size (or the reverse order) — and the second voice arrives 0.2–0.6 s
// after the first settles: mask rise (y 100% → 0 inside a clip with a slight blur at the start, 0.5 s
// cubic-bezier(.22,1,.36,1)), per-word rise (y 16 px, blur 8 → 0, power3.out, staggered), a letter clip reveal (each
// letter un-clipped bottom-up with a little rise; Arabic words whole) or a pop (y 30 → 0, back.out(1.2) 0.4 s).
// Layouts: stacked, overlap (the second voice tucked over the first line's lower end by the overlap %), or the same
// baseline (before / after: "One brief. Twelve ads."). Optional tracked eyebrow first and a hairline underline drawing
// under the second voice. Exit: both lines blur out upward together. The serif voice reads --x-serif-font when a look
// sets one (else the generic serif); Arabic never takes a fake italic: its second voice is that serif's Arabic face
// (Naskh in the base look), upright. The mask is a clip on the line's own box, lifted once it lands, so the same-baseline
// layout keeps a true baseline and Arabic's marks are never cut.
// Source: prompt-motion references (johnsavage, agonaliu, cansincengiz, utopyaszx, roundtablespace, quickdesignio,
// amitsingha89) — reference only, our own code.
ML.define({
  id: "text-in.type-pair",
  category: "text-in",
  name: "Sans + serif pair",
  does: "A heavy sans line is answered by an elegant italic serif line (or the reverse), the type contrast itself carrying the meaning.",
  says: ["story", "luxury", "calm", "brand", "result", "before-after"],
  energy: 2,
  targets: ["headline", "line", "label"],
  duration: [1.4, 3],
  params: {
    order: { type: "choice", options: ["sans-then-serif", "serif-then-sans"], default: "sans-then-serif" },
    layout: { type: "choice", options: ["stacked", "overlap", "same-baseline"], default: "stacked" },
    overlap: { type: "number", range: [0, 40], default: 0, unit: "%" },
    line2_in: { type: "choice", options: ["mask-rise", "word-rise", "letter-clip", "pop"], default: "mask-rise" },
    gap: { type: "number", range: [0.2, 0.6], default: 0.4, unit: "s" },
    size_ratio: { type: "number", range: [0.7, 1.3], default: 1.2, unit: "x" },
    stagger: { type: "number", range: [0, 0.15], default: 0.1, unit: "s" },
    underline: { type: "bool", default: false },
    eyebrow: { type: "bool", default: false },
    eyebrow_text: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "text-emphasis.underline-draw"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:johnsavage-ai-opus-5-5-prompt-make", license: "reference", note: "our own rebuild of the sans + serif pairing seen across 7 references" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const words = (el.textContent || "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return null;
    const origH = el.offsetHeight;
    const arabic = ML.ARABIC.test(el.textContent);
    const cut = Math.max(1, Math.ceil(words.length / 2));
    const parts = [words.slice(0, cut), words.slice(cut)].filter((x) => x.length);
    const fsz = parseFloat(getComputedStyle(el).fontSize) || 100;
    const align = getComputedStyle(el).textAlign;
    el.textContent = "";
    el.style.position = "relative";
    const same = p.layout === "same-baseline" && parts.length > 1;
    if (same) { el.style.whiteSpace = "nowrap"; }
    let eyebrow = null;
    const eyebrowAr = arabic || ML.ARABIC.test(p.eyebrow_text || "");
    if (p.eyebrow) {
      eyebrow = document.createElement("div");
      eyebrow.style.cssText = `font:var(--x-label-weight) ${Math.max(16, fsz * 0.16).toFixed(1)}px var(--x-label-font);letter-spacing:${eyebrowAr ? "0" : "0.4em"};text-transform:${eyebrowAr ? "none" : "var(--x-label-case)"};color:var(--x-accent);margin-bottom:0.9em`;
      eyebrow.textContent = p.eyebrow_text || "— ✦ —";
      el.append(eyebrow);
    }
    // the two voices
    const sans = `font-family:var(--x-head-font);font-weight:800;font-style:normal;letter-spacing:var(--x-head-track)`;
    const serif = arabic ? `font-family:var(--x-serif-font, serif);font-weight:400;font-style:normal` : `font-family:var(--x-serif-font, serif);font-weight:400;font-style:italic;letter-spacing:-0.01em`;
    const voices = p.order === "sans-then-serif" ? [sans, serif] : [serif, sans];
    const L = parts.map((ws, i) => {
      const wrap = document.createElement(same ? "span" : "div");
      wrap.style.cssText = same ? "display:inline-block;vertical-align:baseline;padding-bottom:0.14em;margin-bottom:-0.14em" : "display:block;padding-bottom:0.14em;margin-bottom:-0.14em";
      if (same && i === 1) wrap.style.marginInlineStart = "0.3em";
      const inner = document.createElement("span");
      inner.style.cssText = `display:inline-block;${voices[i]};transform-origin:50% 80%`;
      if (i === 1) { inner.style.fontSize = (p.size_ratio * 100).toFixed(0) + "%"; inner.style.color = "var(--x-accent)"; inner.style.lineHeight = arabic ? "1.3" : "1.05"; }
      inner.textContent = ws.join(" ");
      wrap.append(inner); el.append(wrap);
      return { wrap, inner };
    });
    ML.fit(el, el.clientWidth || ctx.f.head.w);
    // the overlap goes in first: it takes room back from the stack. The line box has slack above the letters, so the
    // pull counts that too, or a 30 % overlap would only just touch
    const second = L[1];
    const pull = () => { if (second && p.layout === "overlap") second.wrap.style.marginTop = (-((p.overlap || 30) / 100 + 0.22) * L[0].inner.offsetHeight).toFixed(1) + "px"; };
    pull();
    // the stack may grow a little past the slot's own height, never far past the headline band
    { const maxH = Math.max(origH * 1.25, ctx.f.head.h * 0.66), h = el.offsetHeight;
      if (h > maxH) { el.style.fontSize = ((parseFloat(getComputedStyle(el).fontSize) * maxH) / h).toFixed(1) + "px"; pull(); } }
    const fs1 = parseFloat(getComputedStyle(el).fontSize) || fsz;
    if (second && p.layout === "overlap") {
      const push = (align === "center" ? 0.18 : 0.08) * L[0].inner.offsetWidth * (rtl ? -1 : 1);
      second.wrap.style.translate = `${push.toFixed(1)}px 0`;
      second.wrap.style.position = "relative";
    }
    // how line 2 is cut for its entrance
    let units = [];
    if (second) {
      if (p.line2_in === "word-rise") units = ML.split(second.inner, "words");
      if (p.line2_in === "letter-clip") units = ML.split(second.inner, "chars");
    }
    const t1 = at, l1at = t1 + (eyebrow ? 0.25 : 0);
    // the second voice lands before the exit starts, however short the scene
    const gap = Math.min(p.gap, Math.max(0.05, end - 0.3 - 0.5 - 0.4 - l1at));
    const t2 = l1at + 0.4 + gap, h2 = second ? second.inner.offsetHeight : 0;
    let bar = null;
    if (second && p.underline) {
      const eb = ctx.box(el), ib = ctx.box(second.inner);
      bar = document.createElement("span");
      bar.style.cssText = `position:absolute;left:${(ib.x - eb.x).toFixed(1)}px;top:${(ib.y - eb.y + ib.h * 0.98).toFixed(1)}px;width:${ib.w.toFixed(1)}px;height:max(2px, ${(fs1 * 0.02).toFixed(1)}px);background:var(--x-accent);transform-origin:${rtl ? "100%" : "0%"} 50%;scale:0 1`;
      el.append(bar);
    }
    const u2end = t2 + 0.5 + Math.max(0, units.length - 1) * (p.line2_in === "letter-clip" ? Math.min(0.04, p.stagger * 0.4) : p.stagger);
    ctx.sfx(l1at, "whoosh.soft", 0.3);
    if (second) ctx.sfx(t2, p.line2_in === "pop" ? "pop.soft" : "whoosh.soft", 0.25);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        el.style.opacity = (1 - leave).toFixed(4);
        el.style.filter = leave > 0 ? `blur(${(leave * 10).toFixed(2)}px)` : "none";
        el.style.translate = leave > 0 ? `0 ${(-leave * 24).toFixed(2)}px` : "none";
        if (eyebrow) {
          const u = ML.out(t, t1, t1 + 0.4);
          eyebrow.style.opacity = u.toFixed(4);
          eyebrow.style.letterSpacing = eyebrowAr ? "0" : `${(0.4 + (1 - u) * 0.3).toFixed(3)}em`;
        }
        // line 1: a calm rise into place
        { const u = ML.land(t, l1at, l1at + 0.5), s = L[0].inner.style;
          s.opacity = u.toFixed(4); s.translate = `0 ${((1 - u) * fs1 * 0.3).toFixed(2)}px`;
          s.filter = u < 1 ? `blur(${((1 - u) * 6).toFixed(2)}px)` : "none"; }
        if (!second) return;
        const s = second.inner.style;
        if (p.line2_in === "mask-rise") {
          const u = ML.land(t, t2, t2 + 0.5);
          s.translate = `0 ${((1 - u) * h2 * 1.05).toFixed(2)}px`;
          second.wrap.style.clipPath = u >= 1 ? "none" : "inset(-0.2em -6% 0 -6%)";
          s.opacity = t >= t2 ? "1" : "0";
          s.filter = u < 0.6 && t >= t2 ? `blur(${((0.6 - u) * 6).toFixed(2)}px)` : "none";
        } else if (p.line2_in === "pop") {
          const u = ML.back(t, t2, t2 + 0.4, 1.2);
          s.opacity = ML.lin(t, t2, t2 + 0.2).toFixed(4); s.translate = `0 ${((1 - u) * 30).toFixed(2)}px`;
        } else {
          s.opacity = "1";
          const st = p.line2_in === "letter-clip" ? Math.min(0.04, p.stagger * 0.4) : p.stagger;
          const order = units.map((w, i) => ({ w, i }));
          order.forEach(({ w, i }) => {
            const a = t2 + i * st;
            if (p.line2_in === "word-rise") {
              const u = ML.out(t, a, a + 0.5);
              w.style.opacity = u.toFixed(4); w.style.translate = `0 ${((1 - u) * 16).toFixed(2)}px`;
              w.style.filter = u < 1 ? `blur(${((1 - u) * 8).toFixed(2)}px)` : "none";
            } else {
              const u = ML.land(t, a, a + 0.4);
              w.style.clipPath = u >= 1 ? "none" : `inset(${((1 - u) * 100).toFixed(1)}% -10% -15% -10%)`;
              w.style.translate = `0 ${((1 - u) * fs1 * 0.12).toFixed(2)}px`;
              w.style.opacity = t >= a ? "1" : "0";
            }
          });
        }
        if (bar) bar.style.scale = `${ML.out(t, u2end, u2end + 0.4).toFixed(4)} 1`;
      },
    };
  },
});

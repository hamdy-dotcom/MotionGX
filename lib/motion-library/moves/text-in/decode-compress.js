// Decode compress: a display title resolves letter by letter from squashed, blurred marks into crisp condensed
// capitals. Each letter starts scaleX .25 (origin centre) × scaleY 1.1, blurred 8px, transparent and pulled in toward
// its word's centre (the tracking collapsed), then lands at scale 1, blur 0, full opacity on expo.out in 0.6 s, the
// letters staggered .04 s from the start, the centre or a seeded random order. 0.1 s after the title settles an
// offset echo layer (the same words in the accent, behind) slides out to a small offset; optionally the slot's
// following siblings (eyebrow, line, evidence, metadata) rise-fade in reading order .1 s apart. Settles fully, no
// idle loop. Arabic: letters join, so whole words (ML.split keeps them whole) squash and resolve instead.
// Source: MengTo/Skills editorial-portfolio-chapters ARTICLE.md (MIT) — the technique as described; our own code.
ML.define({
  id: "text-in.decode-compress",
  category: "text-in",
  name: "Decode compress",
  does: "A display title resolves letter by letter from squashed, blurred marks into crisp condensed capitals.",
  says: ["reveal", "tech", "story", "arrival"],
  energy: 4,
  targets: ["headline", "word"],
  duration: [0.8, 2],
  params: {
    split: { type: "choice", options: ["letters", "words"], default: "letters" },
    from: { type: "choice", options: ["start", "center", "random"], default: "start" },
    scaleX: { type: "number", range: [0.2, 0.35], default: 0.25 },
    blur: { type: "number", range: [4, 12], default: 8, unit: "px" },
    stagger: { type: "number", range: [0.025, 0.06], default: 0.04, unit: "s" },
    duration: { type: "number", range: [0.4, 0.8], default: 0.6, unit: "s" },
    echo: { type: "bool", default: true },
    cascade: { type: "bool", default: false },
  },
  pairs: ["text-in.kicker-rule", "text-in.chapter-swap"],
  avoid: ["playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/web-design/editorial-portfolio-chapters/ARTICLE.md", license: "MIT", note: "described technique, our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const text = el.textContent;
    const units = ML.split(el, p.split === "letters" ? "chars" : "words");
    const n = units.length;
    if (!n) return null;
    const fs = parseFloat(getComputedStyle(el).fontSize) || 100;
    const info = units.map((u) => ({ u, b: ctx.box(u) }));
    // each unit pulled toward its word's centre (letter-spacing collapsed)
    info.forEach((x) => {
      const w = x.u.closest(".ml-w") || x.u, wb = w === x.u ? x.b : ctx.box(w);
      x.pull = (wb.x + wb.w / 2 - (x.b.x + x.b.w / 2)) * (1 - p.scaleX) * 0.6;
      x.u.style.transformOrigin = "50% 50%";
    });
    // order: reading start (RTL from the right), the centre out, or seeded random
    const idx = info.map((_, i) => i);
    const pos = (i) => { const b = info[i].b; return b.y * 10000 + (rtl ? -b.x : b.x); };
    let order = idx.slice().sort((a, b) => pos(a) - pos(b));
    if (p.from === "center") { const mid = (n - 1) / 2, rk = new Array(n); order.forEach((ui, r) => (rk[ui] = r)); order = idx.slice().sort((a, b) => Math.abs(rk[a] - mid) - Math.abs(rk[b] - mid)); }
    if (p.from === "random") order = idx.slice().sort((a, b) => ML.rnd(a, 9) - ML.rnd(b, 9));
    order.forEach((ui, r) => (info[ui].at = at + r * p.stagger));
    const settle = at + (n - 1) * p.stagger + p.duration;
    // the echo: the same words, accent, behind, sliding to a small offset
    let echo = null;
    if (p.echo) {
      el.style.position = el.style.position || "relative";
      el.style.isolation = "isolate";
      echo = document.createElement("div");
      echo.setAttribute("aria-hidden", "true");
      echo.textContent = text;
      echo.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;z-index:-1;color:var(--x-accent);pointer-events:none;white-space:inherit;";
      el.append(echo);
    }
    const followers = p.cascade ? [...(el.parentElement ? el.parentElement.children : [])].filter((s) => s !== el && el.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING) : [];
    ctx.sfx(at, "whoosh.soft", 0.35);
    ctx.sfx(settle - p.duration * 0.6, "land.light", 0.22);
    const off = Math.max(3, fs * 0.05);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.18);
        el.style.opacity = (1 - leave).toFixed(4);
        for (const x of info) {
          if (t < x.at) { x.u.style.opacity = "0"; x.u.style.transform = "none"; x.u.style.filter = "none"; continue; }
          const e = ML.expo(t, x.at, x.at + p.duration);
          const sx = p.scaleX + (1 - p.scaleX) * e, sy = 1.1 - 0.1 * e, dx = x.pull * (1 - e);
          x.u.style.opacity = Math.min(1, e * 1.25).toFixed(4);
          x.u.style.transform = e >= 1 ? "none" : `translateX(${dx.toFixed(2)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
          const bl = (1 - e) * p.blur;
          x.u.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : "none";
        }
        if (echo) {
          const e = ML.out(t, settle + 0.1, settle + 0.6);
          echo.style.opacity = (0.35 * Math.min(1, e * 2)).toFixed(4);
          echo.style.translate = e > 0 ? `${(off * e * (rtl ? -1 : 1)).toFixed(2)}px ${(off * e).toFixed(2)}px` : "none";
        }
        followers.forEach((s, i) => {
          const a = settle + 0.1 + i * 0.1, e = ML.expo(t, a, a + 0.5);
          s.style.opacity = e.toFixed(4);
          s.style.translate = e >= 1 ? "none" : `0 ${((1 - e) * fs * 0.2).toFixed(2)}px`;
        });
      },
    };
  },
});

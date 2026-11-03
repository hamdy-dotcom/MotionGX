// Letter turns into a shape: one letter of a word (the round one — the O — by default, else `letter_index`) dims to
// 0.15 over 0.2 s; a solid accent shape of the letter's bounding size pops in on its spot (0 → 1, back.out, 0.3 s);
// then `duplicates` copies slide out +60 % of the letter's width each (0.35 s, power3.inOut), overlapping the next
// letters, while the other letters stay. With `wipe` the last shape hands off to a circle-grow wipe: it grows (its box,
// never a scale-up) until it fills the frame. Shapes are circle, square or triangle in the look's accents.
// Latin only (rtl: false): it singles out a letter, and Arabic letters join.
// Source: prompt-motion:samuel-spitz-i-asked-opus-5-5 (reference only — our own rebuild).
ML.define({
  id: "kinetic.letter-to-shape-swap",
  category: "kinetic",
  name: "Letter turns into a shape",
  does: "One letter of a word dims and is replaced by solid geometric shapes that slide and overlap, turning type into geometry.",
  says: ["change", "playful", "brand"],
  energy: 3,
  targets: ["word"],
  duration: [1, 3],
  params: {
    shape: { type: "choice", options: ["circle", "square", "triangle"], default: "circle" },
    duplicates: { type: "number", range: [0, 3], default: 1 },
    letter_index: { type: "number", range: [0, 12], default: 1 },
    pick: { type: "choice", options: ["round-letter", "index"], default: "round-letter" },
    wipe: { type: "bool", default: false },
  },
  pairs: ["transition.circle-grow", "accent.shape-grid"],
  avoid: ["trust", "luxury"],
  rtl: false,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "prompt-motion:samuel-spitz-i-asked-opus-5-5", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, f } = ctx;
    if (!el) return null;
    const doc = el.ownerDocument;
    const chars = ML.split(el, "chars").filter((c) => /[\p{L}\p{N}]/u.test(c.textContent));
    if (!chars.length) return null;
    let idx = Math.max(0, Math.min(chars.length - 1, Math.round(p.letter_index)));
    if (p.pick === "round-letter") { const r = chars.findIndex((c) => /^[oO0QÖØöø]$/.test(c.textContent)); if (r >= 0) idx = r; }
    const L = chars[idx];
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    // the letter's box inside el (stage px)
    const eb = ctx.box(el), lb = ctx.box(L);
    const fs = parseFloat(getComputedStyle(L).fontSize) || 60;
    const cap = fs * 0.72, size = Math.max(lb.w * 0.92, cap);
    const cx = lb.x - eb.x + lb.w / 2, cy = lb.y - eb.y + lb.h * 0.5 + fs * 0.02;
    const fills = ["var(--x-accent)", "var(--x-accent-2)", "var(--x-ink)", "var(--x-bad)"];
    const mk = (i) => {
      const s = doc.createElement("i");
      Object.assign(s.style, { position: "absolute", left: (cx - size / 2).toFixed(2) + "px", top: (cy - size / 2).toFixed(2) + "px", width: size.toFixed(2) + "px", height: size.toFixed(2) + "px", background: fills[i % fills.length], pointerEvents: "none", visibility: "hidden", zIndex: String(10 - i) });
      if (p.shape === "circle") s.style.borderRadius = "50%";
      else if (p.shape === "triangle") s.style.clipPath = "polygon(50% 4%, 100% 96%, 0 96%)";
      else s.style.borderRadius = "calc(var(--x-radius) * 0.12)";
      el.append(s);
      return s;
    };
    const n = Math.max(0, Math.min(3, Math.round(p.duplicates)));
    const main = mk(0), dups = Array.from({ length: n }, (_, i) => mk(i + 1));
    dups.forEach((d) => (d.style.opacity = "0.94"));
    const tDim = at + 0.15, tPop = at + 0.3, tSlide = tPop + 0.35;
    const q3 = (x) => (x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2);
    ctx.sfx(tPop, "pop", 0.4);
    if (n) ctx.sfx(tSlide, "whoosh.soft", 0.18);
    const reach = Math.hypot(f.W, f.H) * (p.shape === "triangle" ? 4.2 : 2.1), // (a triangle narrows to its tip: it needs twice the box to cover every corner)
       tWipe = Math.max(tSlide + 0.5, end - 0.65);
    if (p.wipe) ctx.sfx(tWipe, "whoosh.heavy", 0.3);
    const last = n ? dups[n - 1] : main;
    return {
      draw(t) {
        ML.show(el, t, at, p.wipe ? Infinity : end - 0.25);
        L.style.opacity = (1 - 0.85 * ML.out(t, tDim, tDim + 0.2)).toFixed(4);
        const pop = t < tPop ? 0 : Math.max(0, ML.back(t, tPop, tPop + 0.3, 1.7));
        main.style.visibility = t >= tPop ? "visible" : "hidden";
        main.style.transform = `scale(${pop.toFixed(4)})`;
        dups.forEach((d, i) => {
          const s0 = tSlide + i * 0.08, u = q3(ML.lin(t, s0, s0 + 0.35));
          d.style.visibility = t >= tPop ? "visible" : "hidden";
          d.style.transform = `translateX(${(size * 0.6 * (i + 1) * u).toFixed(2)}px) scale(${pop.toFixed(4)})`;
        });
        if (p.wipe) {
          const g = ML.lin(t, tWipe, end), e = g * g * (3 - 2 * g);
          const s = size + (reach - size) * e;
          if (g > 0) Object.assign(last.style, { width: s.toFixed(2) + "px", height: s.toFixed(2) + "px", left: (cx - s / 2).toFixed(2) + "px", top: (cy - s / 2).toFixed(2) + "px", zIndex: "20", opacity: "1" });
          else Object.assign(last.style, { width: size.toFixed(2) + "px", height: size.toFixed(2) + "px", left: (cx - size / 2).toFixed(2) + "px", top: (cy - size / 2).toFixed(2) + "px", zIndex: String(10 - n), opacity: n ? "0.94" : "1" });
        }
      },
    };
  },
});

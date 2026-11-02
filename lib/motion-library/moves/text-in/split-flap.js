// Split-flap: every character cycles through seeded random letters (or digits) at a fixed flip rate, then locks on
// its real character left to right with a stagger; the locking flap does a tiny scaleY 1 → 0 → 1 flip. Each glyph
// keeps a fixed cell width (measured from its real character) so the line never jitters while it cycles.
// Optional tiles put each character on its own small board flap with a hinge line. Latin / digits only (Arabic
// letters join, so a split-flap of them cannot work).
// Source: prompt-motion:thismacapital-la-video-a-ete (reference only — our own rebuild).
ML.define({
  id: "text-in.split-flap",
  category: "text-in",
  name: "Letters scramble like a split-flap board",
  does: "A three-letter code on the card cycles through random letters and lands on the right one, letter by letter.",
  says: ["time", "tech", "precision"],
  energy: 3,
  targets: ["word", "number", "label"],
  duration: [0.6, 1.5],
  params: {
    charset: { type: "choice", options: ["letters", "digits", "match"], default: "match" },
    stagger: { type: "number", range: [0.06, 0.2], default: 0.12, unit: "s" },
    cycle: { type: "number", range: [0.3, 0.6], default: 0.45, unit: "s" },
    rate: { type: "number", range: [0.03, 0.08], default: 0.04, unit: "s" },
    flip: { type: "bool", default: true },
    tiles: { type: "bool", default: false },
    font: { type: "choice", options: ["inherit", "mono"], default: "inherit" },
  },
  pairs: ["data.count-up", "ui.board"],
  avoid: ["calm", "luxury"],
  rtl: false,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "prompt-motion:thismacapital-la-video-a-ete", license: "reference", note: "our own rebuild with ML.rnd" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    if (p.font === "mono") { el.style.fontFamily = "var(--x-mono-font)"; el.style.fontVariantNumeric = "tabular-nums"; }
    const chars = ML.split(el, "chars");
    const UP = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", LO = "abcdefghijklmnopqrstuvwxyz", DG = "0123456789";
    const cells = [];
    for (const c of chars) {
      const real = c.textContent;
      if (!/[A-Za-z0-9]/.test(real)) { cells.push({ c, real, fixed: true }); continue; }
      const set = p.charset === "digits" ? DG : p.charset === "letters" ? (real === real.toLowerCase() && real !== real.toUpperCase() ? LO : UP)
        : /[0-9]/.test(real) ? DG : real === real.toLowerCase() ? LO : UP;
      const w = c.getBoundingClientRect().width / ((el.getBoundingClientRect().width / (el.offsetWidth || 1)) || 1);
      Object.assign(c.style, { width: w.toFixed(2) + "px", textAlign: "center", transformOrigin: "50% 50%", position: "relative" });
      if (p.tiles) {
        Object.assign(c.style, { background: "var(--x-panel)", color: "var(--x-ink)", borderRadius: "min(var(--x-radius), 0.12em)", boxShadow: "var(--x-shadow)", padding: "0 0.08em", margin: "0 0.03em", boxSizing: "content-box" });
        const hinge = document.createElement("span");
        Object.assign(hinge.style, { position: "absolute", left: "0", right: "0", top: "50%", height: "max(1px, 0.02em)", background: "var(--x-line)", pointerEvents: "none" });
        c.append(hinge);
        c._hinge = hinge;
      }
      cells.push({ c, real, set });
    }
    const live = cells.filter((x) => !x.fixed), n = Math.max(1, live.length);
    // the whole line must land before the scene leaves: shorten the stagger if it is long
    const room = Math.max(0.3, end - at - p.cycle - 0.4);
    const stg = Math.min(p.stagger, room / n);
    live.forEach((x, i) => { x.lock = at + p.cycle + i * stg; x.k = i + 1; });
    live.forEach((x, i) => i % 2 === 0 && ctx.sfx(x.lock, "key", 0.22));
    const text = (x, s) => { const node = x.c.firstChild; if (node && node.nodeType === 3) { if (node.data !== s) node.data = s; } else x.c.prepend(s); };
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        el.style.opacity = t < at ? "0" : String(1 - leave);
        for (const x of cells) {
          if (x.fixed) continue;
          if (t >= x.lock || t < at) text(x, x.real);
          else {
            const tick = Math.floor((t - at) / p.rate);
            text(x, x.set[Math.floor(ML.rnd(x.k, tick + 1) * x.set.length) % x.set.length]);
          }
          // the flap: scaleY 1 → 0 → 1 over 0.08 s around the lock (a 2D squash, never above 1)
          let sy = 1;
          if (p.flip) { const u = ML.lin(t, x.lock - 0.04, x.lock + 0.04); sy = u <= 0 || u >= 1 ? 1 : Math.abs(Math.cos(u * Math.PI)); }
          x.c.style.transform = sy < 1 ? `scaleY(${Math.max(0.02, sy).toFixed(4)})` : "none";
        }
      },
    };
  },
});

// Bar wipe reveal: a solid accent bar (cap height + 2 × pad tall, as wide as the line) shoots across — scaleX 0 → 1
// from the reading start in 0.3 s on cubic-bezier(0.65, 0, 0.35, 1) — then, origin flipped, retracts toward the far
// side over another 0.3 s, and the text is revealed exactly where the bar has left: each word is clipped to the part
// behind the bar's retreating edge. One bar per line (a short stagger between lines), so a wrapped headline wipes
// line by line. Optional tracking (Latin only — Arabic letters join). Direction follows the reading order: "ltr"
// means from the reading start, so Arabic mirrors.
// Source: prompt-motion eyishazyer "found another prompt for" (reference only — our own code).
ML.define({
  id: "text-in.bar-wipe",
  category: "text-in",
  name: "Bar wipe reveal",
  does: "A solid accent bar shoots across, then retracts from the other side and leaves the text revealed where it passed.",
  says: ["reveal", "brand", "focus"],
  energy: 3,
  targets: ["line", "label", "headline"],
  duration: [0.6, 1.2],
  params: {
    direction: { type: "choice", options: ["ltr", "rtl"], default: "ltr" },
    phase: { type: "number", range: [0.2, 0.5], default: 0.3, unit: "s" },
    colour: { type: "choice", options: ["accent", "accent2", "ink"], default: "accent" },
    pad: { type: "number", range: [8, 24], default: 16, unit: "px" },
    tracking: { type: "number", range: [0, 0.3], default: 0, unit: "em" },
    stagger: { type: "number", range: [0, 0.2], default: 0.08, unit: "s" },
  },
  pairs: ["text-in.kicker-rule", "text-in.punchline"],
  avoid: ["playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:eyishazyer-found-another-prompt-for", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const FILL = { accent: "var(--x-accent)", accent2: "var(--x-accent-2)", ink: "var(--x-ink)" };
    if (p.tracking > 0 && !ML.ARABIC.test(el.textContent || "")) el.style.letterSpacing = `${p.tracking}em`;
    const words = ML.split(el, "words");
    if (!words.length) return null;
    const fs = parseFloat(getComputedStyle(el).fontSize) || 60;
    const info = words.map((u) => ({ u, b: ctx.box(u) }));
    // lines in reading order
    const lines = [];
    for (const x of info) { let g = lines.find((l) => Math.abs(l.y - x.b.y) < fs * 0.5); if (!g) lines.push((g = { y: x.b.y, items: [] })); g.items.push(x); }
    lines.sort((a, b) => a.y - b.y);
    const fwd = (p.direction === "ltr") !== !!rtl; // true: the bar grows left → right
    const curve = ML.bezier(0.65, 0, 0.35, 1);
    const host = ctx.scene || ctx.stage;
    const scale = Math.max(0.5, fs / 60);
    lines.forEach((g, i) => {
      g.l = Math.min(...g.items.map((x) => x.b.x)); g.r = Math.max(...g.items.map((x) => x.b.x + x.b.w));
      const top = Math.min(...g.items.map((x) => x.b.y)), bot = Math.max(...g.items.map((x) => x.b.y + x.b.h));
      // the bar: cap height + pad, centred on the line's ink
      const cap = fs * 0.72, pad = p.pad * scale, hgt = cap + pad, mid = (top + bot) / 2 + fs * 0.04, ext = pad * 0.5;
      g.bl = g.l - ext; g.br = g.r + ext;
      const bar = document.createElement("div");
      bar.setAttribute("aria-hidden", "true");
      bar.style.cssText = `position:absolute;left:${g.bl.toFixed(1)}px;top:${(mid - hgt / 2).toFixed(1)}px;width:${(g.br - g.bl).toFixed(1)}px;height:${hgt.toFixed(1)}px;background:${FILL[p.colour] || FILL.accent};z-index:3;pointer-events:none;`;
      host.append(bar);
      g.bar = bar;
      g.at = at + i * p.stagger;
    });
    ctx.sfx(at, "whoosh.soft", 0.4);
    ctx.sfx(at + p.phase, "tap", 0.2);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.18);
        el.style.opacity = (1 - leave).toFixed(4);
        for (const g of lines) {
          const a = curve(ML.lin(t, g.at, g.at + p.phase)), b = curve(ML.lin(t, g.at + p.phase, g.at + 2 * p.phase));
          const w = g.br - g.bl;
          // the bar's two edges in stage px: the near edge leaves as it retracts, the far edge grows out first
          const lead = fwd ? g.bl + w * a : g.br - w * a, tail = fwd ? g.bl + w * b : g.br - w * b;
          const lo = fwd ? tail : lead, hi = fwd ? lead : tail;
          g.bar.style.display = t >= g.at && hi - lo > 0.5 && t < end ? "block" : "none";
          g.bar.style.clipPath = `inset(0 ${(g.br - hi).toFixed(2)}px 0 ${(lo - g.bl).toFixed(2)}px)`;
          // text shows only where the bar has passed and left
          for (const x of g.items) {
            if (t < g.at + p.phase) { x.u.style.clipPath = "inset(0 100% 0 0)"; x.u.style.visibility = "hidden"; continue; }
            x.u.style.visibility = "visible";
            const L = x.b.x, R = x.b.x + x.b.w, ww = R - L;
            const cut = ML.clamp(fwd ? R - tail : tail - L, 0, ww);
            if (cut >= ww) { x.u.style.visibility = "hidden"; continue; }
            x.u.style.clipPath = cut <= 0 ? "none" : fwd ? `inset(-30% ${cut.toFixed(2)}px -30% -8%)` : `inset(-30% -8% -30% ${cut.toFixed(2)}px)`;
          }
        }
      },
    };
  },
});

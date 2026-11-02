// Letter fade cascade: the letters of a title fade in one after another — opacity 0 (or a faint start) → 1, colour from a
// muted tone of the look → the ink, lifting a few px (optionally from a blur) over 0.25–0.5 s (power2 / power3 out) in a
// 0.03–0.08 s stagger, so the last letters keep a brief grey tail while the first are done. Uneven variant: every
// letter starts from its own seeded drop (+20…+40 px), so later letters are still settling while earlier ones rest.
// Letters split only where they stand alone: Arabic runs the same cascade word by word (ML.split keeps its joined
// letters whole), in reading order.
// Source: prompt-motion (ezshine 16:9 reel, blushpetal795, jesscaroline7 motion reel) — reference only; our own code.
ML.define({
  id: "text-in.letter-fade",
  category: "text-in",
  name: "Letter fade cascade",
  does: "The letters of a title fade (and lift a few pixels) in one after another, from grey to full colour, leaving a brief grey tail on the last ones.",
  says: ["arrival", "reveal", "brand"],
  energy: 2,
  targets: ["headline", "word"],
  duration: [0.6, 2],
  params: {
    split: { type: "choice", options: ["letters", "words"], default: "letters" },
    distance: { type: "number", range: [0, 40], default: 8, unit: "px" },
    scatter: { type: "bool", default: false },
    blur: { type: "number", range: [0, 8], default: 0, unit: "px" },
    from_tone: { type: "choice", options: ["dim", "line", "ground", "accent"], default: "dim" },
    from_opacity: { type: "number", range: [0, 0.4], default: 0 },
    duration: { type: "number", range: [0.25, 0.5], default: 0.3, unit: "s" },
    stagger: { type: "number", range: [0.03, 0.08], default: 0.05, unit: "s" },
    ease: { type: "choice", options: ["power2", "power3"], default: "power2" },
  },
  pairs: ["text-in.kicker-lead", "background.grain"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:ezshine-opus-5-5-16-9-mp4", license: "reference", note: "also blushpetal795, jesscaroline7 — rebuilt as our own code" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const parts = ML.split(el, p.split === "words" ? "words" : "chars");
    if (!parts.length) return null;
    const tone = { dim: "var(--x-dim)", line: "color-mix(in srgb, var(--x-ink) 25%, var(--x-ground))", ground: "var(--x-ground)", accent: "var(--x-accent)" }[p.from_tone] || "var(--x-dim)";
    const pw = p.ease === "power3" ? 4 : 3;
    const curve = (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), pw);
    // stagger in reading order (DOM order is reading order in both directions); the whole run fits before the end
    const span = Math.max(0.05, Math.min(p.stagger, (end - at - p.duration - 0.6) / Math.max(1, parts.length - 1)));
    const starts = parts.map((_, i) => at + i * span);
    const drops = parts.map((_, i) => (p.scatter ? 20 + 20 * ML.rnd(i, 7) : p.distance));
    ctx.sfx(at, "tap", 0.18);
    if (parts.length > 3) ctx.sfx(starts[starts.length - 1], "tap", 0.12);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.18);
        el.style.opacity = (1 - leave).toFixed(4);
        parts.forEach((c, i) => {
          const d = p.scatter ? p.duration * 1.6 : p.duration, u = curve(t, starts[i], starts[i] + d);
          // colour settles a little after opacity, leaving the grey tail
          const col = curve(t, starts[i] + d * 0.15, starts[i] + d * 1.3);
          c.style.opacity = (p.from_opacity + (1 - p.from_opacity) * u).toFixed(4);
          c.style.color = col >= 1 ? "" : `color-mix(in srgb, currentColor ${(col * 100).toFixed(1)}%, ${tone})`;
          c.style.translate = `0 ${((1 - u) * drops[i]).toFixed(2)}px`;
          c.style.filter = p.blur > 0 && u < 1 ? `blur(${((1 - u) * p.blur).toFixed(2)}px)` : "none";
        });
      },
    };
  },
});

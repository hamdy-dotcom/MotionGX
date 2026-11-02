// Letter wave: a wave runs across the word letter by letter, thickening each from thin to bold (variable-font wght)
// and / or lighting it in the accent as it passes. Per letter: weight = lo + (hi - lo) * smoothstep over 0.3 s, each
// letter `per-letter` seconds after the one before (left -> right, right -> left or from the centre out); once
// (stays bold, a faint warm accent gradient across the word), there-and-back (the wave returns), or a travelling bump
// on a loop. The width a heavier letter takes is absorbed by the centred layout. Letters are split, so Arabic (whose
// letters join) is not offered this move.
// Source: own rebuild of prompt-motion references (johnsavage-ai-opus-5-5-prompt-make, sahildesigner23-ok-opus-5-5-max).
ML.define({
  id: "text-emphasis.letter-wave",
  category: "text-emphasis",
  name: "Weight and colour wave across the letters",
  does: "A wave runs across the word letter by letter, thickening each from thin to bold and/or lighting it in the accent as it passes.",
  says: ["energy", "precision", "brand", "focus"],
  energy: 3,
  targets: ["word", "headline"],
  duration: [0.6, 2],
  params: {
    property: { type: "choice", options: ["weight", "colour", "both"], default: "both" },
    range: { type: "number", range: [100, 900], default: 700 },
    "per-letter": { type: "number", range: [0.05, 0.2], default: 0.1, unit: "s" },
    direction: { type: "choice", options: ["ltr", "rtl", "centre-out"], default: "ltr" },
    repeat: { type: "choice", options: ["once", "there-and-back", "loop"], default: "once" },
    colour: { type: "text", default: "accent" },
  },
  pairs: ["text-in.punchline", "text-emphasis.offset-shadow"],
  avoid: ["calm", "luxury"],
  rtl: false,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:johnsavage-ai-opus-5-5-prompt-make", license: "reference", note: "our own rebuild; also sahildesigner23-ok-opus-5-5-max" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const tones = { accent: "var(--x-accent)", "accent-2": "var(--x-accent-2)", ink: "var(--x-ink)", dim: "var(--x-dim)", good: "var(--x-good)", bad: "var(--x-bad)" };
    const tone = tones[p.colour] || (/^var\(--x-[a-z0-9-]+\)$/.test(String(p.colour)) ? p.colour : tones.accent);
    const base = getComputedStyle(el).color;
    const chars = ML.split(el, "chars");
    const n = chars.length;
    if (!n) return null;
    const doWeight = p.property !== "colour", doColour = p.property !== "weight";
    // thin -> bold: from 200 to the asked weight (or the other way when asked for a light wave)
    let lo = 200, hi = p.range;
    if (hi < lo) [lo, hi] = [hi, lo];
    const restW = parseFloat(getComputedStyle(el).fontWeight) || 400;
    // the place of each letter in the wave
    const mid = (n - 1) / 2;
    const ord = chars.map((_, i) => (p.direction === "rtl" ? n - 1 - i : p.direction === "centre-out" ? Math.round(Math.abs(i - mid)) : i));
    const maxOrd = Math.max(...ord);
    // the wave fits the time it has
    const span = Math.max(0.3, end - at - 0.2);
    const passes = p.repeat === "there-and-back" ? 2 : 1;
    const per = Math.min(p["per-letter"], Math.max(0.02, (span / passes - 0.45) / Math.max(1, maxOrd)));
    const RISE = 0.3, pass = maxOrd * per + RISE;
    const back0 = at + pass + 0.15; // the return pass (there-and-back)
    const period = maxOrd * per + 0.7; // the loop's period
    const smooth = (x) => { x = ML.clamp(x); return x * x * (3 - 2 * x); };
    // sound: a tap at the start of each pass (or each loop)
    ctx.sfx(at, "tap", 0.25);
    if (p.repeat === "there-and-back") ctx.sfx(back0, "tap", 0.2);
    if (p.repeat === "loop") for (let k = 1; at + k * period < end - 0.3; k++) ctx.sfx(at + k * period, "tap", 0.18);
    chars.forEach((c) => { c.style.fontVariationSettings = `"wght" ${lo}`; c.style.fontWeight = String(Math.round(lo / 100) * 100); });
    return {
      draw(t) {
        chars.forEach((c, i) => {
          const s = at + ord[i] * per;
          let w, glow;
          if (p.repeat === "loop") {
            const ph = t < s ? -1 : (t - s) % period;
            w = ph < 0 ? 0 : Math.sin(Math.PI * ML.clamp(ph / 0.6)); // a bump passing, every period
            glow = w;
          } else if (p.repeat === "there-and-back") {
            const sb = back0 + (maxOrd - ord[i]) * per;
            w = smooth((t - s) / RISE) - smooth((t - sb) / RISE);
            glow = ML.pulse(t, s + RISE * 0.6, 0.06, 0.22) + ML.pulse(t, sb + RISE * 0.6, 0.06, 0.22) * 0.6;
          } else {
            w = smooth((t - s) / RISE);
            glow = ML.pulse(t, s + RISE * 0.6, 0.06, 0.22);
          }
          const weight = doWeight ? lo + (hi - lo) * w : restW;
          c.style.fontVariationSettings = `"wght" ${weight.toFixed(1)}`;
          c.style.fontWeight = String(ML.clamp(Math.round(weight / 100) * 100, 100, 900));
          if (doColour) {
            // the active letter in the accent for a moment; once settled, a faint warm gradient across the word
            const settled = p.repeat === "once" ? w * (0.06 + 0.22 * (i / Math.max(1, n - 1))) : 0;
            const a = ML.clamp(Math.max(glow, settled));
            c.style.color = a > 0.004 ? `color-mix(in srgb, ${tone} ${(a * 100).toFixed(1)}%, ${base})` : "";
          }
        });
      },
    };
  },
});

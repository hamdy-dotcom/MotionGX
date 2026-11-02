// Tracking collapse: the word appears widely tracked, blurred and faint (optionally a little small), then pulls tight
// and sharpens into the headline / brand mark on expo out — the studio's S.reveal (scale 0.7, 0.35em, blur 20px, 0.9s
// expo.out, then a slow linear creep to 1.04). The tracking is drawn as per-letter offsets from each group's centre, so
// the slot never reflows or rewraps while it tightens; the spread is capped so no letter leaves the frame. "expand"
// starts glued (letters overlapping) and opens to the right kerning. "words" is the calm per-word variant (each word
// tightens on its own, staggered). Arabic: tracking would break the joins, so Arabic words keep 0 spacing and arrive
// by scale + blur only (the technique's own fallback). Optional grey → ink wipe of the fill from the reading start.
// Source: MotionGX lib/studio-engine/assets/scenes.js S.reveal (own) + prompt-motion references (our own rebuild).
ML.define({
  id: "text-in.tracking-collapse",
  category: "text-in",
  name: "Tracking collapse",
  does: "A word appears widely letter-spaced and blurred, then pulls tight and sharpens into the brand mark or headline.",
  says: ["brand", "focus", "precision", "reveal", "luxury", "arrival"],
  energy: 3,
  targets: ["headline", "logo", "word", "line"],
  duration: [0.5, 3],
  params: {
    spacing_from: { type: "number", range: [0.08, 0.6], default: 0.35, unit: "em" },
    spacing_to: { type: "number", range: [-0.03, 0], default: -0.02, unit: "em" },
    blur: { type: "number", range: [0, 20], default: 8, unit: "px" },
    scale_from: { type: "number", range: [0.6, 1.05], default: 1 },
    duration: { type: "number", range: [0.4, 0.9], default: 0.5, unit: "s" },
    direction: { type: "choice", options: ["collapse", "expand"], default: "collapse" },
    split: { type: "choice", options: ["whole", "words"], default: "whole" },
    stagger: { type: "number", range: [0, 0.15], default: 0, unit: "s" },
    creep: { type: "bool", default: false },
    fill_wipe: { type: "bool", default: false },
  },
  pairs: ["text-in.punchline", "camera.push-in"],
  avoid: ["playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "own:lib/studio-engine/assets/scenes.js#S.reveal", license: "own", note: "studio reveal generalised; prompt-motion variants rebuilt as our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const W = ctx.f.W, fs = parseFloat(getComputedStyle(el).fontSize) || 100;
    const units = ML.split(el, "chars"); // Latin letters; Arabic words stay whole
    if (!units.length) return null;
    const info = units.map((u) => ({ u, b: ctx.box(u), ar: ML.ARABIC.test(u.textContent) }));
    // groups: one per line ("whole") or one per word ("words"), letters ranked left → right inside
    const groups = [];
    const keyOf = (x) => (p.split === "words" ? x.u.closest(".ml-w") : Math.round(x.b.y / (fs * 0.5)));
    for (const x of info) {
      const k = keyOf(x);
      let g = groups.find((gg) => gg.k === k);
      if (!g) groups.push((g = { k, items: [] }));
      g.items.push(x);
    }
    groups.forEach((g, gi) => {
      g.items.sort((a, b) => a.b.x - b.b.x);
      const l = Math.min(...g.items.map((x) => x.b.x)), r = Math.max(...g.items.map((x) => x.b.x + x.b.w));
      g.cx = (l + r) / 2; g.l = l; g.r = r;
      // the widest spread this group can take without a letter leaving the frame
      const n = g.items.length, room = Math.max(0, Math.min(l, W - r) - 12);
      g.max = n > 1 ? (2 * room) / ((n - 1) * fs) : 0;
      g.at = at + gi * p.stagger;
      g.elem = p.split === "words" ? g.k : null;
      if (g.elem) { g.elem.style.transformOrigin = "50% 60%"; }
      g.items.forEach((x, k) => { x.k = k - (n - 1) / 2; x.g = g; });
    });
    const allArabic = info.every((x) => x.ar);
    // Arabic keeps 0 tracking: the arrival is scale + blur, so give it a scale to arrive from
    const scaleFrom = allArabic && p.scale_from >= 0.99 ? 0.82 : p.scale_from;
    const from = p.direction === "expand" ? -Math.min(0.25, p.spacing_from * 0.45) : p.spacing_from;
    const to = p.spacing_to;
    el.style.transformOrigin = "50% 55%";
    ctx.sfx(at, "whoosh.soft", 0.4);
    if (groups.length > 1 && p.stagger > 0.08) ctx.sfx(groups[groups.length - 1].at, "tap", 0.2);
    // the fill wipe runs across the whole block from the reading start
    const L = Math.min(...groups.map((g) => g.l)), R = Math.max(...groups.map((g) => g.r));
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        const whole = p.split !== "words";
        if (whole) {
          const g0 = groups[0], e = ML.expo(t, g0.at, g0.at + p.duration);
          const creep = p.creep ? 0.04 * ML.lin(t, g0.at + p.duration, end) : 0;
          const sc = scaleFrom + (1 - scaleFrom) * e + creep;
          el.style.scale = Math.abs(sc - 1) < 1e-4 ? "none" : sc.toFixed(4);
          el.style.opacity = (Math.min(1, 0.04 + e * 1.15) * (1 - leave)).toFixed(4);
          const bl = (1 - e) * p.blur + leave * 10;
          el.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : "none";
        } else {
          el.style.opacity = (1 - leave).toFixed(4);
          el.style.filter = leave > 0 ? `blur(${(leave * 10).toFixed(2)}px)` : "none";
        }
        for (const g of groups) {
          const e = ML.expo(t, g.at, g.at + p.duration);
          if (!whole) {
            const sc = scaleFrom + (1 - scaleFrom) * e + (p.creep ? 0.04 * ML.lin(t, g.at + p.duration, end) : 0);
            g.elem.style.scale = Math.abs(sc - 1) < 1e-4 ? "none" : sc.toFixed(4);
            g.elem.style.opacity = Math.min(1, e * 1.4).toFixed(4);
            const bl = (1 - e) * p.blur;
            g.elem.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : "none";
          }
          const s = Math.min(from + (to - from) * e, from > 0 ? g.max : Infinity);
          for (const x of g.items) {
            const dx = x.ar && (whole ? allArabic : true) ? 0 : x.k * s * fs;
            x.u.style.translate = Math.abs(dx) > 0.01 ? `${dx.toFixed(2)}px 0` : "none";
            if (p.fill_wipe) {
              const pos = (x.b.x + x.b.w / 2 - L) / Math.max(1, R - L), front = ML.ease(t, g.at, g.at + p.duration * 1.6) * 1.3 - 0.15;
              const k = ML.clamp(((rtl ? 1 - pos : pos) - front) / -0.15);
              x.u.style.color = k >= 1 ? "" : `color-mix(in srgb, currentColor ${(k * 100).toFixed(1)}%, var(--x-dim))`;
            }
          }
        }
      },
    };
  },
});

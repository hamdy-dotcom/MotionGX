// Scale slam: each word (or the whole line) punches in from oversized (scale_from, default 1.6) and blurred (14 px)
// and snaps to size and sharpness in a few frames — opacity 0 → 1 inside ~3 frames, scale and blur over `duration` on
// cubic-bezier(0.2, 0.8, 0.2, 1) — landing on the beat (a beat or half a beat at 120 bpm, or on the spoken word). The
// live engine's hook: power4-like snap, stagger half a beat, from scene + 0.05 s, with an optional white flash at 0.35.
// Optional RGB split on the first frames; a subtle version is scale_from 0.85–1.15 with little blur; a long hook
// drifts up 40 px after landing so the frame never freezes.
// Sources: MotionGX lib/live-engine/worker/vendor/recipes.js R.scene (o.slam) / R.hook (own); prompt-motion codestackr,
// itsuki-dev, grace-sunnyy (reference only).
ML.define({
  id: "text-in.slam",
  category: "text-in",
  name: "Scale slam",
  does: "A word punches in from oversized and blurred and snaps to size and sharpness in a few frames, landing hard on the beat.",
  says: ["energy", "urgency", "arrival", "brand"],
  energy: 5,
  targets: ["word", "headline"],
  duration: [0.3, 2.5],
  params: {
    scale_from: { type: "number", range: [0.85, 1.8], default: 1.6, unit: "x" },
    blur: { type: "number", range: [0, 16], default: 14, unit: "px" },
    duration: { type: "number", range: [0.15, 0.5], default: 0.3, unit: "s" },
    split: { type: "choice", options: ["words", "line"], default: "words" },
    sync: { type: "choice", options: ["beat", "half-beat", "spoken"], default: "half-beat" },
    rgb_split: { type: "bool", default: false },
    flash: { type: "bool", default: false },
    drift: { type: "bool", default: false },
  },
  pairs: ["rhythm.beat-cut", "camera.shake", "transition.flash"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "own:lib/live-engine/worker/vendor/recipes.js", license: "own", note: "R.scene (o.slam) / R.hook; also prompt-motion codestackr, itsuki-dev, grace-sunnyy (reference)" },
  async setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    // measure with the real face: wait for the faces this text uses (a page's fonts can still be arriving)
    try { const cs = getComputedStyle(el); await document.fonts.load(`${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, el.textContent || "A"); await document.fonts.ready; } catch (e) { /* no font API: measure as is */ }
    let units;
    if (p.split === "line") {
      const inner = document.createElement("span");
      inner.style.cssText = "display:inline-block;transform-origin:50% 50%";
      while (el.firstChild) inner.append(el.firstChild);
      el.append(inner); units = [inner];
    } else units = ML.split(el, "words");
    const n = units.length;
    if (!n) return null;
    const BEAT = 0.5, gap = p.sync === "beat" ? BEAT : BEAT / 2;
    const times = units.map((u, i) => (p.sync === "spoken" ? Math.max(at, ctx.word(u.textContent.trim().split(/\s+/)[0], at + i * gap)) : at + 0.05 + i * gap));
    for (let i = 1; i < n; i++) times[i] = Math.max(times[i], times[i - 1] + 0.06);
    const curve = ML.bezier(0.2, 0.8, 0.2, 1);
    const landed = times[n - 1] + p.duration;
    const drift = p.drift;
    let flash = null;
    if (p.flash) {
      flash = document.createElement("div");
      flash.style.cssText = "position:absolute;inset:0;pointer-events:none;background:var(--x-accent-ink);opacity:0;mix-blend-mode:normal;";
      (ctx.scene || ctx.stage).append(flash);
    }
    times.forEach((t) => ctx.sfx(t, "hit", 0.35));
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.18);
        el.style.opacity = (1 - leave).toFixed(4);
        el.style.translate = drift ? `0 ${(-40 * ML.lin(t, landed, end)).toFixed(2)}px` : "none";
        let fl = 0;
        units.forEach((u, i) => {
          const a = times[i];
          if (t < a) { u.style.visibility = "hidden"; return; }
          u.style.visibility = "visible";
          const e = curve(ML.lin(t, a, a + p.duration)), w = 1 - e;
          u.style.opacity = Math.min(1, ML.lin(t, a, a + 0.1)).toFixed(4);
          const s = 1 + (p.scale_from - 1) * w;
          u.style.scale = Math.abs(s - 1) < 1e-4 ? "none" : s.toFixed(4);
          const bl = p.blur * w;
          u.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : "none";
          const rgb = p.rgb_split ? 3 * (1 - ML.lin(t, a, a + p.duration * 0.6)) : 0;
          u.style.textShadow = rgb > 0.05 ? `${(-rgb).toFixed(2)}px 0 var(--x-bad), ${rgb.toFixed(2)}px 0 var(--x-accent-2)` : "none";
          if (t >= a) fl = Math.max(fl, 0.35 * (1 - ML.lin(t, a, a + 0.15)));
        });
        if (flash) flash.style.opacity = fl.toFixed(4);
      },
    };
  },
});

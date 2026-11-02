// Logo zoom in: the mark grows up from small out of a heavy blur, with an optional counter-rotation, and settles
// upright on expo.out; on a long hook it then pulses on the beat. Whole mark, so any script.
// Source: MotionGX's own live engine, lib/live-engine/worker/vendor/recipes.js R.hook (scale .3, blur 20px, .6s
// expo.out) and R.cta (scale .2, rotation -12, .8s expo.out at +0.1s), ported to a pure function of t.
ML.define({
  id: "text-in.logo-zoom",
  category: "text-in",
  name: "Logo zoom in",
  does: "The logo grows up from small out of a heavy blur (optionally with a slight counter-rotation) and settles upright.",
  says: ["brand", "arrival", "energy", "celebration"],
  energy: 4,
  targets: ["logo", "headline"],
  duration: [0.6, 2],
  params: {
    scale_from: { type: "number", range: [0.2, 0.5], default: 0.3, unit: "x" },
    blur: { type: "number", range: [0, 24], default: 20, unit: "px" },
    rotation: { type: "number", range: [-20, 20], default: 0, unit: "deg" },
    duration: { type: "number", range: [0.5, 1], default: 0.7, unit: "s" },
    pulse_after: { type: "bool", default: false },
    beat: { type: "number", range: [0.3, 1], default: 0.5, unit: "s" },
  },
  pairs: ["text-in.punchline", "camera.push-in"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "own:lib/live-engine/worker/vendor/recipes.js", license: "own", note: "R.hook + R.cta logo entrance" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    // a picture is never blurred and never enlarged past its pixels: it rests at 0.94 and pulses up to 1
    const picture = el.tagName === "IMG" || el.tagName === "PICTURE" || el.tagName === "VIDEO" || !!el.querySelector("img, picture, video, canvas");
    // the blur scales with the mark: 20 px wipes out a small logo until it has nearly landed
    const short = Math.min(el.getBoundingClientRect().width, el.getBoundingClientRect().height) || 100;
    const blurMax = picture ? 0 : Math.min(p.blur, short * 0.15);
    const start = at + 0.1;
    const dur = p.duration;
    const landed = start + dur;
    // counter-rotation reads the other way in a right-to-left film
    const rot0 = p.rotation * (rtl ? -1 : 1);
    if (getComputedStyle(el).display === "inline") el.style.display = "inline-block";
    el.style.transformOrigin = "50% 50%";
    // beats after the landing, while the hook lasts (a long hook keeps moving)
    const beats = [];
    if (p.pulse_after && end - landed > 1) for (let b = landed + 0.3; b < end - 0.3; b += p.beat) beats.push(b);
    ctx.sfx(start, "whoosh.soft", 0.45);
    beats.forEach((b, i) => i % 2 === 0 && ctx.sfx(b, "tap", 0.18));
    const rest = picture && beats.length ? 0.94 : 1;
    return {
      draw(t) {
        if (t < start) { el.style.opacity = "0"; el.style.scale = String(p.scale_from); el.style.filter = blurMax ? `blur(${blurMax}px)` : "none"; el.style.rotate = `${rot0}deg`; return; }
        const u = ML.expo(t, start, landed);
        const o = ML.clamp((t - start) / (dur * 0.45));
        let s = p.scale_from + (rest - p.scale_from) * u;
        if (beats.length && t >= landed) {
          let k = 0;
          for (const b of beats) k = Math.max(k, t >= b - 0.3 ? ML.pulse(t, b, 0.06, 0.22) : 0);
          s = picture ? rest + (1 - rest) * k : 1 + 0.06 * k;
        }
        el.style.opacity = o.toFixed(4);
        el.style.scale = s.toFixed(4);
        el.style.rotate = rot0 ? `${(rot0 * (1 - u)).toFixed(3)}deg` : "0deg";
        const b = blurMax * (1 - u);
        el.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : "none";
      },
    };
  },
});

// Blur-lift exit: the whole line lifts a little and dissolves into a blur, clearing the stage — product-film's default
// punchline exit, ported: leave = clamp01((t − out) / 0.18); opacity 1 − leave, filter blur(leave × 12 px), the words
// translateY −leave × 16 px, linear. Gone (hidden) 0.25 s after `out`. `out` is the move's time (put it just before
// the next bar's downbeat, bar − 0.1 s), pulled in so the exit is finished by the move's end. Down drops instead.
// Everything is written on a wrapper of its own, so the entrance that ran before it (which writes the target and its
// words every frame) is left alone.
// Source: Rieranthony/product-film-skill, templates/kit/punchlines.tsx (MIT).
ML.define({
  id: "text-emphasis.blur-lift-exit",
  category: "text-emphasis",
  name: "Line lifts and blurs away",
  does: "The whole line lifts slightly and dissolves into a blur, clearing the stage.",
  says: ["transition", "speed"],
  energy: 2,
  targets: ["headline", "line", "word"],
  duration: [0.15, 0.5],
  params: {
    duration: { type: "number", range: [0.12, 0.4], default: 0.18, unit: "s" },
    blur: { type: "number", range: [4, 16], default: 12, unit: "px" },
    lift: { type: "number", range: [0, 30], default: 16, unit: "px" },
    direction: { type: "choice", options: ["up", "down"], default: "up" },
    delay: { type: "number", range: [0, 2], default: 0, unit: "s" },
  },
  pairs: ["text-in.punchline", "text-emphasis.accent-word"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "product-film-skill:templates/kit/punchlines.tsx", license: "MIT" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const wrap = document.createElement("span");
    wrap.style.display = getComputedStyle(el).display.startsWith("inline") ? "inline-block" : "block";
    wrap.append(...el.childNodes);
    el.append(wrap);
    const D = ML.clamp(p.duration, 0.05, 1);
    // out: the move's moment (+ delay), never so late that the exit is still running at the move's end
    const out = Math.max(at, Math.min(at + p.delay, end - D - 0.02));
    const fs = parseFloat(getComputedStyle(el).fontSize) || 104, u = fs / 104; // lift / blur relative to the type
    const dir = p.direction === "down" ? 1 : -1;
    ctx.sfx(out, "whoosh.soft", 0.22);
    return {
      draw(t) {
        const leave = ML.clamp((t - out) / D);
        const gone = t > out + 0.25;
        wrap.style.visibility = gone ? "hidden" : "";
        wrap.style.opacity = String(1 - leave);
        wrap.style.filter = leave > 0 ? `blur(${(leave * p.blur * u).toFixed(2)}px)` : "none";
        const y = dir * leave * p.lift * u;
        wrap.style.translate = y ? `0 ${y.toFixed(2)}px` : "none";
      },
    };
  },
});

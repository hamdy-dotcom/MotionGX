// Hard-edge wipe in / out: a moving hard edge reveals the element, and later wipes it away from the same leading
// side. Ported from html-explainer-video's show() "wipe": clip-path inset(-20% R% -20% L%) with R = (1 − p)·110 − 5
// (p = cubic in-out over `duration`) and, on leave, L = q·110 − 5 (q = cubic in-out over `leave`). The −20 % on the
// cross axis and the −5 % overshoot keep ascenders, descenders and edges unclipped at rest. up / down run the same on
// the vertical axis. Arabic: ltr / rtl mirror, so Arabic wipes in from the right (its joined letters are never split:
// the whole element is clipped, nothing is cut into letters). The leave ends just before the move's end.
// Source: MengTo/Skills agent-skills/media/html-explainer-video (scripts/explainer.js show(), MIT).
ML.define({
  id: "mask.clip-wipe",
  category: "mask",
  name: "Hard-edge wipe in / out",
  does: "An element is revealed by a moving hard edge and later wiped away from the same leading side.",
  says: ["reveal", "precision", "tech", "change"],
  energy: 3,
  targets: ["headline", "line", "label", "card", "image", "chart"],
  duration: [0.3, 1],
  params: {
    direction: { type: "choice", options: ["ltr", "rtl", "up", "down"], default: "ltr" },
    duration: { type: "number", range: [0.3, 0.8], default: 0.5, unit: "s" },
    leave: { type: "number", range: [0.15, 0.4], default: 0.22, unit: "s" },
    exit: { type: "bool", default: true },
  },
  pairs: ["text-emphasis.accent-word", "accent.underline-draw"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/media/html-explainer-video", license: "MIT", note: "scripts/explainer.js show() wipe" },
  setup(ctx) {
    const { el, p, at, end, stage } = ctx;
    if (!el) return null;
    const target = el === stage ? ctx.scene || stage : el;
    const dur = ML.clamp(+p.duration, 0.3, 0.8), gone = ML.clamp(+p.leave, 0.15, 0.4);
    let dir = p.direction;
    if (ctx.rtl && (dir === "ltr" || dir === "rtl")) dir = dir === "ltr" ? "rtl" : "ltr";
    const leave = p.exit && Number.isFinite(end) ? Math.max(at + dur + 0.2, end - gone - 0.08) : Infinity;
    ctx.sfx(at, "whoosh.soft", 0.3);
    if (leave !== Infinity) ctx.sfx(leave, "whoosh.soft", 0.2);
    return {
      draw(t) {
        if (t < at - 1e-6 || t > leave + gone) { target.style.visibility = "hidden"; target.style.clipPath = "none"; return; }
        target.style.visibility = "";
        const pr = ML.ease(t, at, at + dur), q = leave === Infinity ? 0 : ML.ease(t, leave, leave + gone);
        const a = ((1 - pr) * 110 - 5).toFixed(3) + "%", b = (q * 110 - 5).toFixed(3) + "%";
        // a = the inset of the side not yet reached, b = the inset of the leading side eaten on leave
        target.style.clipPath =
          dir === "ltr" ? `inset(-20% ${a} -20% ${b})`
          : dir === "rtl" ? `inset(-20% ${b} -20% ${a})`
          : dir === "down" ? `inset(${b} -20% ${a} -20%)`
          : `inset(${a} -20% ${b} -20%)`;
      },
    };
  },
});

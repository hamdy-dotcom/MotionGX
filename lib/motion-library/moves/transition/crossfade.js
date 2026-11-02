// Crossfade: the next scene (or the next line in the same spot) fades in over the last one across the cut point.
// Scene scope (explainer.js drawAt): the incoming scene's opacity is a cubic ease over [at, at + d], drawn above the
// outgoing one, which keeps drawing beneath until the fade is done. Variants: fade-in (step-window's 0.45 s
// cubic-bezier(0.2, 0.7, 0.1, 1), the old one gone), lagged (the old one holds 300 ms before it fades out under the new:
// no flash-through). In-place scope: two lines on one anchor (question -> answer): the outgoing goes 1 -> .25 -> 0 over
// 0.4 s while the incoming goes 0 -> .25 -> 1 over 0.5 s, overlapping 0.2 s, no movement or a 0-8 px y drift.
// Source: MengTo/Skills html-explainer-video scripts/explainer.js + html-demo scripts/step-window.css (MIT).
ML.define({
  id: "transition.crossfade",
  category: "transition",
  name: "Crossfade",
  does: "The next scene (or the next line in the same spot) fades in over the last one across the cut point.",
  says: ["transition", "calm", "result", "reveal"],
  energy: 1,
  targets: ["scene", "headline", "number", "line"],
  duration: [0.2, 0.6],
  params: {
    mode: { type: "choice", options: ["dissolve", "fade-in", "lagged"], default: "dissolve" },
    scope: { type: "choice", options: ["scene", "in-place"], default: "scene" },
    duration: { type: "number", range: [0.2, 0.5], default: 0.3, unit: "s" },
    drift: { type: "number", range: [0, 8], default: 0, unit: "px" },
    next: { type: "text", default: "" },
  },
  pairs: ["background.gradient-drift"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:agent-skills/media/html-explainer-video/scripts/explainer.js", license: "MIT", note: "fade-in from html-demo/scripts/step-window.css" },
  setup(ctx) {
    const { p, at, stage } = ctx;
    const d = ML.clamp(p.duration, 0.2, 0.5);
    const stepIn = ML.bezier(0.2, 0.7, 0.1, 1);
    const keys = (t, list) => { if (t <= list[0][0]) return list[0][1]; for (let i = 1; i < list.length; i++) if (t <= list[i][0]) { const [a, va] = list[i - 1], [b, vb] = list[i]; return va + (vb - va) * ((t - a) / (b - a)); } return list[list.length - 1][1]; };
    const inPlace = p.scope === "in-place" && ctx.el && ctx.el !== stage;
    if (!inPlace) {
      const scene = ctx.scene || stage;
      // the outgoing scene, when the film has one just before this
      let prev = scene.previousElementSibling;
      while (prev && !prev.classList.contains("ml-scene")) prev = prev.previousElementSibling;
      const lag = p.mode === "lagged" ? 0.3 : 0;
      return {
        draw(t) {
          let o;
          if (p.mode === "fade-in") o = stepIn(ML.lin(t, at, at + 0.45));
          else o = ML.ease(t, at + lag, at + lag + d);
          scene.style.opacity = o.toFixed(4);
          scene.style.translate = p.drift ? `0 ${((1 - o) * p.drift).toFixed(2)}px` : "none";
          if (prev) {
            // the outgoing one drawn beneath until the incoming is opaque (fade-in: gone at once)
            const under = p.mode === "fade-in" ? false : t >= at && t < at + lag + d;
            if (under) { prev.style.display = "block"; prev.style.opacity = p.mode === "lagged" ? (1 - ML.ease(t, at + lag, at + lag + d)).toFixed(4) : "1"; }
          }
        },
      };
    }
    // in place: the incoming line on the same anchor, built from `next` (or the element's data-next, or its sibling)
    const el = ctx.el;
    const sib = el.nextElementSibling;
    const text = p.next || el.dataset.next || (sib ? sib.textContent.trim() : el.textContent.trim());
    const inc = el.cloneNode(false);
    inc.removeAttribute("data-slot"); inc.removeAttribute("id");
    inc.textContent = text;
    inc.style.position = "absolute";
    inc.style.left = el.offsetLeft + "px"; inc.style.top = el.offsetTop + "px";
    inc.style.width = el.offsetWidth + "px"; inc.style.margin = "0";
    inc.style.pointerEvents = "none";
    (el.offsetParent || el.parentElement).append(inc);
    const k = d / 0.3; // the 0.4 / 0.5 s pair scales with the chosen length
    const a0 = at, o1 = at + 0.2 * k, o2 = at + 0.4 * k, i0 = at + 0.2 * k, i1 = at + 0.45 * k, i2 = at + 0.7 * k;
    return {
      draw(t) {
        const oo = keys(t, [[a0, 1], [o1, 0.25], [o2, 0]]);
        const io = keys(t, [[i0, 0], [i1, 0.25], [i2, 1]]);
        el.style.opacity = oo.toFixed(4);
        inc.style.opacity = io.toFixed(4);
        el.style.translate = p.drift ? `0 ${(-(1 - oo) * p.drift).toFixed(2)}px` : "none";
        inc.style.translate = p.drift ? `0 ${((1 - io) * p.drift).toFixed(2)}px` : "none";
      },
    };
  },
});

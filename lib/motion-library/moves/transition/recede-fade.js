// Recede fade: the studio engine's scene frame. In: the scene fades 0 -> 1 over 0.3 s power1.out at its cut (settling
// from `in_scale` when that is above 1), with a soft impact 0.05 s before it (rotating takes, vol 0.35). Out: opacity
// 1 -> 0 and scale 1 -> `out_scale` over `duration` power1.in ending exactly at the cut, then hidden. Screen variant
// (a screen target): the live kit's swap — the screen leaves (autoAlpha 0, scale 0.97, power2.in) and its next page
// (a [data-page] sibling or child, else the screen itself refreshed) comes in fromTo scale 1.03 -> 1, power2.out,
// starting at +0.4 x duration; an optional white flash (0.25) lands 0.15 s in. Never muddy: the next scene starts
// mostly empty.
// Source: MotionGX lib/studio-engine/assets/scenes.js frame() + lib/live-engine/worker/vendor/kit.js K.swap (own).
ML.define({
  id: "transition.recede-fade",
  category: "transition",
  name: "Recede fade",
  does: "The scene shrinks very slightly while fading out and the next one fades in (optionally settling from a hair larger), like an app moving on after a tap.",
  says: ["transition", "calm", "change", "result", "step"],
  energy: 2,
  targets: ["scene", "screen"],
  duration: [0.3, 0.8],
  params: {
    phase: { type: "choice", options: ["both", "in", "out"], default: "both" },
    out_scale: { type: "number", range: [0.95, 0.98], default: 0.97 },
    in_scale: { type: "number", range: [1, 1.05], default: 1 },
    duration: { type: "number", range: [0.25, 0.5], default: 0.32, unit: "s" },
    flash: { type: "bool", default: false },
  },
  pairs: ["text-in.punchline", "transition.crossfade"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "own:lib/studio-engine/assets/scenes.js", license: "own", note: "screen swap from lib/live-engine/worker/vendor/kit.js" },
  setup(ctx) {
    const { p, at, end, stage } = ctx;
    const scene = ctx.scene || stage;
    const d = ML.clamp(p.duration, 0.25, 0.5);
    const p1in = (x) => x * x, p1out = (x) => 1 - (1 - x) * (1 - x), p2in = (x) => x * x * x, p2out = (x) => 1 - Math.pow(1 - x, 3);
    const flashEl = (host) => { const f = document.createElement("div"); f.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:7;background:var(--x-panel);opacity:0;border-radius:inherit"; host.append(f); return f; };
    const screen = ctx.el && ctx.el !== stage && ctx.el !== scene ? ctx.el : null;
    if (!screen) {
      const doIn = p.phase !== "out", doOut = p.phase !== "in";
      const outA = Math.max(at + d + 0.1, end - d);
      if (doIn) ctx.sfx(Math.max(0, at - 0.05), "hit", 0.35);
      const fl = p.flash ? flashEl(scene) : null;
      return {
        draw(t) {
          let o = 1, s = 1;
          if (doIn) { const v = p1out(ML.lin(t, at, at + d)); o = t < at ? 0 : v; s = p.in_scale + (1 - p.in_scale) * v; }
          if (doOut && t >= outA) { const v = p1in(ML.lin(t, outA, end)); o *= 1 - v; s *= 1 - (1 - p.out_scale) * v; }
          scene.style.opacity = o.toFixed(4);
          scene.style.scale = s === 1 ? "none" : s.toFixed(4);
          scene.style.visibility = doOut && t >= end ? "hidden" : "";
          if (fl) fl.style.opacity = (0.25 * Math.max(0, 1 - Math.abs(t - (at + 0.15)) / 0.12)).toFixed(4);
        },
      };
    }
    // screen: a leaves, b arrives (K.swap): b is the next page if the screen has one, else the screen itself again
    const host = screen.parentElement;
    const nextPage = (screen.nextElementSibling && screen.nextElementSibling.hasAttribute("data-page") && screen.nextElementSibling) || null;
    const pages = [...screen.querySelectorAll(":scope > [data-page]")];
    let a = screen, b = nextPage;
    if (!b && pages.length >= 2) { a = pages[0]; b = pages[1]; }
    const fl = p.flash ? flashEl(getComputedStyle(screen).position === "static" ? (screen.style.position = "relative", screen) : screen) : null;
    const inA = at + d * 0.4;
    ctx.sfx(Math.max(0, inA - 0.05), "hit", 0.35);
    return {
      draw(t) {
        const v = p2in(ML.lin(t, at, at + d)), w = p2out(ML.lin(t, inA, inA + d));
        const inScale = Math.max(1.03, p.in_scale);
        if (b) {
          a.style.opacity = (1 - v).toFixed(4); a.style.visibility = v >= 1 ? "hidden" : "visible"; a.style.scale = v > 0 ? (1 - (1 - p.out_scale) * v).toFixed(4) : "none";
          b.style.opacity = (t < inA ? 0 : w).toFixed(4); b.style.visibility = t < inA ? "hidden" : "visible"; b.style.scale = t < inA ? "none" : (inScale + (1 - inScale) * w).toFixed(4);
        } else {
          // the same screen refreshed: out over d, then back in from a hair larger over the next d
          const r = p2out(ML.lin(t, at + d, at + 2 * d));
          a.style.opacity = (t < at + d ? 1 - v : r).toFixed(4);
          a.style.scale = t < at + d ? (v > 0 ? (1 - (1 - p.out_scale) * v).toFixed(4) : "none") : (inScale + (1 - inScale) * r).toFixed(4);
        }
        if (fl) fl.style.opacity = (0.25 * Math.max(0, 1 - Math.abs(t - (at + 0.15)) / 0.12)).toFixed(4);
      },
    };
  },
});

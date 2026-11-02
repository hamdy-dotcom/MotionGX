// Dot-matrix resolve: the scene first appears as a sparse grid of coloured dots on a dark board, like an LED sign,
// then the dots fill in to the full picture (or the reverse). The scene is seen through a dot grid: every dot shows
// the scene's own colour at its cell (`grid` px apart on a 1080 frame, the dot about 40% of its cell, enough that the picture reads on the board), over 0.6 s
// power2.inOut the spacing shrinks `grid` -> 1 px while each dot grows to fill its cell, then the grid lifts and the full-resolution scene stands. Dissolve runs it backwards and ends on the dark board. Round or
// square dots. The grid is a mask on the board, not a resample of the scene: what shows in each dot is the scene itself,
// so text stays crisp at every dot, and it is the same at every t.
// Source: prompt-motion 0xevinho-opus-5-5-is-really (reference only: our own rebuild).
ML.define({
  id: "transition.dot-matrix-resolve",
  category: "transition",
  name: "Dot-matrix resolve",
  does: "The scene first appears as a sparse grid of coloured dots like an LED board, then the dots fill in to the full picture (or the reverse).",
  says: ["arrival", "tech", "playful"],
  energy: 3,
  targets: ["scene", "image"],
  duration: [0.5, 1],
  params: {
    grid: { type: "number", range: [4, 16], default: 8, unit: "px" },
    dot: { type: "choice", options: ["square", "round"], default: "round" },
    direction: { type: "choice", options: ["resolve", "dissolve"], default: "resolve" },
  },
  pairs: ["transition.crt-power", "text-in.phosphor-scan"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:0xevinho-opus-5-5-is-really", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const isImg = ctx.el && ctx.el !== stage;
    const pic = isImg ? ctx.el : ctx.scene || stage;
    const k = Math.min(f.W, f.H) / 1080;
    const G = ML.clamp(p.grid, 4, 16) * k;
    // the dark board is one veil over the scene with dot-shaped holes in it: it lives inside the scene, so it can never
    // show over another scene, and the scene itself is untouched (every other move on it keeps working)
    const veil = document.createElement("div");
    veil.dataset.mlFx = "1";
    veil.style.cssText = "position:absolute;pointer-events:none;z-index:8;visibility:hidden;background:var(--x-device);mask-repeat:repeat;mask-position:50% 50%";
    if (isImg) {
      veil.style.left = pic.offsetLeft + "px"; veil.style.top = pic.offsetTop + "px";
      veil.style.width = pic.offsetWidth + "px"; veil.style.height = pic.offsetHeight + "px";
      veil.style.borderRadius = getComputedStyle(pic).borderRadius;
      (pic.offsetParent || pic.parentElement).append(veil);
    } else {
      veil.style.inset = "0";
      pic.append(veil);
    }
    const L = 0.6;
    const p2io = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    const resolve = p.direction !== "dissolve";
    const fadeD = 0.1; // dots light up (resolve) / go out (dissolve)
    const solid = () => { veil.style.visibility = "visible"; veil.style.maskImage = "none"; };
    // e: 0 sparse … 1 filled; a: how lit the dots are. (The mask's black is only its alpha, never painted.)
    const grid = (e, a) => {
      const g = G * (1 - e) + 1 * e;
      const off = `rgba(0,0,0,${(1 - a).toFixed(3)})`; // the hole
      veil.style.visibility = "visible";
      veil.style.maskSize = `${g.toFixed(3)}px ${g.toFixed(3)}px`;
      if (p.dot === "square") {
        const s = (0.38 + 0.62 * e) * g;
        const lo = ((g - s) / 2).toFixed(3), hi = ((g + s) / 2).toFixed(3);
        veil.style.maskImage = ["90deg", "180deg"].map((d) => `linear-gradient(${d}, #000 ${lo}px, ${off} ${lo}px, ${off} ${hi}px, #000 ${hi}px)`).join(", ");
      } else {
        const r = (0.19 + (0.72 - 0.19) * e) * g;
        veil.style.maskImage = `radial-gradient(circle at 50% 50%, ${off} ${r.toFixed(3)}px, #000 ${(r + Math.min(0.8, g * 0.08)).toFixed(3)}px)`;
      }
    };
    const t0 = resolve ? at + fadeD : at, t1 = t0 + L;
    ctx.sfx(at, "blip", 0.35);
    ctx.sfx(resolve ? t1 : t1 + fadeD, resolve ? "land.light" : "blip", 0.25);
    return {
      draw(t) {
        if (resolve) {
          if (t >= t1) veil.style.visibility = "hidden";
          else if (t < at) solid();
          else grid(p2io(ML.lin(t, t0, t1)), ML.lin(t, at, t0));
        } else {
          if (t < at) veil.style.visibility = "hidden";
          else if (t >= t1 + fadeD) solid();
          else grid(1 - p2io(ML.lin(t, t0, t1)), 1 - ML.lin(t, t1, t1 + fadeD));
        }
      },
    };
  },
});

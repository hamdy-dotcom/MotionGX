// Dot-matrix resolve: the scene first appears as a sparse grid of coloured dots on a dark board, like an LED sign,
// then the dots fill in to the full picture (or the reverse). The scene is seen through a dot grid: every dot shows
// the scene's own colour at its cell (a sample per cell, `grid` px apart on a 1080 frame, the dot a quarter of its
// cell), over 0.6 s power2.inOut the spacing shrinks `grid` -> 1 px while each dot grows to fill its cell, then the
// grid lifts and the full-resolution scene stands. Dissolve runs it backwards and ends on the dark board. Round or
// square dots. The grid is a mask (no pixels resampled, so text stays crisp at every dot), the same at every t.
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
    // the dark board behind the dots
    const board = document.createElement("div");
    board.style.cssText = "position:absolute;pointer-events:none;visibility:hidden;background:var(--x-device)";
    if (isImg) {
      const par = pic.offsetParent || pic.parentElement;
      board.style.left = pic.offsetLeft + "px"; board.style.top = pic.offsetTop + "px";
      board.style.width = pic.offsetWidth + "px"; board.style.height = pic.offsetHeight + "px";
      board.style.borderRadius = getComputedStyle(pic).borderRadius;
      if (getComputedStyle(pic).position === "static") pic.style.position = "relative";
      pic.style.zIndex = "1";
      par.insertBefore(board, par.firstChild);
    } else {
      board.style.inset = "0";
      if (pic === stage) stage.insertBefore(board, stage.firstChild);
      else pic.parentElement.insertBefore(board, pic);
    }
    // a scene is transparent over the stage: it carries the ground while it is dotted, so the ground shows as dots too
    const ground = (on) => { if (isImg || pic === stage) return; pic.style.background = on ? "var(--x-ground)" : ""; pic.style.backgroundImage = on ? "var(--x-ground-image)" : ""; };
    const L = 0.6;
    const p2io = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    const resolve = p.direction !== "dissolve";
    const fadeD = 0.1; // dots light up (resolve) / go out (dissolve)
    const setMask = (m, size) => {
      pic.style.webkitMaskImage = pic.style.maskImage = m;
      pic.style.webkitMaskSize = pic.style.maskSize = size;
      pic.style.webkitMaskRepeat = pic.style.maskRepeat = m === "none" ? "" : "repeat";
      pic.style.webkitMaskPosition = pic.style.maskPosition = m === "none" ? "" : "50% 50%";
      pic.style.maskComposite = p.dot === "square" && m !== "none" ? "intersect" : "";
      pic.style.webkitMaskComposite = p.dot === "square" && m !== "none" ? "source-in" : "";
    };
    // e: 0 sparse … 1 filled; a: how lit the dots are
    const grid = (e, a) => {
      const g = G * (1 - e) + 1 * e;
      const ink = `rgba(0,0,0,${a.toFixed(3)})`;
      if (p.dot === "square") {
        const s = (0.25 + 0.75 * e) * g;
        const lo = ((g - s) / 2).toFixed(3), hi = ((g + s) / 2).toFixed(3);
        setMask(`linear-gradient(90deg, transparent ${lo}px, ${ink} ${lo}px, ${ink} ${hi}px, transparent ${hi}px), linear-gradient(180deg, transparent ${lo}px, ${ink} ${lo}px, ${ink} ${hi}px, transparent ${hi}px)`, `${g.toFixed(3)}px ${g.toFixed(3)}px`);
      } else {
        const r = (0.125 + (0.72 - 0.125) * e) * g;
        setMask(`radial-gradient(circle at 50% 50%, ${ink} ${r.toFixed(3)}px, transparent ${(r + Math.min(0.8, g * 0.08)).toFixed(3)}px)`, `${g.toFixed(3)}px ${g.toFixed(3)}px`);
      }
    };
    const t0 = resolve ? at + fadeD : at, t1 = t0 + L;
    ctx.sfx(at, "blip", 0.35);
    ctx.sfx(resolve ? t1 : t1 + fadeD, resolve ? "land.light" : "blip", 0.25);
    return {
      draw(t) {
        if (resolve) {
          if (t >= t1) { board.style.visibility = "hidden"; ground(false); setMask("none", ""); pic.style.visibility = ""; return; }
          board.style.visibility = "visible";
          ground(true);
          if (t < at) { pic.style.visibility = "hidden"; setMask("none", ""); return; }
          pic.style.visibility = "";
          grid(p2io(ML.lin(t, t0, t1)), ML.lin(t, at, t0));
        } else {
          if (t < at) { board.style.visibility = "hidden"; ground(false); setMask("none", ""); pic.style.visibility = ""; return; }
          board.style.visibility = "visible";
          ground(true);
          if (t >= t1 + fadeD) { pic.style.visibility = "hidden"; return; }
          pic.style.visibility = "";
          grid(1 - p2io(ML.lin(t, t0, t1)), 1 - ML.lin(t, t1, t1 + fadeD));
        }
      },
    };
  },
});

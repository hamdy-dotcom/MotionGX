// Slide push: the live engine's "slide" scene family. The new scene rises in — y 0.28 H (0.2-0.4) -> 0 over 0.4 s
// power3.out — while the old one leaves the same way it came: y 0 -> -0.28 H with autoAlpha 1 -> 0 over 0.3 s
// power2.in, both starting on the cut (`at`). No blur: a clean push, not a whip. The new scene travels as one sheet on
// its own ground, so it covers the old one as it rises. left / right push sideways and follow the reading direction
// (mirrored in Arabic: "left" means "toward the reading end"). The old scene is the one before this when the film has
// it; alone, the move pushes up from a copy of this layout in the look's inverse (ink ground).
// Source: MotionGX lib/live-engine/worker/vendor/recipes.js R.scene, f === "slide" (own).
ML.define({
  id: "transition.slide-push",
  category: "transition",
  name: "Slide push",
  does: "The new scene rises in from below while the old one slides up and away.",
  says: ["flow", "transition", "step"],
  energy: 3,
  targets: ["scene"],
  duration: [0.4, 0.7],
  params: {
    direction: { type: "choice", options: ["up", "down", "left", "right"], default: "up" },
    distance: { type: "number", range: [0.2, 0.4], default: 0.28 },
  },
  pairs: ["text-in.punchline", "transition.whip-pan", "transition.dip-through-background"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "own:lib/live-engine/worker/vendor/recipes.js", license: "own", note: "R.scene slide family" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const scene = ctx.scene || stage;
    /** the old frame: the scene before this one when the film has it, else a copy of this layout in the look's inverse */
    const oldFrame = (scene) => {
      let prev = scene.previousElementSibling;
      while (prev && !(prev.classList && prev.classList.contains("ml-scene"))) prev = prev.previousElementSibling;
      const g = document.createElement("div");
      g.dataset.mlFx = "1";
      g.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;background:var(--x-ground);background-image:var(--x-ground-image);color:var(--x-ink)";
      for (const c of (prev || scene).children) if (!(c.dataset && c.dataset.mlFx)) g.append(c.cloneNode(true));
      g.querySelectorAll("[data-slot],[id]").forEach((e) => { e.removeAttribute("data-slot"); e.removeAttribute("id"); });
      if (!prev) {
        const cs = getComputedStyle(scene), v = (n) => cs.getPropertyValue(n).trim();
        const ground = v("--x-ink"), ink = v("--x-ground");
        const set = { "--x-ground": ground, "--x-ink": ink, "--x-dim": `color-mix(in srgb, ${ink} 66%, transparent)`, "--x-panel": `color-mix(in srgb, ${ink} 9%, ${ground})`, "--x-panel-2": `color-mix(in srgb, ${ink} 14%, ${ground})`, "--x-line": `color-mix(in srgb, ${ink} 14%, transparent)`, "--x-edge-color": `color-mix(in srgb, ${ink} 14%, transparent)`, "--x-ground-image": "none" };
        for (const [k, x] of Object.entries(set)) g.style.setProperty(k, x);
        g.style.background = ground; g.style.color = ink;
      }
      return g;
    };
    // the old frame: the scene before this one, else this layout in the look's inverse
    const A = oldFrame(scene);
    // the new frame: this scene's own blocks, wrapped so they travel as one sheet on their ground
    const B = document.createElement("div");
    B.dataset.mlFx = "1";
    B.style.cssText = "position:absolute;inset:0";
    for (const c of [...scene.children]) if (!c.dataset.mlFx) B.append(c);
    scene.append(A, B);
    const dir = p.direction;
    const side = dir === "left" || dir === "right";
    // the way the content travels: up → content moves toward −y; left → toward −x (mirrored in RTL)
    let sx = 0, sy = 0;
    if (dir === "up") sy = -1; else if (dir === "down") sy = 1;
    else sx = (dir === "left" ? -1 : 1) * (ctx.rtl ? -1 : 1);
    const span = (side ? f.W : f.H) * ML.clamp(+p.distance || 0.28, 0.2, 0.4);
    const inA = at, inB = at + 0.4, outA = at, outB = at + 0.3;
    const p3o = (x) => 1 - Math.pow(1 - x, 3), p2i = (x) => x * x;
    ctx.sfx(at, "whoosh.soft", 0.4);
    const put = (el, d) => { el.style.translate = Math.abs(d) < 0.01 ? "" : side ? `${d.toFixed(2)}px 0` : `0 ${d.toFixed(2)}px`; };
    const s = side ? sx : sy;
    return {
      draw(t) {
        const before = t < inA;
        // old: still before the cut, then it slides away and fades
        const o = p2i(ML.lin(t, outA, outB));
        A.style.visibility = t >= outB ? "hidden" : "visible";
        put(A, s * span * o);
        A.style.opacity = o > 0 ? (1 - o).toFixed(4) : "";
        // new: below (or beside) the frame until the cut, then it rises into place on its own ground
        const i = p3o(ML.lin(t, inA, inB));
        B.style.visibility = before ? "hidden" : "visible";
        put(B, -s * span * (1 - i));
        const moving = t < inB;
        B.style.background = moving ? "var(--x-ground)" : "";
        B.style.backgroundImage = moving ? "var(--x-ground-image)" : "";
      },
    };
  },
});


// Zoom through: the old scene rushes toward the viewer and blurs away while the next one settles in from slightly
// small. Out: scale 1 -> out_scale (1.08-1.2), blur 0 -> `blur` px, autoAlpha 1 -> 0 over the last 0.3 s before the
// scene's end, power2.in. In: scale in_from (0.8-0.92) -> 1 over 0.4 s power3.out from the scene's start, so two scenes
// that both carry it pass through each other. The live engine's default transition family. Pictures are never
// blurred (the library's sharp rule): they rush and fade with the scene, the blur is on type, panels and shapes.
// Source: MotionGX lib/live-engine/worker/vendor/recipes.js R.scene "zoom" in / zoom-through out (own).
ML.define({
  id: "transition.zoom-through",
  category: "transition",
  name: "Zoom through",
  does: "The old scene rushes toward the viewer and blurs away while the next one settles in from slightly small.",
  says: ["energy", "transition", "speed"],
  energy: 3,
  targets: ["scene"],
  duration: [0.4, 0.7],
  params: {
    out_scale: { type: "number", range: [1.08, 1.2], default: 1.12 },
    in_from: { type: "number", range: [0.8, 0.92], default: 0.86 },
    blur: { type: "number", range: [8, 24], default: 16, unit: "px" },
    mode: { type: "choice", options: ["through", "in-only", "out-only"], default: "through" },
  },
  pairs: ["transition.whip-pan", "text-in.punchline"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "own:lib/live-engine/worker/vendor/recipes.js", license: "own", note: "R.scene: zoom in (0.86 -> 1, power3.out) and the zoom-through out (1 -> 1.12, blur 16, power2.in)" },
  setup(ctx) {
    const { p, end, at, stage } = ctx;
    const scene = ctx.scene || stage;
    const S = ML.clamp(p.out_scale, 1.08, 1.2), I = ML.clamp(p.in_from, 0.8, 0.92), B = ML.clamp(p.blur, 8, 24);
    const p2in = (x) => x * x, p3out = (x) => 1 - Math.pow(1 - x, 3);
    const PIC = /^(IMG|VIDEO|CANVAS|PICTURE)$/i;
    const hasPic = (e) => PIC.test(e.tagName) || !!e.querySelector("img,video,canvas,picture");
    const soft = [];
    const walk = (n) => { for (const c of n.children) { if (PIC.test(c.tagName)) continue; if (!hasPic(c)) soft.push(c); else walk(c); } };
    walk(scene);
    const doIn = p.mode !== "out-only", doOut = p.mode !== "in-only";
    const inA = ctx.from, inB = inA + 0.4, outB = Math.max(end, at + 0.45), outA = outB - 0.3;
    scene.style.transformOrigin = "50% 50%";
    if (doOut) ctx.sfx(outA, "whoosh.soft", 0.3);
    else if (inA > 0.01) ctx.sfx(inA, "whoosh.soft", 0.25);
    return {
      draw(t) {
        let s = 1, b = 0, o = 1;
        if (doIn && t < inB) s = I + (1 - I) * p3out(ML.lin(t, inA, inB));
        if (doOut && t > outA) { const x = p2in(ML.lin(t, outA, outB)); s = 1 + (S - 1) * x; b = B * x; o = 1 - x; }
        scene.style.scale = s === 1 ? "" : s.toFixed(4);
        // (at rest the kit's own opacity stands, so a dissolve into this scene still plays)
        if (o < 1 || scene === stage) scene.style.opacity = o < 1 ? o.toFixed(4) : "";
        soft.forEach((e) => { e.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : ""; });
      },
    };
  },
});

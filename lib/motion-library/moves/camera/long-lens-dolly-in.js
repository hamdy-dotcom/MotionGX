// Long-lens dolly in: the first shot eases in from further back, settling into the composed frame and holding.
// The source's intro rig: intro = clamp(τ / duration) through a damped progress (expo-out), io = 1 − intro, and the
// camera sits back by io (3D: z += io·5.6, y += io·0.65, fov += io·8). In 2D the scene's content scales
// distance → 1 (0.9 by default) and settles from lift% lower → 0 over `duration` (2.4 s); with depth the far ground and
// the near content separate a little (the content travels the full way, a backdrop layer only half of it), the way a
// wider lens at a greater distance flattens then opens up. Nothing is ever scaled above 1.
// Source: MengTo/Skills web-design/build-threejs-scroll-worlds demo/index.html (RIG.intro, io·5.6 / io·0.65 / io·8) (MIT).
ML.define({
  id: "camera.long-lens-dolly-in",
  category: "camera",
  name: "Opening long-lens dolly",
  does: "The first shot eases in from further back with a wider lens, settling into the composed frame.",
  says: ["arrival", "reveal", "luxury", "story"],
  energy: 2,
  targets: ["stage", "scene"],
  duration: [1.6, 3],
  params: {
    duration: { type: "number", range: [1.6, 3], default: 2.4, unit: "s" },
    distance: { type: "number", range: [0.85, 0.95], default: 0.9, unit: "scale-from" },
    lift: { type: "number", range: [0, 4], default: 2, unit: "%" },
    curve: { type: "choice", options: ["expo", "damped"], default: "expo" },
    depth: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "text-in.soft-rise", "camera.layer-parallax"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "MengTo/Skills:web-design/build-threejs-scroll-worlds", license: "MIT", note: "demo/index.html camera intro rig" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const host = ctx.scene || stage;
    const cam = document.createElement("div");
    cam.className = "ml-cam";
    cam.style.cssText = "position:absolute;inset:0;transform-origin:50% 50%";
    while (host.firstChild) cam.append(host.firstChild);
    host.append(cam);
    // a far backdrop that only moves half as much (the ground's own look, a soft vignette of the panel colour)
    let back = null;
    if (p.depth) {
      back = document.createElement("div");
      back.style.cssText = "position:absolute;inset:-4%;pointer-events:none;transform-origin:50% 50%;background:radial-gradient(ellipse at 50% 55%, color-mix(in srgb, var(--x-panel) 70%, transparent) 0%, transparent 62%)";
      host.insertBefore(back, cam);
    }
    const D = ML.clamp(p.duration, 1.6, 3);
    const s0 = ML.clamp(p.distance, 0.85, 0.95);
    const lift = (ML.clamp(p.lift, 0, 4) / 100) * f.H;
    // the damped curve: a critically damped spring reaching ~99.5% at D (closed form)
    const w = 7.4 / D;
    const curve = (tau) => {
      if (tau <= 0) return 0;
      if (p.curve === "damped") return Math.min(1, 1 - Math.exp(-w * tau) * (1 + w * tau));
      const x = ML.clamp(tau / D);
      return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
    };
    ctx.sfx(at, "swell", 0.3);
    return {
      draw(t) {
        const io = 1 - curve(t - at);
        const s = 1 - (1 - s0) * io;
        cam.style.transform = io < 1e-4 ? "none" : `translate3d(0, ${(io * lift).toFixed(2)}px, 0) scale(${s.toFixed(5)})`;
        if (back) {
          const sb = 1 - (1 - s0) * 0.5 * io;
          back.style.transform = io < 1e-4 ? "none" : `translate3d(0, ${(io * lift * 0.5).toFixed(2)}px, 0) scale(${sb.toFixed(5)})`;
          back.style.opacity = (0.6 + 0.4 * (1 - io)).toFixed(4);
        }
      },
    };
  },
});

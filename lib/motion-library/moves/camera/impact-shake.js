// Impact shake: on the hit the frame drops and rebounds in a short decaying shake (axial), or punches in and out
// radially (the biggest hits). Closed form in τ = t − hit, straight from the source module:
//   axial  offset_y = −a·e^(−7τ)·cos(2π·5.5τ)          (a in screen heights: 0.006 light, 0.016 heavy, 0.022 ultimate)
//   radial zoom     = 1 + 1.4a·e^(−6τ)·cos(2π·7τ) + a tiny seeded jitter
// both run at `scale` of the numbers (the demo runs shake at 0.6: felt, not thrown at the viewer), and the frame is
// overscanned by 1 + 2.2·|shake| so its edges never show. Fully seekable; nothing before the hit.
// Source: MengTo/Skills game-combat/lightning-energy-skill-vfx (SKILL.md "Shake", demo/src/stage.js) (MIT).
ML.define({
  id: "camera.impact-shake",
  category: "camera",
  name: "Impact shake",
  does: "The frame drops sharply and rebounds in a short decaying shake on a hit, or punches in and out radially on the biggest hit.",
  says: ["energy", "arrival", "urgency"],
  energy: 4,
  targets: ["scene", "stage"],
  duration: [0.3, 0.8],
  params: {
    mode: { type: "choice", options: ["axial", "radial"], default: "axial" },
    amplitude: { type: "number", range: [0.006, 0.022], default: 0.012, unit: "frame" },
    scale: { type: "number", range: [0.4, 1], default: 0.6 },
  },
  pairs: ["text-in.slam", "text-in.overlap-slam", "transition.flash-cut"],
  avoid: ["calm", "luxury", "ambient"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "MengTo/Skills:game-combat/lightning-energy-skill-vfx", license: "MIT", note: "shake law and the 0.6 demo scale from SKILL.md / demo/src/stage.js" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const host = ctx.scene || stage;
    // the camera: one wrapper around the scene's content, so the shake composes with moves on its parts
    const cam = document.createElement("div");
    cam.className = "ml-cam";
    cam.style.cssText = "position:absolute;inset:0;transform-origin:50% 50%";
    while (host.firstChild) cam.append(host.firstChild);
    host.append(cam);
    const H = f.H;
    const a = ML.clamp(p.amplitude, 0.006, 0.022) * ML.clamp(p.scale, 0.4, 1);
    const LIFE = 1.1; // e^(−6·1.1) ≈ 0.001: settled
    ctx.sfx(at, a > 0.011 ? "sub" : "hit", 0.35 + a * 12);
    return {
      draw(t) {
        const tau = t - at;
        if (tau < 0 || tau > LIFE) { cam.style.transform = "none"; return; }
        let dy = 0, dx = 0, zoom = 1, shake = 0;
        if (p.mode === "radial") {
          const k = 1.4 * a * Math.exp(-6 * tau) * Math.cos(2 * Math.PI * 7 * tau);
          // tiny jitter, re-rolled 30 times a second from the frame index (seeded: same τ, same jitter)
          const fi = Math.floor(tau * 30), env = Math.exp(-6 * tau) * a * H * 0.12;
          dx = (ML.rnd(fi, 3) - 0.5) * 2 * env;
          dy = (ML.rnd(fi, 9) - 0.5) * 2 * env;
          zoom = 1 + k;
          shake = Math.abs(k) + Math.hypot(dx, dy) / H;
        } else {
          const o = -a * Math.exp(-7 * tau) * Math.cos(2 * Math.PI * 5.5 * tau);
          dy = -o * H; // the drop: offset_y < 0 in the source's y-up space reads as the frame dropping
          shake = Math.abs(o);
        }
        const over = 1 + 2.2 * shake;
        cam.style.transform = `translate3d(${dx.toFixed(2)}px,${dy.toFixed(2)}px,0) scale(${(zoom * over).toFixed(5)})`;
      },
    };
  },
});

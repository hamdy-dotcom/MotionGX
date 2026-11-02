// Analytical diagram drift: the whole diagram very slightly tilts and floats in 3D, as if a camera were slowly orbiting a
// model under study. One transform on the diagram group (origin at its centre, perspective ~1200 px at a 1080 short
// side): rotationY 0 → rot, rotationX 0 → rot / 2, y 0 → −lift, yoyo over a `period` half-period on sine.inOut, in closed
// form so it seeks: k = 0.5 − 0.5·cos(π·τ / period); rotY = rot·k, rotX = rot/2·k, y = −lift·k. Kept tiny (≤ 3°, ≤ 8 px)
// so labels and hairlines stay legible; the content inside does not animate with it. It enters already moving (k starts
// at zero velocity), holds as long as the scene and leaves with it. Sharp: the group is pushed back by its nearest
// corner's depth each frame, so no part is ever projected larger than 1 under the 3D transform. RTL orbits the other way.
// Source: MengTo/Skills web-design/technical-wireframe-info-layout (MIT) — "slow rotation, slight drift" analytical motion.
ML.define({
  id: "camera.analytical-drift",
  category: "camera",
  name: "Analytical diagram drift",
  does: "A whole diagram very slightly tilts and floats in 3D, as if a camera were slowly orbiting a model under study.",
  says: ["tech", "precision", "calm", "ambient"],
  energy: 1,
  targets: ["chart", "stage", "screen"],
  duration: [3, 12],
  params: {
    rotation: { type: "number", range: [0.5, 3], default: 1, unit: "deg" },
    lift: { type: "number", range: [2, 8], default: 4, unit: "px" },
    period: { type: "number", range: [4, 10], default: 6, unit: "s" },
  },
  pairs: ["data.perspective-line-draw", "accent.callout-leader", "camera.slow-push"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:web-design/technical-wireframe-info-layout", license: "MIT", note: "subtle analytical drift (SKILL.md motion notes); closed-form yoyo is our own" },
  setup(ctx) {
    const { el, p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const whole = !el || el === stage || el === host;
    let node;
    if (whole) {
      // the camera: one wrapper around the scene's content, so the drift composes with moves on its parts
      node = document.createElement("div");
      node.className = "ml-cam";
      node.style.cssText = "position:absolute;inset:0";
      while (host.firstChild) node.append(host.firstChild);
      host.append(node);
    } else node = el;
    const w = whole ? f.W : node.offsetWidth || f.W, h = whole ? f.H : node.offsetHeight || f.H;
    const P = 1200 * (Math.min(f.W, f.H) / 1080);
    const rot = (ML.clamp(p.rotation, 0.5, 3) * Math.PI) / 180, lift = ML.clamp(p.lift, 2, 8) * (Math.min(f.W, f.H) / 1080);
    const period = ML.clamp(p.period, 4, 10), dir = ctx.rtl ? -1 : 1;
    const base = whole ? "" : node.style.transform && node.style.transform !== "none" ? node.style.transform + " " : "";
    node.style.transformOrigin = "50% 50%";
    return {
      draw(t) {
        const tau = ML.clamp(t, at, Math.max(at, end)) - at; // holds its last pose past ctx.end
        const k = 0.5 - 0.5 * Math.cos((Math.PI * tau) / period);
        if (k < 1e-5) { node.style.transform = base ? base.trim() : "none"; return; }
        const ry = rot * k * dir, rx = rot * 0.5 * k, y = -lift * k;
        // nearest corner's depth under the tilt: push the group back by it so nothing projects past 1
        const z = (w / 2) * Math.abs(Math.sin(ry)) + (h / 2) * Math.abs(Math.sin(rx));
        node.style.transform = `${base}perspective(${P.toFixed(0)}px) translate3d(0, ${y.toFixed(3)}px, ${(-z).toFixed(3)}px) rotateX(${((rx * 180) / Math.PI).toFixed(4)}deg) rotateY(${((ry * 180) / Math.PI).toFixed(4)}deg)`;
      },
    };
  },
});

// Slow high-angle crane drift: a high broadcast-style camera slowly drifts over the scene while the action inside it
// carries on. The camera looks down at `elevation` (25–50°) and its position lerps `amount` of the scene (dolly or pan)
// over the whole shot on sine.inOut, so the shot stays alive without a cut. Built as the 2D fallback of the 3D rig: the
// scene's parts are planes on a floor seen from above — a part lower in the frame is nearer the camera — so a lateral
// crane moves each part by amount·W·m (m from 1 − spread/2 at the top of the frame to 1 + spread/2 at the bottom,
// spread = cos(elevation)·0.5: a steeper camera flattens the depth), and a dolly forward / back is a scale 1 ↔ 1 + amount
// around the frame's lower third plus a vertical slide of amount·H·sin(elevation)·m. 2D only, so the raster stays sharp;
// the moves inside the scene (walks, loops) keep running since only their planes are carried. A full-bleed plane is
// overscanned by its travel from the first frame, so a lateral drift never bares its edge. Lateral directions follow the
// reading direction (RTL mirrors left / right).
// Source: prompt-motion blueoctopusai-make-a-motion-graphics (reference only — rebuilt as our own code).
ML.define({
  id: "camera.crane-drift",
  category: "camera",
  name: "Slow high-angle crane drift",
  does: "A high broadcast-style camera slowly drifts over the scene while the action inside continues.",
  says: ["ambient", "story"],
  energy: 2,
  targets: ["stage", "scene"],
  duration: [3, 15],
  params: {
    direction: { type: "choice", options: ["left", "right", "forward", "back"], default: "left" },
    amount: { type: "number", range: [0.02, 0.08], default: 0.04, unit: "scene" },
    elevation: { type: "number", range: [25, 50], default: 35, unit: "deg" },
  },
  pairs: ["camera.iso-orbit", "camera.handheld-drift", "text-in.punchline"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "prompt-motion:blueoctopusai-make-a-motion-graphics", license: "reference", note: "our own 2D crane rig (depth by frame height) after the video's high-angle drift" },
  setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H;
    const cam = document.createElement("div");
    cam.className = "ml-cam";
    cam.style.cssText = "position:absolute;inset:0";
    while (host.firstChild) cam.append(host.firstChild);
    host.append(cam);
    const a = ML.clamp(p.amount, 0.02, 0.08);
    const el = (ML.clamp(p.elevation, 25, 50) * Math.PI) / 180;
    const spread = Math.cos(el) * 0.5;
    // the planes: the scene's parts, each at the depth its place on the floor gives it (lower in frame = nearer)
    const planes = [...cam.children].filter((n) => n.nodeType === 1 && !/^(SCRIPT|STYLE)$/.test(n.tagName)).map((n) => {
      const b = ctx.box(n), cy = ML.clamp((b.y + b.h / 2) / H);
      const m = 1 + spread * (cy - 0.5) * 2 * 0.5;
      const full = b.x <= 2 && b.y <= 2 && b.x + b.w >= W - 2 && b.y + b.h >= H - 2;
      return { n, m, b, full, base: n.style.transform && n.style.transform !== "none" ? n.style.transform + " " : "" };
    });
    let dir = p.direction;
    if (ctx.rtl && (dir === "left" || dir === "right")) dir = dir === "left" ? "right" : "left";
    // origin of the dolly: the floor point under the camera's line of sight (lower third, rising with elevation)
    const oy = H * (0.5 + 0.18 * Math.cos(el));
    // every plane scales about the same frame point: its origin in the plane's own box
    for (const pl of planes) pl.n.style.transformOrigin = `${(W / 2 - pl.b.x).toFixed(1)}px ${(oy - pl.b.y).toFixed(1)}px`;
    const sine = (x) => -(Math.cos(Math.PI * x) - 1) / 2;
    return {
      draw(t) {
        const u = sine(ML.lin(t, at, end));
        for (const pl of planes) {
          let tx = 0, ty = 0, s = 1;
          if (dir === "left" || dir === "right") {
            // the camera cranes left → the floor slides right under it (nearer planes faster)
            tx = (dir === "left" ? 1 : -1) * a * W * u * pl.m;
            if (pl.full) s = 1 + 2 * a * pl.m;
            ty = -a * H * 0.15 * Math.sin(el) * u * (pl.m - 1) * 4; // a faint rise from the arc of the crane
          } else {
            const g = dir === "forward" ? u : 1 - u;
            s = 1 + a * g * pl.m;
            ty = a * H * Math.sin(el) * g * pl.m * 0.5;
          }
          pl.n.style.transform = `${pl.base}translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${s.toFixed(5)})`;
        }
      },
    };
  },
});

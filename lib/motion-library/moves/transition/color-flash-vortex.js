// Colour flash vortex: the frame floods a bright colour in two frames, a dark soft-edged hole (a radial gradient) at
// the centre scales 0.5 -> 3 over 0.3 s power3.in as if the picture is being pulled through it, then a cut: the scene
// is gone and the next one plays. Optional radial zoom blur on the fill: fine conic rays streaming out of the centre.
// Colour is a look name (accent, accent-2, ink, good, bad) or a --x- variable; the hole is the look's device dark.
// Source: prompt-motion ceowinkz-wtf-ai-just-made (reference only: our own rebuild).
ML.define({
  id: "transition.color-flash-vortex",
  category: "transition",
  name: "Colour flash vortex",
  does: "The frame floods a bright colour with a dark blurred hole at the centre, as if being pulled through, into the next scene.",
  says: ["transition", "energy", "speed"],
  energy: 5,
  targets: ["scene"],
  duration: [0.3, 0.5],
  params: {
    colour: { type: "text", default: "accent" },
    zoom_blur: { type: "bool", default: false },
    length: { type: "number", range: [0.3, 0.5], default: 0.38, unit: "s" },
  },
  pairs: ["camera.snap-zoom", "text-in.slam"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.heavy",
  source: { from: "prompt-motion:ceowinkz-wtf-ai-just-made", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const scene = ctx.scene || null;
    const W = f.W, H = f.H, diag = Math.hypot(W, H);
    const c = String(p.colour || "accent").trim();
    const col = c.startsWith("--x-") ? `var(${c})` : /^(accent|accent-2|ink|good|bad|panel|ground|dim)$/.test(c) ? `var(--x-${c})` : "var(--x-accent)";
    const fill = document.createElement("div");
    fill.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:6;overflow:hidden;opacity:0;background:radial-gradient(circle at 50% 50%, color-mix(in srgb, ${col} 82%, var(--x-accent-ink)) 0%, ${col} 70%)`;
    const rays = document.createElement("div");
    const R = diag;
    rays.style.cssText = `position:absolute;left:${W / 2 - R}px;top:${H / 2 - R}px;width:${2 * R}px;height:${2 * R}px;border-radius:50%;` +
      `background:repeating-conic-gradient(from 0deg, color-mix(in srgb, var(--x-accent-ink) 30%, transparent) 0deg 0.6deg, transparent 0.6deg 3.1deg);` +
      `-webkit-mask-image:radial-gradient(circle, transparent 6%, #000 40%, transparent 70%);mask-image:radial-gradient(circle, transparent 6%, #000 40%, transparent 70%);display:${p.zoom_blur ? "block" : "none"}`;
    const hole = document.createElement("div");
    const r0 = Math.min(W, H) * 0.32;
    hole.style.cssText = `position:absolute;left:${W / 2 - r0}px;top:${H / 2 - r0}px;width:${2 * r0}px;height:${2 * r0}px;border-radius:50%;` +
      `background:radial-gradient(circle, var(--x-device) 0%, color-mix(in srgb, var(--x-device) 88%, transparent) 38%, color-mix(in srgb, var(--x-device) 40%, transparent) 60%, transparent 72%)`;
    fill.append(rays, hole);
    (scene || stage).append(fill); // inside the scene: a seek past it can never leave the flood on the next one
    const L = ML.clamp(p.length, 0.3, 0.5);
    const on = at + 2 / 30, hA = at + 0.05, hB = hA + 0.3, cut = Math.max(hB, at + L);
    const p3in = (x) => x ** 4;
    // the hole has to cover the frame by scale 3 → its radius grows with the frame's diagonal
    const need = (diag / 2) / (r0 * 0.72);
    ctx.sfx(at, "whoosh.heavy", 0.5);
    return {
      draw(t) {
        const live = t >= at && t < cut;
        fill.style.opacity = live ? ML.lin(t, at, on).toFixed(4) : "0";
        fill.style.visibility = live ? "visible" : "hidden";
        if (live) {
          const h = p3in(ML.lin(t, hA, hB));
          const s = 0.5 + (Math.max(3, need) - 0.5) * h;
          hole.style.transform = `scale(${s.toFixed(4)})`;
          const u = ML.lin(t, at, cut);
          rays.style.transform = `rotate(${(u * 8).toFixed(2)}deg) scale(${(0.6 + 0.8 * u).toFixed(4)})`;
          rays.style.opacity = (0.4 + 0.6 * u).toFixed(3);
        }
        // the cut: past the vortex the scene is gone (the next scene takes the frame)
        if (scene) scene.style.visibility = t >= cut ? "hidden" : "";
      },
    };
  },
});

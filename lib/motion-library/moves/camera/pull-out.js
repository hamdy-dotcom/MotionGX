// Pull-out: the camera eases back from a detail to show the whole canvas or app around it. One camera key from the
// detail (zoom `from`, 1.2–2.5x) to the whole (zoom `to`, 1 or down to 0.6) on product-film's heavy overdamped camera
// spring (stiffness 120, damping 30, mass 1.2: ~24% at 0.1 s, 52% at 0.2 s, 82% at 0.4 s, 98% at 0.8 s, no overshoot)
// or the lighter glide spring (150 / 20); the zoom is tracked in log space (ML.camera) so the pull feels linear in
// perceived scale, and the focus point travels to the frame's centre on the same spring. 2D transform only, so text
// is re-rasterised sharp; while zoomed past 1 the view is clamped so the world always fills the frame. Below 1 the
// whole scene sits as a card on the ground (the look's radius and shadow), which is what "the whole canvas" reads as,
// held inside the frame so the camera passes through 1x without a jump. The start zoom stays within the pixels of the
// raster pictures in its view.
// Source: Rieranthony/product-film-skill reference/ingredients.md "Camera moves" (heavy spring, log zoom) (MIT).
ML.define({
  id: "camera.pull-out",
  category: "camera",
  name: "Heavy-spring pull-out to reveal the whole",
  does: "The camera eases back from a detail to show the whole canvas or app around it.",
  says: ["reveal", "scale", "result"],
  energy: 2,
  targets: ["stage", "screen"],
  duration: [0.8, 2],
  params: {
    from: { type: "number", range: [1.2, 2.5], default: 1.8, unit: "x" },
    to: { type: "number", range: [0.6, 1], default: 1, unit: "x" },
    spring: { type: "choice", options: ["camera", "glide"], default: "camera" },
  },
  pairs: ["camera.push-in", "camera.zoom-out-to-many"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "product-film-skill:reference/ingredients.md", license: "MIT", note: "Camera moves: heavy overdamped spring, zoom in log space" },
  setup(ctx) {
    const { el, p, at, stage, f } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H;
    const hb = host.getBoundingClientRect(), k = hb.width / (host.offsetWidth || 1) || 1;
    const rel = (n) => { const r = n.getBoundingClientRect(); return { x: (r.left - hb.left) / k, y: (r.top - hb.top) / k, w: r.width / k, h: r.height / k }; };
    // the detail it starts on: a marked focus inside the target, the target screen, or the picture area's main thing
    const own = el && el !== stage && el !== host ? el : null;
    const det = (own && own.querySelector("[data-focus]")) || own || host.querySelector("[data-focus]") || host.querySelector(".ml-pic .ml-panel") || host.querySelector(".ml-pic img") || host.querySelector(".ml-pic");
    const F = det ? rel(det) : { x: W / 2, y: H / 2, w: 1, h: 1 };
    const fx = F.x + F.w / 2, fy = F.y + F.h / 2;

    const cam = document.createElement("div");
    cam.className = "ml-cam";
    cam.style.cssText = "position:absolute;inset:0;transform-origin:0 0;background:var(--x-ground);background-image:var(--x-ground-image)";
    while (host.firstChild) cam.append(host.firstChild);
    host.append(cam);

    let Z0 = ML.clamp(p.from, 1.2, 2.5);
    const Z1 = ML.clamp(p.to, 0.6, 1);
    // no raster picture in the opening view is shown past its own pixels
    const view = { x0: fx - W / (2 * Z0), x1: fx + W / (2 * Z0), y0: fy - H / (2 * Z0), y1: fy + H / (2 * Z0) };
    for (const i of cam.querySelectorAll("img")) {
      if (!i.naturalWidth || /^data:image\/svg|\.svg(\?|$)/i.test(i.currentSrc || i.src)) continue;
      const q = rel(i);
      if (q.x > view.x1 || q.x + q.w < view.x0 || q.y > view.y1 || q.y + q.h < view.y0) continue;
      Z0 = Math.min(Z0, Math.max(1, Math.min(i.naturalWidth / Math.max(1, q.w), i.naturalHeight / Math.max(1, q.h))));
    }
    const cfg = p.spring === "glide" ? ML.SPRING.glide : ML.SPRING.camera;
    const keys = [[0, fx, fy, Z0], [at, W / 2, H / 2, Z1]];
    ctx.sfx(at, "whoosh.soft", 0.26);

    return {
      draw(t) {
        const c = ML.camera(t, keys, cfg);
        const z = c.zoom;
        let tx = W / 2 - z * c.x, ty = H / 2 - z * c.y;
        if (z >= 1) { tx = ML.clamp(tx, W - z * W, 0); ty = ML.clamp(ty, H - z * H, 0); }
        else { tx = ML.clamp(tx, 0, W - z * W); ty = ML.clamp(ty, 0, H - z * H); }
        cam.style.transform = Math.abs(z - 1) < 1e-4 && Math.abs(tx) < 0.01 && Math.abs(ty) < 0.01 ? "none" : `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${z.toFixed(4)})`;
        // below 1x the whole scene reads as a card on the ground
        const card = ML.clamp((1 - z) / 0.08);
        cam.style.borderRadius = card > 0 ? `calc(var(--x-radius) * ${(card / z).toFixed(3)})` : "0";
        cam.style.boxShadow = card > 0 ? "var(--x-shadow)" : "none";
        cam.style.overflow = card > 0 ? "hidden" : "visible";
        host.style.background = card > 0 ? "color-mix(in srgb, var(--x-ground) 88%, var(--x-ink))" : "";
      },
    };
  },
});

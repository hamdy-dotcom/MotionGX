// Push-in on the key moment: on the beat the camera leans toward the important part (a field, the object, where the
// cursor clicks) and settles. One camera key [t_hit, x, y, zoom]; the zoom runs in log space so every doubling takes
// the same time. Eases: product-film's heavy overdamped camera spring (stiffness 120, damping 30, mass 1.2: ~52% at
// 0.2 s, ~98% at 0.8 s, no bounce), expo.inOut 0.8 s, power2.inOut 0.6 s (on the cursor as it arrives) or a quartic
// in-out ~1.5 s for the deep push. Travelling pivot (html-reel demo): the pivot leaves the window's centre for the focus
// point during the first 35% of the push, so the window grows around the field instead of sweeping across it.
// Transform translate(p − s·q) scale(s), 2D only (no perspective) so text stays a sharp raster; the view is clamped so
// the zoomed world always fills the frame (no slab of background at an edge). Hold: a slow creep of +0–8%. Release:
// cubic ease back to rest in ~0.75 s, or stay. Deep push (edge_fade): the world's lower part dissolves through a
// mask-image gradient (alpha 1 / .8 / .5 / .2 / 0 over ~180 px of the frame) eased in with the push, and a band behind
// brightens 0.35 → 1.
// Sources: MengTo/Skills media/html-reel demo/index.html (the camera in draw(t): quart push, pivot travel, creep, mask)
// and Rieranthony/product-film-skill reference/ingredients.md "Camera moves" (heavy spring, log zoom) (MIT).
ML.define({
  id: "camera.push-in",
  category: "camera",
  name: "Push-in on the key moment",
  does: "At the key moment the camera leans in toward the important part (a UI field, the object, where the cursor clicks) and settles, optionally holding and pulling back.",
  says: ["focus", "precision", "reveal", "tech", "step"],
  energy: 3,
  targets: ["screen", "stage", "card", "cursor", "image", "scene"],
  duration: [0.6, 3],
  params: {
    zoom: { type: "number", range: [1.1, 5], default: 1.6, unit: "x" },
    ease: { type: "choice", options: ["spring", "expo.inOut", "power2.inOut", "quartic"], default: "spring" },
    origin: { type: "choice", options: ["element", "cursor", "point"], default: "element" },
    pivot_travel: { type: "bool", default: true },
    hold_creep: { type: "number", range: [0, 0.08], default: 0.03 },
    pull_back: { type: "bool", default: false },
    edge_fade: { type: "bool", default: false },
  },
  pairs: ["ui.cursor-glide-click", "ui.field-zoom-type", "camera.slow-push", "camera.pull-out"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:media/html-reel", license: "MIT", note: "camera from demo/index.html draw(t); heavy log-space spring from product-film-skill reference/ingredients.md (MIT)" },
  setup(ctx) {
    const { el, p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const VW = f.W, VH = f.H;
    const hb = host.getBoundingClientRect(), k = hb.width / (host.offsetWidth || 1) || 1;
    const rel = (n) => { const r = n.getBoundingClientRect(); return { x: (r.left - hb.left) / k, y: (r.top - hb.top) / k, w: r.width / k, h: r.height / k }; };

    // what the camera leans toward (measured before the camera wraps the scene)
    const own = el && el !== stage && el !== host ? el : null;
    const cursor = host.querySelector('[data-slot="cursor"], .ml-cursor, [data-cursor]');
    const fallback = own || host.querySelector("[data-focus], input, button, textarea") || host.querySelector(".ml-pic .ml-panel, .ml-pic img, .ml-pic") || null;
    let F;
    if (p.origin === "cursor" && cursor) { const b = rel(cursor); F = { x: b.x + Math.min(b.w, 24) * 0.3, y: b.y + Math.min(b.h, 24) * 0.3, w: 1, h: 1 }; }
    else if (p.origin === "point") { const r = f.pic; F = { x: r.x + r.w / 2, y: r.y + r.h * 0.45, w: 1, h: 1 }; }
    else if (fallback) F = rel(fallback);
    else F = { x: VW / 2, y: VH / 2, w: 1, h: 1 };
    const fx = F.x + F.w / 2, fy = F.y + F.h / 2;

    // the camera: one wrapper around the scene, so it composes with moves on its parts
    const band = document.createElement("div");
    band.style.cssText = "position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(ellipse 70% 45% at 50% 58%, color-mix(in srgb, var(--x-accent) 32%, transparent), transparent 72%)";
    const cam = document.createElement("div");
    cam.className = "ml-cam";
    cam.style.cssText = "position:absolute;inset:0;transform-origin:0 0";
    while (host.firstChild) cam.append(host.firstChild);
    host.append(band, cam);

    // never past a picture's pixels: the pictures in the framing the push ends on limit the zoom (and the creep after it)
    const pixLimit = (n) => { // how much further a picture may scale before it runs past its own pixels (a vector has no limit)
      const nw = n.naturalWidth || n.videoWidth || 0, nh = n.naturalHeight || n.videoHeight || 0;
      if (!nw || !nh || /\.svg|image\/svg/i.test(n.currentSrc || n.src || "")) return Infinity;
      const r = n.getBoundingClientRect(), K = k, fit = getComputedStyle(n).objectFit;
      return Math.max(1, 1 / (fit === "contain" ? Math.min(r.width / K / nw, r.height / K / nh) : Math.max(r.width / K / nw, r.height / K / nh)));
    };
    const seesAt = (z, b) => { const x0 = ML.clamp(fx - VW / (2 * z), 0, VW - VW / z), y0 = ML.clamp(fy - VH / (2 * z), 0, VH - VH / z); return b.x < x0 + VW / z && b.x + b.w > x0 && b.y < y0 + VH / z && b.y + b.h > y0; };
    let room = Infinity;
    for (const n of cam.querySelectorAll("img, video")) if (seesAt(ML.clamp(p.zoom, 1.1, 5), rel(n))) room = Math.min(room, pixLimit(n));
    const Z = Math.min(ML.clamp(p.zoom, 1.1, 5), room);
    const creep = Math.min(ML.clamp(p.hold_creep, 0, 0.08), room / Z - 1);
    const lnZ = Math.log(Z);
    const cubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2); // GSAP's power2
    const quart = (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2);
    const expoIO = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2);
    const ease = p.ease;
    const D = ease === "quartic" ? 1.5 : ease === "power2.inOut" ? 0.6 : 0.8;
    const pushE = (t) => {
      if (ease === "spring") return ML.clamp(ML.step(t - at, ML.SPRING.camera));
      const x = ML.lin(t, at, at + D);
      return ease === "quartic" ? quart(x) : ease === "power2.inOut" ? cubic(x) : expoIO(x);
    };
    const pushEnd = at + D;
    const relA = p.pull_back ? Math.max(pushEnd + 0.15, end - 0.8) : Infinity;
    const relB = p.pull_back ? Math.max(relA + 0.05, Math.min(end - 0.05, relA + 0.75)) : Infinity;
    const holdTo = Math.min(end, relA);
    ctx.sfx(Math.max(0, at - 0.06), "whoosh.soft", 0.3);
    if (p.pull_back) ctx.sfx(relA, "whoosh.soft", 0.18);

    return {
      draw(t) {
        let e = pushE(t);
        if (p.pull_back) e *= 1 - ML.ease(t, relA, relB);
        if (e <= 0.0005) { cam.style.transform = "none"; cam.style.maskImage = cam.style.webkitMaskImage = "none"; band.style.opacity = "0"; return; }
        const hold = holdTo > pushEnd ? ML.ease(t, pushEnd, holdTo) * e : 0;
        const s = Math.exp(lnZ * e) * (1 + creep * hold);
        // the pivot: from the frame's centre to the focus point over the first 35% of the push (or the focus throughout)
        const b = p.pivot_travel ? ML.ease(e, 0, 0.35) : 1;
        const qx = VW / 2 + (fx - VW / 2) * b, qy = VH / 2 + (fy - VH / 2) * b;
        // where that pivot sits on screen: its resting place, travelling to the frame's centre
        const px = qx + (VW / 2 - qx) * e, py = qy + (VH / 2 - qy) * e;
        // the zoom fills the frame: never a slab of background at an edge
        const tx = ML.clamp(px - s * qx, VW - s * VW, 0), ty = ML.clamp(py - s * qy, VH - s * VH, 0);
        cam.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${s.toFixed(4)})`;
        if (p.edge_fade) {
          const kf = ML.ease(e, 0.05, 0.55);
          const y0 = F.y + F.h + 24 / s, span = 180 / s;
          const al = [1, 0.8, 0.5, 0.2, 0].map((v) => (1 + (v - 1) * kf).toFixed(3));
          const m = `linear-gradient(180deg, ${al.map((a, i) => `rgba(0,0,0,${a}) ${(y0 + (i * span) / 4).toFixed(1)}px`).join(", ")})`;
          cam.style.maskImage = cam.style.webkitMaskImage = m;
          band.style.opacity = ((0.35 + 0.65 * ML.ease(e, 0.1, 0.6)) * ML.lin(e, 0, 0.15)).toFixed(4);
        }
      },
    };
  },
});

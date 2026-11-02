// Object rush to camera: an object on screen (a circle, square, blob or diamond in the accent) pops in, then rushes at
// the viewer — scale 1 -> enough to cover the frame over 0.38 s (expo.in, cubic-bezier(0.7, 0, 0.84, 0)), its centre
// drifting to frame centre, a slight ellipse (scaleX 1.1) selling the lens, depth-of-field blur ramping 0 -> `blur`,
// an optional spin, and 0-6 ghost copies trailing at larger scale and lower opacity (a zoom-blur in DOM). The rest of
// the frame dollies with it (scale 1 -> 1.3, text blurring; pictures only scale as far as their pixels allow, never
// blur). A diamond spins up to 6x and cuts. At full cover it cuts to a flat field of the object's colour (the next
// scene's ground), or to a 2-3 frame solid accent frame with a slight radial vignette, after which the headline
// slams back on the ground. The object is a flat shape, so scaling it stays sharp; sizes are shares of the short side.
// Source: prompt-motion raphaelaubryy-gave-opus-5-5-a, shneural-after-opus-5-5-it, slvdev-opus-5-5-max-motion,
// grace-sunnyy-opus5-5-15 (reference only: our own rebuild).
ML.define({
  id: "transition.object-rush-to-camera",
  category: "transition",
  name: "Object rush to camera",
  does: "An object on screen rushes toward the viewer, growing, blurring (and maybe spinning) until its colour fills the frame and becomes the next scene.",
  says: ["transition", "energy", "speed", "playful"],
  energy: 5,
  targets: ["shape", "scene", "headline"],
  duration: [0.3, 0.6],
  params: {
    shape: { type: "choice", options: ["circle", "square", "blob", "diamond"], default: "circle" },
    spin: { type: "number", range: [0, 90], default: 0, unit: "deg" },
    blur: { type: "number", range: [0, 30], default: 10, unit: "px" },
    end: { type: "choice", options: ["cover", "flash-frame"], default: "cover" },
    dolly_others: { type: "bool", default: true },
    ghosts: { type: "number", range: [0, 6], default: 4 },
    colour: { type: "text", default: "accent" },
  },
  pairs: ["text-in.slam", "transition.colour-field-cut"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.heavy",
  source: { from: "prompt-motion:raphaelaubryy-gave-opus-5-5-a", license: "reference", note: "our own rebuild; also shneural-after-opus-5-5-it, slvdev-opus-5-5-max-motion, grace-sunnyy-opus5-5-15" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const W = f.W, H = f.H, v = Math.min(W, H) / 100;
    const host = ctx.scene || stage;
    const c = String(p.colour || "accent").trim(), n = c.replace(/\s+/g, "-");
    const col = c.startsWith("--x-") ? `var(${c})` : /^(accent|accent-2|ink|good|bad|device)$/.test(n) ? `var(--x-${n})` : "var(--x-accent)";
    const others = [...host.children];
    // where the object sits: beside the target (its reading-end side), else in the picture region
    const isEl = ctx.el && ctx.el !== stage;
    let ox, oy;
    if (isEl) { const b = ctx.box(ctx.el); ox = ctx.rtl ? Math.max(f.m + 6 * v, b.x - 8 * v) : Math.min(W - f.m - 6 * v, b.x + b.w + 8 * v); oy = b.y + b.h / 2; if (ox < 0 || ox > W) ox = W / 2; }
    else { ox = f.pic.x + f.pic.w * (ctx.rtl ? 0.32 : 0.68); oy = f.pic.y + f.pic.h * 0.42; }
    const r = 6 * v; // object radius
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:7;overflow:hidden";
    host.append(layer);
    const radius = { circle: "50%", square: "var(--x-radius)", blob: "58% 42% 50% 50% / 46% 56% 44% 54%", diamond: "12%" }[p.shape] || "50%";
    const NG = Math.round(ML.clamp(p.ghosts, 0, 6));
    const mkObj = (op) => { const d = document.createElement("div"); d.style.cssText = `position:absolute;left:0;top:0;width:${2 * r}px;height:${2 * r}px;background:${col};border-radius:${radius};transform-origin:50% 50%;opacity:${op}`; layer.append(d); return d; };
    const ghosts = [...Array(NG)].map((_, k) => mkObj(0)); // behind the object
    const edge = mkObj(0); edge.style.background = "color-mix(in srgb, var(--x-ink) 35%, transparent)"; // grey edge doubling
    const obj = mkObj(0);
    const field = document.createElement("div");
    field.style.cssText = `position:absolute;inset:0;background:${col};visibility:hidden`;
    layer.append(field);
    const flash = document.createElement("div");
    flash.style.cssText = `position:absolute;inset:0;visibility:hidden;background:radial-gradient(ellipse 75% 70% at 50% 50%, var(--x-accent) 55%, color-mix(in srgb, var(--x-accent) 70%, var(--x-device)) 100%)`;
    layer.append(flash);
    // the cover scale: the object's radius must reach the farthest corner from the frame centre (ellipse included)
    const cover = Math.hypot(W / 2, H / 2) / r * 1.08;
    const diamond = p.shape === "diamond";
    const sMax = diamond ? Math.min(6, cover) : cover;
    const popA = at, popB = at + 0.18, rA = popB + 0.12, rB = rA + (diamond ? 0.32 : 0.38);
    const flashB = rB + 0.1; // ~3 frames
    const curve = ML.bezier(0.7, 0, 0.84, 0);
    // pictures dolly only as far as their pixels allow
    let picCap = 1.3;
    const sk = stage.getBoundingClientRect().width / (stage.offsetWidth || 1) || 1;
    for (const img of host.querySelectorAll("img")) { const b = img.getBoundingClientRect(); if (img.naturalWidth && b.width) picCap = Math.min(picCap, Math.max(1, img.naturalWidth / (b.width / sk))); }
    // the headline that slams back after a flash frame
    const head = host.querySelector(".ml-head");
    ctx.sfx(popA, "pop", 0.3);
    ctx.sfx(rA, "whoosh.heavy", 0.45);
    ctx.sfx(rB, "hit", 0.4);
    const drawObj = (d, s, x, y, rot, blur, op) => {
      d.style.opacity = op.toFixed(4);
      d.style.transform = `translate(${(x - r).toFixed(2)}px, ${(y - r).toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${(s * (1 + 0.1 * Math.min(1, (s - 1) / 3))).toFixed(4)}, ${s.toFixed(4)})`;
      d.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
    };
    return {
      draw(t) {
        const e = curve(ML.lin(t, rA, rB));
        const covered = t >= rB;
        const pop = t < popA ? 0 : ML.back(t, popA, popB, 1.7);
        const s = (1 + (sMax - 1) * e) * Math.max(0.001, pop);
        const x = ox + (W / 2 - ox) * e, y = oy + (H / 2 - oy) * e;
        const rot = (diamond ? 45 : 0) + p.spin * e;
        const bl = p.blur * (v / 10.8) * e;
        drawObj(obj, s, x, y, rot, bl, covered ? 0 : Math.min(1, pop * 4));
        drawObj(edge, s * 1.02, x + 0.4 * v * e, y + 0.4 * v * e, rot, bl, covered || e <= 0 ? 0 : 0.5 * Math.min(1, e * 4));
        ghosts.forEach((g, k) => {
          const gs = (1 + (sMax - 1) * e) * (1 + 0.14 * (k + 1) * e);
          drawObj(g, gs, x, y, rot - p.spin * 0.08 * (k + 1) * e, bl * 1.4, covered || e <= 0 ? 0 : (0.45 / (k + 1)) * Math.min(1, e * 3));
        });
        // the rest dollies with the camera
        const de = p.dolly_others ? e : 0;
        for (const o of others) {
          const isPic = o.classList.contains("ml-pic");
          const sc = 1 + ((isPic ? picCap : 1.3) - 1) * de;
          o.style.transformOrigin = `${(W / 2 - o.offsetLeft).toFixed(1)}px ${(H / 2 - o.offsetTop).toFixed(1)}px`;
          o.style.scale = de > 0 ? sc.toFixed(4) : "none";
          o.style.filter = de > 0 && !isPic ? `blur(${(de * 10 * (v / 10.8)).toFixed(2)}px)` : "none";
          o.style.opacity = "1";
        }
        // the end: a held field of its colour, or a 3-frame accent flash then the headline slams back on the ground
        if (p.end === "cover") { field.style.visibility = covered ? "visible" : "hidden"; flash.style.visibility = "hidden"; }
        else {
          field.style.visibility = "hidden";
          flash.style.visibility = covered && t < flashB ? "visible" : "hidden";
          if (t >= flashB) {
            for (const o of others) { o.style.scale = "none"; o.style.filter = "none"; o.style.opacity = o === head ? "1" : "0"; }
            if (head) { const sl = ML.out(t, flashB, flashB + 0.16); head.style.scale = (1.12 - 0.12 * sl).toFixed(4); head.style.opacity = Math.min(1, ML.lin(t, flashB, flashB + 0.05)).toFixed(4); }
          } else if (head) head.style.removeProperty("opacity");
        }
      },
    };
  },
});

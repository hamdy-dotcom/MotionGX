// Layered photo reveal: two or three captioned photos reveal one over another in an overlapping lookbook layout. The
// back photo is the largest; each next one is smaller and offset by `offset` (12–20 %) toward the reading end and down.
// Each wipes up from its bottom edge — clip-path inset(100% 0 0 0) → inset(0) over 0.7 s power3.out — staggered
// back-to-front (or front-to-back); its caption (small, uppercase, tracked label) fades in 0.3 s after its photo. Only
// shallow transforms (a 14 px settle): the read comes from the overlap and the stagger. The layout is built over the
// target's box (the picture itself hides); photos are the scene's pictures, else different crops of the target.
// Source: MengTo/Skills agent-skills/web-design/editorial-service-booking (SKILL.md, MIT) — the layout and stagger are our own code.
ML.define({
  id: "mask.layered-photo-reveal",
  category: "mask",
  name: "Layered photo reveal",
  does: "Two or three captioned photos reveal one over another in an overlapping lookbook layout.",
  says: ["story", "luxury", "trust"],
  energy: 2,
  targets: ["image"],
  duration: [1, 2],
  params: {
    count: { type: "number", range: [2, 3], default: 3 },
    order: { type: "choice", options: ["back-to-front", "front-to-back"], default: "back-to-front" },
    offset: { type: "number", range: [12, 20], default: 16, unit: "%" },
    stagger: { type: "number", range: [0.1, 0.3], default: 0.18, unit: "s" },
    captions: { type: "bool", default: true },
  },
  pairs: ["text-in.soft-rise", "camera.slow-push"],
  avoid: ["urgency", "speed"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "card",
  source: { from: "MengTo/Skills:agent-skills/web-design/editorial-service-booking", license: "MIT", note: "layout idea from the skill; the code is our own" },
  setup(ctx) {
    const { el, p, at, stage } = ctx;
    if (!el) return null;
    const host = ctx.scene || stage;
    const n = Math.round(ML.clamp(+p.count, 2, 3)), off = ML.clamp(+p.offset, 12, 20) / 100;
    const b = ctx.box(el);
    // the photos: the target first, then the scene's other pictures; too few → other crops of the target
    const own = el.tagName === "IMG" ? el : el.querySelector("img");
    const pics = [own, ...[...host.querySelectorAll("img")].filter((i) => i !== own)].filter(Boolean);
    const crops = ["50% 50%", "18% 40%", "82% 60%"];
    const label = ((host.querySelector(".ml-label") || {}).textContent || "").trim();
    // the box the layout fills: the target's box, a thin strip grown a little (≤ 1.35×) toward 0.55 as tall as wide
    const bh = Math.max(b.h, Math.min(b.w * 0.55, b.h * 1.35, ctx.f.H * 0.45)), by = b.y + b.h / 2 - bh / 2, bx = b.x, bw = b.w;
    const layer = document.createElement("div");
    layer.style.cssText = `position:absolute;left:${bx}px;top:${by}px;width:${bw}px;height:${bh}px;pointer-events:none;z-index:2`;
    const items = [];
    for (let i = 0; i < n; i++) {
      const k = Math.pow(0.78, i), w = bw * 0.6 * k, h = bh * 0.84 * k;
      const x = i * off * 1.7 * bw, y = i * off * 0.9 * bh;
      const wrap = document.createElement("div");
      wrap.style.cssText = `position:absolute;top:${y}px;${ctx.rtl ? "right" : "left"}:${x}px;width:${w}px;height:${h}px`;
      const frame = document.createElement("div");
      frame.style.cssText = "position:absolute;inset:0;overflow:hidden;border-radius:var(--x-pic-radius);box-shadow:var(--x-shadow);background:var(--x-pic-ground)";
      const src = pics[i] || own;
      const img = document.createElement("img");
      if (src) img.src = src.currentSrc || src.src;
      img.style.cssText = `width:100%;height:100%;object-fit:cover;object-position:${pics[i] ? "50% 50%" : crops[i]};display:block;filter:var(--x-pic-filter);mix-blend-mode:var(--x-pic-blend)`;
      frame.append(img);
      wrap.append(frame);
      let cap = null;
      if (p.captions) {
        cap = document.createElement("div");
        cap.className = "ml-label";
        cap.style.cssText = `position:absolute;top:calc(100% + 10px);${ctx.rtl ? "right" : "left"}:0;font-size:${Math.round(18 * Math.min(ctx.f.W, ctx.f.H) / 1080)}px;white-space:nowrap;color:var(--x-dim)`;
        cap.textContent = `${String(i + 1).padStart(2, "0")}${label && i === 0 ? " — " + label : ""}`;
        wrap.append(cap);
      }
      layer.append(wrap);
      items.push({ wrap, frame, cap });
    }
    host.append(layer);
    el.style.visibility = "hidden";
    const st = ML.clamp(+p.stagger, 0.1, 0.3);
    const starts = items.map((_, i) => at + (p.order === "front-to-back" ? n - 1 - i : i) * st);
    starts.forEach((s, i) => ctx.sfx(s, "card", 0.3 - i * 0.05));
    const quart = (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), 4); // power3.out
    return {
      draw(t) {
        el.style.visibility = "hidden";
        items.forEach(({ wrap, frame, cap }, i) => {
          const u = quart(t, starts[i], starts[i] + 0.7);
          wrap.style.visibility = t >= starts[i] - 1e-6 ? "visible" : "hidden";
          frame.style.clipPath = u >= 1 ? "none" : `inset(${((1 - u) * 100).toFixed(3)}% -80px -80px -80px)`; // the shadow below shows as the photo rises
          wrap.style.translate = `0 ${((1 - u) * 14).toFixed(2)}px`;
          if (cap) { const c = ML.ease(t, starts[i] + 0.3, starts[i] + 0.6); cap.style.opacity = c.toFixed(3); }
        });
      },
    };
  },
});

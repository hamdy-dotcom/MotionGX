// Documentary collage behind type: two to five documentary frames of different sizes sit in an irregular arrangement
// behind a billboard headline, each drifting at its own slow rate. Port of the documentary-brutalist-agency hero
// collage: the container inset 78px 12% 20px 29% (portrait 115px 7% 70px 20%); frame A top 0 left 20% 40% x 48%,
// B right 0 bottom 3% 43% x 43%, C bottom 0 left 0 32% x 36% (D, E fill the gaps when asked for); square corners,
// a 1 px ink border inside a 1 px light ring. Enter: a clip reveal inset(100% 0 0 0) -> inset(0) over 0.6 s on
// power3.out, staggered .12 s in narrative order (or a hard cut). Hold: parallax drift up per frame at different
// rates (2 %, 3.5 %, 4.5 % of its height across the scene, capped at 5 %). A 10 px uppercase caption shows on each
// frame as it lands. RTL mirrors the arrangement. Frames show the scene's pictures (cropped differently when there
// is only one), never enlarged past their pixels' cover fit.
// Source: MengTo/Skills web-design/documentary-brutalist-agency demo/index.html (MIT).
ML.define({
  id: "photo.documentary-collage",
  category: "photo",
  name: "Documentary collage behind type",
  does: "Three documentary frames of different sizes sit in an irregular arrangement behind a billboard headline, drifting at slightly different speeds.",
  says: ["story", "proof", "brand"],
  energy: 3,
  targets: ["image"],
  duration: [2, 8],
  params: {
    frames: { type: "number", range: [2, 5], default: 3 },
    reveal: { type: "choice", options: ["clip", "cut"], default: "clip" },
    stagger: { type: "number", range: [0.06, 0.2], default: 0.12, unit: "s" },
    drift_max: { type: "number", range: [0, 5], default: 4.5, unit: "%" },
    captions: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "photo.frame-parallax"],
  avoid: ["playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "card",
  source: { from: "MengTo/Skills:web-design/documentary-brutalist-agency/demo/index.html", license: "MIT" },
  async setup(ctx) {
    const { el, p, at, end, f } = ctx;
    const host = ctx.scene || ctx.stage;
    const pics = [...new Set([...(ctx.els || []), el].filter(Boolean).map((e) => (e.tagName === "IMG" ? e : e.querySelector && e.querySelector("img"))).filter(Boolean))];
    if (!pics.length) { const any = host.querySelector("img"); if (any) pics.push(any); }
    if (!pics.length) return null;
    await Promise.all(pics.map((x) => x.decode().catch(() => null)));
    const W = f.W, H = f.H, k = W / 1080, tall = H > W;
    const mk = (tag, css, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (parent) parent.append(e); return e; };
    // the container, inset as the demo's .collage (portrait uses its max-width:760 rule), in stage pixels
    const ins = tall ? { t: 115 / 610, r: 0.07, b: 70 / 610, l: 0.2 } : { t: 78 / 680, r: 0.12, b: 20 / 680, l: 0.29 };
    const cx = W * (ctx.rtl ? ins.r : ins.l), cy = H * ins.t, cw = W * (1 - ins.l - ins.r), ch = H * (1 - ins.t - ins.b);
    const layer = mk("div", `position:absolute;left:${cx}px;top:${cy}px;width:${cw}px;height:${ch}px;pointer-events:none;visibility:hidden`);
    host.insertBefore(layer, host.firstChild); // behind the headline
    // the frames in narrative order: A, B, C from the demo; D, E for the larger sets
    const SPOTS = [
      { top: 0, left: 0.2, w: 0.4, h: 0.48, drift: 2 },
      { bottom: 0.03, right: 0, w: 0.43, h: 0.43, drift: 3.5 },
      { bottom: 0, left: 0, w: 0.32, h: 0.36, drift: 4.5 },
      { top: 0.06, right: 0.02, w: 0.26, h: 0.3, drift: 3 },
      { top: 0.52, left: 0.36, w: 0.22, h: 0.24, drift: 4 },
    ];
    const n = Math.round(ML.clamp(p.frames, 2, 5));
    const ring = Math.max(1, Math.round(2 * k));
    const capSize = Math.max(14, Math.round(10 * 2 * k));
    const frames = SPOTS.slice(0, n).map((s, i) => {
      const left = s.left != null ? s.left : 1 - s.right - s.w, top = s.top != null ? s.top : 1 - s.bottom - s.h;
      const x = (ctx.rtl ? 1 - left - s.w : left) * cw, y = top * ch, w = s.w * cw, h = s.h * ch;
      const box = mk("div", `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;overflow:hidden;border:${ring}px solid var(--x-ink);box-shadow:0 0 0 ${ring}px var(--x-panel);background:var(--x-dim);border-radius:0`, layer);
      const src = pics[i % pics.length], img = src.cloneNode(true);
      img.removeAttribute("data-slot"); img.removeAttribute("data-slot-sample");
      // one picture: each frame crops a different part of it (documentary details)
      const px = Math.round(15 + ML.rnd(i, 3) * 70), py = Math.round(15 + ML.rnd(i, 4) * 70);
      const over = 1 / (1 - (Math.min(5, s.drift * (p.drift_max / 4.5)) + 0.5) / 100); // room for the drift (cover already fills)
      img.style.cssText = `position:absolute;left:0;top:0;width:100%;height:${(over * 100).toFixed(2)}%;max-width:none;margin:0;border-radius:0;object-fit:cover;object-position:${px}% ${py}%;filter:var(--x-pic-filter)`;
      box.append(img);
      let cap = null;
      if (p.captions) {
        cap = mk("div", `position:absolute;left:${capSize * 0.7}px;right:${capSize * 0.7}px;bottom:${capSize * 0.6}px;font:var(--x-label-weight) ${capSize}px/1.2 var(--x-label-font);letter-spacing:var(--x-label-track);text-transform:uppercase;color:var(--x-panel);text-shadow:0 1px 6px color-mix(in srgb, var(--x-ink) 60%, transparent);text-align:start`, box);
        cap.textContent = ctx.rtl ? `لقطة ${String(i + 1).padStart(2, "0")}` : `Fig. ${String(i + 1).padStart(2, "0")}`;
        if (ctx.rtl) { cap.style.letterSpacing = "0"; cap.style.textTransform = "none"; cap.dir = "rtl"; }
      }
      const t0 = at + i * p.stagger;
      return { box, img, cap, t0, drift: Math.min(5, s.drift * (p.drift_max / 4.5)) };
    });
    frames.forEach((fr, i) => i < 3 && ctx.sfx(fr.t0, "card", 0.22));
    const sharp = el && el.tagName === "IMG" ? el : null;
    return {
      draw(t) {
        const on = t >= at - 1e-6 && t < end;
        layer.style.visibility = on ? "visible" : "hidden";
        if (sharp) sharp.style.visibility = on ? "hidden" : "";
        if (!on) return;
        const leave = ML.lin(t, end - 0.25, end);
        layer.style.opacity = (1 - leave).toFixed(4);
        const run = ML.lin(t, at, end);
        for (const fr of frames) {
          if (p.reveal === "cut") { fr.box.style.visibility = t >= fr.t0 ? "visible" : "hidden"; fr.box.style.clipPath = "none"; }
          else {
            const u = ML.out(t, fr.t0, fr.t0 + 0.6);
            fr.box.style.visibility = u > 0 ? "visible" : "hidden";
            fr.box.style.clipPath = `inset(${((1 - u) * 100).toFixed(3)}% 0 0 0)`;
          }
          fr.img.style.transform = `translateY(${(-fr.drift * run).toFixed(4)}%)`;
          if (fr.cap) fr.cap.style.opacity = ML.ease(t, fr.t0 + 0.45, fr.t0 + 0.75).toFixed(4);
        }
      },
    };
  },
});

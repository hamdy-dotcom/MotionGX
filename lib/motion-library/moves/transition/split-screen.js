// Split-screen flip: html-reel's 50/50 split. The frame splits hard at the middle (y 960 of 1920): the scene, drawn for
// one half, on top; the camera half — the middle band of the picture, cropped to the half (a 4:3 source shows w =
// 0.844 h of it, 16:9 w = 0.633 h) — below, growing from `zoom_from` (0.86, 0.8-1) to full size while it fades in over
// its first 0.35 s. On the flip (the spoken word `flip_at`, else 60 % into the run) the camera half slides to the top
// over 0.32 s on a cubic in-out (y = half * (1 - ease)) while the scene takes the bottom half. Landscape frames split
// left / right instead ("auto"), the camera half on the reading end's side (mirrored in Arabic). The camera half is the
// target picture, else the scene's first picture; it is cropped, never enlarged past its pixels (a small picture sits
// whole on the half's ground instead).
// Source: MengTo/Skills agent-skills/media/html-reel/scripts/split-flip.mjs + references/formula.md (MIT): the band
// scaled to the output width, cut at its middle, zoom z -> 1 with an alpha fade over zoom-dur, then y = half * (1 -
// cubic-in-out) between F0 and F1.
ML.define({
  id: "transition.split-screen",
  category: "transition",
  name: "Split-screen flip",
  does: "The frame splits at the middle (product on one half, speaker on the other) and on the offer one half slides over to take the other's place.",
  says: ["before-after", "connection", "transition"],
  energy: 3,
  targets: ["scene", "image", "screen"],
  duration: [0.3, 6],
  params: {
    split: { type: "choice", options: ["auto", "horizontal", "vertical"], default: "auto" },
    flip: { type: "bool", default: true },
    zoom_from: { type: "number", range: [0.8, 1], default: 0.86 },
    flip_at: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "photo.ken-burns"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/media/html-reel/scripts/split-flip.mjs", license: "MIT", note: "with references/formula.md" },
  setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const W = f.W, H = f.H;
    const horiz = p.split === "horizontal" || (p.split !== "vertical" && !f.wide); // top / bottom halves
    const hw = horiz ? W : W / 2, hh = horiz ? H / 2 : H;
    // the picture for the camera half: the target picture, else the scene's first one
    const tgt = ctx.el && ctx.el.tagName === "IMG" ? ctx.el : null;
    const src = tgt || scene.querySelector("img");
    // the scene half: this scene's own blocks, scaled to fit their half whole (2D, ≤ 1)
    const sceneHalf = document.createElement("div");
    sceneHalf.dataset.mlFx = "1";
    sceneHalf.style.cssText = `position:absolute;left:0;top:0;width:${hw}px;height:${hh}px;overflow:hidden;background:var(--x-ground);background-image:var(--x-ground-image)`;
    const inner = document.createElement("div");
    const s = Math.min(1, hw / W, hh / H);
    inner.style.cssText = `position:absolute;left:${((hw - W * s) / 2).toFixed(1)}px;top:${((hh - H * s) / 2).toFixed(1)}px;width:${W}px;height:${H}px;transform-origin:0 0;transform:scale(${s.toFixed(4)})`;
    for (const c of [...scene.children]) if (!c.dataset.mlFx) inner.append(c);
    sceneHalf.append(inner);
    // the camera half: the middle band of the picture, cropped to the half
    const camHalf = document.createElement("div");
    camHalf.dataset.mlFx = "1";
    camHalf.style.cssText = `position:absolute;left:0;top:0;width:${hw}px;height:${hh}px;overflow:hidden;background:var(--x-panel-2)`;
    const cam = document.createElement("div");
    cam.style.cssText = `position:absolute;inset:0;transform-origin:50% 50%`;
    if (src) {
      const img = document.createElement("img");
      img.src = src.currentSrc || src.src;
      img.alt = "";
      const nw = src.naturalWidth || 0, nh = src.naturalHeight || 0;
      const vector = /^data:image\/svg|\.svg(\?|$)/i.test(img.src);
      // cover crops the middle band; a raster smaller than the half would be enlarged, so it sits whole instead
      const coverScale = nw && nh ? Math.max(hw / nw, hh / nh) : 1;
      const fit = vector || coverScale <= 1 ? "cover" : "contain";
      img.style.cssText = `position:absolute;inset:0;width:100%;height:100%;object-fit:${fit};object-position:50% 50%;filter:var(--x-pic-filter);mix-blend-mode:var(--x-pic-blend)`;
      cam.append(img);
    } else {
      // no picture in the scene: the half carries the look's accent field with the headline set on it
      cam.style.background = "var(--x-accent)";
      const h = scene.querySelector(".ml-title");
      if (h) {
        const c = h.cloneNode(true);
        c.removeAttribute("data-slot"); c.removeAttribute("id");
        c.style.cssText = `position:absolute;left:8%;right:8%;top:50%;translate:0 -50%;color:var(--x-accent-ink);text-align:center`;
        cam.append(c);
      }
    }
    camHalf.append(cam);
    // the hard edge between the halves
    const seam = document.createElement("div");
    seam.dataset.mlFx = "1";
    seam.style.cssText = horiz ? `position:absolute;left:0;width:${W}px;top:${hh - 0.5}px;height:1px;background:var(--x-line);z-index:2` : `position:absolute;top:0;height:${H}px;left:${hw - 0.5}px;width:1px;background:var(--x-line);z-index:2`;
    scene.append(sceneHalf, camHalf, seam);

    // the two places: "first" (top, or the reading start's side) and "second"
    const startX = ctx.rtl ? hw : 0, endX = ctx.rtl ? 0 : hw;
    const place = (el, k) => {
      // k = 0: the first place; 1: the second
      if (horiz) el.style.translate = `0 ${(hh * k).toFixed(2)}px`;
      else el.style.translate = `${(startX + (endX - startX) * k).toFixed(2)}px 0`;
    };
    const z = ML.clamp(+p.zoom_from || 0.86, 0.8, 1), zd = 0.35;
    const F0 = p.flip ? Math.max(at + zd + 0.2, ctx.word(p.flip_at || "", at + (end - at) * 0.6)) : Infinity, F1 = F0 + 0.32;
    const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    ctx.sfx(at, "whoosh.soft", 0.3);
    if (p.flip) ctx.sfx(F0, "whoosh.soft", 0.4);
    return {
      draw(t) {
        // the camera band zooms in from z while it fades in
        const g = ML.lin(t, at, at + zd);
        cam.style.transform = g >= 1 ? "" : `scale(${(z + (1 - z) * g).toFixed(4)})`;
        cam.style.opacity = g >= 1 ? "" : g.toFixed(4);
        camHalf.style.visibility = t < at ? "hidden" : "visible";
        // the flip: the camera half takes the first place, the scene the second
        const u = io(ML.lin(t, F0, F1));
        place(camHalf, 1 - u);
        place(sceneHalf, u);
        seam.style.visibility = t < at ? "hidden" : "visible";
      },
    };
  },
});

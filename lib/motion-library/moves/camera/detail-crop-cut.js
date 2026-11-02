// Cut to a close crop on the detail: the same footage hard-cuts to a tight crop on the button, the number or the face,
// at the same box shape, on the spoken word that names the detail — then (optionally) hard-cuts back. As html-reel's
// frame-video.mjs pieces: a crop [x, y, w, h] as shares of the source at the box's aspect (on a 4:3 source in a 4:3 box
// w = h; a 4:3 crop of a 16:9 source w = 0.75·h), scaled to the box, no ease. One or two per reel — it's the reel's camera.
// Never enlarged past the source's real pixels (box px · devicePixelRatio ≤ max_enlarge · source px): when the crop
// would, a bigger crop is chosen. A picture is cropped in place with object-view-box (its box never moves); a screen or
// a scene is cropped by a camera layer inside it (translate + scale, origin 0 0, clamped inside the source).
// The detail: [data-focus] (an element, or "x y" shares on a picture), else the main button, else the boldest figure
// (the number), else the first picture, else the centre.
// Source: MengTo/Skills media/html-reel scripts/frame-video.mjs + references/structures.md "Close on a detail" (MIT).
ML.define({
  id: "camera.detail-crop-cut",
  category: "camera",
  name: "Cut to a close crop on the detail",
  does: "The same footage cuts to a tight crop on the button, number or face, at the same box shape.",
  says: ["focus", "proof", "precision"],
  energy: 3,
  targets: ["screen", "image"],
  duration: [0.8, 3],
  params: {
    crop: { type: "choice", options: ["tight", "medium"], default: "tight" },
    cut_back: { type: "bool", default: true },
    hold: { type: "number", range: [0.6, 3], default: 1.4, unit: "s" },
    max_enlarge: { type: "number", range: [1, 2], default: 2, unit: "x" },
  },
  pairs: ["camera.screen-focus", "ui.cursor-glide-click", "text-emphasis.accent-word"],
  avoid: ["calm", "ambient"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "snap",
  source: { from: "MengTo/Skills:media/html-reel/scripts/frame-video.mjs", license: "MIT", note: "crop-at-box-shape rule and the close-on-a-detail structure (references/structures.md)" },
  setup(ctx) {
    const { el, p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const dpr = window.devicePixelRatio || 1;
    const share0 = p.crop === "medium" ? 0.6 : 0.4;
    const maxE = ML.clamp(p.max_enlarge, 1, 2);
    const isSvg = (im) => /\.svg(\?|#|$)|image\/svg/i.test(im.currentSrc || im.src || "");
    const tOut = p.cut_back ? Math.min(end, at + ML.clamp(p.hold, 0.6, 3)) : Infinity;
    ctx.sfx(at, "snap", 0.4);
    if (tOut < end - 0.05) ctx.sfx(tOut, "snap", 0.22);
    const shares = (v) => { const m = String(v || "").trim().split(/[\s,]+/).map(Number); return m.length >= 2 && m.every(Number.isFinite) ? { x: ML.clamp(m[0]), y: ML.clamp(m[1]) } : null; };

    // ── a picture: crop in place with object-view-box (the box keeps its place and size) ──
    if (el && el.tagName === "IMG") {
      const bw = el.clientWidth || el.offsetWidth, bh = el.clientHeight || el.offsetHeight;
      const nw = el.naturalWidth || bw, nh = el.naturalHeight || bh;
      // what the box shows now (object-fit cover / contain / fill): its visible part of the source, in source px
      const fit = getComputedStyle(el).objectFit || "fill";
      let vw = nw, vh = nh;
      if (fit === "cover") { const s = Math.max(bw / nw, bh / nh); vw = bw / s; vh = bh / s; }
      const fp = shares(el.getAttribute("data-focus")) || { x: 0.5, y: 0.45 };
      // crop at the box's shape, `share` of the visible width; bigger if it would enlarge past the source's pixels
      let cw = vw * share0, ch = (cw * bh) / bw;
      if (ch > vh) { ch = vh; cw = (ch * bw) / bh; }
      if (!isSvg(el)) { const minW = (bw * dpr) / maxE; if (cw < minW) { cw = Math.min(vw, minW); ch = (cw * bh) / bw; } }
      const cx = ML.clamp(fp.x * nw - cw / 2, 0, nw - cw), cy = ML.clamp(fp.y * nh - ch / 2, 0, nh - ch);
      const box = `inset(${cy.toFixed(2)}px ${(nw - cx - cw).toFixed(2)}px ${(nh - cy - ch).toFixed(2)}px ${cx.toFixed(2)}px)`;
      const base = el.style.objectViewBox || "";
      const baseFit = el.style.objectFit || "";
      return {
        draw(t) {
          const on = t >= at && t < tOut;
          el.style.objectViewBox = on ? box : base;
          el.style.objectFit = on ? "fill" : baseFit; // the crop is already at the box's shape
        },
      };
    }

    // ── a screen or the scene: a camera layer inside it ──
    const inner = !!(el && el !== stage && el !== host && el.children.length);
    const view = inner ? el : host;
    const cam = document.createElement("div");
    cam.className = "ml-cam";
    if (inner) {
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      el.style.overflow = "hidden";
      cam.style.cssText = "position:relative;width:100%;height:100%;transform-origin:0 0";
    } else cam.style.cssText = "position:absolute;inset:0;transform-origin:0 0";
    while (view.firstChild) cam.append(view.firstChild);
    view.append(cam);
    const VW = inner ? el.clientWidth : f.W, VH = inner ? el.clientHeight : f.H;
    const C = cam.getBoundingClientRect(), k = C.width / (cam.offsetWidth || 1) || 1;
    const boxOf = (n) => { const r = n.getBoundingClientRect(); return { x: (r.left - C.left) / k, y: (r.top - C.top) / k, w: r.width / k, h: r.height / k }; };
    const shown = (n) => { const cs = getComputedStyle(n); return cs.display !== "none" && cs.visibility !== "hidden" && n.getClientRects().length > 0; };
    // the detail
    let detail = cam.querySelector("[data-focus]");
    if (!detail) detail = [...cam.querySelectorAll("button, [role=button], .ml-cta, input")].find(shown) || null;
    if (!detail) {
      let best = null, size = 0;
      for (const n of cam.querySelectorAll("*")) {
        if (!shown(n) || n.closest(".ml-head") || n.closest("svg")) continue;
        const own = [...n.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join("").trim();
        if (!/\d/.test(own)) continue;
        const fs = parseFloat(getComputedStyle(n).fontSize);
        if (fs > size) { size = fs; best = n; }
      }
      detail = best;
    }
    if (!detail) detail = [...cam.querySelectorAll("img, svg, canvas, video")].find(shown) || null;
    // a text detail is framed by its glyphs, not its (often full-width) block
    const inkOf = (n) => {
      if (n.matches("img, svg, canvas, video, input") || !(n.textContent || "").trim()) return boxOf(n);
      const r = document.createRange(); r.selectNodeContents(n); const q = r.getBoundingClientRect();
      return q.width > 0 ? { x: (q.left - C.left) / k, y: (q.top - C.top) / k, w: q.width / k, h: q.height / k } : boxOf(n);
    };
    const d = detail ? inkOf(detail) : { x: VW * 0.4, y: VH * 0.4, w: VW * 0.2, h: VH * 0.2 };
    // crop at the window's shape: `share` of it, and never smaller than the detail with a little air
    let share = Math.max(share0, (d.w * 1.25) / VW, (d.h * 1.25) / VH);
    // pictures under the crop: never past their pixels
    for (const im of cam.querySelectorAll("img")) {
      if (!shown(im) || isSvg(im) || !im.naturalWidth) continue;
      const b = boxOf(im), fit = getComputedStyle(im).objectFit, s0 = fit === "cover" ? Math.max(b.w / im.naturalWidth, b.h / im.naturalHeight) : b.w / im.naturalWidth;
      share = Math.max(share, (s0 * dpr) / maxE);
    }
    share = Math.min(1, share);
    const z = 1 / share, cw = VW * share, ch = VH * share;
    const x0 = ML.clamp(d.x + d.w / 2 - cw / 2, 0, VW - cw), y0 = ML.clamp(d.y + d.h / 2 - ch / 2, 0, VH - ch);
    const pose = `translate(${(-x0 * z).toFixed(2)}px, ${(-y0 * z).toFixed(2)}px) scale(${z.toFixed(4)})`;
    return {
      draw(t) {
        cam.style.transform = t >= at && t < tOut && z > 1.0001 ? pose : "none";
      },
    };
  },
});

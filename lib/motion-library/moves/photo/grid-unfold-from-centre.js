// Grid unfolds from centre: the single centred photo shrinks (1 -> 0.35, 0.4 s power3.inOut) and its neighbours,
// hidden behind it at the same spot, slide out to up / down / left / right (card size + gap, 0.04 s stagger,
// power3.out 0.45 s), forming a cross; or on to a full 3×3 (the corners follow), or a row. Gap 0 reads as one mosaic.
// Neighbours: the other pictures in the scene / the `images` param, else other crops of the same picture (each a
// window on it, never enlarged past its pixels). Everything only ever scales down (≤ 1), so nothing goes soft.
// RTL: the row and the stagger start on the right.
// Source: prompt-motion twoclipping-opus-5-5-is-the (reference only: our own rebuild).
ML.define({
  id: "photo.grid-unfold-from-centre",
  category: "photo",
  name: "Grid unfolds from centre",
  does: "The single centred photo shrinks and neighbouring photos slide out from behind it to form a cross or grid mosaic.",
  says: ["choice", "scale", "reveal"],
  energy: 3,
  targets: ["image", "card"],
  duration: [0.8, 2.5],
  params: {
    layout: { type: "choice", options: ["cross", "3x3", "row"], default: "cross" },
    gap: { type: "number", range: [0, 8], default: 2, unit: "px" },
    shrink_to: { type: "number", range: [0.25, 0.6], default: 0.35 },
    stagger: { type: "number", range: [0.02, 0.08], default: 0.04, unit: "s" },
    images: { type: "text", default: "" },
  },
  pairs: ["photo.grid-focus-ring", "camera.push-in"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "card.fan",
  source: { from: "prompt-motion:twoclipping-opus-5-5-is-the", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, f } = ctx;
    if (!el) return null;
    const host = ctx.scene || ctx.stage, k = Math.min(f.W, f.H) / 1080;
    const scope = ctx.scene || ctx.stage;
    const own = el.tagName === "IMG" ? el : el.querySelector("img");
    const listed = String(p.images || el.dataset.images || "").split(",").map((s) => s.trim()).filter(Boolean);
    const others = [...scope.querySelectorAll("img")].filter((x) => x !== own).map((x) => x.src);
    const pool = listed.length ? listed : others;
    // the centre card starts as the target itself (same box), centred in its area
    const eb = ctx.box(el);
    const area = el.closest(".ml-pic");
    const R = area ? { x: f.pic.x, y: f.pic.y, w: f.pic.w, h: f.pic.h } : eb;
    const W0 = eb.w, H0 = eb.h;
    const gap = p.gap * k;
    // the slots: [col, row] offsets in card units, in unfold order
    const cross = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const corners = [[1, -1], [1, 1], [-1, 1], [-1, -1]];
    const row = [[1, 0], [-1, 0], [2, 0], [-2, 0]];
    const slots = p.layout === "row" ? row : p.layout === "3x3" ? [...cross, ...corners] : cross;
    if (ctx.rtl) slots.forEach((s) => (s[0] = -s[0]));
    const cols = Math.max(...slots.map((s) => Math.abs(s[0]))) * 2 + 1, rows = Math.max(...slots.map((s) => Math.abs(s[1]))) * 2 + 1;
    // the final scale: shrink_to, or less if the mosaic would leave the area
    const s = Math.min(p.shrink_to, (R.w - gap * (cols - 1)) / (W0 * cols), (R.h - gap * (rows - 1)) / (H0 * rows), 1);
    const cx = R.x + R.w / 2, cy = R.y + R.h / 2;
    const mk = (tag, css, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (parent) parent.append(e); return e; };
    const layer = mk("div", "position:absolute;inset:0;pointer-events:none;visibility:hidden;z-index:3", host);
    const radius = getComputedStyle(own || el).borderRadius || "var(--x-pic-radius)";
    const natW = own ? own.naturalWidth || W0 : W0, natH = own ? own.naturalHeight || H0 : H0;
    const coverS = Math.max(W0 / natW, H0 / natH);
    const mkCard = (src, i) => {
      const c = mk("div", `position:absolute;left:${cx - W0 / 2}px;top:${cy - H0 / 2}px;width:${W0}px;height:${H0}px;border-radius:${radius};overflow:hidden;background:var(--x-pic-ground);transform-origin:50% 50%`, layer);
      if (src || own) {
        const im = mk("img", "position:absolute;max-width:none;filter:var(--x-pic-filter)", c);
        im.src = src || own.src;
        // a crop of the one picture: a tighter window while it stays within its pixels
        const z = src ? 1 : Math.max(1, Math.min(1.6, 1 / Math.max(1e-6, coverS))), fx = src ? 0.5 : ML.rnd(i, 21), fy = src ? 0.5 : ML.rnd(i, 22);
        const sc = coverS * (i === 0 ? 1 : z), iw = natW * sc, ih = natH * sc;
        Object.assign(im.style, { width: iw + "px", height: ih + "px", left: (W0 - iw) * fx + "px", top: (H0 - ih) * fy + "px", objectFit: "cover" });
        if (i === 0) Object.assign(im.style, { left: (W0 - iw) / 2 + "px", top: (H0 - ih) / 2 + "px" });
      } else {
        const cl = el.cloneNode(true); cl.removeAttribute("data-slot"); cl.removeAttribute("data-slot-sample");
        cl.style.cssText += ";margin:0;width:100%;height:100%;box-sizing:border-box"; c.append(cl);
      }
      return c;
    };
    // neighbours first (behind), the centre card last (in front)
    const cards = slots.map((sl, i) => ({ el: mkCard(pool.length ? pool[i % pool.length] : null, i + 1), dx: sl[0] * (W0 * s + gap), dy: sl[1] * (H0 * s + gap), corner: Math.abs(sl[0]) + Math.abs(sl[1]) > 1 || Math.abs(sl[0]) > 1 }));
    const centre = mkCard(null, 0);
    centre.style.boxShadow = "var(--x-shadow)";
    // the beats: the centre travels from the target's box to the area centre while it shrinks
    const span = Math.max(0.8, end - at);
    const tShrink = at, dShrink = 0.4, tOut = at + 0.12;
    const p3io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2), p3o = (x) => 1 - Math.pow(1 - x, 3);
    const ox = eb.x + eb.w / 2 - cx, oy = eb.y + eb.h / 2 - cy;
    let rank = 0;
    cards.forEach((c) => { c.t0 = tOut + (c.corner ? 0.12 + rank++ * p.stagger : 0) + (c.corner ? 0 : cards.filter((x) => !x.corner).indexOf(c) * p.stagger); });
    ctx.sfx(tShrink, "card.fan", 0.4);
    return {
      draw(t) {
        const on = t >= at - 1e-6 && t < end;
        layer.style.visibility = on ? "visible" : "hidden";
        (area || el).style.visibility = on ? "hidden" : "";
        if (!on) return;
        const leave = ML.lin(t, end - 0.25, end);
        layer.style.opacity = (1 - leave).toFixed(4);
        const u = p3io(ML.lin(t, tShrink, tShrink + dShrink)), sc = 1 + (s - 1) * u;
        centre.style.transform = `translate(${(ox * (1 - u)).toFixed(2)}px, ${(oy * (1 - u)).toFixed(2)}px) scale(${sc.toFixed(4)})`;
        for (const c of cards) {
          const v = p3o(ML.lin(t, c.t0, c.t0 + 0.45));
          c.el.style.transform = `translate(${(c.dx * v + ox * (1 - u)).toFixed(2)}px, ${(c.dy * v + oy * (1 - u)).toFixed(2)}px) scale(${sc.toFixed(4)})`;
          c.el.style.opacity = t < c.t0 ? "0" : "1";
        }
      },
    };
  },
});

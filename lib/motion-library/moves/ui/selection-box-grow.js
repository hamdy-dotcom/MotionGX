// Design-tool selection box grows from a point: a small selection rectangle (1.5 px accent stroke, 15 % accent fill,
// small white square handles at the corners) is dragged out from one corner — width and height grow on a drag-like
// cubic-bezier(0.3, 0, 0.2, 1) from 8 × 8 to its final size over 1 s, a pointer riding the dragged corner — while a
// size pill under it counts the numbers ("44 × 32" … "120 × 80") and faint crosshair guides run through its centre.
// Then it either stays, or its fill floods the whole frame (becoming the next background).
// On a target it grows to that element's bounds and shows its real size; otherwise it grows in the picture region.
// The drag starts at the reading-side corner (RTL: top-right).
// Source: prompt-motion arjunsh1607 "opus 5.5 on ultracode" (reference only — our own rebuild).
ML.define({
  id: "ui.selection-box-grow",
  category: "ui",
  name: "Design-tool selection box grows from a point",
  does: "A tiny blue selection rectangle with corner handles and a size label grows on the dark canvas as if being dragged out in a design tool.",
  says: ["tech", "precision", "arrival"],
  energy: 3,
  targets: ["shape", "cursor"],
  duration: [1, 2],
  params: {
    end: { type: "choice", options: ["flood-frame", "stay"], default: "stay" },
    colour: { type: "text", default: "var(--x-accent)" },
    grow: { type: "number", range: [0.6, 1.6], default: 1, unit: "s" },
    pointer: { type: "bool", default: true },
    guides: { type: "bool", default: true },
  },
  pairs: ["ui.selection-handles", "ui.cursor-glide-click"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:arjunsh1607-opus-5-5-on-ultracode", license: "reference", note: "our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const C = p.colour || "var(--x-accent)";
    // its own compositing layer: the moving guides never re-raster the scene beneath (soft shadows stay pixel-stable)
    const layer = mk("div", "position:absolute;inset:0;z-index:7;pointer-events:none;overflow:hidden;will-change:transform;", ctx.scene || ctx.stage);

    // the final rectangle and the numbers it reports
    let B, nums;
    if (el) { B = ctx.box(el); nums = [Math.round(el.offsetWidth), Math.round(el.offsetHeight)]; }
    else { const w = Math.min(f.pic.w * 0.55, f.pic.h * 0.7 * 1.5), h = w / 1.5; B = { x: f.pic.x + (f.pic.w - w) / 2, y: f.pic.y + (f.pic.h - h) / 2, w, h }; nums = [120, 80]; }
    const s0 = 8 * k, ax = rtl ? B.x + B.w : B.x, ay = B.y; // the anchor corner

    // guides
    const gd = Math.max(1, k).toFixed(1);
    const gH = mk("div", `position:absolute;left:0;right:0;top:0;height:${gd}px;background:color-mix(in srgb, ${C} 35%, transparent);opacity:0;`, layer);
    const gV = mk("div", `position:absolute;top:0;bottom:0;left:0;width:${gd}px;background:color-mix(in srgb, ${C} 35%, transparent);opacity:0;`, layer);
    // the rectangle
    const sw = Math.max(1.5, 3 * k), hs = Math.max(8, 13 * k);
    const rect = mk("div", `position:absolute;left:0;top:0;box-sizing:border-box;border:${sw.toFixed(1)}px solid ${C};background:color-mix(in srgb, ${C} 15%, transparent);opacity:0;`, layer);
    const handles = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([hx, hy]) => mk("i", `position:absolute;left:${hx * 100}%;top:${hy * 100}%;width:${hs.toFixed(1)}px;height:${hs.toFixed(1)}px;margin:${(-hs / 2).toFixed(1)}px 0 0 ${(-hs / 2).toFixed(1)}px;box-sizing:border-box;background:var(--x-accent-ink);border:${Math.max(1, 1.5 * k).toFixed(1)}px solid ${C};`, rect));
    const tag = mk("div", `position:absolute;left:50%;top:100%;translate:-50% ${(12 * k).toFixed(1)}px;white-space:nowrap;padding:${(5 * k).toFixed(1)}px ${(12 * k).toFixed(1)}px;border-radius:${(6 * k).toFixed(1)}px;background:${C};color:var(--x-accent-ink);font:600 ${Math.max(14, 22 * k).toFixed(1)}px var(--x-mono-font);direction:ltr;`, rect, "8 × 8");
    let ptr = null;
    if (p.pointer) {
      const ps = 50 * k;
      ptr = mk("div", `position:absolute;left:0;top:0;width:${ps.toFixed(1)}px;height:${ps.toFixed(1)}px;opacity:0;filter:drop-shadow(0 ${(4 * k).toFixed(1)}px ${(8 * k).toFixed(1)}px rgba(0,0,0,.3));`, layer);
      ptr.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 24 24"${rtl ? ' style="transform:scaleX(-1)"' : ""}><path d="M5 2.5l13.5 12.2-6.2.6 3.7 7.1-2.6 1.3-3.6-7.2L5 21z" fill="var(--x-pointer)" stroke="var(--x-pointer-edge)" stroke-width="1.3" stroke-linejoin="round"/></svg>`;
    }

    const g = ML.clamp(p.grow, 0.6, 1.6), drag = ML.bezier(0.3, 0, 0.2, 1);
    const t0 = at + 0.15, t1 = Math.min(t0 + g, end - 0.5);
    const flood = p.end === "flood-frame", tf = t1 + 0.25, tf1 = Math.min(tf + 0.55, end - 0.1);
    ctx.sfx(t0, "swell", 0.3);
    ctx.sfx(t1, "snap", 0.25);
    if (flood) ctx.sfx(tf, "whoosh.soft", 0.3);

    return {
      draw(t) {
        const appear = ML.lin(t, at, at + 0.12);
        const u = drag(ML.lin(t, t0, t1));
        let w = s0 + (B.w - s0) * u, h = s0 + (B.h - s0) * u, x = rtl ? ax - w : ax, y = ay;
        // flood: the rectangle opens to the whole frame and fills solid
        const fl = flood ? ML.ease(t, tf, tf1) : 0;
        if (fl > 0) { x += (0 - x) * fl; y += (0 - y) * fl; w += (f.W - w) * fl; h += (f.H - h) * fl; }
        const leave = flood ? 0 : ML.lin(t, end - 0.25, end);
        rect.style.opacity = (t < at ? 0 : appear * (1 - leave)).toFixed(4);
        rect.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
        rect.style.width = `${w.toFixed(2)}px`;
        rect.style.height = `${h.toFixed(2)}px`;
        rect.style.background = `color-mix(in srgb, ${C} ${(15 + 85 * fl).toFixed(2)}%, transparent)`;
        const chrome = 1 - ML.lin(t, tf, tf + 0.2) * (flood ? 1 : 0);
        handles.forEach((hd) => (hd.style.opacity = chrome.toFixed(4)));
        tag.style.opacity = chrome.toFixed(4);
        tag.textContent = `${Math.round(8 + (nums[0] - 8) * u)} × ${Math.round(8 + (nums[1] - 8) * u)}`;
        if (p.guides) {
          const go = Math.min(appear, chrome) * 0.9 * (1 - leave);
          gH.style.opacity = gV.style.opacity = go.toFixed(4);
          gH.style.translate = `0 ${(y + h / 2).toFixed(2)}px`;
          gV.style.translate = `${(x + w / 2).toFixed(2)}px 0`;
        } else gH.style.opacity = gV.style.opacity = "0";
        if (ptr) {
          const cx = rtl ? x : x + w, cy = y + h;
          const po = Math.min(appear, 1 - ML.lin(t, t1 + 0.2, t1 + 0.45));
          ptr.style.opacity = po.toFixed(4);
          ptr.style.translate = `${(cx - (rtl ? 50 * k - 6 * k : 6 * k)).toFixed(2)}px ${(cy - 4 * k).toFixed(2)}px`;
        }
      },
    };
  },
});

// Corner brand mark: the logo sits small in a corner of the frame — at least 6 % of the frame's width — dropping in at
// its window's start (autoAlpha 0, y −20 px → 1, 0 over 0.5 s, power1.out) and stepping aside at its window's end
// (autoAlpha → 0 over 0.3 s), when the product fills the frame. While it shows, the scene's headline band starts 24 px
// (at 720p, scaled) under its box, easing there and back with the mark, as MotionGX's live engine lays groups out under
// #mark. The logo left in its slot stays hidden for the whole scene (keep_original shows it), so it never flashes first. The corner follows the
// reading direction (start / end swap in Arabic); the mark itself is never mirrored. A picture logo is never shown
// past its own pixels.
// Source: MotionGX's own live engine, lib/live-engine/worker/vendor/recipes.js R.mark + the layout rule under it.
ML.define({
  id: "element.corner-mark",
  category: "element",
  name: "Corner brand mark",
  does: "The logo sits small in a corner, dropping in at the start and stepping aside when the product fills the frame.",
  says: ["brand", "trust"],
  energy: 1,
  targets: ["logo"],
  duration: [2, 60],
  params: {
    corner: { type: "choice", options: ["top-left", "top-right", "bottom-left", "bottom-right"], default: "top-left" },
    size: { type: "number", range: [6, 14], default: 8, unit: "%" },
    keep_original: { type: "bool", default: false },
    make_room: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "element.dock-to-header"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "own:lib/live-engine/worker/vendor/recipes.js", license: "own", note: "R.mark (fromTo autoAlpha/y, 0.5 s in, 0.3 s out) and the 24 px rule under the mark's box" },
  setup(ctx) {
    const { p, at, end, f, el, rtl } = ctx;
    if (!el || el === ctx.stage) return null;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 720;
    const ob = ctx.box(el);
    if (!(ob.w > 0 && ob.h > 0)) return null;
    // the mark: a copy of the logo, laid out at its corner size (never past a picture's pixels)
    let w = Math.max(6, Math.min(14, p.size)) / 100 * f.W;
    if (el.tagName === "IMG" && el.naturalWidth) w = Math.min(w, el.naturalWidth);
    const h = (w * ob.h) / ob.w;
    const mark = el.cloneNode(true);
    mark.removeAttribute("data-slot"); mark.removeAttribute("id");
    mark.querySelectorAll("[data-slot]").forEach((x) => x.removeAttribute("data-slot"));
    // the corner in reading order: "left" is the start side, so it swaps in Arabic
    const [vert, side0] = p.corner.split("-");
    const side = rtl ? (side0 === "left" ? "right" : "left") : side0;
    const ix = Math.max(f.m * 0.6, 24 * k);
    // a tall frame keeps its mark clear of a phone's own top and bottom bars
    const iy = f.tall ? (vert === "top" ? f.safe.y * 0.55 : (f.H - f.safe.y - f.safe.h) * 0.45) : Math.max(24 * k, f.safe.y * 0.45);
    const x = side === "left" ? ix : f.W - ix - w;
    const y = vert === "top" ? iy : f.H - iy - h;
    const wrap = doc.createElement("div");
    wrap.dataset.mlLayer = "1";
    wrap.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;z-index:7;pointer-events:none;`;
    mark.style.cssText += `;display:block;width:${w}px;height:${h}px;margin:0;max-width:none;`;
    if (mark.tagName === "IMG") mark.style.objectFit = "contain";
    wrap.append(mark);
    host.append(wrap);
    // the scene's headline band starts 24 px under the mark's box while it shows (when they'd meet)
    const head = p.make_room && vert === "top" ? host.querySelector(".ml-head") : null;
    let push = 0;
    if (head) {
      const hb = ctx.box(head), markB = y + h + 24 * k;
      const meets = hb.x < x + w && hb.x + hb.w > x;
      if (meets && hb.y < markB) push = Math.min(markB - hb.y, hb.h * 0.4);
    }
    const hH = head ? head.style.height : "";
    const a = at, inEnd = at + 0.5, out0 = Math.max(at + 0.6, end - 0.3), out1 = out0 + 0.3;
    ctx.sfx(a + 0.05, "tap", 0.15);
    const p1 = (x) => 1 - (1 - x) * (1 - x); // power1.out, GSAP's default
    return {
      draw(t) {
        const vin = p1(ML.lin(t, a, inEnd)), vout = p1(ML.lin(t, out0, out1));
        const o = t < a ? 0 : vin * (1 - vout);
        wrap.style.visibility = o > 0.001 ? "visible" : "hidden"; // autoAlpha
        wrap.style.opacity = o.toFixed(4);
        wrap.style.transform = `translateY(${(-20 * k * (1 - vin)).toFixed(2)}px)`;
        if (!p.keep_original) el.style.opacity = "0";
        if (head && push > 0) {
          const q = (t < a ? 0 : push * ML.ease(t, a, inEnd) * (1 - ML.ease(t, out0, out1))).toFixed(1);
          head.style.marginTop = +q > 0 ? `${q}px` : "";
          head.style.height = +q > 0 ? `calc(var(--head-h) - ${q}px)` : hH;
        }
      },
    };
  },
});

// Photo into phone: a raw portrait photo fills the frame with a flat, ungraded look (grayscale .5, brightness 1.1);
// step 1 (0.4 s expo.inOut) shrinks it into a rounded card (radius 16) at 40 % of the frame's width with a shadow;
// step 2 (0.5 s) assembles a phone (or tablet) around it — the bezel grows out from the card's edge, the dynamic island
// fades in — the card becomes the screen, and the whole device turns rotateY 0 → −12° while it slides to the left
// third (or right; RTL mirrors). A beat later the picture inside switches to its colour-corrected version (the look's
// own picture filter) with a soft cross-fade. Sharp: the photo is never enlarged past its pixels (a small raster
// starts from the largest box its pixels cover, centred), nothing is scaled above 1 under the 3D turn, no blur.
// The photo holds the full frame from the scene's start until `at` (no flash of the layout first), so the shrink can
// land on a word. Works on the image target (the slot hides while its picture travels); with none, a picture made of
// the look.
// Source: rebuilt as our own code from a prompt-motion reference (oliahmed205 "just tried opus 5.5") — reference
// only, nothing copied.
ML.define({
  id: "device.photo-into-phone",
  category: "device",
  name: "Full-bleed photo shrinks into a phone screen",
  does: "A full-screen raw portrait photo shrinks and settles into a phone mockup's screen, which tilts in 3D to the side of the layout.",
  says: ["before-after", "change", "reveal"],
  energy: 3,
  targets: ["image", "screen"],
  duration: [1, 2.5],
  params: {
    device: { type: "choice", options: ["phone", "tablet"], default: "phone" },
    side: { type: "choice", options: ["left", "right"], default: "left" },
    regrade: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "photo.before-after-slider", "device.phone-frame"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:oliahmed205-just-tried-opus-5-5", license: "reference", note: "our own rebuild of the technique" },
  async setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const px = (v) => v.toFixed(2) + "px";
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    const W = f.W, H = f.H;
    const img = ctx.el && ctx.el.tagName === "IMG" ? ctx.el : ctx.el ? ctx.el.querySelector("img") : null;
    const tablet = p.device === "tablet";
    const side = (p.side === "right") !== rtl ? 1 : -1; // RTL mirrors the side

    // ── the screen's final box: 40 % of the frame's width (less when the picture region is short), the device's aspect ──
    const aspect = tablet ? 0.75 : 0.46;
    let cw = W * (tablet ? 0.5 : 0.4), ch = cw / aspect;
    const maxH = f.pic.h * 0.94; // it settles in the picture region, clear of the headline band
    if (ch > maxH) { ch = maxH; cw = ch * aspect; }
    const card = { x: (W - cw) / 2, y: f.pic.y + (f.pic.h - ch) / 2, w: cw, h: ch };
    // step 2's slide: the device's centre to the left (right) third
    const slide = side * (W * (f.wide ? 0.27 : 0.2));

    // ── the full-bleed start: the frame, or the largest box a small raster's pixels cover ──
    let start = { x: 0, y: 0, w: W, h: H };
    const src = img ? img.currentSrc || img.src : "";
    const vector = !img || /^data:image\/svg|\.svg(\?|#|$)/i.test(src);
    if (img && !vector && img.naturalWidth && img.naturalHeight) {
      const need = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      if (need > 1) { const s = 1 / need; start = { x: (W - W * s) / 2, y: (H - H * s) / 2, w: W * s, h: H * s }; }
    }
    if (img) img.style.visibility = "hidden";

    // ── the device: a 3D box at the card's place (scale never above 1), the photo card inside ──
    const dev = mk("div", `position:absolute;left:${px(card.x)};top:${px(card.y)};width:${px(card.w)};height:${px(card.h)};z-index:9;pointer-events:none;transform-origin:50% 50%;`, host);
    const B = card.w * (tablet ? 0.035 : 0.045);
    const lookV = (name) => parseFloat(getComputedStyle(host).getPropertyValue(name)) || 0;
    const R = card.w * (tablet ? 0.06 : 0.14) * (lookV("--x-device-radius") / 74), cardR = 16 * k * (lookV("--x-radius") / 30);
    const bezel = mk("div", `position:absolute;left:0;top:0;right:0;bottom:0;box-sizing:border-box;background:var(--x-device);opacity:0;box-shadow:var(--x-shadow);`, dev);
    const ph = mk("div", `position:absolute;overflow:hidden;background:var(--x-pic-ground);box-shadow:var(--x-shadow);`, dev);
    const layer = (filter) => {
      if (img) { const e = mk("img", `position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${getComputedStyle(img).objectPosition};filter:${filter};`, ph); e.src = src; e.alt = ""; return e; }
      // a portrait made of the look's colours (no photo given)
      const e = mk("div", `position:absolute;inset:0;filter:${filter};background:linear-gradient(170deg, color-mix(in srgb, var(--x-accent-2) 55%, var(--x-panel)), color-mix(in srgb, var(--x-accent) 70%, var(--x-ink)));`, ph);
      mk("i", `position:absolute;left:50%;top:30%;width:${px(280 * k)};height:${px(280 * k)};translate:-50% 0;border-radius:50%;background:color-mix(in srgb, var(--x-good) 25%, var(--x-panel));`, e);
      mk("i", `position:absolute;left:50%;top:58%;width:${px(650 * k)};height:${px(650 * k)};translate:-50% 0;border-radius:50% 50% 0 0;background:color-mix(in srgb, var(--x-ink) 60%, var(--x-accent));`, e);
      return e;
    };
    const graded = layer("var(--x-pic-filter)");
    const flat = layer("grayscale(0.5) brightness(1.1)");
    if (img) await Promise.all([graded, flat].map((e) => e.decode().catch(() => {}))); // both copies ready before the first frame
    const island = mk("i", `position:absolute;left:50%;top:${px(B + card.w * 0.03)};width:${px(card.w * (tablet ? 0.04 : 0.28))};height:${px(card.w * (tablet ? 0.04 : 0.075))};translate:-50% 0;border-radius:var(--x-radius-s);background:var(--x-device);opacity:0;z-index:2;`, dev);

    // ── timing ──
    const q = ML.clamp((end - at) / 1.6, 0.6, 1); // the steps fit the move's room
    const s1 = at, e1 = at + 0.4 * q, e2 = e1 + 0.5 * q, g0 = e2 + 0.25 * q, g1 = g0 + 0.4 * q;
    ctx.sfx(s1, "whoosh.soft", 0.4);
    ctx.sfx(e2 - 0.05, "land.light", 0.3);
    if (p.regrade) ctx.sfx(g0, "blip", 0.15);
    const expoIO = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2);
    const p3io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

    return {
      draw(t) {
        // step 1: full bleed → the card (in stage px, relative to the device box)
        const a = expoIO(ML.lin(t, s1, e1));
        const x = start.x + (card.x - start.x) * a, y = start.y + (card.y - start.y) * a;
        const w = start.w + (card.w - start.w) * a, h = start.h + (card.h - start.h) * a;
        // step 2: the bezel grows out around it, the card's corners become the screen's, the device turns and slides
        const b = p3io(ML.lin(t, e1, e2));
        const rad = cardR * a + (R - B - cardR) * b;
        ph.style.left = px(x - card.x); ph.style.top = px(y - card.y); ph.style.width = px(w); ph.style.height = px(h);
        ph.style.borderRadius = px(Math.max(0, rad));
        ph.style.boxShadow = b > 0 ? "none" : "var(--x-shadow)";
        const g = B * b;
        bezel.style.opacity = Math.min(1, b * 2).toFixed(4);
        bezel.style.inset = `${px(-g)}`;
        bezel.style.borderRadius = px(rad + g);
        island.style.opacity = ML.lin(t, e1 + 0.2 * q, e2).toFixed(4);
        dev.style.transform = b > 0 ? `perspective(${px(2200 * k)}) translateX(${(slide * b).toFixed(2)}px) rotateY(${(12 * side * b).toFixed(3)}deg)` : "none";
        // the regrade: flat → the look's own picture treatment
        flat.style.opacity = p.regrade ? (1 - ML.ease(t, g0, g1)).toFixed(4) : "1";
      },
    };
  },
});

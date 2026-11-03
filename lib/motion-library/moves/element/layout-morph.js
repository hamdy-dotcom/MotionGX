// Layout morph between two arrangements: a miniature of the frame (the stage's own shape, scaled by k = mini / stage)
// shows the headline band and the picture area in one layout; then every rect (left, top, width, height × k) eases to
// a second layout, a + (b − a) × ease(t, on, on + duration) on cubic in-out, while a new slot pops in — opacity
// ease(on − 0.02, on + 0.3), scale 0.8 + 0.2 × back-out(on, on + 0.4), a 2 px ring outline offset 3. The headline is
// drawn at 58·k px. Ported from MengTo/Skills html-explainer-video's camera scene (frameOf off / on, #cm-slot), with
// kit.js frameOf giving the layouts: "slot" makes room for a corner slot (a presenter camera), "head-bottom" swaps the
// headline band to the foot, "side" (wide frames) moves it beside the picture. The slot sits at the reading end.
// Source: MengTo/Skills agent-skills/media/html-explainer-video/demo/film.js, the camera scene (MIT).
ML.define({
  id: "element.layout-morph",
  category: "element",
  name: "Layout morph between two arrangements",
  does: "Inside a miniature of the frame, the picture area eases from one layout to another while a new slot pops in with a small overshoot.",
  says: ["change", "before-after", "simplicity"],
  energy: 3,
  targets: ["stage", "card", "screen"],
  duration: [1.2, 2],
  params: {
    duration: { type: "number", range: [0.3, 0.7], default: 0.5, unit: "s" },
    slot_pop: { type: "bool", default: true },
    to: { type: "choice", options: ["slot", "head-bottom", "side"], default: "slot" },
    hold: { type: "number", range: [0.1, 0.8], default: 0.35, unit: "s" },
    title: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "ui.cursor-click"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "snap",
  source: { from: "MengTo/Skills:agent-skills/media/html-explainer-video/demo/film.js#camera", license: "MIT" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const R = own ? ctx.box(own) : f.pic;
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;display:flex;align-items:center;justify-content:center;`, host);
    // the miniature takes the place of the target, or of the picture region (which fades away for it and returns after)
    const pics = own ? [] : [...host.querySelectorAll(".ml-pic")];
    if (own) own.style.visibility = "hidden";

    // the two layouts, from the frame's own regions
    const A = ML.frameOf(f.shape, "top");
    let B;
    const room = (r) => ({ ...r });
    if (p.to === "head-bottom") B = ML.frameOf(f.shape, "bottom");
    else if (p.to === "side" && f.wide) { // frameOf puts the headline on the left: in Arabic it starts on the right
      const s = ML.frameOf(f.shape, "side"), flip = (r) => (rtl ? { ...r, x: f.W - r.x - r.w } : r);
      B = { head: flip(s.head), pic: flip(s.pic) };
    }
    else if (p.to === "side") { // tall / square: the headline takes the picture's start half, the picture the end half
      const pic = room(A.pic), w2 = (pic.w - 32) / 2;
      B = { head: { x: rtl ? pic.x + w2 + 32 : pic.x, y: A.head.y, w: A.head.w, h: A.head.h }, pic: { x: rtl ? pic.x : pic.x + w2 + 32, y: pic.y, w: w2, h: pic.h } };
    } else B = { head: room(A.head), pic: room(A.pic) };
    // the new slot: a camera tile in the picture's reading-end corner, the picture giving up the room it needs
    const slotR = (() => {
      const pic = B.pic, s = Math.min(pic.w, pic.h) * (f.tall ? 0.42 : 0.36), g = 24;
      if (p.to === "slot") {
        if (f.wide) { B.pic = { ...pic, w: pic.w - s - g, x: rtl ? pic.x + s + g : pic.x }; return { x: rtl ? pic.x : pic.x + pic.w - s, y: pic.y + pic.h - s, w: s, h: s }; }
        B.pic = { ...pic, h: pic.h - s - g }; return { x: rtl ? pic.x : pic.x + pic.w - s, y: pic.y + pic.h - s, w: s, h: s };
      }
      return { x: rtl ? pic.x + g : pic.x + pic.w - s * 0.8 - g, y: pic.y + g, w: s * 0.8, h: s * 0.5 };
    })();

    // the miniature, the frame's shape scaled into the target
    const k = Math.min((R.w * 0.9) / f.W, (R.h * 0.9) / f.H);
    const mini = mk("div", `position:relative;width:${f.W * k}px;height:${f.H * k}px;flex:none;box-sizing:border-box;background:var(--x-ground);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * 0.6);box-shadow:var(--x-shadow);overflow:hidden;`, layer);
    const titleText = p.title || (host.querySelector(".ml-title") && host.querySelector(".ml-title").textContent.trim()) || (rtl ? "العنوان" : "Headline");
    const head = mk("div", `position:absolute;display:flex;align-items:center;justify-content:center;text-align:center;font:var(--x-head-weight) ${58 * k}px/1.1 var(--x-head-font);letter-spacing:${rtl ? 0 : "var(--x-head-track)"};color:var(--x-ink);overflow:hidden;`, mini, titleText);
    const win = mk("div", "position:absolute;box-sizing:border-box;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * 0.3);overflow:hidden;", mini);
    // the picture's content: a soft accent field and a few lines, so it reads as a picture area, not an empty box
    mk("div", "position:absolute;inset:12% 10% 38% 10%;border-radius:calc(var(--x-radius) * 0.2);background:linear-gradient(135deg, color-mix(in srgb, var(--x-accent) 55%, var(--x-panel)), color-mix(in srgb, var(--x-accent-2) 45%, var(--x-panel)));", win);
    [0.68, 0.78].forEach((y, i) => mk("div", `position:absolute;${rtl ? "right" : "left"}:10%;top:${y * 100}%;width:${i ? 46 : 70}%;height:5%;border-radius:999px;background:var(--x-line);`, win));
    const slot = mk("div", `position:absolute;box-sizing:border-box;border-radius:calc(var(--x-radius) * 0.3);background:radial-gradient(circle at 50% 38%, color-mix(in srgb, var(--x-accent) 70%, var(--x-panel)) 0 18%, transparent 19%), radial-gradient(ellipse at 50% 100%, color-mix(in srgb, var(--x-accent) 55%, var(--x-panel)) 0 36%, transparent 37%), var(--x-panel-2);outline:var(--x-ring-w, 2px) solid var(--x-ring, var(--x-accent));outline-offset:3px;`, mini);
    const px = (v) => (v * k).toFixed(2) + "px";
    const place = (e, r) => { e.style.left = px(r.x); e.style.top = px(r.y); e.style.width = px(r.w); e.style.height = px(r.h); };
    place(slot, slotR);

    const on = at + ML.clamp(p.hold, 0.1, 0.8), dur = ML.clamp(p.duration, 0.3, 0.7);
    ctx.sfx(on, "snap", 0.35);
    if (p.slot_pop) ctx.sfx(on + 0.3, "pop.soft", 0.3);
    const g = (a, b, e) => a + (b - a) * e;
    const lerpR = (a, b, e) => ({ x: g(a.x, b.x, e), y: g(a.y, b.y, e), w: g(a.w, b.w, e), h: g(a.h, b.h, e) });
    const leave0 = Math.max(on + dur + 0.3, end - 0.3);
    return {
      draw(t) {
        const inn = ML.out(t, at, at + 0.3), lv = ML.clamp((t - leave0) / 0.25);
        layer.style.visibility = t < at ? "hidden" : "visible";
        const away = (1 - inn * (1 - lv)).toFixed(4);
        pics.forEach((e) => { e.style.opacity = away; });
        layer.style.opacity = (inn * (1 - lv)).toFixed(4);
        mini.style.translate = `0 ${((1 - inn) * 18).toFixed(2)}px`;
        const e = ML.ease(t, on, on + dur);
        place(head, lerpR(A.head, B.head, e));
        place(win, lerpR(A.pic, B.pic, e));
        slot.style.opacity = ML.ease(t, on - 0.02, on + 0.3).toFixed(4);
        // slot_pop off: the slot fades in where it lands, without the overshoot (the layout has made room for it either way)
        slot.style.scale = p.slot_pop ? (0.8 + 0.2 * ML.back(t, on, on + 0.4)).toFixed(4) : "none";
      },
    };
  },
});

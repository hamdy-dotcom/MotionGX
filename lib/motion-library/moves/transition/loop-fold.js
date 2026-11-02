// Loop fold: the film un-builds itself back into its opening state, so its last frame equals its first and the loop
// is seamless. The move owns both ends: it builds in from `at` and folds back over the last `fold_dur` seconds, the
// fold being the build run in reverse (last in, first out), so the frame at `end` is the frame before `at`, exactly
// (every value is a pure function of t; nothing springs past the end).
//   logo-undraw:   the logo's strokes draw on (stroke-dashoffset full -> 0) and its fill comes up; the fold takes the
//                  fill back to 0 and the strokes back to full length.
//   ui-reset:      the scene's UI enters piece by piece and its number counts up; the fold sends every piece back out
//                  in reverse order and counts the number back to 0.
//   camera-return: a camera pushes in on the headline, pans to the picture, then returns to its first key.
// Keep the loop a whole number of bars (the director sets the scene length) and the landing loop muted.
// Source: Rieranthony/product-film-skill reference/ingredients.md "Ending and loop" (MIT: fold back to the first
// frame's state, the logo un-draws, the UI resets, the last frame equals frame 0).
ML.define({
  id: "transition.loop-fold",
  category: "transition",
  name: "Loop fold",
  does: "At the end of a loop the film un-builds itself back into its opening state so the last frame equals the first and the loop is seamless.",
  says: ["ambient", "brand", "transition"],
  energy: 2,
  targets: ["scene", "logo", "screen"],
  duration: [0.6, 2],
  params: {
    fold: { type: "choice", options: ["logo-undraw", "ui-reset", "camera-return"], default: "logo-undraw" },
    fold_dur: { type: "number", range: [0.6, 2], default: 1, unit: "s" },
  },
  pairs: ["element.logo-draw", "camera.push-in"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "product-film-skill:plugins/product-film/skills/product-film/reference/ingredients.md", license: "MIT", note: "Ending and loop" },
  setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const W = f.W, H = f.H;
    const host = ctx.scene || stage;
    const fE = end - 0.04; // folded by the last frame
    const fd = ML.clamp(p.fold_dur, 0.6, 2);
    const room = Math.max(0.6, fE - at);
    const fA = Math.max(at + room * 0.5, fE - fd);
    const bd = Math.min(1.2, (fA - at) * 0.7); // the build takes at most 70% of the time before the fold
    const bA = at, bB = at + bd;
    // a shared 0..1 "how built" clock: up over the build, down (mirrored) over the fold
    const built = (t, a, b) => { const up = ML.lin(t, bA + (bB - bA) * a, bA + (bB - bA) * b); const dn = ML.lin(t, fA + (fE - fA) * (1 - b), fA + (fE - fA) * (1 - a)); return Math.min(up, 1 - dn); };
    ctx.sfx(bA, "swell", 0.25);
    ctx.sfx(fA, "whoosh.soft", 0.2);

    if (p.fold === "logo-undraw") {
      const isEl = ctx.el && ctx.el !== stage;
      let logo = isEl ? (ctx.el.tagName.toLowerCase() === "svg" ? ctx.el : ctx.el.querySelector("svg")) : host.querySelector('svg[data-slot="logo"], svg[data-slot-sample="logo"]');
      if (!logo) {
        // no logo on the scene: our own mark, centred
        const NS = "http://www.w3.org/2000/svg", s = Math.min(W, H) * 0.22;
        logo = document.createElementNS(NS, "svg");
        logo.setAttribute("viewBox", "0 0 100 100");
        logo.style.cssText = `position:absolute;left:${(W - s) / 2}px;top:${(H - s) / 2}px;width:${s}px;height:${s}px;z-index:6`;
        logo.innerHTML = '<circle cx="50" cy="50" r="38" fill="var(--x-accent)"/><path d="M32 52 L45 64 L69 38" fill="none" stroke="var(--x-accent-ink)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>';
        host.append(logo);
      }
      const parts = [...logo.querySelectorAll("path, rect, circle, ellipse, line, polyline, polygon, text")];
      const info = parts.map((el) => {
        const cs = getComputedStyle(el);
        let len = 0;
        try { len = el.getTotalLength ? el.getTotalLength() : 0; } catch (e) { len = 0; }
        if (!len) { const bb = el.getBBox(); len = 2 * (bb.width + bb.height) * (el.tagName === "text" ? 3 : 1); }
        const fill = cs.fill, hasFill = fill && fill !== "none" && cs.fillOpacity !== "0";
        const stroke = cs.stroke && cs.stroke !== "none" ? cs.stroke : hasFill ? fill : "var(--x-ink)";
        const sw = parseFloat(cs.strokeWidth) || 0;
        const vb = logo.viewBox && logo.viewBox.baseVal;
        const unit = vb && vb.width ? vb.width / Math.max(1, logo.getBoundingClientRect().width) : 1;
        return { el, len: len + 2, hasFill, stroke, sw: sw > 0 && cs.stroke !== "none" ? sw : Math.max(1, 2 * unit) };
      });
      return {
        draw(t) {
          info.forEach((it, i) => {
            const k = info.length > 1 ? (i / info.length) * 0.3 : 0;
            const d = built(t, k, 0.65 + k * 0.5); // the strokes draw first
            const fl = built(t, 0.6 + k * 0.3, 1); // then the fill comes up
            it.el.style.stroke = it.stroke;
            it.el.style.strokeWidth = String(it.sw);
            it.el.style.strokeDasharray = `${it.len} ${it.len}`;
            it.el.style.strokeDashoffset = (it.len * (1 - d)).toFixed(2);
            it.el.style.strokeOpacity = d > 0 ? String(1 - fl * (it.hasFill ? 1 : 0)) : "0";
            it.el.style.fillOpacity = it.hasFill ? fl.toFixed(4) : "0";
          });
        },
      };
    }

    if (p.fold === "ui-reset") {
      // the pieces: the headline block's lines, then every leaf of the picture panel, in reading order
      const head = [...host.querySelectorAll(".ml-head > *")];
      const panel = host.querySelector(".ml-pic > *");
      const leaves = panel ? [...panel.children].flatMap((c) => (c.children.length > 1 && c.tagName !== "svg" ? [...c.children] : [c])) : [];
      const pieces = [...head, ...(panel ? [panel] : []), ...leaves];
      const n = pieces.length;
      // the number counts up (and back down)
      const num = host.querySelector('[data-slot="number"], [data-slot-sample="number"]');
      const numText = num ? num.textContent : "", digits = numText.replace(/[^0-9]/g, ""), target = digits ? parseInt(digits, 10) : 0;
      const fmt = (x) => { const s = String(Math.round(x)); return numText.includes(",") ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : s; };
      const dist = ctx.look.dist || 28;
      return {
        draw(t) {
          pieces.forEach((el, i) => {
            const a = (i / Math.max(1, n)) * 0.6, b = a + 0.4;
            const u = built(t, a, b), e = 1 - Math.pow(1 - u, 3);
            el.style.opacity = e.toFixed(4);
            el.style.translate = e < 1 ? `0 ${((1 - e) * dist).toFixed(2)}px` : "none";
          });
          if (num && target) num.textContent = fmt(target * (1 - Math.pow(1 - built(t, 0.3, 1), 3)));
        },
      };
    }

    // camera-return: keys from the first pose, back to exactly the first pose at the end (eased, so nothing overshoots)
    const world = [...host.children];
    const head = host.querySelector(".ml-title"), pic = host.querySelector(".ml-pic > *");
    const hb = head ? ctx.box(head) : { x: W * 0.25, y: H * 0.2, w: W * 0.5, h: H * 0.1 };
    const pb = pic ? ctx.box(pic) : { x: W * 0.25, y: H * 0.5, w: W * 0.5, h: H * 0.3 };
    // a 2D push that never enlarges a picture past its pixels
    let cap = 1.25;
    for (const img of host.querySelectorAll("img")) { const r = img.getBoundingClientRect(); if (img.naturalWidth && r.width) cap = Math.min(cap, Math.max(1, img.naturalWidth / (r.width / (stage.getBoundingClientRect().width / (stage.offsetWidth || 1))))); }
    // when a picture has no pixels to spare the camera pulls back instead (a pull-back never enlarges anything)
    const room2 = cap > 1.05;
    const z1 = room2 ? Math.min(cap, 1.22) : 0.86, z2 = room2 ? Math.min(cap, 1.12) : 0.92;
    const keys = [[bA, W / 2, H / 2, 1], [bA + bd * 0.5, hb.x + hb.w / 2, hb.y + hb.h / 2, z1], [fA - 0.05, pb.x + pb.w / 2, pb.y + pb.h / 2, z2], [fE, W / 2, H / 2, 1]];
    const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const at3 = (t) => {
      if (t <= keys[0][0]) return keys[0];
      for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) { const a = keys[i - 1], b = keys[i], u = io((t - a[0]) / (b[0] - a[0])); return [t, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, Math.exp(Math.log(a[3]) + (Math.log(b[3]) - Math.log(a[3])) * u)]; }
      return keys[keys.length - 1];
    };
    return {
      draw(t) {
        const [, x, y, z] = at3(t);
        // keep the view inside the frame
        const ax = W / (2 * z), bx = W - W / (2 * z), ay = H / (2 * z), by = H - H / (2 * z);
        const cxv = ML.clamp(x, Math.min(ax, bx), Math.max(ax, bx)), cyv = ML.clamp(y, Math.min(ay, by), Math.max(ay, by));
        const tr = z === 1 ? "none" : `translate(${(W / 2).toFixed(2)}px, ${(H / 2).toFixed(2)}px) scale(${z.toFixed(4)}) translate(${(-cxv).toFixed(2)}px, ${(-cyv).toFixed(2)}px)`;
        for (const el of world) { el.style.transformOrigin = `${-el.offsetLeft}px ${-el.offsetTop}px`; el.style.transform = tr; }
      },
    };
  },
});

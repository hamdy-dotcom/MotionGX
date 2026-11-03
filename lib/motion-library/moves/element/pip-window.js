// Presenter window glides between full, corner and hidden — the explainer's camera plan, ported.
// A plan [[at, hidden|full|corner|bubble], …]: full = the whole frame, radius 0; corner = 374×210 (300×169 on 1:1)
// 40 px from the right and bottom (300 px from the bottom on 9:16), radius 22; bubble = a portrait box 268×375 at
// x721 y1072 of 1080×1920 (bottom-right elsewhere), radius 30, a 2 px light edge fading in to 55 %. Between visible
// layouts x, y, w, h and r glide on a cubic in-out that ends on the change (glide 0.35–0.54 s); to / from hidden is a
// hard cut. Shadow 0 18px 44px −12px at 55 %. Inside, the camera frame is cropped around a focus box (bubble.mjs:
// centre 540, 861.5, width 760 of 1080×1920) so the face stays framed as the box narrows; the crop only ever scales
// the frame down (sharp). While the window sits in a corner the picture region stops 28–32 px short of it.
// Here: from → layout (after a beat) → finale (stay, back to full, or cut away) near the end. In Arabic the corner
// and bubble move to the bottom-left. Stand-in: a drawn backlit silhouette, never a generated face, sized to the
// window so a full frame reads as a person, not a giant head. A picture too small for the frame keeps its own pixels:
// it sits on the device colour when full and fills the window once it has shrunk (never enlarged).
// Sources: MengTo/Skills html-explainer-video scripts/explainer.js#cameraAt + frameOf's cam (MIT) and
// html-reel scripts/bubble.mjs (MIT, the focus crop and edge).
ML.define({
  id: "element.pip-window",
  category: "element",
  name: "Presenter window glides between full, corner and hidden",
  does: "A speaker window fills the frame, then glides down into a small rounded corner box or portrait bubble, and later grows back full or cuts away.",
  says: ["trust", "story", "transition", "proof"],
  energy: 2,
  targets: ["screen", "image", "scene"],
  duration: [1, 30],
  params: {
    layout: { type: "choice", options: ["full", "corner", "bubble", "hidden"], default: "corner" },
    from: { type: "choice", options: ["full", "corner", "bubble", "hidden"], default: "full" },
    finale: { type: "choice", options: ["stay", "full", "hidden"], default: "stay" },
    glide: { type: "number", range: [0.3, 0.7], default: 0.54, unit: "s" },
    radius: { type: "number", range: [20, 40], default: 22, unit: "px" },
    hold: { type: "number", range: [0.2, 3], default: 0.6, unit: "s" },
    make_room: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "camera.push-in"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:html-explainer-video/scripts/explainer.js#cameraAt", license: "MIT", note: "with html-reel/scripts/bubble.mjs (focus crop, edge)" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent) => { const e = doc.createElement(tag); e.style.cssText = css; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const { W, H, tall, square } = f;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;

    // layouts (explainer frameOf's cam + bubble.mjs's box), mirrored to the left in Arabic
    const side = (x, w) => (rtl ? W - x - w : x);
    const cw = square ? 300 : 374, ch = square ? 169 : 210;
    const corner = { x: side(W - cw - 40, cw), y: H - ch - (tall ? 300 : 40), w: cw, h: ch, r: ML.clamp(p.radius, 20, 40), o: 1, e: 0, sh: 1, fx: W / 2, fy: H / 2, fw: W };
    const bw = 268, bh = 375;
    const bubble = { x: side(tall ? 721 : W - bw - 91, bw), y: tall ? 1072 : H - bh - 40, w: bw, h: bh, r: Math.max(30, ML.clamp(p.radius, 20, 40)), o: 1, e: 0.55, sh: 1, fx: W / 2, fy: H * (861.5 / 1920), fw: Math.min(W, H) * (760 / 1080) };
    const full = { x: 0, y: 0, w: W, h: H, r: 0, o: 1, e: 0, sh: 0, fx: W / 2, fy: H / 2, fw: W };
    const of = (n) => (n === "full" ? full : n === "corner" ? corner : n === "bubble" ? bubble : { ...corner, o: 0 });

    // the window and what it shows: a picture (covering the frame only as far as its pixels allow), a rebuilt screen, else the stand-in
    const win = mk("div", "position:absolute;left:0;top:0;overflow:hidden;pointer-events:none;z-index:8;box-sizing:border-box;background:var(--x-device);", host);
    const cam = mk("div", `position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0;`, win);
    let person = null;
    if (own && own.tagName === "IMG") {
      const nw = own.naturalWidth || W, nh = own.naturalHeight || H, sc = Math.min(1, Math.max(W / nw, H / nh));
      const im = own.cloneNode(true); im.removeAttribute("data-slot");
      im.style.cssText = `position:absolute;left:${(W - nw * sc) / 2}px;top:${(H - nh * sc) / 2}px;width:${nw * sc}px;height:${nh * sc}px;max-width:none;object-fit:cover;display:block;border-radius:0;`;
      cam.append(im);
    }
    else if (own && own.tagName !== "IMG" && !own.classList.contains("ml-scene")) {
      const b = ctx.box(own), s = Math.min(1, (W * 0.9) / b.w, (H * 0.9) / b.h);
      const c = own.cloneNode(true); c.removeAttribute("data-slot");
      c.style.cssText += `;position:absolute;left:${(W - b.w * s) / 2}px;top:${(H - b.h * s) / 2}px;width:${b.w}px;height:${b.h}px;margin:0;transform-origin:0 0;transform:scale(${s.toFixed(4)});`;
      cam.style.background = "var(--x-ground)"; cam.append(c);
    } else {
      // a backlit silhouette, drawn (explainer's STAND_IN, in the look's colours): the backlight fills the window and
      // the person, a vector redrawn every frame, stands at its foot at a size that suits the window
      cam.style.background = "radial-gradient(ellipse 70% 70% at 50% 42%, color-mix(in srgb, var(--x-panel) 80%, var(--x-accent-2)), color-mix(in srgb, var(--x-accent-2) 55%, var(--x-panel-2)) 60%, color-mix(in srgb, var(--x-accent) 60%, var(--x-device)))";
      person = doc.createElementNS(NS, "svg");
      person.setAttribute("viewBox", "34 20 92 72");
      person.style.cssText = "position:absolute;bottom:0;display:block;";
      person.innerHTML = `<g style="fill:var(--x-device)"><ellipse cx="80" cy="40" rx="15.5" ry="19"/><rect x="73" y="52" width="14" height="14"/><path d="M36 92c2-22 22-30 44-30s42 8 44 30z"/></g>`;
      cam.append(person);
    }
    const hide = own && own !== host && !own.classList.contains("ml-scene") ? own : null;

    // the plan: from at `at`, the layout after a beat, the finale before the end
    const glide = ML.clamp(p.glide, 0.3, 0.7);
    const T1 = at + ML.clamp(p.hold, 0.2, 3) + glide;
    const plan = [[at, p.from]];
    if (p.layout !== p.from) plan.push([T1, p.layout]);
    const T2 = end - 0.3;
    if (p.finale !== "stay" && p.finale !== p.layout && T2 > T1 + 0.6) plan.push([T2, p.finale]);
    plan.forEach(([t, n], i) => {
      if (i === 0) return;
      const a = of(plan[i - 1][1]), b = of(n);
      if (a.o && b.o) ctx.sfx(t - glide, "whoosh.soft", 0.3);
      else ctx.sfx(t, "tap", 0.2);
    });
    /** cameraAt (explainer.js), with the edge, shadow and focus carried along */
    const KEYS = ["x", "y", "w", "h", "r", "e", "sh", "fx", "fy", "fw"];
    function camAt(t) {
      if (t < at) return { ...corner, o: 0 };
      let cur = of(plan[0][1]);
      for (let i = 1; i < plan.length; i++) {
        const [tt, n] = plan[i], to = of(n);
        if (t < tt - glide) break;
        if (cur.o === 0 || to.o === 0) { cur = t >= tt ? to : cur; continue; }
        const e = ML.ease(t, tt - glide, tt), nx = { o: 1 };
        for (const k of KEYS) nx[k] = cur[k] + (to[k] - cur[k]) * e;
        cur = nx;
      }
      return cur;
    }

    // making room: the scene's picture region stops short of the corner box while it is there
    const scene = ctx.scene;
    const st = getComputedStyle(ctx.stage);
    const pic0 = { x: parseFloat(st.getPropertyValue("--pic-x")) || f.pic.x, y: parseFloat(st.getPropertyValue("--pic-y")) || f.pic.y, w: parseFloat(st.getPropertyValue("--pic-w")) || f.pic.w, h: parseFloat(st.getPropertyValue("--pic-h")) || f.pic.h };
    const roomFor = (b) => (f.wide ? { w: Math.min(pic0.w, rtl ? pic0.x + pic0.w - (b.x + b.w + 32) : b.x - 32 - pic0.x), h: pic0.h, x: rtl ? Math.max(pic0.x, b.x + b.w + 32) : pic0.x } : { w: pic0.w, h: Math.min(pic0.h, b.y - 28 - pic0.y), x: pic0.x });
    const room = p.make_room && scene && p.layout !== "full" && p.layout !== "hidden" ? roomFor(of(p.layout)) : null;

    return {
      draw(t) {
        const c = camAt(t);
        if (hide) hide.style.visibility = t < at ? "" : "hidden"; // the window carries it from here
        win.style.display = c.o > 0 ? "block" : "none";
        if (room) {
          // how far into the corner it is: 0 full / hidden, 1 sitting in its box
          const tgt = of(p.layout), k = c.o > 0 ? ML.clamp((W - c.w) / (W - tgt.w || 1)) : 0;
          scene.style.setProperty("--pic-w", (pic0.w + (room.w - pic0.w) * k).toFixed(2) + "px");
          scene.style.setProperty("--pic-h", (pic0.h + (room.h - pic0.h) * k).toFixed(2) + "px");
          scene.style.setProperty("--pic-x", (pic0.x + (room.x - pic0.x) * k).toFixed(2) + "px");
        }
        if (c.o <= 0) return;
        win.style.left = c.x.toFixed(2) + "px"; win.style.top = c.y.toFixed(2) + "px";
        win.style.width = c.w.toFixed(2) + "px"; win.style.height = c.h.toFixed(2) + "px";
        win.style.borderRadius = c.r.toFixed(2) + "px";
        const shadow = c.sh > 0.01 ? `0 18px 44px -12px color-mix(in srgb, var(--x-device) ${(55 * c.sh).toFixed(1)}%, transparent)` : "";
        win.style.boxShadow = shadow || "none";
        win.style.outline = c.e > 0.01 ? `2px solid color-mix(in srgb, var(--x-panel) ${(c.e * 100).toFixed(1)}%, transparent)` : "none";
        win.style.outlineOffset = "-2px";
        if (person) {
          cam.style.width = c.w.toFixed(2) + "px"; cam.style.height = c.h.toFixed(2) + "px"; cam.style.transform = "none";
          const ph = Math.min(c.h * 0.74, c.w * 0.72), pw = (ph * 92) / 72;
          person.style.width = pw.toFixed(2) + "px"; person.style.height = ph.toFixed(2) + "px"; person.style.left = ((c.w - pw) / 2).toFixed(2) + "px";
          return;
        }
        // the crop (bubble.mjs): all of the frame at first, the focus box at the end; never scaled up
        let sw = Math.min(W, c.fw), sh = (sw * c.h) / c.w;
        if (sh > H) { sh = H; sw = (sh * c.w) / c.h; }
        const s = Math.min(1, c.w / sw);
        const sx = ML.clamp(c.fx - sw / 2, 0, W - sw), sy = ML.clamp(c.fy - sh / 2, 0, H - sh);
        cam.style.transform = `translate(${(-sx * s).toFixed(2)}px, ${(-sy * s).toFixed(2)}px) scale(${s.toFixed(5)})`;
      },
    };
  },
});

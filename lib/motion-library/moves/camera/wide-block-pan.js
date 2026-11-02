// Pan across a wide block. Ported from MotionGX's live engine (recipes.js R.hero): when a block's height at its fit
// scale is under 60% of the view, it is a wide, thin block — never shown as a thin strip in an empty frame. The view
// width that fills the window's height is bw = min(w, h·vw/vh); the camera focuses [0, 0, bw, h] at the start, then
// [w − bw, 0, bw, h] linearly (or sine.inOut) over the rest of the scene. Direction by script: an RTL screen starts at
// the right ("ltr" follows the script, "rtl" reverses it). The zoom never passes 3.2 (the live engine's ZMAX) and a
// picture never past its own pixels. A block that is not wide holds at its fit. The window moves, never the UI inside
// it; 2D only, so text stays sharp. With no screen given it builds its own wide strip (a row of stats) in the picture
// region, in the look's colours.
// Source: own, lib/live-engine/worker/vendor/recipes.js (R.hero, the focus F).
ML.define({
  id: "camera.wide-block-pan",
  category: "camera",
  name: "Pan across a wide block",
  does: "A wide, thin block fills the window's height and the camera pans along it.",
  says: ["flow", "proof"],
  energy: 2,
  targets: ["screen", "image"],
  duration: [2, 8],
  params: {
    direction: { type: "choice", options: ["ltr", "rtl"], default: "ltr" },
    ease: { type: "choice", options: ["none", "sine.inOut"], default: "none" },
  },
  pairs: ["camera.region-tour", "camera.readable-establish"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "own:lib/live-engine/worker/vendor/recipes.js", license: "own", note: "R.hero: bw = min(w, h·vw/vh), focus [0,0,bw,h] → [w−bw,0,bw,h], linear" },
  setup(ctx) {
    const { el, p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const ZMAX = 3.2;
    let win, cam, natural = Infinity, isImg = false;
    if (el && el !== stage && el !== host && el.tagName === "IMG") {
      // a picture: framed in its own box, laid at its own aspect so the camera can travel along it
      isImg = true;
      const r = ctx.box(el), nw = el.naturalWidth || r.w, nh = el.naturalHeight || r.h;
      win = document.createElement("div");
      win.style.cssText = `position:relative;overflow:hidden;width:${r.w}px;height:${r.h}px;border-radius:var(--x-pic-radius);background:var(--x-pic-ground)`;
      el.replaceWith(win);
      cam = document.createElement("div");
      cam.style.cssText = `position:absolute;left:0;top:0;width:${nw}px;height:${nh}px;transform-origin:0 0`;
      el.style.cssText += `;width:${nw}px;height:${nh}px;object-fit:fill;border-radius:0;max-width:none`;
      cam.append(el);
      win.append(cam);
      natural = 1; // the picture is laid at its own pixels: zoom above 1 would enlarge it
    } else if (el && el !== stage && el !== host) {
      win = el;
      if (getComputedStyle(win).position === "static") win.style.position = "relative";
      win.style.overflow = "hidden";
      cam = document.createElement("div");
      cam.style.cssText = "position:absolute;left:0;top:0;width:max-content;transform-origin:0 0";
      while (win.firstChild) cam.append(win.firstChild);
      win.append(cam);
    } else {
      // our own window over the picture region with a wide strip inside: stat tiles in a row and a running line
      const pic = f.pic, wh = Math.min(pic.h, pic.w * (f.tall ? 0.9 : 0.62));
      win = document.createElement("div");
      win.className = "ml-panel";
      win.style.cssText = `position:absolute;left:${pic.x}px;top:${pic.y + (pic.h - wh) / 2}px;width:${pic.w}px;height:${wh}px;overflow:hidden;z-index:3;direction:ltr`;
      host.append(win);
      cam = document.createElement("div");
      const th = Math.round(Math.min(f.W, f.H) * 0.2), gap = Math.round(th * 0.12);
      cam.style.cssText = `position:absolute;left:0;top:0;display:flex;gap:${gap}px;padding:${gap}px;transform-origin:0 0;width:max-content`;
      const n = 9;
      for (let i = 0; i < n; i++) {
        const tile = document.createElement("div");
        tile.style.cssText = `position:relative;width:${Math.round(th * 1.25)}px;height:${th}px;border-radius:calc(var(--x-radius) * 0.6);background:${i % 3 === 1 ? "var(--x-accent)" : "var(--x-panel-2)"};color:${i % 3 === 1 ? "var(--x-accent-ink)" : "var(--x-ink)"};padding:${Math.round(th * 0.12)}px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between`;
        const num = document.createElement("div");
        num.textContent = `${Math.round(12 + ML.rnd(i, 3) * 88)}${i % 2 ? "%" : "k"}`;
        num.style.cssText = `font:var(--x-head-weight) ${Math.round(th * 0.3)}px/1 var(--x-head-font);letter-spacing:var(--x-head-track)`;
        const bars = document.createElement("div");
        bars.style.cssText = `display:flex;align-items:flex-end;gap:${Math.round(th * 0.03)}px;height:${Math.round(th * 0.32)}px`;
        for (let k = 0; k < 7; k++) {
          const b = document.createElement("div");
          b.style.cssText = `flex:1;border-radius:3px;height:${Math.round(20 + ML.rnd(i * 7 + k, 5) * 80)}%;background:currentColor;opacity:${k === 6 ? 1 : 0.35}`;
          bars.append(b);
        }
        tile.append(num, bars);
        cam.append(tile);
      }
      win.append(cam);
    }
    const vw = win.clientWidth, vh = win.clientHeight;
    const w = Math.max(1, cam.offsetWidth), h = Math.max(1, cam.offsetHeight);
    const fit = Math.min(vw / w, vh / h);
    const thin = h * fit < vh * 0.6;
    const reverse = (p.direction === "rtl") !== !!ctx.rtl;
    // the focus F: the box [x, y, bw, bh] fills the view; never past ZMAX, never a picture past its pixels
    const zoomFor = (bw, bh) => Math.min(ZMAX, natural, Math.min(vw / bw, vh / bh));
    const bw = Math.min(w, h * (vw / vh));
    const z = thin || w / h > vw / vh ? zoomFor(bw, h) : fit;
    const shownW = w * z, shownH = h * z;
    const travel = Math.max(0, shownW - vw);
    const y0 = shownH < vh ? (vh - shownH) / 2 : 0;
    const t0 = at, t1 = Math.max(at + 1, end - 0.3);
    if (travel > 1) ctx.sfx(at + 0.05, "whoosh.soft", 0.18);
    const sine = (x) => -(Math.cos(Math.PI * x) - 1) / 2;
    return {
      draw(t) {
        const u = ML.lin(t, t0, t1), e = p.ease === "sine.inOut" ? sine(u) : u;
        const k = reverse ? 1 - e : e;
        const x = travel > 1 ? -k * travel : (vw - shownW) / 2;
        cam.style.transform = `translate(${x.toFixed(2)}px, ${y0.toFixed(2)}px) scale(${z.toFixed(4)})`;
      },
    };
  },
});

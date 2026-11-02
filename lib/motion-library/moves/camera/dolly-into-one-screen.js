// Camera dives into one screen of the cluster: the headline blurs out (0 → 12 px, opacity → 0 in 0.4 s) and the camera
// travels forward through a cluster of floating screens until the chosen one fills the frame. Screens float at different
// depths in one perspective space (rotateX ~30°, a gentle bob each); the camera's z and its aim glide to the chosen
// screen over `duration` on expo.inOut; the chosen screen turns toward flat (30° → 8°, or 0) and ends centred at
// `end_width` of the frame; the others pass the frame edges with depth-of-field blur by |z − focus|·k (up to 10 px) and
// fade out. Sharp: the screen is rendered at its final size and the camera never brings it past 1 (it ends at
// min(1, end_width·W / its width)); a passing screen is gone before it would project past 1. At flat the last pose is
// plain 2D. The cluster: the chosen screen is the target (or the scene's [data-focus] / main panel / picture); its
// neighbours are the scene's other [data-screen] panels, else quiet look-coloured screens built around it.
// Source: prompt-motion mengto-a7f4679 (reference only — rebuilt as our own code).
ML.define({
  id: "camera.dolly-into-one-screen",
  category: "camera",
  name: "Camera dives into one screen of the cluster",
  does: "The headline blurs out and the camera travels forward through a cluster of floating screens until one screen fills the frame.",
  says: ["focus", "reveal", "proof"],
  energy: 3,
  targets: ["screen", "stage"],
  duration: [1.2, 2.5],
  params: {
    end_angle: { type: "choice", options: ["flat", "slight-tilt"], default: "slight-tilt" },
    end_width: { type: "number", range: [0.5, 1], default: 0.6, unit: "frame" },
    duration: { type: "number", range: [0.8, 1.6], default: 1.2, unit: "s" },
    blur_headline: { type: "bool", default: true },
    tilt: { type: "number", range: [15, 40], default: 30, unit: "deg" },
    others: { type: "number", range: [2, 6], default: 4 },
  },
  pairs: ["camera.screen-focus", "device.app-window-frame", "ui.ui-come-alive"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:mengto-a7f4679", license: "reference", note: "our own perspective-cluster dolly after the video" },
  setup(ctx) {
    const { el, p, at, stage, f } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, doc = document;
    const shown = (n) => n && n.getClientRects().length > 0 && getComputedStyle(n).visibility !== "hidden";
    // the chosen screen
    let scr = el && el !== stage && el !== host ? el : null;
    if (!scr) scr = [host.querySelector("[data-focus]"), host.querySelector("[data-screen]"), host.querySelector(".ml-pic .ml-panel"), host.querySelector(".ml-pic img"), host.querySelector(".ml-pic")].find(shown) || null;
    if (!scr) return null;
    const head = [...host.querySelectorAll(".ml-head, .ml-title")].find((n) => shown(n) && !n.contains(scr) && !scr.contains(n)) || null;
    const parent = scr.parentElement;
    if (getComputedStyle(parent).position === "static") parent.style.position = "relative";
    const pb = ctx.box(parent), sb = ctx.box(scr);
    const sw = scr.offsetWidth || sb.w, sh = scr.offsetHeight || sb.h;
    // one perspective space: the camera's eye over the frame's centre
    const P = Math.max(W, H) * 0.9;
    parent.style.perspective = P.toFixed(0) + "px";
    parent.style.perspectiveOrigin = `${(W / 2 - pb.x).toFixed(1)}px ${(H / 2 - pb.y).toFixed(1)}px`;
    // final size: end_width of the frame, never past 1
    const sEnd = Math.min(1, (ML.clamp(p.end_width, 0.5, 1) * W) / sw);
    const zEnd = P - P / sEnd; // scale = P / (P − z)
    const D = P * 1.25; // the camera's travel
    const zStart = zEnd - D;
    const tilt0 = ML.clamp(p.tilt, 15, 40), tilt1 = p.end_angle === "flat" ? 0 : 8;
    const c0 = { x: sb.x + sb.w / 2, y: sb.y + sb.h / 2 };
    // its neighbours: the scene's other screens, else quiet screens built around it (look-coloured skeletons)
    let others = [...host.querySelectorAll("[data-screen]")].filter((n) => n !== scr && shown(n) && !n.contains(scr) && !scr.contains(n));
    const built = [];
    if (!others.length) {
      const N = Math.round(ML.clamp(p.others, 2, 6));
      for (let i = 0; i < N; i++) {
        const g = doc.createElement("div");
        g.className = "ml-panel";
        const k = 0.4 + ML.rnd(i, 3) * 0.25, w = Math.min(sw * k, W * 0.36), h = Math.min(sh * k, w * (0.55 + ML.rnd(i, 4) * 0.4));
        g.style.cssText = `position:absolute;left:0;top:0;width:${w.toFixed(0)}px;height:${h.toFixed(0)}px;box-sizing:border-box;padding:${(w * 0.06).toFixed(0)}px;display:flex;flex-direction:column;gap:${(w * 0.035).toFixed(0)}px;overflow:hidden;pointer-events:none;backface-visibility:hidden`;
        const bar = (wd, ht, bg, r) => { const b = doc.createElement("div"); b.style.cssText = `width:${wd}%;height:${ht.toFixed(0)}px;border-radius:${r};background:${bg};flex:none`; g.append(b); };
        bar(30 + ML.rnd(i, 5) * 25, w * 0.05, "var(--x-accent)", "var(--x-radius-s)");
        bar(85, w * 0.035, "var(--x-line)", "var(--x-radius-s)");
        bar(65, w * 0.035, "var(--x-line)", "var(--x-radius-s)");
        bar(100, h * 0.32, "var(--x-panel-2)", "calc(var(--x-radius) * 0.5)");
        bar(45, w * 0.035, "var(--x-line)", "var(--x-radius-s)");
        parent.insertBefore(g, scr);
        built.push(g);
      }
      others = built;
    }
    // where each neighbour floats: around the chosen screen, mostly nearer the camera (they pass by), a few behind
    const items = others.map((n, i) => {
      const nb = ctx.box(n), ang = (i / others.length) * Math.PI * 2 + 0.6 + ML.rnd(i, 7) * 0.5;
      const isBuilt = built.includes(n);
      const wx = isBuilt ? c0.x + Math.cos(ang) * W * (0.5 + ML.rnd(i, 8) * 0.15) : nb.x + nb.w / 2;
      const wy = isBuilt ? c0.y + Math.sin(ang) * H * (0.36 + ML.rnd(i, 9) * 0.1) : nb.y + nb.h / 2;
      const dz = (i % 3 === 2 ? -0.3 : 0.25 + ML.rnd(i, 10) * 0.5) * D; // its depth relative to the chosen screen
      // the layout position it is moved from (built ones sit at the parent's corner)
      const lx = isBuilt ? n.offsetWidth / 2 : nb.x - pb.x + nb.w / 2, ly = isBuilt ? n.offsetHeight / 2 : nb.y - pb.y + nb.h / 2;
      return { n, wx: wx - pb.x, wy: wy - pb.y, dz, lx, ly, ph: ML.rnd(i, 11) * 6.28, base: isBuilt ? "" : n.style.transform && n.style.transform !== "none" ? n.style.transform + " " : "" };
    });
    const scrBase = scr.style.transform && scr.style.transform !== "none" ? scr.style.transform + " " : "";
    scr.style.transformOrigin = "50% 50%";
    // depth order: screens nearer the camera draw over the chosen one, those behind under it
    if (getComputedStyle(scr).position === "static") scr.style.position = "relative";
    scr.style.zIndex = "1";
    for (const it of items) { it.n.style.transformOrigin = "50% 50%"; it.n.style.zIndex = it.dz > 0 ? "2" : "0"; }
    const dur = ML.clamp(p.duration, 0.8, 1.6);
    const t0 = at + (p.blur_headline && head ? 0.12 : 0), t1 = t0 + dur;
    const expoInOut = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2);
    const from = ctx.from ?? 0;
    ctx.sfx(t0, "whoosh.soft", 0.35);
    ctx.sfx(t1 - 0.05, "land.light", 0.2);
    // the camera's aim: from the frame's centre to the chosen screen's centre (in the parent's space)
    const F = { x: W / 2 - pb.x, y: H / 2 - pb.y }, C0 = { x: c0.x - pb.x, y: c0.y - pb.y };
    return {
      draw(t) {
        const e = expoInOut(ML.lin(t, t0, t1));
        const camX = F.x + (C0.x - F.x) * e, camY = F.y + (C0.y - F.y) * e, camZ = D * e;
        const bob = (ph) => Math.sin(t * 1.3 + ph) * 6 * (1 - e);
        // the chosen screen
        const rx = tilt0 + (tilt1 - tilt0) * e;
        // pushed back by its tilted near edge, so no part of it projects past its end size (≤ 1)
        const z = zStart + camZ - (sh / 2) * Math.sin((rx * Math.PI) / 180);
        const tx = F.x - camX, ty = F.y - camY + bob(0.4);
        if (e >= 1 && tilt1 === 0) {
          // flat at the end: plain 2D, so the raster is exactly sharp
          scr.style.transform = `${scrBase}translate(${(F.x - C0.x).toFixed(2)}px, ${(F.y - C0.y).toFixed(2)}px) scale(${sEnd.toFixed(4)})`;
        } else {
          // translate so its centre heads to the frame's centre as the camera aims there
          scr.style.transform = `${scrBase}translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, ${z.toFixed(2)}px) rotateX(${rx.toFixed(3)}deg)`;
        }
        // the cluster
        const fadeIn = ML.ease(t, from, from + 0.3);
        for (const it of items) {
          const zz = zStart + it.dz + camZ, sc = P / (P - zz);
          const x = it.wx + (F.x - camX) - it.lx, y = it.wy + (F.y - camY) - it.ly + bob(it.ph);
          // gone before it would project past 1 (and while it passes, out of focus by its depth from the chosen screen)
          const o = fadeIn * (1 - ML.clamp((sc - 0.82) / 0.16)) * (1 - ML.clamp((e - 0.5) / 0.45));
          if (o <= 0.002 || zz >= P * 0.9) { it.n.style.visibility = "hidden"; continue; }
          it.n.style.visibility = "visible";
          it.n.style.opacity = o.toFixed(4);
          const blur = Math.min(10, (Math.abs(it.dz) / D) * 16) * e;
          it.n.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
          it.n.style.transform = `${it.base}translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${zz.toFixed(2)}px) rotateX(${tilt0}deg)`;
        }
        // the headline blurs out as the camera leaves
        if (head && p.blur_headline) {
          const u = ML.lin(t, at, at + 0.4);
          head.style.opacity = (1 - u).toFixed(4);
          head.style.filter = u > 0.001 ? `blur(${(u * 12).toFixed(2)}px)` : "none";
        } else if (head) head.style.opacity = (1 - ML.lin(t, t0, t0 + dur * 0.5)).toFixed(4);
      },
    };
  },
});

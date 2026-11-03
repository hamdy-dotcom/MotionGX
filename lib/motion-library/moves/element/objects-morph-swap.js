// Objects swap type in place: a cloud of small objects (documents with a coloured header strip, or icon tiles) turn,
// one after another around the cloud, into another kind of object (16:9 video thumbnails with a play mark, picture
// crops, or little charts) without leaving their spots. Flip: rotateY 0 → 90° in 0.15 s power2.in, the content swaps
// edge-on, 90 → 0° in 0.2 s power2.out; crossfade: the two faces cross in 0.3 s; scale: the old one shrinks away and the
// new one pops in on back.out (2D only, so its overshoot stays sharp). The swap sweeps by angle around the cloud (clockwise in English, the other way in
// Arabic) ~0.02 s apart, tightened when the scene is short so it always finishes. The new objects are laid out a little larger and brighter (never scaled past 1 under 3D).
// The cloud floats on a slow seeded drift the whole time, so the swap reads as "same place, new kind".
// Source: prompt-motion "sudo-kiran-i-have-asked-opus" (reference only — rebuilt as our own code).
ML.define({
  id: "element.objects-morph-swap",
  category: "element",
  name: "Objects swap type in place",
  does: "A cloud of objects flip one after another and turn into a different kind of object while keeping their positions or orbit.",
  says: ["change", "before-after"],
  energy: 3,
  targets: ["card", "image"],
  duration: [1, 3],
  params: {
    swap: { type: "choice", options: ["flip", "crossfade", "scale"], default: "flip" },
    stagger: { type: "number", range: [0.01, 0.06], default: 0.02, unit: "s" },
    count: { type: "number", range: [8, 28], default: 16 },
    from: { type: "choice", options: ["docs", "icons"], default: "docs" },
    into: { type: "choice", options: ["videos", "pictures", "charts"], default: "videos" },
    layout: { type: "choice", options: ["ring", "scatter"], default: "ring" },
    orbit: { type: "number", range: [0, 12], default: 3, unit: "deg/s" },
  },
  pairs: ["element.orbit-cloud-3d", "text-in.punchline", "camera.push-in"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:sudo-kiran-i-have-asked-opus", license: "reference", note: "the flip-swap cloud rebuilt as our own code; every frame from t" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const ob = own ? ctx.box(own) : null;
    const big = ob && ob.w > f.W * 0.4 && ob.h > f.H * 0.18;
    const R = big ? ob : f.pic;
    const k = Math.min(f.W, f.H) / 1080;
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;perspective:${1400 * k}px;`, host);
    mk("div", "position:absolute;inset:0;border-radius:var(--x-radius);background:var(--x-ground);", layer);
    if (own && big) own.style.visibility = "hidden";
    // pictures for the "pictures" kind: the target's own, else any picture in the scene
    const pic = own && own.tagName === "IMG" ? own : host.querySelector("img");
    const n = Math.round(ML.clamp(p.count, 8, 28));
    const cx = R.w / 2, cy = R.h / 2;
    const rx = R.w * 0.38, ry = R.h * 0.36;
    // the old object: a doc 60×80 or an icon tile 64×64; the new: a 16:9 thumb 104×58 (larger, brighter)
    const oldW = (p.from === "icons" ? 64 : 60) * k * 1.3, oldH = (p.from === "icons" ? 64 : 80) * k * 1.3;
    const newW = 104 * k * 1.3, newH = 58 * k * 1.3;
    const glyphs = ["M4 12h16M12 4v16", "M5 12l5 5 9-10", "M12 3l9 16H3z", "M4 6h16v12H4z", "M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16", "M4 18l6-6 4 4 6-8"];
    const svg = (d, size, color) => { const s = doc.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.style.cssText = `width:${size}px;height:${size}px;display:block;`; const pa = doc.createElementNS(NS, "path"); pa.setAttribute("d", d); pa.setAttribute("fill", "none"); pa.setAttribute("stroke", color); pa.setAttribute("stroke-width", "2.2"); pa.setAttribute("stroke-linecap", "round"); pa.setAttribute("stroke-linejoin", "round"); s.append(pa); return s; };
    const items = Array.from({ length: n }, (_, i) => {
      // place: an even ring with seeded jitter, or a seeded scatter that keeps clear of the centre
      let a = (i / n) * Math.PI * 2 - Math.PI / 2, r = 1;
      if (p.layout === "scatter") { a = i * 2.39996 + (ML.rnd(i, 3) - 0.5) * 0.5; r = 0.4 + 0.6 * ML.rnd(i, 4); } // golden angle: scattered, never clumped
      const jog = p.layout === "scatter" ? 1 : 0.5; // a ring keeps its rhythm: less jitter, so neighbours do not clump
      const jx = (ML.rnd(i, 5) - 0.5) * 0.18 * jog, jy = (ML.rnd(i, 6) - 0.5) * 0.22 * jog;
      const wrap = mk("div", `position:absolute;left:0;top:0;width:${newW}px;height:${Math.max(oldH, newH)}px;${p.swap === "flip" ? "transform-style:preserve-3d;" : ""}`, layer);
      const face = (w, h) => mk("div", `position:absolute;left:${(newW - w) / 2}px;top:${(Math.max(oldH, newH) - h) / 2}px;width:${w}px;height:${h}px;box-sizing:border-box;overflow:hidden;backface-visibility:hidden;`, wrap);
      const A = face(oldW, oldH), B = face(newW, newH);
      if (p.from === "icons") {
        A.style.cssText += "border-radius:22%;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);display:flex;align-items:center;justify-content:center;";
        A.append(svg(glyphs[i % glyphs.length], oldW * 0.5, "var(--x-dim)"));
      } else {
        A.style.cssText += `border-radius:${8 * k}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);padding:${6 * k}px;display:flex;flex-direction:column;gap:${5 * k}px;align-items:${rtl ? "flex-end" : "flex-start"};`;
        mk("div", `width:100%;height:${12 * k}px;border-radius:${3 * k}px;background:color-mix(in srgb, var(--x-accent) ${35 + ((i * 17) % 45)}%, var(--x-panel-2));margin:${-6 * k}px ${-6 * k}px ${2 * k}px;width:calc(100% + ${12 * k}px);`, A);
        for (let j = 0; j < 4; j++) mk("div", `height:${4 * k}px;border-radius:${2 * k}px;background:var(--x-line);width:${55 + ML.rnd(i, 10 + j) * 40}%;`, A);
      }
      B.style.cssText += `border-radius:${10 * k}px;box-shadow:0 0 ${14 * k}px color-mix(in srgb, var(--x-accent) 35%, transparent), var(--x-shadow);display:flex;align-items:center;justify-content:center;`;
      if (p.into === "pictures" && pic) {
        const im = mk("img", `position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${(8 + ((i * 37) % 84)).toFixed(0)}% ${(10 + ((i * 53) % 80)).toFixed(0)}%;`, B);
        im.src = pic.currentSrc || pic.src; im.alt = "";
      } else if (p.into === "charts") {
        B.style.background = "var(--x-panel)"; B.style.alignItems = "flex-end"; B.style.gap = `${4 * k}px`; B.style.padding = `${8 * k}px`;
        for (let j = 0; j < 5; j++) mk("div", `flex:1;border-radius:${2 * k}px ${2 * k}px 0 0;height:${20 + ML.rnd(i, 20 + j) * 70}%;background:${j === 4 ? "var(--x-accent)" : "color-mix(in srgb, var(--x-accent) 35%, var(--x-panel-2))"};`, B);
      } else {
        B.style.background = `linear-gradient(${135 + i * 23}deg, color-mix(in srgb, var(--x-accent) ${70 + ((i * 13) % 30)}%, var(--x-ink)), var(--x-accent-2))`;
        const play = mk("div", `width:${22 * k}px;height:${22 * k}px;border-radius:50%;background:color-mix(in srgb, var(--x-accent-ink) 92%, transparent);display:flex;align-items:center;justify-content:center;`, B);
        mk("div", `width:0;height:0;border-style:solid;border-width:${5 * k}px 0 ${5 * k}px ${8 * k}px;border-color:transparent transparent transparent var(--x-accent);margin-left:${2 * k}px;`, play);
        mk("div", `position:absolute;left:${6 * k}px;right:${6 * k}px;bottom:${5 * k}px;height:${3 * k}px;border-radius:${2 * k}px;background:color-mix(in srgb, var(--x-accent-ink) 35%, transparent);`, B);
      }
      return { wrap, A, B, a, r, jx, jy };
    });
    // swap order: by angle round the cloud, from the top, clockwise (counter-clockwise in Arabic)
    const dirn = rtl ? -1 : 1;
    const order = items.map((it, i) => ({ i, key: (((it.a + Math.PI / 2) * dirn) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) })).sort((x, y) => x.key - y.key);
    const sw0 = at + 0.25, st = Math.max(0.004, Math.min(ML.clamp(p.stagger, 0.01, 0.06), (end - sw0 - 0.35 - 0.3) / n));
    const swapT = new Array(n); order.forEach((o, j) => { swapT[o.i] = sw0 + j * st; });
    ctx.sfx(sw0, "whoosh.soft", 0.35);
    ctx.sfx(sw0 + n * st * 0.5, "tap", 0.2);
    const leaveA = Math.max(sw0 + n * st + 0.45, end - 0.3);
    const powIn = (x) => x * x, powOut = (x) => 1 - (1 - x) * (1 - x);
    return {
      draw(t) {
        const leave = ML.clamp((t - leaveA) / 0.25);
        layer.style.opacity = (ML.lin(t, at - 0.05, at + 0.2) * (1 - leave)).toFixed(4);
        layer.style.visibility = t < at - 0.06 ? "hidden" : "visible";
        const spin = ((p.orbit * (t - at)) * Math.PI) / 180 * dirn;
        items.forEach((it, i) => {
          const a = it.a + spin;
          const x = cx + Math.cos(a) * rx * it.r + it.jx * R.w * 0.5, y = cy + Math.sin(a) * ry * it.r + it.jy * R.h * 0.4 + Math.sin(t * 1.3 + i) * 3 * k;
          const s = swapT[i];
          let ry3 = 0, oA = 1, oB = 0, sA = 1, sB = 1;
          if (p.swap === "flip") {
            if (t < s + 0.15) { ry3 = 90 * powIn(ML.lin(t, s, s + 0.15)); oA = 1; oB = 0; }
            else { ry3 = 90 * (1 - powOut(ML.lin(t, s + 0.15, s + 0.35))); oA = 0; oB = 1; }
          } else if (p.swap === "crossfade") { const u = ML.ease(t, s, s + 0.3); oA = 1 - u; oB = u; }
          else { const u = ML.lin(t, s, s + 0.15); sA = 1 - powIn(u); oA = sA > 0.001 ? 1 : 0; const v = t < s + 0.12 ? 0 : ML.back(t, s + 0.12, s + 0.42, 1.8); sB = Math.max(0, v); oB = t < s + 0.12 ? 0 : 1; }
          it.wrap.style.transform = `translate(${(x - newW / 2).toFixed(2)}px, ${(y - Math.max(oldH, newH) / 2).toFixed(2)}px)${p.swap === "flip" ? ` rotateY(${(ry3 * dirn).toFixed(2)}deg)` : ""}`;
          it.A.style.opacity = oA.toFixed(4); it.A.style.transform = sA === 1 ? "none" : `scale(${sA.toFixed(4)})`;
          it.B.style.opacity = oB.toFixed(4); it.B.style.transform = sB === 1 ? "none" : `scale(${sB.toFixed(4)})`;
          it.B.style.filter = oB > 0 ? `brightness(${(1 + 0.12 * (1 - ML.lin(t, s + 0.2, s + 0.8))).toFixed(3)})` : "none";
        });
      },
    };
  },
});

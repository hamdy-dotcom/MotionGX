// Layer parallax: the camera drifts and the scene's layers slide at different speeds, so a flat scene gains depth.
// Each layer has a depth z (far 0.1, background 0.2, the picture 0.6, foreground 1.0, overlay 1.3; the headline 0.3:
// text mostly stable) and translates −c(t)·z, with a touch of scale 1 + 0.02·z·progress. The camera offset c(t), centred on the composed frame
// (the layout is true at the middle of the move, so the layers never close up on each other by the full travel):
//   ramp   −amount/2 → amount/2 over the move on sine.inOut,
//   drift  amount·0.3·sin(0.4·τ) (the slow breathing drift),
//   scroll frameH·speed over the move (the scroll-storytelling recipe: data-speed 0.18 by default).
// The background and foreground layers are built from the look (soft shapes, rings, specks) and run 15% past the frame
// so their edges never show. On a picture target the picture sits 115% tall (only as far as its pixels allow) in an
// overflow-hidden figure and slides inside it (axis x: 115% wide, sliding along the reading direction). focus_shift racks focus: the background dims 1 → 0.7 and softens 0 → 4px
// (only built shapes are softened; a picture is never blurred). The x axis follows reading direction (mirrored in RTL).
// Source: MengTo/Skills web-design/cinematic-gsap-lenis-motion-system + gsap-scrolltrigger-storytelling (MIT), as a
// pure function of t.
ML.define({
  id: "camera.layer-parallax",
  category: "camera",
  name: "Depth parallax drift",
  does: "Foreground, midground and background layers slide at different speeds as the camera moves, giving a flat scene cinematic depth.",
  says: ["story", "calm", "luxury", "focus", "ambient"],
  energy: 2,
  targets: ["stage", "scene", "image"],
  duration: [2, 10],
  params: {
    axis: { type: "choice", options: ["x", "y", "both"], default: "y" },
    amount: { type: "number", range: [40, 200], default: 100, unit: "px" },
    layers: { type: "number", range: [2, 5], default: 3 },
    speed: { type: "number", range: [0.05, 0.4], default: 0.18 },
    path: { type: "choice", options: ["ramp", "drift", "scroll"], default: "ramp" },
    focus_shift: { type: "bool", default: false },
  },
  pairs: ["text-in.soft-rise", "camera.long-lens-dolly-in"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:web-design/cinematic-gsap-lenis-motion-system", license: "MIT", note: "with gsap-scrolltrigger-storytelling: data-speed 0.18, 115% images, bg slower / fg faster / text stable" },
  setup(ctx) {
    const { el, p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, unit = Math.min(W, H) / 1080;
    const amount = ML.clamp(p.amount, 40, 200) * unit;
    const xs = (ctx.rtl ? -1 : 1);
    const ax = p.axis === "x" || p.axis === "both" ? 1 : 0, ay = p.axis === "y" || p.axis === "both" ? 1 : 0;
    const sine = (x) => -(Math.cos(Math.PI * x) - 1) / 2;
    // the camera offset in px (layer-independent), and the progress for the scale touch
    const cam = (t) => {
      const tau = Math.max(0, t - at), prog = sine(ML.lin(t, at, end));
      if (p.path === "drift") return { c: amount * 0.3 * Math.sin(0.4 * tau), prog };
      if (p.path === "scroll") return { c: H * ML.clamp(p.speed, 0.05, 0.4) * (prog - 0.5), prog };
      return { c: amount * (prog - 0.5), prog };
    };
    const apply = (node, z, t, extraScale = true) => {
      const { c, prog } = cam(t);
      const d = -c * z;
      node.style.translate = `${(d * ax * xs).toFixed(2)}px ${(d * ay).toFixed(2)}px`;
      node.style.scale = extraScale ? (1 + 0.02 * z * prog).toFixed(5) : "none";
    };

    // ── a picture target: the picture slides inside its own frame ──
    if (el && el.tagName === "IMG") {
      const r = el.getBoundingClientRect(), k = stage.getBoundingClientRect().width / (stage.offsetWidth || 1) || 1;
      const w = r.width / k, h = r.height / k;
      const fig = document.createElement("figure");
      const cs = getComputedStyle(el);
      fig.style.cssText = `margin:0;position:relative;overflow:hidden;width:${w}px;height:${h}px;border-radius:${cs.borderRadius};flex:none`;
      el.parentNode.insertBefore(fig, el);
      fig.append(el);
      // as tall as 115%, but never past the picture's pixels (cover: the rendered scale is the larger of the two fits)
      const nw = el.naturalWidth || 0, nh = el.naturalHeight || 0;
      const coverK = nw && nh ? Math.max(w / nw, h / nh) : 0;
      const tall = coverK ? ML.clamp(1 / coverK / 1, 1, 1.15) : 1.15;
      const horiz = p.axis === "x";
      el.style.position = "absolute";
      el.style.left = "0";
      el.style.top = "0";
      el.style.width = horiz ? `${(tall * 100).toFixed(2)}%` : "100%";
      el.style.height = horiz ? "100%" : `${(tall * 100).toFixed(2)}%`;
      el.style.objectFit = "cover";
      el.style.display = "block";
      const slack = (tall - 1) * (horiz ? w : h);
      return {
        draw(t) {
          const { prog } = cam(t);
          const q = p.path === "drift" ? 0.5 + 0.5 * Math.sin(0.4 * Math.max(0, t - at)) : prog;
          el.style.translate = horiz ? `${(-(ctx.rtl ? 1 - q : q) * slack).toFixed(2)}px 0` : `0 ${(-q * slack).toFixed(2)}px`;
        },
      };
    }

    // ── a scene: built background / foreground layers around the scene's own picture and text ──
    const N = Math.round(ML.clamp(p.layers, 2, 5));
    const plan = N === 2 ? ["bg"] : N === 3 ? ["bg", "fg"] : N === 4 ? ["far", "bg", "fg"] : ["far", "bg", "fg", "overlay"];
    const Z = { far: 0.1, bg: 0.2, mid: 0.6, text: 0.3, fg: 1.0, overlay: 1.3 };
    const made = [];
    const layer = (name, zi) => {
      const L = document.createElement("div");
      L.style.cssText = `position:absolute;left:-15%;top:-15%;width:130%;height:130%;pointer-events:none;z-index:${zi};transform-origin:50% 50%`;
      L.dataset.mlLayer = name;
      host.insertBefore(L, zi < 1 ? host.firstChild : null);
      made.push({ L, name });
      return L;
    };
    const shape = (L, css) => { const d = document.createElement("div"); d.style.cssText = "position:absolute;" + css; L.append(d); return d; };
    for (const name of plan) {
      const seed = { far: 1, bg: 2, fg: 3, overlay: 4 }[name];
      if (name === "far") {
        const L = layer(name, 0);
        // big soft washes of the two glows
        for (let i = 0; i < 3; i++) {
          const s = (0.55 + ML.rnd(i, seed) * 0.4) * Math.max(W, H);
          shape(L, `left:${(ML.rnd(i, seed + 10) * 100).toFixed(1)}%;top:${(ML.rnd(i, seed + 20) * 100).toFixed(1)}%;width:${s}px;height:${s}px;margin:${-s / 2}px 0 0 ${-s / 2}px;border-radius:50%;background:radial-gradient(closest-side, color-mix(in srgb, var(${i % 2 ? "--x-glow-2" : "--x-glow-1"}) 60%, transparent), transparent);opacity:calc(var(--x-glow-o) * 0.6)`);
        }
      } else if (name === "bg") {
        const L = layer(name, 0);
        // a quiet field: a grid of dots and a few large outlined discs in the line colour
        shape(L, `inset:0;background-image:radial-gradient(var(--x-line) ${(2.2 * unit).toFixed(1)}px, transparent ${(2.6 * unit).toFixed(1)}px);background-size:${(46 * unit).toFixed(0)}px ${(46 * unit).toFixed(0)}px;opacity:0.9`);
        for (let i = 0; i < 4; i++) {
          const s = (0.18 + ML.rnd(i, seed) * 0.22) * Math.min(W, H) * 1.6;
          shape(L, `left:${(8 + ML.rnd(i, seed + 4) * 84).toFixed(1)}%;top:${(8 + ML.rnd(i, seed + 5) * 84).toFixed(1)}%;width:${s}px;height:${s}px;margin:${-s / 2}px 0 0 ${-s / 2}px;border-radius:50%;border:${Math.max(1, 2 * unit).toFixed(1)}px solid var(--x-line);background:color-mix(in srgb, var(--x-panel-2) 55%, transparent)`);
        }
      } else if (name === "fg") {
        const L = layer(name, 6);
        // accents bleeding off the frame's edges, the way something close to the lens does (never over the content)
        const spots = [[0.03, 0.2], [0.97, 0.3], [0.02, 0.76], [0.98, 0.86], [0.5, 0.98]];
        spots.forEach(([x, y], i) => {
          const s = (34 + ML.rnd(i, seed) * 50) * unit;
          const ring = i % 2 === 0;
          shape(L, `left:${(15 + x * 100 / 1.3).toFixed(2)}%;top:${(15 + y * 100 / 1.3).toFixed(2)}%;width:${s}px;height:${s}px;margin:${-s / 2}px 0 0 ${-s / 2}px;border-radius:50%;${ring ? `border:${Math.max(2, 5 * unit).toFixed(1)}px solid var(--x-accent)` : "background:var(--x-accent-2)"};opacity:0.85`);
        });
      } else {
        const L = layer(name, 7);
        // specks: small dots and short rules drifting fastest, the closest thing to the lens
        for (let i = 0; i < 14; i++) {
          const s = (5 + ML.rnd(i, seed) * 9) * unit, x = ML.rnd(i, seed + 1) * 100, y = ML.rnd(i, seed + 2) * 100;
          if (y > 18 && y < 42) continue; // keep clear of the headline band
          shape(L, i % 3 ? `left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;width:${s}px;height:${s}px;border-radius:50%;background:var(--x-ink);opacity:0.18` : `left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;width:${(s * 6).toFixed(1)}px;height:${Math.max(1.5, 2 * unit).toFixed(1)}px;background:var(--x-accent);opacity:0.5`);
        }
      }
    }
    // the scene's own parts ride as the mid layer and the (nearly stable) text layer
    const mids = [...host.children].filter((c) => !c.dataset.mlLayer && c.classList.contains("ml-pic"));
    const texts = [...host.children].filter((c) => !c.dataset.mlLayer && c.classList.contains("ml-head"));
    const others = [...host.children].filter((c) => !c.dataset.mlLayer && !mids.includes(c) && !texts.includes(c) && c.tagName !== "CANVAS");
    const bgs = made.filter((m) => m.name === "far" || m.name === "bg").map((m) => m.L);
    const fadeIn = 0.4;
    return {
      draw(t) {
        const vis = ML.lin(t, at - 0.15, at + fadeIn);
        for (const { L, name } of made) {
          apply(L, Z[name], t);
          L.style.opacity = vis.toFixed(4);
        }
        mids.forEach((m) => apply(m, Z.mid, t, false));
        others.forEach((m) => apply(m, Z.mid, t, false));
        texts.forEach((m) => apply(m, Z.text, t, false));
        if (p.focus_shift) {
          const k = ML.ease(t, at + (end - at) * 0.45, at + (end - at) * 0.45 + 0.8);
          bgs.forEach((L) => { L.style.filter = k > 0.002 ? `blur(${(4 * k).toFixed(2)}px) brightness(${(1 - 0.3 * k).toFixed(3)})` : "none"; });
        }
      },
    };
  },
});

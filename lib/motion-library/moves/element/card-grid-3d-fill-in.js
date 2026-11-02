// Tilted 3D grid of tiles that fill in one by one: a wall of empty tiles — dark, a 1 px lighter edge, a thin accent top
// highlight — on a plane tilted rotateX(tilt) rotateZ(−8°) under perspective 1600 px, slowly pushed in (scale 0.9 → 1,
// never above 1 in 3D). The blanks arrive from depth (z −400 → 0, opacity 0 → 1, 0.03 s apart, 0.7 s expo.out); then,
// row by row from the reading start, each tile fills: "scan" (an accent line sweeps top → bottom in 0.25 s while the
// card art is revealed beneath it), "flip" (rotateY 0 → 180° in 0.35 s power2.inOut onto its finished face) or "fade".
// A counter above the grid ticks with every fill; the finished cards come in varied look colours (one input → many
// outputs). The full grid holds and drifts.
// Source: prompt-motion "quickdesignio-opus-5-5-this-entire" (reference only — rebuilt as our own code).
ML.define({
  id: "element.card-grid-3d-fill-in",
  category: "element",
  name: "Tilted 3D grid of tiles that fill in one by one",
  does: "A perspective-tilted wall of empty tiles drops in, then each tile flips or scans into a finished card in sequence until the grid is full.",
  says: ["scale", "result", "proof", "choice"],
  energy: 4,
  targets: ["card", "image", "list"],
  duration: [2, 5],
  params: {
    fill: { type: "choice", options: ["scan", "flip", "fade"], default: "scan" },
    grid: { type: "choice", options: ["4x3", "6x2", "5x2", "3x3"], default: "6x2" },
    tilt: { type: "number", range: [10, 35], default: 25, unit: "deg" },
    stagger: { type: "number", range: [0.08, 0.2], default: 0.13, unit: "s" },
  },
  pairs: ["data.count-up", "camera.slow-push", "text-in.punchline"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "card",
  source: { from: "prompt-motion:quickdesignio-opus-5-5-this-entire", license: "reference", note: "rebuilt as our own code: a preserve-3d tile plane, per-tile fills keyed from t" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const pic = own && own.tagName === "IMG" ? own : own?.querySelector?.("img") || null;
    const dir = rtl ? -1 : 1;

    // grid shape; a wide grid on a tall frame turns to stand upright (6x2 → 2x6 reads badly at 1080 wide: 3x4)
    let [cols, rows] = String(p.grid).split("x").map(Number);
    if (f.tall && cols > 4) [cols, rows] = cols === 6 ? [3, 4] : [cols === 5 ? 2 : rows, cols === 5 ? 5 : cols];
    const N = cols * rows;
    const R = f.pic;
    const counterH = 70 * k;
    const back = mk("div", `position:absolute;left:${f.pic.x}px;top:${f.pic.y}px;width:${f.pic.w}px;height:${f.pic.h}px;border-radius:var(--x-radius);background:var(--x-ground);pointer-events:none;z-index:5;opacity:0;`, host); // clears the region the built piece takes
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;`, host);
    const counter = mk("div", `position:absolute;left:0;right:0;top:0;height:${counterH}px;display:flex;align-items:center;justify-content:center;gap:${14 * k}px;font:var(--x-label-weight) ${30 * k}px var(--x-mono-font);color:var(--x-dim);`, layer);
    const num = mk("span", `color:var(--x-ink);direction:ltr;unicode-bidi:isolate;min-width:${3.2 * 30 * k * 0.62}px;text-align:center;`, counter, `0 / ${N}`);
    mk("span", `font:var(--x-label-weight) ${24 * k}px var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:${rtl ? "none" : "var(--x-label-case)"};`, counter, rtl ? "نسخة جاهزة" : "variants ready");

    // the tilted plane
    const view = mk("div", `position:absolute;left:0;right:0;top:${counterH}px;bottom:0;perspective:1600px;perspective-origin:50% 40%;`, layer);
    const availW = R.w * 0.82, availH = (R.h - counterH) * 0.84 / Math.max(0.6, Math.cos((p.tilt * Math.PI) / 180));
    const gap = 0.08, asp = 1.25;
    const tw = Math.min(availW / (cols + (cols - 1) * gap), availH / ((rows + (rows - 1) * gap) * asp), 300 * k);
    const th = tw * asp, gw = cols * tw + (cols - 1) * gap * tw, gh = rows * th + (rows - 1) * gap * tw;
    const plane = mk("div", `position:absolute;left:50%;top:50%;width:${gw}px;height:${gh}px;margin:${-gh / 2}px 0 0 ${-gw / 2}px;transform-style:preserve-3d;transform-origin:50% 50%;`, view);

    const PAL = ["var(--x-accent)", "var(--x-accent-2)", "var(--x-good)", "var(--x-bad)", "var(--x-ink)", "var(--x-glow-2)"];
    const blankBg = "color-mix(in srgb, var(--x-ink) 90%, var(--x-panel))", blankEdge = "color-mix(in srgb, var(--x-ink) 62%, var(--x-panel))";
    const rad = `calc(min(var(--x-radius), ${(tw * 0.1).toFixed(1)}px))`;
    const tiles = Array.from({ length: N }, (_, i) => {
      const r = Math.floor(i / cols), c0 = i % cols, c = rtl ? cols - 1 - c0 : c0;
      const x = c * tw * (1 + gap), y = r * (th + gap * tw);
      const wrap = mk("div", `position:absolute;left:${x}px;top:${y}px;width:${tw}px;height:${th}px;transform-style:preserve-3d;opacity:0;`, plane);
      const inner = mk("div", `position:absolute;inset:0;transform-style:preserve-3d;`, wrap);
      const face = (css) => mk("div", `position:absolute;inset:0;border-radius:${rad};overflow:hidden;backface-visibility:hidden;${css}`, inner);
      const blank = face(`background:${blankBg};box-shadow:inset 0 0 0 1px ${blankEdge};`);
      mk("div", `position:absolute;left:12%;right:12%;top:0;height:${Math.max(1.5, 2 * k)}px;background:var(--x-accent);opacity:.8;`, blank);
      const a = PAL[(i * 7 + 3) % PAL.length], b = PAL[(i * 3 + 1) % PAL.length];
      const art = face(`background:linear-gradient(${120 + ((i * 47) % 120)}deg, color-mix(in srgb, ${a} ${55 + ((i * 13) % 35)}%, var(--x-panel)), color-mix(in srgb, ${b} ${30 + ((i * 17) % 40)}%, var(--x-panel)));box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--x-panel) 40%, transparent);${p.fill === "flip" ? "transform:rotateY(180deg);" : ""}`);
      if (pic) { const im = pic.cloneNode(true); im.removeAttribute("data-slot"); im.style.cssText = `position:absolute;inset:0 0 34% 0;width:100%;height:66%;object-fit:cover;object-position:${(i * 29) % 100}% 50%;filter:var(--x-pic-filter);`; art.append(im); }
      else mk("div", `position:absolute;left:22%;top:16%;width:56%;aspect-ratio:1;border-radius:${["50%", "26%", "50% 50% 12% 12%", "12%"][i % 4]};background:color-mix(in srgb, var(--x-panel) 62%, transparent);`, art);
      mk("div", `position:absolute;left:12%;right:30%;bottom:20%;height:${tw * 0.055}px;border-radius:99px;background:color-mix(in srgb, var(--x-panel) 85%, transparent);`, art);
      mk("div", `position:absolute;left:12%;right:52%;bottom:11%;height:${tw * 0.04}px;border-radius:99px;background:color-mix(in srgb, var(--x-panel) 55%, transparent);`, art);
      const scan = p.fill === "scan" ? mk("div", `position:absolute;left:0;right:0;top:0;height:${Math.max(2, 3 * k)}px;background:var(--x-accent);box-shadow:0 0 ${10 * k}px ${2 * k}px color-mix(in srgb, var(--x-accent) 60%, transparent);opacity:0;`, inner) : null;
      return { wrap, inner, art, scan };
    });

    // timing: drop-in, then the fills in reading order
    const dropEnd = at + (N - 1) * 0.03 + 0.7;
    const fillStart = at + Math.min(0.75, (N - 1) * 0.03 + 0.45);
    const FD = p.fill === "flip" ? 0.35 : 0.25;
    const stag = Math.max(0.04, Math.min(p.stagger, (end - 0.7 - FD - fillStart) / Math.max(1, N - 1)));
    const fillT = tiles.map((_, i) => fillStart + i * stag);
    const allIn = fillT[N - 1] + FD;
    ctx.sfx(at, "card", 0.4);
    fillT.forEach((t, i) => i % 2 === 0 && ctx.sfx(t, "tap", 0.18));
    ctx.sfx(allIn, "success", 0.3);
    const goA = Math.max(allIn + 0.4, end - 0.25);

    return {
      draw(t) {
        layer.style.visibility = t < at - 1e-6 ? "hidden" : "visible";
        const leave = ML.clamp((t - goA) / 0.22);
        back.style.opacity = (ML.out(t, at - 0.15, at + 0.15) * (1 - leave)).toFixed(4);
        layer.style.opacity = (1 - leave).toFixed(4);
        const push = 0.9 + 0.1 * ML.ease(t, at, Math.max(at + 2, allIn + 0.4));
        const drift = ML.ease(t, allIn, allIn + 2.5);
        plane.style.transform = `rotateX(${p.tilt.toFixed(2)}deg) rotateZ(${(dir * (-8 + 1.2 * drift)).toFixed(3)}deg) translateY(${(-10 * k * drift).toFixed(2)}px) scale(${Math.min(1, push).toFixed(4)})`;
        let filled = 0;
        tiles.forEach((T, i) => {
          const a = at + i * 0.03, e = ML.expo(t, a, a + 0.7);
          T.wrap.style.opacity = ML.lin(t, a, a + 0.25).toFixed(4);
          T.wrap.style.transform = `translateZ(${(-400 * (1 - e)).toFixed(2)}px)`;
          const u = ML.lin(t, fillT[i], fillT[i] + FD);
          if (u >= 1) filled++;
          if (p.fill === "flip") {
            T.inner.style.transform = `rotateY(${(180 * ML.ease(t, fillT[i], fillT[i] + FD) * dir).toFixed(3)}deg)`;
          } else if (p.fill === "scan") {
            T.art.style.clipPath = `inset(0 0 ${((1 - u) * 100).toFixed(2)}% 0)`;
            T.scan.style.opacity = u > 0 && u < 1 ? "1" : "0";
            T.scan.style.top = `${(u * 100).toFixed(2)}%`;
          } else {
            T.art.style.opacity = ML.ease(t, fillT[i], fillT[i] + FD).toFixed(4);
          }
        });
        num.textContent = `${filled} / ${N}`;
        counter.style.opacity = ML.out(t, at + 0.2, at + 0.5).toFixed(4);
      },
    };
  },
});

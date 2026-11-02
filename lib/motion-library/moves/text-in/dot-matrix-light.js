// Dot-matrix light: the target's words are rasterised (whole words, so Arabic stays joined) to a grid of small dots on
// a canvas over the target. Each dot's opacity = base + (1 - base) · falloff(distance to a moving light): a flare
// travels across in the reading direction and the word reads under it, dimming again behind; a sweep leaves the dots
// lit behind its front; "all" brings the whole grid up together. When the light has passed, the grid settles fully
// lit so the word holds readable. Painted per frame from t only.
// Source: prompt-motion:lukasersil-ten-claudeai-me-neprestava (reference only — our own rebuild).
ML.define({
  id: "text-in.dot-matrix-light",
  category: "text-in",
  name: "Dot-matrix light",
  does: "A huge word made of small dots on a grid becomes readable where a moving light passes over it, dimming again behind.",
  says: ["tech", "precision", "reveal"],
  energy: 2,
  targets: ["headline", "word"],
  duration: [1, 3],
  params: {
    cell: { type: "number", range: [8, 16], default: 8, unit: "px" },
    dot: { type: "number", range: [2, 5], default: 5, unit: "px" },
    base: { type: "number", range: [0.05, 0.3], default: 0.15 },
    radius: { type: "number", range: [15, 50], default: 30, unit: "%" },
    lit: { type: "choice", options: ["moving-light", "sweep", "all"], default: "moving-light" },
    duration: { type: "number", range: [0.8, 3], default: 1.6, unit: "s" },
  },
  pairs: ["background.dither", "text-in.scramble"],
  avoid: ["playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "riser",
  source: { from: "prompt-motion:lukasersil-ten-claudeai-me-neprestava", license: "reference", note: "our own canvas rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    // the technique needs a huge word: up to the look's hero size on one line, unless that would make the line smaller
    const fs0 = parseFloat(getComputedStyle(el).fontSize);
    const roomW = el.parentElement ? el.parentElement.clientWidth : ctx.f.W, roomH = el.parentElement ? el.parentElement.clientHeight : ctx.f.H;
    el.style.fontSize = "var(--x-hero-size)";
    el.style.fontSize = Math.max(fs0, Math.min(parseFloat(getComputedStyle(el).fontSize), roomH * 0.72)).toFixed(1) + "px";
    el.style.whiteSpace = "nowrap";
    if (ML.fit(el, roomW * 0.98) < fs0) { el.style.fontSize = fs0 + "px"; el.style.whiteSpace = ""; }
    const words = ML.split(el, "words");
    el.style.position = "relative";
    const eb = ctx.box(el), pad = Math.round(p.cell * 2);
    const W = Math.ceil(eb.w + pad * 2), H = Math.ceil(eb.h + pad * 2);
    // rasterise every word at its laid-out place (canvas shapes Arabic itself; the word is never split)
    const off = document.createElement("canvas"); off.width = W; off.height = H;
    const o = off.getContext("2d");
    o.fillStyle = "#000";
    for (const w of words) {
      const cs = getComputedStyle(w), b = ctx.box(w);
      o.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      if ("letterSpacing" in o) o.letterSpacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
      o.textBaseline = "alphabetic"; o.textAlign = "left"; o.direction = rtl ? "rtl" : "ltr";
      const m = o.measureText(w.textContent), asc = m.fontBoundingBoxAscent || parseFloat(cs.fontSize) * 0.8, desc = m.fontBoundingBoxDescent || parseFloat(cs.fontSize) * 0.2;
      const x = b.x - eb.x + pad, y = b.y - eb.y + pad + (b.h - (asc + desc)) / 2 + asc;
      o.fillText(w.textContent, x, y);
    }
    const data = o.getImageData(0, 0, W, H).data, dots = [];
    // a dot where the glyphs cover enough of its cell (coverage, not the centre pixel, so thin strokes keep their dots)
    const c = p.cell;
    for (let y0 = 0; y0 + c <= H; y0 += c) for (let x0 = 0; x0 + c <= W; x0 += c) {
      let on = 0, all = 0;
      for (let y = Math.floor(y0); y < y0 + c; y += 2) for (let x = Math.floor(x0); x < x0 + c; x += 2) { all++; if (data[(y * W + x) * 4 + 3] > 110) on++; }
      if (on / all >= 0.22) dots.push([x0 + c / 2, y0 + c / 2]);
    }
    // the visible canvas sits exactly over the target; the target's own glyphs go transparent (layout kept)
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    Object.assign(cv.style, { position: "absolute", left: -pad + "px", top: -pad + "px", width: W + "px", height: H + "px", pointerEvents: "none" });
    el.append(cv);
    el.style.webkitTextFillColor = "transparent";
    const g = cv.getContext("2d");
    const probe = document.createElement("span"); probe.style.color = "var(--x-accent)"; el.append(probe);
    const ink = getComputedStyle(el).color, accent = getComputedStyle(probe).color; probe.remove();
    // the light crosses the written word itself (the slot can be far wider), so the word reads under it the whole way
    const xsAll = dots.map((d) => d[0]), tx0 = dots.length ? Math.min(...xsAll) : 0, tx1 = dots.length ? Math.max(...xsAll) : W;
    const R = (p.radius / 100) * Math.max(tx1 - tx0, H), run = Math.min(p.duration, Math.max(0.4, end - at - 0.7)), settle = 0.35, dotD = Math.min(p.dot, p.cell * 0.9);
    const dirX = rtl ? -1 : 1;
    ctx.sfx(at, "riser", 0.25);
    ctx.sfx(at + run, "tap", 0.3);
    return {
      draw(t) {
        g.clearRect(0, 0, W, H);
        const appear = ML.lin(t, at, at + 0.15), leave = ML.clamp((t - (end - 0.3)) / 0.25);
        cv.style.opacity = (appear * (1 - leave)).toFixed(4);
        if (appear <= 0) return;
        const u = ML.lin(t, at, at + run), done = ML.ease(t, at + run, at + run + settle);
        // the light point travels across (start side → end side) and a little arc in y
        const xs = tx0 - R * 0.5, xe = tx1 + R * 0.5, lx = rtl ? xe + (xs - xe) * ML.ease(t, at, at + run) : xs + (xe - xs) * ML.ease(t, at, at + run);
        const ly = H * (0.55 - 0.15 * Math.sin(u * Math.PI));
        g.fillStyle = ink;
        for (const [x, y] of dots) {
          let lv;
          if (p.lit === "all") lv = ML.ease(t, at, at + run);
          else if (p.lit === "sweep") lv = ML.clamp((dirX > 0 ? lx - x : x - lx) / (R * 0.5) + 0.5); // lit behind the front
          else { const d = Math.hypot(x - lx, (y - ly) * 0.6) / R; lv = d >= 1 ? 0 : Math.pow(1 - d * d, 2); }
          const a = p.base + (1 - p.base) * Math.max(lv, done);
          g.globalAlpha = a;
          g.beginPath(); g.arc(x, y, dotD / 2, 0, Math.PI * 2); g.fill();
        }
        // the flare itself, faint, while it travels
        if (p.lit !== "all" && u > 0 && u < 1) {
          const k = Math.sin(u * Math.PI) * (1 - done);
          const fr = Math.min(R * 0.7, H * 0.4), rg = g.createRadialGradient(lx, ly, 0, lx, ly, fr);
          rg.addColorStop(0, accent); rg.addColorStop(1, "transparent");
          g.globalAlpha = 0.18 * k; g.fillStyle = rg; g.fillRect(0, 0, W, H);
        }
        g.globalAlpha = 1;
      },
    };
  },
});

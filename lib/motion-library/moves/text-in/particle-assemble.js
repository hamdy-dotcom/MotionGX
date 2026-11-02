// Particle assemble: the target is rasterised (whole words, so Arabic stays joined; a logo / picture as drawn) into a
// grid of target points on a canvas over the scene. Each particle (small square or dot) starts at a seeded spot around
// the target (scattered, or on a swirl that spirals in) and eases home on power3.out, staggered by its target's place
// in the reading direction or by its distance from the centre; at speed it is drawn as a short streak. On arrival the
// particles recolour (accent → ink) or bloom (a glow on the real text that decays, with a residual shimmer), the real
// text takes over so it holds sharp, and a few leftover particles drift on and fade. Painted per frame from t only.
// Sources: prompt-motion ibrahimwasim240 "opus 5.5 max effort", nolkeeg "with everyone sharing opus" (reference
// only — our own canvas rebuild).
ML.define({
  id: "text-in.particle-assemble",
  category: "text-in",
  name: "Particle assemble",
  does: "A swarm of particles flies in and condenses into the text, which then glows or changes colour.",
  says: ["tech", "reveal", "result", "playful", "arrival", "scale"],
  energy: 4,
  targets: ["headline", "logo", "word"],
  duration: [1, 2.5],
  params: {
    shape: { type: "choice", options: ["square", "dot"], default: "square" },
    start: { type: "choice", options: ["scatter", "swirl"], default: "scatter" },
    order: { type: "choice", options: ["ltr", "distance"], default: "ltr" },
    duration: { type: "number", range: [0.5, 1.2], default: 0.8, unit: "s" },
    spread: { type: "number", range: [0, 0.6], default: 0.3, unit: "s" },
    finish: { type: "choice", options: ["recolour", "glow", "none"], default: "glow" },
    count: { type: "number", range: [300, 4000], default: 1500 },
    seed: { type: "number", range: [1, 99], default: 5 },
  },
  pairs: ["text-in.dot-matrix-light", "text-in.scramble"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "riser",
  source: { from: "prompt-motion:ibrahimwasim240-opus-5-5-max-effort", license: "reference", note: "also nolkeeg-with-everyone-sharing-opus; our own canvas rebuild" },
  async setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const host = ctx.scene || ctx.stage, W = ctx.f.W, H = ctx.f.H, S = p.seed;
    // 1. rasterise the target where it sits (stage px)
    const off = document.createElement("canvas"); off.width = W; off.height = H;
    const o = off.getContext("2d", { willReadFrequently: true });
    o.fillStyle = "#000";
    const isText = !(el instanceof SVGElement) && el.tagName !== "IMG";
    let units;
    if (isText) {
      units = ML.split(el, "words");
      for (const w of units) {
        const cs = getComputedStyle(w), b = ctx.box(w);
        o.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        if ("letterSpacing" in o) o.letterSpacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
        o.textBaseline = "alphabetic"; o.textAlign = "left";
        const m = o.measureText(w.textContent), fs = parseFloat(cs.fontSize);
        const asc = m.fontBoundingBoxAscent || fs * 0.8, desc = m.fontBoundingBoxDescent || fs * 0.2;
        o.fillText(w.textContent, b.x, b.y + (b.h - (asc + desc)) / 2 + asc);
      }
    } else {
      units = [el];
      const b = ctx.box(el);
      let img = el;
      if (el.tagName !== "IMG") {
        const svg = el.cloneNode(true);
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg"); svg.setAttribute("width", b.w); svg.setAttribute("height", b.h);
        img = new Image();
        img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(svg));
        try { await img.decode(); } catch (e) { /* drawn as far as it loaded */ }
      }
      try { o.drawImage(img, b.x, b.y, b.w, b.h); } catch (e) { o.fillRect(b.x, b.y, b.w, b.h); }
    }
    let data;
    try { data = o.getImageData(0, 0, W, H).data; } catch (e) { return null; }
    // 2. target points: a grid whose step gives about `count` points over the inked area
    let filled = 0, x0 = W, x1 = 0, y0 = H, y1 = 0;
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (data[(y * W + x) * 4 + 3] > 128) { filled++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (!filled) return null;
    const step = Math.max(2, Math.sqrt((filled * 4) / p.count));
    const pts = [];
    for (let y = y0; y <= y1; y += step) for (let x = x0; x <= x1; x += step) { const xi = Math.round(x), yi = Math.round(y); if (data[(yi * W + xi) * 4 + 3] > 128) pts.push([xi, yi]); }
    const size = Math.max(2, step * 0.82);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, maxD = Math.hypot(x1 - x0, y1 - y0) / 2 || 1, R0 = Math.max(W, H) * 0.5;
    const turn = p.start === "swirl" ? 2.2 : 0;
    // leftovers: a few extra particles with no home — they settle near the text and fade
    const extra = Math.round(pts.length * 0.06);
    const parts = [];
    const n = pts.length + extra;
    for (let i = 0; i < n; i++) {
      const left = i >= pts.length;
      const base = pts[left ? Math.floor(ML.rnd(i, S + 7) * pts.length) : i];
      const tx = left ? base[0] + (ML.rnd(i, S + 8) - 0.5) * maxD * 0.5 : base[0];
      const ty = left ? base[1] + (ML.rnd(i, S + 9) - 0.5) * maxD * 0.25 : base[1];
      const th = ML.rnd(i, S) * Math.PI * 2, r = R0 * (0.35 + 0.65 * ML.rnd(i, S + 1));
      const sx = cx + Math.cos(th) * r, sy = cy + Math.sin(th) * r * 0.8;
      const nx = x1 > x0 ? (tx - x0) / (x1 - x0) : 0;
      const k = p.order === "distance" ? Math.min(1, Math.hypot(tx - cx, ty - cy) / maxD) : rtl ? 1 - nx : nx;
      const a = at + ML.clamp(k) * p.spread + ML.rnd(i, S + 3) * 0.06;
      parts.push({ tx, ty, dx: sx - tx, dy: sy - ty, a, left });
    }
    const flight = p.duration, done = at + p.spread + 0.06 + flight;
    const pos = (q, t) => {
      const e = 1 - Math.pow(1 - ML.lin(t, q.a, q.a + flight), 3), k = 1 - e, ang = turn * k;
      const c = Math.cos(ang), s = Math.sin(ang);
      return [q.tx + (q.dx * c - q.dy * s) * k, q.ty + (q.dx * s + q.dy * c) * k];
    };
    // 3. the visible canvas covers the scene; colours from the look
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    Object.assign(cv.style, { position: "absolute", left: "0", top: "0", width: W + "px", height: H + "px", pointerEvents: "none", zIndex: "3" });
    host.append(cv);
    const g = cv.getContext("2d");
    const probe = document.createElement("span"); host.append(probe);
    probe.style.color = "var(--x-accent)"; const accent = getComputedStyle(probe).color;
    probe.style.color = "var(--x-ink)"; const ink = getComputedStyle(probe).color;
    probe.remove();
    const glowCol = "color-mix(in srgb, var(--x-accent) 50%, transparent)";
    const startCol = p.finish === "none" ? ink : accent;
    const dot = (x, y, s2) => { if (p.shape === "dot") { g.beginPath(); g.arc(x, y, s2 / 2, 0, Math.PI * 2); g.fill(); } else g.fillRect(x - s2 / 2, y - s2 / 2, s2, s2); };
    ctx.sfx(at, "riser", 0.3);
    ctx.sfx(done, "land.light", 0.4);
    return {
      draw(t) {
        g.clearRect(0, 0, W, H);
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        const take = ML.ease(t, done, done + 0.3); // the real text takes over from the particles
        for (const u of units) u.style.opacity = (take * (1 - leave)).toFixed(4);
        if (!isText) el.style.opacity = (take * (1 - leave)).toFixed(4);
        // bloom on arrival, decaying
        const bloom = p.finish === "glow" ? ML.pulse(t, done + 0.05, 0.08, 0.5) * (1 - leave) : 0;
        el.style.filter = bloom > 0.01 && (isText || el.tagName !== "IMG") ? `drop-shadow(0 0 ${(20 * bloom).toFixed(2)}px ${glowCol})` : "none";
        if (t < at) return;
        g.lineCap = "round";
        const pa = 1 - take;
        if (pa > 0.001) for (let i = 0; i < parts.length; i++) {
          const q = parts[i];
          if (t < q.a) continue;
          const [x, y] = pos(q, t), [px, py] = pos(q, t - 1 / 30);
          let a = ML.lin(t, q.a, q.a + 0.12) * pa;
          if (q.left) a *= 1 - ML.lin(t, q.a + flight * 0.8, q.a + flight + 0.35);
          if (a <= 0.003) continue;
          const arrived = t >= q.a + flight;
          let col = startCol;
          if (p.finish === "recolour") col = ML.lin(t, q.a + flight, q.a + flight + 0.2) > 0.5 ? ink : accent;
          g.globalAlpha = a;
          const sp = Math.hypot(x - px, y - py);
          if (!arrived && sp > size * 2) { g.strokeStyle = col; g.lineWidth = size * 0.7; g.beginPath(); g.moveTo(px, py); g.lineTo(x, y); g.stroke(); }
          else { g.fillStyle = col; dot(x, y, size); }
        }
        // residual shimmer: a few points twinkle on the text for a moment after it lands
        if (p.finish === "glow" && t > done) {
          const sh = (1 - ML.lin(t, done + 0.2, done + 1.1)) * (1 - leave), fr = Math.floor(t * 24);
          if (sh > 0.01) {
            g.fillStyle = accent;
            for (let i = 0; i < pts.length; i += 9) {
              const f = ML.rnd(i, fr);
              if (f < 0.7) continue;
              g.globalAlpha = sh * (f - 0.7) / 0.3;
              dot(pts[i][0], pts[i][1], size * 0.9);
            }
          }
        }
        g.globalAlpha = 1;
      },
    };
  },
});

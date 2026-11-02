// Painted FX gradient-mapped to brand: an effect element — a shockwave ring, a crescent slash, a vortex, a radial streak
// burst or a crater splash — looks painted and rich, in the brand's own colours. The technique from MengTo/Skills
// game-dev-combat-skill-polish: a greyscale painted texture on black, its luminance mapped through a 4-stop gradient
// (dark accent → accent → light accent → near-white) before compositing, which reads far richer than a procedural ring.
// The textures are our own: painted once in setup on an offscreen canvas from seeded strokes (ML.rnd — hundreds of
// soft, broken, varying-width brush strokes along the shape, then a seeded value-noise grain), so they are the same
// every run. The mapped sprite keeps luminance as alpha, so it sits on light and dark grounds alike. Per frame only a
// closed-form transform is applied (scale on expo out, a turn for the vortex / crescent, a fade over the last 40%),
// drawn on a canvas over the target: deterministic. "warm" / "cool" swap the ramp's base to the look's bad / good hue.
// Source: MengTo/Skills game-combat/game-dev-combat-skill-polish (MIT; technique only — the sprites are our own).
ML.define({
  id: "accent.gradient-mapped-sprite",
  category: "accent",
  name: "Painted FX gradient-mapped to brand",
  does: "Effect elements (craters, crescents, shockwave rings, vortices, streaks) look painted and rich, in the brand's own colours.",
  says: ["brand", "energy", "celebration"],
  energy: 3,
  targets: ["stage", "logo", "shape", "number"],
  duration: [0.4, 2],
  params: {
    gradient: { type: "choice", options: ["brand-accent", "warm", "cool"], default: "brand-accent" },
    shape: { type: "choice", options: ["ring", "crescent", "vortex", "streak", "crater"], default: "ring" },
    size: { type: "number", range: [0.3, 1], default: 0.62 },
    life: { type: "number", range: [0.4, 2], default: 1.2, unit: "s" },
  },
  pairs: ["accent.impact-burst", "data.counter-pop", "element.logo-reveal"],
  avoid: ["calm", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "MengTo/Skills:game-combat/game-dev-combat-skill-polish", license: "MIT", note: "gradient-map technique; painted sprites are our own, generated from seeded strokes" },
  setup(ctx) {
    const { p, at, end, stage, f, rtl } = ctx;
    const doc = document;
    const host = ctx.scene || stage;
    const onTarget = ctx.el && ctx.el !== stage;
    const b = onTarget ? ctx.box(ctx.el) : null;
    const minSide = Math.min(f.W, f.H);
    const cx = b ? b.x + b.w / 2 : f.pic.x + f.pic.w / 2, cy = b ? b.y + b.h / 2 : f.pic.y + f.pic.h / 2;
    const D = b ? ML.clamp(Math.max(b.w, b.h) * 2.2, minSide * 0.3, minSide * ML.clamp(p.size, 0.3, 1)) : minSide * ML.clamp(p.size, 0.3, 1);
    const shape = p.shape;
    const life = ML.clamp(Math.min(+p.life || 1.2, Math.max(0.4, end - at)), 0.4, 2);

    // ── look colours → the gradient map (4 stops) ──
    const probe = doc.createElement("span"); probe.style.display = "none"; host.append(probe);
    const rgb = (v) => { probe.style.color = v; const m = (getComputedStyle(probe).color.match(/[\d.]+/g) || [0, 0, 0]).map(Number); return m.slice(0, 3); };
    const A = rgb("var(--x-accent)"), A2 = rgb("var(--x-accent-2)"), W = rgb("var(--x-accent-ink)");
    const base = p.gradient === "warm" ? rgb("var(--x-bad)") : p.gradient === "cool" ? rgb("var(--x-good)") : A;
    probe.remove();
    const mixc = (a, c, u) => a.map((x, i) => x + (c[i] - x) * u);
    const lum = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
    const white = lum(W) > 0.6 ? W : [255, 255, 255].map((x, i) => x * 0.9 + A2[i] * 0.1); // near-white, tinted
    const stops = [
      [0, mixc(base, [0, 0, 0], 0.55)], // dark accent
      [0.35, base], // accent
      [0.7, p.gradient === "brand-accent" ? A2 : mixc(base, A2, 0.5)], // light accent
      [1, mixc(white, A2, 0.12)], // near-white
    ];
    const LUT = new Uint8ClampedArray(256 * 3);
    for (let i = 0; i < 256; i++) {
      const u = i / 255; let j = 0; while (j < stops.length - 2 && u > stops[j + 1][0]) j++;
      const [u0, c0] = stops[j], [u1, c1] = stops[j + 1], c = mixc(c0, c1, ML.clamp((u - u0) / (u1 - u0)));
      LUT[i * 3] = c[0]; LUT[i * 3 + 1] = c[1]; LUT[i * 3 + 2] = c[2];
    }

    // ── the painted greyscale texture (our own, seeded) ──
    const S = Math.min(1200, Math.ceil(D / 2) * 2), tex = doc.createElement("canvas"); tex.width = tex.height = S;
    const g = tex.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, S, S);
    g.globalCompositeOperation = "lighter"; g.lineCap = "round";
    const R = (i, k) => ML.rnd(i, k);
    const c0 = S / 2, TAU = Math.PI * 2;
    const stroke = (pts, wdt, a) => { g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = wdt; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
    const arc = (r, a0, a1, wob, seed) => { const n = 28, pts = []; for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n, rr = r + wob * (R(seed, i) - 0.5); pts.push([c0 + Math.cos(a) * rr, c0 + Math.sin(a) * rr]); } return pts; };
    if (shape === "ring") {
      for (let i = 0; i < 260; i++) { const a0 = R(i, 1) * TAU, len = 0.3 + R(i, 2) * 1.1, r = S * (0.33 + 0.1 * Math.pow(R(i, 3), 1.6) * (R(i, 4) < 0.5 ? -1 : 1)); stroke(arc(r, a0, a0 + len, S * 0.012, i + 7), 1 + R(i, 5) * S * 0.022, 0.05 + 0.1 * R(i, 6)); }
      for (let i = 0; i < 40; i++) { const a0 = R(i, 8) * TAU; stroke(arc(S * 0.36, a0, a0 + 0.5, S * 0.004, i + 90), 2 + R(i, 9) * 4, 0.35); } // the hot core line
    } else if (shape === "crescent") {
      for (let i = 0; i < 240; i++) { const u = R(i, 1), a0 = -2.3 + u * 0.4, a1 = a0 + 2.6 + R(i, 2) * 1.2, thick = Math.sin(Math.PI * u); stroke(arc(S * (0.3 + 0.12 * u), a0, a1, S * 0.01, i + 3), 1 + thick * S * 0.03 * R(i, 3), 0.05 + 0.12 * thick); }
    } else if (shape === "vortex") {
      for (let i = 0; i < 140; i++) { const a0 = R(i, 1) * TAU, turns = 0.8 + R(i, 2) * 0.9, pts = []; for (let j = 0; j <= 40; j++) { const u = j / 40, rr = S * (0.04 + 0.42 * u), a = a0 + turns * TAU * (1 - u) * 0.5; pts.push([c0 + Math.cos(a) * rr, c0 + Math.sin(a) * rr]); } stroke(pts, 1 + R(i, 3) * S * 0.016, 0.05 + 0.08 * R(i, 4)); }
      const core = g.createRadialGradient(c0, c0, 0, c0, c0, S * 0.12); core.addColorStop(0, "rgba(255,255,255,.9)"); core.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = core; g.fillRect(0, 0, S, S);
    } else if (shape === "streak") {
      for (let i = 0; i < 160; i++) { const a = R(i, 1) * TAU, r0 = S * (0.05 + 0.12 * R(i, 2)), r1 = S * (0.25 + 0.24 * R(i, 3)), wdt = 1 + R(i, 4) * S * 0.014; for (let k = 0; k < 4; k++) { const u0 = k / 4, u1 = (k + 0.8) / 4, ra = r0 + (r1 - r0) * u0, rb = r0 + (r1 - r0) * u1; stroke([[c0 + Math.cos(a) * ra, c0 + Math.sin(a) * ra], [c0 + Math.cos(a) * rb, c0 + Math.sin(a) * rb]], wdt * (1 - u0 * 0.7), (0.18 + 0.2 * R(i, 5)) * (1 - u0 * 0.6)); } }
      const core = g.createRadialGradient(c0, c0, 0, c0, c0, S * 0.16); core.addColorStop(0, "rgba(255,255,255,.8)"); core.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = core; g.fillRect(0, 0, S, S);
    } else {
      // crater: a dark hollow ringed by a bright, broken rim and flung debris strokes
      for (let i = 0; i < 220; i++) { const a0 = R(i, 1) * TAU; stroke(arc(S * (0.2 + 0.05 * R(i, 2)), a0, a0 + 0.2 + R(i, 3) * 0.6, S * 0.02, i + 11), 2 + R(i, 4) * S * 0.03, 0.06 + 0.1 * R(i, 5)); }
      for (let i = 0; i < 70; i++) { const a = R(i, 6) * TAU, r0 = S * 0.24, r1 = S * (0.3 + 0.18 * R(i, 7)); stroke([[c0 + Math.cos(a) * r0, c0 + Math.sin(a) * r0], [c0 + Math.cos(a) * r1, c0 + Math.sin(a) * r1]], 1 + R(i, 8) * 5, 0.12); }
    }
    g.globalCompositeOperation = "source-over";
    // painterly grain: seeded value noise multiplies the strokes; then the luminance runs through the brand ramp,
    // luminance kept as alpha
    const img = g.getImageData(0, 0, S, S), d = img.data, N = 32;
    const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), h = (a, c) => R(a * 57 + c * 131, 3); const top = h(xi, yi) + (h(xi + 1, yi) - h(xi, yi)) * sx, bot = h(xi, yi + 1) + (h(xi + 1, yi + 1) - h(xi, yi + 1)) * sx; return top + (bot - top) * sy; };
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const o = (y * S + x) * 4, L = d[o] / 255;
      if (L <= 0.002) { d[o + 3] = 0; continue; }
      const grain = 0.72 + 0.28 * vn((x / S) * N, (y / S) * N) + 0.12 * (vn((x / S) * N * 4, (y / S) * N * 4) - 0.5);
      const v = ML.clamp(Math.pow(L * grain, 0.85)), i = Math.round(v * 255) * 3;
      d[o] = LUT[i]; d[o + 1] = LUT[i + 1]; d[o + 2] = LUT[i + 2]; d[o + 3] = Math.round(ML.clamp(v * 1.35) * 255);
    }
    g.putImageData(img, 0, 0);

    // ── the stage canvas (the effect's box, drawn per frame) ──
    const C = Math.ceil(D * 1.25), cv = doc.createElement("canvas");
    cv.width = cv.height = C;
    cv.style.cssText = `position:absolute;left:${(cx - C / 2).toFixed(1)}px;top:${(cy - C / 2).toFixed(1)}px;width:${C}px;height:${C}px;pointer-events:none;z-index:${onTarget ? 1 : 20};visibility:hidden;will-change:transform`;
    if (onTarget) host.prepend(cv); else host.append(cv);
    const c2 = cv.getContext("2d");
    ctx.sfx(at, shape === "streak" || shape === "vortex" ? "whoosh.soft" : "hit", 0.45);
    const spinDir = rtl ? -1 : 1;

    return {
      draw(t) {
        const u = (t - at) / life;
        if (u < 0 || u > 1) { cv.style.visibility = "hidden"; return; }
        cv.style.visibility = "visible";
        c2.clearRect(0, 0, C, C);
        let sc, rot = 0, alpha;
        const e = ML.expo(t, at, at + life * 0.7);
        alpha = Math.min(1, u * 10) * (1 - ML.ease(u, 0.6, 1));
        if (shape === "ring") sc = 0.35 + 0.65 * e;
        else if (shape === "crater") sc = 0.55 + 0.45 * ML.out(t, at, at + life * 0.5);
        else if (shape === "streak") sc = 0.25 + 0.75 * e;
        else if (shape === "vortex") { sc = 0.6 + 0.4 * ML.out(t, at, at + life * 0.6); rot = spinDir * (1.2 * e + 0.8 * u) * Math.PI; }
        else { sc = 0.7 + 0.3 * e; rot = spinDir * (-0.9 + 1.4 * ML.out(t, at, at + life * 0.6)); } // crescent sweeps
        // the texture is painted at the effect's full size, so drawing it scales down only, never past its pixels
        const px = Math.min(D * sc, S);
        c2.save();
        c2.globalAlpha = alpha;
        c2.translate(C / 2, C / 2); c2.rotate(rot);
        if (rtl && shape === "crescent") c2.scale(-1, 1);
        c2.drawImage(tex, -px / 2, -px / 2, px, px);
        c2.restore();
      },
    };
  },
});

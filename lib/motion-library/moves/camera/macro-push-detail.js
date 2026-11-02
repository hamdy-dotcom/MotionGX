// Macro push onto material detail: the camera eases from the full view into an extreme close-up of the target's
// surface — wood grain, a weave, paper fibre, brushed-metal scratches or a print's halftone — where micro-detail
// resolves. Distance follows the source's closed form d(t) = d1 + (d0 − d1)·e^(−k t) (k 3–5), so the push decelerates
// into the macro and never stops dead; the frame's scale is d0 / d (close ≈ 3x, macro ≈ 7x of the full view). A small
// lateral sway (0.3 unit at distance 6 → ~5% of the frame, eased in) and a raking light at ~54° (every dark relief
// stroke paired with a lit edge on the light's side) make the relief read. The material is painted on a canvas in screen
// space every frame from t, so it stays sharp at any zoom, and every layer is band-limited: a layer fades by its pixel
// footprint (alpha × smoothstep(3, 8, period on screen)) so fine detail appears only once it can be resolved, never as
// shimmer. A raster picture is never pushed past its own pixels (the zoom caps at natural ÷ shown size).
// Source: MengTo/Skills 3d/3d-paper-material (macro distance 0.46–0.50 at FOV 28, the camera sway, the raked key,
// band-limited detail, the macro window) (MIT).
ML.define({
  id: "camera.macro-push-detail",
  category: "camera",
  name: "Macro push-in onto material detail",
  does: "The camera eases from a full view into an extreme close-up of a surface (wood grain, weave, paper fibre, brushed metal) where micro-detail resolves.",
  says: ["precision", "luxury", "focus", "proof"],
  energy: 2,
  targets: ["scene", "image", "logo", "card"],
  duration: [2, 6],
  params: {
    target: { type: "choice", options: ["grain", "weave", "fibre", "scratches", "print"], default: "grain" },
    depth: { type: "choice", options: ["close", "macro"], default: "macro" },
    rate: { type: "number", range: [3, 5], default: 4, unit: "/s" },
    sway: { type: "bool", default: true },
  },
  pairs: ["camera.slow-push", "camera.pull-out"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:3d/3d-paper-material", license: "MIT", note: "closed-form macro ease, sway, raked key, band-limited detail; painted in 2D from t" },
  setup(ctx) {
    const { el, p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H;
    const hb = host.getBoundingClientRect(), kk = hb.width / (host.offsetWidth || 1) || 1;
    const rel = (n) => { const r = n.getBoundingClientRect(); return { x: (r.left - hb.left) / kk, y: (r.top - hb.top) / kk, w: r.width / kk, h: r.height / kk }; };
    const own = el && el !== stage && el !== host ? el : host.querySelector(".ml-pic .ml-panel, .ml-pic img, .ml-pic");
    const R = own ? rel(own) : { x: f.pic.x, y: f.pic.y, w: f.pic.w, h: f.pic.h };
    // rounded like what it textures
    const radius = own ? parseFloat(getComputedStyle(own).borderTopLeftRadius) || 0 : 0;

    // a raster picture: never past its pixels
    let zCap = 12;
    if (own && own.tagName === "IMG" && own.naturalWidth && !/^data:image\/svg|\.svg(\?|$)/i.test(own.currentSrc || own.src)) zCap = Math.max(1.05, own.naturalWidth / Math.max(1, R.w));

    // colours from the look
    const probe = document.createElement("div");
    host.append(probe);
    const rgb = (v) => { probe.style.color = `var(${v})`; const m = getComputedStyle(probe).color.match(/[\d.]+/g) || [0, 0, 0]; return [+m[0], +m[1], +m[2]]; };
    const INK = rgb("--x-ink"), LIT = rgb("--x-panel");
    probe.remove();
    const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;

    // the camera: one wrapper around the scene; the material canvas over it, in screen space
    const cam = document.createElement("div");
    cam.className = "ml-cam";
    cam.style.cssText = "position:absolute;inset:0;transform-origin:0 0";
    while (host.firstChild) cam.append(host.firstChild);
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    cv.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none;z-index:2`;
    host.append(cam, cv);
    const g = cv.getContext("2d");

    // the closed-form push: d(t) = d1 + (d0 − d1) e^(−k τ); scale = d0 / d
    const Z1 = Math.min(zCap, p.depth === "close" ? 3 : 7);
    const d0 = 6, d1 = d0 / Z1, kr = ML.clamp(p.rate, 3, 5);
    const zoomAt = (t) => { const tau = Math.max(0, t - at); return d0 / (d1 + (d0 - d1) * Math.exp(-kr * tau)); };
    // the focus: a detail point a little off the centre of the surface
    const F = { x: R.x + R.w * (ctx.rtl ? 0.42 : 0.58), y: R.y + R.h * 0.46 };
    const mir = ctx.rtl ? -1 : 1;
    const LA = (54 * Math.PI) / 180, lx = -Math.cos(LA), ly = -Math.sin(LA); // light from the upper left, raked 54°

    // seeded value noise
    const n1 = (x, s) => { const i = Math.floor(x), u = x - i, w = u * u * (3 - 2 * u); return ML.rnd(i, s) * (1 - w) + ML.rnd(i + 1, s) * w; };
    const n2 = (x, y, s) => {
      const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), c = v * v * (3 - 2 * v);
      const h = (q, r) => ML.rnd(q * 57 + r * 131, s);
      return (h(i, j) * (1 - a) + h(i + 1, j) * a) * (1 - c) + (h(i, j + 1) * (1 - a) + h(i + 1, j + 1) * a) * c;
    };
    const band = (lam, Z) => { const x = ML.clamp((lam * Z - 3) / 5); return x * x * (3 - 2 * x); };
    ctx.sfx(at, "whoosh.soft", 0.18);

    // painters: world → screen is X = ox + Z x; v = the visible world rect inside R
    const strokePair = (path, wpx, a) => {
      g.lineWidth = wpx;
      g.strokeStyle = rgba(INK, a); g.stroke(path);
      g.save(); g.translate(lx * Math.max(0.8, wpx * 0.7), ly * Math.max(0.8, wpx * 0.7)); g.strokeStyle = rgba(LIT, a * 0.9); g.stroke(path); g.restore();
    };
    const P = {
      grain(v, Z, ox, oy) {
        for (const [lam, amp, wid, a0, seed] of [[26, 0.6, 2.2, 0.16, 3], [7.5, 0.5, 1.1, 0.14, 5], [2.2, 0.45, 0.45, 0.12, 7], [0.7, 0.4, 0.16, 0.1, 9]]) {
          const a = a0 * band(lam, Z); if (a < 0.005) continue;
          const j0 = Math.floor(v.y0 / lam) - 2, j1 = Math.ceil(v.y1 / lam) + 2, steps = 48, path = new Path2D();
          for (let j = j0; j <= j1; j++) {
            for (let s = 0; s <= steps; s++) {
              const x = v.x0 + ((v.x1 - v.x0) * s) / steps;
              const y = j * lam + lam * amp * (2 * n1(x / (lam * 14) + j * 0.37, seed) - 1) + lam * 3 * (n2(x / 240, j * lam / 240, 11) - 0.5);
              const X = ox + Z * x, Y = oy + Z * y;
              s ? path.lineTo(X, Y) : path.moveTo(X, Y);
            }
          }
          strokePair(path, Math.max(0.6, wid * Z * 0.5), a);
        }
      },
      weave(v, Z, ox, oy) {
        const lam = 9, a = 0.2 * band(lam, Z);
        if (a > 0.005) {
          const i0 = Math.floor(v.x0 / lam) - 1, i1 = Math.ceil(v.x1 / lam) + 1, j0 = Math.floor(v.y0 / lam) - 1, j1 = Math.ceil(v.y1 / lam) + 1;
          const s = lam * Z, gap = Math.max(0.6, s * 0.08);
          for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
            const over = (i + j) % 2 === 0, X = ox + Z * i * lam, Y = oy + Z * j * lam;
            const sh = 0.6 + 0.4 * ML.rnd(i * 31 + j * 17, 13);
            g.fillStyle = rgba(INK, a * (over ? 0.35 : 0.9) * sh);
            g.fillRect(X + gap, Y + gap, s - gap * 2, s - gap * 2);
            g.fillStyle = rgba(LIT, a * 1.2 * sh);
            if (over) g.fillRect(X + gap, Y + gap, s - gap * 2, Math.max(0.6, s * 0.12)); else g.fillRect(X + gap, Y + gap, Math.max(0.6, s * 0.12), s - gap * 2);
          }
        }
        // the fibres inside each thread
        const lf = 1.5, af = 0.12 * band(lf, Z);
        if (af > 0.005) {
          const path = new Path2D();
          for (let y = Math.floor(v.y0 / lf) * lf; y <= v.y1; y += lf) for (let i = Math.floor(v.x0 / 9) - 1; i <= Math.ceil(v.x1 / 9); i++) {
            const j = Math.floor(y / 9); if ((i + j) % 2) continue;
            path.moveTo(ox + Z * (i * 9 + 1), oy + Z * y); path.lineTo(ox + Z * (i * 9 + 8), oy + Z * (y + 0.3 * (ML.rnd(i, Math.round(y * 7)) - 0.5)));
          }
          strokePair(path, Math.max(0.5, 0.18 * Z), af);
        }
      },
      fibre(v, Z, ox, oy) {
        for (const [lam, len, wid, a0, seed] of [[22, 3.2, 1.2, 0.13, 21], [6, 3.4, 0.45, 0.12, 23], [1.8, 3.6, 0.14, 0.1, 25]]) {
          const a = a0 * band(lam, Z); if (a < 0.005) continue;
          const i0 = Math.floor(v.x0 / lam) - 3, i1 = Math.ceil(v.x1 / lam) + 1, j0 = Math.floor(v.y0 / lam) - 3, j1 = Math.ceil(v.y1 / lam) + 1, path = new Path2D();
          for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (let q = 0; q < 2; q++) {
            const h = i * 7919 + j * 104729 + q * 13;
            const x = (i + ML.rnd(h, seed)) * lam, y = (j + ML.rnd(h, seed + 1)) * lam, ang = ML.rnd(h, seed + 2) * Math.PI, bend = (ML.rnd(h, seed + 3) - 0.5) * 0.8;
            const L = lam * len * (0.6 + 0.6 * ML.rnd(h, seed + 4)), dx = Math.cos(ang), dy = Math.sin(ang);
            path.moveTo(ox + Z * x, oy + Z * y);
            path.quadraticCurveTo(ox + Z * (x + (dx * L) / 2 - dy * L * bend), oy + Z * (y + (dy * L) / 2 + dx * L * bend), ox + Z * (x + dx * L), oy + Z * (y + dy * L));
          }
          strokePair(path, Math.max(0.5, wid * Z * 0.6), a);
        }
      },
      scratches(v, Z, ox, oy) {
        for (const [lam, wid, a0, seed] of [[5, 0.9, 0.1, 31], [1.4, 0.3, 0.1, 33], [0.45, 0.1, 0.09, 35]]) {
          const a = a0 * band(lam, Z); if (a < 0.005) continue;
          const j0 = Math.floor(v.y0 / lam) - 1, j1 = Math.ceil(v.y1 / lam) + 1;
          for (let j = j0; j <= j1; j++) {
            const k = ML.rnd(j, seed); if (k < 0.35) continue;
            const y = (j + ML.rnd(j, seed + 1)) * lam, x0 = v.x0 + (v.x1 - v.x0) * ML.rnd(j, seed + 2) * 0.3;
            const path = new Path2D(); path.moveTo(ox + Z * x0, oy + Z * y); path.lineTo(ox + Z * v.x1, oy + Z * (y + lam * 0.05));
            strokePair(path, Math.max(0.5, wid * Z * 0.5), a * k);
          }
        }
        // a few long diagonal scratches show only up close
        const a = 0.16 * band(1.2, Z);
        if (a > 0.005) for (let i = 0; i < 14; i++) {
          const x = R.x + R.w * ML.rnd(i, 41), y = R.y + R.h * ML.rnd(i, 43), L = R.w * (0.1 + 0.2 * ML.rnd(i, 47)), an = -0.5 + ML.rnd(i, 49) * 0.4;
          const path = new Path2D(); path.moveTo(ox + Z * x, oy + Z * y); path.lineTo(ox + Z * (x + Math.cos(an) * L), oy + Z * (y + Math.sin(an) * L));
          strokePair(path, Math.max(0.5, 0.25 * Z), a);
        }
      },
      print(v, Z, ox, oy) {
        // a halftone on a 15° screen: dots sized by a smooth tone field
        const lam = 3.2, a = 0.3 * band(lam, Z);
        if (a > 0.005) {
          const c = Math.cos(0.26), s = Math.sin(0.26);
          const cx = (v.x0 + v.x1) / 2, cy = (v.y0 + v.y1) / 2, rad = Math.hypot(v.x1 - v.x0, v.y1 - v.y0) / 2 + lam;
          const u0 = Math.floor((cx * c + cy * s - rad) / lam), u1 = Math.ceil((cx * c + cy * s + rad) / lam);
          const w0 = Math.floor((-cx * s + cy * c - rad) / lam), w1 = Math.ceil((-cx * s + cy * c + rad) / lam);
          g.fillStyle = rgba(INK, a);
          g.beginPath();
          for (let u = u0; u <= u1; u++) for (let w = w0; w <= w1; w++) {
            const x = (u * c - w * s) * lam, y = (u * s + w * c) * lam;
            if (x < v.x0 - lam || x > v.x1 + lam || y < v.y0 - lam || y > v.y1 + lam) continue;
            const tone = n2(x / 60, y / 60, 51) * 0.7 + n2(x / 14, y / 14, 53) * 0.3;
            const r = lam * 0.5 * Math.sqrt(tone) * Z;
            if (r < 0.3) continue;
            g.moveTo(ox + Z * x + r, oy + Z * y); g.arc(ox + Z * x, oy + Z * y, r, 0, Math.PI * 2);
          }
          g.fill();
        }
        P.fibre(v, Z, ox, oy);
      },
    };
    const paint = P[p.target] || P.grain;

    return {
      draw(t) {
        const Z = ML.clamp(zoomAt(t), 1, Z1);
        const e = (Z - 1) / Math.max(0.001, Z1 - 1);
        // the pivot travels from the focus point's own place to the frame's centre as the camera closes in
        const tau = Math.max(0, t - at), sw = p.sway ? ML.ease(t, at, at + 1.2) : 0;
        const swx = mir * W * 0.05 * Math.sin(0.55 * tau) * sw / Z * Math.min(Z, 2), swy = H * 0.012 * Math.sin(0.37 * tau + 1) * sw / Z * Math.min(Z, 2);
        const px = F.x + (W / 2 - F.x) * ML.clamp(e * 1.4) + swx, py = F.y + (H / 2 - F.y) * ML.clamp(e * 1.4) + swy;
        let ox = px - Z * F.x, oy = py - Z * F.y;
        ox = ML.clamp(ox, W - Z * W, 0); oy = ML.clamp(oy, H - Z * H, 0);
        cam.style.transform = Z > 1.0005 ? `translate(${ox.toFixed(2)}px, ${oy.toFixed(2)}px) scale(${Z.toFixed(4)})` : "none";
        if (Z <= 1.0005) { ox = 0; oy = 0; }
        // the material over the surface, clipped to it on screen
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, W, H);
        const sx = ox + Z * R.x, sy = oy + Z * R.y, sW = Z * R.w, sH = Z * R.h;
        const v = { x0: Math.max(R.x, -ox / Z), y0: Math.max(R.y, -oy / Z), x1: Math.min(R.x + R.w, (W - ox) / Z), y1: Math.min(R.y + R.h, (H - oy) / Z) };
        if (v.x1 <= v.x0 || v.y1 <= v.y0) return;
        g.save();
        g.beginPath();
        if (g.roundRect) g.roundRect(sx, sy, sW, sH, radius * Z); else g.rect(sx, sy, sW, sH);
        g.clip();
        g.globalAlpha = 0.45 + 0.55 * ML.clamp(e * 1.3);
        g.lineCap = "round";
        paint(v, Z, ox, oy);
        g.restore();
      },
    };
  },
});

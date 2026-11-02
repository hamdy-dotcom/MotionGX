// Cloth billow card: the picture hangs like fabric pinned at one edge and ripples in a slow breeze, with shading from
// the wave slope, a soft sheen and a moving shadow under it. Ported from the cloth in MengTo/Skills
// build-threejs-scroll-worlds (MIT): its two travelling forcing waves across the cloth (sin(kb1·b − w1·τ + drift) +
// 0.45·sin(kb2·b + 0.8·w2·τ + 3)), the down-cloth envelope (0.7 + 0.3·sin(ka·a − 1.7τ))·a^1.3, amplitude through tanh,
// the drape growing away from the pin, and the foreshortening that pulls each row toward the pin as the cloth tilts
// (ds − √(ds² − dz²), summed). The source integrates a wave equation frame by frame; here the forced field is taken in
// closed form, so a frame is a pure function of t. Rendered as a textured triangle mesh on a 2D canvas (an affine map
// per triangle — no WebGL, so a cross-origin picture still draws), overdrawing its card by a bleed for billow and
// shadow. The cloth only recedes (depth ≤ 0 under the perspective), so no part of the picture is ever enlarged.
ML.define({
  id: "photo.cloth-billow-card",
  category: "photo",
  name: "Cloth billow card",
  does: "A picture card hangs like fabric pinned at one edge and ripples in a slow breeze, casting a soft moving shadow.",
  says: ["playful", "story", "luxury"],
  energy: 3,
  targets: ["image", "card"],
  duration: [2, 10],
  params: {
    pin: { type: "choice", options: ["top", "left"], default: "top" },
    wind: { type: "number", range: [0.5, 6], default: 3 },
    amplitude: { type: "number", range: [5, 60], default: 30, unit: "px" },
    sheen: { type: "number", range: [0, 0.3], default: 0.1 },
    shadow: { type: "number", range: [0, 0.5], default: 0.25 },
  },
  pairs: ["text-in.punchline", "camera.push-in"],
  avoid: ["urgency", "precision"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:agent-skills/web-design/build-threejs-scroll-worlds", license: "MIT", note: "cloth forcing field ported to a closed-form 2D canvas mesh" },
  setup(ctx) {
    const { el, p, at } = ctx;
    if (!el) return null;
    const img = el.tagName === "IMG" ? el : el.querySelector("img");
    const host = el.offsetParent || el.parentElement;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    const W = el.offsetWidth, H = el.offsetHeight;
    if (!W || !H) return null;
    const L = el.offsetLeft, T = el.offsetTop, dpr = window.devicePixelRatio || 1;
    const k = ML.clamp(Math.sqrt(W * H) / 420, 0.5, 2.5); // the source's numbers are for a ~420 px card
    const B = Math.round(Math.max(24, 48 * Math.min(k, 2)));
    const probe = document.createElement("span"); host.append(probe);
    const col = (css) => { probe.style.color = ""; probe.style.color = css; return getComputedStyle(probe).color; };
    const C = { shade: col("var(--x-device)"), light: col("var(--x-accent-ink)"), panel: col("var(--x-panel)"), edge: col("var(--x-edge-color)"), accent: col("var(--x-accent)") };
    probe.remove();
    // the texture: the picture as it shows (cover crop, its own radius) at display resolution
    const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 20 * k;
    const tex = document.createElement("canvas"); tex.width = Math.round(W * dpr); tex.height = Math.round(H * dpr);
    const tg = tex.getContext("2d");
    tg.scale(dpr, dpr); tg.beginPath(); tg.roundRect(0, 0, W, H, radius); tg.clip();
    if (img && img.naturalWidth) {
      const nw = img.naturalWidth, nh = img.naturalHeight, fit = getComputedStyle(img).objectFit;
      if (fit === "cover" || img !== el) { const s = Math.max(W / nw, H / nh), vw = W / s, vh = H / s; tg.drawImage(img, (nw - vw) / 2, (nh - vh) / 2, vw, vh, 0, 0, W, H); }
      else tg.drawImage(img, 0, 0, W, H);
    } else { tg.fillStyle = C.panel; tg.fillRect(0, 0, W, H); tg.fillStyle = C.accent; tg.fillRect(0, 0, W, H * 0.04); }
    // the output and a mesh layer (shading lands only on the cloth, never on its transparent corners)
    const OW = W + 2 * B, OH = H + 2 * B;
    const cv = document.createElement("canvas"); cv.width = Math.round(OW * dpr); cv.height = Math.round(OH * dpr);
    cv.style.cssText = `position:absolute;left:${L - B}px;top:${T - B}px;width:${OW}px;height:${OH}px;pointer-events:none`;
    el.after(cv);
    const g = cv.getContext("2d");
    const layer = document.createElement("canvas"); layer.width = cv.width; layer.height = cv.height;
    const lg = layer.getContext("2d");
    const shadeLayer = document.createElement("canvas"); shadeLayer.width = cv.width; shadeLayer.height = cv.height;
    const sh = shadeLayer.getContext("2d");
    el.style.opacity = "0";
    // the mesh
    const step = Math.max(Math.min(W, H) / 16, Math.sqrt((W * H) / 900)), nx = Math.max(8, Math.round(W / step)), ny = Math.max(8, Math.round(H / step));
    const NN = (nx + 1) * (ny + 1);
    const X = new Float32Array(NN), Y = new Float32Array(NN), Z = new Float32Array(NN), S = new Float32Array(NN);
    const shadeMap = document.createElement("canvas"); shadeMap.width = nx + 1; shadeMap.height = ny + 1;
    const sg = shadeMap.getContext("2d"), sd = sg.createImageData(nx + 1, ny + 1);
    const one = document.createElement("canvas"); one.width = one.height = 1;
    const og = one.getContext("2d", { willReadFrequently: true });
    const rgbOf = (c) => { og.clearRect(0, 0, 1, 1); og.fillStyle = c; og.fillRect(0, 0, 1, 1); const d = og.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; };
    const rgbShade = rgbOf(C.shade), rgbLight = rgbOf(C.light);
    const pin = p.pin === "left" ? (ctx.rtl ? "right" : "left") : "top";
    const amp = p.amplitude * k, drape = 40 * k * 0.35, P = 1200 * k;
    const LX = -0.4, LY = -0.6, LZ = 1, LN = Math.hypot(LX, LY, LZ);
    const TAU = Math.PI * 2, mean = Math.sqrt(W * H);
    const lenA = (pin === "top" ? H : W) / mean, lenB = (pin === "top" ? W : H) / mean;
    const tanhMax = Math.tanh(1.45 * 1.3 * (p.wind / 3));
    return {
      draw(t) {
        const gust = ML.ease(t, at, at + 1.2) * (0.85 + 0.15 * Math.sin(Math.max(0, t - at) * 0.37));
        const tau = Math.max(0, t - at) * 0.5 + 6.3;
        const drift = 1.8 * Math.sin(0.23 * tau);
        const amb = (p.wind / 3) * 1.3 * gust;
        // depth field (≤ 0: the cloth recedes from the pin, never toward the viewer)
        for (let iy = 0; iy <= ny; iy++) for (let ix = 0; ix <= nx; ix++) {
          const u = ix / nx, v = iy / ny;
          const a = pin === "top" ? v : pin === "left" ? u : 1 - u, b = pin === "top" ? u : v;
          const hang = Math.pow(a, 1.3), aP = a * lenA, bP = b * lenB; // in units of the card's mean side
          const row = Math.sin(TAU * 1.5 * bP - 2.95 * tau + drift) + 0.45 * Math.sin(TAU * 3.8 * bP + 7.46 * tau * 0.8 + 3);
          const colF = (0.7 + 0.3 * Math.sin(TAU * 2.2 * aP - 1.7 * tau)) * hang;
          const h = amb * row * colF;
          Z[iy * (nx + 1) + ix] = amp * (Math.tanh(h) - tanhMax * gust * hang) - drape * gust * hang;
        }
        // foreshorten toward the pin, then perspective about the card's centre
        const along = pin === "top" ? H / ny : W / nx;
        const n1 = pin === "top" ? nx + 1 : ny + 1, n2 = pin === "top" ? ny + 1 : nx + 1;
        for (let l = 0; l < n1; l++) {
          let cum = 0;
          for (let s2 = 0; s2 < n2; s2++) {
            const k2 = pin === "right" ? n2 - 1 - s2 : s2;
            const ix = pin === "top" ? l : k2, iy = pin === "top" ? k2 : l, i = iy * (nx + 1) + ix;
            if (s2 > 0) {
              const kp = pin === "right" ? k2 + 1 : k2 - 1, ip = pin === "top" ? (kp) * (nx + 1) + ix : iy * (nx + 1) + kp;
              const dz = Z[i] - Z[ip]; cum += along - Math.sqrt(Math.max(along * along - dz * dz, 0));
            }
            let x = (ix / nx) * W, y = (iy / ny) * H;
            if (pin === "top") y -= cum; else if (pin === "left") x -= cum; else x += cum;
            const f = P / (P - Z[i]);
            X[i] = B + W / 2 + (x - W / 2) * f; Y[i] = B + H / 2 + (y - H / 2) * f;
          }
        }
        // slope shading per node
        const dxs = W / nx, dys = H / ny;
        for (let iy = 0; iy <= ny; iy++) for (let ix = 0; ix <= nx; ix++) {
          const i = iy * (nx + 1) + ix, l = iy * (nx + 1) + Math.max(0, ix - 1), r = iy * (nx + 1) + Math.min(nx, ix + 1);
          const up = Math.max(0, iy - 1) * (nx + 1) + ix, dn = Math.min(ny, iy + 1) * (nx + 1) + ix;
          const zx = (Z[r] - Z[l]) / (2 * dxs), zy = (Z[dn] - Z[up]) / (2 * dys), inv = 1 / Math.hypot(zx, zy, 1);
          S[i] = ((-zx * LX - zy * LY + LZ) * inv) / LN - LZ / LN;
        }
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
        lg.setTransform(1, 0, 0, 1, 0, 0); lg.clearRect(0, 0, layer.width, layer.height);
        // the outline (border nodes in order)
        const ring = [];
        for (let ix = 0; ix <= nx; ix++) ring.push(ix);
        for (let iy = 1; iy <= ny; iy++) ring.push(iy * (nx + 1) + nx);
        for (let ix = nx - 1; ix >= 0; ix--) ring.push(ny * (nx + 1) + ix);
        for (let iy = ny - 1; iy > 0; iy--) ring.push(iy * (nx + 1));
        // the shadow: the outline pushed down by how far each part has receded, softened
        if (p.shadow > 0) {
          g.setTransform(dpr, 0, 0, dpr, 0, 0);
          g.save(); g.filter = `blur(${(B * 0.28).toFixed(1)}px)`; g.globalAlpha = p.shadow; g.fillStyle = C.shade;
          g.beginPath();
          ring.forEach((i, j) => { const o = -Z[i] * 0.45, x = X[i] + o * 0.2, y = Y[i] + B * 0.18 + o; j ? g.lineTo(x, y) : g.moveTo(x, y); });
          g.closePath(); g.fill(); g.restore();
        }
        // the textured mesh: one affine-mapped triangle at a time, each clip grown 1.1 px to hide seams
        lg.setTransform(dpr, 0, 0, dpr, 0, 0);
        sh.setTransform(1, 0, 0, 1, 0, 0); sh.clearRect(0, 0, shadeLayer.width, shadeLayer.height); sh.setTransform(dpr, 0, 0, dpr, 0, 0);
        const tw = tex.width, th = tex.height;
        // the shading map: one pixel per node (dark from the slope, a sheen where a face turns to the light),
        // stretched over the mesh with the same per-triangle maps, so the shading is smooth between nodes
        for (let i = 0; i < NN; i++) {
          const dark = ML.clamp(-S[i] * 1.6, 0, 0.42), lit = ML.clamp(S[i] * 3, 0, 1) * p.sheen * 2.5;
          const c = dark >= lit ? rgbShade : rgbLight, al = Math.max(dark, lit);
          sd.data[i * 4] = c[0]; sd.data[i * 4 + 1] = c[1]; sd.data[i * 4 + 2] = c[2]; sd.data[i * 4 + 3] = Math.round(al * 255);
        }
        sg.putImageData(sd, 0, 0);
        // an affine map taking three source points onto three stage points
        const affine = (u0, v0, u1, v1, u2, v2, x0, y0, x1, y1, x2, y2) => {
          const den = u0 * (v1 - v2) + u1 * (v2 - v0) + u2 * (v0 - v1);
          if (Math.abs(den) < 1e-9) return null;
          return [(x0 * (v1 - v2) + x1 * (v2 - v0) + x2 * (v0 - v1)) / den, (y0 * (v1 - v2) + y1 * (v2 - v0) + y2 * (v0 - v1)) / den,
            (x0 * (u2 - u1) + x1 * (u0 - u2) + x2 * (u1 - u0)) / den, (y0 * (u2 - u1) + y1 * (u0 - u2) + y2 * (u1 - u0)) / den,
            (x0 * (u1 * v2 - u2 * v1) + x1 * (u2 * v0 - u0 * v2) + x2 * (u0 * v1 - u1 * v0)) / den, (y0 * (u1 * v2 - u2 * v1) + y1 * (u2 * v0 - u0 * v2) + y2 * (u0 * v1 - u1 * v0)) / den];
        };
        const tri = (i0, i1, i2) => {
          const c0 = i0 % (nx + 1), r0 = Math.floor(i0 / (nx + 1)), c1 = i1 % (nx + 1), r1 = Math.floor(i1 / (nx + 1)), c2 = i2 % (nx + 1), r2 = Math.floor(i2 / (nx + 1));
          const x0 = X[i0], y0 = Y[i0], x1 = X[i1], y1 = Y[i1], x2 = X[i2], y2 = Y[i2];
          const m = affine(c0 / nx * tw, r0 / ny * th, c1 / nx * tw, r1 / ny * th, c2 / nx * tw, r2 / ny * th, x0, y0, x1, y1, x2, y2);
          if (!m) return;
          const cx = (x0 + x1 + x2) / 3, cy = (y0 + y1 + y2) / 3, gr = (x, y) => { const d = Math.hypot(x - cx, y - cy) || 1; return [x + ((x - cx) / d) * 1.1, y + ((y - cy) / d) * 1.1]; };
          const a0 = gr(x0, y0), a1 = gr(x1, y1), a2 = gr(x2, y2);
          lg.save();
          lg.beginPath(); lg.moveTo(a0[0], a0[1]); lg.lineTo(a1[0], a1[1]); lg.lineTo(a2[0], a2[1]); lg.closePath(); lg.clip();
          lg.save(); lg.transform(m[0], m[1], m[2], m[3], m[4], m[5]); lg.drawImage(tex, 0, 0); lg.restore();
          lg.restore();
          // shading atop the cloth only (the rounded corners stay clear)
          const q = affine(c0 + 0.5, r0 + 0.5, c1 + 0.5, r1 + 0.5, c2 + 0.5, r2 + 0.5, x0, y0, x1, y1, x2, y2);
          if (q) {
            sh.save(); sh.beginPath(); sh.moveTo(x0, y0); sh.lineTo(x1, y1); sh.lineTo(x2, y2); sh.closePath(); sh.clip();
            sh.transform(q[0], q[1], q[2], q[3], q[4], q[5]); sh.drawImage(shadeMap, 0, 0); sh.restore();
          }
        };
        for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) {
          const a = iy * (nx + 1) + ix, b = a + 1, c = a + nx + 1, d = c + 1;
          tri(a, c, b); tri(b, c, d);
        }
        lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalCompositeOperation = "source-atop";
        // the shading (never the picture) softened a touch so the hairline seams between its triangles disappear
        lg.filter = `blur(${(1.5 * dpr).toFixed(2)}px)`; lg.drawImage(shadeLayer, 0, 0); lg.filter = "none"; lg.globalCompositeOperation = "source-over";
        g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(layer, 0, 0);
      },
    };
  },
});

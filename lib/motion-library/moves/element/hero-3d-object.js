// Faceted 3D hero object: one real faceted solid — icosahedron (detail 1, 80 faces), octahedron, dodecahedron, box or
// a cut gem — lit and slowly turning and bobbing, facets catching a key and a rim light. The webgl-3d-object recipe,
// rendered by our own small 3D painter on a canvas (perspective camera fov 38 at (0, .15, 5.2); real face normals;
// ambient .38, key 2.15 from (3.4, 4.2, 4.8), cool rim .82 from (−4.2, 1.2, −2.8); a standard-ish material — Lambert
// diffuse × (1 − metalness) + a Blinn specular whose sharpness follows roughness, emissive for "glow"; ACES filmic
// tone mapping at exposure 1.05, sRGB out; flat shading with a 0.6 px self-stroke closing the seams; its real shadow
// — the solid projected along the key light onto a catcher at y −1.65, opacity .18, softened). Every frame is a
// function of t: rotation.x = −.16 + sin(.45t)·.06, rotation.y = spin·t, rotation.z = sin(.32t)·.08,
// y = sin(.8t)·float/2 − .12. Entrance: scale .65 → 1 and rotation.y +0.6 rad over 0.8 s power3.out.
// Option ring: a thin 3D ring around it (its far half behind the solid, its near half in front) with a small accent
// dot travelling on it, and corner brackets framing the object. Colours from the look: the accent is the body, the
// second accent the rim light, the ink the shadow. No CSS-faked 3D; nothing scaled past its pixels (it is painted).
// Arabic turns it the other way. "gem" replaces the recipe's glTF slot (no model files in the library).
// Source: MengTo/Skills web-design/webgl-3d-object/SKILL.md (MIT: the camera, lights, material ranges and motion) +
// prompt-motion "grace-sunnyy-opus5-5-15" (reference only: ring, dot and brackets); the renderer is our own code.
ML.define({
  id: "element.hero-3d-object",
  category: "element",
  name: "Faceted 3D hero object",
  does: "One faceted, lit 3D gem slowly turns and bobs, facets catching a key and a rim light, optionally inside a thin orbit ring with a travelling dot.",
  says: ["tech", "luxury", "focus", "brand", "precision"],
  energy: 2,
  targets: ["stage", "shape", "logo"],
  duration: [2, 10],
  params: {
    geometry: { type: "choice", options: ["icosahedron", "octahedron", "dodecahedron", "box", "gem"], default: "icosahedron" },
    material: { type: "choice", options: ["premium-metal", "ceramic", "glow-tech", "flat-colour"], default: "premium-metal" },
    spin: { type: "number", range: [0.2, 2.1], default: 0.28, unit: "rad/s" },
    float: { type: "number", range: [0, 0.12], default: 0.08 },
    ring: { type: "bool", default: false },
    size: { type: "number", range: [0.5, 1], default: 0.8 },
  },
  pairs: ["background.mesh-gradient", "camera.push-in", "element.idle-turntable"],
  avoid: ["playful", "problem"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "MengTo/Skills:agent-skills/web-design/webgl-3d-object/SKILL.md", license: "MIT", note: "three.js recipe values ported to our own canvas renderer; ring / dot / brackets after prompt-motion grace-sunnyy-opus5-5-15 (reference only)" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    // ── where: the picture region, or over the target (which it stands in for) ──
    let R;
    if (el) {
      const b = ctx.box(el), s = Math.min(Math.max(b.w, b.h) * 1.4, f.W - 2 * f.m, f.H * 0.6);
      R = { x: ML.clamp(b.x + b.w / 2 - s / 2, 0, f.W - s), y: ML.clamp(b.y + b.h / 2 - s / 2, 0, f.H - s), w: s, h: s };
      el.style.opacity = "0";
    } else R = { ...f.pic };
    const cv = doc.createElement("canvas");
    cv.width = Math.round(R.w); cv.height = Math.round(R.h);
    cv.style.cssText = `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;`;
    host.append(cv);
    const g = cv.getContext("2d");
    const k = Math.min(f.W, f.H) / 1080;

    // ── colours from the look (linear light) ──
    const probe = doc.createElement("span"); probe.style.display = "none"; host.append(probe);
    const px = doc.createElement("canvas").getContext("2d", { willReadFrequently: true }); px.canvas.width = px.canvas.height = 1;
    const rgb = (v) => { probe.style.color = v; const c = getComputedStyle(probe).color; px.clearRect(0, 0, 1, 1); px.fillStyle = "#000"; px.fillStyle = c; px.fillRect(0, 0, 1, 1); const d = px.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; };
    const lin = (c) => c.map((x) => Math.pow(x / 255, 2.2));
    const body = lin(rgb("var(--x-accent)")), rimC = lin(rgb("var(--x-accent-2)")), inkS = rgb("var(--x-ink)"), dimS = rgb("var(--x-dim)"), accS = rgb("var(--x-accent)");
    probe.remove();

    // ── geometry (unit-ish, centred) ──
    const V = (x, y, z) => [x, y, z];
    const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const scaleV = (v, s) => [v[0] * s, v[1] * s, v[2] * s];
    function icosa(detail, r) {
      const t = (1 + Math.sqrt(5)) / 2;
      let vs = [V(-1, t, 0), V(1, t, 0), V(-1, -t, 0), V(1, -t, 0), V(0, -1, t), V(0, 1, t), V(0, -1, -t), V(0, 1, -t), V(t, 0, -1), V(t, 0, 1), V(-t, 0, -1), V(-t, 0, 1)].map(norm);
      let fs = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]].map((q) => q.map((i) => vs[i]));
      for (let d = 0; d < detail; d++) {
        const out = [];
        for (const [a, b, c] of fs) { const ab = norm(scaleV([a[0] + b[0], a[1] + b[1], a[2] + b[2]], 0.5)), bc = norm(scaleV([b[0] + c[0], b[1] + c[1], b[2] + c[2]], 0.5)), ca = norm(scaleV([c[0] + a[0], c[1] + a[1], c[2] + a[2]], 0.5)); out.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]); }
        fs = out;
      }
      return fs.map((q) => q.map((v) => scaleV(v, r)));
    }
    function dodeca(r) {
      // the dual of the icosahedron: a pentagon of face centres around each vertex
      const ico = icosa(0, 1), cen = ico.map((q) => norm([(q[0][0] + q[1][0] + q[2][0]) / 3, (q[0][1] + q[1][1] + q[2][1]) / 3, (q[0][2] + q[1][2] + q[2][2]) / 3]));
      const verts = [];
      ico.forEach((q) => q.forEach((v) => { if (!verts.some((w) => Math.hypot(w[0] - v[0], w[1] - v[1], w[2] - v[2]) < 1e-6)) verts.push(v); }));
      return verts.map((v) => {
        const ring = cen.filter((c, i) => ico[i].some((w) => Math.hypot(w[0] - v[0], w[1] - v[1], w[2] - v[2]) < 1e-6));
        const u = norm(cross(v, Math.abs(v[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), w2 = cross(v, u);
        ring.sort((a, b) => Math.atan2(dot(a, w2), dot(a, u)) - Math.atan2(dot(b, w2), dot(b, u)));
        return ring.map((c) => scaleV(c, r));
      });
    }
    function octa(r) { const P = [V(r, 0, 0), V(-r, 0, 0), V(0, r, 0), V(0, -r, 0), V(0, 0, r), V(0, 0, -r)]; return [[0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2], [1, 2, 5], [1, 5, 3], [1, 3, 4], [1, 4, 2]].map((q) => q.map((i) => P[i])); }
    function box(s) { const h = s / 2, P = [V(-h, -h, -h), V(h, -h, -h), V(h, h, -h), V(-h, h, -h), V(-h, -h, h), V(h, -h, h), V(h, h, h), V(-h, h, h)]; return [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 3, 7, 4]].map((q) => q.map((i) => P[i])); }
    function gem(r) {
      // a cut stone: an octagonal table, an antiprism crown, a girdle, a pavilion to a point
      const n = 8, T = [], G = [], ty = 0.5 * r, gy = 0.05 * r, ay = -1.05 * r;
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, b = ((i + 0.5) / n) * Math.PI * 2; T.push(V(Math.cos(a) * 0.62 * r, ty, Math.sin(a) * 0.62 * r)); G.push(V(Math.cos(b) * r, gy, Math.sin(b) * r)); }
      const A = V(0, ay, 0), out = [T.slice()];
      for (let i = 0; i < n; i++) { const j = (i + 1) % n, h = (i + n - 1) % n; out.push([T[i], T[j], G[i]], [G[h], T[i], G[i]], [G[i], G[j], A]); }
      return out.map((q) => q.map((v) => [v[0], v[1] + 0.2 * r, v[2]]));
    }
    const G0 = { icosahedron: () => icosa(1, 1.35), octahedron: () => octa(1.45), dodecahedron: () => dodeca(1.38), box: () => box(1.75), gem: () => gem(1.4) }[p.geometry] || (() => icosa(1, 1.35));
    // faces with outward normals (all solids are convex about the origin)
    const faces = G0().map((q) => {
      const c = q.reduce((a, v) => [a[0] + v[0] / q.length, a[1] + v[1] / q.length, a[2] + v[2] / q.length], [0, 0, 0]);
      let n = norm(cross(sub(q[1], q[0]), sub(q[2], q[0])));
      if (dot(n, c) < 0) n = scaleV(n, -1);
      return { q, c, n };
    });

    // ── material (the recipe's three moods + a plain one) ──
    const M = { "premium-metal": { metal: 0.58, rough: 0.3, emit: 0 }, ceramic: { metal: 0.08, rough: 0.5, emit: 0 }, "glow-tech": { metal: 0.3, rough: 0.36, emit: 0.24 }, "flat-colour": { metal: 0, rough: 0.7, emit: 0.04 } }[p.material] || { metal: 0.58, rough: 0.3, emit: 0 };
    const shin = Math.max(4, 2 / Math.pow(M.rough, 4) - 2);
    const F0 = [0, 1, 2].map((i) => 0.04 + (body[i] - 0.04) * M.metal);
    const KEY = norm([3.4, 4.2, 4.8]), RIM = norm([-4.2, 1.2, -2.8]), CAM = [0, 0.15, 5.2];
    const aces = (x) => { x *= 1.05 * 0.6; return ML.clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14)); };
    const srgb = (x) => Math.round(255 * Math.pow(aces(x), 1 / 2.2));
    function shade(N, C) {
      const V0 = norm(sub(CAM, C)), out = [0, 0, 0];
      const kd = 1 - M.metal * 0.75;
      for (const [L, I, col] of [[KEY, 2.15, [1, 1, 1]], [RIM, 0.82 * (p.material === "glow-tech" ? 1.6 : 1), rimC]]) {
        const nl = Math.max(0, dot(N, L));
        if (nl <= 0) continue;
        const H = norm([L[0] + V0[0], L[1] + V0[1], L[2] + V0[2]]), spec = ((shin + 8) / (8 * Math.PI)) * Math.pow(Math.max(0, dot(N, H)), shin);
        for (let i = 0; i < 3; i++) out[i] += I * nl * col[i] * (body[i] * kd * 0.95 + F0[i] * spec * 0.6);
      }
      for (let i = 0; i < 3; i++) out[i] += body[i] * (0.38 * (0.4 + 0.3 * kd) + M.emit * 1.4) + rimC[i] * M.emit * 0.25 * Math.max(0, -N[2]);
      return out;
    }

    // ── camera: fov 38, the object fits the region ──
    const fl = 1 / Math.tan((19 * Math.PI) / 180);
    const S = (fl * Math.min(R.w, R.h) / 2) * 0.62 * p.size, cx = R.w / 2, cy = R.h / 2 + Math.min(R.w, R.h) * 0.02;
    const proj = (v) => { const z = CAM[2] - v[2]; return [cx + ((v[0] - CAM[0]) / z) * S, cy - ((v[1] - CAM[1]) / z) * S, z]; };
    const dirSpin = rtl ? -1 : 1;
    const rot = (rx, ry, rz) => {
      // three.js Euler XYZ: M = Rx · Ry · Rz
      const [a, b, c, d, e, f2] = [Math.cos(rx), Math.sin(rx), Math.cos(ry), Math.sin(ry), Math.cos(rz), Math.sin(rz)];
      return [[c * e, -c * f2, d], [a * f2 + b * d * e, a * e - b * d * f2, -b * c], [b * f2 - a * d * e, b * e + a * d * f2, a * c]];
    };
    const mul = (m, v) => [m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2], m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2], m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]];
    const hull = (pts) => {
      pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
      const lo = [], up = [];
      for (const q of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
      for (const q of pts.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
      return lo.slice(0, -1).concat(up.slice(0, -1));
    };
    const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;
    const ringR = 2.05, ringTilt = 1.18;
    ctx.sfx(at, "swell", 0.35);

    return {
      draw(t) {
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, cv.width, cv.height);
        if (t < at - 1e-6) return;
        const tau = t - at;
        const e = 1 - Math.pow(1 - ML.lin(t, at, at + 0.8), 4); // power3.out
        const o = ML.lin(t, at, at + 0.3) * (1 - ML.ease(t, end - 0.3, end));
        if (o <= 0) return;
        const sc = 0.65 + 0.35 * e;
        const m = rot(-0.16 + Math.sin(0.45 * tau) * 0.06, dirSpin * (p.spin * tau + 0.6 * (1 - e)), Math.sin(0.32 * tau) * 0.08);
        const ty = Math.sin(0.8 * tau) * (p.float / 2) - 0.12;
        const W = (v) => { const r = mul(m, v); return [r[0] * sc, r[1] * sc + ty, r[2] * sc]; };
        g.globalAlpha = o;
        // the shadow: the solid along the key light onto the catcher at y −1.65
        const ground = -1.65, sh = [];
        for (const fc of faces) for (const v of fc.q) { const w = W(v), s = (w[1] - ground) / KEY[1]; sh.push(proj([w[0] - KEY[0] * s, ground, w[2] - KEY[2] * s])); }
        const hp = hull(sh);
        g.save();
        g.filter = `blur(${(10 * k).toFixed(1)}px)`;
        g.fillStyle = rgba(inkS, 0.18 * e);
        g.beginPath(); hp.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath(); g.fill();
        g.restore();
        // the ring (far half first)
        const ringPts = [];
        if (p.ring) {
          for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI * 2; const v = [Math.cos(a) * ringR, Math.sin(a) * ringR * Math.cos(ringTilt), Math.sin(a) * ringR * Math.sin(ringTilt)]; ringPts.push(proj([v[0], v[1] + ty, v[2]]).concat([v[2]])); }
        }
        const ringHalf = (front) => {
          if (!p.ring) return;
          g.strokeStyle = rgba(dimS, 0.75); g.lineWidth = Math.max(1, 1.6 * k);
          g.beginPath(); let on = false;
          ringPts.forEach((q) => { const inFront = q[3] > 0; if (inFront === front) { if (!on) { g.moveTo(q[0], q[1]); on = true; } else g.lineTo(q[0], q[1]); } else on = false; });
          g.stroke();
          const a = dirSpin * tau * 0.9 + 0.4, v = [Math.cos(a) * ringR, Math.sin(a) * ringR * Math.cos(ringTilt), Math.sin(a) * ringR * Math.sin(ringTilt)];
          if (v[2] > 0 === front) { const q = proj([v[0], v[1] + ty, v[2]]); g.fillStyle = rgba(accS, 1); g.beginPath(); g.arc(q[0], q[1], Math.max(3, 6 * k) * e, 0, Math.PI * 2); g.fill(); }
        };
        ringHalf(false);
        // the faces: cull the ones facing away, paint far to near
        const vis = [];
        for (const fc of faces) {
          const n = mul(m, fc.n), c = W(fc.c);
          if (dot(n, sub(CAM, c)) <= 0) continue;
          vis.push({ pts: fc.q.map((v) => proj(W(v))), z: CAM[2] - c[2], col: shade(n, c) });
        }
        vis.sort((a, b) => b.z - a.z);
        g.lineJoin = "round";
        for (const fc of vis) {
          const c = `rgb(${srgb(fc.col[0])},${srgb(fc.col[1])},${srgb(fc.col[2])})`;
          g.fillStyle = c; g.strokeStyle = c; g.lineWidth = 0.6 * Math.max(1, k * 1.5);
          g.beginPath(); fc.pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath(); g.fill(); g.stroke();
        }
        ringHalf(true);
        if (p.ring) {
          // corner brackets framing the object
          const hs = (S * 1.5) / CAM[2], L = hs * 0.22, bx = cx, by = cy - (0.15 / CAM[2]) * S;
          g.strokeStyle = rgba(inkS, 0.55); g.lineWidth = Math.max(1, 2 * k);
          g.beginPath();
          for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const x = bx + sx * hs, y = by + sy * hs; g.moveTo(x, y - sy * L); g.lineTo(x, y); g.lineTo(x - sx * L, y); }
          g.stroke();
        }
        g.globalAlpha = 1;
      },
    };
  },
});

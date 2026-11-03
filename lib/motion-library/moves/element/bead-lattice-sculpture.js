// Bead-and-ring sculpture object: a non-literal hero object for "the system". A helix shell of beads — 12 strands ×
// ~34 beads; strand s, bead i, t = i/(n−1): y = (t − .5)·3.35, pulse = .78 + sin(tπ)·.7 + sin(3tπ + s)·.05,
// angle = t·2.7π + s/12·2π, position (cos a·pulse, y, sin a·pulse·.72), size .68 + .36·sin((i + s)·1.73)², every
// 17th bead the alternate colour — around a flat-shaded faceted core (icosahedron, one subdivision, r .7), crossed by
// three thin orbit rings (radii 1.25 / 1.72 / 2.06, tubes .012 / .018 / .009, rotations (−.42, .10), (.48, .72),
// (1.04, −.26), the third in the accent), a knotted wire (torus knot 2,3, r 1.08, scaled .94 / 1.18 / .94, turned
// .42) and six accent nodes (r .105). Lit by a hemisphere + a key light from (−4.5, 8, 7); a soft floor shadow.
// Entrance: the beads resolve from scattered paths into the object along their strands (0.004 s a bead, back.out)
// while the core grows out of the middle, the rings scale .6 → 1 and fade in over 0.8 s and the wire draws itself; then it turns at `spin` rad/s.
// three.js is not on move pages, so this is our own canvas painter (perspective projection, painter's sort, Lambert
// shading), every frame a pure function of t; colours come from the look.
// Source: MengTo/Skills web-design/scroll-world-storytelling demo/threejs/index.html (MIT) — the procedural
// structure (buildBeadShell / buildStructure) ported to 2D canvas.
ML.define({
  id: "element.bead-lattice-sculpture",
  category: "element",
  name: "Bead-and-ring sculpture object",
  does: "A non-literal hero object: a helix shell of hundreds of beads around a faceted core, crossed by thin orbit rings and a knotted wire, standing in for 'the system'.",
  says: ["tech", "connection", "precision", "brand"],
  energy: 2,
  targets: ["shape", "stage"],
  duration: [2, 6],
  params: {
    look: { type: "choice", options: ["signal-red", "editorial-mono", "soft-pearl"], default: "editorial-mono" },
    beads: { type: "number", range: [200, 600], default: 408 },
    entrance: { type: "choice", options: ["resolve-from-scatter", "formed"], default: "resolve-from-scatter" },
    spin: { type: "number", range: [0, 0.4], default: 0.15, unit: "rad/s" },
    backdrop: { type: "bool", default: true },
  },
  pairs: ["camera.slow-push", "text-in.punchline", "background.noise-gradient-flow"],
  avoid: ["playful", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "MengTo/Skills:web-design/scroll-world-storytelling", license: "MIT", note: "demo/threejs buildBeadShell + buildStructure geometry and presets, rebuilt as a deterministic canvas painter" },
  setup(ctx) {
    const { p, at, end, f, el } = ctx;
    const doc = document;
    const mk = (tag, css, parent) => { const e = doc.createElement(tag); e.style.cssText = css; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = el && el !== ctx.stage ? el : null;
    const R = own && ctx.box(own).w > f.W * 0.4 && ctx.box(own).h > f.H * 0.2 ? ctx.box(own) : f.pic;
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;`, host);
    // the backdrop sits beside the content (not inside what fades), so what it covers never ghosts through during the exit
    const back = p.backdrop ? mk("div", `position:absolute;left:${R.x - (R === f.pic ? 40 : 0)}px;top:${R.y}px;width:${R.w + (R === f.pic ? 80 : 0)}px;height:${R.h + (R === f.pic ? 70 : 0)}px;border-radius:var(--x-radius);background:var(--x-ground);pointer-events:none;z-index:6;`, host) : null;
    if (back) host.insertBefore(back, layer);
    const cv = mk("canvas", "position:absolute;left:0;top:0;width:100%;height:100%;", layer);
    const CW = Math.round(R.w), CH = Math.round(R.h);
    cv.width = CW; cv.height = CH;
    // a CPU-backed canvas: its antialiasing is the same on every repaint (a GPU canvas varied at shared edges)
    const g = cv.getContext("2d", { willReadFrequently: true });

    // look colours as rgb (resolved through a 1 px canvas, so color-mix and any colour space read the same)
    const px = doc.createElement("canvas"); px.width = px.height = 1; const pg = px.getContext("2d", { willReadFrequently: true });
    const probe = mk("span", "", layer);
    const rgb = (v) => { probe.style.color = `var(${v})`; pg.clearRect(0, 0, 1, 1); pg.fillStyle = getComputedStyle(probe).color; pg.fillRect(0, 0, 1, 1); const d = pg.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; };
    const C = { ink: rgb("--x-ink"), panel: rgb("--x-panel"), panel2: rgb("--x-panel-2"), dim: rgb("--x-dim"), accent: rgb("--x-accent") };
    probe.remove();
    const PRE = {
      "editorial-mono": { bead: C.ink, alt: C.panel, core: C.panel2, ring: C.dim, accent: C.ink },
      "signal-red": { bead: C.ink, alt: C.panel, core: C.panel2, ring: C.dim, accent: C.accent },
      // pearl: a mid tone between panel and ink, so it reads on a light ground and a dark one (its highlight does the rest)
      "soft-pearl": { bead: C.panel.map((v, i) => Math.round(v + (C.ink[i] - v) * 0.28)), alt: C.dim, core: C.panel, ring: C.dim, accent: C.accent },
    }[p.look] || { bead: C.ink, alt: C.panel, core: C.panel2, ring: C.dim, accent: C.ink };
    const shade = (c, k) => `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`;
    const lift = (c, k) => `rgb(${Math.round(c[0] + (255 - c[0]) * k)},${Math.round(c[1] + (255 - c[1]) * k)},${Math.round(c[2] + (255 - c[2]) * k)})`;

    // ── geometry (world units, as the three.js demo builds it) ──
    const strands = 12, per = Math.max(8, Math.round(ML.clamp(p.beads, 200, 600) / strands));
    const beads = [];
    for (let s = 0; s < strands; s++) for (let i = 0; i < per; i++) {
      const t = i / (per - 1), y = (t - 0.5) * 3.35;
      const pulse = 0.78 + Math.sin(t * Math.PI) * 0.7 + Math.sin(t * Math.PI * 3 + s) * 0.05;
      const a = t * Math.PI * 2.7 + (s / strands) * Math.PI * 2;
      const idx = beads.length;
      // a scattered start: a seeded point in a wide shell
      const u = ML.rnd(idx, 1) * Math.PI * 2, v = Math.acos(2 * ML.rnd(idx, 2) - 1), rr = 2.6 + ML.rnd(idx, 3) * 1.6;
      beads.push({ x: Math.cos(a) * pulse, y, z: Math.sin(a) * pulse * 0.72, r: 0.055 * (0.68 + 0.36 * Math.sin((i + s) * 1.73) ** 2), alt: idx % 17 === 0,
        sx: Math.sin(v) * Math.cos(u) * rr, sy: Math.cos(v) * rr * 0.8, sz: Math.sin(v) * Math.sin(u) * rr, order: s * per + i });
    }
    // icosahedron, one subdivision, r .7
    const PHI = (1 + Math.sqrt(5)) / 2;
    let V = [[-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0], [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI], [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]];
    let F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    const norm = (q) => { const l = Math.hypot(q[0], q[1], q[2]); return [q[0] / l, q[1] / l, q[2] / l]; };
    V = V.map(norm);
    { const cache = new Map(), nf = []; const mid = (a, b) => { const k = a < b ? a + "_" + b : b + "_" + a; if (!cache.has(k)) { V.push(norm([(V[a][0] + V[b][0]) / 2, (V[a][1] + V[b][1]) / 2, (V[a][2] + V[b][2]) / 2])); cache.set(k, V.length - 1); } return cache.get(k); };
      for (const [a, b, c] of F) { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); } F = nf; }
    const coreV = V.map((q) => [q[0] * 0.7, q[1] * 0.7, q[2] * 0.7]);
    // euler XYZ rotation matrix (three.js order)
    const euler = (x, y, z) => { const a = Math.cos(x), b = Math.sin(x), c = Math.cos(y), d = Math.sin(y), e = Math.cos(z), ff = Math.sin(z);
      return [c * e, -c * ff, d, a * ff + b * e * d, a * e - b * ff * d, -b * c, b * ff - a * e * d, b * e + a * ff * d, a * c]; };
    const apply = (m, q) => [m[0] * q[0] + m[1] * q[1] + m[2] * q[2], m[3] * q[0] + m[4] * q[1] + m[5] * q[2], m[6] * q[0] + m[7] * q[1] + m[8] * q[2]];
    const RING = [[1.25, 0.012, -0.42, 0.1], [1.72, 0.018, 0.48, 0.72], [2.06, 0.009, 1.04, -0.26]];
    const SEG = 120;
    const rings = RING.map(([rad, tube, rx, ry], i) => { const m = euler(rx, ry, i * 0.62); return { tube, accent: i === 2, pts: Array.from({ length: SEG + 1 }, (_, k) => { const a = (k / SEG) * Math.PI * 2; return apply(m, [Math.cos(a) * rad, Math.sin(a) * rad, 0]); }) }; });
    const KN = 220, km = euler(0, 0, 0.42);
    const knot = Array.from({ length: KN + 1 }, (_, k) => { const u = (k / KN) * Math.PI * 2 * 2, pp = 2, q = 3, cu = Math.cos((q / pp) * u), rr = 1.08 * 0.5 * (2 + cu); return apply(km, [rr * Math.cos(u) * 0.94, rr * Math.sin(u) * 1.18, 1.08 * 0.5 * Math.sin((q / pp) * u) * 0.94]); });
    const nodes = Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2; return [Math.cos(a) * 1.72, Math.sin(a * 2) * 0.28, Math.sin(a) * 1.18]; });

    // ── camera and light ──
    const S = Math.min(CW / 5.0, CH / 5.4), D = 7.2, cx = CW / 2, cy = CH * 0.47;
    const L = norm([-4.5, 8, 7]);
    const proj = (q) => { const k = D / (D - q[2]); return [cx + q[0] * S * k, cy - q[1] * S * k, k]; };

    // times
    const scatter = p.entrance !== "formed";
    // 0.004 s a bead at the source's 408, quickened when the move is short so the object still forms in time
    const nB = beads.length, build = Math.min(408 * 0.004, Math.max(0.6, end - at - 0.95)), per1 = build / nB;
    const ringA = at + 0.3, wireA = at + 0.2, nodeA = at + (scatter ? build * 0.8 : 0.4);
    const doneT = scatter ? at + build + 0.6 : at + 0.5;
    ctx.sfx(at, scatter ? "swell" : "whoosh.soft", 0.35);
    ctx.sfx(Math.min(doneT, end - 0.4), "pop.soft", 0.25);
    const leaveA = Math.max(doneT, end - 0.35);
    const items = [];

    return {
      draw(t) {
        const leave = ML.clamp((t - leaveA) / 0.3);
        // kept painted (opacity, not visibility) so the canvas is never on its first paint when it first shows
        layer.style.opacity = (t < at - 0.2 ? 0 : 1 - leave).toFixed(4);
        if (back) back.style.opacity = (ML.out(t, at - 0.2, at + 0.1) * (1 - ML.lin(t, end, end + 0.2))).toFixed(4);
        g.clearRect(0, 0, CW, CH);
        g.lineCap = "round"; g.lineJoin = "round"; g.lineWidth = 1; g.globalAlpha = 1; // no drawing state carried from the frame before
        const fadeIn = 1;
        // a formed entrance fades the whole painting in (faces are painted opaque: their shared edges stay identical frame to frame)
        cv.style.opacity = scatter ? "1" : ML.ease(t, at, at + 0.5).toFixed(4);
        const T = Math.max(0, t - at);
        const W = euler(-0.12 + 0.05 * Math.sin(T * 0.4), -0.45 + T * p.spin, -0.08);
        const coreM = euler(T * 0.35, T * 0.5, 0);
        const beadSpin = euler(0, -T * 0.08, 0);
        // floor shadow: a few stacked soft ellipses
        g.save(); g.globalAlpha = 0.05 * fadeIn; g.fillStyle = shade(C.ink, 1);
        for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(cx, cy + 2.35 * S, S * (1.9 - k * 0.3), S * (0.32 - k * 0.05), 0, 0, Math.PI * 2); g.fill(); }
        g.restore();
        items.length = 0;
        // beads
        for (const b of beads) {
          let q = [b.x, b.y, b.z], sc = 1, o = 1;
          if (scatter) {
            const a = at + b.order * per1, u = ML.out(t, a, a + 0.6); // each bead appears at its scattered point and travels the whole way home
            sc = t < a ? 0 : Math.max(0, Math.min(1.12, ML.back(t, a, a + 0.35, 1.7)));
            q = [b.sx + (b.x - b.sx) * u, b.sy + (b.y - b.sy) * u, b.sz + (b.z - b.sz) * u];
            o = ML.lin(t, a - 0.05, a + 0.1);
            if (sc <= 0.01) continue;
          }
          const w = apply(W, apply(beadSpin, q)), pr = proj(w);
          items.push({ z: w[2], k: 0, x: pr[0], y: pr[1], r: Math.min(sc, 1) * b.r * S * pr[2], c: b.alt ? PRE.alt : PRE.bead, o: o * fadeIn, d: w[2] });
        }
        // core faces
        const coreS = scatter ? 0.45 + 0.55 * ML.out(t, at, at + 1.2) : 1;
        const cw = coreV.map((q) => apply(W, apply(coreM, [q[0] * coreS, q[1] * coreS, q[2] * coreS])));
        for (const [a, b, c] of F) {
          const A = cw[a], B = cw[b], Cc = cw[c];
          const n = norm([(B[1] - A[1]) * (Cc[2] - A[2]) - (B[2] - A[2]) * (Cc[1] - A[1]), (B[2] - A[2]) * (Cc[0] - A[0]) - (B[0] - A[0]) * (Cc[2] - A[2]), (B[0] - A[0]) * (Cc[1] - A[1]) - (B[1] - A[1]) * (Cc[0] - A[0])]);
          if (n[2] <= 0) continue; // back faces
          items.push({ z: (A[2] + B[2] + Cc[2]) / 3, k: 1, pts: [proj(A), proj(B), proj(Cc)], l: 0.5 + 0.5 * Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]), o: 1 });
        }
        // rings (segments), scaled .6 → 1 and faded in
        rings.forEach((rg, i) => {
          const u = scatter ? ML.out(t, ringA + i * 0.08, ringA + i * 0.08 + 0.8) : 1, rs = 0.6 + 0.4 * u, rot = euler(0, 0, T * 0.04 * (i + 1));
          if (u <= 0) return;
          const P = rg.pts.map((q) => apply(W, apply(rot, [q[0] * rs, q[1] * rs, q[2] * rs])));
          for (let k = 0; k < SEG; k++) { const a = P[k], b = P[k + 1], pa = proj(a), pb = proj(b); items.push({ z: (a[2] + b[2]) / 2, k: 2, a: pa, b: pb, w: Math.max(1.2, rg.tube * 2 * S * pa[2]), c: rg.accent ? PRE.accent : PRE.ring, o: u * fadeIn, d: (a[2] + b[2]) / 2 }); }
        });
        // the knotted wire, drawing itself
        const wu = scatter ? ML.ease(t, wireA, wireA + 1.2) : 1, kn = Math.floor(KN * wu);
        if (kn > 0) {
          const P = knot.slice(0, kn + 1).map((q) => apply(W, q));
          for (let k = 0; k < kn; k++) { const a = P[k], b = P[k + 1], pa = proj(a), pb = proj(b); items.push({ z: (a[2] + b[2]) / 2, k: 2, a: pa, b: pb, w: Math.max(1.2, 0.018 * 2 * S * pa[2]), c: PRE.ring, o: fadeIn, d: (a[2] + b[2]) / 2 }); }
        }
        // nodes
        nodes.forEach((q, i) => { const a = nodeA + i * 0.06, sc = t < a ? 0 : Math.min(1, ML.back(t, a, a + 0.3, 1.8)); if (sc <= 0.01) return; const w = apply(W, q), pr = proj(w); items.push({ z: w[2] + 0.001, k: 0, x: pr[0], y: pr[1], r: 0.105 * sc * S * pr[2], c: PRE.accent, o: fadeIn, d: w[2] }); });

        items.sort((a, b) => a.z - b.z);
        for (const it of items) {
          g.globalAlpha = it.o;
          if (it.k === 0) {
            // a lit bead: depth-darkened body, a soft rim, a small highlight towards the key light
            const dk = 0.72 + 0.28 * ML.clamp((it.d + 2) / 4);
            g.fillStyle = shade(it.c, dk); g.beginPath(); g.arc(it.x, it.y, Math.max(0.6, it.r), 0, Math.PI * 2); g.fill();
            if (it.r > 1.6) { g.globalAlpha = it.o * 0.55; g.fillStyle = lift(it.c, 0.55); g.beginPath(); g.arc(it.x - it.r * 0.32, it.y - it.r * 0.36, it.r * 0.34, 0, Math.PI * 2); g.fill(); }
          } else if (it.k === 1) {
            g.fillStyle = shade(PRE.core, 0.55 + 0.5 * it.l); g.strokeStyle = g.fillStyle; g.lineWidth = 0.8;
            g.beginPath(); g.moveTo(it.pts[0][0], it.pts[0][1]); g.lineTo(it.pts[1][0], it.pts[1][1]); g.lineTo(it.pts[2][0], it.pts[2][1]); g.closePath(); g.fill(); g.stroke();
          } else {
            const dk = 0.7 + 0.3 * ML.clamp((it.d + 2) / 4);
            g.strokeStyle = shade(it.c, dk); g.lineWidth = it.w;
            g.beginPath(); g.moveTo(it.a[0], it.a[1]); g.lineTo(it.b[0], it.b[1]); g.stroke();
          }
        }
        g.globalAlpha = 1;
      },
    };
  },
});

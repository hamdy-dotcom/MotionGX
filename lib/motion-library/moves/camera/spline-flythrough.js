// Spline camera journey: the camera travels through a space between composed viewpoints along one curved path, slowing
// before turns and important views, its gaze and lens changing gently. From MengTo/Skills 3d-virtual-tour and the
// scroll-worlds conductor: keys { progress, position, look target, fov } (2–8 waypoints, fov 36–48); positions and
// look targets interpolated on centripetal Catmull-Rom (tension 0.42), sampled by arc length for even speed or timed
// per segment so it pauses at the stops; fov eased per segment. The conductor's progress smoothing,
// smooth → target at 1 − e^(−damping·t), is solved in closed form (a filtered piecewise-linear target: each change of
// slope adds k·(τ − (1 − e^(−λτ))/λ)), so it stays a pure function of t. Rules kept: the look target always lies ahead
// (never crosses the camera); the horizon stays level (world up, no roll); eye height floor-relative (1.6 m); one
// change at a time; keys before, within and after each narrow opening (an arch on every leg); each leg reveals a new
// spatial relation (approach, passage, reveal, scale: the last landmark towers). Tall frames step back along the view
// axis by nf·8.2 (world scaled), rise nf·1.1 and widen fov·(1 + 0.4·nf), nf = clamp((1.62 − aspect)/1.05, 0, 1). The
// world is painted per frame on a canvas (our own small projector: flat-shaded boxes, painter-sorted, near-clipped,
// fogged into the look's ground), seeded so the same t gives the same picture. RTL: the path bends the other way.
// Source: MengTo/Skills 3d/3d-virtual-tour + web-design/build-threejs-scroll-worlds/references/scroll-conductor.js (MIT).
ML.define({
  id: "camera.spline-flythrough",
  category: "camera",
  name: "Spline camera journey",
  does: "The camera travels smoothly through a space between composed viewpoints along a curved path, slowing before turns and important views, gaze and lens changing gently.",
  says: ["story", "flow", "calm", "step", "scale", "transition"],
  energy: 2,
  targets: ["scene", "stage"],
  duration: [3, 30],
  params: {
    waypoints: { type: "number", range: [2, 8], default: 4 },
    path: { type: "choice", options: ["straight", "curved", "s-curve"], default: "curved" },
    pacing: { type: "choice", options: ["even", "pause-at-stops"], default: "pause-at-stops" },
    lens: { type: "choice", options: ["fixed", "fov-breathe"], default: "fixed" },
    damping: { type: "number", range: [3, 8], default: 5.2 },
    tall_pullback: { type: "bool", default: true },
  },
  pairs: ["camera.scrubbed-flythrough-plate", "text-in.chapter-swap"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:3d/3d-virtual-tour", license: "MIT", note: "with web-design/build-threejs-scroll-worlds/references/scroll-conductor.js (damp 1 − e^(−5.2·dt), chapter progress); the canvas projector and world are our own" },
  setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    cv.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none;z-index:0`;
    host.insertBefore(cv, host.firstChild);
    // a scrim keeps the scene's headline legible over the plate: it holds through the headline band, wherever the look sets it
    const hb = f.head, hasHead = !!host.querySelector(".ml-head, .ml-title"), G = (k) => `color-mix(in srgb, var(--x-ground) ${k}%, transparent)`, edge = f.at === "bottom" ? ((H - hb.y) / H) * 100 : f.at === "side" ? ((hb.x + hb.w) / W) * 100 : ((hb.y + hb.h) / H) * 100;
    const scrim = document.createElement("div");
    scrim.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:0;background:linear-gradient(${f.at === "bottom" ? "0deg" : f.at === "side" ? "90deg" : "180deg"}, ${G(hasHead ? 80 : 35)} 0%, ${G(hasHead ? 80 : 20)} ${edge.toFixed(1)}%, transparent ${(edge + 14).toFixed(1)}%)`;
    cv.after(scrim);
    const g = cv.getContext("2d");
    // the look's colours as numbers (the painter mixes them with fog)
    const probe = document.createElement("span");
    host.append(probe);
    // read through a 1 px canvas, so any colour syntax a look uses (hex, color-mix, oklch) comes back as sRGB numbers
    const px = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    const rgbOf = (v) => { probe.style.color = `var(${v})`; px.fillStyle = getComputedStyle(probe).color; px.fillRect(0, 0, 1, 1); return [...px.getImageData(0, 0, 1, 1).data].slice(0, 3); };
    const C = { ground: rgbOf("--x-ground"), panel: rgbOf("--x-panel"), panel2: rgbOf("--x-panel-2"), ink: rgbOf("--x-ink"), accent: rgbOf("--x-accent"), accent2: rgbOf("--x-accent-2"), dim: rgbOf("--x-dim") };
    probe.remove();
    const mixC = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
    const css = (c, a = 1) => `rgba(${c[0].toFixed(0)},${c[1].toFixed(0)},${c[2].toFixed(0)},${a})`;

    // ── vectors ──
    const V = (x, y, z) => ({ x, y, z });
    const add = (a, b) => V(a.x + b.x, a.y + b.y, a.z + b.z), sub = (a, b) => V(a.x - b.x, a.y - b.y, a.z - b.z), mul = (a, k) => V(a.x * k, a.y * k, a.z * k);
    const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z, len = (a) => Math.sqrt(dot(a, a)), norm = (a) => mul(a, 1 / (len(a) || 1));
    const cross = (a, b) => V(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);

    // ── the waypoints: positions along the path, eye height floor-relative ──
    // no more stops than the time can hold at a calm pace (one leg per 1.5 s at most)
    const N = Math.min(Math.round(ML.clamp(p.waypoints, 2, 8)), 2 + Math.floor(Math.max(0, end - 0.3 - at) / 1.5)), D = 14, mir = ctx.rtl ? -1 : 1, EYE = 1.6;
    const pos = [];
    for (let i = 0; i < N; i++) {
      const q = N > 1 ? i / (N - 1) : 0;
      let x = 0, z = i * D;
      if (p.path === "curved") { const th = q * 1.2, R = (D * (N - 1)) / 1.2; x = R * (1 - Math.cos(th)); z = R * Math.sin(th); }
      else if (p.path === "s-curve") x = Math.sin(q * Math.PI * 2) * D * 0.6;
      pos.push(V(x * mir, EYE + (i % 2 ? 0.25 : 0), z));
    }
    // ── centripetal Catmull-Rom (three.js CubicPoly, non-uniform), tension 0.42 on the tangents ──
    const TENSION = 0.42;
    const spline = (pts) => {
      const P = [sub(mul(pts[0], 2), pts[1]), ...pts, sub(mul(pts[pts.length - 1], 2), pts[pts.length - 2])];
      const segs = [];
      for (let i = 1; i < P.length - 2; i++) {
        const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
        let d01 = Math.pow(len(sub(p0, p1)), 0.5), d12 = Math.pow(len(sub(p1, p2)), 0.5), d23 = Math.pow(len(sub(p2, p3)), 0.5);
        if (d12 < 1e-4) d12 = 1; if (d01 < 1e-4) d01 = d12; if (d23 < 1e-4) d23 = d12;
        const poly = (a, b, c, d) => {
          let t1 = (b - a) / d01 - (c - a) / (d01 + d12) + (c - b) / d12, t2 = (c - b) / d12 - (d - b) / (d12 + d23) + (d - c) / d23;
          t1 *= d12 * (TENSION / 0.5); t2 *= d12 * (TENSION / 0.5);
          const c0 = b, c1 = t1, c2 = -3 * b + 3 * c - 2 * t1 - t2, c3 = 2 * b - 2 * c + t1 + t2;
          return (u) => c0 + c1 * u + c2 * u * u + c3 * u * u * u;
        };
        const fx = poly(p0.x, p1.x, p2.x, p3.x), fy = poly(p0.y, p1.y, p2.y, p3.y), fz = poly(p0.z, p1.z, p2.z, p3.z);
        segs.push((u) => V(fx(u), fy(u), fz(u)));
      }
      return segs;
    };
    // each waypoint's view: a landmark ahead and to one side (the gaze always ahead of the camera)
    const fwdAt = (i) => norm(sub(pos[Math.min(N - 1, i + 1)], pos[Math.max(0, i - 1)]));
    const sideOf = (fw) => norm(cross(fw, V(0, 1, 0)));
    const looks = [], marks = [];
    for (let i = 0; i < N; i++) {
      const fw = N > 1 ? fwdAt(i) : V(0, 0, 1), sd = sideOf(fw), side = (i % 2 ? 1 : -1) * mir;
      const last = i === N - 1;
      const m = add(add(pos[i], mul(fw, last ? D * 1.6 : D * 0.6)), mul(sd, last ? 0 : side * D * 0.5));
      marks.push({ c: V(m.x, 0, m.z), w: last ? 4.2 : 2.4, h: last ? 17 : 6 + ML.rnd(i, 3) * 4, accent: true });
      looks.push(V(m.x, last ? 4.2 : 2.3, m.z));
    }
    const posS = N > 1 ? spline(pos) : [() => pos[0]];
    const lookS = N > 1 ? spline(looks) : [() => looks[0]];
    const FOVS = p.lens === "fov-breathe" ? [40, 46, 38, 44, 37, 45, 39, 48] : [42];
    const fovOf = (i) => ML.clamp(FOVS[i % FOVS.length], 36, 48);
    // arc length per segment (for even speed and for timing within a segment)
    const S = 64, segLen = [], segCum = [];
    posS.forEach((fn) => { const c = [0]; let prev = fn(0); for (let k = 1; k <= S; k++) { const q = fn(k / S); c.push(c[k - 1] + len(sub(q, prev))); prev = q; } segCum.push(c); segLen.push(c[S]); });
    const totalLen = segLen.reduce((a, b) => a + b, 0) || 1;
    const uOfLen = (i, l) => { const c = segCum[i]; let k = 1; while (k < S && c[k] < l) k++; const a = c[k - 1], b = c[k]; return (k - 1 + (b > a ? (l - a) / (b - a) : 0)) / S; };

    // ── the world: arches on every leg (passages), landmarks, seeded blocks clear of the path ──
    const boxes = [];
    for (const m of marks) boxes.push({ c: m.c, w: m.w, d: m.w, h: m.h, col: C.accent, top: C.accent2 });
    const path = [];
    posS.forEach((fn) => { for (let k = 0; k <= 16; k++) path.push(fn(k / 16)); });
    posS.forEach((fn, arch) => {
      if (N < 2) return;
      const mid = fn(0.5), tg = norm(sub(fn(0.55), fn(0.45))), sd = sideOf(tg), half = 2.6;
      for (const s of [-1, 1]) { const c = add(mid, mul(sd, s * half)); boxes.push({ c: V(c.x, 0, c.z), w: 0.8, d: 0.8, h: 5, col: C.panel, top: C.panel2, yaw: Math.atan2(tg.x, tg.z), arch }); }
      boxes.push({ c: V(mid.x, 5, mid.z), w: half * 2 + 0.8, d: 0.8, h: 0.8, col: C.panel, top: C.panel2, yaw: Math.atan2(tg.x, tg.z), arch });
    });
    const minX = Math.min(...pos.map((q) => q.x), ...looks.map((q) => q.x)) - 30, maxX = Math.max(...pos.map((q) => q.x), ...looks.map((q) => q.x)) + 30;
    const minZ = -20, maxZ = Math.max(...pos.map((q) => q.z), ...looks.map((q) => q.z)) + 40;
    for (let i = 0, n = 0; n < 130 && i < 1500; i++) {
      const x = minX + ML.rnd(i, 1) * (maxX - minX), z = minZ + ML.rnd(i, 2) * (maxZ - minZ);
      if (path.some((q) => Math.hypot(q.x - x, q.z - z) < 5.5)) continue;
      if (marks.some((m) => Math.hypot(m.c.x - x, m.c.z - z) < 4)) continue;
      const w = 1 + ML.rnd(i, 4) * 2.4;
      boxes.push({ c: V(x, 0, z), w, d: w * (0.7 + ML.rnd(i, 5) * 0.6), h: 0.6 + ML.rnd(i, 6) * 4.5, col: ML.rnd(i, 7) < 0.15 ? C.accent2 : C.panel, top: C.panel2 });
      n++;
    }
    const LIGHT = norm(V(-0.5 * mir, 0.8, -0.35));

    // ── time: the target progress (waypoint units) and its closed-form damped follow ──
    const t0 = at, t1 = Math.max(at + 1, end - 0.3);
    const knots = []; // [t, v] piecewise-linear target
    if (N < 2) knots.push([t0, 0], [t1, 0]);
    else if (p.pacing === "even") knots.push([t0, 0], [t1, N - 1]);
    else {
      const slot = (t1 - t0) / (N - 1);
      knots.push([t0, 0]);
      for (let i = 0; i < N - 1; i++) { knots.push([t0 + slot * i + slot * 0.7, i + 1]); knots.push([t0 + slot * (i + 1), i + 1]); }
    }
    const kinks = [];
    for (let j = 0; j < knots.length; j++) {
      const sIn = j > 0 ? (knots[j][1] - knots[j - 1][1]) / Math.max(1e-6, knots[j][0] - knots[j - 1][0]) : 0;
      const sOut = j < knots.length - 1 ? (knots[j + 1][1] - knots[j][1]) / Math.max(1e-6, knots[j + 1][0] - knots[j][0]) : 0;
      if (Math.abs(sOut - sIn) > 1e-9) kinks.push([knots[j][0], sOut - sIn]);
    }
    const lam = ML.clamp(p.damping, 3, 8);
    const R = (tau) => (tau <= 0 ? 0 : tau - (1 - Math.exp(-lam * tau)) / lam);
    const progress = (t) => ML.clamp(kinks.reduce((s, [tk, dk]) => s + dk * R(t - tk), 0), 0, Math.max(0, N - 1));
    for (let i = 0; i < N - 1; i++) {
      const ts = p.pacing === "even" ? t0 + ((t1 - t0) * i) / (N - 1) : t0 + ((t1 - t0) / (N - 1)) * i;
      ctx.sfx(ts + 0.05, "whoosh.soft", 0.14);
    }
    const sstep = (x) => x * x * (3 - 2 * x);
    const aspect = W / H, nf = p.tall_pullback ? ML.clamp((1.62 - aspect) / 1.05, 0, 1) : 0;
    const camAt = (t) => {
      const pr = progress(t);
      let i, u;
      if (N < 2) { i = 0; u = 0; }
      else if (p.pacing === "even") {
        let l = (pr / (N - 1)) * totalLen; i = 0;
        while (i < N - 2 && l > segLen[i]) { l -= segLen[i]; i++; }
        u = uOfLen(i, Math.min(l, segLen[i]));
      } else { i = Math.min(N - 2, Math.floor(pr)); u = uOfLen(i, (pr - i) * segLen[i]); }
      let eye = posS[i](u), look = lookS[i](u);
      const fov = N < 2 ? fovOf(0) : fovOf(i) + (fovOf(i + 1) - fovOf(i)) * sstep(ML.clamp(u));
      // the gaze stays ahead: never let the look target come within 3 m of the eye or fall behind it
      let fw = sub(look, eye);
      const tg = N < 2 ? V(0, 0, 1) : norm(sub(posS[i](Math.min(1, u + 0.02)), posS[i](Math.max(0, u - 0.02))));
      // (blended in, never switched: a hard switch would pop the view in one frame)
      const keep = sstep(Math.min(ML.clamp((len(fw) - 3) / 3), ML.clamp((dot(norm(fw), tg) - 0.2) / 0.35)));
      if (keep < 1) { const safe = add(eye, add(mul(tg, 6), mul(norm(fw), 2))); look = add(mul(safe, 1 - keep), mul(look, keep)); fw = sub(look, eye); }
      const dir = norm(fw);
      // tall frames: step back along the view axis, rise, widen
      eye = add(sub(eye, mul(dir, nf * 8.2 * (D / 24))), V(0, nf * 1.1, 0));
      look = add(look, V(0, nf * 1.1, 0));
      return { eye, look, fov: fov * (1 + 0.4 * nf) };
    };

    // the eye's real path (tall frames step off the spline) keeps clear of everything: a box it would pass through or
    // brush against goes (an arch goes whole), so a wall never fills the frame for a flash
    const eyes = [];
    for (let i = 0, n = Math.min(900, Math.ceil((t1 - t0 + 1.2) * 40)); i <= n; i++) eyes.push(camAt(t0 + (i / n) * (t1 - t0 + 1.2)).eye);
    const CLEAR = 1.6;
    const hits = (b) => eyes.some((q) => {
      if (q.y > b.c.y + b.h + 0.6 || q.y < b.c.y - 0.6) return false;
      const dx = q.x - b.c.x, dz = q.z - b.c.z, cy = Math.cos(b.yaw || 0), sy = Math.sin(b.yaw || 0);
      return Math.abs(dx * cy - dz * sy) < b.w / 2 + CLEAR && Math.abs(dx * sy + dz * cy) < b.d / 2 + CLEAR;
    });
    const gone = new Set(boxes.filter((b) => b.arch != null && hits(b)).map((b) => b.arch));
    const solid = boxes.filter((b) => (b.arch != null ? !gone.has(b.arch) : !hits(b)));
    // faces of every box (world space), once
    const faces = [];
    for (const b of solid) {
      const cy = Math.cos(b.yaw || 0), sy = Math.sin(b.yaw || 0);
      const P = (dx, dy, dz) => V(b.c.x + dx * cy + dz * sy, b.c.y + dy, b.c.z - dx * sy + dz * cy);
      const hw = b.w / 2, hd = b.d / 2, h = b.h;
      const v = [P(-hw, 0, -hd), P(hw, 0, -hd), P(hw, 0, hd), P(-hw, 0, hd), P(-hw, h, -hd), P(hw, h, -hd), P(hw, h, hd), P(-hw, h, hd)];
      const quads = [[4, 5, 6, 7, "top"], [0, 1, 5, 4, "s"], [1, 2, 6, 5, "s"], [2, 3, 7, 6, "s"], [3, 0, 4, 7, "s"]];
      for (const [a, bb, c, d, kind] of quads) {
        const pts = [v[a], v[bb], v[c], v[d]];
        const nrm = norm(cross(sub(pts[1], pts[0]), sub(pts[3], pts[0])));
        const n2 = dot(nrm, sub(pts[0], b.c)) < 0 && kind !== "top" ? mul(nrm, -1) : kind === "top" ? V(0, 1, 0) : nrm;
        const ctr = mul(add(add(pts[0], pts[1]), add(pts[2], pts[3])), 0.25);
        faces.push({ pts, n: n2, ctr, col: kind === "top" ? b.top : b.col, top: kind === "top" });
      }
    }
    const NEAR = 0.3, FAR = 90;
    const paint = (t) => {
      const cam = camAt(t);
      const fwd = norm(sub(cam.look, cam.eye)), right = norm(cross(fwd, V(0, 1, 0))), up = cross(right, fwd);
      const F = H / 2 / Math.tan(((cam.fov * Math.PI) / 180) / 2);
      const toCam = (q) => { const d = sub(q, cam.eye); return V(dot(d, right), dot(d, up), dot(d, fwd)); };
      const scr = (v) => [W / 2 + (v.x * F) / v.z, H / 2 - (v.y * F) / v.z];
      // sky and floor split at the horizon (a far point straight ahead at eye height)
      const hz = toCam(add(cam.eye, mul(norm(V(fwd.x, 0, fwd.z)), 1e4)));
      const hy = ML.clamp(scr(hz)[1], -H, 2 * H);
      let gr = g.createLinearGradient(0, 0, 0, Math.max(1, hy));
      gr.addColorStop(0, css(C.ground)); gr.addColorStop(1, css(mixC(C.panel2, C.accent2, 0.18)));
      g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(0, 0, W, H);
      gr = g.createLinearGradient(0, hy, 0, H);
      gr.addColorStop(0, css(mixC(C.panel2, C.ground, 0.5))); gr.addColorStop(1, css(C.panel2));
      g.fillStyle = gr; g.fillRect(0, Math.max(0, hy), W, H - Math.max(0, hy));
      // the floor grid around the eye, clipped in front of the camera, fading out with distance
      g.lineWidth = Math.max(1, Math.min(W, H) / 900); g.strokeStyle = css(C.ink);
      const seg = (a, b) => {
        let A = toCam(a), B = toCam(b);
        if (A.z < NEAR && B.z < NEAR) return;
        if (A.z < NEAR) { const k = (NEAR - A.z) / (B.z - A.z); A = add(A, mul(sub(B, A), k)); }
        if (B.z < NEAR) { const k = (NEAR - B.z) / (A.z - B.z); B = add(B, mul(sub(A, B), k)); }
        const pa = scr(A), pb = scr(B);
        g.globalAlpha = 0.16 * (1 - ML.clamp(Math.min(A.z, B.z) / 60));
        g.beginPath(); g.moveTo(pa[0], pa[1]); g.lineTo(pb[0], pb[1]); g.stroke();
      };
      const GS = 3, ex = Math.floor(cam.eye.x / GS) * GS, ez = Math.floor(cam.eye.z / GS) * GS, RG = 60;
      for (let x = ex - RG; x <= ex + RG; x += GS) seg(V(x, 0, ez - RG), V(x, 0, ez + RG));
      for (let z = ez - RG; z <= ez + RG; z += GS) seg(V(ex - RG, 0, z), V(ex + RG, 0, z));
      // faces: back-face culled, near-clipped, painter-sorted far to near, flat-shaded, fogged
      const vis = [];
      for (const fc of faces) {
        if (dot(fc.n, sub(cam.eye, fc.ctr)) <= 0) continue;
        const cz = dot(sub(fc.ctr, cam.eye), fwd);
        if (cz < -3 || cz > FAR) continue;
        let poly = fc.pts.map(toCam);
        if (poly.every((v) => v.z < NEAR)) continue;
        if (poly.some((v) => v.z < NEAR)) {
          const out = [];
          for (let k = 0; k < poly.length; k++) {
            const A = poly[k], B = poly[(k + 1) % poly.length];
            if (A.z >= NEAR) out.push(A);
            if ((A.z >= NEAR) !== (B.z >= NEAR)) out.push(add(A, mul(sub(B, A), (NEAR - A.z) / (B.z - A.z))));
          }
          poly = out;
        }
        if (poly.length < 3) continue;
        vis.push({ fc, poly, z: len(sub(fc.ctr, cam.eye)) });
      }
      vis.sort((a, b) => b.z - a.z);
      g.globalAlpha = 1;
      for (const { fc, poly, z } of vis) {
        const shade = fc.top ? 1 : 0.62 + 0.38 * Math.max(0, dot(fc.n, LIGHT));
        let c = mixC(C.ink, fc.col, 0.35 + 0.65 * shade);
        c = mixC(c, C.ground, 0.85 * Math.pow(ML.clamp(z / FAR), 0.8));
        g.fillStyle = css(c);
        g.strokeStyle = css(mixC(c, C.ink, 0.12));
        g.beginPath();
        poly.forEach((v, k) => { const s = scr(v); k ? g.lineTo(s[0], s[1]) : g.moveTo(s[0], s[1]); });
        g.closePath(); g.fill(); g.stroke();
      }
    };
    return { draw: paint };
  },
});

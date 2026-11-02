// Low-poly wireframe mesh grows node by node: a network of thin lines and dots builds itself upward from one stem into
// a full low-poly shape (a tree, a brain, a globe, or the target logo's own silhouette) while faceted shards fly in and
// snap together into its trunk. The mesh is a seeded Delaunay triangulation (Bowyer-Watson) of ~60–90 jittered points
// inside the silhouette (plus points on its rim), long or outside triangles dropped. Nodes are ordered by distance from
// the root (bottom centre): each appears (r 1.5 px at 1080-scale ×1.8, 90 %) at d / maxD × grow_time; each edge draws
// from its earlier node to its later one over 0.25 s (linear) as the earlier lands; lines 0.75 px at 45 %; one in eight
// triangles fills with an 8–15 % facet once its corners are in. Shards: 3–5 flat polygons fly up from 60–120 px below,
// turning 90–180°, and snap into place in 0.4 s (power3.out) 0.3 s apart. A dark ground with a faint vignette (mixed
// from the look's ink and accent) unless `backdrop` is off; holds with nodes twinkling (0.6–1, sine, seeded phase).
// Painted on a 2D canvas from t every frame. With shape "logo" the silhouette is sampled from the target itself, and
// when the mesh sits on the target the real logo resolves in at the end.
// Source: prompt-motion tdinh-me-use-this-prompt-and (reference only) — rebuilt as our own code.
ML.define({
  id: "element.wireframe-mesh-grow",
  category: "element",
  name: "Low-poly wireframe mesh grows node by node",
  does: "A network of thin lines and dots builds itself upward from a single stem into a full low-poly shape (a tree/brain), while faceted shards fly in to form its trunk.",
  says: ["growth", "tech", "connection"],
  energy: 3,
  targets: ["shape", "logo"],
  duration: [2.5, 5],
  params: {
    shape: { type: "choice", options: ["tree", "brain", "globe", "logo"], default: "tree" },
    shards: { type: "bool", default: true },
    grow_time: { type: "number", range: [1.5, 3], default: 2.2, unit: "s" },
    backdrop: { type: "bool", default: true },
  },
  pairs: ["camera.slow-push", "text-in.punchline"],
  avoid: ["playful", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:tdinh-me-use-this-prompt-and", license: "reference", note: "our own rebuild: seeded Delaunay mesh, distance-ordered node / edge growth, trunk shards" },
  async setup(ctx) {
    const { el, p, at, end, f } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const own = el && el !== ctx.stage ? el : null;
    const ob = own ? ctx.box(own) : null;
    const onTarget = ob && ob.w > f.W * 0.3 && ob.h > f.H * 0.18;
    const R = onTarget ? ob : f.pic;
    const W = Math.round(R.w), H = Math.round(R.h);
    const U = (Math.min(f.W, f.H) / 1080) * 1.8;
    // ── colours ──
    const probe = doc.createElement("div"); probe.style.display = "none"; host.append(probe);
    const rgb = (css) => { probe.style.color = ""; probe.style.color = css; const s = getComputedStyle(probe).color, n = (s.match(/-?[\d.]+/g) || [0, 0, 0]).map(Number); return (s.startsWith("color(") ? n.slice(0, 3).map((v) => v * 255) : n.slice(0, 3)).map(Math.round); };
    const bd = p.backdrop;
    const cGround = rgb("color-mix(in srgb, var(--x-ink) 90%, var(--x-accent))"), cDeep = rgb("color-mix(in srgb, var(--x-ink) 96%, black)");
    const cLine = rgb(bd ? "var(--x-panel)" : "var(--x-accent)"), cNode = rgb(bd ? "var(--x-panel)" : "var(--x-ink)");
    const radius = parseFloat(getComputedStyle(probe).getPropertyValue("--x-radius")) || 24;
    probe.remove();
    const rgba = (c, a) => `rgba(${c.join(",")},${ML.clamp(a).toFixed(3)})`;

    // ── the silhouette, in mesh units u ∈ [−1, 1] (x), v ∈ [−1, 1] (y, down) ──
    const circ = (u, v, x, y, r) => (u - x) ** 2 + (v - y) ** 2 < r * r;
    let inside, root, trunk;
    const shape = p.shape;
    if (shape === "tree") {
      const C = [[0, -0.28, 0.5], [-0.42, -0.1, 0.36], [0.42, -0.1, 0.36], [-0.26, -0.58, 0.34], [0.26, -0.58, 0.34], [0, -0.72, 0.28], [-0.62, -0.38, 0.24], [0.62, -0.38, 0.24]];
      inside = (u, v) => C.some(([x, y, r]) => circ(u, v, x, y, r)) && v < 0.24;
      root = [0, 0.24];
      trunk = [[-0.1, 0.22], [0.1, 0.22], [0.13, 0.96], [-0.13, 0.96]];
    } else if (shape === "brain") {
      inside = (u, v) => { const a = Math.atan2(v + 0.15, u), rr = 1 + 0.06 * Math.sin(7 * a) + 0.03 * Math.sin(13 * a + 1); return (u / 0.95) ** 2 + ((v + 0.15) / 0.66) ** 2 < rr * rr && !(Math.abs(u) < 0.025 && v < -0.25); };
      root = [0, 0.5];
      trunk = [[-0.07, 0.42], [0.09, 0.42], [0.08, 0.92], [-0.06, 0.92]];
    } else {
      inside = (u, v) => circ(u, v, 0, -0.12, 0.8);
      root = [0, 0.68];
      trunk = [[-0.08, 0.6], [0.08, 0.6], [0.16, 0.95], [-0.16, 0.95]];
    }
    // the target's own silhouette: rasterised once, sampled as a mask
    if (shape === "logo" && own) {
      try {
        const N = 160, cvm = doc.createElement("canvas"); cvm.width = N; cvm.height = N;
        const gm = cvm.getContext("2d");
        const img = new Image();
        let src = null;
        if (own.tagName === "IMG") src = own.currentSrc || own.src;
        else if (own.tagName.toLowerCase() === "svg") src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(own));
        if (src) { img.src = src; await img.decode(); const k = Math.min(N / img.width, (N * 0.85) / img.height) * 0.98; gm.drawImage(img, (N - img.width * k) / 2, (N * 0.85 - img.height * k) / 2, img.width * k, img.height * k); }
        else { const cs = getComputedStyle(own); gm.font = `${cs.fontWeight} ${N * 0.6}px ${cs.fontFamily}`; gm.textAlign = "center"; gm.textBaseline = "middle"; const tw = gm.measureText(own.textContent.trim()).width; if (tw > N) gm.font = `${cs.fontWeight} ${(N * 0.6 * N) / tw}px ${cs.fontFamily}`; gm.fillText(own.textContent.trim(), N / 2, N * 0.42); }
        const a = gm.getImageData(0, 0, N, N).data;
        let lo = 0, hi = 0, any = false;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (a[(y * N + x) * 4 + 3] > 100) { any = true; hi = Math.max(hi, y); }
        if (any) {
          inside = (u, v) => { const x = Math.round(((u + 1) / 2) * (N - 1)), y = Math.round(((v + 1) / 2) * (N - 1)); return x >= 0 && y >= 0 && x < N && y < N && a[(y * N + x) * 4 + 3] > 100; };
          const vb = (hi / (N - 1)) * 2 - 1;
          root = [0, vb];
          trunk = [[-0.07, vb - 0.02], [0.07, vb - 0.02], [0.12, Math.min(0.97, vb + 0.25)], [-0.12, Math.min(0.97, vb + 0.25)]];
          lo = 0;
        }
      } catch (e) { /* the globe stands in */ }
    }
    // ── points: jittered grid inside + rim points ──
    let cnt = 0; for (let i = 0; i < 40; i++) for (let j = 0; j < 40; j++) if (inside(-1 + (i + 0.5) / 20, -1 + (j + 0.5) / 20)) cnt++;
    const area = (cnt / 1600) * 4, cell = Math.sqrt(area / 64);
    const P = [];
    for (let gx = -1; gx <= 1; gx += cell) for (let gy = -1; gy <= 1; gy += cell) {
      const k = P.length + Math.round(gx * 1000) * 7 + Math.round(gy * 1000);
      const u = gx + (ML.rnd(k, 1) - 0.5) * cell * 0.7, v = gy + (ML.rnd(k, 2) - 0.5) * cell * 0.7;
      if (inside(u, v)) P.push([u, v]);
    }
    // rim: walk rays from the centroid to the silhouette's edge
    const cx0 = P.reduce((s, q) => s + q[0], 0) / Math.max(1, P.length), cy0 = P.reduce((s, q) => s + q[1], 0) / Math.max(1, P.length);
    const rimN = Math.round(ML.clamp(18 / cell / 6, 14, 26));
    for (let i = 0; i < rimN; i++) {
      const a = (i / rimN) * Math.PI * 2 + 0.2, dx = Math.cos(a), dy = Math.sin(a);
      let lo = 0, hi = 0;
      for (let s = 0.02; s < 2.2; s += 0.02) { if (inside(cx0 + dx * s, cy0 + dy * s)) hi = s; else if (hi > 0) break; }
      if (hi > cell * 0.6) { lo = hi - 0.01; const q = [cx0 + dx * lo, cy0 + dy * lo]; if (!P.some((r) => Math.hypot(r[0] - q[0], r[1] - q[1]) < cell * 0.45)) P.push(q); }
    }
    // the root node
    let ri = 0; P.forEach((q, i) => { if (Math.hypot(q[0] - root[0], q[1] - root[1]) < Math.hypot(P[ri][0] - root[0], P[ri][1] - root[1])) ri = i; });
    // ── Delaunay (Bowyer-Watson) ──
    const pts = P.map((q) => [q[0], q[1]]);
    const big = 50, n0 = pts.length;
    pts.push([-big, -big], [big, -big], [0, big]);
    let tris = [[n0, n0 + 1, n0 + 2]];
    const cc = (t) => { const [a, b, c] = t.map((i) => pts[i]), d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1])); const ux = ((a[0] ** 2 + a[1] ** 2) * (b[1] - c[1]) + (b[0] ** 2 + b[1] ** 2) * (c[1] - a[1]) + (c[0] ** 2 + c[1] ** 2) * (a[1] - b[1])) / d, uy = ((a[0] ** 2 + a[1] ** 2) * (c[0] - b[0]) + (b[0] ** 2 + b[1] ** 2) * (a[0] - c[0]) + (c[0] ** 2 + c[1] ** 2) * (b[0] - a[0])) / d; return [ux, uy, (a[0] - ux) ** 2 + (a[1] - uy) ** 2]; };
    for (let i = 0; i < n0; i++) {
      const q = pts[i], bad = [], keep = [];
      for (const t of tris) { const [ux, uy, r2] = t.c || (t.c = cc(t)); ((q[0] - ux) ** 2 + (q[1] - uy) ** 2 < r2 ? bad : keep).push(t); }
      const edges = new Map();
      for (const t of bad) for (const [a, b] of [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]]) { const k = a < b ? a + "_" + b : b + "_" + a; edges.set(k, edges.has(k) ? null : [a, b]); }
      tris = keep;
      for (const e of edges.values()) if (e) tris.push([e[0], e[1], i]);
    }
    const maxE = cell * 2.3;
    tris = tris.filter((t) => t.every((i) => i < n0) && inside((pts[t[0]][0] + pts[t[1]][0] + pts[t[2]][0]) / 3, (pts[t[0]][1] + pts[t[1]][1] + pts[t[2]][1]) / 3) && [[0, 1], [1, 2], [2, 0]].every(([a, b]) => Math.hypot(pts[t[a]][0] - pts[t[b]][0], pts[t[a]][1] - pts[t[b]][1]) < maxE));
    // ── timing: distance from the root ──
    const used = new Set(tris.flat());
    used.add(ri);
    const nodes = [...used];
    const dist = (i) => Math.hypot(pts[i][0] - pts[ri][0], pts[i][1] - pts[ri][1]);
    const maxD = Math.max(...nodes.map(dist)) || 1;
    const nShards = p.shards ? 4 : 0;
    const t0 = at + (p.shards ? 0.35 : 0.05);
    const grow = Math.min(ML.clamp(p.grow_time, 1.5, 3), Math.max(1.2, end - t0 - 0.9));
    const tOf = new Map(nodes.map((i) => [i, t0 + (dist(i) / maxD) * grow]));
    const edgeSet = new Map();
    for (const t of tris) for (const [a, b] of [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]]) { const k = a < b ? a + "_" + b : b + "_" + a; if (!edgeSet.has(k)) edgeSet.set(k, tOf.get(a) <= tOf.get(b) ? [a, b] : [b, a]); }
    const edges = [...edgeSet.values()].map(([a, b]) => ({ a, b, t: tOf.get(a) }));
    const facets = tris.filter((t, i) => ML.rnd(i, 21) < 0.13).map((t, i) => ({ t, at: Math.max(...t.map((k) => tOf.get(k))) + 0.25, a: 0.08 + 0.07 * ML.rnd(i, 22) }));
    // shards: the trunk quad cut into pieces, each flying in from below
    const shards = [];
    if (nShards) {
      const [A, B, C, D] = trunk, lerp = (p1, p2, u) => [p1[0] + (p2[0] - p1[0]) * u, p1[1] + (p2[1] - p1[1]) * u];
      const cuts = [0, 0.3 + 0.08 * ML.rnd(1, 3), 0.62 + 0.08 * ML.rnd(2, 3), 1];
      for (let k = 0; k < 3; k++) {
        const l0 = lerp(A, D, cuts[k]), l1 = lerp(A, D, cuts[k + 1]), r0 = lerp(B, C, cuts[k] + (k ? 0.06 : 0)), r1 = lerp(B, C, Math.min(1, cuts[k + 1] + (k < 2 ? 0.06 : 0)));
        if (k === 1) { shards.push([l0, r0, l1]); shards.push([r0, r1, l1]); } else shards.push([l0, r0, r1, l1]);
      }
      shards.forEach((s, k) => { s.at = at + k * 0.3 * Math.min(1, (t0 + grow * 0.5 - at) / 1.2); s.dy = (60 + 60 * ML.rnd(k, 31)) * U * 0.55; s.rot = (90 + 90 * ML.rnd(k, 32)) * (ML.rnd(k, 33) < 0.5 ? -1 : 1); s.c = s.reduce((m, q) => [m[0] + q[0] / s.length, m[1] + q[1] / s.length], [0, 0]); });
    }
    // ── canvas ──
    const cv = doc.createElement("canvas");
    cv.width = W; cv.height = H;
    cv.style.cssText = `position:absolute;left:${R.x.toFixed(1)}px;top:${R.y.toFixed(1)}px;width:${W}px;height:${H}px;pointer-events:none;z-index:6;border-radius:${radius}px;`;
    host.append(cv);
    const g = cv.getContext("2d");
    const side = Math.min(W, H) * 0.86;
    const mx = (u) => W / 2 + (u * side) / 2; // symmetric shapes, and a logo keeps its own reading direction
    const my = (v) => H / 2 + (v * side) / 2;
    const power3 = (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), 4);
    const allIn = t0 + grow + 0.25;
    ctx.sfx(at, "swell", 0.35);
    shards.forEach((s) => ctx.sfx(s.at + 0.38, "snap", 0.2));
    ctx.sfx(allIn, "blip", 0.25);
    const resolve = shape === "logo" && onTarget;
    if (resolve) { own.style.position = own.style.position || "relative"; own.style.zIndex = "7"; }
    return {
      draw(t) {
        g.clearRect(0, 0, W, H);
        if (t < at) { cv.style.visibility = "hidden"; if (resolve) own.style.opacity = "1"; return; }
        cv.style.visibility = "visible";
        const e = ML.lin(t, at, at + 0.3), leave = 1 - ML.lin(t, end - 0.3, end);
        cv.style.opacity = (e * leave).toFixed(4);
        if (bd) {
          g.fillStyle = rgba(cGround, 1); g.fillRect(0, 0, W, H);
          const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.hypot(W, H) * 0.6);
          vg.addColorStop(0, rgba(cDeep, 0)); vg.addColorStop(1, rgba(cDeep, 0.55));
          g.fillStyle = vg; g.fillRect(0, 0, W, H);
        }
        const dim = resolve ? 1 - 0.65 * ML.ease(t, allIn + 0.2, allIn + 0.8) : 1;
        // facets
        for (const fc of facets) {
          const a = ML.lin(t, fc.at, fc.at + 0.3) * fc.a * dim;
          if (a <= 0) continue;
          g.beginPath(); fc.t.forEach((k, i) => (i ? g.lineTo(mx(pts[k][0]), my(pts[k][1])) : g.moveTo(mx(pts[k][0]), my(pts[k][1])))); g.closePath();
          g.fillStyle = rgba(cLine, a); g.fill();
        }
        // edges
        g.lineWidth = Math.max(0.75, 0.75 * U); g.strokeStyle = rgba(cLine, 0.45 * dim); g.lineCap = "round";
        g.beginPath();
        for (const ed of edges) {
          const u = ML.lin(t, ed.t, ed.t + 0.25);
          if (u <= 0) continue;
          const ax = mx(pts[ed.a][0]), ay = my(pts[ed.a][1]), bx = mx(pts[ed.b][0]), by = my(pts[ed.b][1]);
          g.moveTo(ax, ay); g.lineTo(ax + (bx - ax) * u, ay + (by - ay) * u);
        }
        g.stroke();
        // nodes (twinkling once in)
        for (const k of nodes) {
          const tk = tOf.get(k);
          if (t < tk) continue;
          const pop = ML.back(t, tk, tk + 0.18, 2);
          const tw = t > tk + 0.5 ? 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t * 3.4 + ML.rnd(k, 41) * 6.28)) : 1;
          g.beginPath(); g.arc(mx(pts[k][0]), my(pts[k][1]), Math.max(0.5, 1.5 * U * pop * (k === ri ? 1.6 : 1)), 0, Math.PI * 2);
          g.fillStyle = rgba(cNode, 0.9 * tw * dim); g.fill();
        }
        // shards
        for (const s of shards) {
          if (t < s.at) continue;
          const u = power3(t, s.at, s.at + 0.4), cx = mx(s.c[0]), cy = my(s.c[1]);
          g.save(); g.translate(cx, cy + (1 - u) * s.dy); g.rotate(((1 - u) * s.rot * Math.PI) / 180); g.globalAlpha = ML.lin(t, s.at, s.at + 0.1) * dim;
          g.beginPath(); s.forEach((q, i) => (i ? g.lineTo(mx(q[0]) - cx, my(q[1]) - cy) : g.moveTo(mx(q[0]) - cx, my(q[1]) - cy))); g.closePath();
          g.fillStyle = rgba(cNode, 0.92); g.fill();
          g.strokeStyle = rgba(cGround, 0.5); g.lineWidth = Math.max(0.75, 0.6 * U); g.stroke();
          g.restore();
        }
        if (resolve) own.style.opacity = ML.ease(t, allIn + 0.2, allIn + 0.8).toFixed(4);
      },
    };
  },
});

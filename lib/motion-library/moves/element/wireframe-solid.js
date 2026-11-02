// Glowing wireframe solid spin: a wireframe cube (or octahedron, icosahedron, a 3×3×3 lattice, or any vertex / edge
// list) in the accent colour tumbles in real perspective, near edges brighter than far ones, glowing softly.
// The source's canvas code, driven by t: τ = speed × (t − at); a = 1.1 τ about Y, b = 0.73 τ about X;
// x1 = x cos a − z sin a, z1 = x sin a + z cos a, y1 = y cos b − z1 sin b, z2 = y sin b + z1 cos b; p = 3.8 / (z2 + 5);
// screen = centre (w·.5, h·.48) + (x1, y1)·size·p, size = .24·min(w, h). Edges in the accent at 1.4 px (×1080-scale),
// shadowBlur `glow`, alpha .25 + .45·((za + zb + 4) / 8); vertex dots r 3.2 p, alpha .55 + .35·(z + 2) / 4.
// render "solid": faces painted back to front, lit ambient .8 + directional .8 (Lambert), edges over them.
// grow: the solid swells from 0.4 to 1.6 of the frame over its run (gizakdag's lattice shot). readout: a mono line of
// the two angles under it. Turns the other way in RTL.
// Source: MengTo/Skills web-design shared demo template, mode "object" (animation-systems, animation-on-scroll,
// blue-laser-clean-glass-layout, framed-tech-dark-border-gradient, tailwindcss demos; MIT) — ported; the lattice and
// grow from prompt-motion gizakdag-overthinking-a-film-by (reference only, our own code).
ML.define({
  id: "element.wireframe-solid",
  category: "element",
  name: "Glowing wireframe solid spin",
  does: "A wireframe cube (or other solid) in the accent colour tumbles in real perspective, near edges brighter than far ones, glowing softly.",
  says: ["tech", "precision", "scale"],
  energy: 2,
  targets: ["shape", "logo", "stage"],
  duration: [2, 10],
  params: {
    solid: { type: "choice", options: ["cube", "octahedron", "icosahedron", "lattice", "custom"], default: "cube" },
    speed: { type: "number", range: [0.2, 1], default: 0.48 },
    glow: { type: "number", range: [0, 16], default: 12, unit: "px" },
    render: { type: "choice", options: ["wire", "solid"], default: "wire" },
    grow: { type: "bool", default: false },
    readout: { type: "bool", default: false },
    mesh: { type: "text", default: "" },
  },
  pairs: ["data.live-value-tick", "camera.slow-push"],
  avoid: ["playful", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:agent-skills/web-design/animation-systems/demo/index.html", license: "MIT", note: "the shared demo template's canvas mode 'object' (8 vertices, 12 edges, a = τ·1.1, b = τ·.73, p = 3.8/(z+5)); lattice + grow after prompt-motion gizakdag (reference)" },
  setup(ctx) {
    const { el, p, at, end, f, rtl } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const isStage = !el || el === ctx.stage;
    // ── where: on a target it takes the target's place; on the stage it fills the frame behind the content ──
    let R;
    if (!el) R = f.pic;
    else if (isStage) R = { x: 0, y: 0, w: f.W, h: f.H };
    else { const b = ctx.box(el), s = Math.max(b.w, b.h, Math.min(f.W, f.H) * 0.3); R = { x: b.x + b.w / 2 - s / 2, y: b.y + b.h / 2 - s / 2, w: s, h: s }; }
    const W = Math.round(R.w), H = Math.round(R.h);
    const K = Math.min(f.W, f.H) / 1080;
    // ── the solid ──
    const phi = (1 + Math.sqrt(5)) / 2;
    const S = {
      cube: { v: [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], e: [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]], f: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 4, 7, 3]] },
      octahedron: { v: [[1.3, 0, 0], [-1.3, 0, 0], [0, 1.3, 0], [0, -1.3, 0], [0, 0, 1.3], [0, 0, -1.3]], e: [[0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 4], [4, 3], [3, 5], [5, 2]], f: [[0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2], [1, 4, 2], [1, 3, 4], [1, 5, 3], [1, 2, 5]] },
    };
    { // icosahedron: 12 vertices (0, ±1, ±φ) cycled, edges = pairs at the shortest distance, faces = mutually adjacent triples
      const v = [];
      for (const a of [-1, 1]) for (const b of [-1, 1]) { v.push([0, a, b * phi], [a, b * phi, 0], [b * phi, 0, a]); }
      const k = 1.25 / Math.hypot(1, phi), vv = v.map((q) => q.map((c) => c * k));
      const d = (i, j) => Math.hypot(vv[i][0] - vv[j][0], vv[i][1] - vv[j][1], vv[i][2] - vv[j][2]);
      const e = [], adj = new Set();
      for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) if (Math.abs(d(i, j) - 2 * k) < 1e-3) { e.push([i, j]); adj.add(i + "_" + j); }
      const fc = [];
      const has = (i, j) => adj.has(Math.min(i, j) + "_" + Math.max(i, j));
      for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) for (let l = j + 1; l < 12; l++) if (has(i, j) && has(j, l) && has(i, l)) {
        // wind it outward
        const [A, B, C] = [vv[i], vv[j], vv[l]], u = B.map((c, q) => c - A[q]), w = C.map((c, q) => c - A[q]);
        const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
        fc.push(n[0] * A[0] + n[1] * A[1] + n[2] * A[2] > 0 ? [i, j, l] : [i, l, j]);
      }
      S.icosahedron = { v: vv, e, f: fc };
    }
    { // lattice: a cube subdivided 3×3×3 (grid lines on every face and through it)
      const v = [], e = [], idx = (i, j, l) => i * 16 + j * 4 + l;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let l = 0; l < 4; l++) v.push([-1 + (2 * i) / 3, -1 + (2 * j) / 3, -1 + (2 * l) / 3]);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let l = 0; l < 4; l++) {
        const outer = (a) => a === 0 || a === 3;
        if (i < 3 && (outer(j) || outer(l))) e.push([idx(i, j, l), idx(i + 1, j, l)]);
        if (j < 3 && (outer(i) || outer(l))) e.push([idx(i, j, l), idx(i, j + 1, l)]);
        if (l < 3 && (outer(i) || outer(j))) e.push([idx(i, j, l), idx(i, j, l + 1)]);
      }
      S.lattice = { v, e, f: S.cube.f.map((q) => q.map((c) => idx(...S.cube.v[c].map((x) => (x < 0 ? 0 : 3))))), dots: false };
    }
    let M = S[p.solid] || S.cube;
    if (p.solid === "custom") {
      try { const m = JSON.parse(p.mesh || ""); if (Array.isArray(m.v) && Array.isArray(m.e)) M = { v: m.v, e: m.e, f: Array.isArray(m.f) ? m.f : [] }; } catch (e) { M = S.cube; }
    }
    // ── colours ──
    const probe = doc.createElement("div"); probe.style.display = "none"; host.append(probe);
    const rgb = (css) => { probe.style.color = ""; probe.style.color = css; const s = getComputedStyle(probe).color, n = (s.match(/-?[\d.]+/g) || [0, 0, 0]).map(Number); return (s.startsWith("color(") ? n.slice(0, 3).map((v) => v * 255) : n.slice(0, 3)).map(Math.round); };
    const acc = rgb("var(--x-accent)"), dark = rgb("var(--x-ink)");
    probe.remove();
    const rgba = (c, a) => `rgba(${c.map((v) => Math.round(ML.clamp(v, 0, 255))).join(",")},${ML.clamp(a).toFixed(3)})`;
    // ── canvas ──
    const cv = doc.createElement("canvas");
    cv.width = W; cv.height = H;
    cv.style.cssText = `position:absolute;left:${R.x.toFixed(1)}px;top:${R.y.toFixed(1)}px;width:${W}px;height:${H}px;pointer-events:none;z-index:${isStage && el ? 0 : 6};`;
    if (isStage && el) host.insertBefore(cv, host.firstChild); else host.append(cv);
    const g = cv.getContext("2d");
    // the readout
    let ro = null;
    if (p.readout) {
      ro = doc.createElement("div");
      ro.setAttribute("dir", "ltr");
      ro.style.cssText = `position:absolute;left:${R.x}px;width:${W}px;top:${(R.y + H * 0.86).toFixed(1)}px;text-align:center;font:var(--x-label-weight) ${Math.round(22 * K * 1.2)}px var(--x-mono-font);letter-spacing:var(--x-label-track);color:var(--x-dim);pointer-events:none;z-index:6;`;
      host.append(ro);
    }
    const hideEl = el && !isStage;
    const dir = rtl ? -1 : 1;
    const speed = ML.clamp(p.speed, 0.2, 1);
    const L = [0.35, -0.6, -0.72], Ln = Math.hypot(...L);
    ctx.sfx(at, "whoosh.soft", 0.25);
    return {
      draw(t) {
        g.clearRect(0, 0, W, H);
        if (t < at) { cv.style.visibility = "hidden"; if (ro) ro.style.visibility = "hidden"; if (hideEl) el.style.opacity = "1"; return; }
        cv.style.visibility = "visible";
        const fade = ML.ease(t, at, at + 0.4) * (1 - ML.ease(t, end - 0.3, end));
        cv.style.opacity = fade.toFixed(4);
        if (hideEl) el.style.opacity = (1 - ML.ease(t, at, at + 0.3)).toFixed(4);
        const tau = speed * (t - at);
        const a = dir * tau * 1.1, b = tau * 0.73;
        const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
        let size = Math.min(W, H) * 0.24;
        if (p.grow) { const frac = 0.4 + 1.2 * ML.ease(t, at, end); size = (Math.min(W, H) * frac) / (2 * 0.95); }
        const cx = W * 0.5, cy = H * 0.48;
        const pts = M.v.map(([x, y, z]) => {
          const x1 = x * ca - z * sa, z1 = x * sa + z * ca, y1 = y * cb - z1 * sb, z2 = y * sb + z1 * cb, pp = 3.8 / (z2 + 5);
          return { x: cx + x1 * size * pp, y: cy + y1 * size * pp, z: z2, p: pp, r: [x1, y1, z2] };
        });
        const glow = ML.clamp(p.glow, 0, 16) * K * 1.6;
        if (p.render === "solid" && M.f.length) {
          // faces back to front, Lambert: ambient .8 + directional .8 (scaled into the accent)
          const faces = M.f.map((fc) => {
            const A = pts[fc[0]].r, B = pts[fc[1]].r, C = pts[fc[2]].r, u = B.map((c, q) => c - A[q]), w = C.map((c, q) => c - A[q]);
            let n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]; const nl = Math.hypot(...n) || 1; n = n.map((c) => c / nl);
            const z = fc.reduce((s, k) => s + pts[k].z, 0) / fc.length;
            const ndl = Math.max(0, -(n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / Ln);
            return { fc, z, I: (0.8 + 0.8 * ndl) / 1.6 };
          }).sort((x, y) => y.z - x.z);
          g.shadowBlur = 0;
          for (const F of faces) {
            g.beginPath(); F.fc.forEach((k, i) => (i ? g.lineTo(pts[k].x, pts[k].y) : g.moveTo(pts[k].x, pts[k].y))); g.closePath();
            g.fillStyle = rgba(acc.map((c, q) => c * (0.45 + 0.55 * F.I) + dark[q] * (1 - F.I) * 0.25), 1); g.fill();
          }
        }
        g.strokeStyle = rgba(acc, 1); g.lineWidth = 1.4 * K * 1.6; g.lineCap = "round";
        g.shadowColor = rgba(acc, 1); g.shadowBlur = glow;
        for (const [i, j] of M.e) {
          g.globalAlpha = 0.25 + 0.45 * ((pts[i].z + pts[j].z + 4) / 8);
          g.beginPath(); g.moveTo(pts[i].x, pts[i].y); g.lineTo(pts[j].x, pts[j].y); g.stroke();
        }
        if (M.dots !== false) {
          g.fillStyle = rgba(acc, 1);
          for (const q of pts) { g.globalAlpha = 0.55 + (0.35 * (q.z + 2)) / 4; g.beginPath(); g.arc(q.x, q.y, 3.2 * q.p * K * 1.6, 0, Math.PI * 2); g.fill(); }
        }
        g.globalAlpha = 1; g.shadowBlur = 0;
        if (ro) {
          ro.style.visibility = "visible"; ro.style.opacity = fade.toFixed(4);
          const deg = (x) => ((((x * 180) / Math.PI) % 360) + 360) % 360;
          ro.textContent = `Y ${deg(a).toFixed(1).padStart(5, "0")}°  ·  X ${deg(b).toFixed(1).padStart(5, "0")}°`;
        }
      },
    };
  },
});

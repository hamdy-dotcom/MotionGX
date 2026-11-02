// Iso orbit: a clean isometric model (a campus of blocks, or a cluster of towers) slowly rotates under an orthographic
// camera at `elevation` (25–45°) while the camera creeps closer. Over the whole shot the azimuth turns `azimuth` degrees
// on sine.inOut (so it never stops dead) and the zoom runs 1 → zoom_amount (in), back (out) or holds (none). Matte
// panel / panel-2 materials with face shading, an ambient-occlusion darkening at each wall's foot, soft ground shadows,
// and fog towards the ground colour with distance so the far edges dissolve. The parts animate on their own timeline:
// blocks drop into place staggered, rooftop units and panels follow, and flows of dots run along the ground paths.
// Painted on a canvas every frame from t (own projection, painter's order): vectors, so the push-in never softens.
// RTL: the orbit's direction mirrors.
// Source: prompt-motion sayan-shanky-one-prompt-to-claude + mdaman010-one-prompt-to-claude (reference only: our own rebuild).
ML.define({
  id: "camera.iso-orbit",
  category: "camera",
  name: "Slow orbit around an isometric model",
  does: "A clean 3D isometric model (building, machine) slowly rotates under the camera and creeps closer while its parts keep animating.",
  says: ["tech", "scale", "calm", "story"],
  energy: 2,
  targets: ["scene", "stage"],
  duration: [3, 10],
  params: {
    direction: { type: "choice", options: ["left", "right"], default: "left" },
    azimuth: { type: "number", range: [8, 20], default: 12, unit: "deg" },
    elevation: { type: "number", range: [25, 45], default: 35, unit: "deg" },
    zoom: { type: "choice", options: ["in", "out", "none"], default: "in" },
    zoom_amount: { type: "number", range: [1, 1.15], default: 1.1, unit: "x" },
    model: { type: "choice", options: ["campus", "towers"], default: "campus" },
    assemble: { type: "bool", default: true },
  },
  pairs: ["text-in.soft-rise", "camera.long-lens-dolly-in"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "land.light",
  source: { from: "prompt-motion:sayan-shanky-one-prompt-to-claude", license: "reference", note: "our own rebuild; also prompt-motion:mdaman010-one-prompt-to-claude" },
  setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H;
    const region = host.querySelector(".ml-pic");
    const box = f.pic;
    // look colours as numbers (the canvas mixes them for shading and fog)
    const probe = document.createElement("div");
    host.append(probe);
    const rgb = (v) => { probe.style.color = `var(${v})`; const m = getComputedStyle(probe).color.match(/[\d.]+/g) || [0, 0, 0]; return [+m[0], +m[1], +m[2]]; };
    const C = { ground: rgb("--x-ground"), panel: rgb("--x-panel"), panel2: rgb("--x-panel-2"), ink: rgb("--x-ink"), accent: rgb("--x-accent"), accent2: rgb("--x-accent-2"), dim: rgb("--x-dim") };
    probe.remove();
    const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
    const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
    // the look's own light and dark ends (ink is the light one on a dark look), so shading and shadows hold in every look
    const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    const [lightEnd, darkEnd] = lum(C.panel) >= lum(C.ink) ? [C.panel, C.ink] : [C.ink, C.panel];
    const shade = (c, k) => (k >= 0 ? mixc(c, lightEnd, k) : mixc(c, darkEnd, -k));

    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    cv.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;z-index:2;pointer-events:none;visibility:hidden`;
    host.insertBefore(cv, host.firstChild);
    const g = cv.getContext("2d");

    // ── the model (seeded: the same layout every time) ──
    const towers = p.model === "towers";
    const blocks = []; // { x, z, w, d, h, y0, col, kind, t0 }
    const GRID = towers ? 4 : 5, CELL = 2.2;
    const half = ((GRID - 1) * CELL) / 2;
    let n = 0;
    for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) {
      const r = ML.rnd(i * 7 + j, 3);
      if (!towers && r < 0.18) continue; // a courtyard here and there
      const w = CELL * (0.55 + ML.rnd(i, j + 11) * 0.35), d = CELL * (0.55 + ML.rnd(j, i + 23) * 0.35);
      const centre = 1 - Math.hypot(i - (GRID - 1) / 2, j - (GRID - 1) / 2) / GRID;
      const h = towers ? 1.2 + (ML.rnd(i + 3, j + 5) * 4 + centre * 5) : 0.5 + ML.rnd(i + 3, j + 5) * 1.4 + centre * 1.1;
      const accent = ML.rnd(i * 5 + 9, j * 3 + 2) > 0.86;
      blocks.push({ x: i * CELL - half, z: j * CELL - half, w, d, h, y0: 0, col: accent ? C.accent2 : n % 3 === 0 ? C.panel2 : C.panel, kind: "block", order: n++ });
    }
    // rooftop units and panels on some roofs
    const extras = [];
    blocks.forEach((b, k) => {
      if (ML.rnd(k, 41) > 0.45) extras.push({ x: b.x + (ML.rnd(k, 5) - 0.5) * b.w * 0.4, z: b.z + (ML.rnd(k, 6) - 0.5) * b.d * 0.4, w: b.w * 0.28, d: b.d * 0.28, h: 0.28, y0: b.h, col: C.panel2, kind: "unit", parent: b, order: k });
      else if (ML.rnd(k, 43) > 0.4) extras.push({ x: b.x, z: b.z, w: b.w * 0.7, d: b.d * 0.7, h: 0.05, y0: b.h, col: C.accent, kind: "panel", parent: b, order: k });
    });
    const ext = half + CELL * 0.8;
    const all = blocks.concat(extras);
    // flows: dots running on the ground paths between the rows
    const paths = [];
    for (let i = 0; i < GRID - 1; i++) paths.push({ axis: i % 2 ? "x" : "z", at: i * CELL - half + CELL / 2, dir: i % 2 ? 1 : -1 });

    // ── timing ──
    const T = Math.max(0.5, end - at);
    const assembleSpan = p.assemble ? Math.min(1.8, T * 0.4) : 0;
    const nb = blocks.length;
    blocks.forEach((b) => { b.t0 = at + (p.assemble ? (b.order / nb) * assembleSpan * 0.75 : -1); });
    extras.forEach((e) => { e.t0 = at + (p.assemble ? assembleSpan * 0.75 + (e.order / nb) * assembleSpan * 0.35 : -1); });
    if (p.assemble) for (let k = 0; k < 4; k++) ctx.sfx(at + (k / 4) * assembleSpan * 0.75 + 0.3, "land.light", 0.15);
    const sign = (p.direction === "right" ? 1 : -1) * (ctx.rtl ? -1 : 1);
    const az0 = Math.PI / 4 - (sign * (p.azimuth * Math.PI) / 180) / 2;
    const el = (ML.clamp(p.elevation, 25, 45) * Math.PI) / 180;
    const Z1 = ML.clamp(p.zoom_amount, 1, 1.15);
    // fit: the model's ground diagonal and its tallest block inside the picture region
    const tallest = Math.max(...blocks.map((b) => b.h));
    const R = ext * Math.SQRT2;
    // (a tall frame lets the plinth's corners run off the sides, where the fog dissolves them; the foot's margin is usable too)
    const availW = f.tall ? W * 1.04 : box.w, availH = box.h + (H - box.y - box.h) * 0.6;
    const fitS = Math.min(availW / (2 * R), availH / (2 * R * Math.sin(el) + tallest * Math.cos(el)) / 1.03) / (p.zoom === "none" ? 1 : Z1);
    const cxS = box.x + box.w / 2, cyS = box.y + availH / 2 + tallest * Math.cos(el) * fitS * 0.3;
    const sine = (x) => -(Math.cos(Math.PI * x) - 1) / 2;
    // towards the light: one camera-facing wall lit, the other in shade, shadows falling away from the light
    const L = (() => { const v = [0.55, 0.8, -0.25], m = Math.hypot(...v); return v.map((x) => x / m); })();

    return {
      draw(t) {
        const on = t >= at - 0.001 && t <= end;
        cv.style.visibility = on ? "visible" : "hidden";
        if (region) region.style.visibility = on ? "hidden" : "";
        if (!on) return;
        const u = sine(ML.lin(t, at, end));
        const az = az0 + sign * ((p.azimuth * Math.PI) / 180) * u;
        const zoom = p.zoom === "in" ? 1 + (Z1 - 1) * u : p.zoom === "out" ? Z1 - (Z1 - 1) * u : 1;
        const s = fitS * zoom;
        const fade = ML.lin(t, at, at + 0.35);
        // camera basis (orthographic): dir points from the model to the camera
        const dir = [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)];
        const fw = dir.map((x) => -x);
        const rt = [-fw[2], 0, fw[0]]; { const m = Math.hypot(...rt); rt[0] /= m; rt[2] /= m; }
        const up = [rt[1] * fw[2] - rt[2] * fw[1], rt[2] * fw[0] - rt[0] * fw[2], rt[0] * fw[1] - rt[1] * fw[0]];
        const P = (x, y, z) => [cxS + (x * rt[0] + y * rt[1] + z * rt[2]) * s, cyS - (x * up[0] + y * up[1] + z * up[2]) * s];
        const depth = (x, y, z) => x * fw[0] + y * fw[1] + z * fw[2];
        const fogK = (dp) => ML.clamp((dp + R * 0.2) / (R * 1.6)) * 0.42; // far side melts into the ground
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, W, H);
        g.globalAlpha = fade;
        const poly = (pts, fill) => { g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath(); g.fillStyle = fill; g.fill(); };
        // the plinth
        const E = ext, base = [[-E, 0, -E], [E, 0, -E], [E, 0, E], [-E, 0, E]];
        poly(base.map((v) => P(...v)), css(mixc(C.panel, C.ground, 0.35)));
        g.lineWidth = 1.5; g.strokeStyle = css(C.ink, 0.08); g.stroke();
        // ground paths with their flows
        paths.forEach((pa, i) => {
          const a = pa.axis === "x" ? [-E, 0, pa.at] : [pa.at, 0, -E], b = pa.axis === "x" ? [E, 0, pa.at] : [pa.at, 0, E];
          const A = P(...a), B = P(...b);
          g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.lineWidth = Math.max(1, s * 0.12); g.strokeStyle = css(C.ground, 0.9); g.stroke();
          for (let k = 0; k < 4; k++) {
            const q = (((t - at) * 0.12 * pa.dir + k / 4 + i * 0.13) % 1 + 1) % 1;
            const x = a[0] + (b[0] - a[0]) * q, z = a[2] + (b[2] - a[2]) * q, Q = P(x, 0.02, z);
            g.beginPath(); g.arc(Q[0], Q[1], Math.max(3, s * 0.09), 0, Math.PI * 2); g.fillStyle = css(C.accent, 0.9 * Math.sin(q * Math.PI)); g.fill();
          }
        });
        // where each part stands now (dropping into place on its own clock)
        const live = all.map((b) => {
          const k = b.t0 < at ? 1 : ML.expo(t, b.t0, b.t0 + 0.6);
          const parentK = b.parent ? (b.parent.t0 < at ? 1 : ML.expo(t, b.parent.t0, b.parent.t0 + 0.6)) : 1;
          const lift = (1 - k) * (b.kind === "block" ? 2.5 + b.h : 1.2);
          return { b, k, y: b.y0 * parentK + lift, a: ML.clamp(k * 1.6) };
        }).filter((x) => x.a > 0.001);
        // soft shadows on the plinth (cast away from the light)
        g.save(); g.filter = `blur(${Math.max(2, s * 0.25).toFixed(1)}px)`;
        live.forEach(({ b, y, a }) => {
          if (b.kind !== "block") return;
          const hx = b.w / 2, hz = b.d / 2, top = y + b.h;
          const pts = [];
          for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
            pts.push(P(b.x + dx * hx, 0, b.z + dz * hz));
            pts.push(P(b.x + dx * hx - (L[0] / L[1]) * top, 0, b.z + dz * hz - (L[2] / L[1]) * top));
          }
          // convex hull of the eight points (monotone chain)
          pts.sort((m, q) => m[0] - q[0] || m[1] - q[1]);
          const cr = (o, a1, b1) => (a1[0] - o[0]) * (b1[1] - o[1]) - (a1[1] - o[1]) * (b1[0] - o[0]);
          const lo = [], hi = [];
          for (const q of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
          for (const q of pts.slice().reverse()) { while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
          poly(lo.slice(0, -1).concat(hi.slice(0, -1)), css(darkEnd, 0.16 * a * (y < 0.05 ? 1 : 0.3)));
        });
        g.restore();
        g.globalAlpha = fade;
        // the parts, far to near by their footprint (height must not count, or a tall block paints over the one in front of
        // it); a roof part follows its own block
        const key = (o) => { const r = o.b.parent || o.b; return depth(r.x, 0, r.z); };
        live.sort((m, q) => key(q) - key(m) || (m.b.parent ? 1 : 0) - (q.b.parent ? 1 : 0));
        for (const { b, y, a } of live) {
          const hx = b.w / 2, hz = b.d / 2, y1 = y + b.h;
          const fk = fogK(depth(b.x, y + b.h / 2, b.z));
          const faces = [
            { n: [0, 1, 0], v: [[-hx, y1, -hz], [hx, y1, -hz], [hx, y1, hz], [-hx, y1, hz]] },
            { n: [1, 0, 0], v: [[hx, y, -hz], [hx, y, hz], [hx, y1, hz], [hx, y1, -hz]] },
            { n: [-1, 0, 0], v: [[-hx, y, hz], [-hx, y, -hz], [-hx, y1, -hz], [-hx, y1, hz]] },
            { n: [0, 0, 1], v: [[hx, y, hz], [-hx, y, hz], [-hx, y1, hz], [hx, y1, hz]] },
            { n: [0, 0, -1], v: [[-hx, y, -hz], [hx, y, -hz], [hx, y1, -hz], [-hx, y1, -hz]] },
          ];
          g.globalAlpha = fade * a;
          for (const fc of faces) {
            if (fc.n[0] * dir[0] + fc.n[1] * dir[1] + fc.n[2] * dir[2] <= 0.001) continue;
            const lit = fc.n[0] * L[0] + fc.n[1] * L[1] + fc.n[2] * L[2];
            const c = mixc(shade(b.col, fc.n[1] ? 0.18 : lit * 0.24 - 0.12), C.ground, fk);
            const pts = fc.v.map((v) => P(b.x + v[0], v[1], b.z + v[2]));
            if (fc.n[1]) poly(pts, css(c));
            else {
              // ambient occlusion: the wall darkens towards its foot
              const top = P(b.x, y1, b.z), foot = P(b.x, y, b.z);
              const gr = g.createLinearGradient(top[0], top[1], foot[0], foot[1]);
              gr.addColorStop(0, css(c)); gr.addColorStop(1, css(shade(c, y < 0.05 ? -0.2 : -0.04)));
              poly(pts, gr);
            }
            g.lineWidth = 1; g.strokeStyle = css(darkEnd, 0.06); g.stroke();
          }
          // window rows on tall blocks: thin lines on the walls facing the camera
          if (b.kind === "block" && b.h > 1.4) {
            const rows = Math.floor(b.h / 0.55);
            g.strokeStyle = css(mixc(C.dim, C.ground, fk), 0.35); g.lineWidth = Math.max(1, s * 0.03);
            for (const fc of faces.slice(1)) {
              if (fc.n[0] * dir[0] + fc.n[2] * dir[2] <= 0.001) continue;
              for (let r = 1; r < rows; r++) {
                const yy = y + (r / rows) * b.h, v0 = fc.v[0], v1 = fc.v[1];
                const kx = fc.n[0] ? 1 : 0.85, kz = fc.n[2] ? 1 : 0.85;
                const A = P(b.x + v0[0] * kx, yy, b.z + v0[2] * kz), B = P(b.x + v1[0] * kx, yy, b.z + v1[2] * kz);
                g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke();
              }
            }
          }
        }
        g.globalAlpha = 1;
      },
    };
  },
});

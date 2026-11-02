// Sculpture orbit by progress: a floating sculpture (a faceted core, a shell of beaded strands, three rings, a knotted
// spine and six nodes) turns, tilts and swells while the camera arcs around it, everything a pure function of the
// story's progress p (0..1 over the whole video, or over this scene so the world advances one notch per chapter).
// Ported from the source's frame function: world.y = anchorY + sin(2πp)·0.14; world.rot = (−0.12 + 0.34p,
// −0.45 + 2.45p, −0.08 + sin(πp)·0.16); world.scale = 0.94 + sin(πp)·0.11 (the swell); core rot (2.2p, 3.1p),
// scale 0.82 + 0.42p; the bead shell counter-rotates −1.4p; the spine turns 1.25p; ring i turns (i+1)·0.0108 rad/s and
// scales 0.86 + p(0.08 + 0.045i); camera θ = −0.12 + 0.55p, r = 7.2 − 0.45p at (anchorX + sin θ·r, anchorY + 0.45 −
// 0.52p, cos θ·r) looking at the anchor; PerspectiveCamera fov 34. The anchor sits right of centre (1.72, 0.08), or
// on a tall frame above the copy (0, 1.05). Painted on a canvas per frame from t with our own projection: flat-shaded
// faces, shaded beads and tube segments sorted far to near, a soft contact shadow on the floor, colours from the look.
// RTL: the anchor mirrors to the left of centre.
// Source: MengTo/Skills web-design/scroll-world-storytelling demo/threejs/index.html (buildBeadShell, buildStructure,
// the render loop's progress mapping) (MIT).
ML.define({
  id: "camera.orbit-by-progress",
  category: "camera",
  name: "Sculpture orbit by progress",
  does: "A floating 3D sculpture slowly turns, tilts and swells while the camera arcs around it, the world advancing one notch per chapter.",
  says: ["story", "scale", "tech", "reveal"],
  energy: 2,
  targets: ["shape", "stage", "scene"],
  duration: [4, 60],
  params: {
    drive: { type: "choice", options: ["whole-video", "per-scene"], default: "whole-video" },
    anchor: { type: "choice", options: ["right", "centre", "top"], default: "right" },
    swell: { type: "bool", default: true },
    ambient_spin: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "camera.long-lens-orbit"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:web-design/scroll-world-storytelling", license: "MIT", note: "demo/threejs/index.html sculpture + progress mapping, painted in 2D" },
  setup(ctx) {
    const { el, p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const inside = el && el !== stage && el !== host ? el : null;
    const box = inside ? { w: inside.offsetWidth || f.W, h: inside.offsetHeight || f.H } : { w: f.W, h: f.H };
    const W = Math.round(box.w), H = Math.round(box.h);
    const probe = document.createElement("div");
    host.append(probe);
    const rgb = (v) => { probe.style.color = `var(${v})`; const m = getComputedStyle(probe).color.match(/[\d.]+/g) || [0, 0, 0]; return [+m[0], +m[1], +m[2]]; };
    const C = { ground: rgb("--x-ground"), panel: rgb("--x-panel"), panel2: rgb("--x-panel-2"), ink: rgb("--x-ink"), dim: rgb("--x-dim"), accent: rgb("--x-accent"), accent2: rgb("--x-accent-2") };
    probe.remove();
    const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
    const css = (c, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
    const pal = { bead: mixc(C.panel, C.dim, 0.18), beadAlt: C.accent2, core: mixc(C.panel2, C.accent2, 0.35), ring: mixc(C.dim, C.ink, 0.25), accent: C.accent };

    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    cv.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none;z-index:0`;
    if (inside) { if (getComputedStyle(inside).position === "static") inside.style.position = "relative"; inside.append(cv); }
    else host.insertBefore(cv, host.firstChild);
    const g = cv.getContext("2d");

    // ── math ──
    const rotXYZ = (v, a, b, c) => { // three.js Euler 'XYZ': v' = Rx(a) Ry(b) Rz(c) v
      let [x, y, z] = v;
      let cs = Math.cos(c), sn = Math.sin(c); [x, y] = [x * cs - y * sn, x * sn + y * cs];
      cs = Math.cos(b); sn = Math.sin(b); [x, z] = [x * cs + z * sn, -x * sn + z * cs];
      cs = Math.cos(a); sn = Math.sin(a); [y, z] = [y * cs - z * sn, y * sn + z * cs];
      return [x, y, z];
    };
    // ── the sculpture (the source's geometry) ──
    const beads = [];
    for (let s = 0; s < 12; s++) for (let q = 0; q < 34; q++) {
      const u = q / 33, y = (u - 0.5) * 3.35;
      const pulse = 0.78 + Math.sin(u * Math.PI) * 0.7 + Math.sin(u * Math.PI * 3 + s) * 0.05;
      const ang = u * Math.PI * 2.7 + (s / 12) * Math.PI * 2;
      beads.push({ v: [Math.cos(ang) * pulse, y, Math.sin(ang) * pulse * 0.72], r: 0.055 * (0.68 + 0.36 * Math.sin((q + s) * 1.73) ** 2), alt: (s * 34 + q) % 17 === 0 });
    }
    // icosahedron (detail 1), radius 0.7
    const ico = (() => {
      const t0 = (1 + Math.sqrt(5)) / 2;
      let V = [[-1, t0, 0], [1, t0, 0], [-1, -t0, 0], [1, -t0, 0], [0, -1, t0], [0, 1, t0], [0, -1, -t0], [0, 1, -t0], [t0, 0, -1], [t0, 0, 1], [-t0, 0, -1], [-t0, 0, 1]];
      let Fc = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
      const nrm = (v) => { const m = Math.hypot(...v); return v.map((x) => (x / m) * 0.7); };
      V = V.map(nrm);
      const out = [];
      for (const [a, b, c] of Fc) {
        const ab = nrm(V[a].map((x, i) => (x + V[b][i]) / 2)), bc = nrm(V[b].map((x, i) => (x + V[c][i]) / 2)), ca = nrm(V[c].map((x, i) => (x + V[a][i]) / 2));
        out.push([V[a], ab, ca], [ab, V[b], bc], [ca, bc, V[c]], [ab, bc, ca]);
      }
      return out;
    })();
    const ringSpecs = [[1.25, 0.012, -0.42, 0.1], [1.72, 0.018, 0.48, 0.72], [2.06, 0.009, 1.04, -0.26]];
    const RS = 110;
    const knot = [];
    for (let i = 0; i <= 200; i++) { // TorusKnotGeometry(1.08, .018, p 2, q 3)
      const u = (i / 200) * Math.PI * 2 * 2, qu = (3 / 2) * u, cs = Math.cos(qu);
      knot.push([1.08 * (2 + cs) * 0.5 * Math.cos(u), 1.08 * (2 + cs) * Math.sin(u) * 0.5, 1.08 * Math.sin(qu) * 0.5]);
    }
    const nodes = [];
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; nodes.push([Math.cos(a) * 1.72, Math.sin(a * 2) * 0.28, Math.sin(a) * 1.18]); }

    const tall = H > W * 1.2;
    const mir = ctx.rtl ? -1 : 1;
    const anchor = p.anchor === "centre" ? [0, 0] : p.anchor === "top" || tall ? [0, 1.05] : [1.72 * mir, 0.08];
    const L = (() => { const v = [-0.5, 0.85, 0.55], m = Math.hypot(...v); return v.map((x) => x / m); })();
    const total = () => (typeof window !== "undefined" && window.__duration) || end;
    ctx.sfx(at, "swell", 0.16);

    return {
      draw(t) {
        const P = p.drive === "per-scene" ? ML.lin(t, at, end) : ML.clamp(t / Math.max(0.1, total()));
        const tm = p.ambient_spin ? t : 0;
        const [ax, ay0] = anchor;
        const ay = ay0 + Math.sin(P * Math.PI * 2) * 0.14;
        const wr = [-0.12 + P * 0.34, -0.45 + P * 2.45 + tm * 0.025, -0.08 + Math.sin(P * Math.PI) * 0.16];
        const ws = p.swell ? 0.94 + Math.sin(P * Math.PI) * 0.11 : 1;
        const toWorld = (v) => { const r = rotXYZ(v, wr[0], wr[1], wr[2]); return [ax + r[0] * ws, ay + r[1] * ws, r[2] * ws]; };
        // camera
        const th = (-0.12 + P * 0.55) * mir, rad = 7.2 - P * 0.45;
        const Cp = [ax + Math.sin(th) * rad, ay0 + 0.45 - P * 0.52, Math.cos(th) * rad];
        let fw = [ax - Cp[0], ay0 - Cp[1], -Cp[2]]; { const m = Math.hypot(...fw); fw = fw.map((x) => x / m); }
        let rt = [-fw[2], 0, fw[0]]; { const m = Math.hypot(...rt); rt = rt.map((x) => x / m); }
        const up = [rt[1] * fw[2] - rt[2] * fw[1], rt[2] * fw[0] - rt[0] * fw[2], rt[0] * fw[1] - rt[1] * fw[0]];
        const focal = Math.min(H, W * 1.15) / 2 / Math.tan((34 * Math.PI) / 360); // a tall frame frames it by its width
        // the source frames the world against the page; anchored world points sit where the anchor projects
        const proj = (w) => {
          const v = [w[0] - Cp[0], w[1] - Cp[1], w[2] - Cp[2]], zc = v[0] * fw[0] + v[1] * fw[1] + v[2] * fw[2];
          return [W / 2 + ((v[0] * rt[0] + v[1] * rt[1] + v[2] * rt[2]) / zc) * focal, H / 2 - ((v[0] * up[0] + v[1] * up[1] + v[2] * up[2]) / zc) * focal, zc];
        };
        // the camera looks at the anchor; shift the picture so the anchor lands where the source's layout puts it
        const shiftX = tall || p.anchor !== "right" ? 0 : mir * W * 0.2, shiftY = tall && p.anchor !== "centre" && !inside ? f.pic.y + f.pic.h * 0.5 - H / 2 : 0; // on a tall frame: the picture area, clear of the copy
        const lit = (n) => 0.42 + 0.58 * Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
        const fog = (c, z) => mixc(c, C.ground, ML.clamp((z - 5.5) / 6) * 0.35);
        const prims = [];
        // core
        const cs = 0.82 + P * 0.42, cr = [P * 2.2, P * 3.1 + tm * 0.04, 0];
        for (const tri of ico) {
          const wv = tri.map((v) => toWorld(rotXYZ(v.map((x) => x * cs), cr[0], cr[1], cr[2])));
          const e1 = wv[1].map((x, i) => x - wv[0][i]), e2 = wv[2].map((x, i) => x - wv[0][i]);
          let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
          const m = Math.hypot(...n) || 1; n = n.map((x) => x / m);
          const cen = [0, 1, 2].map((i) => (wv[0][i] + wv[1][i] + wv[2][i]) / 3);
          const toCam = [Cp[0] - cen[0], Cp[1] - cen[1], Cp[2] - cen[2]];
          if (n[0] * toCam[0] + n[1] * toCam[1] + n[2] * toCam[2] <= 0) continue;
          const q = wv.map(proj), z = (q[0][2] + q[1][2] + q[2][2]) / 3;
          prims.push({ z, k: 0, q, c: fog(pal.core.map((x) => x * lit(n)), z) });
        }
        // bead shell, counter-rotating
        for (const bd of beads) {
          const w = toWorld(rotXYZ(bd.v, 0, -P * 1.4, 0)), q = proj(w);
          prims.push({ z: q[2], k: 1, q, r: (bd.r * ws * focal) / q[2], c: fog(bd.alt ? pal.beadAlt : pal.bead, q[2]) });
        }
        // rings
        ringSpecs.forEach(([R0, tube, rx, ry], i) => {
          const sc = 0.86 + P * (0.08 + i * 0.045), rz = i * 0.62 + (p.ambient_spin ? (i + 1) * 0.0108 * t : 0);
          let prev = null;
          for (let s = 0; s <= RS; s++) {
            const a = (s / RS) * Math.PI * 2, w = toWorld(rotXYZ([Math.cos(a) * R0 * sc, Math.sin(a) * R0 * sc, 0], rx, ry, rz)), q = proj(w);
            if (prev) prims.push({ z: (q[2] + prev[2]) / 2, k: 2, a: prev, b: q, w: Math.max(1.4, (tube * 2 * ws * focal) / q[2]), c: fog(i === 2 ? pal.accent : pal.ring, q[2]) });
            prev = q;
          }
        });
        // spine
        { let prev = null;
          for (const v of knot) {
            const w = toWorld(rotXYZ([v[0] * 0.94, v[1] * 1.18, v[2] * 0.94], P * 1.25, 0, 0.42)), q = proj(w);
            if (prev) prims.push({ z: (q[2] + prev[2]) / 2, k: 2, a: prev, b: q, w: Math.max(1.2, (0.036 * ws * focal) / q[2]), c: fog(pal.ring, q[2]) });
            prev = q;
          } }
        for (const v of nodes) { const q = proj(toWorld(v)); prims.push({ z: q[2], k: 1, q, r: (0.105 * ws * focal) / q[2], c: fog(pal.accent, q[2]) }); }

        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, W, H);
        g.translate(shiftX, shiftY);
        // a soft contact shadow on the floor under the sculpture
        const sh = proj([ax, ay0 - 2.35, 0]), shr = (2.1 * ws * focal) / sh[2];
        const sg = g.createRadialGradient(sh[0], sh[1], 0, sh[0], sh[1], shr);
        sg.addColorStop(0, css(C.ink, 0.16)); sg.addColorStop(1, css(C.ink, 0));
        g.save(); g.translate(sh[0], sh[1]); g.scale(1, 0.22); g.translate(-sh[0], -sh[1]);
        g.fillStyle = sg; g.beginPath(); g.arc(sh[0], sh[1], shr, 0, Math.PI * 2); g.fill(); g.restore();
        prims.sort((a, b) => b.z - a.z);
        g.lineCap = "round"; g.lineJoin = "round";
        const lx = -0.32, ly = -0.38;
        for (const pr of prims) {
          if (pr.z <= 0.1) continue;
          if (pr.k === 0) {
            g.fillStyle = css(pr.c); g.strokeStyle = css(pr.c);
            g.lineWidth = 0.8;
            g.beginPath(); g.moveTo(pr.q[0][0], pr.q[0][1]); g.lineTo(pr.q[1][0], pr.q[1][1]); g.lineTo(pr.q[2][0], pr.q[2][1]); g.closePath(); g.fill(); g.stroke();
          } else if (pr.k === 1) {
            const r = Math.max(0.6, pr.r), x = pr.q[0], y = pr.q[1];
            const gr = g.createRadialGradient(x + lx * r, y + ly * r, r * 0.1, x, y, r);
            gr.addColorStop(0, css(mixc(pr.c, C.panel, 0.55))); gr.addColorStop(0.55, css(pr.c)); gr.addColorStop(1, css(mixc(pr.c, C.ink, 0.35)));
            g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
          } else {
            g.strokeStyle = css(pr.c); g.lineWidth = pr.w;
            g.beginPath(); g.moveTo(pr.a[0], pr.a[1]); g.lineTo(pr.b[0], pr.b[1]); g.stroke();
          }
        }
      },
    };
  },
});

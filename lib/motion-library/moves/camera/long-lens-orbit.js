// Long-lens orbit: the camera stands far off (D = 80) on a very long lens and drifts slowly around the subject, so
// the near posts, the middle ground and the far ridges slide past each other in flat telephoto parallax. Ported from
// the source's camera rig: position = (D·cos(el)·sin(az), H + D·sin(el), D·cos(el)·cos(az)), lookAt (0, lookY, 0),
// fov = 2·atan((unitsTall/2) / D / zoom) (16 units tall → ~11.4°; widened to fit narrow frames), el clamped to the
// source's ranges (−0.004…0.20 landscape, −0.03…0.55 towers). Over the shot: az(t) = 0.35 + w·τ (drift, w 0.03–0.08
// rad/s) or a power2.inOut sweep between two angles (a-to-b); zoom 0.6–2.4 with an optional push 1 → 1.2. The source
// smooths towards its targets with k = 1 − 0.0016^dt; for video the path is already smooth in closed form.
// Painted on a canvas every frame from t (own perspective projection, painter's order, fog towards the sky colour):
// a far range of seeded ridges, a field of posts and low blocks, and the subject (a monolith group, or a tower cluster).
// RTL: the drift mirrors.
// Source: MengTo/Skills web-design/threejs-landscape demo/index.html (placeCamera, CAM_D / CAM_H / UNITS_TALL / LOOK_Y) (MIT).
ML.define({
  id: "camera.long-lens-orbit",
  category: "camera",
  name: "Long-lens orbit drift",
  does: "The camera, far away on a very long lens, drifts slowly around the subject so the background slides past in flat telephoto parallax.",
  says: ["calm", "scale", "luxury", "ambient"],
  energy: 1,
  targets: ["scene", "stage"],
  duration: [3, 15],
  params: {
    path: { type: "choice", options: ["drift", "a-to-b"], default: "drift" },
    speed: { type: "number", range: [0.03, 0.08], default: 0.05, unit: "rad/s" },
    zoom: { type: "number", range: [0.6, 2.4], default: 1 },
    zoom_push: { type: "number", range: [1, 1.2], default: 1, unit: "x" },
    world: { type: "choice", options: ["landscape", "towers"], default: "landscape" },
    elevation: { type: "number", range: [-0.03, 0.55], default: 0.012, unit: "rad" },
  },
  pairs: ["text-in.soft-rise", "camera.long-lens-dolly-in"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:web-design/threejs-landscape", license: "MIT", note: "demo/index.html camera rig" },
  setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H;
    const region = host.querySelector(".ml-pic");
    const probe = document.createElement("div");
    host.append(probe);
    const rgb = (v) => { probe.style.color = `var(${v})`; const m = getComputedStyle(probe).color.match(/[\d.]+/g) || [0, 0, 0]; return [+m[0], +m[1], +m[2]]; };
    const C = { ground: rgb("--x-ground"), panel: rgb("--x-panel"), panel2: rgb("--x-panel-2"), ink: rgb("--x-ink"), dim: rgb("--x-dim"), accent: rgb("--x-accent"), accent2: rgb("--x-accent-2") };
    probe.remove();
    const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
    const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
    const sky = C.ground, skyTop = mixc(C.ground, C.accent2, 0.18);

    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    cv.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;z-index:0;pointer-events:none;visibility:hidden`;
    host.insertBefore(cv, host.firstChild);
    const g = cv.getContext("2d");

    // ── the source's rig constants ──
    const towers = p.world === "towers";
    const CAM_D = 80, CAM_H = towers ? 7.0 : 3.6, LOOK_Y = towers ? 7.0 : 2.0;
    const EL = towers ? [-0.03, 0.55] : [-0.004, 0.2];
    const el = ML.clamp(p.elevation, EL[0], EL[1]);
    const aspect = W / H;
    const UNITS_TALL = Math.max(16, 15 / aspect) * (towers ? 1.25 : 1); // 16 tall, and wide enough for a narrow frame

    // ── the world (seeded) ──
    const boxes = []; // { x, z, w, d, h, col }
    if (towers) {
      for (let i = 0; i < 26; i++) {
        const a = ML.rnd(i, 3) * Math.PI * 2, r = 2 + Math.sqrt(ML.rnd(i, 5)) * 16;
        const near = 1 - r / 18;
        boxes.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, w: 1.4 + ML.rnd(i, 7) * 1.6, d: 1.4 + ML.rnd(i, 9) * 1.6, h: 3 + near * 9 + ML.rnd(i, 11) * 5, col: i % 7 === 0 ? C.accent2 : i % 2 ? C.panel : C.panel2 });
      }
      boxes.push({ x: 0, z: 0, w: 2.6, d: 2.6, h: 17, col: C.accent });
    } else {
      // the subject: a monolith group
      boxes.push({ x: 0, z: 0, w: 1.6, d: 1.6, h: 6.2, col: C.accent });
      boxes.push({ x: 2.1, z: 0.6, w: 1.2, d: 1.2, h: 3.4, col: C.panel });
      boxes.push({ x: -1.9, z: -0.8, w: 1.1, d: 1.1, h: 2.4, col: C.panel2 });
      // low blocks across the middle ground
      for (let i = 0; i < 18; i++) {
        const a = ML.rnd(i, 13) * Math.PI * 2, r = 7 + ML.rnd(i, 17) * 30;
        boxes.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, w: 1 + ML.rnd(i, 19) * 1.8, d: 1 + ML.rnd(i, 23) * 1.8, h: 0.7 + ML.rnd(i, 29) * 1.6, col: i % 3 ? C.panel : C.panel2 });
      }
    }
    // posts: a field of thin markers, the strongest parallax cue
    for (let i = 0; i < 70; i++) {
      const a = ML.rnd(i, 31) * Math.PI * 2, r = 4 + Math.sqrt(ML.rnd(i, 37)) * 44;
      boxes.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, w: 0.22, d: 0.22, h: 0.5 + ML.rnd(i, 41) * 1.2, col: i % 9 === 0 ? C.accent : C.dim, post: true });
    }
    // far ridges: rings of seeded heights around the subject
    const ridges = [{ R: 520, base: 12, amp: 16, k: 0.9 }, { R: 360, base: 6, amp: 9, k: 0.8 }, { R: 230, base: 2.5, amp: 4.5, k: 0.68 }].map((r, li) => ({
      ...r,
      phase: [ML.rnd(li, 51) * 6.28, ML.rnd(li, 53) * 6.28, ML.rnd(li, 57) * 6.28],
      col: mixc(C.dim, sky, r.k),
    }));
    const ridgeH = (r, th) => r.base + r.amp * (0.5 + 0.28 * Math.sin(th * 3 + r.phase[0]) + 0.16 * Math.sin(th * 7 + r.phase[1]) + 0.08 * Math.sin(th * 17 + r.phase[2]));

    const sign = ctx.rtl ? -1 : 1;
    const az0 = 0.35;
    const T = Math.max(0.5, end - at);
    const p2 = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    const L = (() => { const v = [0.45, 0.8, 0.35], m = Math.hypot(...v); return v.map((x) => x / m); })();
    ctx.sfx(at, "whoosh.soft", 0.12);

    return {
      draw(t) {
        const on = t >= at - 0.001 && t <= end;
        cv.style.visibility = on ? "visible" : "hidden";
        if (region) region.style.visibility = on ? "hidden" : "";
        if (!on) return;
        const tau = Math.max(0, t - at), prog = ML.lin(t, at, end);
        const az = p.path === "a-to-b" ? az0 + sign * (ML.clamp(p.speed, 0.03, 0.08) * T) * (p2(prog) - 0.5) : az0 + sign * ML.clamp(p.speed, 0.03, 0.08) * tau;
        const zoom = ML.clamp(p.zoom, 0.6, 2.4) * (1 + (ML.clamp(p.zoom_push, 1, 1.2) - 1) * p2(prog));
        const fov = 2 * Math.atan(UNITS_TALL / 2 / CAM_D / zoom);
        const focal = H / 2 / Math.tan(fov / 2);
        const ce = Math.cos(el), se = Math.sin(el);
        const Cp = [CAM_D * ce * Math.sin(az), CAM_H + CAM_D * se, CAM_D * ce * Math.cos(az)];
        let fw = [0 - Cp[0], LOOK_Y - Cp[1], 0 - Cp[2]]; { const m = Math.hypot(...fw); fw = fw.map((x) => x / m); }
        let rt = [-fw[2], 0, fw[0]]; { const m = Math.hypot(...rt); rt = rt.map((x) => x / m); }
        const up = [rt[1] * fw[2] - rt[2] * fw[1], rt[2] * fw[0] - rt[0] * fw[2], rt[0] * fw[1] - rt[1] * fw[0]];
        const proj = (x, y, z) => {
          const v = [x - Cp[0], y - Cp[1], z - Cp[2]];
          const zc = v[0] * fw[0] + v[1] * fw[1] + v[2] * fw[2];
          return [W / 2 + ((v[0] * rt[0] + v[1] * rt[1] + v[2] * rt[2]) / zc) * focal, H / 2 - ((v[0] * up[0] + v[1] * up[1] + v[2] * up[2]) / zc) * focal, zc];
        };
        g.setTransform(1, 0, 0, 1, 0, 0);
        // sky
        const hz = proj(Cp[0] + fw[0] * 1e5, Cp[1], Cp[2] + fw[2] * 1e5)[1]; // the horizon at eye level
        const sg = g.createLinearGradient(0, 0, 0, Math.max(10, hz));
        sg.addColorStop(0, css(skyTop)); sg.addColorStop(1, css(sky));
        g.fillStyle = sg; g.fillRect(0, 0, W, H);
        const back = az + Math.PI;
        // far ridges, far to near, each filled down to the frame's foot
        for (const r of ridges) {
          g.beginPath();
          let started = false, lastX = 0;
          const N = 220, span = 1.3;
          for (let i = 0; i <= N; i++) {
            const th = back - span + (i / N) * span * 2;
            const q = proj(Math.sin(th) * r.R, ridgeH(r, th), Math.cos(th) * r.R);
            if (q[2] < 1) continue;
            if (!started) { g.moveTo(q[0], H); g.lineTo(q[0], q[1]); started = true; } else g.lineTo(q[0], q[1]);
            lastX = q[0];
          }
          if (started) { g.lineTo(lastX, H); g.closePath(); g.fillStyle = css(r.col); g.fill(); }
        }
        // the ground: a disc around the subject whose far rim meets the nearest ridge
        const rim = [];
        for (let i = 0; i <= 160; i++) {
          const th = back - 1.4 + (i / 160) * 2.8, q = proj(Math.sin(th) * 200, 0, Math.cos(th) * 200);
          if (q[2] > 1) rim.push([ML.clamp(q[0], -4 * W, 5 * W), ML.clamp(q[1], -H, 2 * H)]);
        }
        rim.sort((m, n) => m[0] - n[0]); // left to right on screen, so the outline never crosses itself
        const gs = rim.length > 1;
        if (gs) {
          g.beginPath();
          g.moveTo(Math.min(-10, rim[0][0]), H + 10); g.lineTo(Math.min(-10, rim[0][0]), rim[0][1]);
          for (const q of rim) g.lineTo(q[0], q[1]);
          g.lineTo(Math.max(W + 10, rim[rim.length - 1][0]), rim[rim.length - 1][1]);
          g.lineTo(Math.max(W + 10, rim[rim.length - 1][0]), H + 10);
        }
        if (gs) {
          g.closePath();
          const q0 = proj(0, 0, 0)[1];
          const gg = g.createLinearGradient(0, hz, 0, H);
          gg.addColorStop(0, css(mixc(C.panel2, sky, 0.5))); gg.addColorStop(ML.clamp((q0 - hz) / Math.max(1, H - hz)), css(C.panel2)); gg.addColorStop(1, css(mixc(C.panel2, C.dim, 0.12)));
          g.fillStyle = gg; g.fill();
        }
        // a quiet haze band at the horizon (aerial perspective)
        const hg = g.createLinearGradient(0, hz - H * 0.08, 0, hz + H * 0.05);
        hg.addColorStop(0, css(sky, 0)); hg.addColorStop(0.6, css(sky, 0.35)); hg.addColorStop(1, css(sky, 0));
        g.fillStyle = hg; g.fillRect(0, hz - H * 0.08, W, H * 0.13);
        // boxes, far to near
        const list = boxes.map((b) => ({ b, d: Math.hypot(b.x - Cp[0], b.h / 2 - Cp[1], b.z - Cp[2]) })).sort((m, n) => n.d - m.d);
        for (const { b, d } of list) {
          const hx = b.w / 2, hz2 = b.d / 2;
          const fk = ML.clamp((d - 52) / 70) * 0.75;
          // a soft contact shadow under every box
          const s0 = proj(b.x, 0, b.z);
          if (s0[2] > 1) {
            const sr = (Math.max(b.w, b.d) * 0.9 * focal) / s0[2];
            g.beginPath(); g.ellipse(s0[0], s0[1], sr, Math.max(1, sr * 0.18), 0, 0, Math.PI * 2); g.fillStyle = css(C.ink, 0.08 * (1 - fk)); g.fill();
          }
          const faces = [
            { n: [0, 1, 0], v: [[-hx, b.h, -hz2], [hx, b.h, -hz2], [hx, b.h, hz2], [-hx, b.h, hz2]], c: [0, b.h, 0] },
            { n: [1, 0, 0], v: [[hx, 0, -hz2], [hx, 0, hz2], [hx, b.h, hz2], [hx, b.h, -hz2]], c: [hx, b.h / 2, 0] },
            { n: [-1, 0, 0], v: [[-hx, 0, hz2], [-hx, 0, -hz2], [-hx, b.h, -hz2], [-hx, b.h, hz2]], c: [-hx, b.h / 2, 0] },
            { n: [0, 0, 1], v: [[hx, 0, hz2], [-hx, 0, hz2], [-hx, b.h, hz2], [hx, b.h, hz2]], c: [0, b.h / 2, hz2] },
            { n: [0, 0, -1], v: [[-hx, 0, -hz2], [hx, 0, -hz2], [hx, b.h, -hz2], [-hx, b.h, -hz2]], c: [0, b.h / 2, -hz2] },
          ];
          for (const fc of faces) {
            const toCam = [Cp[0] - (b.x + fc.c[0]), Cp[1] - fc.c[1], Cp[2] - (b.z + fc.c[2])];
            if (fc.n[0] * toCam[0] + fc.n[1] * toCam[1] + fc.n[2] * toCam[2] <= 0) continue;
            const lit = Math.max(0, fc.n[0] * L[0] + fc.n[1] * L[1] + fc.n[2] * L[2]);
            const base = mixc(mixc(b.col, C.ink, 0.22), b.col, 0.35 + 0.65 * lit);
            const col = mixc(base, sky, fk);
            g.beginPath();
            fc.v.forEach((v, i) => { const q = proj(b.x + v[0], v[1], b.z + v[2]); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); });
            g.closePath(); g.fillStyle = css(col); g.fill();
            if (!b.post) { g.lineWidth = 1; g.strokeStyle = css(C.ink, 0.05 * (1 - fk)); g.stroke(); }
          }
        }
      },
    };
  },
});

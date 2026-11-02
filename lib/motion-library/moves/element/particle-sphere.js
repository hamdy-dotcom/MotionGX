// Rotating particle globe with orbit rings: a Fibonacci sphere of 800–4000 small glowing dots (radius ~0.36 of the
// target / picture region), each dot coloured by its height — the look's second accent at the top ramping to its
// accent at the bottom — and faded by depth (the back half down to 25%). The globe turns about Y at `speed` °/s
// (the other way in Arabic) under a fixed 15° X tilt. 0–3 thin 1 px orbit rings (radius 1.28× the globe, so they read
// as rx 230 / ry 70 ellipses at a 180 px globe) at different tilts turn more slowly, their far half drawn behind the
// dots and their near half in front. Intro: every dot starts in a tight seeded clump at the centre and eases out to
// its place on the sphere in 1 s on expo.out (a slight per-dot delay); it fades at the end. Painted per frame from t.
// Source: prompt-motion "motiondsgnr-yo-opus-5-5-raw" (reference only — our own canvas rebuild).
ML.define({
  id: "element.particle-sphere",
  category: "element",
  name: "Rotating particle globe with orbit rings",
  does: "A sphere made of thousands of glowing dots spins slowly, crossed by thin elliptical orbit rings.",
  says: ["tech", "scale", "connection"],
  energy: 3,
  targets: ["shape", "stage"],
  duration: [2, 10],
  params: {
    density: { type: "number", range: [800, 4000], default: 2000 },
    rings: { type: "number", range: [0, 3], default: 2 },
    speed: { type: "number", range: [5, 40], default: 20, unit: "deg/s" },
    tilt: { type: "number", range: [0, 35], default: 15, unit: "deg" },
    intro: { type: "choice", options: ["clump", "fade"], default: "clump" },
  },
  pairs: ["text-in.punchline", "element.particle-assemble", "camera.push-in"],
  avoid: ["playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:motiondsgnr-yo-opus-5-5-raw", license: "reference", note: "Fibonacci dot globe with tilted orbit rings rebuilt as our own canvas painter; every frame from t" },
  setup(ctx) {
    const { el, p, at, end, f, rtl, stage } = ctx;
    const doc = document;
    const host = ctx.scene || stage;
    const own = el && el !== stage ? el : null;
    const A = own ? ctx.box(own) : f.pic;
    const cv = doc.createElement("canvas");
    cv.style.cssText = `position:absolute;left:${A.x}px;top:${A.y}px;width:${A.w}px;height:${A.h}px;pointer-events:none;z-index:8;`;
    host.append(cv);
    const W = Math.max(10, Math.round(A.w)), H = Math.max(10, Math.round(A.h));
    cv.width = W; cv.height = H;
    const g = cv.getContext("2d", { willReadFrequently: true });
    // the look's colours, read through a canvas so any CSS colour form works
    const rgb = (v) => { const s = doc.createElement("span"); s.style.color = v; host.append(s); const c = getComputedStyle(s).color; s.remove(); g.clearRect(0, 0, 1, 1); g.fillStyle = c; g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; g.clearRect(0, 0, 1, 1); return [d[0], d[1], d[2]]; };
    const top = rgb("var(--x-accent-2)"), bot = rgb("var(--x-accent)"), ink = rgb("var(--x-ink)");
    const STEPS = 24;
    const ramp = Array.from({ length: STEPS }, (_, i) => { const u = i / (STEPS - 1); return `rgb(${top.map((c, j) => Math.round(c + (bot[j] - c) * u)).join(",")})`; });
    const ringCol = `rgb(${ink.map((c, j) => Math.round((c + bot[j]) / 2)).join(",")})`;

    const n = Math.round(ML.clamp(p.density, 800, 4000));
    const nr = Math.round(ML.clamp(p.rings, 0, 3));
    const R = Math.min(W / 2 / 1.36, H / 2 / 1.12) * 0.94;
    const cx = W / 2, cy = H / 2;
    const k = R / 180; // the source's 180 px globe
    const pts = new Float32Array(n * 6);
    const GA = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), th = GA * i;
      pts[i * 6] = Math.cos(th) * r; pts[i * 6 + 1] = y; pts[i * 6 + 2] = Math.sin(th) * r;
      // the clump it starts in: a seeded ball of 0.12 R
      const u = Math.cbrt(ML.rnd(i, 1)) * 0.12, a = ML.rnd(i, 2) * Math.PI * 2, b = Math.acos(2 * ML.rnd(i, 3) - 1);
      pts[i * 6 + 3] = Math.sin(b) * Math.cos(a) * u; pts[i * 6 + 4] = Math.cos(b) * u; pts[i * 6 + 5] = Math.sin(b) * Math.sin(a) * u;
    }
    const rings = Array.from({ length: nr }, (_, j) => ({ tx: ((j === 0 ? 4 : j === 1 ? -14 : 22) * Math.PI) / 180, tz: ((j === 0 ? -12 : j === 1 ? 24 : -30) * Math.PI) / 180, sp: 0.35 + 0.15 * j }));
    const tilt = (ML.clamp(p.tilt, 0, 35) * Math.PI) / 180, ct = Math.cos(tilt), st = Math.sin(tilt);
    const dirn = rtl ? -1 : 1;
    const outA = Math.max(at + 1.4, end - 0.45);
    ctx.sfx(at, "swell", 0.3);

    // a point on the unit sphere (x, y, z) → screen, after the turn about Y and the X tilt; z > 0 is near
    const proj = (x, y, z, cy0, sy0, out) => {
      const x1 = x * cy0 + z * sy0, z1 = -x * sy0 + z * cy0;
      const y2 = y * ct - z1 * st, z2 = y * st + z1 * ct;
      const persp = 1 / (1 - z2 * 0.18);
      out[0] = cx + x1 * R * persp; out[1] = cy - y2 * R * persp; out[2] = z2;
    };
    const tmp = [0, 0, 0];
    const ring = (rg, a, front, alpha) => {
      g.strokeStyle = ringCol; g.lineWidth = Math.max(1, k); g.globalAlpha = alpha;
      const SEG = 96, ca = Math.cos(a), sa = Math.sin(a), cX = Math.cos(rg.tx), sX = Math.sin(rg.tx), cZ = Math.cos(rg.tz), sZ = Math.sin(rg.tz);
      g.beginPath();
      let pen = false;
      for (let s = 0; s <= SEG; s++) {
        const q = (s / SEG) * Math.PI * 2;
        // a circle of 1.28 R in the XZ plane, tilted about X then Z, then turned with the globe
        let x = Math.cos(q) * 1.28, y = 0, z = Math.sin(q) * 1.28;
        let y1 = y * cX - z * sX, z1 = y * sX + z * cX; y = y1; z = z1;
        const x1 = x * cZ - y * sZ; y1 = x * sZ + y * cZ; x = x1; y = y1;
        proj(x, y, z, ca, sa, tmp);
        const near = tmp[2] >= 0;
        if (near === front) { if (!pen) { g.moveTo(tmp[0], tmp[1]); pen = true; } else g.lineTo(tmp[0], tmp[1]); }
        else pen = false;
      }
      g.stroke();
    };
    return {
      draw(t) {
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalAlpha = 1;
        g.clearRect(0, 0, W, H);
        const vis = t >= at - 1e-6 && t <= outA + 0.5;
        cv.style.visibility = vis ? "visible" : "hidden";
        if (!vis) return;
        const fadeIn = p.intro === "fade" ? ML.ease(t, at, at + 0.7) : ML.lin(t, at, at + 0.25);
        const o = fadeIn * (1 - ML.ease(t, outA, outA + 0.4));
        const turn = ((p.speed * (t - at) * Math.PI) / 180) * dirn;
        const cY = Math.cos(turn), sY = Math.sin(turn);
        const ra = (rg) => turn * rg.sp + rg.sp;
        for (const rg of rings) ring(rg, ra(rg), false, 0.22 * o);
        const dot = Math.max(1, 2 * k);
        for (let i = 0; i < n; i++) {
          const e = p.intro === "clump" ? ML.expo(t, at + ML.rnd(i, 4) * 0.25, at + ML.rnd(i, 4) * 0.25 + 1) : 1;
          const x = pts[i * 6 + 3] + (pts[i * 6] - pts[i * 6 + 3]) * e;
          const y = pts[i * 6 + 4] + (pts[i * 6 + 1] - pts[i * 6 + 4]) * e;
          const z = pts[i * 6 + 5] + (pts[i * 6 + 2] - pts[i * 6 + 5]) * e;
          proj(x, y, z, cY, sY, tmp);
          const near = (tmp[2] + 1) / 2; // 0 back … 1 front
          g.globalAlpha = o * (0.25 + 0.75 * near);
          g.fillStyle = ramp[Math.round(ML.clamp((1 - pts[i * 6 + 1]) / 2) * (STEPS - 1))];
          const s = dot * (0.7 + 0.45 * near);
          g.fillRect(tmp[0] - s / 2, tmp[1] - s / 2, s, s);
        }
        for (const rg of rings) ring(rg, ra(rg), true, 0.5 * o);
        g.globalAlpha = 1;
      },
    };
  },
});

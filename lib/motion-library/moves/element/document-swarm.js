// Documents multiply into a 3D swarm: one page floats in, then two, four, eight… (or a steady count per beat) until
// up to thousands of pages fill the space in depth. Painted on a canvas every frame from t: perspective 1200 px (scaled
// to the stage), each page flies from z −2000 to a seeded slot (x ±60 % W, y ±56 % H, wider with depth, z −800…400) with rotateX / Y
// ±30°, 0.6 s ease-out, then drifts and spins slowly. Depth of field: pages are pre-rendered at four blur levels and
// picked by |z| (0–8 px), the first page stays in focus; far pages are shaded darker (in any look). The camera dollies back 15 %. In the last quarter the pages
// turn grey and fall as motion-streaked confetti that keeps the frame full (wrapped, so nothing empties).
// Pages / cards / icons are drawn from the look's colours; a picture target becomes the first page (never blurred,
// never drawn past its own pixels).
// Source: prompt-motion "sudo-kiran-videos-created-using-the" (reference only — rebuilt as our own code).
ML.define({
  id: "element.document-swarm",
  category: "element",
  name: "Documents multiply into a 3D swarm",
  does: "One page floats in, then two, four, eight… until up to thousands of pages fill the space in depth.",
  says: ["scale", "problem", "growth", "urgency"],
  energy: 4,
  targets: ["card", "image", "stage"],
  duration: [2, 5],
  params: {
    object: { type: "choice", options: ["pages", "cards", "icons"], default: "pages" },
    growth: { type: "choice", options: ["doubling", "linear"], default: "doubling" },
    max: { type: "number", range: [64, 4000], default: 1000 },
    confetti: { type: "bool", default: true },
    dolly: { type: "number", range: [0, 0.3], default: 0.15 },
  },
  pairs: ["text-in.punchline", "camera.push-in"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "riser",
  source: { from: "prompt-motion:sudo-kiran-videos-created-using-the", license: "reference", note: "technique rebuilt as our own code (canvas, seeded slots, pre-blurred sprites)" },
  setup(ctx) {
    const { p, at, end, f, el } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const W = f.W, H = f.H, S = Math.min(W, H);
    const own = el && el !== ctx.stage ? el : null;
    const img = own && (own.tagName === "IMG" ? own : own.querySelector("img"));
    const pic = img && img.naturalWidth ? img : null;

    // look colours, resolved to rgb through a probe (a look may write them as var() or color-mix())
    const probe = doc.createElement("div");
    host.append(probe);
    const col = (v) => { probe.style.color = `var(${v})`; return getComputedStyle(probe).color; };
    const C = { panel: col("--x-panel"), panel2: col("--x-panel-2"), ink: col("--x-ink"), dim: col("--x-dim"), accent: col("--x-accent"), accent2: col("--x-accent-2"), accentInk: col("--x-accent-ink"), edge: col("--x-edge-color"), ground: col("--x-ground") };
    // far pages go darker in a light look and in a dark one: shaded by whichever of ink / ground is the darker
    const lum = (c) => { const m = c.match(/[\d.]+/g) || [0, 0, 0]; return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
    const SHADE = lum(C.ink) < lum(C.ground) ? C.ink : C.ground;
    probe.remove();

    const cv = doc.createElement("canvas");
    cv.width = W; cv.height = H;
    cv.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none;z-index:7;`;
    host.append(cv);
    const g = cv.getContext("2d");

    // ── sprites: base size, then textures at 2× (so a near page at 1.5× is still drawn down, sharp) ──
    const N = Math.round(ML.clamp(p.max, 64, 4000));
    const sizeK = Math.pow(1000 / N, 0.22);
    const pw = S * (p.object === "icons" ? 0.075 : 0.085) * sizeK, ph = p.object === "pages" ? pw * 1.414 : p.object === "cards" ? pw * 0.66 : pw;
    const TW = Math.ceil(pw * 2), TH = Math.ceil(ph * 2), PAD = 20;
    const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
    function paint(c, kind) { // kind: plain | tint | grey
      const w = TW, h = TH;
      if (p.object === "pages") {
        rr(c, 0, 0, w, h, w * 0.03); c.fillStyle = kind === "grey" ? C.dim : C.panel; c.fill();
        c.lineWidth = Math.max(1, w * 0.012); c.strokeStyle = C.edge; c.stroke();
        if (kind === "tint") { c.fillStyle = C.accent; c.fillRect(w * 0.1, h * 0.08, w * 0.5, h * 0.06); }
        c.fillStyle = kind === "grey" ? C.panel2 : C.dim; c.globalAlpha = kind === "grey" ? 0.5 : 0.45;
        for (let i = 0; i < 9; i++) { const lw = i % 4 === 3 ? 0.45 : 0.8 - ((i * 7) % 3) * 0.08; c.fillRect(w * 0.1, h * (0.22 + i * 0.075), w * lw, h * 0.022); }
        c.globalAlpha = 1;
      } else if (p.object === "cards") {
        rr(c, 0, 0, w, h, h * 0.14); c.fillStyle = kind === "grey" ? C.dim : C.panel; c.fill();
        c.lineWidth = Math.max(1, w * 0.012); c.strokeStyle = C.edge; c.stroke();
        c.fillStyle = kind === "grey" ? C.panel2 : kind === "tint" ? C.accent : C.accent2;
        c.beginPath(); c.arc(w * 0.2, h * 0.32, h * 0.13, 0, Math.PI * 2); c.fill();
        c.fillStyle = kind === "grey" ? C.panel2 : C.dim; c.globalAlpha = 0.5;
        c.fillRect(w * 0.38, h * 0.25, w * 0.48, h * 0.08); c.fillRect(w * 0.1, h * 0.62, w * 0.76, h * 0.07); c.fillRect(w * 0.1, h * 0.76, w * 0.5, h * 0.07);
        c.globalAlpha = 1;
      } else {
        rr(c, 0, 0, w, h, w * 0.24); c.fillStyle = kind === "grey" ? C.dim : kind === "tint" ? C.accent2 : C.accent; c.fill();
        c.fillStyle = kind === "grey" ? C.panel2 : C.accentInk; c.globalAlpha = 0.9;
        c.beginPath(); c.arc(w * 0.5, h * 0.42, w * 0.16, 0, Math.PI * 2); c.fill();
        rr(c, w * 0.26, h * 0.62, w * 0.48, h * 0.12, h * 0.06); c.fill();
        c.globalAlpha = 1;
      }
    }
    const BLUR = [0, 2.5, 5, 8];
    function texture(kind, blur, shade) {
      const base = doc.createElement("canvas"); base.width = TW; base.height = TH; paint(base.getContext("2d"), kind);
      const t = doc.createElement("canvas"); t.width = TW + PAD * 2; t.height = TH + PAD * 2;
      const c = t.getContext("2d");
      if (blur) c.filter = `blur(${blur * 2}px)`; // ×2: the texture is drawn at half size
      c.drawImage(base, PAD, PAD);
      c.filter = "none";
      if (shade) { c.globalCompositeOperation = "source-atop"; c.fillStyle = SHADE; c.globalAlpha = 0.38; c.fillRect(0, 0, t.width, t.height); c.globalAlpha = 1; c.globalCompositeOperation = "source-over"; }
      return t;
    }
    const TEX = {};
    for (const kind of ["plain", "tint", "grey"]) TEX[kind] = BLUR.map((b) => [texture(kind, b, false), texture(kind, b, true)]);
    const padW = (PAD / TW) * pw, padH = (PAD / TH) * ph;

    // ── pages: spawn beat, slot, rotations, drift ──
    const span = Math.max(1.2, end - at - 0.2);
    const build = span * 0.62;
    const beats = p.growth === "doubling" ? Math.ceil(Math.log2(N)) + 1 : 10;
    const beatLen = build / beats;
    const P = 1200 * (Math.max(W, H) / 1920);
    const sx = W * 0.6, sy = H * 0.56;
    const pages = Array.from({ length: N }, (_, i) => {
      const k = p.growth === "doubling" ? (i === 0 ? 0 : Math.floor(Math.log2(i)) + 1) : Math.min(beats - 1, Math.floor((i / N) * beats));
      const jit = k < 2 ? 0 : ML.rnd(i, 11) * beatLen * 0.9;
      const r = (s) => ML.rnd(i, s) * 2 - 1;
      // a slot in front of the camera: the far ones spread wider so they still fill the frame
      const z = i === 0 ? 220 : -800 + ML.rnd(i, 5) * 1200;
      const spread = (P - z) / P;
      return {
        t0: at + k * beatLen + jit,
        x: i === 0 ? 0 : r(3) * sx * spread, y: i === 0 ? 0 : r(4) * sy * spread, z,
        rx: i === 0 ? 8 : r(6) * 30, ry: i === 0 ? -10 : r(7) * 30, rz: i === 0 ? -4 : r(8) * 25,
        vx: r(9) * S * 0.02, vy: r(10) * S * 0.02, vz: r(12) * 40, w: r(13) * 22, wx: r(14) * 18, wy: r(15) * 18,
        kind: i === 0 ? "plain" : ML.rnd(i, 16) < 0.12 ? "tint" : "plain",
        fall: 0.6 + ML.rnd(i, 17) * 0.8, greyAt: ML.rnd(i, 18),
      };
    });
    const cf0 = at + span * 0.74;

    // sound: the first beats tick, the riser carries the doubling, the confetti whooshes
    for (let k = 0; k < Math.min(3, beats); k++) ctx.sfx(at + k * beatLen, "pop.soft", 0.3 - k * 0.06);
    ctx.sfx(at + beatLen * 2, "riser", 0.4);
    if (p.confetti) ctx.sfx(cf0, "whoosh.heavy", 0.3);

    const D = Math.PI / 180;
    return {
      draw(t) {
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, W, H);
        const fadeOut = 1 - ML.clamp((t - (end - 0.2)) / 0.2);
        if (pic) pic.style.opacity = (1 - ML.lin(t, at, at + 0.25)).toFixed(4); // the picture hands over to the first page
        if (t < at || fadeOut <= 0) { cv.style.visibility = "hidden"; return; }
        cv.style.visibility = "visible";
        const cam = 1 - p.dolly * ML.ease(t, at + beatLen, end);
        const conf = p.confetti ? ML.lin(t, cf0, end - 0.1) : 0;
        const tc = Math.max(0, t - cf0);
        const vis = [];
        for (let i = 0; i < N; i++) {
          const q = pages[i];
          if (t < q.t0) continue;
          const u = ML.out(t, q.t0, q.t0 + 0.6), dt = Math.max(0, t - q.t0 - 0.6), a = ML.lin(t, q.t0, q.t0 + 0.15);
          const x = q.x * (0.15 + 0.85 * u) + q.vx * dt, y = q.y * (0.15 + 0.85 * u) + q.vy * dt, z = -2000 + (q.z + 2000) * u + q.vz * dt;
          const zc = Math.min(z, P * 0.55);
          const sc = (P / (P - zc)) * cam;
          const X = W / 2 + x * sc;
          let Y = H / 2 + y * sc;
          let vy = 0;
          if (conf > 0 && p.confetti) { // falling confetti, wrapped so the frame stays full
            const fall = q.fall * H * 0.9 * tc * tc * sc;
            vy = q.fall * H * 1.8 * tc * sc;
            Y = ((((Y + fall + ph) % (H + ph * 2)) + (H + ph * 2)) % (H + ph * 2)) - ph;
          }
          const rx = (q.rx + q.wx * dt) * D, ry = (q.ry + q.wy * dt) * D, rz = (q.rz + q.w * dt + conf * 220 * (q.fall - 1)) * D;
          vis.push({ i, X, Y, z, sc, rx, ry, rz, a, vy });
        }
        vis.sort((m, n) => m.z - n.z || m.i - n.i);
        for (const v of vis) {
          const q = pages[v.i];
          const blurIdx = v.i === 0 ? 0 : Math.min(3, Math.round(Math.min(8, Math.abs(v.z) / 100) / 2.7));
          const shade = v.z < -380 ? 1 : 0;
          const grey = conf > 0 && q.greyAt < conf * 1.4;
          const isPic = pic && v.i === 0 && !grey;
          const tex = isPic ? null : TEX[grey ? "grey" : q.kind][grey ? Math.max(blurIdx, 1) : blurIdx][shade];
          const ca = Math.cos(v.ry) * v.sc, cb = Math.cos(v.rx) * v.sc, cz = Math.cos(v.rz), sz = Math.sin(v.rz);
          const ghosts = grey && v.vy > 0 ? 3 : 1;
          for (let k = ghosts - 1; k >= 0; k--) {
            g.globalAlpha = v.a * fadeOut * (k ? 0.22 / k : 1) * (v.z < -700 ? 0.75 : 1);
            g.setTransform(ca * cz, ca * sz, -cb * sz, cb * cz, v.X, v.Y - k * v.vy * 0.018);
            if (isPic) {
              // the picture as the first page: cover-cropped, drawn at or below its own pixels, never blurred
              const iw = pic.naturalWidth, ih = pic.naturalHeight, r = Math.max(pw / iw, ph / ih), cw = pw / r, ch = ph / r;
              g.drawImage(pic, (iw - cw) / 2, (ih - ch) / 2, cw, ch, -pw / 2, -ph / 2, pw, ph);
            } else g.drawImage(tex, -pw / 2 - padW, -ph / 2 - padH, pw + padW * 2, ph + padH * 2);
          }
        }
        g.globalAlpha = 1;
        g.setTransform(1, 0, 0, 1, 0, 0);
      },
    };
  },
});

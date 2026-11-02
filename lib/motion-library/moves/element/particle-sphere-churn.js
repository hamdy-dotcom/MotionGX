// Glass sphere of churning particles (the e-ink microcapsule): a glass-like ball (radius ~0.3 of the target / picture
// region) — a faint tinted body, a radial-gradient rim darkening to the edge, a thin bright edge line and a soft
// highlight up and to the leading side — holds 1500–3000 small blobs scattered through its volume in 3D. The cloud
// turns slowly; a noise field drifting through it lerps every blob between the two colours (the look's ink ↔ its
// panel by default — "black/white"), so dark and light patches churn and swap. Once in the run the whole sphere flips
// to almost all light and back over 1.2 s. Blobs are drawn back to front, nearer ones larger. Soft bokeh discs drift
// in the background; a small serif-italic figure caption sits below. Everything painted per frame from t.
// Source: prompt-motion "bogdandragomir-this-was-made-entirely" (reference only — our own canvas rebuild).
ML.define({
  id: "element.particle-sphere-churn",
  category: "element",
  name: "Glass sphere of churning particles",
  does: "A glass-like sphere holds thousands of dark and light particles that churn and swap, flipping the whole sphere light then dark.",
  says: ["tech", "precision", "story"],
  energy: 3,
  targets: ["shape", "image"],
  duration: [2, 6],
  params: {
    colours: { type: "text", default: "black/white" },
    churn_speed: { type: "number", range: [0.5, 2], default: 1 },
    count: { type: "number", range: [1500, 3000], default: 2200 },
    flip: { type: "bool", default: true },
    bokeh: { type: "bool", default: true },
    caption: { type: "text", default: "" },
    show_caption: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "camera.push-in", "element.particle-sphere"],
  avoid: ["playful", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:bogdandragomir-this-was-made-entirely", license: "reference", note: "the e-ink capsule rebuilt as our own 2D canvas painter (no WebGL needed); every frame from t" },
  setup(ctx) {
    const { el, p, at, end, f, rtl, stage } = ctx;
    const doc = document;
    const host = ctx.scene || stage;
    const own = el && el !== stage ? el : null;
    const A = own ? ctx.box(own) : f.pic;
    const k = Math.min(f.W, f.H) / 1080;
    const layer = doc.createElement("div");
    layer.style.cssText = `position:absolute;left:${A.x}px;top:${A.y}px;width:${A.w}px;height:${A.h}px;pointer-events:none;z-index:8;`;
    host.append(layer);
    const cv = doc.createElement("canvas");
    cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
    layer.append(cv);
    const W = Math.max(10, Math.round(A.w)), H = Math.max(10, Math.round(A.h));
    cv.width = W; cv.height = H;
    const g = cv.getContext("2d", { willReadFrequently: true });
    const rgb = (v) => { const s = doc.createElement("span"); s.style.color = v; host.append(s); const c = getComputedStyle(s).color; s.remove(); g.clearRect(0, 0, 1, 1); g.fillStyle = c; g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; g.clearRect(0, 0, 1, 1); return [d[0], d[1], d[2]]; };
    // the two colours: words map to the look ("black" → ink, "white" → panel, "accent", "accent-2", "ground", "dim")
    const NAMES = { black: "var(--x-ink)", dark: "var(--x-ink)", ink: "var(--x-ink)", white: "var(--x-panel)", light: "var(--x-panel)", panel: "var(--x-panel)", ground: "var(--x-ground)", accent: "var(--x-accent)", "accent-2": "var(--x-accent-2)", dim: "var(--x-dim)", good: "var(--x-good)", bad: "var(--x-bad)" };
    const [n0, n1] = String(p.colours || "black/white").toLowerCase().split(/[\/,|]/).map((s) => s.trim());
    const cDark = rgb(NAMES[n0] || NAMES.black), cLight = rgb(NAMES[n1] || NAMES.white);
    const ink = rgb("var(--x-ink)"), panel = rgb("var(--x-panel)"), acc2 = rgb("var(--x-accent-2)");
    const STEPS = 16;
    const ramp = Array.from({ length: STEPS }, (_, i) => { const u = i / (STEPS - 1); return `rgb(${cDark.map((c, j) => Math.round(c + (cLight[j] - c) * u)).join(",")})`; });
    const css = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

    // caption under the sphere (serif italic, small)
    const capH = p.show_caption ? 46 * k : 0;
    const R = Math.max(30, Math.min(W / 2, (H - capH * 1.6) / 2) * 0.62);
    const cx = W / 2, cy = (H - capH * 1.4) / 2;
    let cap = null;
    if (p.show_caption) {
      cap = doc.createElement("div");
      const txt = p.caption || (rtl ? "شكل ١ — كبسولة واحدة من الحبر الإلكتروني" : "Fig. 1 — A single microcapsule of electronic ink");
      cap.textContent = txt;
      cap.style.cssText = `position:absolute;left:0;right:0;top:${cy + R + 34 * k}px;text-align:center;font:italic 400 ${Math.round(26 * k)}px/1.3 var(--x-serif-font);color:var(--x-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 ${16 * k}px;`;
      layer.append(cap);
    }

    // the particles: seeded, uniform through the ball (radius 0.9 R)
    const n = Math.round(ML.clamp(p.count, 1500, 3000));
    const P = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.cbrt(ML.rnd(i, 1)) * 0.9, a = ML.rnd(i, 2) * Math.PI * 2, b = Math.acos(2 * ML.rnd(i, 3) - 1);
      P[i * 3] = Math.sin(b) * Math.cos(a) * u; P[i * 3 + 1] = Math.cos(b) * u; P[i * 3 + 2] = Math.sin(b) * Math.sin(a) * u;
    }
    const sx = new Float32Array(n), sy = new Float32Array(n), sz = new Float32Array(n), order = new Uint16Array(n);
    const bok = Array.from({ length: 9 }, (_, i) => ({ x: ML.rnd(i, 11), y: ML.rnd(i, 12), r: (0.08 + ML.rnd(i, 13) * 0.14) * Math.max(W, H), ph: ML.rnd(i, 14) * 6.28, c: i % 3 === 0 ? acc2 : i % 3 === 1 ? ink : panel }));
    const dirn = rtl ? -1 : 1;
    const flipA = at + Math.max(0.9, (end - at) * 0.5) - 0.6;
    const outA = Math.max(at + 1.2, end - 0.45);
    ctx.sfx(at, "swell", 0.28);
    if (p.flip) ctx.sfx(flipA, "whoosh.soft", 0.25);
    const blobR = Math.max(1.2, R / 60);

    return {
      draw(t) {
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalAlpha = 1;
        g.clearRect(0, 0, W, H);
        const vis = t >= at - 1e-6 && t <= outA + 0.5;
        layer.style.visibility = vis ? "visible" : "hidden";
        if (!vis) return;
        const o = ML.ease(t, at, at + 0.6) * (1 - ML.ease(t, outA, outA + 0.4));
        layer.style.opacity = o.toFixed(4);
        const tt = t - at, sp = ML.clamp(p.churn_speed, 0.5, 2);
        if (cap) cap.style.translate = `0 ${((1 - ML.out(t, at + 0.2, at + 0.9)) * 14 * k).toFixed(2)}px`;
        // bokeh discs (drawn shapes, never a blur of a picture)
        if (p.bokeh) for (const b of bok) {
          const x = (b.x + 0.03 * Math.sin(tt * 0.3 + b.ph)) * W, y = (b.y + 0.03 * Math.cos(tt * 0.25 + b.ph)) * H;
          const gr = g.createRadialGradient(x, y, 0, x, y, b.r);
          gr.addColorStop(0, css(b.c, 0.1)); gr.addColorStop(0.7, css(b.c, 0.05)); gr.addColorStop(1, css(b.c, 0));
          g.fillStyle = gr; g.beginPath(); g.arc(x, y, b.r, 0, Math.PI * 2); g.fill();
        }
        // the glass body behind the particles
        const body = g.createRadialGradient(cx - R * 0.25, cy - R * 0.3, R * 0.1, cx, cy, R);
        body.addColorStop(0, css(panel, 0.35)); body.addColorStop(1, css(ink, 0.08));
        g.fillStyle = body; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
        // the cloud: turns slowly about Y (and a little about X)
        const ay = tt * 0.35 * sp * dirn, ax = 0.35 + Math.sin(tt * 0.4) * 0.12;
        const cY = Math.cos(ay), sY = Math.sin(ay), cX = Math.cos(ax), sX = Math.sin(ax);
        for (let i = 0; i < n; i++) {
          const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
          const x1 = x * cY + z * sY, z1 = -x * sY + z * cY;
          const y2 = y * cX - z1 * sX, z2 = y * sX + z1 * cX;
          sx[i] = x1; sy[i] = y2; sz[i] = z2; order[i] = i;
        }
        const ord = Array.from(order).sort((a, b) => sz[a] - sz[b] || a - b);
        // the whole sphere flips to almost all light and back over 1.2 s
        const flip = p.flip ? Math.sin(Math.PI * ML.ease(t, flipA, flipA + 1.2)) : 0;
        const ts = tt * sp;
        for (const i of ord) {
          // the field, sampled in the cloud's own (unrotated) space so patches travel through it
          const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
          const nz = Math.sin(x * 3.1 + ts * 1.3) * Math.cos(y * 2.7 - ts * 0.9) + Math.sin(z * 3.7 + y * 1.4 + ts * 1.1) * 0.8 + Math.sin((x + z) * 5.3 - ts * 2.1) * 0.35;
          let u = ML.clamp(0.5 + nz * 0.42);
          u = u + (1 - u) * flip * 0.94;
          const near = (sz[i] + 1) / 2;
          const persp = 1 / (1 - sz[i] * 0.15);
          const px = cx + sx[i] * R * persp, py = cy - sy[i] * R * persp, r = blobR * (0.75 + 0.6 * near);
          g.globalAlpha = 0.55 + 0.45 * near;
          g.fillStyle = ramp[Math.round(u * (STEPS - 1))];
          g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill();
        }
        g.globalAlpha = 1;
        // glass in front: a rim darkening to the edge, a thin edge line and a highlight
        const rim = g.createRadialGradient(cx, cy, R * 0.7, cx, cy, R);
        rim.addColorStop(0, css(ink, 0)); rim.addColorStop(0.85, css(ink, 0.1)); rim.addColorStop(1, css(ink, 0.32));
        g.fillStyle = rim; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
        g.strokeStyle = css(panel, 0.85); g.lineWidth = Math.max(1, 1.5 * k);
        g.beginPath(); g.arc(cx, cy, R - g.lineWidth / 2, 0, Math.PI * 2); g.stroke();
        const hx = cx - dirn * R * 0.38, hy = cy - R * 0.45;
        const hl = g.createRadialGradient(hx, hy, 0, hx, hy, R * 0.45);
        hl.addColorStop(0, css(panel, 0.7)); hl.addColorStop(1, css(panel, 0));
        g.fillStyle = hl; g.beginPath(); g.ellipse(hx, hy, R * 0.42, R * 0.26, -0.6 * dirn, 0, Math.PI * 2); g.fill();
      },
    };
  },
});

// Halftone flow trail: a moving point leaves a glowing trail of twinkling halftone dots that swell where the trail is
// fresh and shrink to nothing as it fades. Our seekable rebuild of MengTo/Skills add-shader-cursor-trail's graph
// (DotGrid density 40, twinkle .9, dot size from a ChromaFlow trail's alpha; a diagonal black → white gradient masked by
// the dots, over a #1e1e1f → #070708 diagonal base; film grain .1). Instead of a live cursor, a virtual cursor runs an
// authored path c(t) (arc, s-curve, figure-eight, or along the target headline in its reading direction). The trail
// field at a dot is F(x, t) = Σ over path samples c(tᵢ), tᵢ ∈ [t − 0.9 s, t], of exp(−|x − c(tᵢ)|² / 2σ²) ·
// exp(−(t − tᵢ) / decay), σ ≈ 2.9% of the frame width, clamped 0..1 — so the trail is a pure function of t, no history
// carried. Dot radius = F · cell · 0.5, twinkled by 0.55 + 0.45 · sin(seedᵢ · 2π + t · (2..5)) mixed at 0.9. Dot colour
// samples a diagonal ramp (bottom-left dim → top-right bright, from the look's ink / accent). "normal-on-black" paints
// the dark diagonal base (the look's device colour) when the look is dark, and on a light look draws the dots in ink
// over the ground so text keeps its contrast; "screen-over-photo" composites the dots with mix-blend screen at .78.
// Grain: a seeded tile offset per frame (frame index from t).
// Source: MengTo/Skills web-design/add-shader-cursor-trail (MIT; shader graph idea — the canvas code is our own).
ML.define({
  id: "accent.halftone-flow-trail",
  category: "accent",
  name: "Halftone flow trail",
  does: "A moving point leaves a glowing trail made of twinkling halftone dots that swell where the trail is fresh and shrink to nothing as it fades.",
  says: ["tech", "flow", "reveal", "luxury"],
  energy: 3,
  targets: ["cursor", "stage", "headline"],
  duration: [1, 4],
  params: {
    path: { type: "choice", options: ["arc", "s-curve", "follow-word", "figure-eight"], default: "arc" },
    blend: { type: "choice", options: ["normal-on-black", "screen-over-photo"], default: "normal-on-black" },
    density: { type: "number", range: [30, 60], default: 45 },
    decay: { type: "number", range: [0.25, 0.6], default: 0.4, unit: "s" },
    twinkle: { type: "number", range: [0, 1], default: 0.9 },
    grain: { type: "number", range: [0, 0.2], default: 0.1 },
  },
  pairs: ["text-in.punchline", "background.mesh-gradient"],
  avoid: ["problem", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:web-design/add-shader-cursor-trail", license: "MIT", note: "shaders.com graph (DotGrid + ChromaFlow + gradients + grain) rebuilt as a seekable canvas field" },
  setup(ctx) {
    const { p, at, end, stage, f, rtl } = ctx;
    const doc = document;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, minSide = Math.min(W, H);
    const el = ctx.el && ctx.el !== stage ? ctx.el : null;
    const tb = el ? ctx.box(el) : null;

    // look colours
    const probe = doc.createElement("span"); probe.style.display = "none"; host.append(probe);
    const rgb = (v) => { probe.style.color = v; return (getComputedStyle(probe).color.match(/[\d.]+/g) || [0, 0, 0]).map(Number).slice(0, 3); };
    const ground = rgb("var(--x-ground)"), dev = rgb("var(--x-device)"), ink = rgb("var(--x-ink)"), acc = rgb("var(--x-accent)"), acc2 = rgb("var(--x-accent-2)"), light = rgb("var(--x-accent-ink)");
    probe.remove();
    const lum = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
    const mixc = (a, b, u) => a.map((x, i) => x + (b[i] - x) * u);
    const screen = p.blend === "screen-over-photo";
    const darkLook = lum(ground) < 0.45;
    const ownBase = !screen && darkLook; // the dark diagonal base of the source graph
    // the dot ramp: bottom-left → top-right
    let lo, hi;
    if (screen || ownBase) { lo = mixc(dev, acc, 0.35); hi = mixc(lum(light) > 0.6 ? light : [255, 255, 255], acc2, 0.15); }
    else { lo = mixc(ink, acc, 0.25); hi = acc; } // a light look: ink → accent dots over the ground

    // two layers: the dark diagonal base behind the scene's content (only when the look is dark), and the dots over
    // it — screen-blended on dark and over photos (light adds), multiplied on a light look (text stays legible)
    const cv = doc.createElement("canvas");
    const RES = 0.5; // half resolution: dots are soft round marks, never pictures
    cv.width = Math.round(W * RES); cv.height = Math.round(H * RES);
    cv.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none;visibility:hidden;z-index:15;will-change:transform;mix-blend-mode:${screen || ownBase ? "screen" : "multiply"};${screen ? "opacity:.78;" : ""}`;
    host.append(cv);
    let baseEl = null;
    if (ownBase) {
      baseEl = doc.createElement("div");
      const c1 = mixc(dev, [255, 255, 255], 0.08).map(Math.round).join(","), c2 = mixc(dev, [0, 0, 0], 0.4).map(Math.round).join(",");
      baseEl.style.cssText = `position:absolute;inset:0;pointer-events:none;visibility:hidden;z-index:0;background:linear-gradient(to top right, rgb(${c1}), rgb(${c2}));`;
      host.prepend(baseEl);
    }
    const g = cv.getContext("2d");

    // grain tile, seeded once
    const GT = 128, gt = doc.createElement("canvas"); gt.width = gt.height = GT;
    { const gg = gt.getContext("2d"), im = gg.createImageData(GT, GT); for (let i = 0; i < GT * GT; i++) { const v = Math.round(ML.rnd(i, 17) * 255); im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; } gg.putImageData(im, 0, 0); }

    // the dot grid: `density` dots across the short side
    const n = Math.round(ML.clamp(+p.density || 45, 30, 60));
    const cell = minSide / n, cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
    const dots = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, x = (c + 0.5) * cell, y = (r + 0.5) * cell;
      const dg = ML.clamp((x / W + (1 - y / H)) / 2); // diagonal: bottom-left 0 → top-right 1
      const col = mixc(lo, hi, dg);
      dots.push({ x, y, seed: ML.rnd(i, 3), sp: 2 + 3 * ML.rnd(i, 5), col: `rgb(${col.map(Math.round).join(",")})` });
    }

    // the virtual cursor's path c(u), u 0 → 1 (screen px). Directions follow the reading side.
    const s = rtl ? -1 : 1, cx = W / 2, cy = H / 2;
    const flipX = (x) => (s < 0 ? W - x : x);
    const R = Math.min(W, H);
    const paths = {
      arc: (u) => { const a = Math.PI * (1.1 - 1.2 * u); return { x: flipX(cx - Math.cos(a) * R * 0.42), y: cy + R * 0.18 - Math.sin(a) * R * 0.32 }; },
      "s-curve": (u) => ({ x: flipX(W * (0.1 + 0.8 * u)), y: cy + Math.sin(u * Math.PI * 2) * H * 0.18 }),
      "figure-eight": (u) => { const a = u * Math.PI * 2; return { x: flipX(cx + Math.sin(a) * R * 0.36), y: cy + Math.sin(2 * a) * R * 0.2 }; },
      // along the target headline's own box, in its reading direction, under its baseline
      "follow-word": (u) => {
        const b = tb || { x: f.head.x, y: f.head.y, w: f.head.w, h: f.head.h };
        const k = s < 0 ? 1.05 - 1.1 * u : -0.05 + 1.1 * u;
        return { x: b.x + b.w * k, y: b.y + b.h * (0.85 + 0.12 * Math.sin(u * Math.PI * 3)) };
      },
    };
    const path = paths[p.path] || paths.arc;
    const t1 = Math.max(at + 0.6, end - 0.6); // the cursor travels between at and t1, then the trail dies away
    const uAt = (tt) => ML.ease(tt, at, t1);
    const sigma = W * 0.029, inv2s = 1 / (2 * sigma * sigma);
    const decay = ML.clamp(+p.decay || 0.4, 0.25, 0.6);
    const tw = ML.clamp(p.twinkle ?? 0.9, 0, 1);
    const SAMPLES = 28, WINDOW = 0.9;
    ctx.sfx(at, "whoosh.soft", 0.3);
    if (t1 - at > 1.4) ctx.sfx(at + (t1 - at) * 0.5, "whoosh.soft", 0.2);

    return {
      draw(t) {
        if (t < at - 1e-6 || t > end + 0.2) { cv.style.visibility = "hidden"; if (baseEl) baseEl.style.visibility = "hidden"; return; }
        cv.style.visibility = "visible";
        const fade = ML.lin(t, at, at + 0.25) * (1 - ML.ease(t, end - 0.25, end + 0.2));
        g.setTransform(RES, 0, 0, RES, 0, 0);
        g.clearRect(0, 0, W, H);
        if (baseEl) { baseEl.style.visibility = "visible"; baseEl.style.opacity = fade.toFixed(4); }
        // path samples inside the trail window, each with its age weight
        const smp = [];
        for (let i = 0; i < SAMPLES; i++) {
          const ti = t - (WINDOW * i) / (SAMPLES - 1);
          if (ti < at) break;
          const q = path(uAt(ti)); smp.push(q.x, q.y, Math.exp(-(t - ti) / decay) * (WINDOW / SAMPLES) * 5.5);
        }
        g.globalAlpha = fade;
        const reach = sigma * 3.2, reach2 = reach * reach;
        if (smp.length) {
          // bounding box of the live trail: only dots near it can light up
          let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
          for (let i = 0; i < smp.length; i += 3) { x0 = Math.min(x0, smp[i]); x1 = Math.max(x1, smp[i]); y0 = Math.min(y0, smp[i + 1]); y1 = Math.max(y1, smp[i + 1]); }
          x0 -= reach; x1 += reach; y0 -= reach; y1 += reach;
          for (const d of dots) {
            if (d.x < x0 || d.x > x1 || d.y < y0 || d.y > y1) continue;
            let F = 0;
            for (let i = 0; i < smp.length; i += 3) { const dx = d.x - smp[i], dy = d.y - smp[i + 1], r2 = dx * dx + dy * dy; if (r2 < reach2) F += Math.exp(-r2 * inv2s) * smp[i + 2]; }
            F = Math.min(1, F);
            if (F < 0.02) continue;
            const twk = 1 - tw + tw * (0.55 + 0.45 * Math.sin(d.seed * 6.283 + t * d.sp));
            const rad = F * cell * 0.5 * twk;
            if (rad < 0.4) continue;
            g.fillStyle = d.col; g.beginPath(); g.arc(d.x, d.y, rad, 0, Math.PI * 2); g.fill();
          }
          // the moving point itself: a small bright head
          if (t <= t1 + 0.05) { const q = path(uAt(t)); const hg = g.createRadialGradient(q.x, q.y, 0, q.x, q.y, cell * 1.6); hg.addColorStop(0, `rgba(${hi.map(Math.round).join(",")},0.95)`); hg.addColorStop(1, `rgba(${hi.map(Math.round).join(",")},0)`); g.fillStyle = hg; g.beginPath(); g.arc(q.x, q.y, cell * 1.6, 0, Math.PI * 2); g.fill(); }
        }
        // film grain: the seeded tile, shifted by the frame number (deterministic)
        const gs = ML.clamp(p.grain ?? 0.1, 0, 0.2);
        if (gs > 0 && (ownBase || screen)) {
          const fr = Math.floor(t * 24), ox = Math.floor(ML.rnd(fr, 1) * GT), oy = Math.floor(ML.rnd(fr, 2) * GT);
          g.globalAlpha = gs * fade * 0.6; g.globalCompositeOperation = "overlay";
          g.setTransform(RES * 2, 0, 0, RES * 2, 0, 0);
          for (let y = -oy; y < H / 2; y += GT) for (let x = -ox; x < W / 2; x += GT) g.drawImage(gt, x, y);
          g.globalCompositeOperation = "source-over";
        }
        g.globalAlpha = 1;
      },
    };
  },
});

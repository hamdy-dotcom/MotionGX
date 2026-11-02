// Spikes erupt in a wave: clusters of faceted spikes burst up out of the ground one after another along a line, each
// at 0.05 + s / 5.2 s (a wave of ~5.2 m/s over a ~5 m line, compressed when the move is short), rising in
// 0.2 + 0.06 h s along 1 − (1 − x)^3.2 from under a ground clip (nothing below the floor is drawn). The main spike grows
// taller along the line (the tallest last), leaning 0.16–0.34 rad forward; 1–3 satellites at 0.32–0.6 × its height lean
// out to the sides. Each cluster lands with a ground ring, a flash and flung chips; the tallest gets a short starburst at
// its tip; each spike's inner light bursts as it breaks the surface and settles (0.24 + 1.4 e^(−3.5 age)).
// Shatter: after a short hold each spike breaks into shards along height bands that fly out and fall under gravity,
// the stump frozen into the ground stays. Pixel variant: 6–12 triangles grow scaleY 0 → 1 in 0.1 s steps(3), 0.03 s
// apart, hold 0.3 s, then (with shatter) break into 2-pixel shards falling under gravity, white edge highlight.
// Directions: start → end (mirrored in Arabic), radial (from the centre out) or toward the camera (back to front in
// perspective). Every colour is mixed from the look (accent / accent-2 / bad / dim with panel and ink).
// Source: MengTo/Skills game-combat/ice-frost-skill-vfx assets/frost-energy.mjs (MIT): spikePlanes (lopsided faceted
// prism with chips), updateSpikes (rise curve 1 − (1 − x)^3.2, glow 0.24 + 1.4 e^(−3.5 age)), shatterSpike (bands,
// the frozen stump stays) — rebuilt in 2D canvas, every frame from t; prompt-motion 0xevinho-opus-5-5-is-really
// (reference: the pixel-art variant).
ML.define({
  id: "element.spike-eruption",
  category: "element",
  name: "Spikes erupt in a wave",
  does: "Sharp crystalline spikes burst up out of the ground one after another along a line, each with a flash, the tallest last - and can shatter into falling shards.",
  says: ["growth", "energy", "arrival", "scale", "step", "problem"],
  energy: 4,
  targets: ["list", "chart", "shape", "stage"],
  duration: [0.8, 2.5],
  params: {
    count: { type: "number", range: [3, 12], default: 7 },
    direction: { type: "choice", options: ["start-to-end", "radial", "toward-camera"], default: "start-to-end" },
    material: { type: "choice", options: ["ice", "crystal", "fire", "rock", "brand"], default: "crystal" },
    style: { type: "choice", options: ["faceted", "pixel"], default: "faceted" },
    shatter: { type: "bool", default: false },
  },
  pairs: ["camera.impact-shake", "text-in.slam"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "MengTo/Skills:agent-skills/game-combat/ice-frost-skill-vfx", license: "MIT", note: "frost-energy.mjs spike shape / rise / glow / shatter rebuilt in 2D canvas; pixel variant from prompt-motion 0xevinho-opus-5-5-is-really (reference)" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const ob = own ? ctx.box(own) : null;
    const R = ob && ob.w > f.W * 0.4 && ob.h > f.H * 0.18 ? ob : f.pic;
    const W = Math.round(R.w), H = Math.round(R.h);
    const cv = doc.createElement("canvas");
    cv.width = W; cv.height = H;
    cv.style.cssText = `position:absolute;left:${R.x}px;top:${R.y}px;width:${W}px;height:${H}px;pointer-events:none;z-index:6;`;
    host.append(cv);
    const g = cv.getContext("2d");
    const rnd = ML.rnd;

    // ── colours from the look ──
    const probe = doc.createElement("div"); probe.style.display = "none"; host.append(probe);
    const rgb = (css) => {
      probe.style.color = ""; probe.style.color = css;
      const s = getComputedStyle(probe).color, n = (s.match(/-?[\d.]+/g) || ["0", "0", "0"]).map(Number);
      return s.startsWith("color(") ? n.slice(0, 3).map((v) => v * 255) : n.slice(0, 3);
    };
    const MAT = {
      ice: ["var(--x-accent-2) 40%, var(--x-panel)", "var(--x-accent-2) 12%, var(--x-panel)", "var(--x-accent-2) 70%, var(--x-ink)"],
      crystal: ["var(--x-accent-2) 85%, var(--x-panel)", "var(--x-accent-2) 40%, var(--x-panel)", "var(--x-accent) 75%, var(--x-ink)"],
      fire: ["var(--x-bad) 90%, var(--x-panel)", "var(--x-bad) 35%, var(--x-panel)", "var(--x-bad) 65%, var(--x-ink)"],
      rock: ["var(--x-dim) 90%, var(--x-panel)", "var(--x-dim) 45%, var(--x-panel)", "var(--x-dim) 45%, var(--x-ink)"],
      brand: ["var(--x-accent) 90%, var(--x-panel)", "var(--x-accent) 40%, var(--x-panel)", "var(--x-accent) 65%, var(--x-ink)"],
    }[p.material] || null;
    const [cBase, cLight, cDark] = (MAT || []).map((m) => rgb(`color-mix(in srgb, ${m})`));
    const cEdge = rgb("var(--x-panel)"), cLine = rgb("var(--x-dim)");
    probe.remove();
    const mixc = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
    const css = (c, a = 1) => `rgba(${c.map((v) => Math.round(ML.clamp(v, 0, 255))).join(",")},${a.toFixed(3)})`;

    // ── the clusters: where, when, how tall ──
    const n = Math.round(ML.clamp(p.count, 3, 12));
    const dir = rtl ? -1 : 1;
    const gy = H * 0.8; // the ground line
    const span = Math.min(0.96, Math.max(0.3, (end - at) * 0.45)); // the wave's run (5 m at 5.2 m/s, compressed if short)
    const pix = p.style === "pixel";
    const unit = Math.min(W / 6.2, gy / 2.6); // px per metre
    const clusters = [];
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 1 : i / (n - 1);
      let x, y = gy, sc = 1, order = u, lean;
      if (p.direction === "radial") {
        x = W * (0.08 + 0.84 * u);
        order = Math.abs(u - 0.5) * 2;
        lean = (u < 0.5 ? -1 : 1) * (0.16 + 0.18 * rnd(i, 3));
      } else if (p.direction === "toward-camera") {
        sc = 0.35 + 0.65 * u;
        y = gy - (1 - u) * gy * 0.42;
        x = W / 2 + (rnd(i, 4) - 0.5) * W * 0.35 * sc;
        lean = (i % 2 ? 1 : -1) * (0.16 + 0.18 * rnd(i, 3));
      } else {
        x = W * (rtl ? 0.94 - 0.74 * u : 0.06 + 0.74 * u); // room at the far end for the forward lean
        lean = dir * (0.16 + 0.18 * rnd(i, 3));
      }
      const hM = (0.8 + 1.4 * Math.pow(order, 1.3)) * (0.9 + 0.2 * rnd(i, 5)); // metres: the tallest last
      const erupt = at + 0.05 + order * span + (pix ? 0 : rnd(i, 6) * 0.04);
      clusters.push({ i, x, y, sc, order, lean, hM, erupt });
    }
    if (pix) clusters.forEach((c, i) => (c.erupt = at + 0.05 + (p.direction === "radial" ? Math.round(c.order * (n - 1) / 2) : p.direction === "toward-camera" ? i : i) * 0.03 * (n > 8 ? 1 : 1.6)));
    const tallest = clusters.reduce((a, c) => (c.hM * c.sc > a.hM * a.sc ? c : a), clusters[0]);

    // spikes: the main one and 1–3 satellites per cluster, each a lopsided faceted blade (local coords: base at 0, up −y)
    const spikes = [];
    for (const c of clusters) {
      const Hm = Math.min(c.hM * unit * c.sc, c.y * 0.92);
      const mk = (h, lean, dx, delay, seed) => {
        const w = h * (0.13 + 0.06 * rnd(seed, 1));
        const ax = (rnd(seed, 2) - 0.5) * 0.36 * w, rx = (rnd(seed, 3) - 0.5) * 0.6 * w;
        const sh = { x: -w * (0.72 + 0.1 * rnd(seed, 4)), y: -h * (0.3 + 0.25 * rnd(seed, 5)) }; // a chip off the lit edge
        const left = [[-w, 0], [sh.x, sh.y], [ax, -h], [rx, 0]];
        const right = [[rx, 0], [ax, -h], [w * 0.62, -h * (0.35 + 0.2 * rnd(seed, 6))], [w, 0]];
        return { c, h, w, lean, dx, delay, seed, left, right, apex: [ax, -h], rise: 0.2 + 0.06 * (h / unit) };
      };
      spikes.push(mk(Hm, c.lean, 0, 0, c.i * 11 + 1));
      const sats = 1 + Math.floor(rnd(c.i, 7) * 3);
      for (let s = 0; s < sats; s++) {
        const side = s % 2 ? -1 : 1, k = 0.32 + 0.28 * rnd(c.i * 5 + s, 8);
        spikes.push(mk(Hm * k, c.lean * 0.4 + side * (0.35 + 0.25 * rnd(c.i, 9 + s)), side * Hm * (0.1 + 0.06 * s), 0.03 + 0.05 * rnd(c.i, 12 + s), c.i * 11 + 2 + s));
      }
    }
    // draw order: back to front for the perspective line, satellites behind their main spike
    spikes.sort((a, b) => a.c.sc - b.c.sc || (a.dx === 0) - (b.dx === 0));
    const lastUp = Math.max(...spikes.map((s) => s.c.erupt + s.delay + s.rise));
    const shatterAt = lastUp + (pix ? 0.3 : 0.35);
    const G = unit * 9.8 * 0.55; // gravity in px/s² (a touch slow: it reads better on screen)

    // shards: bands of each spike's outline (the lowest band, frozen in the ground, stays)
    const outlineAt = (S, yy) => { const k = 1 - yy / S.h; return [-S.w * k + S.apex[0] * (1 - k), S.w * k + S.apex[0] * (1 - k)]; };
    for (const S of spikes) {
      S.shards = [];
      const bands = 4;
      for (let b = 1; b < bands; b++) {
        const y0 = (S.h * b) / bands, y1 = (S.h * (b + 1)) / bands;
        const [l0, r0] = outlineAt(S, y0), [l1, r1] = outlineAt(S, Math.min(y1, S.h * 0.999));
        const m0 = (l0 + r0) / 2 + (rnd(S.seed + b, 20) - 0.5) * (r0 - l0) * 0.3, m1 = (l1 + r1) / 2;
        for (const [poly, side] of [[[[l0, -y0], [m0, -y0], [m1, -y1], [l1, -y1]], -1], [[[m0, -y0], [r0, -y0], [r1, -y1], [m1, -y1]], 1]]) {
          const cx = poly.reduce((a, q) => a + q[0], 0) / 4, cy = poly.reduce((a, q) => a + q[1], 0) / 4;
          const sd = S.seed * 13 + b * 2 + (side > 0 ? 1 : 0);
          S.shards.push({ poly: poly.map((q) => [q[0] - cx, q[1] - cy]), cx, cy, vx: (side * (0.4 + rnd(sd, 21)) + S.lean) * unit * 1.2, vy: -(0.6 + rnd(sd, 22) * 1.4) * unit, w: (rnd(sd, 23) - 0.5) * 9, light: side < 0 });
        }
      }
    }

    // sounds: a hit on the tallest, light ticks on every other cluster, a snap when it shatters
    clusters.forEach((c, i) => { if (c === tallest) ctx.sfx(c.erupt, "hit", 0.5); else if (i % 2 === 0) ctx.sfx(c.erupt, "land.light", 0.25); });
    if (p.shatter) ctx.sfx(shatterAt, "snap", 0.4);
    const leave = Math.max(lastUp + (p.shatter ? 1.2 : 0.4), end - 0.3);

    // pixel buffer for the pixel style
    const px = Math.max(3, Math.round(Math.min(f.W, f.H) / 180));
    const low = pix ? doc.createElement("canvas") : null;
    if (low) { low.width = Math.ceil(W / px); low.height = Math.ceil(H / px); }
    const lg = low ? low.getContext("2d") : null;

    const poly = (c2, pts, fill) => { c2.beginPath(); pts.forEach((q, j) => (j ? c2.lineTo(q[0], q[1]) : c2.moveTo(q[0], q[1]))); c2.closePath(); c2.fillStyle = fill; c2.fill(); };
    const rise = (x) => 1 - Math.pow(1 - ML.clamp(x), 3.2);

    function drawFaceted(t) {
      // the ground: a faint line that wakes with the first spike
      g.strokeStyle = css(cLine, 0.25 * ML.out(t, at - 0.1, at + 0.3));
      g.lineWidth = Math.max(1, unit * 0.01);
      g.beginPath(); g.moveTo(0, gy); g.lineTo(W, gy); g.stroke();
      // flashes and rings under everything
      for (const c of clusters) {
        const age = t - c.erupt;
        if (age < 0) continue;
        const w0 = unit * 0.5 * c.sc;
        const fl = 0.85 * Math.exp(-age * 9);
        if (fl > 0.01) {
          const rg = g.createRadialGradient(c.x, c.y, 0, c.x, c.y, w0 * 3);
          rg.addColorStop(0, css(cEdge, fl)); rg.addColorStop(0.35, css(cLight, fl * 0.6)); rg.addColorStop(1, css(cLight, 0));
          g.fillStyle = rg; g.fillRect(c.x - w0 * 3, c.y - w0 * 3, w0 * 6, w0 * 6);
        }
        const rp = ML.clamp(age / 0.4);
        if (rp < 1) {
          g.strokeStyle = css(cLight, 0.8 * (1 - rp)); g.lineWidth = Math.max(1, w0 * 0.08 * (1 - rp) + 1);
          g.beginPath(); g.ellipse(c.x, c.y, w0 * 2.4 * ML.out(rp, 0, 1), w0 * 0.5 * ML.out(rp, 0, 1), 0, 0, Math.PI * 2); g.stroke();
        }
      }
      // spikes (clipped to above the ground they rise from)
      for (const S of spikes) {
        const c = S.c, age = t - (c.erupt + S.delay);
        if (age < 0) continue;
        const e = rise(age / S.rise);
        const glow = Math.min(1, (0.24 + 1.4 * Math.exp(-age * 3.5)) * 0.55);
        const lit = mixc(cBase, cLight, 0.35 + glow * 0.5), dk = mixc(cDark, cBase, glow * 0.4);
        const bx = c.x + S.dx, by = c.y + (1 - e) * S.h * 1.05;
        const broken = p.shatter && t >= shatterAt;
        g.save();
        g.beginPath(); g.rect(0, 0, W, c.y); g.clip();
        g.translate(bx, by); g.rotate(S.lean);
        if (!broken) {
          poly(g, S.left, css(lit)); poly(g, S.right, css(dk));
          // edge highlight down the ridge and the lit edge
          g.strokeStyle = css(cEdge, 0.55 + glow * 0.4); g.lineWidth = Math.max(1, S.w * 0.05);
          g.beginPath(); g.moveTo(S.left[3][0], 0); g.lineTo(S.apex[0], S.apex[1]); g.lineTo(S.left[1][0], S.left[1][1]); g.stroke();
        } else {
          // the stump frozen in the ground
          const [l1, r1] = outlineAt(S, S.h / 4);
          poly(g, [[-S.w, 0], [l1, -S.h / 4], [r1, -S.h / 4], [S.w, 0]], css(dk));
          poly(g, [[-S.w, 0], [l1, -S.h / 4], [(l1 + r1) / 2, -S.h / 4], [S.left[3][0], 0]], css(lit));
        }
        g.restore();
        if (broken) {
          const a = t - shatterAt, fade = 1 - ML.clamp((a - 0.7) / 0.5);
          if (fade <= 0) continue;
          const cl = Math.cos(S.lean), sl = Math.sin(S.lean);
          g.save(); g.beginPath(); g.rect(0, 0, W, c.y + unit * 0.05); g.clip();
          for (const s of S.shards) {
            const wx = bx + s.cx * cl - s.cy * sl, wy = c.y + s.cx * sl + s.cy * cl;
            const x = wx + s.vx * a, y = Math.min(c.y - 2, wy + s.vy * a + 0.5 * G * a * a);
            g.save(); g.translate(x, y); g.rotate(S.lean + s.w * a);
            poly(g, s.poly, css(s.light ? lit : dk, fade));
            g.restore();
          }
          g.restore();
        }
      }
      // chips flung from each cluster's foot
      for (const c of clusters) {
        const age = t - c.erupt;
        if (age < 0 || age > 0.8) continue;
        const w0 = unit * 0.5 * c.sc;
        for (let j = 0; j < 7; j++) {
          const vx = (rnd(c.i * 9 + j, 30) - 0.5) * unit * 3.2 * c.sc, vy = -(0.6 + rnd(c.i * 9 + j, 31)) * unit * 2.2 * c.sc;
          const x = c.x + vx * age, y = c.y + vy * age + 0.5 * G * 1.6 * age * age;
          if (y > c.y) continue;
          const s = w0 * (0.08 + 0.08 * rnd(c.i * 9 + j, 32));
          g.save(); g.translate(x, y); g.rotate(age * 12 * (j % 2 ? 1 : -1));
          poly(g, [[0, -s], [s * 0.8, s * 0.6], [-s * 0.7, s * 0.5]], css(j % 3 ? cLight : cEdge, 1 - age / 0.8));
          g.restore();
        }
      }
      // the tallest spike's starburst at its tip as it tops out
      const S0 = spikes.find((s) => s.c === tallest && s.dx === 0);
      const sb = t - (tallest.erupt + S0.rise * 0.8);
      if (sb >= 0 && sb < 0.14) {
        const cl = Math.cos(S0.lean), sl = Math.sin(S0.lean);
        const tx = tallest.x + S0.apex[0] * cl - S0.apex[1] * sl, ty = tallest.y + S0.apex[0] * sl + S0.apex[1] * cl;
        const k = sb / 0.14, L = S0.w * (1.2 + 2.2 * k);
        g.strokeStyle = css(cEdge, 1 - k); g.lineWidth = Math.max(1.5, S0.w * 0.06);
        g.beginPath();
        for (let r = 0; r < 8; r++) { const an = (r / 8) * Math.PI * 2 + 0.2, l = r % 2 ? L * 0.55 : L; g.moveTo(tx + Math.cos(an) * L * 0.25, ty + Math.sin(an) * L * 0.25); g.lineTo(tx + Math.cos(an) * l, ty + Math.sin(an) * l); }
        g.stroke();
      }
    }

    function drawPixel(t) {
      const c2 = lg, LW = low.width, LH = low.height;
      c2.clearRect(0, 0, LW, LH);
      for (const c of clusters) {
        const S = spikes.find((s) => s.c === c && s.dx === 0);
        const age = t - c.erupt;
        if (age < 0) continue;
        const k = Math.floor(Math.min(1, age / 0.1) * 3) / 3; // steps(3)
        const bx = c.x / px, by = c.y / px, h = (S.h / px) * k, w = Math.max(2, Math.round(S.w / px));
        const broken = p.shatter && t >= shatterAt;
        if (!broken) {
          poly(c2, [[bx - w, by], [bx, by - h], [bx, by]], css(cLight));
          poly(c2, [[bx, by], [bx, by - h], [bx + w, by]], css(cBase));
          c2.fillStyle = css(cEdge);
          for (let yy = 0; yy < h; yy += 1) c2.fillRect(Math.round(bx - w * (1 - yy / Math.max(1, h))), Math.round(by - yy) - 1, 1, 1);
        } else {
          const a = t - shatterAt;
          for (let j = 0; j < 14; j++) {
            const sd = c.i * 31 + j, u0 = rnd(sd, 40), v0 = rnd(sd, 41);
            const y0 = by - (S.h / px) * u0, x0 = bx + (v0 - 0.5) * 2 * w * (1 - u0);
            const x = x0 + (rnd(sd, 42) - 0.5) * 40 * a, y = Math.min(by - 1, y0 - 18 * rnd(sd, 43) * a + 0.5 * (G / px) * a * a);
            c2.fillStyle = css(j % 4 ? cLight : cEdge, 1 - ML.clamp((a - 0.6) / 0.5));
            c2.fillRect(Math.round(x), Math.round(y), 2, 2);
          }
        }
      }
      g.imageSmoothingEnabled = false;
      g.drawImage(low, 0, 0, LW * px, LH * px);
    }

    return {
      draw(t) {
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, W, H);
        const q = ML.ease(t, leave, leave + 0.25);
        cv.style.opacity = (1 - q).toFixed(4);
        cv.style.visibility = t < at - 0.1 ? "hidden" : "visible";
        if (t < at - 0.1) return;
        if (pix) drawPixel(t); else drawFaceted(t);
      },
    };
  },
});

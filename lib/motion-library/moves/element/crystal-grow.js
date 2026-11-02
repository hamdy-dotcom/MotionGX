// Crystal clusters grow from the floor: clusters of crystals push up out of the surface one after another (clusters at
// 0.3, 1.05, 1.6 s … from the start, compressed when the window is short), crystals in a cluster `stagger` apart, each
// rising over 0.42 + 0.28 × length s on an ease-out. Each crystal's habit follows the source: six prism planes (radius
// ±15 %), a lopsided rhombohedral point (alternating face offsets), a thin bevel / 1 px edge catch-light; its body is
// seen through (absorption deepening toward the root), a faint dispersion fringe on its lit edge, the root glow
// 1.6 e^(−14 h) + 0.3 e^(−5 h) (h in crystal lengths above the floor), and a film of water draining off it in rivulets
// as it rises; frost rings spread at each cluster's foot. Drawn in 2D canvas every frame from t (the WebGL ray trace's
// look, painted). Layout "bars" is the data port: one faceted crystal bar per list item, rising in order.
// Colours are mixed from the look (quartz: panel + accent-2; amethyst: accent + bad; brand-glass: accent).
// Source: MengTo/Skills game-combat/water-crystal-skill-vfx assets/tide-crystal.mjs (MIT): crystalHabit (6 prism planes
// ±15 %, 6 tip planes at ~52–58° with alternating offsets), the rise (1 − grow) × tip, the root glow, the draining film,
// frost rime — rebuilt in 2D canvas.
ML.define({
  id: "element.crystal-grow",
  category: "element",
  name: "Crystal clusters grow from the floor",
  does: "Clusters of crystals push up out of the surface one after another, a film of water draining off them and frost rings at the base.",
  says: ["growth", "luxury", "reveal", "precision"],
  energy: 3,
  targets: ["list", "stage", "logo", "chart"],
  duration: [2, 4],
  params: {
    clusters: { type: "number", range: [1, 5], default: 3 },
    material: { type: "choice", options: ["quartz", "amethyst", "brand-glass"], default: "quartz" },
    stagger: { type: "number", range: [0.05, 0.15], default: 0.085, unit: "s" },
    layout: { type: "choice", options: ["clusters", "bars"], default: "clusters" },
    film: { type: "bool", default: true },
  },
  pairs: ["camera.push-in", "text-in.punchline"],
  avoid: ["urgency", "playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "MengTo/Skills:agent-skills/game-combat/water-crystal-skill-vfx", license: "MIT", note: "tide-crystal.mjs crystal habit / rise / root glow / draining film / frost rebuilt in 2D canvas" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const ob = own ? ctx.box(own) : null;
    const R = ob && ob.w > f.W * 0.4 && ob.h > f.H * 0.2 ? ob : f.pic;
    const W = Math.round(R.w), H = Math.round(R.h);
    const cv = doc.createElement("canvas");
    cv.width = W; cv.height = H;
    cv.style.cssText = `position:absolute;left:${R.x}px;top:${R.y}px;width:${W}px;height:${H}px;pointer-events:none;z-index:6;will-change:transform;`;
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
    const M = {
      quartz: ["color-mix(in srgb, var(--x-accent-2) 22%, var(--x-panel))", "color-mix(in srgb, var(--x-accent-2) 55%, var(--x-ink))", "var(--x-accent-2)"],
      amethyst: ["color-mix(in srgb, color-mix(in srgb, var(--x-accent) 72%, var(--x-bad)) 62%, var(--x-panel))", "color-mix(in srgb, color-mix(in srgb, var(--x-accent) 72%, var(--x-bad)) 60%, var(--x-ink))", "color-mix(in srgb, var(--x-accent-2) 70%, var(--x-bad))"],
      "brand-glass": ["color-mix(in srgb, var(--x-accent) 55%, var(--x-panel))", "color-mix(in srgb, var(--x-accent) 65%, var(--x-ink))", "var(--x-accent-2)"],
    }[p.material] || null;
    const [cTint, cDeep, cGlow] = (M || ["var(--x-panel)", "var(--x-ink)", "var(--x-accent-2)"]).map(rgb);
    const cEdge = rgb("var(--x-panel)"), cLine = rgb("var(--x-dim)"), cF1 = rgb("var(--x-accent)"), cF2 = rgb("var(--x-good)"), cF3 = rgb("var(--x-bad)");
    probe.remove();
    const mixc = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
    const css = (c, a = 1) => `rgba(${c.map((v) => Math.round(ML.clamp(v, 0, 255))).join(",")},${ML.clamp(a).toFixed(3)})`;

    // ── where and when ──
    const gy = H * 0.86; // the floor
    const bars = p.layout === "bars";
    const span = Math.max(0.6, end - at - 0.9); // everything grown with time to look at
    const items = bars && own && own.children.length > 1 ? own.children.length : 0;
    const crystals = [];
    const clusters = [];
    if (bars) {
      const n = items || 5, slot = W / (n + 0.6), rad = slot * 0.26;
      for (let i = 0; i < n; i++) {
        const u = n === 1 ? 0.5 : i / (n - 1);
        const x = rtl ? W - slot * (0.8 + i) : slot * (0.8 + i);
        const len = gy * (0.32 + 0.55 * u) * (0.94 + 0.06 * rnd(i, 1));
        const t0 = at + 0.2 + (i * Math.min(span * 0.6, n * 0.22)) / Math.max(1, n);
        clusters.push({ x, t0, w: rad * 2.6 });
        crystals.push({ x, lean: 0, len, rad, t0, seed: i * 7 + 1, cl: i });
      }
    } else {
      const n = Math.round(ML.clamp(p.clusters, 1, 5));
      const BASE = [0.3, 1.05, 1.6, 2.1, 2.55];
      const k = Math.min(1, (span - 0.95) / Math.max(0.3, BASE[n - 1])); // compressed when short
      const unit = Math.min(gy / 2.3, (W / Math.max(n, 1.6)) * 0.62); // px per crystal "metre"
      for (let c = 0; c < n; c++) {
        const u = n === 1 ? 0.5 : c / (n - 1);
        const x = W * (rtl ? 0.84 - 0.68 * u : 0.16 + 0.68 * u) + (rnd(c, 2) - 0.5) * W * 0.04;
        const t0 = at + BASE[c] * Math.max(0.25, k);
        const big = (0.85 + 0.35 * rnd(c, 3)) * (n === 1 ? 1.25 : c === Math.floor(n / 2) ? 1.15 : 1);
        clusters.push({ x, t0, w: unit * 0.9 * big });
        const m = 4 + Math.floor(rnd(c, 4) * 4);
        for (let j = 0; j < m; j++) {
          const main = j === 0;
          const side = j % 2 ? -1 : 1;
          const lean = main ? (rnd(c, 5) - 0.5) * 0.24 : side * (0.22 + 0.55 * rnd(c * 9 + j, 6));
          const lenM = main ? 1.35 * big : big * (0.45 + 0.6 * rnd(c * 9 + j, 7)) * (1 - 0.06 * j);
          const len = Math.min(lenM * unit, gy * 0.9);
          crystals.push({ x: x + side * Math.ceil(j / 2) * unit * 0.1 * (0.6 + rnd(c * 9 + j, 8)), lean, len, rad: unit * (main ? 0.17 : 0.11 + 0.05 * rnd(c * 9 + j, 9)), t0: t0 + j * ML.clamp(p.stagger, 0.05, 0.15), seed: c * 31 + j * 3 + 5, cl: c, lm: lenM });
        }
      }
    }
    // each crystal's habit: prism vertices (radius ±15 %), the lopsided point, its growth time
    for (const C of crystals) {
      const s = C.seed;
      C.rot = rnd(s, 11) * (Math.PI / 3);
      C.rk = Array.from({ length: 6 }, (_, k) => C.rad * (1 + (rnd(s + k, 12) - 0.5) * 0.3));
      C.tipH = C.rad * (1.1 + rnd(s, 13) * 0.5) * (bars ? 0.8 : 1);
      C.ax = (rnd(s, 14) - 0.5) * C.rad * 0.5;
      C.off = Array.from({ length: 6 }, (_, k) => (k % 2) * C.rad * (0.12 + rnd(s + k, 15) * 0.18) + rnd(s + k, 16) * C.rad * 0.05);
      C.grow = 0.42 + 0.28 * (bars ? C.len / (gy * 0.6) : C.lm || 1);
      C.riv = Array.from({ length: 3 }, (_, k) => ({ x: (rnd(s + k, 17) - 0.5) * 1.4, lag: 0.08 + 0.2 * rnd(s + k, 18) }));
    }
    crystals.sort((a, b) => b.len * (1 - Math.abs(b.lean)) - a.len * (1 - Math.abs(a.lean)) || a.seed - b.seed); // tall at the back
    // back-to-front: the leaning satellites over the main stone
    const lastUp = Math.max(...crystals.map((C) => C.t0 + C.grow));
    const leave = Math.max(lastUp + 0.5, end - 0.3);
    clusters.forEach((c, i) => ctx.sfx(c.t0, i === 0 ? "swell" : "land.light", i === 0 ? 0.4 : 0.22));

    const rise = (x) => 1 - Math.pow(1 - ML.clamp(x), 3); // ease-out
    const L = { x: -0.55, y: -0.83 }; // light from the upper start side
    function drawCrystal(C, t) {
      const age = t - C.t0;
      if (age <= 0) return;
      const gr = rise(age / C.grow);
      const top = C.len + C.tipH;
      const lift = (1 - gr) * (top + C.rad * 0.4); // the crystal rises out of the floor, full size
      g.save();
      g.beginPath(); g.rect(0, 0, W, gy); g.clip();
      g.translate(C.x, gy); g.rotate(C.lean); g.translate(0, lift);
      // prism vertices across the view: x = r sin(a), facing = cos(normal)
      const V = C.rk.map((r, k) => { const a = C.rot + (k * Math.PI) / 3; return { x: r * Math.sin(a), z: r * Math.cos(a), h: C.len + C.off[k] }; });
      const faces = [];
      for (let k = 0; k < 6; k++) {
        const A = V[k], B = V[(k + 1) % 6], na = C.rot + (k * Math.PI) / 3 + Math.PI / 6;
        const face = Math.cos(na);
        if (face <= 0.02) continue;
        faces.push({ A, B, nx: Math.sin(na), face });
      }
      faces.sort((a, b) => a.face - b.face);
      const apex = { x: C.ax, y: -top };
      const glowRoot = (yy) => { const h = Math.max(0, -yy - lift) / Math.max(C.len, 1); return 1.6 * Math.exp(-14 * h) + 0.3 * Math.exp(-5 * h); };
      const bright = 0.3 + 0.7 * Math.exp(-age * 2.2); // the root burns brightest as it breaks the surface
      for (const F of faces) {
        const lam = ML.clamp(0.35 + 0.65 * (F.nx * L.x * -1 * 0.8 + F.face * 0.45));
        // body: seen through, deeper toward the root (absorption), the root glow over it
        const gr2 = g.createLinearGradient(0, 0, 0, -top);
        const body = mixc(cDeep, cTint, 0.35 + 0.55 * lam);
        for (const st of [0, 0.08, 0.25, 0.6, 1]) {
          const yy = -st * top, gl = Math.min(1, glowRoot(yy) * 0.55 * bright);
          gr2.addColorStop(st, css(mixc(mixc(body, cDeep, 0.25 * (1 - st)), cGlow, gl), 0.62 + 0.25 * (1 - st)));
        }
        g.beginPath(); g.moveTo(F.A.x, 0); g.lineTo(F.B.x, 0); g.lineTo(F.B.x, -F.B.h); g.lineTo(F.A.x, -F.A.h); g.closePath();
        g.fillStyle = gr2; g.fill();
        // the tip face: brighter (it looks up at the light)
        g.beginPath(); g.moveTo(F.A.x, -F.A.h); g.lineTo(F.B.x, -F.B.h); g.lineTo(apex.x, apex.y); g.closePath();
        g.fillStyle = css(mixc(cTint, cEdge, 0.25 + 0.5 * lam), 0.88); g.fill();
        // edges: the 1 px catch-light (a bevel) and a faint dispersion fringe on the lit side
        g.lineWidth = Math.max(1, C.rad * 0.025);
        g.strokeStyle = css(cEdge, 0.5 + 0.4 * lam);
        g.beginPath(); g.moveTo(F.A.x, 0); g.lineTo(F.A.x, -F.A.h); g.lineTo(apex.x, apex.y); g.stroke();
        if (lam > 0.6) {
          const dx = C.rad * 0.035;
          [[cF1, -dx], [cF2, 0], [cF3, dx]].forEach(([c, o]) => { g.strokeStyle = css(c, 0.16); g.beginPath(); g.moveTo(F.A.x + o + dx * 1.5, -C.len * 0.15); g.lineTo(F.A.x + o + dx * 1.5, -F.A.h * 0.92); g.stroke(); });
        }
      }
      // the outline's dark edge on the far side (thin), so the stone reads against a light ground
      const xs = V.map((v) => v.x), xl = Math.min(...xs), xr = Math.max(...xs);
      g.strokeStyle = css(cDeep, 0.35); g.lineWidth = Math.max(1, C.rad * 0.02);
      g.beginPath(); g.moveTo(xl, 0); g.lineTo(xl, -V[xs.indexOf(xl)].h); g.lineTo(apex.x, apex.y); g.lineTo(xr, -V[xs.indexOf(xr)].h); g.lineTo(xr, 0); g.stroke();
      // the water film draining off as it rises: its top edge falls, rivulets lag behind it
      if (p.film) {
        const d = ML.out(age, C.grow * 0.35, C.grow * 0.35 + 1.1);
        const ft = top * (1 - d);
        if (d < 1) {
          g.save();
          g.beginPath(); g.moveTo(xl, 0); g.lineTo(xl, -V[xs.indexOf(xl)].h); g.lineTo(apex.x, apex.y); g.lineTo(xr, -V[xs.indexOf(xr)].h); g.lineTo(xr, 0); g.closePath(); g.clip();
          g.fillStyle = css(cEdge, 0.2 * (1 - d * 0.6));
          g.fillRect(xl - 2, -ft, xr - xl + 4, ft);
          g.strokeStyle = css(cEdge, 0.85 * (1 - d)); g.lineWidth = Math.max(1, C.rad * 0.04);
          g.beginPath(); for (let i = 0; i <= 8; i++) { const x = xl + ((xr - xl) * i) / 8, y = -ft + Math.sin(i * 1.7 + C.seed) * C.rad * 0.05; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
          for (const r of C.riv) {
            const y0 = -ft - top * r.lag * (1 - d), x = r.x * (xr - xl) * 0.5;
            g.strokeStyle = css(cEdge, 0.6 * (1 - d)); g.lineWidth = Math.max(1, C.rad * 0.03);
            g.beginPath(); g.moveTo(x, y0); g.lineTo(x, -ft); g.stroke();
            g.fillStyle = css(cEdge, 0.7 * (1 - d)); g.beginPath(); g.arc(x, y0, Math.max(1, C.rad * 0.045), 0, Math.PI * 2); g.fill();
          }
          g.restore();
        }
      }
      g.restore();
      // the root glow on the floor where it breaks through
      const gl = 0.5 * Math.exp(-age * 1.6) * (0.4 + 0.6 * gr);
      if (gl > 0.01) {
        const rr = C.rad * 3;
        const rg = g.createRadialGradient(C.x, gy, 0, C.x, gy, rr);
        rg.addColorStop(0, css(mixc(cGlow, cEdge, 0.4), gl)); rg.addColorStop(1, css(cGlow, 0));
        g.fillStyle = rg; g.fillRect(C.x - rr, gy - rr, rr * 2, rr * 2);
      }
    }

    return {
      draw(t) {
        const on = t >= at - 0.1 && t < leave + 0.35;
        cv.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        cv.style.opacity = (1 - ML.clamp((t - leave) / 0.3)).toFixed(4);
        g.clearRect(0, 0, W, H);
        // the floor: a faint line, then frost rime and rings at each cluster's foot
        g.strokeStyle = css(cLine, 0.28 * ML.out(t, at - 0.1, at + 0.4)); g.lineWidth = Math.max(1, H * 0.002);
        g.beginPath(); g.moveTo(0, gy); g.lineTo(W, gy); g.stroke();
        for (const c of clusters) {
          const age = t - c.t0;
          if (age < 0) continue;
          const rime = ML.out(age, 0, 1.2);
          g.fillStyle = css(mixc(cTint, cEdge, 0.5), 0.35 * rime);
          g.beginPath(); g.ellipse(c.x, gy, c.w * 0.9 * rime, c.w * 0.12 * rime, 0, 0, Math.PI * 2); g.fill();
          for (let r = 0; r < 2; r++) {
            const q = ML.clamp((age - r * 0.18) / 0.9);
            if (q <= 0 || q >= 1) continue;
            g.strokeStyle = css(mixc(cGlow, cEdge, 0.5), 0.55 * (1 - q)); g.lineWidth = Math.max(1, c.w * 0.03 * (1 - q));
            g.beginPath(); g.ellipse(c.x, gy, c.w * (0.4 + 1.3 * ML.out(q, 0, 1)), c.w * 0.18 * (0.4 + 1.3 * ML.out(q, 0, 1)), 0, 0, Math.PI * 2); g.stroke();
          }
        }
        for (const C of crystals) drawCrystal(C, t);
      },
    };
  },
});

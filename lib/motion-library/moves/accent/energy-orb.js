// Charging plasma orb: a storm-cloud ball condenses and grows (radius 0.2 → 1 of its size over 2.2 s, or 60 % of a
// shorter move; pressure 0.35 → 1 when unstable), churning in place, with 10 + 5·pressure plasma arcs from a wandering
// white core to its inner wall and hairline crawlers along its rim. The 2D build of the source's ray march: the body is
// a lit billow painted per frame on a small canvas (1.5·n1 + 0.8|n2| − 0.3 + 0.5|n3| from seeded 3D value noise on the
// sphere, its coordinates turning t·(0.05 + 0.07p) and a warp drifting through at (0.09, 0.16, −0.07)/s — never
// scrolled), the core 7e^(−1400d²) + 0.8e^(−120d²) seen 45 % through it, the rim a hairline e^(−e/0.006). Arc ends sit on
// a slowly turning Fibonacci sphere (0.35 rad/s); shapes re-roll on a 30 Hz tick with seed = hash(arc, epoch), each
// held 4–9 ticks then dimming (never a strobe); 30 % crawl along the inner wall. Motes are pulled in by an attractor
// while it charges; it breathes 1 + 0.02 sin 4t. Placed behind the target (a logo or number sits on it).
// Colour: blue (a cold plasma) or brand (the look's accent family).
// Source: MengTo/Skills game-combat/lightning-energy-skill-vfx (storm-energy.mjs: orbTick, bolt(), the orb shader's
// billow / core / rim terms and the held-tick re-roll, MIT) — rebuilt as a 2D canvas move.
ML.define({
  id: "accent.energy-orb",
  category: "accent",
  name: "Charging plasma orb",
  does: "A storm-cloud ball condenses and grows, churning in place, with 10–15 plasma arcs from a white core to its inner wall and hairline crawlers on its rim.",
  says: ["energy", "tech", "focus", "time", "urgency"],
  energy: 4,
  targets: ["logo", "stage", "shape", "number"],
  duration: [1.5, 5],
  params: {
    size: { type: "choice", options: ["small", "hero"], default: "small" },
    pressure: { type: "choice", options: ["calm", "unstable"], default: "calm" },
    colour: { type: "choice", options: ["blue", "brand"], default: "blue" },
  },
  pairs: [],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "riser",
  source: { from: "MengTo/Skills:game-combat/lightning-energy-skill-vfx", license: "MIT", note: "storm-energy.mjs orb rebuilt in 2D" },
  setup(ctx) {
    const { p, at, end, f, stage, el } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, m = Math.min(W, H), k = m / 1080;
    const px = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    const rgb = (v) => { const e = document.createElement("span"); e.style.cssText = `color:${v};display:none`; host.append(e); const c = getComputedStyle(e).color; e.remove(); px.clearRect(0, 0, 1, 1); px.fillStyle = "#000"; px.fillStyle = c; px.fillRect(0, 0, 1, 1); const d = px.getImageData(0, 0, 1, 1).data; return [d[0] / 255, d[1] / 255, d[2] / 255]; };
    const brand = p.colour === "brand";
    const A1 = rgb("var(--x-accent)"), A2 = rgb("var(--x-accent-2)"), AI = rgb("var(--x-accent-ink)"), DV = rgb("var(--x-device)");
    // palette: arc light, core light, cloud body (dark / lit)
    const ARC = brand ? A2 : [0.55, 0.75, 1], CORE = brand ? A2.map((v, i) => v * 0.35 + AI[i] * 0.65) : [0.86, 0.93, 1];
    const BD = brand ? A1.map((v, i) => v * 0.18 + DV[i] * 0.82) : [0.05, 0.065, 0.11], BL = brand ? A1.map((v, i) => v * 0.55 + DV[i] * 0.45) : [0.22, 0.28, 0.42];
    const css = (c, a) => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${ML.clamp(a).toFixed(3)})`;

    // where and how big
    let C = { x: W / 2, y: H / 2 }, Rf = p.size === "hero" ? m * 0.34 : m * 0.16;
    if (el && el !== stage) { const b = ctx.box(el); C = { x: b.x + b.w / 2, y: b.y + b.h / 2 }; if (p.size !== "hero") Rf = ML.clamp(Math.max(b.w, b.h) * 0.72, m * 0.1, m * 0.22); }
    if (p.size === "hero") { C.x = ML.clamp(C.x, Rf * 1.1, W - Rf * 1.1); C.y = ML.clamp(C.y, Rf * 1.1, H - Rf * 1.1); }
    // the canvas sits just behind the target (over whatever panel holds it): a local square around the orb, placed in
    // the target's own parent with the target lifted above it; on the stage it is a full-frame layer behind the scene
    const cv = document.createElement("canvas");
    let ox = 0, oy = 0;
    if (el && el !== stage && el.parentElement) {
      const E = Math.ceil(Rf * 1.6);
      ox = Math.round(C.x - E); oy = Math.round(C.y - E);
      cv.width = cv.height = 2 * E;
      cv.style.cssText = `position:absolute;width:${2 * E}px;height:${2 * E}px;pointer-events:none;visibility:hidden;z-index:0`;
      el.parentElement.insertBefore(cv, el);
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      el.style.zIndex = "1";
      const cb = cv.offsetParent || stage, cbb = ctx.box(cb);
      cv.style.left = (ox - cbb.x - (cb.clientLeft || 0)).toFixed(1) + "px";
      cv.style.top = (oy - cbb.y - (cb.clientTop || 0)).toFixed(1) + "px";
    } else {
      cv.width = W; cv.height = H;
      cv.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;visibility:hidden";
      host.insertBefore(cv, host.firstChild); // behind the scene's content
    }
    const g = cv.getContext("2d");
    const charge = Math.min(2.2, Math.max(0.8, (end - at) * 0.6));
    const unstable = p.pressure === "unstable";
    const pressure = (t) => (unstable ? 0.35 + 0.65 * ML.ease(t, at, at + charge) : 0.35 + 0.15 * ML.ease(t, at, at + charge));
    const radius = (t) => Rf * (0.2 + 0.8 * ML.out(t, at, at + charge)) * (1 + 0.02 * Math.sin(4 * t)) * (1 - 0.85 * ML.ease(t, end - 0.3, end));

    // seeded 3D value noise (no clock, no Math.random)
    const h3 = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
    const n3 = (x, y, z) => {
      const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
      const L = (a, b, q) => a + (b - a) * q;
      return L(L(L(h3(xi, yi, zi), h3(xi + 1, yi, zi), u), L(h3(xi, yi + 1, zi), h3(xi + 1, yi + 1, zi), u), v),
        L(L(h3(xi, yi, zi + 1), h3(xi + 1, yi, zi + 1), u), L(h3(xi, yi + 1, zi + 1), h3(xi + 1, yi + 1, zi + 1), u), v), w) * 2 - 1;
    };
    // the body: painted at a small size each frame, then drawn at the orb's size (a soft cloud: no detail lost)
    const S = 150, body = document.createElement("canvas"); body.width = body.height = S;
    const bg = body.getContext("2d"), img = bg.createImageData(S, S);
    const paintBody = (t, pr, core) => {
      const turn = (t - at) * (0.05 + 0.07 * pr), ca = Math.cos(turn), sa = Math.sin(turn);
      const wx = (t - at) * 0.09, wy = (t - at) * 0.16, wz = -(t - at) * 0.07;
      const D = img.data, Lx = -0.45, Ly = -0.55, Lz = 0.7;
      for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
        const x = (i + 0.5) / S * 2.2 - 1.1, y = (j + 0.5) / S * 2.2 - 1.1, r2 = x * x + y * y, o = (j * S + i) * 4;
        if (r2 >= 1) { D[o + 3] = 0; continue; }
        const r = Math.sqrt(r2), z = Math.sqrt(1 - r2);
        // churning in place: turned with time (more near the middle), a warp drifting through
        const tw = 0.25 * (1 - r), c2 = Math.cos(turn + tw), s2 = Math.sin(turn + tw);
        const X = x * c2 - z * s2, Z = x * s2 + z * c2, Y = y;
        const q = 2.2, n1 = n3(X * q + wx, Y * q + wy, Z * q + wz), n2 = n3(X * q * 2.1 + 5.2 + wx, Y * q * 2.1 + 1.3, Z * q * 2.1 + wz), n3v = n3(X * q * 4.3 + 9.1, Y * q * 4.3 + wy * 2, Z * q * 4.3 + 3.7);
        const bil = ML.clamp(0.5 + 0.5 * (1.5 * n1 + 0.8 * Math.abs(n2) - 0.3 + 0.5 * Math.abs(n3v)) * 0.8); // abs octaves: lobes with creases
        const lam = ML.clamp(x * Lx + y * Ly + z * Lz) * 0.7 + 0.3;
        const lit = ML.clamp(bil * lam * 1.2);
        // the core seen through the cloud (45 %), thinner where the billow is thin
        const dx = x - core.x, dy = y - core.y, d2 = (dx * dx + dy * dy) * 0.25; // the source's units: radius 0.5
        const cg = (7 * Math.exp(-1400 * d2) + 0.8 * Math.exp(-120 * d2)) * 0.45 * (1.15 - bil * 0.7) * (0.6 + 0.4 * pr);
        const rim = Math.exp(-(1 - r) / 0.03) * 0.6; // the edge catching light (the crisp hairline is stroked on top)
        const a = ML.clamp((1 - Math.pow(r, 24)) * 0.97 + rim * 0.5);
        for (let c = 0; c < 3; c++) D[o + c] = Math.round(255 * ML.clamp(BD[c] + (BL[c] - BD[c]) * lit + CORE[c] * cg + ARC[c] * rim * 0.7));
        D[o + 3] = Math.round(255 * a);
      }
      bg.putImageData(img, 0, 0);
    };
    // the arcs: a jagged channel by midpoint displacement, seeded
    const bolt = (ax, ay, bx, by, seed, levels = 5, jag = 0.22) => {
      let pts = [[ax, ay], [bx, by]];
      for (let l = 0; l < levels; l++) {
        const nx = [];
        for (let i = 0; i < pts.length - 1; i++) {
          const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], L = Math.hypot(x1 - x0, y1 - y0);
          const off = (ML.rnd(seed + l * 13.1, i + 1) * 2 - 1) * L * jag;
          nx.push(pts[i], [(x0 + x1) / 2 + (-(y1 - y0) / (L || 1)) * off, (y0 + y1) / 2 + ((x1 - x0) / (L || 1)) * off]);
        }
        nx.push(pts[pts.length - 1]); pts = nx;
      }
      return pts;
    };
    const stroke = (pts, w, col, a) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.lineWidth = w; g.strokeStyle = css(col, a); g.stroke(); };
    const GA = Math.PI * (3 - Math.sqrt(5)); // the Fibonacci sphere's golden angle
    const NMAX = 15;
    const motes = Array.from({ length: 36 }, (_, i) => ({ a0: ML.rnd(i, 21) * 6.283, r0: 1.6 + ML.rnd(i, 22) * 1.4, per: 0.7 + ML.rnd(i, 23) * 0.6, ph: ML.rnd(i, 24) }));

    ctx.sfx(at, "riser", 0.4);
    ctx.sfx(at + charge, "hit", 0.3);
    return {
      draw(t) {
        const on = t >= at && t < end;
        cv.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, cv.width, cv.height);
        g.setTransform(1, 0, 0, 1, -ox, -oy); // drawn in stage coordinates
        const R = radius(t), pr = pressure(t), tick = Math.floor((t - at) * 30), op = ML.lin(t, at, at + 0.2);
        if (R < 1) return;
        g.globalAlpha = op;
        // motes pulled in by the attractor while it charges
        const pull = 1 - ML.lin(t, at + charge * 0.8, at + charge + 0.3);
        if (pull > 0) for (const mo of motes) {
          const u = (((t - at) / mo.per + mo.ph) % 1), rr = R * mo.r0 * (1 - u), a = mo.a0 + u * 2.4;
          g.beginPath(); g.arc(C.x + Math.cos(a) * rr, C.y + Math.sin(a) * rr, 2.2 * k * (0.5 + u), 0, Math.PI * 2);
          g.fillStyle = css(ARC, 0.7 * pull * Math.sin(u * Math.PI)); g.fill();
        }
        // a soft halo in the air around it
        const halo = g.createRadialGradient(C.x, C.y, R * 0.9, C.x, C.y, R * 1.5);
        halo.addColorStop(0, css(ARC, 0.22 * (0.5 + pr * 0.5))); halo.addColorStop(1, css(ARC, 0));
        g.fillStyle = halo; g.beginPath(); g.arc(C.x, C.y, R * 1.5, 0, Math.PI * 2); g.fill();
        // the core wanders a little inside
        const core = { x: 0.12 * Math.sin(1.3 * t + 0.4), y: 0.12 * Math.cos(1.7 * t) };
        paintBody(t, pr, core);
        g.imageSmoothingEnabled = true;
        g.drawImage(body, C.x - R * 1.1, C.y - R * 1.1, R * 2.2, R * 2.2);
        // the rim: a hairline e^(-e/0.006), drawn crisp at the stage's own resolution
        g.beginPath(); g.arc(C.x, C.y, R * 0.998, 0, Math.PI * 2); g.lineWidth = 1.4 * k; g.strokeStyle = css(ARC, 0.75); g.stroke();
        // arcs: core → inner wall, ends on the turning Fibonacci sphere; each held 4–9 ticks, then re-rolled
        const n = Math.round(10 + 5 * pr), cx = C.x + core.x * R, cy = C.y + core.y * R, spin = (t - at) * 0.35;
        g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round"; g.lineJoin = "round";
        g.beginPath(); g.arc(C.x, C.y, R * 0.995, 0, Math.PI * 2); g.clip();
        for (let i = 0; i < NMAX; i++) {
          if (i >= n) break;
          const hold = 4 + Math.floor(ML.rnd(i, 31) * 6), off = Math.floor(ML.rnd(i, 32) * hold), ep = Math.floor((tick + off) / hold), inT = (tick + off) % hold;
          const seed = i * 97.3 + ep * 13.7;
          if (ML.rnd(seed, 1) < 0.18 * (1 - pr)) continue; // calm: a few channels rest
          const yy = 1 - ((i + 0.5) / NMAX) * 2, rr = Math.sqrt(1 - yy * yy), th = GA * i + spin + (ML.rnd(seed, 2) - 0.5) * 0.5;
          const ex = Math.cos(th) * rr, ez = Math.sin(th) * rr, depth = 0.45 + 0.55 * (ez * 0.5 + 0.5);
          const fadeTick = inT >= hold - 2 ? (hold - inT) / 3 : 1; // a channel dims, it never blinks out
          const a = depth * fadeTick * (0.65 + 0.35 * pr);
          const crawl = ML.rnd(seed, 3) < 0.3;
          let pts;
          if (crawl) {
            // a crawler along the inner wall
            const a0 = Math.atan2(yy, ex) + (ML.rnd(seed, 4) - 0.5), span = 0.5 + 0.5 * ML.rnd(seed, 5);
            const q = []; for (let s = 0; s <= 10; s++) { const aa = a0 + span * s / 10, r3 = R * (0.94 + 0.04 * ML.rnd(seed + s, 6)); q.push([C.x + Math.cos(aa) * r3, C.y + Math.sin(aa) * r3]); }
            pts = q;
          } else pts = bolt(cx, cy, C.x + ex * R * 0.96, C.y + yy * R * 0.96, seed, 5, 0.2);
          stroke(pts, 7 * k * (R / Rf + 0.3), ARC, 0.18 * a);
          stroke(pts, 2.6 * k, ARC, 0.65 * a);
          stroke(pts, 1.1 * k, CORE, 0.95 * a);
        }
        // the white core on top
        const cg = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.35);
        cg.addColorStop(0, css(CORE, 0.95)); cg.addColorStop(0.25, css(CORE, 0.45 + 0.2 * pr)); cg.addColorStop(1, css(ARC, 0));
        g.fillStyle = cg; g.beginPath(); g.arc(cx, cy, R * 0.35, 0, Math.PI * 2); g.fill();
        g.restore();
        // hairline crawlers on the rim, outside the clip
        g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
        for (let i = 0; i < 3; i++) {
          const ep = Math.floor((tick + i * 3) / 6), seed = 500 + i * 31 + ep * 7.1;
          const a0 = ML.rnd(seed, 1) * 6.283, span = 0.35 + 0.4 * ML.rnd(seed, 2);
          const q = []; for (let s = 0; s <= 14; s++) { const aa = a0 + span * s / 14, r3 = R * (1.0 + 0.025 * (ML.rnd(seed + s, 3) - 0.3)); q.push([C.x + Math.cos(aa) * r3, C.y + Math.sin(aa) * r3]); }
          stroke(q, 1.2 * k, CORE, 0.6 * (0.4 + 0.6 * pr));
        }
        g.restore();
        g.globalAlpha = 1;
      },
    };
  },
});

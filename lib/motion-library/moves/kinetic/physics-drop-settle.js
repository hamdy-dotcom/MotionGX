// Word chips pile up: each word (or list item) becomes a solid pill that drops in from above the frame, tumbles,
// collides and stacks into a heap on a floor, in a cup or on a card. The physics is a fixed-step 2D rigid-body solve
// (120 Hz, sequential impulses with restitution and Coulomb friction, air drag, positional correction) run once in
// setup over the whole move, so every frame is just a lookup of t: seekable both ways, the same picture twice. A pill
// is exactly a capsule (chamfer radius = height / 2), so bodies collide as capsules — segment-to-segment closest
// points — against each other and against the container's static segments. Matter.js values: restitution 0.35,
// friction 0.3, frictionAir 0.01, gravity 1 (scaled to the frame); seeded start angle ±0.3 rad and spin. Chips spawn
// at y −60 px, x seeded across the width, one per spoken word (or all at once, stacked above the frame). Arabic: one
// chip per whole word, never letters.
// Source: MengTo/Skills web-design/matterjs (MIT) — the Matter.js setup and body values; the solver is our own port.
ML.define({
  id: "kinetic.physics-drop-settle",
  category: "kinetic",
  name: "Word chips pile up",
  does: "Words or feature tags drop as solid pills, tumble, collide and stack into a heap at the bottom of the frame.",
  says: ["playful", "list", "scale", "energy"],
  energy: 4,
  targets: ["word", "label", "list"],
  duration: [2, 6],
  params: {
    spawn: { type: "choice", options: ["per-word", "all-at-once"], default: "per-word" },
    container: { type: "choice", options: ["floor", "cup", "card"], default: "floor" },
    colour: { type: "choice", options: ["mono", "brand-alternating"], default: "brand-alternating" },
    restitution: { type: "number", range: [0.1, 0.6], default: 0.35 },
    friction: { type: "number", range: [0.1, 0.8], default: 0.3 },
    size: { type: "number", range: [0.6, 1.6], default: 1 },
    seed: { type: "number", range: [1, 9999], default: 7 },
  },
  pairs: ["kinetic.punchline-card", "rhythm.beat-pop"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "MengTo/Skills:web-design/matterjs", license: "MIT", note: "Matter.js body values; capsule impulse solver is our own, precomputed for seeking" },
  setup(ctx) {
    const { el, p, at, end, stage, f, rtl } = ctx;
    if (!el) return null;
    const host = ctx.scene || stage;
    // chips: list items when the target has them, else its words (Arabic words stay whole)
    const kids = [...el.children].filter((c) => (c.textContent || "").trim());
    const labels = (kids.length > 1 ? kids.map((c) => c.textContent) : (el.textContent || "").split(/\s+/)).map((s) => s.trim()).filter(Boolean).slice(0, 24);
    if (!labels.length) return null;
    const seed = Math.round(p.seed);
    const R = (i, k) => ML.rnd(i + seed * 0.618, k + seed * 0.37);

    // ── the container: static segments in stage px, and what the viewer sees of it ──
    const W = f.W, H = f.H, floorY = f.safe.y + f.safe.h + (f.tall ? 120 : 40);
    const statics = [];
    const seg = (ax, ay, bx, by) => statics.push({ ax, ay, bx, by });
    const layer = document.createElement("div");
    Object.assign(layer.style, { position: "absolute", inset: "0", zIndex: "6", pointerEvents: "none", overflow: "hidden" });
    layer.setAttribute("dir", rtl ? "rtl" : "ltr");
    host.append(layer);
    let left = f.m * 0.5, right = W - f.m * 0.5, deco = null;
    if (p.container === "cup") {
      const cw = Math.min(W * 0.7, H * 0.62), bw = cw * 0.78, ch = Math.min(H * 0.3, cw * 0.62), cx = W / 2, by = floorY, ty = by - ch;
      seg(cx - bw / 2, by, cx + bw / 2, by); seg(cx - cw / 2, ty, cx - bw / 2, by); seg(cx + bw / 2, by, cx + cw / 2, ty);
      // walls on the frame edges catch anything bouncing off the rim
      seg(0, -H * 3, 0, H); seg(W, -H * 3, W, H); seg(0, H, W, H);
      left = cx - cw / 2 + 10; right = cx + cw / 2 - 10;
      const NS = "http://www.w3.org/2000/svg";
      deco = document.createElementNS(NS, "svg");
      deco.setAttribute("viewBox", `0 0 ${W} ${H}`);
      Object.assign(deco.style, { position: "absolute", inset: "0", width: "100%", height: "100%", overflow: "visible" });
      const lw = Math.max(4, Math.min(W, H) * 0.008);
      deco.innerHTML = `<path d="M${cx - cw / 2 - lw / 2} ${ty} L${cx - bw / 2} ${by + lw / 2} L${cx + bw / 2} ${by + lw / 2} L${cx + cw / 2 + lw / 2} ${ty}" fill="var(--x-panel)" stroke="var(--x-ink)" stroke-width="${lw}" stroke-linejoin="round" stroke-linecap="round"/>`;
      layer.append(deco);
    } else if (p.container === "card") {
      const cx0 = f.m, cw = W - f.m * 2, ch = Math.min(H * 0.42, W * 0.7), cy0 = floorY - ch, pad = Math.min(W, H) * 0.03;
      deco = document.createElement("div");
      deco.className = "ml-panel";
      Object.assign(deco.style, { position: "absolute", left: cx0 + "px", top: cy0 + "px", width: cw + "px", height: ch + "px", boxSizing: "border-box" });
      layer.append(deco);
      seg(cx0 + pad, floorY - pad, cx0 + cw - pad, floorY - pad); seg(cx0 + pad, -H * 3, cx0 + pad, floorY); seg(cx0 + cw - pad, -H * 3, cx0 + cw - pad, floorY);
      left = cx0 + pad; right = cx0 + cw - pad;
    } else {
      seg(left, floorY, right, floorY); seg(left, -H * 3, left, floorY); seg(right, -H * 3, right, floorY);
      deco = document.createElement("div");
      Object.assign(deco.style, { position: "absolute", left: left + "px", width: right - left + "px", top: floorY + "px", height: "0", borderTop: "var(--x-edge) solid var(--x-line)" });
      layer.append(deco);
    }

    // ── the chips, measured ──
    const fs = Math.min(W, H) * 0.05 * p.size;
    const paints = p.colour === "mono"
      ? [[p.container === "card" ? "var(--x-panel-2)" : "var(--x-panel)", "var(--x-ink)"]]
      : [["var(--x-accent)", "var(--x-accent-ink)"], ["var(--x-ink)", "var(--x-ground)"], ["var(--x-panel)", "var(--x-ink)"], ["var(--x-accent-2)", "var(--x-ink)"]];
    const k = stage.getBoundingClientRect().width / (stage.offsetWidth || 1) || 1;
    const chips = labels.map((txt, i) => {
      const c = document.createElement("div");
      c.textContent = txt;
      const [bg, ink] = paints[i % paints.length];
      Object.assign(c.style, { position: "absolute", left: "0", top: "0", font: `var(--x-head-weight) ${fs.toFixed(1)}px / 1 var(--x-head-font)`, letterSpacing: ML.ARABIC.test(txt) ? "0" : "-0.01em", padding: "0.42em 0.78em", borderRadius: "999px", background: bg, color: ink, whiteSpace: "nowrap", border: "var(--x-edge) solid var(--x-edge-color)", boxShadow: "var(--x-shadow)", boxSizing: "border-box", visibility: "hidden" });
      layer.append(c);
      const w = Math.min(c.getBoundingClientRect().width / k, (right - left) * 0.9), h = c.getBoundingClientRect().height / k;
      c.style.width = w + "px";
      return { c, w, h };
    });

    // ── spawn plan: on each spoken word (a beat before it lands), or all at once stacked above the frame ──
    const span = Math.max(0.6, end - at);
    const gap = Math.min(0.45, (span * 0.55) / labels.length);
    const spawnAt = labels.map((w, i) => (p.spawn === "all-at-once" ? 0 : Math.max(0, ctx.word(w, at + 0.25 + i * gap) - at - 0.25)));
    for (let i = 1; i < spawnAt.length; i++) if (p.spawn !== "all-at-once") spawnAt[i] = Math.max(spawnAt[i], spawnAt[i - 1] + 0.12);
    const g = H * 1.6, air = 0.01 * 60, e0 = p.restitution, mu = p.friction;
    let stack = 0;
    const bodies = chips.map((ch, i) => {
      const r = ch.h / 2, hl = Math.max(0, (ch.w - ch.h) / 2), m = ch.w * ch.h;
      const x = left + ch.w / 2 + R(i, 1) * Math.max(1, right - left - ch.w);
      let y = -60 - r;
      if (p.spawn === "all-at-once") { y = -60 - r - stack; stack += ch.h * 1.4; }
      return { x, y, a: (R(i, 2) - 0.5) * 0.6, vx: (R(i, 4) - 0.5) * W * 0.08, vy: 0, w: (R(i, 3) - 0.5) * 1.2, r, hl, im: 1 / m, iI: 12 / (m * (ch.w * ch.w + ch.h * ch.h)), on: false, t0: spawnAt[i], hit: -1 };
    });

    // ── the solver ──
    const DT = 1 / 120, steps = Math.ceil((span + 0.1) / DT);
    const ends = (b) => { const c = Math.cos(b.a) * b.hl, s = Math.sin(b.a) * b.hl; return [b.x - c, b.y - s, b.x + c, b.y + s]; };
    const cl = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
    function closest(p1x, p1y, q1x, q1y, p2x, p2y, q2x, q2y) {
      const d1x = q1x - p1x, d1y = q1y - p1y, d2x = q2x - p2x, d2y = q2y - p2y, rx = p1x - p2x, ry = p1y - p2y;
      const a = d1x * d1x + d1y * d1y, e = d2x * d2x + d2y * d2y, ff = d2x * rx + d2y * ry;
      let s = 0, t = 0;
      if (a < 1e-9 && e < 1e-9) { s = t = 0; }
      else if (a < 1e-9) { s = 0; t = cl(ff / e); }
      else {
        const c = d1x * rx + d1y * ry;
        if (e < 1e-9) { t = 0; s = cl(-c / a); }
        else {
          const b = d1x * d2x + d1y * d2y, den = a * e - b * b;
          s = den > 1e-9 ? cl((b * ff - c * e) / den) : 0;
          t = (b * s + ff) / e;
          if (t < 0) { t = 0; s = cl(-c / a); } else if (t > 1) { t = 1; s = cl((b - c) / a); }
        }
      }
      return [p1x + d1x * s, p1y + d1y * s, p2x + d2x * t, p2y + d2y * t];
    }
    function contacts() {
      const out = [], act = bodies.filter((b) => b.on);
      for (let i = 0; i < act.length; i++) {
        const A = act[i], ea = ends(A);
        // a manifold, not one point: each end of either core segment against the other segment (a pill lying flat
        // rests on two contacts, so it can't rock over), plus the segments' own closest pair when they cross
        const test = (B, eb, rb) => {
          const rs = A.r + rb, pairs = [];
          const ps = (x, y, s0, s1, s2, s3) => { const dx = s2 - s0, dy = s3 - s1, L = dx * dx + dy * dy, u = L > 1e-9 ? cl(((x - s0) * dx + (y - s1) * dy) / L) : 0; return [s0 + dx * u, s1 + dy * u]; };
          for (const k of [0, 2]) { const q = ps(ea[k], ea[k + 1], eb[0], eb[1], eb[2], eb[3]); pairs.push([ea[k], ea[k + 1], q[0], q[1]]); }
          for (const k of [0, 2]) { const q = ps(eb[k], eb[k + 1], ea[0], ea[1], ea[2], ea[3]); pairs.push([q[0], q[1], eb[k], eb[k + 1]]); }
          pairs.push(closest(ea[0], ea[1], ea[2], ea[3], eb[0], eb[1], eb[2], eb[3]));
          const got = [];
          for (const [px, py, qx, qy] of pairs) {
            let nx = qx - px, ny = qy - py, d = Math.hypot(nx, ny);
            if (d >= rs) continue;
            if (d < 1e-6) { if (B) { nx = B.x - A.x; ny = B.y - A.y; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l; } else { nx = 0; ny = 1; } d = 0; }
            else { nx /= d; ny /= d; }
            const cx = px + nx * A.r, cy = py + ny * A.r;
            if (got.some((g) => Math.hypot(g.cx - cx, g.cy - cy) < A.r * 0.25)) continue;
            const c = { A, B, nx, ny, cx, cy, pen: rs - d, jn: 0, jt: 0 };
            got.push(c); out.push(c);
          }
        };
        for (let j = i + 1; j < act.length; j++) test(act[j], ends(act[j]), act[j].r);
        for (const s of statics) test(null, [s.ax, s.ay, s.bx, s.by], 0);
      }
      return out;
    }
    const velAt = (b, x, y) => (b ? [b.vx - b.w * (y - b.y), b.vy + b.w * (x - b.x)] : [0, 0]);
    function solve(cs, time) {
      for (const c of cs) {
        const [ax, ay] = velAt(c.A, c.cx, c.cy), [bx, by] = velAt(c.B, c.cx, c.cy);
        const vn = (bx - ax) * c.nx + (by - ay) * c.ny;
        c.bias = vn < -H * 0.06 ? -e0 * vn : 0;
        if (vn < -H * 0.1) { if (c.A.hit < 0) c.A.hit = time; if (c.B && c.B.hit < 0) c.B.hit = time; }
        const ra = [c.cx - c.A.x, c.cy - c.A.y], rb = c.B ? [c.cx - c.B.x, c.cy - c.B.y] : [0, 0];
        const rna = ra[0] * c.ny - ra[1] * c.nx, rnb = rb[0] * c.ny - rb[1] * c.nx;
        const tx = -c.ny, ty = c.nx, rta = ra[0] * ty - ra[1] * tx, rtb = rb[0] * ty - rb[1] * tx;
        const imB = c.B ? c.B.im : 0, iIB = c.B ? c.B.iI : 0;
        c.kn = 1 / (c.A.im + imB + rna * rna * c.A.iI + rnb * rnb * iIB);
        c.kt = 1 / (c.A.im + imB + rta * rta * c.A.iI + rtb * rtb * iIB);
        c.ra = ra; c.rb = rb; c.tx = tx; c.ty = ty;
      }
      const apply = (c, px, py) => {
        const A = c.A, B = c.B;
        A.vx -= px * A.im; A.vy -= py * A.im; A.w -= (c.ra[0] * py - c.ra[1] * px) * A.iI;
        if (B) { B.vx += px * B.im; B.vy += py * B.im; B.w += (c.rb[0] * py - c.rb[1] * px) * B.iI; }
      };
      for (let it = 0; it < 12; it++) for (const c of cs) {
        let [ax, ay] = velAt(c.A, c.cx, c.cy), [bx, by] = velAt(c.B, c.cx, c.cy);
        const vn = (bx - ax) * c.nx + (by - ay) * c.ny;
        let dj = (-vn + c.bias) * c.kn;
        const jn0 = c.jn; c.jn = Math.max(0, jn0 + dj); dj = c.jn - jn0;
        apply(c, dj * c.nx, dj * c.ny);
        [ax, ay] = velAt(c.A, c.cx, c.cy); [bx, by] = velAt(c.B, c.cx, c.cy);
        const vt = (bx - ax) * c.tx + (by - ay) * c.ty;
        let dt = -vt * c.kt;
        const lim = mu * c.jn, jt0 = c.jt; c.jt = Math.max(-lim, Math.min(lim, jt0 + dt)); dt = c.jt - jt0;
        apply(c, dt * c.tx, dt * c.ty);
      }
    }
    const track = bodies.map(() => new Float32Array((steps + 1) * 3));
    const record = (n) => bodies.forEach((b, i) => { track[i][n * 3] = b.x; track[i][n * 3 + 1] = b.y; track[i][n * 3 + 2] = b.a; });
    record(0);
    for (let n = 1; n <= steps; n++) {
      const time = n * DT;
      for (const b of bodies) if (!b.on && time >= b.t0) b.on = true;
      for (const b of bodies) if (b.on) { b.vy += g * DT; const d = 1 - air * DT; b.vx *= d; b.vy *= d; b.w *= 1 - 2.4 * DT; } // a little rolling resistance: pills settle readable side up more often
      const cs = contacts();
      solve(cs, time);
      // rolling resistance: a pill touching something stops spinning fast, so short (near-round) chips don't roll
      // over and end upside down — the heap stays readable
      // (and spin is capped: a frame-tall fall would otherwise send a short pill whirling)
      for (const c of cs) { c.A.w *= 0.86; if (c.B) c.B.w *= 0.86; }
      for (const b of bodies) b.w = Math.max(-5, Math.min(5, b.w));
      for (const b of bodies) if (b.on) {
        b.x += b.vx * DT; b.y += b.vy * DT; b.a += b.w * DT;
        // resting chips stop creeping
        if (Math.abs(b.vx) + Math.abs(b.vy) < H * 0.01 && Math.abs(b.w) < 0.08) { b.vx *= 0.8; b.vy *= 0.8; b.w *= 0.8; }
      }
      // positional correction: push overlapping capsules apart along the contact normal
      for (let pass = 0; pass < 2; pass++) for (const c of contacts()) {
        const corr = Math.max(0, c.pen - 0.5) * 0.45, imB = c.B ? c.B.im : 0, sum = c.A.im + imB;
        c.A.x -= c.nx * corr * (c.A.im / sum); c.A.y -= c.ny * corr * (c.A.im / sum);
        if (c.B) { c.B.x += c.nx * corr * (imB / sum); c.B.y += c.ny * corr * (imB / sum); }
      }
      record(n);
    }
    bodies.forEach((b) => { if (b.hit >= 0) ctx.sfx(at + b.hit, "pop", 0.3); });

    return {
      draw(t) {
        el.style.visibility = t >= at ? "hidden" : "";
        const x = (t - at) / DT, n0 = Math.max(0, Math.min(steps, Math.floor(x))), n1 = Math.min(steps, n0 + 1), u = ML.clamp(x - n0);
        const leave = ML.lin(t, end - 0.22, end - 0.02);
        layer.style.visibility = t >= at ? "visible" : "hidden";
        layer.style.opacity = (1 - leave).toFixed(4);
        chips.forEach((ch, i) => {
          const b = bodies[i], tr = track[i];
          const live = t >= at + b.t0;
          ch.c.style.visibility = live ? "visible" : "hidden";
          if (!live) return;
          const px = tr[n0 * 3] + (tr[n1 * 3] - tr[n0 * 3]) * u, py = tr[n0 * 3 + 1] + (tr[n1 * 3 + 1] - tr[n0 * 3 + 1]) * u, pa = tr[n0 * 3 + 2] + (tr[n1 * 3 + 2] - tr[n0 * 3 + 2]) * u;
          ch.c.style.transform = `translate(${(px - ch.w / 2).toFixed(2)}px, ${(py - ch.h / 2).toFixed(2)}px) rotate(${pa.toFixed(4)}rad)`;
        });
      },
    };
  },
});

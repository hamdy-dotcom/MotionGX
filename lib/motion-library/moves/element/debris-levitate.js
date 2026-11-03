// Objects lift and orbit: pieces rise off the ground to different hover heights, slowly drift round a centre, then
// crash back down. As in the source's attractor (lift = 1), each piece is sprung to its own hover height — a closed-form
// damped oscillator (k 7, c 2.5: v' = (hover − y)·7 − 2.5 v), so it overshoots a little and settles — 80 % hang low
// (0.08–0.8 m), 20 % high (1.1–2.1 m); they orbit the centre at angle0 + ω t, spinning up toward 1.2 rad/s, and the
// ones swinging toward the lens are pushed wide so they never block the frame. The drop releases the lift: gravity
// 9.8 m/s², each bounce keeps 0.32 of the fall speed, 0.55 of the slide and half the spin, until it rests on its
// lowest corner (never sunk, never floating). Rocks are faceted polygons painted on a canvas from the look; the
// target's own items (a list's chips, a logo whole) levitate with them as DOM, landing back exactly in their slots.
// With nothing of its own to lift, "none" still paints rocks.
// Every frame is computed from t: the bounces are solved in closed form, nothing integrates frame to frame.
// Source: MengTo/Skills game-combat/lightning-energy-skill-vfx assets/storm-energy.mjs (MIT): the debris update
// (hover 80 % R(0.08, 0.8) / 20 % R(1.1, 2.1), spring 7 / damping 2.5, swirl, camera clearance, bounce 0.32, slide
// 0.55, spin × 0.5, rockBottom) — rebuilt as closed-form 2D.
ML.define({
  id: "element.debris-levitate",
  category: "element",
  name: "Objects lift and orbit",
  does: "Pieces rise off the ground to different hover heights, slowly drift round a centre, then crash back down.",
  says: ["energy", "scale", "tech", "time"],
  energy: 4,
  targets: ["list", "shape", "logo", "stage"],
  duration: [2, 6],
  params: {
    count: { type: "number", range: [6, 20], default: 10 },
    hover: { type: "choice", options: ["low", "high", "mixed"], default: "mixed" },
    ends: { type: "choice", options: ["crash", "hold"], default: "crash" },
    pieces: { type: "choice", options: ["rocks", "chips", "none"], default: "rocks" },
    swirl: { type: "number", range: [0.1, 0.8], default: 0.35, unit: "rad/s" },
  },
  pairs: ["camera.impact-shake", "text-in.slam"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "sub",
  source: { from: "MengTo/Skills:agent-skills/game-combat/lightning-energy-skill-vfx", license: "MIT", note: "storm-energy.mjs debris levitation / drop rebuilt in closed form, 2D canvas + DOM" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const ob = own ? ctx.box(own) : null;
    const R = ob && ob.w > f.W * 0.4 && ob.h > f.H * 0.25 ? ob : f.pic;
    const W = Math.round(R.w), H = Math.round(R.h);
    const rnd = ML.rnd;
    const cv = doc.createElement("canvas");
    cv.width = W; cv.height = H;
    cv.style.cssText = `position:absolute;left:${R.x}px;top:${R.y}px;width:${W}px;height:${H}px;pointer-events:none;z-index:6;will-change:transform;`;
    host.append(cv);
    const g = cv.getContext("2d");

    // ── colours from the look ──
    const probe = doc.createElement("div"); probe.style.display = "none"; host.append(probe);
    const rgb = (css) => {
      probe.style.color = ""; probe.style.color = css;
      const s = getComputedStyle(probe).color, n = (s.match(/-?[\d.]+/g) || ["0", "0", "0"]).map(Number);
      return s.startsWith("color(") ? n.slice(0, 3).map((v) => v * 255) : n.slice(0, 3);
    };
    const chips = p.pieces === "chips";
    const cBase = rgb(chips ? "var(--x-accent)" : "color-mix(in srgb, var(--x-dim) 70%, var(--x-panel))");
    const cLit = rgb(chips ? "var(--x-accent-2)" : "color-mix(in srgb, var(--x-dim) 25%, var(--x-panel))");
    const cDark = rgb(chips ? "color-mix(in srgb, var(--x-accent) 60%, var(--x-ink))" : "color-mix(in srgb, var(--x-dim) 55%, var(--x-ink))");
    const cShadow = rgb("var(--x-ink)"), cLine = rgb("var(--x-dim)");
    probe.remove();
    const mixc = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
    const css = (c, a = 1) => `rgba(${c.map((v) => Math.round(ML.clamp(v, 0, 255))).join(",")},${ML.clamp(a).toFixed(3)})`;

    // ── the physics, solved from t ──
    const G = 9.8;
    const SPR = { stiffness: 7, damping: 2.5 }; // the source's attractor spring
    const hoverOf = (i) => {
      const r = rnd(i, 1), lo = 0.08 + 0.72 * rnd(i, 2), hi = 1.1 + 1.0 * rnd(i, 3);
      return p.hover === "low" ? lo : p.hover === "high" ? hi : r < 0.8 ? lo : hi;
    };
    const spinAng = (tau, s0) => (tau <= 0 ? 0 : s0 * (tau - (1 - Math.exp(-2 * tau)) / 2)); // spin eases toward s0 at rate 2
    const spinRate = (tau, s0) => (tau <= 0 ? 0 : s0 * (1 - Math.exp(-2 * tau)));
    const liftEnd = at + 1.6;
    const tr = p.ends === "crash" ? Math.max(liftEnd + 0.4, end - 1.4) : Infinity; // the lift lets go
    const leave = p.ends === "crash" ? Math.max(tr + 1.1, end - 0.25) : end - 0.3;
    /** height above the floor (m), horizontal slide (m) and turn (rad) at time t for a piece lifted at t0 */
    function body(t, P) {
      const tau = t - P.t0;
      const up = (tt) => P.hover * ML.step(tt - P.t0, SPR) + (tt > P.t0 ? 0.03 * Math.sin((tt - P.t0) * 1.3 + P.i) * Math.min(1, tt - P.t0) : 0);
      if (t <= tr) return { y: Math.max(0, up(t)), slide: 0, rot: spinAng(tau, P.spin), air: tau > 0 };
      // released: falls from where it hung, bounces lose 0.68 of their speed, the slide 0.45, the spin half
      const h0 = Math.max(0, up(tr)), vx0 = P.vt; // orbit tangential speed carried into the slide (m/s)
      let tt = t - tr, vy = 0, h = h0, vx = vx0, s = spinRate(tr - P.t0, P.spin), slide = 0, rot = spinAng(tr - P.t0, P.spin);
      // first fall
      let dt = Math.sqrt((2 * h) / G);
      if (tt < dt) return { y: h - 0.5 * G * tt * tt, slide: vx * tt, rot: rot + s * tt, air: true };
      slide += vx * dt; rot += s * dt; tt -= dt; vy = G * dt;
      for (let b = 0; b < 8; b++) {
        if (vy < 1.0) break; // rests
        vy *= 0.32; vx *= 0.55; s *= 0.5;
        dt = (2 * vy) / G;
        if (tt < dt) return { y: vy * tt - 0.5 * G * tt * tt, slide: slide + vx * tt, rot: rot + s * tt, air: true, bounce: b + 1 };
        slide += vx * dt; rot += s * dt; tt -= dt;
      }
      return { y: 0, slide, rot, air: false, rest: true };
    }

    // ── the rocks ──
    const n = p.pieces === "none" && own ? 0 : Math.round(ML.clamp(p.count, 6, 20));
    const gy = H * 0.86, unit = Math.min(gy / 2.9, W / 4); // px per metre
    const cx = W / 2;
    const w = ML.clamp(p.swirl, 0.1, 0.8) * (rtl ? -1 : 1);
    const rocks = [];
    for (let i = 0; i < n; i++) {
      const rr = W * (0.1 + 0.22 * rnd(i, 4)); // × 1.35 at its widest: it never reaches the canvas edge
      const th0 = rnd(i, 5) * Math.PI * 2;
      const sz = unit * (0.09 + 0.12 * rnd(i, 6)) * (chips ? 0.8 : 1);
      const m = 6 + Math.floor(rnd(i, 7) * 4);
      const verts = Array.from({ length: m }, (_, k) => { const a = (k / m) * Math.PI * 2 + rnd(i * 13 + k, 8) * 0.5; const r = sz * (chips ? (k % 2 ? 0.92 : 1) : 0.7 + 0.35 * rnd(i * 13 + k, 9)); return [Math.cos(a) * r * 1.15, Math.sin(a) * r * 0.85]; });
      const P = { i, rr, th0, sz, verts, hover: hoverOf(i), t0: at + 0.06 + rnd(i, 10) * 0.45, spin: (rnd(i, 11) < 0.5 ? -1 : 1) * (0.8 + 0.8 * rnd(i, 12)) };
      // its slide on release: the orbit's tangential speed along the screen, in metres per second
      // (it starts to orbit as it lifts, not before: nothing skates along the floor)
      P.vt = Number.isFinite(tr) ? (-rr * spinRate(tr - P.t0, w) * Math.sin(th0 + spinAng(tr - P.t0, w))) / unit : 0;
      rocks.push(P);
    }
    // the lowest corner on the floor: a rotated outline's lowest point below its centre
    const bottom = (verts, rot) => { const c = Math.cos(rot), s = Math.sin(rot); let m = -Infinity; for (const [x, y] of verts) m = Math.max(m, x * s + y * c); return m; };

    // ── the target's own pieces (DOM): a list's items, or the element itself ──
    const parts = own ? (own.children.length > 1 && own.tagName.toLowerCase() !== "svg" ? [...own.children] : [own]) : [];
    const dom = parts.map((e, i) => {
      const b = ctx.box(e);
      const room = Math.max(0, Math.min(b.y - f.safe.y * 0.5, f.H * 0.28)) / 1.25; // never lifted out of the frame, its spring's overshoot included
      return { e, i: 100 + i, t0: at + 0.12 + i * 0.12, hover: Math.min(1, hoverOf(i + 50)), px: room, spin: (i % 2 ? -1 : 1) * 0.25, vt: 0, sway: Math.min(b.w * 0.08, f.W * 0.02) };
    });

    // sounds: the low lift, the first impact, a lighter knock after
    ctx.sfx(at + 0.05, "sub", 0.45);
    if (Number.isFinite(tr)) {
      const firstHit = Math.min(...[...rocks, ...dom].map((P) => tr + Math.sqrt((2 * Math.max(0, P.hover)) / G)).concat([tr + 0.6]));
      ctx.sfx(firstHit, "land", 0.5);
      ctx.sfx(firstHit + 0.35, "land.light", 0.25);
    }

    return {
      draw(t) {
        // DOM pieces
        for (const D of dom) {
          if (t < D.t0) { D.e.style.transform = "none"; continue; }
          const B = body(t, D);
          const lift = (B.y / Math.max(D.hover, 0.3)) * D.px;
          // released, it keeps the sway and tilt it had and eases them out as it falls back into its slot
          const tu = Math.min(t, tr);
          const sway = Math.sin((tu - D.t0) * w * 2 + D.i) * D.sway * Math.min(1, (tu - D.t0) / 0.8) * (t > tr ? 1 - ML.ease(t, tr, tr + 0.6) : 1);
          const rot = Math.max(-0.14, Math.min(0.14, Math.sin(B.rot) * 0.12)) * (t > tr ? Math.max(0, 1 - (t - tr) / 0.9) : 1);
          D.e.style.transform = `translate(${sway.toFixed(2)}px, ${(-lift).toFixed(2)}px) rotate(${rot.toFixed(4)}rad)`;
        }
        const on = n > 0 && t >= at - 0.1 && t < leave + 0.3;
        cv.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        cv.style.opacity = (ML.out(t, at - 0.1, at + 0.2) * (1 - ML.clamp((t - leave) / 0.25))).toFixed(4);
        g.clearRect(0, 0, W, H);
        g.strokeStyle = css(cLine, 0.22); g.lineWidth = Math.max(1, H * 0.002);
        g.beginPath(); g.moveTo(0, gy); g.lineTo(W, gy); g.stroke();
        const list = rocks.map((P) => {
          const th = P.th0 + spinAng(Math.min(t, tr) - P.t0, w);
          const z = Math.sin(th); // +1 far, −1 near the lens
          const rr = P.rr * (1 + 0.35 * Math.max(0, -z)); // the near ones swing wide: clear of the camera
          return { P, th, z, rr };
        }).sort((a, b) => b.z - a.z);
        for (const { P, z, th, rr } of list) {
          const B = body(t, P);
          const k = 1 - 0.22 * z; // nearer, bigger (drawn, not scaled)
          const floorY = gy - z * unit * 0.28;
          const x = ML.clamp(cx + Math.cos(th) * rr + B.slide * unit, P.sz, W - P.sz);
          const vs = P.verts.map(([a, b]) => [a * k, b * k]);
          const yc = floorY - bottom(vs, B.rot) - B.y * unit;
          // its shadow on the floor: smaller and fainter the higher it hangs
          const sh = Math.max(0.2, 1 - B.y / 2.4);
          g.fillStyle = css(cShadow, 0.12 * sh);
          g.beginPath(); g.ellipse(x, floorY, P.sz * k * 1.1 * sh, P.sz * k * 0.22 * sh, 0, 0, Math.PI * 2); g.fill();
          // the stone: faceted from its centre, each facet lit by how it faces the light
          g.save(); g.translate(x, yc); g.rotate(B.rot);
          const m = vs.length;
          for (let j = 0; j < m; j++) {
            const a = vs[j], b = vs[(j + 1) % m];
            const ang = Math.atan2((a[1] + b[1]) / 2, (a[0] + b[0]) / 2) + B.rot;
            const lam = 0.5 + 0.5 * Math.cos(ang - (-Math.PI * 0.7));
            g.beginPath(); g.moveTo(0, 0); g.lineTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.closePath();
            g.fillStyle = css(mixc(mixc(cDark, cBase, Math.min(1, lam * 1.4)), cLit, Math.max(0, lam - 0.55) * 1.6), 1 - 0.15 * Math.max(0, z));
            g.fill();
          }
          g.strokeStyle = css(cLit, 0.5); g.lineWidth = Math.max(1, P.sz * 0.04);
          g.beginPath(); vs.forEach(([a, b], j) => (j ? g.lineTo(a, b) : g.moveTo(a, b))); g.closePath(); g.stroke();
          g.restore();
          // a puff of dust as it lands
          if (t > tr) {
            const land = tr + Math.sqrt((2 * Math.max(0, P.hover * ML.step(tr - P.t0, SPR))) / G);
            const q = (t - land) / 0.5;
            if (q > 0 && q < 1) {
              g.strokeStyle = css(cLine, 0.35 * (1 - q)); g.lineWidth = Math.max(1, P.sz * 0.05);
              g.beginPath(); g.ellipse(x, floorY, P.sz * k * (0.8 + 1.4 * q), P.sz * k * 0.2 * (0.8 + 1.4 * q), 0, 0, Math.PI * 2); g.stroke();
            }
          }
        }
      },
    };
  },
});

// Ball escapes rotating broken rings: a glowing ball bounces inside concentric rings (4–16, 3 px strokes), each missing
// a 30–70° arc and turning 10–40°/s in alternating directions, coloured hot → accent → cool from the inside out. The
// physics is precomputed in setup so every frame is a lookup: constant speed, reflection off the innermost intact ring
// (with a small seeded deflection), escape when the ball meets the ring's gap. Each ring's starting angle is solved so
// its gap meets the ball on a chosen hit (simulated from the start with the inner rings already solved), so every ring
// breaks inside the run: `speed` sets the bounces per ring, and the ball's pace is tuned so the last ring goes near the
// end of the scene (never slower than a lively minimum). Each bounce
// plays a blip; each escape shatters that ring into ~80 sparks (r + 0–60 px, 0.6 s fade) and it vanishes, the next ring
// brightens, and the "12 RINGS LEFT" counter drops with a 1 → 1.15 → 1 bump and a colour flash. Title above. The ball:
// a light core, a hot glow and a 6-position trail. Canvas painted per frame from t (seeded, software raster).
// Source: prompt-motion "kantamk-i-gave-claude-opus" (reference only: rebuilt as our own code).
ML.define({
  id: "data.escape-rings-bounce",
  category: "data",
  name: "Ball escapes rotating broken rings",
  does: "A glowing ball bounces inside concentric rotating rings with gaps; each escape shatters a ring into sparks and a rings-left counter drops.",
  says: ["playful", "energy", "problem", "celebration"],
  energy: 4,
  targets: ["shape", "number", "stage"],
  duration: [5, 15],
  params: {
    rings: { type: "number", range: [4, 16], default: 12 },
    gap: { type: "number", range: [30, 70], default: 50, unit: "deg" },
    speed: { type: "number", range: [0.5, 2], default: 1 },
    title: { type: "text", default: "" },
  },
  pairs: ["data.event-tally", "background.dust-motes"],
  avoid: ["calm", "luxury", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:kantamk-i-gave-claude-opus", license: "reference", note: "our own rebuild: precomputed seekable physics, solved gap phases" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const host = ctx.scene || stage;
    const u = Math.min(f.W, f.H) / 1080;
    const n = Math.round(ML.clamp(p.rings, 4, 16));
    const isNum = !!(el && el.childElementCount === 0 && /\d/.test(el.textContent || ""));

    // layout: title, the canvas, the counter, in the picture region
    const R = f.pic;
    const wrap = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${16 * u}px;z-index:20;pointer-events:none;will-change:transform;direction:${rtl ? "rtl" : "ltr"}`, host);
    const rings = (k) => (k === 1 ? "حلقة واحدة" : k === 2 ? "حلقتين" : k >= 3 && k <= 10 ? `${k} حلقات` : `${k} حلقة`); // Arabic counts its noun
    const title = mk("div", `font:var(--x-head-weight) ${Math.round(46 * u)}px/1.15 var(--x-head-font);color:var(--x-ink);text-align:center;max-width:100%`, wrap, p.title || (rtl ? `تقدر الكورة تهرب من الـ ${rings(n)}؟` : `Can it escape all ${n} rings?`));
    const S = Math.floor(Math.min(R.w, R.h - 200 * u, 1000 * u));
    const cv = mk("canvas", `width:${S}px;height:${S}px;flex:none`, wrap);
    cv.width = S; cv.height = S;
    const g = cv.getContext("2d", { willReadFrequently: true });
    const counter = mk("div", `font:var(--x-label-weight) ${Math.round(34 * u)}px/1 var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:var(--x-label-case);color:var(--x-accent);display:inline-block`, wrap);
    const left = (k) => (rtl ? (k === 0 ? "مفيش حلقات" : `باقي ${rings(k)}`) : `${k} RING${k === 1 ? "" : "S"} LEFT`);

    // colours from the look, resolved to rgb for mixing on the canvas
    const probe = doc.createElement("canvas"); probe.width = probe.height = 1;
    const pg = probe.getContext("2d", { willReadFrequently: true });
    const rgb = (v) => { const s = mk("span", `color:${v}`, host); const c = getComputedStyle(s).color; s.remove(); pg.clearRect(0, 0, 1, 1); pg.fillStyle = c; pg.fillRect(0, 0, 1, 1); const d = pg.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; };
    const HOT = rgb("var(--x-bad)"), MID = rgb("var(--x-accent)"), COOL = rgb("var(--x-good)"), CORE = rgb("var(--x-accent-ink)"), GROUND = rgb("var(--x-ground)");
    const lerp3 = (a, b, x) => a.map((v, i) => Math.round(v + (b[i] - v) * x));
    const ringCol = (k) => { const x = n === 1 ? 0 : k / (n - 1); return x < 0.5 ? lerp3(HOT, MID, x * 2) : lerp3(MID, COOL, (x - 0.5) * 2); };
    const css = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;

    // the rings
    const C = S / 2, Rout = S * 0.45, Rin = Rout * 0.2;
    const radii = Array.from({ length: n }, (_, k) => Rin + ((Rout - Rin) * k) / Math.max(1, n - 1));
    const omega = radii.map((_, k) => ((10 + 30 * ML.rnd(k, 11)) * Math.PI / 180) * (k % 2 ? -1 : 1));
    const half = (ML.clamp(p.gap, 30, 70) * Math.PI) / 360;
    const lw = Math.max(2, 3 * u * 1.4), br = Math.max(4, 7 * u);
    const wrapA = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };

    // the physics: solved ring by ring, then the run recorded
    const t0 = at + 0.35, D = Math.max(2, end - t0 - 0.7);
    const speed = ML.clamp(p.speed, 0.5, 2);
    let v = speed * (radii.reduce((a, r) => a + 3 * r, 0) / (D * 0.8));
    const DT = 1 / 480, STEPS = Math.ceil(D / DT) + 2, SAMPLE = 4; // a sample every 1/120 s
    const phase = new Array(n).fill(null);
    const need = radii.map((_, k) => 1 + Math.floor(ML.rnd(k, 13) * Math.max(1, Math.round(3 * speed)))); // the hit that finds the gap
    function run(solveFor, record) {
      let x = 0, y = 0, a0 = ML.rnd(3, 17) * Math.PI * 2, vx = Math.cos(a0) * v, vy = Math.sin(a0) * v, c = 0, hits = 0, nb = 0;
      const out = record ? { xs: new Float32Array(Math.ceil(STEPS / SAMPLE) + 2), ys: new Float32Array(Math.ceil(STEPS / SAMPLE) + 2), bounces: [], escapes: [] } : null;
      for (let s = 0; s <= STEPS; s++) {
        const tt = s * DT;
        if (record && s % SAMPLE === 0) { out.xs[s / SAMPLE] = x; out.ys[s / SAMPLE] = y; }
        x += vx * DT; y += vy * DT;
        const d = Math.hypot(x, y);
        if (c < n) {
          const lim = radii[c] - br - lw / 2;
          if (d >= lim) {
            const phi = Math.atan2(y, x);
            if (c === solveFor && phase[c] === null) { hits++; if (hits === need[c]) return { tt, phi }; }
            const open = phase[c] !== null && Math.abs(wrapA(phi - (phase[c] + omega[c] * tt))) < half - br / radii[c];
            if (open) { if (record) out.escapes.push({ t: tt, ring: c }); c++; }
            else {
              const nx = x / d, ny = y / d, dot = vx * nx + vy * ny;
              if (dot > 0) {
                vx -= 2 * dot * nx; vy -= 2 * dot * ny;
                const dv = (ML.rnd(nb++ + c * 31, 19) - 0.5) * 0.35; // keyed the same in every pass, or the solved gaps miss the recorded ball
                const cs = Math.cos(dv), sn = Math.sin(dv), rx = vx * cs - vy * sn, ry = vx * sn + vy * cs;
                // keep it heading inward after the deflection
                if (rx * nx + ry * ny < 0) { vx = rx; vy = ry; }
                x = nx * lim; y = ny * lim;
                if (record) out.bounces.push({ t: tt, ring: c });
              }
            }
          }
        } else if (d >= C - br - 2) { // free: bounce off the canvas's own edge circle
          const nx = x / d, ny = y / d, dot = vx * nx + vy * ny;
          if (dot > 0) { vx -= 2 * dot * nx; vy -= 2 * dot * ny; x = nx * (C - br - 2); y = ny * (C - br - 2); }
        }
      }
      return out;
    }
    const solve = (speedNow) => {
      v = speedNow;
      phase.fill(null);
      for (let k = 0; k < n; k++) {
        const hit = run(k, false);
        phase[k] = hit && hit.tt !== undefined ? hit.phi - omega[k] * hit.tt : ML.rnd(k, 23) * Math.PI * 2;
      }
      return run(-1, true);
    };
    // the pace: tried until the last ring goes at about 82% of the run (a run that does not finish: quicker)
    const vMin = radii[n - 1] * 0.8 * speed, goal = D * 0.82;
    let best = null, bestErr = Infinity, tryV = Math.max(vMin, v);
    for (let tries = 0; tries < 12; tries++) {
      const r = solve(tryV), done = r.escapes.length === n && r.escapes[n - 1].t <= D * 0.94;
      if (!done) { tryV *= 1.25; continue; }
      const last = r.escapes[n - 1].t, err = Math.abs(last - goal);
      if (err < bestErr) { best = tryV; bestErr = err; }
      if (err < D * 0.08 || (tryV <= vMin && last < goal)) break;
      tryV = Math.max(vMin, tryV * (last / goal));
    }
    const sim = solve(best ?? tryV);
    const escT = sim.escapes.map((e) => t0 + e.t);
    let lastB = -1;
    for (const b of sim.bounces) { const tb = t0 + b.t; if (tb - lastB >= 0.22 && tb < end - 0.3) { ctx.sfx(tb, "blip", 0.18); lastB = tb; } }
    escT.forEach((te, i) => te < end - 0.3 && ctx.sfx(te, i === n - 1 ? "success" : "pop", 0.4));
    const pos = (t) => {
      const q = ML.clamp((t - t0) / (DT * SAMPLE), 0, sim.xs.length - 2), i = Math.floor(q), fr = q - i;
      return [sim.xs[i] + (sim.xs[i + 1] - sim.xs[i]) * fr, sim.ys[i] + (sim.ys[i + 1] - sim.ys[i]) * fr];
    };
    const ownText = isNum ? el.textContent : "";

    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        const enter = ML.out(t, at, at + 0.35);
        wrap.style.opacity = (enter * (1 - leave)).toFixed(4);
        title.style.translate = `0 ${((1 - enter) * 16 * u).toFixed(2)}px`;
        const tt = Math.max(0, t - t0);
        let gone = 0; for (const te of escT) if (t >= te) gone++;
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, S, S);
        g.translate(C, C);
        g.lineCap = "round";
        // its own ground: a disc under the rings so they read over whatever the scene holds
        const disc = g.createRadialGradient(0, 0, C * 0.8, 0, 0, C);
        disc.addColorStop(0, css(GROUND, 0.94)); disc.addColorStop(1, css(GROUND, 0));
        g.fillStyle = disc; g.beginPath(); g.arc(0, 0, C, 0, 2 * Math.PI); g.fill();
        // rings
        for (let k = gone; k < n; k++) {
          const rot = (phase[k] ?? 0) + omega[k] * tt, col = ringCol(k);
          const lit = k === gone ? 1 : 0.5;
          const flash = gone > 0 && k === gone ? ML.pulse(t, escT[gone - 1] + 0.05, 0.04, 0.3) : 0;
          g.strokeStyle = css(col, Math.min(1, lit + flash * 0.5));
          g.lineWidth = lw * (1 + flash * 0.6);
          g.beginPath(); g.arc(0, 0, radii[k], rot + half, rot + 2 * Math.PI - half); g.stroke();
        }
        // shattered rings: sparks flying out
        for (let e = 0; e < escT.length; e++) {
          const age = t - escT[e];
          if (age < 0 || age > 0.6) continue;
          const k = sim.escapes[e].ring, col = ringCol(k), rot = (phase[k] ?? 0) + omega[k] * (escT[e] - t0);
          const fade = 1 - age / 0.6, go = 1 - Math.pow(1 - age / 0.6, 3);
          g.fillStyle = css(lerp3(col, HOT, 0.5), fade);
          for (let j = 0; j < 80; j++) {
            const a = rot + half + ML.rnd(j, 29 + k) * (2 * Math.PI - 2 * half), rr = radii[k] + (ML.rnd(j, 31 + k) - 0.2) * 60 * u * 1.4 * go;
            const s = (1.2 + ML.rnd(j, 37) * 1.8) * u * 1.4;
            g.beginPath(); g.arc(Math.cos(a) * rr, Math.sin(a) * rr, s, 0, 2 * Math.PI); g.fill();
          }
        }
        // the ball: trail, glow, core
        for (let i = 6; i >= 1; i--) {
          const [x, y] = pos(t - i / 60);
          g.fillStyle = css(HOT, 0.35 * (1 - i / 7));
          g.beginPath(); g.arc(x, y, br * (1 - i / 9), 0, 2 * Math.PI); g.fill();
        }
        const [bx, by] = pos(t);
        const glow = g.createRadialGradient(bx, by, 0, bx, by, br * 3.2);
        glow.addColorStop(0, css(HOT, 0.75)); glow.addColorStop(1, css(HOT, 0));
        g.fillStyle = glow; g.beginPath(); g.arc(bx, by, br * 3.2, 0, 2 * Math.PI); g.fill();
        g.fillStyle = css(CORE, 1); g.beginPath(); g.arc(bx, by, br * 0.62, 0, 2 * Math.PI); g.fill();
        g.strokeStyle = css(HOT, 1); g.lineWidth = Math.max(1, br * 0.25); g.stroke();
        // counter
        const bump = gone > 0 ? ML.pulse(t, escT[gone - 1] + 0.04, 0.04, 0.16) : 0;
        counter.textContent = left(n - gone);
        counter.style.scale = (1 + 0.15 * bump).toFixed(4);
        counter.style.color = `color-mix(in srgb, var(--x-bad) ${(bump * 100).toFixed(1)}%, var(--x-accent))`;
        if (isNum) el.textContent = t < at ? ownText : String(n - gone);
      },
    };
  },
});

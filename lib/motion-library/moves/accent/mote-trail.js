// Mote trail along a path: a travelling point sheds evenly spaced glowing motes that drift, cool and fade (or fall as
// sparks). Ported from MengTo/Skills pointer-trail-emitter + build-interactive-particle-trail: motes are emitted BY
// DISTANCE travelled — one every `spacing` px of arc length, placed exactly on the path — so spacing stays even at any
// speed (timer emission is the failure mode). Each mote takes a seeded scatter (sum of two uniforms − 1, a share of the
// frame), a velocity kicked against the travel and slightly up, a life, a phase; its flight is closed form in age
// (the particle-trail shader: p = o + v·age·(1 − coast·.68·u) + a growing sway, a buoyant lift; gravity inverts it for
// sparks). Alpha = min(1, u/.12)·(1 − clamp((u − .22)/.78))·.9 and the diameter grows 1 + .55u (softens, never swells).
// The cached radial sprites are the sources' own (cold wisps: white → pale cyan; pollen: white → rgba(239,248,209,.72))
// drawn additively ('lighter') on dark grounds; forge sparks fall and cool orange → ember → ash, drawn over (as the
// source's remix asks on light paper). An idle breath — one weak mote every .42 s at the resting emitter — keeps an
// aura. `pre-drawn` lays the whole path at once with age increasing along it (the source's mote arc: birth_i =
// now − (1 − s)·1.1 s). Paths: arc, s-curve, underline-word, circle-logo, follow-cursor (the demo's scripted trace: a
// slow arc then a fast run), line; mirrored in Arabic. Births are a pure function of the path and a seed, ages of t.
// Source: MengTo/Skills web-design/pointer-trail-emitter + build-interactive-particle-trail + build-threejs-scroll-worlds
// (MIT) — ported to a 2D canvas.
ML.define({
  id: "accent.mote-trail",
  category: "accent",
  name: "Mote trail along a path",
  does: "A moving point — a cursor, a travelling glint or an underline path — sheds evenly spaced glowing motes that drift, cool and fade.",
  says: ["playful", "ambient", "focus", "flow", "connection", "reveal", "calm", "energy", "speed", "tech"],
  energy: 3,
  targets: ["cursor", "word", "shape", "card", "headline", "stage"],
  duration: [1, 5],
  params: {
    path: { type: "choice", options: ["arc", "s-curve", "underline-word", "circle-logo", "follow-cursor", "line"], default: "arc" },
    spacing: { type: "number", range: [4, 30], default: 10, unit: "px" },
    life: { type: "number", range: [0.8, 2.4], default: 1.4, unit: "s" },
    scatter: { type: "number", range: [5, 40], default: 15, unit: "%" },
    coast: { type: "number", range: [0.2, 1.1], default: 0.5 },
    gravity: { type: "number", range: [0, 1], default: 0 },
    palette: { type: "choice", options: ["cold-wisps", "pollen", "warm-embers", "forge-sparks", "brand"], default: "cold-wisps" },
    mode: { type: "choice", options: ["travelling", "pre-drawn"], default: "travelling" },
  },
  pairs: ["ui.cursor-path", "text-emphasis.underline-draw", "accent.mote-burst"],
  avoid: ["problem"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:web-design/pointer-trail-emitter", license: "MIT", note: "with build-interactive-particle-trail (flight shader, sprite) and build-threejs-scroll-worlds; ported to 2D canvas" },
  setup(ctx) {
    const { p, at, end, f, stage, el } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, m = Math.min(W, H), k = m / 1080;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    cv.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:7;visibility:hidden";
    host.append(cv);
    const g = cv.getContext("2d");
    const px = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    const rgb = (v) => { const e = document.createElement("span"); e.style.cssText = `color:${v};display:none`; host.append(e); const c = getComputedStyle(e).color; e.remove(); px.clearRect(0, 0, 1, 1); px.fillStyle = "#000"; px.fillStyle = c; px.fillRect(0, 0, 1, 1); const d = px.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; };
    const GR = rgb("var(--x-ground)"), light = (0.2126 * GR[0] + 0.7152 * GR[1] + 0.0722 * GR[2]) / 255 > 0.5;
    const A1 = rgb("var(--x-accent)"), A2 = rgb("var(--x-accent-2)");

    // ── sprites (64 px radial, cached) ──
    const sprite = (stops) => {
      const c = document.createElement("canvas"); c.width = c.height = 64;
      const sg = c.getContext("2d"), gr = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
      stops.forEach(([o, col]) => gr.addColorStop(o, `rgba(${col[0]},${col[1]},${col[2]},${col[3]})`));
      sg.fillStyle = gr; sg.fillRect(0, 0, 64, 64); return c;
    };
    const tint = (base, a) => [Math.round(base[0]), Math.round(base[1]), Math.round(base[2]), a];
    const forge = p.palette === "forge-sparks";
    let sprites;
    if (forge) {
      // orange (1, .55, .15) → ember red → ash grey over life
      const ramp = [[255, 140, 38], [232, 72, 24], [150, 40, 22], [110, 104, 100]];
      sprites = Array.from({ length: 8 }, (_, i) => {
        const v = (i / 7) * (ramp.length - 1), j = Math.min(ramp.length - 2, Math.floor(v)), w = v - j;
        const c = ramp[j].map((x, q) => x + (ramp[j + 1][q] - x) * w);
        const core = i < 2 ? [255, 236, 200] : c;
        return sprite([[0, tint(core, 1)], [0.18, tint(c, 0.85)], [0.45, tint(c, 0.25)], [1, tint(c, 0)]]);
      });
    } else if (light || p.palette === "brand") {
      // light grounds: the look's accent, drawn over (additive light vanishes on paper)
      sprites = [sprite([[0, tint(A1, 1)], [0.12, tint(A1, 0.85)], [0.34, tint(A2, 0.3)], [0.62, tint(A2, 0.08)], [1, tint(A2, 0)]])];
    } else if (p.palette === "pollen") {
      sprites = [sprite([[0, [255, 255, 255, 1]], [0.32, [239, 248, 209, 0.72]], [1, [224, 242, 185, 0]]])];
    } else if (p.palette === "warm-embers") {
      sprites = [sprite([[0, [255, 255, 255, 1]], [0.08, [255, 228, 180, 0.92]], [0.2, [255, 168, 82, 0.42]], [0.4, [226, 104, 40, 0.13]], [1, [180, 60, 20, 0]]])];
    } else {
      sprites = [sprite([[0, [255, 255, 255, 1]], [0.07, [236, 250, 250, 0.92]], [0.16, [190, 230, 238, 0.4]], [0.34, [132, 192, 212, 0.13]], [0.62, [88, 146, 172, 0.035]], [1, [70, 120, 142, 0]]])];
    }
    const additive = !forge && !light && p.palette !== "brand";

    // ── the path, in stage px: a dense polyline with cumulative length ──
    let R = { x: f.pic.x, y: f.pic.y, w: f.pic.w, h: f.pic.h }, hasEl = false;
    if (el && el !== stage) { const b = ctx.box(el); R = b; hasEl = true; }
    const cx = R.x + R.w / 2, cy = R.y + R.h / 2;
    const raw = [];
    const N0 = 240;
    const mirror = (x) => (ctx.rtl ? 2 * cx - x : x);
    const catmull = (P, n) => {
      const out = [];
      for (let i = 0; i < P.length - 1; i++) {
        const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
        for (let j = 0; j < n; j++) {
          const u = j / n, u2 = u * u, u3 = u2 * u;
          const c = (a, b, c2, d) => 0.5 * (2 * b + (-a + c2) * u + (2 * a - 5 * b + 4 * c2 - d) * u2 + (-a + 3 * b - 3 * c2 + d) * u3);
          out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
        }
      }
      out.push(P[P.length - 1]); return out;
    };
    const path = p.path;
    if (path === "underline-word" || path === "line") {
      const y = path === "underline-word" ? (hasEl ? Math.min(H - 30 * k, R.y + R.h + 14 * k) : cy + R.h * 0.1) : cy;
      const x0 = hasEl ? R.x : R.x + R.w * 0.12, x1 = hasEl ? R.x + R.w : R.x + R.w * 0.88;
      for (let i = 0; i <= N0; i++) raw.push([x0 + ((x1 - x0) * i) / N0, y]);
    } else if (path === "circle-logo") {
      const rr = hasEl ? Math.hypot(R.w, R.h) * 0.5 + 20 * k : Math.min(R.w, R.h) * 0.3;
      for (let i = 0; i <= N0; i++) { const a = -Math.PI / 2 + (i / N0) * Math.PI * 2; raw.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
    } else if (path === "s-curve") {
      const P = [[R.x + R.w * 0.1, cy + R.h * 0.18], [R.x + R.w * 0.32, cy + R.h * 0.18], [R.x + R.w * 0.5, cy], [R.x + R.w * 0.68, cy - R.h * 0.18], [R.x + R.w * 0.9, cy - R.h * 0.18]];
      raw.push(...catmull(P, 60));
    } else if (path === "follow-cursor") {
      // the demo's scripted trace: a slow arc (.20,.70) → (.51,.45), then a fast run → (.93,.29)
      const P = [[0.2, 0.7], [0.3, 0.6], [0.41, 0.51], [0.51, 0.45], [0.7, 0.37], [0.93, 0.29]].map(([u, v]) => [R.x + R.w * u, R.y + R.h * v]);
      raw.push(...catmull(P, 50));
    } else {
      // the source's mote arc: x = −.27W + s·.55W, y = −.12H + sin(sπ)·.11H (y up)
      const Wd = hasEl ? R.w * 1.1 : R.w, Hd = hasEl ? Math.max(R.h, R.w * 0.4) : Math.min(R.h, R.w * 0.9);
      for (let i = 0; i <= N0; i++) { const s = i / N0; raw.push([cx + (-0.27 / 0.55 + s) * Wd * 0.9, cy + Hd * 0.12 - Math.sin(s * Math.PI) * Hd * 0.3]); }
    }
    const pts = raw.map(([x, y]) => [mirror(x), y]);
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const LEN = cum[cum.length - 1] || 1;
    const at_len = (len) => {
      let lo = 0, hi = cum.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] < len) lo = mid; else hi = mid; }
      const u = (len - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]);
      return { x: pts[lo][0] + (pts[hi][0] - pts[lo][0]) * u, y: pts[lo][1] + (pts[hi][1] - pts[lo][1]) * u, ang: Math.atan2(pts[hi][1] - pts[lo][1], pts[hi][0] - pts[lo][0]) };
    };

    // ── travel: arc length as a function of time (follow-cursor: slow then fast; else an ease) ──
    const D = Math.max(0.6, end - at);
    const travel = Math.max(0.5, Math.min(D * 0.6, 0.4 + LEN / (1400 * k)));
    const sAt = (x) => (path === "follow-cursor" ? (x < 0.55 ? 0.35 * Math.sin(((x / 0.55) * Math.PI) / 2) :0.35 + 0.65 * ML.out((x - 0.55) / 0.45, 0, 1)) : ML.ease(x, 0, 1));
    const timeOfLen = (len) => {
      // invert sAt by bisection (monotone): the time the emitter reaches this arc length
      let lo = 0, hi = 1;
      for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (sAt(mid) * LEN < len) lo = mid; else hi = mid; }
      return at + ((lo + hi) / 2) * travel;
    };

    // ── births: emit by distance, a pure function of the path and a seed ──
    const step = Math.max(2, p.spacing * k * 1.4);
    const spread = (p.scatter / 100) * m * 0.22;
    const kv = m * 0.055;
    const life0 = p.life;
    const motes = [];
    const nEmit = Math.floor(LEN / step);
    for (let j = 0; j <= nEmit; j++) {
      const s = j * step, q = at_len(s);
      const birth = p.mode === "pre-drawn" ? at - (1 - s / LEN) * 1.1 : timeOfLen(s);
      const sc = (a, b) => (ML.rnd(j, a) + ML.rnd(j, b) - 1) * spread;
      motes.push({
        x: q.x + sc(1, 2), y: q.y + sc(3, 4), birth, life: life0 * (0.8 + 0.6 * ML.rnd(j, 5)) * (forge ? 0.6 : 1),
        vx: -Math.cos(q.ang) * kv * 0.5 + (ML.rnd(j, 6) - 0.5) * kv * 2.1, vy: -Math.sin(q.ang) * kv * 0.5 + (ML.rnd(j, 7) - 0.5) * kv * 1.8 - kv * 0.12,
        size: (0.012 + 0.012 * ML.rnd(j, 8)) * m, ph: ML.rnd(j, 9), weak: 1,
      });
    }
    // idle breath: once the emitter rests (or along a pre-drawn path), a weak mote every .42 s
    const restAt = p.mode === "pre-drawn" ? at : at + travel;
    for (let j = 0, tt = restAt + 0.2; tt < end; j++, tt += 0.42) {
      const q = p.mode === "pre-drawn" ? at_len(ML.rnd(j, 31) * LEN) : at_len(LEN);
      motes.push({ x: q.x + (ML.rnd(j, 32) - 0.5) * spread, y: q.y + (ML.rnd(j, 33) - 0.5) * spread, birth: tt, life: (2.1 + 1.3 * ML.rnd(j, 34)) * (life0 / 1.4) * (forge ? 0.5 : 1), vx: (ML.rnd(j, 35) - 0.5) * kv * 0.8, vy: -kv * 0.15, size: (0.01 + 0.008 * ML.rnd(j, 36)) * m, ph: ML.rnd(j, 37), weak: 0.55 });
    }
    const grav = Math.max(p.gravity, forge ? 0.6 : 0);
    const damp = Math.min(0.9, p.coast * 0.68);
    const lift = m * 0.045 * (1 - grav), fall = m * 0.9 * grav;
    ctx.sfx(at, "whoosh.soft", 0.25);

    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.35, end);
        const on = t >= at && leave < 1;
        cv.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        g.clearRect(0, 0, W, H);
        g.globalCompositeOperation = additive ? "lighter" : "source-over";
        for (const q of motes) {
          const age = t - q.birth;
          if (age < 0 || age > q.life) continue;
          const u = age / q.life, dd = age * (1 - damp * u);
          const sway = Math.sin(q.ph * 6.283 + age * 2.6) * m * 0.02 * u;
          const x = q.x + q.vx * dd + sway;
          const y = q.y + q.vy * dd - lift * age * (1 + 0.5 * age) + 0.5 * fall * age * age + Math.cos(q.ph * 4.1 + age * 1.1) * m * 0.006 * u;
          const a = Math.min(1, u / 0.12) * (1 - ML.clamp((u - 0.22) / 0.78)) * 0.9 * q.weak * (1 - leave);
          if (a <= 0.003) continue;
          const dia = q.size * (1 + 0.55 * u) * 2.2;
          const spr = forge ? sprites[Math.min(7, Math.floor(u * 8))] : sprites[0];
          g.globalAlpha = a;
          g.drawImage(spr, x - dia / 2, y - dia / 2, dia, dia);
        }
        // the travelling head: a bright glint on the emitter while it moves
        if (p.mode === "travelling" && t <= at + travel + 0.15) {
          const hx = sAt(ML.lin(t, at, at + travel)) * LEN, h = at_len(hx);
          const dia = m * 0.06, fade = 1 - ML.lin(t, at + travel, at + travel + 0.15);
          g.globalAlpha = 0.95 * fade;
          g.drawImage(forge ? sprites[0] : sprites[0], h.x - dia / 2, h.y - dia / 2, dia, dia);
        }
        g.globalAlpha = 1;
      },
    };
  },
});

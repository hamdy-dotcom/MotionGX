// Fire wall sweep: a broken front of flame tongues races across the ground, swelling then sinking, leaving ragged
// burning patches and a curtain of smoke; behind the front the next scene's ground shows through the burnt region.
// Ported from MengTo/Skills fire-smoke-skill-vfx (MIT) — its "Fire wave" (demo/src/stage.js) and the flame field
// (assets/fire-fx.mjs) — from a ray-marched volume to a canvas painted per frame from t:
//   · the front's reach runs 0.7 -> 6.7 m on an ease-out over `duration` (1.5-3 s); its height swells to 2.35x then
//     sinks by about half: h = (0.6 + 1.75 smooth(0, 0.3, u)) (1 - 0.52 smooth(0.35, D, u));
//   · the front is clumps with real gaps (about a third): k = smoothstep(0, 0.55, E + …); a tongue's height
//     Hk (0.34 + 0.95 h²) (the tallest 2-3x the shortest), unevenly spaced (each off-centre in its cell), pointed
//     tips that snake (sin(… − 4.4 t) 0.26 + sin(… − 6.1 t) 0.1), the clump's flank tongues leaning outward;
//   · 65% of tongues shed a detached lick at 1.2-2 Hz that rises, shrinks and cools;
//   · smoke as thin curtain sprites off the tips (never round puffs), only once the front is 1.6 m out: 3 smooth(1.6, 3.2, r);
//   · burning patches dropped every 0.42 m of reach, 0.35-1 m behind the edge, each lit 0.2-0.7 s late (never a fuse);
//   · the fire's colour from its temperature ramp (the source's black-body steps), tone-mapped.
// One effect clock, pinned seeds: every patch is placed in setup from a seeded sequence, so any t can be drawn alone.
// Directions: across the frame (the reading side), an outward ring from the centre, or toward the camera.
ML.define({
  id: "transition.fire-wall-sweep",
  category: "transition",
  name: "Fire wall sweep",
  does: "A broken front of flame tongues races across the ground, swelling then sinking, leaving ragged burning patches and a curtain of smoke, with the next scene showing through the burnt region.",
  says: ["energy", "transition", "urgency", "change"],
  energy: 5,
  targets: ["scene"],
  duration: [1.5, 3],
  params: {
    direction: { type: "choice", options: ["ltr", "outward-ring", "toward-camera"], default: "ltr" },
    duration: { type: "number", range: [1.5, 3], default: 2.6, unit: "s" },
    colour: { type: "choice", options: ["natural", "blue", "brand"], default: "natural" },
    next: { type: "choice", options: ["dark", "ground", "accent"], default: "dark" },
  },
  pairs: ["transition.dip-to-colour", "text-in.punchline"],
  avoid: ["calm", "luxury", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.heavy",
  source: { from: "MengTo/Skills:agent-skills/game-combat/fire-smoke-skill-vfx", license: "MIT", note: "the Fire wave (demo/src/stage.js) and flame field (assets/fire-fx.mjs), ported from WebGL to a per-frame canvas" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, S = Math.min(W, H);
    const D = ML.clamp(p.duration, 1.5, 3);
    const dir = p.direction;
    const flip = dir === "ltr" && !!ctx.rtl;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    cv.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:6;visibility:hidden";
    host.append(cv);
    const g = cv.getContext("2d");
    // look colours, resolved to rgb
    const probe = document.createElement("div"); host.append(probe);
    const rgb = (v) => { probe.style.color = v; const m = getComputedStyle(probe).color.match(/[\d.]+/g) || [0, 0, 0]; return m.slice(0, 3).map(Number); };
    const nextRGB = rgb(p.next === "ground" ? "var(--x-ground)" : p.next === "accent" ? "var(--x-accent)" : "var(--x-device)");
    const smokeRGB = rgb("var(--x-device)");
    const accRGB = rgb("var(--x-accent)").map((x) => x / 255);
    probe.remove();
    const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;
    // ── math (pure) ──
    const sm = (a, b, x) => { const u = ML.clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
    const fract = (x) => x - Math.floor(x);
    const noise = (x, seed) => { const i = Math.floor(x), u = x - i, w = u * u * (3 - 2 * u); return ML.rnd(i, seed) * (1 - w) + ML.rnd(i + 1, seed) * w; };
    const easeOut = (x) => 1 - Math.pow(1 - ML.clamp(x), 2.2);
    // the fire's temperature ramp (fire-fx.mjs), tone-mapped to 0-255; blue swaps red and blue; brand tints by the accent
    const ramp = (T) => {
      let c = [0.3 * sm(0.02, 0.2, T), 0.024 * sm(0.02, 0.2, T), 0.003 * sm(0.02, 0.2, T)];
      const mixv = (to, k) => (c = c.map((x, i) => x + (to[i] - x) * k));
      mixv([1.5, 0.15, 0.014], sm(0.16, 0.42, T));
      mixv([3.4, 0.7, 0.09], sm(0.4, 0.66, T));
      mixv([6, 1.9, 0.45], sm(0.64, 0.86, T));
      mixv([9, 4.6, 1.9], sm(0.85, 1.05, T));
      if (p.colour === "blue") c = [c[2] * 0.7, c[1] * 1.1, c[0]];
      else if (p.colour === "brand") { const l = 0.3 * c[0] + 0.6 * c[1] + 0.1 * c[2]; const h = sm(0.7, 1.05, T); c = accRGB.map((a) => a * 0.5 * l * (1 - h) + l * 0.6 * h); }
      return c.map((x) => 255 * (1 - Math.exp(-x * 1.15)));
    };
    // ── the front: a point, a scale and the burnt region for any reach (prog 0 … 1) ──
    const ringC = { x: W / 2, y: H * 0.56 }, ys = 0.62;
    const ringMax = 1.08 * Math.sqrt(Math.pow(W / 2, 2) + Math.pow(Math.max(ringC.y, H - ringC.y) / ys, 2));
    const px = (x) => (flip ? W - x : x);
    function at3(sg, prog) {
      if (dir === "outward-ring") {
        const r = ringMax * (0.04 + 0.96 * prog), a = sg * Math.PI * 2;
        const y = ringC.y + r * ys * Math.sin(a);
        return { x: ringC.x + r * Math.cos(a), y, s: 0.6 + 0.6 * ML.clamp(y / H), nx: Math.cos(a), ny: Math.sin(a) };
      }
      if (dir === "toward-camera") {
        const Y = -0.06 * H + 1.26 * H * prog, y = Y + 0.05 * H * (1 - Math.pow(2 * sg - 1, 2));
        return { x: -0.06 * W + sg * 1.12 * W, y, s: 0.45 + 0.9 * ML.clamp(Y / H), nx: 0, ny: 1 };
      }
      const X = -0.1 * W + 1.26 * W * prog, y = -0.06 * H + sg * 1.12 * H;
      return { x: px(X + 0.05 * W * (1 - Math.pow(2 * sg - 1, 2))), y, s: 0.6 + 0.6 * ML.clamp(y / H), nx: flip ? -1 : 1, ny: 0 };
    }
    const fireH = 0.26 * S; // a tongue's base height at full swell (2.35 in the source's metres)
    const reach = (u) => easeOut(u / D);
    const swell = (u) => ((0.6 + 1.75 * sm(0, 0.3, u)) * (1 - 0.52 * sm(0.35, D, u))) / 2.35;
    // ── tongues along the front: fixed cells, each off-centre ──
    const K = dir === "outward-ring" ? 72 : Math.round((dir === "ltr" ? H : W) / (0.036 * S));
    const tongues = Array.from({ length: K }, (_, i) => {
      const h1 = ML.rnd(i, 21), h2 = ML.rnd(i, 22), tc = 0.5 + (h2 - 0.5) * 0.44;
      return { sg: (i + tc) / K, h1, h2, ph: ML.rnd(i, 23) * 6.28, ph2: ML.rnd(i, 24) * 6.28, lickF: 1.2 + 0.8 * ML.rnd(i, 25), lickP: ML.rnd(i, 26), w: 0.75 + 0.5 * ML.rnd(i, 27), smoke: ML.rnd(i, 28) < 0.55 };
    });
    const clumpF = K / 2.6; // clumps of a few tongues
    const clumpAt = (sg, t) => {
      const e = noise(sg * clumpF + 0.35 * t, 31) - 0.5, e2 = noise(sg * clumpF * 0.37 + 5, 32) - 0.5;
      const vig = sm(-0.55, 0.35, e2 * 1.6);
      return sm(0, 0.55, e * 1.2 + (vig - 0.5) * 0.3 + 0.36); // about a third of the front is gap
    };
    // ── burning patches, placed once from the seeded sequence (stage.js: every 0.42 m of reach, 1-2, behind the edge) ──
    const patches = [];
    const per = dir === "ltr" ? Math.max(0.8, (0.7 * H) / W) : 1.1;
    let seq = 0;
    for (let rl = 0.42; rl < 6.0 * 0.92; rl += 0.42) {
      const n = Math.round((1 + (ML.rnd(seq++, 41) < 0.45 ? 1 : 0)) * per);
      const progBirth = rl / 6;
      // the time the front reaches rl: invert the ease-out
      const tb = at + D * (1 - Math.pow(1 - progBirth, 1 / 2.2));
      for (let k = 0; k < n; k++) {
        const q = seq++;
        const back = (0.35 + 0.65 * ML.rnd(q, 42)) / 6;
        patches.push({
          sg: ML.rnd(q, 43), prog: Math.max(0.01, progBirth - back), born: tb + 0.2 + 0.5 * ML.rnd(q, 44),
          life: 3.5 + 3.5 * ML.rnd(q, 45), big: ML.rnd(q, 46) < 0.3, n: 2 + Math.floor(ML.rnd(q, 47) * 3), q,
        });
      }
    }
    const fadeEnd = at + D + 0.7;
    // ── drawing ──
    function tongue(bx, by, w, h, sx, T0, alpha) {
      if (h < 1 || w < 0.5) return;
      const gr = g.createLinearGradient(bx, by, bx + sx, by - h);
      const c0 = ramp(T0), c1 = ramp(T0 * 0.72), c2 = ramp(T0 * 0.42);
      gr.addColorStop(0, css(c0, 0.92 * alpha));
      gr.addColorStop(0.35, css(c1, 0.85 * alpha));
      gr.addColorStop(0.75, css(c2, 0.55 * alpha));
      gr.addColorStop(1, css(c2, 0));
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(bx - w / 2, by);
      g.quadraticCurveTo(bx - w * 0.55 + sx * 0.25, by - h * 0.35, bx - w * 0.12 + sx * 0.6, by - h * 0.7);
      g.quadraticCurveTo(bx + sx * 0.85, by - h * 0.9, bx + sx, by - h);
      g.quadraticCurveTo(bx + w * 0.1 + sx * 0.75, by - h * 0.62, bx + w * 0.42 + sx * 0.3, by - h * 0.32);
      g.quadraticCurveTo(bx + w * 0.55, by - h * 0.1, bx + w / 2, by);
      g.quadraticCurveTo(bx, by + w * 0.06, bx - w / 2, by);
      g.fill();
    }
    function smokeCurtain(x, y, w, h, a, t, ph) {
      for (let j = 0; j < 2; j++) {
        const u = fract(0.55 * t + j * 0.5 + ph);
        const yy = y - u * h * 0.6, al = a * Math.sin(Math.PI * u);
        if (al < 0.004) continue;
        const sway = Math.sin(t * 1.3 + ph * 6 + j) * w * 0.8;
        const gr = g.createLinearGradient(x, yy, x, yy - h);
        gr.addColorStop(0, css(smokeRGB, 0));
        gr.addColorStop(0.25, css(smokeRGB, al));
        gr.addColorStop(1, css(smokeRGB, 0));
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(x - w / 2, yy);
        g.bezierCurveTo(x - w / 2 + sway * 0.3, yy - h * 0.4, x - w * 0.3 + sway, yy - h * 0.7, x + sway * 1.2 - w * 0.15, yy - h);
        g.lineTo(x + sway * 1.2 + w * 0.15, yy - h);
        g.bezierCurveTo(x + w * 0.3 + sway, yy - h * 0.7, x + w / 2 + sway * 0.3, yy - h * 0.4, x + w / 2, yy);
        g.closePath();
        g.fill();
      }
    }
    // ragged edge: the front's base pushed in and out along its normal
    const ragged = (sg, t) => (noise(sg * K * 0.9 + 0.8 * t, 51) - 0.5) * 0.035 * S + (noise(sg * K * 0.25 + 3, 52) - 0.5) * 0.05 * S;
    const edgePt = (sg, prog, t) => { const q = at3(sg, prog), r = ragged(sg, t) * q.s; return { ...q, x: q.x + q.nx * r, y: q.y + q.ny * r }; };
    ctx.sfx(at, "whoosh.heavy", 0.5);
    ctx.sfx(at + 0.25, "swell", 0.3);
    return {
      draw(t) {
        const on = t >= at;
        cv.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        const u = t - at, prog = reach(u);
        const live = 1 - sm(at + D - 0.1, at + D + 0.5, t); // the front dies out once it has crossed
        g.clearRect(0, 0, W, H);
        // the burnt region: the next scene's ground
        const M = dir === "outward-ring" ? 96 : 64;
        const edge = Array.from({ length: M + 1 }, (_, i) => edgePt(i / M, prog, t));
        g.fillStyle = css(nextRGB, 1);
        g.beginPath();
        if (t >= fadeEnd - 0.2 && prog >= 0.999) { g.rect(0, 0, W, H); }
        else if (dir === "outward-ring") { edge.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.closePath(); }
        else if (dir === "toward-camera") { g.moveTo(-10, -10); g.lineTo(W + 10, -10); for (let i = M; i >= 0; i--) g.lineTo(edge[i].x, edge[i].y); g.closePath(); }
        else { g.moveTo(px(-0.3 * W), -10); edge.forEach((q) => g.lineTo(q.x, q.y)); g.lineTo(px(-0.3 * W), H + 10); g.closePath(); }
        g.fill();
        // the scorched rim and the glowing edge just behind the front
        if (live > 0.01) {
          g.save();
          g.lineJoin = "round";
          g.strokeStyle = css(nextRGB.map((x) => x * 0.6), 0.35 * live);
          g.lineWidth = 0.025 * S;
          g.beginPath(); edge.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); if (dir === "outward-ring") g.closePath(); g.stroke();
          g.globalCompositeOperation = "lighter";
          g.strokeStyle = css(ramp(0.5), 0.5 * live);
          g.lineWidth = 0.012 * S;
          g.shadowColor = css(ramp(0.6), 0.9 * live);
          g.shadowBlur = 0.025 * S;
          g.stroke();
          g.restore();
        }
        // burning patches behind the edge
        g.save();
        g.globalCompositeOperation = "lighter";
        for (const pa of patches) {
          if (t < pa.born) continue;
          const age = t - pa.born;
          const e = sm(0, 0.3, age) * (1 - sm(pa.life * 0.6, pa.life, age)) * (1 - sm(at + D + 0.1, fadeEnd, t));
          if (e < 0.01) continue;
          const q = at3(pa.sg, pa.prog);
          const hh = fireH * q.s * (pa.big ? 0.75 : 0.42) * e;
          const glow = g.createRadialGradient(q.x, q.y, 0, q.x, q.y, hh * 1.4);
          glow.addColorStop(0, css(ramp(0.55), 0.45 * e));
          glow.addColorStop(1, css(ramp(0.3), 0));
          g.fillStyle = glow;
          g.beginPath(); g.ellipse(q.x, q.y, hh * 1.4, hh * 0.5, 0, 0, Math.PI * 2); g.fill();
          for (let j = 0; j < pa.n; j++) {
            const r1 = ML.rnd(pa.q * 7 + j, 61), r2 = ML.rnd(pa.q * 7 + j, 62);
            const bx = q.x + (r1 - 0.5) * hh * 1.6, h = hh * (0.5 + 0.9 * r2 * r2) * (0.9 + 0.1 * Math.sin(t * 7 + j));
            tongue(bx, q.y, hh * 0.45, h, Math.sin(t * 4.4 + j * 2 + pa.q) * h * 0.14, 0.88, e);
          }
        }
        g.restore();
        if (live <= 0.01) return;
        // the front: smoke curtains behind, then the tongues (far ones first), then their licks
        const hNow = fireH * swell(u) * live;
        const smokeA = 0.2 * sm(1.6, 3.2, 0.7 + 6 * prog) * live;
        const list = tongues.map((tg) => {
          const q = edgePt(tg.sg, prog, t);
          const k = clumpAt(tg.sg, t);
          const dk = clumpAt(tg.sg + 0.01, t) - clumpAt(tg.sg - 0.01, t);
          return { tg, q, k, dk };
        }).sort((a, b) => a.q.y - b.q.y);
        if (smokeA > 0.005) for (const { tg, q, k } of list) {
          if (!tg.smoke || k < 0.3) continue;
          const Ht = hNow * q.s * (0.34 + 0.95 * tg.h1 * tg.h1);
          smokeCurtain(q.x, q.y - Ht * 0.8, 0.05 * S * q.s, Ht * 3.2, smokeA * k, t, tg.lickP);
        }
        g.save();
        g.globalCompositeOperation = "lighter";
        for (const { tg, q, k, dk } of list) {
          if (k < 0.06) continue; // where the front barely burns it goes out
          const Hk = hNow * q.s * (0.3 + 0.7 * Math.pow(k, 0.6));
          const Ht = Hk * (0.34 + 0.95 * tg.h1 * tg.h1);
          const w = 0.05 * S * q.s * tg.w * (0.6 + 0.4 * k);
          const snake = (Math.sin(-t * 4.4 + tg.ph) * 0.26 + Math.sin(-t * 6.1 + tg.ph2) * 0.1) * Ht * 0.45;
          const lean = -Math.sign(dk) * Math.min(1, Math.abs(dk) * 12) * Ht * 0.25 * (dir === "ltr" ? 0.4 : 1);
          tongue(q.x, q.y, w, Ht, snake + lean, 0.95, Math.min(1, k * 1.6));
          tongue(q.x + snake * 0.1, q.y, w * 0.48, Ht * 0.55, (snake + lean) * 0.5, 1.05, Math.min(1, k * 1.6));
          // a detached lick: the tip breaks off, rises, shrinks and cools
          if (tg.h2 >= 0.35) {
            const ph = fract(t * tg.lickF + tg.lickP);
            const rl = w * 0.42 * (1 - ph) * sm(0, 0.12, ph) * k;
            if (rl > 0.6) {
              const ly = q.y - Ht * (0.95 + 0.65 * ph);
              tongue(q.x + snake + lean, ly + rl, rl * 1.6, rl * 3.2, snake * 0.2, 0.6 - 0.32 * ph, 1);
            }
          }
        }
        g.restore();
      },
    };
  },
});

// Fireball burst with a ring of fire: on the hit a fireball blooms from the target — puffs of billowing flame whose
// temperature is 1.3·e^(−u/0.42), gone by 0.7 s, cooling unevenly into a few hot pockets (T × mix(1, 0.06 +
// 3·smoothstep(0.45, 0.85, n), billow 0.85)) — and turns to near-black smoke (soot 0.9) whose creases glow with short
// ridged cracks early on (never round glowing orbs), a billowing column rising after it. A closed, lobed and broken
// ring of flame (radius 0.6 → 4.4 of the fireball over 1.6 s, height variation 0.75, wobble 0.17) races outward,
// leaving burning patches behind; two refraction rings run ahead; 64 sparks fly on seeded closed-form arcs; an ink
// impact frame (the look's ink, the fireball cut out in its ground colour) lands 0.06 s after the hit. Every flame's
// shape comes from seeded noise on a 30 Hz tick (seed = hash(flame, tick)), so a frame is the same however it is
// reached. Fire keeps the source's heat ramp (it is light, not a brand colour); the impact frame takes the look's.
// Ring: single, double or none. Scale: small or large.
// Source: MengTo/Skills game-combat/fire-smoke-skill-vfx (fire-fx.mjs: the burst's temperature / soot / hot-pocket
// terms, flameArc, ring(), sparks, MIT) — rebuilt as a 2D canvas move.
ML.define({
  id: "accent.fire-burst-ring",
  category: "accent",
  name: "Fireball burst with a ring of fire",
  does: "A fireball blooms and quickly cools into dark smoke with glowing cracks while a lobed, broken ring of flame races outward.",
  says: ["energy", "celebration", "urgency", "arrival"],
  energy: 5,
  targets: ["logo", "number", "stage", "headline"],
  duration: [1, 3],
  params: {
    ring: { type: "choice", options: ["single", "none", "double"], default: "single" },
    scale: { type: "choice", options: ["small", "large"], default: "small" },
  },
  pairs: [],
  avoid: ["calm", "luxury", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "sub",
  source: { from: "MengTo/Skills:game-combat/fire-smoke-skill-vfx", license: "MIT", note: "fire-fx.mjs burst rebuilt in 2D" },
  setup(ctx) {
    const { p, at, end, f, stage, el } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, m = Math.min(W, H), k = m / 1080;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    cv.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:8;visibility:hidden";
    host.append(cv);
    const g = cv.getContext("2d");
    const px = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    const rgb = (v) => { const e = document.createElement("span"); e.style.cssText = `color:${v};display:none`; host.append(e); const c = getComputedStyle(e).color; e.remove(); px.clearRect(0, 0, 1, 1); px.fillStyle = "#000"; px.fillStyle = c; px.fillRect(0, 0, 1, 1); const d = px.getImageData(0, 0, 1, 1).data; return [d[0] / 255, d[1] / 255, d[2] / 255]; };
    const INK = rgb("var(--x-ink)"), GRD = rgb("var(--x-ground)");
    const lightGround = 0.2126 * GRD[0] + 0.7152 * GRD[1] + 0.0722 * GRD[2] > 0.5;
    const css = (c, a) => `rgba(${Math.round(ML.clamp(c[0]) * 255)},${Math.round(ML.clamp(c[1]) * 255)},${Math.round(ML.clamp(c[2]) * 255)},${ML.clamp(a).toFixed(3)})`;
    const sm = (a, b, x) => { const u = ML.clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
    // the heat ramp (temperature → light): soot, deep red, orange, yellow-white
    const SOOT = [0.019, 0.018, 0.017], CRACK = [1, 0.36, 0.07];
    const heat = (T) => {
      if (T < 0.15) return SOOT.map((v, i) => v + ([0.5, 0.08, 0.02][i] - v) * (T / 0.15));
      if (T < 0.5) { const u = (T - 0.15) / 0.35; return [0.5 + 0.5 * u, 0.08 + 0.3 * u, 0.02 + 0.03 * u]; }
      if (T < 1) { const u = (T - 0.5) / 0.5; return [1, 0.38 + 0.4 * u, 0.05 + 0.25 * u]; }
      return [1, 0.78 + 0.17 * Math.min(1, T - 1), 0.3 + 0.5 * Math.min(1, T - 1)];
    };

    let C = { x: W / 2, y: H / 2 };
    if (el && el !== stage) { const b = ctx.box(el); C = { x: b.x + b.w / 2, y: b.y + b.h / 2 }; }
    const U = m * (p.scale === "large" ? 0.2 : 0.12); // the fireball's size; the ring reaches 4.4 U
    const hit = at;
    const noise1 = (x, s) => { const i = Math.floor(x), fr = x - i, u = fr * fr * (3 - 2 * fr); return ML.rnd(i, s) + (ML.rnd(i + 1, s) - ML.rnd(i, s)) * u; };
    const ringNoise = (th, s) => { const x = ((th / (Math.PI * 2)) % 1 + 1) % 1 * 9; const i = Math.floor(x), fr = x - i, u = fr * fr * (3 - 2 * fr); return ML.rnd(i % 9, s) + (ML.rnd((i + 1) % 9, s) - ML.rnd(i % 9, s)) * u; }; // closed round the ring

    // fireball puffs: billow (0.85) — each with its own hot-pocket noise
    const puffs = Array.from({ length: 56 }, (_, i) => {
      const a = ML.rnd(i, 1) * Math.PI * 2, d = Math.pow(ML.rnd(i, 2), 0.6);
      return { a, d, r: 0.32 + 0.4 * ML.rnd(i, 3), n: ML.rnd(i, 4), lift: 0.2 + 0.5 * ML.rnd(i, 5), pocket: ML.rnd(i, 6) < 0.32, cr: ML.rnd(i, 7) };
    });
    // the billowing column: near-black puffs born after the ball, rising
    const column = Array.from({ length: 30 }, (_, i) => ({ born: 0.15 + i * 0.035, dx: (ML.rnd(i, 11) - 0.5) * 0.9, r: 0.35 + 0.35 * ML.rnd(i, 12), rise: 1.2 + 0.8 * ML.rnd(i, 13), n: ML.rnd(i, 14) }));
    // sparks: 64, ballistic with drag, closed form
    const GRAV = m * 1.6;
    const sparks = Array.from({ length: 64 }, (_, i) => { const a = ML.rnd(i, 21) * Math.PI * 2, s = m * (0.6 + 1.4 * ML.rnd(i, 22)); return { vx: Math.cos(a) * s, vy: Math.sin(a) * s - m * 0.4, kd: 1.2 + ML.rnd(i, 23) * 1.4, life: 0.5 + 0.7 * ML.rnd(i, 24), w: (1.5 + 2 * ML.rnd(i, 25)) * k }; });
    // rings of flame: [delay, duration, seed]
    const rings = p.ring === "none" ? [] : p.ring === "double" ? [[0, 1.6, 3], [0.2, 1.75, 7]] : [[0, 1.6, 3]];
    // burning patches left behind: spots the ring has passed, burning 0.5 s after
    const patches = Array.from({ length: 26 }, (_, i) => ({ a: ML.rnd(i, 41) * Math.PI * 2, rr: 0.25 + 0.6 * ML.rnd(i, 42), ring: rings.length ? i % rings.length : 0 }));
    const ringR = (u) => U * (0.6 + (4.4 - 0.6) * (1 - Math.pow(1 - ML.clamp(u), 2.2)));

    const radial = (x, y, r, col, a, hard = 0.35) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, css(col, a)); gr.addColorStop(hard, css(col, a * 0.85)); gr.addColorStop(1, css(col, 0)); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
    const crack = (x, y, r, seed, a) => {
      // ridged cracks in a crease: a short jagged line across the puff, with a branch
      g.beginPath();
      let cx = x - r * 0.5, cy = y + (ML.rnd(seed, 1) - 0.5) * r * 0.6;
      g.moveTo(cx, cy);
      for (let s = 1; s <= 6; s++) { cx += r / 6; cy += (ML.rnd(seed, s + 1) - 0.5) * r * 0.35; g.lineTo(cx, cy); if (s === 3) { g.moveTo(cx, cy); g.lineTo(cx + r * 0.15, cy - r * 0.3); g.moveTo(cx, cy); } }
      g.strokeStyle = css(CRACK, a); g.lineWidth = 2.2 * k; g.stroke();
    };

    ctx.sfx(hit, "sub", 0.6);
    ctx.sfx(hit + 0.05, "whoosh.heavy", 0.35);
    if (p.ring === "double") ctx.sfx(hit + 0.2, "whoosh.soft", 0.25);
    return {
      draw(t) {
        const fade = 1 - ML.lin(t, end - 0.3, end);
        const on = t >= hit && fade > 0;
        cv.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        g.clearRect(0, 0, W, H);
        const u = t - hit, tick = Math.floor(u * 30);
        const add = lightGround ? "source-over" : "lighter";
        g.globalAlpha = fade;
        // refraction rings: two thin shock rings running fast ahead
        for (let j = 0; j < 2; j++) {
          const uu = u - j * 0.07; if (uu < 0 || uu > 0.45) continue;
          g.beginPath(); g.arc(C.x, C.y, U * (0.5 + uu * 9), 0, Math.PI * 2);
          g.lineWidth = (6 - j * 2) * k; g.strokeStyle = css(lightGround ? INK : [1, 0.94, 0.86], 0.22 * (1 - uu / 0.45)); g.stroke();
        }
        // smoke: the column, then the ball's cooled puffs (soot is drawn over, never added)
        g.globalCompositeOperation = "source-over";
        for (const c of column) {
          const a = u - c.born; if (a < 0 || a > 1.8) continue;
          const y = C.y - U * (0.2 + a * c.rise), x = C.x + U * c.dx * (0.4 + a), r = U * c.r * (0.6 + a * 0.9);
          radial(x, y, r, SOOT, 0.55 * (1 - a / 1.8) * (0.6 + 0.4 * c.n), 0.5);
        }
        const Tball = 1.3 * Math.exp(-u / 0.42) * (1 - sm(0.45, 0.7, u)); // gone by 0.7 s
        const grow = 1 - Math.exp(-u * 7);
        for (const pf of puffs) {
          const dist = U * pf.d * (0.15 + 1.05 * grow), x = C.x + Math.cos(pf.a) * dist, y = C.y + Math.sin(pf.a) * dist - U * pf.lift * u * 0.6;
          const r = U * pf.r * (0.35 + 0.75 * grow);
          // uneven cooling: hot pockets where the noise is high (billow 0.85)
          const pocket = 0.06 + 3 * sm(0.45, 0.85, pf.n);
          const T = Tball * (1 + (pocket - 1) * 0.85);
          const sootA = 0.85 * sm(0.05, 0.4, u) * (1 - ML.lin(u, 1.2, 2.4)) * 0.9;
          if (sootA > 0.01) radial(x, y, r * (1 + u * 0.3), SOOT, sootA, 0.55);
          // cracks only in the creases, early, for 32 % of the puffs
          if (pf.pocket && u > 0.12 && u < 0.95) crack(x, y, r * 0.8, pf.cr * 100 + Math.floor(tick / 5), 0.85 * (1 - ML.lin(u, 0.4, 0.95)));
          if (T > 0.04) { g.globalCompositeOperation = add; radial(x, y, r, heat(T), Math.min(1, T * 1.1), 0.3); g.globalCompositeOperation = "source-over"; }
        }
        // the flash on the hit
        if (u < 0.25) { g.globalCompositeOperation = add; radial(C.x, C.y, U * (0.6 + u * 4), heat(1.6), 0.9 * (1 - u / 0.25), 0.2); g.globalCompositeOperation = "source-over"; }
        // rings of flame: lobed (height variation), wobbling, broken where the noise is low
        g.globalCompositeOperation = add; g.lineCap = "round";
        for (const [dl, dur, sd] of rings) {
          const ur = (u - dl) / dur; if (ur < 0 || ur > 1.1) continue;
          const R = ringR(ur), I = (1 - sm(0.55, 1.05, ur)) * Math.min(1, ur * 12);
          const NS = 150;
          for (let s = 0; s < NS; s++) {
            const th = (s / NS) * Math.PI * 2;
            if (ringNoise(th + 0.3, sd + 1) < 0.3) continue; // broken
            const lobe = 1 + 0.17 * (ringNoise(th, sd + 2) - 0.5) * 1.2 + 0.04 * Math.sin(th * 5 + u * 6); // wobble 0.17
            const rr = R * lobe, x = C.x + Math.cos(th) * rr, y = C.y + Math.sin(th) * rr;
            // a tongue of flame pointing outward, its height varying (hvar 0.75) and flickering per tick
            const fl = ML.rnd(s + sd * 17, tick + 1), hv = 1 - 0.75 * noise1(s * 0.21 + sd, 3);
            const L = U * 0.42 * hv * (0.55 + 0.45 * fl) * (1 - 0.5 * ur);
            const ox = Math.cos(th), oy = Math.sin(th), ex = x + ox * L, ey = y + oy * L - L * 0.25;
            g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + ox * L * 0.5 + oy * L * 0.15 * (fl - 0.5), y + oy * L * 0.5, ex, ey);
            g.strokeStyle = css(heat(0.55 + 0.6 * I * hv), 0.5 * I); g.lineWidth = U * 0.09 * hv; g.stroke();
            g.strokeStyle = css(heat(0.9 + 0.4 * I), 0.85 * I); g.lineWidth = U * 0.03 * hv; g.stroke();
          }
        }
        // burning patches the ring left behind
        for (const pt of patches) {
          if (!rings.length) break;
          const [dl, dur] = rings[pt.ring], ur = (u - dl) / dur; if (ur <= 0) continue;
          const passT = dl + dur * pt.rr; // the ring's front passes this spot at its progress rr
          const a = u - passT; if (a < 0 || a > 0.6) continue;
          const rr = ringR(pt.rr) * 0.96, x = C.x + Math.cos(pt.a) * rr, y = C.y + Math.sin(pt.a) * rr;
          radial(x, y - U * 0.08, U * 0.16 * (0.7 + 0.3 * ML.rnd(pt.a * 10, tick + 3)), heat(0.8 * (1 - a / 0.6) + 0.2), 0.7 * (1 - a / 0.6), 0.3);
        }
        // sparks: closed-form arcs with drag, short streaks
        for (const s of sparks) {
          if (u > s.life) continue;
          const e = Math.exp(-s.kd * u), x = C.x + (s.vx / s.kd) * (1 - e), y = C.y + ((s.vy + GRAV / s.kd) / s.kd) * (1 - e) - (GRAV / s.kd) * u;
          const vx = s.vx * e, vy = (s.vy + GRAV / s.kd) * e - GRAV / s.kd, a = 1 - u / s.life;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x - vx * 0.03, y - vy * 0.03);
          g.strokeStyle = css(heat(0.6 + 0.7 * a), a); g.lineWidth = s.w; g.stroke();
        }
        g.globalCompositeOperation = "source-over";
        // the ink impact frame: 0.06 s after the hit, for two frames
        if (u >= 0.06 && u < 0.06 + 0.067) {
          g.globalAlpha = 1;
          g.fillStyle = css(INK, 0.92); g.fillRect(0, 0, W, H);
          g.fillStyle = css(GRD, 1);
          for (const pf of puffs) { const dist = U * pf.d * (0.15 + 1.05 * grow), r = U * pf.r * (0.35 + 0.75 * grow); g.beginPath(); g.arc(C.x + Math.cos(pf.a) * dist, C.y + Math.sin(pf.a) * dist, r * 0.8, 0, Math.PI * 2); g.fill(); }
        }
        g.globalAlpha = 1;
      },
    };
  },
});

// Pollen burst: a puff of glowing motes bursts out of one point, rises and drifts, then fades — a calmer alternative
// to confetti. Ported from MengTo/Skills build-interactive-particle-trail: spawn(point, boost) puts each mote at
// origin ± 15·boost (x, y), ± 45 z, with velocity x ± 38·boost, y (rand(2, 64) + 22·(boost − 1))·boost, z ± 26·boost,
// and the flight shader is closed form in age: p = o + v·age·(1 − .34u) + (sin(phase·2π + age·2.6)·22·u, 46·age, 0),
// u = age / 1.6 s; alpha = smoothstep(0, .09, u)·(1 − smoothstep(.40, 1, u)); size ∝ rand·(.45 + .55(1 − u)) over
// depth. The soft radial sprite (white → rgba(239,248,209,.72) at 32 % → clear) is drawn additively on dark grounds;
// on light grounds the sprite takes the look's accent and is drawn over. `disc` is the source's still variant: 180
// motes in a disc r = sqrt(rand)·105 at boost .45. Seeded (ML.rnd), so every frame is a function of t.
// Source: MengTo/Skills web-design/build-interactive-particle-trail (demo/index.html, MIT) — WebGL points ported to 2D.
ML.define({
  id: "accent.mote-burst",
  category: "accent",
  name: "Pollen burst",
  does: "A puff of glowing motes bursts out of one point, rises and drifts, then fades.",
  says: ["celebration", "result", "playful", "arrival"],
  energy: 3,
  targets: ["shape", "number", "logo", "cursor"],
  duration: [1, 2.5],
  params: {
    count: { type: "number", range: [30, 80], default: 50 },
    boost: { type: "number", range: [1.5, 3], default: 2 },
    colour: { type: "choice", options: ["pollen", "spark", "brand"], default: "pollen" },
    form: { type: "choice", options: ["burst", "disc"], default: "burst" },
  },
  pairs: ["data.count-up", "accent.line-to-ray-burst"],
  avoid: ["urgency", "problem"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "MengTo/Skills:web-design/build-interactive-particle-trail", license: "MIT", note: "spawn() + the flight vertex shader, ported from THREE.Points to a 2D canvas" },
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
    // the sprite: the source's pollen gradient, a warm spark, or the look's accent (always the accent on light grounds)
    const ramp = light || p.colour === "brand"
      ? [[...A1.map((v) => Math.round(v * 0.85)), 1], [...A1, 0.7], [...A2, 0]]
      : p.colour === "spark" ? [[255, 255, 255, 1], [255, 214, 150, 0.72], [255, 160, 70, 0]] : [[255, 255, 255, 1], [239, 248, 209, 0.72], [224, 242, 185, 0]];
    const spr = document.createElement("canvas"); spr.width = spr.height = 64;
    const sg = spr.getContext("2d"), gr = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
    const css = (c) => `rgba(${c[0]},${c[1]},${c[2]},${c[3]})`;
    gr.addColorStop(0, css(ramp[0])); gr.addColorStop(0.32, css(ramp[1])); gr.addColorStop(1, css(ramp[2]));
    sg.fillStyle = gr; sg.fillRect(0, 0, 64, 64);

    // the burst point: the target's middle, else the picture region's
    let ox = f.pic.x + f.pic.w / 2, oy = f.pic.y + f.pic.h / 2;
    if (el && el !== stage) { const b = ctx.box(el); ox = b.x + b.w / 2; oy = b.y + b.h / 2; }
    const U = 1.5 * k; // source world units → stage px (the demo's plane at z 160 fills ~1.5 px a unit at 1080)
    const D = Math.max(0.6, end - at), LIFE = Math.min(1.6, D);
    const r = (i, kk, a, b) => a + (b - a) * ML.rnd(i, kk);
    const motes = [];
    if (p.form === "disc") {
      for (let i = 0; i < 180; i++) {
        const a = ML.rnd(i, 11) * Math.PI * 2, rr = Math.sqrt(ML.rnd(i, 12)) * 105, bo = 0.45;
        motes.push({ x: Math.cos(a) * rr + r(i, 1, -15, 15) * bo, y: Math.sin(a) * rr + r(i, 2, -15, 15) * bo, z: 160 + r(i, 3, -45, 45), vx: r(i, 4, -38, 38) * bo, vy: (r(i, 5, 2, 64) + 22 * (bo - 1)) * bo, vz: r(i, 6, -26, 26) * bo, size: r(i, 7, 0.5, 1.15), ph: ML.rnd(i, 8), d: ML.rnd(i, 9) * 0.25 });
      }
    } else {
      const n = Math.round(p.count), bo = p.boost;
      for (let i = 0; i < n; i++) {
        motes.push({ x: r(i, 1, -15, 15) * bo, y: r(i, 2, -15, 15) * bo, z: 160 + r(i, 3, -45, 45), vx: r(i, 4, -38, 38) * bo, vy: (r(i, 5, 2, 64) + 22 * (bo - 1)) * bo, vz: r(i, 6, -26, 26) * bo, size: r(i, 7, 0.5, 1.15), ph: ML.rnd(i, 8), d: 0 });
      }
    }
    const sm = (a, b, x) => { const u = ML.clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
    const CAM = 760; // the source's camera distance to the plane (depth only shapes size and a little parallax)
    ctx.sfx(at, "pop.soft", 0.45);
    return {
      draw(t) {
        const age0 = t - at;
        const on = age0 >= 0 && age0 <= LIFE + 0.3 && t < end;
        cv.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        g.clearRect(0, 0, W, H);
        g.globalCompositeOperation = light ? "source-over" : "lighter";
        for (const q of motes) {
          const age = age0 - q.d;
          if (age < 0 || age > LIFE) continue;
          const u = age / LIFE, damp = age * (1 - 0.34 * u);
          const wx = q.x + q.vx * damp + Math.sin(q.ph * 6.283 + age * 2.6) * 22 * u;
          const wy = q.y + q.vy * damp + 46 * age;
          const wz = q.z - 160 + q.vz * damp;
          const persp = CAM / Math.max(200, CAM - wz);
          const sx = ox + wx * U * persp, sy = oy - wy * U * persp;
          const size = 14 * 1.6 * k * q.size * persp * (0.45 + 0.55 * (1 - u));
          const a = sm(0, 0.09, u) * (1 - sm(0.4, 1, u)) * 0.92;
          if (a <= 0.002) continue;
          g.globalAlpha = a;
          g.drawImage(spr, sx - size, sy - size, size * 2, size * 2);
        }
        g.globalAlpha = 1;
      },
    };
  },
});

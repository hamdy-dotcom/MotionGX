// Orb bursts into droplets: a floating sphere of water swells in over the target (its outline breathing with a free
// drop's oscillation modes), then bursts: `count` drops leave its surface with outward velocities (points on a sphere,
// seen from the front: the far ones smaller and dimmer). Each drop flies on the closed form of the source's integrator
// (velocity × e^(−drag·t), gravity under drag), so any frame is seekable; it is drawn as a screen-space bead — a dark
// middle, a bright rim and a tiny highlight, stretched at most 1.5× along its motion — lands on the ground line below
// and, for about half of them, rings the surface where it lands (flattened ripples spreading and dying in 1.3 s).
// Liquid: water (the look's ink and accent-2 as glass) or brand (the accent).
// Source: MengTo/Skills game-combat/water-crystal-skill-vfx (tide-crystal.mjs: drop(), spray(), updateDroplets() and
// the bead shader, MIT) — ported from WebGL instancing to a 2D canvas.
ML.define({
  id: "accent.droplet-burst",
  category: "accent",
  name: "Orb bursts into droplets",
  does: "A floating sphere of water bursts into hundreds of drops that fall, glinting, and ring the surface where they land.",
  says: ["celebration", "energy", "result", "relief"],
  energy: 4,
  targets: ["logo", "shape", "stage"],
  duration: [1, 2.5],
  params: {
    count: { type: "number", range: [80, 300], default: 160 },
    liquid: { type: "choice", options: ["water", "brand"], default: "water" },
  },
  pairs: [],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "MengTo/Skills:game-combat/water-crystal-skill-vfx", license: "MIT", note: "tide-crystal.mjs droplets ported to canvas" },
  setup(ctx) {
    const { p, at, end, f, stage, el } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, m = Math.min(W, H), k = m / 1080;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    cv.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:7;visibility:hidden";
    host.append(cv);
    const g = cv.getContext("2d");
    // the look's colours, resolved once (any CSS colour → rgb through a 1 px canvas)
    const px = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    const rgb = (v) => { const e = document.createElement("span"); e.style.cssText = `color:${v};display:none`; host.append(e); const c = getComputedStyle(e).color; e.remove(); px.clearRect(0, 0, 1, 1); px.fillStyle = "#000"; px.fillStyle = c; px.fillRect(0, 0, 1, 1); const d = px.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; };
    const mixc = (a, b, x) => a.map((v, i) => Math.round(v + (b[i] - v) * x));
    const css = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${ML.clamp(a).toFixed(3)})`;
    const INK = rgb("var(--x-ink)"), A2 = rgb("var(--x-accent-2)"), ACC = rgb("var(--x-accent)"), HI = rgb("var(--x-accent-ink)");
    const RIM = p.liquid === "brand" ? ACC : mixc(INK, A2, 0.45);
    const BODY = p.liquid === "brand" ? ACC : mixc(INK, A2, 0.6);

    // the orb: over the target's middle, sized to it
    let C = { x: W / 2, y: H * 0.42 }, R = m * 0.16;
    if (el && el !== stage) { const b = ctx.box(el); C = { x: b.x + b.w / 2, y: b.y + b.h / 2 }; R = ML.clamp(Math.max(b.w, b.h) * 0.62, m * 0.09, m * 0.22); }
    const ground = Math.min(H - 40 * k, Math.max(C.y + R + m * 0.35, f.safe.y + f.safe.h * 0.86));
    const burst = at + ML.clamp((end - at) * 0.28, 0.35, 0.7);
    const G = m * 2.4, life = Math.max(1.4, end - burst + 0.6);

    // the drops: tide-crystal's spray() from the orb's surface, each seeded
    const n = Math.round(ML.clamp(p.count, 80, 300));
    const drops = [];
    for (let i = 0; i < n; i++) {
      // a point on the sphere (seeded), its outward direction; z toward the viewer
      const zz = ML.rnd(i, 1) * 2 - 1, ph = ML.rnd(i, 2) * Math.PI * 2, rr = Math.sqrt(1 - zz * zz);
      const nx = Math.cos(ph) * rr, ny = Math.sin(ph) * rr;
      const sp = m * (0.25 + 0.9 * Math.pow(ML.rnd(i, 3), 0.7));
      const depth = 0.55 + 0.45 * (zz * 0.5 + 0.5); // far drops smaller and dimmer
      const d = {
        x0: C.x + nx * R, y0: C.y + ny * R, vx: nx * sp, vy: ny * sp - m * 0.55 * ML.rnd(i, 4), // a little lift: up = 0.55 m/s at most
        kd: 0.25 + 0.5 * ML.rnd(i, 5), size: (2.2 + 4.2 * ML.rnd(i, 6)) * k * depth * 1.3, depth,
        gy: ground + (zz * 0.5) * m * 0.06, rip: ML.rnd(i, 7) < 0.5, lt: Infinity, lx: 0,
      };
      // landing time: bisection on the closed-form height (once, in setup)
      const yAt = (s) => d.y0 + ((d.vy + G / d.kd) / d.kd) * (1 - Math.exp(-d.kd * s)) - (G / d.kd) * s;
      if (yAt(life) >= d.gy) { let lo = 0, hi = life; for (let j = 0; j < 40; j++) { const mid = (lo + hi) / 2; if (yAt(mid) >= d.gy) hi = mid; else lo = mid; } d.lt = hi; }
      d.yAt = yAt;
      d.xAt = (s) => d.x0 + (d.vx / d.kd) * (1 - Math.exp(-d.kd * s));
      d.lx = d.lt < Infinity ? d.xAt(d.lt) : 0;
      drops.push(d);
    }
    const lands = drops.filter((d) => d.lt < Infinity).map((d) => d.lt).sort((a, b) => a - b);
    // the orb's outline: a free drop's oscillation modes (2–5 lobes), swelling and settling
    const modes = [2, 3, 4, 5].map((nn, j) => ({ nn, a: 0.035 / (j + 1), w: 7 + j * 3.1, ph: ML.rnd(j, 9) * 6.283 }));
    const orbPath = (t, scale) => {
      g.beginPath();
      for (let s = 0; s <= 72; s++) {
        const th = (s / 72) * Math.PI * 2;
        let r = 1;
        for (const md of modes) r += md.a * Math.cos(md.nn * th + md.ph) * Math.sin(md.w * (t - at) + md.ph) * Math.exp(-(t - at) * 1.2);
        // just before it bursts it swells and trembles
        r += 0.05 * ML.ease(t, burst - 0.18, burst) * Math.sin(th * 9 + t * 60);
        const x = C.x + Math.cos(th) * R * r * scale, y = C.y + Math.sin(th) * R * r * scale;
        s ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.closePath();
    };

    ctx.sfx(at, "pop.soft", 0.2);
    ctx.sfx(burst, "pop", 0.55);
    if (lands.length) ctx.sfx(burst + lands[Math.floor(lands.length * 0.4)], "land.light", 0.25);
    return {
      draw(t) {
        const fade = 1 - ML.lin(t, end - 0.3, end);
        const on = t >= at && fade > 0;
        cv.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        g.clearRect(0, 0, W, H);
        g.globalAlpha = fade;
        // the orb, before it bursts (and a thin skin flying apart just after)
        if (t < burst + 0.12) {
          const grow = ML.back(t, at, at + 0.4, 1.4), pop = ML.lin(t, burst, burst + 0.12);
          const sc = Math.max(0.001, grow * (1 + pop * 0.35));
          orbPath(t, sc);
          if (pop === 0) {
            const gr = g.createRadialGradient(C.x - R * 0.3 * sc, C.y - R * 0.35 * sc, R * 0.05 * sc, C.x, C.y, R * sc);
            gr.addColorStop(0, css(HI, 0.35)); gr.addColorStop(0.5, css(BODY, 0.12)); gr.addColorStop(0.85, css(BODY, 0.28)); gr.addColorStop(1, css(RIM, 0.5));
            g.fillStyle = gr; g.fill();
          }
          g.lineWidth = (3 - pop * 2) * k; g.strokeStyle = css(RIM, 0.75 * (1 - pop)); g.stroke();
          if (pop === 0) {
            // a highlight crescent and a caustic arc: how a ball of water catches light
            g.beginPath(); g.ellipse(C.x - R * 0.38 * sc, C.y - R * 0.42 * sc, R * 0.22 * sc, R * 0.11 * sc, -0.7, 0, Math.PI * 2);
            g.fillStyle = css(HI, 0.8); g.fill();
            g.beginPath(); g.arc(C.x, C.y, R * 0.78 * sc, 0.35, 1.45); g.lineWidth = 4 * k; g.strokeStyle = css(HI, 0.45); g.stroke();
          }
        }
        if (t < burst) { g.globalAlpha = 1; return; }
        const s = t - burst;
        // ripples where drops land in the water
        g.lineWidth = 1.6 * k;
        for (const d of drops) {
          if (!d.rip || s < d.lt) continue;
          const a = s - d.lt; if (a > 1.3) continue;
          const rr = 0.012 * m + d.size * 2 + a * (0.05 * m + d.size * 6);
          for (let j = 0; j < 2; j++) {
            const r2 = rr * (1 - j * 0.35); if (r2 <= 0) continue;
            g.beginPath(); g.ellipse(d.lx, d.gy, r2, r2 * 0.26, 0, 0, Math.PI * 2);
            g.strokeStyle = css(RIM, (1 - a / 1.3) * 0.55 * d.depth * (1 - j * 0.4)); g.stroke();
          }
        }
        // the drops in flight: beads with a short streak
        for (const d of drops) {
          if (s >= d.lt || s > life) continue;
          const x = d.xAt(s), y = d.yAt(s);
          if (x < -20 || x > W + 20 || y < -20) continue;
          const e = Math.exp(-d.kd * s), vx = d.vx * e, vy = (d.vy + G / d.kd) * e - G / d.kd;
          const w = d.size, sp = Math.hypot(vx, vy) / 45, L = Math.min(sp, w * 0.5);
          const ang = Math.atan2(vy, vx), a = Math.min(1, s / 0.04) * Math.min(1, (life - s) / 0.2) * d.depth;
          g.save(); g.translate(x, y); g.rotate(ang);
          g.beginPath(); g.ellipse(-L * 0.5, 0, w + L * 0.5, w, 0, 0, Math.PI * 2);
          g.fillStyle = css(BODY, 0.28 * a); g.fill();
          g.lineWidth = Math.max(1, w * 0.4); g.strokeStyle = css(RIM, 0.85 * a); g.stroke();
          g.restore();
          g.beginPath(); g.arc(x - w * 0.3, y - w * 0.3, Math.max(0.8, w * 0.32), 0, Math.PI * 2);
          g.fillStyle = css(HI, 0.9 * a); g.fill();
        }
        g.globalAlpha = 1;
      },
    };
  },
});

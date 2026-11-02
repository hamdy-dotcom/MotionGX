// Cinders rise off a burning edge: tiny glowing sparks lift off the upper edge of a burning line, ring or point, streak
// upward with a lazy sway, cool from orange to deep red (never white) and die out. Each cinder is a closed-form function
// of (seed, t − birth): the fire-paper-loader's trajectory — thrown = (1 − e^(−2.6a))/2.6·2.2, a sideways throw from
// its angle, a rise of a²·rise·speed·1.1 + a·0.03·speed, a curl of two sines growing with age — its streak 2.5–4.5× its
// width along its motion (or a round spark), its fade smoothstep(0, 0.055, a)·(1 − a)^1.5 and its heat (1 − a)·0.68
// mapped deep red → orange → a pale core only at the hottest. Spawned only off the upper arc of a ring (20–160°) or the
// top edge of a line; streams of re-born cinders (each life a new seed). The burning edge glows under them.
// Colour: heat (the source's ember ramp) or brand (the look's accent → accent-2). Light grounds: drawn over, not added.
// Source: MengTo/Skills web-design/fire-paper-loader (demo.html: the cinders' vertex + fragment shader, MIT) — ported
// from WebGL quads to a 2D canvas.
ML.define({
  id: "accent.ember-cinders",
  category: "accent",
  name: "Cinders rise off a burning edge",
  does: "Tiny glowing sparks lift off the upper edge of a burning ring or line, streak upward, cool from orange to deep red and die out.",
  says: ["energy", "celebration", "change"],
  energy: 3,
  targets: ["shape", "stage"],
  duration: [1.5, 8],
  params: {
    density: { type: "number", range: [10, 60], default: 24 },
    source: { type: "choice", options: ["line", "ring-arc", "point"], default: "line" },
    rise: { type: "number", range: [20, 120], default: 60, unit: "px" },
    streak: { type: "bool", default: true },
    colour: { type: "choice", options: ["heat", "brand"], default: "heat" },
  },
  pairs: ["ui.burn-loader"],
  avoid: ["calm", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:web-design/fire-paper-loader", license: "MIT", note: "demo.html cinder shader ported to canvas" },
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
    const rgb = (v) => { const e = document.createElement("span"); e.style.cssText = `color:${v};display:none`; host.append(e); const c = getComputedStyle(e).color; e.remove(); px.clearRect(0, 0, 1, 1); px.fillStyle = "#000"; px.fillStyle = c; px.fillRect(0, 0, 1, 1); const d = px.getImageData(0, 0, 1, 1).data; return [d[0] / 255, d[1] / 255, d[2] / 255]; };
    const GR = rgb("var(--x-ground)"), lightGround = 0.2126 * GR[0] + 0.7152 * GR[1] + 0.0722 * GR[2] > 0.5;
    // the ember ramp: the source's deep red → orange → pale core, or the look's accent family
    const brand = p.colour === "brand";
    const A1 = rgb("var(--x-accent)"), A2 = rgb("var(--x-accent-2)"), AI = rgb("var(--x-accent-ink)");
    const C0 = brand ? A1.map((v) => v * 0.55) : [0.42, 0.036, 0.003], C1 = brand ? A1 : [1, 0.27, 0.025], C2 = brand ? A2.map((v, i) => v * 0.6 + AI[i] * 0.4) : [1, 0.84, 0.51];
    const sm = (a, b, x) => { const u = ML.clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
    const heatCol = (h) => { const u = sm(0, 0.75, h), w = Math.pow(h, 5); return C0.map((v, i) => { const c = v + (C1[i] - v) * u; return c + (C2[i] - c) * w; }); };
    const css = (c, a) => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${ML.clamp(a).toFixed(3)})`;

    // the burning edge
    let b = null;
    if (el && el !== stage) b = ctx.box(el);
    const src = p.source;
    let line = { x0: f.safe.x + f.safe.w * 0.08, x1: f.safe.x + f.safe.w * 0.92, y: f.safe.y + f.safe.h * 0.7 };
    if (b) line = { x0: b.x, x1: b.x + b.w, y: b.y };
    const ring = b ? { x: b.x + b.w / 2, y: b.y + b.h / 2, r: Math.max(b.w, b.h) * 0.5 + 12 * k } : { x: W / 2, y: H * 0.55, r: m * 0.2 };
    const point = b ? { x: b.x + b.w / 2, y: b.y } : { x: W / 2, y: H * 0.62 };
    const lenFactor = src === "line" ? ML.clamp((line.x1 - line.x0) / (m * 0.7), 0.4, 2) : src === "ring-arc" ? ML.clamp((ring.r * 2.4) / (m * 0.7), 0.4, 2) : 0.45;
    const R = p.rise * k * 2.6; // how far the oldest cinders climb (the source's reach on a 1080 frame)
    // streams of cinders: each slot re-born every period with a new seed
    const N = Math.round(p.density * 5 * lenFactor);
    const slots = [];
    for (let j = 0; j < N; j++) {
      const period = 0.9 + ML.rnd(j, 1) * 0.9;
      slots.push({ j, period, phase: ML.rnd(j, 2) * period, lifeK: 0.55 + ML.rnd(j, 3) * 0.4, w: (1.6 + 2.2 * ML.rnd(j, 4)) * k * 1.6 });
    }
    // the source's trajectory: unit = R, y up (returned in stage px, y down)
    const traj = (a, ang, speed, ox, oy) => {
      const throwK = 1;
      const thrown = ((1 - Math.exp(-a * 2.6)) / 2.6) * 2.2;
      const vx = Math.cos(ang) * 0.07 * throwK * 0.6 * 6, vy = 0.03 + (0.6 + 0.4 * Math.abs(Math.sin(ang * 1.37 + 0.4))) * throwK * 0.95;
      const curl = (Math.sin(ang * 3.7 + a * 3.2) * 0.085 + Math.sin(ang * 1.3 + a * 7.0) * 0.02) * a * (0.6 + 0.8 * ((ang * 5.31) % 1)) * 0.35 * 4;
      const up = a * a * speed * 1.1 + a * 0.03 * speed;
      return { x: ox + (vx * thrown * speed + curl) * R, y: oy - (vy * thrown * speed * 0.35 + up) * R };
    };
    const origin = (s, ang) => {
      if (src === "ring-arc") return { x: ring.x + Math.cos(ang) * ring.r, y: ring.y - Math.sin(ang) * ring.r };
      if (src === "point") return { x: point.x + (s - 0.5) * 10 * k, y: point.y };
      return { x: line.x0 + (line.x1 - line.x0) * s, y: line.y };
    };
    // the edge itself: a thin ember line, ring or coal, flickering on seeded noise
    const flick = (x, t) => 0.75 + 0.25 * Math.sin(x * 0.031 + t * 9.1) * Math.sin(x * 0.017 - t * 5.3);
    const drawEdge = (t, a) => {
      g.save();
      g.globalCompositeOperation = lightGround ? "source-over" : "lighter";
      g.lineCap = "round";
      const col = heatCol(0.6);
      const strokeIt = (path, wd, al) => { g.lineWidth = wd; g.strokeStyle = css(col, al * a); path(); g.stroke(); };
      if (src === "line") {
        const seg = 24 * k;
        for (let x = line.x0; x < line.x1; x += seg) {
          const fl = flick(x, t);
          strokeIt(() => { g.beginPath(); g.moveTo(x, line.y); g.lineTo(Math.min(line.x1, x + seg), line.y); }, 10 * k, 0.12 * fl);
          strokeIt(() => { g.beginPath(); g.moveTo(x, line.y); g.lineTo(Math.min(line.x1, x + seg), line.y); }, 2.5 * k, 0.85 * fl);
        }
      } else if (src === "ring-arc") {
        const nS = 64;
        for (let i = 0; i < nS; i++) {
          const a0 = (i / nS) * Math.PI * 2, a1 = ((i + 1) / nS) * Math.PI * 2, fl = flick(i * 40, t);
          strokeIt(() => { g.beginPath(); g.arc(ring.x, ring.y, ring.r, a0, a1 + 0.01); }, 10 * k, 0.12 * fl);
          strokeIt(() => { g.beginPath(); g.arc(ring.x, ring.y, ring.r, a0, a1 + 0.01); }, 2.5 * k, 0.85 * fl);
        }
      } else {
        const gr = g.createRadialGradient(point.x, point.y, 0, point.x, point.y, 22 * k);
        gr.addColorStop(0, css(heatCol(0.9), 0.95 * a)); gr.addColorStop(0.4, css(col, 0.6 * a * flick(1, t))); gr.addColorStop(1, css(col, 0));
        g.fillStyle = gr; g.beginPath(); g.arc(point.x, point.y, 22 * k, 0, Math.PI * 2); g.fill();
      }
      g.restore();
    };

    ctx.sfx(at, "whoosh.soft", 0.15);
    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.4, end);
        const on = t >= at && leave < 1;
        cv.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        g.clearRect(0, 0, W, H);
        const shown = ML.lin(t, at, at + 0.6); // the source's uDensity = min(1, 0.25 + 0.75·shown)
        const dens = Math.min(1, 0.25 + 0.75 * shown);
        drawEdge(t, ML.lin(t, at, at + 0.3) * (1 - leave));
        g.globalCompositeOperation = lightGround ? "source-over" : "lighter";
        g.lineCap = "round";
        const el0 = t - at;
        for (const s of slots) {
          const since = el0 - s.phase;
          if (since < 0) continue;
          const life = Math.floor(since / s.period), age = since - life * s.period, L = s.period * s.lifeK;
          if (age > L) continue;
          const seed = s.j * 131 + life * 7.7;
          if (ML.rnd(seed, 5) > dens) continue; // as many as there is fire alight
          const ph = age / L;
          // only off the top: 20–160 degrees, evenly both sides (in a ring's angle, or as the throw off a line)
          const ang = 0.35 + ML.rnd(seed, 6) * 2.44, speed = 0.6 + 0.8 * ML.rnd(seed, 7);
          const o = origin(ML.rnd(seed, 8), ang);
          const c = traj(ph, ang, speed, o.x, o.y), pr = traj(Math.max(0, ph - 0.025), ang, speed, o.x, o.y);
          const fade = sm(0, 0.055, ph) * Math.pow(1 - ph, 1.5) * (0.55 + 0.9 * ML.rnd(seed, 9)) * (1 - leave);
          if (fade <= 0.003) continue;
          const heat = (1 - ph) * 0.68, col = heatCol(heat);
          const w = s.w * (1 - 0.45 * ph);
          const vx = c.x - pr.x, vy = c.y - pr.y, vl = Math.hypot(vx, vy) || 1;
          const len = p.streak ? w + ML.clamp(vl * 0.4 * 6, 1.5 * w, 3.5 * w) : w;
          g.strokeStyle = css(col, Math.min(1, fade * 1.2));
          g.lineWidth = w;
          g.beginPath();
          g.moveTo(c.x, c.y);
          g.lineTo(c.x - (vx / vl) * Math.max(0.5, len - w), c.y - (vy / vl) * Math.max(0.5, len - w));
          g.stroke();
          if (!lightGround) { g.strokeStyle = css(col, fade * 0.25); g.lineWidth = w * 3; g.stroke(); }
        }
        g.globalCompositeOperation = "source-over";
      },
    };
  },
});

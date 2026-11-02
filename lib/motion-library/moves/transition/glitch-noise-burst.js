// Glitch noise burst: the screen tears into a bright noisy blob — a central shape painted as a noise texture (lit cells
// seeded per frame, denser toward the middle), cut into 6-10 horizontal slices each displaced x +-20-60 px and re-rolled
// every 2 frames, with a 3 px RGB split (two fringes in the look's warm and second accent) — that scales 0.5 -> 1.2
// over 0.3 s (up to 0.6 s at the end of a scene, so it bursts on the cut), then shatters: every lit cell of the last frame becomes a particle flying outward (positions closed form
// in t: p0 + v (1 - e^-kt) / k, fading), and the scene behind is gone. Canvas painted per frame from t only. On a shape
// target the blob sits on that shape; on a scene, at the centre. White = the look's accent ink; cyan = its second accent.
// Source: prompt-motion madhav-xo-pretty-cool-with-just (reference only: our own rebuild).
ML.define({
  id: "transition.glitch-noise-burst",
  category: "transition",
  name: "Glitch noise burst",
  does: "The screen tears into a bright noisy blob with horizontal slice displacement, which bursts into a particle field.",
  says: ["tech", "energy", "transition"],
  energy: 4,
  targets: ["scene", "shape"],
  duration: [0.4, 0.8],
  params: {
    intensity: { type: "number", range: [0.3, 1], default: 0.7 },
    colour: { type: "choice", options: ["white", "cyan"], default: "white" },
    slices: { type: "number", range: [6, 10], default: 8 },
  },
  pairs: ["transition.glitch-bar-wipe", "text-in.scramble"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "snap",
  source: { from: "prompt-motion:madhav-xo-pretty-cool-with-just", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, end, stage, f, el } = ctx;
    const scene = ctx.scene || null;
    const W = f.W, H = f.H, k = Math.min(W, H) / 1080;
    const I = ML.clamp(+p.intensity || 0.7, 0.3, 1);
    const nS = Math.round(ML.clamp(+p.slices || 8, 6, 10));
    // the look's colours as rgb for the canvas
    const probe = document.createElement("i");
    probe.style.display = "none";
    stage.append(probe);
    const px = Object.assign(document.createElement("canvas"), { width: 1, height: 1 }).getContext("2d", { willReadFrequently: true });
    const rgb = (css) => {
      probe.style.color = css;
      // through a pixel, so any colour syntax a look uses (rgb, hsl, oklch, color-mix…) comes back as sRGB
      px.fillStyle = "#000"; px.fillStyle = getComputedStyle(probe).color; px.clearRect(0, 0, 1, 1); px.fillRect(0, 0, 1, 1);
      return [...px.getImageData(0, 0, 1, 1).data].slice(0, 3);
    };
    const main = rgb(p.colour === "cyan" ? "var(--x-accent-2)" : "var(--x-accent-ink)");
    const warm = rgb("var(--x-bad)"), cool = rgb("var(--x-accent-2)"), dark = rgb("var(--x-device)");
    probe.remove();
    const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    // where the blob sits
    let cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.32;
    if (el && el !== stage) { const b = ctx.box(el); cx = b.x + b.w / 2; cy = b.y + b.h / 2; R = ML.clamp(Math.max(b.w, b.h) * 0.6, Math.min(W, H) * 0.12, Math.min(W, H) * 0.4); }
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    cv.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none;z-index:8;visibility:hidden`;
    stage.append(cv);
    const g = cv.getContext("2d");
    const cell = Math.max(4, Math.round(7 * k));
    // the blob's cells (a soft-edged ellipse, a little wider than tall), in blob space at scale 1
    const cells = [];
    for (let y = -R; y <= R; y += cell) for (let x = -R * 1.25; x <= R * 1.25; x += cell) {
      const d = Math.hypot(x / 1.25, y) / R;
      if (d <= 1) cells.push({ x, y, d, i: cells.length });
    }
    const room = end - at, grow = room <= 0.9 ? ML.clamp(room, 0.3, 0.6) : 0.3, burst = at + grow;
    // the particles fly over the next scene; the kit stops drawing a move 0.5 s after its scene, so they are gone by then
    const life = Math.max(0.05, Math.min(ML.clamp(end - burst, 0.3, 0.5), ctx.to + 0.5 - 2 / 30 - burst));
    const FR = 30;
    const lit = (c, fr) => ML.rnd(c.i * 0.731 + 1.3, fr * 1.17 + 2.1) < (0.25 + 0.6 * I) * (1 - c.d * c.d * 0.85);
    const sliceOf = (y, s) => ML.clamp(Math.floor(((y / s + R) / (2 * R)) * nS), 0, nS - 1);
    const shift = (j, roll) => (ML.rnd(j + 1, roll + 9) < 0.5 ? -1 : 1) * (20 + 40 * ML.rnd(j + 3, roll + 5)) * k * (0.4 + 0.6 * I);
    // the frame the burst freezes: its lit cells become the particles
    const fr0 = Math.floor(burst * FR);
    const parts = cells.filter((c) => lit(c, fr0)).map((c) => {
      const a = Math.atan2(c.y, c.x) + (ML.rnd(c.i, 21) - 0.5) * 0.6, sp = (500 + 1700 * ML.rnd(c.i, 22)) * k * (0.5 + 0.5 * I);
      return { x: c.x * 1.2, y: c.y * 1.2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: 0.5 + ML.rnd(c.i, 23) * 0.8 };
    });
    ctx.sfx(at, "snap", 0.4);
    ctx.sfx(burst, "hit", 0.35);
    return {
      draw(t) {
        const on = t >= at && t < burst + life;
        cv.style.visibility = on ? "visible" : "hidden";
        if (scene) scene.style.visibility = t >= burst ? "hidden" : "";
        g.clearRect(0, 0, W, H);
        if (!on) return;
        if (t < burst) {
          const s = 0.5 + 0.7 * ML.out(t, at, burst), fr = Math.floor(t * FR), roll = Math.floor(t * FR / 2);
          // a dark tear behind the blob so it reads on any ground
          g.fillStyle = css(dark, 0.18 + 0.25 * I);
          for (let j = 0; j < nS; j++) {
            const y0 = cy + (-R + (j * 2 * R) / nS) * s, hh = ((2 * R) / nS) * s;
            g.fillRect(cx - R * 1.4 * s + shift(j, roll) * 1.4, y0, R * 2.8 * s, hh + 1);
          }
          const pass = (c3, dx, dy, a) => {
            g.fillStyle = css(c3, a);
            for (const c of cells) {
              if (!lit(c, fr)) continue;
              const j = sliceOf(c.y, 1);
              g.fillRect(cx + c.x * s + shift(j, roll) + dx, cy + c.y * s + dy, cell * s * 0.9, cell * s * 0.9);
            }
          };
          const o = 3 * k * (0.6 + 0.8 * I);
          pass(warm, -o, 0, 0.8);
          pass(cool, o, 0, 0.8);
          pass(main, 0, 0, 1);
        } else {
          const dt = t - burst, kk = 3.2, fall = (1 - Math.exp(-kk * dt)) / kk, a = 1 - ML.lin(t, burst, burst + life);
          // a flash of the blob's light on the burst frame
          if (dt < 2 / FR) { g.fillStyle = css(main, 0.5 * (1 - dt * FR / 2)); g.fillRect(0, 0, W, H); }
          // the particles keep the RGB split, so they read on a light ground too
          const o = 3 * k * (0.6 + 0.8 * I), shrink = 1 - 0.5 * ML.lin(t, burst, burst + life);
          for (const [c3, dx] of [[warm, -o], [cool, o], [main, 0]]) {
            g.fillStyle = css(c3, a * (dx ? 0.85 : 1));
            for (const q of parts) {
              const sz = cell * 1.2 * q.s * shrink;
              g.fillRect(cx + q.x + q.vx * fall + dx, cy + q.y + q.vy * fall, sz, sz);
            }
          }
        }
      },
    };
  },
});

// Side parallax tracking shot: the camera dollies sideways with a subject along a seafront. Layered 2.5D, painted per
// frame from t on one canvas in the look's colours: the sky (a static gradient and a sun), the far sea and skyline
// (speed `far_speed`, a slow shimmer), the deck and its rail (speed 1.0), the foreground posts and lamps (speed
// `near_speed`, recycled every ~2 s), and the subject held at `subject_x` of the frame, walking. The camera's travel is
// constant — no easing — so it reads as a dolly, with a subtle vertical bob (`bob` px at 1 Hz). Under the sun the sea
// carries a reflection column of noise-scaled strips that flicker (seeded per frame index). The scene's own content
// stays above the plate. RTL: the track runs the other way (`direction` follows the script, as in the other tracks).
// Source: prompt-motion (axtonliu "opus 5.5 html svg"), reference only: rebuilt as our own code.
ML.define({
  id: "camera.tracking-shot",
  category: "camera",
  name: "Side parallax tracking shot",
  does: "The camera tracks sideways with a subject; near posts and lamps pass in front faster than the far sea and sky.",
  says: ["story", "calm", "flow", "time"],
  energy: 2,
  targets: ["stage", "scene"],
  duration: [3, 15],
  params: {
    direction: { type: "choice", options: ["left", "right"], default: "left" },
    near_speed: { type: "number", range: [1.2, 2], default: 1.4 },
    far_speed: { type: "number", range: [0, 0.3], default: 0.1 },
    bob: { type: "number", range: [0, 4], default: 2, unit: "px" },
    subject_x: { type: "number", range: [0.3, 0.7], default: 0.35, unit: "frame" },
  },
  pairs: ["camera.layer-parallax", "text-in.soft-rise"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:axtonliu-opus-5-5-html-svg", license: "reference", note: "rebuilt as our own code: sky / far 0.1 / deck 1.0 / posts 1.4 recycled, subject at 35% x, constant dolly, 1 Hz bob, reflection flicker" },
  setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, u = Math.min(W, H) / 1080;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    cv.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none;z-index:0`;
    host.insertBefore(cv, host.firstChild);
    const g = cv.getContext("2d");
    // a scrim keeps the headline band legible over the sky
    const scrim = document.createElement("div");
    scrim.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:0;background:linear-gradient(180deg, color-mix(in srgb, var(--x-ground) 70%, transparent) 0%, transparent 34%)";
    cv.after(scrim);
    const probe = document.createElement("span");
    host.append(probe);
    const col = (v) => { probe.style.color = `var(${v})`; return getComputedStyle(probe).color; };
    const C = { ground: col("--x-ground"), ink: col("--x-ink"), dim: col("--x-dim"), accent: col("--x-accent"), accent2: col("--x-accent-2"), panel: col("--x-panel"), panel2: col("--x-panel-2"), device: col("--x-device") };
    probe.remove();

    // which way the world slides: "left" means the camera travels right (the world moves left); the script mirrors it
    const leftward = (p.direction === "left") !== !!ctx.rtl;
    const sgn = leftward ? -1 : 1;
    const V = W * 0.22; // the deck's speed, px/s
    const near = ML.clamp(p.near_speed, 1.2, 2), far = ML.clamp(p.far_speed, 0, 0.3);
    const horizon = H * (f.tall ? 0.56 : 0.5), deckY = H * (f.tall ? 0.74 : 0.72);
    const sunX = W * (leftward ? 0.7 : 0.3), sunY = horizon - Math.min(W, H) * 0.12, sunR = Math.min(W, H) * 0.07;
    const sx = (ctx.rtl ? 1 - ML.clamp(p.subject_x, 0.3, 0.7) : ML.clamp(p.subject_x, 0.3, 0.7)) * W;
    const postGap = V * near * 2; // a post every ~2 s
    const wrap = (x, span) => ((x % span) + span) % span;
    ctx.sfx(at + 0.05, "whoosh.soft", 0.14);
    const draw = (t) => {
      const tt = Math.max(0, t - at); // the dolly runs from `at`, already moving
      const travel = (t - at) * V; // world px the camera has moved (constant velocity)
      const bob = ML.clamp(p.bob, 0, 4) * u * Math.sin(2 * Math.PI * tt);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      // sky
      let gr = g.createLinearGradient(0, 0, 0, horizon);
      gr.addColorStop(0, C.ground); gr.addColorStop(1, C.panel2);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      const sg = g.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 5);
      sg.addColorStop(0, C.accent2); sg.addColorStop(1, "transparent");
      g.globalAlpha = 0.35; g.fillStyle = sg; g.fillRect(0, 0, W, horizon);
      g.globalAlpha = 0.9; g.fillStyle = C.accent2; g.beginPath(); g.arc(sunX, sunY, sunR, 0, Math.PI * 2); g.fill();
      g.setTransform(1, 0, 0, 1, 0, bob);
      // far skyline (speed far): seeded blocks on the horizon
      const fx = travel * far * sgn;
      g.globalAlpha = 0.28; g.fillStyle = C.dim;
      const bw = 60 * u, span = bw * 40;
      for (let i = 0; i < 40; i++) {
        const x = wrap(i * bw + fx, span) - bw;
        if (x > W + bw) continue;
        const h = (8 + ML.rnd(i, 3) * 40) * u;
        g.fillRect(x, horizon - h, bw * (0.6 + ML.rnd(i, 4) * 0.5), h);
        if (span < W + bw * 2) g.fillRect(x + span, horizon - h, bw * 0.8, h);
      }
      // the sea: bands with a slow shimmer
      gr = g.createLinearGradient(0, horizon, 0, deckY);
      gr.addColorStop(0, C.panel2); gr.addColorStop(1, C.accent);
      g.globalAlpha = 0.55; g.fillStyle = gr; g.fillRect(0, horizon, W, deckY - horizon);
      g.globalAlpha = 0.18; g.strokeStyle = C.panel; g.lineWidth = Math.max(1, 2 * u);
      for (let k = 0; k < 14; k++) {
        const y = horizon + ((deckY - horizon) * (k + 0.5)) / 14;
        const len = (40 + k * 18) * u, sp = len * 3.2;
        const off = wrap(travel * far * (1 + k * 0.08) * sgn + Math.sin(tt * 0.9 + k) * 6 * u + k * 37, sp);
        for (let x = off - sp; x < W; x += sp) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y); g.stroke(); }
      }
      // the reflection column: noise-scaled strips under the sun, flickering per frame index
      const fi = Math.floor(t * 12);
      for (let k = 0; k < 18; k++) {
        const y = horizon + 4 * u + ((deckY - horizon - 8 * u) * k) / 18;
        const wv = sunR * (0.4 + 1.6 * ML.rnd(k, fi + 7)) * (0.5 + k / 18);
        g.globalAlpha = 0.25 + 0.45 * ML.rnd(k, fi + 13);
        g.fillStyle = C.accent2;
        g.fillRect(sunX - wv / 2 + (ML.rnd(k, fi) - 0.5) * 10 * u, y, wv, Math.max(2, 4 * u));
      }
      // the deck (speed 1.0): boards and the rail with its balusters
      g.globalAlpha = 1; g.fillStyle = C.panel; g.fillRect(0, deckY, W, H - deckY);
      g.strokeStyle = C.dim; g.globalAlpha = 0.25; g.lineWidth = Math.max(1, 2 * u);
      const plank = 90 * u, dx = wrap(travel * sgn, plank);
      for (let x = dx - plank; x < W + plank; x += plank) { g.beginPath(); g.moveTo(x, deckY); g.lineTo(x - (x - W / 2) * 0.35, H); g.stroke(); }
      const railY = deckY - 70 * u;
      g.globalAlpha = 0.9; g.fillStyle = C.ink;
      g.fillRect(0, railY, W, 6 * u); g.fillRect(0, railY + 34 * u, W, 3 * u);
      const bal = 34 * u, bx = wrap(travel * sgn, bal);
      g.globalAlpha = 0.6;
      for (let x = bx - bal; x < W + bal; x += bal) g.fillRect(x, railY, 3 * u, 70 * u);
      // the subject, held at subject_x, walking along the deck
      const ph = tt * 2 * Math.PI * 0.9, sh = 230 * u, face = leftward ? 1 : -1;
      g.globalAlpha = 1; g.fillStyle = C.device; g.strokeStyle = C.device; g.lineCap = "round";
      const hipY = deckY + 40 * u - sh * 0.48, footY = deckY + 40 * u;
      g.lineWidth = 22 * u;
      for (const s of [1, -1]) { const a = Math.sin(ph) * 0.45 * s; g.beginPath(); g.moveTo(sx, hipY); g.lineTo(sx + Math.sin(a) * sh * 0.48, footY - (1 - Math.cos(a)) * sh * 0.48); g.stroke(); }
      g.lineWidth = 34 * u;
      g.beginPath(); g.moveTo(sx, hipY); g.lineTo(sx + face * 6 * u, hipY - sh * 0.36); g.stroke();
      g.lineWidth = 16 * u;
      for (const s of [1, -1]) { const a = -Math.sin(ph) * 0.4 * s; g.beginPath(); g.moveTo(sx + face * 6 * u, hipY - sh * 0.33); g.lineTo(sx + face * 6 * u + Math.sin(a) * sh * 0.3, hipY - sh * 0.33 + Math.cos(a) * sh * 0.3); g.stroke(); }
      g.beginPath(); g.arc(sx + face * 8 * u, hipY - sh * 0.47, sh * 0.075, 0, Math.PI * 2); g.fill();
      // foreground posts and lamps (speed near), recycled every ~2 s, crossing in front of everything
      const px0 = wrap(travel * near * sgn, postGap);
      for (let x = px0 - postGap, i = 0; x < W + postGap; x += postGap, i++) {
        const id = Math.round((x - travel * near * sgn) / postGap);
        const pw = 46 * u, lamp = ML.rnd(id, 9) < 0.55;
        g.globalAlpha = 1; g.fillStyle = C.device;
        g.fillRect(x - pw / 2, lamp ? H * 0.12 : deckY - 160 * u, pw, H);
        if (lamp) {
          g.fillRect(x - pw / 2, H * 0.12, pw * 2.2 * face, 10 * u);
          const lg = g.createRadialGradient(x + pw * 1.8 * face, H * 0.13, 0, x + pw * 1.8 * face, H * 0.13, 120 * u);
          lg.addColorStop(0, C.accent2); lg.addColorStop(1, "transparent");
          g.globalAlpha = 0.5; g.fillStyle = lg; g.fillRect(x - 200 * u, 0, 400 * u, H * 0.4);
        }
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
    };
    return { draw };
  },
});

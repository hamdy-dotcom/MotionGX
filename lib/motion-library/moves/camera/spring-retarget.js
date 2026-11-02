// Retargeting spring track: one value sent to a new target on each cue, every change a closed-form spring that starts
// from where the value is (moving or not) so the stops blend without a jump. Ported from product-film's kit spring.ts:
// track(t, keys, cfg) = keys[0].v + Σ_{i≥1} (v_i − v_{i−1})·step(t − t_i), keys sorted by time, step = the analytic
// spring response (ML.step / ML.track). Springs: camera (stiffness 120, damping 30, mass 1.2 — overdamped, no
// overshoot), glide (150 / 20 / 1), critical(r) (stiffness r², damping 2r, r = `response` rad/s). What it drives:
// position (stage px, inside the room the target has on the frame), scale (tracked in log space, so a zoom reads the
// same at any size; never above 1), rotation, tint (the look's ink → accent mix) or a counter (the number in the
// target counting between values). The cues are the spoken words when the voice is there, else evenly spaced from `at`.
// RTL: horizontal stops mirror.
// Source: Rieranthony/product-film-skill, reference/engine.md (spring.ts) (MIT).
ML.define({
  id: "camera.spring-retarget",
  category: "camera",
  name: "Retargeting spring track",
  does: "A value moves smoothly to one target after another, each change starting on its cue and blending into the previous one without jumps.",
  says: ["flow", "precision"],
  energy: 2,
  targets: ["logo", "shape", "card", "number", "stage"],
  duration: [0.5, 10],
  params: {
    spring: { type: "choice", options: ["camera", "glide", "critical"], default: "camera" },
    response: { type: "number", range: [4, 20], default: 10, unit: "rad/s" },
    drive: { type: "choice", options: ["position", "scale", "rotate", "tint", "counter"], default: "position" },
    stops: { type: "number", range: [2, 6], default: 3 },
    travel: { type: "number", range: [0.04, 0.3], default: 0.14, unit: "frame" },
    sync: { type: "choice", options: ["even", "spoken"], default: "even" },
  },
  pairs: ["camera.world-canvas-camera", "camera.push-in"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "product-film-skill:reference/engine.md (spring.ts)", license: "MIT", note: "track = first value + Σ delta·step(t − key.t); camera / glide / critical springs" },
  setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const whole = !ctx.el || ctx.el === stage || ctx.el === host;
    // a stage target: the scene's content moves as one (a held camera), wrapped so the scene box stays put
    let el = ctx.el;
    if (whole) {
      el = document.createElement("div");
      el.style.cssText = "position:absolute;inset:0;transform-origin:50% 50%";
      while (host.firstChild) el.append(host.firstChild);
      host.append(el);
    }
    const cfg = p.spring === "glide" ? ML.SPRING.glide : p.spring === "critical" ? ML.critical(ML.clamp(p.response, 4, 20)) : ML.SPRING.camera;
    const N = Math.round(ML.clamp(p.stops, 2, 6));
    const span = Math.max(0.3, end - 0.35 - at);
    // the cues: spoken words (one per stop, in order) or an even spread
    const times = [];
    for (let i = 0; i < N; i++) {
      const even = at + (i * span) / N;
      const w = p.sync === "spoken" && ctx.words && ctx.words.length ? ctx.words[Math.min(ctx.words.length - 1, Math.round((i * (ctx.words.length - 1)) / Math.max(1, N - 1)))] : null;
      times.push(w && w.t >= at && w.t < end ? w.t : even);
    }
    for (let i = 1; i < N; i++) times[i] = Math.max(times[i], times[i - 1] + 0.12);
    times.forEach((tt, i) => ctx.sfx(tt, "tap", i === 0 ? 0.22 : 0.16));

    // the room the target has on the frame (so a position stop never leaves it)
    const b = whole ? { x: 0, y: 0, w: f.W, h: f.H } : ctx.box(el);
    const room = { l: Math.max(0, b.x - f.m * 0.5), r: Math.max(0, f.W - f.m * 0.5 - (b.x + b.w)), u: Math.max(0, b.y - 24), d: Math.max(0, f.H - 24 - (b.y + b.h)) };
    const reach = Math.min(f.W, f.H) * ML.clamp(p.travel, 0.04, 0.3) * (whole ? 0.3 : 1);
    const dir = ctx.rtl ? -1 : 1;
    // a stop pattern: a step to the reading side, a drop, a step back, a rise… each one a retarget mid-flight
    const PAT = [[0, 0], [1, -0.35], [0.35, 0.6], [-0.7, 0.15], [0.55, -0.55], [-0.2, 0.4]];
    const keysX = [], keysY = [], keysS = [], keysR = [], keysC = [];
    const SC = [1, 0.78, 0.92, 0.84, 0.97, 0.88], ROT = [0, -9, 6, -4, 8, -2], TINT = [0, 1, 0.35, 0.8, 0.15, 0.6];
    for (let i = 0; i < N; i++) {
      const [px, py] = i === N - 1 && N > 2 ? [0, 0] : PAT[i];
      const x = px * dir * reach, y = py * reach;
      keysX.push([times[i], x > 0 ? Math.min(x, room.r) : Math.max(x, -room.l)]);
      keysY.push([times[i], y > 0 ? Math.min(y, room.d) : Math.max(y, -room.u)]);
      keysS.push([times[i], Math.log(SC[i])]);
      keysR.push([times[i], ROT[i]]);
      keysC.push([times[i], TINT[i]]);
    }
    // the counter: the number in the target, walked between fractions of itself
    const numEl = p.drive === "counter" ? [...el.querySelectorAll("*")].concat(el).find((n) => !n.children.length && /\d/.test(n.textContent)) : null;
    const raw = numEl ? numEl.textContent : "", m = raw.match(/[\d,.]+/), digits = m ? m[0] : "";
    const target = digits ? parseFloat(digits.replace(/,/g, "")) || 0 : 0, grouped = /,/.test(digits);
    const FR = [0, 0.4, 0.72, 0.55, 0.9, 1];
    const keysN = times.map((tt, i) => [tt, (i === N - 1 ? 1 : FR[Math.min(i, FR.length - 1)]) * target]);
    const fmt = (v) => { const r = Math.round(v); return grouped ? r.toLocaleString("en-US") : String(r); };
    if (p.drive === "scale" || p.drive === "rotate") el.style.transformOrigin = "50% 50%";
    return {
      draw(t) {
        if (p.drive === "position") {
          const x = ML.track(t, keysX, cfg), y = ML.track(t, keysY, cfg);
          el.style.translate = Math.abs(x) < 0.01 && Math.abs(y) < 0.01 ? "none" : `${x.toFixed(2)}px ${y.toFixed(2)}px`;
        } else if (p.drive === "scale") {
          const s = Math.min(1, Math.exp(ML.track(t, keysS, cfg)));
          el.style.scale = s > 0.9999 ? "none" : s.toFixed(4);
        } else if (p.drive === "rotate") {
          const r = ML.track(t, keysR, cfg);
          el.style.rotate = Math.abs(r) < 0.005 ? "none" : `${r.toFixed(3)}deg`;
        } else if (p.drive === "tint") {
          const k = ML.clamp(ML.track(t, keysC, cfg), 0, 1);
          el.style.color = `color-mix(in srgb, var(--x-accent) ${(k * 100).toFixed(1)}%, var(--x-ink))`;
          if (el.tagName === "svg" || el.closest("svg")) el.style.fill = el.style.color;
        } else if (numEl && digits) {
          numEl.textContent = raw.replace(digits, fmt(ML.track(t, keysN, cfg)));
        }
      },
    };
  },
});

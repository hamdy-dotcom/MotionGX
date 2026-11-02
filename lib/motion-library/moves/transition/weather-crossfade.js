// Weather crossfade: the weather over a landscape changes (clear -> rain, rain -> storm, storm -> snow…) with every dial
// easing together. Each state holds multipliers (fogK, sunK, ambK), colour blends with weights (fogC / fogM, skyC /
// skyM, groundC / groundM), starK, rain / rainN / rainV, snow / snowN, wet and bolt; mix runs linearly over `duration`
// (1.35 s default) and every value is from + (to - from) * mix, applied as multipliers on top of a time-of-day state.
// Lightning is scheduled (seeded) only while the bolt mix is above .55: one strike is a leader and 1-3 return strokes,
// each flash decaying exp(-age / 0.085). Rain and snow are seeded particles whose position is a closed form of t (birth
// phase + speed * t, wrapped), so any frame is seekable; settled snow and wet ground are their own slower dials.
// The three.js scene becomes a canvas painted from t; the weather and time-of-day colours are the technique (the
// source's measured palettes), the one place this move names colours.
// Source: MengTo/Skills web-design/threejs-weather/demo/index.html (MIT: WEATHER, wxN, wxBlend, wxApply, strike()).
ML.define({
  id: "transition.weather-crossfade",
  category: "transition",
  name: "Weather crossfade",
  does: "A painted landscape fills the frame behind the content and its weather changes (clear to rain, rain to storm, storm to snow), every dial easing together: sky, fog, ground, rain, snow, lightning.",
  says: ["change", "transition", "story", "time"],
  energy: 2,
  targets: ["scene", "stage"],
  duration: [1, 2.5],
  params: {
    from: { type: "choice", options: ["clear", "rain", "storm", "snow"], default: "clear" },
    to: { type: "choice", options: ["clear", "rain", "storm", "snow"], default: "rain" },
    duration: { type: "number", range: [1, 2.5], default: 1.35, unit: "s" },
    time: { type: "choice", options: ["morning", "noon", "sunset", "night"], default: "noon" },
    scope: { type: "choice", options: ["scene", "scene+page"], default: "scene+page" },
  },
  pairs: ["transition.time-of-day-crossfade"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "MengTo/Skills:agent-skills/web-design/threejs-weather/demo/index.html", license: "MIT", note: "WEATHER states + wxApply ported; the 3D scene repainted as a seeded canvas" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, u = Math.min(W, H) / 1080;
    const rgbOf = (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
    // the time of day the weather sits on (threejs-landscape THEMES)
    const TIMES = {
      morning: { sky: [0xf7ecd0, 0xf3e2bd, 0xeed7ab, 0xe7cb9a, 0xdcbd8c, 0xd2b184], fog: 0xf0d6a8, ground: 0xb9a882, grass: 0xf2e6c6, sun: [0.5, 0.3, 0xffe0ad, 2.0], hemiI: 0.52, stars: 0 },
      noon: { sky: [0x9fc6e4, 0xaed0e8, 0xc0dcee, 0xd2e6f2, 0xe2eef5, 0xeef4f6], fog: 0xdde7ec, ground: 0xaeb0a4, grass: 0xf4f6f2, sun: [0.3, 0.86, 0xffffff, 2.3], hemiI: 0.62, stars: 0 },
      sunset: { sky: [0xf6b268, 0xf0a05c, 0xe58a52, 0xd4744e, 0xb85f4a, 0x8d4d44], fog: 0xef9a52, ground: 0xa8794e, grass: 0xe8c8a0, sun: [1.28, 0.1, 0xffa05a, 2.4], hemiI: 0.5, stars: 0.12 },
      night: { sky: [0x0c1120, 0x101733, 0x151d3d, 0x1b2647, 0x243050, 0x2d3a5c], fog: 0x131c2e, ground: 0x2b3140, grass: 0x7182a6, sun: [0.5, 0.62, 0x9fb6de, 0.42], hemiI: 0.24, stars: 1 },
    };
    const WEATHER = {
      clear: { fogK: 1.0, fogC: null, fogM: 0, sunK: 1.0, ambK: 1.0, skyC: null, skyM: 0, groundC: null, groundM: 0, starK: 1.0, rain: 0, rainN: 0, rainV: 1, snow: 0, snowN: 0, wet: 0, bolt: 0 },
      rain: { fogK: 0.52, fogC: 0x6a7480, fogM: 0.55, sunK: 0.3, ambK: 1.55, skyC: 0x717c88, skyM: 0.52, groundC: 0x59594e, groundM: 0.52, starK: 0, rain: 1, rainN: 0.6, rainV: 1.0, snow: 0, snowN: 0, wet: 1, bolt: 0 },
      storm: { fogK: 0.38, fogC: 0x515a67, fogM: 0.72, sunK: 0.14, ambK: 1.3, skyC: 0x4b535f, skyM: 0.74, groundC: 0x43443e, groundM: 0.62, starK: 0, rain: 1, rainN: 1.0, rainV: 1.42, snow: 0, snowN: 0, wet: 1, bolt: 1 },
      snow: { fogK: 0.58, fogC: 0xdfe4ea, fogM: 0.6, sunK: 0.52, ambK: 1.45, skyC: 0xc9d2dc, skyM: 0.46, groundC: 0xf4f8fc, groundM: 0.4, starK: 0.3, rain: 0, rainN: 0, rainV: 1, snow: 1, snowN: 0.52, wet: 0, bolt: 0 },
    };
    const T0 = TIMES[p.time] || TIMES.noon, WA = WEATHER[p.from] || WEATHER.clear, WB = WEATHER[p.to] || WEATHER.rain;
    const base = { sky: T0.sky.map(rgbOf), fog: rgbOf(T0.fog), ground: rgbOf(T0.ground), grass: rgbOf(T0.grass), sunAz: T0.sun[0], sunEl: T0.sun[1], sunC: rgbOf(T0.sun[2]), sunI: T0.sun[3], hemiI: T0.hemiI, stars: T0.stars };
    const n = (a, b, x) => a + (b - a) * x;
    const c3 = (a, b, x) => [n(a[0], b[0], x), n(a[1], b[1], x), n(a[2], b[2], x)];
    const css = (c, a = 1) => `rgba(${Math.round(ML.clamp(c[0], 0, 255))},${Math.round(ML.clamp(c[1], 0, 255))},${Math.round(ML.clamp(c[2], 0, 255))},${a.toFixed(3)})`;
    const D = Math.min(ML.clamp(p.duration, 1, 2.5), Math.max(0.3, ctx.end - at)); // never runs past the move's end
    const mixAt = (t) => ML.lin(t, at, at + D); // linear, as the source's t / 1.35
    const wxN = (k, m) => WA[k] + (WB[k] - WA[k]) * m;
    // wxBlend: the weight of a colour blend, toward the colour of whichever state has one
    const wxBlend = (col, kf, kc, m) => {
      const a = WA[kc] === null ? 0 : WA[kf], b = WB[kc] === null ? 0 : WB[kf], w = a + (b - a) * m;
      return w <= 0.001 ? col : c3(col, rgbOf(WB[kc] !== null ? WB[kc] : WA[kc]), w);
    };

    // lightning: candidate strikes (seeded), kept only while the bolt mix > .55; one strike = leader + return strokes
    const boltAt = (t) => wxN("bolt", mixAt(t));
    const cand = [];
    if (WB.bolt > WA.bolt) cand.push(at + D * ((0.55 - WA.bolt) / (WB.bolt - WA.bolt)) + 0.12);
    for (let k = 0, tt = ctx.from + 0.35; tt < ctx.end + 0.5 && k < 40; k++) { cand.push(tt); tt += 1.1 + ML.rnd(k, 71) * 2.2; }
    cand.sort((a, b) => a - b);
    const strikes = [];
    cand.forEach((ts, k) => {
      if (boltAt(ts) <= 0.55 || (strikes.length && ts - strikes[strikes.length - 1].t < 0.9)) return;
      const near = ML.rnd(k, 72), s = 0.42 + near * 0.58, pulses = [{ t: 0, a: s }];
      let q = 0;
      for (let i = 0, m = 1 + Math.floor(ML.rnd(k, 73) * 2.6); i < m; i++) { q += 0.05 + ML.rnd(k * 7 + i, 74) * 0.14; pulses.push({ t: q, a: s * (0.3 + ML.rnd(k * 7 + i, 75) * 0.65) }); }
      // the bolt's path: a jagged seeded line from the top of the sky toward the ridges
      const x0 = W * (0.15 + 0.7 * ML.rnd(k, 76)), path = [[x0, 0]];
      for (let i = 1; i <= 9; i++) path.push([path[i - 1][0] + (ML.rnd(k * 13 + i, 77) - 0.5) * 0.09 * W, (i / 9) * H * 0.58]);
      strikes.push({ t: ts, pulses, path, near });
    });
    ctx.sfx(at, "swell", 0.3);
    strikes.forEach((s) => ctx.sfx(s.t + 0.32 + (1 - s.near) * 0.6, "sub", 0.25 + s.near * 0.3));
    const flashAt = (t) => {
      let v = 0, path = null;
      for (const s of strikes) {
        const age = t - s.t;
        if (age < 0 || age > 2.4) continue;
        for (const q of s.pulses) if (age >= q.t) v += q.a * Math.exp(-(age - q.t) / 0.085);
        if (age < 0.16) path = s.path;
      }
      return { k: Math.min(1.4, v), path };
    };

    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
    host.prepend(cv);
    const g = cv.getContext("2d");
    const hz = H * (f.wide ? 0.66 : 0.64);
    const ridges = [0, 1, 2].map((k) => {
      const ph = [0, 1, 2].map((j) => ML.rnd(k + 1, j + 3) * 6.283), b = hz + [-0.02, 0.05, 0.14][k] * H, amp = [0.07, 0.06, 0.05][k] * H, pts = [];
      for (let i = 0; i <= 48; i++) { const s = i / 48; pts.push([s * W, b - amp * (0.5 + 0.28 * Math.sin(s * (2.1 + k) + ph[0]) + 0.16 * Math.sin(s * (5.3 + k * 1.7) + ph[1]) + 0.06 * Math.sin(s * 13.1 + ph[2]))]); }
      return pts;
    });
    const fill = (pts, col) => { g.beginPath(); g.moveTo(0, H); for (const [x, y] of pts) g.lineTo(x, y); g.lineTo(W, H); g.closePath(); g.fillStyle = col; g.fill(); };
    const area = (W * H) / (1080 * 1920);
    const RAIN = Array.from({ length: Math.round(900 * area) }, (_, i) => ({ x: ML.rnd(i, 21), y: ML.rnd(i, 22), v: 1.7 + ML.rnd(i, 23) * 0.9, l: 0.6 + ML.rnd(i, 24) * 0.7 }));
    const SNOW = Array.from({ length: Math.round(520 * area) }, (_, i) => ({ x: ML.rnd(i, 31), y: ML.rnd(i, 32), v: 0.07 + ML.rnd(i, 33) * 0.08, r: 1.6 + ML.rnd(i, 34) * 3, ph: ML.rnd(i, 35) * 6.283 }));
    const stars = Array.from({ length: 160 }, (_, i) => ({ x: ML.rnd(i, 11) * W, y: Math.pow(ML.rnd(i, 12), 1.4) * hz * 0.82, r: (0.8 + ML.rnd(i, 13) * 1.8) * u, ph: ML.rnd(i, 14) * 6.283 }));
    const snowy = [242, 246, 250];
    // the rain's travel, the integral of its speed, so a change of speed never makes the drops jump
    const rainAt = (t) => WA.rainV * t + (WB.rainV - WA.rainV) * (t <= at ? 0 : t < at + D ? ((t - at) * (t - at)) / (2 * D) : D / 2 + (t - at - D));
    // the page follows the sky so type stays readable (scene+page): the source's noon and night page tokens, by how dark the sky has become
    const page = p.scope !== "scene";
    const INK_D = rgbOf(0x22282c), INK_L = rgbOf(0xe9e2d2), PAPER_D = rgbOf(0x151a24), lum = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
    if (page) host.style.color = "var(--x-ink)";

    return {
      draw(t) {
        const m = mixAt(t), fl = flashAt(t), k = fl.k * Math.max(boltAt(t), fl.k > 0 ? 1 : 0);
        // wxApply on the time-of-day state
        const fogK = wxN("fogK", m), sunK = wxN("sunK", m), ambK = wxN("ambK", m), rn = wxN("rain", m), sn = wxN("snow", m), wet = wxN("wet", m);
        const calm = base.sky.map((c) => wxBlend(c, "skyM", "skyC", m)), sky = calm.map((c) => c.map((v) => v * (1 + k * 0.8)));
        if (page) {
          const under = c3(c3(calm[0], calm[1], 0.5), calm[2], 0.33), q = 1 - ML.ease(lum(under), 0.46, 0.58);
          const ink = c3(INK_D, INK_L, q), paper = c3([255, 255, 255], PAPER_D, q);
          host.style.setProperty("--x-ink", css(ink));
          host.style.setProperty("--x-dim", css(c3(ink, under, 0.3)));
          host.style.setProperty("--x-panel", css(paper, 0.92));
          host.style.setProperty("--x-panel-2", css(c3(paper, under, 0.15)));
          host.style.setProperty("--x-line", css(ink, 0.14));
          host.style.setProperty("--x-edge-color", css(ink, 0.14));
        }
        const fog = wxBlend(base.fog, "fogM", "fogC", m);
        // settled snow is slower than falling snow: it builds over the second after the change
        const pack = sn * ML.ease(t, at + D * 0.4, at + D + 1.6);
        let ground = wxBlend(base.ground, "groundM", "groundC", m), grass = wxBlend(base.grass, "groundM", "groundC", m);
        if (pack > 0.002) { ground = c3(ground, snowy, pack * 0.8); grass = c3(grass, snowy, pack * 0.74); }
        const sunI = base.sunI * sunK, lit = ML.clamp((0.72 + 0.25 * base.hemiI / 0.62) * (0.88 + 0.12 * ambK), 0, 1.2);
        const shade = (c, s) => c.map((v) => v * s);
        // sky
        const sg = g.createLinearGradient(0, 0, 0, hz);
        [0, 0.3, 0.52, 0.68, 0.84, 1].forEach((s, i) => sg.addColorStop(s, css(sky[i])));
        g.fillStyle = sg; g.fillRect(0, 0, W, hz + 2);
        const st = base.stars * wxN("starK", m);
        if (st > 0.005) for (const s of stars) { g.fillStyle = `rgba(255,250,240,${(st * (0.55 + 0.45 * Math.sin(t * 2.2 + s.ph))).toFixed(3)})`; g.beginPath(); g.arc(s.x, s.y, s.r, 0, 6.283); g.fill(); }
        // the sun dims behind the cloud (sunK); its disc is veiled by the sky colour blend
        const sx = W * (0.18 + 0.64 * ML.clamp((base.sunAz - 0.3) / 0.98)), sy = hz - base.sunEl * hz * 0.82, sr = 46 * u;
        const glow = g.createRadialGradient(sx, sy, sr * 0.6, sx, sy, sr * (3 + sunI * 2.2));
        glow.addColorStop(0, css(base.sunC, ML.clamp(0.55 * sunI / 2.4 + 0.05))); glow.addColorStop(1, css(base.sunC, 0));
        g.fillStyle = glow; g.fillRect(0, 0, W, hz);
        g.fillStyle = css(c3(base.sunC, [255, 255, 255], 0.35), ML.clamp(sunI / 2.4) * 0.95); g.beginPath(); g.arc(sx, sy, sr, 0, 6.283); g.fill();
        // lightning: the bolt itself for its first frames, then the sky flash
        if (fl.path && k > 0.05) {
          g.save(); g.strokeStyle = `rgba(232,238,255,${ML.clamp(k).toFixed(3)})`; g.lineWidth = 3.2 * u; g.shadowColor = "rgba(200,215,255,0.9)"; g.shadowBlur = 24 * u;
          g.beginPath(); fl.path.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.restore();
        }
        // fog thickens as fogK falls (fog near / far scaled by it)
        const haze = ML.clamp(0.12 / fogK);
        fill(ridges[0], css(c3(shade(ground, lit), fog, ML.clamp(0.62 + haze))));
        const band = g.createLinearGradient(0, hz - 0.18 * H, 0, hz + 0.1 * H);
        band.addColorStop(0, css(fog, 0)); band.addColorStop(0.6, css(fog, ML.clamp(0.4 + 0.25 / fogK, 0, 0.95))); band.addColorStop(1, css(fog, 0));
        g.fillStyle = band; g.fillRect(0, hz - 0.18 * H, W, 0.28 * H);
        fill(ridges[1], css(c3(shade(ground, lit), fog, ML.clamp(0.28 + haze * 0.6))));
        const near = g.createLinearGradient(0, hz + 0.05 * H, 0, H);
        near.addColorStop(0, css(c3(shade(ground, lit), grass, 0.28))); near.addColorStop(1, css(shade(ground, lit * (1 - 0.25 * wet))));
        fill(ridges[2], near);
        // wet ground: puddle sheen (sky reflected in thin streaks)
        if (wet > 0.02) for (let i = 0; i < 7; i++) {
          const y = hz + (0.2 + 0.1 * i + ML.rnd(i, 41) * 0.05) * H * 0.55, x = ML.rnd(i, 42) * W * 0.8, w = (0.12 + ML.rnd(i, 43) * 0.18) * W;
          g.fillStyle = css(sky[3], 0.34 * wet * (1 + k)); g.beginPath(); g.ellipse(x + w / 2, y, w / 2, 5 * u + i * 1.2 * u, 0, 0, 6.283); g.fill();
        }
        // rain: a fixed pool, density as a share of it (rainN), streaks slanting with speed (rainV)
        const rv = wxN("rainV", m), rCount = Math.round(RAIN.length * Math.min(1, wxN("rainN", m)));
        if (rn > 0.01 && rCount) {
          g.strokeStyle = css(c3(sky[2], [255, 255, 255], 0.5), 0.5 * rn); g.lineWidth = 1.7 * u; g.beginPath();
          const slant = 0.22 * rv * rv;
          for (let i = 0; i < rCount; i++) {
            const d = RAIN[i], len = 0.04 * H * rv * d.l, span = H + 0.08 * H * 1.42 * d.l; // one wrap length at any speed
            const y = ((d.y * span + rainAt(t) * d.v * H) % span) - len, x = d.x * (W + slant * H) - slant * (y + len);
            g.moveTo(x, y); g.lineTo(x - slant * len, y + len);
          }
          g.stroke();
        }
        // snow: drifting flakes, swaying on their own phase
        const sCount = Math.round(SNOW.length * Math.min(1, wxN("snowN", m) / 0.52));
        if (sn > 0.01 && sCount) {
          g.fillStyle = `rgba(250,252,255,${Math.min(1, 0.88 * sn).toFixed(3)})`;
          for (let i = 0; i < sCount; i++) {
            const d = SNOW[i], span = H * 1.05, y = ((d.y * span + t * d.v * H) % span) - 0.02 * H, x = d.x * W + Math.sin(t * 1.3 + d.ph) * 0.02 * W;
            g.beginPath(); g.arc(x, y, d.r * u, 0, 6.283); g.fill();
          }
        }
        if (k > 0.002) { g.fillStyle = `rgba(232,238,255,${(k * 0.15).toFixed(3)})`; g.fillRect(0, 0, W, H); }
      },
    };
  },
});

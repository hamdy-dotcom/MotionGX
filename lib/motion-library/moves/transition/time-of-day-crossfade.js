// Time-of-day crossfade: the light over a landscape glides from one time of day to another. Each time of day is a full
// state (sun azimuth / elevation / colour / intensity, hemisphere sky + ground + intensity, fog colour / near / far,
// ground, grass, six sky stops, star opacity, plus the page tokens paper / ink / ink2); the move lerps A -> B over
// `duration` (0.8-2.5 s, 1.25 default) with easeInOutQuad (x < .5 ? 2x² : 1 - (-2x + 2)² / 2), the sky repainted every
// frame as six stops at 0 / .30 / .52 / .68 / .84 / 1, stars fading in toward night; the page tokens follow over 0.6 s.
// The three.js scene of the source becomes a canvas painted from t: sky, seeded stars, the sun (or moon) with its glow,
// three seeded ridges in aerial perspective, fog bands on the horizon. The time-of-day palettes are the technique (the
// source's measured light), so they are the one place this move names colours; with scope "scene" the look keeps its
// own page tokens. Mid-blend redirects are a live-app concern: here a film chains two moves (A -> B, then B -> C).
// Source: MengTo/Skills web-design/threejs-landscape/demo/index.html (MIT: THEMES, themeState, applyState, the lerp).
ML.define({
  id: "transition.time-of-day-crossfade",
  category: "transition",
  name: "Time-of-day crossfade",
  does: "A painted landscape fills the frame behind the content and its light glides from morning gold to blue noon to orange sunset to night: sun, sky, fog, ground and page colours change together and stars fade in at night.",
  says: ["time", "change", "story", "calm", "before-after"],
  energy: 2,
  targets: ["scene", "stage"],
  duration: [0.8, 2.5],
  params: {
    from: { type: "choice", options: ["morning", "noon", "sunset", "night"], default: "noon" },
    to: { type: "choice", options: ["morning", "noon", "sunset", "night"], default: "sunset" },
    duration: { type: "number", range: [0.8, 2.5], default: 1.25, unit: "s" },
    scope: { type: "choice", options: ["scene", "scene+page"], default: "scene+page" },
  },
  pairs: ["transition.weather-crossfade", "camera.push-in"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "MengTo/Skills:agent-skills/web-design/threejs-landscape/demo/index.html", license: "MIT", note: "THEMES + applyState ported; the 3D scene repainted as a seeded canvas" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, u = Math.min(W, H) / 1080;
    const THEMES = {
      morning: { paper: 0xecdcbc, ink: 0x2e2515, ink2: 0x8b7c5c, sky: [0xf7ecd0, 0xf3e2bd, 0xeed7ab, 0xe7cb9a, 0xdcbd8c, 0xd2b184], fog: 0xf0d6a8, fogN: 56, fogF: 520, ground: 0xb9a882, grass: 0xf2e6c6, sun: { az: 0.5, el: 0.3, color: 0xffe0ad, int: 2.0 }, hemi: [0xfff0d4, 0x6d5a34, 0.52], stars: 0 },
      noon: { paper: 0xe7ecee, ink: 0x22282c, ink2: 0x75828a, sky: [0x9fc6e4, 0xaed0e8, 0xc0dcee, 0xd2e6f2, 0xe2eef5, 0xeef4f6], fog: 0xdde7ec, fogN: 56, fogF: 560, ground: 0xaeb0a4, grass: 0xf4f6f2, sun: { az: 0.3, el: 0.86, color: 0xffffff, int: 2.3 }, hemi: [0xdcecff, 0x5a6248, 0.62], stars: 0 },
      sunset: { paper: 0xf0d0aa, ink: 0x3a2010, ink2: 0x8f6244, sky: [0xf6b268, 0xf0a05c, 0xe58a52, 0xd4744e, 0xb85f4a, 0x8d4d44], fog: 0xef9a52, fogN: 50, fogF: 480, ground: 0xa8794e, grass: 0xe8c8a0, sun: { az: 1.28, el: 0.1, color: 0xffa05a, int: 2.4 }, hemi: [0xffc089, 0x6a3a24, 0.5], stars: 0.12 },
      night: { paper: 0x151a24, ink: 0xe9e2d2, ink2: 0x8b8fa0, sky: [0x0c1120, 0x101733, 0x151d3d, 0x1b2647, 0x243050, 0x2d3a5c], fog: 0x131c2e, fogN: 52, fogF: 480, ground: 0x2b3140, grass: 0x7182a6, sun: { az: 0.5, el: 0.62, color: 0x9fb6de, int: 0.42 }, hemi: [0x2e3a54, 0x0d0f14, 0.24], stars: 1.0 },
    };
    const rgbOf = (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
    // themeState: every colour as rgb, so a state lerps field by field
    const state = (th) => ({ sunAz: th.sun.az, sunEl: th.sun.el, sunC: rgbOf(th.sun.color), sunI: th.sun.int, hemiS: rgbOf(th.hemi[0]), hemiG: rgbOf(th.hemi[1]), hemiI: th.hemi[2], fog: rgbOf(th.fog), fogN: th.fogN, fogF: th.fogF, ground: rgbOf(th.ground), grass: rgbOf(th.grass), sky: th.sky.map(rgbOf), stars: th.stars, paper: rgbOf(th.paper), ink: rgbOf(th.ink), ink2: rgbOf(th.ink2) });
    const A = state(THEMES[p.from] || THEMES.noon), B = state(THEMES[p.to] || THEMES.sunset);
    const n = (a, b, x) => a + (b - a) * x;
    const c3 = (a, b, x) => [n(a[0], b[0], x), n(a[1], b[1], x), n(a[2], b[2], x)];
    const css = (c, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a.toFixed(3)})`;
    const lum = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
    const quad = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2); // easeInOutQuad (the source's)
    const D = Math.min(ML.clamp(p.duration, 0.8, 2.5), Math.max(0.3, ctx.end - at)); // never runs past the move's end

    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
    host.prepend(cv);
    const g = cv.getContext("2d");
    const hz = H * (f.wide ? 0.66 : 0.64); // the horizon
    // three ridges (far, mid, near): seeded sine sums, sampled once
    const ridges = [0, 1, 2].map((k) => {
      const ph = [0, 1, 2, 3].map((j) => ML.rnd(k + 1, j + 3) * 6.283), base = hz + [-0.02, 0.05, 0.14][k] * H, amp = [0.07, 0.06, 0.05][k] * H;
      const pts = [];
      for (let i = 0; i <= 48; i++) {
        const x = (i / 48) * W, s = x / W;
        pts.push([x, base - amp * (0.5 + 0.28 * Math.sin(s * (2.1 + k) + ph[0]) + 0.16 * Math.sin(s * (5.3 + k * 1.7) + ph[1]) + 0.06 * Math.sin(s * 13.1 + ph[2]))]);
      }
      return pts;
    });
    const stars = Array.from({ length: 160 }, (_, i) => ({ x: ML.rnd(i, 11) * W, y: Math.pow(ML.rnd(i, 12), 1.4) * hz * 0.82, r: (0.8 + ML.rnd(i, 13) * 1.8) * u, ph: ML.rnd(i, 14) * 6.283 }));
    // the same lay-out in either direction: the sun keeps its sky position, the page reads its own way
    const fill = (pts, col, under) => { g.beginPath(); g.moveTo(0, H); for (const [x, y] of pts) g.lineTo(x, y); g.lineTo(W, H); g.closePath(); g.fillStyle = col; g.fill(); if (under) { g.save(); g.clip(); g.fillStyle = under; g.fillRect(0, 0, W, H); g.restore(); } };

    function paint(S, t) {
      const sky = g.createLinearGradient(0, 0, 0, hz);
      [0, 0.3, 0.52, 0.68, 0.84, 1].forEach((s, i) => sky.addColorStop(s, css(S.sky[i])));
      g.fillStyle = sky; g.fillRect(0, 0, W, hz + 2);
      // stars (twinkle is a function of t)
      if (S.stars > 0.005) for (const s of stars) { g.fillStyle = `rgba(255,250,240,${(S.stars * (0.55 + 0.45 * Math.sin(t * 2.2 + s.ph))).toFixed(3)})`; g.beginPath(); g.arc(s.x, s.y, s.r, 0, 6.283); g.fill(); }
      // sun / moon: azimuth across the sky, elevation up from the horizon, glow by intensity
      const sx = W * (0.18 + 0.64 * ML.clamp((S.sunAz - 0.3) / 0.98)), sy = hz - S.sunEl * hz * 0.82, sr = 46 * u;
      const glow = g.createRadialGradient(sx, sy, sr * 0.6, sx, sy, sr * (3 + S.sunI * 2.2));
      glow.addColorStop(0, css(S.sunC, ML.clamp(0.55 * S.sunI / 2.4 + 0.12))); glow.addColorStop(1, css(S.sunC, 0));
      g.fillStyle = glow; g.fillRect(0, 0, W, hz);
      g.fillStyle = css(c3(S.sunC, [255, 255, 255], 0.35), ML.clamp(0.5 + S.sunI / 2.4)); g.beginPath(); g.arc(sx, sy, sr, 0, 6.283); g.fill();
      // aerial perspective: far ridges lean into the fog, the fog distance (near / far) sets how much
      const haze = ML.clamp(120 / (S.fogF - S.fogN * 0.5)), lit = ML.clamp(0.75 + 0.25 * S.hemiI / 0.62, 0, 1.15);
      const shade = (c, k) => c.map((v) => v * k);
      fill(ridges[0], css(c3(shade(S.ground, lit), S.fog, 0.62 + haze)));
      const band = g.createLinearGradient(0, hz - 0.14 * H, 0, hz + 0.08 * H);
      band.addColorStop(0, css(S.fog, 0)); band.addColorStop(0.62, css(S.fog, 0.55 + haze * 0.5)); band.addColorStop(1, css(S.fog, 0));
      g.fillStyle = band; g.fillRect(0, hz - 0.14 * H, W, 0.22 * H);
      fill(ridges[1], css(c3(shade(S.ground, lit), c3(S.fog, S.hemiG, 0.3), 0.32)));
      // the near ridge: ground lit by the hemisphere's sky colour, a grass sheen along its crest
      const near = g.createLinearGradient(0, hz + 0.05 * H, 0, H);
      near.addColorStop(0, css(c3(shade(S.ground, lit), S.grass, 0.28))); near.addColorStop(0.35, css(c3(shade(S.ground, lit), S.hemiS, 0.08))); near.addColorStop(1, css(c3(S.ground, S.hemiG, 0.45)));
      fill(ridges[2], near);
    }
    const page = p.scope === "scene+page";
    if (page) host.style.color = "var(--x-ink)";
    ctx.sfx(at, "swell", 0.4);
    return {
      draw(t) {
        const x = quad(ML.lin(t, at, at + D));
        const S = {};
        for (const k of Object.keys(A)) S[k] = Array.isArray(A[k]) ? (Array.isArray(A[k][0]) ? A[k].map((c, i) => c3(c, B[k][i], x)) : c3(A[k], B[k], x)) : n(A[k], B[k], x);
        paint(S, t);
        if (page) {
          const y = quad(ML.lin(t, at, at + 0.6)), paper = c3(A.paper, B.paper, y), ink = c3(A.ink, B.ink, y), ink2 = c3(A.ink2, B.ink2, y);
          const dark = lum(paper) < 0.5;
          host.style.setProperty("--x-ground", css(paper));
          host.style.setProperty("--x-ink", css(ink));
          host.style.setProperty("--x-dim", css(c3(ink, ink2, 0.55))); // the source's ink2 was set for its paper; here the sub line sits on the sky
          host.style.setProperty("--x-panel", css(c3(paper, [255, 255, 255], dark ? 0.08 : 0.6), 0.92));
          host.style.setProperty("--x-panel-2", css(c3(paper, [255, 255, 255], dark ? 0.04 : 0.3)));
          host.style.setProperty("--x-line", css(ink, 0.14));
          host.style.setProperty("--x-edge-color", css(ink, 0.14));
        }
      },
    };
  },
});

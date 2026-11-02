// Split-depth drift: one shared, slow drift value s(t) (x, y in −1..1) and every layer shifting or turning by its own,
// opposing amount, so the layout pivots with real depth instead of sliding like a poster. s(t) is authored as a path:
//   settle-to-pose: s = B + (A − B)·(1 − rate)^(60·τ) (rate 0.055 → a ~0.3 s time constant, 95% at ~0.9 s) into the
//     designed three-quarter pose B = (0.28, −0.12);
//   lissajous: (A·sin(2πτ/9), A·sin(2πτ/13 + φ)), A ≤ amplitude;
//   corner-sweep: one corner to the opposite one on sine.inOut.
// 2D (DOM): per-layer coefficients by role — brand pill (−3, −2), headline (+8, +5), lede (+5, +3), photo card
// (−10, −6) px per unit s — so the foreground card moves against the text and the plane pivots; text gets smaller
// coefficients than the hero. Same-sign mode: each layer's x, y = s·depth (0.01–0.08 of the frame), trailing by a lag.
// 3D: stage-pixel units, a camera 1400 px away (fov 2·atan(H/2/1400)): camera.x = −s.x·26, camera.y = +s.y·16, aimed at
// 42% of its own offset (the carry pins the subject); the near group turns rot.y = s.x·0.055, rot.x = s.y·0.026 rad;
// the far group sits at z −180, scale 0.94, rot.y = s.x·0.030. Never everything by the same amount; never aimed at a
// fixed origin while translating. Coefficients scale with the stage (×min(W, H)/360, so they read on a 1080 frame).
// The drift owns `transform`; reveals stay on `translate` / `opacity`. Values rounded to 3 decimals so a settled frame
// is byte-identical. RTL: x mirrors.
// Source: MengTo/Skills web-design/cinematic-gsap-lenis-motion-system + gsap demo + add-mouse-driven-orbit (MIT).
ML.define({
  id: "camera.split-depth-orbit",
  category: "camera",
  name: "Split-depth drift",
  does: "From one shared slow drift, layers shift or turn by different, opposing amounts, so a flat layout or 3D scene pivots with real depth instead of sliding like a poster.",
  says: ["calm", "luxury", "focus", "scale", "ambient"],
  energy: 1,
  targets: ["stage", "scene", "image", "headline", "card", "label"],
  duration: [3, 12],
  params: {
    render: { type: "choice", options: ["2d", "3d"], default: "2d" },
    path: { type: "choice", options: ["settle-to-pose", "lissajous", "corner-sweep"], default: "lissajous" },
    amplitude: { type: "number", range: [0.3, 1], default: 0.6 },
    direction: { type: "choice", options: ["opposing", "same-sign"], default: "opposing" },
    layers: { type: "number", range: [2, 6], default: 4 },
    settle_rate: { type: "number", range: [0.035, 0.08], default: 0.055 },
  },
  pairs: ["camera.slow-push", "camera.layer-parallax", "text-in.soft-rise"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:web-design/cinematic-gsap-lenis-motion-system", license: "MIT", note: "with web-design/gsap/demo/index.html and web-design/add-mouse-driven-orbit: drift paths, opposing per-layer coefficients, 3D camera carry 0.42" },
  setup(ctx) {
    const { el, p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, gain = Math.min(W, H) / 360;
    const A = ML.clamp(p.amplitude, 0.3, 1), N = Math.round(ML.clamp(p.layers, 2, 6));
    const mir = ctx.rtl ? -1 : 1;
    // the layers: inside a single target, its children; on a scene, its blocks by role
    const scope = el && el !== stage && el !== host ? el : host;
    const roleOf = (n) => {
      if (n.matches("img, picture, video, canvas, .ml-panel, [data-slot=image], [data-slot=card], [data-slot=screen]") || n.querySelector("img, canvas, video")) return "card";
      if (n.matches(".ml-title, .ml-hero, h1, h2, [data-slot=headline], [data-slot=line]")) return "headline";
      if (n.matches(".ml-sub, p, [data-slot=word]")) return "lede";
      return "pill";
    };
    let cands = [];
    if (scope === host) {
      for (const sel of [".ml-title, .ml-hero, [data-slot=headline]", ".ml-pic > *, [data-slot=image], [data-slot=card], [data-slot=screen]", ".ml-sub", ".ml-label, [data-slot=label], [data-slot=logo], svg"]) for (const n of scope.querySelectorAll(sel)) if (!cands.includes(n) && !cands.some((c) => c.contains(n) || n.contains(c))) cands.push(n);
    } else cands = [...scope.children];
    // a single picture target: the picture and its frame pivot against each other
    if (!cands.length && scope !== host) cands = [scope];
    cands = cands.filter((n) => n.getClientRects().length).slice(0, N);
    const COEF = { pill: [-3, -2], headline: [8, 5], lede: [5, 3], card: [-10, -6] };
    const layers = cands.map((n, i) => {
      const role = roleOf(n), b = ctx.box(n);
      if (getComputedStyle(n).display === "inline") n.style.display = "inline-block";
      // same-sign depth: spread 0.01–0.08 of the frame, the biggest (hero) deepest
      const depth = 0.01 + (0.07 * (cands.length - 1 - i)) / Math.max(1, cands.length - 1);
      return { n, role, b, c: COEF[role], depth: role === "card" ? Math.max(depth, 0.05) : Math.min(depth, 0.04), lag: 0.12 * i, far: role === "pill" || role === "lede" };
    });
    const B = { x: 0.28 * mir, y: -0.12 }, S0 = { x: -0.5 * A * mir, y: 0.3 * A };
    const rate = ML.clamp(p.settle_rate, 0.035, 0.08);
    const sine = (x) => -(Math.cos(Math.PI * x) - 1) / 2;
    const r3 = (v) => Math.round(v * 1000) / 1000;
    const sAt = (t) => {
      const tau = Math.max(0, t - at);
      if (p.path === "settle-to-pose") { const k = Math.pow(1 - rate, 60 * tau); return { x: r3(B.x + (S0.x - B.x) * k), y: r3(B.y + (S0.y - B.y) * k) }; }
      if (p.path === "corner-sweep") { const e = sine(ML.lin(t, at, end)); return { x: r3(mir * A * (-1 + 2 * e)), y: r3(A * 0.6 * (1 - 2 * e)) }; }
      // lissajous, eased in from rest over the first second so it starts still
      const inK = ML.ease(t, at, at + 1.2);
      return { x: r3(mir * A * Math.sin((2 * Math.PI * tau) / 9) * inK), y: r3(A * Math.sin((2 * Math.PI * tau) / 13 + 0.6) * inK - A * Math.sin(0.6) * (1 - inK)) };
    };
    // 3D: a camera 1400 px off (scaled to the stage), the stage centre as the shared vanishing point
    const P = Math.round(1400 * Math.max(W, H) / 1440);
    return {
      draw(t) {
        if (p.render === "3d") {
          const s = sAt(t);
          const camX = -s.x * 26 * gain, camY = s.y * 16 * gain;
          const shiftX = -camX * 0.58, shiftY = -camY * 0.58; // aimed at 42% of its own offset: the subject is pinned
          for (const L of layers) {
            const ox = W / 2 + camX - L.b.x, oy = H / 2 + camY - L.b.y;
            L.n.style.transformOrigin = `${ox.toFixed(1)}px ${oy.toFixed(1)}px`;
            const ry = L.far ? s.x * 0.03 : s.x * 0.055, rx = L.far ? 0 : s.y * 0.026;
            // pushed back by the turn's forward reach: no point ever nearer than the screen plane (never above 1)
            const reach = Math.max(ox, L.b.w - ox) * Math.abs(Math.sin(ry)) + Math.max(oy, L.b.h - oy) * Math.abs(Math.sin(rx));
            L.n.style.transform = `perspective(${P}px) translate3d(${shiftX.toFixed(3)}px, ${shiftY.toFixed(3)}px, ${((L.far ? -180 : 0) - reach).toFixed(3)}px) rotateY(${ry.toFixed(4)}rad) rotateX(${(-rx).toFixed(4)}rad)${L.far ? " scale(0.94)" : ""}`;
          }
          return;
        }
        for (const L of layers) {
          let x, y;
          if (p.direction === "same-sign") {
            const s = sAt(t - L.lag);
            x = s.x * L.depth * W; y = s.y * L.depth * H;
          } else {
            const s = sAt(t);
            x = s.x * L.c[0] * gain; y = s.y * L.c[1] * gain;
          }
          L.n.style.transform = Math.abs(x) < 0.001 && Math.abs(y) < 0.001 ? "none" : `translate(${r3(x)}px, ${r3(y)}px)`;
        }
      },
    };
  },
});

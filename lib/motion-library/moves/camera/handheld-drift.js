// Handheld parallax drift: the view drifts a few pixels like a hand-held camera, the subject shifting slightly against
// the background. Ported from the scroll-world demo's camera rig: a target (tmx, tmy) is damped at rate 2.6 into
// (mx, my); camera position += (mx·0.62, my·0.34)·par and look target −= (mx·0.20, my·0.12)·par, with
// par = 1 − smoothstep(0, 1.6, progress)·0.55 (the wobble weakens as the shot goes on). Here the target is a seeded slow
// 2-octave gradient noise (gain 2, soft-limited: a mouse sweeps its whole ±1, raw noise only ±0.3 or so) instead of the
// mouse, and the damping is its closed form — the exponential kernel
// λ·e^(−λ(t−s)) integrated over the last 3/λ s on a fixed 1/60 s grid — so the same t always gives the same frame.
// 2D: a layer at depth ratio r (subject 1, background 0.3, foreground 2, nearest 3) shifts by A·((c − l) − c·r): the
// background drifts with the hand, the subject barely, the foreground against it. Layers come from [data-depth]
// (bg | subject | fg | near), else full-bleed children are background, text bands foreground, the rest the subject. A
// layer that bleeds off the frame is overscanned by its own largest shift from the first frame, so it never bares an edge.
// Source: MengTo/Skills web-design/build-threejs-scroll-worlds/demo/index.html applyCamera() + damp() (MIT).
ML.define({
  id: "camera.handheld-drift",
  category: "camera",
  name: "Handheld parallax drift",
  does: "The view drifts a few pixels like a hand-held camera, with the subject shifting slightly against the background.",
  says: ["calm", "story", "ambient"],
  energy: 1,
  targets: ["stage", "scene"],
  duration: [2, 15],
  params: {
    amplitude: { type: "number", range: [2, 16], default: 6, unit: "px" },
    damping: { type: "number", range: [1.5, 4], default: 2.6 },
    layers: { type: "number", range: [1, 4], default: 3 },
    settle: { type: "bool", default: true },
    seed: { type: "number", range: [1, 99], default: 7 },
  },
  pairs: ["camera.slow-push", "camera.layer-parallax", "text-in.punchline"],
  avoid: ["urgency", "precision"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:web-design/build-threejs-scroll-worlds/demo/index.html", license: "MIT", note: "applyCamera() parallax and damp(); the noise target and closed-form damping are our own" },
  setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const cam = document.createElement("div");
    cam.className = "ml-cam";
    cam.style.cssText = "position:absolute;inset:0";
    while (host.firstChild) cam.append(host.firstChild);
    host.append(cam);
    const L = Math.round(ML.clamp(p.layers, 1, 4));
    const R = { bg: 0.3, subject: 1, fg: 2, near: 3 };
    // layers: each child of the scene at a depth ratio
    const kids = [...cam.children].filter((n) => n.nodeType === 1 && n.tagName !== "SCRIPT" && n.tagName !== "STYLE");
    const items = [];
    if (L === 1) items.push({ n: cam, r: 0 }); // one plate: the hand moves the whole frame
    else {
      const area = f.W * f.H;
      for (const n of kids) {
        let d = n.getAttribute("data-depth");
        if (!d) {
          const b = ctx.box(n), text = n.matches(".ml-head, .ml-title, .ml-sub, h1, h2, p") || (!n.querySelector("img, svg, canvas, video, .ml-panel") && (n.textContent || "").trim().length > 0);
          d = b.w * b.h > area * 0.7 ? "bg" : text ? "fg" : "subject";
        }
        if (!R[d]) d = "subject";
        if (L === 2 && d !== "subject") d = "bg"; // two planes: the subject against everything else
        if (L === 3 && d === "near") d = "fg";
        items.push({ n, r: R[d] });
      }
      // small accents marked near ride the nearest plane when there are four
      if (L === 4) for (const n of cam.querySelectorAll('[data-depth="near"]')) if (!kids.includes(n)) items.push({ n, r: R.near, inner: true });
    }
    for (const it of items) it.base = it.n === cam ? "" : it.n.style.transform && it.n.style.transform !== "none" ? it.n.style.transform + " " : "";
    const A = ML.clamp(p.amplitude, 2, 16) * (Math.min(f.W, f.H) / 1080);
    const bleeds = (n) => { const b = ctx.box(n); return b.x <= 2 && b.y <= 2 && b.x + b.w >= f.W - 2 && b.y + b.h >= f.H - 2; };
    for (const it of items) {
      const on = it.n === cam ? kids.some(bleeds) : !it.inner && bleeds(it.n);
      const mxS = A * Math.abs(0.82 - 0.62 * it.r), myS = A * Math.abs(0.46 - 0.34 * it.r);
      it.over = on ? ` scale(${(1 + 2 * Math.max(mxS / f.W, myS / f.H)).toFixed(5)})` : "";
    }
    const lam = ML.clamp(p.damping, 1.5, 4);
    const seed = Math.round(ML.clamp(p.seed, 1, 99));
    // seeded 1D gradient noise, 2 octaves, slow (≈0.35 Hz base): −1…1
    const grad = (i, k) => ML.rnd(i + seed * 101, k) * 2 - 1;
    const noise1 = (x, k) => { const i = Math.floor(x), u = x - i, s = u * u * u * (u * (u * 6 - 15) + 10); const a = grad(i, k) * u, b = grad(i + 1, k) * (u - 1); return (a + (b - a) * s) * 2; };
    const n2 = (x, k) => (noise1(x, k) * 0.67 + noise1(x * 2.03 + 17.3, k + 5) * 0.33) * 1.25;
    // closed-form damping: m(t) = Σ λ·e^(−λ(t − s))·n(s)·Δ over a fixed grid of s (normalised)
    const DT = 1 / 60, WIN = 3 / lam;
    const damped = (t) => {
      let sx = 0, sy = 0, wsum = 0;
      const s1 = Math.floor(t / DT), s0 = Math.floor((t - WIN) / DT);
      for (let i = s0; i <= s1; i++) {
        const s = i * DT, w = Math.exp(-lam * (t - s));
        sx += w * n2(s * 0.35, 1); sy += w * n2(s * 0.35 + 40.7, 2); wsum += w;
      }
      return { mx: Math.tanh((sx / wsum) * 2), my: Math.tanh((sy / wsum) * 2) };
    };
    const smooth = (a, b, x) => { const u = ML.clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
    const dir = ctx.rtl ? -1 : 1;
    const span = Math.max(0.5, end - at);
    return {
      draw(t) {
        // the hand comes up over 0.4 s from `at`, so the first frame of the move is the still frame
        const on = ML.ease(t, at, at + 0.4) * (1 - ML.ease(t, end, end + 0.3));
        if (on <= 1e-4) { for (const it of items) it.n.style.transform = (it.base + it.over).trim() || "none"; return; }
        const { mx, my } = damped(t);
        const par = p.settle ? 1 - smooth(0, 1.6, (ML.clamp((t - at) / span)) * 1.6) * 0.55 : 1;
        const cx = mx * 0.62 * par, cy = my * 0.34 * par, lx = -mx * 0.2 * par, ly = -my * 0.12 * par;
        for (const it of items) {
          const ox = A * on * ((cx - lx) - cx * it.r) * dir, oy = A * on * ((cy - ly) - cy * it.r);
          it.n.style.transform = `${it.base}translate(${ox.toFixed(3)}px, ${oy.toFixed(3)}px)${it.over}`;
        }
      },
    };
  },
});

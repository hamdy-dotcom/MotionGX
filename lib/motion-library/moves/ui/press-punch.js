// Press punch: the tapped element squashes in and springs back (or swells as if touched, then dips on the click).
// dip: scale 1 → depth over 0.08 s and back in 0.08 s (S.screen's tap); with `spring`, K.press: down over 0.1 s power2.in,
// then back over 0.3 s back.out(3). swell: 1 → swell over 150 ms, a hold, back. swell-then-dip: the swell, then a shallow
// dip for 100 ms on the click before release. On a target only the scale changes, at `at` (a spoken word, a click). Alone
// it builds a capsule button (the layered micro-shadow of the source's capsule) with a pointer that arrives and presses.
// Sources: MotionGX lib/studio-engine/assets/scenes.js S.screen + live-engine vendor kit K.press (own); MengTo/Skills
// web-design/light-mode-paper-technical demo (MIT: the capsule).
ML.define({
  id: "ui.press-punch",
  category: "ui",
  name: "Press punch / press scale",
  does: "The tapped element squashes in and springs back (or swells slightly as if touched, then dips on the click).",
  says: ["step", "precision", "arrival"],
  energy: 2,
  targets: ["card", "label", "cursor"],
  duration: [0.15, 0.5],
  params: {
    mode: { type: "choice", options: ["dip", "swell", "swell-then-dip"], default: "dip" },
    depth: { type: "number", range: [0.9, 0.97], default: 0.95 },
    swell: { type: "number", range: [1.02, 1.05], default: 1.03 },
    spring: { type: "bool", default: false },
    text: { type: "text" },
  },
  pairs: ["ui.cursor-glide-click", "ui.focus-ring"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "own:lib/studio-engine/assets/scenes.js", license: "own", note: "S.screen tap and K.press; capsule styling from MengTo/Skills web-design/light-mode-paper-technical (MIT)" },
  setup(ctx) {
    const { el, p, at, end, f, rtl, stage } = ctx;
    const doc = document, k = Math.min(f.W, f.H) / 1080;
    const mk = (css, parent, text) => { const e = doc.createElement("div"); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const target = el && el !== stage ? el : null;
    let btn = target, wrap = null, cur = null, T = at, pa = null, pb = null;
    if (target) {
      if (getComputedStyle(target).display === "inline") target.style.display = "inline-block";
    } else {
      const R = f.pic, fs = 46 * k, u = fs / 14; // the capsule's shadow, in its own web px
      wrap = mk(`position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;display:flex;align-items:center;justify-content:center;z-index:6;pointer-events:none;`, ctx.scene || stage);
      btn = mk(`padding:${(fs * 0.62).toFixed(1)}px ${(fs * 1.25).toFixed(1)}px;border-radius:var(--x-radius-s);background:var(--x-panel);color:var(--x-ink);font:600 ${fs.toFixed(1)}px/1.1 var(--x-body-font);white-space:nowrap;box-shadow:0 ${(2 * u).toFixed(1)}px ${(3 * u).toFixed(1)}px ${(-1 * u).toFixed(1)}px color-mix(in srgb, var(--x-ink) 10%, transparent), 0 ${u.toFixed(1)}px 0 color-mix(in srgb, var(--x-ink) 2%, transparent), 0 0 0 ${u.toFixed(1)}px color-mix(in srgb, var(--x-ink) 8%, transparent), var(--x-shadow);`, wrap, p.text || (rtl ? "ابدأ دلوقتي" : "Get started"));
      T = at + 0.6;
      const b = ctx.box(btn), cs = 64 * k;
      pb = { x: b.x + b.w * (rtl ? 0.36 : 0.64), y: b.y + b.h * 0.6 };
      pa = { x: pb.x + (rtl ? -1 : 1) * 240 * k, y: pb.y + 280 * k };
      cur = mk(`position:absolute;left:0;top:0;z-index:12;pointer-events:none;width:${cs}px;height:${cs}px;margin:${(-cs * 2 / 24).toFixed(1)}px 0 0 ${(-cs * 5 / 24).toFixed(1)}px;transform-origin:21% 8%;filter:drop-shadow(0 ${(3 * k).toFixed(1)}px ${(6 * k).toFixed(1)}px color-mix(in srgb, var(--x-device) 35%, transparent));`, ctx.scene || stage);
      cur.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" style="display:block;overflow:visible"><path d="M5 2 L5 19 L9.5 15.5 L12.5 22 L15.5 20.5 L12.5 14 L18.5 14 Z" fill="var(--x-pointer)" stroke="var(--x-pointer-edge)" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
    }
    const in2 = (x) => x * x * x; // power2.in
    const scaleAt = (t) => {
      const d = t - T;
      if (d <= 0) return 1;
      if (p.mode === "dip") {
        if (p.spring) return d < 0.1 ? 1 + (p.depth - 1) * in2(d / 0.1) : p.depth + (1 - p.depth) * ML.back(t, T + 0.1, T + 0.4, 3);
        return d < 0.08 ? 1 + (p.depth - 1) * ML.ease(t, T, T + 0.08) : p.depth + (1 - p.depth) * ML.ease(t, T + 0.08, T + 0.16);
      }
      const up = 1 + (p.swell - 1) * ML.ease(t, T, T + 0.15);
      if (p.mode === "swell") return d < 0.3 ? up : p.swell + (1 - p.swell) * ML.ease(t, T + 0.3, T + 0.45);
      // swell-then-dip: at the default depth the click dips to 0.97 for 100 ms
      const dipTo = 1 - (1 - p.depth) * 0.6;
      if (d < 0.25) return up;
      if (d < 0.35) return p.swell + (dipTo - p.swell) * ML.ease(t, T + 0.25, T + 0.31);
      return dipTo + (1 - dipTo) * ML.back(t, T + 0.35, T + 0.6, 1.7);
    };
    const hit = p.mode === "swell-then-dip" ? T + 0.25 : T;
    ctx.sfx(hit, p.mode === "swell" ? "tap" : wrap ? "click" : "tap", 0.3);
    return {
      draw(t) {
        const s = scaleAt(t);
        btn.style.scale = Math.abs(s - 1) < 0.0002 ? "none" : s.toFixed(4);
        if (wrap) {
          const leave = ML.clamp((t - (end - 0.25)) / 0.22), e = ML.out(t, at, at + 0.2);
          wrap.style.visibility = cur.style.visibility = t < at ? "hidden" : "visible";
          wrap.style.opacity = (e * (1 - leave)).toFixed(4);
          const u = ML.ease(t, at + 0.1, T), arc = Math.sin(Math.PI * u) * -30 * k;
          cur.style.translate = `${(pa.x + (pb.x - pa.x) * u).toFixed(2)}px ${(pa.y + (pb.y - pa.y) * u + arc).toFixed(2)}px`;
          cur.style.opacity = (ML.lin(t, at + 0.1, at + 0.2) * (1 - leave)).toFixed(4);
          const q = Math.sin(Math.PI * ML.lin(t, hit, hit + 0.2));
          cur.style.scale = q > 0.001 ? (1 - 0.14 * q).toFixed(4) : "none";
        }
      },
    };
  },
});

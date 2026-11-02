// Dot emits rings and a horizon line: an 8 px dot (at 720p, scaled to the stage) at the centre sends out thin
// concentric rings (1 px at 40 %): each grows 0 → its radius (60, 100, 140, 180 px) in 0.6 s expo.out, 0.15 s
// apart, then keeps growing slowly and fades. A 1 px accent line extends left and right through the dot from its
// centre (scaleX 0 → 1, 0.5 s power3.out). Before the cut everything shrinks back into the dot.
// Source: prompt-motion "itsuki-dev-opus-5-5-cooked-this" (reference only — rebuilt as our own code).
ML.define({
  id: "element.dot-ripple-rings",
  category: "element",
  name: "Dot emits rings and a horizon line",
  does: "A dot at centre sends out concentric thin rings while a line extends left and right through it.",
  says: ["arrival", "tech", "calm"],
  energy: 2,
  targets: ["shape"],
  duration: [1, 2.5],
  params: {
    rings: { type: "number", range: [1, 4], default: 2 },
    line: { type: "bool", default: true },
    collapse: { type: "bool", default: true },
  },
  pairs: ["element.dot-to-line", "text-in.punchline"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:itsuki-dev-opus-5-5-cooked-this", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, f, el } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const own = el && el !== ctx.stage ? el : null;
    const B = own ? ctx.box(own) : f.pic;
    const k = Math.min(f.W, f.H) / 720;
    const cx = B.x + B.w / 2, cy = B.y + B.h / 2;
    const n = Math.round(ML.clamp(p.rings, 1, 4));

    // painted on a canvas every frame (an SVG re-rastered in parts antialiases differently frame to frame)
    const cv = doc.createElement("canvas");
    cv.width = f.W; cv.height = f.H;
    cv.style.cssText = `position:absolute;left:0;top:0;width:${f.W}px;height:${f.H}px;pointer-events:none;z-index:6;`;
    host.append(cv);
    const g = cv.getContext("2d");
    const probe = doc.createElement("div"); host.append(probe);
    const col = (v) => { probe.style.color = `var(${v})`; return getComputedStyle(probe).color; };
    const INK = col("--x-ink"), ACC = col("--x-accent"); probe.remove();
    const sw = Math.max(1, 1 * k);
    const R = [60, 100, 140, 180].map((x) => x * k);
    const dotR = 4 * k;
    const c0 = Math.max(at + 0.6 + n * 0.15, end - 0.45), c1 = c0 + 0.3; // collapse into the dot
    const go = p.collapse ? c1 : end - 0.25;
    ctx.sfx(at, "blip", 0.3);
    if (n > 2) ctx.sfx(at + 0.3, "blip", 0.18);
    if (p.collapse) ctx.sfx(c0 + 0.1, "whoosh.soft", 0.2);

    return {
      draw(t) {
        if (own) own.style.opacity = t >= at ? "0" : "";
        g.clearRect(0, 0, f.W, f.H);
        const on = t >= at - 0.05 && t < go + 0.25;
        cv.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        const shrink = p.collapse ? 1 - ML.bezier(0.55, 0, 1, 0.45)(ML.lin(t, c0, c1)) : 1; // power2.in
        const fade = 1 - ML.clamp((t - go) / 0.22);
        g.lineWidth = sw;
        if (p.line) {
          const sx = ML.bezier(0.215, 0.61, 0.355, 1)(ML.lin(t, at + 0.05, at + 0.55)) * shrink; // power3.out
          const half = (f.W / 2) * sx;
          if (sx > 0.001) { g.globalAlpha = fade; g.fillStyle = ACC; g.fillRect(cx - half, cy - sw / 2, half * 2, sw); }
        }
        g.strokeStyle = INK;
        for (let i = 0; i < n; i++) {
          const a = at + 0.1 + i * 0.15;
          if (t < a) continue;
          const grow = ML.expo(t, a, a + 0.6), slow = Math.max(0, t - a - 0.6) * 0.12;
          const rad = R[i] * (grow + slow) * shrink;
          const o = (1 - ML.lin(t, a + 0.6, a + 2.4) * 0.7) * (p.collapse ? Math.max(0, shrink) : 1);
          if (rad <= 0.2 || o <= 0) continue;
          g.globalAlpha = 0.4 * o * fade;
          g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.stroke();
        }
        const dr = dotR * ML.back(t, at - 0.05, at + 0.2, 2) * (p.collapse ? Math.max(0.6, shrink) : 1);
        if (dr > 0) { g.globalAlpha = fade; g.fillStyle = INK; g.beginPath(); g.arc(cx, cy, dr, 0, Math.PI * 2); g.fill(); }
        g.globalAlpha = 1;
      },
    };
  },
});

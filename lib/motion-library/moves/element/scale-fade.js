// Scale-fade settle — the rule for real product UI: it appears in place, never slides, tilts, wobbles or drifts.
// In: opacity 0 → 1 and scale from_scale (0.98 micro emphasis, 0.96 cinematic / device, down to 0.94) → 1. The curve
// follows the length, as the sources set it: up to ~0.32 s an ease-out for popovers and toasts, ~0.5 s power2.out
// for devices, ~0.9 s power4.out for section reveals ("delay" adds the device's +0.1 s). Out (exit): opacity 0,
// scale 0.98, 0.3 s power2.in finishing at the end (a run too short for both shares itself out, so it still arrives
// fully). Only the camera moves inside it — this move never does.
// Sources: MengTo/Skills web-design animation-systems + cinematic-gsap-lenis-motion-system SKILL.md (MIT, the
// numbers), MotionGX's own live-engine/worker/vendor/recipes.js#R.device (fromTo opacity 0 / scale 0.96 → 1 0.5 s
// power2.out, to opacity 0 / scale 0.98 power2.in).
ML.define({
  id: "element.scale-fade",
  category: "element",
  name: "Scale-fade settle",
  does: "An element fades in in place while growing from just under full size - no sliding; the rule for real product UI.",
  says: ["arrival", "simplicity", "focus", "trust", "calm", "proof"],
  energy: 1,
  targets: ["card", "label", "image", "screen"],
  duration: [0.3, 1.2],
  params: {
    from_scale: { type: "number", range: [0.94, 0.99], default: 0.96 },
    duration: { type: "number", range: [0.2, 0.9], default: 0.5, unit: "s" },
    delay: { type: "number", range: [0, 0.3], default: 0, unit: "s" },
    exit: { type: "bool", default: true },
  },
  pairs: ["camera.push-in", "ui.cursor-click", "element.pop-in"],
  avoid: ["energy", "urgency", "playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "own:lib/live-engine/worker/vendor/recipes.js#R.device", license: "own", note: "timings from MengTo/Skills animation-systems and cinematic-gsap-lenis-motion-system SKILL.md (MIT)" },
  setup(ctx) {
    const { p, at, end, f } = ctx;
    const doc = document;
    const mk = (tag, css, parent) => { const e = doc.createElement(tag); e.style.cssText = css; parent.append(e); return e; };
    let el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    if (!el) {
      // nothing to show: a plain UI card stand-in (a header bar and rows, no copy) in the picture region
      const host = ctx.scene || ctx.stage, k = Math.min(f.W, f.H) / 1080;
      const holder = mk("div", `position:absolute;left:${f.pic.x}px;top:${f.pic.y}px;width:${f.pic.w}px;height:${f.pic.h}px;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:6;`, host);
      el = mk("div", `width:${Math.min(f.pic.w * 0.82, 720 * k)}px;box-sizing:border-box;padding:${34 * k}px;display:grid;gap:${22 * k}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:var(--x-radius);box-shadow:var(--x-shadow);`, holder);
      const bar = mk("div", `display:flex;gap:${12 * k}px;align-items:center;`, el);
      for (let i = 0; i < 3; i++) mk("div", `width:${16 * k}px;height:${16 * k}px;border-radius:50%;background:var(--x-line);`, bar);
      for (let i = 0; i < 3; i++) {
        const row = mk("div", `display:flex;gap:${20 * k}px;align-items:center;padding:${18 * k}px;border-radius:calc(var(--x-radius) * .6);background:var(--x-panel-2);`, el);
        mk("div", `flex:none;width:${56 * k}px;height:${56 * k}px;border-radius:50%;background:${i === 0 ? "var(--x-accent)" : "var(--x-line)"};`, row);
        mk("div", `height:${18 * k}px;width:${60 - i * 12}%;border-radius:999px;background:var(--x-ink);opacity:.7;`, row);
      }
    }
    const a0 = at + ML.clamp(p.delay, 0, 0.3);
    const room = Math.max(0.1, end - a0), outD = p.exit ? Math.min(0.3, room * 0.4) : 0;
    const dur = Math.min(ML.clamp(p.duration, 0.2, 0.9), room - outD), s0 = ML.clamp(p.from_scale, 0.94, 0.99);
    // ease-out (CSS ease-out ≈ cubic-bezier(0, 0, .58, 1)) for short popovers; power2.out (cubic) for devices;
    // power4.out (quintic) for long section reveals
    const cssOut = ML.bezier(0, 0, 0.58, 1);
    const curve = dur <= 0.32 ? (x) => cssOut(x) : dur < 0.7 ? (x) => 1 - Math.pow(1 - x, 3) : (x) => 1 - Math.pow(1 - x, 5);
    const o0 = end - outD; // out: 0.3 s power2.in, done by the end
    ctx.sfx(a0, "pop.soft", 0.15);
    return {
      draw(t) {
        const u = curve(ML.lin(t, a0, a0 + dur));
        const q = p.exit ? Math.pow(ML.lin(t, o0, end), 3) : 0;
        const sc = (s0 + (1 - s0) * u) * (1 - 0.02 * q);
        el.style.opacity = t < a0 ? "0" : (u * (1 - q)).toFixed(4);
        el.style.scale = Math.abs(sc - 1) < 1e-4 ? "none" : sc.toFixed(4);
      },
    };
  },
});

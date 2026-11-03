// Pop in with overshoot — the ads' workhorse. Pop: opacity 0, scale from_scale (0.2 badge, 0.5 chips / thumbs, 0.82
// default, 0.86 cards, 0.9 devices), y 0–80 px below, rotation ±0–15° → opacity 1, scale 1, y 0 and a resting
// rotation (0, or a tilt such as 8° → 4°) over 0.55 s on back.out(1.4–2.5) (GSAP's back: 1 + (c+1)(x−1)³ + c(x−1)²).
// Snap (opacity "snap", the look "snap"): opacity jumps to 1 at `at`; unless asked otherwise, scale 0.94 → 1 on
// back-out c = 2 over the look's 0.1–0.3 s and a rise of 0.6 of the look's distance (explainer's show).
// Leave: a hard cut on the frame t ≥ end, a 0.25 s fade, or none. A pop / click / drop lands at the same instant.
// The rotation leans with the reading direction (mirrored in Arabic). Pictures never overshoot past 100 % (sharp).
// Sources: MengTo/Skills html-explainer-video explainer.js#show (MIT, the snap curve), MotionGX's own
// studio-engine/assets/scenes.js#pop and live-engine/worker/vendor/recipes.js#R.layout (the card pop).
ML.define({
  id: "element.pop-in",
  category: "element",
  name: "Pop in with overshoot",
  does: "An element springs in from slightly small and lands with an overshoot - from a hard 0.1s snap to a bouncy 0.55s pop.",
  says: ["arrival", "playful", "energy", "speed", "urgency"],
  energy: 3,
  targets: ["card", "label", "shape", "image", "logo", "screen", "headline", "list", "number"],
  duration: [0.3, 1],
  params: {
    from_scale: { type: "number", range: [0.2, 0.96], default: 0.82 },
    duration: { type: "number", range: [0.1, 0.7], default: 0.55, unit: "s" },
    overshoot: { type: "number", range: [1.4, 2.5], default: 1.6 },
    y: { type: "number", range: [0, 80], default: 0, unit: "px" },
    rotation: { type: "number", range: [0, 15], default: 0, unit: "deg" },
    rest_rotation: { type: "number", range: [0, 8], default: 0, unit: "deg" },
    opacity: { type: "choice", options: ["fade", "snap"], default: "fade" },
    leave: { type: "choice", options: ["cut", "fade", "none"], default: "none" },
  },
  pairs: ["text-in.punchline", "element.recoil-knockback", "element.scale-fade"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "own:lib/studio-engine/assets/scenes.js#pop", license: "own", note: "with MengTo/Skills html-explainer-video explainer.js#show (MIT) and live-engine recipes.js#R.layout" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    let el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    if (!el) {
      // nothing to pop: a plain card stand-in in the picture region (abstract: a mark and two lines, no copy)
      const host = ctx.scene || ctx.stage, k = Math.min(f.W, f.H) / 1080;
      const holder = mk("div", `position:absolute;left:${f.pic.x}px;top:${f.pic.y}px;width:${f.pic.w}px;height:${f.pic.h}px;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:6;`, host);
      el = mk("div", `display:flex;align-items:center;gap:${28 * k}px;padding:${36 * k}px ${44 * k}px;width:${Math.min(f.pic.w * 0.8, 640 * k)}px;box-sizing:border-box;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:var(--x-radius);box-shadow:var(--x-shadow);`, holder);
      mk("div", `flex:none;width:${96 * k}px;height:${96 * k}px;border-radius:var(--x-radius);background:linear-gradient(140deg, var(--x-accent), var(--x-accent-2));`, el);
      const lines = mk("div", `flex:1;display:grid;gap:${16 * k}px;`, el);
      mk("div", `height:${22 * k}px;width:80%;border-radius:999px;background:var(--x-ink);opacity:.85;`, lines);
      mk("div", `height:${16 * k}px;width:55%;border-radius:999px;background:var(--x-dim);opacity:.6;`, lines);
    }
    const snap = p.opacity === "snap" || ctx.look.kind === "snap";
    // snap has its own numbers while the params sit on their defaults
    const dur = snap && p.duration === 0.55 ? ML.clamp(ctx.look.dur, 0.1, 0.3) : ML.clamp(p.duration, 0.1, 0.7);
    const c = snap && p.overshoot === 1.6 ? 2 : ML.clamp(p.overshoot, 1.4, 2.5);
    const s0 = snap && p.from_scale === 0.82 ? 0.94 : ML.clamp(p.from_scale, 0.2, 0.96);
    const lean = rtl ? -1 : 1; // tilts lean with the reading direction
    const r0 = lean * p.rotation, r1 = lean * p.rest_rotation;
    // a picture never goes past its own size
    const pic = el.tagName === "IMG" || !!el.querySelector?.("img");
    ctx.sfx(at, "pop", 0.45);
    return {
      draw(t) {
        if (t < at) { el.style.opacity = "0"; return; }
        if (p.leave === "cut" && t >= end) { el.style.opacity = "0"; return; }
        const u = ML.back(t, at, at + dur, c);
        let sc = s0 + (1 - s0) * u;
        if (pic) sc = Math.min(sc, 1);
        const o = snap ? 1 : ML.out(t, at, at + Math.max(0.08, dur * 0.4));
        const lv = p.leave === "fade" ? ML.ease(t, end - 0.25, end) : 0;
        el.style.opacity = (o * (1 - lv)).toFixed(4);
        el.style.scale = Math.abs(sc - 1) < 1e-4 ? "none" : sc.toFixed(4);
        const ty = (1 - u) * (snap && !p.y ? ctx.look.dist * 0.6 : p.y);
        el.style.translate = Math.abs(ty) < 0.01 ? "none" : `0 ${ty.toFixed(2)}px`;
        const rot = r0 + (r1 - r0) * u;
        el.style.rotate = Math.abs(rot) < 1e-3 ? "none" : `${rot.toFixed(3)}deg`;
      },
    };
  },
});

// Recoil on impact — "reaction is half the read". On the hit the target is displaced away from the incoming blow by
// 4–12 % of its size on an expo-out in 0.08–0.12 s, squashed 6–10 % along the hit axis (a little wider across it),
// holds 0.05 s, then springs back to rest on a damped sine (ω 18–24 rad/s, damping ratio ~0.25) over 0.4–0.6 s.
// A small hot flash blooms at the contact point. An optional impactor (a small accent disc) flies in over the 0.22 s
// before the hit, strikes the contact point and rebounds, so the cause reads too. The hit lands on `at` (put it on a
// spoken word); a short run settles to rest by `end`. direction = where the target is knocked; left / right mirror in
// Arabic. Pictures are never squashed wider than their own size.
// Source: MengTo/Skills game-combat game-dev-combat-skill-polish (MIT, the numbers) — rebuilt for a seekable frame.
ML.define({
  id: "element.recoil-knockback",
  category: "element",
  name: "Recoil on impact",
  does: "Hit by something, the target jolts back, compresses and springs back to rest.",
  says: ["arrival", "energy", "problem", "result"],
  energy: 4,
  targets: ["card", "logo", "number", "shape", "image"],
  duration: [0.4, 0.8],
  params: {
    strength: { type: "choice", options: ["light", "heavy"], default: "light" },
    direction: { type: "choice", options: ["left", "right", "up", "down"], default: "right" },
    impactor: { type: "bool", default: true },
    flash: { type: "bool", default: true },
  },
  pairs: ["element.pop-in", "camera.impact-shake"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "MengTo/Skills:game-combat/game-dev-combat-skill-polish", license: "MIT", note: "hit reaction numbers; the code is our own seekable rebuild" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent) => { const e = doc.createElement(tag); e.style.cssText = css; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage, k = Math.min(f.W, f.H) / 1080;
    let el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    if (!el) {
      // nothing to hit: a plain card stand-in (a mark and two lines, no copy) in the picture region
      const holder = mk("div", `position:absolute;left:${f.pic.x}px;top:${f.pic.y}px;width:${f.pic.w}px;height:${f.pic.h}px;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:6;`, host);
      el = mk("div", `display:flex;align-items:center;gap:${28 * k}px;padding:${36 * k}px ${44 * k}px;width:${Math.min(f.pic.w * 0.62, 560 * k)}px;box-sizing:border-box;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:var(--x-radius);box-shadow:var(--x-shadow);`, holder);
      mk("div", `flex:none;width:${96 * k}px;height:${96 * k}px;border-radius:var(--x-radius);background:linear-gradient(140deg, var(--x-accent), var(--x-accent-2));`, el);
      const lines = mk("div", `flex:1;display:grid;gap:${16 * k}px;`, el);
      mk("div", `height:${22 * k}px;width:80%;border-radius:999px;background:var(--x-ink);opacity:.85;`, lines);
      mk("div", `height:${16 * k}px;width:55%;border-radius:999px;background:var(--x-dim);opacity:.6;`, lines);
    }
    const heavy = p.strength === "heavy";
    const disp = heavy ? 0.11 : 0.05, squash = heavy ? 0.1 : 0.06, omega = heavy ? 18 : 24, zeta = 0.25;
    const kick = heavy ? 0.12 : 0.08, hold = 0.05;
    // knock direction (mirrored left / right in Arabic); the blow comes from the opposite side
    let dir = p.direction;
    if (rtl && (dir === "left" || dir === "right")) dir = dir === "left" ? "right" : "left";
    const V = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir] || [1, 0];
    const horiz = V[0] !== 0;
    const B = ctx.box(el);
    const D = (horiz ? B.w : B.h) * disp;
    // contact point: the middle of the side facing the blow
    const cx = B.x + B.w / 2 - V[0] * B.w / 2, cy = B.y + B.h / 2 - V[1] * B.h / 2;
    const S = Math.max(40 * k, Math.min(B.w, B.h) * 0.5);
    const fl = p.flash ? mk("div", `position:absolute;left:${cx - S}px;top:${cy - S}px;width:${S * 2}px;height:${S * 2}px;border-radius:50%;pointer-events:none;z-index:7;background:radial-gradient(closest-side, color-mix(in srgb, var(--x-panel) 95%, transparent), color-mix(in srgb, var(--x-accent-2) 70%, transparent) 35%, color-mix(in srgb, var(--x-accent) 30%, transparent) 60%, transparent);mix-blend-mode:normal;`, host) : null;
    const R = Math.max(18 * k, Math.min(B.w, B.h) * 0.16);
    const ball = p.impactor ? mk("div", `position:absolute;left:${cx - R}px;top:${cy - R}px;width:${R * 2}px;height:${R * 2}px;border-radius:50%;pointer-events:none;z-index:7;background:radial-gradient(circle at 35% 30%, var(--x-accent-2), var(--x-accent));box-shadow:var(--x-shadow);`, host) : null;
    // the impactor's run-up: from up to 0.6 of the stage away (kept on the stage), 0.22 s before the hit
    const run = Math.max(0, Math.min(horiz ? f.W * 0.35 : f.H * 0.25, (horiz ? (V[0] > 0 ? cx : f.W - cx) : V[1] > 0 ? cy : f.H - cy) - R * 1.2));
    const lead = 0.22;
    const pic = el.tagName === "IMG" || !!el.querySelector?.("img");
    const hit = at;
    ctx.sfx(hit, "hit", heavy ? 0.6 : 0.45);
    if (heavy) ctx.sfx(hit, "sub", 0.3);
    const wd = omega * Math.sqrt(1 - zeta * zeta);
    return {
      draw(t) {
        const tau = t - hit;
        let x = 0, env = 0;
        if (tau >= 0) {
          if (tau < kick) { x = 1 - Math.pow(2, -10 * (tau / kick)); env = x; }
          else if (tau < kick + hold) { x = 1; env = 1; }
          else { const s = tau - kick - hold; x = Math.exp(-zeta * omega * s) * Math.cos(wd * s); env = Math.exp(-zeta * omega * s * 1.6) * Math.max(0, Math.cos(wd * s)); }
        }
        const rest = 1 - ML.ease(t, end - 0.08, end); // whatever the spring has left is gone by the end
        x *= rest; env *= rest;
        const dx = V[0] * D * x, dy = V[1] * D * x;
        el.style.translate = Math.abs(dx) + Math.abs(dy) < 0.01 ? "none" : `${dx.toFixed(2)}px ${dy.toFixed(2)}px`;
        // squash along the axis, a little wider across it (never past 100 % on a picture)
        const along = 1 - squash * env, across = pic ? 1 : 1 + squash * 0.45 * env;
        const sx = horiz ? along : across, sy = horiz ? across : along;
        el.style.scale = env < 1e-4 ? "none" : `${sx.toFixed(4)} ${sy.toFixed(4)}`;
        el.style.transformOrigin = `${50 + V[0] * 50}% ${50 + V[1] * 50}%`; // squashes against the far side
        if (fl) {
          const a = tau < 0 ? 0 : ML.out(t, hit, hit + 0.05) * (1 - ML.lin(t, hit + 0.06, hit + 0.22));
          fl.style.opacity = a.toFixed(4);
          // it rides the contact edge, which travels with the knock and retreats as the target squashes
          const ex = dx + V[0] * B.w * (1 - (horiz ? along : 1)), ey = dy + V[1] * B.h * (1 - (horiz ? 1 : along));
          fl.style.transform = `translate(${ex.toFixed(2)}px, ${ey.toFixed(2)}px) scale(${(0.4 + 0.6 * ML.out(t, hit, hit + 0.12)).toFixed(4)})`;
        }
        if (ball) {
          let bx, by, o = 1;
          if (tau < 0) { const a0 = hit - lead, u = ML.lin(t, a0, hit), d = run * (1 - u * u); bx = -V[0] * d; by = -V[1] * d; o = ML.lin(t, a0, a0 + 0.06); }
          else { const u = ML.out(t, hit, hit + 0.35), d = run * 0.45 * u; bx = -V[0] * d; by = -V[1] * d + (horiz ? -R * 1.5 * Math.sin(u * Math.PI) : 0); o = 1 - ML.lin(t, hit + 0.15, hit + 0.35); }
          ball.style.opacity = o.toFixed(4);
          ball.style.transform = `translate(${bx.toFixed(2)}px, ${by.toFixed(2)}px)`;
        }
      },
    };
  },
});

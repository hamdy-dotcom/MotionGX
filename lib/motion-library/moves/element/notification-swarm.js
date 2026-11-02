// Notification count bubbles swarm: alert-coloured speech-bubble badges (50 × 24 at the web size, a white icon + a bold
// count) pop up around the subject one after another — a new one every 0.2–0.6 s, coming a little faster as it goes —
// at seeded spots in the left and right thirds, each scale 0 → 1 on back.out(2) in 0.2 s, drifting up 20 over 1.5 s,
// then fading, its count rolling up fast to a seeded 200–3000. Late in the run, simple drawn faces (shocked, sad,
// annoyed) can pop around the subject's head with a small turn. Badges: likes (heart), comments (bubble), alerts (bell).
// Nothing is random: every spot, count and face comes from ML.rnd. RTL: the first badge appears on the right.
// Source: prompt-motion "davidshulmanfl-opus-5-5-prompt-create" (reference only — rebuilt as our own code).
ML.define({
  id: "element.notification-swarm",
  category: "element",
  name: "Notification count bubbles swarm",
  does: "Notification badges with climbing counts pop up around the subject and drift, growing in number.",
  says: ["urgency", "growth", "playful", "problem"],
  energy: 4,
  targets: ["label", "number"],
  duration: [1.5, 5],
  params: {
    badge: { type: "choice", options: ["likes", "comments", "alerts"], default: "alerts" },
    rate: { type: "number", range: [0.2, 0.6], default: 0.4, unit: "s" },
    emoji: { type: "bool", default: false },
    max: { type: "number", range: [200, 3000], default: 3000 },
  },
  pairs: ["element.nervous-wobble", "data.counter-roll"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:davidshulmanfl-opus-5-5-prompt-create", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const k = (Math.min(f.W, f.H) / 1080) * 2.6; // the web badge, at video size
    const ICON = {
      likes: '<path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.6 4.5c2.1 0 3.5 1.2 4.4 2.6.9-1.4 2.3-2.6 4.4-2.6 3.6 0 5.7 3.9 4.2 7.3C19.5 16.4 12 21 12 21z" fill="currentColor"/>',
      comments: '<path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="currentColor"/>',
      alerts: '<path d="M12 2a6 6 0 0 0-6 6v4.5L4 16v1h16v-1l-2-3.5V8a6 6 0 0 0-6-6zm0 21a2.6 2.6 0 0 0 2.6-2.4H9.4A2.6 2.6 0 0 0 12 23z" fill="currentColor"/>',
    };
    const icon = ICON[p.badge] || ICON.alerts;

    // the schedule: a badge every `rate`, a little faster as the swarm grows
    const rate = ML.clamp(p.rate, 0.2, 0.6), stopAt = Math.max(at + 0.6, end - 0.9);
    const spawns = [];
    for (let t = at, i = 0; t < stopAt && i < 40; i++) { spawns.push(t); t += rate * (1 - 0.35 * ML.clamp((t - at) / Math.max(0.5, stopAt - at))); }
    const S = own ? ctx.box(own) : { x: f.W / 2, y: f.H / 2, w: 0, h: 0 };
    const R = f.safe, bw = 50 * k, bh = 24 * k;
    const maxN = Math.round(ML.clamp(p.max, 200, 3000));
    const fmt = (v) => (v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k" : String(v));
    const badges = spawns.map((t0, i) => {
      // left / right thirds, alternating (the reading-start side first), seeded spot inside the safe area
      const side = (i % 2 === 0) !== rtl ? 0 : 1;
      const x = R.x + (side === 0 ? 0 : R.w * 2 / 3) + ML.rnd(i, 1) * (R.w / 3 - bw * 1.3);
      const y = R.y + bh + ML.rnd(i, 2) * (R.h - bh * 4);
      const n = Math.round(200 + ML.rnd(i, 3) * (maxN - 200));
      const e = doc.createElement("div");
      e.style.cssText = `position:absolute;left:${Math.round(x)}px;top:${Math.round(y)}px;height:${bh.toFixed(1)}px;min-width:${bw.toFixed(1)}px;box-sizing:border-box;padding:0 ${(7 * k).toFixed(1)}px;display:flex;align-items:center;gap:${(4 * k).toFixed(1)}px;direction:ltr;background:var(--x-bad);color:var(--x-accent-ink);border-radius:${(8 * k).toFixed(1)}px;box-shadow:0 ${(3 * k).toFixed(1)}px ${(10 * k).toFixed(1)}px -${(2 * k).toFixed(1)}px color-mix(in srgb, var(--x-bad) 55%, transparent);font:700 ${(11 * k).toFixed(1)}px var(--x-body-font);z-index:7;pointer-events:none;visibility:hidden;will-change:transform;transform-origin:${side === 0 ? "10%" : "90%"} 120%;`;
      e.innerHTML = `<svg viewBox="0 0 24 24" width="${(12 * k).toFixed(1)}" height="${(12 * k).toFixed(1)}" style="display:block;flex:0 0 auto">${icon}</svg><span></span>` +
        // the speech-bubble tail, under the side nearest the subject
        `<i style="position:absolute;bottom:-${(5 * k).toFixed(1)}px;${side === 0 ? "right" : "left"}:${(9 * k).toFixed(1)}px;width:${(10 * k).toFixed(1)}px;height:${(10 * k).toFixed(1)}px;background:var(--x-bad);transform:rotate(45deg);border-radius:${(2 * k).toFixed(1)}px;z-index:-1"></i>`;
      host.append(e);
      return { e, num: e.querySelector("span"), t0, n };
    });
    badges.forEach((b, i) => (i % 2 === 0) && ctx.sfx(b.t0, "blip", 0.2));

    // late faces around the subject's head
    const faces = [];
    if (p.emoji) {
      const FACE = [
        '<circle cx="9" cy="10" r="1.6"/><circle cx="15" cy="10" r="1.6"/><ellipse cx="12" cy="16.2" rx="2.2" ry="2.8"/>', // shocked
        '<circle cx="9" cy="10" r="1.4"/><circle cx="15" cy="10" r="1.4"/><path d="M8 17.5c2.2-2.4 5.8-2.4 8 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>', // sad
        '<path d="M7 8.5l4 1.6M17 8.5l-4 1.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="9" cy="11.5" r="1.3"/><circle cx="15" cy="11.5" r="1.3"/><path d="M8.5 17h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>', // annoyed
      ];
      const fs = 44 * (Math.min(f.W, f.H) / 1080) * 1.6, late = at + (stopAt - at) * 0.55;
      const hx = S.x + S.w / 2, hy = S.y;
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI / 2 + (i - 1.5) * 0.75 + (ML.rnd(i, 21) - 0.5) * 0.3, r = Math.max(S.w, S.h) * 0.55 + fs;
        const x = ML.clamp(hx + Math.cos(a) * r - fs / 2, R.x, R.x + R.w - fs), y = ML.clamp(hy + Math.sin(a) * r * 0.6 - fs / 2, R.y, R.y + R.h - fs);
        const e = doc.createElement("div");
        e.style.cssText = `position:absolute;left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${fs.toFixed(1)}px;height:${fs.toFixed(1)}px;z-index:7;pointer-events:none;visibility:hidden;will-change:transform;color:var(--x-ink);`;
        e.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" style="display:block"><circle cx="12" cy="12" r="11" fill="color-mix(in srgb, var(--x-accent-2) 55%, var(--x-panel))"/><g fill="currentColor">${FACE[i % FACE.length]}</g></svg>`;
        host.append(e);
        const t0 = late + i * Math.max(0.15, rate * 0.8);
        faces.push({ e, t0, rot: (ML.rnd(i, 23) - 0.5) * 30 });
        if (i === 0) ctx.sfx(t0, "pop.soft", 0.22);
      }
    }
    const leave = end - 0.3;

    return {
      draw(t) {
        const q = ML.ease(t, leave, leave + 0.3);
        badges.forEach((b) => {
          const on = t >= b.t0 - 1e-6;
          b.e.style.visibility = on && q < 1 ? "visible" : "hidden";
          if (!on) return;
          const s = Math.max(0, ML.back(t, b.t0, b.t0 + 0.2, 2));
          const fade = 1 - ML.ease(t, b.t0 + 1.5, b.t0 + 1.8);
          b.e.style.scale = Math.max(0.001, s).toFixed(4);
          b.e.style.translate = `0 ${(-20 * (k / 2.6) * 1.6 * ML.out(t, b.t0, b.t0 + 1.5)).toFixed(2)}px`;
          b.e.style.opacity = (Math.min(1, ML.lin(t, b.t0, b.t0 + 0.08)) * fade * (1 - q)).toFixed(4);
          b.num.textContent = fmt(Math.round(b.n * ML.out(t, b.t0, b.t0 + 0.5)));
        });
        faces.forEach((x) => {
          const on = t >= x.t0 - 1e-6;
          x.e.style.visibility = on && q < 1 ? "visible" : "hidden";
          if (!on) return;
          const s = Math.max(0, ML.back(t, x.t0, x.t0 + 0.25, 2));
          x.e.style.scale = Math.max(0.001, s).toFixed(4);
          x.e.style.rotate = `${(x.rot * Math.min(1, s)).toFixed(2)}deg`;
          x.e.style.opacity = (1 - q).toFixed(4);
        });
      },
    };
  },
});

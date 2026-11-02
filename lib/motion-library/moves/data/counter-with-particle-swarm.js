// Counter with a particle swarm: a dot pulses at the centre with a ripple ring, then on "go" a big tabular counter
// races from 1 to millions on an accelerating (expo-in) curve while short line particles shoot out of the dot, swirl
// and drag to a stop in a dense ring-cloud around the figure. Particles are born as the count climbs, so the spawn
// density follows the count rate. Every particle's position is closed form in its age (velocity × drag 0.96 per
// 1/60 s → v0/λ·(1 − e^(−λτ)), λ = −60·ln 0.96), its heading aligned to its velocity, all seeded (ML.rnd): the
// frame at t is always the same. On a number slot the slot itself counts (to its own figure, unless `target` was set)
// and the cloud rings it; with no target a counter + mono label is built on the stage above the cloud.
// Source: prompt-motion:sudeepsd-opus-5-5-is-goated (reference only — rebuilt as our own code).
ML.define({
  id: "data.counter-with-particle-swarm",
  category: "data",
  name: "Counter races with a particle swarm",
  does: "A big counter shoots from 1 to millions while short line particles explode outward from a point and swirl into a cloud.",
  says: ["scale", "growth", "tech", "speed"],
  energy: 4,
  targets: ["number", "shape"],
  duration: [1.5, 3.5],
  params: {
    target: { type: "number", range: [1000, 10000000], default: 1284302 },
    particles: { type: "number", range: [60, 300], default: 150 },
    duration: { type: "number", range: [1.5, 3], default: 2, unit: "s" },
    colours: { type: "choice", options: ["white-yellow-red", "accent", "mono"], default: "white-yellow-red" },
    label: { type: "text", default: "" },
  },
  pairs: ["data.digit-write", "data.dot-globe"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "riser",
  source: { from: "prompt-motion:sudeepsd-opus-5-5-is-goated", license: "reference", note: "technique rebuilt as our own seeded canvas code" },
  setup(ctx) {
    const { el, p, at, end, rtl, stage, f } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const colourOf = (v) => { const s = mk("span", `color:${v}`, stage); const c = getComputedStyle(s).color; s.remove(); return c; };
    const u = Math.min(f.W, f.H) / 1080, k = 2.1 * u;
    const fmt = (n) => Math.round(n).toLocaleString("en-US");

    // the figure to reach: the slot's own number when it has one and `target` was left at its default
    const own = el ? parseFloat(String(el.textContent || "").replace(/[^\d.]/g, "")) : NaN;
    const goal = Math.max(2, el && Number.isFinite(own) && own > 1 && +p.target === 1284302 ? own : +p.target || 1284302);

    // the counter: the slot itself, or a counter + label built over the picture region
    let num = null, wrap = null, O, R0x, R0y;
    if (el && el.childElementCount === 0 && (el.textContent || "").trim()) {
      num = el;
      num.style.fontVariantNumeric = "tabular-nums";
      num.textContent = fmt(goal);
      const r = doc.createRange(); r.selectNodeContents(num);
      const s = stage.getBoundingClientRect(), sc = s.width / (stage.offsetWidth || 1) || 1, b = r.getBoundingClientRect();
      O = { x: (b.left - s.left + b.width / 2) / sc, y: (b.top - s.top + b.height / 2) / sc };
      R0x = (b.width / sc) * 0.5 + 24 * u; R0y = (b.height / sc) * 0.42 + 18 * u;
      num.textContent = "1";
      if (p.label) { // an optional label under the slot's figure
        wrap = mk("div", `position:absolute;left:${O.x}px;top:${O.y + (b.height / sc) / 2 + 10 * u}px;translate:-50% 0;font-size:${Math.round(22 * u)}px;z-index:31;white-space:nowrap;visibility:hidden`, stage, p.label);
        wrap.className = "ml-label";
      }
    } else {
      const box = el ? ctx.box(el) : f.pic;
      O = { x: box.x + box.w / 2, y: box.y + box.h * 0.6 };
      R0x = R0y = 26 * u;
      const reach = R0x + (250 * k) / 2.449;
      wrap = mk("div", `position:absolute;left:${O.x}px;bottom:${f.H - (O.y - reach - 30 * u)}px;translate:-50% 0;display:flex;flex-direction:column;align-items:center;gap:${14 * u}px;z-index:31;white-space:nowrap;visibility:hidden`, stage);
      num = mk("div", `font:var(--x-head-weight) ${Math.round(150 * u)}px/1 var(--x-head-font);letter-spacing:var(--x-hero-track);color:var(--x-ink);font-variant-numeric:tabular-nums;direction:ltr`, wrap, fmt(goal));
      mk("div", `font-size:${Math.round(24 * u)}px`, wrap, p.label || (rtl ? "حدث تمّت معالجته" : "EVENTS INGESTED")).className = "ml-label";
      ML.fit(num, f.W - f.m * 2);
      num.textContent = "1";
    }

    // the canvas the dot, ripple and swarm are painted on
    const cv = mk("canvas", `position:absolute;left:0;top:0;width:${f.W}px;height:${f.H}px;pointer-events:none;z-index:30`, stage);
    cv.width = f.W; cv.height = f.H;
    const g = cv.getContext("2d", { willReadFrequently: true }); // software canvas: no GPU promotion between frames
    const C = {
      ink: colourOf("var(--x-ink)"), accent: colourOf("var(--x-accent)"), accent2: colourOf("var(--x-accent-2)"), bad: colourOf("var(--x-bad)"),
    };
    const palette = (i) => {
      const r = ML.rnd(i, 7);
      if (p.colours === "mono") return C.ink;
      if (p.colours === "accent") return r < 0.35 ? C.accent2 : C.accent;
      return r < 0.1 ? C.accent : r < 0.15 ? C.bad : C.ink;
    };

    // timing: the ripple, then the count; it fits inside the move's span
    const go = at + 0.6;
    const D = Math.max(0.6, Math.min(+p.duration || 2, end - go - 0.7));
    const EXP = 8, curve = (x) => (Math.pow(2, EXP * ML.clamp(x)) - 1) / (Math.pow(2, EXP) - 1);
    const N = Math.round(ML.clamp(+p.particles || 150, 20, 400));
    const LAMBDA = -60 * Math.log(0.96);
    const parts = Array.from({ length: N }, (_, i) => {
      const q = (i + 0.5) / N, x = Math.log2(q * (Math.pow(2, EXP) - 1) + 1) / EXP;
      return {
        born: go + D * x,
        a0: ML.rnd(i, 1) * Math.PI * 2,
        v0: (100 + 150 * ML.rnd(i, 2)) * k,
        w: (ML.rnd(i, 3) < 0.5 ? -1 : 1) * (0.7 + 0.8 * ML.rnd(i, 4)),
        len: (8 + 6 * ML.rnd(i, 5)) * k,
        jit: 0.75 + 0.5 * ML.rnd(i, 6),
        col: palette(i),
      };
    });
    const posOf = (P, tau) => {
      const e = 1 - Math.exp(-LAMBDA * tau), d = (P.v0 / LAMBDA) * e * P.jit;
      const a = P.a0 + P.w * 1.1 * e + P.w * 0.12 * tau; // swirl while fast, a slow drift once settled
      return { x: O.x + Math.cos(a) * (R0x * e + d), y: O.y + Math.sin(a) * (R0y * e + d * 0.82) };
    };
    ctx.sfx(at, "pop.soft", 0.25);
    ctx.sfx(go, "riser", 0.45);
    ctx.sfx(go + D, "hit", 0.45);

    return {
      draw(t) {
        const leave = ML.ease(t, end - 0.35, end - 0.05);
        const on = t >= at - 1e-6 && leave < 1;
        if (wrap) { wrap.style.visibility = on ? "visible" : "hidden"; wrap.style.opacity = (ML.ease(t, at, at + 0.3) * (1 - leave)).toFixed(4); }
        // the count: 1 → goal on an accelerating curve, a small punch as it lands
        const x = ML.lin(t, go, go + D), val = t < go ? 1 : Math.max(1, goal * curve(x));
        num.textContent = fmt(x >= 1 ? goal : val);
        const punch = ML.pulse(t, go + D, 0.04, 0.25);
        num.style.scale = punch > 0.01 ? (1 + 0.05 * punch).toFixed(4) : "none";

        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, f.W, f.H);
        g.lineCap = "round"; g.globalAlpha = 1; // every bit of canvas state set each frame: nothing carried over
        if (!on) return;
        const fade = 1 - leave;
        // the dot and its ripple, before and as the count starts
        const dotA = ML.ease(t, at, at + 0.15) * (1 - ML.ease(t, go + 0.1, go + 0.4)) * fade;
        if (dotA > 0.002) {
          g.fillStyle = C.accent; g.globalAlpha = dotA;
          const beat = 1 + 0.25 * Math.sin(Math.max(0, t - at) * Math.PI * 2 / 0.6);
          g.beginPath(); g.arc(O.x, O.y, 8 * k * 0.5 * beat, 0, Math.PI * 2); g.fill();
          const rp = ((Math.max(0, t - at)) % 0.6) / 0.6;
          g.strokeStyle = C.accent; g.lineWidth = 1.5 * k * 0.5; g.globalAlpha = dotA * (1 - rp) * 0.8;
          g.beginPath(); g.arc(O.x, O.y, 4 * k + rp * 26 * k, 0, Math.PI * 2); g.stroke();
        }
        // the swarm
        g.lineCap = "round"; g.lineWidth = 2 * k * 0.6;
        for (const P of parts) {
          const tau = t - P.born;
          if (tau <= 0) continue;
          const a = ML.clamp(tau / 0.06) * fade * (0.55 + 0.45 * Math.exp(-tau * 0.8));
          if (a < 0.003) continue;
          const now = posOf(P, tau), was = posOf(P, Math.max(0, tau - 0.03));
          let dx = now.x - was.x, dy = now.y - was.y, m = Math.hypot(dx, dy);
          if (m < 1e-4) { dx = now.x - O.x; dy = now.y - O.y; m = Math.hypot(dx, dy) || 1; }
          const L = P.len * (0.55 + 0.45 * ML.clamp(m / (6 * k))); // lines shorten a little as they slow
          dx /= m; dy /= m;
          g.strokeStyle = P.col; g.globalAlpha = a;
          g.beginPath(); g.moveTo(now.x - dx * L / 2, now.y - dy * L / 2); g.lineTo(now.x + dx * L / 2, now.y + dy * L / 2); g.stroke();
        }
        g.globalAlpha = 1;
      },
    };
  },
});

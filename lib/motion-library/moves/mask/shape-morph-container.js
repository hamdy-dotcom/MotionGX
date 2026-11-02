// Photo container shape morph: the picture's frame pops in as a small circle, then morphs on springs — circle →
// rounded square → large sharp-cornered card (or another path) — while the picture itself never moves or zooms: the
// frame is a clip window centred on the picture, so each step only shows more of it (the source's counter-scale,
// done exactly). Sizes follow the source's 128 → 220 → 280 px ratios (0.46 → 0.79 → 1 of the end size, the end
// size scaled to the frame and kept inside the picture's own box, never enlarged); radii 50 % → 28 % → 3 % of the
// short side; each step is a ~0.4 s spring. Our change from the source: no edge blur during the fast growth (the
// library never blurs a picture).
// Source: prompt-motion "twoclipping — opus 5.5 is the…" (reference only; rebuilt as our own code).
ML.define({
  id: "mask.shape-morph-container",
  category: "mask",
  name: "Photo container shape morph",
  does: "The photo's frame morphs from a circle to a rounded square and then grows into a large sharp-cornered card, the picture staying centred inside.",
  says: ["change", "reveal"],
  energy: 3,
  targets: ["image", "card"],
  duration: [0.6, 1.6],
  params: {
    path: { type: "choice", options: ["circle-rounded-square", "circle-square", "square-circle", "pill-card"], default: "circle-rounded-square" },
    steps: { type: "number", range: [1, 3], default: 2 },
    end_size: { type: "number", range: [200, 600], default: 280, unit: "px" },
    step_duration: { type: "number", range: [0.3, 0.6], default: 0.4, unit: "s" },
  },
  pairs: ["photo.ken-burns", "text-in.punchline"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "prompt-motion:twoclipping-opus-5-5-is-the", license: "reference", note: "our own rebuild; the frame is a centred clip window (exact counter-scale); no edge blur (library rule)" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const b = ctx.box(el), w0 = b.w, h0 = b.h;
    // the end card: the source's px on its ~400 px frame → a share of ours, the picture's aspect, never past its own box
    const E = (ML.clamp(+p.end_size, 200, 600) / 400) * Math.min(ctx.f.W, ctx.f.H);
    const ar = w0 / h0;
    let Ew = Math.min(w0, E * Math.max(1, ar)), Eh = Math.min(h0, E * Math.max(1, 1 / ar));
    if (Ew / Eh > ar) Ew = Eh * ar; else Eh = Ew / ar;
    const m = Math.min(Ew, Eh);
    const sq = (s, r) => ({ w: s * m, h: s * m, r });
    const lerp = (a, c, u) => ({ w: a.w + (c.w - a.w) * u, h: a.h + (c.h - a.h) * u, r: a.r + (c.r - a.r) * u });
    const card = { w: Ew, h: Eh, r: 0.03 };
    const PATHS = {
      "circle-rounded-square": [sq(0.46, 0.5), sq(0.79, 0.28), null, card],
      "circle-square": [sq(0.46, 0.5), sq(0.79, 0.12), null, card],
      "square-circle": [sq(0.46, 0.03), sq(0.79, 0.28), null, { w: m, h: m, r: 0.5 }],
      "pill-card": [{ w: Math.min(Ew, m * 1.25), h: m * 0.42, r: 0.5 }, { w: Ew * 0.86, h: Eh * 0.66, r: 0.28 }, null, card],
    };
    const path = PATHS[p.path] || PATHS["circle-rounded-square"];
    path[2] = lerp(path[1], path[3], 0.55);
    const steps = Math.round(ML.clamp(+p.steps, 1, 3));
    const keys = steps === 1 ? [path[0], path[3]] : steps === 2 ? [path[0], path[1], path[3]] : path;
    const sd = ML.clamp(+p.step_duration, 0.3, 0.6);
    // the pop-in, then one spring per step; the steps squeeze to fit the time the move has
    const room = Math.max(0.3, end - at - 0.1), gapT = Math.min(sd, (room - 0.2) / Math.max(1, keys.length - 1));
    const times = keys.map((_, i) => at + 0.18 + i * gapT);
    const response = (2 * Math.PI) / (sd * 1.6); // settles in about one step
    const cfg = { stiffness: response * response, damping: 1.5 * response };
    const pop = { stiffness: 380, damping: 26 };
    times.forEach((tt, i) => ctx.sfx(i === 0 ? at : tt, "pop.soft", i === 0 ? 0.3 : 0.22));
    const at0 = { w: 0, h: 0, r: 0.5 };
    // each property: popped in from nothing at `at`, then retargeted by one spring per step at times[i]
    const prop = (key) => (t) => {
      let v = at0[key] + (keys[0][key] - at0[key]) * ML.step(t - at, pop);
      for (let i = 1; i < keys.length; i++) v += (keys[i][key] - keys[i - 1][key]) * ML.step(t - times[i], cfg);
      return v;
    };
    const Wf = prop("w"), Hf = prop("h"), Rf = prop("r");
    const keepRadius = el.style.borderRadius;
    return {
      draw(t) {
        if (t < at - 1e-6) { el.style.clipPath = "inset(50% 50% 50% 50%)"; return; }
        const w = ML.clamp(Wf(t), 0, w0), h = ML.clamp(Hf(t), 0, h0), r = ML.clamp(Rf(t), 0, 0.5) * Math.min(w, h);
        const x = (w0 - w) / 2, y = (h0 - h) / 2;
        el.style.borderRadius = keepRadius;
        el.style.clipPath = `inset(${y.toFixed(2)}px ${x.toFixed(2)}px ${y.toFixed(2)}px ${x.toFixed(2)}px round ${r.toFixed(2)}px)`;
      },
    };
  },
});

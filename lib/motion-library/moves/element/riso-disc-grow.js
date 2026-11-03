// Grainy ink disc grows — a risograph spot. A disc of fluorescent ink (the look's accent) appears small and soft and
// grows into a big solid spot behind the text: radius 30 % → 100 % of its size over 0.5 s on back.out(1.3); ink "auto"
// takes whichever of the look's accents stands further from its text colour, so the words stay readable on it; in the
// first 0.2 s opacity 0.4 → 1 and blur 4 → 0. The ink carries print grain (a fine speckle mask punching 10–30 % of it
// out, reseeded every 2 frames from a seeded sequence, so the texture "boils" like a print) and a rough edge
// (1–2 px displacement, also reseeded). Shapes: circle, square (soft corners) or blob. Painted on a canvas per frame
// from t only (ML.rnd), behind the scene's copy. It sits behind the headline unless given a shape to sit on.
// Source: prompt-motion "rneayan-opus-5-5-risograph-style" (reference only — rebuilt as our own code).
ML.define({
  id: "element.riso-disc-grow",
  category: "element",
  name: "Grainy ink disc grows",
  does: "A disc with risograph grain appears small and soft, then grows into a big solid spot behind the text.",
  says: ["playful", "arrival", "brand"],
  energy: 2,
  targets: ["shape"],
  duration: [0.5, 1],
  params: {
    shape: { type: "choice", options: ["circle", "square", "blob"], default: "circle" },
    grain: { type: "number", range: [0.1, 0.3], default: 0.2 },
    size: { type: "number", range: [0.08, 0.4], default: 0.24 },
    grow: { type: "number", range: [0.3, 0.9], default: 0.5, unit: "s" },
    ink: { type: "choice", options: ["auto", "accent", "accent-2"], default: "auto" },
    seed: { type: "number", range: [1, 99], default: 7 },
  },
  pairs: ["text-in.punchline", "background.paper-grain"],
  avoid: ["luxury", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "prompt-motion:rneayan-opus-5-5-risograph-style", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, f } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage, k = Math.min(f.W, f.H) / 1080;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    // where: on the shape it was given, else behind the scene's headline, else the headline band
    const anchor = own || host.querySelector('[data-slot="headline"], [data-slot-sample="headline"], [data-slot="line"], .ml-title');
    const A = anchor ? ctx.box(anchor) : f.head;
    let cx = A.x + A.w / 2, cy = A.y + A.h / 2;
    const Rmax = own ? Math.max(A.w, A.h) / 2 : Math.min(f.W, f.H) * ML.clamp(p.size, 0.08, 0.4);
    const pad = 12 * k + Rmax * 0.12, side = Math.ceil((Rmax * 1.08 + pad) * 2);
    // keep the canvas on the stage
    cx = ML.clamp(cx, side / 2, f.W - side / 2); cy = ML.clamp(cy, side / 2, f.H - side / 2);
    const cv = doc.createElement("canvas");
    cv.width = side; cv.height = side;
    cv.style.cssText = `position:absolute;left:${cx - side / 2}px;top:${cy - side / 2}px;width:${side}px;height:${side}px;pointer-events:none;z-index:0;`;
    if (own) own.style.visibility = "hidden";
    host.prepend(cv); // behind the copy
    const g = cv.getContext("2d");
    // the look's ink, resolved to a colour the canvas understands
    const probe = doc.createElement("span");
    host.append(probe);
    const colourOf = (name) => { probe.style.color = `var(--x-${name})`; return getComputedStyle(probe).color; };
    const px = doc.createElement("canvas").getContext("2d", { willReadFrequently: true });
    const lum = (c) => { px.clearRect(0, 0, 1, 1); px.fillStyle = c; px.fillRect(0, 0, 1, 1); const d = px.getImageData(0, 0, 1, 1).data, ch = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * ch(d[0]) + 0.7152 * ch(d[1]) + 0.0722 * ch(d[2]); };
    const contrast = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
    const text = colourOf("ink"), a1 = colourOf("accent"), a2 = colourOf("accent-2");
    const ink = p.ink === "accent" ? a1 : p.ink === "accent-2" ? a2 : contrast(a2, text) > contrast(a1, text) ? a2 : a1;
    probe.remove();

    const grow = ML.clamp(p.grow, 0.3, 0.9), grain = ML.clamp(p.grain, 0.1, 0.3), seed = Math.round(p.seed);
    const N = 160, rough = (1 + 0.6) * k;
    const blob = Array.from({ length: 4 }, (_, i) => ({ a: 0.05 + ML.rnd(seed, i + 11) * 0.07, ph: ML.rnd(seed, i + 21) * Math.PI * 2, n: i + 2 }));
    // whatever the seed, a blob's widest reach stays on the canvas
    let reach = 1;
    for (let i = 0; i < 90; i++) { let r = 1; const th = (i / 90) * Math.PI * 2; for (const b of blob) r += b.a * Math.sin(b.n * th + b.ph); reach = Math.max(reach, r); }
    const blobK = Math.min(1, 1.1 / reach);
    /** outline radius at angle th for the frame's seed: base shape + rough print edge */
    function radius(th, R, fs) {
      let r;
      if (p.shape === "square") { const c = Math.cos(th), s = Math.sin(th), q = 6; r = R * 0.9 / Math.pow(Math.pow(Math.abs(c), q) + Math.pow(Math.abs(s), q), 1 / q); }
      else if (p.shape === "blob") { r = R; for (const b of blob) r += R * b.a * Math.sin(b.n * th + b.ph); r *= blobK; }
      else r = R;
      return r;
    }
    ctx.sfx(at, "pop.soft", 0.3);
    return {
      draw(t) {
        g.clearRect(0, 0, side, side);
        if (t < at) return;
        const u = ML.back(t, at, at + grow, 1.3);
        const R = Rmax * (0.3 + 0.7 * u);
        const o = 0.4 + 0.6 * ML.lin(t, at, at + 0.2);
        const bl = 4 * k * (1 - ML.lin(t, at, at + 0.2));
        const lv = end < ctx.to - 0.05 ? 1 - ML.ease(t, end - 0.25, end) : 1;
        const fs = seed * 1000 + Math.floor(Math.max(0, t) * 15); // reseeded every 2 frames at 30 fps
        g.save();
        g.globalAlpha = o * lv;
        g.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : "none";
        g.fillStyle = ink;
        g.beginPath();
        for (let i = 0; i <= N; i++) {
          const th = (i / N) * Math.PI * 2;
          // rough edge: two octaves of seeded jitter, smoothed between neighbours
          const j = (ML.rnd(i % N, fs) + ML.rnd((i + 1) % N, fs) - 1) * rough + (ML.rnd(Math.floor(i / 8), fs + 3) - 0.5) * rough;
          const r = radius(th, R, fs) + j;
          const x = side / 2 + Math.cos(th) * r, y = side / 2 + Math.sin(th) * r;
          i ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.closePath(); g.fill();
        g.filter = "none";
        // print grain: punch speckles out of the ink (a share `grain` of the area), reseeded every 2 frames
        g.globalCompositeOperation = "destination-out";
        g.globalAlpha = 1;
        // (an average speck covers ~1.15 dot², half see-through like ink thinning on paper; coarser on a huge spot so
        // the count stays bounded)
        const dot = Math.max(1.2, 1.6 * k, R / 130), reachR = R * 1.15, area = Math.PI * reachR * reachR;
        const n = Math.min(20000, Math.round((area * grain) / (dot * dot * 0.84)));
        g.fillStyle = ink; // a mask: only its alpha counts
        for (let i = 0; i < n; i++) {
          const a = ML.rnd(i, fs + 0.37) * Math.PI * 2, d = Math.sqrt(ML.rnd(i + 0.5, fs + 1.91)) * reachR;
          const s = dot * (0.5 + ML.rnd(i, fs + 7.13) * 1.1);
          g.globalAlpha = 0.3 + ML.rnd(i, fs + 9.7) * 0.5;
          g.fillRect(side / 2 + Math.cos(a) * d, side / 2 + Math.sin(a) * d, s, s);
        }
        g.restore();
      },
    };
  },
});

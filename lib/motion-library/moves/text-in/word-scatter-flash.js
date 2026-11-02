// Word scatter flash: the target's words (category words) flash up one per beat at seeded spots across the frame,
// then multiply until the frame is crowded with them. The first ones are big and near the middle, read one at a time;
// as the beat tightens they shrink and spread to the edges. Each flash: opacity 0 → 1 with blur 8 → 0 in 0.12 s, a hold
// (0.2–0.8 s), then out with blur. Later on 10–15 words stand at once; with depth the far ones are small, dim and soft
// behind the near ones. Styles alternate a serif (italic in Latin) with the heavy headline sans (or one face). Whole
// words only — any script. At the end the crowd clears and the target itself settles in its own slot, held long enough
// to read. The layer lives in the scene, so it can never stay on screen after the scene.
// Source: our own rebuild of prompt-motion sudo-kiran-videos-created-using-the — reference only.
ML.define({
  id: "text-in.word-scatter-flash",
  category: "text-in",
  name: "Word scatter flash",
  does: "Category words flash up one per beat at scattered spots, then multiply until the frame is crowded with them; the crowd clears and the target settles (resolve).",
  says: ["list", "scale", "problem", "energy"],
  energy: 4,
  targets: ["word", "label"],
  duration: [1.5, 4],
  params: {
    cadence: { type: "number", range: [0.2, 0.6], default: 0.4, unit: "s" },
    hold: { type: "number", range: [0.2, 0.8], default: 0.4, unit: "s" },
    density_max: { type: "number", range: [1, 20], default: 12 },
    styles: { type: "choice", options: ["serif-sans-mix", "single"], default: "serif-sans-mix" },
    depth: { type: "bool", default: true },
    words: { type: "text", default: "" },
    resolve: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "camera.push-in"],
  avoid: ["calm", "luxury", "simplicity"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:sudo-kiran-videos-created-using-the", license: "reference", note: "our own code" },
  setup(ctx) {
    const { el, p, at, end, stage, scene, rtl } = ctx;
    if (!el) return null;
    const doc = el.ownerDocument;
    // the words: a comma list from the param, else the target's own words (whole words — Arabic stays joined)
    const raw = (p.words || "").trim();
    const list = (raw ? raw.split(/\s*[,،]\s*/) : (el.textContent || "").trim().split(/\s+/)).map((w) => w.replace(/[.,،؛!?؟]+$/, "")).filter(Boolean);
    if (!list.length) return null;

    const W = stage.offsetWidth || 1080, H = stage.offsetHeight || 1920;
    const unit = Math.min(W, H);
    const layer = doc.createElement("div");
    Object.assign(layer.style, { position: "absolute", inset: "0", overflow: "hidden", pointerEvents: "none", zIndex: "5" });
    (scene || stage).append(layer); // in the scene: hidden with it, whatever frame is asked for next

    // the timeline of flashes: the gap shrinks from the cadence to what keeps `density_max` words up at once
    const inT = 0.12, outT = 0.16;
    const clear = p.resolve ? Math.max(at + (end - at) * 0.55, end - 1.1) : end - 0.25;
    const span = Math.max(0.4, clear - at);
    const life = (late) => inT + p.hold * (late ? 1.6 : 1) + outT;
    const dense = Math.max(1, Math.round(p.density_max));
    const minGap = Math.max(0.035, life(true) / dense);
    const flashes = [];
    for (let t = at, i = 0; t < clear - inT && i < 120; i++) {
      const k = ML.clamp((t - at) / (span * 0.7));
      const late = k > 0.5;
      flashes.push({ i, t0: t, life: life(late), late, k });
      t += p.cadence * Math.pow(minGap / p.cadence, Math.min(1, k * 1.15));
    }

    // build and place each flash: seeded candidates, keep the one farthest from what is up at the same time
    const placed = [];
    const items = flashes.map((f, j) => {
      const word = list[j % list.length];
      const serif = p.styles === "serif-sans-mix" && j % 2 === 1;
      const ar = rtl || ML.ARABIC.test(word);
      // depth: a seeded share of the late words sit far back (small, dim, soft)
      const z = p.depth && f.k > 0.3 ? ML.rnd(j, 7) : 1;
      const far = z < 0.45;
      // the sparse opening words are big and read alone; the crowd is smaller
      const grow = 1 + 0.7 * (1 - ML.clamp(f.k * 2));
      const spread = 0.4 + 0.6 * ML.clamp(f.k * 2);
      const size = unit * (0.06 + 0.014 * ML.rnd(j, 3)) * (far ? 0.5 + z * 0.5 : 1) * grow;
      const node = doc.createElement("span");
      node.textContent = word;
      Object.assign(node.style, { position: "absolute", left: "0", top: "0", whiteSpace: "nowrap", lineHeight: "1", font: serif ? `${ar ? "normal" : "italic"} 400 ${size.toFixed(1)}px var(--x-serif-font)` : `var(--x-head-weight) ${size.toFixed(1)}px ${ar ? "var(--x-arabic)" : "var(--x-head-font)"}`, letterSpacing: serif || ar ? "0" : "var(--x-head-track)", color: serif ? "var(--x-accent)" : "var(--x-ink)", opacity: "0", zIndex: far ? "1" : "2" });
      layer.append(node);
      const w = Math.min(node.offsetWidth, W * 0.9), h = node.offsetHeight;
      if (node.offsetWidth > W * 0.9) node.style.fontSize = `${(size * (W * 0.9) / node.offsetWidth).toFixed(1)}px`;
      const m = unit * 0.05;
      const live = placed.filter((q) => q.t1 > f.t0 && q.t0 < f.t0 + f.life);
      let best = null, bestD = -1;
      for (let c = 0; c < 10; c++) {
        const x = (W - w) / 2 + (ML.rnd(j * 13 + c, 1) - 0.5) * spread * Math.max(1, W - 2 * m - w);
        const y = (H - h) / 2 + (ML.rnd(j * 13 + c, 2) - 0.5) * spread * Math.max(1, H - 2 * m - h);
        const cx = x + w / 2, cy = y + h / 2;
        const d = live.length ? Math.min(...live.map((q) => Math.hypot((q.cx - cx) / W, (q.cy - cy) / H))) : 1;
        if (d > bestD) { bestD = d; best = { x, y, cx, cy }; }
      }
      // the first word lands near the middle, so the opening beat reads
      if (j === 0) best = { x: (W - w) / 2, y: H * 0.42 - h / 2, cx: W / 2, cy: H * 0.42 };
      placed.push({ t0: f.t0, t1: f.t0 + f.life, cx: best.cx, cy: best.cy });
      node.style.translate = `${best.x.toFixed(1)}px ${best.y.toFixed(1)}px`;
      return { node, ...f, far, z };
    });

    // sound: a tap per flash while sparse, then about one per beat once it crowds
    let lastSfx = -Infinity;
    items.forEach((it) => { if (it.t0 - lastSfx >= Math.min(0.35, p.cadence * 0.9)) { ctx.sfx(it.t0, "tap", it.late ? 0.18 : 0.24); lastSfx = it.t0; } });
    if (p.resolve) ctx.sfx(clear + 0.1, "pop.soft", 0.3);

    return {
      draw(t) {
        // the crowd clears before the end; with resolve the target then settles in its own slot
        const clr = ML.ease(t, clear - 0.05, clear + 0.2);
        items.forEach((it) => {
          const a = ML.out(t, it.t0, it.t0 + inT);
          const b = ML.lin(t, it.t0 + it.life - outT, it.t0 + it.life);
          const v = a * (1 - b) * (1 - clr);
          if (v <= 0.001) { it.node.style.opacity = "0"; it.node.style.filter = "none"; return; }
          const farO = it.far ? 0.35 + it.z * 0.6 : 1;
          const farBlur = it.far ? (1 - it.z) * 4 : 0;
          it.node.style.opacity = (v * farO).toFixed(4);
          const bl = (1 - a) * 8 + b * 8 + clr * 8 + farBlur;
          it.node.style.filter = bl > 0.01 ? `blur(${bl.toFixed(2)}px)` : "none";
        });
        if (p.resolve) {
          const u = ML.land(t, clear + 0.05, clear + 0.4);
          const leave = ML.clamp((t - (end - 0.2)) / 0.18);
          el.style.opacity = (u * (1 - leave)).toFixed(4);
          el.style.filter = u < 1 ? `blur(${((1 - u) * 8).toFixed(2)}px)` : "none";
        } else {
          el.style.opacity = "0";
        }
        layer.style.opacity = t < at ? "0" : "1";
      },
    };
  },
});

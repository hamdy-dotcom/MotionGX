// Bauhaus shape grid that keeps morphing: a cols × rows grid of flat tiles (square cells, gap ≈ 1/8 of a cell) on the
// ground colour, each tile a box with its own four corner radii (0 | 50 | 100 %), so one box is a square, a circle, a
// quarter-circle, an arch or a leaf. Build-in: tiles pop scale 0 → 1 on a seeded random stagger of 0.02 s. Then every
// `morph_rate` seconds seeded tiles tween their corner radii (0.4 s power2.inOut) and colour (ink, accent, secondary),
// some turning 90°; every third beat the edge column (the right one; the left in Arabic) swaps by squashing
// scaleX 1 → 0.1 → 1 and changing at the pinch. A serif section label (italic in Latin; Arabic has no true italic, so upright) sits top-left and a mono
// "SYSTEM — 18 MODULES" bottom-left (mirrored in Arabic). Every tile's state at every beat is computed once in setup
// from seeded numbers, so a frame is a pure function of t.
// Source: prompt-motion "samuel-spitz-i-asked-opus-5-5" (reference only — rebuilt as our own code).
ML.define({
  id: "element.bauhaus-shape-grid",
  category: "element",
  name: "Bauhaus shape grid that keeps morphing",
  does: "A grid of flat tiles (circles, quarter-circles, half-rounds, squares) keeps morphing each tile's shape and colour.",
  says: ["playful", "brand", "choice"],
  energy: 3,
  targets: ["shape", "scene"],
  duration: [2, 6],
  params: {
    cols: { type: "number", range: [3, 8], default: 6 },
    rows: { type: "number", range: [2, 5], default: 3 },
    morph_rate: { type: "number", range: [0.25, 0.8], default: 0.4, unit: "s" },
    palette: { type: "choice", options: ["look", "mono", "three-colour"], default: "three-colour" },
    share: { type: "number", range: [0.15, 0.5], default: 0.3 },
    labels: { type: "bool", default: true },
    label: { type: "text", default: "" },
    backdrop: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "background.noise-gradient-flow"],
  avoid: ["problem", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:samuel-spitz-i-asked-opus-5-5", license: "reference", note: "technique rebuilt as our own code: per-corner radius tiles, seeded morph beats, edge-column flip, serif + mono labels" },
  setup(ctx) {
    const { p, at, end, f, rtl, el } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = el && el !== ctx.stage ? el : null;
    const R = own && ctx.box(own).w > f.W * 0.4 && ctx.box(own).h > f.H * 0.2 ? ctx.box(own) : f.pic;
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;`, host);
    // the backdrop sits beside the content (not inside what fades), so what it covers never ghosts through during the exit
    const back = p.backdrop ? mk("div", `position:absolute;left:${R.x - (R === f.pic ? 40 : 0)}px;top:${R.y}px;width:${R.w + (R === f.pic ? 80 : 0)}px;height:${R.h + (R === f.pic ? 70 : 0)}px;border-radius:var(--x-radius);background:var(--x-ground);pointer-events:none;z-index:6;`, host) : null;
    if (back) host.insertBefore(back, layer);

    const cols = Math.round(ML.clamp(p.cols, 3, 8)), rows = Math.round(ML.clamp(p.rows, 2, 5)), n = cols * rows;
    const labH = p.labels ? Math.min(R.h * 0.1, f.H * 0.05) : 0;
    const cell = Math.min((R.w * 0.94) / (cols + (cols - 1) / 8), (R.h - labH * 2.4) / (rows + (rows - 1) / 8));
    const gap = cell / 8, gw = cols * cell + (cols - 1) * gap, gh = rows * cell + (rows - 1) * gap;
    const ox = (R.w - gw) / 2, oy = (R.h - gh) / 2;

    // shapes as corner radii [tl, tr, br, bl] in % of the tile
    const SH = [[0, 0, 0, 0], [50, 50, 50, 50], [100, 0, 0, 0], [0, 100, 0, 0], [0, 0, 100, 0], [0, 0, 0, 100], [50, 50, 0, 0], [0, 0, 50, 50], [50, 0, 50, 0], [0, 50, 0, 50], [100, 0, 100, 0]];
    const PAL = p.palette === "mono" ? ["var(--x-ink)", "color-mix(in srgb, var(--x-ink) 55%, var(--x-ground))", "var(--x-dim)"]
      : p.palette === "look" ? ["var(--x-accent)", "var(--x-accent-2)", "color-mix(in srgb, var(--x-accent) 40%, var(--x-ground))"]
      : ["var(--x-ink)", "var(--x-accent)", "var(--x-accent-2)"];
    const rate = ML.clamp(p.morph_rate, 0.25, 0.8), tw = Math.min(0.4, rate * 0.9);
    const buildEnd = at + n * 0.02 + 0.35;
    const s0 = buildEnd + 0.1;
    const K = Math.max(1, Math.ceil((end - s0) / rate) + 1);
    const edgeCol = rtl ? 0 : cols - 1;
    // the state of every tile at every beat (seeded): shape, colour, quarter turns, and whether it flips in
    const st = Array.from({ length: n }, (_, i) => {
      const out = [{ s: Math.floor(ML.rnd(i, 1) * SH.length), c: Math.floor(ML.rnd(i, 2) * 3), r: ML.rnd(i, 3) < 0.25 ? 1 : 0, flip: false }];
      const col = i % cols;
      for (let k = 1; k <= K; k++) {
        const prev = out[k - 1], flip = col === edgeCol && k % 3 === 0;
        const change = flip || ML.rnd(i * 7 + 3, k * 13 + 1) < 0.3;
        out.push(change ? { s: (prev.s + 1 + Math.floor(ML.rnd(i, k + 50) * (SH.length - 1))) % SH.length, c: ML.rnd(i, k + 90) < 0.6 ? (prev.c + 1 + Math.floor(ML.rnd(i, k + 91) * 2)) % 3 : prev.c, r: ML.rnd(i, k + 130) < 0.3 ? prev.r + 1 : prev.r, flip } : { ...prev, flip: false });
      }
      return out;
    });
    const tiles = Array.from({ length: n }, (_, i) => {
      const c = i % cols, r = Math.floor(i / cols), x = ox + (rtl ? cols - 1 - c : c) * (cell + gap), y = oy + r * (cell + gap);
      return { e: mk("div", `position:absolute;left:${x}px;top:${y}px;width:${cell}px;height:${cell}px;will-change:transform;`, layer), pop: at + ML.rnd(i, 17) * n * 0.02 };
    });
    // labels
    let lab1 = null, lab2 = null;
    if (p.labels) {
      const side = rtl ? "right" : "left";
      lab1 = mk("div", `position:absolute;${side}:${ox}px;top:${Math.max(0, oy - labH * 1.3)}px;font:${rtl ? "normal" : "italic"} var(--x-body-weight) ${labH * 0.62}px/1.1 var(--x-serif-font);color:var(--x-ink);white-space:nowrap;will-change:transform;`, layer, p.label || (rtl ? "لغة التصميم" : "Design language"));
      const AR = "٠١٢٣٤٥٦٧٨٩", num = rtl ? String(n).replace(/\d/g, (d) => AR[+d]) : String(n);
      lab2 = mk("div", `position:absolute;${side}:${ox}px;top:${oy + gh + labH * 0.45}px;font:var(--x-label-weight) ${Math.max(22, labH * 0.42)}px/1.1 ${rtl ? "var(--x-body-font)" : "var(--x-mono-font)"};letter-spacing:${rtl ? 0 : "0.16em"};color:var(--x-dim);white-space:nowrap;will-change:transform;`, layer, rtl ? `النظام — ${num} ${n <= 10 ? "وحدات" : "وحدة"}` : `SYSTEM — ${num} MODULES`);
    }
    for (let k = 1; k <= K; k += 2) { const tk = s0 + k * rate; if (tk < end - 0.3) ctx.sfx(tk, k % 3 === 0 ? "snap" : "tap", 0.2); }
    ctx.sfx(at, "pop.soft", 0.3);
    const io = (t, a, b) => { const x = ML.lin(t, a, b); return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }; // power2.inOut
    const leaveA = Math.max(s0 + 0.5, end - 0.3);

    return {
      draw(t) {
        const leave = ML.clamp((t - leaveA) / 0.25);
        layer.style.opacity = (1 - leave).toFixed(4);
        layer.style.visibility = t < at - 0.2 ? "hidden" : "visible";
        if (back) back.style.opacity = (ML.out(t, at - 0.2, at + 0.1) * (1 - ML.lin(t, end, end + 0.2))).toFixed(4);
        const k = ML.clamp(Math.floor((t - s0) / rate), -1, K);
        tiles.forEach((tile, i) => {
          const S = st[i];
          let a = S[0], b = S[0], u = 1, sx = 1;
          if (k >= 1) {
            const t1 = s0 + k * rate;
            a = S[k - 1]; b = S[k];
            if (b.flip) { const x = ML.lin(t, t1, t1 + tw); sx = 1 - 0.9 * Math.sin(Math.PI * x); u = x >= 0.5 ? 1 : 0; }
            else u = io(t, t1, t1 + tw);
          }
          const rad = SH[a.s].map((v, j) => v + (SH[b.s][j] - v) * u);
          const rot = (a.r + (b.r - a.r) * u) * 90;
          const col = a.c === b.c || u >= 1 ? PAL[b.c] : u <= 0 ? PAL[a.c] : `color-mix(in srgb, ${PAL[b.c]} ${(u * 100).toFixed(1)}%, ${PAL[a.c]})`;
          const pop = t < tile.pop ? 0 : ML.back(t, tile.pop, tile.pop + 0.35, 1.4);
          tile.e.style.borderRadius = rad.map((v) => v.toFixed(2) + "%").join(" ");
          tile.e.style.background = col;
          // the scale outermost: a turned tile still squashes across the screen, not along its own axis
          tile.e.style.transform = `scale(${(pop * sx).toFixed(4)}, ${pop.toFixed(4)}) rotate(${rot.toFixed(2)}deg)`;
        });
        [lab1, lab2].forEach((l, j) => { if (!l) return; const a = at + 0.2 + j * 0.15, u = ML.out(t, a, a + 0.45); l.style.opacity = u.toFixed(4); l.style.transform = `translateY(${((1 - u) * labH * 0.3).toFixed(2)}px)`; });
      },
    };
  },
});

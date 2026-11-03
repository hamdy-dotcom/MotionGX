// Marquee type wall: 2–10 rows of heavy caps fill the frame (line-height 0.95; `rows` is counted on a square frame and
// grows with a taller one, so the type stays one size and a word stays readable in 9:16), each row one word repeated on a
// duplicated seamless strip; odd rows run left, even rows run right (the accent row a little faster). Row styles cycle
// filled / outline / accent (outline "EVERY" / solid accent "SINGLE" / outline "FRAME"). Rows enter from the edges or
// out of a blur, stagger 0.05 s over 0.3 s, and leave the same way. Optional glitch: an RGB split on seeded rows and
// occasional slice jumps, both stepped on a 12 fps clock so every frame stays a function of t.
// Source: our own rebuild of prompt-motion "codestackr-i-keep-seeing-all" + "ndhabarde11-wtf-claude-opus-5-5" —
// reference only.
ML.define({
  id: "kinetic.marquee-wall",
  category: "kinetic",
  name: "Marquee type wall",
  does: "Rows of repeated words fill the frame and scroll in alternating directions, alternating outline, solid and accent styles.",
  says: ["energy", "brand", "scale"],
  energy: 5,
  targets: ["word", "line", "stage"],
  duration: [1.5, 6],
  params: {
    rows: { type: "number", range: [2, 10], default: 4 },
    speed: { type: "number", range: [150, 600], default: 400, unit: "px/s" },
    styles: { type: "choice", options: ["outline-solid-accent", "solid", "outline"], default: "outline-solid-accent" },
    glitch: { type: "bool", default: false },
    words: { type: "text", default: "" },
    ground: { type: "choice", options: ["ink", "ground"], default: "ink" },
    enter: { type: "choice", options: ["edges", "blur"], default: "edges" },
    seed: { type: "number", range: [1, 9999], default: 7 },
  },
  pairs: ["text-in.slam", "transition.flash-cut"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.heavy",
  source: { from: "prompt-motion:codestackr-i-keep-seeing-all", license: "reference", note: "also ndhabarde11-wtf-claude-opus-5-5; our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    const host = ctx.scene || ctx.stage, doc = host.ownerDocument;
    const W = ctx.f.W, H = ctx.f.H, k = W / 1080;
    const isStage = !el || el === ctx.stage;
    const textOf = (n) => (n.textContent || "").replace(/\s+/g, " ").trim();
    let src = (p.words || "").trim() || (!isStage ? textOf(el) : "") || [...host.querySelectorAll(".ml-title")].map(textOf).join(" ") || (ctx.words || []).map((w) => w.w).join(" ");
    // each word once (so a repeated word never fills two rows)
    const seen = new Set();
    const words = src.split(/\s+/).map((w) => w.replace(/[.,،؛!?؟:]+$/, "")).filter((w) => { const q = ML.plain(w); if (!w || seen.has(q)) return false; seen.add(q); return true; });
    if (!words.length) return null;
    const rows = Math.max(2, Math.min(10, Math.round(p.rows * Math.max(1, H / W))));
    const rowH = H / rows;
    const inkBg = p.ground === "ink";
    const solid = inkBg ? "var(--x-ground)" : "var(--x-ink)";
    const wall = doc.createElement("div");
    Object.assign(wall.style, { position: "absolute", inset: "0", direction: "ltr", overflow: "hidden", zIndex: "4", pointerEvents: "none", background: inkBg ? "var(--x-ink)" : "var(--x-ground)" });
    host.append(wall);
    let fontPx = rowH * 0.95;
    const CYCLE = ["outline", "accent", "outline", "solid"];
    const styleOf = (r) => (p.styles === "solid" ? "solid" : p.styles === "outline" ? "outline" : CYCLE[r % 4]);
    const rowEls = [];
    for (let r = 0; r < rows; r++) {
      const word = words[r % words.length];
      const row = doc.createElement("div");
      Object.assign(row.style, { position: "absolute", left: "0", top: (r * rowH).toFixed(2) + "px", height: rowH.toFixed(2) + "px", display: "flex", alignItems: "center", width: "max-content", whiteSpace: "nowrap" });
      const st = styleOf(r);
      const group = doc.createElement("div");
      const gap = fontPx * 0.35;
      Object.assign(group.style, { display: "flex", alignItems: "center", gap: gap + "px", paddingInlineEnd: gap + "px", flex: "none", direction: rtl ? "rtl" : "ltr", fontFamily: "var(--x-head-font)", fontSize: fontPx.toFixed(1) + "px", lineHeight: "0.95", fontWeight: "800", textTransform: rtl ? "none" : "uppercase", letterSpacing: rtl ? "0" : "-0.02em" });
      const sw = Math.max(1, fontPx / 90);
      // outline: the stroke painted under a fill of the wall's own ground (paint-order), doubled because the fill covers
      // its inner half — so the overlapping contours of joined Arabic letters never show inside the letters
      if (st === "outline") Object.assign(group.style, { color: inkBg ? "var(--x-ink)" : "var(--x-ground)", webkitTextStroke: `${(sw * 2).toFixed(2)}px ${solid}`, paintOrder: "stroke fill" });
      else group.style.color = st === "accent" ? "var(--x-accent)" : solid;
      const one = () => { const s = doc.createElement("span"); s.textContent = word; s.style.flex = "none"; group.append(s); };
      for (let i = 0; i < 4; i++) one();
      row.append(group);
      wall.append(row);
      let guard = 0;
      while (group.offsetWidth < W && guard++ < 20) one();
      const gw = ctx.box(group).w; // the true width: the wrap lands exactly on the next copy
      for (let c = 0; c < Math.ceil(W / gw) + 1; c++) row.append(group.cloneNode(true));
      const dir = (r % 2 ? -1 : 1) * (rtl ? -1 : 1); // +1 runs left
      const v = p.speed * k * (st === "accent" ? 1.35 : 1) * (0.85 + 0.3 * ML.rnd(r, p.seed));
      rowEls.push({ row, gw, dir, v, phase: ML.rnd(r + 7, p.seed) * gw, glitchy: p.glitch && ML.rnd(r, p.seed + 3) > 0.45 });
    }
    // rows enter staggered 0.05 s over 0.3 s, and leave the same way before the end
    const st = Math.min(0.05, ((end - at) * 0.18) / rows);
    const leaveAt = Math.max(at + 0.3, end - 0.3 - (rows - 1) * st); // the last row is out by the move's end
    ctx.sfx(at, "whoosh.heavy", 0.4);
    if (p.glitch) ctx.sfx(at + 0.5, "snap", 0.2);
    const t0 = ctx.from ?? 0;
    return {
      draw(t) {
        const on = t >= at - 1e-6 && t < end;
        wall.style.visibility = on ? "visible" : "hidden";
        wall.style.opacity = (ML.lin(t, at, at + 0.12) * (1 - ML.lin(t, end - 0.12, end))).toFixed(4);
        const step = Math.floor(t * 12);
        rowEls.forEach(({ row, gw, dir, v, phase, glitchy }, r) => {
          const a = at + r * st, e = ML.expo(t, a, a + 0.3), l = ML.ease(t, leaveAt + r * st, leaveAt + r * st + 0.3);
          const run = (((phase + v * (t - t0)) % gw) + gw) % gw;
          let x = dir > 0 ? -run : run - gw;
          // enter / leave: from the side the row runs from, or out of a blur
          if (p.enter === "edges") x += (1 - e) * W * dir + l * -W * dir;
          let blur = p.enter === "blur" ? (1 - e) * 18 + l * 14 : 0;
          let shadow = "none";
          if (glitchy) {
            const g = ML.rnd(r * 31 + step, p.seed);
            if (g > 0.82) x += (ML.rnd(r + step, p.seed + 1) - 0.5) * 60 * k; // a slice jump
            const s = (3 * k).toFixed(1);
            shadow = `${s}px 0 var(--x-accent), -${s}px 0 var(--x-accent-2)`;
          }
          row.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
          row.style.opacity = (p.enter === "blur" ? e * (1 - l) : 1).toFixed(4);
          row.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
          row.style.textShadow = shadow;
        });
      },
    };
  },
});

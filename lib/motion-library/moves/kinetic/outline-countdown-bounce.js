// Outlined countdown with bouncing ball: big numerals (~1/3 of the frame, stroke only in 60% ink, or solid) count down
// one per beat — each enters 1.08 → 1 with opacity over 0.12 s and is cut on the next beat. A ball hops between the
// numeral's shoulders with a bounce period of one beat, so every squash lands on the downbeat. Behind: a dot grid
// (2 px dots, 40 px pitch, 12% ink) with a radial brightness wave sent out on each beat. After the last numeral the
// countdown clears and the target number (if any) is back in its slot.
// Source: our own rebuild of prompt-motion "eyishazyer-found-another-prompt-for" — reference only.
ML.define({
  id: "kinetic.outline-countdown-bounce",
  category: "kinetic",
  name: "Outlined countdown with bouncing ball",
  does: "Large outlined numbers count down on each beat while a bouncing ball lands on them over a pulsing dot grid.",
  says: ["time", "urgency", "energy", "step"],
  energy: 4,
  targets: ["number", "stage"],
  duration: [1.5, 5],
  params: {
    from: { type: "number", range: [3, 10], default: 3 },
    style: { type: "choice", options: ["outline", "solid"], default: "outline" },
    ball: { type: "bool", default: true },
    grid: { type: "bool", default: true },
    beat: { type: "number", range: [0.3, 1], default: 0.5, unit: "s" },
  },
  pairs: ["data.count-up", "transition.flash-cut"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:eyishazyer-found-another-prompt-for", license: "reference", note: "our own code" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    const host = ctx.scene || ctx.stage, doc = host.ownerDocument;
    const W = ctx.f.W, H = ctx.f.H, m = Math.min(W, H), k = m / 1080;
    const isStage = !el || el === ctx.stage;
    // Arabic-Indic digits when the slot uses them
    const indic = !isStage && /[٠-٩]/.test(el.textContent || "");
    const digits = (n) => (indic ? String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]) : String(n));
    const N = Math.max(3, Math.min(10, Math.round(p.from)));
    // fit the count into the move: one beat per numeral, shortened if the move is short
    const beat = Math.min(p.beat, Math.max(0.25, (end - at - 0.4) / N));
    const times = Array.from({ length: N }, (_, i) => at + i * beat);
    const done = at + N * beat;
    const layer = doc.createElement("div");
    Object.assign(layer.style, { position: "absolute", inset: "0", overflow: "hidden", pointerEvents: "none", zIndex: "4", direction: "ltr", background: "var(--x-ground)" });
    host.append(layer);
    const cx = W / 2, cy = H / 2;
    // the dot grid and its beat wave (the same grid at full ink, shown through a ring mask that grows each beat)
    const pitch = 40 * k * 1.4, dot = Math.max(2, 2 * k * 1.4);
    const gridCss = (pct) => `radial-gradient(circle, color-mix(in srgb, var(--x-ink) ${pct}%, transparent) ${dot / 2}px, transparent ${dot / 2 + 0.6}px)`;
    const grid = doc.createElement("div"), wave = doc.createElement("div");
    for (const [g, pct] of [[grid, 12], [wave, 55]]) { Object.assign(g.style, { position: "absolute", inset: "0", backgroundImage: gridCss(pct), backgroundSize: `${pitch}px ${pitch}px`, backgroundPosition: `${(cx % pitch) - pitch / 2}px ${(cy % pitch) - pitch / 2}px` }); if (p.grid) layer.append(g); }
    // the numerals, stacked in the middle
    const size = m * 0.36;
    const nums = times.map((_, i) => {
      const d = doc.createElement("div");
      d.textContent = digits(N - i);
      Object.assign(d.style, { position: "absolute", left: "0", top: "0", width: W + "px", height: H + "px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--x-head-font)", fontWeight: "700", fontSize: size.toFixed(1) + "px", lineHeight: "1", fontVariantNumeric: "tabular-nums" });
      // outline: stroke painted under a ground fill (paint-order, stroke doubled) so a variable font's overlapping
      // contours never show inside the numeral
      if (p.style === "outline") Object.assign(d.style, { color: "var(--x-ground)", webkitTextStroke: `${(2 * Math.max(2, 2.5 * k * 1.4)).toFixed(2)}px color-mix(in srgb, var(--x-ink) 60%, var(--x-ground))`, paintOrder: "stroke fill" });
      else d.style.color = "var(--x-ink)";
      layer.append(d);
      return d;
    });
    // the numeral's ink box (top edge where the ball lands)
    const probe = nums[0].ownerDocument.createRange(); probe.selectNodeContents(nums[0]);
    const lr = layer.getBoundingClientRect(), kk = lr.width / W || 1, rr = probe.getBoundingClientRect();
    // the numeral's ink top, measured: the line box (line-height 1) is centred, its baseline sits at
    // boxTop + (size − (fontAscent + fontDescent)) / 2 + fontAscent, the ink rises actualAscent above it
    const cs = getComputedStyle(nums[0]), cv = doc.createElement("canvas").getContext("2d");
    cv.font = `${cs.fontWeight} ${size}px ${cs.fontFamily}`;
    const mt = cv.measureText(digits(N));
    const fA = mt.fontBoundingBoxAscent || size * 0.9, fD = mt.fontBoundingBoxDescent || size * 0.25, inkA = mt.actualBoundingBoxAscent || size * 0.72;
    const glyphW = (mt.actualBoundingBoxRight + mt.actualBoundingBoxLeft) || rr.width / kk;
    const top = cy - size / 2 + (size - (fA + fD)) / 2 + fA - inkA;
    const ballD = size * 0.16;
    const ball = doc.createElement("div");
    Object.assign(ball.style, { position: "absolute", left: "0", top: "0", width: ballD + "px", height: ballD + "px", borderRadius: "50%", background: "var(--x-accent)", transformOrigin: "50% 100%" });
    if (p.ball) layer.append(ball);
    times.forEach((t) => ctx.sfx(t, "blip", 0.35));
    ctx.sfx(done, "pop", 0.3);
    const hideTarget = !isStage;
    return {
      draw(t) {
        const out = ML.ease(t, done, done + 0.25);
        const on = t >= at - 1e-6 && out < 1;
        layer.style.visibility = on ? "visible" : "hidden";
        layer.style.opacity = (ML.lin(t, at - 0.1, at) * (1 - out)).toFixed(4);
        if (hideTarget) { const back = ML.lin(t, done + 0.05, done + 0.3); el.style.opacity = t >= at - 0.1 ? back.toFixed(4) : ""; }
        // which numeral holds the beat
        let cur = -1;
        for (let i = 0; i < N; i++) if (t >= times[i]) cur = i;
        if (t >= done) cur = N - 1;
        nums.forEach((d, i) => {
          const show = i === cur;
          d.style.visibility = show ? "visible" : "hidden";
          const e = ML.out(t, times[i], times[i] + 0.12);
          d.style.opacity = show ? e.toFixed(4) : "0";
          d.style.scale = show ? (1.08 - 0.08 * e).toFixed(4) : "none";
        });
        // the wave: a ring of bright dots running out from the centre after each beat
        if (p.grid) {
          const bi = Math.max(0, cur), u = ML.clamp((t - times[bi]) / (beat * 1.2));
          const R = u * Math.hypot(W, H) * 0.6, w = 90 * k + 60 * k * u;
          const mask = `radial-gradient(circle at ${cx}px ${cy}px, transparent ${Math.max(0, R - w)}px, #000 ${R}px, transparent ${R + w}px)`;
          wave.style.maskImage = mask; wave.style.webkitMaskImage = mask;
          wave.style.opacity = (cur < 0 ? 0 : 1 - u).toFixed(4);
        }
        // the ball: hops from one shoulder of the numeral to the other, landing on every beat
        if (p.ball) {
          const tb = t - at, i = Math.floor(tb / beat), u = tb / beat - i;
          const side = (j) => cx + (j % 2 === 0 ? -1 : 1) * glyphW * 0.28;
          const x0 = side(i), x1 = side(i + 1), x = x0 + (x1 - x0) * u;
          const hop = size * 0.55 * 4 * u * (1 - u);
          // squash on contact: a short window either side of the downbeat
          const near = Math.min(u, 1 - u), sq = near < 0.08 ? (1 - near / 0.08) : 0;
          const sy = 1 - 0.3 * sq, sx = 1 + 0.25 * sq;
          ball.style.transform = `translate(${(x - ballD / 2).toFixed(2)}px, ${(top - ballD - hop).toFixed(2)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
          ball.style.opacity = t >= done ? "0" : "1";
        }
      },
    };
  },
});

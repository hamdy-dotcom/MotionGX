// Word echoes accumulate: copies of one word pile up behind the action, one per beat — bold condensed caps in the
// look's accent at 20–35 % opacity, each at a seeded position away from the middle (an oval around the centre is kept
// clear), turned ±15°, sized 0.6–1.2 of the headline size (set as font size, never scaled up), fading in over 0.2 s
// with a small settle and a slow drift. Copies land on the voice when the word is spoken again (its n-th time), else
// on an even beat through the move; their count grows to `density`. Arabic words stay whole and unspaced.
// Source: prompt-motion apoorvjain25-i-gave-claude-opus (reference only: our own rebuild).
ML.define({
  id: "accent.echo-word-scatter",
  category: "accent",
  name: "Word echoes accumulate",
  does: "Faded copies of a word ('AGAIN') appear one by one at random positions and angles behind the action, piling up.",
  says: ["problem", "time", "energy"],
  energy: 3,
  targets: ["word", "stage"],
  duration: [1.5, 5],
  params: {
    word: { type: "text" },
    density: { type: "number", range: [3, 30], default: 12 },
  },
  pairs: [],
  avoid: ["calm", "luxury", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:apoorvjain25-i-gave-claude-opus", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, end, f, stage, el, rtl } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, m = Math.min(W, H);
    // the word: the param, else the target's text (a short one whole, a long one's first word)
    const src = (el && el !== stage ? el.textContent : "").trim().replace(/\s+/g, " ");
    const word = String(p.word || (src.length <= 16 ? src : src.split(" ")[0]) || (rtl ? "تاني" : "again")).trim();
    const ar = ML.ARABIC.test(word);
    const n = Math.round(ML.clamp(p.density, 3, 30));
    // the layer sits behind the scene's content (first child: everything after it paints over it)
    const layer = document.createElement("div");
    layer.setAttribute("aria-hidden", "true");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;visibility:hidden";
    host.insertBefore(layer, host.firstChild);
    // beats: the word's n-th spoken time when the voice repeats it, else an even step through the move
    const span = Math.max(0.6, end - 0.35 - at), stepT = ML.clamp(span / n, 0.08, 0.6);
    const times = [];
    for (let i = 0; i < n; i++) { const even = at + i * stepT, spoken = ctx.word(word, NaN, i + 1); times.push(Number.isFinite(spoken) && spoken >= at && spoken < end - 0.3 ? spoken : even); }
    times.sort((a, b) => a - b);
    for (let i = 1; i < n; i++) times[i] = Math.max(times[i], times[i - 1] + 0.06);
    // places: seeded, outside a clear oval in the middle, spread over the frame
    const copies = times.map((t0, i) => {
      let x = 0, y = 0;
      for (let tr = 0; tr < 24; tr++) {
        x = 0.06 + 0.88 * ML.rnd(i, 11 + tr * 2); y = 0.06 + 0.88 * ML.rnd(i, 12 + tr * 2);
        const ox = (x - 0.5) / 0.3, oy = (y - 0.5) / 0.2;
        if (ox * ox + oy * oy > 1) break;
      }
      const s = 0.6 + 0.6 * ML.rnd(i, 61), rot = (ML.rnd(i, 62) * 2 - 1) * 15, o = 0.2 + 0.15 * ML.rnd(i, 63);
      const e = document.createElement("div");
      e.textContent = word;
      e.setAttribute("dir", ar ? "rtl" : "ltr");
      e.style.cssText = `position:absolute;left:${(x * W).toFixed(1)}px;top:${(y * H).toFixed(1)}px;white-space:nowrap;` +
        `font-family:var(--x-head-font);font-weight:800;font-size:calc(var(--x-head-size) * ${s.toFixed(3)});line-height:1;` +
        `color:var(--x-accent);text-transform:uppercase;letter-spacing:${ar ? "0" : "-0.04em"};font-stretch:condensed;opacity:0;visibility:hidden`;
      layer.append(e);
      const da = ML.rnd(i, 64) * Math.PI * 2;
      return { e, t0, rot, o, dx: Math.cos(da) * m * 0.012, dy: Math.sin(da) * m * 0.012 };
    });
    // keep every copy inside the frame: measured once, its anchor moved in if it would cross an edge
    for (const c of copies) {
      const w = c.e.offsetWidth, h = c.e.offsetHeight, l = parseFloat(c.e.style.left), tp = parseFloat(c.e.style.top);
      c.e.style.left = ML.clamp(l - w / 2, 8, Math.max(8, W - w - 8)).toFixed(1) + "px";
      c.e.style.top = ML.clamp(tp - h / 2, 8, Math.max(8, H - h - 8)).toFixed(1) + "px";
    }
    copies.forEach((c, i) => { if (i < 14) ctx.sfx(c.t0, "tap", 0.12 + 0.1 * (i / n)); });
    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.3, end);
        const on = t >= at && leave < 1;
        layer.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        layer.style.opacity = (1 - leave).toFixed(4);
        for (const c of copies) {
          if (t < c.t0) { c.e.style.visibility = "hidden"; continue; }
          c.e.style.visibility = "visible";
          const u = ML.out(t, c.t0, c.t0 + 0.2), age = t - c.t0;
          c.e.style.opacity = (c.o * u).toFixed(4);
          // a small settle (from 1.08 down, never above the copy's own size for long) and a slow drift
          const sc = 1 + 0.08 * (1 - u);
          c.e.style.transform = `translate(${(c.dx * age).toFixed(2)}px, ${(c.dy * age).toFixed(2)}px) rotate(${c.rot.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
        }
      },
    };
  },
});

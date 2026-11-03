// Segment bars grow: a row of short hairline bars (58 × 3 px, gap 8 px on the source's page — scaled to the stage
// here) draws in from the reading-start side one after another: transform-origin left (right in Arabic), scaleX 0 → 1
// over 0.8 s on CSS `ease`, 0.12 s apart, like a step timeline filling. Bars take the line colour, or the accent; the
// first `filled` bars take the accent as done steps, so the row doubles as a step counter (with `advance`, segment k
// lights on the k-th step: on the target list's k-th item when it is spoken, else on a steady beat).
// On a list / chart / shape the row sits under the target at its reading-start edge (over it when no room below);
// with no target it is built in the picture region.
// Sources: MengTo/Skills web-design/animation-systems demo + animation-on-scroll + blue-laser-clean-glass-layout +
// tailwindcss studio-demo template (MIT).
ML.define({
  id: "data.segment-bars-grow",
  category: "data",
  name: "Segment bars grow",
  does: "A row of short bars draws in from the start side one after another, like a step timeline filling.",
  says: ["step", "time", "growth"],
  energy: 2,
  targets: ["list", "chart", "shape"],
  duration: [1, 2],
  params: {
    segments: { type: "number", range: [3, 8], default: 4 },
    filled: { type: "number", range: [0, 8], default: 0 },
    length: { type: "number", range: [24, 120], default: 58, unit: "px" },
    stagger: { type: "number", range: [0.06, 0.2], default: 0.12, unit: "s" },
    colour: { type: "choice", options: ["line", "accent"], default: "line" },
    advance: { type: "bool", default: false },
  },
  pairs: ["data.segment-fill", "text-in.punchline"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/animation-systems/demo/index.html", license: "MIT" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const host = ctx.scene || stage;
    const k = Math.min(f.W, f.H) / 720; // the source's px on a page; the stage's short side is 1080
    const n = Math.round(ML.clamp(p.segments, 3, 8));
    const th = Math.max(3, 3 * k), gap = 8 * k;
    const len = Math.min(ML.clamp(p.length, 24, 120) * k, (f.W - f.m - (n - 1) * gap) / n); // the whole row always fits the frame
    const rowW = n * len + (n - 1) * gap;
    const hb = ctx.box(host);
    let x, y;
    if (el) {
      const b = ctx.box(el);
      x = rtl ? b.x + b.w - rowW : b.x;
      y = b.y + b.h + 14 * k;
      if (y + th > f.H - 20) y = b.y - 14 * k - th;
    } else {
      x = f.pic.x + (f.pic.w - rowW) / 2;
      y = f.pic.y + f.pic.h / 2;
    }
    x = ML.clamp(x, f.m * 0.5, f.W - f.m * 0.5 - rowW);
    const row = document.createElement("div");
    row.style.cssText = `position:absolute;left:${(x - hb.x).toFixed(1)}px;top:${(y - hb.y).toFixed(1)}px;width:${rowW.toFixed(1)}px;height:${th.toFixed(1)}px;display:flex;direction:${rtl ? "rtl" : "ltr"};gap:${gap.toFixed(1)}px;z-index:12;pointer-events:none`;
    host.append(row);
    const filled = Math.round(ML.clamp(p.filled, 0, n));
    const base = p.colour === "accent" ? "var(--x-accent)" : "color-mix(in srgb, var(--x-line), var(--x-ink) 30%)";
    const bars = Array.from({ length: n }, (_, i) => {
      const b = document.createElement("i");
      b.style.cssText = `display:block;flex:none;width:${len.toFixed(1)}px;height:${th.toFixed(1)}px;border-radius:${(th / 2).toFixed(1)}px;background:${i < filled ? "var(--x-accent)" : base};transform-origin:${rtl ? "100%" : "0%"} 50%;transform:scaleX(0)`;
      row.append(b);
      return b;
    });
    // CSS `ease` = cubic-bezier(0.25, 0.1, 0.25, 1)
    const cssEase = ML.bezier(0.25, 0.1, 0.25, 1);
    // the last bar is drawn before the row leaves, however short the run
    const st = Math.min(ML.clamp(p.stagger, 0.06, 0.2), Math.max(0.03, (end - at - 1.05) / (n - 1)));
    const starts = bars.map((_, i) => at + i * st);
    // advance: segment k lights on the k-th step (the target's k-th item when spoken, else every 0.45 s after the row draws)
    let lights = [];
    if (p.advance) {
      const items = el ? [...el.children].map((c) => (c.textContent || "").trim().split(/\s+/)[0]).filter(Boolean) : [];
      const t0 = starts[n - 1] + 0.5;
      const beat = ML.clamp((end - 0.45 - t0) / Math.max(1, n - 1), 0.08, 0.45);
      lights = bars.map((_, i) => Math.max(t0 + i * Math.min(0.12, beat), items[i] ? ctx.word(items[i], t0 + i * beat) : t0 + i * beat));
      lights.forEach((t, i) => i % 2 === 0 && ctx.sfx(t, "tap", 0.2));
    }
    ctx.sfx(at, "tap", 0.22);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        row.style.visibility = t >= at - 1e-6 ? "visible" : "hidden";
        row.style.opacity = (1 - leave).toFixed(4);
        bars.forEach((b, i) => {
          b.style.transform = `scaleX(${cssEase(ML.lin(t, starts[i], starts[i] + 0.8)).toFixed(4)})`;
          if (p.advance) {
            const on = ML.lin(t, lights[i], lights[i] + 0.18);
            b.style.background = i < filled ? "var(--x-accent)" : on > 0 ? `color-mix(in srgb, var(--x-accent) ${(on * 100).toFixed(1)}%, ${base})` : base;
          }
        });
      },
    };
  },
});

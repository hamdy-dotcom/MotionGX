// Voice waveform plays across: a row of thin bars shaped like a voice (spread across the region, never thicker than a
// stroke, the look's small radius; height
// 18% + 62% · rnd(i) · (0.5 + 0.5 · min(1, dur · 3)), rnd the kit's seeded hash, dur the length of the i-th spoken word
// when the film has a voice) lights up from the reading-start side as if the audio plays: unplayed bars are ink at
// 0.2, played ones accent at 1, played = lin(t, a, b) · N and bar i is on when i < played. The "editor-lane" style is
// the timeline lane's waveform: hairline bars at 14–88% height, all accent, dim until played, as dense as the width asks
// (`bars` is then a minimum). In Arabic the row starts on the right.
// Source: MengTo/Skills html-explainer-video demo/film.js (makes: .mk-wave; step4: .s4-wave) + film.css (MIT).
ML.define({
  id: "data.waveform-progress",
  category: "data",
  name: "Voice waveform plays across",
  does: "A row of thin bars shaped like a voice lights up from the start side as if the audio is playing.",
  says: ["time", "tech", "flow"],
  energy: 2,
  targets: ["chart", "shape"],
  duration: [1, 6],
  params: {
    bars: { type: "number", range: [30, 200], default: 44 },
    style: { type: "choice", options: ["voice", "editor-lane"], default: "voice" },
    duration: { type: "number", range: [0.5, 6], default: 2, unit: "s" },
    panel: { type: "bool", default: true },
  },
  pairs: ["data.timeline-lanes-build", "data.waveform-bars"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:html-explainer-video (demo/film.js makes + step4, film.css .mk-wave / .s4-wave)", license: "MIT" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    let R = el && el !== stage ? ctx.box(el) : f.pic;
    if (R.h < 100 || R.w < 200) R = f.pic;
    const u = Math.min(f.W, f.H) / 1080;
    const lane = p.style === "editor-lane";
    const padX = Math.round(22 * u), inner = R.w - 2 * padX;
    const N = Math.round(ML.clamp(lane ? Math.max(p.bars, inner / (6 * u)) : p.bars, 30, 200));
    const slot = inner / N, barW = Math.max(1, Math.min(slot * 0.55, (lane ? 4 : 16) * u)); // a thin bar, whatever the region's width
    const H = Math.min(R.h * (lane ? 0.18 : 0.32), (lane ? 120 : 260) * u);
    const wrap = mk("div", `position:absolute;left:${R.x}px;top:${(R.y + (R.h - H) / 2).toFixed(1)}px;width:${R.w}px;height:${H.toFixed(1)}px;z-index:20;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;padding:0 ${padX}px;visibility:hidden`, ctx.scene || stage);
    if (p.panel) wrap.className = "ml-panel";
    wrap.dir = rtl ? "rtl" : "ltr";
    const ws = ctx.words || [];
    const bars = Array.from({ length: N }, (_, i) => {
      let h;
      if (lane) h = 14 + 74 * ML.rnd(i, 5);
      else { const w = ws.length ? ws[i % ws.length] : null, dur = w && w.e != null ? w.e - w.t : 0.15 + 0.3 * ML.rnd(i, 9); h = 18 + 62 * ML.rnd(i, 3) * (0.5 + 0.5 * Math.min(1, dur * 3)); }
      return mk("i", `display:block;flex:none;width:${barW.toFixed(2)}px;height:${h.toFixed(1)}%;border-radius:var(--x-radius-s)`, wrap);
    });
    const a = at + 0.2, b = Math.max(a + 0.1, Math.min(end - 0.3, a + ML.clamp(p.duration, 0.5, 6)));
    ctx.sfx(a, "tap", 0.22);
    return {
      draw(t) {
        ML.show(wrap, t, at, end - 0.25);
        const played = ML.lin(t, a, b) * N;
        bars.forEach((bar, i) => {
          const on = i < played;
          bar.style.background = on || lane ? "var(--x-accent)" : "var(--x-ink)";
          bar.style.opacity = on ? "1" : lane ? "0.3" : "0.2";
        });
      },
    };
  },
});

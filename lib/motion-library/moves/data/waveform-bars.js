// Live waveform bars: a row of fully rounded bars (8 px wide, 6 px apart in an 80 px-tall box on a 400 px reference,
// scaled to the stage) rises and falls in a travelling wave, height% = 45 + sin(t · frequency + i · phase_step) ·
// amplitude, each filled with a gradient from ink to ink at 30% toward the top. Paired, as in the source, with a small
// floating tag that bobs (y = sin 2t · 4 px) and a readout ("0.02 sec"), the small type raised so a phone can read it.
// The card arrives the way the look moves, the bars grow in from the base one after another (0.03 s apart) and the wave
// runs on the film's clock. In Arabic the row reads right to left, so the wave travels the other way.
// Source: MengTo/Skills web-design blue-cloudy-clean-modern demo (MIT; its waveform + floating-tag loop).
ML.define({
  id: "data.waveform-bars",
  category: "data",
  name: "Live waveform bars",
  does: "A row of rounded bars rises and falls in a travelling wave, like live audio.",
  says: ["speed", "tech", "energy", "time"],
  energy: 3,
  targets: ["chart", "shape"],
  duration: [1, 10],
  params: {
    bars: { type: "number", range: [5, 24], default: 8 },
    frequency: { type: "number", range: [2, 10], default: 5 },
    phase_step: { type: "number", range: [0.3, 1.5], default: 0.8 },
    amplitude: { type: "number", range: [10, 45], default: 35, unit: "%" },
    colour: { type: "choice", options: ["ink", "accent"], default: "ink" },
    tag: { type: "bool", default: true },
    label: { type: "text", default: "" },
    readout: { type: "text", default: "0.02" },
  },
  pairs: ["data.waveform-progress", "data.unit-circle-wave-trace"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "MengTo/Skills:blue-cloudy-clean-modern (demo/index.html waveform)", license: "MIT" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    let R = el && el !== stage ? ctx.box(el) : f.pic;
    if (R.h < 120 || R.w < 200) R = f.pic;
    const u = Math.min(f.W, f.H) / 400;
    const n = Math.round(ML.clamp(p.bars, 5, 24));
    let bw = 8 * u, gap = 6 * u, bh = 80 * u;
    const need = n * bw + (n - 1) * gap, room = R.w * 0.8;
    if (need > room) { const k = room / need; bw *= k; gap *= k; }
    const seat = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;z-index:20;display:flex;align-items:center;justify-content:center;pointer-events:none`, ctx.scene || stage); // centres on whole pixels, leaving the card's translate to the look
    const card = mk("div", `display:flex;flex-direction:column;align-items:center;gap:${(10 * u).toFixed(1)}px;padding:${(16 * u).toFixed(1)}px ${(22 * u).toFixed(1)}px;visibility:hidden`, seat);
    card.className = "ml-panel";
    card.dir = rtl ? "rtl" : "ltr";
    let tag = null;
    if (p.tag) {
      tag = mk("div", `display:flex;align-items:center;gap:${(5 * u).toFixed(1)}px;padding:${(4 * u).toFixed(1)}px ${(10 * u).toFixed(1)}px;border-radius:var(--x-radius-s);border:1px solid var(--x-line);background:var(--x-panel-2);font:var(--x-label-weight) ${(8 * u).toFixed(1)}px var(--x-label-font);text-transform:var(--x-label-case);letter-spacing:var(--x-label-track);color:var(--x-ink);white-space:nowrap`, card);
      if (rtl) { tag.style.letterSpacing = "0"; tag.style.textTransform = "none"; }
      mk("i", `width:${(4 * u).toFixed(1)}px;height:${(4 * u).toFixed(1)}px;border-radius:50%;background:var(--x-accent)`, tag);
      mk("span", "", tag, p.label || (rtl ? "معالجة فورية" : "Instant processing"));
    }
    const box = mk("div", `display:flex;align-items:flex-end;gap:${gap.toFixed(2)}px;height:${bh.toFixed(1)}px`, card);
    const fill = p.colour === "accent" ? "var(--x-accent)" : "var(--x-ink)";
    const bars = Array.from({ length: n }, () => mk("i", `display:block;width:${bw.toFixed(2)}px;border-radius:var(--x-radius-s);background:linear-gradient(to top, ${fill}, color-mix(in srgb, ${fill} 30%, transparent))`, box));
    let ro = null;
    if (p.readout) {
      const r = mk("div", `display:flex;align-items:baseline;gap:${(3 * u).toFixed(1)}px;white-space:nowrap`, card);
      ro = mk("span", `font:400 ${(12 * u).toFixed(1)}px var(--x-mono-font);color:var(--x-ink);direction:ltr;unicode-bidi:isolate`, r, p.readout);
      mk("span", `font:400 ${(8 * u).toFixed(1)}px var(--x-mono-font);color:var(--x-dim)`, r, rtl ? "ث" : "sec");
    }
    ctx.sfx(at, "blip", 0.22);
    return {
      draw(t) {
        ML.show(card, t, at, end - 0.25);
        if (t < at - 1e-6) return;
        const s = t - at;
        bars.forEach((b, i) => {
          const grow = ML.out(t, at + 0.05 + i * 0.03, at + 0.45 + i * 0.03);
          const h = 45 + Math.sin(s * p.frequency + i * p.phase_step) * p.amplitude;
          b.style.height = (ML.clamp(h, 4, 100) * grow).toFixed(2) + "%";
        });
        if (tag) tag.style.translate = `0 ${(Math.sin(2 * s) * 4 * u).toFixed(2)}px`;
      },
    };
  },
});

// Tiny equaliser bars: four or five thin bars bounce beside a label or on the artwork of a now-playing chip to say
// sound is playing. Bars 3 px wide, 4 px apart, bottom-aligned, heights 4 → max via sin(t·f_i + phase_i) with a
// different frequency per bar (6–11 rad/s) and a slower second sine so the pattern never visibly loops. Sizes are
// web px scaled to the type size; colour is the text's own (currentColor) or the look's accent ink on artwork.
// Source: prompt-motion "twoclipping-opus-5-5-is-f-cking" (reference only: rebuilt as our own code).
ML.define({
  id: "ui.audio-equalizer-bars",
  category: "ui",
  name: "Tiny equaliser bars bounce",
  does: "Four or five little bars bounce up and down beside the artwork or label to show sound is playing.",
  says: ["energy", "ambient"],
  energy: 2,
  targets: ["card", "label"],
  duration: [1, 8],
  params: {
    bars: { type: "number", range: [3, 6], default: 4 },
    speed: { type: "number", range: [0.5, 1.5], default: 1 },
    max_height: { type: "number", range: [10, 24], default: 16, unit: "px" },
    place: { type: "choice", options: ["beside", "on-artwork"], default: "beside" },
  },
  pairs: ["ui.duration-badge-progress", "ui.floating-ui-card"],
  avoid: ["urgency", "problem"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:twoclipping-opus-5-5-is-f-cking", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { p, at, end, rtl, f } = ctx;
    const doc = document;
    const mk = (tag, css, html, parent) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (html != null) e.innerHTML = html; if (parent) parent.append(e); return e; };
    let k, holder, fadeEl;
    if (ctx.el) {
      const fs = parseFloat(getComputedStyle(ctx.el).fontSize) || 22;
      k = fs / 16;
      holder = mk("span", `display:inline-flex;align-items:flex-end;vertical-align:baseline;margin-inline-start:0.6em;color:currentColor`, null, ctx.el);
      fadeEl = holder;
    } else {
      // a now-playing chip: artwork square (the look's accent) with the bars on it, a title and a sub line
      const host = mk("div", "position:absolute;left:var(--pic-x);top:var(--pic-y);width:var(--pic-w);height:var(--pic-h);display:flex;align-items:center;justify-content:center;z-index:4;background:var(--x-ground)", null, ctx.scene || ctx.stage);
      const fs = ML.clamp(Math.min(f.W, f.H) * 0.032, 18, 40);
      const chip = mk("div", `display:flex;align-items:center;gap:0.8em;padding:0.7em 1.4em 0.7em 0.7em;font-size:${fs}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * 0.6);box-shadow:var(--x-shadow);color:var(--x-ink)`, null, host);
      if (rtl) chip.style.padding = "0.7em 0.7em 0.7em 1.4em";
      const art = mk("div", "position:relative;flex:none;width:3em;height:3em;border-radius:calc(var(--x-radius) * 0.35);background:linear-gradient(135deg, var(--x-accent), var(--x-accent-2));display:flex;align-items:flex-end;justify-content:center;padding-bottom:0.55em;box-sizing:border-box;color:var(--x-accent-ink)", null, chip);
      const txt = mk("div", "display:grid;gap:0.15em", null, chip);
      mk("b", "font-weight:600;white-space:nowrap", rtl ? "شغّال دلوقتي" : "Now playing", txt);
      mk("span", "font-size:0.72em;color:var(--x-dim);white-space:nowrap", rtl ? "صوت الإعلان · ٠:٣٠" : "Ad voice-over · 0:30", txt);
      k = (fs * 3) / 64 * 1.1;
      if (p.place === "beside") { art.style.alignItems = "center"; art.style.paddingBottom = "0"; holder = mk("span", "display:inline-flex;align-items:flex-end;color:var(--x-accent);margin-inline-start:0.4em", null, chip); }
      else holder = mk("span", "display:inline-flex;align-items:flex-end", null, art);
      fadeEl = chip;
    }
    const n = Math.round(ML.clamp(p.bars, 3, 6));
    const maxH = p.max_height * k, minH = 4 * k;
    holder.style.height = maxH.toFixed(1) + "px";
    holder.style.gap = (4 * k).toFixed(1) + "px";
    const bars = Array.from({ length: n }, (_, i) => ({
      e: mk("i", `display:block;width:${(3 * k).toFixed(1)}px;border-radius:${(1.5 * k).toFixed(1)}px;background:currentColor`, null, holder),
      f: 6 + 5 * ML.rnd(i, 7), ph: ML.rnd(i, 11) * Math.PI * 2, f2: 1.3 + ML.rnd(i, 13) * 1.4, ph2: ML.rnd(i, 17) * Math.PI * 2,
    }));
    ctx.sfx(at, "tap", 0.2);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        if (fadeEl === holder) fadeEl.style.opacity = (ML.lin(t, at, at + 0.2) * (1 - leave)).toFixed(4);
        else ML.show(fadeEl, t, at, end - 0.25);
        const amp = ML.out(t, at, at + 0.35) * (1 - leave);
        const s = p.speed;
        for (const b of bars) {
          const v = (0.5 + 0.5 * Math.sin(t * b.f * s + b.ph)) * (0.7 + 0.3 * Math.sin(t * b.f2 * s + b.ph2));
          b.e.style.height = (minH + (maxH - minH) * ML.clamp(v) * amp).toFixed(2) + "px";
        }
      },
    };
  },
});

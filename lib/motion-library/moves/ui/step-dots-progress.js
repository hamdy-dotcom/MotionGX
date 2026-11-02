// Step dots: a row (or column) of N evenly spaced numbered dots near the bottom of the frame, a small label under
// each. Future steps sit faint and hollow; when a step becomes current its dot fills with the accent and a thin
// accent ring scales 0 → 1 around it in 0.2 s while its label comes up to full ink; completed steps stay filled.
// The steps share the move's span evenly (or land on their spoken words); the strip fades in 0.3 s and out at the end.
// Source: prompt-motion ror-fly-opus-5-5-rendered-this (reference only — rebuilt as our own code).
ML.define({
  id: "ui.step-dots-progress",
  category: "ui",
  name: "Step dots along the bottom",
  does: "A row of numbered step dots at the bottom shows where we are; the current one is ringed.",
  says: ["step", "time", "list"],
  energy: 1,
  targets: ["list", "stage"],
  duration: [1, 30],
  params: {
    count: { type: "number", range: [3, 8], default: 5 },
    orientation: { type: "choice", options: ["horizontal", "vertical"], default: "horizontal" },
    sync: { type: "choice", options: ["even", "spoken"], default: "even" },
  },
  pairs: ["ui.step-card-pop", "ui.list-rows-stagger", "text-in.punchline"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:ror-fly-opus-5-5-rendered-this", license: "reference", note: "rebuilt as our own code from the video's step-dot strip" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const N = Math.round(ML.clamp(p.count, 3, 8));

    // step names: the target list's items, padded with sample steps
    const own = ctx.el && ctx.el !== ctx.stage ? [...ctx.el.children].map((c) => c.textContent.trim()).filter(Boolean) : [];
    const sample = rtl ? ["الفكرة", "الخطة", "البناء", "الفحص", "الإطلاق", "القياس", "التحسين", "النمو"] : ["Idea", "Plan", "Build", "Check", "Launch", "Measure", "Refine", "Grow"];
    const names = own.slice(0, N);
    for (let i = 0; names.length < N; i++) names.push(sample[i % sample.length]);

    // the strip: under the safe area (horizontal) or down the inline-end edge of it (vertical)
    const host = ctx.scene || ctx.stage;
    const vertical = p.orientation === "vertical";
    const dot = 40 * k, labelSize = (N > 5 ? 18 : 22) * k;
    const S = f.safe, bottom = S.y + S.h;
    let strip;
    if (!vertical) {
      const w = Math.min(S.w, N * (f.wide ? 300 : 190) * k);
      // a phone's own buttons cover the foot of a tall frame, so there the strip stays inside the safe area
      const top = f.tall ? bottom - 130 * k : f.H - (f.wide ? 90 : 120) * k;
      strip = mk("div", `position:absolute;left:${(S.x + (S.w - w) / 2).toFixed(1)}px;top:${top.toFixed(1)}px;width:${w.toFixed(1)}px;display:grid;grid-template-columns:repeat(${N},minmax(0,1fr));z-index:6;pointer-events:none;`, host);
    } else {
      const h = Math.min(S.h, N * 120 * k);
      const side = rtl ? `left:${(S.x - 0).toFixed(1)}px;` : `right:${(f.W - S.x - S.w).toFixed(1)}px;`;
      strip = mk("div", `position:absolute;${side}top:${(S.y + (S.h - h) / 2).toFixed(1)}px;height:${h.toFixed(1)}px;box-sizing:border-box;padding:${(18 * k).toFixed(1)}px ${(26 * k).toFixed(1)}px;display:grid;grid-template-rows:repeat(${N},1fr);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * 0.5);box-shadow:var(--x-shadow);z-index:6;pointer-events:none;`, host);
    }
    strip.dir = rtl ? "rtl" : "ltr";
    const steps = names.map((name, i) => {
      const cell = mk("div", vertical ? `display:flex;align-items:center;justify-content:flex-end;gap:${(16 * k).toFixed(1)}px;` : `display:flex;flex-direction:column;align-items:center;gap:${(12 * k).toFixed(1)}px;min-width:0;padding:0 ${(6 * k).toFixed(1)}px;`, strip);
      const lab = mk("div", `font:var(--x-label-weight) ${labelSize.toFixed(1)}px/1.2 var(--x-label-font);letter-spacing:${rtl ? "0" : "var(--x-label-track)"};text-transform:${rtl ? "none" : "var(--x-label-case)"};color:var(--x-ink);max-width:${vertical ? (260 * k).toFixed(1) + "px" : "100%"};overflow:hidden;text-align:center;${vertical ? "white-space:nowrap;text-overflow:ellipsis;" : "display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;"}`, null, name);
      const d = mk("div", `position:relative;flex:none;width:${dot.toFixed(1)}px;height:${dot.toFixed(1)}px;border-radius:50%;box-sizing:border-box;display:grid;place-items:center;font:600 ${(20 * k).toFixed(1)}px/1 var(--x-mono-font);`, null);
      const num = mk("span", "direction:ltr;", d, String(i + 1));
      const ring = mk("div", `position:absolute;left:50%;top:50%;width:${(dot + 18 * k).toFixed(1)}px;height:${(dot + 18 * k).toFixed(1)}px;margin:${(-(dot + 18 * k) / 2).toFixed(1)}px 0 0 ${(-(dot + 18 * k) / 2).toFixed(1)}px;border-radius:50%;box-sizing:border-box;border:${Math.max(1, 2 * k).toFixed(1)}px solid var(--x-accent);`, d);
      if (vertical) { cell.append(lab, d); lab.style.textAlign = "end"; } else cell.append(d, lab);
      return { cell, lab, d, num, ring };
    });

    // timing: N equal shares of the span, or each step on its spoken name
    const span = Math.max(0.3, end - at - 0.3);
    const times = names.map((n, i) => at + 0.15 + (i * span) / N);
    if (p.sync === "spoken") for (let i = 1; i < N; i++) times[i] = Math.max(times[i - 1] + 0.2, Math.min(end - 0.3, ctx.word(n0(names[i]), times[i])));
    function n0(s) { return (s || "").split(/\s+/)[0]; }
    times.forEach((s) => ctx.sfx(s, "tap", 0.2));
    const backOut = (x) => { const c = 1.7, y = x - 1; return 1 + (c + 1) * y * y * y + c * y * y; };

    return {
      draw(t) {
        const o = ML.lin(t, at, at + 0.3) * (1 - ML.lin(t, end - 0.25, end));
        strip.style.opacity = o.toFixed(4);
        let cur = -1;
        times.forEach((s, i) => { if (t >= s) cur = i; });
        steps.forEach(({ lab, d, num, ring }, i) => {
          const rel = i - cur;
          const fillIn = t >= times[i] ? ML.lin(t, times[i], times[i] + 0.2) : 0;
          // hollow and faint until active, then filled
          d.style.background = fillIn > 0 ? `color-mix(in srgb, var(--x-accent) ${(fillIn * 100).toFixed(1)}%, transparent)` : "transparent";
          d.style.border = `${Math.max(1, 2 * k).toFixed(1)}px solid ${fillIn > 0 ? "var(--x-accent)" : "color-mix(in srgb, var(--x-ink) 40%, transparent)"}`;
          num.style.color = fillIn > 0.5 ? "var(--x-accent-ink)" : "var(--x-ink)";
          d.style.opacity = rel > 0 ? "0.45" : "1";
          lab.style.opacity = (rel > 0 ? 0.35 : rel < 0 ? 0.6 : 0.35 + 0.65 * fillIn).toFixed(4);
          // the current one is ringed: scale 0 → 1 in 0.2 s, gone when the next takes over
          const r = rel === 0 ? backOut(ML.lin(t, times[i], times[i] + 0.2)) : 0;
          ring.style.opacity = rel === 0 ? ML.clamp(r * 1.5).toFixed(4) : "0";
          ring.style.transform = `scale(${Math.max(0, Math.min(1.08, r)).toFixed(4)})`;
        });
      },
    };
  },
});

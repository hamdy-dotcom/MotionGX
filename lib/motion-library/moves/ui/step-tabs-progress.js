// Step tabs progress strip: ordered step labels in equal columns (bottom inset, top, or just under the window), each an
// optional mono number ("01" / "1") + a short name in tracked label caps. Inactive steps sit at ~38 % opacity, the
// playing one at 100 %. Indicator (step-window's .hd-steps i): a thin line per step whose fill --p = t / dur for the
// current step, 1 for earlier and 0 for later (linear across the step), or the 1 px top rule of the active step
// thickening to an accent rule in 0.25 s, or an underline growing under the active name. The strip fades in 0.4 s.
// Source: MengTo/Skills web-design/html-demo scripts/step-window.js#render + step-window.css (.hd-steps) (MIT), ported to
// a pure function of t; prompt-motion sarut0bisasuke / aistocksavvy as reference.
ML.define({
  id: "ui.step-tabs-progress",
  category: "ui",
  name: "Step tabs progress strip",
  does: "A row of step / chapter labels shows which one is playing: the current label lights up and a thin line under or over it fills as the step plays.",
  says: ["step", "list", "time"],
  energy: 1,
  targets: ["list", "label", "stage"],
  duration: [2, 60],
  params: {
    steps: { type: "number", range: [3, 6], default: 5 },
    indicator: { type: "choice", options: ["fill-line", "rule-thicken", "underline-grow"], default: "fill-line" },
    numbering: { type: "choice", options: ["01", "1", "none"], default: "01" },
    position: { type: "choice", options: ["bottom", "top", "under-window"], default: "bottom" },
    sync: { type: "choice", options: ["even", "spoken"], default: "even" },
  },
  pairs: ["ui.screen-scroll", "device.app-window-frame", "ui.cursor-glide-click"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/html-demo", license: "MIT", note: "scripts/step-window.js render() + step-window.css .hd-steps (the --p fill line); prompt-motion sarut0bisasuke-opus-5-5-is-cracked, aistocksavvy-wow-made-this-motion as reference" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const N = Math.round(ML.clamp(p.steps, 3, 6));
    const tgt = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;

    // names: the target list's items (or a label's text first), padded with sample chapters
    const own = tgt ? (tgt.children.length ? [...tgt.children].map((c) => c.textContent.trim()) : [tgt.textContent.trim()]).filter(Boolean) : [];
    const sample = rtl ? ["الفكرة", "التصميم", "البناء", "الفحص", "الإطلاق", "النمو"] : ["Brief", "Design", "Build", "Review", "Launch", "Grow"];
    const names = own.slice(0, N);
    for (let i = 0; names.length < N; i++) names.push(sample[i % sample.length]);

    // where the strip sits
    const host = ctx.scene || ctx.stage, S = f.safe;
    const fs = 22 * k, colGap = 18 * k, stripH = 96 * k;
    let top;
    // a phone's own buttons cover the top and foot of a tall frame, so there the strip keeps clear of them
    if (p.position === "top") top = f.tall ? S.y - 70 * k : 6 * k; // above the headline band; a look with its head on top still shares this edge
    else if (p.position === "under-window") {
      const win = tgt ? tgt.closest(".ml-panel") || tgt : null;
      const b = win ? ctx.box(win) : f.pic;
      top = Math.min(f.H - stripH - 14 * k, b.y + b.h + 20 * k);
    } else top = f.tall ? S.y + S.h - stripH - 34 * k : Math.min(f.H - stripH - 20 * k, S.y + S.h + 20 * k);
    const strip = mk("div", `position:absolute;left:${S.x}px;top:${top.toFixed(1)}px;width:${S.w}px;display:grid;grid-template-columns:repeat(${N},minmax(0,1fr));column-gap:${colGap.toFixed(1)}px;z-index:6;pointer-events:none;color:var(--x-ink);`, host);
    strip.dir = rtl ? "rtl" : "ltr";
    const lineW = Math.max(1, 3 * k), ruleOn = Math.max(2, 6 * k);
    const cols = names.map((name, i) => {
      const col = mk("div", `position:relative;display:flex;flex-direction:column;gap:${(10 * k).toFixed(1)}px;padding:${(14 * k).toFixed(1)}px 0 ${(16 * k).toFixed(1)}px;min-width:0;`, strip);
      // top rule (rule-thicken) and the fill line (fill-line) — both full column width
      const rule = mk("div", `position:absolute;left:0;right:0;top:0;height:${ruleOn.toFixed(1)}px;transform-origin:50% 0;`, col);
      const num = p.numbering === "none" ? null : mk("div", `font:500 ${(fs * 0.85).toFixed(1)}px/1 var(--x-mono-font);letter-spacing:0.06em;color:var(--x-dim);direction:ltr;text-align:${rtl ? "right" : "left"};`, col, p.numbering === "01" ? String(i + 1).padStart(2, "0") : String(i + 1));
      const lab = mk("div", `position:relative;align-self:flex-start;max-width:100%;font:var(--x-label-weight) ${fs.toFixed(1)}px/1.25 var(--x-label-font);letter-spacing:${rtl ? "0" : "var(--x-label-track)"};text-transform:${rtl ? "none" : "var(--x-label-case)"};overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;`, col, name);
      const under = mk("div", `position:absolute;left:0;right:0;bottom:${(-6 * k).toFixed(1)}px;height:${Math.max(2, 2.5 * k).toFixed(1)}px;background:var(--x-accent);transform-origin:${rtl ? "100%" : "0"} 50%;`, lab);
      lab.style.paddingBottom = (8 * k).toFixed(1) + "px";
      under.style.bottom = "0";
      const track = mk("div", `position:absolute;left:0;right:0;bottom:0;height:${lineW.toFixed(1)}px;border-radius:2px;background:color-mix(in srgb, var(--x-ink) 16%, transparent);overflow:hidden;`, col);
      const fill = mk("div", `position:absolute;inset:0;background:var(--x-accent);transform-origin:${rtl ? "100%" : "0"} 50%;`, track);
      return { col, rule, num, lab, under, track, fill };
    });

    // each step's start: equal shares of the span, or on its spoken name
    const t0 = at + 0.2, span = Math.max(0.6, end - t0 - 0.3);
    const starts = names.map((_, i) => t0 + (i * span) / N);
    if (p.sync === "spoken") for (let i = 1; i < N; i++) starts[i] = Math.max(starts[i - 1] + 0.3, Math.min(end - 0.5, ctx.word((names[i] || "").split(/\s+/)[0], starts[i])));
    const stops = starts.map((s, i) => (i + 1 < N ? starts[i + 1] : t0 + span));
    starts.forEach((s, i) => i > 0 && ctx.sfx(s, "tap", 0.2));

    return {
      draw(t) {
        strip.style.opacity = (ML.out(t, at, at + 0.4) * (1 - ML.lin(t, end - 0.25, end))).toFixed(4);
        let cur = 0;
        starts.forEach((s, i) => { if (t >= s) cur = i; });
        cols.forEach(({ rule, num, lab, under, track, fill }, i) => {
          const rel = i - cur;
          // opacity ladder 0.38 → 1 with a short 0.25 s change on activation
          const on = rel === 0 ? ML.ease(t, starts[i], starts[i] + 0.25) : 0;
          const leave = rel < 0 ? 1 - ML.ease(t, stops[i], stops[i] + 0.25) : 0;
          const a = Math.max(on, leave);
          lab.style.opacity = (0.38 + 0.62 * a).toFixed(4);
          if (num) num.style.opacity = (0.38 + 0.62 * a).toFixed(4);
          // indicators
          if (p.indicator === "fill-line") {
            track.style.display = "block";
            const pr = rel < 0 ? 1 : rel > 0 ? 0 : ML.lin(t, starts[i], stops[i]);
            fill.style.transform = `scaleX(${pr.toFixed(4)})`;
            track.style.opacity = rel === 0 ? "1" : "0.55";
          } else track.style.display = "none";
          if (p.indicator === "rule-thicken") {
            rule.style.display = "block";
            rule.style.background = `color-mix(in srgb, var(--x-accent) ${(a * 100).toFixed(1)}%, color-mix(in srgb, var(--x-ink) 20%, transparent))`;
            const h = lineW + (ruleOn - lineW) * a;
            rule.style.transform = `scaleY(${(h / ruleOn).toFixed(4)})`;
          } else rule.style.display = "none";
          if (p.indicator === "underline-grow") {
            under.style.display = "block";
            const g = rel === 0 ? ML.out(t, starts[i], starts[i] + 0.4) : 0;
            under.style.transform = `scaleX(${g.toFixed(4)})`;
          } else under.style.display = "none";
        });
      },
    };
  },
});

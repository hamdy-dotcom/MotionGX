// Segment fill: a bar of labelled segments sized by real lengths fills one segment after another with a tinted sweep.
// Each segment flex-grows by its part's length (flex: len 0 0), 6 px apart, 64 px tall, the look's small radius, a 25 px
// label; inside it an absolute accent fill at opacity 0.22, origin at the reading start (right in Arabic), scaleX =
// cubic-out(t, a, a + 0.5) with a = T + i·0.26. A caption (given, or the real lengths' total) appears beside on the same word.
// On a list the list itself becomes the bar (its items are the segments, sized by `lengths` or by their labels);
// with no target the bar is built in the picture region.
// Source: MengTo/Skills html-explainer-video demo/film.js scene "give" + film.css .gv-bar / .gv-seg (MIT).
ML.define({
  id: "data.segment-fill",
  category: "data",
  name: "Segmented bar fills in turn",
  does: "A bar of labelled segments sized by real durations fills one segment after another with a tinted sweep.",
  says: ["time", "step", "growth"],
  energy: 2,
  targets: ["list", "chart"],
  duration: [1, 3],
  params: {
    segments: { type: "number", range: [2, 6], default: 4 },
    stagger: { type: "number", range: [0.15, 0.4], default: 0.26, unit: "s" },
    fill_opacity: { type: "number", range: [0.15, 1], default: 0.22 },
    lengths: { type: "text", default: "" },
    labels: { type: "text", default: "" },
    caption: { type: "text", default: "" },
    word: { type: "text", default: "" },
  },
  pairs: ["data.segment-bars-grow", "data.readout-swap"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:html-explainer-video/demo/film.js#give", license: "MIT" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const u = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    // the parts: the list's own items, else the labels param, else the explainer's chapters
    const given = String(p.labels || "").split("|").map((s) => s.trim()).filter(Boolean);
    const own = el ? [...el.children].map((c) => (c.textContent || "").trim()).filter(Boolean) : [];
    const fallback = rtl ? ["البداية", "الفايدة", "الشرح", "جرّبها", "النهاية", "الختام"] : ["Hook", "Benefit", "Tutorial", "Try it", "Close", "End"];
    let names = given.length ? given : own.length ? own : fallback.slice(0, Math.round(ML.clamp(p.segments, 2, 6)));
    names = names.slice(0, 6);
    const n = names.length;
    const lens = String(p.lengths || "").split(/[|,\s]+/).map(Number).filter((x) => x > 0);
    // a part's length: its real length when given, else its label's length (so every label fits its segment)
    const grow = names.map((s, i) => (lens[i] ? lens[i] : Math.max(4, Array.from(s).length + 3)));

    let wrap, bar, cap;
    const H = 64 * u, fs = 25 * u;
    if (el) {
      el.textContent = "";
      Object.assign(el.style, { display: "block", position: "relative" });
      wrap = el;
    } else {
      wrap = mk("div", `position:absolute;left:${f.pic.x + f.pic.w * 0.08}px;top:${f.pic.y + f.pic.h / 2 - H}px;width:${f.pic.w * 0.84}px;z-index:20`, ctx.scene || stage);
    }
    bar = mk("div", `display:flex;gap:${6 * u}px;height:${H}px;width:100%;direction:${rtl ? "rtl" : "ltr"}`, wrap);
    const segs = names.map((name, i) => {
      const s = mk("div", `position:relative;overflow:hidden;flex:${grow[i].toFixed(2)} 0 0;min-width:0;height:${H}px;border-radius:var(--x-radius-s);border:var(--x-edge) solid var(--x-edge-color);background:var(--x-panel);display:flex;align-items:center;padding:0 ${16 * u}px;white-space:nowrap;font:var(--x-label-weight) ${fs}px var(--x-label-font);color:var(--x-ink);box-sizing:border-box`, bar);
      if (!ML.ARABIC.test(name)) s.style.textTransform = "var(--x-label-case)";
      const fill = mk("u", `position:absolute;inset:0;background:var(--x-accent);opacity:${ML.clamp(p.fill_opacity, 0.15, 1)};transform-origin:${rtl ? "100%" : "0%"} 50%;transform:scaleX(0);text-decoration:none`, s);
      const lab = mk("span", `position:relative;overflow:hidden;text-overflow:ellipsis`, s, name);
      if (p.fill_opacity > 0.6) lab.style.color = "var(--x-accent-ink)";
      return { s, fill, lab };
    });
    // the caption beside (under, at the reading end), on the same word as the fill
    const total = lens.length ? lens.slice(0, n).reduce((a, b) => a + b, 0) : 0;
    const capText = p.caption || (total ? (rtl ? `${total} في المجموع` : `${total} in all`) : "");
    if (capText) cap = mk("div", `margin-top:${14 * u}px;font:var(--x-body-weight) ${27 * u}px var(--x-body-font);color:var(--x-dim);text-align:${rtl ? "left" : "right"};white-space:nowrap`, wrap, capText);
    // shrink the labels if a segment is too narrow for its name
    segs.forEach(({ s, lab }) => { const room = s.clientWidth - 32 * u; if (lab.scrollWidth > room && room > 0) lab.style.fontSize = Math.max(12 * u, (fs * room) / lab.scrollWidth).toFixed(1) + "px"; });

    const T = Math.max(at + 0.25, p.word ? ctx.word(p.word, at + 0.35) : at + 0.35);
    // the last segment is full before the bar leaves, however short the run
    const st = Math.min(ML.clamp(p.stagger, 0.15, 0.4), Math.max(0.05, (end - 0.3 - T - 0.5) / Math.max(1, n - 1)));
    segs.forEach((_, i) => i % 2 === 0 && ctx.sfx(T + i * st, "tap", 0.2));
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        const inn = ML.out(t, at, at + 0.35);
        wrap.style.visibility = t >= at - 1e-6 ? "visible" : "hidden";
        wrap.style.opacity = (inn * (1 - leave)).toFixed(4);
        bar.style.translate = `0 ${((1 - inn) * 18 * u).toFixed(2)}px`;
        segs.forEach(({ fill }, i) => {
          const a = T + i * st;
          fill.style.transform = `scaleX(${ML.out(t, a, a + 0.5).toFixed(4)})`;
        });
        if (cap) cap.style.opacity = ML.out(t, T, T + 0.3).toFixed(4);
      },
    };
  },
});

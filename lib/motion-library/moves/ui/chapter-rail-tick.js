// Progress rail ticks: a stack of short hairline ticks at the frame's edge, vertically centred (or a row along the
// bottom edge). Each tick is 14 x 1 at 26% ink, gap 12; the current one stretches to 22 and turns full ink over
// 0.5 s on the look's ease-out — the previous one shrinking back as it goes. The step advances evenly through the
// move, or on a list item's spoken word. Sits on the end edge (right in LTR, left in RTL); grows from the edge inward.
// Source: MengTo/Skills web-design/build-threejs-scroll-worlds demo/index.html (MIT): .rail / .rail i / .on.
ML.define({
  id: "ui.chapter-rail-tick",
  category: "ui",
  name: "Progress rail ticks",
  does: "A vertical stack of short ticks at the frame edge; the current one stretches longer and brighter.",
  says: ["step", "time", "precision"],
  energy: 1,
  targets: ["list", "stage"],
  duration: [2, 30],
  params: {
    orientation: { type: "choice", options: ["vertical", "horizontal"], default: "vertical" },
    count: { type: "number", range: [3, 10], default: 5 },
    stretch: { type: "number", range: [0.3, 0.8], default: 0.5, unit: "s" },
  },
  pairs: ["ui.chapter-index", "camera.push-in"],
  avoid: ["celebration", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/build-threejs-scroll-worlds", license: "MIT", note: "demo/index.html progress rail" },
  setup(ctx) {
    const { el, p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (parent) parent.append(e); return e; };
    // steps: a list target's items (their spoken words can drive the step), else the count
    const items = el && el !== ctx.stage && el.children.length >= 2 ? [...el.children].map((c) => c.textContent.trim()) : [];
    const N = items.length >= 3 ? Math.min(10, items.length) : Math.round(ML.clamp(p.count, 3, 10));
    const vert = p.orientation !== "horizontal";
    // the source's 14 / 22 / 1 / 12 px rail, scaled to the film (a web page's px are ~2.2 film px at 1080)
    const L0 = 30 * k, L1 = 48 * k, TH = Math.max(2, 2.4 * k), GAP = 26 * k;
    const edge = Math.max(24, f.m * 0.45);
    const host = ctx.scene || ctx.stage;
    const rail = mk("div", `position:absolute;z-index:7;display:flex;pointer-events:none;${vert
      ? `flex-direction:column;gap:${GAP.toFixed(1)}px;top:50%;transform:translateY(-50%);${rtl ? "left" : "right"}:${edge.toFixed(1)}px;align-items:${rtl ? "flex-start" : "flex-end"}`
      : `flex-direction:row;gap:${GAP.toFixed(1)}px;left:50%;transform:translateX(-50%);bottom:${(f.H - f.safe.y - f.safe.h + 20 * k).toFixed(1)}px;align-items:flex-end`}`, host);
    // the ticks grow from the frame's edge inward whichever edge they sit on; a horizontal rail's first step is on the reading start
    rail.dir = rtl && !vert ? "rtl" : "ltr";
    // each tick in a fixed-size cell (the source's 22 x 10 button), so a stretching tick never moves the others
    const ticks = Array.from({ length: N }, () => {
      const cell = mk("div", vert ? `width:${L1.toFixed(1)}px;height:${(TH * 5).toFixed(1)}px;display:flex;align-items:center;justify-content:flex-${rtl ? "start" : "end"}` : `width:${(TH * 5).toFixed(1)}px;height:${L1.toFixed(1)}px;display:flex;justify-content:center;align-items:flex-end`, rail);
      return mk("i", `display:block;${vert ? `height:${TH.toFixed(2)}px` : `width:${TH.toFixed(2)}px`};border-radius:${TH}px;background:var(--x-ink)`, cell);
    });
    // when each step goes live
    const span = Math.max(0.3, (end - at - 0.2) / N);
    const times = Array.from({ length: N }, (_, i) => at + 0.1 + i * span);
    if (items.length >= 3) for (let i = 1; i < N; i++) { const w = ctx.word(items[i].split(/\s+/).find((x) => ML.plain(x).length > 2) || items[i], -1); if (w > times[i - 1] + 0.25 && w < end) times[i] = w; }
    for (let i = 1; i < N; i++) times[i] = Math.max(times[i], times[i - 1] + 0.2);
    times.forEach((x, i) => i > 0 && x < end - 0.1 && ctx.sfx(x, "tap", 0.16));
    const D = ML.clamp(p.stretch, 0.3, 0.8);
    return {
      draw(t) {
        const vis = ML.out(t, at, at + 0.35) * (1 - ML.clamp((t - (end - 0.3)) / 0.25));
        rail.style.opacity = vis.toFixed(4);
        ticks.forEach((tk, i) => {
          // on from its moment, off when the next goes live; both on the ease-out over `stretch`
          const on = ML.out(t, times[i], times[i] + D) * (i + 1 < N ? 1 - ML.out(t, times[i + 1], times[i + 1] + D) : 1);
          const len = L0 + (L1 - L0) * on;
          if (vert) tk.style.width = len.toFixed(2) + "px"; else tk.style.height = len.toFixed(2) + "px";
          tk.style.opacity = (0.26 + 0.74 * on).toFixed(4);
        });
      },
    };
  },
});

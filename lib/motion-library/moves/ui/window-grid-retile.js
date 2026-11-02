// Window grid re-tiles to focus layouts: a grid of app windows re-arranges as more join and one gets focus — 2×2 →
// 3 columns → one large window (~60 % of the width) beside a side column. FLIP-style: every window's target rect is
// computed per layout and x, y, w, h travel 0.6 s on cubic-bezier(.65, 0, .35, 1); windows that join slide in from the
// trailing edge (the right; the left in Arabic); the content inside each window is laid out once at the largest size
// and scaled down to its window (never above 1), so it reflows by scale and stays sharp.
// Source: prompt-motion "amol909s-opus-5-5-on-medium" (reference only — rebuilt as our own code).
ML.define({
  id: "ui.window-grid-retile",
  category: "ui",
  name: "Window grid re-tiles to focus layouts",
  does: "The window grid smoothly re-arranges from 2x2 to 3 columns to one large plus a side column as more windows join and one gets focus.",
  says: ["choice", "focus", "scale"],
  energy: 3,
  targets: ["screen", "card"],
  duration: [2, 3],
  params: {
    layouts: { type: "choice", options: ["2x2-3col-focus", "2x2-focus", "custom"], default: "2x2-3col-focus" },
    sequence: { type: "text", default: "2x2|3col|focus" },
    focus: { type: "number", range: [0, 5], default: 0 },
    focus_share: { type: "number", range: [0.5, 0.7], default: 0.6 },
    move: { type: "number", range: [0.4, 0.9], default: 0.6, unit: "s" },
  },
  pairs: ["camera.push-in", "ui.agent-windows-streaming"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:amol909s-opus-5-5-on-medium", license: "reference", note: "technique rebuilt as our own code: rect per layout, cubic-bezier(.65,0,.35,1) 0.6 s, joiners from the edge" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const inEl = ctx.el && ctx.el !== ctx.stage;
    const R = inEl ? ctx.box(ctx.el) : f.pic;
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;`, host);
    mk("div", "position:absolute;inset:0;border-radius:var(--x-radius);background:var(--x-ground);", layer); // whatever the region held clears
    const curve = ML.bezier(0.65, 0, 0.35, 1);
    const MOVE0 = ML.clamp(p.move, 0.4, 0.9);

    // the sequence of layouts
    const seq = (p.layouts === "custom" ? String(p.sequence || "2x2|3col|focus") : p.layouts === "2x2-focus" ? "2x2|focus" : "2x2|3col|focus")
      .split("|").map((s) => s.trim()).filter((s) => ["2x2", "3col", "focus", "row"].includes(s));
    if (seq.length < 2) seq.splice(0, seq.length, "2x2", "focus");
    const need = (k) => (k === "2x2" ? 4 : k === "row" ? 3 : 6);
    // how many windows each step shows: never fewer than before (windows join, they do not leave)
    let shown = 0;
    const counts = seq.map((k) => { shown = Math.max(shown, k === "focus" ? Math.max(shown, 4) : need(k)); return shown; });
    const N = Math.max(...counts);
    const focusIdx = Math.round(ML.clamp(p.focus, 0, N - 1));

    // rects per layout (in the layer's px), gap g; mirrored in RTL
    const g = Math.min(R.w, R.h) * 0.025, W = R.w, H = R.h, tall = H > W * 0.95;
    const mirror = (r) => (rtl ? { ...r, x: W - r.x - r.w } : r);
    function grid(n, cols) {
      const rows = Math.ceil(n / cols), w = (W - g * (cols - 1)) / cols, h = (H - g * (rows - 1)) / rows;
      return Array.from({ length: n }, (_, i) => ({ x: (i % cols) * (w + g), y: Math.floor(i / cols) * (h + g), w, h }));
    }
    function layout(k, n) {
      if (k === "2x2") return grid(n, 2);
      if (k === "row") return grid(n, n);
      if (k === "3col") return tall ? grid(n, 2) : grid(n, 3);
      // focus: one large window, the rest in a side column (a bottom row on tall shapes)
      const others = n - 1, share = ML.clamp(p.focus_share, 0.5, 0.7), out = [];
      if (tall) {
        const bh = H * share, rowH = (H - bh - g), cols = Math.min(others, 3), rws = Math.ceil(others / cols);
        const w = (W - g * (cols - 1)) / cols, h = (rowH - g * (rws - 1)) / rws;
        let j = 0;
        for (let i = 0; i < n; i++) {
          if (i === focusIdx) out.push({ x: 0, y: 0, w: W, h: bh });
          else { out.push({ x: (j % cols) * (w + g), y: bh + g + Math.floor(j / cols) * (h + g), w, h }); j++; }
        }
        return out;
      }
      const bw = W * share, sw = W - bw - g, cols = others > 4 ? 2 : 1, rws = Math.ceil(others / cols);
      const w = (sw - g * (cols - 1)) / cols, h = (H - g * (rws - 1)) / rws;
      let j = 0;
      for (let i = 0; i < n; i++) {
        if (i === focusIdx) out.push({ x: 0, y: 0, w: bw, h: H });
        else { out.push({ x: bw + g + (j % cols) * (w + g), y: Math.floor(j / cols) * (h + g), w, h }); j++; }
      }
      return out;
    }
    const rects = seq.map((k, s) => layout(k, counts[s]).map(mirror));

    // windows: chrome bar + a little app inside, laid out at the largest size and scaled down
    const maxW = Math.max(...rects.flat().map((r) => r.w)), maxH = Math.max(...rects.flat().map((r) => r.h));
    const baseW = Math.min(maxW, maxH * 1.4), k0 = baseW / 640;
    const names = rtl ? ["البريد", "التقويم", "المستندات", "التحليلات", "المهام", "الرسائل"] : ["Mail", "Calendar", "Docs", "Analytics", "Tasks", "Messages"];
    const wins = Array.from({ length: N }, (_, i) => {
      const w = mk("div", `position:absolute;left:0;top:0;box-sizing:border-box;overflow:hidden;border-radius:calc(var(--x-radius) * 0.5);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);`, layer);
      const inner = mk("div", `position:absolute;left:0;top:0;width:${maxW}px;height:${maxH}px;transform-origin:${rtl ? "100% 0" : "0 0"};${rtl ? "right:0;left:auto;" : ""}font-family:var(--x-body-font);color:var(--x-ink);`, w);
      const bar = mk("div", `display:flex;align-items:center;gap:${10 * k0}px;height:${40 * k0}px;padding:0 ${16 * k0}px;background:var(--x-bar);border-bottom:1px solid var(--x-line);`, inner);
      const lights = mk("span", `display:flex;gap:${7 * k0}px;opacity:var(--x-lights);`, bar);
      for (const c of ["--x-light-1", "--x-light-2", "--x-light-3"]) mk("i", `width:${11 * k0}px;height:${11 * k0}px;border-radius:50%;background:var(${c});`, lights);
      mk("span", `font:var(--x-label-weight) ${15 * k0}px ${rtl ? "var(--x-body-font)" : "var(--x-label-font)"};color:var(--x-bar-ink);letter-spacing:${rtl ? 0 : "0.08em"};text-transform:var(--x-label-case);`, bar, names[i % names.length]);
      const body = mk("div", `display:grid;grid-template-columns:28% 1fr;gap:${16 * k0}px;padding:${18 * k0}px;`, inner);
      const side = mk("div", `display:grid;gap:${10 * k0}px;align-content:start;`, body);
      for (let r = 0; r < 5; r++) mk("i", `display:block;height:${14 * k0}px;border-radius:${7 * k0}px;background:${r === 0 ? "color-mix(in srgb, var(--x-accent) 55%, var(--x-panel))" : "var(--x-panel-2)"};width:${60 + ML.rnd(i, r) * 40}%;`, side);
      const main = mk("div", `display:grid;gap:${12 * k0}px;align-content:start;`, body);
      mk("i", `display:block;aspect-ratio:16 / 7;border-radius:${12 * k0}px;background:linear-gradient(${120 + i * 37}deg, color-mix(in srgb, var(--x-accent) ${35 + ML.rnd(i, 9) * 40}%, var(--x-panel)), color-mix(in srgb, var(--x-accent-2) ${30 + ML.rnd(i, 8) * 40}%, var(--x-panel-2)));`, main);
      for (let r = 0; r < 14; r++) mk("i", `display:block;height:${12 * k0}px;border-radius:${6 * k0}px;background:var(--x-panel-2);width:${45 + ML.rnd(i + 3, r) * 55}%;`, main);
      return { w, inner };
    });

    // times: the first layout at `at`, then one change per step spread over the span
    // (every change lands and holds before the leave at end − 0.25, so a short span quickens the moves, never drops one)
    const first = at + 0.5, room = Math.max(0.4, end - 0.6 - first), gap = Math.min(1.2, room / (seq.length - 1)), MOVE = Math.min(MOVE0, gap * 0.92);
    const stepT = seq.map((_, s) => (s === 0 ? at : first + (s - 1) * gap));
    for (let s = 1; s < seq.length; s++) ctx.sfx(stepT[s], "whoosh.soft", 0.35);
    ctx.sfx(at, "pop.soft", 0.25);
    const firstStep = wins.map((_, i) => counts.findIndex((c) => c > i));

    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.22);
        layer.style.opacity = (1 - leave).toFixed(4);
        wins.forEach((win, i) => {
          const s0 = firstStep[i];
          // its rect: from the step it joins, through each later change
          let r = rects[s0][i];
          let joined = 1;
          if (s0 === 0) { joined = ML.out(t, at + i * 0.06, at + i * 0.06 + 0.4); }
          else {
            const a = stepT[s0], u = curve(ML.lin(t, a, a + MOVE)), tr = rects[s0][i];
            const from = { x: rtl ? -tr.w * 0.6 : W - tr.w * 0.4, y: tr.y, w: tr.w, h: tr.h };
            r = { x: from.x + (tr.x - from.x) * u, y: tr.y, w: tr.w, h: tr.h };
            joined = ML.lin(t, a, a + MOVE * 0.5);
          }
          for (let s = s0 + 1; s < seq.length; s++) {
            const a = stepT[s], u = curve(ML.lin(t, a, a + MOVE)), b = rects[s][i];
            if (u <= 0) break;
            r = { x: r.x + (b.x - r.x) * u, y: r.y + (b.y - r.y) * u, w: r.w + (b.w - r.w) * u, h: r.h + (b.h - r.h) * u };
          }
          win.w.style.left = r.x.toFixed(2) + "px";
          win.w.style.top = r.y.toFixed(2) + "px";
          win.w.style.width = r.w.toFixed(2) + "px";
          win.w.style.height = r.h.toFixed(2) + "px";
          win.w.style.opacity = joined.toFixed(4);
          win.w.style.translate = s0 === 0 ? `0 ${((1 - joined) * 18).toFixed(2)}px` : "none";
          win.w.style.zIndex = i === focusIdx ? "2" : "1";
          // content laid out at the base size, scaled down (never up) and reflowed to the window's own aspect
          const sc = Math.min(1, Math.max(Math.min(r.w, r.h * 1.4) / baseW, Math.min(r.w / (baseW * 0.42), r.h / (baseW * 0.6))));
          win.inner.style.width = (r.w / sc).toFixed(2) + "px";
          win.inner.style.height = (r.h / sc).toFixed(2) + "px";
          win.inner.style.transform = `scale(${sc.toFixed(4)})`;
          // focus: the focused window takes the look's ring once the focus layout lands
          const fs = seq.indexOf("focus");
          if (i === focusIdx && fs >= 0) ML.ring(win.w, t, stepT[fs] + MOVE * 0.6, Infinity, 4);
        });
      },
    };
  },
});

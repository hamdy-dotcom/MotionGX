// Grid fills with a counter: on a drafting sheet (the look's second panel tone under fine 1 px construction lines in
// the look's hairline), accent squares (or dots) fill row by row in growing steps — doubling (1, 2, 4, 8, 16, 32, 64,
// then the whole grid) or linear (an eighth of the grid a step). Each step lands its new cells either at once or each
// scaling 0 → 1 in 0.12 s, 0.01 s apart; steps start ~0.3 s long and quicken (×0.82 each), so the fill accelerates.
// A tiny mono size label ("8×8") with two corner ticks rides the filled block's far corner (eased 0.2 s per step),
// and a large serif counter in the bottom end corner hard-swaps to the filled count on every step. Rows start on the
// reading-start side (right in Arabic). Ends fully filled.
// Source: prompt-motion "fionntobin-the-new-opus-5-5" (reference only: rebuilt as our own code).
ML.define({
  id: "data.grid-fill-counter",
  category: "data",
  name: "Grid fills with a counter",
  does: "On a drafting grid, squares fill in growing steps while a large serif number in the corner counts with them.",
  says: ["scale", "growth", "precision"],
  energy: 3,
  targets: ["number", "chart"],
  duration: [1.5, 4],
  params: {
    growth: { type: "choice", options: ["doubling", "linear"], default: "doubling" },
    cell: { type: "choice", options: ["square", "circle"], default: "square" },
    cells: { type: "number", range: [16, 144], default: 96 },
    land: { type: "choice", options: ["scale", "instant"], default: "scale" },
    label: { type: "bool", default: true },
  },
  pairs: ["data.odometer", "data.dot-histogram-bell"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:fionntobin-the-new-opus-5-5", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const mk = (tag, css, parent, text) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const u = Math.min(f.W, f.H) / 1080;
    const N = Math.round(ML.clamp(p.cells, 16, 144));
    // the sheet: a chart slot's own box when it is big enough, else a panel in the picture region
    const scene = ctx.scene || stage, hb = ctx.box(scene);
    let R = el && el.getAttribute("data-slot") === "chart" ? ctx.box(el) : null;
    if (!R || R.w < 300 * u || R.h < 260 * u) {
      const w = Math.min(f.pic.w * 0.92, f.wide ? f.W * 0.52 : f.W * 0.86), h = Math.min(f.pic.h * 0.9, w * (f.wide ? 0.78 : 1.05));
      R = { x: f.pic.x + (f.pic.w - w) / 2, y: f.pic.y + (f.pic.h - h) / 2, w, h };
    }
    const pad = Math.round(36 * u);
    const sheet = mk("div", `position:absolute;left:${(R.x - hb.x).toFixed(1)}px;top:${(R.y - hb.y).toFixed(1)}px;width:${R.w.toFixed(1)}px;height:${R.h.toFixed(1)}px;z-index:20;box-sizing:border-box;overflow:hidden;visibility:hidden;border-radius:var(--x-radius);border:var(--x-edge) solid var(--x-edge-color);background-color:var(--x-panel-2);background-image:linear-gradient(var(--x-line) 1px, transparent 1px),linear-gradient(90deg, var(--x-line) 1px, transparent 1px);background-size:${(24 * u).toFixed(1)}px ${(24 * u).toFixed(1)}px;background-position:-1px -1px`, scene);
    // the grid's columns and rows: as square a block as the room allows (the counter keeps the bottom strip)
    const counterH = R.h * 0.26, gw = R.w - pad * 2, gh = R.h - pad * 2 - counterH;
    const cols = Math.round(ML.clamp(Math.sqrt((N * gw) / gh), 2, N)), rows = Math.ceil(N / cols);
    const pitch = Math.floor(Math.min(gw / cols, gh / rows)), size = Math.round(pitch / 1.2), gap = pitch - size;
    const gridW = cols * pitch - gap;
    const gx = rtl ? R.w - pad - gridW : pad, gy = pad;
    // the cells: one canvas painted from t every frame (crisp, the same pixels every time)
    const cv = mk("canvas", `position:absolute;left:0;top:0;width:${Math.round(R.w)}px;height:${Math.round(R.h)}px`, sheet);
    cv.width = Math.round(R.w); cv.height = Math.round(R.h);
    const g = cv.getContext("2d");
    cv.style.color = "var(--x-accent)"; const accent = getComputedStyle(cv).color; // the look's accent, resolved
    const cells = Array.from({ length: N }, (_, i) => {
      const r = Math.floor(i / cols), c = i % cols, cc = rtl ? cols - 1 - c : c;
      return { cx: Math.round(gx + cc * pitch) + size / 2, cy: Math.round(gy + r * pitch) + size / 2 };
    });
    // the label riding the filled block's corner, with two ticks
    const fsL = 18 * u;
    const lab = mk("div", `position:absolute;left:0;top:0;font:var(--x-label-weight) ${fsL.toFixed(1)}px var(--x-mono-font);color:color-mix(in srgb, var(--x-ink) 70%, transparent);white-space:nowrap;direction:ltr;padding:${(6 * u).toFixed(1)}px ${(8 * u).toFixed(1)}px;display:${p.label ? "block" : "none"}`, sheet);
    const tickCss = `position:absolute;top:0;${rtl ? "right" : "left"}:0;width:${(10 * u).toFixed(1)}px;height:${(10 * u).toFixed(1)}px;border-top:${Math.max(1, 1.5 * u).toFixed(1)}px solid var(--x-ink);border-${rtl ? "right" : "left"}:${Math.max(1, 1.5 * u).toFixed(1)}px solid var(--x-ink)`;
    mk("i", tickCss, lab);
    const labTxt = mk("span", "", lab, "");
    // the counter: large serif, bottom end corner
    const fsC = Math.min(counterH * 0.92, 150 * u);
    const counter = mk("div", `position:absolute;bottom:${(pad * 0.6).toFixed(1)}px;${rtl ? "left" : "right"}:${pad}px;font:400 ${fsC.toFixed(1)}px/1 var(--x-serif-font);letter-spacing:-0.03em;font-variant-numeric:tabular-nums lining-nums;color:var(--x-ink);direction:ltr`, sheet, "0");
    mk("div", `position:absolute;bottom:${(pad * 0.8).toFixed(1)}px;${rtl ? "right" : "left"}:${pad}px;font:var(--x-label-weight) ${(16 * u).toFixed(1)}px var(--x-label-font);letter-spacing:var(--x-label-track);text-transform:var(--x-label-case);color:var(--x-dim)`, sheet, rtl ? `من ${N} خانة` : `of ${N} cells`);

    // the steps: the filled count after each, and when each lands (accelerating, fitted into the run)
    const counts = [];
    if (p.growth === "linear") { const s = Math.ceil(N / 8); for (let c = s; c < N; c += s) counts.push(c); }
    else for (let c = 1; c < N; c *= 2) counts.push(c);
    counts.push(N);
    const t0 = at + 0.35, room = Math.max(0.6, end - 0.6 - t0);
    let d = 0.3; const gaps = counts.map((_, i) => (i === 0 ? 0 : (d *= 0.82)));
    const sum = gaps.reduce((a, b) => a + b, 0), kk = sum > room ? room / sum : 1;
    const times = []; let acc = t0; gaps.forEach((g) => { acc += g * kk; times.push(acc); });
    // each cell's landing time: the step that first covers it, staggered 0.01 s within the step
    const landAt = cells.map((_, i) => { const s = counts.findIndex((c) => c > i), prev = s > 0 ? counts[s - 1] : 0; return times[s] + Math.min(0.25, (i - prev) * 0.01); });
    times.forEach((t, i) => (i === times.length - 1 ? ctx.sfx(t, "land.light", 0.3) : i % 2 === 0 && ctx.sfx(t, "blip", 0.18)));
    const corner = (c) => { const rs = Math.ceil(c / cols), cs = Math.min(c, cols); return { cs, rs, x: rtl ? gx + gridW - cs * pitch + gap : gx + cs * pitch - gap, y: gy + rs * pitch - gap }; };
    const corners = counts.map(corner);
    return {
      draw(t) {
        if (t < at - 1e-6) { sheet.style.visibility = "hidden"; return; }
        sheet.style.visibility = "visible";
        const leave = ML.clamp((t - (end - 0.25)) / 0.2), e = ML.out(t, at, at + 0.35);
        sheet.style.opacity = (e * (1 - leave)).toFixed(4);
        sheet.style.translate = `0 ${((1 - e) * 18 * u).toFixed(2)}px`;
        g.clearRect(0, 0, cv.width, cv.height);
        g.fillStyle = accent;
        const rad = size * 0.08;
        cells.forEach((c, i) => {
          const a = landAt[i], sc = p.land === "instant" ? (t >= a ? 1 : 0) : ML.out(t, a, a + 0.12);
          if (sc <= 0.004) return;
          const w = size * sc;
          g.beginPath();
          if (p.cell === "circle") g.arc(c.cx, c.cy, w / 2, 0, Math.PI * 2);
          else if (g.roundRect) g.roundRect(c.cx - w / 2, c.cy - w / 2, w, w, rad * sc);
          else g.rect(c.cx - w / 2, c.cy - w / 2, w, w);
          g.fill();
        });
        let k = -1; for (let i = 0; i < times.length; i++) if (t >= times[i]) k = i;
        const shown = k < 0 ? 0 : counts[k];
        if (counter.textContent !== String(shown)) counter.textContent = String(shown);
        // the label eases from the last corner to this step's
        const cur = corners[Math.max(0, k)], prv = corners[Math.max(0, k - 1)], m = k < 0 ? 0 : ML.out(t, times[k], times[k] + 0.2);
        const x = prv.x + (cur.x - prv.x) * m, y = prv.y + (cur.y - prv.y) * m;
        const txt = `${cur.cs}×${cur.rs}`;
        if (labTxt.textContent !== txt) labTxt.textContent = txt;
        const lw = lab.offsetWidth;
        const lx = ML.clamp(rtl ? x - lw - 4 * u : x + 4 * u, 0, R.w - lw), ly = Math.min(R.h - counterH, y + 4 * u);
        lab.style.left = `${Math.round(lx)}px`; lab.style.top = `${Math.round(ly)}px`;
        lab.style.visibility = k < 0 ? "hidden" : "visible";
      },
    };
  },
});

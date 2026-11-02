// Thumbnail wall drifting in rows: a dense grid of portrait cards (≈95 × 130, 10 px gap, 8 px radius in the reference) —
// dark short-video tiles with a tiny label (DAY 1, POV, 90 DAYS…) and the views under each, or logo tiles, or post tiles —
// in 2–5 rows. Rows enter from alternating sides with a 0.08 s stagger by column, then drift linearly at ±speed px/s
// (alternating per row, or all one way); a mono kicker above ("• SCANNING YOUR NICHE FOR OUTLIERS") with a hard-blinking
// dot; the edges fade out through a vignette mask. Rows carry spare cards so no gap ever shows while drifting.
// Source: prompt-motion reyzostyle "opus 5.5 literally one" (reference only — our own rebuild).
ML.define({
  id: "ui.card-wall-marquee",
  category: "ui",
  name: "Thumbnail wall drifting in rows",
  does: "Rows of short-video thumbnails, logos or posts slide sideways in a dense grid, filling the frame with options.",
  says: ["choice", "scale", "list"],
  energy: 3,
  targets: ["card", "list", "stage"],
  duration: [2, 8],
  params: {
    rows: { type: "number", range: [2, 5], default: 3 },
    drift: { type: "choice", options: ["alternating", "same"], default: "alternating" },
    content: { type: "choice", options: ["thumbnails", "logos", "posts"], default: "thumbnails" },
    speed: { type: "number", range: [20, 60], default: 40, unit: "px/s" },
    kicker: { type: "text" },
  },
  pairs: ["camera.push-in", "ui.cursor-glide-click"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:reyzostyle-opus-5-5-literally-one", license: "reference", note: "our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    const rows = Math.round(ML.clamp(p.rows, 2, 5));
    const dirW = rtl ? -1 : 1;
    // the wall spans the stage's width in the picture band (kicker on top)
    const band = { y: f.pic.y, h: f.pic.h };
    const layer = mk("div", `position:absolute;left:0;top:${band.y}px;width:${f.W}px;height:${band.h}px;pointer-events:none;z-index:6;`, host);
    const picSlot = ctx.scene ? ctx.scene.querySelector(".ml-pic") : null; // the wall takes over the picture band
    layer.setAttribute("dir", rtl ? "rtl" : "ltr");
    const kfs = 30 * k;
    const kick = mk("div", `position:absolute;top:0;left:${f.m}px;right:${f.m}px;text-align:center;white-space:nowrap;overflow:hidden;font:var(--x-label-weight) ${kfs.toFixed(1)}px ${rtl ? "var(--x-body-font)" : "var(--x-label-font)"};letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:var(--x-label-case);color:var(--x-dim);`, layer);
    const dot = mk("span", `display:inline-block;width:${kfs * 0.5}px;height:${kfs * 0.5}px;border-radius:50%;background:var(--x-accent);margin-inline-end:${kfs * 0.6}px;vertical-align:0.08em;`, kick);
    mk("span", "", kick, p.kicker || (rtl ? "نبحث في مجالك عن الأكثر انتشارًا" : "Scanning your niche for outliers"));
    const wallTop = kfs * 2.4;
    const wall = mk("div", `position:absolute;left:0;right:0;top:${wallTop}px;bottom:0;overflow:hidden;`, layer);
    const vig = `linear-gradient(to right, transparent 0, #000 ${f.m * 1.6}px, #000 calc(100% - ${f.m * 1.6}px), transparent 100%)`;
    wall.style.maskImage = vig; wall.style.webkitMaskImage = vig;

    // card size from the room: rows fill the height, at least ~5.5 cards across
    const gap = 10 * 1.4 * k;
    const meta = p.content === "thumbnails" ? 30 * k : 0;
    const availH = band.h - wallTop;
    const cw = Math.min(f.W / (f.wide ? 10 : f.tall ? 4.8 : 6), ((availH - gap * (rows - 1)) / rows - meta) / 1.37);
    const ch = cw * 1.37, rowH = ch + meta;
    const pitch = cw + gap;
    const maxDrift = p.speed * k * 1.4 * Math.max(0, end - at) + 80 * k;
    const spare = Math.ceil(maxDrift / pitch) + 1;
    const across = Math.ceil(f.W / pitch) + 1;
    const cols = across + spare * 2;
    const offset0 = -spare * pitch;
    const blockH = rows * rowH + (rows - 1) * gap, y0 = Math.max(0, (availH - blockH) / 2);

    // a list target's entries become the thumbnail labels
    const given = ctx.el && ctx.el !== ctx.stage ? [...ctx.el.children].map((c) => c.textContent.trim()).filter(Boolean) : [];
    const LAB = given.length ? given : rtl ? ["اليوم ١", "تجربتي", "٩٠ يوم", "قبل/بعد", "سر", "روتين", "أول مرة", "النتيجة"] : ["Day 1", "POV", "90 days", "Before/after", "The secret", "Routine", "First try", "Result"];
    const VIEWS = ["1.2M", "840K", "3.4M", "96K", "2.1M", "410K", "5.8M", "770K"];
    const viewsWord = rtl ? "مشاهدة" : "views";
    const rowEls = [];
    for (let r = 0; r < rows; r++) {
      const row = mk("div", `position:absolute;left:0;top:${y0 + r * (rowH + gap)}px;height:${rowH}px;width:${cols * pitch}px;`, wall);
      row.setAttribute("dir", "ltr");
      const cells = [];
      for (let c = 0; c < cols; c++) {
        const i = r * 97 + c;
        const cell = mk("div", `position:absolute;left:${offset0 + c * pitch}px;top:0;width:${cw}px;height:${rowH}px;`, row);
        const mixA = Math.round(8 + ML.rnd(i, 2) * 30);
        let tile;
        if (p.content === "thumbnails") {
          tile = mk("div", `position:relative;width:${cw}px;height:${ch}px;border-radius:${(8 / 95) * cw}px;overflow:hidden;background:linear-gradient(${Math.round(150 + ML.rnd(i, 5) * 60)}deg, color-mix(in srgb, var(--x-accent) ${mixA}%, var(--x-ink)) 0%, var(--x-ink) 70%);`, cell);
          mk("div", `position:absolute;left:${(ML.rnd(i, 6) * 50).toFixed(1)}%;top:${(20 + ML.rnd(i, 7) * 40).toFixed(1)}%;width:${(cw * 0.6).toFixed(1)}px;height:${(cw * 0.6).toFixed(1)}px;border-radius:50%;background:color-mix(in srgb, var(--x-accent-2) ${Math.round(10 + ML.rnd(i, 8) * 30)}%, transparent);`, tile);
          mk("div", `position:absolute;${rtl ? "right" : "left"}:8%;bottom:8%;max-width:84%;padding:${cw * 0.03}px ${cw * 0.06}px;border-radius:${cw * 0.04}px;background:var(--x-panel);color:var(--x-ink);font:700 ${(cw * 0.11).toFixed(1)}px/1.1 ${rtl ? "var(--x-body-font)" : "var(--x-label-font)"};text-transform:var(--x-label-case);white-space:nowrap;overflow:hidden;`, tile, LAB[Math.floor(ML.rnd(i, 9) * LAB.length)]);
          const v = mk("div", `margin-top:${6 * k}px;font:500 ${(cw * 0.1).toFixed(1)}px ${rtl ? "var(--x-body-font)" : "var(--x-label-font)"};color:var(--x-dim);white-space:nowrap;text-align:start;`, cell, `${VIEWS[Math.floor(ML.rnd(i, 10) * VIEWS.length)]} ${viewsWord}`);
          v.setAttribute("dir", rtl ? "rtl" : "ltr");
        } else if (p.content === "logos") {
          tile = mk("div", `width:${cw}px;height:${ch}px;border-radius:${(8 / 95) * cw}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);display:grid;place-items:center;`, cell);
          const sh = ["M50 12 A38 38 0 1 0 50.1 12 Z", "M14 14 H86 V86 H14 Z", "M50 10 L90 86 L10 86 Z", "M50 8 L92 50 L50 92 L8 50 Z", "M20 20 H50 V50 H80 V80 H20 Z", "M10 50 Q50 0 90 50 Q50 100 10 50 Z"][Math.floor(ML.rnd(i, 3) * 6)];
          tile.innerHTML = `<svg viewBox="0 0 100 100" width="${(cw * 0.5).toFixed(1)}" height="${(cw * 0.5).toFixed(1)}"><path d="${sh}" fill="color-mix(in srgb, var(--x-ink) ${Math.round(55 + ML.rnd(i, 4) * 45)}%, var(--x-accent))"/></svg>`;
        } else {
          tile = mk("div", `width:${cw}px;height:${ch}px;box-sizing:border-box;padding:${cw * 0.08}px;border-radius:${(8 / 95) * cw}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);display:flex;flex-direction:column;gap:${cw * 0.06}px;`, cell);
          const head = mk("div", `display:flex;gap:${cw * 0.06}px;align-items:center;`, tile);
          mk("div", `width:${cw * 0.2}px;height:${cw * 0.2}px;border-radius:50%;background:color-mix(in srgb, var(--x-accent) ${Math.round(40 + ML.rnd(i, 4) * 60)}%, var(--x-accent-2));flex:none;`, head);
          mk("div", `flex:1;height:${cw * 0.06}px;border-radius:99px;background:var(--x-line);`, head);
          mk("div", `flex:1;border-radius:${cw * 0.05}px;background:linear-gradient(140deg, color-mix(in srgb, var(--x-accent) ${mixA + 20}%, var(--x-panel-2)), var(--x-panel-2));`, tile);
          for (const w of [90, 64]) mk("div", `width:${w}%;height:${cw * 0.05}px;border-radius:99px;background:var(--x-line);flex:none;`, tile);
        }
        cells.push(cell);
      }
      // drift direction per row; entering side = the side it drifts away from
      const d = (p.drift === "alternating" ? (r % 2 ? 1 : -1) : -1) * dirW;
      rowEls.push({ row, cells, d });
    }

    const tEnd = end - 0.35;
    ctx.sfx(at, "whoosh.soft", 0.35);
    return {
      draw(t) {
        layer.style.visibility = t < at - 0.01 ? "hidden" : "visible";
        layer.style.opacity = (1 - ML.lin(t, tEnd, end)).toFixed(4);
        if (picSlot) picSlot.style.opacity = t >= at - 0.01 && t < end ? (1 - ML.lin(t, at, at + 0.25) * (1 - ML.lin(t, tEnd, end))).toFixed(4) : "";
        kick.style.opacity = ML.lin(t, at, at + 0.3).toFixed(4);
        dot.style.opacity = t < at ? "0" : String(ML.blink(t - at, 0.9));
        rowEls.forEach(({ row, cells, d }, r) => {
          const run = Math.max(0, t - at);
          row.style.translate = `${(d * p.speed * k * 1.4 * run).toFixed(2)}px 0`;
          // enter from the side opposite the drift: columns nearest that side come first
          const from = -d; // +1 → enters from the right
          cells.forEach((c, ci) => {
            const visIdx = ci - spare; // 0 = the first on-screen column from the left
            const order = from > 0 ? across - 1 - visIdx : visIdx;
            const delay = ML.clamp(order, 0, across) * 0.08 + r * 0.04;
            const u = ML.expo(t, at + delay, at + delay + 0.6);
            c.style.opacity = Math.min(1, u * 2.5).toFixed(4);
            c.style.translate = `${((1 - u) * from * 50 * k).toFixed(2)}px 0`;
          });
        });
      },
    };
  },
});

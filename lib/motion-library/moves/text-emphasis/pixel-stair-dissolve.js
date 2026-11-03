// Pixel stair dissolve: the headline is drawn to a canvas (one fillText per word, so Arabic words stay shaped and
// whole) and read back once. Per frame the canvas is repainted from that read-back: each row band (`row` px tall) is
// cut into `block`-px cells and a cell is filled where the glyphs cover it, so the letter edges turn into a jagged
// low-res staircase (a finer step for two frames, then the full block), held `hold` s. Then every row smears sideways
// — a seeded offset of up to ±60 px re-drawn each 30 fps frame, stretched scaleX 1 → 3 from its trailing edge,
// thinning, fading 1 → 0 over 0.35 s power2.in — some streaks in the accent, the rest in the glyphs' own ink. It works
// on rows of pixels, never on letters, so joined scripts are never split.
// Source: prompt-motion:tolgayhickiran-motion-graphics-from-a (reference) — our own rebuild.
ML.define({
  id: "text-emphasis.pixel-stair-dissolve",
  category: "text-emphasis",
  name: "Letter edges stair-step into pixels, then streak away",
  does: "The headline's glyph edges turn into a jagged low-res staircase, hold, then its rows smear sideways into streaks and vanish.",
  says: ["change", "transition", "tech"],
  energy: 4,
  targets: ["headline", "word"],
  duration: [0.5, 1.2],
  params: {
    block: { type: "number", range: [8, 24], default: 14, unit: "px" },
    row: { type: "number", range: [4, 12], default: 8, unit: "px" },
    streak: { type: "choice", options: ["left", "right", "both"], default: "both" },
    hold: { type: "number", range: [0.1, 0.4], default: 0.15, unit: "s" },
  },
  pairs: ["text-emphasis.slice-glitch", "transition.glitch-bar-wipe"],
  avoid: ["calm", "luxury", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.heavy",
  source: { from: "prompt-motion:tolgayhickiran-motion-graphics-from-a", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at } = ctx;
    if (!el) return null;
    const host = ctx.scene || ctx.stage, W = ctx.f.W, H = ctx.f.H;
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize) || 104, k = Math.max(0.4, Math.min(2.5, fs / 104));
    // whole pixels: the cells index the read-back, so a fractional size would read nothing and lose the glyphs
    const block = Math.max(2, Math.round(ML.clamp(p.block, 8, 24) * k)), row = Math.max(2, Math.round(ML.clamp(p.row, 4, 12) * k));
    // the glyphs, drawn once off screen at their laid-out places
    const words = ML.split(el, "words");
    const off = document.createElement("canvas"); off.width = W; off.height = H;
    const o = off.getContext("2d", { willReadFrequently: true });
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const w of words.length ? words : [el]) {
      const b = ctx.box(w), ws = getComputedStyle(w);
      if (!b.w || !b.h) continue;
      o.font = `${ws.fontStyle} ${ws.fontWeight} ${ws.fontSize} ${ws.fontFamily}`;
      try { o.letterSpacing = ws.letterSpacing === "normal" ? "0px" : ws.letterSpacing; } catch (e) { /* older canvas */ }
      o.fillStyle = "#000";
      const raw = w.textContent, ar = ML.ARABIC.test(raw);
      const text = ws.textTransform === "uppercase" ? raw.toUpperCase() : ws.textTransform === "lowercase" ? raw.toLowerCase() : raw;
      o.direction = ar ? "rtl" : "ltr"; o.textAlign = ar ? "right" : "left"; o.textBaseline = "alphabetic";
      const m = o.measureText(text), asc = m.fontBoundingBoxAscent || parseFloat(ws.fontSize) * 0.8, desc = m.fontBoundingBoxDescent || parseFloat(ws.fontSize) * 0.2;
      o.fillText(text, ar ? b.x + b.w : b.x, b.y + (b.h - asc - desc) / 2 + asc);
      x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h);
    }
    if (!(x1 > x0)) return null;
    x0 = Math.max(0, Math.floor(x0 - 8)); y0 = Math.max(0, Math.floor(y0 - 8)); x1 = Math.min(W, Math.ceil(x1 + 8)); y1 = Math.min(H, Math.ceil(y1 + 8));
    const data = o.getImageData(x0, y0, x1 - x0, y1 - y0).data, RW = x1 - x0;
    const covered = (cx, cy, cw, ch) => {
      let n = 0, on = 0;
      const sx = Math.max(1, Math.floor(cw / 6)), sy = Math.max(1, Math.floor(ch / 4));
      for (let y = cy; y < cy + ch && y < y1; y += sy) for (let x = cx; x < cx + cw && x < x1; x += sx) { n++; if (data[((y - y0) * RW + (x - x0)) * 4 + 3] > 110) on++; }
      return n ? on / n : 0;
    };
    // a staircase at one block size: per row band, the runs of filled cells
    const grid = (bw) => {
      const rows = [];
      for (let y = y0, i = 0; y < y1; y += row, i++) {
        const runs = [];
        let start = -1;
        for (let x = x0; x < x1 + bw; x += bw) {
          const f = x < x1 && covered(x, y, bw, row) > 0.33;
          if (f && start < 0) start = x;
          if (!f && start >= 0) { runs.push([start, x - start]); start = -1; }
        }
        if (runs.length) rows.push({ i, y, runs });
      }
      return rows;
    };
    const fine = grid(Math.max(3, Math.round(block * 0.45))), coarse = grid(block);
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H; cv.setAttribute("aria-hidden", "true");
    Object.assign(cv.style, { position: "absolute", left: "0", top: "0", width: W + "px", height: H + "px", pointerEvents: "none", zIndex: "6" });
    host.append(cv);
    const g = cv.getContext("2d");
    const ink = cs.color, accent = getComputedStyle(el).getPropertyValue("--x-accent").trim() || ink;
    const t1 = at + 0.05, S = t1 + p.hold, E = S + 0.35;
    ctx.sfx(at, "blip", 0.3);
    ctx.sfx(S, "whoosh.heavy", 0.5);
    const sides = (i) => (p.streak === "left" ? -1 : p.streak === "right" ? 1 : ML.rnd(i, 7) < 0.5 ? -1 : 1);
    return {
      draw(t) {
        g.clearRect(0, 0, W, H);
        if (t < at) { el.style.opacity = "1"; return; }
        el.style.opacity = "0";
        if (t >= E) return;
        if (t < S) {
          g.fillStyle = ink;
          for (const r of t < t1 ? fine : coarse) for (const [x, w] of r.runs) g.fillRect(x, r.y, w, row + 0.5);
          return;
        }
        const u = ML.lin(t, S, E), e = u * u, f = Math.floor((t - S) * 30);
        g.globalAlpha = Math.max(0, 1 - e);
        for (const r of coarse) {
          const sgn = sides(r.i);
          const a = r.runs[0][0], b = r.runs[r.runs.length - 1][0] + r.runs[r.runs.length - 1][1];
          const anchor = sgn > 0 ? a : b, sx = 1 + 2 * e;
          const dx = sgn * 60 * k * (0.35 * ML.rnd(r.i, 3) + 0.65 * ML.rnd(r.i * 31 + f, 5)) * Math.min(1, u * 3);
          const h = row * (1 - 0.55 * e);
          g.fillStyle = ML.rnd(r.i, 11) < 0.22 ? accent : ink;
          for (const [x, w] of r.runs) g.fillRect(anchor + (x - anchor) * sx + dx, r.y + (row - h) / 2, w * sx + 0.5, h);
        }
        g.globalAlpha = 1;
      },
    };
  },
});

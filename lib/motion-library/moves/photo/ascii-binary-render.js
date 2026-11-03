// Binary-digit render: the picture (or logo) is sampled on a grid of mono cells; every inside cell becomes a glyph —
// "0" mostly and a seeded share of "1"s (binary), or a glyph picked by the cell's luminance from a density ramp
// (ascii-ramp). Cells scramble through seeded glyphs every 2 frames, then lock to their target glyph on a seeded
// delay (a locking cell flashes in the accent); cells on the shape's edge keep flickering on a per-cell schedule.
// Blue and red offset copies 1–2 px off give the chromatic fringe. The push scales the grid 1 → push_to on power2.in
// and every glyph is re-drawn as text at the new scale (never a scaled raster), so the digits stay crisp. The end:
// stay as glyphs, turn into a dot matrix (rounded squares sized by luminance, the accent for highlights), or dissolve
// to the picture itself. Painted on a canvas from t only; the source is sampled once in setup.
// Source: prompt-motion jacksonfall-opus-5-5-on-xhigh + kyonax-on-tech-yes-i-also-did (reference only — our own code).
ML.define({
  id: "photo.ascii-binary-render",
  category: "photo",
  name: "Binary-digit render",
  does: "The mark appears built from columns of 0s and 1s with chromatic fringes while the camera pushes into the digits.",
  says: ["tech", "brand", "change"],
  energy: 3,
  targets: ["logo", "image"],
  duration: [1, 3],
  params: {
    chars: { type: "choice", options: ["binary", "ascii-ramp"], default: "binary" },
    cell: { type: "number", range: [8, 16], default: 12, unit: "px" },
    ones_share: { type: "number", range: [0.05, 0.4], default: 0.15 },
    colour: { type: "text", default: "var(--x-accent-2)" },
    fringe: { type: "number", range: [0, 3], default: 1.5, unit: "px" },
    push: { type: "bool", default: true },
    push_to: { type: "number", range: [1.2, 3], default: 2.5 },
    end: { type: "choice", options: ["ascii", "dots", "image"], default: "ascii" },
    ground: { type: "choice", options: ["auto", "dark", "none"], default: "auto" },
  },
  pairs: ["camera.push-in", "transition.glitch-noise-burst"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "riser",
  source: { from: "prompt-motion:jacksonfall-opus-5-5-on-xhigh", license: "reference", note: "also prompt-motion:kyonax-on-tech-yes-i-also-did; rebuilt as our own canvas code" },
  async setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const host = el.offsetParent || el.parentElement;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    // the target's box in the host's px (an <svg> has no offset* of its own)
    const hr = host.getBoundingClientRect(), er = el.getBoundingClientRect(), k = hr.width / (host.offsetWidth || 1) || 1;
    const L0 = (er.left - hr.left) / k - host.clientLeft, T0 = (er.top - hr.top) / k - host.clientTop, W = er.width / k, H = er.height / k;
    if (!W || !H) return null;
    const isLogo = el.tagName.toLowerCase() === "svg" || el.dataset.slot === "logo";
    const dark = p.ground === "dark" || (p.ground === "auto" && !isLogo);
    // the canvas sits over the target: a picture on its dark ground clips the push to its box, a mark on the scene's
    // ground has no box to show, so it gets room to grow through the whole push (a hard crop there reads as a bug)
    const bx = !dark && p.push ? (W * (p.push_to - 1)) / 2 : 0, by = !dark && p.push ? (H * (p.push_to - 1)) / 2 : 0;
    const cv = document.createElement("canvas"), dpr = window.devicePixelRatio || 1;
    cv.width = Math.round((W + 2 * bx) * dpr); cv.height = Math.round((H + 2 * by) * dpr);
    const radius = bx ? "0" : getComputedStyle(el).borderRadius;
    cv.style.cssText = `position:absolute;left:${L0 - bx}px;top:${T0 - by}px;width:${W + 2 * bx}px;height:${H + 2 * by}px;border-radius:${radius};pointer-events:none`;
    el.after(cv);
    const g = cv.getContext("2d");
    // look colours, resolved once
    const probe = document.createElement("span"); host.append(probe);
    const col = (css) => { probe.style.color = ""; probe.style.color = css; return getComputedStyle(probe).color; };
    const C = { glyph: col(p.colour || "var(--x-accent-2)") || col("var(--x-accent-2)"), lock: col("var(--x-accent)"), red: col("var(--x-bad)"), blue: col("var(--x-accent)"), ground: col("var(--x-device)") };
    if (isLogo) C.glyph = col(p.colour && p.colour !== "var(--x-accent-2)" ? p.colour : "var(--x-accent)");
    // the glow is for digits on a dark field; on a light ground it only muddies them
    const groundRgb = (col("var(--x-ground)").match(/[\d.]+/g) || [255, 255, 255]).map(Number);
    const glow = dark || 0.2126 * groundRgb[0] + 0.7152 * groundRgb[1] + 0.0722 * groundRgb[2] < 100;
    const mono = getComputedStyle(el).getPropertyValue("--x-mono-font").trim() || "monospace"; // the target's own look
    probe.remove();
    // the grid: cells relative to the target (a small logo gets finer cells)
    const cw = Math.max(4, Math.min(p.cell, H / 9, W / 9)), ch = cw * 1.3;
    const cols = Math.max(2, Math.floor(W / cw)), rows = Math.max(2, Math.floor(H / ch));
    const ox = (W - cols * cw) / 2, oy = (H - rows * ch) / 2;
    // sample the source once (luminance + inside) at grid resolution
    const off = document.createElement("canvas"); off.width = cols; off.height = rows;
    const og = off.getContext("2d", { willReadFrequently: true });
    let src = null;
    if (el.tagName === "IMG") src = el;
    else if (el.tagName.toLowerCase() === "svg") {
      const svg = el.cloneNode(true); svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      // the box it shows at: a CSS-sized <svg> has no size of its own as a picture
      svg.setAttribute("width", W); svg.setAttribute("height", H);
      const im = new Image(); im.src = "data:image/svg+xml;utf8," + encodeURIComponent(new XMLSerializer().serializeToString(svg));
      await im.decode().catch(() => {}); src = im;
    } else { const im = el.querySelector("img"); if (im) src = im; }
    let data = null;
    try {
      if (src) {
        let sx = 0, sy = 0, sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
        if (src === el && getComputedStyle(el).objectFit === "cover" && sw && sh) { const k = Math.max(W / sw, H / sh); const vw = W / k, vh = H / k; sx = (sw - vw) / 2; sy = (sh - vh) / 2; sw = vw; sh = vh; }
        og.drawImage(src, sx, sy, sw, sh, 0, 0, cols, rows);
        data = og.getImageData(0, 0, cols, rows).data;
      } else if (isLogo && (el.textContent || "").trim()) {
        // a wordmark set as live text: its own face and size on the grid (canvas text joins Arabic), so the digits take its shape
        const fs0 = getComputedStyle(el);
        og.setTransform(cols / W, 0, 0, rows / H, 0, 0);
        og.font = `${fs0.fontStyle} ${fs0.fontWeight} ${fs0.fontSize} ${fs0.fontFamily}`;
        og.direction = fs0.direction; og.textAlign = "center"; og.textBaseline = "middle"; og.fillStyle = "#000";
        og.fillText(el.textContent.trim(), W / 2, H / 2);
        og.setTransform(1, 0, 0, 1, 0, 0);
        data = og.getImageData(0, 0, cols, rows).data;
      }
    } catch (e) { data = null; } // a cross-origin picture cannot be read: fall back to a seeded field
    const N = cols * rows, lum = new Float32Array(N), inside = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (data) { const r = data[i * 4], gg = data[i * 4 + 1], b = data[i * 4 + 2], a = data[i * 4 + 3] / 255; lum[i] = isLogo ? a : ((0.2126 * r + 0.7152 * gg + 0.0722 * b) / 255) * a; inside[i] = isLogo ? (a > 0.4 ? 1 : 0) : 1; }
      else { const x = (i % cols) / cols, y = Math.floor(i / cols) / rows; lum[i] = 0.5 + 0.35 * Math.sin(x * 6 + y * 3) * Math.cos(y * 5 - x * 2); inside[i] = 1; }
    }
    // stretch the picture's luminance to the full range so the glyph field reads as the picture
    if (!isLogo) { let lo = 1, hi = 0; for (let i = 0; i < N; i++) { lo = Math.min(lo, lum[i]); hi = Math.max(hi, lum[i]); } if (hi - lo > 0.02) for (let i = 0; i < N; i++) lum[i] = (lum[i] - lo) / (hi - lo); }
    // an edge cell: inside, with an outside neighbour — it keeps flickering
    const edge = new Uint8Array(N);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const i = y * cols + x; if (!inside[i]) continue; const n = (dx, dy) => { const X = x + dx, Y = y + dy; return X < 0 || Y < 0 || X >= cols || Y >= rows ? 0 : inside[Y * cols + X]; }; if (!n(1, 0) || !n(-1, 0) || !n(0, 1) || !n(0, -1)) edge[i] = 1; }
    const RAMP = " .:-=+*#%@", SCR = "01ABCDEF#%$&@*+=<>/\\|";
    const target = new Array(N), appear = new Float32Array(N), lock = new Float32Array(N);
    const D = ML.clamp(end - at, 1, 3), dir = ctx.rtl ? -1 : 1;
    for (let i = 0; i < N; i++) {
      target[i] = p.chars === "ascii-ramp" ? RAMP[Math.min(RAMP.length - 1, Math.floor(lum[i] * RAMP.length))] : ML.rnd(i, 3) < p.ones_share ? "1" : "0";
      // the build sweeps in reading direction with seeded scatter
      const x = (i % cols) / cols, sweep = dir > 0 ? x : 1 - x;
      appear[i] = at + D * 0.25 * (0.6 * sweep + 0.4 * ML.rnd(i, 5));
      lock[i] = appear[i] + D * 0.08 + D * 0.22 * ML.rnd(i, 7);
    }
    const pushA = at + D * 0.35, pushB = pushA + Math.min(1, D * 0.5);
    const endA = at + D * 0.68, endB = at + D * 0.88;
    ctx.sfx(at, "riser", 0.35);
    if (p.end !== "ascii") ctx.sfx(endA, "blip", 0.25);
    const baseOpacity = parseFloat(getComputedStyle(el).opacity); // NaN never: computed opacity is always a number
    return {
      draw(t) {
        g.setTransform(dpr, 0, 0, dpr, bx * dpr, by * dpr);
        g.clearRect(-bx, -by, W + 2 * bx, H + 2 * by);
        if (t < at) { cv.style.visibility = "hidden"; el.style.opacity = String(baseOpacity); return; }
        cv.style.visibility = "visible";
        const fin = p.end === "ascii" ? 0 : ML.ease(t, endA, endB);
        const toImage = p.end === "image" ? fin : 0, toDots = p.end === "dots" ? fin : 0;
        // power2.in; a dissolve to the picture pulls the push back out, so the digits land registered on what they drew
        const pin = ML.lin(t, pushA, pushB), s = p.push ? 1 + (p.push_to - 1) * pin * pin * (1 - toImage) : 1;
        // the ground and the source swap over a few frames as the digits start, never a hard pop
        const inn = ML.lin(t, at, at + 0.15);
        el.style.opacity = String(baseOpacity * Math.max(1 - inn, toImage));
        if (dark) { g.globalAlpha = inn * (1 - toImage); g.fillStyle = C.ground; g.fillRect(0, 0, W, H); }
        const frame = Math.floor(t * 15); // a new scramble glyph every 2 frames at 30 fps
        const sz = cw * 1.08 * s;
        g.font = `600 ${sz.toFixed(2)}px ${mono}`; g.textAlign = "center"; g.textBaseline = "middle";
        const cx = W / 2, cy = H / 2, f = p.fringe * Math.max(1, s * 0.7);
        const cells = [];
        for (let i = 0; i < N; i++) {
          if (!inside[i] || t < appear[i]) continue;
          if (edge[i] && t > lock[i] && ML.rnd(i * 31 + Math.floor(t * 6), 9) < 0.18) continue; // edge flicker
          const x = cx + (ox + ((i % cols) + 0.5) * cw - cx) * s, y = cy + (oy + (Math.floor(i / cols) + 0.5) * ch - cy) * s;
          if (x < -bx - sz || x > W + bx + sz || y < -by - sz || y > H + by + sz) continue;
          const locked = t >= lock[i];
          const ch2 = locked ? target[i] : SCR[Math.floor(ML.rnd(i, frame) * SCR.length)];
          const flash = locked ? 1 - ML.clamp((t - lock[i]) / 0.18) : 0;
          const a = isLogo ? 1 : 0.14 + 0.86 * Math.pow(lum[i], 1.4);
          cells.push([x, y, ch2, flash, a, i]);
        }
        const glyphA = (1 - toImage) * (1 - toDots);
        if (glyphA > 0.002) {
          // fringe copies first, then the glyphs
          if (f > 0.05) {
            g.globalCompositeOperation = dark ? "lighter" : "source-over";
            g.globalAlpha = 0.55 * glyphA; g.fillStyle = C.red; for (const c of cells) g.fillText(c[2], c[0] - f, c[1]);
            g.fillStyle = C.blue; for (const c of cells) g.fillText(c[2], c[0] + f, c[1] + f * 0.3);
            g.globalCompositeOperation = "source-over";
          }
          if (glow && cells.length < 2600) { g.shadowColor = C.glyph; g.shadowBlur = sz * 0.5; }
          for (const c of cells) { g.globalAlpha = c[4] * glyphA; g.fillStyle = c[3] > 0.5 ? C.lock : C.glyph; g.fillText(c[2], c[0], c[1]); }
          g.shadowBlur = 0;
        }
        if (toDots > 0.002) {
          // the dot matrix: each cell a rounded square sized by its luminance, highlights in the accent
          for (const c of cells) {
            const L = lum[c[5]], q = Math.max(0.12, isLogo ? 0.85 : L) * cw * 0.9 * s;
            g.globalAlpha = toDots * (0.4 + 0.6 * (isLogo ? 1 : L));
            g.fillStyle = L > 0.75 ? C.lock : C.glyph;
            g.beginPath(); g.roundRect(c[0] - q / 2, c[1] - q / 2, q, q, q * 0.3); g.fill();
          }
        }
        g.globalAlpha = 1;
      },
    };
  },
});

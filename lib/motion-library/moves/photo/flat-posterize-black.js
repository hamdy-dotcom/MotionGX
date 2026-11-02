// Flat posterize with black masses: a photo reduced to a few flat mid-tone colours plus large solid black shapes, like
// a flat-with-black spot illustration. The luminance is smoothed (two box passes, so the band edges stay clean, no
// speckle), then cut into bands by share of the picture: the deepest black_share (20-40 % of the area, the style's
// black budget) becomes the ink, the next bands map to the look's mid-tones (accent, good, accent-2, a soft accent-2),
// each split into its flat colour and one flat darker shade step (never a gradient), and the lightest tenth goes to the
// paper. Optional thin light seam lines run through the black masses (the style's white detail lines on black).
// Animate: static (settles in), wipe (photo -> poster along the reading direction) or bands-in (bands land darkest
// first). The photo is sampled at no more than its own pixels; the band map is computed once, every frame from t.
// Source: MengTo/Skills illustration/illustration-flat-with-black (MIT): palette roles and black budget from SKILL.md
// and scripts/parts.mjs (ink #15202f -> the look's ink; mid-tones -> the look's accents; paper -> its panel).
ML.define({
  id: "photo.flat-posterize-black",
  category: "photo",
  name: "Flat posterize with black masses",
  does: "A photo is reduced to a few flat mid-tone colours plus large solid black shapes, like a flat illustration.",
  says: ["simplicity", "brand", "story"],
  energy: 2,
  targets: ["image", "screen"],
  duration: [1, 20],
  params: {
    bands: { type: "number", range: [3, 5], default: 4 },
    palette: { type: "text", default: "look accents" },
    black_share: { type: "number", range: [0.2, 0.4], default: 0.3 },
    seams: { type: "bool", default: false },
    animate: { type: "choice", options: ["static", "wipe", "bands-in"], default: "static" },
  },
  pairs: ["photo.edge-grain", "photo.halftone"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "MengTo/Skills:illustration/illustration-flat-with-black/scripts/parts.mjs", license: "MIT" },
  async setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const host = ctx.scene || ctx.stage;
    const pic = el.tagName === "IMG" ? el : el.querySelector("img");
    if (!pic) return null;
    try { await pic.decode(); } catch (e) { /* as it is */ }
    const b = ctx.box(el.tagName === "IMG" ? el : pic);
    if (b.w < 8 || b.h < 8) return null;
    const mk = (tag, css, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (parent) parent.append(e); return e; };
    const tc = document.createElement("canvas"); tc.width = tc.height = 1; const tg = tc.getContext("2d", { willReadFrequently: true });
    const toRgb = (css) => { const pr = mk("span", `color:${css}`, host); tg.clearRect(0, 0, 1, 1); tg.fillStyle = getComputedStyle(pr).color; tg.fillRect(0, 0, 1, 1); pr.remove(); return [...tg.getImageData(0, 0, 1, 1).data.slice(0, 3)]; };
    const radius = getComputedStyle(el).borderRadius || "0px";
    const wrap = mk("div", `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;overflow:hidden;border-radius:${radius};pointer-events:none;visibility:hidden;z-index:3`, host);
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const cw = Math.round(b.w * DPR), chh = Math.round(b.h * DPR);
    const cv = mk("canvas", `position:absolute;inset:0;width:${b.w}px;height:${b.h}px`, wrap);
    cv.width = cw; cv.height = chh;
    const g = cv.getContext("2d");
    // ── luminance at no more than the picture's pixels (object-fit cover crop) ──
    const nw = pic.naturalWidth || b.w, nh = pic.naturalHeight || b.h, sc = Math.max(b.w / nw, b.h / nh);
    const srcW = b.w / sc, srcH = b.h / sc;
    const sw = Math.max(8, Math.round(Math.min(srcW, cw / 2))), sh = Math.max(8, Math.round(Math.min(srcH, chh / 2)));
    let L = new Float32Array(sw * sh);
    try {
      const off = document.createElement("canvas"); off.width = sw; off.height = sh;
      const o = off.getContext("2d", { willReadFrequently: true });
      o.drawImage(pic, (nw - srcW) / 2, (nh - srcH) / 2, srcW, srcH, 0, 0, sw, sh);
      const d = o.getImageData(0, 0, sw, sh).data;
      for (let i = 0; i < sw * sh; i++) L[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
    } catch (e) {
      for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) L[y * sw + x] = 0.25 + 0.6 * Math.min(1, Math.hypot(x / sw - 0.6, y / sh - 0.4));
    }
    // smooth before thresholding (two 3x3 box passes ~ a small blur / median) so bands have clean edges
    const box3 = (A) => { const B = new Float32Array(A.length); for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { let s = 0, c = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const xx = x + i, yy = y + j; if (xx >= 0 && yy >= 0 && xx < sw && yy < sh) { s += A[yy * sw + xx]; c++; } } B[y * sw + x] = s / c; } return B; };
    L = box3(box3(L));
    // band thresholds by share of the area: ink | mids (each split in colour + shade) | paper (top tenth)
    const sorted = Float32Array.from(L).sort();
    const q = (x) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(x * sorted.length)))];
    const nb = Math.round(ML.clamp(p.bands, 3, 5)), mids = nb - 1, share = ML.clamp(p.black_share, 0.15, 0.45);
    const cuts = [q(share)]; // ink below this
    for (let m = 1; m <= mids; m++) cuts.push(q(share + ((0.9 - share) * m) / mids)); // last = the paper cut
    // palette: the look's mid-tones (darker ones go to the darker bands) or the brand's list
    const given = String(p.palette || "").trim();
    const midCss = /^look/i.test(given) || !given
      ? ["var(--x-accent)", "var(--x-good)", "var(--x-accent-2)", "color-mix(in srgb, var(--x-accent-2) 45%, var(--x-panel))"]
      : given.split(",").map((x) => x.trim()).filter(Boolean);
    const INK = toRgb("var(--x-ink)"), PAPER = toRgb("var(--x-panel)");
    const mid = midCss.map(toRgb).sort((a, c) => (a[0] * 0.21 + a[1] * 0.72 + a[2] * 0.07) - (c[0] * 0.21 + c[1] * 0.72 + c[2] * 0.07));
    const pickMid = (m) => mid[Math.round((m / Math.max(1, mids - 1)) * (mid.length - 1)) % mid.length] || mid[0];
    const shade = (c) => c.map((v, i) => Math.round(v * 0.8 + INK[i] * 0.2));
    // colours per band index: 0 ink, 1..2*mids (colour/shade pairs, shade first), last paper
    const cols = [INK];
    for (let m = 0; m < mids; m++) { const c = pickMid(m); cols.push(shade(c), c); }
    cols.push(PAPER);
    // band of a luminance value
    const bandOf = (v) => {
      if (v < cuts[0]) return 0;
      for (let m = 0; m < mids; m++) { const a = cuts[m], c = cuts[m + 1]; if (v < c) return 1 + m * 2 + (v < (a + c) / 2 ? 0 : 1); }
      return cols.length - 1;
    };
    // bilinear luminance at canvas resolution (an interpolated field, thresholded: smooth band edges)
    const Lat = (x, y) => { const fx = ML.clamp(x * (sw - 1), 0, sw - 1), fy = ML.clamp(y * (sh - 1), 0, sh - 1), i = Math.floor(fx), j = Math.floor(fy), i1 = Math.min(sw - 1, i + 1), j1 = Math.min(sh - 1, j + 1), u = fx - i, v = fy - j; return (L[j * sw + i] * (1 - u) + L[j * sw + i1] * u) * (1 - v) + (L[j1 * sw + i] * (1 - u) + L[j1 * sw + i1] * u) * v; };
    const band = new Uint8Array(cw * chh), lum = new Float32Array(cw * chh);
    for (let y = 0; y < chh; y++) for (let x = 0; x < cw; x++) { const v = Lat(x / (cw - 1), y / (chh - 1)); lum[y * cw + x] = v; band[y * cw + x] = bandOf(v); }
    // seams: a thin light line along an iso-line inside the black masses
    const seam = new Uint8Array(cw * chh);
    if (p.seams) {
      const s = cuts[0] * 0.55, wpx = Math.max(1, Math.round(1.2 * DPR * (b.w / 600)));
      for (let y = wpx; y < chh - wpx; y++) for (let x = wpx; x < cw - wpx; x++) {
        const i = y * cw + x; if (band[i] !== 0) continue;
        const a = lum[i] >= s; if ((lum[i - wpx] >= s) !== a || (lum[i - wpx * cw] >= s) !== a) seam[i] = 1;
      }
    }
    // one canvas per band (bands-in needs them apart); the whole poster for static / wipe
    const paint = (only) => { const c = document.createElement("canvas"); c.width = cw; c.height = chh; const o = c.getContext("2d"); const im = o.createImageData(cw, chh), d = im.data; for (let i = 0; i < cw * chh; i++) { const bi = band[i]; if (only != null && bi !== only && !(only === 0 && seam[i])) continue; const col = seam[i] ? PAPER : cols[bi]; d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255; } o.putImageData(im, 0, 0); return c; };
    const poster = paint(null);
    const layers = p.animate === "bands-in" ? cols.map((_, i) => paint(i)) : [];
    // the photo under the wipe / before the bands land
    const photo = pic.cloneNode(true);
    photo.removeAttribute("data-slot"); photo.removeAttribute("data-slot-sample");
    photo.style.cssText = "position:absolute;inset:0;width:100%;height:100%;max-width:none;margin:0;border-radius:0;object-fit:cover";
    wrap.insertBefore(photo, cv);
    const step = 0.11, land = 0.22, wipe = 0.8;
    ctx.sfx(at, "swell", 0.22);
    return {
      draw(t) {
        const on = t >= at - 1e-6 && t < end;
        wrap.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        const leave = ML.lin(t, end - 0.25, end);
        wrap.style.opacity = (1 - leave).toFixed(4);
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, cw, chh);
        if (p.animate === "static") { g.globalAlpha = ML.ease(t, at, at + 0.35); g.drawImage(poster, 0, 0); }
        else if (p.animate === "wipe") {
          const e = ML.ease(t, at, at + wipe) * (cw + 8 * DPR);
          g.save(); g.beginPath();
          if (ctx.rtl) g.rect(cw - e, 0, e, chh); else g.rect(0, 0, e, chh);
          g.clip(); g.globalAlpha = 1; g.drawImage(poster, 0, 0); g.restore();
          if (e > 0 && e < cw) { const x = ctx.rtl ? cw - e : e; g.fillStyle = `rgb(${INK.join(",")})`; g.fillRect(x - 1.5 * DPR, 0, 3 * DPR, chh); }
        } else {
          // darkest first: the ink, then each band up to the paper
          layers.forEach((c, i) => { const u = ML.ease(t, at + i * step, at + i * step + land); if (u <= 0) return; g.globalAlpha = u; g.drawImage(c, 0, 0); });
        }
        g.globalAlpha = 1;
      },
    };
  },
});

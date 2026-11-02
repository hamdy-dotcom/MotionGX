// Letter becomes a window onto an image: the counter (the enclosed hole) of one letter — the "O" — fills with a vivid
// picture or pattern, a peek into the next scene. The counters are found, not guessed: each word is drawn once in setup
// into a canvas with the element's own computed font, the background is flood-filled from the edges, and what stays
// unfilled are the holes (so it works for any face, and for Arabic, whose joined words are drawn whole and never
// split — م و ه ف ق ص ط all have counters). letter_index picks the n-th sizeable counter in reading order. The hole
// becomes a mask (intersected with a circle that grows from a small blob, r 0 → full over `grow`, power2.out); inside,
// the picture scales 1.3 → 1. Meanwhile the rest of the word starts to motion-blur sideways (a horizontal-only SVG
// blur on the text; the window stays sharp). Usually followed by transition.zoom-through-mask.
// Source: prompt-motion zaqailo-the-consistency-of-opus (reference only: our own rebuild).
ML.define({
  id: "mask.letter-window-image",
  category: "mask",
  name: "Letter becomes a window onto an image",
  does: "The counter of one letter (the 'O') fills with a vivid image, a peek into the next scene.",
  says: ["reveal", "transition"],
  energy: 3,
  targets: ["word", "image"],
  duration: [0.5, 1.2],
  params: {
    letter_index: { type: "number", range: [0, 20], default: 0 },
    content: { type: "choice", options: ["image", "video", "pattern"], default: "image" },
    grow: { type: "number", range: [0.25, 0.6], default: 0.4, unit: "s" },
    word_blur: { type: "bool", default: true },
  },
  pairs: ["transition.zoom-through-mask", "text-in.punchline"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "prompt-motion:zaqailo-the-consistency-of-opus", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, stage } = ctx;
    if (!el) return null;
    const host = ctx.scene || stage;
    // the word: the target, or (target is a picture) the headline that gets the window
    let word = el, picEl = null;
    if (el.tagName === "IMG") { picEl = el; word = host.querySelector(".ml-title, .ml-hero, [data-slot='headline']"); if (!word) return null; }
    const k = (stage.getBoundingClientRect().width / (stage.offsetWidth || 1)) || 1;
    const sb = stage.getBoundingClientRect();
    const cs = getComputedStyle(word), size = parseFloat(cs.fontSize) || 60, S = 2;
    const font = `${cs.fontStyle} ${cs.fontWeight} ${size * S}px ${cs.fontFamily}`;
    const caps = cs.textTransform === "uppercase" ? (s) => s.toUpperCase() : cs.textTransform === "lowercase" ? (s) => s.toLowerCase() : (s) => s;

    // every word's box (a Range over its characters: nothing is wrapped or split)
    const words = [];
    const walker = document.createTreeWalker(word, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const re = /\S+/g; let m;
      while ((m = re.exec(n.textContent))) {
        const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
        const rc = r.getClientRects()[0]; if (!rc || !rc.width) continue;
        words.push({ text: caps(m[0]), x: (rc.left - sb.left) / k, y: (rc.top - sb.top) / k, w: rc.width / k, h: rc.height / k, rtl: ML.ARABIC.test(m[0]) });
      }
    }
    // the holes of each word, in reading order
    const holes = [];
    for (const w of words) {
      const pad = 6, cw = Math.ceil((w.w + pad * 2) * S), ch = Math.ceil((w.h + pad * 2) * S);
      const cv = document.createElement("canvas"); cv.width = cw; cv.height = ch;
      const g = cv.getContext("2d", { willReadFrequently: true });
      g.font = font; g.direction = w.rtl ? "rtl" : "ltr"; g.textAlign = "left"; g.textBaseline = "alphabetic";
      try { g.letterSpacing = cs.letterSpacing === "normal" ? "0px" : (parseFloat(cs.letterSpacing) * S) + "px"; } catch (e) { /* older canvas */ }
      const mt = g.measureText(w.text), asc = mt.fontBoundingBoxAscent || size * S * 0.9;
      g.fillStyle = "#000"; g.fillText(w.text, pad * S, pad * S + asc);
      const a = g.getImageData(0, 0, cw, ch).data, N = cw * ch, ink = new Uint8Array(N), lab = new Int32Array(N);
      for (let i = 0; i < N; i++) ink[i] = a[i * 4 + 3] > 90 ? 1 : 0;
      // flood the outside from the canvas edges (label -1)
      const q = new Int32Array(N); let qh = 0, qt = 0;
      const push = (i, v) => { if (!ink[i] && !lab[i]) { lab[i] = v; q[qt++] = i; } };
      for (let x = 0; x < cw; x++) { push(x, -1); push((ch - 1) * cw + x, -1); }
      for (let y = 0; y < ch; y++) { push(y * cw, -1); push(y * cw + cw - 1, -1); }
      const spread = (v) => { while (qh < qt) { const i = q[qh++], x = i % cw; if (x > 0) push(i - 1, v); if (x < cw - 1) push(i + 1, v); if (i >= cw) push(i - cw, v); if (i < N - cw) push(i + cw, v); } };
      spread(-1);
      // what's left unfilled: the counters, one label each
      let id = 0; const found = [];
      for (let i = 0; i < N; i++) {
        if (ink[i] || lab[i]) continue;
        id++; qh = qt = 0; push(i, id); spread(id);
        let x0 = cw, y0 = ch, x1 = 0, y1 = 0, sx = 0, sy = 0;
        for (let j = 0; j < qt; j++) { const c = q[j], x = c % cw, y = (c / cw) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; sx += x; sy += y; }
        found.push({ id, area: qt, x0, y0, x1, y1, cx: sx / qt, cy: sy / qt });
      }
      found.sort((A, B) => (w.rtl ? B.cx - A.cx : A.cx - B.cx));
      for (const h of found) holes.push({ ...h, w, lab, cw, ch, pad });
    }
    const big = holes.reduce((m, h) => Math.max(m, h.area), 0);
    const pool = holes.filter((h) => h.area >= big * 0.25 && h.area > 30);
    const hole = pool.length ? pool[Math.round(ML.clamp(+p.letter_index, 0, 20)) % pool.length] : null;

    // the window: the hole's own shape as a mask (grown a pixel under the strokes so no seam shows)
    const win = document.createElement("div");
    let wx, wy, ww, wh, ox, oy, R, holeMask = "";
    if (hole) {
      const { lab, cw, id, x0, y0, x1, y1, w, pad } = hole, mx = x1 - x0 + 5, my = y1 - y0 + 5;
      const mc = document.createElement("canvas"); mc.width = mx; mc.height = my;
      const mg = mc.getContext("2d"), im = mg.createImageData(mx, my);
      for (let y = 0; y < my; y++) for (let x = 0; x < mx; x++) {
        const X = x + x0 - 2, Y = y + y0 - 2; let on = 0;
        for (let dy = -2; dy <= 2 && !on; dy++) for (let dx = -2; dx <= 2 && !on; dx++) { const xx = X + dx, yy = Y + dy; if (xx >= 0 && yy >= 0 && xx < cw && lab[yy * cw + xx] === id) on = 1; }
        if (on) { const o = (y * mx + x) * 4; im.data[o] = im.data[o + 1] = im.data[o + 2] = 255; im.data[o + 3] = 255; }
      }
      mg.putImageData(im, 0, 0);
      wx = w.x - pad + (x0 - 2) / S; wy = w.y - pad + (y0 - 2) / S; ww = mx / S; wh = my / S;
      ox = (hole.cx - x0 + 2) / S; oy = (hole.cy - y0 + 2) / S; R = Math.hypot(Math.max(ox, ww - ox), Math.max(oy, wh - oy)) + 1;
      holeMask = `url(${mc.toDataURL()})`;
    } else {
      // no counter in this face: a round window in the middle of the first letter
      const w = words[0] || { x: ctx.f.W / 2 - 40, y: ctx.f.H / 2 - 40, w: 80, h: 80 }, r0 = size * 0.22;
      wx = w.x + Math.min(w.w, size * 0.6) / 2 - r0; wy = w.y + w.h * 0.55 - r0; ww = wh = r0 * 2; ox = oy = r0; R = r0;
    }
    win.style.cssText += `;position:absolute;left:${wx.toFixed(2)}px;top:${wy.toFixed(2)}px;width:${ww.toFixed(2)}px;height:${wh.toFixed(2)}px;overflow:hidden;pointer-events:none;z-index:3`;
    // what shows through: the scene's picture (a <video>'s poster), else a vivid pattern from the look
    const vid = host.querySelector("video");
    const img = picEl || host.querySelector("img");
    const src = p.content === "video" && vid && vid.poster ? vid.poster : p.content !== "pattern" && img ? img.currentSrc || img.src : null;
    const inner = document.createElement(src ? "img" : "div");
    if (src) { inner.src = src; inner.style.objectFit = "cover"; inner.style.filter = "var(--x-pic-filter)"; }
    else inner.style.background = "repeating-conic-gradient(from 0deg at 50% 50%, var(--x-accent) 0 30deg, var(--x-accent-2) 30deg 60deg, var(--x-good) 60deg 90deg)";
    inner.style.cssText += ";position:absolute;inset:0;width:100%;height:100%;display:block;transform-origin:50% 50%";
    win.append(inner);
    host.append(win);
    // the sideways motion blur (horizontal only), on the text, not the window
    let blur = null;
    if (p.word_blur) {
      const NS = "http://www.w3.org/2000/svg", fid = "ml-lw-" + Math.floor(ML.rnd(at * 31 + wx, 7) * 1e9).toString(36);
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.style.position = "absolute";
      svg.innerHTML = `<filter id="${fid}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0 0"/></filter>`;
      host.append(svg);
      blur = { node: svg.querySelector("feGaussianBlur"), id: fid };
    }
    if (picEl) picEl.style.visibility = "hidden";
    const g = ML.clamp(+p.grow, 0.25, 0.6);
    ctx.sfx(at, "pop.soft", 0.35);
    return {
      draw(t) {
        const u = ML.out(t, at, at + g), r = R * u;
        win.style.visibility = u > 0.001 ? "visible" : "hidden";
        const circle = `radial-gradient(circle ${Math.max(0.01, r).toFixed(2)}px at ${ox.toFixed(2)}px ${oy.toFixed(2)}px, #000 0, #000 calc(100% - 1px), transparent 100%)`;
        if (hole) {
          win.style.webkitMaskImage = win.style.maskImage = `${holeMask}, ${circle}`;
          win.style.webkitMaskComposite = "source-in"; win.style.maskComposite = "intersect";
          win.style.webkitMaskSize = win.style.maskSize = "100% 100%, 100% 100%";
          win.style.webkitMaskRepeat = win.style.maskRepeat = "no-repeat";
        } else win.style.webkitMaskImage = win.style.maskImage = circle;
        inner.style.scale = (1.3 - 0.3 * ML.out(t, at, at + g + 0.6)).toFixed(4);
        if (blur) {
          const b = ML.ease(t, at + g * 0.6, Math.max(at + g + 0.3, end)) * size * 0.14;
          blur.node.setAttribute("stdDeviation", `${b.toFixed(2)} 0`);
          word.style.filter = b > 0.05 ? `url(#${blur.id})` : "none";
        }
      },
    };
  },
});

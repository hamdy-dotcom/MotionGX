// Off-register colour plate: the target prints like a misregistered two-colour job — a black key layer with a flat
// colour plate slipped a few px off it. Port of MengTo/Skills illustration-two-colour-brush brush.mjs: fillShape()'s
// shifted "second plate" (the mint plate drawn at dx -6, dy -5 under the one-stroke outline) and crinkle()'s edge wobble
// (a two-sine sideways offset, 0.65 sin(i/λ + φ) + 0.35 sin(i/.43λ + φ2), amplitude by size). Per target:
//   · a picture: posterised into paper / plate / key — the darkest third becomes the key (the look's ink), the middle
//     tones the flat plate (the accent), wobbled along its edge with a per-plate seed and eroded 1 px so it falls short
//     of the edges, then offset; highlights stay paper. Painted once (sampled down, never up); the plate only moves.
//   · a logo (svg): the logo is the key; its silhouette, filled with the plate colour and wobbled, slips under it.
//   · a headline / shape / card: the element is the key; a copy in the plate colour (wobbled by a seeded SVG
//     displacement, never blurred) sits under it. Whole words are copied, so Arabic stays joined.
// Rest offset 2-10 px, mostly up-left (mirrored to up-right in RTL); a second plate (accent-2) slips the other way at
// 60 %. Animate: slide-in (from 12-16 px further off into the rest on a spring, .4-.6 s), beat-jitter (1 px hops on
// every spoken word), static.
// Source: MengTo/Skills illustration/illustration-two-colour-brush/scripts/brush.mjs (MIT).
ML.define({
  id: "photo.off-register-plates",
  category: "photo",
  name: "Off-register colour plate",
  does: "A picture or shape prints as a black key layer with a flat colour plate slipped a few pixels off it, like a misregistered two-colour print.",
  says: ["playful", "brand", "energy", "story"],
  energy: 3,
  targets: ["image", "logo", "headline", "shape", "card"],
  duration: [0.4, 20],
  params: {
    plates: { type: "choice", options: ["1", "2"], default: "1" },
    offset: { type: "number", range: [2, 10], default: 5, unit: "px" },
    direction: { type: "choice", options: ["up-left", "down-right"], default: "up-left" },
    colour: { type: "text", default: "brand accent" },
    animate: { type: "choice", options: ["slide-in", "beat-jitter", "static"], default: "slide-in" },
  },
  pairs: ["photo.halftone", "photo.line-boil", "text-in.punchline"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "snap",
  source: { from: "MengTo/Skills:illustration/illustration-two-colour-brush/scripts/brush.mjs", license: "MIT", note: "fillShape() offset plate + crinkle() edge wobble, rebuilt for DOM / canvas" },
  async setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const host = ctx.scene || ctx.stage;
    const b = ctx.box(el);
    if (b.w < 6 || b.h < 6) return null;
    const mk = (tag, css, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (parent) parent.append(e); return e; };
    // the plate colour: a look variable named in words ("brand accent", "accent-2", "good", "bad", "ink"), else the accent
    const word = String(p.colour || "").toLowerCase();
    const varOf = (w) => (/accent[- ]?2|second/.test(w) ? "--x-accent-2" : /good|green/.test(w) ? "--x-good" : /bad|red|coral/.test(w) ? "--x-bad" : /ink|black/.test(w) ? "--x-ink" : "--x-accent");
    const v1 = varOf(word), v2 = v1 === "--x-accent-2" ? "--x-accent" : "--x-accent-2";
    const probe = mk("span", `color:var(${v1});background-color:var(${v2});border-color:var(--x-ink);outline-color:var(--x-panel)`, host);
    const pcs = getComputedStyle(probe), C1 = pcs.color, C2 = pcs.backgroundColor, INK = pcs.borderTopColor, PAPER = pcs.outlineColor;
    probe.remove();
    const rgb = (c) => (c.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);

    const two = p.plates === "2";
    const off = ML.clamp(+p.offset || 5, 2, 10);
    const sx = (p.direction === "down-right" ? 1 : -1) * (rtl ? -1 : 1), sy = p.direction === "down-right" ? 1 : -1;
    // mostly up-left: the source's (-6, -5) proportion
    const dir1 = [sx * off, sy * off * 0.8], dir2 = [-sx * off * 0.6, -sy * off * 0.45];
    const amp = ML.clamp(Math.min(b.w, b.h) / 160, 0.8, 3); // wobble amplitude by size
    const seed = Math.round(ML.rnd(b.w + b.h * 3, 7) * 997) + 1;

    const tag = el.tagName.toUpperCase();
    const pic = tag === "IMG" ? el : null;
    const isSvg = tag === "SVG";
    let layer = null, plates = [], key = null, original = null;

    // the crinkle wobble on a mask: offsets along x / y from two sines (brush.mjs crinkle), per-plate phase
    const wobbleMask = (mask, w, h, A, k) => {
      const outM = new Uint8Array(w * h), ph = ML.rnd(k, 3) * 6.3, ph2 = ML.rnd(k, 5) * 6.3, lam = Math.max(4, Math.min(w, h) / 40);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dx = A * (0.65 * Math.sin(y / lam + ph) + 0.35 * Math.sin(y / (lam * 0.43) + ph2));
        const dy = A * (0.65 * Math.sin(x / lam + ph2) + 0.35 * Math.sin(x / (lam * 0.43) + ph));
        const X = Math.round(x + dx), Y = Math.round(y + dy);
        outM[y * w + x] = X >= 0 && Y >= 0 && X < w && Y < h ? mask[Y * w + X] : 0;
      }
      // erode 1 px: the plate falls short of the edges
      const e = new Uint8Array(w * h);
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; e[i] = outM[i] && outM[i - 1] && outM[i + 1] && outM[i - w] && outM[i + w] ? 1 : 0; }
      return e;
    };
    const paint = (cv, mask, w, h, col) => {
      const g = cv.getContext("2d"), im = g.createImageData(w, h), [r, gg, bb] = rgb(col);
      for (let i = 0; i < w * h; i++) if (mask[i]) { im.data[i * 4] = r; im.data[i * 4 + 1] = gg; im.data[i * 4 + 2] = bb; im.data[i * 4 + 3] = 255; }
      g.putImageData(im, 0, 0);
    };
    const W = Math.max(2, Math.round(b.w)), H = Math.max(2, Math.round(b.h));

    if (pic || isSvg) {
      // a raster of the target at its box size (never larger than its own pixels: sampled down, shown 1:1)
      let srcImg = pic;
      if (isSvg) {
        const xml = new XMLSerializer().serializeToString(el);
        const cs = getComputedStyle(el);
        const resolved = xml.replace(/var\((--x-[a-z0-9-]+)\)/g, (m, n) => getComputedStyle(host).getPropertyValue(n).trim() || "#000");
        srcImg = new Image(); srcImg.decoding = "sync";
        srcImg.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(resolved.replace("<svg", `<svg width="${W}" height="${H}"`).replace(/font-family="[^"]*"/g, `font-family="${cs.fontFamily.replace(/"/g, "'")}"`));
        await srcImg.decode().catch(() => {});
      }
      const raster = document.createElement("canvas"); raster.width = W; raster.height = H;
      const rg = raster.getContext("2d", { willReadFrequently: true });
      let data = null;
      try {
        if (pic && pic.naturalWidth) {
          const nw = pic.naturalWidth, nh = pic.naturalHeight, fit = getComputedStyle(pic).objectFit;
          if (fit === "contain") { const s = Math.min(W / nw, H / nh); rg.drawImage(pic, (W - nw * s) / 2, (H - nh * s) / 2, nw * s, nh * s); }
          else { const s = Math.max(W / nw, H / nh), cw = W / s, ch = H / s; rg.drawImage(pic, (nw - cw) / 2, (nh - ch) / 2, cw, ch, 0, 0, W, H); }
        } else if (srcImg && srcImg.naturalWidth) rg.drawImage(srcImg, 0, 0, W, H);
        data = rg.getImageData(0, 0, W, H).data;
      } catch (e) { data = null; }
      if (!data) return null;
      const radius = getComputedStyle(el).borderRadius || "0px";
      layer = mk("div", `position:absolute;left:${b.x}px;top:${b.y}px;width:${W}px;height:${H}px;pointer-events:none;visibility:hidden;z-index:3;${pic ? `overflow:hidden;border-radius:${radius};background:${PAPER}` : ""}`, host);
      const mkCv = (z) => { const c = mk("canvas", `position:absolute;left:0;top:0;width:${W}px;height:${H}px;z-index:${z}`, layer); c.width = W; c.height = H; return c; };
      if (pic) {
        // posterise: key = darkest third, plate = the middle third (by the picture's own tone spread), paper above
        const L = new Float32Array(W * H), hist = [];
        for (let i = 0; i < W * H; i++) { L[i] = (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255; if (i % 7 === 0) hist.push(L[i]); }
        hist.sort((a, c) => a - c);
        const q = (f) => hist[Math.min(hist.length - 1, Math.floor(hist.length * f))];
        const tKey = q(0.3), tPlate = q(0.72);
        const keyM = new Uint8Array(W * H), plateM = new Uint8Array(W * H), plate2M = new Uint8Array(W * H);
        for (let i = 0; i < W * H; i++) { keyM[i] = L[i] <= tKey ? 1 : 0; plateM[i] = L[i] <= tPlate ? 1 : 0; plate2M[i] = L[i] <= (tKey + tPlate) / 2 ? 1 : 0; }
        const pc = mkCv(1); paint(pc, wobbleMask(plateM, W, H, amp, seed), W, H, C1); plates.push({ el: pc, d: dir1 });
        if (two) { const pc2 = mkCv(2); pc2.style.mixBlendMode = "multiply"; paint(pc2, wobbleMask(plate2M, W, H, amp, seed + 11), W, H, C2); plates.push({ el: pc2, d: dir2 }); }
        const kc = mkCv(3); paint(kc, keyM, W, H, INK); key = kc;
        original = el;
      } else {
        // a logo: its silhouette is the plate, the logo itself stays the key on top
        const m = new Uint8Array(W * H);
        for (let i = 0; i < W * H; i++) m[i] = data[i * 4 + 3] > 96 ? 1 : 0;
        layer.style.zIndex = "0";
        if (getComputedStyle(el).position === "static") el.style.position = "relative";
        el.style.zIndex = "1";
        const pc = mkCv(0); paint(pc, wobbleMask(m, W, H, amp, seed), W, H, C1); plates.push({ el: pc, d: dir1 });
        if (two) { const pc2 = mkCv(0); paint(pc2, wobbleMask(m, W, H, amp, seed + 11), W, H, C2); plates.push({ el: pc2, d: dir2 }); pc2.style.zIndex = "-1"; }
      }
    } else {
      // text / shape / card: a plate copy under the element, wobbled by a seeded displacement (static per plate)
      const svgNS = "http://www.w3.org/2000/svg";
      const defs = document.createElementNS(svgNS, "svg");
      defs.setAttribute("width", "0"); defs.setAttribute("height", "0"); defs.style.position = "absolute";
      const fid = (k) => `ml-offreg-${seed}-${k}`;
      for (let k = 0; k < 2; k++) {
        const f = document.createElementNS(svgNS, "filter");
        f.setAttribute("id", fid(k)); f.setAttribute("x", "-5%"); f.setAttribute("y", "-5%"); f.setAttribute("width", "110%"); f.setAttribute("height", "110%");
        f.innerHTML = `<feTurbulence type="fractalNoise" baseFrequency="${(0.9 / Math.max(20, Math.min(b.w, b.h) / 6)).toFixed(4)}" numOctaves="2" seed="${seed + k * 11}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${(amp * 2.4).toFixed(2)}" xChannelSelector="R" yChannelSelector="G"/><feMorphology operator="erode" radius="0.6"/>`;
        defs.append(f);
      }
      host.append(defs);
      layer = mk("div", `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;pointer-events:none;visibility:hidden;z-index:0`, host);
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      el.style.zIndex = "1";
      const textual = !el.children.length || el.querySelector(".ml-w") || /^(H\d|P|SPAN)$/.test(tag) || el.classList.contains("ml-title");
      const cs = getComputedStyle(el);
      const mkPlate = (col, k, d) => {
        const c = el.cloneNode(true);
        c.removeAttribute("data-slot"); c.removeAttribute("id");
        c.querySelectorAll("[data-slot]").forEach((x) => x.removeAttribute("data-slot"));
        c.style.cssText = `position:absolute;left:0;top:0;width:${b.w}px;height:${b.h}px;margin:0;box-sizing:border-box;visibility:visible;opacity:1;translate:none;scale:none;transform:none;filter:url(#${fid(k)})`;
        if (textual) { c.style.color = `var(${col})`; c.style.font = cs.font; c.style.letterSpacing = cs.letterSpacing; c.style.textAlign = cs.textAlign; c.style.direction = cs.direction; c.style.whiteSpace = cs.whiteSpace; c.style.textTransform = cs.textTransform; c.querySelectorAll("*").forEach((x) => { x.style.color = `var(${col})`; x.style.opacity = "1"; x.style.translate = "none"; x.style.filter = "none"; }); }
        else { c.innerHTML = ""; c.style.background = `var(${col})`; c.style.borderRadius = cs.borderRadius; c.style.border = "0"; c.style.boxShadow = "none"; }
        layer.append(c);
        return { el: c, d };
      };
      plates.push(mkPlate(v1, 0, dir1));
      if (two) plates.push(mkPlate(v2, 1, dir2));
    }

    // beats: the spoken words inside the run (else every .5 s)
    const beats = (ctx.words || []).map((w) => w.t).filter((x) => x >= at && x < end);
    if (!beats.length) for (let x = at + 0.5; x < end; x += 0.5) beats.push(x);
    const extra = 12 + ML.rnd(seed, 9) * 4; // slide-in starts 12-16 px further off
    const slideDur = 0.5;
    ctx.sfx(at, p.animate === "beat-jitter" ? "tap" : "snap", 0.35);
    if (p.animate === "beat-jitter") beats.slice(0, 6).forEach((x, i) => i % 2 === 1 && ctx.sfx(x, "tap", 0.15));

    return {
      draw(t) {
        const on = t >= at - 1e-6 && t < end;
        layer.style.visibility = on ? "visible" : "hidden";
        if (original) original.style.visibility = on ? "hidden" : "";
        if (!on) return;
        const fade = ML.lin(t, at, at + 0.12) * (1 - ML.lin(t, end - 0.2, end));
        layer.style.opacity = fade.toFixed(4);
        let k = 1, jx = 0, jy = 0;
        if (p.animate === "slide-in") k = 1 + (extra / off) * (1 - Math.min(1, ML.step(t - at, { stiffness: 180, damping: 17 })));
        // the spring may cross the rest a little: it settles back to the rest offset (no overshoot past the key)
        if (p.animate === "beat-jitter") { let n = -1; for (let i = 0; i < beats.length; i++) if (t >= beats[i]) n = i; if (n >= 0) { jx = Math.round((ML.rnd(n, seed) - 0.5) * 2); jy = Math.round((ML.rnd(n, seed + 1) - 0.5) * 2); } }
        plates.forEach((pl, i) => {
          const x = pl.d[0] * k + jx * (i ? -1 : 1), y = pl.d[1] * k + jy * (i ? -1 : 1);
          pl.el.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
        });
        if (key) key.style.translate = "none";
      },
    };
  },
});

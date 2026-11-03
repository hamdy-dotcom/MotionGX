// Halftone: a photo turns into ink dots on paper whose size tracks the tone, edges slightly hand-wobbled. Port of
// MengTo/Skills illustration-halftone-line halftone.mjs's stipple(): greyscale, a jittered dot grid (pitch 2.58 at 480
// wide, scaled with the picture), dot radius = pitch * sqrt(tone / pi) * a per-dot jitter, so the dot AREA tracks the
// tone; tiny dots kept with probability (r / .4)^2 at r .4 (the source's speck rule); highlights clamp to paper (no
// dots), deep shadows to solid. The wobble filter (low-frequency displacement 2.3 + fine edge roughening 0.8) becomes
// seeded value-noise offsets on every dot. Ink: the look's ink (or a brand dark mixed from accent + ink) on the look's
// paper (its ground, warm; or its panel, white). Animate: tone-grow (dots grow from 0, darkest first, over 0.6-1 s),
// wipe-convert (a line sweeps photo -> halftone in the reading direction), or static. The photo is sampled at no more
// than its own pixels (never enlarged before sampling); every frame is painted from t with seeded jitter. A look with
// light ink on dark paper prints the lights as ink, so the picture never turns negative. A logo (an inline SVG) is drawn
// into the sample in its own shape. A target with no picture and no SVG (a screen rebuilt as DOM) cannot be read: no move.
// Source: MengTo/Skills illustration/illustration-halftone-line scripts/halftone.mjs (MIT).
ML.define({
  id: "photo.halftone",
  category: "photo",
  name: "Halftone dot treatment",
  does: "A photo turns into a field of ink dots on paper whose size tracks the tone, edges slightly hand-wobbled.",
  says: ["story", "simplicity", "luxury", "brand"],
  energy: 2,
  targets: ["image", "logo", "screen"],
  duration: [0.6, 20],
  params: {
    pitch: { type: "choice", options: ["fine", "coarse"], default: "fine" },
    ink: { type: "choice", options: ["black", "brand-dark"], default: "black" },
    paper: { type: "choice", options: ["warm", "white"], default: "warm" },
    animate: { type: "choice", options: ["static", "tone-grow", "wipe-convert"], default: "tone-grow" },
    wobble: { type: "bool", default: true },
    grow: { type: "number", range: [0.6, 1], default: 0.8, unit: "s" },
  },
  pairs: ["photo.hatch-shadow-band", "text-in.punchline"],
  avoid: ["urgency", "tech"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "MengTo/Skills:illustration/illustration-halftone-line/scripts/halftone.mjs", license: "MIT" },
  async setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const host = ctx.scene || ctx.stage;
    const b = ctx.box(el);
    if (b.w < 8 || b.h < 8) return null;
    const pic = el.tagName === "IMG" ? el : el.querySelector("img");
    const logo = !pic && el.tagName.toLowerCase() === "svg" ? el : null;
    if (!pic && !logo) return null;
    const mk = (tag, css, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (parent) parent.append(e); return e; };
    const radius = getComputedStyle(el).borderRadius || "0px";
    const wrap = mk("div", `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;overflow:hidden;border-radius:${radius};pointer-events:none;visibility:hidden;z-index:3`, host);
    const cv = mk("canvas", `position:absolute;inset:0;width:${b.w}px;height:${b.h}px`, wrap);
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(b.w * DPR); cv.height = Math.round(b.h * DPR);
    const g = cv.getContext("2d");
    const probe = mk("span", `color:${p.ink === "brand-dark" ? "color-mix(in srgb, var(--x-accent) 45%, var(--x-ink))" : "var(--x-ink)"};background:${p.paper === "white" ? "var(--x-panel)" : "var(--x-ground)"}`, wrap);
    const INK = getComputedStyle(probe).color, PAPER = getComputedStyle(probe).backgroundColor; probe.remove();
    const lumOf = (c) => { const o = document.createElement("canvas").getContext("2d", { willReadFrequently: true }); o.fillStyle = c; o.fillRect(0, 0, 1, 1); const d = o.getImageData(0, 0, 1, 1).data; return 0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]; };
    const lightInk = lumOf(INK) > lumOf(PAPER);

    // ── the tone field: 0 (paper) .. 1 (ink), sampled from the picture ──
    const scale = Math.max(1, b.w / 480); // the source's 2.58 is its floor: finer than that on a small logo prints flat grey
    const pitch = 2.58 * scale * (p.pitch === "coarse" ? 2.2 : 1);
    let sw = Math.max(2, Math.round(b.w / pitch) * 2), sh = Math.max(2, Math.round(b.h / pitch) * 2);
    let tone = null;
    // a logo drawn as a picture, with its look colours written in (an SVG image cannot see the page's variables)
    let logoImg = null;
    if (logo) {
      const cl = logo.cloneNode(true), from = [logo, ...logo.querySelectorAll("*")], to = [cl, ...cl.querySelectorAll("*")];
      from.forEach((e, i) => { const s = getComputedStyle(e); for (const k of ["fill", "stroke", "stroke-width", "opacity", "font-family", "font-size", "font-weight"]) to[i].style.setProperty(k, s.getPropertyValue(k)); });
      cl.setAttribute("xmlns", "http://www.w3.org/2000/svg"); cl.setAttribute("width", b.w); cl.setAttribute("height", b.h);
      const im = new Image(); im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(cl));
      await (im.decode ? im.decode().catch(() => {}) : 0);
      if (im.naturalWidth) logoImg = im;
    }
    try {
      const off = document.createElement("canvas"); off.width = sw; off.height = sh;
      const o = off.getContext("2d", { willReadFrequently: true });
      if (pic && pic.naturalWidth) {
        // object-fit cover, sampled down (never up): the sample grid is coarser than the picture
        const nw = pic.naturalWidth, nh = pic.naturalHeight, s = Math.max(b.w / nw, b.h / nh);
        const cw = b.w / s, ch = b.h / s;
        sw = Math.min(sw, Math.round(cw)); sh = Math.min(sh, Math.round(ch)); off.width = sw; off.height = sh; // never more samples than the picture has pixels
        o.drawImage(pic, (nw - cw) / 2, (nh - ch) / 2, cw, ch, 0, 0, sw, sh);
      } else if (logoImg) o.drawImage(logoImg, 0, 0, sw, sh);
      else throw new Error("no picture");
      const d = o.getImageData(0, 0, sw, sh).data;
      tone = new Float32Array(sw * sh);
      for (let i = 0; i < sw * sh; i++) {
        const a = d[i * 4 + 3] / 255, L = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
        // a logo prints solid in its shape, whatever its colour; a picture by its tones (the lights, under light ink)
        tone[i] = logoImg ? a * Math.max(0.62, lightInk ? L : 1 - L) : (lightInk ? L : 1 - L) * a;
      }
    } catch (e) { tone = null; }
    if (!tone) {
      // no readable pixels (a cross-origin picture): a soft radial tone, the source's "rad" term
      tone = new Float32Array(sw * sh);
      for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { const u = Math.min(1, Math.hypot(x / sw - 0.42, y / sh - 0.4) / 0.75); tone[y * sw + x] = 0.7 - 0.55 * u * u * (3 - 2 * u); }
    }
    // the tone as the picture has it (no contrast stretch: a light picture stays light), capped at the source's .92
    const toneAt = (x, y) => { const i = Math.min(sw - 1, Math.max(0, Math.floor((x / b.w) * sw))), j = Math.min(sh - 1, Math.max(0, Math.floor((y / b.h) * sh))); return ML.clamp(tone[j * sw + i]) * 0.92; };
    // value noise (seeded) for the wobble
    const vn = (x, y, k) => { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy); const h = (a, c) => ML.rnd(a * 57 + c * 131, k); const a = h(i, j), bb = h(i + 1, j), c = h(i, j + 1), e = h(i + 1, j + 1); return a + (bb - a) * sx + (c - a) * sy + (a - bb - c + e) * sx * sy - 0.5; };
    // ── the dots (stipple(): jittered grid, area ~ tone, speck rule) ──
    const xs = [], ys = [], rs = [], ts = [];
    let n = 0;
    const jit = 1.0 * scale, rjit = 0.5;
    for (let y = pitch / 2, row = 0; y < b.h + pitch; y += pitch, row++) {
      for (let x = pitch / 2, col = 0; x < b.w + pitch; x += pitch, col++) {
        const id = row * 4099 + col;
        let px = x + (ML.rnd(id, 1) - 0.5) * jit, py = y + (ML.rnd(id, 2) - 0.5) * jit;
        const rj = 1 + (ML.rnd(id, 3) - 0.5) * rjit * 0.6, keep = ML.rnd(id, 4);
        const t = toneAt(px, py);
        if (t <= 0.08) continue; // highlights stay paper
        let rad = t >= 0.86 ? pitch * 0.74 : pitch * Math.sqrt(t / Math.PI) * rj; // deep shadows go solid
        const rmin = 0.4 * scale;
        if (rad < rmin) { if (keep > (rad / rmin) ** 2) continue; rad = rmin + ML.rnd(id, 5) * 0.06 * scale; }
        if (p.wobble) { px += vn(px * 0.052 / scale, py * 0.052 / scale, 7) * 2.3 * scale; py += vn(px * 0.052 / scale + 9, py * 0.052 / scale, 8) * 2.3 * scale; rad *= 1 + vn(px * 0.8 / scale, py * 0.8 / scale, 9) * 0.16; }
        xs.push(px); ys.push(py); rs.push(rad); ts.push(t); n++;
      }
    }
    const grow = ML.clamp(p.grow, 0.6, 1);
    const wipeDur = 0.8;
    ctx.sfx(at, "swell", 0.25);
    return {
      draw(t) {
        const on = t >= at - 1e-6 && t < end;
        wrap.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        const leave = ML.lin(t, end - 0.25, end);
        wrap.style.opacity = (1 - leave).toFixed(4);
        g.setTransform(DPR, 0, 0, DPR, 0, 0);
        g.clearRect(0, 0, b.w, b.h);
        let edge = b.w; // wipe-convert: the halftone covers [0, edge] (mirrored in RTL); the photo shows beyond it
        if (p.animate === "wipe-convert") {
          edge = ML.ease(t, at, at + wipeDur) * (b.w + pitch * 4);
          g.save(); g.beginPath();
          if (ctx.rtl) g.rect(b.w - edge, 0, edge, b.h); else g.rect(0, 0, edge, b.h);
          g.clip();
        }
        const fadeIn = p.animate === "static" ? ML.ease(t, at, at + 0.3) : 1;
        g.globalAlpha = fadeIn;
        if (p.animate === "tone-grow") g.globalAlpha = ML.ease(t, at, at + 0.2); // the paper settles over the photo
        g.fillStyle = PAPER; g.fillRect(0, 0, b.w, b.h);
        g.globalAlpha = fadeIn;
        g.fillStyle = INK; g.beginPath();
        for (let i = 0; i < n; i++) {
          let r = rs[i];
          if (p.animate === "tone-grow") {
            // darkest first: a dot starts when the sweep through the tones reaches it, grows over a third of the run
            const t0 = at + (1 - ts[i]) * grow * 0.66, u = ML.out(t, t0, t0 + grow * 0.34);
            if (u <= 0) continue;
            r *= u;
          }
          g.moveTo(xs[i] + r, ys[i]); g.arc(xs[i], ys[i], r, 0, Math.PI * 2);
        }
        g.fill();
        if (p.animate === "wipe-convert") {
          g.restore();
          // the converting line
          const x = ctx.rtl ? b.w - edge : edge;
          if (edge > 0 && edge < b.w) { g.globalAlpha = 1; g.fillStyle = INK; g.fillRect(x - scale, 0, 2 * scale, b.h); }
        }
        g.globalAlpha = 1;
      },
    };
  },
});

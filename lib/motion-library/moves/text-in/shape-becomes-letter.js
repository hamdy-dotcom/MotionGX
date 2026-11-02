// Shape becomes letter: a crosshair point appears where one letter of the word will be, grows into a plain shape
// (circle, square, triangle or a mark; scale 0 → 1, 0.3 s back out), then the other letters cut or pop in one per
// beat around it, so the shape reads as that letter (the O for a circle, an A for a triangle…). The shape is sized and
// placed on the real glyph's ink box (measured with canvas metrics), and can start at the centre and slide into its
// slot as the letters arrive. Latin wordmarks only: the shape replaces one separate letter.
// Source: prompt-motion pankajkumar-dev "opus is insanely…" (reference only — our own rebuild).
ML.define({
  id: "text-in.shape-becomes-letter",
  category: "text-in",
  name: "Shape becomes letter",
  does: "A plain shape pops into the frame, then the other letters slam in around it so the shape reads as one of the word's letters.",
  says: ["brand", "playful", "arrival", "connection"],
  energy: 4,
  targets: ["headline", "word", "logo"],
  duration: [0.8, 2.5],
  params: {
    shape: { type: "choice", options: ["circle", "square", "triangle", "logo"], default: "circle" },
    cadence: { type: "number", range: [0.15, 0.6], default: 0.3, unit: "s" },
    letter_in: { type: "choice", options: ["cut", "pop"], default: "cut" },
    slide: { type: "bool", default: false },
  },
  pairs: ["accent.burst", "text-emphasis.accent-word"],
  avoid: ["calm", "luxury"],
  rtl: false,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "prompt-motion:pankajkumar-dev-opus-5-5-is-insanely", license: "reference", note: "our own code" },
  async setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    // measure with the real face: wait for the faces this text uses (a page's fonts can still be arriving)
    try { const cs = getComputedStyle(el); await document.fonts.load(`${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, el.textContent || "A"); await document.fonts.ready; } catch (e) { /* no font API: measure as is */ }
    const chars = ML.split(el, "chars");
    const n = chars.length;
    if (!n) return null;
    el.style.position = "relative";
    // which letter the shape stands in for
    const want = { circle: /[oO0Q]/, square: /[oOD0]/, triangle: /[aAvV]/, logo: /[oO0]/ }[p.shape] || /[oO]/;
    let si = chars.findIndex((c) => want.test(c.textContent));
    if (si < 0) si = chars.findIndex((c) => /[oO0aAeE]/.test(c.textContent));
    if (si < 0) si = Math.floor(n / 2);
    const slot = chars[si], ch = slot.textContent;
    slot.style.color = "transparent";
    const tri = p.shape === "triangle", round = p.shape === "circle" || p.shape === "logo";
    const shape = document.createElement("div");
    shape.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;background:var(--x-accent);" + (round ? "border-radius:50%;" : tri ? "clip-path:polygon(50% 0, 100% 100%, 0 100%);" : "");
    if (p.shape === "logo") { const dot = document.createElement("div"); dot.style.cssText = "position:absolute;left:32%;top:32%;width:36%;height:36%;border-radius:50%;background:var(--x-accent-ink);"; shape.append(dot); }
    el.append(shape);
    // the crosshair that marks the spot before the shape grows
    const cross = document.createElement("div");
    cross.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;" +
      "background:linear-gradient(var(--x-ink), var(--x-ink)) center / 100% 2px no-repeat, linear-gradient(var(--x-ink), var(--x-ink)) center / 2px 100% no-repeat;";
    el.append(cross);
    // the glyph's ink box inside its slot, read every frame from the layout and the face as they are now (canvas
    // metrics against the span's baseline; offsets ignore transforms), so the shape sits on the real letter
    const cv = document.createElement("canvas").getContext("2d");
    function geom() {
      const cs = getComputedStyle(slot);
      cv.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const m = cv.measureText(ch), fa = m.fontBoundingBoxAscent, fd = m.fontBoundingBoxDescent;
      let sx = 0, sy = 0;
      for (let e = slot; e && e !== el; e = e.offsetParent) { sx += e.offsetLeft; sy += e.offsetTop; }
      const sw = slot.offsetWidth, sh = slot.offsetHeight;
      const baseline = sy + (sh - (fa + fd)) / 2 + fa;
      const gx = sx + (sw - m.width) / 2 - m.actualBoundingBoxLeft + (m.actualBoundingBoxLeft + m.actualBoundingBoxRight) / 2;
      const gh = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent, gw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
      return { cx: gx, cy: baseline - m.actualBoundingBoxAscent + gh / 2, size: Math.max(gw, gh) * (tri ? 1 : 0.98) };
    }
    const growAt = at + 0.15, grown = growAt + 0.3;
    const others = chars.filter((_, i) => i !== si);
    const cad = Math.max(0.05, Math.min(p.cadence, (end - 0.6 - grown) / Math.max(1, others.length)));
    const times = new Map(others.map((c, j) => [c, grown + 0.1 + j * cad]));
    const lastIn = grown + 0.1 + (others.length - 1) * cad;
    ctx.sfx(growAt, "pop", 0.45);
    others.forEach((c, j) => j % 2 === 0 && ctx.sfx(times.get(c), "tap", 0.25));
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.18);
        el.style.opacity = (1 - leave).toFixed(4);
        const { cx, cy, size } = geom(), arm = size * 0.35, centreX = el.offsetWidth / 2;
        cross.style.left = (cx - arm).toFixed(1) + "px"; cross.style.top = (cy - arm).toFixed(1) + "px";
        cross.style.width = cross.style.height = (arm * 2).toFixed(1) + "px";
        shape.style.left = (cx - size / 2).toFixed(1) + "px"; shape.style.top = (cy - size / 2).toFixed(1) + "px";
        shape.style.width = shape.style.height = size.toFixed(1) + "px";
        if (!round && !tri) shape.style.borderRadius = (size * 0.08).toFixed(1) + "px";
        cross.style.visibility = t >= at && t < growAt + 0.08 ? "visible" : "hidden";
        cross.style.scale = (0.4 + 0.6 * ML.out(t, at, at + 0.1)).toFixed(4);
        const g = t < growAt ? 0 : ML.clamp(ML.back(t, growAt, grown, 1.7), 0, 1.15);
        shape.style.visibility = t < growAt ? "hidden" : "visible";
        shape.style.scale = g.toFixed(4);
        let dx = 0;
        if (p.slide) { const share = ML.ease(t, grown, lastIn + 0.15); dx = (centreX - cx) * (1 - share); }
        shape.style.translate = `${dx.toFixed(2)}px 0`;
        others.forEach((c) => {
          const a = times.get(c);
          if (t < a) { c.style.visibility = "hidden"; return; }
          c.style.visibility = "visible";
          const s = p.letter_in === "pop" ? 1.1 - 0.1 * ML.out(t, a, a + 0.08) : 1;
          c.style.scale = s === 1 ? "none" : s.toFixed(4);
        });
      },
    };
  },
});

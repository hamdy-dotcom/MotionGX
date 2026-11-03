// Outline echo stack: the solid word stays fixed in the centre while outline copies of it (transparent fill, a thin
// stroke in the same colour, line-height 1.0) stack above and below at ±1 line, ±2 lines…, fading with distance
// (60% / 30% / 15%…). Entry: the copies expand out of the word to their slots (stagger 0.04 s, 0.25–0.4 s each). Hold:
// the copy stack scrolls continuously (speed px/s, wrapping by one line, the fade following each copy's live distance)
// while the solid word holds; the horizontal variant runs each echo row sideways instead, rows alternating direction.
// Optional thin diagonal line crossing the lockup.
// Source: our own rebuild of prompt-motion "ghinaiya-nirmal-motion-designers-are-cooked" + "sudo-kiran-no-storyboard-
// no-detailed" — reference only.
ML.define({
  id: "kinetic.outline-echo-stack",
  category: "kinetic",
  name: "Outline echo stack",
  does: "A solid word sits in the centre with outline copies stacked above and below that scroll like a marquee and fade with distance.",
  says: ["energy", "brand", "focus"],
  energy: 4,
  targets: ["word", "headline"],
  duration: [1, 5],
  params: {
    echoes: { type: "number", range: [2, 4], default: 3 },
    direction: { type: "choice", options: ["up", "down", "horizontal"], default: "up" },
    speed: { type: "number", range: [40, 160], default: 90, unit: "px/s" },
    stroke: { type: "number", range: [1, 3], default: 1.5, unit: "px" },
    diagonal: { type: "bool", default: false },
  },
  pairs: ["text-in.slam", "kinetic.marquee-wall"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:ghinaiya-nirmal-motion-designers-are-cooked", license: "reference", note: "also sudo-kiran-no-storyboard-no-detailed; our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const doc = el.ownerDocument;
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize) || 100;
    const k = Math.min(ctx.f.W, ctx.f.H) / 1080;
    if (cs.position === "static") el.style.position = "relative";
    el.style.isolation = "isolate";
    // the copies stay behind the solid word, and behind any panel laid over the scene after it (its content stays readable)
    let step = el.offsetHeight; // one line (the block, when it wraps)
    const E = Math.max(2, Math.min(4, Math.round(p.echoes)));
    const sw = p.stroke * Math.max(1, fs / 110);
    const html = el.innerHTML;
    // the text itself, not its block, measured before any copy goes in (for the diagonal)
    const range = doc.createRange(); range.selectNodeContents(el);
    const elR = el.getBoundingClientRect(), scale = elR.width / (el.offsetWidth || 1) || 1, tr = range.getBoundingClientRect(), textW = tr.width / scale, textMid = (tr.left + tr.width / 2 - elR.left) / scale;
    const horiz = p.direction === "horizontal";
    // a text stroke draws every contour, so joined Arabic letters and a variable font's overlaps show seams inside the
    // glyph; this ring is cut from the glyph's silhouette (grown, minus the glyph), clean on any backdrop
    const outlineFilter = (px) => {
      const id = "ml-outline-" + Math.round(px * 100);
      if (!doc.getElementById(id)) {
        const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.setAttribute("aria-hidden", "true"); svg.style.position = "absolute";
        svg.innerHTML = `<filter id="${id}" x="-30%" y="-60%" width="160%" height="220%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="${(px / 1.2).toFixed(2)}"/><feComponentTransfer result="fat"><feFuncA type="linear" slope="8" intercept="-0.4"/></feComponentTransfer><feComposite in="fat" in2="SourceGraphic" operator="out"/></filter>`;
        ctx.stage.append(svg);
      }
      return `url(#${id})`;
    };
    const mk = () => {
      const c = doc.createElement("div");
      c.setAttribute("aria-hidden", "true");
      Object.assign(c.style, { position: "absolute", left: "0", top: "0", width: "100%", pointerEvents: "none", zIndex: "-1", color: cs.color, filter: outlineFilter(sw), whiteSpace: horiz ? "nowrap" : "inherit", textAlign: "inherit", lineHeight: cs.lineHeight });
      return c;
    };
    const copies = [];
    if (!horiz) {
      // slots −(E+1)…(E+1): one extra each side so the scroll wraps without a gap. Slot 0 hides behind the word at rest,
      // but it is the copy that scrolls out from behind it: without it a copy pops in once per line
      for (let j = -(E + 1); j <= E + 1; j++) {
        const c = mk(); c.innerHTML = html; el.append(c); copies.push({ c, j });
      }
    } else {
      // rows of the word on one line, repeated well past the frame; a unit is measured on one line, since a headline
      // that wraps in its slot runs wider here
      const gap = fs * 0.5;
      const word = () => { const s = doc.createElement("span"); s.innerHTML = html; s.style.flex = "none"; s.style.direction = rtl ? "rtl" : "ltr"; return s; };
      const probe = mk(); Object.assign(probe.style, { width: "auto", visibility: "hidden" }); const one = word(); probe.append(one); el.append(probe);
      const size = ctx.box(one); probe.remove();
      const unit = size.w + gap, count = 2 * Math.ceil(ctx.f.W / unit) + 4;
      step = size.h;
      for (let j = -E; j <= E; j++) {
        if (j === 0) continue;
        const c = mk();
        Object.assign(c.style, { width: "auto", left: "50%", display: "flex", gap: gap + "px", direction: "ltr" });
        for (let i = 0; i < count; i++) c.append(word());
        el.append(c); copies.push({ c, j, unit, count });
      }
    }
    // the diagonal: a hairline crossing the lockup
    let diag = null;
    if (p.diagonal) {
      diag = doc.createElement("div");
      Object.assign(diag.style, { position: "absolute", left: textMid + "px", top: "50%", width: textW * 1.3 + "px", height: Math.max(1, 1.5 * k) + "px", background: cs.color, opacity: "0.6", transformOrigin: "50% 50%", pointerEvents: "none" });
      el.append(diag);
    }
    // each copy's entry time: from the centre outward, stagger 0.04 s
    const tIn = (j) => at + Math.max(0, Math.abs(j) - 1) * 0.04;
    const travel = 0.32;
    const flow = at + E * 0.04 + travel; // the scroll starts once all are in
    const op = (d) => { const a = Math.abs(d); if (a < 0.5) return 0; if (a > E + 0.5) return 0; const base = 0.6 * Math.pow(0.5, Math.max(0, a - 1)); return a > E ? base * (E + 0.5 - a) * 2 : a < 1 ? base * (a - 0.5) * 2 : base; };
    ctx.sfx(at, "whoosh.soft", 0.3);
    const sign = p.direction === "down" ? 1 : -1;
    return {
      draw(t) {
        const leave = ML.ease(t, end - 0.35, end - 0.05);
        const run = Math.max(0, t - flow) * p.speed * k;
        for (const { c, j, unit, count } of copies) {
          const e = ML.out(t, tIn(j), tIn(j) + travel);
          if (!horiz) {
            // live position in lines: its slot, plus the wrapped scroll
            const sh = ((run / step) % 1) * sign;
            let d = j + sh;
            // wrap: keep every copy within ±(E+1.5) lines
            const span = (E + 1) * 2 + 1;
            if (d > E + 1.5) d -= span; if (d < -(E + 1.5)) d += span;
            const dd = d * e * (1 - leave);
            c.style.transform = `translate3d(0, ${(dd * step).toFixed(2)}px, 0)`;
            c.style.opacity = (op(d) * Math.min(1, e * 1.5) * (1 - leave)).toFixed(4);
            c.style.visibility = e > 0 ? "visible" : "hidden";
          } else {
            const dir = (j % 2 === 0 ? 1 : -1) * (rtl ? -1 : 1);
            const off = (((run * dir) % unit) + unit) % unit;
            c.style.transform = `translate3d(${(-unit * (count / 2) - off).toFixed(2)}px, ${(j * step * e * (1 - leave)).toFixed(2)}px, 0)`;
            c.style.opacity = (op(j) * Math.min(1, e * 1.5) * (1 - leave)).toFixed(4);
            c.style.visibility = e > 0 ? "visible" : "hidden";
          }
        }
        if (diag) {
          const d = ML.ease(t, at + 0.1, at + 0.5) * (1 - leave);
          diag.style.transform = `translate(-50%, -50%) rotate(-18deg) scaleX(${d.toFixed(4)})`;
        }
      },
    };
  },
});

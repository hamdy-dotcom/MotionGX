// Tilted accent disc selector: in a row of small labels (weekdays, or the items of the target list), a tilted accent
// disc stamps in behind the chosen one (scale 0 -> 1.1 -> 1, rotate -30deg -> tilt, 0.35 s back.out(1.8)) and the
// label turns accent-ink; when the selection changes the disc hops to the next label (0.4-0.45 s, back.out(1.4) or
// power3.inOut) with a squash 1 -> 0.85 -> 1 and an extra 8deg of tilt, the labels swapping colour at the midpoint.
// Every hop is planned in setup; draw(t) only reads t. Positions are measured, so RTL rows hop the way they read.
// Source: MengTo/Skills web-design/dither-background demo (MIT): the days selector — labels 12px medium grey,
// justify-between, a 36px accent disc rounded-full -rotate-12 shadow-sm behind the selected "Tue", text semibold.
ML.define({
  id: "ui.tilted-disc-select",
  category: "ui",
  name: "Tilted accent disc selector",
  does: "In a row of small labels (e.g. weekdays), a tilted accent disc stamps in behind the chosen one and hops to the next when the selection changes.",
  says: ["choice", "time", "playful"],
  energy: 2,
  targets: ["list", "label"],
  duration: [0.4, 3],
  params: {
    shape: { type: "choice", options: ["disc", "pill", "rounded-square"], default: "disc" },
    tilt: { type: "number", range: [-20, -6], default: -12, unit: "deg" },
    items: { type: "number", range: [3, 7], default: 7 },
    ease: { type: "choice", options: ["back.out(1.4)", "power3.inOut"], default: "back.out(1.4)" },
    start: { type: "number", range: [0, 6], default: 2 },
    hops: { type: "number", range: [0, 4], default: 2 },
    every: { type: "number", range: [0.5, 1.5], default: 0.85, unit: "s" },
    hop: { type: "number", range: [0.4, 0.45], default: 0.42, unit: "s" },
  },
  pairs: ["ui.segmented-slide", "ui.dot-tab-switch", "ui.cursor-glide-click"],
  avoid: ["luxury", "problem"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "MengTo/Skills:web-design/dither-background/demo/index.html", license: "MIT", note: "days selector markup; the stamp and hop motion is our own" },
  setup(ctx) {
    const { el, p, at, end, rtl, stage, f } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const n0 = Math.round(ML.clamp(p.items, 3, 7));
    // the row: the target list's own items, or a built row of weekday labels
    let row, labels, built = false;
    const kids = el ? [...el.children].filter((c) => (c.textContent || "").trim()) : [];
    if (el && kids.length >= 2 && el.tagName !== "SPAN") {
      row = el;
      labels = kids.slice(0, Math.max(2, Math.min(kids.length, 7)));
    } else {
      built = true;
      const days = rtl ? ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const host = el || ctx.scene || stage; // the scene hides a built row with it (never left on the stage)
      const fs = el ? (parseFloat(getComputedStyle(el).fontSize) || 22) * 1.05 : (34 * Math.min(f.W, f.H)) / 1080;
      row = mk("div", `display:flex;justify-content:space-between;align-items:center;font:var(--x-body-weight) ${fs.toFixed(1)}px var(--x-body-font);color:var(--x-dim);letter-spacing:0;text-transform:none;padding:${(fs * 0.9).toFixed(1)}px ${(fs * 0.6).toFixed(1)}px;` + (el ? `margin-top:0.6em;width:max-content;min-width:100%;column-gap:${(fs * 1.5).toFixed(1)}px;box-sizing:border-box` : `position:absolute;left:${f.pic.x + f.pic.w * 0.1}px;width:${f.pic.w * 0.8}px;top:${f.pic.y + f.pic.h / 2}px;translate:0 -50%;z-index:20;box-sizing:border-box;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:var(--x-radius);box-shadow:var(--x-shadow)`), host);
      if (el && getComputedStyle(el).display === "inline") el.style.display = "block";
      labels = days.slice(0, n0).map((d) => mk("span", "", row, d));
    }
    if (getComputedStyle(row).position === "static") row.style.position = "relative";
    for (const l of labels) { if (getComputedStyle(l).position === "static") l.style.position = "relative"; l.style.zIndex = "1"; }
    // measure (row-local px) — read every frame from the laid-out row, so a late font swap can't leave the disc behind
    // (nothing this move sets changes layout: the disc is absolute and moves by transform, labels only change colour)
    const measure = () => {
      const rb = row.getBoundingClientRect(), k = rb.width / (row.offsetWidth || 1) || 1, cl = row.clientLeft, ct = row.clientTop;
      return labels.map((l) => { const r = l.getBoundingClientRect(); return { x: (r.left - rb.left) / k - cl + r.width / k / 2, y: (r.top - rb.top) / k - ct + r.height / k / 2, w: r.width / k, h: r.height / k }; });
    };
    const fsOf = () => parseFloat(getComputedStyle(labels[0]).fontSize) || 24;
    // the disc's size: 36px for 12px labels (3em) — grown to hold a wider label, a pill when the label is long
    const sizeOf = (b) => {
      const fs = fsOf(), d = Math.max(fs * 3, b.h + fs * 0.6);
      if (p.shape === "pill" || b.w > d * 0.95) return { w: Math.max(d, b.w + fs * 1.6), h: d * (p.shape === "pill" ? 0.82 : 1), r: "var(--x-radius-s)" };
      return { w: d, h: d, r: p.shape === "rounded-square" ? `${(d * 0.3).toFixed(1)}px` : "50%" };
    };
    const disc = mk("span", "position:absolute;left:0;top:0;z-index:0;will-change:transform;background:var(--x-accent);box-shadow:0 1px 2px color-mix(in srgb, var(--x-ink) 18%, transparent);pointer-events:none;opacity:0");
    row.prepend(disc);
    // the plan: stamp on `start` at `at`, then hops while there is time
    const N = labels.length;
    const seq = [Math.round(ML.clamp(p.start, 0, N - 1))];
    const times = [at];
    for (let h = 0; h < Math.round(p.hops); h++) {
      const t0 = at + 0.35 + 0.2 + h * p.every + (p.every - 0.35) * 0.5;
      if (t0 + p.hop > end - 0.35) break;
      const prev = seq[seq.length - 1];
      let step = 1 + Math.floor(ML.rnd(h + 1, 9) * 2);
      let nx = prev + (ML.rnd(h + 1, 3) < 0.35 ? -step : step);
      if (nx > N - 1) nx = prev - step; if (nx < 0) nx = prev + step;
      nx = ML.clamp(nx, 0, N - 1);
      if (nx === prev) nx = prev > 0 ? prev - 1 : 1; // a short row: never a hop to where it already is
      seq.push(nx); times.push(t0);
    }
    ctx.sfx(at, "pop.soft", 0.35);
    times.slice(1).forEach((t0) => ctx.sfx(t0, "pop.soft", 0.28));
    const quart = (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2); // power3.inOut (ML.ease is one power softer)
    const hopE = (t, a, b) => (p.ease === "power3.inOut" ? quart(ML.lin(t, a, b)) : ML.back(t, a, b, 1.4));
    const leaveAt = end - 0.3;
    return {
      draw(t) {
        const boxes = measure();
        // which hop we're in
        let i = 0; while (i + 1 < times.length && t >= times[i + 1]) i++;
        const from = boxes[seq[i]];
        let x = from.x, y = from.y, sz = sizeOf(from), sq = 1, wide = 1, rot = p.tilt, prevSel = -1, mid = 1, gone = 1;
        if (i > 0) {
          // hopping from seq[i-1] to seq[i]
          const a = times[i], b = a + p.hop, A = boxes[seq[i - 1]], B = boxes[seq[i]], u = ML.lin(t, a, b), e = hopE(t, a, b);
          const sa = sizeOf(A), sb = sizeOf(B);
          x = A.x + (B.x - A.x) * e; y = A.y + (B.y - A.y) * e;
          sz = { w: sa.w + (sb.w - sa.w) * ML.clamp(e), h: sa.h + (sb.h - sa.h) * ML.clamp(e), r: u < 0.5 ? sa.r : sb.r };
          const bump = Math.sin(Math.PI * u);
          sq = 1 - 0.15 * bump; wide = 1 + 0.06 * bump; rot = p.tilt - 8 * bump;
          // the labels swap as the disc crosses between them (the middle of its travel, whichever ease carries it)
          mid = ML.clamp((ML.clamp(e) - 0.35) / 0.3); gone = ML.clamp(ML.clamp(e) / 0.35); prevSel = seq[i - 1];
        }
        // stamp in
        const st = ML.back(t, at, at + 0.35, 1.8), stamped = t >= at;
        const rotIn = -30 + (p.tilt + 30) * ML.clamp(ML.out(t, at, at + 0.35));
        const leave = ML.ease(t, leaveAt, leaveAt + 0.25);
        disc.style.opacity = stamped ? (ML.clamp(ML.lin(t, at, at + 0.08)) * (1 - leave)).toFixed(4) : "0";
        // the stamp and squash are drawn as size, not as a scale transform (a changing scale is re-rastered differently by
        // the compositor depending on the frames before it; a sized box is the same every time)
        const grow = t < at + 0.35 ? Math.max(0, st) : 1, w = sz.w * grow * wide, h = sz.h * grow * sq;
        disc.style.width = w.toFixed(2) + "px"; disc.style.height = h.toFixed(2) + "px"; disc.style.borderRadius = sz.r;
        // whole-pixel placement: a composited layer at a fractional offset keeps the raster offset of earlier frames
        disc.style.translate = `${Math.round(x - w / 2)}px ${Math.round(y - h / 2)}px`;
        // a long pill tilts less (a full tilt would leave the label's ends off the disc)
        const tk = Math.min(1, (sz.h / sz.w) * 1.15);
        disc.style.rotate = `${((t < at + 0.35 ? rotIn : rot) * tk).toFixed(2)}deg`;
        // labels: grey, the chosen one accent-ink (stroke for semibold, so nothing reflows); swap at the hop's midpoint
        const target = seq[i];
        labels.forEach((l, j) => {
          let on = 0;
          if (stamped && leave < 1) {
            if (i === 0) on = j === target ? ML.clamp(ML.lin(t, at + 0.05, at + 0.2)) : 0;
            else on = j === target ? mid : j === prevSel ? 1 - mid : 0;
          }
          on *= 1 - leave;
          l.style.color = on > 0.001 ? `color-mix(in srgb, var(--x-accent-ink) ${(on * 100).toFixed(1)}%, var(--x-dim))` : (built ? "" : "var(--x-dim)");
          l.style.webkitTextStroke = on > 0.5 ? "0.025em currentColor" : "";
          if (!built) {
            // a list item with its own panel lets the disc show through while chosen
            // (the panel clears ahead of the arriving disc, so it never hides the disc mid-hop)
            let clear = on;
            if (i > 0 && j === target) clear = Math.max(on, gone * (1 - leave));
            l.style.backgroundColor = clear > 0.001 ? `color-mix(in srgb, var(--x-panel) ${((1 - clear) * 100).toFixed(1)}%, transparent)` : "";
            l.style.borderColor = on > 0.5 ? "transparent" : "";
            l.style.boxShadow = on > 0.5 ? "none" : ""; // swapped at the midpoint with the colour, while the disc covers it
          }
        });
        if (built && row !== el) row.style.opacity = String(1 - leave);
      },
    };
  },
});

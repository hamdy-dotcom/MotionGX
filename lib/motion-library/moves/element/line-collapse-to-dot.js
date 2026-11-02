// Line collapses into a dot that becomes a letter: a 1 px accent line draws across to half the name's width (0.5 s
// power2.out), then thickens 1 → 8 px while its length shrinks to nothing toward the target point (0.3 s power3.in)
// and turns into a filled circle that scales 0 → 1 on back.out(2) right there — the 'O' of the name (a round Latin
// letter, hidden under it), a full stop after the last word, or the logo's mark — while the rest of the letters rise
// in around it, nearest first. Arabic: the target is the dot (nuqta-like, after the last word on the left) or the
// logo mark, never a letter split out of a joined word; Arabic words rise whole.
// Source: prompt-motion "blushpetal795-wtf-made-this-with" (reference only — rebuilt as our own code).
ML.define({
  id: "element.line-collapse-to-dot",
  category: "element",
  name: "Line collapses into a dot that becomes a letter",
  does: "A thin line draws across, thickens, collapses into a circle and lands as the 'O' (or dot) of the name while the other letters rise around it.",
  says: ["brand", "arrival", "precision"],
  energy: 3,
  targets: ["logo", "word", "shape"],
  duration: [1, 2],
  params: {
    target: { type: "choice", options: ["letter", "dot", "logo"], default: "dot" },
    draw: { type: "number", range: [0.3, 0.8], default: 0.5, unit: "s" },
    collapse: { type: "number", range: [0.2, 0.5], default: 0.3, unit: "s" },
    thickness: { type: "number", range: [4, 16], default: 8, unit: "px" },
  },
  pairs: ["text-in.punchline", "element.logo-collapse-to-seed"],
  avoid: ["problem"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "prompt-motion:blushpetal795-wtf-made-this-with", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    if (!el) return null;
    const S = ctx.box(el);
    const isSvg = el.tagName.toLowerCase() === "svg";
    const layer = doc.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:7;";
    host.append(layer);

    // what rises (pieces) and where the dot lands (cx, cy, diameter)
    let pieces = [], hidden = null, cx, cy, D;
    let mode = p.target;
    if (isSvg) {
      const texts = [...el.querySelectorAll("text")];
      const marks = [...el.children].filter((c) => !["text", "defs", "title", "desc"].includes(c.tagName.toLowerCase()));
      pieces = [...texts, ...(mode === "logo" ? [] : marks)];
      if (mode === "letter") mode = marks.length ? "logo" : "dot";
      if (mode === "logo" && marks.length) {
        const bs = marks.map((m) => ctx.box(m)), x0 = Math.min(...bs.map((b) => b.x)), y0 = Math.min(...bs.map((b) => b.y)), x1 = Math.max(...bs.map((b) => b.x + b.w)), y1 = Math.max(...bs.map((b) => b.y + b.h));
        cx = (x0 + x1) / 2; cy = (y0 + y1) / 2; D = Math.min(x1 - x0, y1 - y0); hidden = marks;
      } else { mode = "dot"; pieces = [...texts, ...marks]; }
      if (mode === "dot") { const tb = texts.length ? ctx.box(texts[texts.length - 1]) : S; D = tb.h * 0.22; cx = rtl ? tb.x - D * 0.9 : tb.x + tb.w + D * 0.9; cy = tb.y + tb.h * 0.78 - D / 2; }
    } else {
      const arabic = ML.ARABIC.test(el.textContent || "");
      if (mode === "letter" && arabic) mode = "dot";
      if (mode === "logo") { const m = el.querySelector("img, svg"); if (m) { const b = ctx.box(m); cx = b.x + b.w / 2; cy = b.y + b.h / 2; D = Math.min(b.w, b.h); hidden = [m]; } else mode = "dot"; }
      const units = ML.split(el, mode === "letter" ? "chars" : "words");
      pieces = units.filter((u) => !hidden || !hidden.some((h) => u.contains(h)));
      if (mode === "letter") {
        const o = units.find((u) => /^[oO0]$/.test(u.textContent)) || units.find((u) => /^[QCGDbdpq]$/.test(u.textContent)) || null;
        if (o) { const b = ctx.box(o); D = Math.min(b.w * 0.86, b.h * 0.5); cx = b.x + b.w / 2; cy = b.y + b.h * 0.6; hidden = [o]; pieces = pieces.filter((u) => u !== o); } else mode = "dot";
      }
      if (mode === "dot") { const fs = parseFloat(getComputedStyle(el).fontSize) || S.h; const last = units[units.length - 1]; const b = last ? ctx.box(last) : S; D = fs * 0.2; cx = rtl ? b.x - D * 0.9 : b.x + b.w + D * 0.9; cy = b.y + b.h * 0.76 - D / 2; }
    }
    D = Math.max(6, D);
    const fs = isSvg ? S.h : parseFloat(getComputedStyle(el).fontSize) || S.h;
    const thick = Math.min(ML.clamp(p.thickness, 4, 16) * (fs / 100) * 1.4 + 2, D * 0.8);
    const line = doc.createElement("div");
    line.style.cssText = `position:absolute;left:0;top:0;height:2px;background:var(--x-accent);border-radius:999px;`;
    const dot = doc.createElement("div");
    dot.style.cssText = `position:absolute;left:${cx - D / 2}px;top:${cy - D / 2}px;width:${D}px;height:${D}px;border-radius:50%;background:var(--x-accent);transform:scale(0);`;
    layer.append(line, dot);
    // the line runs across half the name, from the reading start, at the dot's height
    const L = Math.max(S.w * 0.5, D * 4);
    const startX = rtl ? Math.min(f.W - 8, Math.max(cx + D, S.x + S.w)) : Math.max(8, Math.min(cx - D, S.x));
    const dir = rtl ? -1 : 1;
    const a0 = at, a1 = a0 + ML.clamp(p.draw, 0.3, 0.8), a2 = a1 + ML.clamp(p.collapse, 0.2, 0.5);
    const p2out = (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), 2), p3in = (t, a, b) => Math.pow(ML.lin(t, a, b), 3);
    // letters rise nearest the dot first
    const order = pieces.map((u) => { const b = ctx.box(u); return Math.abs(b.x + b.w / 2 - cx); });
    const rank = order.map((d, i) => order.filter((x, j) => x < d || (x === d && j < i)).length);
    const isSvgPiece = (u) => u instanceof SVGElement;
    // an SVG's own units per stage px (its translate is in user units)
    const userPerPx = isSvg && el.viewBox && el.viewBox.baseVal && el.viewBox.baseVal.height ? el.viewBox.baseVal.height / S.h : 1;
    if (hidden) hidden.forEach((h) => { h.style.opacity = "0"; });
    ctx.sfx(a0, "whoosh.soft", 0.15);
    ctx.sfx(a2 - 0.04, "pop", 0.45);
    const leave0 = Math.max(a2 + 0.6, end - 0.25);
    return {
      draw(t) {
        const lv = ML.clamp((t - leave0) / 0.2);
        layer.style.opacity = (1 - lv).toFixed(4);
        el.style.opacity = (1 - lv).toFixed(4);
        // the line: draws, then thickens while its two ends close on the dot
        const d1 = p2out(t, a0, a1), c = p3in(t, a1, a2);
        const tail = startX, head = startX + dir * L * d1;
        const l = tail + (cx - tail) * c, r = head + (cx - head) * c;
        const th = 2 + (thick - 2) * c;
        const lo = Math.min(l, r), w = Math.abs(r - l);
        line.style.visibility = t >= a0 && t < a2 && w > 0.5 ? "visible" : "hidden";
        line.style.transform = `translate(${lo.toFixed(2)}px, ${(cy - th / 2).toFixed(2)}px)`;
        line.style.width = Math.max(th, w).toFixed(2) + "px";
        line.style.height = th.toFixed(2) + "px";
        // the dot
        const ds = t < a2 - 0.06 ? 0 : ML.back(t, a2 - 0.06, a2 + 0.34, 2);
        dot.style.transform = `scale(${Math.max(0, ds).toFixed(4)})`;
        // the mark under the dot (logo): the dot hands over to it once landed
        if (hidden && mode === "logo") { const h = ML.ease(t, a2 + 0.35, a2 + 0.6); hidden.forEach((m) => { m.style.opacity = h.toFixed(4); }); dot.style.opacity = (1 - h).toFixed(4); }
        // the rest rises in around it
        pieces.forEach((u, i) => {
          const s = a2 - 0.1 + rank[i] * 0.04, k = ML.land(t, s, s + 0.45);
          u.style.opacity = k.toFixed(4);
          const dy = (1 - k) * fs * 0.45;
          u.style.translate = `0 ${(isSvgPiece(u) ? dy * userPerPx : dy).toFixed(3)}px`;
        });
      },
    };
  },
});

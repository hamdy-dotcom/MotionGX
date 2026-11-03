// Square splits into a grid logo mark: a small ink square grows (20 → 80 of 80, back.out, 0.35 s), then splits into
// four (2 × 2) or nine (3 × 3) tiles that separate with `gap` between them (0.3 s power3.out; each tile shrinks from its
// packed quarter to (S − (n − 1) gap) / n so the mark keeps its outer size) while some tiles fade to a secondary tone
// (the accent). The mark then slides toward the start side (right in Arabic) as the wordmark appears beside it, wiped in
// from the mark's side. The wordmark is the `name` param, else the target logo's own text. On a target the lockup keeps to
// the target's height when the target has neighbours, so it never runs over them (`size` sizes it when it stands alone). A run under 1.45 s
// compresses the build, so the wordmark still arrives inside ctx.end. Tile corners follow the look's radius.
// Source: prompt-motion amol909s-opus-5-5-on-medium (reference only: our own rebuild).
ML.define({
  id: "element.square-split-logo",
  category: "element",
  name: "Square splits into a grid logo mark",
  does: "A small square grows, then splits into four (or nine) tiles forming the logo mark, which slides aside for the wordmark.",
  says: ["brand", "arrival"],
  energy: 3,
  targets: ["logo", "shape"],
  duration: [1, 2],
  params: {
    grid: { type: "choice", options: ["2x2", "3x3"], default: "2x2" },
    gap: { type: "number", range: [4, 16], default: 8, unit: "px" },
    size: { type: "number", range: [0.08, 0.3], default: 0.14 },
    wordmark: { type: "bool", default: true },
    name: { type: "text", default: "" },
  },
  pairs: ["text-in.inline-logo", "transition.logo-through-dissolve"],
  avoid: ["problem"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "snap",
  source: { from: "prompt-motion:amol909s-opus-5-5-on-medium", license: "reference", note: "the grow → split → slide-aside logo build rebuilt as our own DOM, every frame from t" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const ob = own ? ctx.box(own) : null;
    const alone = !own || [...own.parentElement.children].filter((c) => c.getBoundingClientRect().width > 0).length === 1;
    const S = Math.max(ob ? Math.min(ob.h, ob.w) : 0, Math.min(f.W, f.H) * (alone ? p.size : 0.04));
    const n = p.grid === "3x3" ? 3 : 2;
    const gap = (p.gap * S) / 80; // the spec's 8 px gap on an 80 px mark
    const tileF = (S - (n - 1) * gap) / n, tileP = S / n;
    const name = (p.name || (own ? own.textContent.trim() : "") || (rtl ? "براند" : "brand")).slice(0, 24);

    // the lockup: [mark][wordmark] (flex follows the page direction: the mark sits on the start side)
    const cx = ob ? ob.x + ob.w / 2 : f.pic.x + f.pic.w / 2, cy = ob ? ob.y + ob.h / 2 : f.pic.y + f.pic.h / 2;
    const wrap = mk("div", `position:absolute;left:0;top:0;width:${f.W}px;height:${f.H}px;pointer-events:none;z-index:6;`, host);
    const mark = mk("div", `position:absolute;width:${S}px;height:${S}px;`, wrap);
    const tiles = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const i = r * n + c;
      const tile = mk("div", `position:absolute;left:0;top:0;width:${tileP}px;height:${tileP}px;background:var(--x-ink);`, mark);
      const tone = mk("div", "position:absolute;inset:0;background:var(--x-accent);opacity:0;border-radius:inherit;", tile);
      // which tiles take the secondary tone: one corner for 2 × 2, a checker for 3 × 3
      const second = n === 2 ? i === 3 : (r + c) % 2 === 1;
      tiles.push({ tile, tone, r, c, second });
    }
    const fs = S * 0.62;
    const word = p.wordmark ? mk("div", `position:absolute;white-space:nowrap;font:var(--x-head-weight) ${fs}px/1 var(--x-head-font);letter-spacing:${rtl ? 0 : "var(--x-head-track)"};color:var(--x-ink);`, wrap, name) : null;
    let ww = word ? word.offsetWidth : 0;
    const maxW = f.safe.w - S - S * 0.3;
    if (word && ww > maxW) { word.style.fontSize = ((fs * maxW) / ww).toFixed(1) + "px"; ww = word.offsetWidth; }
    const wgap = S * 0.3;
    const total = S + (word ? wgap + ww : 0);
    const cxc = ML.clamp(cx, f.safe.x + total / 2, f.safe.x + f.safe.w - total / 2);
    // final positions: the mark on the start side of the lockup, the wordmark after it
    const startSide = rtl ? 1 : -1;
    const markX1 = cxc + startSide * (total / 2 - S / 2);
    const markX0 = cxc;
    const wordX = rtl ? markX1 - S / 2 - wgap - ww : markX1 + S / 2 + wgap;
    if (word) { word.style.left = wordX.toFixed(1) + "px"; word.style.top = (cy - word.offsetHeight / 2).toFixed(1) + "px"; }

    // timing
    const fit = ML.clamp((end - at - 0.2) / 1.45, 0.4, 1); // the whole build takes 1.45 s; a shorter run compresses it
    const tGrow = at, tSplit = at + 0.42 * fit, tSlide = at + 0.82 * fit;
    const p3 = (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), 3);
    ctx.sfx(tGrow, "pop.soft", 0.3);
    ctx.sfx(tSplit, "snap", 0.4);
    if (word) ctx.sfx(tSlide, "whoosh.soft", 0.25);
    const leave = Math.max(tSlide + 0.63 * fit, end - 0.2);

    return {
      draw(t) {
        const on = t >= at - 1e-6;
        wrap.style.visibility = on ? "visible" : "hidden";
        if (own) own.style.visibility = on ? "hidden" : "";
        const q = ML.ease(t, leave, leave + 0.25);
        wrap.style.opacity = (1 - q).toFixed(4);
        // grow: 20/80 → 1 with a little overshoot (2D only)
        const g = 0.25 + 0.75 * ML.back(t, tGrow, tGrow + 0.35 * fit, 1.7);
        const sp = p3(t, tSplit, tSplit + 0.3 * fit);
        const sl = p3(t, tSlide, tSlide + 0.55 * fit);
        const mx = markX0 + (markX1 - markX0) * (word ? sl : 0);
        mark.style.left = (mx - S / 2).toFixed(2) + "px";
        mark.style.top = (cy - S / 2).toFixed(2) + "px";
        mark.style.scale = Math.abs(g - 1) < 1e-4 ? "none" : g.toFixed(4);
        // a corner of the whole mark keeps its round from the start; an inner corner only opens as the split does
        const corner = (px) => `min(var(--x-radius), ${px.toFixed(2)}px)`;
        const outer = corner(S * 0.06 + (tileF * 0.18 - S * 0.06) * sp), inner = corner(tileF * 0.18 * sp);
        for (const T of tiles) {
          const size = tileP + (tileF - tileP) * sp + (1 - sp) * 1; // packed tiles overlap a pixel: no seams in the whole square
          const x = T.c * (tileP + (tileF + gap - tileP) * sp), y = T.r * (tileP + (tileF + gap - tileP) * sp);
          T.tile.style.width = T.tile.style.height = size.toFixed(2) + "px";
          T.tile.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
          T.tile.style.borderRadius = `${T.r === 0 && T.c === 0 ? outer : inner} ${T.r === 0 && T.c === n - 1 ? outer : inner} ${T.r === n - 1 && T.c === n - 1 ? outer : inner} ${T.r === n - 1 && T.c === 0 ? outer : inner}`;
          T.tone.style.opacity = T.second ? ML.ease(t, tSplit + 0.1 * fit, tSplit + 0.45 * fit).toFixed(4) : "0";
        }
        if (word) {
          const w = p3(t, tSlide + 0.12 * fit, tSlide + 0.62 * fit);
          const cut = ((1 - w) * 100).toFixed(2);
          word.style.opacity = Math.min(1, w * 1.6).toFixed(4);
          word.style.clipPath = w >= 1 ? "none" : rtl ? `inset(-20% -5% -20% ${cut}%)` : `inset(-20% ${cut}% -20% -5%)`;
          word.style.translate = `${((1 - w) * startSide * S * 0.25).toFixed(2)}px 0`; // it starts tucked toward the mark
        }
      },
    };
  },
});

// Char select sweep: a one-character block steps letter by letter across the title like a terminal selection cursor.
// The block is exactly one character wide and the font's cap height tall (measured on a canvas in the title's own face;
// in Arabic it also takes in the letters' descent), set on each letter's baseline. It inverts what it covers: "invert"
// paints it in the text's own colour with the glyph in the look's ground, a look colour with the glyph in that colour's
// ink. The inverted glyph is a copy of the whole word clipped by the block, not a blend, so it holds inside a transformed
// scene (where a difference blend loses the ground behind it). Nothing is split: positions come from the laid-out text,
// so Arabic keeps its joins and the block walks them right to left, the way an editor selects Arabic.
// Its position moves in discrete steps of one character — steps(n) over `speed`, never eased: the stepping is what
// reads as a terminal. In reading order, or against it; at the end it clears or keeps the last letter selected.
// Source: prompt-motion ibrahimwasim240-opus-5-5-max-effort (reference) — our own code.
ML.define({
  id: "text-emphasis.char-select-sweep",
  category: "text-emphasis",
  name: "Selection block steps through the letters",
  does: "A one-character inverted block steps letter by letter across the title like a text selection cursor.",
  says: ["focus", "tech"],
  energy: 2,
  targets: ["headline", "word"],
  duration: [0.5, 2],
  params: {
    speed: { type: "number", range: [0.4, 1.6], default: 0.8, unit: "s" },
    colour: { type: "choice", options: ["invert", "accent", "accent-2", "ink"], default: "invert" },
    direction: { type: "choice", options: ["reading", "ltr", "rtl"], default: "reading" },
    end: { type: "choice", options: ["clear", "hold-last"], default: "clear" },
    delay: { type: "number", range: [0, 1], default: 0.2, unit: "s" },
  },
  pairs: ["text-emphasis.blink-prompt", "text-in.punchline"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "prompt-motion:ibrahimwasim240-opus-5-5-max-effort", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const words = ML.split(el, "words").filter((w) => w.textContent.trim());
    if (!words.length) return null;
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize) || 104;
    const er = el.getBoundingClientRect(), k = er.width / (el.offsetWidth || 1) || 1;
    const local = (r) => ({ x: (r.left - er.left) / k - el.clientLeft, y: (r.top - er.top) / k - el.clientTop, w: r.width / k, h: r.height / k });
    // cap height of this face (the ink of "H" above the baseline)
    const capH = (() => {
      const W = Math.ceil(fs * 2), cv = document.createElement("canvas"); cv.width = W; cv.height = W;
      const g = cv.getContext("2d"); g.font = `${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`; g.fillText("H", fs * 0.3, fs * 1.5);
      const d = g.getImageData(0, 0, W, W).data;
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 110) return fs * 1.5 - y;
      return fs * 0.7;
    })();
    // one step per visible character (a letter with its marks), in logical order, which is reading order in both scripts
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" }), steps = [];
    for (const w of words) {
      const wb = local(w.getBoundingClientRect()), pr = document.createElement("i");
      Object.assign(pr.style, { display: "inline-block", width: "0", height: "0", verticalAlign: "baseline" });
      const walker = document.createTreeWalker(w, NodeFilter.SHOW_TEXT), nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      w.append(pr); const base = local(pr.getBoundingClientRect()).y; pr.remove();
      const arabic = ML.ARABIC.test(w.textContent), top = base - capH * (arabic ? 1.3 : 1), h = arabic ? capH * 1.3 + fs * 0.32 : capH;
      for (const node of nodes) for (const g of seg.segment(node.textContent)) {
        const r = document.createRange(); r.setStart(node, g.index); r.setEnd(node, g.index + g.segment.length);
        const b = local(r.getBoundingClientRect());
        if (b.w > 0.5 && g.segment.trim()) steps.push({ x: b.x, w: b.w, y: top, h, text: w.textContent, wx: wb.x, wy: wb.y, ww: wb.w });
      }
    }
    const n = steps.length;
    if (!n) return null;
    if ((p.direction === "ltr" && rtl) || (p.direction === "rtl" && !rtl)) steps.reverse();
    const block = document.createElement("div"), glyph = document.createElement("div");
    const pad = fs * 0.03, solid = p.colour === "invert" ? "currentColor" : `var(--x-${p.colour})`;
    Object.assign(block.style, { position: "absolute", left: "0", top: "0", display: "none", overflow: "hidden", pointerEvents: "none", zIndex: "2", background: solid });
    Object.assign(glyph.style, { position: "absolute", whiteSpace: "pre", textAlign: "start", color: p.colour === "accent" || p.colour === "accent-2" ? "var(--x-accent-ink)" : "var(--x-ground)" });
    block.append(glyph);
    el.append(block);
    const t0 = at + p.delay, sp = Math.min(ML.clamp(p.speed, 0.2, 3), Math.max(0.2, end - t0 - 0.05)), t1 = t0 + sp;
    for (let i = 0; i < 3; i++) ctx.sfx(t0 + (i / 3) * sp, "key", 0.12);
    return {
      draw(t) {
        let idx = -1;
        if (t >= t0 && t < t1) idx = Math.min(n - 1, Math.floor(((t - t0) / sp) * n)); // steps(n), never eased
        else if (t >= t1 && p.end === "hold-last" && t < end - 0.04) idx = n - 1;
        if (idx < 0) { block.style.display = "none"; return; }
        const b = steps[idx], x = b.x - pad, y = b.y - pad;
        Object.assign(block.style, { display: "block", left: x.toFixed(2) + "px", top: y.toFixed(2) + "px", width: (b.w + pad * 2).toFixed(2) + "px", height: (b.h + pad * 2).toFixed(2) + "px" });
        glyph.textContent = b.text;
        Object.assign(glyph.style, { left: (b.wx - x).toFixed(2) + "px", top: (b.wy - y).toFixed(2) + "px", width: b.ww.toFixed(2) + "px" });
      },
    };
  },
});

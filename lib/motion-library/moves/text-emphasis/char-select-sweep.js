// Char select sweep: a one-character block steps letter by letter across the title like a terminal selection cursor.
// The block is exactly one character wide and the font's cap height tall (measured on a canvas in the title's own
// face), set on each letter's baseline. "invert" paints it in the lighter of the look's ink / ground with
// mix-blend-mode difference, so it inverts whatever it covers (the selection look) on any look; a look colour paints
// it at 70 %. Its position moves in discrete steps of one character — steps(n) over `speed`, never eased: the stepping
// is what reads as a terminal. Left → right or right → left; at the end it clears or keeps the last letter selected.
// Letters are split, so Arabic (whose letters join) is not offered this move.
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
    direction: { type: "choice", options: ["ltr", "rtl"], default: "ltr" },
    end: { type: "choice", options: ["clear", "hold-last"], default: "clear" },
    delay: { type: "number", range: [0, 1], default: 0.2, unit: "s" },
  },
  pairs: ["text-emphasis.blink-prompt", "text-in.punchline"],
  avoid: ["luxury", "calm"],
  rtl: false,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "prompt-motion:ibrahimwasim240-opus-5-5-max-effort", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const chars = ML.split(el, "chars").filter((c) => c.textContent.trim());
    const n = chars.length;
    if (!n) return null;
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
    const boxes = chars.map((c) => {
      const pr = document.createElement("i"); Object.assign(pr.style, { display: "inline-block", width: "0", height: "0", verticalAlign: "baseline" });
      c.append(pr); const base = local(pr.getBoundingClientRect()).y; pr.remove();
      const b = local(c.getBoundingClientRect());
      return { x: b.x, w: b.w, y: base - capH, h: capH };
    });
    // the lighter of ink / ground: difference with it inverts what the block covers
    const lum = (v) => { const pr = document.createElement("i"); pr.style.color = `var(${v})`; el.append(pr); const m = getComputedStyle(pr).color.match(/[\d.]+/g) || [0, 0, 0]; pr.remove(); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
    const light = lum("--x-ink") > lum("--x-ground") ? "var(--x-ink)" : "var(--x-ground)";
    const block = document.createElement("div");
    const pad = fs * 0.03;
    Object.assign(block.style, { position: "absolute", left: "0", top: "0", pointerEvents: "none", zIndex: "2" });
    if (p.colour === "invert") Object.assign(block.style, { background: light, mixBlendMode: "difference" });
    else Object.assign(block.style, { background: `var(--x-${p.colour})`, opacity: "0.7" });
    el.append(block);
    // reading order: the chars in DOM order are left → right on a Latin line
    const order = chars.map((_, i) => i);
    if (p.direction === "rtl") order.reverse();
    const sp = ML.clamp(p.speed, 0.2, 3), t0 = at + p.delay, t1 = t0 + sp;
    for (let i = 0; i < n; i += 2) ctx.sfx(t0 + (i / n) * sp, "key", 0.12);
    return {
      draw(t) {
        let idx = -1;
        if (t >= t0 && t < t1) idx = Math.min(n - 1, Math.floor(((t - t0) / sp) * n)); // steps(n), never eased
        else if (t >= t1 && p.end === "hold-last" && t < end - 0.04) idx = n - 1;
        if (idx < 0) { block.style.display = "none"; return; }
        const b = boxes[order[idx]];
        Object.assign(block.style, { display: "block", left: (b.x - pad).toFixed(2) + "px", top: (b.y - pad).toFixed(2) + "px", width: (b.w + pad * 2).toFixed(2) + "px", height: (b.h + pad * 2).toFixed(2) + "px" });
      },
    };
  },
});

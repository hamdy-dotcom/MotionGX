// Vertical columns: the text is set in short vertical columns (writing-mode vertical-rl, columns read right to left,
// gap em apart) and appears one unit at a time down each column — opacity 0 → 1 with blur 4 → 0 over 0.3 s, 0.25 s
// apart — the next column starting to the left once the one before has finished, like poetry on a scroll. CJK is
// revealed character by character, upright. Arabic and Latin are not stacked letter by letter (Arabic would lose its
// joins): their line runs rotated down the column and is revealed word by word. Arabic turns the other way (a right-to-
// left line turned clockwise would read upwards), so it too starts at the top of each column, columns still added right
// to left. "horizontal" sets the same reveal on ordinary lines. The voice is the look's serif (or the look's own
// headline). The column length is fitted to the frame; the stagger tightens if the text would outrun the scene.
// Source: prompt-motion:demitiyageekzen-opus5-5-30s-html (reference only — our own code).
ML.define({
  id: "text-in.vertical-column",
  category: "text-in",
  name: "Vertical columns",
  does: "Short vertical columns appear a character at a time (CJK) or a word at a time (Latin, Arabic), top to bottom, columns added right to left like poetry on a scroll.",
  says: ["story", "calm", "luxury"],
  energy: 1,
  targets: ["line", "headline"],
  duration: [1.5, 6],
  params: {
    orientation: { type: "choice", options: ["vertical-rl", "horizontal"], default: "vertical-rl" },
    stagger: { type: "number", range: [0.1, 0.4], default: 0.25, unit: "s" },
    char_in: { type: "number", range: [0.2, 0.4], default: 0.3, unit: "s" },
    blur: { type: "number", range: [0, 6], default: 4, unit: "px" },
    gap: { type: "number", range: [1.2, 2.4], default: 1.6, unit: "em" },
    voice: { type: "choice", options: ["serif", "look"], default: "serif" },
  },
  pairs: ["background.paper-fibre-texture", "text-in.type-pair"],
  avoid: ["urgency", "energy", "speed"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:demitiyageekzen-opus5-5-30s-html", license: "reference", note: "our own code after the technique" },
  setup(ctx) {
    const { el, p, at, end, f } = ctx;
    if (!el) return null;
    const text = el.textContent || "";
    const cjk = /[぀-ヿ㐀-鿿豈-﫿가-힯]/.test(text);
    const vertical = p.orientation === "vertical-rl", arabic = !cjk && ML.ARABIC.test(text);
    el.style.textWrap = "wrap";
    if (p.voice === "serif") Object.assign(el.style, { fontFamily: "var(--x-serif-font, serif)", fontWeight: "400", letterSpacing: "0", textTransform: "none" });
    if (vertical) {
      const fs0 = parseFloat(getComputedStyle(el).fontSize) || 80;
      // the column length: what the frame leaves around the slot (never off the top or bottom)
      const b = ctx.box(el), mid = b.y + b.h / 2;
      const len = Math.max(120, Math.min(f.H * 0.46, 2 * Math.min(mid - Math.max(28, f.safe.y * 0.6), f.H - mid - 40)));
      // a column holds at least a few characters: the type comes down to fit the column, never the reverse
      if (fs0 * 3.2 > len) el.style.fontSize = (len / 3.2).toFixed(1) + "px";
      if (arabic) {
        // Arabic: columns built by hand, each turned as one so the line reads downwards; the words stay whole
        const ws = text.trim().split(/\s+/), probe = ws.map((w) => { const s = document.createElement("span"); s.style.cssText = "display:inline-block;white-space:nowrap"; s.textContent = w; return s; });
        el.textContent = ""; el.append(...probe);
        const wide = Math.max(...probe.map((s) => ctx.box(s).w));
        if (wide > len) el.style.fontSize = ((parseFloat(getComputedStyle(el).fontSize) * len) / wide).toFixed(1) + "px";
        const widths = probe.map((s) => ctx.box(s).w), sp = parseFloat(getComputedStyle(el).fontSize) * 0.28;
        const cols = [];
        let cur = null, run = 0;
        ws.forEach((w, i) => { if (!cur || run + sp + widths[i] > len) { cols.push((cur = [])); run = 0; } else run += sp; cur.push(w); run += widths[i]; });
        el.textContent = "";
        Object.assign(el.style, { display: "flex", direction: "rtl", flexDirection: "row", alignItems: "flex-start", justifyContent: "center", alignSelf: "center", flexShrink: "0", width: "fit-content", marginInline: "auto", letterSpacing: "0" });
        for (const c of cols) { const d = document.createElement("div"); d.style.cssText = `writing-mode:vertical-rl;text-orientation:mixed;direction:rtl;rotate:180deg;white-space:nowrap;text-align:start;line-height:${p.gap}`; d.textContent = c.join(" "); el.append(d); }
      } else Object.assign(el.style, { writingMode: "vertical-rl", textOrientation: cjk ? "upright" : "mixed", blockSize: "auto", inlineSize: len.toFixed(0) + "px", lineHeight: String(p.gap), alignSelf: "center", flexShrink: "0", textAlign: "start", letterSpacing: cjk ? "0.08em" : "", marginInline: "auto" });
      // fewer, larger columns are fine; too many columns for the width shrink the type
      const room = (f.W - f.m * 2) * 0.9;
      for (let i = 0; i < 4 && el.offsetWidth > room; i++) el.style.fontSize = ((parseFloat(getComputedStyle(el).fontSize) * room) / el.offsetWidth).toFixed(1) + "px";
    } else {
      el.style.lineHeight = String(Math.min(p.gap, 1.6));
    }
    const units = cjk ? ML.split(el, "chars") : ML.split(el, "words");
    if (!units.length) return null;
    // columns (vertical) or lines (horizontal): units sorted into reading order — columns right → left, top → bottom
    const fsz = parseFloat(getComputedStyle(el).fontSize) || 60;
    const items = units.map((u, i) => ({ u, i, b: ctx.box(u) }));
    const colKey = (x) => (vertical ? -Math.round((x.b.x + x.b.w / 2) / (fsz * 0.5)) : Math.round((x.b.y + x.b.h / 2) / (fsz * 0.5)));
    items.sort((a, c) => colKey(a) - colKey(c) || a.i - c.i);
    let st = p.stagger;
    const span = end - 0.5 - at;
    if ((items.length - 1) * st + p.char_in > span) st = Math.max(0.03, (span - p.char_in) / Math.max(1, items.length - 1));
    let prevKey = null, col = -1;
    items.forEach((x, k) => {
      x.t = at + k * st;
      const key = colKey(x);
      if (key !== prevKey) { col++; prevKey = key; ctx.sfx(x.t, "tap", 0.12); }
    });
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        el.style.opacity = (1 - leave).toFixed(4);
        for (const x of items) {
          const u = ML.out(t, x.t, x.t + p.char_in);
          x.u.style.opacity = u.toFixed(4);
          const bl = (1 - u) * p.blur;
          x.u.style.filter = u > 0 && bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : "none";
        }
      },
    };
  },
});

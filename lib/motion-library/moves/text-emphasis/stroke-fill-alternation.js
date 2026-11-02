// Stroke / fill alternation: a run of one-word beats in one place at one size (~220 px heavy head font on the 1080 ×
// 1920 stage — 0.2 of the width, 0.115 of the height — fitted to the target's width), alternating solid ink words
// with hollow ones (`stroke` px ink outline read at 220 px, so it scales: a doubled text-stroke painted under a
// ground-coloured fill, so the overlapping contours inside a variable font's glyphs never show). Each word enters with
// a mask rise (from under its own baseline, inside a clip) in 0.35 s expo.out on its spoken word (else an even beat);
// swaps are hard cuts on the beat; the last holds. Optional fill-in: a hollow word fills (stroke → fill crossfade
// 0.2 s) just before its cut. Words come from `words` ("a | b | c") else the target's own words — Arabic stays whole.
// Source: prompt-motion:reyzostyle-opus-5-5-literally-one (reference) — our own rebuild.
ML.define({
  id: "text-emphasis.stroke-fill-alternation",
  category: "text-emphasis",
  name: "Outline / filled word alternation",
  does: "In a run of one-word beats, alternate words appear as hollow outlines between solid ones, giving the cadence a rhythm.",
  says: ["step", "energy", "list"],
  energy: 3,
  targets: ["word"],
  duration: [1, 4],
  params: {
    pattern: { type: "choice", options: ["solid-outline-solid", "outline-solid"], default: "solid-outline-solid" },
    stroke: { type: "number", range: [1, 6], default: 3, unit: "px" },
    "fill-in": { type: "bool", default: false },
    words: { type: "text", default: "" },
  },
  pairs: ["rhythm.beat-cut", "text-in.mask-rise"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:reyzostyle-opus-5-5-literally-one", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, stage } = ctx;
    if (!el) return null;
    let list = String(p.words || "").split(/[|\n]/).map((s) => s.trim()).filter(Boolean);
    if (!list.length) list = (el.textContent || "").trim().split(/\s+/).map((w) => w.replace(/[,،.;:!?؟]+$/, "")).filter(Boolean);
    if (!list.length) return null;
    list = list.slice(0, 12);
    const n = list.length;
    const room = el.clientWidth || ctx.box(el).w;
    const size0 = Math.min(stage.offsetWidth * 0.2, stage.offsetHeight * 0.115);
    el.textContent = "";
    const box = document.createElement("div");
    Object.assign(box.style, { display: "grid", justifyItems: getComputedStyle(el).textAlign === "start" ? "start" : "center", width: "100%" });
    el.append(box);
    const mk = (w) => {
      const mask = document.createElement("div");
      Object.assign(mask.style, { gridArea: "1 / 1", clipPath: "inset(-12% -6% -4% -6%)", visibility: "hidden", maxWidth: "100%" });
      const word = document.createElement("div");
      word.textContent = w;
      Object.assign(word.style, { font: `800 ${size0.toFixed(1)}px/1.08 var(--x-head-font)`, letterSpacing: "var(--x-hero-track)", whiteSpace: "nowrap", display: "inline-block", paintOrder: "stroke fill" });
      if (ML.ARABIC.test(w)) word.style.letterSpacing = "0";
      mask.append(word);
      box.append(mask);
      return { mask, word };
    };
    const items = list.map(mk);
    // one size for all: the smallest fit
    const size = Math.min(size0, ...items.map(({ word }) => ML.fit(word, room * 0.96)));
    const sw = Math.max(1, (p.stroke * size) / 220);
    const hollowAt = (i) => (p.pattern === "outline-solid" ? i % 2 === 0 : i % 2 === 1);
    items.forEach(({ word }, i) => {
      word.style.fontSize = size.toFixed(2) + "px";
      word.style.webkitTextStroke = hollowAt(i) ? `${(sw * 2).toFixed(2)}px var(--x-ink)` : "0";
      word.style.color = hollowAt(i) ? "var(--x-ground)" : "var(--x-ink)";
    });
    // beats: each word on its spoken word, else an even beat; at least 0.3 s apart
    const beat = Math.max(0.3, (end - at - 0.4) / n);
    const T = list.map((w, i) => (i === 0 ? at : Math.max(at, ctx.word(w, at + i * beat))));
    for (let i = 1; i < n; i++) T[i] = Math.max(T[i], T[i - 1] + 0.3);
    T.forEach((x) => ctx.sfx(x, "tap", 0.3));
    return {
      draw(t) {
        items.forEach(({ mask, word }, i) => {
          const a = T[i], b = i + 1 < n ? T[i + 1] : Infinity;
          const on = t >= a && t < b;
          mask.style.visibility = on ? "visible" : "hidden";
          if (!on) return;
          const u = ML.expo(t, a, a + 0.35);
          word.style.translate = `0 ${((1 - u) * 110).toFixed(2)}%`;
          if (hollowAt(i)) {
            const f = p["fill-in"] && b !== Infinity ? ML.lin(t, b - 0.2, b) : 0;
            word.style.color = f > 0 ? `color-mix(in srgb, var(--x-ink) ${(f * 100).toFixed(1)}%, var(--x-ground))` : "var(--x-ground)";
            word.style.webkitTextStroke = `${(sw * 2).toFixed(3)}px var(--x-ink)`;
          }
        });
      },
    };
  },
});

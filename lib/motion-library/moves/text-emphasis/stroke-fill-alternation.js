// Stroke / fill alternation: a run of one-word beats in one place at one size (~220 px heavy head font on the 1080 ×
// 1920 stage — 0.2 of the width, 0.115 of the height — fitted to the target's width), alternating solid ink words
// with truly hollow ones (`stroke` px ink outline read at 220 px, so it scales: an SVG filter dilates the glyphs and
// cuts the glyphs back out, so the ground, a gradient or a panel shows through and the overlapping contours inside a
// variable font's or a joined Arabic word's glyphs never show). Each word enters with
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
      Object.assign(mask.style, { gridArea: "1 / 1", clipPath: "inset(-12% -6% -10% -6%)", visibility: "hidden", maxWidth: "100%" });
      const word = document.createElement("div");
      const face = document.createElement("span"); // the outline or the solid; `solid` lies over a hollow face for the fill-in
      face.textContent = w;
      const solid = document.createElement("span");
      solid.textContent = w;
      Object.assign(solid.style, { position: "absolute", left: "0", top: "0", opacity: "0" });
      word.style.position = "relative";
      word.append(face, solid);
      Object.assign(word.style, { font: `800 ${size0.toFixed(1)}px/1.08 var(--x-head-font)`, letterSpacing: "var(--x-hero-track)", whiteSpace: "nowrap", display: "inline-block", color: "var(--x-ink)" });
      if (ML.ARABIC.test(w)) word.style.letterSpacing = "0";
      mask.append(word);
      box.append(mask);
      return { mask, word, face, solid };
    };
    const items = list.map(mk);
    // one size for all: the smallest fit
    const size = Math.min(size0, ...items.map(({ word }) => ML.fit(word, room * 0.96)));
    const sw = Math.max(p.stroke >= 2 ? 2 : 1, Math.round((p.stroke * size) / 220)); // feMorphology works in whole pixels
    const NS = "http://www.w3.org/2000/svg";
    const defs = document.createElementNS(NS, "svg");
    const fid = "ml-hollow-" + document.querySelectorAll("[id^='ml-hollow-']").length;
    defs.setAttribute("width", "0"); defs.setAttribute("height", "0");
    defs.style.position = "absolute";
    defs.innerHTML = `<filter id="${fid}" x="-8%" y="-15%" width="116%" height="130%" color-interpolation-filters="sRGB"><feMorphology in="SourceGraphic" operator="dilate" radius="${sw}" result="d"/><feComposite in="d" in2="SourceAlpha" operator="out"/></filter>`;
    el.append(defs);
    const hollowAt = (i) => (p.pattern === "outline-solid" ? i % 2 === 0 : i % 2 === 1);
    items.forEach(({ word, face }, i) => {
      word.style.fontSize = size.toFixed(2) + "px";
      face.style.display = "inline-block";
      if (hollowAt(i)) face.style.filter = `url(#${fid})`;
    });
    // beats: each word on its own spoken word, in order (a word said twice lands on each saying), else an even beat; at least 0.3 s apart
    const beat = Math.max(0.3, (end - at - 0.4) / n);
    const said = (ctx.words || []).filter((x) => x.t >= at - 0.01 && x.t < end);
    let cursor = 0;
    const spokenAt = (w, fb) => {
      const q = ML.plain(w);
      for (let j = cursor; q && j < said.length; j++) { const s = ML.plain(said[j].w); if (s === q || (q.length > 2 && s.includes(q))) { cursor = j + 1; return said[j].t; } }
      return fb;
    };
    let T = list.map((w, i) => spokenAt(w, at + i * beat));
    T[0] = at;
    for (let i = 1; i < n; i++) T[i] = Math.max(T[i], T[i - 1] + 0.3);
    if (T[n - 1] > end - 0.3) T = list.map((_, i) => at + i * beat); // the voice runs past the move: every word still gets its beat
    T.forEach((x) => ctx.sfx(x, "tap", 0.3));
    return {
      draw(t) {
        items.forEach(({ mask, word, solid }, i) => {
          const a = T[i], b = i + 1 < n ? T[i + 1] : Infinity;
          const on = t >= a && t < b;
          mask.style.visibility = on ? "visible" : "hidden";
          if (!on) return;
          const u = ML.expo(t, a, a + 0.35);
          word.style.translate = `0 ${((1 - u) * 112).toFixed(2)}%`;
          solid.style.opacity = hollowAt(i) && p["fill-in"] && b !== Infinity ? ML.lin(t, b - 0.2, b).toFixed(4) : "0";
        });
      },
    };
  },
});

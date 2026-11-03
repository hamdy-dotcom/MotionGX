// Accent word: one word of the line (the last, the first, a named one, or the payoff run) is set in the look's accent
// while the rest stays ink. Timing: "with" — the accent is there from the start and the word simply lands on its own
// beat with the line; "after" — the key word arrives 0.15–0.4 s after the rest (opacity 0 → 1, y 4 → 0, 0.25 s ease
// out; the payoff line also scales 0.96 → 1); "recolour" — it lands ink and tweens to the accent 0.3 s after landing.
// Optional weight shift 400 → 700 over 0.4 s. Trailing punctuation stays inside the accent (it is part of the word's
// span). Payoff line: the final words wrap to their own centred second line, in the accent. Letter: a single character
// in the accent with a 1.05 scale and a two-frame flicker — Latin only; Arabic always colours whole words.
// The rest of the line lands like product-film's punchline (opacity + rise on cubic-bezier(.22,1,.36,1)), each word on
// its own spoken word. entrance:false leaves the line to whichever move brought it in (only the colour, or the late key
// word, is written), so it layers on any text-in move. Source: Rieranthony/product-film-skill templates/kit/punchlines.tsx (MIT: the accent flag on a
// word, the landing curve) + prompt-motion melvynx / codestackr / imthatcarlos / macrohou (reference) — our own code.
ML.define({
  id: "text-emphasis.accent-word",
  category: "text-emphasis",
  name: "Key word in the accent colour",
  does: "One word (often the last, the product name or the outcome) lands in the brand accent while the rest stays ink.",
  says: ["focus", "brand", "result", "calm"],
  energy: 2,
  targets: ["word", "headline", "line"],
  duration: [0.5, 3],
  params: {
    timing: { type: "choice", options: ["with", "after", "recolour"], default: "with" },
    delay: { type: "number", range: [0, 0.4], default: 0.2, unit: "s" },
    position: { type: "choice", options: ["last", "first", "any", "payoff-line"], default: "last" },
    unit: { type: "choice", options: ["word", "letter"], default: "word" },
    "weight-shift": { type: "bool", default: false },
    colour: { type: "text", default: "accent" },
    words: { type: "text", default: "" },
    entrance: { type: "bool", default: true },
    sync: { type: "choice", options: ["spoken", "stagger"], default: "spoken" },
  },
  pairs: ["text-in.punchline", "text-emphasis.highlight-sweep"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "product-film-skill:templates/kit/punchlines.tsx", license: "MIT", note: "the accent word + landing curve; timing variants rebuilt from prompt-motion melvynx, codestackr, imthatcarlos, macrohou (reference)" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const VARS = ["accent", "accent-2", "accent-ink", "ink", "dim", "good", "bad", "ring"];
    const name = (() => { const v = String(p.colour || "accent").trim().replace(/^var\(--x-|\)$/g, "").replace(/^--x-|^x-/, ""); return VARS.includes(v) ? v : "accent"; })();
    const COL = `var(--x-${name})`;
    const words = ML.split(el, "words");
    const n = words.length;
    if (!n) return null;
    // which words carry the accent
    let key = [];
    const named = String(p.words || "").split(",").map((s) => ML.plain(s)).filter(Boolean);
    if (named.length) {
      // the whole word first ("it" must not catch "with"), a part of one only if nothing matches whole
      key = words.filter((w) => named.includes(ML.plain(w.textContent)));
      if (!key.length) key = words.filter((w) => named.some((q) => ML.plain(w.textContent).includes(q)));
    }
    if (!key.length) {
      if (p.position === "first") key = [words[0]];
      else if (p.position === "payoff-line") key = words.slice(Math.min(n - 1, Math.max(1, Math.ceil(n * 0.6))));
      else if (p.position === "any") key = [words.reduce((a, b) => (ML.plain(b.textContent).length > ML.plain(a.textContent).length ? b : a))];
      else key = [words[n - 1]];
    }
    // a single character means a single word carries it
    if (p.unit === "letter" && !ML.ARABIC.test(key[0].textContent)) key = key.slice(0, 1);
    const isKey = (w) => key.includes(w);
    // payoff line: the final words break onto their own centred line
    let payoff = null;
    if (p.position === "payoff-line" && key.length) {
      payoff = document.createElement("span");
      Object.assign(payoff.style, { display: "block", textAlign: "center", transformOrigin: "50% 60%" });
      key[0].parentNode.insertBefore(payoff, key[0]);
      // move the key words (and the spaces between them) into the line
      let node = payoff.nextSibling;
      while (node) { const nx = node.nextSibling; if (node.nodeType === 1 && !key.includes(node) && !node.contains(key[key.length - 1])) break; payoff.append(node); if (node === key[key.length - 1]) break; node = nx; }
    }
    // letter unit (Latin only): one character of the first key word
    let letter = null;
    if (p.unit === "letter" && !ML.ARABIC.test(key[0].textContent)) {
      const w = key[0], txt = w.textContent, chars = Array.from(txt);
      const idx = Math.max(0, chars.findIndex((c) => /\p{L}/u.test(c)));
      w.textContent = "";
      chars.forEach((c, i) => { const s = document.createElement("span"); s.textContent = c; if (i === idx) { s.style.display = "inline-block"; letter = s; } w.append(s); });
    }
    // landing time of each word: its spoken word (or a stagger), the key word after the rest in "after"
    const times = words.map((w, i) => (p.sync === "spoken" ? Math.max(at, ctx.word(w.textContent, at + i * 0.12)) : at + i * 0.12));
    for (let i = 1; i < n; i++) times[i] = Math.max(times[i], times[i - 1] + 0.06);
    if (!p.entrance) times.fill(at);
    const restLast = Math.max(at, ...words.filter((w) => !isKey(w)).map((w) => times[words.indexOf(w)]));
    const keyAt = p.timing === "after" ? restLast + 0.3 + Math.max(0.15, p.delay) : times[words.indexOf(key[0])];
    const recolourAt = keyAt + 0.3 + (p.timing === "recolour" ? p.delay : 0);
    if (p.timing === "after") ctx.sfx(keyAt, "pop.soft", 0.25);
    else if (p.timing === "recolour") ctx.sfx(recolourAt, "pop.soft", 0.2);
    else ctx.sfx(keyAt, "tap", 0.22);
    const baseW = parseInt(getComputedStyle(el).fontWeight, 10) || 700;
    const fromW = p["weight-shift"] ? 400 : baseW, toW = p["weight-shift"] ? 700 : baseW;
    const easeOut = (x) => 1 - (1 - x) * (1 - x);
    const shift = !!p["weight-shift"];
    // how far into the accent at t: recolour tweens; a line that was already on screen takes it on the key's moment
    const mixAt = (t) => (p.timing === "recolour" ? ML.ease(t, recolourAt, recolourAt + 0.3) : p.entrance || t >= keyAt ? 1 : 0);
    const paint = (k) => (k >= 1 ? COL : k <= 0 ? "" : `color-mix(in srgb, ${COL} ${(k * 100).toFixed(1)}%, currentColor)`);
    return {
      draw(t) {
        words.forEach((w, i) => {
          const k = isKey(w);
          let o = null, y = 0, blur = 0;
          if (k && p.timing === "after") {
            const u = easeOut(ML.lin(t, keyAt, keyAt + 0.25));
            o = u; y = (1 - u) * 4;
          } else if (p.entrance) {
            const u = ML.land(t, times[i], times[i] + 0.3);
            o = u; y = (1 - u) * 24; blur = (1 - u) * 10;
          }
          // no entrance of its own: the word's opacity and position belong to the move that brought the line in
          if (o !== null) {
            w.style.opacity = o.toFixed(4);
            w.style.translate = y ? `0 ${y.toFixed(2)}px` : "none";
            w.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
          }
          if (!k) return;
          // colour
          const target = letter && w === key[0] ? null : w;
          if (target) w.style.color = paint(mixAt(t));
          // weight shift over 0.4 s from the moment the colour lands
          if (shift) {
            const wk = ML.ease(t, p.timing === "recolour" ? recolourAt : keyAt, (p.timing === "recolour" ? recolourAt : keyAt) + 0.4);
            const wt = fromW + (toW - fromW) * wk;
            (target || letter).style.fontWeight = String(Math.round(wt / 100) * 100);
          }
        });
        if (letter) {
          const k0 = p.timing === "recolour" ? recolourAt : keyAt;
          // a two-frame flicker as it lands (frames at 30 fps), then 1.05
          const fl = t >= k0 + 1 / 30 && t < k0 + 2 / 30 ? 0.35 : 1;
          letter.style.color = paint(mixAt(t));
          letter.style.opacity = t >= k0 ? String(fl) : "1";
          letter.style.scale = (1 + 0.05 * ML.out(t, k0, k0 + 0.2)).toFixed(4);
        }
        if (payoff) {
          const u = p.timing === "after" ? easeOut(ML.lin(t, keyAt, keyAt + 0.25)) : 1;
          payoff.style.scale = u >= 1 ? "none" : (0.96 + 0.04 * u).toFixed(4);
        }
      },
    };
  },
});

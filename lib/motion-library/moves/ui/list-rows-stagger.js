// List rows build in one by one: a list (tracks, steps, skills, ingredients) builds row by row in its reserved layout,
// so nothing jumps. Rise: y 8 -> 0 + opacity, 0.28 s ease-out, stagger ~0.1 s. Slide: x -8 -> 0 (mirrored in RTL).
// Blur-swap (product-film's Product-UI opening): 0.18 s blur 10 -> 0 + opacity, one row per beat. Ghost preview: the
// next row waits at 0.3 opacity, then 0.3 -> 1 + x -8 -> 0 over 0.35 s power2.out on its beat. Optional 1 px hairline
// under each row drawing scaleX 0 -> 1 in 0.3 s with it. Rate: steady stagger, per beat, or on each spoken item.
// Sources: product-film-skill reference/ingredients.md "Opening: Product UI" (MIT) for blur-swap; prompt-motion
// brainextends / sarut0bisasuke / web3wesley (reference only) for rise, slide and ghost preview — our own code.
ML.define({
  id: "ui.list-rows-stagger",
  category: "ui",
  name: "List rows build in one by one",
  does: "A list (tracks, steps, skills, ingredients) builds row by row, each row rising, sliding, or blurring into its reserved place.",
  says: ["list", "step", "growth", "arrival", "trust"],
  energy: 2,
  targets: ["list", "screen", "card"],
  duration: [0.6, 3],
  params: {
    enter: { type: "choice", options: ["rise", "slide", "blur-swap", "ghost-preview"], default: "rise" },
    stagger: { type: "number", range: [0.06, 0.5], default: 0.1, unit: "s" },
    rules: { type: "bool", default: false },
    rate: { type: "choice", options: ["stagger", "per-beat", "per-word"], default: "stagger" },
    beat: { type: "number", range: [0.25, 0.8], default: 0.4, unit: "s" },
  },
  pairs: ["ui.list-row-highlight", "text-in.punchline"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "product-film-skill:reference/ingredients.md", license: "MIT", note: "blur-swap opening; rise / slide / ghost-preview rebuilt from prompt-motion references" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const doc = document;
    // the rows: the target's children (a screen / card with one wrapper: that wrapper's children)
    let box = el;
    while (box.children.length === 1 && box.firstElementChild.children.length > 1) box = box.firstElementChild;
    const rows = [...box.children].filter((c) => c.nodeType === 1 && (c.textContent.trim() || c.querySelector("img,svg")));
    if (!rows.length) return null;
    const fsz = parseFloat(getComputedStyle(rows[0]).fontSize) || 28, k = fsz / 22;
    const dir = rtl ? -1 : 1;
    const gap = parseFloat(getComputedStyle(box).rowGap || getComputedStyle(box).gap) || fsz * 0.5;
    const rules = rows.map((r) => {
      if (!p.rules) return null;
      if (getComputedStyle(r).position === "static") r.style.position = "relative";
      const h = doc.createElement("i");
      h.style.cssText = `position:absolute;inset-inline:0;bottom:${(-Math.min(gap / 2, 8 * k)).toFixed(1)}px;height:${Math.max(1, k).toFixed(1)}px;background:var(--x-line);transform-origin:${rtl ? "right" : "left"} center;transform:scaleX(0);pointer-events:none`;
      r.append(h);
      return h;
    });
    // each row's moment
    // an item of several words lands where the voice says them in a row (ctx.word only matches inside one spoken word)
    const spoken = (text, fb) => {
      const q = text.split(/\s+/).map(ML.plain).filter(Boolean), w = ctx.words || [];
      if (q.length) for (let i = 0; i + q.length <= w.length; i++) if (q.every((x, k) => ML.plain(w[i + k].w).includes(x))) return w[i].t;
      return fb;
    };
    const n = rows.length;
    const ghost = p.enter === "ghost-preview";
    const spacing = p.rate === "per-beat" || ghost ? Math.max(p.beat, p.stagger) : p.stagger;
    const times = rows.map((r, i) => (p.rate === "per-word" ? Math.max(at + 0.05, spoken(r.textContent.trim(), at + 0.1 + i * spacing)) : at + 0.1 + i * spacing));
    for (let i = 1; i < n; i++) times[i] = Math.max(times[i], times[i - 1] + 0.05);
    times.forEach((x, i) => (spacing >= 0.2 || i % 2 === 0) && ctx.sfx(x, "tap", 0.22));
    const dur = { rise: 0.28, slide: 0.28, "blur-swap": 0.18, "ghost-preview": 0.35 }[p.enter] || 0.28;
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.22);
        rows.forEach((r, i) => {
          const a = times[i];
          const u = p.enter === "ghost-preview" ? 1 - Math.pow(1 - ML.clamp((t - a) / dur), 2) : ML.out(t, a, a + dur);
          let o = u, tx = 0, ty = 0, blur = 0;
          if (p.enter === "rise") ty = (1 - u) * 8 * k;
          else if (p.enter === "slide") tx = -(1 - u) * 8 * k * dir;
          else if (p.enter === "blur-swap") blur = r.querySelector("img,video,canvas") || r.matches("img,video,canvas") ? 0 : (1 - u) * 10; // never a blur on pictures
          else {
            // the next row waits as a ghost from the moment the previous one lands
            const wait = i === 0 ? at : times[i - 1];
            o = 0.3 * ML.clamp((t - wait) / 0.15) + 0.7 * u;
            tx = -(1 - u) * 8 * k * dir;
          }
          r.style.opacity = (o * (1 - leave)).toFixed(4);
          r.style.translate = tx || ty ? `${tx.toFixed(2)}px ${ty.toFixed(2)}px` : "none";
          r.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
          if (rules[i]) rules[i].style.transform = `scaleX(${ML.ease(t, a, a + 0.3).toFixed(4)})`;
        });
      },
    };
  },
});

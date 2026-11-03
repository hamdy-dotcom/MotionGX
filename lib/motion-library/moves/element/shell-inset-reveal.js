// Nested container inset reveal: the outer frame appears (L1: its vertical boundary lines and small corner markers,
// opacity 0 → 1 over 0.4 s), an inner rounded container grows inside it with a constant inset (L2: scale 0.96 → 1,
// opacity, y 16 → 0 over 0.7 s power3.out from +0.15 s — or its background wipes open from the middle,
// clip-path inset(50% 0 50% 0 round r) → inset(0 round r) over 0.7 s power3.inOut), then cards appear inside that
// (L3: y 20 → 0 + fade, 0.6 s power3.out, 0.08 s apart, from +0.3 s after L2). The inset between the levels stays visible
// throughout, and each inner radius is the outer radius minus the inset (nested corners stay concentric).
// Source: MengTo/Skills web-design/nested-container-frames (MIT) — the frame system; the reveal timing is our own code.
ML.define({
  id: "element.shell-inset-reveal",
  category: "element",
  name: "Nested container inset reveal",
  does: "An outer frame appears, an inner rounded container grows inside it with a constant inset, then cards appear inside that.",
  says: ["precision", "reveal", "brand"],
  energy: 2,
  targets: ["card", "stage", "scene"],
  duration: [1.2, 2.5],
  params: {
    levels: { type: "number", range: [2, 3], default: 3 },
    inner: { type: "choice", options: ["scale", "clip"], default: "scale" },
    stagger: { type: "number", range: [0.05, 0.15], default: 0.08, unit: "s" },
    cards: { type: "number", range: [2, 6], default: 3 },
    items: { type: "text", default: "" },
  },
  pairs: ["element.stagger-grid", "text-in.punchline"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "card",
  source: { from: "MengTo/Skills:agent-skills/web-design/nested-container-frames", license: "MIT", note: "outer frame with boundary lines + corner markers, inset inner levels; the reveal is our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const ob = own ? ctx.box(own) : null;
    const R = ob && ob.w > f.W * 0.35 && ob.h > f.H * 0.2 ? ob : f.pic;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const S = Math.min(R.w, R.h), inset = Math.round(Math.max(14, S * 0.04));
    const rad = Math.max(inset * 2.2, Math.min(parseFloat(getComputedStyle(ctx.stage).getPropertyValue("--x-radius")) || 30, S * 0.08) + inset);
    const three = Math.round(p.levels) >= 3;
    // backdrop: what the drawing replaces fades away (a painted sheet would show its edge on a textured ground and let shadows leak past it)
    const under = R === ob ? [own] : [...host.querySelectorAll(":scope > .ml-pic, :scope > .ml-safe")];

    // L1: the outer frame — a hairline box, its vertical boundary lines running past it and small corner markers
    const L1 = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;opacity:0;`, host);
    mk("div", `position:absolute;inset:0;border-radius:${rad}px;border:1px solid var(--x-line);`, L1);
    for (const side of ["left", "right"]) mk("div", `position:absolute;${side}:${inset / 2}px;top:-${inset * 2}px;bottom:-${inset * 2}px;width:1px;background:linear-gradient(180deg, transparent, var(--x-line) 18%, var(--x-line) 82%, transparent);`, L1);
    const cm = Math.max(10, inset * 0.7);
    for (const [v, h] of [["top", "left"], ["top", "right"], ["bottom", "left"], ["bottom", "right"]]) {
      const c = mk("div", `position:absolute;${v}:${inset / 2 - cm / 2}px;${h}:${inset / 2 - cm / 2}px;width:${cm}px;height:${cm}px;`, L1);
      mk("i", `position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--x-dim);`, c);
      mk("i", `position:absolute;top:50%;left:0;right:0;height:1px;background:var(--x-dim);`, c);
    }
    // L2: the inner container, a constant inset inside L1 (skipped for two levels: the cards sit straight in L1)
    const r2 = Math.max(8, rad - inset);
    const L2 = three ? mk("div", `position:absolute;inset:${inset}px;border-radius:${r2}px;background:var(--x-panel-2);border:1px solid var(--x-line);transform-origin:50% 50%;`, L1) : null;
    // L3: cards inside the innermost level, with the same inset
    const box = L2 || mk("div", `position:absolute;inset:${inset}px;`, L1);
    const rIn = Math.max(6, (L2 ? r2 : rad) - inset);
    // what the cards say: the items ("a|b|c"), else the target's own parts if it is a plain list; otherwise abstract UI
    const texts = (p.items ? String(p.items).split("|") : own && [...own.children].every((c) => !c.children.length) ? [...own.children].map((c) => c.textContent) : []).map((x) => x.trim()).filter(Boolean).slice(0, 6);
    const n = texts.length >= 2 ? texts.length : Math.round(ML.clamp(p.cards, 2, 6));
    const iw = R.w - inset * (three ? 4 : 2), ih = R.h - inset * (three ? 4 : 2);
    const cols = iw / ih > 1.6 ? Math.min(n, 3) : iw / ih > 0.8 ? Math.min(n, 2) : 1, rows = Math.ceil(n / cols);
    const grid = mk("div", `position:absolute;inset:${three ? inset : 0}px;display:grid;grid-template-columns:repeat(${cols}, 1fr);grid-template-rows:repeat(${rows}, 1fr);gap:${inset}px;`, box);
    const fs = Math.max(14, Math.min(ih / rows, iw / cols) * 0.09);
    const cards = Array.from({ length: n }, (_, i) => {
      // the last card takes what is left of its row: no hole in the grid
      const span = i === n - 1 ? cols - ((n - 1) % cols) : 1;
      const c = mk("div", `grid-column:span ${span};min-width:0;position:relative;border-radius:${rIn}px;background:var(--x-panel);border:1px solid var(--x-line);padding:${(fs * 1.1).toFixed(1)}px;display:flex;flex-direction:column;justify-content:space-between;gap:${(fs * 0.6).toFixed(1)}px;overflow:hidden;opacity:0;`, grid);
      const top = mk("div", `display:flex;align-items:center;justify-content:space-between;gap:${fs * 0.5}px;`, c);
      mk("span", `width:${(fs * 1.6).toFixed(1)}px;height:${(fs * 1.6).toFixed(1)}px;border-radius:${(fs * 0.45).toFixed(1)}px;background:color-mix(in srgb, var(--x-accent) ${i % 2 ? 22 : 100}%, var(--x-panel));`, top);
      const idx = mk("span", `font:var(--x-label-weight) ${(fs * 0.8).toFixed(1)}px var(--x-mono-font);color:var(--x-dim);`, top, String(i + 1).padStart(2, "0"));
      idx.dir = "ltr";
      if (texts.length >= 2) { mk("div", `font:var(--x-head-weight) ${(fs * 1.5).toFixed(1)}px/1.2 var(--x-head-font);color:var(--x-ink);`, c, texts[i]); return c; }
      const lines = mk("div", `display:grid;gap:${(fs * 0.45).toFixed(1)}px;`, c);
      mk("i", `display:block;height:${(fs * 0.7).toFixed(1)}px;width:${(62 + ML.rnd(i, 2) * 30).toFixed(0)}%;border-radius:999px;background:var(--x-ink);opacity:.82;`, lines);
      mk("i", `display:block;height:${(fs * 0.5).toFixed(1)}px;width:${(40 + ML.rnd(i, 3) * 35).toFixed(0)}%;border-radius:999px;background:var(--x-dim);opacity:.45;`, lines);
      return c;
    });
    if (rtl) grid.dir = "rtl";

    // timing (squeezed if the window is short)
    const span = Math.max(1, end - at), k = ML.clamp(span / 2.2, 0.6, 1);
    const t2 = at + 0.15 * k, t3 = t2 + 0.3 * k + (three ? 0.25 * k : 0), stag = Math.min(p.stagger, (span * 0.3) / n);
    const p3o = (x) => 1 - Math.pow(1 - x, 4), p3io = (x) => (x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2);
    ctx.sfx(at, "whoosh.soft", 0.2);
    ctx.sfx(t3, "card", 0.3);

    return {
      draw(t) {
        L1.style.opacity = ML.ease(t, at, at + 0.4 * k).toFixed(4);
        L1.style.visibility = t < at ? "hidden" : "visible";
        under.forEach((e) => { e.style.opacity = (1 - ML.lin(t, at, at + 0.3 * k)).toFixed(4); });
        if (own) own.style.visibility = t >= at + 0.4 * k ? "hidden" : ""; // its parts now live in the cards
        if (L2) {
          if (p.inner === "clip") {
            const u = p3io(ML.lin(t, t2, t2 + 0.7 * k)), c = ((1 - u) * 50).toFixed(3);
            L2.style.clipPath = `inset(${c}% 0 ${c}% 0 round ${r2}px)`;
          } else {
            const u = p3o(ML.lin(t, t2, t2 + 0.7 * k));
            L2.style.opacity = u.toFixed(4);
            L2.style.scale = (0.96 + 0.04 * u).toFixed(4);
            L2.style.translate = `0 ${((1 - u) * 16).toFixed(2)}px`;
          }
        }
        cards.forEach((c, i) => {
          const u = p3o(ML.lin(t, t3 + i * stag, t3 + i * stag + 0.6 * k));
          c.style.opacity = u.toFixed(4);
          c.style.translate = `0 ${((1 - u) * 20).toFixed(2)}px`;
        });
      },
    };
  },
});

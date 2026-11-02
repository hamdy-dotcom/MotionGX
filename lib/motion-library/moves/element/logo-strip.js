// Partner logo strip: a row of 3–8 marks in one muted ink between two hairlines rises in — the whole block (y 20 → 0 +
// fade, 1.2 s power2.out) or logo by logo (fade-rise 12, 0.08 s apart) — and then lights up on cue: each mark's opacity
// .55 → 1 and grayscale 1 → 0 over 0.5 s, 0.2 s apart ("sequence"), all at once ("all"), or each on the word that names
// it ("on-name", with a short accent flash under the one being named). Row: marks in equal boxes (24–64 px at the web
// size, here relative to the frame), optional name under 18 px, ink at .55, grayscale, multiply, gaps 48 (tall) / 96
// (wide), border-y 1 px at 30 %, padding-y 32.
// The marks: real ones only — the target's own (a list of <img>/<svg> marks), or brand-supplied ones passed in `logos`
// as image URLs; with none supplied, neutral placeholder marks (plain geometry, no real company) stand in.
// Source: MengTo/Skills web-design/company-logos demo (MIT): the strip ("border-y border-glass-300/30 py-8 flex
// justify-center items-center gap-12 md:gap-24 opacity-60 mix-blend-multiply"); the motion ours, every frame from t.
ML.define({
  id: "element.logo-strip",
  category: "element",
  name: "Partner logo strip reveal",
  does: "A row of partner logos in one muted ink between hairlines rises in as a set or logo by logo, and each can light up to full colour in turn.",
  says: ["proof", "trust", "brand"],
  energy: 2,
  targets: ["logo", "list"],
  duration: [1, 4],
  params: {
    entrance: { type: "choice", options: ["block", "stagger"], default: "stagger" },
    light_up: { type: "choice", options: ["none", "all", "sequence", "on-name"], default: "sequence" },
    count: { type: "number", range: [3, 8], default: 5 },
    names: { type: "bool", default: false },
    align: { type: "choice", options: ["center", "between"], default: "center" },
    logos: { type: "text", default: "" },
    labels: { type: "text", default: "" },
  },
  pairs: ["element.marquee", "text-in.punchline"],
  avoid: ["playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:agent-skills/web-design/company-logos", license: "MIT", note: "the logo strip's styling (border-y, gaps, muted multiply ink); entrance and light-up rebuilt from t" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const n = Math.round(ML.clamp(p.count, 3, 8));
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };

    // the marks: the target's own marks, else brand-supplied URLs, else neutral placeholders
    let marks = [];
    if (own && own.tagName.toLowerCase() !== "svg" && own.tagName !== "IMG") marks = [...own.querySelectorAll(":scope > img, :scope > svg, :scope > * > img, :scope > * > svg")].map((m) => ({ node: m.cloneNode(true), name: m.getAttribute("alt") || m.getAttribute("aria-label") || "" }));
    if (marks.length < 3 && p.logos) marks = String(p.logos).split(/\s*[|,\n]\s*/).filter(Boolean).map((u) => { const i = doc.createElement("img"); i.src = u; return { node: i, name: "" }; });
    const PH = ["Northwind", "Lumen", "Atlas", "Quanta", "Orbit", "Kite", "Vertex", "Halo"];
    const GLYPH = [
      '<circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" stroke-width="6"/>',
      '<path d="M20 4 L37 34 H3 Z" fill="currentColor"/>',
      '<rect x="8" y="8" width="24" height="24" rx="3" transform="rotate(45 20 20)" fill="currentColor"/>',
      '<path d="M20 3 L35 11.5 V28.5 L20 37 L5 28.5 V11.5 Z" fill="currentColor"/>',
      '<rect x="5" y="6" width="11" height="28" rx="3" fill="currentColor"/><rect x="24" y="6" width="11" height="28" rx="3" fill="currentColor" opacity=".55"/>',
      '<path d="M4 28 A16 16 0 0 1 36 28 Z" fill="currentColor"/><rect x="4" y="31" width="32" height="5" rx="2" fill="currentColor"/>',
      '<path d="M15 4 H25 V15 H36 V25 H25 V36 H15 V25 H4 V15 H15 Z" fill="currentColor"/>',
      '<circle cx="14" cy="20" r="10" fill="currentColor"/><circle cx="26" cy="20" r="10" fill="currentColor" opacity=".55"/>',
    ];
    const HUE = ["var(--x-accent)", "var(--x-good)", "var(--x-bad)", "var(--x-accent-2)"];
    const names = p.labels ? String(p.labels).split(/\s*[|,\n]\s*/).filter(Boolean) : [];
    while (marks.length < n) {
      const i = marks.length, s = doc.createElementNS(NS, "svg");
      s.setAttribute("viewBox", "0 0 40 40"); s.innerHTML = GLYPH[i % GLYPH.length];
      s.style.color = HUE[i % HUE.length];
      marks.push({ node: s, name: PH[i % PH.length], ph: true });
    }
    marks = marks.slice(0, n).map((m, i) => ({ ...m, name: names[i] || m.name }));

    // the strip: centred on the target, across the safe width
    const R = f.safe, ob = own ? ctx.box(own) : null;
    const gap = (f.tall ? 48 : 96) * k * (n > 5 && !f.wide ? 0.6 : 1);
    const rw = R.w * (f.wide ? 0.86 : 1);
    const showNames = p.names || marks.some((m) => m.ph);
    const boxS = Math.min(64 * k * 1.5, (rw - gap * (n - 1)) / n / (showNames ? 1.6 : 1));
    const nameS = Math.max(14 * k, Math.min(18 * k * 1.3, boxS * 0.36));
    const padY = 32 * k;
    const rowH = boxS + (showNames ? nameS * 1.5 : 0) + padY * 2;
    const cy = ob ? ML.clamp(ob.y + ob.h / 2, f.pic.y + rowH / 2, f.pic.y + f.pic.h - rowH / 2) : f.pic.y + f.pic.h / 2;
    const strip = mk("div", `position:absolute;left:${(R.x + (R.w - rw) / 2).toFixed(1)}px;top:${(cy - rowH / 2).toFixed(1)}px;width:${rw.toFixed(1)}px;box-sizing:border-box;padding:${padY.toFixed(1)}px 0;display:flex;flex-wrap:nowrap;align-items:center;justify-content:${p.align === "between" ? "space-between" : "center"};gap:${gap.toFixed(1)}px;background:var(--x-ground);isolation:isolate;z-index:6;pointer-events:none;visibility:hidden;`, host); // its own band of ground, so the marks never sit over other copy
    const lineCss = "position:absolute;left:0;right:0;height:1px;background:color-mix(in srgb, var(--x-dim) 30%, transparent);transform:scaleX(0);transform-origin:50% 50%;";
    const lineT = mk("div", lineCss + "top:0;", strip), lineB = mk("div", lineCss + "bottom:0;", strip);
    const items = marks.map((m) => {
      const it = mk("div", `display:flex;flex-direction:column;align-items:center;gap:${(nameS * 0.4).toFixed(1)}px;flex:0 0 auto;mix-blend-mode:multiply;`, strip);
      const b = mk("div", `width:${boxS.toFixed(1)}px;height:${boxS.toFixed(1)}px;display:flex;align-items:center;justify-content:center;`, it);
      m.node.style.maxWidth = "100%"; m.node.style.maxHeight = "100%"; m.node.style.width = m.node.tagName === "IMG" ? "auto" : "100%"; m.node.style.height = m.node.tagName === "IMG" ? "auto" : "100%";
      m.node.removeAttribute && m.node.removeAttribute("data-slot");
      b.append(m.node);
      const nm = showNames && m.name ? mk("div", `font:600 ${nameS.toFixed(1)}px var(--x-head-font);letter-spacing:-0.01em;color:var(--x-ink);white-space:nowrap;direction:ltr;`, it, m.name) : null;
      return { it, b, nm, mark: m.node, name: m.name };
    });

    // timing
    const entD = p.entrance === "block" ? 1.2 : 0.6, st = 0.08;
    const inAt = items.map((_, i) => (p.entrance === "block" ? at : at + i * st));
    const settled = (p.entrance === "block" ? at + 0.6 : inAt[n - 1] + 0.45);
    const lit = items.map((x, i) => {
      if (p.light_up === "none") return Infinity;
      if (p.light_up === "all") return settled;
      if (p.light_up === "on-name") return Math.max(settled, x.name ? ctx.word(x.name, settled + i * 0.2) : settled + i * 0.2);
      return settled + i * 0.2;
    });
    const leave = Math.max(Math.max(...lit.filter(Number.isFinite), settled) + 0.7, end - 0.35);
    // reading order: the strip inherits the page direction, so the first mark sits at the reading start
    ctx.sfx(at, "whoosh.soft", 0.18);
    if (p.light_up === "all") ctx.sfx(settled, "blip", 0.25);
    else lit.forEach((t, i) => Number.isFinite(t) && i % 2 === 0 && ctx.sfx(t, "blip", 0.22));
    const p2 = (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), 2);

    return {
      draw(t) {
        strip.style.visibility = t < at - 1e-6 ? "hidden" : "visible";
        if (own) own.style.visibility = t < at - 1e-6 ? "" : "hidden";
        const q = ML.ease(t, leave, leave + 0.3);
        const blk = p.entrance === "block" ? p2(t, at, at + entD) : 1;
        strip.style.opacity = (Math.min(1, blk) * (1 - q)).toFixed(4);
        strip.style.translate = `0 ${((1 - blk) * 20 * k - q * 10 * k).toFixed(2)}px`;
        const ln = p2(t, at, at + 0.7);
        lineT.style.transform = lineB.style.transform = `scaleX(${ln.toFixed(4)})`;
        items.forEach((x, i) => {
          const e = p.entrance === "block" ? 1 : p2(t, inAt[i], inAt[i] + entD);
          const l = Number.isFinite(lit[i]) ? ML.ease(t, lit[i], lit[i] + 0.5) : 0;
          x.it.style.opacity = (e * (0.55 + 0.45 * l)).toFixed(4);
          x.it.style.translate = `0 ${((1 - e) * 12 * k).toFixed(2)}px`;
          x.it.style.filter = l >= 1 ? "none" : `grayscale(${(1 - l).toFixed(3)})`;
          x.it.style.mixBlendMode = l > 0.5 ? "normal" : "multiply";
          if (p.light_up === "on-name" && Number.isFinite(lit[i])) {
            const fl = ML.pulse(t, lit[i] + 0.1, 0.08, 0.35);
            x.b.style.boxShadow = fl > 0.01 ? `0 ${(6 * k).toFixed(1)}px 0 -${(3 * k).toFixed(1)}px color-mix(in srgb, var(--x-accent) ${(fl * 100).toFixed(1)}%, transparent)` : "none";
          }
        });
      },
    };
  },
});

// Inline logo word: a brand or partner name lands in the line with its logo just before it, the two arriving as one
// unit. Inside the word's span (inline-flex, centred, gap 0.2em) a logo box 0.7–1em square (flex none) sits before the
// text so cap height and mark read together. The unit shares the word's entrance: the punchline blur-rise (16 px blur,
// 36 px rise, 0.3 s on cubic-bezier(0.22, 1, 0.36, 1)) or a pop (scale 0.85 → 1 + opacity in 0.18 s, back.out(2)),
// the logo popping a beat after its word. The logo is the one already in the slot ([data-logo], an <img> or <svg>), an
// image given as `src`, or a monogram tile in the look's colours. A logo already in the slot goes with the word right
// after it (`on` picks the word only when the slot has none). Every word keeps its slot from the first frame.
// Source: Rieranthony/product-film-skill templates/kit/punchlines.tsx (logo at 0.82em before the word) +
// reference/ingredients.md "Partner and integration logos" (MIT).
ML.define({
  id: "text-in.inline-logo",
  category: "text-in",
  name: "Inline logo word",
  does: "A brand or partner name lands in the line with its logo sitting just before it, both arriving together as one unit.",
  says: ["brand", "connection", "trust", "proof", "story"],
  energy: 2,
  targets: ["word", "line", "headline"], // the slot holds the words; a logo comes as a child of it or as `src`
  duration: [0.4, 3],
  params: {
    entrance: { type: "choice", options: ["blur-rise", "pop"], default: "blur-rise" },
    logo_size: { type: "number", range: [0.7, 1], default: 0.82, unit: "em" },
    logo_lag: { type: "number", range: [0, 0.1], default: 0, unit: "s" },
    source: { type: "choice", options: ["partner", "own"], default: "partner" },
    brand_colour: { type: "bool", default: true },
    on: { type: "choice", options: ["first", "last", "all"], default: "first" },
    src: { type: "text", default: "" },
    sync: { type: "choice", options: ["spoken", "stagger"], default: "spoken" },
    stagger: { type: "number", range: [0.1, 0.4], default: 0.2, unit: "s" },
  },
  pairs: ["text-in.punchline", "text-emphasis.accent-word"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "product-film-skill:templates/kit/punchlines.tsx", license: "MIT", note: "logo slot + landing curve; ingredients.md partner logos" },
  async setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    // logos already in the slot are kept and attached to the word after them (a marker holds each one's place through the split)
    const given = [...el.querySelectorAll("[data-logo], img, svg")].filter((g) => !g.parentElement.closest("[data-logo], svg"));
    const marks = given.map((g) => { const m = document.createElement("i"); g.replaceWith(m); return m; });
    const words = ML.split(el, "words");
    if (!words.length) { marks.forEach((m, k) => m.replaceWith(given[k])); return null; }
    const owner = new Map();
    marks.forEach((m, k) => {
      const i = words.findIndex((w) => m.compareDocumentPosition(w) & Node.DOCUMENT_POSITION_FOLLOWING), at_ = i < 0 ? words.length - 1 : i;
      if (!owner.has(at_)) owner.set(at_, given[k]);
      m.remove();
    });
    const pick = owner.size ? [...owner.keys()] : p.on === "all" ? words.map((_, i) => i) : p.on === "last" ? [words.length - 1] : [0];
    const pictures = [];
    const units = words.map((w, i) => {
      if (!pick.includes(i)) return { w, unit: w, logo: null };
      // the unit is an inline-block so it keeps the word's baseline; the logo box sits centred on the x-height
      const unit = document.createElement("span"), em = parseFloat(getComputedStyle(w).fontSize) || 56, side = (p.logo_size * em).toFixed(1) + "px";
      Object.assign(unit.style, { display: "inline-block", whiteSpace: "nowrap" });
      const logo = document.createElement("span");
      Object.assign(logo.style, { display: "inline-flex", alignItems: "center", justifyContent: "center", verticalAlign: "middle", width: side, height: side, marginInlineEnd: (0.2 * em).toFixed(1) + "px", overflow: "hidden", position: "relative", top: (-0.04 * em).toFixed(1) + "px" });
      const g = owner.get(i) || null;
      if (g) { Object.assign(g.style, { width: "100%", height: "100%", objectFit: "contain" }); logo.append(g); }
      else if (p.src) { const img = document.createElement("img"); img.src = p.src; img.alt = ""; pictures.push(img); Object.assign(img.style, { width: "100%", height: "100%", objectFit: "contain" }); logo.append(img); }
      else {
        // a monogram tile: the word's first letter on the brand (own) or a neutral (partner) tile
        const own = p.source === "own";
        Object.assign(logo.style, { borderRadius: "24%", background: own ? "var(--x-accent)" : "var(--x-ink)", color: own ? "var(--x-accent-ink)" : "var(--x-ground)", font: `var(--x-head-weight) ${(p.logo_size * 0.56 * em).toFixed(1)}px/1 var(--x-head-font)`, letterSpacing: "0" });
        logo.textContent = Array.from(w.textContent.replace(/[^\p{L}\p{N}]/gu, ""))[0] || "•";
      }
      w.replaceWith(unit);
      unit.append(logo, w);
      if (p.brand_colour) w.style.color = p.source === "own" ? "var(--x-accent)" : "inherit";
      return { w, unit, logo };
    });
    if (p.brand_colour && p.source === "partner") {
      // the payoff word (the one after the brand) takes the accent
      const nxt = units[pick[pick.length - 1] + 1];
      if (nxt && p.on !== "all") nxt.w.style.color = "var(--x-accent)";
    }
    // a picture that arrives between two frames would change the layout: wait for it here
    await Promise.all(pictures.map((i) => i.decode().catch(() => null)));
    const times = units.map((u, i) => (p.sync === "spoken" ? Math.max(at, ctx.word(u.w.textContent, at + i * p.stagger)) : at + i * p.stagger));
    for (let i = 1; i < times.length; i++) times[i] = Math.max(times[i], times[i - 1] + 0.06);
    const lag = p.logo_lag + (p.entrance === "pop" ? 0.05 : 0);
    units.forEach((u, i) => { if (u.logo) ctx.sfx(times[i] + lag, "tap", 0.3); });
    const enter = (node, t0, t) => {
      if (p.entrance === "pop") {
        const o = ML.lin(t, t0, t0 + 0.12), s = t < t0 ? 0.85 : 0.85 + 0.15 * ML.back(t, t0, t0 + 0.18, 2);
        node.style.opacity = o.toFixed(4); node.style.scale = s === 1 ? "none" : s.toFixed(4); node.style.filter = "none"; node.style.translate = "none";
      } else {
        const v = ML.land(t, t0, t0 + 0.3);
        node.style.opacity = v.toFixed(4);
        node.style.filter = v < 1 ? `blur(${((1 - v) * 16).toFixed(2)}px)` : "none";
        node.style.translate = `0 ${((1 - v) * 36).toFixed(2)}px`;
      }
    };
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.18);
        el.style.opacity = String(1 - leave);
        el.style.filter = leave > 0 ? `blur(${(leave * 12).toFixed(2)}px)` : "none";
        el.style.translate = leave > 0 ? `0 ${(-leave * 16).toFixed(2)}px` : "none";
        units.forEach((u, i) => {
          if (!u.logo) return enter(u.w, times[i], t);
          if (p.entrance === "pop") { u.unit.style.opacity = "1"; enter(u.w, times[i], t); enter(u.logo, times[i] + lag, t); }
          else if (lag > 0) { u.unit.style.opacity = "1"; enter(u.w, times[i], t); enter(u.logo, times[i] + lag, t); }
          else enter(u.unit, times[i], t);
        });
      },
    };
  },
});

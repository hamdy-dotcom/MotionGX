// Row of small labelled icon cards: small panel cards (56 × 64 in the source, kept in that proportion and sized to the
// row), each a 24-unit outline icon over a short caption, sit in a row. They come in from y +20 on a 0.06 s stagger
// (or gather from a burst at the row's centre), each lightly turned ±jitter° (seeded, alternating), and a spring
// straightens them. Captions: the list's own items when it has them (in reading order, right to left in Arabic),
// else icon-only cards. Icons: our own line set, drawn in the ink with an accent stroke on the first.
// Source: prompt-motion "gabrielbuzziv-tutorial-o-mais-insano" (reference only — rebuilt as our own code).
ML.define({
  id: "element.icon-card-row",
  category: "element",
  name: "Row of small labelled icon cards",
  does: "Small white cards with outline icons and captions sit in a row, lightly rotated, then straighten.",
  says: ["list", "simplicity", "choice"],
  energy: 2,
  targets: ["list", "card"],
  duration: [0.8, 2],
  params: {
    count: { type: "number", range: [3, 7], default: 5 },
    jitter: { type: "number", range: [0, 10], default: 6, unit: "deg" },
    stagger: { type: "number", range: [0.03, 0.12], default: 0.06, unit: "s" },
    entry: { type: "choice", options: ["rise", "burst"], default: "rise" },
  },
  pairs: ["element.idle-float", "text-in.punchline", "element.stagger-list"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "prompt-motion:gabrielbuzziv-tutorial-o-mais-insano", license: "reference", note: "cards, icons and the spring straighten are our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const k = Math.min(f.W, f.H) / 1080;
    let el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    let host, R;
    // captions: a list's own items (text only)
    const items = el ? [...el.children].map((c) => (c.textContent || "").trim()).filter(Boolean) : [];
    const n = items.length >= 3 ? Math.min(items.length, 7) : Math.round(ML.clamp(p.count, 3, 7));
    if (el) {
      // the cards take the list's place: its items stay in the layout but out of sight
      [...el.children].forEach((c) => (c.style.visibility = "hidden"));
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      host = el; R = { w: el.clientWidth || f.pic.w * 0.8 };
    } else {
      host = mk("div", `position:absolute;left:${f.pic.x}px;top:${f.pic.y}px;width:${f.pic.w}px;height:${f.pic.h}px;pointer-events:none;z-index:6;`, ctx.scene || ctx.stage);
      R = { w: f.pic.w };
    }
    const gap = Math.max(10, 18 * k);
    const cw = Math.min((R.w - gap * (n - 1)) / n, 150 * k, f.W * 0.14);
    const ch = cw * (64 / 56);
    // a list makes room for the row's height so the cards sit on it, not over its neighbours
    if (el) el.style.minHeight = `${Math.ceil(ch + 8 * k)}px`;
    const row = mk("div", `position:absolute;left:0;right:0;top:50%;height:${ch}px;margin-top:${-ch / 2}px;display:flex;justify-content:center;align-items:center;gap:${gap}px;pointer-events:none;direction:${rtl ? "rtl" : "ltr"};`, host);
    // our own 24-unit outline icons
    const ICONS = [
      '<path d="M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
      '<path d="M4 6.5h16v10H9l-5 4z"/>',
      '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>',
      '<rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
      '<path d="M5 19.5V11M10 19.5V5M15 19.5v-6M20 19.5V8.5"/>',
      '<circle cx="12" cy="12" r="8.5"/><path d="M8 12.3l2.7 2.7L16.3 9.4"/>',
      '<path d="M12 20s-7.5-4.6-7.5-10A4.25 4.25 0 0 1 12 7.4 4.25 4.25 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
    ];
    const lblSize = Math.max(11, cw * 0.125);
    const cards = [];
    for (let i = 0; i < n; i++) {
      const c = mk("div", `flex:none;width:${cw}px;height:${ch}px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${cw * 0.08}px;padding:${cw * 0.1}px ${cw * 0.06}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:min(var(--x-radius), ${(cw * 0.18).toFixed(1)}px);box-shadow:0 ${(6 * k).toFixed(1)}px ${(16 * k).toFixed(1)}px color-mix(in srgb, var(--x-ink) 8%, transparent);`, row);
      const s = (cw * (items.length >= 3 ? 0.4 : 0.46)).toFixed(1);
      const ic = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
      ic.setAttribute("viewBox", "0 0 24 24"); ic.setAttribute("width", s); ic.setAttribute("height", s);
      ic.style.cssText = `flex:none;display:block;color:${i === 0 ? "var(--x-accent)" : "var(--x-ink)"};`;
      ic.innerHTML = `<g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[i % ICONS.length]}</g>`;
      c.append(ic);
      if (items.length >= 3) {
        const cap = mk("div", `max-width:100%;font:var(--x-body-weight) ${lblSize.toFixed(1)}px/1.15 var(--x-body-font);color:var(--x-dim);text-align:center;overflow-wrap:anywhere;`, c, items[i]);
        // a long caption shrinks to two lines inside its card
        let fs = lblSize;
        while (cap.scrollHeight > lblSize * 1.15 * 2.2 && fs > 8) { fs -= 0.5; cap.style.fontSize = fs + "px"; }
      }
      cards.push(c);
    }
    const start = cards.map((c, i) => at + i * p.stagger);
    const turn = cards.map((c, i) => (i % 2 ? -1 : 1) * p.jitter * (0.55 + 0.45 * ML.rnd(i, 17)) * (rtl ? -1 : 1));
    // the burst: each card starts at the row's centre
    const mid = (n - 1) / 2;
    start.forEach((s, i) => i % 2 === 0 && ctx.sfx(s, "pop.soft", 0.22));
    const rise = 20 * Math.max(1, cw / 56) * 0.55;
    return {
      draw(t) {
        const leave = ML.ease(t, end - 0.25, end);
        cards.forEach((c, i) => {
          if (t < start[i]) { c.style.opacity = "0"; return; }
          const u = ML.out(t, start[i], start[i] + 0.4);
          const sp = ML.step(t - start[i] - 0.08, { stiffness: 170, damping: 11 }); // the straighten spring
          c.style.opacity = (Math.min(1, ML.lin(t, start[i], start[i] + 0.16)) * (1 - leave)).toFixed(4);
          const dx = p.entry === "burst" ? (mid - i) * (cw + gap) * (rtl ? -1 : 1) * (1 - u) : 0;
          const dy = p.entry === "burst" ? 0 : (1 - u) * rise;
          c.style.translate = `${dx.toFixed(2)}px ${dy.toFixed(2)}px`;
          c.style.rotate = `${(turn[i] * (1 - sp)).toFixed(3)}deg`;
          c.style.scale = p.entry === "burst" ? (0.7 + 0.3 * u).toFixed(4) : "none";
        });
      },
    };
  },
});

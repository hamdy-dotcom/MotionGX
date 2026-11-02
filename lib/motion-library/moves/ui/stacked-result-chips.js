// Result chips stack in under a headline: small glass cards ("Blemishes −12", "Skin tone +25") slide in one below
// another, each with an icon tile, a title and a grey subline, and a delta number in the accent that counts up.
// Card 280 × 40 in the reference (every size here is that share of the card's width): radius 8, a faint panel glass
// with a 1 px line at 10 %, an 18 px accent-gradient icon tile at the start, the title 12 px bold over a 9 px dim
// subline, the value at the end in the accent. Enter: x +30 → 0 and opacity 0 → 1 in 0.35 s power3.out, 0.4 s apart;
// the value counts 0 → N (sign, decimals and suffix kept) as its card lands. `side` is where they come in from; RTL
// mirrors it and the card's own order. With a card target the stack sits inside it at its end edge; with none
// it stands in the picture region.
// Source: prompt-motion oliahmed205-just-tried-opus-5-5 (reference only — rebuilt as our own code).
ML.define({
  id: "ui.stacked-result-chips",
  category: "ui",
  name: "Result chips stack in under a headline",
  does: "Small glass cards ('Blemishes -12', 'Skin tone +25') slide in one below another, each with an icon and a delta number.",
  says: ["proof", "result", "list"],
  energy: 2,
  targets: ["card"],
  duration: [1, 2.5],
  params: {
    count: { type: "number", range: [2, 5], default: 3 },
    side: { type: "choice", options: ["right", "left"], default: "right" },
    count_up: { type: "bool", default: true },
    stagger: { type: "number", range: [0.15, 0.6], default: 0.4, unit: "s" },
    items: { type: "text" }, // "Title|subline|value; …" e.g. "Blemishes|Clearer skin|-12; Skin tone|More even|+25%"
  },
  pairs: ["text-in.punchline", "data.count-up", "photo.before-after-slider"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "prompt-motion:oliahmed205-just-tried-opus-5-5", license: "reference", note: "glass result chips with icon tile + delta, x +30 → 0, 0.35 s power3.out, 0.4 s stagger, values counting up" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const el = ctx.el && ctx.el !== ctx.stage && ctx.el.tagName !== "IMG" ? ctx.el : null;

    const sample = rtl
      ? [["الحبوب", "بشرة أنقى", "-12"], ["توحيد اللون", "لون أهدى", "+25"], ["الترطيب", "بعد ٧ أيام", "+40%"], ["الخطوط", "أنعم", "-18"], ["اللمعان", "أقل", "-30%"]]
      : [["Blemishes", "Clearer skin", "-12"], ["Skin tone", "More even", "+25"], ["Hydration", "After 7 days", "+40%"], ["Fine lines", "Smoother", "-18"], ["Shine", "Less oily", "-30%"]];
    const given = p.items ? String(p.items).split(/[;؛]/).map((r) => r.split("|").map((s) => s.trim())).filter((r) => r[0]) : [];
    const rows = (given.length ? given : sample).slice(0, Math.round(p.count)).map((r) => [r[0], r[1] || "", r[2] || ""]);

    // the stack's box: inside the target (at its end edge), or in the picture region
    let parent, W;
    if (el) {
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      parent = el; W = Math.min(el.clientWidth * 0.9, 640 * k);
    } else {
      parent = host; W = Math.min(f.pic.w * 0.82, 640 * k);
    }
    const u = W / 280; // one reference px
    const H = 40 * u, gap = 10 * u;
    const total = rows.length * H + (rows.length - 1) * gap;
    const stack = mk("div", `position:absolute;width:${W.toFixed(1)}px;display:flex;flex-direction:column;gap:${gap.toFixed(1)}px;z-index:6;`, parent);
    if (el) {
      stack.style.insetInlineEnd = `${(12 * u).toFixed(1)}px`; stack.style.bottom = `${(12 * u).toFixed(1)}px`;
    } else {
      stack.style.left = `${(f.pic.x + (f.pic.w - W) / 2).toFixed(1)}px`; stack.style.top = `${(f.pic.y + (f.pic.h - total) / 2).toFixed(1)}px`;
    }
    stack.dir = rtl ? "rtl" : "ltr";

    const glyphs = ['<path d="M5 12.5l4.2 4.2L19 7" />', '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" />', '<path d="M12 3c3.5 4.6 6 7.8 6 11a6 6 0 0 1-12 0c0-3.2 2.5-6.4 6-11z" />', '<path d="M4 16l5-5 4 4 7-7" /><path d="M15 8h5v5" />'];
    const cards = rows.map(([title, sub, value], i) => {
      const c = mk("div", `box-sizing:border-box;height:${H.toFixed(1)}px;display:flex;align-items:center;gap:${(9 * u).toFixed(1)}px;padding:0 ${(11 * u).toFixed(1)}px;border-radius:${(8 * u).toFixed(1)}px;background:color-mix(in srgb, var(--x-panel) 88%, transparent);border:${Math.max(1, u * 0.5).toFixed(1)}px solid color-mix(in srgb, var(--x-ink) 10%, transparent);box-shadow:var(--x-shadow);color:var(--x-ink);opacity:0;will-change:opacity, translate;`, stack);
      const ic = mk("div", `flex:none;width:${(18 * u).toFixed(1)}px;height:${(18 * u).toFixed(1)}px;border-radius:${(5 * u).toFixed(1)}px;background:linear-gradient(135deg, var(--x-accent), var(--x-accent-2));display:grid;place-items:center;color:var(--x-accent-ink);`, c);
      ic.innerHTML = `<svg viewBox="0 0 24 24" width="${(12 * u).toFixed(1)}" height="${(12 * u).toFixed(1)}" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${glyphs[i % glyphs.length]}</svg>`;
      const txt = mk("div", `flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:${(1.5 * u).toFixed(1)}px;line-height:1.1;`, c);
      mk("div", `font:700 ${(12 * u).toFixed(1)}px var(--x-body-font);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`, txt, title);
      if (sub) mk("div", `font:400 ${(9 * u).toFixed(1)}px var(--x-body-font);color:var(--x-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`, txt, sub);
      const val = mk("div", `flex:none;font:700 ${(14 * u).toFixed(1)}px var(--x-mono-font);font-variant-numeric:tabular-nums;color:var(--x-accent);direction:ltr;unicode-bidi:isolate;`, c, value);
      // the number inside the value: sign, digits, decimals, suffix
      const m = /^([^\d]*?)(\d+(?:[.,]\d+)?)(.*)$/.exec(value);
      const num = m ? { pre: m[1], n: parseFloat(m[2].replace(",", ".")), dec: (m[2].split(/[.,]/)[1] || "").length, post: m[3] } : null;
      return { c, val, num, value };
    });

    // the side they come in from (RTL mirrors it)
    const dir = (p.side === "left" ? -1 : 1) * (rtl ? -1 : 1);
    const gapT = Math.min(p.stagger, Math.max(0.12, (end - 0.25 - 0.45 - at) / Math.max(1, cards.length - 1))); // all landed before it leaves
    const times = cards.map((_, i) => at + i * gapT);
    times.forEach((t) => ctx.sfx(t, "pop.soft", 0.3));
    const leave = end - 0.25;

    return {
      draw(t) {
        const gone = ML.ease(t, leave, leave + 0.22);
        stack.style.opacity = (1 - gone).toFixed(4);
        cards.forEach(({ c, val, num, value }, i) => {
          const a = times[i], e = ML.out(t, a, a + 0.35);
          c.style.opacity = (t < a ? 0 : e).toFixed(4);
          c.style.translate = e >= 1 ? "none" : `${((1 - e) * 30 * u * dir).toFixed(2)}px 0`;
          if (num && p.count_up) {
            const q = ML.out(t, a + 0.05, a + 0.75), v = num.n * q;
            const txt = `${num.pre}${v.toFixed(num.dec)}${num.post}`;
            if (val.textContent !== txt) val.textContent = txt;
          } else if (val.textContent !== value) val.textContent = value;
        });
      },
    };
  },
});

// Chat card fades in as a skeleton and firms up: a small chat card (panel colour, small radius, soft shadow) rises
// and fades in over 0.4 s; tiny spaced caps labels "YOU" / "CHATBOT"; the user's bubble starts a half-grey ghost
// and darkens to solid ink over 0.4 s while its words come up in the panel colour; then the answer's skeleton bars
// (grey, varied widths) fade in 0.06 s apart and settle — each eases out to its full width and firms from a pale line
// grey to a steadier tone. Built inside the target (a card or a screen) or in the picture region.
// Source: prompt-motion henkvaness "the new claude opus" (reference only — our own rebuild).
ML.define({
  id: "ui.skeleton-chat-fill",
  category: "ui",
  name: "Chat card fades in as a skeleton and firms up",
  does: "A chat answer card appears as grey skeleton bars; the user's bubble darkens to solid ink and the reply lines settle.",
  says: ["tech", "problem", "story"],
  energy: 1,
  targets: ["card", "screen"],
  duration: [0.8, 2],
  params: {
    lines: { type: "number", range: [2, 6], default: 3 },
    question: { type: "text" },
    you: { type: "text", default: "YOU" },
    bot: { type: "text", default: "CHATBOT" },
    width: { type: "number", range: [0.5, 1], default: 0.82 },
  },
  pairs: ["ui.document-card-typing", "text-in.fade-up"],
  avoid: ["energy", "celebration", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "prompt-motion:henkvaness-the-new-claude-opus", license: "reference", note: "our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const own = !ctx.el || ctx.el === ctx.stage;
    const host = own ? ctx.scene || ctx.stage : ctx.el;
    if (!own && getComputedStyle(host).position === "static") host.style.position = "relative";
    const R = own ? f.pic : { x: 0, y: 0, w: host.clientWidth, h: host.clientHeight };
    // the card takes the target's place: nothing of what it held shows around it
    if (!own) { host.style.minHeight = R.h + "px"; host.textContent = ""; }
    const lf = rtl ? "var(--x-body-font)" : "var(--x-label-font)", track = rtl ? "0" : "var(--x-label-track)";
    const you = rtl && p.you === "YOU" ? "أنت" : p.you || "YOU";
    const bot = rtl && p.bot === "CHATBOT" ? "المساعد" : p.bot || "CHATBOT";
    const q = p.question || (rtl ? "ليه الفاتورة زادت الشهر ده؟" : "Why did my bill go up this month?");

    const w = Math.min(R.w * ML.clamp(p.width, 0.5, 1), 860 * k);
    const card = mk("div", `position:absolute;left:${(R.x + (R.w - w) / 2).toFixed(1)}px;top:0;width:${w.toFixed(1)}px;box-sizing:border-box;padding:${(30 * k).toFixed(1)}px ${(32 * k).toFixed(1)}px ${(34 * k).toFixed(1)}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * 0.2);box-shadow:var(--x-shadow);display:flex;flex-direction:column;gap:${(14 * k).toFixed(1)}px;z-index:6;pointer-events:none;`, host);
    card.dir = rtl ? "rtl" : "ltr";
    const cap = (txt) => mk("div", `font:var(--x-label-weight) ${(20 * k).toFixed(1)}px ${lf};letter-spacing:${track};text-transform:var(--x-label-case);color:var(--x-dim);`, card, txt);
    cap(you);
    const bubble = mk("div", `align-self:flex-start;max-width:86%;padding:${(16 * k).toFixed(1)}px ${(22 * k).toFixed(1)}px;border-radius:calc(var(--x-radius) * 0.4);font:500 ${(32 * k).toFixed(1)}px/1.35 var(--x-body-font);`, card, q);
    mk("div", `height:${(8 * k).toFixed(1)}px;`, card);
    cap(bot);
    const n = Math.round(ML.clamp(p.lines, 2, 6));
    const bars = [];
    for (let i = 0; i < n; i++) {
      const wd = i === n - 1 ? 38 + ML.rnd(i, 7) * 22 : 72 + ML.rnd(i, 3) * 26;
      bars.push({ el: mk("div", `height:${(16 * k).toFixed(1)}px;width:${wd.toFixed(1)}%;border-radius:99px;transform-origin:${rtl ? "100%" : "0"} 50%;`, card), wd });
    }
    // centred by CSS (not by a height measured now: web fonts may land after setup)
    card.style.top = (R.y + R.h / 2).toFixed(1) + "px";
    card.style.transform = "translateY(-50%)";

    const tB = at + 0.12, tL = at + 0.45;
    ctx.sfx(at, "pop.soft", 0.2);
    ctx.sfx(tL, "tap", 0.15);
    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.25, end);
        const u = ML.out(t, at, at + 0.4);
        card.style.opacity = (t < at ? 0 : u * (1 - leave)).toFixed(4);
        card.style.translate = `0 ${((1 - u) * 10 * k * 2).toFixed(2)}px`;
        // the bubble: half-grey ghost → solid ink, its words from dim to the panel colour
        const b = ML.ease(t, tB, tB + 0.4);
        bubble.style.background = `color-mix(in srgb, var(--x-ink) ${(b * 100).toFixed(1)}%, color-mix(in srgb, var(--x-dim) 50%, transparent))`;
        bubble.style.color = `color-mix(in srgb, var(--x-panel) ${(b * 100).toFixed(1)}%, color-mix(in srgb, var(--x-panel) 40%, transparent))`;
        // the answer's bars: stagger in, then settle to full width and a steadier grey
        bars.forEach((x, i) => {
          const s = tL + i * 0.06, o = ML.out(t, s, s + 0.3), set = ML.ease(t, s + 0.2, s + 0.7);
          x.el.style.opacity = o.toFixed(4);
          x.el.style.scale = `${(0.9 + 0.1 * ML.out(t, s, s + 0.5)).toFixed(4)} 1`;
          x.el.style.background = `color-mix(in srgb, var(--x-dim) ${(22 + 18 * set).toFixed(1)}%, transparent)`;
        });
      },
    };
  },
});

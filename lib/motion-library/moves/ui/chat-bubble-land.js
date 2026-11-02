// Chat bubbles land: messages pop in one by one on their words — fromTo opacity 0, y 34, scale 0.9 -> 1 over 0.35 s
// back.out(1.8) — mine on the end side, theirs on the start side (mirrored in RTL). Bubbles max 82% wide, padding
// 16 x 22, radius 26 with the tail corner 6–8 (22 22 22 6 on its own side); a thread is a flex column pinned to the
// bottom, and each new bubble's slot opens over 0.25 s so older ones are pushed up rather than jumping. Optional
// picture on top of a bubble (a drawn placeholder, radius 16), sender names in groups. Styles: whatsapp (mine tinted
// with the look's good colour, theirs the panel, a soft 0 2px 6px shadow), imessage (mine the accent, theirs panel-2)
// or brand (mine accent-tinted). single-overlay: one bubble pops over the scene with a deep floating shadow. A
// different drop sound per side. Pairs with typing-dots before their reply.
// Source: MotionGX lib/studio-engine/assets/scenes.js S.chat / S.appvideo (own).
ML.define({
  id: "ui.chat-bubble-land",
  category: "ui",
  name: "Chat bubbles land",
  does: "Chat messages pop in one by one on their words, mine on one side and theirs on the other, pushing older ones up (or a single bubble pops over the scene).",
  says: ["connection", "story", "step", "result"],
  energy: 2,
  targets: ["card", "line", "label"],
  duration: [0.4, 6],
  params: {
    layout: { type: "choice", options: ["thread", "single-overlay"], default: "thread" },
    style: { type: "choice", options: ["whatsapp", "imessage", "brand"], default: "whatsapp" },
    sides: { type: "choice", options: ["me", "them", "both"], default: "both" },
    image: { type: "bool", default: false },
    stagger: { type: "number", range: [0.4, 1.6], default: 0.8, unit: "s" },
    names: { type: "bool", default: false },
    messages: { type: "text", default: "" },
  },
  pairs: ["ui.typing-dots", "ui.request-bubble-send"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "own:lib/studio-engine/assets/scenes.js", license: "own", note: "S.chat bubbles, S.appvideo" },
  setup(ctx) {
    const { el, p, at, end, f, rtl } = ctx;
    const doc = document;
    const k0 = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const target = el && el !== ctx.stage ? el : null;
    // sizes follow the box the thread lives in: a card target's own width, else the stage
    const inTarget = target && (p.layout === "single-overlay" || (target.children.length >= 2 && !p.messages));
    const k = k0 * (inTarget ? Math.min(1, target.offsetWidth / (760 * k0)) : 1);
    const keepW = inTarget ? target.offsetWidth : 0, keepH = inTarget ? target.offsetHeight : 0;
    // the messages: a target's items, its text, the messages param (lines split by |), or a sample exchange
    let texts = [];
    if (p.messages) texts = String(p.messages).split(/\s*\|\s*/).filter(Boolean);
    else if (target && target.children.length >= 2) texts = [...target.children].map((c) => c.textContent.trim()).filter(Boolean);
    else if (target && target.textContent.trim()) texts = [target.textContent.trim()];
    if (!texts.length) texts = rtl ? ["ينفع أقسّط الطلب؟", "أكيد! على ٤ دفعات من غير فوايد", "تمام كده، اطلب دلوقتي"] : ["Can I split the payment?", "Sure! 4 parts, no interest", "Perfect, ordering now"];
    const single = p.layout === "single-overlay";
    if (single) texts = texts.slice(0, 1);
    const sideOf = (i) => (p.sides === "me" ? "me" : p.sides === "them" ? "them" : i % 2 === 0 ? "me" : "them");
    // look-driven bubble colours
    const pal = {
      whatsapp: { me: ["color-mix(in srgb, var(--x-good) 22%, var(--x-panel))", "var(--x-ink)"], them: ["var(--x-panel)", "var(--x-ink)"] },
      imessage: { me: ["var(--x-accent)", "var(--x-accent-ink)"], them: ["var(--x-panel-2)", "var(--x-ink)"] },
      brand: { me: ["color-mix(in srgb, var(--x-accent) 16%, var(--x-panel))", "var(--x-ink)"], them: ["var(--x-panel)", "var(--x-ink)"] },
    }[p.style] || null;
    const fs = Math.max(20, (f.wide ? 32 : 42) * k);
    const shadow = single ? "0 20px 40px -16px color-mix(in srgb, var(--x-ink) 40%, transparent)" : "0 2px 6px color-mix(in srgb, var(--x-ink) 8%, transparent)";
    // where: in the target (restyled as the thread), or a thread built over the picture region
    let thread, R;
    const host = ctx.scene || ctx.stage;
    if (target && !single && target.children.length >= 2 && !p.messages) {
      thread = target; thread.replaceChildren();
      thread.style.display = "flex"; thread.style.flexDirection = "column"; thread.style.justifyContent = "flex-end"; thread.style.gap = "0"; thread.style.boxSizing = "border-box"; thread.style.width = keepW + "px";
    } else if (target && single) {
      thread = target; thread.replaceChildren(); thread.style.display = "flex"; thread.style.flexDirection = "column"; thread.style.boxSizing = "border-box"; thread.style.width = keepW + "px";
    } else {
      R = f.pic;
      const W = Math.min(R.w * 0.94, 900 * k);
      // a thread gets the chat's own wall (panel-2, the look's radius) so it reads as a conversation, not loose
      // bubbles over the scene; a single bubble floats over the scene with no wall
      const wall = single ? "" : `background:var(--x-panel-2);border-radius:var(--x-radius);box-shadow:var(--x-shadow);padding:${(28 * k).toFixed(1)}px ${(26 * k).toFixed(1)}px;box-sizing:border-box;`;
      thread = mk("div", `position:absolute;left:${(R.x + (R.w - W) / 2).toFixed(1)}px;top:${R.y.toFixed(1)}px;width:${W.toFixed(1)}px;height:${R.h.toFixed(1)}px;${wall}display:flex;flex-direction:column;justify-content:${single ? "center" : "flex-end"};overflow:hidden;z-index:6;pointer-events:none`, host);
      if (target) target.style.visibility = "hidden";
    }
    thread.dir = rtl ? "rtl" : "ltr";
    const gap = 16 * k;
    const who = rtl ? ["سارة", "المتجر"] : ["Sara", "Shop"];
    const items = texts.map((txt, i) => {
      const side = sideOf(i), me = side === "me";
      // the slot whose height opens; the bubble inside it pops
      const slot = mk("div", `display:flex;flex-direction:column;align-items:${me ? "flex-end" : "flex-start"};overflow:visible;flex:none`, thread);
      const [bg, ink] = pal[side];
      const r = 26 * k, tail = 7 * k;
      const b = mk("div", `max-width:82%;box-sizing:border-box;padding:${(16 * k).toFixed(1)}px ${(22 * k).toFixed(1)}px;border-radius:${r.toFixed(1)}px;${me ? "border-end-end-radius" : "border-end-start-radius"}:${tail.toFixed(1)}px;background:${bg};color:${ink};font:500 ${fs.toFixed(1)}px/1.35 var(--x-body-font);box-shadow:${shadow};transform-origin:${me ? (rtl ? "left" : "right") : rtl ? "right" : "left"} bottom`, slot);
      if (p.names && !me) mk("div", `font:600 ${(fs * 0.72).toFixed(1)}px var(--x-body-font);color:color-mix(in srgb, var(--x-good) 70%, var(--x-ink));margin-bottom:${(4 * k).toFixed(1)}px`, b, who[i % 2]);
      if (p.image && i === (p.sides === "them" ? 0 : Math.min(1, texts.length - 1))) {
        mk("div", `width:${(380 * k).toFixed(1)}px;max-width:100%;height:${(220 * k).toFixed(1)}px;border-radius:${(16 * k).toFixed(1)}px;margin-bottom:${(10 * k).toFixed(1)}px;background:radial-gradient(circle at 70% 30%, color-mix(in srgb, var(--x-panel) 55%, transparent) 0 18%, transparent 19%), linear-gradient(135deg, var(--x-accent-2), var(--x-accent))`, b);
      }
      mk("div", "", b, txt);
      return { slot, b, me };
    });
    // measure each slot's open height (with the gap above it) while all are laid out
    items.forEach((it) => { it.h = it.slot.offsetHeight; });
    const total = items.reduce((a, it) => a + it.h, 0) + gap * (items.length - 1);
    // a built wall fits its conversation (a tall region is not left mostly empty); a target keeps its place in the
    // layout and never shrinks, growing only if the whole thread needs it
    if (R && !single) { const H = ML.clamp(total + 56 * k, R.h * 0.45, R.h); thread.style.height = H.toFixed(1) + "px"; thread.style.top = (R.y + (R.h - H) / 2).toFixed(1) + "px"; }
    else if (target && !single && thread === target) thread.style.height = Math.max(keepH, total).toFixed(1) + "px";
    // their moments: each on its own spoken word when the voice says it, else a steady stagger
    const step = Math.min(p.stagger, texts.length > 1 ? Math.max(0.2, (end - at - 0.65) / (texts.length - 1)) : p.stagger);
    const times = texts.map((txt, i) => {
      const fb = at + 0.1 + i * step;
      const first = String(txt).split(/\s+/).find((w) => ML.plain(w).length > 2);
      const w = first ? ctx.word(first, -1) : -1;
      return w >= at && w < end - 0.3 ? w : fb;
    });
    for (let i = 1; i < times.length; i++) times[i] = Math.max(times[i], times[i - 1] + 0.2);
    times.forEach((x, i) => x < end && ctx.sfx(x, items[i].me ? "pop" : "pop.soft", 0.4));
    const backOut = (u) => { const c = 1.8, x = u - 1; return u >= 1 ? 1 : 1 + (c + 1) * x * x * x + c * x * x; };
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        thread.style.opacity = (ML.out(t, at - 0.2, at + 0.1) * (1 - leave)).toFixed(4);
        items.forEach((it, i) => {
          const a = times[i];
          if (t < a) { it.slot.style.display = "none"; return; }
          it.slot.style.display = "flex";
          // the slot opens (older ones rise) and the bubble pops: opacity 0 -> 1, y 34 -> 0, scale 0.9 -> 1, back.out(1.8)
          const open = ML.out(t, a, a + 0.25);
          it.slot.style.height = single ? "auto" : (it.h * open).toFixed(2) + "px";
          it.slot.style.marginTop = single || i === 0 ? "0" : (gap * open).toFixed(2) + "px";
          const u = ML.clamp((t - a) / 0.35), e = backOut(u);
          it.b.style.opacity = ML.clamp(u * 2.2).toFixed(4);
          it.b.style.translate = `0 ${((1 - e) * 34 * k).toFixed(2)}px`;
          it.b.style.scale = (0.9 + 0.1 * e).toFixed(4);
        });
      },
    };
  },
});

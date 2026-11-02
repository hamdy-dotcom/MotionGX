// Typing indicator: before their reply, a "• • •" bubble (dim bold dots) shows in the reply's own place — opacity → 1
// over 0.15 s, `lead` seconds before it; at the reply time it goes and the reply appears there, nothing around it
// moving. The dots ripple (each dot's brightness pulses in turn, a pure function of t) or hold still. On a reply card
// target the card itself waits hidden until its moment (reveal_reply off: the dots sit just above the card, which stays
// put); with no target a small chat card (their bubble under ours) is built over the picture region. Replies sit on
// the start side (left in LTR, right in RTL).
// Source: MotionGX lib/studio-engine/assets/scenes.js S.chat (own).
ML.define({
  id: "ui.typing-dots",
  category: "ui",
  name: "Typing indicator",
  does: "Before their reply, a bubble with three dots appears as if they are typing.",
  says: ["connection", "time"],
  energy: 1,
  targets: ["shape", "card"],
  duration: [0.4, 1.2],
  params: {
    lead: { type: "number", range: [0.4, 1], default: 0.6, unit: "s" },
    dots_motion: { type: "choice", options: ["static", "wave"], default: "wave" },
    reveal_reply: { type: "bool", default: true },
    reply: { type: "text" },
  },
  pairs: ["ui.request-bubble-send", "ui.skeleton-chat-fill"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "own:lib/studio-engine/assets/scenes.js", license: "own", note: "S.chat typing dots" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const lead = ML.clamp(p.lead, 0.4, 1);
    const tReply = Math.min(at + lead, end - 0.1);
    const bubbleCss = (fs) => `padding:${(fs * 0.38).toFixed(1)}px ${(fs * 0.77).toFixed(1)}px;border-radius:min(var(--x-radius), ${(fs * 0.77).toFixed(1)}px);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);`;

    let dotsBox, reply, chat = null;
    if (el) {
      // over the reply card's own place (out of the flow, so its neighbours never shift), the card waiting for its moment
      const fs = Math.max(16, 26 * k), par = el.parentNode;
      if (getComputedStyle(par).position === "static") par.style.position = "relative";
      dotsBox = mk("div", `position:absolute;width:max-content;visibility:hidden;z-index:6;${bubbleCss(fs)}font:700 ${fs.toFixed(1)}px var(--x-head-font);color:var(--x-dim);line-height:1;`, par);
      reply = p.reveal_reply ? el : null;
    } else {
      const R = f.pic, fs = Math.max(18, 34 * k);
      const W = Math.min(R.w * 0.92, 820 * k);
      chat = mk("div", `position:absolute;left:${(R.x + (R.w - W) / 2).toFixed(1)}px;top:${(R.y + R.h * 0.3).toFixed(1)}px;width:${W.toFixed(1)}px;box-sizing:border-box;padding:${(28 * k).toFixed(1)}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:var(--x-radius);box-shadow:var(--x-shadow);display:flex;flex-direction:column;gap:${(18 * k).toFixed(1)}px;font:400 ${fs.toFixed(1)}px var(--x-body-font);color:var(--x-ink);z-index:6;pointer-events:none;`, ctx.scene || ctx.stage);
      chat.dir = rtl ? "rtl" : "ltr";
      mk("div", `align-self:flex-end;max-width:78%;${bubbleCss(fs)}background:var(--x-accent);color:var(--x-accent-ink);border-color:transparent;`, chat, rtl ? "ممكن أغيّر موعد التوصيل؟" : "Can I move my delivery?");
      const theirs = `background:var(--x-panel-2);box-shadow:none;`;
      // their reply holds its place in the card from the start; the dots wait in that place
      reply = p.reveal_reply ? mk("div", `align-self:flex-start;max-width:78%;${bubbleCss(fs)}${theirs}`, chat, p.reply || (rtl ? "أكيد! اختار اليوم اللي يناسبك" : "Sure! Pick any day that suits you")) : null;
      dotsBox = mk("div", `${reply ? "position:absolute;" : "align-self:flex-start;"}width:max-content;visibility:hidden;${bubbleCss(fs)}${theirs}font:700 ${(fs * 0.8).toFixed(1)}px var(--x-head-font);color:var(--x-dim);line-height:1;`, chat);
    }
    const dots = [0, 1, 2].map((i) => mk("span", `display:inline-block;${i ? "margin-inline-start:0.32em;" : ""}`, dotsBox, "•"));
    // the dots' place: the reply's own corner, or just above a card that stays
    const slot = el || reply;
    if (slot) {
      const par = dotsBox.parentNode, gap = 12 * k;
      dotsBox.style.top = (el && !reply ? slot.offsetTop - dotsBox.offsetHeight - gap : slot.offsetTop).toFixed(1) + "px";
      if (rtl) dotsBox.style.right = (par.clientWidth - slot.offsetLeft - slot.offsetWidth).toFixed(1) + "px";
      else dotsBox.style.left = slot.offsetLeft.toFixed(1) + "px";
    }
    ctx.sfx(tReply, "pop.soft", 0.25);

    return {
      draw(t) {
        const on = t >= at && t < tReply;
        dotsBox.style.visibility = on ? "visible" : "hidden";
        if (chat) chat.style.opacity = (ML.lin(t, at - 0.15, at) * (1 - ML.lin(t, end - 0.2, end))).toFixed(4);
        dotsBox.style.opacity = on ? ML.lin(t, at, at + 0.15).toFixed(4) : "0";
        dots.forEach((d, i) => {
          const w = p.dots_motion === "wave" ? 0.35 + 0.65 * Math.max(0, Math.sin(((t - at) / 0.6) * Math.PI * 2 - i * 0.9)) : 1;
          d.style.opacity = w.toFixed(4);
        });
        if (reply) {
          const r = ML.out(t, tReply, tReply + 0.25);
          reply.style.visibility = t < tReply ? "hidden" : "visible";
          reply.style.opacity = r.toFixed(4);
          reply.style.translate = `0 ${((1 - r) * 10 * k).toFixed(2)}px`;
        }
      },
    };
  },
});

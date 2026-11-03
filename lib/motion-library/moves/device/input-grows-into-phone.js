// Input expands into a phone screen: a message is being typed into a lone input field; as the message grows, the field
// becomes part of a phone — the phone frame (rounded 40 px, light edge) scales 0.9 → 1 around it and levels from a 4°
// tilt in 0.5 s, its status bar fades in, the chat behind the field arrives; the field itself grows into a multi-line
// card, its height easing up one line at a time (0.2 s a line) as the words wrap. Or a browser window grows around it.
// Everything is laid out at full size and only ever scaled ≤ 1; the caret blinks on the clock.
// Source: prompt-motion "ultimaxbt-2ddf1e" (reference only: rebuilt as our own code).
ML.define({
  id: "device.input-grows-into-phone",
  category: "device",
  name: "Input expands into a phone screen",
  does: "As the message grows, the input field becomes part of a phone screen: the status bar and frame grow around it.",
  says: ["tech", "step"],
  energy: 3,
  targets: ["screen"],
  duration: [2, 5],
  params: {
    device: { type: "choice", options: ["phone", "browser"], default: "phone" },
    tilt: { type: "number", range: [0, 8], default: 4, unit: "deg" },
    line_time: { type: "number", range: [0.1, 0.4], default: 0.2, unit: "s" },
    text: { type: "text", default: "" }, // the message typed; empty: a sample in the film's language
  },
  pairs: ["ui.chat-prompt-typing", "device.app-window-frame"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "prompt-motion:ultimaxbt-2ddf1e", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { p, at, end, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, text, parent) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const given = ctx.el && ctx.el.tagName !== "IMG" ? ctx.el : null;
    const room = given ? ctx.box(given) : { x: ctx.f.pic.x, y: ctx.f.pic.y, w: ctx.f.pic.w, h: ctx.f.pic.h };
    if (given) given.style.visibility = "hidden";
    const host = mk("div", `position:absolute;left:${room.x}px;top:${room.y}px;width:${room.w}px;height:${room.h}px;z-index:4;display:flex;align-items:center;justify-content:center;background:var(--x-ground);direction:${rtl ? "rtl" : "ltr"}`, null, ctx.scene || ctx.stage);
    const phone = p.device !== "browser";
    let DW, DH;
    if (phone) { DH = Math.min(room.h * 0.96, (room.w * 0.9) / 0.48); DW = DH * 0.48; }
    else { DW = Math.min(room.w * 0.94, room.h * 0.94 * 1.45); DH = DW / 1.45; }
    DW = Math.round(DW); DH = Math.round(DH);
    const k = phone ? DW / 400 : DW / 1000;
    const fs = phone ? DW / 17 : DW / 40;
    const T = rtl
      ? { app: "المساعد", now: "متصل الآن", bubbles: ["أهلًا! أقدر أساعدك في إيه؟", "عايز أرتّب رحلة"], msg: "رتّبلي رحلة ثلاث أيام في إسكندرية الأسبوع الجاي، فندق على البحر، ومطاعم سمك حلوة، وخطة لكل يوم", url: "assistant.app", hint: "اكتب رسالة…" }
      : { app: "Assistant", now: "Online now", bubbles: ["Hi! How can I help today?", "I want to plan a trip"], msg: "Plan me a three-day trip to Lisbon next week: a hotel by the river, the best seafood spots, and a simple plan for each day", url: "assistant.app", hint: "Message…" };
    const msg = p.text || T.msg;
    // the device: frame, screen, status bar / browser bar, the chat, the input card
    const dev = mk("div", `position:relative;width:${DW}px;height:${DH}px;flex:none;transform-origin:50% 70%`, null, host);
    const frame = mk("div", `position:absolute;inset:0;box-sizing:border-box;border-radius:${phone ? Math.round(40 * k * 1.25) : Math.round(14 * k)}px;background:var(--x-panel);` +
      `border:${phone ? Math.max(6, Math.round(11 * k)) : Math.max(1, Math.round(k))}px solid var(--x-panel-2);box-shadow:0 0 0 1px var(--x-line), var(--x-shadow)`, null, dev);
    const screen = mk("div", `position:absolute;inset:${phone ? Math.max(6, Math.round(11 * k)) : 1}px;overflow:hidden;border-radius:${phone ? Math.round(30 * k * 1.25) : Math.round(13 * k)}px;background:var(--x-ground);font-family:var(--x-body-font);font-size:${fs.toFixed(2)}px;color:var(--x-ink)`, null, dev);
    const fades = []; // frame parts that arrive with the frame, in order
    let topH;
    if (phone) {
      const bar = mk("div", "position:absolute;top:0;inset-inline:0;height:2.3em;display:flex;align-items:center;justify-content:space-between;padding:0 1.5em;font:600 0.78em var(--x-body-font);direction:ltr", null, screen);
      mk("span", "", "9:41", bar);
      const icons = mk("span", "display:flex;align-items:center;gap:0.35em", null, bar);
      const sig = mk("span", "display:flex;align-items:flex-end;gap:0.12em;height:0.8em", null, icons);
      for (let i = 0; i < 4; i++) mk("i", `display:block;width:0.2em;height:${40 + i * 20}%;border-radius:0.06em;background:currentColor`, null, sig);
      const bat = mk("span", "position:relative;width:1.6em;height:0.8em;border:0.1em solid currentColor;border-radius:0.25em;box-sizing:border-box;opacity:.9", null, icons);
      mk("i", "position:absolute;inset:0.1em;width:70%;border-radius:0.12em;background:currentColor", null, bat);
      const island = mk("i", "position:absolute;left:50%;top:0.45em;margin-left:-2.6em;width:5.2em;height:1.5em;border-radius:1em;background:var(--x-device)", null, screen);
      fades.push(island, bar);
      topH = 2.6;
    } else {
      const bar = mk("div", "position:absolute;top:0;inset-inline:0;height:2.6em;display:flex;align-items:center;gap:1em;padding:0 1em;background:var(--x-bar);border-bottom:var(--x-edge) solid var(--x-edge-color);direction:ltr", null, screen);
      const lights = mk("span", "display:flex;gap:0.45em;opacity:var(--x-lights)", null, bar);
      for (let i = 1; i <= 3; i++) mk("i", `display:block;width:0.7em;height:0.7em;border-radius:50%;background:var(--x-light-${i})`, null, lights);
      mk("span", "flex:1;max-width:22em;margin:0 auto;text-align:center;padding:0.3em 1em;border-radius:var(--x-radius-s);background:var(--x-panel-2);color:var(--x-dim);font-size:0.85em", T.url, bar);
      fades.push(bar);
      topH = 2.6;
    }
    const head = mk("div", `position:absolute;top:${topH + 0.4}em;inset-inline:0;display:flex;align-items:center;gap:0.6em;padding:0.4em 1.1em 0.7em;border-bottom:var(--x-edge) solid var(--x-line)`, null, screen);
    mk("i", "flex:none;width:1.9em;height:1.9em;border-radius:50%;background:linear-gradient(135deg, var(--x-accent), var(--x-accent-2))", null, head);
    const hn = mk("div", "display:flex;flex-direction:column;line-height:1.15", null, head);
    mk("b", "font-weight:600", T.app, hn); mk("span", "font-size:0.72em;color:var(--x-good)", T.now, hn);
    fades.push(head);
    const chat = mk("div", `position:absolute;top:${topH + 4.2}em;inset-inline:0;padding:0 1em;display:flex;flex-direction:column;gap:0.55em`, null, screen);
    T.bubbles.forEach((b, i) => { const e = mk("div", `max-width:78%;padding:0.55em 0.85em;border-radius:1.1em;font-size:0.9em;line-height:1.35;${i % 2 ? "align-self:flex-end;background:var(--x-accent);color:var(--x-accent-ink)" : "align-self:flex-start;background:var(--x-panel-2);color:var(--x-ink)"}`, b, chat); fades.push(e); });
    // the input card: anchored to the bottom, grows upward one line at a time
    const inset = phone ? 0.8 : 6;
    const card = mk("div", `position:absolute;bottom:${phone ? 1.6 : 1.4}em;inset-inline:${inset}em;box-sizing:border-box;display:flex;align-items:flex-end;gap:0.5em;` +
      `padding-inline-start:0.95em;padding-inline-end:0.55em;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:1.35em;box-shadow:var(--x-shadow);overflow:hidden`, null, screen);
    const txt = mk("div", "flex:1;min-width:0;align-self:flex-start;font-size:0.95em;line-height:1.4;white-space:pre-wrap;overflow-wrap:anywhere;padding:0.2em 0", null, card);
    const send = mk("div", "flex:none;width:2em;height:2em;border-radius:50%;background:var(--x-accent);display:flex;align-items:center;justify-content:center;color:var(--x-accent-ink)", null, card);
    send.innerHTML = `<svg viewBox="0 0 24 24" width="55%" height="55%" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`;
    const chars = Array.from(msg);
    // line breaks: measure the field at every typed length (once)
    card.style.height = "auto";
    txt.textContent = "x";
    const oneH = card.offsetHeight, lineH = txt.offsetHeight - parseFloat(getComputedStyle(txt).paddingTop) * 2;
    const linesAt = [];
    for (let n = 0; n <= chars.length; n++) { txt.textContent = chars.slice(0, n).join("") || "x"; linesAt.push(Math.max(1, Math.round((txt.offsetHeight - parseFloat(getComputedStyle(txt).paddingTop) * 2) / lineH))); }
    txt.textContent = "";
    const hint = mk("span", "color:var(--x-dim)", T.hint, txt);
    const typed = mk("span", "", "", txt);
    const caret = mk("span", "display:inline-block;width:0.08em;height:1.15em;vertical-align:-0.2em;margin-inline-start:0.05em;background:var(--x-accent)", null, txt);
    card.style.height = oneH + "px";
    // timing: the field first, typing, the frame growing around it
    const ty0 = at + 0.25, cps = Math.max(26, chars.length / Math.max(1, end - at - 1.0));
    const ty1 = ty0 + chars.length / cps;
    const tAt = (n) => ty0 + n / cps;
    const steps = [];
    for (let n = 1; n <= chars.length; n++) if (linesAt[n] > linesAt[n - 1]) steps.push(tAt(n));
    const fA = at + 0.45;
    ctx.sfx(ty0, "key", 0.25);
    for (let n = 12; n < chars.length; n += 12) ctx.sfx(tAt(n), "key", 0.18);
    ctx.sfx(fA, "pop.soft", 0.35);
    const leave = Math.max(ty1 + 0.4, end - 0.3);
    // the lone field starts in the middle of the room and settles into its place in the screen as the device forms
    const lift = DH / 2 - parseFloat(getComputedStyle(card).bottom) - oneH / 2 - (phone ? Math.max(6, Math.round(11 * k)) : 1);
    return {
      draw(t) {
        const gone = ML.ease(t, leave, leave + 0.25);
        host.style.opacity = (1 - gone).toFixed(4);
        host.style.visibility = t < at ? "hidden" : "visible"; // its ground only covers the room from the moment it arrives
        // the lone field arrives
        const fIn = ML.expo(t, at, at + 0.4);
        card.style.opacity = (t < at ? 0 : ML.clamp(fIn * 1.5)).toFixed(4);
        card.style.translate = `0 ${((1 - fIn) * fs * 0.8 - lift * (1 - ML.ease(t, fA, fA + 0.55))).toFixed(2)}px`;
        // the device grows around it: 0.9 → 1, tilt → 0 (0.5 s), the frame and its parts fade in
        const g = ML.out(t, fA, fA + 0.5);
        dev.style.transform = `rotate(${(p.tilt * (rtl ? -1 : 1) * (1 - g)).toFixed(3)}deg) scale(${(0.9 + 0.1 * g).toFixed(4)})`;
        const fo = ML.ease(t, fA, fA + 0.35);
        frame.style.opacity = fo.toFixed(4);
        screen.style.background = `color-mix(in srgb, var(--x-ground) ${(fo * 100).toFixed(1)}%, transparent)`;
        fades.forEach((e, i) => { const a = fA + 0.2 + i * 0.07, v = ML.expo(t, a, a + 0.4); e.style.opacity = ML.clamp(v * 1.3).toFixed(4); e.style.translate = `0 ${((1 - v) * fs * 0.4).toFixed(2)}px`; });
        // the message types; the field eases up a line at a time
        const n = t < ty0 ? 0 : Math.min(chars.length, Math.floor((t - ty0) * cps));
        typed.textContent = chars.slice(0, n).join("");
        hint.style.display = n ? "none" : "inline";
        caret.style.opacity = t < ty1 ? (t - ty0 < 0 ? ML.blink(t, 1) : 1) : ML.blink(t - ty1, 1);
        let h = oneH;
        for (const s of steps) h += lineH * ML.ease(t, s, s + p.line_time);
        card.style.height = h.toFixed(2) + "px";
        send.style.scale = n >= chars.length ? (1 + 0.12 * ML.pulse(t, ty1 + 0.05, 0.06, 0.25)).toFixed(4) : "none";
      },
    };
  },
});

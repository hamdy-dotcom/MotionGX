// Prompt typed into an AI chat composer: on the look's ground, a greeting row (a small accent asterisk + a serif
// "Evening, <name>") sits over a rounded composer card (the look's panel, a hairline edge, a soft shadow) with a
// footer row inside: "+" at the start, a model label and a square accent send button at the end; a small dim helper
// line under it. A long prompt types at a steady chars_per_s with a ±20% seeded jitter and a 0.15 s pause after a
// full stop; the caret (1.5 px) is solid while typing and blinks on a 1.06 s period when idle. The text box grows to
// fit each newly wrapped line over 0.12 s ease-out, so the footer slides down instead of jumping — the viewer feels
// the prompt's length. Exit: fade-wash (the UI fades with a 4 px blur while a wash of the panel rises, 0.4 s
// power2.in), send-click (the send button presses, the text clears) or cut.
// Source: prompt-motion "alex-prompter-claude-opus-5-5-can" (reference only: rebuilt as our own code).
ML.define({
  id: "ui.chat-prompt-typing",
  category: "ui",
  name: "Prompt typed into an AI chat composer",
  does: "A long prompt types itself into a rounded chat composer under a greeting line, the box growing line by line as the text wraps.",
  says: ["tech", "story", "simplicity"],
  energy: 2,
  targets: ["screen", "line"],
  duration: [2, 6],
  params: {
    chars_per_s: { type: "number", range: [30, 60], default: 50 },
    exit: { type: "choice", options: ["fade-wash", "send-click", "cut"], default: "fade-wash" },
    header: { type: "choice", options: ["greeting", "none"], default: "greeting" },
    theme: { type: "choice", options: ["light", "dark"], default: "light" },
    prompt: { type: "text", default: "" },
    name: { type: "text", default: "" },
    model: { type: "text", default: "" },
  },
  pairs: ["ui.ai-glow-input-flyin", "ui.llm-window-stream"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "prompt-motion:alex-prompter-claude-opus-5-5-can", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k0 = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, html) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (html != null) e.innerHTML = html; if (parent) parent.append(e); return e; };
    const target = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const isLine = target && target.children.length === 0 && target.textContent.trim().length > 0 && !target.matches("[data-slot=screen]");
    const own = isLine ? target.textContent.trim() : "";
    const text = p.prompt || own || (rtl
      ? "اعملّي فيديو قصير لإطلاق تطبيق التقسيط بتاعنا: ابدأ بالمشكلة، ورّي الخطوات الثلاثة بسرعة، واختم بالسعر والدعوة للتحميل."
      : "Make a short launch video for our instalments app. Open on the problem, show the three steps fast, and end on the price with a clear call to download.");
    // the host: a screen target, else a layer over the scene (a line target is the prompt's source and steps aside)
    let host;
    if (target && !isLine) { const w = target.offsetWidth, h = target.offsetHeight; host = target; host.replaceChildren(); host.style.boxSizing = "border-box"; host.style.width = w + "px"; host.style.height = h + "px"; if (getComputedStyle(host).position === "static") host.style.position = "relative"; host.style.overflow = "hidden"; }
    else { host = mk("div", "position:absolute;inset:0;z-index:6;pointer-events:none", ctx.scene || ctx.stage); if (target) target.style.visibility = "hidden"; }
    const luma = (v) => { const e = mk("i", `display:none;color:${v}`, host), c = doc.createElement("canvas"); c.width = c.height = 1; const g = c.getContext("2d"); g.fillStyle = getComputedStyle(e).color; e.remove(); g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return 0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]; };
    // what reads on the device's dark, in any look: a dark look's panel is dark, a light look's ink is dark
    const devL = luma("var(--x-device)");
    const ON = Math.abs(luma("var(--x-ink)") - devL) >= Math.abs(luma("var(--x-panel)") - devL) ? "var(--x-ink)" : "var(--x-panel)";
    // dark: on the device's dark whatever the look; light: the look's own ground and panel
    const C = p.theme === "dark"
      ? { ground: "var(--x-device)", panel: `color-mix(in srgb, var(--x-device) 88%, ${ON})`, ink: ON, dim: `color-mix(in srgb, ${ON} 58%, var(--x-device))`, edge: `color-mix(in srgb, ${ON} 14%, transparent)` }
      : { ground: "var(--x-ground)", panel: "var(--x-panel)", ink: "var(--x-ink)", dim: "var(--x-dim)", edge: "var(--x-line)" };
    const HW = host.clientWidth || f.W;
    // type and spacing follow the box: a small screen target shrinks the whole composer, the stage leaves it at size
    const k = k0 * Math.min(1, HW / 900);
    const root = mk("div", `position:absolute;inset:0;background:${C.ground};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${(30 * k).toFixed(1)}px;color:${C.ink};font-family:var(--x-body-font)`, host);
    root.dir = rtl ? "rtl" : "ltr";
    const ui = mk("div", "display:flex;flex-direction:column;align-items:center", root);
    const cardW = Math.min(HW - 2 * (target && !isLine ? 40 * k : Math.max(f.m, 40 * k)), (f.wide ? 1180 : 940) * k);
    const fs = Math.max(14, (f.wide ? 34 : 44) * k);
    if (p.header === "greeting") {
      const g = mk("div", `display:flex;align-items:center;gap:${(16 * k).toFixed(1)}px;margin-bottom:${(36 * k).toFixed(1)}px;font:400 ${((f.wide ? 58 : 68) * k).toFixed(1)}px/1.1 var(--x-serif-font);letter-spacing:-0.01em`, ui);
      mk("span", `display:flex;color:var(--x-accent)`, g, `<svg viewBox="0 0 24 24" style="width:${(44 * k).toFixed(1)}px;height:${(44 * k).toFixed(1)}px" fill="currentColor"><path d="M11 1.5h2l.6 7.3 5.2-5.2 1.4 1.4-5.2 5.2 7.5.8v2l-7.5.8 5.2 5.2-1.4 1.4-5.2-5.2-.6 7.3h-2l-.6-7.3-5.2 5.2-1.4-1.4 5.2-5.2L1.5 13v-2l7.5-.8L3.8 5 5.2 3.6l5.2 5.2z"/></svg>`);
      const nm = p.name || (rtl ? "أحمد" : "Sam");
      mk("span", "", g, "").textContent = rtl ? `مساء الخير يا ${nm}` : `Evening, ${nm}`;
    }
    const card = mk("div", `width:${cardW.toFixed(1)}px;box-sizing:border-box;background:${C.panel};border:var(--x-edge) solid ${C.edge};border-radius:calc(var(--x-radius) * 0.5);box-shadow:0 2px 8px color-mix(in srgb, var(--x-ink) 5%, transparent), var(--x-shadow);padding:${(28 * k).toFixed(1)}px ${(30 * k).toFixed(1)}px ${(20 * k).toFixed(1)}px;display:flex;flex-direction:column;gap:${(22 * k).toFixed(1)}px`, ui);
    const lh = fs * 1.45;
    const box = mk("div", `position:relative;overflow:hidden;margin-block:${(-fs * 0.3).toFixed(1)}px;height:${lh.toFixed(1)}px;font:400 ${fs.toFixed(1)}px/${lh.toFixed(1)}px var(--x-body-font);text-align:start`, card);
    // a little clear space above and below the lines, so tall marks (shadda, accents) never touch the clip edge
    const padY = Math.round(fs * 0.3);
    const flow = mk("div", `position:absolute;inset-inline:0;top:${padY}px;white-space:pre-wrap;overflow-wrap:break-word`, box);
    // the whole prompt is laid out from the first frame (the rest in transparent ink), so lines wrap where they will
    // end and glyphs never re-flow between frames; the caret is a zero-width anchor with its bar hung off it
    const typedEl = mk("span", "", flow);
    const anchor = mk("span", "display:inline-block;position:relative;width:0;height:1em;vertical-align:baseline", flow);
    const caret = mk("span", `position:absolute;inset-inline-start:0;bottom:${(-fs * 0.22).toFixed(1)}px;width:${Math.max(1.5, 2.4 * k).toFixed(1)}px;height:${(fs * 1.15).toFixed(1)}px;background:${C.ink}`, anchor);
    const restEl = mk("span", "color:transparent", flow);
    const ph = mk("span", `position:absolute;inset-inline-start:0;top:${padY}px;color:${C.dim}`, box, "");
    ph.textContent = rtl ? "اكتب طلبك…" : "How can I help you today?";
    const foot = mk("div", `display:flex;align-items:center;gap:${(18 * k).toFixed(1)}px;color:${C.dim};font:500 ${(fs * 0.72).toFixed(1)}px var(--x-body-font)`, card);
    mk("span", `font:300 ${(fs * 1.2).toFixed(1)}px/1 var(--x-body-font);width:${(fs * 1.1).toFixed(1)}px;text-align:center`, foot, "+");
    mk("span", "flex:1", foot);
    mk("span", "", foot, "").textContent = p.model || (rtl ? "النموذج ٤" : "Model 4");
    const sendSz = 58 * k;
    const send = mk("span", `display:flex;align-items:center;justify-content:center;width:${sendSz.toFixed(1)}px;height:${sendSz.toFixed(1)}px;border-radius:${(sendSz * 0.25).toFixed(1)}px;background:var(--x-accent);color:var(--x-accent-ink)`, foot,
      `<svg viewBox="0 0 24 24" style="width:55%;height:55%" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>`);
    const help = mk("div", `margin-top:${(18 * k).toFixed(1)}px;font:400 ${(fs * 0.6).toFixed(1)}px var(--x-body-font);color:${C.dim}`, ui, "");
    help.textContent = rtl ? "الذكاء الاصطناعي ممكن يغلط، راجع الردود" : "AI can make mistakes. Check important info.";
    const wash = mk("div", `position:absolute;inset:0;background:${C.panel};transform:translateY(100%);pointer-events:none`, root);
    // the typing clock: each character's moment, seeded jitter ±20%, 0.15 s after a full stop
    const chars = Array.from(text);
    const exitD = p.exit === "cut" ? 0 : 0.5;
    const t0 = at + 0.35;
    const times = [];
    let x = t0;
    chars.forEach((ch, i) => { times.push(x); x += (1 / p.chars_per_s) * (0.8 + 0.4 * ML.rnd(i, 7)); if (/[.!?؟،,:]/.test(ch) && /\s/.test(chars[i + 1] || "")) x += /[.!?؟]/.test(ch) ? 0.15 : 0.06; });
    // whole prompt typed before the exit: compress the clock if it would run over
    const budget = Math.max(0.6, end - exitD - 0.35 - t0);
    if (x - t0 > budget) { const s = budget / (x - t0); for (let i = 0; i < times.length; i++) times[i] = t0 + (times[i] - t0) * s; x = t0 + budget; }
    const tDone = x;
    // the box's height after each character: measure where the wraps fall, once
    const heights = [];
    for (let n = 0; n <= chars.length; n++) { typedEl.textContent = chars.slice(0, n).join(""); restEl.textContent = chars.slice(n).join(""); heights.push((Math.floor((anchor.offsetTop + 2) / lh) + 1) * lh); }
    typedEl.textContent = ""; restEl.textContent = text;
    const grows = [];
    for (let n = 1; n <= chars.length; n++) if (heights[n] !== heights[n - 1]) grows.push([times[n - 1], heights[n] - heights[n - 1]]);
    // keys: about one sound per beat while typing
    for (let tt = t0; tt < tDone; tt += 0.32) ctx.sfx(tt, "key", 0.22);
    const tExit = end - exitD;
    if (p.exit === "send-click") ctx.sfx(tExit, "click", 0.4);
    else if (p.exit === "fade-wash") ctx.sfx(tExit, "whoosh.soft", 0.3);
    return {
      draw(t) {
        // past its end the layer gets out of the way: a move ending before its scene never leaves the stage covered
        root.style.opacity = (p.exit === "cut" ? (t < at || t >= end ? 0 : 1) : ML.out(t, at - 0.1, at + 0.25) * (1 - ML.clamp((t - end) / 0.2))).toFixed(4);
        // typed so far
        let n = 0;
        while (n < chars.length && t >= times[n]) n++;
        const sent = p.exit === "send-click" && t >= tExit + 0.12;
        typedEl.textContent = sent ? "" : chars.slice(0, n).join("");
        restEl.textContent = sent ? "" : chars.slice(n).join("");
        ph.style.opacity = n === 0 || sent ? "1" : "0";
        // the box grows to fit each wrapped line over 0.12 s
        let h = lh;
        if (!sent) for (const [tg, dh] of grows) h += dh * ML.out(t, tg, tg + 0.12);
        box.style.height = (h + 2 * padY).toFixed(2) + "px";
        const typing = n > 0 && n < chars.length && t - times[Math.max(0, n - 1)] < 0.4;
        caret.style.opacity = t < t0 - 0.2 ? "0" : typing ? "1" : String(ML.blink(t - t0, 1.06));
        caret.style.display = sent ? "none" : "block";
        // send-click: the button presses down and back
        const press = p.exit === "send-click" ? ML.pulse(t, tExit, 0.06, 0.18) : 0;
        send.style.scale = press > 0.001 ? (1 - 0.12 * press).toFixed(4) : "none";
        // fade-wash: the UI fades with a 4 px blur while the panel's wash rises (power2.in)
        if (p.exit === "fade-wash") {
          const u = ML.clamp((t - tExit) / 0.4), e = u * u;
          ui.style.opacity = (1 - e).toFixed(4);
          ui.style.filter = e > 0.002 ? `blur(${(4 * e).toFixed(2)}px)` : "none";
          wash.style.transform = `translateY(${(100 * (1 - e)).toFixed(2)}%)`;
        } else {
          ui.style.opacity = "1"; ui.style.filter = "none";
          wash.style.transform = "translateY(100%)";
          if (p.exit === "send-click") root.style.opacity = (Number(root.style.opacity) * (1 - ML.clamp((t - (end - 0.2)) / 0.2))).toFixed(4);
        }
      },
    };
  },
});

// AI glow input fly-in: a pill chat input with an iridescent glow (a blurred conic gradient of the look's colours
// behind it) swoops in from a 3D angle — tilted on X, Y and Z, pushed back in depth, off to one side, motion-blurred —
// and straightens flat on expo.out; then the prompt types inside behind a block caret with a gradient tail while the
// glow keeps turning slowly. Directions mirror in RTL. Nothing is ever scaled above 1 (depth only pushes back).
// Source: prompt-motion "ultimaxbt-2ddf1e" (reference only: rebuilt as our own code).
ML.define({
  id: "ui.ai-glow-input-flyin",
  category: "ui",
  name: "AI glow input flies in",
  does: "A chat input bar with a glowing iridescent rim swoops in on a 3D angle and straightens up as text types into it.",
  says: ["tech", "arrival", "simplicity"],
  energy: 4,
  targets: ["screen", "line"],
  duration: [1.2, 4],
  params: {
    glow: { type: "choice", options: ["rainbow", "brand", "duo"], default: "rainbow" },
    entry_angle: { type: "number", range: [10, 45], default: 35, unit: "deg" },
    entry: { type: "number", range: [0.4, 1], default: 0.6, unit: "s" },
    chars_per_s: { type: "number", range: [15, 35], default: 25 },
    hue_speed: { type: "number", range: [0, 80], default: 40, unit: "deg/s" },
    prompt: { type: "text", default: "" },
    send: { type: "bool", default: true },
  },
  pairs: ["ui.chat-prompt-typing", "ui.input-type-submit"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:ultimaxbt-2ddf1e", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { p, at, end, rtl, f } = ctx;
    const doc = document;
    const mk = (tag, css, html, parent) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (html != null) e.innerHTML = html; if (parent) parent.append(e); return e; };
    const own = ctx.el ? ctx.el.textContent.trim() : "";
    const text = p.prompt || own || (rtl ? "اعملّي فيديو لإطلاق المنتج" : "Make a launch video for my product");
    let host = ctx.el;
    if (host) host.replaceChildren();
    else host = mk("div", "position:absolute;left:var(--pic-x);top:var(--pic-y);width:var(--pic-w);height:var(--pic-h);z-index:4;background:var(--x-ground)", null, ctx.scene || ctx.stage);
    const hostW = host.clientWidth || f.pic.w;
    const fs = ML.clamp(Math.min(f.W, f.H) * 0.034, 20, 44);
    const stageBox = mk("div", `position:${ctx.el ? "relative" : "absolute"};inset:0;width:100%;${ctx.el ? `height:${fs * 4}px;` : "height:100%;"}display:flex;align-items:center;justify-content:center;perspective:${(fs * 34).toFixed(0)}px;font-size:${fs}px`, null, host);
    const pill = mk("div", `position:relative;width:${Math.min(hostW * 0.94, f.W * 0.82).toFixed(0)}px;transform-style:flat`, null, stageBox);
    const stops = p.glow === "brand" ? "var(--x-accent), var(--x-accent-2), var(--x-accent)"
      : p.glow === "duo" ? "var(--x-accent), var(--x-good), var(--x-accent)"
      : "var(--x-accent), var(--x-bad), var(--x-light-2), var(--x-good), var(--x-accent-2), var(--x-accent)";
    const glow = mk("div", `position:absolute;inset:-0.35em;border-radius:calc(var(--x-radius-s));filter:blur(${(fs * 0.9).toFixed(1)}px);opacity:var(--x-glow-o);pointer-events:none`, null, pill);
    const rim = mk("div", `position:absolute;inset:-0.06em;border-radius:var(--x-radius-s);pointer-events:none`, null, pill);
    const body = mk("div", `position:relative;display:flex;align-items:center;gap:0.6em;padding:0.85em 0.9em 0.85em 1.1em;background:var(--x-panel);border-radius:var(--x-radius-s);color:var(--x-ink);box-shadow:var(--x-shadow);font-family:var(--x-body-font)`, null, pill);
    if (rtl) body.style.padding = "0.85em 1.1em 0.85em 0.9em";
    mk("span", "flex:none;display:flex;color:var(--x-accent)", `<svg viewBox="0 0 24 24" style="width:1.1em;height:1.1em" fill="currentColor"><path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z"/></svg>`, body);
    const line = mk("span", "flex:1;min-width:0;white-space:nowrap;overflow:hidden;display:flex;align-items:center", null, body);
    const typedEl = mk("span", "flex:none;white-space:pre", "", line);
    const caret = mk("span", "position:relative;flex:none;display:inline-block;width:0.5em;height:1.15em;margin-inline-start:0.08em;border-radius:0.12em;background:var(--x-accent)", null, line);
    const tail = mk("span", `position:absolute;top:0;bottom:0;width:2.2em;${rtl ? "left:100%" : "right:100%"};background:linear-gradient(${rtl ? "to left" : "to right"}, transparent, color-mix(in srgb, var(--x-accent) 45%, transparent));border-radius:0.12em`, null, caret);
    const sendBtn = p.send ? mk("span", "flex:none;display:flex;align-items:center;justify-content:center;width:1.9em;height:1.9em;border-radius:50%;background:var(--x-ink);color:var(--x-panel)", `<svg viewBox="0 0 24 24" style="width:1em;height:1em${rtl ? ";transform:scaleX(-1)" : ""}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`, body) : null;
    const D = p.entry, A = p.entry_angle, s = rtl ? -1 : 1;
    // the prompt always finishes inside the move: a short run types faster rather than being cut off
    const t1 = at + D * 0.85, t2 = t1 + Math.min(Array.from(text).length / p.chars_per_s, Math.max(0.3, end - 0.7 - t1));
    ctx.sfx(at, "whoosh.soft", 0.45);
    ctx.sfx(t1 + 0.05, "key", 0.25);
    if (p.send && t2 + 0.35 < end - 0.3) ctx.sfx(t2 + 0.35, "key.return", 0.35);
    return {
      draw(t) {
        const u = ML.expo(t, at, at + D), r = 1 - u;
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        pill.style.visibility = t < at ? "hidden" : "visible";
        pill.style.opacity = (ML.clamp((t - at) / 0.15) * (1 - leave)).toFixed(4);
        pill.style.transform = r < 1e-4 ? "none"
          : `translateX(${(-30 * s * r).toFixed(2)}%) translateZ(${(-400 * r).toFixed(1)}px) rotateX(${(A * r).toFixed(2)}deg) rotateY(${(-s * A * (25 / 35) * r).toFixed(2)}deg) rotateZ(${(-s * A * (12 / 35) * r).toFixed(2)}deg)`;
        pill.style.filter = r > 0.02 ? `blur(${(6 * r).toFixed(2)}px)` : "none";
        const ang = ((t - at) * p.hue_speed) % 360;
        const g = `conic-gradient(from ${ang.toFixed(1)}deg, ${stops})`;
        glow.style.background = g;
        rim.style.background = g;
        typedEl.textContent = ML.typed(text, t, t1, t2);
        // a prompt longer than the bar: the line follows the caret instead of losing it past the edge
        line.style.justifyContent = typedEl.offsetWidth + caret.offsetWidth > line.clientWidth ? "flex-end" : "flex-start";
        const typing = t >= t1 && t < t2;
        tail.style.opacity = typing ? "1" : "0";
        caret.style.opacity = t < t1 || typing ? "1" : String(ML.blink(t - t2, 0.9));
        if (sendBtn) {
          const press = ML.pulse(t, t2 + 0.35, 0.06, 0.18);
          const lit = (ML.clamp((t - t2 - 0.3) / 0.12) * 100).toFixed(1);
          sendBtn.style.background = `color-mix(in srgb, var(--x-accent) ${lit}%, var(--x-ink))`;
          sendBtn.style.color = `color-mix(in srgb, var(--x-accent-ink) ${lit}%, var(--x-panel))`;
          sendBtn.style.scale = (1 - press * 0.1).toFixed(4);
        }
      },
    };
  },
});

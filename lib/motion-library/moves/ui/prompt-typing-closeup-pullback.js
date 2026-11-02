// Typing in an extreme close-up, then pull back to the input bar. Stage A: the camera sits at `zoom`× on an input pill
// (its text 3.5 % of the frame's width at 1×), a block caret (the accent; solid while typing, blinking on a 0.5 s period
// when idle) types the prompt at ~18 chars/s — each character on its own fixed time — and the view slides along the line
// to keep the caret in frame (the caret's position is measured per character in setup, the view eases between them).
// Stage B: the camera pulls back zoom → 1 over 0.7 s expo.inOut (in log space, so the pull feels even) to reveal the
// whole pill — panel, full radius, shadow — with its round send button; the button is pressed (0.9 dip) and flashes the
// accent, and an accent dot pops above it. Arabic types right to left; the send button sits on its left.
// Source: prompt-motion lexnlin f9b3bd8 (reference only — our own rebuild).
ML.define({
  id: "ui.prompt-typing-closeup-pullback",
  category: "ui",
  name: "Typing in an extreme close-up, then pull back to the input bar",
  does: "A prompt is typed in huge letters filling the screen with a block cursor, then the camera pulls back to show it is a small input pill with a send button, which gets pressed.",
  says: ["tech", "step", "story"],
  energy: 3,
  targets: ["screen", "line", "cursor"],
  duration: [2, 4],
  params: {
    zoom: { type: "number", range: [2, 6], default: 4 },
    cursor: { type: "choice", options: ["block", "bar"], default: "block" },
    speed: { type: "number", range: [10, 30], default: 18, unit: "chars/s" },
    prompt: { type: "text" },
  },
  pairs: ["ui.request-bubble-send", "ui.processing-overlay"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "prompt-motion:lexnlin-f9b3bd8", license: "reference", note: "our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    // a screen slot hosts the camera; a line (or nothing) gets the camera over the whole scene, typing the line's words
    const own = !ctx.el || ctx.el === ctx.stage || ctx.el.offsetHeight < 240;
    const lineText = ctx.el && ctx.el !== ctx.stage && own ? ctx.el.textContent.trim() : "";
    const host = own ? ctx.scene || ctx.stage : ctx.el;
    if (!own && getComputedStyle(host).position === "static") host.style.position = "relative";
    const W = own ? f.W : host.clientWidth, H = own ? f.H : host.clientHeight;
    const prompt = p.prompt || lineText || (rtl ? "اعمل فيديو إطلاق لتطبيقي" : "Make a launch video for my app");

    // a camera layer over the scene (it hides what's behind while it's on), the world inside it
    const layer = mk("div", `position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:hidden;z-index:12;background:var(--x-ground);pointer-events:none;`, host);
    const world = mk("div", `position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0;`, layer);
    const fs0 = 0.035 * f.W * (own ? 1 : W / f.W);
    const pw = Math.min(W * 0.86, fs0 * 22), ph = fs0 * 2.6;
    const pill = mk("div", `position:absolute;left:${((W - pw) / 2).toFixed(1)}px;top:${((H - ph) / 2).toFixed(1)}px;width:${pw.toFixed(1)}px;height:${ph.toFixed(1)}px;box-sizing:border-box;padding:0 ${(ph * 0.16).toFixed(1)}px 0 ${(ph * 0.45).toFixed(1)}px;display:flex;align-items:center;gap:${(ph * 0.25).toFixed(1)}px;border-radius:var(--x-radius-s);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);direction:${rtl ? "rtl" : "ltr"};`, world);
    if (rtl) pill.style.padding = `0 ${(ph * 0.45).toFixed(1)}px 0 ${(ph * 0.16).toFixed(1)}px`;
    const field = mk("div", `position:relative;flex:1;min-width:0;height:100%;display:flex;align-items:center;overflow:hidden;font:500 ${fs0.toFixed(1)}px/1 var(--x-body-font);color:var(--x-ink);white-space:pre;`, pill);
    const line = mk("div", "display:flex;align-items:center;", field);
    const txt = mk("span", "", line);
    const caret = mk("span", `display:inline-block;flex:none;width:${p.cursor === "bar" ? Math.max(2, fs0 * 0.08).toFixed(1) : (fs0 * 0.55).toFixed(1)}px;height:${(fs0 * 1.15).toFixed(1)}px;margin-inline-start:${(fs0 * 0.06).toFixed(1)}px;background:var(--x-accent);border-radius:${(fs0 * 0.06).toFixed(1)}px;`, line);
    const bd = ph * 0.7;
    const send = mk("div", `position:relative;flex:none;width:${bd.toFixed(1)}px;height:${bd.toFixed(1)}px;border-radius:50%;background:var(--x-ink);color:var(--x-ground);display:grid;place-items:center;`, pill);
    send.innerHTML = `<svg viewBox="0 0 24 24" width="${(bd * 0.5).toFixed(1)}" height="${(bd * 0.5).toFixed(1)}" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/></svg>`;
    const dot = mk("div", `position:absolute;left:50%;top:${(-bd * 0.55).toFixed(1)}px;width:${(bd * 0.22).toFixed(1)}px;height:${(bd * 0.22).toFixed(1)}px;margin-left:${(-bd * 0.11).toFixed(1)}px;border-radius:50%;background:var(--x-accent);opacity:0;`, send);

    // shrink the type until the whole prompt fits the field at 1×
    const chars = Array.from(prompt);
    txt.textContent = prompt;
    const room = field.clientWidth - caret.offsetWidth - fs0 * 0.2;
    if (line.offsetWidth > room) { const fs = (fs0 * room) / line.offsetWidth; field.style.fontSize = fs.toFixed(1) + "px"; }
    // the caret's centre (in world px) after each typed character — so the view can follow it
    const xs = [];
    const wb = ML.box(world, world);
    for (let n = 0; n <= chars.length; n++) { txt.textContent = chars.slice(0, n).join(""); const b = ML.box(caret, world); xs.push(b.x - wb.x + b.w / 2); }
    txt.textContent = "";
    const cy = (H - ph) / 2 + ph / 2;

    // timing: type from at + 0.2, pull back when done (squeezed so the press lands before the end)
    const Z = p.zoom, t0 = at + 0.2;
    const room2 = Math.max(0.6, end - 1.35 - t0);
    const dType = Math.min(chars.length / p.speed, room2), per = dType / Math.max(1, chars.length);
    const t1 = t0 + dType, tP = t1 + 0.15, tPress = tP + 0.85;
    for (let i = 0; i < chars.length; i += 3) ctx.sfx(t0 + i * per, "key", 0.25);
    ctx.sfx(tP, "whoosh.soft", 0.25);
    ctx.sfx(tPress - 0.011, "key.return", 0.5);
    const lead = (rtl ? 1 : -1) * W * 0.12;
    const expoInOut = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        layer.style.opacity = (t < at ? 0 : ML.lin(t, at, at + 0.15) * (1 - leave)).toFixed(4);
        // typed characters on fixed times; the view follows a smooth caret position
        const nf = ML.clamp((t - t0) / per, 0, chars.length), n = Math.floor(nf);
        txt.textContent = chars.slice(0, n).join("");
        const fr = nf - n, cx = n >= chars.length ? xs[n] : xs[n] + (xs[n + 1] - xs[n]) * ML.ease(fr, 0, 1);
        const typing = t >= t0 - 0.05 && t < t1 + 0.05;
        caret.style.opacity = typing ? "1" : String(ML.blink(Math.max(0, t - (t < t0 ? at : t1)), 0.5) ? 1 : 0.15);
        // camera: close on the caret, then pull back to the whole pill
        const e = expoInOut(ML.lin(t, tP, tP + 0.7));
        const z = Math.exp(Math.log(Z) * (1 - e));
        const fx = cx + lead / Z, x = fx + (W / 2 - fx) * e, y = cy + (H / 2 - cy) * e;
        world.style.transform = `translate(${(W / 2).toFixed(2)}px, ${(H / 2).toFixed(2)}px) scale(${z.toFixed(5)}) translate(${(-x).toFixed(2)}px, ${(-y).toFixed(2)}px)`;
        // the press: a 0.9 dip, an accent flash, a dot above
        let s = 1;
        if (t >= tPress && t < tPress + 0.08) s = 1 - 0.1 * ML.out(t, tPress, tPress + 0.08);
        else if (t >= tPress + 0.08) s = 0.9 + 0.1 * ML.back(t, tPress + 0.08, tPress + 0.4);
        send.style.scale = s === 1 ? "none" : s.toFixed(4);
        const fl = t >= tPress ? ML.lin(t, tPress, tPress + 0.12) : 0;
        send.style.background = fl > 0 ? `color-mix(in srgb, var(--x-accent) ${(fl * 100).toFixed(1)}%, var(--x-ink))` : "var(--x-ink)";
        send.style.color = fl > 0.5 ? "var(--x-accent-ink)" : "var(--x-ground)";
        const d = ML.back(t, tPress + 0.05, tPress + 0.35, 2.5);
        dot.style.opacity = (t < tPress + 0.05 ? 0 : ML.clamp(d * 2)).toFixed(4);
        dot.style.scale = (t < tPress + 0.05 ? 0 : d).toFixed(4);
      },
    };
  },
});

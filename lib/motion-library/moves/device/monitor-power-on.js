// Monitor power-on: a dark screen turns on.
//   crt-bar   — for a frame or two a bright horizontal bar (20 % of the screen's height) opens from a hairline (scaleY
//               0.05 → 1 in 0.1 s), then blooms to the whole screen and the fill switches to the content (a deep
//               gradient of the look with an inner glow) as the flash dies away; a caret and a prompt line blink on.
//   fade      — black → content over 0.4 s with a brief brightness overshoot.
//   boot-logo — a centred logo fades in over 0.3 s, holds, then cross-fades to the content.
// Light spills on what's near: a soft glow of the screen's colour around the monitor, up to +spill brightness.
// Works over the target's box (the target's own content is what shows when the screen comes on) or on a monitor built
// in the picture region from the look.
// Source: rebuilt as our own code from a prompt-motion reference (jake11moran "session story created a skill") —
// reference only, nothing copied.
ML.define({
  id: "device.monitor-power-on",
  category: "device",
  name: "A monitor flickers on",
  does: "The black screen flashes a white bar, then glows with its content as it turns on.",
  says: ["arrival", "tech", "story"],
  energy: 3,
  targets: ["screen"],
  duration: [0.5, 2],
  params: {
    style: { type: "choice", options: ["crt-bar", "fade", "boot-logo"], default: "crt-bar" },
    spill: { type: "number", range: [0, 0.2], default: 0.1 },
  },
  pairs: ["device.window-enter", "ui.code-editor-type", "camera.push-in"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:jake11moran-session-story-created-a-skill", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { p, at, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const px = (v) => v.toFixed(2) + "px";
    const T = (en, ar) => (rtl ? ar : en);
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    const spill = ML.clamp(p.spill, 0, 0.2);

    // ── the screen: over the target, or a monitor we build ──
    let scr, box, content = null, lines = [], caret = null;
    if (el) {
      box = ctx.box(el);
      scr = mk("div", `position:absolute;left:${px(box.x)};top:${px(box.y)};width:${px(box.w)};height:${px(box.h)};border-radius:${getComputedStyle(el).borderRadius};overflow:hidden;z-index:6;pointer-events:none;`, host);
    } else {
      const R = f.pic;
      const Dw = Math.min(R.w * 0.92, (R.h * 0.86) / 0.78), Dh = Dw * 0.78, b = Dw * 0.025;
      const mon = mk("div", `position:absolute;left:${px(R.x + (R.w - Dw) / 2)};top:${px(R.y + (R.h - Dh) / 2)};width:${px(Dw)};height:${px(Dh)};z-index:6;pointer-events:none;`, host);
      const sH = Dw * 0.5625;
      mk("div", `position:absolute;left:${px(Dw * 0.45)};top:${px(sH + b * 2 - 2)};width:${px(Dw * 0.1)};height:${px(Dh - sH - b * 2 - Dw * 0.02)};background:linear-gradient(90deg, color-mix(in srgb, var(--x-device) 70%, var(--x-panel)), color-mix(in srgb, var(--x-device) 88%, var(--x-panel)));`, mon);
      mk("div", `position:absolute;left:${px(Dw * 0.32)};top:${px(Dh - Dw * 0.025)};width:${px(Dw * 0.36)};height:${px(Dw * 0.025)};border-radius:${px(Dw * 0.01)};background:color-mix(in srgb, var(--x-device) 78%, var(--x-panel));`, mon);
      const frame = mk("div", `position:absolute;left:0;top:0;width:${px(Dw)};height:${px(sH + b * 2)};box-sizing:border-box;padding:${px(b)};border-radius:${px(Dw * 0.03)};background:var(--x-device);box-shadow:var(--x-shadow);`, mon);
      box = { x: R.x + (R.w - Dw) / 2 + b, y: R.y + (R.h - Dh) / 2 + b, w: Dw - 2 * b, h: sH };
      scr = mk("div", `position:relative;width:100%;height:100%;border-radius:${px(Dw * 0.008)};overflow:hidden;`, frame);
      // the content: a deep gradient of the look with an inner glow, a prompt and a blinking caret
      content = mk("div", `position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 40%, color-mix(in srgb, var(--x-accent) 55%, var(--x-device)), color-mix(in srgb, var(--x-accent) 18%, var(--x-device)));box-shadow:inset 0 0 ${px(box.w * 0.08)} color-mix(in srgb, var(--x-accent-2) 45%, transparent);color:var(--x-accent-ink);font:500 ${px(box.w * 0.032)}/1.6 var(--x-mono-font);padding:${px(box.w * 0.06)};box-sizing:border-box;`, scr);
      content.dir = rtl ? "rtl" : "ltr";
      const say = rtl ? ["مرحبًا بك من جديد", "جاري تجهيز مساحة العمل…", "جاهز"] : ["Welcome back", "Loading your workspace…", "Ready"];
      say.forEach((s, i) => lines.push(mk("div", `opacity:0;${i === 0 ? `font:var(--x-head-weight) ${px(box.w * 0.06)}/1.3 var(--x-head-font);margin-bottom:0.3em;` : `color:color-mix(in srgb, var(--x-accent-ink) ${i === 2 ? 100 : 70}%, transparent);`}`, content, (i ? "> " : "") + s)));
      const row = mk("div", "", content, "> ");
      caret = mk("span", `display:inline-block;width:0.55em;height:1.1em;vertical-align:-0.2em;background:var(--x-accent-ink);`, row);
      lines.push(row);
    }
    // light spill on what's near
    const glow = mk("div", `position:absolute;left:${px(box.x - box.w * 0.35)};top:${px(box.y - box.h * 0.45)};width:${px(box.w * 1.7)};height:${px(box.h * 1.9)};background:radial-gradient(closest-side, color-mix(in srgb, var(--x-accent-2) 70%, var(--x-panel)), transparent);opacity:0;z-index:5;pointer-events:none;mix-blend-mode:screen;`, host);
    // the black glass over it all, the bright bar, the boot logo
    const black = mk("div", `position:absolute;inset:0;background:var(--x-device);`, scr);
    const bar = mk("div", `position:absolute;left:0;right:0;top:40%;height:20%;background:var(--x-panel);box-shadow:0 0 ${px(box.h * 0.12)} color-mix(in srgb, var(--x-panel) 80%, transparent);opacity:0;`, scr);
    const flash = el ? mk("div", `position:absolute;inset:0;background:var(--x-panel);opacity:0;`, scr) : null; // the target's brightness overshoot
    let logo = null;
    if (p.style === "boot-logo") {
      logo = mk("div", `position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:var(--x-device);opacity:0;`, scr);
      const S = Math.min(box.w, box.h) * 0.22;
      const mark = mk("div", `width:${px(S)};height:${px(S)};border-radius:${px(S * 0.26)};background:linear-gradient(135deg, var(--x-accent-2), var(--x-accent));display:flex;align-items:center;justify-content:center;box-shadow:0 0 ${px(S * 0.5)} color-mix(in srgb, var(--x-accent) 50%, transparent);`, logo);
      mk("div", `width:40%;height:40%;border-radius:50%;border:${px(S * 0.08)} solid var(--x-accent-ink);`, mark);
    }

    // ── timing ──
    const on = p.style === "boot-logo" ? at + 1.0 : p.style === "fade" ? at + 0.4 : at + 0.2; // content fully up
    ctx.sfx(at, "blip", 0.45);
    if (content) ctx.sfx(on + 0.35, "key", 0.18);
    const textAt = on + 0.1;

    return {
      draw(t) {
        let blackO = 1, barO = 0, barSY = 0.05, bright = 1, logoO = 0, lit = 0;
        if (t >= at) {
          if (p.style === "crt-bar") {
            barSY = 0.05 + 0.95 * ML.out(t, at, at + 0.1); // the hairline opens to a bar
            const bloom = ML.ease(t, at + 0.1, at + 0.2);   // then fills the screen
            barO = (1 - ML.lin(t, at + 0.2, at + 0.42));
            bar.style.top = (40 - 40 * bloom).toFixed(3) + "%";
            bar.style.height = (20 + 80 * bloom).toFixed(3) + "%";
            blackO = t < at + 0.2 ? 1 : 0;
            bright = 1 + 0.5 * (1 - ML.out(t, at + 0.2, at + 0.6));
            lit = ML.lin(t, at + 0.15, at + 0.3);
          } else if (p.style === "fade") {
            blackO = 1 - ML.ease(t, at, at + 0.4);
            bright = 1 + 0.35 * ML.pulse(t, at + 0.38, 0.12, 0.25);
            lit = ML.ease(t, at, at + 0.4);
          } else {
            logoO = ML.ease(t, at, at + 0.3) * (1 - ML.ease(t, at + 0.75, at + 1.0));
            blackO = t < at + 0.75 ? 1 : 0;
            lit = 0.4 * ML.ease(t, at, at + 0.3) + 0.6 * ML.ease(t, at + 0.75, at + 1.0);
            bright = 1 + 0.2 * ML.pulse(t, at + 1.0, 0.1, 0.3);
          }
        }
        black.style.opacity = blackO.toFixed(4);
        bar.style.opacity = barO.toFixed(4);
        bar.style.transform = `scaleY(${barSY.toFixed(4)})`;
        if (logo) logo.style.opacity = logoO.toFixed(4);
        if (flash) flash.style.opacity = ((bright - 1) * 0.7).toFixed(4);
        else scr.style.filter = bright > 1.002 ? `brightness(${bright.toFixed(3)})` : "none";
        glow.style.opacity = (lit * spill * 3.2 * (bright > 1 ? Math.min(1.4, bright) : 1)).toFixed(4);
        lines.forEach((l, i) => { const a = textAt + i * 0.18, u = ML.expo(t, a, a + 0.3); l.style.opacity = u.toFixed(4); l.style.translate = `0 ${((1 - u) * 8 * k).toFixed(2)}px`; });
        if (caret) caret.style.opacity = t < textAt ? "0" : String(ML.blink(t - textAt, 0.9));
      },
    };
  },
});

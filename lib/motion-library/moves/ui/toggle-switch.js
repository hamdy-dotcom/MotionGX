// Toggle switch flips: a pill switch (small 86×46 / big 190×110 at a 1080 frame, knob 36 / 90) sits beside its label.
// A pointer glides in, arrives 0.3 s before the click, presses (scale 0.9 for ~0.12 s) and drifts off; on the click
// the knob travels track − knob − pad in `duration` on cubic-bezier(.5, 0, .2, 1.3) (a small overshoot), squashing to
// 1.15× its width mid-travel, while the track fills grey → accent in 0.2 s. Skeuo style: a deep inset track
// (inset 0 2px 4px black + a 1 px white lip), an accent knob with a dark drop, an inset top highlight and a soft accent
// glow, the track tint fading in. "off" runs the other way; in RTL "on" sits on the left.
// Sources: MengTo/Skills html-explainer-video demo film.js (the camera scene: the toggle and its pointer) + film.css
// .cm-switch (MIT); MengTo/Skills web-design/corner-lasers (MIT, the skeuomorphic switch); prompt-motion ultimaxbt-bbebf5
// (reference only).
ML.define({
  id: "ui.toggle-switch",
  category: "ui",
  name: "Toggle switch flips",
  does: "A pointer clicks a pill switch; its knob slides across and the track fills with the accent colour.",
  says: ["change", "choice", "simplicity", "precision", "tech"],
  energy: 2,
  targets: ["label", "card", "shape"],
  duration: [0.8, 2],
  params: {
    size: { type: "choice", options: ["small", "big"], default: "small" },
    style: { type: "choice", options: ["flat", "skeuo"], default: "flat" },
    direction: { type: "choice", options: ["on", "off"], default: "on" },
    duration: { type: "number", range: [0.15, 0.3], default: 0.25, unit: "s" },
    knob_squash: { type: "bool", default: true },
    cursor: { type: "bool", default: true },
    label: { type: "text" },
  },
  pairs: ["ui.cursor-glide-click", "ui.segmented-slide", "ui.icon-toggle-swap"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click",
  source: { from: "MengTo/Skills:media/html-explainer-video/demo/film.js", license: "MIT", note: "camera scene toggle + film.css .cm-switch; corner-lasers skeuo switch (MIT); prompt-motion ultimaxbt-bbebf5 as reference" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const isText = el && el.children.length === 0 && (el.textContent || "").trim().length > 0;

    const big = p.size === "big";
    const TW = (big ? 190 : 86) * k, TH = (big ? 110 : 46) * k, KN = (big ? 90 : 36) * k, PAD = (TH - KN) / 2;
    let row, track;
    if (isText) {
      // the label and its switch on one row (.cm-switch): the switch at the line's inline end
      const text = el.textContent.trim();
      el.textContent = "";
      el.style.display = "flex"; el.style.alignItems = "center"; el.style.gap = "0.8em"; el.style.position = el.style.position || "relative";
      mk("span", "flex:1;min-width:0;", el, p.label || text);
      row = el;
    } else {
      const host = el && el.clientWidth > TW * 1.5 && el.clientHeight > TH * 1.5 ? el : ctx.scene || ctx.stage;
      if (host === el && getComputedStyle(el).position === "static") el.style.position = "relative";
      const R = host === el ? { x: 0, y: 0, w: el.clientWidth, h: el.clientHeight } : f.pic;
      const lbl = p.label || (rtl ? "الوضع التلقائي" : "Auto mode");
      row = mk("div", `position:absolute;left:${R.x}px;top:${(R.y + R.h / 2 - TH / 2).toFixed(1)}px;width:${R.w}px;display:flex;align-items:center;justify-content:center;gap:${(TH * 0.5).toFixed(1)}px;font:500 ${(big ? 56 : 34) * k}px var(--x-body-font);color:var(--x-ink);z-index:6;`, host);
      row.dir = rtl ? "rtl" : "ltr";
      mk("span", "", row, lbl);
    }
    const skeuo = p.style === "skeuo";
    track = mk("div", `position:relative;flex:none;width:${TW.toFixed(1)}px;height:${TH.toFixed(1)}px;border-radius:var(--x-radius-s);box-sizing:border-box;direction:ltr;${skeuo
      ? `background:color-mix(in srgb, var(--x-ink) 92%, var(--x-ground));box-shadow:inset 0 ${(2 * k).toFixed(1)}px ${(4 * k).toFixed(1)}px color-mix(in srgb, var(--x-device) 90%, transparent), 0 1px 0 color-mix(in srgb, var(--x-accent-ink) 5%, transparent);`
      : `background:var(--x-line);box-shadow:inset 0 0 0 var(--x-edge) var(--x-edge-color);`}`, row);
    const tint = mk("div", `position:absolute;inset:0;border-radius:inherit;background:${skeuo ? "color-mix(in srgb, var(--x-accent) 28%, transparent)" : "var(--x-accent)"};opacity:0;`, track);
    const knob = mk("div", `position:absolute;top:${PAD.toFixed(1)}px;left:${PAD.toFixed(1)}px;width:${KN.toFixed(1)}px;height:${KN.toFixed(1)}px;border-radius:var(--x-radius-s);`, track);

    // the pointer (product-film / explainer pointer): in from the lower outside, rests a beat, presses, drifts off
    const tClick = p.cursor ? Math.max(at + 0.3, Math.min(at + 0.45, end - 0.4)) : at + 0.05;
    let ptr = null, P = 0;
    if (p.cursor) {
      P = (big ? 64 : 48) * k;
      ptr = mk("div", `position:absolute;left:0;top:0;width:${P.toFixed(1)}px;height:${P.toFixed(1)}px;z-index:9;pointer-events:none;transform-origin:15% 10%;`, track);
      ptr.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M4 2l16 9.5-7 1.6 4.2 7.4-3 1.7-4.2-7.4L5 20z" fill="var(--x-pointer)" stroke="var(--x-pointer-edge)" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
    }
    // knob travel: on → the inline end (right in LTR, left in RTL); off → back
    const onRight = !rtl;
    const turnOn = p.direction !== "off";
    const fromSide = turnOn ? !onRight : onRight; // true = knob on the right at the start
    const curve = ML.bezier(0.5, 0, 0.2, 1.3);
    const dur = ML.clamp(p.duration, 0.15, 0.3);
    ctx.sfx(tClick, "click", 0.45);
    const cx = TW * (fromSide ? 0.72 : 0.28), cy = TH * 0.55; // the press lands on the knob
    const sx = TW * (rtl ? -0.9 : 1.9), sy = TH * 2.6;

    return {
      draw(t) {
        const o = ML.ease(t, at - 0.15, at + 0.12) * (1 - ML.lin(t, end - 0.2, end));
        track.style.opacity = o.toFixed(4);
        const u = ML.lin(t, tClick, tClick + dur), e = curve(u);
        const w = KN * (p.knob_squash ? 1 + 0.15 * Math.sin(Math.PI * ML.clamp(u)) : 1);
        const pos = fromSide ? 1 - e : e; // 0 left … 1 right
        knob.style.width = w.toFixed(1) + "px";
        knob.style.left = (PAD + pos * (TW - PAD * 2 - w)).toFixed(2) + "px";
        // track colour: grey → accent on the click (0.2 s); off goes the other way
        const fillAmt = ML.lin(t, tClick, tClick + 0.2);
        const lit = turnOn ? fillAmt : 1 - fillAmt;
        tint.style.opacity = lit.toFixed(4);
        if (skeuo) {
          knob.style.background = `color-mix(in srgb, var(--x-accent) ${(40 + 60 * lit).toFixed(1)}%, var(--x-dim))`;
          knob.style.boxShadow = `0 1px ${(2 * k).toFixed(1)}px color-mix(in srgb, var(--x-device) 80%, transparent), inset 0 1px 1px color-mix(in srgb, var(--x-accent-ink) 40%, transparent), 0 0 ${(10 * k).toFixed(1)}px color-mix(in srgb, var(--x-accent) ${(40 * lit).toFixed(1)}%, transparent)`;
        } else {
          knob.style.background = `color-mix(in srgb, var(--x-accent-ink) ${(lit * 100).toFixed(1)}%, var(--x-ink))`;
          knob.style.boxShadow = `0 1px ${(3 * k).toFixed(1)}px color-mix(in srgb, var(--x-device) 20%, transparent)`;
        }
        if (ptr) {
          const arrive = tClick - 0.3, tin = Math.max(at - 0.1, arrive - 0.45);
          let x, y;
          if (t < arrive) { const g = ML.out(t, tin, arrive); x = sx + (cx - sx) * g; y = sy + (cy - sy) * g - Math.sin(Math.PI * g) * TH * 0.4; }
          else if (t < tClick + 0.2) { x = cx; y = cy; }
          else { const g = ML.ease(t, tClick + 0.2, tClick + 0.8); x = cx + (rtl ? -1 : 1) * TW * 0.35 * g; y = cy + TH * 0.9 * g; }
          const press = t < tClick - 0.04 ? 0 : t < tClick ? ML.lin(t, tClick - 0.04, tClick) : 1 - ML.lin(t, tClick + 0.06, tClick + 0.16);
          ptr.style.translate = `${(x - P * 0.17).toFixed(1)}px ${(y - P * 0.08).toFixed(1)}px`; // the tip on the point
          ptr.style.scale = (1 - 0.1 * press).toFixed(4);
          ptr.style.opacity = (ML.lin(t, tin, tin + 0.15) * (1 - ML.lin(t, tClick + 0.6, tClick + 0.9))).toFixed(4);
        }
      },
    };
  },
});

// Failure state stamp: a live service card fails — its tinted face tweens to grey (0.2 s), diagonal hatch stripes
// (repeating-linear-gradient at 45°) fade over it, its status chip flips to STOPPED, and a heavy ink sticker ("DOWN")
// slams onto it at an angle (−8°, mirrored in RTL), scaling 2 → 1 in 0.18 s, then shakes ±3 px for three frames. The
// connector feeding it fades to 0.3. Works on the given card (or label), or on a small service diagram it builds.
// Source: prompt-motion 0xnfrith-opus-5-5-animation-created (reference only — our own rebuild).
ML.define({
  id: "ui.failure-state-stamp",
  category: "ui",
  name: "Failure state stamp",
  does: "The card goes grey with diagonal hatch stripes and a heavy 'DOWN' sticker stamps onto it at an angle while its connection fades to faint.",
  says: ["problem", "urgency", "change"],
  energy: 4,
  targets: ["card", "label"],
  duration: [0.6, 1.5],
  params: {
    label: { type: "choice", options: ["DOWN", "ERROR", "OFFLINE", "STOPPED"], default: "DOWN" },
    shake: { type: "bool", default: true },
    tilt: { type: "number", range: [0, 15], default: 8, unit: "deg" },
    name: { type: "text" },
  },
  pairs: ["ui.connector-message-delivery", "ui.drag-move"],
  avoid: ["calm", "luxury", "celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "prompt-motion:0xnfrith-opus-5-5-animation-created", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080, px = (v) => (v * k).toFixed(1) + "px";
    const mk = (tag, css, parent, html) => { const e = doc.createElement(tag); e.style.cssText = css; if (html != null) e.innerHTML = html; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const AR = { DOWN: "واقف", ERROR: "خطأ", OFFLINE: "مفصول", STOPPED: "متوقف" };
    const word = rtl ? AR[p.label] || p.label : p.label;

    // the card: the given one, else a small diagram — a source node, a connector, the service card with a status chip
    let card, chip = null, chipTxt = null, chipDot = null, line = null, built = false, wrap = null;
    if (el && el !== ctx.stage) {
      card = el;
      if (getComputedStyle(card).position === "static") card.style.position = "relative";
    } else {
      built = true;
      const R = f.pic, wide = f.wide;
      wrap = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;display:flex;flex-direction:${wide ? "row" : "column"};align-items:center;justify-content:center;gap:0;z-index:8;will-change:transform;`, host); // own layer: its entrance never re-rasterises the scene under it
      const node = mk("div", `display:flex;align-items:center;gap:${px(14)};padding:${px(20)} ${px(30)};border-radius:var(--x-radius-s);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);font:600 ${px(30)} var(--x-body-font);color:var(--x-ink);white-space:nowrap;`, wrap,
        `<i style="width:${px(16)};height:${px(16)};border-radius:50%;background:var(--x-good)"></i><span>${rtl ? "البوابة" : "Gateway"}</span>`);
      void node;
      line = mk("div", wide ? `width:${px(150)};height:${px(4)};border-radius:${px(2)};background:var(--x-accent);flex:none;` : `width:${px(4)};height:${px(110)};border-radius:${px(2)};background:var(--x-accent);flex:none;`, wrap);
      card = mk("div", `position:relative;width:${px(wide ? 560 : 620)};padding:${px(36)};box-sizing:border-box;border-radius:var(--x-radius);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);display:flex;flex-direction:column;gap:${px(22)};color:var(--x-ink);`, wrap);
      const top = mk("div", `display:flex;align-items:center;gap:${px(18)};`, card,
        `<span style="display:grid;place-items:center;width:${px(64)};height:${px(64)};border-radius:${px(16)};background:var(--x-accent);color:var(--x-accent-ink)"><svg viewBox="0 0 24 24" width="${px(34)}" height="${px(34)}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><path d="M7 7h.01M7 17h.01"/></svg></span>`);
      mk("div", `font:700 ${px(40)} var(--x-head-font);`, top).textContent = p.name || (rtl ? "خدمة الدفع" : "Payments API");
      chip = mk("div", `align-self:flex-start;display:flex;align-items:center;gap:${px(10)};padding:${px(8)} ${px(18)};border-radius:var(--x-radius-s);font:600 ${px(22)} ${rtl ? "var(--x-body-font)" : "var(--x-label-font)"};letter-spacing:${rtl ? 0 : ".12em"};`, card);
      chipDot = mk("i", `width:${px(12)};height:${px(12)};border-radius:50%;`, chip);
      chipTxt = mk("span", "", chip);
      [0.9, 0.62].forEach((w) => mk("i", `display:block;width:${(w * 100).toFixed(0)}%;height:${px(14)};border-radius:${px(7)};background:currentColor;opacity:.12;`, card));
    }
    const radius = getComputedStyle(card).borderRadius;
    // the failure overlay (grey wash + hatch) and the sticker
    const S = Math.max(10 * k, Math.min(card.offsetWidth || 500 * k, 640 * k) / 22);
    const stripes = mk("div", `position:absolute;inset:0;border-radius:${radius};pointer-events:none;opacity:0;background:repeating-linear-gradient(45deg, color-mix(in srgb, var(--x-ink) 12%, transparent) 0 ${px(12)}, transparent ${px(12)} ${px(26)});`, card);
    const sticker = mk("div", `position:absolute;left:50%;top:50%;padding:${(S * 0.45).toFixed(1)}px ${(S * 1.2).toFixed(1)}px;border-radius:var(--x-radius-s);background:var(--x-ink);color:var(--x-ground);font:900 ${(S * 2).toFixed(1)}px/1 var(--x-head-font);letter-spacing:${rtl ? 0 : "0.04em"};white-space:nowrap;box-shadow:0 ${px(10)} ${px(30)} color-mix(in srgb, var(--x-ink) 35%, transparent);opacity:0;pointer-events:none;z-index:2;`, card);
    sticker.textContent = word;

    // timing: fail → stamp → land (+ shake)
    const tFail = Math.max(at + 0.1, Math.min(at + (built ? 0.8 : 0.35), end - 0.5)), tStamp = tFail + 0.1, tLand = tStamp + 0.18; // a built card is seen live first
    const ang = (rtl ? 1 : -1) * p.tilt;
    ctx.sfx(tFail, "blip", 0.2);
    ctx.sfx(tLand, "hit", 0.6);
    const live = "color-mix(in srgb, var(--x-accent) 12%, var(--x-panel))", dead = "color-mix(in srgb, var(--x-dim) 24%, var(--x-panel))";
    const statusOn = rtl ? "شغّال" : "RUNNING", statusOff = rtl ? "متوقف" : "STOPPED";

    return {
      draw(t) {
        if (built) ML.show(wrap, t, at, end - 0.05);
        const g = ML.ease(t, tFail, tFail + 0.2);
        if (built) {
          card.style.background = `color-mix(in srgb, ${dead} ${(g * 100).toFixed(1)}%, ${live})`;
          const off = t >= tFail;
          chipTxt.textContent = off ? statusOff : statusOn;
          chip.style.background = off ? "color-mix(in srgb, var(--x-bad) 14%, transparent)" : "color-mix(in srgb, var(--x-good) 14%, transparent)";
          chip.style.color = off ? "var(--x-bad)" : "var(--x-good)";
          chipDot.style.background = "currentColor";
          line.style.opacity = (1 - 0.7 * ML.ease(t, tFail, tFail + 0.3)).toFixed(4);
          line.style.background = `color-mix(in srgb, var(--x-dim) ${(g * 100).toFixed(1)}%, var(--x-accent))`;
        } else card.style.filter = g > 0 ? `grayscale(${g.toFixed(4)})` : "none";
        stripes.style.opacity = ML.ease(t, tFail + 0.05, tFail + 0.25).toFixed(4);
        // the sticker: 2 → 1 accelerating into the card, then three frames of shake
        const x = ML.lin(t, tStamp, tLand), sc = 2 - x * x;
        let dx = 0;
        if (p.shake && t >= tLand && t < tLand + 0.1) dx = [3, -3, 3][Math.min(2, Math.floor((t - tLand) * 30))] * k;
        sticker.style.opacity = t >= tStamp ? Math.min(1, x * 3).toFixed(4) : "0";
        sticker.style.transform = `translate(calc(-50% + ${dx.toFixed(2)}px), -50%) rotate(${ang.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
      },
    };
  },
});

// Phone frame: a phone mockup holds an app screen on the stage — MotionGX's own CSS phone (470 × 960, body the look's
// device ink, radius --x-device-radius (74), an 18 px bezel, screen radius 58, a 130 × 36 notch pill, the look's
// shadow), sized to the picture region (it fills ~1.16 of its native size in 9:16 and ~0.86 in 16:9 — built at that
// size, never scaled up). The "island" variant is the reference's: a dynamic island with a 9:41 status bar. It arrives
// the way the look moves, then holds — still, or floating slowly (a 1–2° sway and a few px of drift on a long sine).
// An optional playful oversized pointer (2×, the look's accent) hovers beside it. On a screen target the frame is
// built around the real UI at its own size (never upscaled) and the two move together; otherwise a sample app made
// of the look fills the screen. RTL mirrors left / right placement and the app's layout.
// Source: MotionGX's own lib/studio-engine/assets/scenes.js (S.phone, phoneIn, stage.css .phone); reference variant
// rebuilt from prompt-motion bthreeagency "you must be kidding" (reference only).
ML.define({
  id: "device.phone-frame",
  category: "device",
  name: "Phone mockup",
  does: "A phone mockup holds an app screen on the stage, still or slowly floating, optionally with an oversized cursor pointing at it.",
  says: ["tech", "proof"],
  energy: 2,
  targets: ["screen"],
  duration: [1, 20],
  params: {
    position: { type: "choice", options: ["center", "left", "right"], default: "center" },
    notch: { type: "choice", options: ["pill", "island"], default: "pill" },
    float: { type: "number", range: [0, 2], default: 1, unit: "deg" },
    cursor: { type: "bool", default: false },
  },
  pairs: ["device.phone-rise", "ui.cursor-glide-click", "ui.chat-bubble-land"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "own:lib/studio-engine/assets/scenes.js", license: "own", note: "S.phone / phoneIn + stage.css .phone; island variant from prompt-motion bthreeagency-you-must-be-kidding (reference)" },
  setup(ctx) {
    const { p, at, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const px = (v) => v.toFixed(2) + "px";
    const T = (en, ar) => (rtl ? ar : en);
    const el = ctx.el && ctx.el !== ctx.stage && ctx.el.tagName !== "IMG" ? ctx.el : null;
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    const side = p.position === "center" ? 0 : ((p.position === "right") !== rtl ? 1 : -1);

    // ── geometry: native 470 × 960 (18 bezel); u = px per native unit ──
    let u, sx, sy, sw, sh; // the screen's box in stage px
    if (el) {
      const b = ctx.box(el);
      u = b.w / 434; sx = b.x; sy = b.y; sw = b.w; sh = b.h;
    } else {
      const R = f.pic;
      u = Math.min((R.h * 0.96) / 960, (R.w * (side ? 0.5 : 0.9)) / 470, 1.16 * k);
      const W = 470 * u, cx = R.x + R.w / 2 + side * (R.w / 2 - W / 2 - R.w * 0.04);
      sx = cx - W / 2 + 18 * u; sy = R.y + (R.h - 960 * u) / 2 + 18 * u; sw = 434 * u; sh = 924 * u;
    }
    const B = 18 * u;
    const phone = mk("div", `position:absolute;left:${px(sx - B)};top:${px(sy - B)};width:${px(sw + 2 * B)};height:${px(sh + 2 * B)};z-index:6;pointer-events:none;`, host);
    const body = mk("div", `position:absolute;inset:0;box-sizing:border-box;border-radius:calc(var(--x-device-radius) * ${(u).toFixed(4)});${el ? `border:${px(B)} solid var(--x-device);` : "background:var(--x-device);"}box-shadow:var(--x-shadow);`, phone);
    let scr = null;
    if (!el) {
      scr = mk("div", `position:absolute;left:${px(B)};top:${px(B)};width:${px(sw)};height:${px(sh)};border-radius:calc((var(--x-device-radius) - 16px) * ${u.toFixed(4)});overflow:hidden;background:var(--x-panel);color:var(--x-ink);font-family:var(--x-body-font);`, phone);
      scr.dir = rtl ? "rtl" : "ltr";
      // a sample app of the look: header, a feature card, a list, a tab bar
      const head = mk("div", `position:absolute;top:${px(84 * u)};inset-inline:${px(26 * u)};display:flex;align-items:center;gap:${px(16 * u)};`, scr);
      mk("i", `flex:none;width:${px(60 * u)};height:${px(60 * u)};border-radius:${px(18 * u)};background:linear-gradient(135deg, var(--x-accent-2), var(--x-accent));`, head);
      const hn = mk("div", "display:flex;flex-direction:column;gap:0.2em;", head);
      mk("b", `font:var(--x-head-weight) ${px(28 * u)}/1.1 var(--x-head-font);`, hn, T("Good morning", "صباح الخير"));
      mk("span", `font-size:${px(19 * u)};color:var(--x-dim);`, hn, T("3 things for today", "٣ حاجات النهارده"));
      const hero = mk("div", `position:absolute;top:${px(180 * u)};inset-inline:${px(22 * u)};height:${px(250 * u)};border-radius:${px(30 * u)};background:linear-gradient(140deg, var(--x-accent), color-mix(in srgb, var(--x-accent-2) 70%, var(--x-panel)));overflow:hidden;color:var(--x-accent-ink);padding:${px(26 * u)};box-sizing:border-box;`, scr);
      mk("div", `font:var(--x-label-weight) ${px(16 * u)}/1 var(--x-label-font);opacity:.8;`, hero, T("THIS WEEK", "الأسبوع ده"));
      mk("div", `margin-top:${px(14 * u)};font:var(--x-head-weight) ${px(64 * u)}/1 var(--x-head-font);direction:ltr;text-align:start;`, hero, "+18%");
      mk("i", `position:absolute;width:${px(180 * u)};height:${px(180 * u)};border-radius:50%;inset-inline-end:${px(-40 * u)};bottom:${px(-60 * u)};background:color-mix(in srgb, var(--x-accent-ink) 22%, transparent);`, hero);
      for (let i = 0; i < 4; i++) {
        const r = mk("div", `position:absolute;top:${px((460 + i * 92) * u)};inset-inline:${px(22 * u)};height:${px(76 * u)};display:flex;align-items:center;gap:${px(16 * u)};padding:0 ${px(18 * u)};box-sizing:border-box;border-radius:${px(22 * u)};background:var(--x-panel-2);`, scr);
        mk("i", `flex:none;width:${px(40 * u)};height:${px(40 * u)};border-radius:50%;background:${["var(--x-accent)", "var(--x-good)", "var(--x-accent-2)", "var(--x-dim)"][i]};opacity:.85;`, r);
        const c = mk("div", `flex:1;display:flex;flex-direction:column;gap:${px(8 * u)};`, r);
        mk("i", `height:${px(10 * u)};width:${(50 + ML.rnd(i, 4) * 35).toFixed(0)}%;border-radius:99px;background:color-mix(in srgb, var(--x-ink) 28%, transparent);`, c);
        mk("i", `height:${px(8 * u)};width:${(30 + ML.rnd(i, 8) * 30).toFixed(0)}%;border-radius:99px;background:var(--x-line);`, c);
      }
      const tab = mk("div", `position:absolute;bottom:0;inset-inline:0;height:${px(96 * u)};display:flex;justify-content:space-around;align-items:center;border-top:var(--x-edge) solid var(--x-line);background:var(--x-panel);`, scr);
      for (let i = 0; i < 4; i++) mk("i", `width:${px(30 * u)};height:${px(30 * u)};border-radius:${px(9 * u)};background:${i === 0 ? "var(--x-accent)" : "var(--x-line)"};`, tab);
    }
    // the notch: the stage-engine pill, or the reference's island with a 9:41 status bar
    if (p.notch === "island") {
      mk("i", `position:absolute;left:50%;top:${px(B + 14 * u)};width:${px(126 * u)};height:${px(37 * u)};margin-left:${px(-63 * u)};border-radius:99px;background:var(--x-device);z-index:2;`, phone);
      const bar = mk("div", `position:absolute;left:${px(B)};top:${px(B)};width:${px(sw)};height:${px(64 * u)};display:flex;align-items:center;justify-content:space-between;padding:0 ${px(40 * u)};box-sizing:border-box;font:600 ${px(19 * u)}/1 var(--x-body-font);color:var(--x-ink);direction:ltr;z-index:1;`, phone);
      mk("span", "", bar, "9:41");
      const ic = mk("span", `display:flex;align-items:flex-end;gap:${px(3 * u)};height:${px(14 * u)};`, bar);
      for (let i = 0; i < 4; i++) mk("i", `width:${px(4 * u)};height:${40 + i * 20}%;border-radius:${px(1 * u)};background:currentColor;`, ic);
      const bat = mk("i", `margin-inline-start:${px(6 * u)};width:${px(26 * u)};height:${px(13 * u)};border:${px(1.5 * u)} solid currentColor;border-radius:${px(4 * u)};box-sizing:border-box;`, ic);
      bat.style.background = "linear-gradient(90deg, currentColor 70%, transparent 70%)";
      bat.style.backgroundClip = "content-box"; bat.style.padding = px(1.5 * u);
    } else {
      mk("i", `position:absolute;left:50%;top:${px(B + 12 * u)};width:${px(130 * u)};height:${px(36 * u)};margin-left:${px(-65 * u)};border-radius:${px(20 * u)};background:var(--x-device);z-index:2;`, phone);
    }
    // the playful oversized pointer, hovering beside the phone
    let cur = null;
    const cs = 44 * k * 2;
    if (p.cursor) {
      cur = mk("div", `position:absolute;width:${px(cs)};height:${px(cs)};z-index:7;pointer-events:none;`, host);
      const cxp = rtl ? sx - B - cs * 0.35 : sx + sw + B - cs * 0.55;
      cur.style.left = px(cxp); cur.style.top = px(sy + sh * 0.56);
      cur.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" style="overflow:visible;${rtl ? "transform:scaleX(-1);" : ""}filter:drop-shadow(0 ${(4 * k).toFixed(1)}px ${(8 * k).toFixed(1)}px color-mix(in srgb, var(--x-ink) 30%, transparent))"><path d="M5 2 L5 19 L9.5 15.5 L12.5 22 L15.5 20.5 L12.5 14 L18.5 14 Z" fill="var(--x-accent)" stroke="var(--x-pointer-edge)" stroke-width="1.3" stroke-linejoin="round"/></svg>`;
    }
    const moving = el ? [phone, el] : [phone];
    for (const m of moving) m.style.transformOrigin = `${px(sx + sw / 2 - (m === el ? sx : sx - B))} ${px(sy + sh / 2 - (m === el ? sy : sy - B))}`;
    const fl = ML.clamp(p.float, 0, 2);
    ctx.sfx(at, "whoosh.soft", 0.25);

    return {
      draw(t) {
        // arrives the way the look moves, then holds — still or floating on a long sine (a function of t)
        ML.show(phone, t, at);
        if (el) for (const k2 of ["opacity", "visibility", "scale", "filter"]) el.style[k2] = phone.style[k2];
        const ph = Math.max(0, t - at);
        const rot = fl * Math.sin(ph * 0.9 + 0.4) * (rtl ? -1 : 1);
        const dy = fl * 4 * k * Math.sin(ph * 1.25);
        const base = phone.style.translate && phone.style.translate !== "none" ? phone.style.translate : "0px 0px";
        for (const m of moving) { m.style.rotate = `${rot.toFixed(3)}deg`; m.style.transform = `translateY(${dy.toFixed(2)}px)`; }
        if (el) el.style.translate = base;
        if (cur) {
          const c = ML.out(t, at + 0.45, at + 0.85);
          cur.style.opacity = c.toFixed(4);
          cur.style.translate = `${(Math.sin(ph * 1.6) * 6 * k).toFixed(2)}px ${((1 - c) * 30 * k + Math.cos(ph * 1.3) * 8 * k).toFixed(2)}px`;
          cur.style.rotate = `${(Math.sin(ph * 1.1) * 4).toFixed(3)}deg`;
        }
      },
    };
  },
});

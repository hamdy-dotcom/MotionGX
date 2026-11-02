// Background blur, modal card: the phone screen behind softens (filter blur 0 → 8 px, brightness 0.95, 0.4 s) while a
// result card a little wider than the phone (+20 px a side, radius 16, the look's shadow) drops in from 40 px above on
// power3.out in 0.4 s, hanging past the phone's edges; 0.6 s later a pale-green "Done" pill pops at its corner on
// back.out(2) in 0.25 s. Over a screen the director gives it blurs that screen; alone it rebuilds a small day-planner
// phone in the picture region. In Arabic the badge sits at the card's left corner and the rows read right to left.
// Source: prompt-motion francoxavier33 "this was 100% opus" (reference only — our own rebuild).
ML.define({
  id: "ui.background-blur-modal-card",
  category: "ui",
  name: "UI behind blurs as a result card drops in",
  does: "The phone screen blurs and dims, and a white 'Create todo' card slides down over it; a green 'Done' badge pops at its corner.",
  says: ["result", "simplicity", "relief"],
  energy: 2,
  targets: ["card", "screen"],
  duration: [1, 2.5],
  params: {
    blur: { type: "number", range: [4, 14], default: 8, unit: "px" },
    badge_text: { type: "text", default: "Done" },
    badge: { type: "bool", default: true },
    title: { type: "text", default: "Create todo" },
    detail: { type: "text", default: "Pack Theo's gear bag" },
  },
  pairs: [],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "land.light",
  source: { from: "prompt-motion:francoxavier33-this-was-100-opus", license: "reference", note: "our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const px = (v) => (v * k).toFixed(1) + "px";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const say = (key, en, ar) => (rtl && p[key] === en ? ar : p[key] || (rtl ? ar : en));
    const host = ctx.scene || ctx.stage;
    const own = !ctx.el || ctx.el === ctx.stage;
    const layer = mk("div", "position:absolute;inset:0;pointer-events:none;z-index:6;", host);

    // the screen that blurs: the director's, or a rebuilt phone
    let screen, R;
    if (own) {
      const ph = Math.min(f.pic.h * 0.96, f.pic.w * 1.9), pw = ph * 0.49;
      R = { x: f.pic.x + (f.pic.w - pw) / 2, y: f.pic.y + (f.pic.h - ph) / 2, w: pw, h: ph };
      const s = pw / 460; // the phone's own unit
      const q = (v) => (v * s).toFixed(1) + "px";
      const phone = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${pw}px;height:${ph}px;box-sizing:border-box;border-radius:calc(var(--x-device-radius) * ${(s * 0.8).toFixed(3)});background:var(--x-device);padding:${q(12)};box-shadow:var(--x-shadow);overflow:hidden;`, layer);
      screen = mk("div", `width:100%;height:100%;box-sizing:border-box;border-radius:calc(var(--x-device-radius) * ${(s * 0.68).toFixed(3)});background:var(--x-ground);overflow:hidden;padding:${q(30)} ${q(26)};display:flex;flex-direction:column;gap:${q(16)};color:var(--x-ink);font-family:var(--x-body-font);`, phone);
      const bar = mk("div", `display:flex;justify-content:space-between;font:600 ${q(17)} var(--x-body-font);direction:ltr;`, screen);
      mk("span", "", bar, "9:41"); mk("span", `color:var(--x-good)`, bar, "● ● ●");
      mk("div", `font:var(--x-head-weight) ${q(40)} var(--x-head-font);letter-spacing:var(--x-head-track);margin-top:${q(18)}`, screen, rtl ? "الجمعة" : "Friday");
      mk("div", `font-size:${q(16)};color:var(--x-dim);margin-top:${q(-10)}`, screen, rtl ? "٢٤ أبريل · ٣ مهام اليوم" : "April 24 · 3 things today");
      const list = mk("div", `background:var(--x-panel);border-radius:calc(var(--x-radius) * ${(s * 0.6).toFixed(3)});padding:${q(16)} ${q(18)};display:flex;flex-direction:column;gap:${q(16)};border:var(--x-edge) solid var(--x-edge-color)`, screen);
      const rows = rtl ? [["١٠:٠٠", "تطعيم بسكوت"], ["٢:٠٠", "حصة السباحة"], ["٥:٣٠", "تمرين نورا"]] : [["10:00", "Biscuit's shot"], ["2:00 PM", "Swim class"], ["5:30 PM", "Nora's soccer"]];
      for (const [tm, x] of rows) {
        const r = mk("div", `display:flex;align-items:center;gap:${q(12)};font-size:${q(17)}`, list);
        mk("span", `color:var(--x-dim);width:${q(70)};flex:none`, r, tm);
        mk("span", `width:${q(6)};height:${q(6)};border-radius:50%;background:var(--x-ink);flex:none`, r);
        mk("span", "font-weight:600", r, x);
      }
      const msg = mk("div", `background:var(--x-panel);border-radius:calc(var(--x-radius) * ${(s * 0.6).toFixed(3)});padding:${q(16)} ${q(18)};font-size:${q(16)};line-height:1.4;border:var(--x-edge) solid var(--x-edge-color)`, screen,
        rtl ? "اختبار الحزام والكورة يوم السبت. أطلب من سام؟" : "Soccer and belt testing both land Saturday. Ask Sam to take one?");
      const btns = mk("div", `display:flex;gap:${q(10)};margin-top:${q(12)}`, msg);
      mk("span", `background:var(--x-accent);color:var(--x-accent-ink);border-radius:var(--x-radius-s);padding:${q(5)} ${q(14)};font-weight:600`, btns, rtl ? "اطلب" : "Ask her");
      mk("span", `color:var(--x-dim);padding:${q(5)} ${q(8)}`, btns, rtl ? "مش دلوقتي" : "Not now");
      for (let i = 0; i < 3; i++) mk("div", `height:${q(54)};flex:none;background:var(--x-panel);border-radius:calc(var(--x-radius) * ${(s * 0.5).toFixed(3)});opacity:${0.8 - i * 0.15}`, screen);
    } else {
      screen = ctx.el;
      R = ctx.box(ctx.el);
    }

    // the card: 20 px wider than the screen on each side, hanging over its edges
    const s = R.w / 460;
    const q = (v) => (v * s).toFixed(1) + "px";
    const cw = R.w + 40 * s;
    const cy = R.y + R.h * 0.2;
    const card = mk("div", `position:absolute;left:${R.x - 20 * s}px;top:${cy}px;width:${cw}px;box-sizing:border-box;background:var(--x-panel);border-radius:${q(16)};box-shadow:var(--x-shadow);border:var(--x-edge) solid var(--x-edge-color);padding:${q(20)} ${q(22)};display:flex;flex-direction:column;gap:${q(10)};color:var(--x-ink);font-family:var(--x-body-font);visibility:hidden;`, layer);
    const top = mk("div", `display:flex;align-items:center;gap:${q(12)}`, card);
    mk("span", `width:${q(34)};height:${q(34)};border-radius:${q(9)};background:color-mix(in srgb, var(--x-accent) 16%, var(--x-panel));color:var(--x-accent);display:grid;place-items:center;font:700 ${q(14)} var(--x-body-font);flex:none`, top, rtl ? "م" : "Hh");
    const tt = mk("div", "display:flex;flex-direction:column", top);
    mk("span", `font-size:${q(13)};color:var(--x-dim)`, tt, rtl ? "مساعد البيت" : "Household aid");
    mk("span", `font:700 ${q(20)} var(--x-body-font)`, tt, say("title", "Create todo", "مهمة جديدة"));
    const field = (a, b) => { const r = mk("div", `display:flex;gap:${q(14)};font-size:${q(16)};border-top:var(--x-edge) solid var(--x-line);padding-top:${q(10)}`, card); mk("span", `color:var(--x-dim);width:${q(54)};flex:none`, r, a); mk("span", "font-weight:600", r, b); };
    field(rtl ? "العنوان" : "Title", say("detail", "Pack Theo's gear bag", "جهّز شنطة تيو"));
    field(rtl ? "الموعد" : "Due", rtl ? "الجمعة ٢٤ أبريل · ٧ م" : "Fri, Apr 24 at 7:00 PM");
    const badge = mk("span", `position:absolute;top:${q(18)};${rtl ? "left" : "right"}:${q(18)};padding:${q(6)} ${q(16)};border-radius:var(--x-radius-s);background:color-mix(in srgb, var(--x-good) 16%, var(--x-panel));color:var(--x-good);font:700 ${q(18)} var(--x-body-font);transform-origin:center;visibility:hidden;`, card, say("badge_text", "Done", "تمّ"));

    const tCard = at + 0.15, tBadge = tCard + 0.6;
    ctx.sfx(tCard, "land.light", 0.4);
    if (p.badge) ctx.sfx(tBadge, "pop.soft", 0.3);
    const base = own ? "" : screen.style.filter;
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        const b = ML.out(t, at, at + 0.4) * (1 - leave);
        screen.style.filter = b > 0.002 ? `${base} blur(${(b * p.blur * k).toFixed(2)}px) brightness(${(1 - 0.05 * b).toFixed(4)})`.trim() : base || "none";
        const c = ML.out(t, tCard, tCard + 0.4);
        card.style.visibility = t >= tCard && leave < 1 ? "visible" : "hidden";
        card.style.opacity = (c * (1 - leave)).toFixed(4);
        card.style.translate = `0 ${((1 - c) * -40 * s - leave * 20 * s).toFixed(2)}px`;
        const g = p.badge ? ML.back(t, tBadge, tBadge + 0.25, 2) : 0;
        badge.style.visibility = p.badge && t >= tBadge ? "visible" : "hidden";
        badge.style.scale = Math.max(0, g).toFixed(4);
        if (own) layer.style.opacity = (1 - leave).toFixed(4);
      },
    };
  },
});

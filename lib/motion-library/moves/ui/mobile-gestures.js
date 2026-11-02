// Mobile gestures: tap, swipe, sheet — inside a phone frame drawn from the look (--x-device, --x-device-radius).
//   tap:   a touch dot lands on a toggle (it flips) and then on an outline button (it presses with the same 0.16 s
//          squash as a cursor click, with a ripple, and fills).
//   swipe: the touch drags across a card carousel; the content follows the finger, then springs to the next page on
//          the glide spring (150 / 20); the page dots follow. RTL swipes the other way.
//   sheet: a tap on a button, then a bottom sheet slides up on the glide spring over a dimmed backdrop, with a grab
//          handle and its rows blurring in.
// The touch dot (optional) is a soft disc that grows on contact and fades on release. Everything is drawn: no photos.
// `title`, `action` and `items` carry the film's own words; a target gives up its place to the phone.
// Source: Rieranthony/product-film-skill reference/ingredients.md (App surfaces: mobile; kit/spring glide) (MIT).
ML.define({
  id: "ui.mobile-gestures",
  category: "ui",
  name: "Mobile gestures: tap, swipe, sheet",
  does: "Inside a phone frame, a touch taps a control, swipes a list or card, or pulls up a sheet.",
  says: ["step", "flow"],
  energy: 2,
  targets: ["screen", "card"],
  duration: [1.2, 3], // the phone rises, the touch lands 0.45 s in, the state settles
  params: {
    gesture: { type: "choice", options: ["tap", "swipe", "sheet"], default: "tap" },
    touch_dot: { type: "bool", default: true },
    dim: { type: "bool", default: true },
    title: { type: "text" }, // the screen's heading
    action: { type: "text" }, // the button's words (tap, sheet)
    items: { type: "text" }, // "Title|sub; Title|sub; Title|sub": the rows tapped, the pages swiped, the sheet's options
  },
  pairs: ["device.phone-rise", "ui.magic-move"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "product-film-skill:reference/ingredients.md", license: "MIT", note: "App surfaces (mobile): tap press timing, swipe on a spring, sheet on the glide spring (150/20)" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const tb = el ? ctx.box(el) : null;
    const R = tb && tb.h >= (480 * Math.min(f.W, f.H)) / 1080 ? tb : f.pic;
    if (el) el.style.visibility = "hidden";
    const given = String(p.items || "").split(/[;\n]/).map((x) => x.trim()).filter(Boolean).map((x) => x.split("|").map((y) => y.trim()));
    const pickRow = (i, a, b) => (given[i] ? [given[i][0], given[i][1] || ""] : [a, b]);
    const actionText = (a, b) => String(p.action || "").trim() || (rtl ? a : b);
    // the phone: as tall as the region allows
    const PH = Math.min(R.h * 0.96, R.w * 0.96 * 2.05), PW = PH / 2.05, u = PW / 400; // u: one design px of a 400-wide phone
    const px = (v) => (v * u).toFixed(1) + "px";
    const host = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;z-index:6;pointer-events:none;`, ctx.scene || ctx.stage);
    const phone = mk("div", `position:absolute;left:${((R.w - PW) / 2).toFixed(1)}px;top:${((R.h - PH) / 2).toFixed(1)}px;width:${PW.toFixed(1)}px;height:${PH.toFixed(1)}px;box-sizing:border-box;padding:${px(12)};border-radius:calc(var(--x-device-radius) * ${(PW / 560).toFixed(3)});background:var(--x-device);box-shadow:var(--x-shadow);`, host);
    const scr = mk("div", `position:relative;width:100%;height:100%;overflow:hidden;border-radius:calc(var(--x-device-radius) * ${(PW / 560).toFixed(3)} - ${px(12)});background:var(--x-ground);color:var(--x-ink);font-family:var(--x-body-font);`, phone);
    scr.dir = rtl ? "rtl" : "ltr";
    mk("div", `position:absolute;left:50%;top:${px(12)};width:${px(110)};height:${px(30)};translate:-50% 0;border-radius:99px;background:var(--x-device);z-index:5;`, scr); // the island
    const SW = PW - 24 * u, SH = PH - 24 * u;
    const content = mk("div", `position:absolute;inset:0;padding:${px(64)} ${px(22)} ${px(22)};box-sizing:border-box;display:flex;flex-direction:column;gap:${px(16)};`, scr);
    const T = (a, b) => mk("div", `font:var(--x-head-weight) ${px(36)}/1.15 var(--x-head-font);letter-spacing:${rtl ? "0" : "var(--x-head-track)"};`, content, String(p.title || "").trim() || (rtl ? a : b));
    const sub = (a, b, parent = content) => mk("div", `font:400 ${px(18)}/1.4 var(--x-body-font);color:var(--x-dim);`, parent, rtl ? a : b);
    const rel = (e) => { const s = scr.getBoundingClientRect(), k = s.width / (scr.offsetWidth || 1) || 1, r = e.getBoundingClientRect(); return { x: (r.left - s.left) / k, y: (r.top - s.top) / k, w: r.width / k, h: r.height / k }; };
    const tile = (parent, i, css = "") => mk("div", `border-radius:calc(var(--x-radius) * ${(u * 0.55).toFixed(3)});background:linear-gradient(140deg, color-mix(in srgb, ${["var(--x-accent)", "var(--x-accent-2)", "var(--x-good)"][i % 3]} 85%, var(--x-panel)), color-mix(in srgb, ${["var(--x-accent-2)", "var(--x-good)", "var(--x-accent)"][i % 3]} 70%, var(--x-panel)));${css}`, parent);
    const row = (parent, i, a, b) => {
      const r = mk("div", `display:flex;align-items:center;gap:${px(14)};padding:${px(14)};border-radius:calc(var(--x-radius) * ${(u * 0.5).toFixed(3)});background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);`, parent);
      tile(r, i, `width:${px(44)};height:${px(44)};flex:none;`);
      const c = mk("div", "display:flex;flex-direction:column;flex:1;min-width:0;", r);
      mk("div", `font:600 ${px(21)}/1.25 var(--x-body-font);`, c, a);
      mk("div", `font:400 ${px(16)}/1.3 var(--x-body-font);color:var(--x-dim);`, c, b);
      return r;
    };
    // the touch dot
    const dot = mk("div", `position:absolute;left:0;top:0;width:${px(62)};height:${px(62)};margin:${px(-31)} 0 0 ${px(-31)};border-radius:50%;background:color-mix(in srgb, var(--x-ink) 22%, transparent);border:${px(2)} solid color-mix(in srgb, var(--x-panel) 70%, transparent);z-index:8;`, scr);
    const ripple = mk("div", `position:absolute;left:0;top:0;border-radius:50%;background:color-mix(in srgb, var(--x-accent) 30%, transparent);z-index:7;`, scr);
    const showDot = (t, q, on) => { dot.style.translate = `${q.x.toFixed(2)}px ${q.y.toFixed(2)}px`; dot.style.opacity = (p.touch_dot ? on : 0).toFixed(4); dot.style.scale = (0.7 + 0.3 * on).toFixed(4); };
    const G = ML.SPRING.glide;
    const tIn = at, tAct = Math.max(at + 0.2, Math.min(at + 0.45, end - 0.6));
    let draw;

    if (p.gesture === "swipe") {
      T("اكتشف", "Discover"); sub("اسحب لتشوف أكتر", "Swipe to see more");
      const view = mk("div", `position:relative;height:${(SH * 0.5).toFixed(1)}px;overflow:hidden;margin:0 ${px(-22)};`, content);
      const pageW = SW;
      const strip = mk("div", `position:absolute;top:0;${rtl ? "right" : "left"}:0;height:100%;display:flex;`, view);
      const names = rtl ? [["الخطة الأساسية", "كل اللي تحتاجه"], ["الخطة المميزة", "مزايا أكتر"], ["خطة الفريق", "للشركات"]] : [["Starter", "Everything you need"], ["Plus", "More of the good stuff"], ["Team", "For companies"]];
      names.forEach((n, i) => {
        const [a, b] = pickRow(i, n[0], n[1]);
        const pg = mk("div", `width:${pageW.toFixed(1)}px;height:100%;box-sizing:border-box;padding:0 ${px(22)};flex:none;`, strip);
        const c = tile(pg, i, `height:100%;position:relative;`);
        const tag = mk("div", `position:absolute;inset-inline-start:${px(16)};bottom:${px(16)};padding:${px(12)} ${px(16)};border-radius:calc(var(--x-radius) * ${(u * 0.4).toFixed(3)});background:var(--x-panel);`, c);
        mk("div", `font:600 ${px(21)} var(--x-body-font);`, tag, a); if (b) sub(b, b, tag);
      });
      const dots = mk("div", `display:flex;justify-content:center;gap:${px(8)};`, content);
      const ds = names.map(() => mk("i", `display:block;height:${px(8)};border-radius:99px;background:var(--x-ink);`, dots));
      row(content, 0, rtl ? "الأكثر طلباً" : "Most popular", rtl ? "١٢ ألف مستخدم" : "12k people");
      const v = rel(view);
      const dir = rtl ? 1 : -1; // content moves left in LTR
      const t0 = tAct, t1 = t0 + 0.32; // finger down, drag, release
      ctx.sfx(t1, "whoosh.soft", 0.3);
      ctx.sfx(t0, "tap", 0.22);
      const yDot = v.y + v.h * 0.55, xA = v.x + v.w * (rtl ? 0.25 : 0.75), xB = v.x + v.w * (rtl ? 0.62 : 0.38);
      draw = (t) => {
        const drag = ML.ease(t, t0, t1) * 0.3 * pageW; // the finger drags 30 % of a page
        const settle = ML.step(t - t1, G); // then the page springs the rest of the way
        const off = t < t1 ? drag : 0.3 * pageW + 0.7 * pageW * settle;
        strip.style.translate = `${(dir * off).toFixed(2)}px 0`;
        const idx = ML.clamp(off / pageW, 0, 1);
        ds.forEach((d, i) => { const a = i === 0 ? 1 - idx : i === 1 ? idx : 0; d.style.width = px(8 + 16 * a); d.style.opacity = (0.25 + 0.75 * a).toFixed(3); });
        const on = ML.lin(t, t0 - 0.12, t0) * (1 - ML.lin(t, t1, t1 + 0.15));
        showDot(t, { x: xA + (xB - xA) * ML.ease(t, t0, t1), y: yDot }, on);
        ripple.style.opacity = "0";
      };
    } else if (p.gesture === "sheet") {
      T("طلبك", "Your order"); sub("مراجعة قبل الدفع", "Review before paying");
      for (let i = 0; i < 3; i++) row(content, i, rtl ? ["سماعة لاسلكية", "شاحن سريع", "جراب جلد"][i] : ["Wireless buds", "Fast charger", "Leather case"][i], rtl ? ["١ قطعة", "١ قطعة", "٢ قطعة"][i] : ["1 item", "1 item", "2 items"][i]);
      const btn = mk("div", `margin-top:auto;padding:${px(18)};text-align:center;border-radius:var(--x-radius-s);background:var(--x-accent);color:var(--x-accent-ink);font:600 ${px(22)} var(--x-body-font);`, content, actionText("قسّط المبلغ", "Split the payment"));
      const back = mk("div", `position:absolute;inset:0;background:color-mix(in srgb, var(--x-ink) 45%, transparent);z-index:9;`, scr);
      const sheet = mk("div", `position:absolute;left:0;right:0;bottom:0;height:${(SH * 0.56).toFixed(1)}px;box-sizing:border-box;padding:${px(14)} ${px(22)} ${px(26)};display:flex;flex-direction:column;gap:${px(14)};background:var(--x-panel);border-radius:calc(var(--x-radius) * ${(u * 0.9).toFixed(3)}) calc(var(--x-radius) * ${(u * 0.9).toFixed(3)}) 0 0;box-shadow:var(--x-shadow);z-index:10;`, scr);
      mk("div", `align-self:center;width:${px(48)};height:${px(5)};border-radius:99px;background:color-mix(in srgb, var(--x-ink) 18%, transparent);`, sheet);
      mk("div", `font:var(--x-head-weight) ${px(24)} var(--x-head-font);margin-top:${px(6)};`, sheet, rtl ? "اختار الخطة" : "Pick a plan");
      const opts = [rtl ? ["٤ شهور", "بدون فوايد"] : ["4 months", "No interest"], rtl ? ["٦ شهور", "رسوم بسيطة"] : ["6 months", "Small fee"], rtl ? ["١٢ شهر", "أقل قسط"] : ["12 months", "Lowest monthly"]].map(([a, b], i) => {
        const r = row(sheet, i, ...pickRow(i, a, b));
        if (i === 0) r.style.borderColor = "var(--x-accent)";
        return r;
      });
      const b = rel(btn), tTap = tAct, tUp = tTap + 0.16;
      ctx.sfx(tTap, "tap", 0.3); ctx.sfx(tUp, "whoosh.soft", 0.3);
      const H = SH * 0.56;
      draw = (t) => {
        const sq = t >= tTap && t < tTap + 0.16 ? 1 - 0.04 * Math.sin(Math.PI * ML.lin(t, tTap, tTap + 0.16)) : 1;
        btn.style.scale = sq === 1 ? "none" : sq.toFixed(4);
        const s = ML.step(t - tUp, G);
        sheet.style.translate = `0 ${((1 - s) * (H + 20 * u)).toFixed(2)}px`;
        sheet.style.visibility = t < tUp ? "hidden" : "visible";
        back.style.opacity = (p.dim ? ML.clamp(s) : 0).toFixed(4);
        opts.forEach((o, i) => { const v = ML.out(t, tUp + 0.18 + i * 0.06, tUp + 0.45 + i * 0.06); o.style.opacity = v.toFixed(4); o.style.filter = v < 1 ? `blur(${((1 - v) * 6).toFixed(2)}px)` : "none"; });
        const on = ML.lin(t, tTap - 0.14, tTap) * (1 - ML.lin(t, tTap + 0.16, tTap + 0.3));
        showDot(t, { x: b.x + b.w / 2, y: b.y + b.h / 2 }, on);
        ripple.style.opacity = "0";
      };
    } else {
      // tap
      T("الإشعارات", "Notifications"); sub("اختار اللي يوصلك", "Choose what reaches you");
      const rows = [0, 1, 2].map((i) => row(content, i, ...pickRow(i, rtl ? ["العروض", "حالة الطلب", "التذكيرات"][i] : ["Offers", "Order status", "Reminders"][i], rtl ? ["مرة في الأسبوع", "لحظة بلحظة", "قبل الموعد"][i] : ["Once a week", "As it happens", "Before it's due"][i])));
      // the control on the second row: a toggle
      const tg = mk("div", `position:relative;width:${px(52)};height:${px(30)};flex:none;border-radius:99px;background:color-mix(in srgb, var(--x-ink) 14%, transparent);`, rows[1]);
      const knob = mk("div", `position:absolute;top:${px(3)};${rtl ? "right" : "left"}:${px(3)};width:${px(24)};height:${px(24)};border-radius:50%;background:var(--x-panel);box-shadow:0 ${px(1)} ${px(3)} color-mix(in srgb, var(--x-ink) 25%, transparent);`, tg);
      rows.forEach((r, i) => { if (i !== 1) { const t2 = mk("div", `position:relative;width:${px(52)};height:${px(30)};flex:none;border-radius:99px;background:${i === 0 ? "var(--x-good)" : "color-mix(in srgb, var(--x-ink) 14%, transparent)"};`, r); mk("div", `position:absolute;top:${px(3)};${(i === 0) !== rtl ? "right" : "left"}:${px(3)};width:${px(24)};height:${px(24)};border-radius:50%;background:var(--x-panel);`, t2); } });
      const btn = mk("div", `margin-top:auto;padding:${px(18)};text-align:center;border-radius:var(--x-radius-s);border:${px(2)} solid var(--x-accent);color:var(--x-accent);font:600 ${px(22)} var(--x-body-font);`, content, actionText("حفظ", "Save"));
      const g = rel(tg), b = rel(btn), t1 = tAct, t2 = Math.min(tAct + 0.7, end - 0.35);
      ctx.sfx(t1, "tap", 0.3); ctx.sfx(t2, "tap", 0.3);
      const dir = rtl ? -1 : 1;
      draw = (t) => {
        // first tap: the toggle flips; second tap: the button presses and fills
        const k1 = ML.out(t, t1 + 0.04, t1 + 0.22);
        knob.style.translate = `${(dir * 22 * u * k1).toFixed(2)}px 0`;
        tg.style.background = `color-mix(in srgb, var(--x-good) ${(k1 * 100).toFixed(1)}%, color-mix(in srgb, var(--x-ink) 14%, transparent))`;
        const sq = t >= t2 && t < t2 + 0.16 ? 1 - 0.04 * Math.sin(Math.PI * ML.lin(t, t2, t2 + 0.16)) : 1;
        btn.style.scale = sq === 1 ? "none" : sq.toFixed(4);
        const k2 = ML.out(t, t2 + 0.06, t2 + 0.26);
        btn.style.background = `color-mix(in srgb, var(--x-accent) ${(k2 * 100).toFixed(1)}%, transparent)`;
        btn.style.color = `color-mix(in srgb, var(--x-accent-ink) ${(k2 * 100).toFixed(1)}%, var(--x-accent))`;
        const a = { x: g.x + g.w / 2, y: g.y + g.h / 2 }, c = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
        const on1 = ML.lin(t, t1 - 0.14, t1) * (1 - ML.lin(t, t1 + 0.16, t1 + 0.3)), on2 = ML.lin(t, t2 - 0.14, t2) * (1 - ML.lin(t, t2 + 0.16, t2 + 0.3));
        const mv = ML.ease(t, t1 + 0.25, t2 - 0.12);
        showDot(t, { x: a.x + (c.x - a.x) * mv, y: a.y + (c.y - a.y) * mv }, Math.max(on1, on2));
        // ripple on each contact
        const rp = t >= t2 ? ML.lin(t, t2, t2 + 0.4) : ML.lin(t, t1, t1 + 0.4), rc = t >= t2 ? c : a;
        const rr = 70 * u * rp;
        ripple.style.width = ripple.style.height = (2 * rr).toFixed(1) + "px";
        ripple.style.translate = `${(rc.x - rr).toFixed(2)}px ${(rc.y - rr).toFixed(2)}px`;
        ripple.style.opacity = (t >= t1 ? (1 - rp) * 0.9 : 0).toFixed(4);
      };
    }

    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.25, end);
        const a = ML.expo(t, tIn, tIn + 0.4);
        phone.style.opacity = (Math.min(1, a * 1.5) * (1 - leave)).toFixed(4);
        phone.style.translate = `0 ${((1 - a) * 40 * u).toFixed(2)}px`;
        draw(t);
      },
    };
  },
});

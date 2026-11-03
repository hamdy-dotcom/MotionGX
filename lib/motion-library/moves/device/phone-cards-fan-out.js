// Phone cards fan out: a flat white phone mock (radius 40, a thin dark bezel, a soft shadow) glides in from the side
// (x +300 → 0 with a 4° → 0 tilt, 0.6 s power3.out), its list populates (rows fade in, 0.08 s apart), then notification
// cards (a coloured dot and two grey text bars) slip out from behind the screen's edge — starting at scale 0.6 behind
// the phone — and fan out in front of it: each travels `spread` (± 40) sideways, spread ± 60 vertically, turned −6…+4°,
// `stagger` apart, back.out(1.4) over 0.5 s; then all of them drift slowly. A pill toast slides in at the bottom
// corner. Sizes are in the phone's own units (300 × 600), so everything scales with it. RTL mirrors the sides (cards
// fan out to the right of a phone entering from the left); "up" fans them above it. On a screen slot its real UI
// fills the phone's screen (never enlarged); otherwise a sample inbox populates. Timing fits the move's room.
// Source: rebuilt as our own code from a prompt-motion reference (slvdev "opus 5.5 max motion") — reference only,
// nothing copied.
ML.define({
  id: "device.phone-cards-fan-out",
  category: "device",
  name: "Phone slides in and cards fly out of it",
  does: "A phone glides in, its list populates, then several notification cards pop out sideways from the screen and fan out in front of it.",
  says: ["tech", "flow", "connection"],
  energy: 3,
  targets: ["screen"],
  duration: [1.5, 5],
  params: {
    count: { type: "number", range: [2, 5], default: 3 },
    direction: { type: "choice", options: ["left", "right", "up"], default: "left" },
    spread: { type: "number", range: [120, 300], default: 220, unit: "px" },
    stagger: { type: "number", range: [0.05, 0.2], default: 0.1, unit: "s" },
  },
  pairs: ["device.phone-rise", "ui.notification-stack", "camera.push-in"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "card.fan",
  source: { from: "prompt-motion:slvdev-opus-5-5-max-motion", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const px = (v) => v.toFixed(2) + "px";
    const rr = (v) => `calc(var(--x-radius) * ${(v / 30).toFixed(4)})`, dr = (v) => `calc(var(--x-device-radius) * ${(v / 74).toFixed(4)})`; // radii scale with the look's
    const T = (en, ar) => (rtl ? ar : en);
    const el = ctx.el && ctx.el !== ctx.stage && ctx.el.tagName !== "IMG" ? ctx.el : null;
    const R = { ...f.pic }, EB = el ? ctx.box(el) : null; // the group takes the picture region; a slot's UI goes on the phone's screen
    const shot = el ? el.cloneNode(true) : null;
    if (shot) { shot.removeAttribute("data-slot"); shot.querySelectorAll("[data-slot]").forEach((e) => e.removeAttribute("data-slot")); }
    if (el) el.style.visibility = "hidden";
    const host = mk("div", `position:absolute;left:${px(R.x)};top:${px(R.y)};width:${px(R.w)};height:${px(R.h)};z-index:6;pointer-events:none;`, ctx.scene || ctx.stage);
    host.dir = rtl ? "rtl" : "ltr";
    const n = Math.round(ML.clamp(p.count, 2, 5));
    // which way the cards go, in screen terms (RTL mirrors left / right)
    const dirName = p.direction === "up" ? "up" : (p.direction === "right") !== rtl ? "right" : "left";
    const sx = dirName === "left" ? -1 : dirName === "right" ? 1 : 0;
    const spread = ML.clamp(p.spread, 120, 300);

    // ── the phone, in its own 300 × 600 units (u px each) ──
    // the whole group's width, in units: the phone's far half + how far the widest card reaches
    const across = sx ? spread + 360 + 10 : 330;
    const roomH = sx ? R.h : R.h / (1 + 0.45);
    const u = Math.min(roomH * 0.9 / 600, R.w / across);
    const PW = 300 * u, PH = 600 * u;
    const cx = R.w / 2 - sx * ((spread + 60) / 2) * u, // the group centred, the phone to the far side
       cy = sx ? R.h / 2 : R.h - PH / 2 - R.h * 0.03;
    const phone = mk("div", `position:absolute;left:${px(cx - PW / 2)};top:${px(cy - PH / 2)};width:${px(PW)};height:${px(PH)};box-sizing:border-box;border:${px(6 * u)} solid var(--x-device);border-radius:${dr(40 * u * 74 / 47)};background:var(--x-panel);box-shadow:var(--x-shadow);overflow:hidden;z-index:2;font-family:var(--x-body-font);color:var(--x-ink);`, host);
    mk("i", `position:absolute;left:50%;top:${px(10 * u)};width:${px(76 * u)};height:${px(20 * u)};margin-left:${px(-38 * u)};border-radius:var(--x-radius-s);background:var(--x-device);z-index:2;`, phone);
    if (shot) {
      const iw = PW - 12 * u, z = Math.min(1, iw / EB.w);
      shot.style.cssText += `;position:absolute;left:${px((iw - EB.w * z) / 2)};top:0;width:${px(EB.w)};height:${px(EB.h)};box-sizing:border-box;margin:0;transform-origin:0 0;transform:scale(${z.toFixed(4)});`;
      phone.append(shot);
    }
    const top = mk("div", `position:absolute;top:${px(44 * u)};inset-inline:${px(18 * u)};display:flex;align-items:center;justify-content:space-between;`, phone);
    mk("b", `font:var(--x-head-weight) ${px(20 * u)}/1 var(--x-head-font);`, top, T("Inbox", "الوارد"));
    mk("i", `width:${px(26 * u)};height:${px(26 * u)};border-radius:50%;background:linear-gradient(135deg, var(--x-accent-2), var(--x-accent));`, top);
    if (shot) top.style.display = "none";
    const tones = ["var(--x-accent)", "var(--x-good)", "var(--x-accent-2)", "var(--x-bad)", "var(--x-dim)"];
    const rows = [];
    for (let i = 0; i < (shot ? 0 : 7); i++) {
      const r = mk("div", `position:absolute;top:${px((88 + i * 66) * u)};inset-inline:${px(16 * u)};height:${px(54 * u)};display:flex;align-items:center;gap:${px(10 * u)};padding:0 ${px(10 * u)};box-sizing:border-box;border-radius:${rr(12 * u)};background:var(--x-panel-2);opacity:0;`, phone);
      mk("i", `flex:none;width:${px(26 * u)};height:${px(26 * u)};border-radius:50%;background:${tones[i % tones.length]};opacity:.85;`, r);
      const col = mk("div", `flex:1;display:flex;flex-direction:column;gap:${px(6 * u)};`, r);
      mk("i", `height:${px(7 * u)};width:${(50 + ML.rnd(i, 2) * 35).toFixed(0)}%;border-radius:var(--x-radius-s);background:color-mix(in srgb, var(--x-ink) 30%, transparent);`, col);
      mk("i", `height:${px(6 * u)};width:${(30 + ML.rnd(i, 5) * 40).toFixed(0)}%;border-radius:var(--x-radius-s);background:var(--x-line);`, col);
      rows.push(r);
    }

    // ── the cards: 260 × 50, born behind the phone's edge ──
    const CW = 260 * u, CH = 50 * u;
    const labels = rtl ? ["رسالة جديدة", "تم الدفع", "تذكير", "موعد اليوم", "تحديث جاهز"] : ["New message", "Payment sent", "Reminder", "Meeting today", "Update ready"];
    const cards = [];
    for (let i = 0; i < n; i++) {
      const c = mk("div", `position:absolute;left:${px(cx - CW / 2)};top:${px(cy - CH / 2)};width:${px(CW)};height:${px(CH)};box-sizing:border-box;display:flex;align-items:center;gap:${px(10 * u)};padding:0 ${px(12 * u)};border-radius:${rr(12 * u)};background:var(--x-panel);box-shadow:var(--x-shadow);border:var(--x-edge) solid var(--x-edge-color);opacity:0;`, host);
      mk("i", `flex:none;width:${px(12 * u)};height:${px(12 * u)};border-radius:50%;background:${tones[i % tones.length]};`, c);
      const col = mk("div", `flex:1;display:flex;flex-direction:column;gap:${px(5 * u)};min-width:0;`, c);
      mk("b", `font:600 ${px(14 * u)}/1.1 var(--x-body-font);white-space:nowrap;overflow:hidden;`, col, labels[i % labels.length]);
      mk("i", `height:${px(6 * u)};width:${(55 + ML.rnd(i, 9) * 30).toFixed(0)}%;border-radius:var(--x-radius-s);background:var(--x-line);`, col);
      // where it lands: sideways spread (± 40), vertical fan ± 60, turned −6…+4°
      const mid = (n - 1) / 2, j = n > 1 ? (i - mid) / mid : 0;
      const dist = (spread + (ML.rnd(i, 13) - 0.5) * 80) * u;
      const land = sx ? { x: sx * (PW / 2 + dist - CW / 2 + 20 * u), y: j * 60 * u * (n > 2 ? 1.6 : 1.2) } : { x: j * 70 * u, y: -PH / 2 + CH * 0.4 - dist * 0.25 - (n - 1 - i) * CH * 1.2 };
      const rot = -6 + ML.rnd(i, 21) * 10;
      // where it starts: tucked behind the phone at the edge it leaves from
      const from = sx ? { x: sx * (PW / 2 - CW * 0.6 / 2), y: land.y * 0.3 } : { x: 0, y: -PH / 2 + CH };
      cards.push({ c, land, from, rot, seed: i });
    }
    // the toast
    const toast = mk("div", `position:absolute;bottom:${px(R.h * 0.04)};${sx ? (sx < 0 ? "left" : "right") : rtl ? "right" : "left"}:${px(R.w * 0.03)};padding:${px(12 * u)} ${px(22 * u)};border-radius:var(--x-radius-s);background:var(--x-ink);color:var(--x-panel);font:600 ${px(15 * u)}/1 var(--x-body-font);display:flex;align-items:center;gap:${px(8 * u)};box-shadow:var(--x-shadow);z-index:4;opacity:0;white-space:nowrap;`, host);
    mk("i", `width:${px(9 * u)};height:${px(9 * u)};border-radius:50%;background:var(--x-good);`, toast);
    mk("span", "", toast, T(`${n} new updates`, n === 2 ? "تحديثين جداد" : `${n} تحديثات جديدة`));

    // ── timing ──
    const stg0 = ML.clamp(p.stagger, 0.05, 0.2);
    const q = ML.clamp((end - at - 0.3) / (1.27 + stg0 * n + 0.45), 0.55, 1); // the whole sequence fits the move's room
    const ph1 = at + 0.6 * q;
    const rowsAt = at + 0.35 * q, rowStep = 0.08 * q, fly = 0.5 * q;
    const stg = stg0 * q;
    const cardsAt = rowsAt + (0.08 * 4 + 0.15) * q;
    const toastAt = cardsAt + stg * n + 0.35 * q;
    const leave = end - 0.3;
    const enterX = (sx ? -sx : rtl ? -1 : 1) * 300 * u; // power3.out below; // enters from the side away from the fan
    ctx.sfx(at, "whoosh.soft", 0.35);
    ctx.sfx(cardsAt, "card.fan", 0.45);
    ctx.sfx(toastAt, "pop.soft", 0.25);
    const p3 = (x) => 1 - Math.pow(1 - x, 4);
    const backOut = (x, c = 1.4) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);

    return {
      draw(t) {
        host.style.visibility = t < at - 1e-6 ? "hidden" : "visible";
        const gone = ML.ease(t, leave, leave + 0.25);
        host.style.opacity = (1 - gone).toFixed(4);
        const e = p3(ML.lin(t, at, ph1));
        phone.style.opacity = ML.lin(t, at, at + 0.15).toFixed(4);
        phone.style.transform = `translateX(${((1 - e) * enterX).toFixed(2)}px) rotate(${((1 - e) * 4 * (enterX > 0 ? 1 : -1)).toFixed(3)}deg)`;
        rows.forEach((r, i) => { const a = rowsAt + i * rowStep, v = ML.out(t, a, a + 0.3); r.style.opacity = v.toFixed(4); r.style.translate = `0 ${((1 - v) * 10 * u).toFixed(2)}px`; });
        cards.forEach(({ c, land, from, rot, seed }, i) => {
          const a = cardsAt + i * stg, x = ML.lin(t, a, a + fly), b = backOut(x);
          const drift = Math.max(0, t - (a + fly));
          const dx = Math.sin(drift * 0.9 + seed * 1.7) * 4 * u + (sx ? sx * drift * 3 * u : 0);
          const dy = Math.cos(drift * 0.7 + seed * 2.3) * 5 * u - (sx ? 0 : drift * 3 * u);
          const X = from.x + (land.x - from.x) * b + dx, Y = from.y + (land.y - from.y) * b + dy;
          const s = 0.6 + 0.4 * Math.min(1, b);
          c.style.opacity = (t < a ? 0 : Math.min(1, x * 4)).toFixed(4);
          c.style.zIndex = x > 0.35 ? "3" : "1"; // behind the screen while it slips out, then in front
          c.style.transform = `translate(${X.toFixed(2)}px, ${Y.toFixed(2)}px) rotate(${(rot * Math.min(1, b) + Math.sin(drift * 0.8 + seed) * 0.6).toFixed(3)}deg) scale(${Math.min(1, s).toFixed(4)})`;
        });
        const tv = ML.expo(t, toastAt, toastAt + 0.45);
        toast.style.opacity = Math.min(1, tv * 1.5).toFixed(4);
        toast.style.translate = `${((1 - tv) * ((sx ? sx > 0 : rtl) ? 1 : -1) * 120 * u).toFixed(2)}px 0`;
      },
    };
  },
});

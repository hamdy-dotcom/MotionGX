// Notifications slide in and stack: cards arrive one after another (on their spoken words, or on a steady stagger) and
// pile up. Four card styles, rebuilt from MotionGX's studio scenes and the prompt-motion references:
//   glass-lockscreen — a phone lock screen (brand → ink 170° gradient, a 30 px date, a 150 px clock) with glass cards
//                      (radius 30, accent-ink at 20 % over a 16 px backdrop blur, a 44 px app tile + app name + "now",
//                      a bold 28 px title, a 25 px body), each dropping in from y −80 on back.out(1.4) in 0.5 s;
//   dark-card        — 220 × 56, radius 12, the device colour, a 24 px accent icon, a bold 13 px title + 12 px body;
//   light-toast      — 220 × 50, radius 8, the panel colour with the look's shadow;
//   row              — a 220 × 34 "Missed call" row, radius 8, a red phone icon and the time.
// How they stack: push-older-down — the new card lands at the top (y −20 + blur 6 → rest, 0.3 s power3.out) and pushes
// the older ones down one slot, the oldest past what fits blurs 4 px and fades; append-below — each new row lands under
// the last (y −10 → 0, scale 0.95 → 1, 0.3 s back.out(1.3)), earlier rows stay put (the list scrolls up once full);
// single — one alert at a time (opacity 0, y −100, scale 0.94 → 1, 0.55 s expo.out), the previous one sinking away.
// `from` sets the entry side: top, bottom, or the side (x +40 → 0, 0.35 s back.out(1.2), earlier cards nudge 4 px).
// Every size is a share of the card, every colour a look variable; RTL mirrors the side entry and the rows.
// Source: MotionGX's own lib/studio-engine/assets/scenes.js (S.notify, S.notice), with the prompt-motion references
// rossaxbt-94583b, aistocksavvy-wow-made-this-motion and fractadev-wow-made-with-claude (reference only — our own code).
ML.define({
  id: "ui.notification-stack",
  category: "ui",
  name: "Notifications slide in and stack",
  does: "Notification cards drop or slide in one after another on their words and stack up, pushing older ones down or growing the list, on a lock screen or on their own.",
  says: ["arrival", "urgency", "connection", "result", "list", "tech", "proof", "speed", "time", "problem", "scale"],
  energy: 3,
  targets: ["card", "list", "screen"],
  duration: [0.6, 4],
  params: {
    count: { type: "number", range: [1, 6], default: 3 },
    from: { type: "choice", options: ["top", "side", "bottom"], default: "top" },
    stack: { type: "choice", options: ["push-older-down", "append-below", "single"], default: "push-older-down" },
    style: { type: "choice", options: ["glass-lockscreen", "dark-card", "light-toast", "row"], default: "light-toast" },
    stagger: { type: "number", range: [0.25, 0.5], default: 0.35, unit: "s" },
    sync: { type: "choice", options: ["stagger", "spoken"], default: "stagger" },
    items: { type: "text" }, // "Title|body; Title|body" — overrides the sample notifications
    app: { type: "text" }, // the app name on the cards (the brand's name)
    clock: { type: "text", default: "9:41" },
    date: { type: "text" },
  },
  pairs: ["ui.incoming-call-card", "ui.notification-pile-in", "text-in.punchline"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "bell",
  source: { from: "own:lib/studio-engine/assets/scenes.js#S.notify", license: "own", note: "with prompt-motion rossaxbt-94583b, aistocksavvy-wow-made-this-motion, fractadev-wow-made-with-claude as reference only" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const px = (v) => v.toFixed(2) + "px";
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    let host, R;
    if (el && el.clientWidth > 420 && el.clientHeight > 360) { if (getComputedStyle(el).position === "static") el.style.position = "relative"; host = el; R = { x: 0, y: 0, w: el.clientWidth, h: el.clientHeight }; }
    else { host = ctx.scene || ctx.stage; R = f.pic; }
    const style = p.style, mode = p.stack, from = p.from, dir = rtl ? -1 : 1;
    const n = mode === "single" && !(+p.count > 1) ? 1 : Math.round(ML.clamp(+p.count || 3, 1, 6));

    // what they say
    const SAMPLE = {
      en: [["New order", "Order #1042 just came in — 2 items"], ["Payment received", "$240.00 from Sara M."], ["New review", "★★★★★ “Fast and easy, loved it”"], ["Booking confirmed", "Tomorrow at 10:30 am"], ["Low stock", "Only 3 left of your best seller"], ["New follower", "Omar started following you"]],
      ar: [["طلب جديد", "طلب رقم ١٠٤٢ وصل حالًا — منتجين"], ["تم الدفع", "٢٤٠ جنيه من سارة"], ["تقييم جديد", "★★★★★ «سريع وسهل، عجبني جدًا»"], ["تم الحجز", "بكرة الساعة ١٠:٣٠ الصبح"], ["المخزون قليل", "فاضل ٣ بس من الأكثر مبيعًا"], ["متابع جديد", "عمر بدأ يتابعك"]],
    };
    const ROWS = { en: ["Missed call", "Missed call", "Missed call", "Voicemail", "Missed call", "Missed call"], ar: ["مكالمة فائتة", "مكالمة فائتة", "مكالمة فائتة", "بريد صوتي", "مكالمة فائتة", "مكالمة فائتة"] };
    const TIMES = ["11:47", "11:52", "12:03", "12:10", "12:18", "12:26"];
    let list = (rtl ? SAMPLE.ar : SAMPLE.en).slice();
    if (style === "row") list = (rtl ? ROWS.ar : ROWS.en).map((x, i) => [x, TIMES[i]]);
    const given = String(p.items || "").split(/[;\n]/).map((x) => x.trim()).filter(Boolean).map((x) => { const [a, b] = x.split("|"); return [a || "", b || ""]; });
    if (given.length) list = given.concat(list.slice(given.length));
    else if (el && el.children.length > 1 && !el.querySelector("img")) [...el.children].slice(0, 6).forEach((c, i) => { const tx = (c.textContent || "").trim(); if (tx) list[i] = style === "row" ? [tx, TIMES[i]] : [tx, list[i][1]]; });
    const items = Array.from({ length: n }, (_, i) => list[i % list.length]);
    const appName = p.app || (rtl ? "المتجر" : "Store");

    // the room the cards live in: the region, or a phone lock screen built in it
    let box = { x: R.x, y: R.y, w: R.w, h: R.h }, layer = host, phone = null, screen = null, lockHead = null;
    if (style === "glass-lockscreen") {
      const ph = Math.min(R.h, R.w * 2.05 * 0.9), pw = ph / 2.05, bz = pw * 0.035;
      phone = mk("div", `position:absolute;left:${px(R.x + (R.w - pw) / 2)};top:${px(R.y + (R.h - ph) / 2)};width:${px(pw)};height:${px(ph)};box-sizing:border-box;padding:${px(bz)};border-radius:calc(var(--x-device-radius) * ${(pw / 520).toFixed(3)});background:var(--x-device);box-shadow:var(--x-shadow);z-index:5;pointer-events:none;`, host);
      screen = mk("div", `position:relative;width:100%;height:100%;overflow:hidden;border-radius:calc(var(--x-device-radius) * ${(pw / 520).toFixed(3)} - ${px(bz)});background:linear-gradient(170deg, var(--x-accent), color-mix(in srgb, var(--x-accent) 22%, var(--x-device)));color:var(--x-accent-ink);display:flex;flex-direction:column;align-items:center;`, phone);
      const sw = pw - bz * 2, q = sw / 560;
      lockHead = mk("div", `display:flex;flex-direction:column;align-items:center;margin-top:${px(96 * q)};`, screen);
      mk("div", `font:300 ${px(30 * q)}/1.2 var(--x-body-font);opacity:.85;white-space:nowrap;`, lockHead, p.date || (rtl ? "الاثنين ٩ يونيو" : "Monday, June 9"));
      mk("div", `font:600 ${px(150 * q)}/1 var(--x-head-font);direction:ltr;unicode-bidi:isolate;margin-top:${px(6 * q)};letter-spacing:-0.02em;font-variant-numeric:tabular-nums;`, lockHead, p.clock || "9:41");
      layer = screen;
      const top = 96 * q + lockHead.offsetHeight + 34 * q;
      box = { x: 18 * q, y: top, w: sw - 36 * q, h: (ph - bz * 2) - top - 40 * q, q };
    }

    // one card per style
    const cw = style === "glass-lockscreen" ? box.w : Math.min(box.w * (f.wide ? 0.56 : 0.78), box.h * 1.6, 660 * k);
    const u = style === "glass-lockscreen" ? box.q : cw / 220;
    const PHONE = "M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z";
    const BELL = '<path d="M12 3a6 6 0 0 0-6 6v4l-2 3h16l-2-3V9a6 6 0 0 0-6-6z" fill="currentColor"/><path d="M9.5 19a2.5 2.5 0 0 0 5 0z" fill="currentColor"/>';
    const one = (s, w, c) => `font:${w} ${px(s * u)}/1.3 var(--x-body-font);color:${c};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
    const cards = items.map((it, i) => {
      const c = mk("div", `position:absolute;left:0;top:0;width:${px(cw)};box-sizing:border-box;pointer-events:none;visibility:hidden;z-index:${20 + i};`, layer);
      c.dir = rtl ? "rtl" : "ltr";
      if (style === "glass-lockscreen") {
        c.style.cssText += `padding:${px(20 * u)} ${px(22 * u)};border-radius:${px(30 * u)};background:color-mix(in srgb, var(--x-accent-ink) 20%, transparent);backdrop-filter:blur(${px(16 * u)});-webkit-backdrop-filter:blur(${px(16 * u)});color:var(--x-accent-ink);`;
        const hd = mk("div", `display:flex;align-items:center;gap:${px(12 * u)};margin-bottom:${px(8 * u)};`, c);
        const tile = mk("div", `flex:none;width:${px(44 * u)};height:${px(44 * u)};border-radius:${px(12 * u)};background:var(--x-accent-ink);color:var(--x-accent);display:grid;place-items:center;`, hd);
        tile.innerHTML = `<svg viewBox="0 0 24 24" width="62%" height="62%">${BELL}</svg>`;
        mk("div", one(22, 600, "inherit") + "opacity:.9;", hd, appName);
        mk("div", one(20, 400, "inherit") + "opacity:.7;margin-inline-start:auto;flex:none;", hd, rtl ? "الآن" : "now");
        mk("div", one(28, 700, "inherit"), c, it[0]);
        mk("div", `font:400 ${px(25 * u)}/1.35 var(--x-body-font);opacity:.9;margin-top:${px(4 * u)};display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;`, c, it[1]);
      } else if (style === "row") {
        c.style.cssText += `height:${px(34 * u)};padding:0 ${px(10 * u)};display:flex;align-items:center;gap:${px(8 * u)};border-radius:${px(8 * u)};background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);`;
        const ic = mk("div", `flex:none;width:${px(20 * u)};height:${px(20 * u)};border-radius:50%;background:color-mix(in srgb, var(--x-bad) 14%, var(--x-panel));color:var(--x-bad);display:grid;place-items:center;`, c);
        ic.innerHTML = `<svg viewBox="0 0 24 24" width="58%" height="58%" style="rotate:135deg"><path d="${PHONE}" fill="currentColor"/></svg>`;
        mk("div", one(11.5, 600, "var(--x-bad)") + "flex:1;", c, it[0]);
        const tm = mk("div", one(10, 400, "var(--x-dim)") + "flex:none;direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums;", c, it[1]);
        void tm;
      } else {
        const dark = style === "dark-card";
        c.style.cssText += `min-height:${px((dark ? 56 : 50) * u)};padding:${px(9 * u)} ${px(11 * u)};display:flex;align-items:center;gap:${px(9 * u)};border-radius:${px((dark ? 12 : 8) * u)};` +
          (dark ? "background:var(--x-device);color:var(--x-accent-ink);box-shadow:var(--x-shadow);" : "background:var(--x-panel);color:var(--x-ink);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);");
        const ic = mk("div", `flex:none;width:${px(24 * u)};height:${px(24 * u)};border-radius:${px(7 * u)};background:var(--x-accent);color:var(--x-accent-ink);display:grid;place-items:center;`, c);
        ic.innerHTML = `<svg viewBox="0 0 24 24" width="62%" height="62%">${BELL}</svg>`;
        const tx = mk("div", "flex:1;min-width:0;display:flex;flex-direction:column;", c);
        mk("div", one(13, 700, "inherit"), tx, it[0]);
        mk("div", one(12, 400, dark ? "color-mix(in srgb, var(--x-accent-ink) 62%, transparent)" : "var(--x-dim)"), tx, it[1]);
      }
      return c;
    });
    const ch = Math.max(...cards.map((c) => c.offsetHeight));
    const gap = (style === "glass-lockscreen" ? 14 : style === "row" ? 6 : 8) * u;
    const slot = ch + gap;
    const fit = Math.max(1, Math.floor((box.h + gap) / slot));
    const shown = mode === "single" ? 1 : Math.min(n, fit);
    const groupH = shown * slot - gap;
    const top = style === "glass-lockscreen" ? box.y : box.y + (box.h - groupH) / 2;
    const left = box.x + (box.w - cw) / 2;

    // arrival times: on spoken words inside the move's span, else a steady stagger
    const room = Math.max(0.2, end - at - 0.9);
    const st = n > 1 ? Math.min(p.stagger, room / (n - 1)) : 0;
    let T = cards.map((_, i) => at + 0.1 + i * st);
    if (p.sync === "spoken" && ctx.words && ctx.words.length) {
      const ws = ctx.words.filter((w) => w.t >= at && w.t <= end - 0.6);
      if (ws.length >= n) T = cards.map((_, i) => ws[Math.floor((i * ws.length) / n)].t);
      for (let i = 1; i < n; i++) T[i] = Math.max(T[i], T[i - 1] + 0.2);
    }
    T.forEach((t, i) => ctx.sfx(t, style === "row" ? "pop" : "bell", i === 0 ? 0.35 : 0.24));
    if (phone) ctx.sfx(at, "whoosh.soft", 0.2);
    const dur = mode === "single" ? (style === "glass-lockscreen" ? 0.5 : 0.55) : from === "side" ? 0.35 : style === "glass-lockscreen" ? 0.5 : 0.3;
    const sideD = 40 * u * dir;
    const vD = (from === "bottom" ? 1 : -1) * (mode === "single" ? 100 : mode === "append-below" ? 10 : style === "glass-lockscreen" ? 80 : 20) * (style === "glass-lockscreen" ? u : Math.max(1, u * 0.6));
    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.25, end);
        if (phone) {
          const e = ML.expo(t, at - 0.15, at + 0.45);
          phone.style.opacity = (ML.lin(t, at - 0.15, at + 0.15) * (1 - leave)).toFixed(4);
          phone.style.translate = `0 ${px((1 - e) * 80 * k)}`;
          phone.style.scale = (0.9 + 0.1 * e).toFixed(4);
        }
        // how many cards have arrived (smoothly), for pushing and scrolling
        const arr = T.map((a) => ML.out(t, a, a + dur));
        cards.forEach((c, i) => {
          const a = T[i];
          if (t < a) { c.style.visibility = "hidden"; return; }
          c.style.visibility = "visible";
          // the entry
          let e, o = ML.lin(t, a, a + dur * 0.5), sc = 1, bl = 0;
          if (mode === "single") e = style === "glass-lockscreen" ? ML.back(t, a, a + dur, 1.4) : ML.expo(t, a, a + dur);
          else if (from === "side") e = ML.back(t, a, a + dur, 1.2);
          else if (mode === "append-below") e = ML.back(t, a, a + dur, 1.3);
          else if (style === "glass-lockscreen") e = ML.back(t, a, a + dur, 1.4);
          else e = ML.out(t, a, a + dur);
          let ex = from === "side" ? (1 - e) * sideD : 0;
          let ey = from === "side" ? 0 : (1 - e) * vD;
          if (mode === "single" || mode === "append-below") sc = (mode === "single" ? 0.94 : 0.95) + (mode === "single" ? 0.06 : 0.05) * Math.min(1, e);
          if (mode === "push-older-down" && from !== "side") bl = (1 - ML.out(t, a, a + dur)) * 6 * k;
          // where it rests
          let y = top, fade = 0;
          if (mode === "push-older-down") {
            let depth = 0; for (let j = i + 1; j < n; j++) depth += arr[j];
            y = top + depth * slot;
            fade = ML.clamp(depth - (shown - 1));
            bl += fade * 4 * k;
          } else if (mode === "append-below") {
            let past = 0; for (let j = 0; j < n; j++) past += arr[j];
            const scroll = Math.max(0, past - shown);
            y = top + (i - scroll) * slot;
            fade = ML.clamp(-(i - scroll));
            bl += fade * 4 * k;
            if (from === "side") { let later = 0; for (let j = i + 1; j < n; j++) later += arr[j]; y -= Math.min(1, later) * 4 * u; }
          } else {
            // single: the next alert takes its place, this one sinks back and fades
            const next = i + 1 < n ? arr[i + 1] : 0;
            fade = next; sc *= 1 - 0.06 * next; ey += next * 14 * u * (from === "bottom" ? -1 : 1);
          }
          o *= (1 - fade) * (1 - leave);
          c.style.opacity = o.toFixed(4);
          c.style.transform = `translate(${px(left + ex)}, ${px(y + ey - leave * 10 * k)})${sc !== 1 ? ` scale(${sc.toFixed(4)})` : ""}`;
          c.style.filter = bl > 0.05 ? `blur(${px(bl)})` : "none";
        });
      },
    };
  },
});

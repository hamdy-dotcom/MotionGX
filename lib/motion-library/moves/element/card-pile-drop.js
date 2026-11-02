// Cards drop and pile up. Two builds of the same idea:
//  · straight (tilt off) — big cards, one row each, fall from y −drop with scale 1.2 → 1 and opacity 0 → 1 over 0.45 s
//    on bounce.out (or a soft settle), one per beat (0.5 s, snapped); never rotated, so a wide card stays inside the safe
//    area (MotionGX's own R.stack "pains").
//  · pile (tilt on) — small cards (190×46 proportion, small radius, 1 px edge, soft shadow) thrown in from off the
//    trailing side and above (x +220, y −40, rotate 12–18°), landing in 0.5 s power3.out at a seeded −4…6° rest,
//    each 4 px higher than the last so the pile thickens; earlier cards nudge down-and-back 3 px on every landing;
//    the gap between throws can shrink 0.35 s → 0.12 s (accelerating).
// An optional counter in the accent ("1 task" → "10 tasks") ticks on each landing. A landing thud per card.
// Source: MotionGX lib/live-engine/worker/vendor/recipes.js R.stack (own) + prompt-motion
// "thayto-dev-tutorial-do-gabrielbuzziv-o" (reference only — the pile is our own rebuild).
ML.define({
  id: "element.card-pile-drop",
  category: "element",
  name: "Cards drop and pile up",
  does: "Cards fall one after another onto a growing pile, bouncing or settling at small tilts, optionally with a counter ticking up on each landing.",
  says: ["problem", "energy", "list", "scale"],
  energy: 4,
  targets: ["card", "list", "number"],
  duration: [1.5, 5],
  params: {
    ease: { type: "choice", options: ["bounce", "settle"], default: "bounce" },
    count: { type: "number", range: [3, 12], default: 5 },
    tilt: { type: "bool", default: false },
    counter: { type: "bool", default: false },
    drop: { type: "number", range: [160, 320], default: 260, unit: "px" },
    timing: { type: "choice", options: ["beat", "accelerating"], default: "beat" },
    noun: { type: "text", default: "" },
    backdrop: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "camera.impact-shake", "transition.scatter-exit"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "land",
  source: { from: "own:lib/live-engine/worker/vendor/recipes.js#R.stack", license: "own", note: "pile variant rebuilt from prompt-motion thayto-dev-tutorial-do-gabrielbuzziv-o (reference only)" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const ob = own ? ctx.box(own) : null;
    const big = ob && ob.w > f.W * 0.4 && ob.h > f.H * 0.18;
    const R = big ? ob : f.pic;
    const k = Math.min(f.W, f.H) / 1080;
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;`, host);
    const back = p.backdrop ? mk("div", "position:absolute;inset:0;border-radius:var(--x-radius);background:var(--x-ground);", layer) : null;

    // labels: the target's own items when it is a list, else everyday chores that pile up
    const DEF = rtl
      ? ["فواتير", "متابعات", "تقارير", "إيميلات", "تذكيرات", "اجتماعات", "موافقات", "جداول", "إيصالات", "مرتبات", "تجديدات", "ساعات عمل"]
      : ["Invoices", "Follow-ups", "Reports", "Emails", "Reminders", "Meetings", "Approvals", "Spreadsheets", "Receipts", "Payroll", "Renewals", "Timesheets"];
    const mine = own && own.children.length > 1 ? [...own.children].map((c) => (c.textContent || "").trim()).filter(Boolean) : [];
    const n = Math.round(ML.clamp(p.count, 3, 12));
    const labels = Array.from({ length: n }, (_, i) => mine[i] || DEF[(i + mine.length) % DEF.length]);
    const noun = p.noun || (rtl ? "مهمة" : "task");
    const count = (v) => (rtl ? `${v} ${noun}` : `${v} ${noun}${v === 1 ? "" : "s"}`);

    // landing times
    const span = Math.max(0.6, end - at - 0.9);
    let gaps;
    if (p.timing === "accelerating") gaps = Array.from({ length: n - 1 }, (_, i) => 0.35 + (0.12 - 0.35) * (i / Math.max(1, n - 2)));
    else gaps = Array.from({ length: n - 1 }, () => 0.5);
    const total = gaps.reduce((a, b) => a + b, 0), squeeze = total > span ? span / total : 1;
    const times = [at + 0.15];
    gaps.forEach((g) => times.push(times[times.length - 1] + g * squeeze));
    if (p.timing === "beat" && squeeze === 1) for (let i = 0; i < n; i++) times[i] = at + 0.15 + Math.round((times[i] - at - 0.15) / 0.5) * 0.5;
    const dur = p.tilt ? 0.5 : 0.45;
    times.forEach((t, i) => ctx.sfx(t + dur * 0.55, i % 2 ? "land.light" : "land", p.tilt ? 0.3 : 0.4));

    const bounceOut = (x) => { const a = 7.5625, d = 2.75; if (x < 1 / d) return a * x * x; if (x < 2 / d) return a * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return a * (x -= 2.25 / d) * x + 0.9375; return a * (x -= 2.625 / d) * x + 0.984375; };
    const card = (i, w, h, fs) => {
      const c = mk("div", `position:absolute;left:0;top:0;width:${w}px;height:${h}px;box-sizing:border-box;display:flex;align-items:center;gap:${h * 0.22}px;padding:0 ${h * 0.32}px;background:var(--x-panel);border:${Math.max(1, k)}px solid var(--x-edge-color);border-radius:${p.tilt ? `calc(min(var(--x-radius), ${(h * 0.14).toFixed(1)}px))` : `calc(min(var(--x-radius), ${(h * 0.3).toFixed(1)}px))`};box-shadow:var(--x-shadow);opacity:0;`, layer);
      mk("span", `flex:none;width:${h * 0.3}px;height:${h * 0.3}px;border-radius:50%;background:${i % 3 === 2 ? "var(--x-accent-2)" : "var(--x-accent)"};`, c);
      mk("span", `flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font:var(--x-head-weight) ${fs}px/1.1 var(--x-head-font);color:var(--x-ink);`, c, labels[i]);
      if (!p.tilt) mk("span", `flex:none;font:var(--x-label-weight) ${fs * 0.5}px var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};color:var(--x-dim);`, c, rtl ? `#${i + 1}` : `#${String(i + 1).padStart(2, "0")}`);
      return c;
    };

    let cards, place;
    const counterH = p.counter ? Math.min(R.h * 0.12, 90 * k) : 0;
    if (!p.tilt) {
      // straight: rows that fill the box from the top, each a full-width card
      const gap = 18 * k, avail = R.h - counterH - R.h * 0.08;
      const h = Math.min(130 * k, (avail - gap * (n - 1)) / n), w = Math.min(R.w * 0.9, 860 * k);
      const y0 = counterH + (R.h - counterH - (n * h + (n - 1) * gap)) / 2;
      cards = labels.map((_, i) => card(i, w, h, h * 0.36));
      place = cards.map((_, i) => ({ x: (R.w - w) / 2, y: y0 + i * (h + gap), r: 0 }));
    } else {
      // pile: small cards on one heap in the middle of the box
      const w = Math.min(R.w * 0.6, 520 * k), h = w * (46 / 190) * 1.25;
      cards = labels.map((_, i) => card(i, w, h, h * 0.34));
      const baseY = counterH + (R.h - counterH) * 0.5 + (n * 4 * k * 2.4) / 2 - h / 2;
      place = cards.map((_, i) => ({ x: (R.w - w) / 2 + (ML.rnd(i, 5) - 0.5) * w * 0.2, y: baseY - i * 4 * k * 2.4, r: -4 + ML.rnd(i, 9) * 10 }));
      cards.forEach((c, i) => { c.style.zIndex = String(i + 1); });
    }
    const counter = p.counter ? mk("div", `position:absolute;left:0;right:0;top:${counterH * 0.1}px;height:${counterH * 0.8}px;display:flex;align-items:center;justify-content:center;font:var(--x-head-weight) ${counterH * 0.6}px/1 var(--x-head-font);color:var(--x-accent);white-space:nowrap;`, layer, "") : null;

    const away = (rtl ? -1 : 1);
    const goA = Math.max(times[n - 1] + 0.6, end - 0.3);
    return {
      draw(t) {
        const leave = ML.clamp((t - goA) / 0.28);
        layer.style.opacity = (1 - leave).toFixed(4);
        layer.style.visibility = t < at - 0.2 ? "hidden" : "visible";
        if (back) back.style.opacity = ML.out(t, at - 0.15, at + 0.15).toFixed(4);
        let landed = 0;
        cards.forEach((c, i) => {
          const a = times[i], x = ML.lin(t, a, a + dur), P = place[i];
          if (t >= a + dur * 0.55) landed = i + 1;
          if (!p.tilt) {
            const e = p.ease === "bounce" ? bounceOut(x) : ML.back(t, a, a + dur, 1.1);
            const sc = 1.2 - 0.2 * e;
            c.style.opacity = ML.lin(t, a, a + dur * 0.3).toFixed(4);
            c.style.transform = `translate(${P.x.toFixed(2)}px, ${(P.y - (1 - e) * p.drop * k).toFixed(2)}px) scale(${sc.toFixed(4)})`;
          } else {
            const e = p.ease === "bounce" ? ML.back(t, a, a + dur, 1.2) : ML.out(t, a, a + dur);
            // nudged down-and-back 3 px by every later card that has landed
            let nudge = 0;
            for (let j = i + 1; j < n; j++) nudge += ML.out(t, times[j] + dur * 0.5, times[j] + dur * 0.8);
            const r0 = (12 + ML.rnd(i, 3) * 6) * away;
            const fx = away * (220 * k + R.w * 0.5), fy = -40 * k - R.h * 0.35;
            const xx = P.x + fx * (1 - e) - away * nudge * 3 * k, yy = P.y + fy * (1 - e) + nudge * 3 * k;
            c.style.opacity = ML.lin(t, a, a + dur * 0.25).toFixed(4);
            c.style.transform = `translate(${xx.toFixed(2)}px, ${yy.toFixed(2)}px) rotate(${(r0 + (P.r - r0) * e).toFixed(3)}deg)`;
          }
        });
        if (counter) {
          const txt = landed ? count(landed) : "";
          if (counter.textContent !== txt) counter.textContent = txt;
          const lastT = landed ? times[landed - 1] + dur * 0.55 : at;
          // each tick lands from a touch smaller (laid out at full size, only ever scaled down)
          const pop = landed ? 1 - ML.back(t, lastT, lastT + 0.22, 2) : 0;
          counter.style.transform = `scale(${(1 - 0.12 * pop).toFixed(4)})`;
          counter.style.opacity = landed ? "1" : "0";
        }
      },
    };
  },
});

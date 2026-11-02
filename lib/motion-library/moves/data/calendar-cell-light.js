// Calendar day lights up (MotionGX studio scene S.calendar): a 7-column month, 5 or 6 weeks (rounded, panel-2 ground,
// day numbers in the script's digits — Arabic-Indic for Arabic) under weekday initials. On each date's spoken word
// its cell fills with a category colour (accent, accent-2, good, bad, ink, an accent/good mix) with the text turning
// accent-ink over 0.25 s and bounces from scale 1.25 → 1 over 0.45 s on back.out(2), with a drop sound. With
// `with_list`, a matching row (a 16 × 52 colour bar, the name, the mono date) fades up beside / below the calendar.
// `dates` names the days ("3, 9, 14, 22"), `names` their labels ("Launch | Payday | …": a row needs a name, so with no
// names the calendar takes the whole room), `month` an optional title over the grid. Each lights on its date or its
// name's spoken word when the voice says it, else on a steady spread through the move. On a card / chart the calendar
// is built inside it; with no target, on a panel in the picture region.
// Source: MotionGX lib/studio-engine/assets/scenes.js S.calendar (own).
ML.define({
  id: "data.calendar-cell-light",
  category: "data",
  name: "Calendar day lights up",
  does: "On each spoken date, its calendar cell fills with a category colour and bounces.",
  says: ["time", "list", "precision"],
  energy: 3,
  targets: ["card", "chart", "label"],
  duration: [1.6, 5],
  params: {
    bounce_from: { type: "number", range: [1.1, 1.3], default: 1.25 },
    colour_by: { type: "choice", options: ["category", "single"], default: "category" },
    with_list: { type: "bool", default: true },
    digits: { type: "choice", options: ["auto", "latin", "arabic-indic"], default: "auto" },
    dates: { type: "text", default: "3, 9, 14, 22" },
    names: { type: "text", default: "" },
    month: { type: "text", default: "" },
    month_days: { type: "number", range: [28, 31], default: 31 },
    first_weekday: { type: "number", range: [0, 6], default: 2 },
  },
  pairs: ["data.accent-index-numbers", "text-in.punchline"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "drop",
  source: { from: "own:lib/studio-engine/assets/scenes.js#S.calendar", license: "own" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const mk = (tag, css, text, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const AR = "٠١٢٣٤٥٦٧٨٩";
    const arDigits = p.digits === "arabic-indic" || (p.digits === "auto" && rtl);
    const N = (v) => (arDigits ? String(v).replace(/\d/g, (d) => AR[d]) : String(v));
    const days = Math.round(ML.clamp(p.month_days, 28, 31)), lead = Math.round(ML.clamp(p.first_weekday, 0, 6));
    const dates = String(p.dates || "").replace(/[٠-٩]/g, (d) => String(AR.indexOf(d))).split(/[\s,|]+/).map(Number).filter((d) => d >= 1 && d <= days).slice(0, 6);
    if (!dates.length) dates.push(9, 14, 22);
    const names = String(p.names || "").split("|").map((s) => s.trim());
    // host: inside a big enough card / chart, else a panel in the picture region
    const scene = ctx.scene || ctx.stage, hb = ctx.box(scene);
    const k = Math.min(f.W, f.H) / 1080;
    const listOn = p.with_list && names.some(Boolean), title = String(p.month || "").trim();
    const weeks = Math.ceil((lead + days) / 7); // a month starting late runs into a sixth week: its last days must exist
    const side = listOn && f.wide;
    let bx;
    const eb = el ? ctx.box(el) : null;
    if (eb && eb.w >= 400 && eb.h >= 300) bx = eb;
    else { const w = Math.min(f.pic.w, f.wide ? f.W * 0.62 : f.W * 0.86); bx = { x: f.pic.x + (f.pic.w - w) / 2, y: f.pic.y, w, h: f.pic.h }; }
    const wrap = mk("div", `position:absolute;left:${(bx.x - hb.x).toFixed(1)}px;top:${(bx.y - hb.y).toFixed(1)}px;width:${bx.w.toFixed(1)}px;height:${bx.h.toFixed(1)}px;z-index:12;pointer-events:none;display:flex;flex-direction:${side ? "row" : "column"};align-items:center;justify-content:center;gap:${(26 * k).toFixed(1)}px`, null, scene);
    // the calendar: cell size from the room (7 columns, 5 rows plus the weekday row)
    const calW = side ? bx.w * 0.58 : bx.w, gap = 8 * k, padC = 26 * k;
    const cw = (calW - padC * 2 - gap * 6) / 7;
    const roomH = (side ? bx.h : bx.h * (listOn ? 0.6 : 0.95)) - padC * 2 - 40 * k - gap * weeks - (title ? 72 * k : 0);
    const ch = Math.max(28 * k, Math.min(cw * 0.86, roomH / (weeks + 0.4)));
    const cal = mk("div", `width:${calW.toFixed(1)}px;box-sizing:border-box;padding:${padC.toFixed(1)}px;flex:none`, null, wrap);
    cal.className = "ml-panel";
    if (title) mk("div", `font:var(--x-head-weight) ${(46 * k).toFixed(1)}px/1.2 var(--x-head-font);color:var(--x-ink);margin-bottom:${(16 * k).toFixed(1)}px`, title, cal);
    const grid = mk("div", `display:grid;grid-template-columns:repeat(7, 1fr);gap:${gap.toFixed(1)}px`, null, cal);
    const WD = rtl ? ["س", "ح", "ن", "ث", "ر", "خ", "ج"] : ["S", "M", "T", "W", "T", "F", "S"];
    const dayFs = Math.max(14, Math.min(ch * 0.34, 30 * k));
    for (const d of WD) mk("div", `text-align:center;font:var(--x-head-weight) ${dayFs.toFixed(1)}px var(--x-head-font);color:var(--x-dim);padding-bottom:${(4 * k).toFixed(1)}px`, d, grid);
    const cells = {};
    for (let i = 0; i < weeks * 7; i++) {
      const day = i - lead + 1, real = day >= 1 && day <= days;
      const c = mk("div", `height:${ch.toFixed(1)}px;border-radius:${Math.min(16 * k, ch * 0.24).toFixed(1)}px;background:var(--x-panel-2);display:flex;align-items:flex-start;justify-content:flex-start;padding:${(6 * k).toFixed(1)}px ${(10 * k).toFixed(1)}px;box-sizing:border-box;font:var(--x-body-weight) ${dayFs.toFixed(1)}px var(--x-head-font);color:var(--x-ink);transform-origin:50% 50%;${real ? "" : "opacity:.45"}`, real ? N(day) : "", grid);
      if (real) cells[day] = c;
    }
    const KC = ["var(--x-accent)", "var(--x-good)", "var(--x-accent-2)", "var(--x-bad)", "var(--x-ink)", "color-mix(in srgb, var(--x-accent) 55%, var(--x-good))"];
    const colourOf = (i) => (p.colour_by === "single" ? "var(--x-accent)" : KC[i % KC.length]);
    // the list rows
    const rows = [];
    if (listOn) {
      const list = mk("div", `display:flex;flex-direction:column;gap:${(12 * k).toFixed(1)}px;${side ? `flex:1 1 0;min-width:0` : `width:${calW.toFixed(1)}px`}`, null, wrap);
      const maxRows = side ? 6 : Math.max(1, Math.min(dates.length, Math.floor((bx.h - (ch * (weeks + 0.4) + padC * 2 + 40 * k) - 26 * k) / (76 * k + 12 * k))));
      dates.forEach((d, i) => {
        if (i >= maxRows || !names[i]) return;
        const r = mk("div", `display:flex;align-items:center;gap:${(18 * k).toFixed(1)}px;padding:${(12 * k).toFixed(1)}px ${(22 * k).toFixed(1)}px;border-radius:${(22 * k).toFixed(1)}px`, null, list);
        r.className = "ml-panel";
        mk("span", `flex:none;width:${(16 * k).toFixed(1)}px;height:${(52 * k).toFixed(1)}px;border-radius:${(8 * k).toFixed(1)}px;background:${colourOf(i)}`, null, r);
        mk("span", `font:var(--x-head-weight) ${(34 * k).toFixed(1)}px var(--x-head-font);color:var(--x-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis`, names[i], r);
        mk("span", `margin-inline-start:auto;font:var(--x-body-weight) ${(28 * k).toFixed(1)}px var(--x-mono-font);color:var(--x-dim)`, N(d), r);
        rows[i] = r;
      });
    }
    // timing: each date on its name's spoken word, else spread through the move
    const span = Math.max(0.6, end - 0.6 - (at + 0.5));
    const saidDate = (d) => (ctx.words || []).find((w) => w.t >= at && ML.plain(w.w).replace(/[٠-٩]/g, (x) => String(AR.indexOf(x))) === String(d));
    const times = dates.map((d, i) => { const fb = at + 0.5 + (i * span) / Math.max(1, dates.length), said = saidDate(d); return said ? Math.max(at + 0.4, said.t) : names[i] ? Math.max(at + 0.4, ctx.word(names[i].split(/\s+/)[0], fb)) : fb; });
    for (let i = 1; i < times.length; i++) times[i] = Math.max(times[i], times[i - 1] + 0.3);
    times.forEach((t) => ctx.sfx(t, "drop", 0.35));
    const from = ML.clamp(p.bounce_from, 1.1, 1.3);
    const back2 = (x) => { const c = 2, y = x - 1; return x <= 0 ? 0 : 1 + (c + 1) * y * y * y + c * y * y; };
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        wrap.style.visibility = t >= at - 1e-6 ? "visible" : "hidden";
        const ci = ML.out(t, at, at + 0.45);
        cal.style.opacity = (ci * (1 - leave)).toFixed(4);
        cal.style.translate = `0 ${((1 - ci) * 40 * k).toFixed(2)}px`;
        dates.forEach((d, i) => {
          const c = cells[d]; if (!c) return;
          const a = ML.lin(t, times[i], times[i] + 0.25);
          c.style.background = a > 0 ? `color-mix(in srgb, ${colourOf(i)} ${(a * 100).toFixed(1)}%, var(--x-panel-2))` : "var(--x-panel-2)";
          c.style.color = a > 0 ? `color-mix(in srgb, var(--x-accent-ink) ${(a * 100).toFixed(1)}%, var(--x-ink))` : "var(--x-ink)";
          const u = ML.lin(t, times[i], times[i] + 0.45);
          c.style.scale = t < times[i] || u >= 1 ? "none" : (from - (from - 1) * back2(u)).toFixed(4);
          c.style.position = t >= times[i] && u < 1 ? "relative" : "";
          c.style.zIndex = t >= times[i] && u < 1 ? "2" : "";
          const r = rows[i];
          if (r) { const ru = ML.out(t, times[i] + 0.05, times[i] + 0.4); r.style.opacity = (ru * (1 - leave)).toFixed(4); r.style.translate = `0 ${((1 - ru) * 20 * k).toFixed(2)}px`; }
        });
      },
    };
  },
});

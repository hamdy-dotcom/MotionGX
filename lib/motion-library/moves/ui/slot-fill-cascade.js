// Slots fill in a cascade: small content tags ("Reel", "Post", "Story"…) drop into calendar days one after another.
// Each tag sits absolutely at its cell's bottom (inset-inline 6, radius 10, a lavender tint of the accent behind the
// accent's own ink, 600 weight at a share of the cell), popping from scale 0.4 and y −30 to rest on back.out(1.6) in
// 0.55 s, one every `interval` seconds from 45 % of the line, a card-place sound on each (vol 0.25).
// Where the slots come from: a list target with three or more items gives its own items as the slots (each tag lands
// on an item's bottom edge); otherwise the move builds the month grid itself (a panel, the month name, seven weekday
// initials, 35 day cells) in the picture region and arrives the way the look moves. RTL lays the grid right to left
// and writes the days in Arabic digits.
// Source: MotionGX's own lib/studio-engine/assets/scenes.js — S.calendar, the `work` tags (pop from 0.4, y −30, every
// 0.12 s from 45 % of the voice line; casino card-place sounds).
ML.define({
  id: "ui.slot-fill-cascade",
  category: "ui",
  name: "Slots fill in a cascade",
  does: "Small content tags drop into calendar days one after another.",
  says: ["list", "step", "growth"],
  energy: 3,
  targets: ["label", "list"],
  duration: [1.4, 3],
  params: {
    interval: { type: "number", range: [0.08, 0.2], default: 0.12, unit: "s" },
    drop: { type: "number", range: [10, 50], default: 30, unit: "px" },
    count: { type: "number", range: [3, 12], default: 8 },
    lead: { type: "number", range: [0, 0.8], default: 0.45 }, // share of the line before the first tag lands
    kinds: { type: "text" }, // "Reel, Post, Story" — the tag words, cycled
    month: { type: "text" },
  },
  pairs: ["ui.status-badge-flip", "data.count-up", "text-in.punchline"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "card",
  source: { from: "own:lib/studio-engine/assets/scenes.js", license: "own", note: "S.calendar work tags: pop(from 0.4, y −30) every 0.12 s from 45 % of the line" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const digits = (n) => (rtl ? Number(n).toLocaleString("ar-EG") : String(n));
    const kinds = (p.kinds ? String(p.kinds).split(/[,،]/).map((s) => s.trim()).filter(Boolean) : null) || (rtl ? ["ريلز", "بوست", "ستوري", "بوست", "كاروسيل", "ريلز", "بوست", "ستوري"] : ["Reel", "Post", "Story", "Post", "Carousel", "Reel", "Post", "Story"]);
    const n = Math.round(p.count);

    // the slots: the target list's own items, or a month grid built here
    let slots = [], cal = null, unit = k;
    const items = el ? [...el.children].filter((c) => c.offsetWidth > 0) : [];
    if (items.length >= 3) {
      slots = items.slice(0, n);
      unit = Math.max(0.5, Math.min(...slots.map((s) => s.offsetHeight)) / 74);
    } else {
      const R = f.pic, w = Math.min(R.w, 940 * k);
      const cw = (w - 52 * k - 6 * 8 * k) / 7;
      const ch = Math.max(48 * k, Math.min(cw * (f.wide ? 0.62 : 0.88), (R.h - 200 * k) / 5.6));
      unit = cw / 118;
      cal = mk("div", `position:absolute;left:${(R.x + (R.w - w) / 2).toFixed(1)}px;top:${(R.y + Math.max(0, (R.h - (ch * 5 + 190 * k)) / 2)).toFixed(1)}px;width:${w.toFixed(1)}px;box-sizing:border-box;padding:${(26 * k).toFixed(1)}px;z-index:6;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:var(--x-radius);box-shadow:var(--x-shadow);color:var(--x-ink);`, host);
      cal.dir = rtl ? "rtl" : "ltr";
      const head = mk("div", `display:flex;justify-content:space-between;align-items:center;margin-bottom:${(18 * k).toFixed(1)}px;`, cal);
      mk("span", `font:var(--x-head-weight) ${(44 * k).toFixed(1)}px var(--x-head-font);`, head, p.month || (rtl ? "مارس" : "March"));
      mk("span", `font:var(--x-label-weight) ${(20 * k).toFixed(1)}px var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:${rtl ? "none" : "var(--x-label-case)"};color:var(--x-dim);`, head, rtl ? "خطة المحتوى" : "Content plan");
      const g = mk("div", `display:grid;grid-template-columns:repeat(7, 1fr);gap:${(8 * k).toFixed(1)}px;`, cal);
      (rtl ? ["س", "ح", "ن", "ث", "ر", "خ", "ج"] : ["S", "M", "T", "W", "T", "F", "S"]).forEach((d) => mk("div", `text-align:center;font:600 ${(24 * k).toFixed(1)}px var(--x-head-font);color:var(--x-dim);`, g, d));
      const cells = Array.from({ length: 35 }, (_, i) => mk("div", `height:${ch.toFixed(1)}px;border-radius:calc(var(--x-radius) * 0.5);background:var(--x-panel-2);padding:${(6 * k).toFixed(1)}px ${(10 * k).toFixed(1)}px;box-sizing:border-box;font:500 ${Math.max(14, 26 * unit).toFixed(1)}px var(--x-body-font);color:color-mix(in srgb, var(--x-ink) 75%, var(--x-panel));position:relative;`, g, i < 31 ? digits(i + 1) : ""));
      // spread the tagged days through the month like the source's 4, 6, 11, 13, 15, 20, 25, 29
      const base = [4, 6, 11, 13, 15, 20, 25, 29, 2, 8, 18, 22];
      const days = base.slice(0, n).sort((a, b) => a - b);
      slots = days.map((d) => cells[d - 1]);
    }

    // the tags, one per slot, at its bottom edge
    const tags = slots.map((cell, i) => {
      if (getComputedStyle(cell).position === "static") cell.style.position = "relative";
      const t = mk("div", `position:absolute;bottom:${(6 * unit).toFixed(1)}px;inset-inline:${(6 * unit).toFixed(1)}px;border-radius:${(10 * unit).toFixed(1)}px;background:color-mix(in srgb, var(--x-accent) 16%, var(--x-panel));color:var(--x-accent);font:600 ${Math.max(11, 20 * unit).toFixed(1)}px var(--x-body-font);text-align:center;padding:${(3 * unit).toFixed(1)}px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;z-index:2;opacity:0;`, cell, kinds[i % kinds.length]);
      t.dir = rtl ? "rtl" : "ltr";
      // an item too short to carry the tag without covering its words: the tag hangs just under it
      if (!cal && cell.offsetHeight < t.offsetHeight * 3) { t.style.bottom = "auto"; t.style.top = `calc(100% + ${(6 * unit).toFixed(1)}px)`; }
      return t;
    });

    // timing: the cascade starts at `lead` of the line, one tag per interval
    const span = Math.min(3, Math.max(0.6, end - at));
    // (a grid built here arrives first, so the first tag never lands before its calendar is up)
    let t0 = Math.max(at + (cal ? 0.45 : 0), at + span * p.lead);
    // a short slot: start sooner, then run closer together, so the last tag still lands before the grid leaves
    const lastBy = end - (cal ? 0.22 : 0) - 0.55, gaps = Math.max(1, tags.length - 1);
    if (t0 + gaps * p.interval > lastBy) t0 = Math.max(at + (cal ? 0.3 : 0), lastBy - gaps * p.interval);
    const gap = Math.max(0.04, Math.min(p.interval, (lastBy - t0) / gaps));
    const times = tags.map((_, i) => t0 + i * gap);
    times.forEach((t, i) => ctx.sfx(t, "card", 0.25 - (i % 2) * 0.03));
    const dropPx = p.drop * unit;

    return {
      draw(t) {
        if (cal) ML.show(cal, t, at, end - 0.22);
        tags.forEach((g, i) => {
          const a = times[i];
          if (t < a) { g.style.opacity = "0"; g.style.scale = "0.4"; g.style.translate = `0 ${(-dropPx).toFixed(2)}px`; return; }
          const u = ML.back(t, a, a + 0.55, 1.6), o = ML.out(t, a, a + 0.55);
          g.style.opacity = Math.min(1, o * 1.4).toFixed(4);
          g.style.scale = u >= 0.9999 && t >= a + 0.55 ? "none" : (0.4 + 0.6 * u).toFixed(4);
          g.style.translate = t >= a + 0.55 ? "none" : `0 ${(-(1 - u) * dropPx).toFixed(2)}px`;
        });
      },
    };
  },
});

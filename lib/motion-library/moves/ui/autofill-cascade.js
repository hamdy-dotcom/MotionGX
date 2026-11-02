// Auto-fill cascade: after a tap (the move's moment, or a spoken word) every row of a list gets its value in quick
// succession — at tap + 0.15 + k·0.1 the value appears and slides in 20 px from the reading start (opacity 0 → 1,
// x −20 → 0 over 0.3 s; mirrored in RTL). Each value's slot is reserved from the first frame (opacity only), so the
// rows never reflow while they fill. Optional check dots tick green on the same beat. Built alone it carries its own
// button, pressed on the tap; on a target the button is the `button` param, or another move's (a cursor's click).
// Source: MotionGX lib/studio-engine/assets/scenes.js S.plan ("وزّع تلقائي": days set + fromTo per row) (own).
ML.define({
  id: "ui.autofill-cascade",
  category: "ui",
  name: "Auto-fill cascade",
  does: "A button is tapped and values fill into every row in quick succession.",
  says: ["speed", "simplicity", "result"],
  energy: 3,
  targets: ["list", "label"],
  duration: [1, 3],
  params: {
    interval: { type: "number", range: [0.05, 0.15], default: 0.1, unit: "s" },
    direction: { type: "choice", options: ["from-start", "from-end"], default: "from-start" },
    offset: { type: "number", range: [10, 40], default: 20, unit: "px" },
    values: { type: "text", default: "" },
    check: { type: "bool", default: false },
    button: { type: "text", default: "" },
    word: { type: "text", default: "" },
  },
  pairs: ["ui.cursor-glide-click", "ui.checklist-tick"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "own:lib/studio-engine/assets/scenes.js#S.plan", license: "own" },
  setup(ctx) {
    const { p, at, end, rtl, f } = ctx;
    const doc = document;
    const mk = (tag, css, text, parent) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    let el = ctx.el, wrap = null;
    if (!el) {
      const host = mk("div", "position:absolute;left:var(--pic-x);top:var(--pic-y);width:var(--pic-w);height:var(--pic-h);display:flex;align-items:center;justify-content:center;z-index:4;background:var(--x-ground)", null, ctx.scene || ctx.stage);
      wrap = mk("div", `display:grid;gap:0.9em;width:80%;font-size:${ML.clamp(Math.min(f.W, f.H) * 0.032, 18, 40)}px`, null, host);
      el = mk("div", "display:grid;gap:0.6em", null, wrap);
      for (const x of rtl ? ["ريلز: إطلاق المنتج", "بوست: آراء العملا", "ستوري: كواليس"] : ["Reel: product launch", "Post: customer reviews", "Story: behind the scenes"]) mk("div", "background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * 0.6);padding:0.7em 1em;box-shadow:var(--x-shadow)", x, el);
    }
    const rows = [...el.children].filter((c) => c.textContent.trim());
    if (!rows.length) rows.push(el);
    const btnText = p.button || (wrap ? (rtl ? "وزّع تلقائي" : "Auto-schedule") : "");
    let btn = null;
    if (btnText) {
      btn = mk("div", "justify-self:center;width:fit-content;margin-top:0.5em;padding:0.55em 1.3em;border-radius:var(--x-radius-s);background:var(--x-accent);color:var(--x-accent-ink);font-weight:600;white-space:nowrap", btnText);
      (wrap || el).append(btn);
    }
    const given = String(p.values || "").split("|").map((s) => s.trim()).filter(Boolean);
    const days = given.length ? given : rtl ? ["السبت ٤", "الإثنين ٦", "الأربع ٨", "الجمعة ١٠", "الأحد ١٢", "التلات ١٤"] : ["Sat 4", "Mon 6", "Wed 8", "Fri 10", "Sun 12", "Tue 14"];
    const items = rows.map((r, i) => {
      const v = mk("span", "display:flex;align-items:center;gap:0.4em;margin-top:0.3em;font:var(--x-label-weight) 0.8em var(--x-mono-font);color:var(--x-accent);white-space:nowrap", null, r);
      let dot = null;
      if (p.check) dot = mk("i", "flex:none;width:0.7em;height:0.7em;border-radius:50%;border:2px solid var(--x-line);box-sizing:border-box", null, v);
      mk("span", null, days[i % days.length], v);
      return { v, dot };
    });
    const fb = at + (btn ? 0.4 : 0.1); // a button shows first, so its tap can be seen
    const tap = Math.min(end - 0.6, Math.max(at, p.word ? ctx.word(p.word, fb) : fb));
    const n = items.length;
    const times = items.map((_, i) => tap + 0.15 + (p.direction === "from-end" ? n - 1 - i : i) * p.interval);
    if (btn) ctx.sfx(tap, "tap", 0.35);
    times.forEach((tt, i) => (i === 0 || i === n - 1) && ctx.sfx(tt, "blip", 0.3));
    const sx = rtl ? 1 : -1;
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        if (wrap) wrap.style.opacity = (1 - leave).toFixed(4);
        if (btn) btn.style.scale = (1 - 0.06 * ML.pulse(t, tap, 0.05, 0.14)).toFixed(4);
        items.forEach((it, i) => {
          const u = ML.out(t, times[i], times[i] + 0.3);
          it.v.style.opacity = (u * (wrap ? 1 : 1 - leave)).toFixed(4);
          it.v.style.translate = `${(sx * p.offset * (1 - u)).toFixed(2)}px 0`;
          if (it.dot) {
            const c = ML.lin(t, times[i] + 0.1, times[i] + 0.3);
            it.dot.style.background = `color-mix(in srgb, var(--x-good) ${(c * 100).toFixed(1)}%, transparent)`;
            it.dot.style.borderColor = `color-mix(in srgb, var(--x-good) ${(c * 100).toFixed(1)}%, var(--x-line))`;
          }
        });
      },
    };
  },
});

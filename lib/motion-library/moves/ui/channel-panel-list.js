// Side panel with timeline list: a tall panel (200 × 300 in the reference) with a coloured header bar — title on one side,
// a rounded time chip on the other that ticks with the clock — a light body with a vertical line and node dots, and a
// band of hazard stripes at its foot. It slides in from the reading end (x +40 px → 0, 0.3 s); items then slot in at their
// nodes one by one, each row's height expanding 0 → full (0.15 s) while its dot pops. The items are the list target's own
// entries when it has them.
// Source: prompt-motion 0xnfrith "opus 5.5 animation created" (reference only — our own rebuild).
ML.define({
  id: "ui.channel-panel-list",
  category: "ui",
  name: "Side panel with timeline list",
  does: "A tall titled panel with a ticking time chip and a vertical timeline receives items one by one as they arrive.",
  says: ["list", "step", "tech"],
  energy: 2,
  targets: ["list", "card", "screen"],
  duration: [1.5, 5],
  params: {
    title: { type: "text", default: "CHANNEL" },
    items: { type: "number", range: [2, 6], default: 3 },
    hazard_stripes: { type: "bool", default: true },
    sync: { type: "choice", options: ["spoken", "stagger"], default: "stagger" },
  },
  pairs: ["ui.connector-message-delivery", "data.live-value-tick"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:0xnfrith-opus-5-5-animation-created", license: "reference", note: "our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    // items: the list target's entries first, then defaults
    const src = ctx.el && ctx.el !== ctx.stage ? [...ctx.el.children].map((c) => c.textContent.trim()).filter(Boolean) : [];
    const DEF = rtl ? ["وصل طلب جديد", "تم تأكيد الدفع", "خرج للتوصيل", "وصل للعميل", "تقييم ٥ نجوم", "طلب متكرر"] : ["New order in", "Payment confirmed", "Out for delivery", "Delivered", "5-star review", "Repeat order"];
    // every entry the list target has (up to six) gets a row; `items` sets the count only when there is no list
    const n = src.length ? Math.min(6, src.length) : Math.round(ML.clamp(p.items, 2, 6));
    const items = Array.from({ length: n }, (_, i) => src[i] || DEF[i]);
    const hideTarget = src.length > 0 ? ctx.el : null;

    // panel 2:3, fits the picture region
    const R = f.pic;
    const ratio = f.wide ? 1.1 : 1.5; // on a wide frame the panel opens up so the rows stay readable at the same height
    const ph = Math.min(R.h * 0.94, (R.w * 0.86) * ratio, 960 * k), pw = ph / ratio;
    const u = ph / 300; // reference px → stage px
    const layer = mk("div", `position:absolute;left:${R.x + (R.w - pw) / 2}px;top:${R.y + (R.h - ph) / 2}px;width:${pw}px;height:${ph}px;pointer-events:none;z-index:6;`, host);
    const panel = mk("div", `position:absolute;inset:0;display:flex;flex-direction:column;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(min(var(--x-radius), ${(10 * u).toFixed(1)}px));box-shadow:var(--x-shadow);overflow:hidden;`, layer);
    panel.setAttribute("dir", rtl ? "rtl" : "ltr");
    const head = mk("div", `flex:none;height:${28 * u}px;padding:0 ${10 * u}px;display:flex;align-items:center;justify-content:space-between;background:var(--x-accent);color:var(--x-accent-ink);`, panel);
    mk("div", `font:var(--x-label-weight) ${(11 * u).toFixed(1)}px ${rtl ? "var(--x-body-font)" : "var(--x-label-font)"};letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:var(--x-label-case);`, head, p.title === "CHANNEL" && rtl ? "القناة" : p.title || "CHANNEL");
    const chip = mk("div", `font:600 ${(8.5 * u).toFixed(1)}px var(--x-mono-font);padding:${2.5 * u}px ${7 * u}px;border-radius:var(--x-radius-s);background:var(--x-panel);color:var(--x-ink);direction:ltr;`, head, "09:41:00");
    const body = mk("div", `position:relative;flex:1;padding:${14 * u}px ${12 * u}px;`, panel);
    const lineX = 7 * u;
    const rail = mk("div", `position:absolute;top:${14 * u}px;bottom:${14 * u}px;inset-inline-start:${12 * u + lineX}px;width:${Math.max(2, 1.5 * u)}px;background:var(--x-line);transform-origin:50% 0;`, body);
    // rows share the body's height (24 + 8 in the reference at six rows), so a few rows don't leave a blank panel
    const bodyU = 300 - 28 - 28 - (p.hazard_stripes ? 12 : 0), perU = Math.min(54, bodyU / n);
    const rowH = perU * 0.8 * u, gapH = perU * 0.2 * u, fsU = f.wide ? 14 : 11.5;
    const rows = items.map((txt, i) => {
      const row = mk("div", `position:relative;height:0;overflow:hidden;margin-bottom:0;`, body);
      const inner = mk("div", `position:absolute;inset-inline-start:${lineX * 2 + 8 * u}px;inset-inline-end:0;top:0;height:${rowH}px;display:flex;align-items:center;gap:${6 * u}px;box-sizing:border-box;padding:0 ${7 * u}px;border-radius:${4 * u}px;background:var(--x-panel-2);border:1px solid var(--x-line);`, row);
      mk("span", `font:500 ${(fsU * 0.78 * u).toFixed(1)}px var(--x-mono-font);color:var(--x-dim);direction:ltr;flex:none;`, inner, `+${String(i * 3 + 2).padStart(2, "0")}s`);
      mk("span", `font:500 ${(fsU * u).toFixed(1)}px var(--x-body-font);color:var(--x-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`, inner, txt);
      const dot = mk("div", `position:absolute;top:${rowH / 2 - 4 * u}px;inset-inline-start:${12 * u + lineX - 4 * u + Math.max(2, 1.5 * u) / 2}px;width:${8 * u}px;height:${8 * u}px;box-sizing:border-box;border-radius:50%;background:var(--x-accent);border:${1.5 * u}px solid var(--x-panel);box-shadow:0 0 0 ${1 * u}px var(--x-accent);`, body);
      return { row, inner, dot, i };
    });
    let hz = null;
    if (p.hazard_stripes) {
      const sw = 6 * u;
      hz = mk("div", `flex:none;height:${12 * u}px;background:repeating-linear-gradient(-45deg, var(--x-bad) 0 ${sw}px, var(--x-ink) ${sw}px ${sw * 2}px);`, panel);
    }

    // timing: in at `at`, items spread to end − 0.6 (or on their spoken words)
    const tIn = at, tFirst = at + 0.45, tLast = Math.max(Math.min(tFirst + 0.2 * (n - 1), end - 0.5), end - 0.7);
    const times = items.map((txt, i) => {
      const base = tFirst + (n > 1 ? (i * (tLast - tFirst)) / (n - 1) : 0);
      return p.sync === "spoken" ? Math.max(tFirst, ctx.word(txt.split(/\s+/)[0], base)) : base;
    });
    const minGap = Math.min(0.18, (end - 0.5 - tFirst) / Math.max(1, n - 1));
    for (let i = 1; i < n; i++) times[i] = Math.max(times[i], times[i - 1] + minGap);
    ctx.sfx(tIn, "whoosh.soft", 0.25);
    times.forEach((t) => ctx.sfx(t, "blip", 0.35));
    const base = 9 * 3600 + 41 * 60;
    const fmt = (s) => [Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60].map((x) => String(x).padStart(2, "0")).join(":");

    return {
      draw(t) {
        const vis = t >= tIn - 0.01;
        layer.style.visibility = vis ? "visible" : "hidden";
        if (hideTarget) hideTarget.style.visibility = vis && t < end ? "hidden" : "";
        if (!vis) return;
        const sIn = ML.out(t, tIn, tIn + 0.3), leave = ML.lin(t, end - 0.3, end);
        layer.style.opacity = (Math.min(1, sIn * 1.5) * (1 - leave)).toFixed(4);
        layer.style.translate = `${((1 - sIn) * 40 * u * 0.5 * (rtl ? -1 : 1)).toFixed(2)}px 0`;
        chip.textContent = fmt(base + Math.floor(Math.max(0, t - tIn)));
        rail.style.scale = `1 ${ML.out(t, tIn + 0.1, tIn + 0.5).toFixed(4)}`;
        let y = 0;
        rows.forEach(({ row, inner, dot, i }) => {
          const e = ML.out(t, times[i], times[i] + 0.15);
          const h = rowH * e, mb = gapH * e;
          row.style.height = h.toFixed(2) + "px";
          row.style.marginBottom = mb.toFixed(2) + "px";
          inner.style.opacity = ML.lin(t, times[i] + 0.05, times[i] + 0.2).toFixed(4);
          inner.style.translate = `${((1 - ML.out(t, times[i], times[i] + 0.25)) * 10 * u * (rtl ? -1 : 1)).toFixed(2)}px 0`;
          const pop = t < times[i] ? 0 : ML.back(t, times[i], times[i] + 0.25, 2.2);
          dot.style.top = (14 * u + y + rowH / 2 - 4 * u).toFixed(2) + "px";
          dot.style.scale = Math.max(0, pop).toFixed(4);
          y += h + mb;
        });
      },
    };
  },
});

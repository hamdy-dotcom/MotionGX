// Ledger rows reveal: a receipt panel fades up 50 px in 0.4 s; its rows (name on the reading-start side, value on the
// other, a 2 px dashed hairline under each, ~4.5% of the short side tall) each fade in rising 20 px over 0.35 s at
// +0.45 s + k · interval with a soft rollover tap; the last row is the bold total, its value in the accent. The plan
// variant is MotionGX's plan list: each row its own panel card, fading in rising 40 px over 0.4 s every 0.28 s with a
// card-place sound. On a list the list's items become the rows; on a line that line titles the receipt (either way the
// target steps aside and the ledger sits in the picture region); values come from `values` ("120 | 80 | 45"), else
// seeded round amounts, and the total sums them.
// Source: MotionGX lib/studio-engine/assets/scenes.js (S.price, S.plan, S.compare) — our own.
ML.define({
  id: "data.ledger-rows",
  category: "data",
  name: "Ledger rows reveal",
  does: "A receipt's rows appear one under another, ending in a bold total.",
  says: ["list", "money", "step"],
  energy: 2,
  targets: ["list", "line"],
  duration: [1.5, 4],
  params: {
    interval: { type: "number", range: [0.25, 0.35], default: 0.32, unit: "s" },
    distance: { type: "number", range: [14, 40], default: 20, unit: "px" },
    total_row: { type: "bool", default: true },
    variant: { type: "choice", options: ["receipt", "plan"], default: "receipt" },
    rows: { type: "number", range: [2, 6], default: 3 },
    items: { type: "text", default: "" },
    values: { type: "text", default: "" },
    total_label: { type: "text", default: "" },
    unit: { type: "text", default: "" },
  },
  pairs: ["data.odometer", "text-emphasis.accent-word"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "own:lib/studio-engine/assets/scenes.js", license: "own", note: "S.price, S.plan, S.compare" },
  setup(ctx) {
    const { p, at, end, rtl, f, stage } = ctx;
    const el = ctx.el === stage ? null : ctx.el; // on the stage it builds its own place, and never touches what's there
    const mk = (tag, css, parent, text) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const u = Math.min(f.W, f.H) / 1080;
    const split = (s) => String(s || "").split("|").map((x) => x.trim()).filter(Boolean);
    // the rows' names: params, else the list's items, else a sample receipt
    const isList = el && el.children.length > 1;
    let names = split(p.items);
    if (!names.length && isList) names = [...el.children].map((c) => (c.textContent || "").trim()).filter(Boolean);
    if (!names.length) names = rtl ? ["الاشتراك", "التوصيل", "الضريبة", "الخدمة", "الإضافات", "التأمين"] : ["Subscription", "Delivery", "Tax", "Service", "Extras", "Insurance"];
    const n = (split(p.items).length || isList) ? Math.min(6, names.length) : Math.round(ML.clamp(p.rows, 2, 6));
    names = Array.from({ length: n }, (_, i) => names[i % names.length]);
    const given = split(p.values);
    const nums = names.map((_, i) => {
      const g = given[i];
      if (g != null) { const v = parseFloat(g.replace(/[^\d.-]/g, "")); return { text: g, v: Number.isFinite(v) ? v : 0 }; }
      const v = Math.round((20 + ML.rnd(i, 13) * 180) / 5) * 5;
      return { text: String(v), v };
    });
    const withUnit = (s) => (p.unit ? (rtl ? s + " " + p.unit : p.unit + s) : s);
    const sum = Math.round(nums.reduce((a, b) => a + b.v, 0) * 100) / 100;
    const totalLabel = p.total_label || (rtl ? "الإجمالي" : "Total");
    // where: a panel centred in the picture region
    const scene = ctx.scene || stage, hb = ctx.box(scene);
    const plan = p.variant === "plan";
    const rowsAll = n + (p.total_row ? 1 : 0);
    const fsRow = Math.min(44 * u, (f.pic.h * 0.62) / (rowsAll * (plan ? 2.4 : 2.1)));
    const padRow = fsRow * (plan ? 0.55 : 0.5);
    const w = Math.min(f.pic.w * 0.9, f.wide ? f.W * 0.5 : 880 * u);
    const estH = rowsAll * (fsRow * 1.25 + padRow * 2 + (plan ? 18 * u : 0)) + 120 * u;
    const cx = f.pic.x + f.pic.w / 2, cy = f.pic.y + f.pic.h / 2;
    const top = ML.clamp(cy - estH / 2, f.safe.y, f.safe.y + f.safe.h - estH);
    const panel = mk("div", `position:absolute;left:${(cx - w / 2 - hb.x).toFixed(1)}px;top:${(top - hb.y).toFixed(1)}px;width:${w.toFixed(1)}px;box-sizing:border-box;z-index:20;visibility:hidden;direction:${rtl ? "rtl" : "ltr"};${plan ? `display:flex;flex-direction:column;gap:${(18 * u).toFixed(1)}px` : `padding:${(44 * u).toFixed(1)}px ${(54 * u).toFixed(1)}px`}`, scene);
    if (!plan) panel.className = "ml-panel";
    const head = !plan && el && !isList ? (el.textContent || "").trim() : "";
    if (head) mk("div", `font:var(--x-label-weight) ${(22 * u).toFixed(1)}px var(--x-label-font);letter-spacing:${rtl ? "0" : "var(--x-label-track)"};text-transform:${rtl ? "none" : "var(--x-label-case)"};color:var(--x-dim);margin-bottom:${(8 * u).toFixed(1)}px`, panel, head);
    const row = (a, b, isTotal) => {
      const r = mk("div", `display:flex;justify-content:space-between;align-items:center;gap:${(20 * u).toFixed(1)}px;font:${isTotal ? 700 : 500} ${(isTotal ? fsRow * 1.06 : fsRow).toFixed(1)}px/1.25 var(--x-head-font);color:var(--x-ink)`, panel);
      if (plan) { r.className = "ml-panel"; r.style.padding = `${padRow.toFixed(1)}px ${(padRow * 1.2).toFixed(1)}px`; r.style.borderRadius = "var(--x-radius)"; }
      else r.style.padding = `${padRow.toFixed(1)}px 0`;
      if (!plan && !isTotal) r.style.borderBottom = "2px dashed var(--x-line)";
      if (isTotal && !plan) r.style.paddingTop = `${(padRow * 1.2).toFixed(1)}px`;
      mk("span", "min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap", r, a);
      const v = mk("span", `white-space:nowrap;font-variant-numeric:tabular-nums;direction:${rtl && (p.unit || ML.ARABIC.test(b)) ? "rtl" : "ltr"};unicode-bidi:isolate;color:${isTotal ? "var(--x-accent)" : "var(--x-ink)"};font-weight:${isTotal ? 800 : 600}`, r, b);
      if (isTotal && plan) { r.style.background = "var(--x-accent)"; r.style.color = "var(--x-accent-ink)"; v.style.color = "var(--x-accent-ink)"; }
      return r;
    };
    const rows = nums.map((x, i) => row(names[i], withUnit(x.text), false));
    if (p.total_row) rows.push(row(totalLabel, withUnit(sum.toLocaleString("en-US")), true));
    // centred on what it actually measures
    const realH = panel.offsetHeight;
    panel.style.top = `${(ML.clamp(cy - realH / 2, f.safe.y, Math.max(f.safe.y, f.safe.y + f.safe.h - realH)) - hb.y).toFixed(1)}px`;
    // the target (a list, or the line that titles the receipt) steps aside while the ledger holds the stage
    const hideList = !!el && (isList || !!head);
    const step = plan ? 0.28 : ML.clamp(p.interval, 0.25, 0.35);
    const first = at + (plan ? 0.15 : 0.45);
    const room = Math.max(0.3, end - 0.6 - first);
    const gapS = Math.min(step, room / Math.max(1, rows.length - 1));
    const times = rows.map((_, k) => first + k * gapS);
    const dist = (plan ? 40 : ML.clamp(p.distance, 14, 40)) * u;
    const rise = plan ? 0.4 : 0.35;
    times.forEach((t, k) => ctx.sfx(t, k === rows.length - 1 && p.total_row ? "pop.soft" : plan ? "card" : "tap", plan ? 0.3 : 0.25));
    const p2o = (t, a, d) => 1 - Math.pow(1 - ML.lin(t, a, a + d), 2);
    return {
      draw(t) {
        if (t < at - 1e-6) { panel.style.visibility = "hidden"; if (hideList) el.style.visibility = ""; return; }
        panel.style.visibility = "visible";
        if (hideList) el.style.visibility = "hidden";
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        const e = plan ? 1 : p2o(t, at, 0.4);
        panel.style.opacity = (e * (1 - leave)).toFixed(4);
        panel.style.translate = `0 ${((1 - e) * 50 * u).toFixed(2)}px`;
        rows.forEach((r, k) => {
          const q = p2o(t, times[k], rise);
          r.style.opacity = q.toFixed(4);
          r.style.translate = `0 ${((1 - q) * dist).toFixed(2)}px`;
        });
      },
    };
  },
});

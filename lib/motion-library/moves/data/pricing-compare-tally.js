// Pricing compare tally: pay-per-use against a flat plan. Left, under a tiny caps label, a priced line per item is
// added on each beat (fade + 6 px rise, 0.25 s) and the total in a big light serif counts up to n × price (0.35 s
// power2.out, tabular). Right, an outlined accent card with the plan's big serif price, unchanged, and an accent sub-
// line "X per item" recomputed as plan / n on each beat (the number rolls). Past break-even a pale good-coloured note
// slides down under the card (height 0 → its own, 0.3 s): "From 2 the plan pays for itself. You're at n." Both blocks
// unblur from 8 px as they enter. Rebuilt as our own code from the reference's technique.
// Source: prompt-motion thayto-dev-tutorial-do-gabrielbuzziv-o (reference).
ML.define({
  id: "data.pricing-compare-tally",
  category: "data",
  name: "Per-unit list versus a flat plan",
  does: "A left column adds a priced line per item and its total climbs, while the flat plan's per-unit cost falls until a note says it has paid off.",
  says: ["money", "proof", "choice", "before-after"],
  energy: 3,
  targets: ["number", "card", "list"],
  duration: [3, 8],
  params: {
    units: { type: "number", range: [3, 12], default: 6 },
    break_even: { type: "number", range: [1, 10], default: 2 },
    layout: { type: "choice", options: ["auto", "side-by-side", "stacked"], default: "auto" },
    currency: { type: "text", default: "$" },
    unit_price: { type: "number", range: [0.5, 500], default: 7.8 },
    plan_price: { type: "number", range: [0, 5000], default: 0 },
    item_label: { type: "text", default: "" },
  },
  pairs: ["data.odometer", "data.price-split"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:thayto-dev-tutorial-do-gabrielbuzziv-o", license: "reference", note: "technique rebuilt as our own DOM code" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, text, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const parent = ctx.scene || ctx.stage;
    const asBox = el && el !== ctx.stage && el.offsetHeight > 420 * k && el.offsetWidth > 700 * k;
    if (asBox && getComputedStyle(el).position === "static") el.style.position = "relative";
    const host = asBox
      ? mk("div", "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:4;background:var(--x-ground);border-radius:inherit", null, el)
      : mk("div", "position:absolute;left:var(--pic-x);top:var(--pic-y);width:var(--pic-w);height:var(--pic-h);z-index:4;background:var(--x-ground);display:flex;align-items:center;justify-content:center", null, parent);
    const BW = asBox ? el.clientWidth : f.pic.w, BH = asBox ? el.clientHeight : f.pic.h;
    const units = Math.round(ML.clamp(p.units, 3, 12)), unit = p.unit_price;
    // a given plan price decides the break-even (the note must tell the truth); otherwise break_even decides the price
    const be = p.plan_price > 0 ? Math.max(1, Math.ceil(p.plan_price / unit)) : Math.round(ML.clamp(p.break_even, 1, 10));
    const plan = p.plan_price > 0 ? p.plan_price : +(unit * Math.max(0.7, be - 0.3)).toFixed(2);
    const cur = p.currency || "";
    const money = (v) => `${cur}${v.toFixed(2)}`;
    const L = rtl
      ? { left: "الدفع بالقطعة", item: p.item_label || "عنصر", total: "الإجمالي", plan: "الخطة · بلا حدود", per: "للعنصر", mo: "/شهر", note: (n) => `من ${be} الخطة بتوفّر عليك. إنت عند ${n}.` }
      : { left: "Pay per item", item: p.item_label || "Item", total: "Total", plan: "Plan · unlimited", per: "per item", mo: "/mo", note: (n) => `From ${be} the plan pays for itself. You're at ${n}.` };
    const stacked = p.layout === "stacked" || (p.layout === "auto" && f.tall);
    const u = k * (stacked && f.tall ? 1.4 : 1); // a tall frame gets the whole width per block: the type can be read on a phone
    const num = "direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums;white-space:nowrap";
    const label = `font:var(--x-label-weight) ${(24 * u).toFixed(1)}px var(--x-label-font);letter-spacing:var(--x-label-track);text-transform:var(--x-label-case);color:var(--x-dim)`;
    const wrap = mk("div", `display:flex;flex-direction:${stacked ? "column" : "row"};gap:${(56 * k).toFixed(1)}px;flex:none;width:${Math.min(BW * 0.94, 1400 * k).toFixed(1)}px;align-items:${stacked ? "stretch" : "flex-start"}`, null, host);
    // left: the per-item list and its total
    const left = mk("div", "flex:1;min-width:0;display:flex;flex-direction:column", null, wrap);
    const lab = mk("div", label, L.left, left);
    if (rtl) lab.style.letterSpacing = "0";
    const availH = BH * (stacked ? (f.tall ? 0.42 : 0.34) : 0.56);
    const rowH = Math.min(52 * u, availH / units), rowF = Math.min(30 * u, rowH * 0.7);
    const list = mk("div", `margin-top:${(18 * u).toFixed(1)}px;height:${(rowH * units).toFixed(1)}px`, null, left);
    const rows = Array.from({ length: units }, (_, i) => {
      const r = mk("div", `display:flex;align-items:baseline;gap:${(10 * k).toFixed(1)}px;height:${rowH.toFixed(1)}px;font:400 ${rowF.toFixed(1)}px var(--x-body-font);color:var(--x-ink);opacity:0`, null, list);
      mk("span", "white-space:nowrap", `${L.item} ${i + 1}`, r);
      mk("span", `flex:1;border-bottom:${Math.max(1, 1.5 * k).toFixed(1)}px dotted var(--x-line);translate:0 -${(4 * k).toFixed(1)}px`, null, r);
      mk("span", num + ";color:var(--x-dim)", money(unit), r);
      return r;
    });
    const tot = mk("div", `display:flex;align-items:baseline;justify-content:space-between;gap:${(16 * k).toFixed(1)}px;margin-top:${(18 * k).toFixed(1)}px;border-top:var(--x-edge) solid var(--x-line);padding-top:${(14 * k).toFixed(1)}px`, null, left);
    mk("span", `font:var(--x-body-weight) ${(28 * u).toFixed(1)}px var(--x-body-font);color:var(--x-dim)`, L.total, tot);
    const total = mk("span", `font:300 ${(84 * u).toFixed(1)}px/1 var(--x-serif-font);color:var(--x-ink);${num}`, money(0), tot);
    // right: the flat plan card, its per-item line, and the break-even note
    const right = mk("div", "flex:1.1;min-width:0;display:flex;flex-direction:column", null, wrap);
    const cardEl = mk("div", `border:${Math.max(1, 1.5 * k).toFixed(1)}px solid var(--x-accent);background:color-mix(in srgb, var(--x-accent) 7%, var(--x-panel));border-radius:min(var(--x-radius), ${(18 * k).toFixed(1)}px);padding:${(30 * u).toFixed(1)}px`, null, right);
    const plab = mk("div", label + ";color:var(--x-accent)", L.plan, cardEl);
    if (rtl) plab.style.letterSpacing = "0";
    const pr = mk("div", `display:flex;align-items:baseline;gap:${(10 * k).toFixed(1)}px;margin-top:${(14 * k).toFixed(1)}px`, null, cardEl);
    const planNum = mk("span", `font:400 ${(96 * u).toFixed(1)}px/1 var(--x-serif-font);color:var(--x-ink);${num}`, money(plan), pr);
    const moEl = mk("span", `font:var(--x-body-weight) ${(26 * u).toFixed(1)}px var(--x-body-font);color:var(--x-dim);white-space:nowrap`, L.mo, pr);
    const perLine = mk("div", `margin-top:${(16 * k).toFixed(1)}px;font:600 ${(32 * u).toFixed(1)}px var(--x-body-font);color:var(--x-accent)`, null, cardEl);
    const perNum = mk("span", num, money(plan), perLine);
    mk("span", null, " " + L.per, perLine);
    const noteBox = mk("div", "overflow:hidden;height:0", null, right);
    const note = mk("div", `margin-top:${(16 * k).toFixed(1)}px;padding:${(18 * k).toFixed(1)}px ${(22 * k).toFixed(1)}px;border-radius:min(var(--x-radius), ${(14 * k).toFixed(1)}px);background:color-mix(in srgb, var(--x-good) 13%, var(--x-panel));color:color-mix(in srgb, var(--x-good) 70%, var(--x-ink));font:500 ${(28 * u).toFixed(1)}px/1.35 var(--x-body-font)`, L.note(be + 1), noteBox);
    const noteH = note.offsetHeight + 16 * k;
    // the biggest numbers it will show must fit their column, and the whole block (note open) the region
    total.textContent = money(unit * units);
    ML.fit(total, Math.max(40, left.clientWidth - tot.firstElementChild.offsetWidth - 16 * k));
    ML.fit(planNum, Math.max(40, cardEl.clientWidth - 60 * u - moEl.offsetWidth - 10 * k));
    noteBox.style.height = noteH + "px";
    const fitS = Math.min(1, (BH * 0.97) / wrap.offsetHeight);
    if (fitS < 1) wrap.style.scale = fitS.toFixed(4);
    noteBox.style.height = "0";
    // beats: one item per beat across the span
    const t0 = at + 0.6, gap = ML.clamp((end - 0.5 - t0) / units, 0.22, 0.6);
    const times = rows.map((_, i) => t0 + i * gap);
    times.forEach((tt, i) => { if (gap >= 0.3 || i % 2 === 0) ctx.sfx(tt, "blip", 0.3); });
    const tNote = be < units ? times[be] : Infinity;
    if (tNote < Infinity) ctx.sfx(tNote + 0.05, "success", 0.3);
    return {
      draw(t) {
        ML.show(host, t, at, end - 0.22);
        const e = ML.out(t, at, at + 0.5);
        for (const b of [left, right]) { b.style.filter = e < 1 ? `blur(${((1 - e) * 8).toFixed(2)}px)` : "none"; b.style.opacity = e.toFixed(4); }
        let n = 0;
        rows.forEach((r, i) => {
          const u = ML.lin(t, times[i], times[i] + 0.25);
          r.style.opacity = u.toFixed(4);
          r.style.translate = `0 ${((1 - u) * 6 * k).toFixed(2)}px`;
          if (t >= times[i]) n = i + 1;
        });
        // the total and the per-item cost roll from their last value to the new one
        const tn = n ? times[n - 1] : 0, r = n ? ML.out(t, tn, tn + 0.35) : 1; // power2.out
        total.textContent = money(n ? unit * (n - 1 + r) : 0);
        const prevPer = n > 1 ? plan / (n - 1) : plan, nowPer = n ? plan / n : plan;
        perNum.textContent = money(prevPer + (nowPer - prevPer) * r);
        const shown = t >= tNote;
        noteBox.style.height = (shown ? noteH * ML.ease(t, tNote, tNote + 0.3) : 0).toFixed(2) + "px";
        note.textContent = L.note(Math.max(n, be + 1));
      },
    };
  },
});

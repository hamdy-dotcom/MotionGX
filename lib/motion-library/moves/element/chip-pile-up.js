// Chips pop in and pile up in rows: small tag chips (panel fill, small radius, a 1 px shadow, mono type in a cycling
// accent colour) pop in one by one — scale 0.6 → 1, y −12 → 0, rotation ±6° → ±2°, back.out(1.8) in 0.3 s — at seeded,
// hand-placed x offsets, filling a row and then starting the next one on top of it (or below it), so the pile
// grows. The gap between pops runs 0.2 s → 0.12 s when accelerating. Content: code tokens, hashtags, feature names or
// small logo marks. Rows fill in the reading direction (right to left in Arabic). A soft pop about every few chips.
// Source: prompt-motion "lexnlin-6161a6" (reference only — rebuilt as our own code).
ML.define({
  id: "element.chip-pile-up",
  category: "element",
  name: "Chips pop in and pile up in rows",
  does: "Small tag chips pop in at loose positions and accumulate into growing rows, like a pile building up.",
  says: ["list", "growth", "tech", "scale"],
  energy: 3,
  targets: ["list", "label"],
  duration: [1.5, 4],
  params: {
    content: { type: "choice", options: ["code", "tags", "features", "logos"], default: "tags" },
    direction: { type: "choice", options: ["up", "down"], default: "up" },
    count: { type: "number", range: [6, 30], default: 14 },
    accelerate: { type: "bool", default: true },
    backdrop: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "data.odometer", "transition.scatter-exit"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "prompt-motion:lexnlin-6161a6", license: "reference", note: "technique rebuilt as our own code" },
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

    const n = Math.round(ML.clamp(p.count, 6, 30));
    const SETS = {
      code: ["const", "await", "fetch()", "=>", "return", "async", "<div>", "import", "useState", "{ }", "map()", "JSON", "git push", "npm i", "export", "if ()", "null", "try", "props", "for", "class", "</>", "SELECT *", "deploy", "202 OK", "λ", "&&", "type", "yield", "Promise"],
      tags: rtl
        ? ["#تصميم", "#نمو", "#تسويق", "#مبيعات", "#ذكاء_اصطناعي", "#منتج", "#فريق", "#بيانات", "#عملاء", "#إطلاق", "#محتوى", "#تجربة", "#سرعة", "#أمان", "#تحليلات", "#دفع", "#تطبيق", "#ويب", "#فكرة", "#جودة", "#خطة", "#بحث", "#هوية", "#إعلان", "#شراكة", "#تواصل", "#ميزانية", "#نتائج", "#تقارير", "#دعم"]
        : ["#design", "#growth", "#marketing", "#sales", "#AI", "#product", "#team", "#data", "#customers", "#launch", "#content", "#UX", "#speed", "#security", "#analytics", "#payments", "#mobile", "#web", "#ideas", "#quality", "#roadmap", "#research", "#brand", "#ads", "#partners", "#community", "#budget", "#results", "#reports", "#support"],
      features: rtl
        ? ["فواتير", "مرتبات", "تقارير", "مخزون", "عملاء", "مدفوعات", "ضرايب", "مصروفات", "فريق", "صلاحيات", "إشعارات", "تطبيق", "API", "تصدير", "لوحة", "جداول", "عقود", "مواعيد", "دعم", "نسخ احتياطي", "تكاملات", "أمان", "ميزانية", "طلبات", "شحن", "خصومات", "اشتراكات", "تحليلات", "رسايل", "أهداف"]
        : ["Invoices", "Payroll", "Reports", "Inventory", "CRM", "Payments", "Taxes", "Expenses", "Teams", "Roles", "Alerts", "Mobile app", "API", "Exports", "Dashboard", "Sheets", "Contracts", "Scheduling", "Support", "Backups", "Integrations", "SSO", "Budgets", "Orders", "Shipping", "Discounts", "Subscriptions", "Analytics", "Messaging", "Goals"],
      logos: ["Nimbus", "Arcline", "Vela", "Quanta", "Pike", "Orbit", "Lumen", "Kite", "Basalt", "Ember", "Fjord", "Halo", "Juno", "Mosaic", "Nova", "Opal", "Prism", "Rivet", "Sable", "Tidal", "Umbra", "Vertex", "Willow", "Zephyr", "Atlas", "Birch", "Cobalt", "Delta", "Echo", "Flint"],
    };
    const set = SETS[p.content] || SETS.tags;
    const mine = own && own.children.length > 1 ? [...own.children].map((c) => (c.textContent || "").trim()).filter(Boolean) : [];
    const words = Array.from({ length: n }, (_, i) => mine[i] || set[(i + mine.length) % set.length]);
    const INK = ["var(--x-accent)", "var(--x-accent-2)", "var(--x-good)", "var(--x-ink)", "var(--x-bad)"];
    const SHAPES = ["50%", "22%", "50% 50% 12% 50%", "4px"];

    // build every chip at its size, measure, then lay out rows
    const fs = Math.max(24 * k, Math.min(46 * k, R.w / 20, R.h / (Math.ceil(n / 4) * 3.2)));
    const chips = words.map((w, i) => {
      const c = mk("div", `position:absolute;left:0;top:0;display:flex;align-items:center;gap:${fs * 0.4}px;white-space:nowrap;padding:${fs * 0.42}px ${fs * 0.6}px;background:var(--x-panel);border-radius:${Math.max(3, 3 * k * 1.6)}px;box-shadow:0 ${Math.max(1, k)}px 0 color-mix(in srgb, var(--x-ink) 14%, transparent), 0 ${3 * k}px ${8 * k}px color-mix(in srgb, var(--x-ink) 6%, transparent);font:var(--x-label-weight) ${fs}px/1 ${p.content === "code" ? "var(--x-mono-font)" : p.content === "features" || p.content === "logos" ? "var(--x-body-font)" : "var(--x-mono-font)"};color:${INK[i % INK.length]};transform-origin:50% 100%;opacity:0;`, layer);
      if (p.content === "logos") mk("span", `flex:none;width:${fs * 0.9}px;height:${fs * 0.9}px;border-radius:${SHAPES[i % SHAPES.length]};background:${INK[i % INK.length]};`, c);
      mk("span", p.content === "logos" ? "color:var(--x-ink);font-weight:var(--x-head-weight);" : "", c, w);
      c.dir = ML.ARABIC.test(w) ? "rtl" : "ltr"; // code / Latin tokens keep their own order inside an Arabic stage
      return c;
    });
    const sizes = chips.map((c) => ({ w: c.offsetWidth, h: c.offsetHeight }));
    const maxRow = R.w * 0.86, gx = fs * 0.45, gy = fs * 0.35;
    const rows = [];
    let cur = [], wsum = 0;
    sizes.forEach((s, i) => { if (cur.length && wsum + gx + s.w > maxRow) { rows.push(cur); cur = []; wsum = 0; } cur.push(i); wsum += (cur.length > 1 ? gx : 0) + s.w; });
    if (cur.length) rows.push(cur);
    const rh = sizes[0].h + gy;
    const pileH = rows.length * rh;
    const y0 = p.direction === "up" ? Math.min(R.h - R.h * 0.08, (R.h + pileH) / 2) - sizes[0].h : Math.max(R.h * 0.08, (R.h - pileH) / 2);
    const place = [];
    rows.forEach((row, r) => {
      const rowW = row.reduce((a, i, j) => a + sizes[i].w + (j ? gx : 0), 0);
      let x = (R.w - rowW) / 2 + (ML.rnd(r, 3) - 0.5) * Math.min(R.w - rowW, fs * 4) * 0.8;
      const y = y0 + (p.direction === "up" ? -r : r) * rh;
      const seq = rtl ? [...row].reverse() : row;
      seq.forEach((i) => { place[i] = { x: x + (ML.rnd(i, 5) - 0.5) * gx * 0.8, y: y + (ML.rnd(i, 7) - 0.5) * gy * 0.6, r0: (ML.rnd(i, 9) < 0.5 ? -1 : 1) * 6, r1: (ML.rnd(i, 11) - 0.5) * 4 }; x += sizes[i].w + gx; });
    });
    // reading order: the row's chips come in from the reading start
    const order = [];
    rows.forEach((row) => row.forEach((i) => order.push(i)));

    // pop times
    const span = Math.max(0.5, end - at - 0.9);
    const gaps = Array.from({ length: n - 1 }, (_, j) => (p.accelerate ? 0.2 + (0.12 - 0.2) * (j / Math.max(1, n - 2)) : 0.16));
    const tot = gaps.reduce((a, b) => a + b, 0), sq = tot > span ? span / tot : 1;
    const times = [];
    let tt = at + 0.1;
    order.forEach((i, j) => { times[i] = tt; if (j < n - 1) tt += gaps[j] * sq; });
    order.forEach((i, j) => { if (j % 3 === 0) ctx.sfx(times[i], "pop.soft", 0.22); });
    const last = Math.max(...times);
    const goA = Math.max(last + 0.5, end - 0.3);

    return {
      draw(t) {
        const leave = ML.clamp((t - goA) / 0.28);
        layer.style.opacity = (1 - leave).toFixed(4);
        layer.style.visibility = t < at - 0.2 ? "hidden" : "visible";
        if (back) back.style.opacity = ML.out(t, at - 0.15, at + 0.15).toFixed(4);
        if (own && !big && own.style) own.style.opacity = t >= at ? "0" : "";
        chips.forEach((c, i) => {
          const a = times[i], P = place[i];
          const e = ML.back(t, a, a + 0.3, 1.8), x = ML.lin(t, a, a + 0.3);
          const sc = Math.min(1.04, 0.6 + 0.4 * e);
          c.style.opacity = ML.lin(t, a, a + 0.08).toFixed(4);
          c.style.transform = `translate(${P.x.toFixed(2)}px, ${(P.y - (1 - Math.min(1, e)) * 12 * k).toFixed(2)}px) rotate(${(P.r0 + (P.r1 - P.r0) * x).toFixed(3)}deg) scale(${sc.toFixed(4)})`;
        });
      },
    };
  },
});

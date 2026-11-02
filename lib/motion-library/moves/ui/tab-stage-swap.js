// Treatment selector stage swap (editorial-service-booking's selector): a tab list of ruled rows (border-top 1 px line,
// label at the start, "01" index at the end, the active row in the accent) beside a fixed-size stage — serif title,
// short copy, a meta row (duration at the start, price at the end) and an outlined pill CTA. Selecting the next row
// turns it the accent while the stage swaps: the old content goes y 0 → −8 px, opacity → 0 in 0.16 s, the new comes up
// from 8 px in 0.2 s (control timing 160–220 ms); "fade" swaps opacity only; "roll" rolls the duration and price
// through their clipped lines while the title slides. Every field stacks all its options in one grid cell, so the
// stage never changes size (no layout shift). Optional pointer tap: a ring on the row as it is chosen.
// Source: MengTo/Skills web-design/editorial-service-booking demo/index.html (MIT: .tabs / .panel markup and
// selectTab()), ported to a pure function of t.
ML.define({
  id: "ui.tab-stage-swap",
  category: "ui",
  name: "Treatment selector stage swap",
  does: "Selecting the next option in a list turns it the accent colour while the stage beside it swaps title, copy, duration and price.",
  says: ["choice", "simplicity", "money"],
  energy: 2,
  targets: ["list", "card"],
  duration: [1, 6],
  params: {
    options: { type: "number", range: [2, 6], default: 4 },
    swap: { type: "choice", options: ["slide", "fade", "roll"], default: "slide" },
    pointer: { type: "bool", default: false },
    layout: { type: "choice", options: ["auto", "side", "stacked"], default: "auto" },
    cta: { type: "text" },
  },
  pairs: ["ui.cursor-glide-click", "data.price-split", "ui.tap-select-toggle"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/editorial-service-booking", license: "MIT", note: "demo/index.html selector (.tabs rows, .panel stage, selectTab swapping title / copy / duration / price), animated per selection" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const N = Math.round(ML.clamp(p.options, 2, 6));
    const tgt = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;

    // the options: the target's items as titles, the rest of each option from samples
    const own = tgt ? [...tgt.children].map((c) => c.textContent.trim()).filter(Boolean) : [];
    const sample = rtl
      ? [["الأساسي", "كل اللي محتاجه عشان تبدأ، جاهز في دقايق.", "شهر", "٩٩ ج"], ["النمو", "مقاعد أكتر وتقارير أكتر وردود أسرع.", "٣ شهور", "٢٤٩ ج"], ["الاستوديو", "للفرق اللي بتطلق كل أسبوع.", "٦ شهور", "٤٩٩ ج"], ["التوسّع", "دعم أولوية وحدود على مقاسك.", "سنة", "٩٩٩ ج"], ["الشركات", "حساب مخصّص ومدير متابعة.", "سنة", "حسب الطلب"], ["التجربة", "جرّب كل حاجة من غير التزام.", "أسبوعين", "مجاناً"]]
      : [["Starter", "Everything you need to begin, set up in minutes.", "1 month", "$9"], ["Growth", "More seats, more reports and faster answers.", "3 months", "$24"], ["Studio", "For teams who ship something every week.", "6 months", "$49"], ["Scale", "Priority help and limits cut to fit.", "12 months", "$99"], ["Enterprise", "A dedicated account and a named lead.", "12 months", "Custom"], ["Trial", "Try everything, no commitment.", "2 weeks", "Free"]];
    const opts = Array.from({ length: N }, (_, i) => { const s = sample[i % sample.length]; return { title: own[i] || s[0], copy: s[1], dur: s[2], price: s[3] }; });

    // the selector: inside the target (its items replaced) or in the picture region
    // inside the target only when it has the room; a small slot gives its items and the selector floats over the picture region
    const side = p.layout === "side" || (p.layout === "auto" && f.wide);
    const slot = tgt ? ctx.box(tgt) : null, inside = slot && slot.w >= (side ? 900 : 620) * k && slot.h >= (side ? 430 : 720) * k;
    let host, width;
    if (inside) { host = tgt; host.replaceChildren(); host.style.display = "block"; width = "100%"; }
    else { if (tgt) tgt.style.visibility = "hidden"; host = mk("div", `position:absolute;left:${f.pic.x}px;top:${f.pic.y}px;width:${f.pic.w}px;height:${f.pic.h}px;display:flex;align-items:center;justify-content:center;`, ctx.scene || ctx.stage); width = Math.min(f.pic.w, (f.wide ? 1300 : 900) * k).toFixed(1) + "px"; }
    const root = mk("div", `position:relative;box-sizing:border-box;width:${width};display:grid;grid-template-columns:${side ? "1fr 1.1fr" : "1fr"};gap:${(side ? 56 : 34) * k}px;color:var(--x-ink);font:var(--x-body-weight) ${(30 * k).toFixed(1)}px/1.35 var(--x-body-font);${inside ? "" : `padding:${(44 * k).toFixed(1)}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:var(--x-radius);box-shadow:var(--x-shadow);`}`, host);
    root.dir = rtl ? "rtl" : "ltr";
    const line = "color-mix(in srgb, var(--x-ink) 24%, transparent)";
    const tabs = mk("div", "display:grid;align-content:center;", root);
    const rows = opts.map((o, i) => {
      const r = mk("div", `position:relative;display:flex;align-items:center;justify-content:space-between;gap:1em;padding:${((side ? 24 : 16) * k).toFixed(1)}px 0;border-top:${Math.max(1, 1.5 * k).toFixed(1)}px solid ${line};${i === N - 1 ? `border-bottom:${Math.max(1, 1.5 * k).toFixed(1)}px solid ${line};` : ""}`, tabs);
      mk("span", "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;", r, o.title);
      mk("span", `font:500 ${(24 * k).toFixed(1)}px var(--x-mono-font);direction:ltr;`, r, String(i + 1).padStart(2, "0"));
      return r;
    });
    const stage = mk("div", `display:flex;flex-direction:column;justify-content:space-between;gap:${((side ? 26 : 18) * k).toFixed(1)}px;padding:${(side ? 8 : 0) * k}px 0;`, root);
    // a field: every option's text stacked in one cell (fixed size), clipped for the roll
    const field = (css, key, parent, clip) => {
      const box = mk("div", `display:grid;${clip ? "overflow:hidden;" : ""}${css}`, parent);
      return opts.map((o) => mk("div", "grid-area:1/1;", box, o[key]));
    };
    const top = mk("div", `display:grid;gap:${(12 * k).toFixed(1)}px;`, stage);
    const fTitle = field(`font:400 ${((side ? 62 : 52) * k).toFixed(1)}px/1.08 var(--x-serif-font);letter-spacing:${rtl ? "0" : "-0.01em"};`, "title", top);
    const fCopy = field(`color:var(--x-dim);font-size:${(26 * k).toFixed(1)}px;line-height:1.45;`, "copy", top);
    const meta = mk("div", `display:flex;justify-content:space-between;color:var(--x-dim);font-size:${(24 * k).toFixed(1)}px;`, stage);
    const fDur = field("", "dur", meta, true);
    const fPrice = field("text-align:end;", "price", meta, true);
    mk("div", `align-self:flex-start;border:${Math.max(1, 1.5 * k).toFixed(1)}px solid currentColor;border-radius:var(--x-radius-s);padding:${(16 * k).toFixed(1)}px ${(26 * k).toFixed(1)}px;font-size:${(24 * k).toFixed(1)}px;white-space:nowrap;`, stage, p.cta || (rtl ? "اختار الباقة دي" : "Choose this plan"));
    const ring = p.pointer ? mk("div", `position:absolute;left:0;top:0;width:${(90 * k).toFixed(1)}px;height:${(90 * k).toFixed(1)}px;margin:${(-45 * k).toFixed(1)}px 0 0 ${(-45 * k).toFixed(1)}px;border-radius:50%;box-sizing:border-box;border:${(4 * k).toFixed(1)}px solid var(--x-accent);pointer-events:none;`, root) : null;
    const rootBox = root.getBoundingClientRect(), sc = rootBox.width / (root.offsetWidth || 1) || 1;
    const rowAt = rows.map((r) => { const b = r.getBoundingClientRect(); const x = rtl ? b.left + b.width * 0.12 : b.right - b.width * 0.12; return { x: (x - rootBox.left) / sc, y: (b.top + b.height / 2 - rootBox.top) / sc }; });

    // selections: option 0 is chosen at the start, each next one on its spoken title (or a steady gap)
    const gap = ML.clamp((end - at - 0.9) / Math.max(1, N - 1), 0.55, 1.2);
    const times = [at];
    for (let j = 1; j < N; j++) {
      const fb = at + 0.45 + (j - 1) * gap;
      const s = Math.max(times[j - 1] + 0.45, ctx.word(opts[j].title.split(/\s+/)[0], fb));
      if (s > end - 0.35) break;
      times.push(s);
    }
    times.slice(1).forEach((s) => ctx.sfx(s, "tap", 0.35));
    const easeOut = (x) => 1 - (1 - x) * (1 - x);

    // one field at time t: old leaves, new arrives
    function swapField(spans, t, cur, T, roll) {
      spans.forEach((s, i) => {
        let o = 0, y = 0;
        if (cur === 0 || t >= T + 0.36) { o = i === cur ? 1 : 0; }
        else if (roll) {
          const u = ML.ease(t, T, T + 0.22);
          if (i === cur - 1) { o = 1; y = -u * 100; } else if (i === cur) { o = 1; y = (1 - u) * 100; }
          s.style.translate = `0 ${y.toFixed(2)}%`; s.style.opacity = String(o); return;
        } else if (i === cur - 1) { const u = easeOut(ML.lin(t, T, T + 0.16)); o = 1 - u; y = p.swap === "fade" ? 0 : -8 * k * u; }
        else if (i === cur) { const u = easeOut(ML.lin(t, T + 0.16, T + 0.36)); o = u; y = p.swap === "fade" ? 0 : 8 * k * (1 - u); }
        s.style.opacity = o.toFixed(4);
        s.style.translate = y ? `0 ${y.toFixed(2)}px` : "none";
      });
    }

    return {
      draw(t) {
        root.style.opacity = (ML.out(t, at - 0.25, at + 0.1) * (1 - ML.lin(t, end - 0.2, end))).toFixed(4);
        let cur = 0;
        times.forEach((s, j) => { if (t >= s) cur = j; });
        const T = times[cur];
        rows.forEach((r, i) => {
          const a = i === cur ? (cur === 0 ? 1 : ML.lin(t, T, T + 0.2)) : i === cur - 1 ? 1 - ML.lin(t, T, T + 0.2) : 0;
          r.style.color = a > 0 ? `color-mix(in srgb, var(--x-accent) ${(a * 100).toFixed(1)}%, var(--x-ink))` : "var(--x-ink)";
        });
        swapField(fTitle, t, cur, T, false);
        swapField(fCopy, t, cur, T, false);
        swapField(fDur, t, cur, T, p.swap === "roll");
        swapField(fPrice, t, cur, T, p.swap === "roll");
        if (ring) {
          const u = cur > 0 ? ML.lin(t, T - 0.05, T + 0.4) : 0, live = cur > 0 && u > 0 && u < 1;
          ring.style.opacity = live ? (0.9 * (1 - u)).toFixed(4) : "0";
          ring.style.transform = `translate(${rowAt[cur].x.toFixed(1)}px, ${rowAt[cur].y.toFixed(1)}px) scale(${(0.35 + 0.65 * easeOut(u)).toFixed(4)})`;
        }
      },
    };
  },
});

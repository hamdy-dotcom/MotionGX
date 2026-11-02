// Spec rows: short rows of mono uppercase keys and light values with hairline dividers build one by one like a
// technical data sheet. Row: flex, justify-between, items-end, 12 px under it, a 1 px bottom rule (ink 10% dark /
// 5% paper), 16 px gap; key 12 px mono uppercase tracking .2em at 50–70% ink; value 14 px light (scaled to the stage
// here). Per row: the divider scaleX 0 → 1 from the reading-start side (0.45 s power3.out) just before its text; the
// key fades / slides x −12 → 0 (0.35 s at +0.1 s); the value masked-rises, slides x +12 → 0, types or counts (0.45 s at
// +0.18 s), mirrored in Arabic. Rows stagger 0.12–0.18 s, or land one per spoken value. Optional container: a
// translucent glass card (never a backdrop blur: no blur over pictures) or a panel card; optional serif title.
// On a list the list's items become the values (keys numbered); with no target the sheet is built in the picture region.
// Sources: MengTo/Skills web-design/split-layout-technical + css-border-gradient + masked-reveal (MIT).
ML.define({
  id: "data.spec-rows",
  category: "data",
  name: "Spec rows build",
  does: "Short rows of mono uppercase keys and light values with hairline dividers appear one by one like a technical data sheet.",
  says: ["precision", "proof", "list", "trust"],
  energy: 2,
  targets: ["list", "card", "label", "number"],
  duration: [1, 4],
  params: {
    rows: { type: "number", range: [2, 6], default: 4 },
    theme: { type: "choice", options: ["dark", "paper"], default: "dark" },
    title: { type: "bool", default: false },
    value_enter: { type: "choice", options: ["rise", "slide", "type", "count"], default: "rise" },
    stagger: { type: "number", range: [0.1, 0.2], default: 0.12, unit: "s" },
    container: { type: "choice", options: ["none", "glass", "card"], default: "none" },
    sync: { type: "choice", options: ["stagger", "spoken"], default: "stagger" },
    keys: { type: "text", default: "" },
    values: { type: "text", default: "" },
    heading: { type: "text", default: "" },
  },
  pairs: ["data.readout-swap", "data.signal-level-bars"],
  avoid: ["playful", "celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/split-layout-technical", license: "MIT" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const u = Math.min(f.W, f.H) / 1080, k = u * 2.2; // the source's page px → the stage
    const mk = (tag, css, parent, text) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const isAr = (s) => ML.ARABIC.test(s);
    // the rows' content: params, else the target's items, else a sample sheet
    const split = (s) => String(s || "").split("|").map((x) => x.trim()).filter(Boolean);
    const own = el ? (el.children.length ? [...el.children].map((c) => (c.textContent || "").trim()).filter(Boolean) : [(el.textContent || "").trim()].filter(Boolean)) : [];
    const sampleK = rtl ? ["الموديل", "المدى", "الشحن", "الضمان", "الوزن", "اللون"] : ["Model", "Range", "Charge", "Warranty", "Weight", "Finish"];
    const sampleV = rtl ? ["X-2", "480 كم", "48 ساعة", "5 سنين", "1.2 كجم", "رمادي"] : ["X-2", "480 km", "48 Hours", "5 Years", "1.2 kg", "Graphite"];
    let values = split(p.values), keys = split(p.keys);
    const fromList = !values.length && own.length > 0;
    if (!values.length) values = own.length ? own : sampleV;
    const n = fromList ? Math.min(6, values.length) : Math.round(ML.clamp(p.rows, 2, 6));
    values = Array.from({ length: n }, (_, i) => values[i % values.length]);
    keys = Array.from({ length: n }, (_, i) => keys[i] || (fromList ? (rtl ? `البند ${i + 1}` : `Item ${String(i + 1).padStart(2, "0")}`) : sampleK[i % sampleK.length]));

    let wrap;
    if (el) {
      el.textContent = "";
      Object.assign(el.style, { display: "block", position: "relative" });
      wrap = el;
    } else {
      const w = Math.min(f.pic.w * 0.8, 860 * u);
      wrap = mk("div", `position:absolute;left:${f.pic.x + (f.pic.w - w) / 2}px;top:${f.pic.y + f.pic.h / 2}px;translate:0 -50%;width:${w}px;z-index:20`, ctx.scene || stage);
    }
    const paper = p.theme === "paper";
    const sheet = mk("div", `display:flex;flex-direction:column;gap:${16 * k * 0.75}px;direction:${rtl ? "rtl" : "ltr"}`, wrap);
    if (p.container === "glass") Object.assign(sheet.style, { background: "color-mix(in srgb, var(--x-panel) 22%, transparent)", border: "1px solid color-mix(in srgb, var(--x-ink) 10%, transparent)", borderRadius: `${16 * k * 0.8}px`, padding: `${32 * k * 0.7}px` });
    if (p.container === "card") Object.assign(sheet.style, { background: "var(--x-panel)", border: "var(--x-edge) solid var(--x-edge-color)", borderRadius: "var(--x-radius)", boxShadow: "var(--x-shadow)", padding: `${32 * k * 0.7}px` });
    let title = null;
    if (p.title || p.heading) title = mk("div", `font:400 ${(18 * k).toFixed(1)}px/1.2 var(--x-serif-font);color:var(--x-ink);margin-bottom:${6 * k}px`, sheet, p.heading || (rtl ? "المواصفات" : "Specifications"));
    const rule = paper ? "color-mix(in srgb, var(--x-ink) 7%, transparent)" : "color-mix(in srgb, var(--x-ink) 14%, transparent)";
    const keyInk = paper ? "50%" : "62%";
    const NUM = /[\d][\d.,]*/;
    const rows = values.map((v, i) => {
      const r = mk("div", `position:relative;display:flex;justify-content:space-between;align-items:flex-end;gap:${16 * k * 0.75}px;padding-bottom:${12 * k * 0.75}px`, sheet);
      const line = mk("i", `position:absolute;left:0;right:0;bottom:0;height:1px;background:${rule};transform-origin:${rtl ? "100%" : "0%"} 50%;transform:scaleX(0)`, r);
      const key = mk("span", `font:500 ${(12 * k).toFixed(1)}px var(--x-mono-font);color:color-mix(in srgb, var(--x-ink) ${keyInk}, transparent);white-space:nowrap`, r, keys[i]);
      if (!isAr(keys[i])) { key.style.textTransform = "uppercase"; key.style.letterSpacing = ".2em"; }
      const mask = mk("span", `display:inline-block;overflow:hidden;padding:0.08em 0;line-height:1.1;text-align:${rtl ? "left" : "right"};min-width:0`, r);
      const val = mk("span", `display:inline-block;font:300 ${(14 * k).toFixed(1)}px/1.1 var(--x-body-font);color:var(--x-ink);white-space:nowrap`, mask, v);
      const m = v.match(NUM), num = m ? parseFloat(m[0].replace(/,/g, "")) : NaN, dec = m ? (m[0].split(".")[1] || "").length : 0;
      return { r, line, key, val, mask, v, m, num, dec };
    });
    // keep every row inside its width: shrink the values if the longest would not fit beside its key
    const room = wrap.clientWidth || f.pic.w;
    rows.forEach((x) => { const need = x.key.offsetWidth + x.val.offsetWidth + 16 * k; if (need > room) x.val.style.fontSize = ((14 * k * (room - x.key.offsetWidth - 16 * k)) / x.val.offsetWidth).toFixed(1) + "px"; });

    const st = ML.clamp(p.stagger, 0.1, 0.2);
    const t0 = at + (title ? 0.2 : 0.05);
    const starts = rows.map((x, i) => (p.sync === "spoken" ? Math.max(t0 + i * 0.1, ctx.word(x.v.split(/\s+/)[0], t0 + i * st) - 0.18) : t0 + i * st));
    for (let i = 1; i < starts.length; i++) starts[i] = Math.max(starts[i], starts[i - 1] + 0.08);
    starts.forEach((t, i) => i % 2 === 0 && ctx.sfx(t, "tap", 0.18));
    const p3 = (t, a, d) => 1 - Math.pow(1 - ML.lin(t, a, a + d), 3);
    const dir = rtl ? -1 : 1;
    const words = (s) => s.split(/(\s+)/);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        wrap.style.visibility = t >= at - 1e-6 ? "visible" : "hidden";
        wrap.style.opacity = (1 - leave).toFixed(4);
        if (title) { const q = p3(t, at, 0.45); title.style.opacity = q.toFixed(4); title.style.translate = `0 ${((1 - q) * 10 * u).toFixed(2)}px`; }
        rows.forEach((x, i) => {
          const a = starts[i];
          x.line.style.transform = `scaleX(${p3(t, a, 0.45).toFixed(4)})`;
          const kq = p3(t, a + 0.1, 0.35);
          x.key.style.opacity = kq.toFixed(4);
          x.key.style.translate = `${(-12 * u * dir * (1 - kq)).toFixed(2)}px 0`;
          const vq = p3(t, a + 0.18, 0.45);
          let text = x.v, o = 1, tx = 0, ty = 0;
          if (p.value_enter === "rise") ty = (1 - vq) * 110;
          else if (p.value_enter === "slide") { tx = 12 * u * dir * (1 - vq); o = vq; }
          else if (p.value_enter === "type") {
            const parts = isAr(x.v) ? words(x.v) : Array.from(x.v);
            text = parts.slice(0, Math.round(parts.length * ML.lin(t, a + 0.18, a + 0.18 + Math.min(0.6, 0.04 * parts.length + 0.1)))).join("") || "​";
          } else if (p.value_enter === "count") {
            o = Math.min(1, vq * 2);
            if (x.m && Number.isFinite(x.num)) text = x.v.replace(NUM, (x.num * vq).toLocaleString("en-US", { minimumFractionDigits: x.dec, maximumFractionDigits: x.dec }));
          }
          if (x.val.textContent !== text) x.val.textContent = text;
          x.val.style.opacity = (t >= a + 0.18 - 1e-6 ? o : 0).toFixed(4);
          x.val.style.translate = ty ? `0 ${ty.toFixed(2)}%` : `${tx.toFixed(2)}px 0`;
        });
      },
    };
  },
});

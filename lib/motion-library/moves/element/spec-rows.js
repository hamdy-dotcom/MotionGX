// Spec sheet rows: a small table of technical parameters builds row by row. Each row is flex space-between, aligned to
// the baseline end, with a 1 px hairline under it (ground ink at 10 % on dark glass / ink at 5–8 % on a light card),
// padding-bottom 12, gap 16 (all in units of the panel: a 400 px web panel → ours). Label: mono 12 uppercase, tracking
// .1em, at 55 %; value: 14 light. Rows 0.12 s apart ("all" lands them together): the hairline draws scaleX 0 → 1 from the
// label side in 0.4 s power2.out, the label fades in, the value slides 12 from the far side in 0.35 s power3.out — the
// sides mirror in Arabic (no letter-spacing on Arabic labels). Optional embossed value on the light card.
// Rows come from the `items` param ("Label: value | …"), else from the target's own items, else a sample product sheet.
// Source: MengTo/Skills web-design/skeuomorphic-ui demo (MIT): the spec list ("flex justify-between items-end border-b
// border-white/10 pb-3", "font-mono text-xs uppercase tracking-widest") — motion ours, every frame from t.
ML.define({
  id: "element.spec-rows",
  category: "element",
  name: "Spec sheet rows",
  does: "A small table of technical parameters builds row by row: mono uppercase label, light value, each underlined by a hairline.",
  says: ["precision", "proof", "list"],
  energy: 2,
  targets: ["list", "label"],
  duration: [1, 2.5],
  params: {
    rows: { type: "number", range: [3, 6], default: 4 },
    surface: { type: "choice", options: ["dark-glass", "light-card"], default: "dark-glass" },
    order: { type: "choice", options: ["top-down", "all"], default: "top-down" },
    stagger: { type: "number", range: [0.06, 0.3], default: 0.12, unit: "s" },
    emboss: { type: "bool", default: false },
    title: { type: "text", default: "" },
    items: { type: "text", default: "" },
  },
  pairs: ["data.dimension-callouts", "text-in.punchline"],
  avoid: ["playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:agent-skills/web-design/skeuomorphic-ui", license: "MIT", note: "the demo's spec list styling (mono uppercase label, light value, white/10 hairline); the row build is ours, from t" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const n = Math.round(ML.clamp(p.rows, 3, 6));

    // the rows: the items param, else the target's own items ("label: value", or label + its number), else a sample sheet
    const DEF = rtl
      ? [["الوزن", "١٫٢ كجم"], ["البطارية", "١٨ ساعة"], ["الشاشة", "٦٫٧ بوصة"], ["الشحن", "٣٠ دقيقة"], ["المعالج", "٨ أنوية"], ["الضمان", "سنتين"]]
      : [["Weight", "1.2 kg"], ["Battery", "18 h"], ["Display", "6.7 in"], ["Charge", "30 min"], ["Chip", "8-core"], ["Warranty", "2 years"]];
    const pair = (s, i) => { const m = String(s).split(/\s*[:：—|]\s*/); return m.length > 1 && m[1] ? [m[0], m.slice(1).join(" ")] : [String(s), DEF[i % DEF.length][1]]; };
    let rowsTxt = [];
    if (p.items) rowsTxt = String(p.items).split(/\s*[|\n]\s*/).filter(Boolean).map((s, i) => pair(s, i));
    else if (own && own.children.length > 1) rowsTxt = [...own.children].map((c) => (c.children.length >= 2 ? [c.children[0].textContent.trim(), c.children[1].textContent.trim()] : pair(c.textContent.trim(), 0))).filter((r) => r[0]);
    else if (own && own.textContent.trim()) rowsTxt = [pair(own.textContent.trim(), 0)];
    for (let i = rowsTxt.length; i < n; i++) rowsTxt.push(DEF[i % DEF.length]);
    rowsTxt = rowsTxt.slice(0, n);
    // own items without a value of their own get a step number instead of a made-up spec
    if (!p.items && own && own.children.length > 1) rowsTxt = rowsTxt.map((r, i) => (DEF.some((d) => d[1] === r[1]) ? [r[0], String(i + 1).padStart(2, "0")] : r));

    // the panel: centred on the target, kept inside the picture region
    const R = f.pic, ob = own ? ctx.box(own) : null;
    const pw = Math.min(R.w * (f.wide ? 0.62 : 0.9), 900 * (Math.min(f.W, f.H) / 1080));
    const u = pw / 400;
    const rowH = 14 * u * 1.4 + 12 * u + 14 * u;
    const ph = (p.title ? 40 * u : 0) + n * rowH + 48 * u;
    const cx = ob ? ML.clamp(ob.x + ob.w / 2, R.x + pw / 2, R.x + R.w - pw / 2) : R.x + R.w / 2;
    const cy = ob ? ML.clamp(ob.y + ob.h / 2, R.y + ph / 2, R.y + R.h - ph / 2) : R.y + R.h / 2;
    const dark = p.surface !== "light-card";
    const ink = dark ? "var(--x-ground)" : "var(--x-ink)";
    const hair = dark ? "color-mix(in srgb, var(--x-ground) 14%, transparent)" : "color-mix(in srgb, var(--x-ink) 8%, transparent)";
    const panel = mk("div", `position:absolute;left:${(cx - pw / 2).toFixed(1)}px;top:${(cy - ph / 2).toFixed(1)}px;width:${pw.toFixed(1)}px;box-sizing:border-box;padding:${24 * u}px ${24 * u}px;display:flex;flex-direction:column;gap:${14 * u}px;border-radius:calc(var(--x-radius) * 0.6);z-index:6;pointer-events:none;color:${ink};` +
      (dark ? "background:color-mix(in srgb, var(--x-ink) 86%, transparent);border:1px solid color-mix(in srgb, var(--x-ground) 12%, transparent);box-shadow:var(--x-shadow);" : "background:linear-gradient(180deg, var(--x-panel), var(--x-panel-2));border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow), inset 0 1px 0 color-mix(in srgb, var(--x-panel) 80%, transparent);"), host);
    const head = p.title ? mk("div", `font:var(--x-label-weight) ${11 * u}px var(--x-label-font);letter-spacing:${rtl ? 0 : "0.18em"};text-transform:${rtl ? "none" : "uppercase"};color:var(--x-accent);margin-bottom:${4 * u}px;`, panel, p.title) : null;
    const rows = rowsTxt.map(([lab, val]) => {
      const row = mk("div", `position:relative;display:flex;justify-content:space-between;align-items:flex-end;gap:${16 * u}px;padding-bottom:${12 * u}px;`, panel);
      const line = mk("div", `position:absolute;left:0;right:0;bottom:0;height:1px;background:${hair};transform-origin:${rtl ? "100%" : "0%"} 50%;transform:scaleX(0);`, row);
      const l = mk("div", `font:500 ${12 * u}px var(--x-mono-font);letter-spacing:${rtl ? 0 : "0.1em"};text-transform:${rtl ? "none" : "uppercase"};opacity:0;color:color-mix(in srgb, ${ink} 60%, transparent);white-space:nowrap;`, row, lab);
      const v = mk("div", `font:300 ${14 * u}px var(--x-body-font);white-space:nowrap;opacity:0;${!dark && p.emboss ? "text-shadow:0 1px 0 color-mix(in srgb, var(--x-panel) 90%, transparent), 0 -1px 0 color-mix(in srgb, var(--x-ink) 18%, transparent);" : ""}`, row, val);
      return { line, l, v };
    });

    // timing: the panel lands, then the rows 0.12 s apart (or together)
    const r0 = at + 0.25;
    const times = rows.map((_, i) => r0 + (p.order === "all" ? 0 : i * p.stagger));
    const p2 = (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), 2), p3 = (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), 3);
    const far = (rtl ? -1 : 1) * 12 * u;
    ctx.sfx(at, "tap", 0.2);
    times.forEach((t, i) => (p.order === "all" ? i === 0 : i % 2 === 1) && ctx.sfx(t + 0.05, "tap", 0.22));
    const leave = Math.max(times[times.length - 1] + 0.6, end - 0.3);

    return {
      draw(t) {
        const a = p3(t, at, at + 0.35), q = ML.ease(t, leave, leave + 0.25);
        panel.style.visibility = t < at - 1e-6 ? "hidden" : "visible";
        if (own) own.style.visibility = t < at - 1e-6 ? "" : "hidden"; // the sheet takes the target's place
        panel.style.opacity = (a * (1 - q)).toFixed(4);
        panel.style.translate = `0 ${((1 - a) * 18 * u - q * 8 * u).toFixed(2)}px`;
        if (head) head.style.opacity = ML.out(t, at + 0.1, at + 0.4).toFixed(4);
        rows.forEach((r, i) => {
          const s = times[i];
          r.line.style.transform = `scaleX(${p2(t, s, s + 0.4).toFixed(4)})`;
          r.l.style.opacity = ML.out(t, s + 0.05, s + 0.35).toFixed(4);
          const v = p3(t, s + 0.08, s + 0.43);
          r.v.style.opacity = v.toFixed(4);
          r.v.style.translate = `${((1 - v) * far).toFixed(2)}px 0`;
        });
      },
    };
  },
});

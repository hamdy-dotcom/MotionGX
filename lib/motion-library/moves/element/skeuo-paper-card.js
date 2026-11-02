// Skeuomorphic paper card: a tactile spec sheet. A wrapper with 1 px padding and a whisper-thin gradient edge
// (180deg, ink 8 % → 1 %) holds an inner card (radius − 1) that runs from the panel to a warmer paper tone, with an inner
// top highlight (inset 0 2px 4px), a faint inner bottom shade, a soft drop (0 10px 30px at 4 %) and a 1 px top line
// (transparent → light → transparent, 80 % wide). Text sits letterpressed (0 1px 0 light). Content: a title with its icon
// (or a row of icon chips), a short paragraph, and mono key / value rows. It enters y 24 → 0 + fade over 0.7 s
// power3.out, its rows following 0.08 s apart; then a 30 %-wide light band sweeps across the top line over 1.2 s.
// Colours come from the look (panel, panel-2, ink, accent-ink as the light), so a dark look gets a dark paper card.
// Source: MengTo/Skills web-design/split-layout-technical + high-contrast-skeuomorphic-clean (MIT): gradient-border
// wrapper, inset shadows, letterpress text; the entrance and sweep timing are our own code.
ML.define({
  id: "element.skeuo-paper-card",
  category: "element",
  name: "Skeuomorphic paper card",
  does: "A bright white-to-cream card with an inner top highlight and a whisper-thin gradient edge lifts in like a tactile spec sheet, a highlight sweeping its top edge.",
  says: ["luxury", "trust", "precision"],
  energy: 2,
  targets: ["card", "list"],
  duration: [1, 2.5],
  params: {
    radius: { type: "number", range: [16, 32], default: 24, unit: "px" },
    icon_chips: { type: "bool", default: false },
    rows: { type: "number", range: [0, 3], default: 2 },
    sweep: { type: "bool", default: true },
    title: { type: "text", default: "" },
    body: { type: "text", default: "" },
    backdrop: { type: "bool", default: true },
  },
  pairs: ["element.shadow-lift", "text-in.punchline"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "card",
  source: { from: "MengTo/Skills:agent-skills/web-design/split-layout-technical", license: "MIT", note: "gradient-border wrapper, inset shadows and letterpress from the skill; entrance + sweep are our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const ob = own ? ctx.box(own) : null;
    const R = ob && ob.w > f.W * 0.4 && ob.h > f.H * 0.2 ? ob : f.pic;
    const L = (en, ar) => (rtl ? ar : en);
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    // a list target gives the card its rows
    const listItems = own ? [...own.children].map((c) => (c.textContent || "").trim()).filter(Boolean) : [];

    const cw = Math.min(R.w * 0.9, f.wide ? 900 : 860), k = cw / 760;
    const rad = p.radius * Math.max(1, k), light = "color-mix(in srgb, var(--x-panel) 35%, var(--x-accent-ink))";
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:6;`, host);
    const back = p.backdrop && !own ? mk("div", "position:absolute;inset:0;border-radius:var(--x-radius);background:var(--x-ground);opacity:0;", layer) : null;
    // the wrapper: 1 px of gradient edge
    const wrap = mk("div", `width:${cw.toFixed(1)}px;max-height:${(R.h * 0.96).toFixed(1)}px;padding:1px;box-sizing:border-box;border-radius:${rad.toFixed(1)}px;background:linear-gradient(180deg, color-mix(in srgb, var(--x-ink) 8%, transparent), color-mix(in srgb, var(--x-ink) 1%, transparent));box-shadow:0 ${(10 * k).toFixed(1)}px ${(30 * k).toFixed(1)}px color-mix(in srgb, var(--x-ink) 4%, transparent);opacity:0;`, layer);
    const card = mk("div", `position:relative;overflow:hidden;border-radius:${(rad - 1).toFixed(1)}px;background:linear-gradient(180deg, var(--x-panel), color-mix(in srgb, var(--x-panel) 55%, var(--x-panel-2)));box-shadow:inset 0 2px ${(4 * k).toFixed(1)}px ${light}, inset 0 -2px ${(6 * k).toFixed(1)}px color-mix(in srgb, var(--x-ink) 3%, transparent);padding:${(36 * k).toFixed(1)}px ${(40 * k).toFixed(1)}px;display:flex;flex-direction:column;gap:${(22 * k).toFixed(1)}px;color:var(--x-ink);text-shadow:0 1px 0 color-mix(in srgb, ${light} 80%, transparent);`, wrap);
    // the top line and its sweeping band
    mk("div", `position:absolute;left:10%;right:10%;top:0;height:1px;background:linear-gradient(90deg, transparent, ${light}, transparent);`, card);
    const band = p.sweep ? mk("div", `position:absolute;top:0;left:0;width:30%;height:${Math.max(2, 2 * k).toFixed(1)}px;background:linear-gradient(90deg, transparent, var(--x-accent-ink), transparent);opacity:0;`, card) : null;

    const icon = (d, size) => { const s = doc.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("width", size); s.setAttribute("height", size); s.innerHTML = `<path d="${d}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`; return s; };
    const ICONS = ["M4 7h16M4 12h10M4 17h7", "M12 3l8 4.5v9L12 21l-8-4.5v-9z", "M5 12l4 4 10-10", "M12 3v18M3 12h18"];
    const chip = (d, s) => { const c = mk("span", `display:grid;place-items:center;width:${s}px;height:${s}px;border-radius:${(s * 0.3).toFixed(1)}px;color:var(--x-ink);background:linear-gradient(180deg, var(--x-panel), var(--x-panel-2));box-shadow:inset 0 1px 1px ${light}, 0 1px 2px color-mix(in srgb, var(--x-ink) 10%, transparent), 0 0 0 1px color-mix(in srgb, var(--x-ink) 7%, transparent);`, null); c.append(icon(d, Math.round(s * 0.5))); return c; };
    const parts = [];
    // title row
    const head = mk("div", `display:flex;align-items:center;gap:${(16 * k).toFixed(1)}px;`, card);
    const cs = Math.round(52 * k);
    if (!p.icon_chips) head.append(chip(ICONS[1], cs));
    const titleTxt = p.title || (host.querySelector(".ml-label") ? host.querySelector(".ml-label").textContent.trim() : "") || L("Spec sheet", "ورقة المواصفات");
    mk("div", `font:var(--x-head-weight) ${(38 * k).toFixed(1)}px/1.15 var(--x-head-font);letter-spacing:${rtl ? 0 : "-0.01em"};`, head, titleTxt);
    parts.push(head);
    if (p.icon_chips) {
      const chips = mk("div", `display:flex;gap:${(12 * k).toFixed(1)}px;`, card);
      ICONS.forEach((d) => chips.append(chip(d, cs)));
      parts.push(chips);
    }
    const bodyTxt = p.body || L("Made to the same standard every time: measured, checked and signed off before it ships.", "معمول بنفس المعيار كل مرة: متقاس ومتراجع ومتوقّع عليه قبل ما يتشحن.");
    parts.push(mk("p", `margin:0;font:var(--x-body-weight) ${(26 * k).toFixed(1)}px/1.5 var(--x-body-font);color:var(--x-dim);`, card, bodyTxt));
    const defRows = rtl ? [["الخطة", "شهري"], ["الدفعة الأولى", "4,500"], ["الحالة", "متأكّد"]] : [["Plan", "Monthly"], ["First payment", "4,500"], ["Status", "Confirmed"]];
    const rows = listItems.length ? listItems.slice(0, 3).map((x, i) => [String(i + 1).padStart(2, "0"), x]) : defRows;
    const nRows = Math.round(ML.clamp(p.rows, 0, 3));
    if (nRows) {
      const tbl = mk("div", `display:grid;border-top:1px solid var(--x-line);`, card);
      rows.slice(0, nRows).forEach(([a, b]) => {
        const r = mk("div", `display:flex;justify-content:space-between;align-items:baseline;gap:${(20 * k).toFixed(1)}px;padding:${(14 * k).toFixed(1)}px 0;border-bottom:1px solid var(--x-line);font:500 ${(22 * k).toFixed(1)}px var(--x-mono-font);`, tbl);
        mk("span", `color:var(--x-dim);text-transform:${rtl ? "none" : "uppercase"};letter-spacing:${rtl ? 0 : "0.08em"};`, r, a);
        mk("span", "color:var(--x-ink);", r, b);
        parts.push(r);
      });
    }

    // timing
    const span = Math.max(0.9, end - at), q = ML.clamp(span / 2.2, 0.5, 1);
    const p3o = (x) => 1 - Math.pow(1 - x, 4);
    const dur = 0.7 * q, sw0 = at + dur * 0.85, swD = 1.2 * q;
    ctx.sfx(at, "card", 0.3);
    if (band) ctx.sfx(sw0, "swell", 0.12);

    return {
      draw(t) {
        const u = p3o(ML.lin(t, at, at + dur));
        wrap.style.opacity = u.toFixed(4);
        if (back) back.style.opacity = ML.ease(t, at - 0.05, at + 0.25).toFixed(4);
        wrap.style.translate = `0 ${((1 - u) * 24 * k).toFixed(2)}px`;
        parts.forEach((e, i) => {
          const v = p3o(ML.lin(t, at + 0.12 + i * 0.08, at + 0.12 + i * 0.08 + dur * 0.8));
          e.style.opacity = v.toFixed(4);
          e.style.translate = `0 ${((1 - v) * 10 * k).toFixed(2)}px`;
        });
        if (band) {
          const s = ML.ease(t, sw0, sw0 + swD), x = rtl ? 100 - s * 130 : -30 + s * 130;
          band.style.left = `${x.toFixed(2)}%`;
          band.style.opacity = (Math.sin(Math.PI * s) * (t >= sw0 ? 1 : 0)).toFixed(4);
        }
      },
    };
  },
});

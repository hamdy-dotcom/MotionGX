// Stat rail: two to four compact numbers with tiny uppercase captions in a row under a hairline. Grid of equal columns;
// a top hairline (the look's line colour) draws scaleX 0 → 1 in 0.6 s power2.out from the reading edge, or 1 px rules
// sit between the cells, or nothing (then the number sits above its caption with more air). Columns then settle in
// turn (stagger 0.08–0.15 s): each fades and rises 30 → 0 over 1 s power3.out while its value counts up 0.8 s
// power2.out (the numeric part only: "24h", "< 30s", "4 / 4" keep their symbols still), rolls digit by digit (each
// digit masked, y 100 % → 0 in 0.5 s power3.out, 0.04 s apart) or simply fades. Number faces: serif, bold sans or
// tabular. Captions are the label face, tracked in Latin only.
// Source: MengTo/Skills web-design number-details demo ("Technical Metric Rail": grid-cols-3 gap-4 mt-12 pt-8
// border-t, font-playfair text-2xl + text-[10px] uppercase tracking-widest), dither-laser-dark-mode and
// operational-enterprise-ai stat rows (MIT).
ML.define({
  id: "data.stat-rail",
  category: "data",
  name: "Stat rail",
  does: "Two to four compact numbers with tiny uppercase captions line up under a hairline, each settling in turn.",
  says: ["proof", "trust", "result", "list", "precision"],
  energy: 2,
  targets: ["number", "label", "list"],
  duration: [1, 3],
  params: {
    columns: { type: "number", range: [2, 4], default: 3 },
    divider: { type: "choice", options: ["top-hairline", "vertical-rules", "none"], default: "top-hairline" },
    value: { type: "choice", options: ["count", "digit-roll", "fade"], default: "count" },
    type: { type: "choice", options: ["serif", "sans", "tabular"], default: "serif" },
    theme: { type: "choice", options: ["light", "dark"], default: "light" },
    stagger: { type: "number", range: [0.08, 0.15], default: 0.12, unit: "s" },
    values: { type: "text", default: "" },
    captions: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "data.spec-rows"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/number-details/demo/index.html", license: "MIT" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const mk = (tag, css, parent, text) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const n = Math.round(ML.clamp(p.columns, 2, 4));
    const split = (s) => String(s || "").split("|").map((x) => x.trim()).filter(Boolean);
    const slotKind = el ? el.getAttribute("data-slot") || "" : "";
    const own = el ? (el.textContent || "").trim() : "";
    const items = el && slotKind === "list" ? [...el.children].map((c) => c.textContent.trim()).filter(Boolean) : [];
    // sample stats whose numbers and captions belong together; real ones arrive through values / captions
    const dv = rtl ? ["24/7", "< 30", "4 / 4", "98%"] : ["24h", "< 30s", "4 / 4", "98%"];
    const dc = rtl ? ["دعم متواصل", "ثانية للرد", "خطوات", "عملاء راضيين"] : ["Support", "Response", "Steps", "Satisfied"];
    let values = split(p.values), caps = split(p.captions);
    const ownNumber = !values.length && slotKind === "number" && own;
    if (!values.length) values = ownNumber ? [own, ...dv] : dv;
    // given values with no captions stay uncaptioned: a sample caption under a real number would state something false
    if (!caps.length) caps = items.length ? items : slotKind === "label" && own ? [own, ...dc.slice(1)] : ownNumber ? [rtl ? "الإجمالي" : "Total", ...dc] : split(p.values).length ? [""] : dc;
    values = Array.from({ length: n }, (_, i) => values[i % values.length]);
    caps = Array.from({ length: n }, (_, i) => caps[i % caps.length]);

    // the host: the slot itself becomes the rail, else a rail in the picture region
    const scene = ctx.scene || ctx.stage, hb = ctx.box(scene);
    let host = el;
    if (!host) {
      const w = Math.min(f.pic.w * 0.9, f.wide ? f.W * 0.5 : f.W * 0.84);
      host = mk("div", `position:absolute;left:${(f.pic.x + (f.pic.w - w) / 2 - hb.x).toFixed(1)}px;top:${(f.pic.y + f.pic.h / 2 - hb.y).toFixed(1)}px;width:${w.toFixed(1)}px;translate:0 -50%;z-index:12`, scene);
    }
    const W = Math.max(240, host.clientWidth || ctx.box(host).w);
    host.textContent = "";
    Object.assign(host.style, { font: "inherit", whiteSpace: "normal", display: "block" });
    const u = Math.min(f.W, f.H) / 1080;
    const dark = p.theme === "dark";
    const wrap = mk("div", `position:relative;box-sizing:border-box;width:100%;direction:${rtl ? "rtl" : "ltr"};color:${dark ? "var(--x-ground)" : "var(--x-ink)"};${dark ? `background:var(--x-ink);border-radius:var(--x-radius);padding:${(36 * u).toFixed(1)}px ${(40 * u).toFixed(1)}px;` : ""}`, host);
    const lineC = dark ? "color-mix(in srgb, var(--x-ground) 22%, transparent)" : "var(--x-line)";
    const hair = mk("div", `position:absolute;${dark ? `top:${(36 * u).toFixed(1)}px;left:${(40 * u).toFixed(1)}px;right:${(40 * u).toFixed(1)}px` : "top:0;left:0;right:0"};height:${Math.max(1, u * 2).toFixed(1)}px;background:${lineC};transform-origin:${rtl ? "right" : "left"} center`, wrap);
    if (p.divider !== "top-hairline") hair.style.display = "none";
    const rules = p.divider === "vertical-rules";
    const gap = (p.divider === "none" ? 26 : 16) * 2 * u;
    const grid = mk("div", `display:grid;grid-template-columns:repeat(${n}, minmax(0, 1fr));column-gap:${rules ? 0 : gap.toFixed(1)}px;padding-top:${p.divider === "top-hairline" ? (32 * 1.6 * u).toFixed(1) : 0}px`, wrap);
    const cellW = (W - (dark ? 80 * u : 0) - (rules ? 0 : gap * (n - 1))) / n;
    const numFs = Math.min(cellW * (p.type === "tabular" ? 0.3 : 0.34), (p.type === "sans" ? 58 : 66) * u * (n > 3 ? 0.9 : 1));
    const numFont = p.type === "serif" ? `400 ${numFs.toFixed(1)}px/1.1 var(--x-serif-font)` : p.type === "sans" ? `700 ${(numFs * 0.85).toFixed(1)}px/1.15 var(--x-head-font)` : `500 ${(numFs * 0.85).toFixed(1)}px/1.15 var(--x-mono-font)`;
    const capFs = Math.max(15, 24 * u);
    const cells = values.map((v, i) => {
      const cell = mk("div", `display:flex;flex-direction:column;gap:${(p.divider === "none" ? 12 : 8) * u}px;min-width:0;box-sizing:border-box;${rules ? `padding:0 ${(32 * u).toFixed(1)}px;${i ? `border-inline-start:${Math.max(1, 2 * u).toFixed(1)}px solid ${lineC};` : ""}` : ""}`, grid);
      if (rules && i === 0) cell.style.paddingInlineStart = "0";
      const num = mk("div", `font:${numFont};letter-spacing:${p.type === "serif" ? "-0.01em" : "-0.02em"};font-variant-numeric:tabular-nums lining-nums;white-space:nowrap;direction:ltr;unicode-bidi:isolate;text-align:${rtl ? "right" : "left"};display:flex;${rtl ? "justify-content:flex-end" : ""}`, cell);
      const latin = !ML.ARABIC.test(caps[i]);
      mk("div", `font:var(--x-label-weight) ${capFs.toFixed(1)}px/1.3 var(--x-label-font);text-transform:${latin ? "var(--x-label-case)" : "none"};letter-spacing:${latin ? "var(--x-label-track)" : "0"};color:${dark ? "color-mix(in srgb, var(--x-ground) 60%, transparent)" : "var(--x-dim)"}`, cell, caps[i]);
      // the value: its numeric part counts or rolls, its symbols stay still
      const m = v.match(/^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/);
      const pre = m ? m[1] : "", numStr = m ? m[2] : "", post = m ? m[3] : v;
      const pieces = [];
      if (p.value === "digit-roll" && m) {
        // the digit run stays one left-to-right block, so an Arabic unit around it never reverses the number
        for (const tok of v.split(/(\d[\d,.]*)/).filter(Boolean)) {
          if (!/^\d/.test(tok)) { mk("span", "display:inline-block;white-space:pre", num, tok); continue; }
          const run = mk("span", "display:inline-flex;direction:ltr", num);
          for (const ch of Array.from(tok)) {
            if (/\d/.test(ch)) { const mask = mk("span", "display:inline-block;overflow:hidden;line-height:1.15;vertical-align:top", run); pieces.push(mk("span", "display:inline-block", mask, ch)); }
            else mk("span", "display:inline-block;white-space:pre", run, ch);
          }
        }
      } else num.textContent = v;
      // a value holding Arabic letters ("24 س") reads right to left; bare figures stay left to right
      if (ML.ARABIC.test(v)) { num.style.direction = "rtl"; num.style.justifyContent = "flex-start"; }
      ML.fit(num, cellW - (rules ? 64 * u : 0));
      return { cell, num, pre, numStr, post, pieces, numeric: !!m };
    });
    const hairGap = p.divider === "top-hairline" ? 0.35 : 0;
    const pace = ML.clamp((end - at - 0.3) / (hairGap + (cells.length - 1) * p.stagger + 1), 0.35, 1); // everything settles before a short run ends
    const t0 = at + hairGap * pace;
    const start = cells.map((_, i) => t0 + i * p.stagger * pace);
    start.forEach((s) => ctx.sfx(s, "tap", 0.22));
    const p2 = (x) => 1 - Math.pow(1 - x, 3), p3 = (x) => 1 - Math.pow(1 - x, 4);
    const fmt = (target, x) => {
      const dec = (target.split(".")[1] || "").length, val = parseFloat(target.replace(/,/g, "")) * x;
      const s = val.toFixed(dec);
      return target.includes(",") ? Number(s).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) : s;
    };
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        wrap.style.opacity = (ML.lin(t, at - 0.01, at + 0.12) * (1 - leave)).toFixed(4);
        hair.style.transform = `scaleX(${p2(ML.lin(t, at, at + 0.6 * pace)).toFixed(4)})`;
        cells.forEach((c, i) => {
          const s = start[i], e = p3(ML.lin(t, s, s + pace));
          c.cell.style.opacity = Math.min(1, ML.lin(t, s, s + 0.45 * pace)).toFixed(4);
          c.cell.style.translate = `0 ${((1 - e) * 30 * u * 1.6).toFixed(2)}px`;
          if (p.value === "count" && c.numeric) c.num.textContent = c.pre + fmt(c.numStr, p2(ML.lin(t, s, s + 0.8 * pace))) + c.post;
          if (p.value === "digit-roll") c.pieces.forEach((d, j) => { const r = p3(ML.lin(t, s + j * 0.04 * pace, s + (j * 0.04 + 0.5) * pace)); d.style.transform = `translateY(${((1 - r) * 100).toFixed(2)}%)`; });
        });
      },
    };
  },
});

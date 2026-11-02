// Panel grows open beside another: a side panel grows out of nothing next to a page, pushing it narrower, and its rows
// fill in. Ported from html-explainer-video's step 2: the panel's flex-grow is ease(t, T − 0.2, T + 0.35) (cubic
// in-out, 0.55 s), and while it is under 0.001 the panel is display:none and the parent's gap is 0, so no gap pops in;
// its content comes up with the look's own entrance (ML.show) from T − 0.1 and the rows follow 0.09 s apart, each in
// 0.3 s. The rows are what the look really says, read off the page (type face, ground, ink, accent, corners, motion),
// with colour dots — as the explainer's "reads the look" panel. Side by side on wide shapes, stacked on tall ones; the
// panel opens on the trailing side (mirrored in Arabic).
// Source: MengTo/Skills media/html-explainer-video demo/film.js step2 (MIT).
ML.define({
  id: "element.panel-expand",
  category: "element",
  name: "Panel grows open beside another",
  does: "A side panel grows out from nothing, pushing its neighbour narrower, and its rows then fill in.",
  says: ["reveal", "connection", "step"],
  energy: 2,
  targets: ["card", "screen"],
  duration: [0.8, 2],
  params: {
    axis: { type: "choice", options: ["auto", "horizontal", "vertical"], default: "auto" },
    duration: { type: "number", range: [0.4, 0.7], default: 0.55, unit: "s" },
    rows: { type: "choice", options: ["look", "list"], default: "look" },
    title: { type: "text", default: "" },
  },
  pairs: ["element.palette-swatches", "ui.cursor-click", "text-in.punchline"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:media/html-explainer-video/demo/film.js#step2", license: "MIT", note: "flex-grow growth with display:none / gap 0 under 0.001 and staggered rows, ported to a self-built page + panel; every frame from t" },
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
    const vertical = p.axis === "vertical" || (p.axis === "auto" && R.h > R.w * 1.05);
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;`, host);
    mk("div", "position:absolute;inset:0;border-radius:var(--x-radius);background:var(--x-ground);", layer);
    const gapPx = 28 * k * 1.2;
    // the pair: a page (the neighbour) and the panel; a row runs right-to-left on an Arabic page, so the panel trails
    const pair = mk("div", `position:absolute;inset:${R.h * 0.04}px ${R.w * 0.03}px;display:flex;flex-direction:${vertical ? "column" : "row"};gap:${gapPx}px;`, layer);
    // no padding on the two flex items themselves (basis 0 + padding would make them unequal): it sits on a child
    const pageBox = mk("div", `flex:1 1 0;min-width:0;min-height:0;overflow:hidden;box-sizing:border-box;border-radius:var(--x-radius);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);display:flex;`, pair);
    const page = mk("div", `flex:1;min-width:0;box-sizing:border-box;padding:${30 * k * 1.2}px;display:flex;flex-direction:column;gap:${18 * k * 1.2}px;`, pageBox);
    // the page: a little site in the look (bar, title, lines, a button)
    const bar = mk("div", `display:flex;align-items:center;gap:${10 * k * 1.2}px;`, page);
    mk("div", `width:${26 * k * 1.2}px;height:${26 * k * 1.2}px;border-radius:30%;background:var(--x-accent);flex:none;`, bar);
    mk("div", `height:${10 * k * 1.2}px;width:30%;border-radius:999px;background:var(--x-line);`, bar);
    const headTxt = p.title || (own && !big ? own.textContent.trim() : "") || ((host.querySelector(".ml-title") || {}).textContent || "").trim() || (rtl ? "موقعك" : "Your site");
    const title = mk("div", `font:var(--x-head-weight) ${44 * k * 1.3}px/1.1 var(--x-head-font);letter-spacing:var(--x-head-track);color:var(--x-ink);overflow-wrap:anywhere;`, page, headTxt);
    for (let i = 0; i < 3; i++) mk("div", `height:${12 * k * 1.2}px;width:${[92, 80, 64][i]}%;border-radius:999px;background:var(--x-line);flex:none;`, page);
    mk("div", `align-self:flex-start;margin-top:auto;padding:${14 * k * 1.2}px ${26 * k * 1.2}px;border-radius:var(--x-radius-s);background:var(--x-accent);color:var(--x-accent-ink);font:600 ${22 * k * 1.2}px/1 var(--x-body-font);white-space:nowrap;`, page, rtl ? "ابدأ" : "Get started");
    const panel = mk("div", `flex:0 1 0;min-width:0;min-height:0;overflow:hidden;box-sizing:border-box;border-radius:var(--x-radius);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);display:none;`, pair);
    const inner = mk("div", `box-sizing:border-box;padding:${(vertical ? 22 : 28) * k * 1.2}px;display:flex;flex-direction:column;gap:${(vertical ? 8 : 14) * k * 1.2}px;${vertical ? "width:100%;" : `width:${(R.w * 0.94 - gapPx) / 2 - 2 * (parseFloat(getComputedStyle(pageBox).borderLeftWidth) || 0)}px;`}`, panel);
    mk("div", `font:var(--x-label-weight) ${20 * k * 1.1}px/1 var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:${rtl ? "none" : "var(--x-label-case)"};color:var(--x-dim);`, inner, p.rows === "look" ? (rtl ? "الهوية" : "The look") : rtl ? "التفاصيل" : "Details");
    // rows: what the look says, read off the page — or the target list's items
    const cs = getComputedStyle(layer);
    const v = (name) => cs.getPropertyValue(name).trim().replace(/"/g, "");
    const face = v("--x-head-font").split(",")[0].trim();
    const L = rtl ? { type: "الخط", ground: "الخلفية", ink: "الحبر", accent: "اللون", corners: "الحواف", motion: "الحركة" } : { type: "Type", ground: "Ground", ink: "Ink", accent: "Accent", corners: "Corners", motion: "Motion" };
    let rowsData;
    if (p.rows === "list") {
      const items = own && own.children.length > 1 ? [...own.children].map((c) => c.textContent.trim()).filter(Boolean) : rtl ? ["الخطة", "المدة", "القسط", "الحالة"] : ["Plan", "Term", "Instalment", "Status"];
      rowsData = items.slice(0, 6).map((x, i) => [x, ["✓", "12", "4,500", "●", "—", "+"][i % 6], null]);
    } else {
      rowsData = [[L.type, face, null], [L.ground, "", "--x-ground"], [L.ink, "", "--x-ink"], [L.accent, "", "--x-accent"], [L.corners, `${parseFloat(v("--x-radius")) || 0} px`, null], [L.motion, v("--x-motion") || "rise", null]];
    }
    const probe = mk("i", "position:absolute;visibility:hidden;", layer);
    const hexOf = (name) => { probe.style.color = `var(${name})`; const m = getComputedStyle(probe).color.match(/[\d.]+/g) || [0, 0, 0]; return "#" + m.slice(0, 3).map((x) => Math.round(+x).toString(16).padStart(2, "0")).join("").toUpperCase(); };
    const rows = rowsData.map(([key, val, col]) => {
      const r = mk("div", `display:flex;align-items:center;justify-content:space-between;gap:${12 * k}px;padding:${(vertical ? 7 : 12) * k * 1.2}px 0;border-top:1px solid var(--x-line);font:400 ${(vertical ? 20 : 22) * k * 1.2}px/1.2 var(--x-body-font);color:var(--x-dim);white-space:nowrap;`, inner);
      mk("span", "", r, key);
      const dd = mk("span", `display:flex;align-items:center;gap:${10 * k}px;color:var(--x-ink);font-weight:600;direction:ltr;${col ? "font-family:var(--x-mono-font);" : ""}overflow:hidden;text-overflow:ellipsis;`, r);
      if (col) { mk("i", `width:${20 * k * 1.2}px;height:${20 * k * 1.2}px;border-radius:50%;background:var(${col});box-shadow:inset 0 0 0 1px var(--x-line);flex:none;`, dd); dd.append(hexOf(col)); }
      else dd.textContent = val;
      return r;
    });
    probe.remove();
    // times (explainer step2): T is when the panel is fully "read"; it grows from T − 0.2·s to T + 0.35·s
    const s = ML.clamp(p.duration, 0.4, 0.7) / 0.55;
    const T = at + 0.2 * s + 0.1;
    const rowsT = T + 0.15;
    ctx.sfx(T - 0.2 * s, "whoosh.soft", 0.3);
    ctx.sfx(rowsT, "tap", 0.2);
    const leaveA = Math.max(rowsT + rows.length * 0.09 + 0.5, end - 0.3);
    return {
      draw(t) {
        const leave = ML.clamp((t - leaveA) / 0.25);
        layer.style.opacity = (ML.lin(t, at - 0.05, at + 0.12) * (1 - leave)).toFixed(4);
        layer.style.visibility = t < at - 0.06 ? "hidden" : "visible";
        const read = ML.ease(t, T - 0.2 * s, T + 0.35 * s);
        panel.style.flexGrow = read.toFixed(3);
        panel.style.display = read > 0.001 ? "block" : "none";
        pair.style.gap = read > 0.001 ? `${(gapPx * Math.min(1, read * 4)).toFixed(2)}px` : "0";
        ML.show(inner, t, T - 0.1);
        rows.forEach((r, i) => ML.show(r, t, rowsT + i * 0.09, Infinity, { dur: 0.3 }));
      },
    };
  },
});

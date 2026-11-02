// Chamfered panel reveal: a panel (or the label / button it targets) with crisp diagonal-cut corners —
// clip-path polygon cutting TL + BR, TR + BL, all four or just one, `cut` px (controls 6–10, cards 12–18, panels
// 20–32; one cut scale per film) — rises 15 px and fades in over 0.8 s cubic-bezier(.16, 1, .3, 1). Then its 1 px
// border, an outer shell under the same polygon filled with a 135° gradient (strong → clear at 46 % → soft), fades in
// over 0.4 s, and the fill brightens 1 → 1.08 → 1 over 0.5 s. The shape never changes: fills brighten, borders appear.
// In Arabic the single cut / the diagonal pair mirror to the reading side.
// Source: MengTo/Skills agent-skills/web-design/corner-diagonals (MIT) — the polygons, the cut tokens and the bordered
// shell; beautiful-shadows demo for the shell's layered light.
ML.define({
  id: "element.chamfer-surface",
  category: "element",
  name: "Chamfered panel reveal",
  does: "A panel or button with crisp diagonal-cut corners rises in, then its thin gradient border brightens around the cut silhouette.",
  says: ["tech", "precision", "brand"],
  energy: 2,
  targets: ["card", "label", "screen"],
  duration: [0.8, 2],
  params: {
    corners: { type: "choice", options: ["TL+BR", "TR+BL", "all", "one"], default: "TL+BR" },
    cut: { type: "number", range: [6, 32], default: 14, unit: "px" },
    border: { type: "choice", options: ["gradient", "solid", "none"], default: "gradient" },
    backdrop: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "ui.chamfer-button-light"],
  avoid: ["playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:agent-skills/web-design/corner-diagonals", license: "MIT", note: "bordered shell light after beautiful-shadows/demo" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const k = Math.min(f.W, f.H) / 1080;
    const B = Math.max(1, Math.round(1.5 * k)); // border width

    // corner polygons (corner-diagonals' shapes); in RTL the pairs mirror
    let corners = p.corners;
    if (rtl && corners === "TL+BR") corners = "TR+BL"; else if (rtl && corners === "TR+BL") corners = "TL+BR";
    const poly = (c) => {
      const C = `${c.toFixed(2)}px`, R = `calc(100% - ${C})`;
      if (corners === "all") return `polygon(${C} 0, ${R} 0, 100% ${C}, 100% ${R}, ${R} 100%, ${C} 100%, 0 ${R}, 0 ${C})`;
      if (corners === "TR+BL") return `polygon(0 0, ${R} 0, 100% ${C}, 100% 100%, ${C} 100%, 0 ${R})`;
      if (corners === "one") return rtl ? `polygon(0 0, ${R} 0, 100% ${C}, 100% 100%, 0 100%)` : `polygon(${C} 0, 100% 0, 100% 100%, 0 100%, 0 ${C})`;
      return `polygon(${C} 0, 100% 0, 100% ${R}, ${R} 100%, 0 100%, 0 ${C})`;
    };
    // a bigger stage keeps the cut's proportion to the panel
    const shellOf = (parent, css, cut) => {
      const shell = mk("div", `position:absolute;${css}clip-path:${poly(cut)};`, parent);
      const base = mk("div", `position:absolute;inset:0;background:var(--x-line);`, shell);
      const lit = mk("div", `position:absolute;inset:0;opacity:0;background:${p.border === "solid" ? "var(--x-accent)" : "linear-gradient(135deg, color-mix(in srgb, var(--x-accent) 85%, var(--x-panel)), transparent 46%, color-mix(in srgb, var(--x-accent-2) 60%, transparent))"};`, shell);
      const inset = p.border === "none" ? 0 : B;
      const fill = mk("div", `position:absolute;inset:${inset}px;background:var(--x-panel);clip-path:${poly(Math.max(0, cut - inset * 0.414))};`, shell);
      if (p.border === "none") { base.style.display = "none"; lit.style.display = "none"; }
      return { shell, lit, fill };
    };

    let wrap, parts, inner = [], hideOwn = null;
    const ob = own ? ctx.box(own) : null;
    const big = ob && ob.w > f.W * 0.4 && ob.h > f.H * 0.18;
    let back = null;
    if (own && !big) {
      // a label / button: the chamfered shell goes behind the real element, which keeps its own text
      const padX = Math.max(14 * k, ob.h * 0.35), padY = Math.max(8 * k, ob.h * 0.18);
      const cut = ML.clamp(p.cut * k, 6 * k, Math.min(ob.h * 0.45 + padY, 32 * k));
      wrap = mk("div", `position:absolute;left:${ob.x - padX}px;top:${ob.y - padY}px;width:${ob.w + padX * 2}px;height:${ob.h + padY * 2}px;pointer-events:none;z-index:5;`, host);
      parts = shellOf(wrap, "inset:0;", cut);
      if (getComputedStyle(own).position === "static") own.style.position = "relative";
      own.style.zIndex = "6";
      hideOwn = own;
    } else {
      const R = big ? ob : f.pic;
      const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;`, host);
      back = p.backdrop ? mk("div", "position:absolute;inset:0;background:var(--x-ground);", layer) : null;
      const pw = Math.min(R.w * 0.88, 860 * k), ph = Math.min(R.h * 0.8, pw * 0.62);
      const cut = ML.clamp(p.cut * k * 1.6, 6 * k, 48 * k);
      wrap = mk("div", `position:absolute;left:${(R.w - pw) / 2}px;top:${(R.h - ph) / 2}px;width:${pw}px;height:${ph}px;filter:drop-shadow(0 ${(18 * k).toFixed(1)}px ${(28 * k).toFixed(1)}px color-mix(in srgb, var(--x-ink) 14%, transparent));`, layer);
      parts = shellOf(wrap, "inset:0;", cut);
      const body = mk("div", `position:absolute;inset:0;box-sizing:border-box;padding:${ph * 0.11}px ${pw * 0.07}px;display:flex;flex-direction:column;gap:${ph * 0.05}px;`, wrap);
      const top = mk("div", `display:flex;align-items:center;gap:${pw * 0.02}px;`, body);
      mk("span", `width:${ph * 0.035}px;height:${ph * 0.035}px;background:var(--x-accent);clip-path:polygon(50% 0, 100% 50%, 50% 100%, 0 50%);`, top);
      mk("span", `font:var(--x-label-weight) ${ph * 0.05}px var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:${rtl ? "none" : "var(--x-label-case)"};color:var(--x-dim);`, top, rtl ? "النظام · ٠١" : "System · 01");
      inner.push(mk("div", `font:var(--x-head-weight) ${Math.min(ph * 0.14, pw * 0.08)}px/1.08 var(--x-head-font);letter-spacing:${rtl ? 0 : "var(--x-head-track)"};color:var(--x-ink);`, body, rtl ? "دقة في كل تفصيلة" : "Built to the millimetre"));
      inner.push(mk("div", `font:var(--x-body-weight) ${Math.min(ph * 0.065, pw * 0.04)}px/1.4 var(--x-body-font);color:var(--x-dim);max-width:88%;`, body, rtl ? "كل جزء متصمم عشان يشتغل مع الباقي من غير ما يبان." : "Every part engineered to fit the rest, without a seam."));
      // a chamfered control repeats the motif at the small cut size
      const bh = ph * 0.17, bw = Math.min(pw * 0.42, bh * 4.2);
      const btn = mk("div", `position:relative;margin-top:auto;width:${bw}px;height:${bh}px;`, body);
      const bp = shellOf(btn, "inset:0;", Math.max(6 * k, cut * 0.45));
      bp.fill.style.background = "var(--x-accent)";
      mk("div", `position:absolute;inset:0;display:grid;place-items:center;font:600 ${bh * 0.36}px var(--x-body-font);color:var(--x-accent-ink);`, btn, rtl ? "ابدأ دلوقتي" : "Get started");
      inner.push(btn);
      parts.btn = bp;
    }

    const curve = ML.bezier(0.16, 1, 0.3, 1);
    const rise = 0.8, edgeA = at + rise * 0.7, glowA = edgeA + 0.15;
    ctx.sfx(at + 0.05, "whoosh.soft", 0.2);
    ctx.sfx(edgeA + 0.1, "blip", 0.18);
    const goA = Math.max(glowA + 0.6, end - 0.3);

    return {
      draw(t) {
        const leave = ML.clamp((t - goA) / 0.28);
        const u = curve(ML.lin(t, at, at + rise));
        wrap.style.visibility = t < at - 0.1 ? "hidden" : "visible";
        if (back) { back.style.opacity = ML.out(t, at - 0.15, at + 0.15).toFixed(4); back.parentElement.style.opacity = (1 - leave).toFixed(4); back.parentElement.style.visibility = t < at - 0.2 ? "hidden" : "visible"; }
        const o = Math.min(1, u * 1.4) * (1 - leave);
        wrap.style.opacity = o.toFixed(4);
        wrap.style.translate = `0 ${((1 - u) * 15 * k).toFixed(2)}px`;
        if (hideOwn) { hideOwn.style.opacity = o.toFixed(4); hideOwn.style.translate = `0 ${((1 - u) * 15 * k).toFixed(2)}px`; }
        inner.forEach((e, i) => { const v = curve(ML.lin(t, at + 0.12 + i * 0.07, at + 0.12 + i * 0.07 + rise)); e.style.opacity = v.toFixed(4); e.style.translate = `0 ${((1 - v) * 10 * k).toFixed(2)}px`; });
        // border lights up, then the fill brightens 1 → 1.08 → 1
        const lit = ML.ease(t, edgeA, edgeA + 0.4);
        parts.lit.style.opacity = lit.toFixed(4);
        const br = 1 + 0.08 * Math.sin(Math.PI * ML.lin(t, glowA, glowA + 0.5));
        parts.fill.style.filter = br > 1.0005 ? `brightness(${br.toFixed(4)})` : "none";
        if (parts.btn) { parts.btn.lit.style.opacity = ML.ease(t, edgeA + 0.15, edgeA + 0.55).toFixed(4); const b2 = 1 + 0.08 * Math.sin(Math.PI * ML.lin(t, glowA + 0.15, glowA + 0.65)); parts.btn.fill.style.filter = b2 > 1.0005 ? `brightness(${b2.toFixed(4)})` : "none"; }
      },
    };
  },
});

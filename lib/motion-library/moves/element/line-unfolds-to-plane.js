// Line unfolds into a plane: a thin accent line draws across (0.25 s), then opens vertically from its own y into a
// solid colour rectangle — scaleY from the line's 2 px to the full height (≈45 % of the frame) over 0.4 s expo.out.
// Inside, 0.1 s after it opens: a faint grid texture, a small label in the top start corner, a huge heavy word in the
// bottom start corner and the plane's dimensions in the bottom end corner (corners mirror in Arabic). The plane is laid
// out at its full height and only ever scaled down.
// Source: prompt-motion "ayushunleashed-motion-designers-are-about" (reference only — rebuilt as our own code).
ML.define({
  id: "element.line-unfolds-to-plane",
  category: "element",
  name: "Line unfolds into a plane",
  does: "A line opens vertically into a solid colour rectangle carrying a big word and small spec labels.",
  says: ["step", "reveal", "precision"],
  energy: 3,
  targets: ["card", "shape"],
  duration: [0.6, 1.5],
  params: {
    height: { type: "number", range: [20, 80], default: 45, unit: "%" },
    content: { type: "choice", options: ["word", "labels", "both"], default: "both" },
    word: { type: "text", default: "" },
    label: { type: "text", default: "" },
    fill: { type: "choice", options: ["accent", "ink", "panel"], default: "accent" },
    grid: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "transition.line-open"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:ayushunleashed-motion-designers-are-about", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const R = own ? ctx.box(own) : f.pic;
    const H = Math.min(f.H * ML.clamp(p.height, 20, 80) / 100, own ? f.H - 40 : R.h);
    const cy = R.y + R.h / 2;
    const top = ML.clamp(cy - H / 2, 20, f.H - 20 - H);
    const W = R.w;
    const ink = p.fill === "panel" ? "var(--x-ink)" : p.fill === "ink" ? "var(--x-ground)" : "var(--x-accent-ink)";
    const bg = p.fill === "panel" ? "var(--x-panel)" : p.fill === "ink" ? "var(--x-ink)" : "var(--x-accent)";
    const lineY = cy;
    const line = mk("div", `position:absolute;left:${R.x}px;top:${lineY - 1}px;width:${W}px;height:2px;background:${p.fill === "panel" ? "var(--x-ink)" : bg};transform-origin:${rtl ? "100%" : "0"} 50%;z-index:7;pointer-events:none;`, host);
    const plane = mk("div", `position:absolute;left:${R.x}px;top:${top}px;width:${W}px;height:${H}px;box-sizing:border-box;background:${bg};color:${ink};overflow:hidden;z-index:7;pointer-events:none;transform-origin:50% ${lineY - top}px;${p.fill === "panel" ? "border:var(--x-edge) solid var(--x-edge-color);" : ""}`, host);
    const inner = mk("div", "position:absolute;inset:0;", plane);
    const pad = Math.max(18, Math.min(W, H) * 0.06);
    if (p.grid) { const g = Math.max(24, Math.min(W, H) / 9); mk("div", `position:absolute;inset:0;background-image:linear-gradient(to right, color-mix(in srgb, currentColor 12%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, currentColor 12%, transparent) 1px, transparent 1px);background-size:${g}px ${g}px;background-position:${rtl ? "right" : "left"} top;`, inner); }
    const start = rtl ? "right" : "left", endSide = rtl ? "left" : "right";
    const labelSize = Math.max(16, Math.min(26, H * 0.06));
    const words = (host.querySelector(".ml-title") && host.querySelector(".ml-title").textContent.trim().split(/\s+/)) || [];
    const wordText = p.word || (own && own.textContent.trim().split(/\s+/)[0]) || words[0] || (rtl ? "خطوة" : "Step");
    const labelText = p.label || (host.querySelector(".ml-label") && host.querySelector(".ml-label").textContent.trim()) || "01";
    const showWord = p.content !== "labels", showLabels = p.content !== "word";
    const lab = showLabels ? mk("div", `position:absolute;${start}:${pad}px;top:${pad}px;white-space:nowrap;font:var(--x-label-weight) ${labelSize}px var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:${rtl ? "none" : "var(--x-label-case)"};opacity:.85;`, inner, labelText) : null;
    const dims = showLabels ? mk("div", `position:absolute;${endSide}:${pad}px;bottom:${pad}px;white-space:nowrap;direction:ltr;font:500 ${labelSize}px var(--x-mono-font);opacity:.7;`, inner, `${Math.round(W)} × ${Math.round(H)}`) : null;
    let word = null;
    if (showWord) {
      word = mk("div", `position:absolute;${start}:${pad}px;bottom:${pad * 0.6}px;white-space:nowrap;font:900 ${Math.min(H * 0.5, f.W * 0.3)}px/0.95 var(--x-head-font);letter-spacing:${rtl ? 0 : "var(--x-hero-track)"};`, inner, wordText);
      ML.fit(word, W - pad * 2 - (dims ? dims.offsetWidth + pad : 0));
    }
    const a0 = at, a1 = a0 + 0.25, a2 = a1 + 0.4;
    ctx.sfx(a1, "whoosh.soft", 0.3);
    const leave0 = Math.max(a2 + 0.4, end - 0.3);
    const parts = [lab, word, dims].filter(Boolean);
    return {
      draw(t) {
        const lv = ML.clamp((t - leave0) / 0.25);
        const d = ML.expo(t, a0, a1);
        line.style.visibility = t >= a0 && t < a1 + 0.05 ? "visible" : "hidden";
        line.style.transform = `scaleX(${d.toFixed(4)})`;
        const o = ML.expo(t, a1, a2);
        plane.style.visibility = t >= a1 ? "visible" : "hidden";
        plane.style.transform = `scaleY(${Math.max(2 / H, o).toFixed(5)})`;
        plane.style.opacity = (1 - lv).toFixed(4);
        parts.forEach((e, i) => { const k = ML.out(t, a1 + 0.1 + i * 0.05, a1 + 0.4 + i * 0.05); e.style.opacity = (k * (e === dims ? 0.7 : e === lab ? 0.85 : 1)).toFixed(4); e.style.translate = `0 ${((1 - k) * labelSize * 0.6).toFixed(2)}px`; });
      },
    };
  },
});

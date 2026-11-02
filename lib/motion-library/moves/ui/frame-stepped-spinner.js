// Frame-stepped spinner: the product's own loader, turned by the film's clock instead of requestAnimationFrame or CSS
// keyframes. The frame index is floor((t − at) / frame_ms) mod n — exactly as the app steps it — and the frame decides
// everything: which of 12 spokes is brightest (the iOS / macOS activity indicator), the rotation of an arc ring in
// discrete steps, which of three dots is up, or which braille glyph a terminal spinner shows. Structure and look stay
// the product's; only the clock changes. Optional label beside it ("Loading…").
// Source: Rieranthony/product-film-skill reference/engine.md "Frame-driven twins" (MIT).
ML.define({
  id: "ui.frame-stepped-spinner",
  category: "ui",
  name: "Frame-driven spinner / loader twin",
  does: "The product's spinner turns exactly as in the app, but driven by the film's clock.",
  says: ["time", "tech"],
  energy: 1,
  targets: ["shape"],
  duration: [0.5, 4],
  params: {
    frame_ms: { type: "number", range: [16, 150], default: 80, unit: "ms" },
    style: { type: "choice", options: ["spokes", "arc", "dots", "braille"], default: "spokes" },
    size: { type: "number", range: [0.04, 0.2], default: 0.09 },
    label: { type: "text", default: "" },
  },
  pairs: ["ui.generate-run", "ui.button-loading-keep-width"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "product-film-skill:reference/engine.md", license: "MIT", note: "frame-driven twins: index = floor(t / interval) mod n" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const inEl = ctx.el && ctx.el !== ctx.stage;
    const R = f.pic;
    const D = inEl ? Math.max(16, Math.min(ctx.el.clientWidth, ctx.el.clientHeight || ctx.el.clientWidth) * 0.8) : Math.min(f.W, f.H) * p.size;
    const wrap = inEl
      ? mk("div", "display:inline-flex;align-items:center;justify-content:center;pointer-events:none;", ctx.el)
      : mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;display:flex;align-items:center;justify-content:center;gap:${(D * 0.35).toFixed(1)}px;pointer-events:none;z-index:6;`, host);
    const box = mk("div", `position:relative;width:${D.toFixed(1)}px;height:${D.toFixed(1)}px;display:grid;place-items:center;color:var(--x-ink);`, wrap);
    const label = p.label ? mk("span", `font:var(--x-body-weight) ${(D * 0.42).toFixed(1)}px var(--x-body-font);color:var(--x-dim);`, wrap, p.label) : null;

    let n, paint;
    if (p.style === "arc") {
      // a ring with an accent arc, rotated in whole steps
      n = 12;
      const g = sv("svg", { viewBox: "0 0 40 40", width: D, height: D }, box);
      sv("circle", { cx: 20, cy: 20, r: 16, fill: "none", stroke: "var(--x-line)", "stroke-width": 4 }, g);
      sv("circle", { cx: 20, cy: 20, r: 16, fill: "none", stroke: "var(--x-accent)", "stroke-width": 4, "stroke-linecap": "round", "stroke-dasharray": "25 100" }, g);
      paint = (i) => { g.style.transform = `rotate(${(i * 30 * (rtl ? -1 : 1)).toFixed(1)}deg)`; };
    } else if (p.style === "dots") {
      const row = mk("div", `display:flex;gap:${(D * 0.12).toFixed(1)}px;align-items:center;flex-direction:${rtl ? "row-reverse" : "row"};`, box);
      const ds = [0, 1, 2].map(() => mk("span", `width:${(D * 0.22).toFixed(1)}px;height:${(D * 0.22).toFixed(1)}px;border-radius:50%;background:var(--x-accent);`, row));
      paint = (i) => ds.forEach((d, j) => { const up = i % 3 === j && i < 6; d.style.translate = `0 ${up ? (-D * 0.16).toFixed(1) : 0}px`; d.style.opacity = up ? "1" : "0.45"; });
      n = 3;
    } else if (p.style === "braille") {
      const glyphs = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
      n = glyphs.length;
      const g = mk("span", `font:500 ${(D * 0.9).toFixed(1)}px/1 var(--x-mono-font);color:var(--x-accent);`, box, glyphs[0]);
      paint = (i) => { g.textContent = glyphs[i]; };
    } else {
      // 12 spokes, the brightest one stepping round; the trail fades behind it
      n = 12;
      const g = sv("svg", { viewBox: "0 0 40 40", width: D, height: D }, box);
      const spokes = Array.from({ length: 12 }, (_, j) => sv("rect", { x: 18.5, y: 3, width: 3, height: 10, rx: 1.5, fill: "currentColor", transform: `rotate(${j * 30} 20 20)` }, g));
      paint = (i) => spokes.forEach((s, j) => { const age = (((rtl ? j - i : i - j) % 12) + 12) % 12; s.setAttribute("opacity", (1 - age * 0.07).toFixed(3)); });
    }
    const ms = p.frame_ms / 1000;
    return {
      draw(t) {
        const vis = ML.lin(t, at, at + 0.2) * (1 - ML.clamp((t - (end - 0.25)) / 0.2));
        wrap.style.opacity = vis.toFixed(4);
        const i = Math.floor(Math.max(0, t - at) / ms + 1e-9) % n;
        paint(i);
      },
    };
  },
});

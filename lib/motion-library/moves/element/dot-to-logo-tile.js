// Dot inflates into the logo tile: a small ink dot (r 8 px at 720p, scaled to the stage) morphs into a rounded tile
// over 0.4 s — corner radius 50 % → 18 % (squircle; 6 % square; 50 % circle) while it grows to `size` on
// back.out(1.4). At 0.5 s the logo glyph (the target's own mark, recoloured to the tile's ink, or the brand's first
// letter) fades and scales in 0.8 → 1 over 0.25 s. Optional ground: a faint dot grid (1 px dots, 24 px pitch) with
// a tiny zoom % label, like a design canvas. The tile is laid out at its full size and only ever scaled down.
// Source: prompt-motion "kikelopezdesign-lol-i-asked-opus" (reference only — rebuilt as our own code).
ML.define({
  id: "element.dot-to-logo-tile",
  category: "element",
  name: "Dot inflates into the logo tile",
  does: "A small dot inflates into a rounded tile and the logo glyph appears inside it.",
  says: ["brand", "arrival", "simplicity"],
  energy: 2,
  targets: ["logo", "shape"],
  duration: [0.8, 1.6],
  params: {
    shape: { type: "choice", options: ["square", "circle", "squircle"], default: "squircle" },
    glyph: { type: "choice", options: ["logo", "letter"], default: "logo" },
    size: { type: "number", range: [60, 160], default: 90, unit: "px" },
    fill: { type: "choice", options: ["ink", "accent"], default: "ink" },
    grid: { type: "bool", default: false },
    name: { type: "text", default: "" },
    backdrop: { type: "bool", default: true },
  },
  pairs: ["element.app-icon-reveal", "text-in.punchline"],
  avoid: ["urgency", "problem"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "prompt-motion:kikelopezdesign-lol-i-asked-opus", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, f, el, rtl } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const own = el && el !== ctx.stage ? el : null;
    const big = own && ctx.box(own).w > f.W * 0.35 && ctx.box(own).h > f.H * 0.18;
    const R = big ? ctx.box(own) : f.pic;
    const k = Math.min(f.W, f.H) / 720;
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;`, host);
    const back = p.backdrop || p.grid ? mk("div", `position:absolute;inset:0;border-radius:var(--x-radius);background-color:var(--x-ground);${p.grid ? `background-image:radial-gradient(circle, color-mix(in srgb, var(--x-ink) 22%, transparent) ${Math.max(1, k * 0.8).toFixed(2)}px, transparent ${(Math.max(1, k * 0.8) + 0.6).toFixed(2)}px);background-size:${24 * k}px ${24 * k}px;background-position:center;` : ""}`, layer) : null;
    const zoom = p.grid ? mk("div", `position:absolute;bottom:${16 * k}px;${rtl ? "left" : "right"}:${20 * k}px;font:var(--x-label-weight) ${11 * k}px var(--x-mono-font);color:var(--x-dim);letter-spacing:0.04em;`, layer, "100%") : null;

    const S = Math.min(ML.clamp(p.size, 60, 160) * k, R.w * 0.6, R.h * 0.6);
    const ink = p.fill === "accent" ? "var(--x-accent-ink)" : "var(--x-ground)";
    const radius = p.shape === "circle" ? 50 : p.shape === "square" ? 6 : 18;
    const tile = mk("div", `position:absolute;left:${(R.w - S) / 2}px;top:${(R.h - S) / 2}px;width:${S}px;height:${S}px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:${p.fill === "accent" ? "var(--x-accent)" : "var(--x-ink)"};color:${ink};box-shadow:var(--x-shadow);`, layer);
    // the glyph: the logo's own mark (its lettering dropped, recoloured), or the brand's first letter
    const name = p.name || (own && (own.getAttribute("aria-label") || own.textContent || "").trim()) || (rtl ? "علامة" : "brand");
    let glyph = null;
    if (p.glyph === "logo" && own && own.tagName.toLowerCase() === "svg") {
      const sv = own.cloneNode(true);
      sv.removeAttribute("data-slot"); sv.removeAttribute("width"); sv.removeAttribute("height");
      sv.querySelectorAll("text").forEach((x) => x.remove());
      sv.querySelectorAll("[fill]").forEach((x) => x.getAttribute("fill") !== "none" && x.setAttribute("fill", "currentColor"));
      sv.querySelectorAll("[stroke]").forEach((x) => x.getAttribute("stroke") !== "none" && x.setAttribute("stroke", "currentColor"));
      sv.style.cssText = "width:56%;height:56%;display:block;overflow:visible;";
      tile.append(sv);
      try { const b = sv.getBBox(); if (b.width > 0 && b.height > 0) { const m = Math.max(b.width, b.height), pad = m * 0.04; sv.setAttribute("viewBox", `${b.x + b.width / 2 - m / 2 - pad} ${b.y + b.height / 2 - m / 2 - pad} ${m + pad * 2} ${m + pad * 2}`); } } catch (e) { /* not laid out: keep its viewBox */ }
      glyph = sv;
    } else if (p.glyph === "logo" && own && own.tagName === "IMG") {
      // a picture mark: shown at or below its pixels, never blurred
      const im = own.cloneNode(true); im.removeAttribute("data-slot");
      const side = Math.min(S * 0.62, own.naturalWidth || S, own.naturalHeight || S);
      im.style.cssText = `width:${side}px;height:${side}px;object-fit:contain;display:block;`;
      tile.append(im); glyph = im;
    } else glyph = mk("div", `font:var(--x-head-weight) ${S * 0.52}px/1 var(--x-head-font);`, tile, Array.from(name)[0] || "•");

    const r0 = 8 * k, m0 = at, m1 = at + 0.4, g0 = at + 0.5, g1 = g0 + 0.25;
    const go = Math.max(g1 + 0.3, end - 0.28);
    ctx.sfx(m1 - 0.08, "pop", 0.45);
    ctx.sfx(g0, "tap", 0.2);

    return {
      draw(t) {
        if (own && !big) own.style.opacity = t >= at ? "0" : "";
        const on = t >= at - 0.2 && t < go + 0.3;
        layer.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        layer.style.opacity = (1 - ML.clamp((t - go) / 0.28)).toFixed(4);
        if (back) back.style.opacity = ML.out(t, at - 0.2, at).toFixed(4);
        if (zoom) zoom.style.opacity = (0.8 * ML.out(t, at, at + 0.3)).toFixed(4);
        // the dot: r0 → S on back.out(1.4); the corners 50 % → the tile's radius
        const u = ML.back(t, m0, m1, 1.4), v = ML.ease(t, m0, m1);
        const sc = (2 * r0) / S + (1 - (2 * r0) / S) * u;
        tile.style.transform = `scale(${Math.max(0, sc).toFixed(4)})`;
        tile.style.borderRadius = `${(50 + (radius - 50) * v).toFixed(2)}%`;
        tile.style.opacity = ML.lin(t, m0 - 0.05, m0 + 0.05).toFixed(4);
        // the glyph
        const g = ML.out(t, g0, g1);
        glyph.style.opacity = g.toFixed(4);
        glyph.style.transform = `scale(${(0.8 + 0.2 * g).toFixed(4)})`;
      },
    };
  },
});

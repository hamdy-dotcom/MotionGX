// Scrim title: over full-frame footage, a dark gradient scrim rises from the bottom (or falls from the top) and the
// title sits on it at the frame's inset — keyframed over the clip's length L exactly as the explainer's camera titles:
// scrim opacity 0% 0 → 12% 1 → 88% 1 → 100% 0; title 0% (0, +rise) → 15% (1, 0) → 89% 1 → 100% (0, −rise/2), linear
// between keys, all computed from t. Sizes in vmin (the short side), so the title survives every shape; the inset
// mirrors for RTL.
// Source: MengTo/Skills html-explainer-video, references/camera.md "Titles over the full-frame camera" (MIT).
ML.define({
  id: "text-in.scrim-title",
  category: "text-in",
  name: "Scrim title",
  does: "A title rises in over a dark gradient scrim at the bottom of full-frame footage, holds, and drifts up as it fades.",
  says: ["story", "brand", "calm"],
  energy: 2,
  targets: ["headline", "line"],
  duration: [1.5, 4],
  params: {
    position: { type: "choice", options: ["bottom", "top"], default: "bottom" },
    length: { type: "number", range: [1.5, 4], default: 2.4, unit: "s" },
    scrim: { type: "number", range: [0.4, 0.9], default: 0.72 },
    rise: { type: "number", range: [0.5, 3], default: 1.6, unit: "vmin" },
  },
  pairs: ["photo.ken-burns", "camera.push-in"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:html-explainer-video/references/camera.md", license: "MIT", note: "Titles over the full-frame camera" },
  async setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    // measure with the real face: wait for the faces this text uses (a page's fonts can still be arriving)
    try { const cs = getComputedStyle(el); await document.fonts.load(`${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, el.textContent || "A"); await document.fonts.ready; } catch (e) { /* no font API: measure as is */ }
    const host = ctx.scene || ctx.stage, W = ctx.f.W, H = ctx.f.H, v = Math.min(W, H) / 100, top = p.position === "top";
    // the title clears what a phone covers (the frame's safe area), and the scrim always reaches past the title
    const inset = 4.2 * v, lift = Math.max(8.6 * v, top ? ctx.f.safe.y : H - ctx.f.safe.y - ctx.f.safe.h);
    const scrim = document.createElement("div");
    scrim.style.cssText = `position:absolute;left:0;right:0;${top ? "top" : "bottom"}:0;height:${(lift + 25.4 * v).toFixed(1)}px;pointer-events:none;opacity:0;` +
      `background:linear-gradient(${top ? "to top" : "to bottom"}, transparent, color-mix(in srgb, var(--x-device) ${(p.scrim * 100).toFixed(0)}%, transparent) ${(100 * (25.4 + 8.6) * v / (lift + 25.4 * v)).toFixed(1)}%);`; // full strength at the source's distance from the title
    host.append(scrim);
    // the look's first colour that reads on the scrim (--x-accent-ink is dark in a look with a bright accent)
    const probe = document.createElement("span"); host.append(probe);
    const lum = (name) => {
      probe.style.color = `var(${name})`;
      const c = getComputedStyle(probe).color, m = c.match(/[\d.]+/g).slice(0, 3).map(Number).map((x) => (c.startsWith("color(") ? x : x / 255));
      const [r, g, b] = m.map((x) => (x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05;
    };
    const under = lum("--x-device"), inks = ["--x-accent-ink", "--x-panel", "--x-ground", "--x-ink"].map((name) => ({ name, k: Math.max(lum(name), under) / Math.min(lum(name), under) }));
    const ink = (inks.find((x) => x.k >= 4.5) || inks.reduce((a, b) => (b.k > a.k ? b : a))).name;
    probe.remove();
    // the title on the scrim: one line at the inset, sized in vmin, shrunk to fit the frame
    el.style.position = "absolute";
    el.style.margin = "0"; el.style.whiteSpace = "nowrap"; el.style.width = "auto"; el.style.zIndex = "1";
    el.style.font = `var(--x-head-weight) ${(6.2 * v).toFixed(1)}px / 1.05 var(--x-head-font)`;
    el.style.letterSpacing = ctx.rtl ? "0" : "var(--x-head-track)";
    el.style.color = `var(${ink})`;
    el.style.textAlign = ctx.rtl ? "right" : "left";
    el.style.left = "0"; el.style.top = "0";
    try { const cs = getComputedStyle(el); await document.fonts.load(`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, el.textContent || "A"); } catch (e) { /* measure as is */ }
    ML.fit(el, W - inset * 2);
    // anchored by its own edges (start inset and the scrim side), so a late font swap never pushes it off the frame
    const ob = ctx.box(el.offsetParent || host);
    el.style.left = el.style.top = "auto";
    if (ctx.rtl) el.style.right = (ob.x + ob.w - (W - inset)).toFixed(1) + "px"; else el.style.left = (inset - ob.x).toFixed(1) + "px";
    if (top) el.style.top = (lift - ob.y).toFixed(1) + "px"; else el.style.bottom = (ob.y + ob.h - (H - lift)).toFixed(1) + "px";
    el.style.maxWidth = (W - inset * 2).toFixed(1) + "px";
    const L = Math.max(0.6, Math.min(p.length, end - at));
    const keys = (t, list) => { const x = (t - at) / L; if (x <= list[0][0]) return list[0][1]; for (let i = 1; i < list.length; i++) if (x <= list[i][0]) { const [a, va] = list[i - 1], [b, vb] = list[i]; return va + (vb - va) * ((x - a) / (b - a)); } return list[list.length - 1][1]; };
    ctx.sfx(at, "whoosh.soft", 0.25);
    return {
      draw(t) {
        const so = t < at ? 0 : keys(t, [[0, 0], [0.12, 1], [0.88, 1], [1, 0]]);
        scrim.style.opacity = so.toFixed(4);
        const o = t < at ? 0 : keys(t, [[0, 0], [0.15, 1], [0.89, 1], [1, 0]]);
        const ty = t < at ? p.rise * v : keys(t, [[0, p.rise * v], [0.15, 0], [0.89, 0], [1, -p.rise * v * 0.5]]);
        el.style.opacity = o.toFixed(4);
        el.style.translate = `0 ${ty.toFixed(2)}px`;
      },
    };
  },
});

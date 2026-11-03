// Card image focus zoom: inside its card's own rounded, overflow-hidden window the picture brightens (the source's
// opacity over a dark card, as brightness brighten_from → 1 so it reads the same on any look's ground) and pushes gently forward (scale 1 → zoom, capped at its own pixels) over `duration` on
// cubic-bezier(.22,.61,.36,1), drifting a little toward its subject — the frame stays put. The subject is found once
// in setup from the picture's weight (luminance-contrast centroid; centre when the picture cannot be read). A to-top
// scrim from the ground keeps card info readable. With several targets (a row), the first is chosen and the others
// stay dimmed. Lands on the item's spoken word when the director places it on one.
// Source: MengTo/Skills web-design/agency-grid-layout-minimal + build-threejs-scroll-worlds (MIT: the card window
// pushing toward its look target, the duration-1000 brighten + scale, the to-top scrim).
ML.define({
  id: "photo.card-focus-zoom",
  category: "photo",
  name: "Card image focus zoom",
  does: "The picture inside a card brightens and pushes gently forward while the card frame stays put, marking it as the chosen one.",
  says: ["focus", "choice", "luxury", "story"],
  energy: 2,
  targets: ["image", "card"],
  duration: [0.6, 2],
  params: {
    zoom: { type: "number", range: [1.02, 1.08], default: 1.05 },
    brighten_from: { type: "number", range: [0.6, 1], default: 0.8 },
    duration: { type: "number", range: [0.5, 1.2], default: 0.9, unit: "s" },
    toward_subject: { type: "bool", default: true },
    origin: { type: "choice", options: ["center", "top", "subject"], default: "center" },
    scrim: { type: "bool", default: false },
  },
  pairs: ["photo.bracket-mount", "photo.colorize"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/web-design/agency-grid-layout-minimal", license: "MIT", note: "with build-threejs-scroll-worlds (card window push) and dither-laser-dark-mode" },
  setup(ctx) {
    const { p, at, end } = ctx;
    const targets = (ctx.els.length ? ctx.els : [ctx.el]).filter(Boolean);
    if (!targets.length) return null;
    const ease = ML.bezier(0.22, 0.61, 0.36, 1), D = Math.min(p.duration, Math.max(0.3, end - at - 0.1));
    // each target → its picture inside a clipping window with the picture's own radius
    const items = targets.map((t0) => {
      const img = t0.tagName === "IMG" ? t0 : t0.querySelector("img") || t0;
      const cs = getComputedStyle(img), W = img.offsetWidth, H = img.offsetHeight;
      let win = img.parentElement;
      if (img === t0 || getComputedStyle(win).overflow === "visible") {
        win = document.createElement("div");
        const placed = cs.position === "absolute" || cs.position === "fixed" ? `position:${cs.position};left:${cs.left};top:${cs.top};z-index:${cs.zIndex}` : "position:relative"; // takes the target's place
        win.style.cssText = `${placed};overflow:hidden;width:${W}px;height:${H}px;border-radius:${cs.borderRadius};margin:${cs.margin};flex:none;justify-self:${cs.justifySelf};align-self:${cs.alignSelf}`;
        img.replaceWith(win); win.append(img);
        Object.assign(img.style, { position: "static", width: "100%", height: "100%", display: "block", margin: "0", borderRadius: "0" });
      }
      // the subject: the luminance-contrast centroid of a small sample
      let sx = 0.5, sy = 0.45;
      try {
        if (img.tagName === "IMG" && img.naturalWidth) {
          const c = document.createElement("canvas"); c.width = 32; c.height = 32;
          const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0, 32, 32);
          const d = g.getImageData(0, 0, 32, 32).data; let mean = 0;
          for (let i = 0; i < 1024; i++) mean += (d[i * 4] * 0.2126 + d[i * 4 + 1] * 0.7152 + d[i * 4 + 2] * 0.0722) / 1024;
          let wx = 0, wy = 0, ws = 0;
          for (let i = 0; i < 1024; i++) { const l = d[i * 4] * 0.2126 + d[i * 4 + 1] * 0.7152 + d[i * 4 + 2] * 0.0722, w = Math.abs(l - mean); wx += w * ((i % 32) + 0.5) / 32; wy += w * (Math.floor(i / 32) + 0.5) / 32; ws += w; }
          if (ws > 0) { sx = wx / ws; sy = wy / ws; }
        }
      } catch (e) { /* unreadable picture: centre */ }
      const cap = img.naturalWidth ? Math.max(1, 1 / Math.max(W / img.naturalWidth, H / img.naturalHeight)) : p.zoom;
      img.style.transformOrigin = p.origin === "top" ? "50% 0%" : p.origin === "subject" ? `${(sx * 100).toFixed(1)}% ${(sy * 100).toFixed(1)}%` : "50% 50%";
      let scrim = null;
      if (p.scrim) {
        if (getComputedStyle(win).position === "static") win.style.position = "relative"; // the card's own window holds it
        scrim = document.createElement("div");
        scrim.style.cssText = `position:absolute;inset:0;pointer-events:none;background:linear-gradient(to top, var(--x-ground), color-mix(in srgb, var(--x-ground) 40%, transparent) 35%, transparent 70%)`;
        win.append(scrim);
      }
      const base = cs.filter === "none" ? "" : cs.filter;
      return { img, W, H, sx, sy, zoom: Math.min(p.zoom, cap), base };
    });
    ctx.sfx(at, "whoosh.soft", 0.18);
    return {
      draw(t) {
        items.forEach((it, i) => {
          const u = i === 0 ? ease(ML.lin(t, at, at + D)) : 0;
          const lit = p.brighten_from + (1 - p.brighten_from) * u;
          it.img.style.filter = lit < 0.9995 ? `${it.base} brightness(${lit.toFixed(4)})`.trim() : it.base || "none";
          const sc = 1 + (it.zoom - 1) * u;
          it.img.style.scale = u > 0 ? sc.toFixed(5) : "none";
          // a small drift toward the subject, inside what the zoom's margin allows
          if (p.toward_subject && p.origin === "center" && u > 0) {
            const mx = (it.W * (sc - 1)) / 2, my = (it.H * (sc - 1)) / 2;
            const dx = ML.clamp((0.5 - it.sx) * 2, -1, 1) * mx * 0.6 * u, dy = ML.clamp((0.5 - it.sy) * 2, -1, 1) * my * 0.6 * u;
            it.img.style.translate = `${dx.toFixed(2)}px ${dy.toFixed(2)}px`;
          } else it.img.style.translate = "none";
        });
      },
    };
  },
});

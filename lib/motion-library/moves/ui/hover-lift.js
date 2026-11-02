// Hover lift with glow — animation-systems' "Hover: lift + glow" micro-interaction. When the pointer arrives the card
// rises `lift` px (y −2 … −8), its shadow grows a little and an accent edge glow strengthens, all in 0.18 s ease-out
// (micro: 120–200 ms); the picture inside eases 1 → `image_zoom` over 0.7 s power3.out (cinematic-gsap's media hover),
// and with `colourise` it turns from grayscale to colour. Web px grow with the stage (×2 at 1080). A pointer glides in
// for the hover (pointer) and the card settles back when it leaves (release). On a target the director gives, that card
// (or picture) lifts; a picture is only zoomed as far as its own pixels allow. Alone it builds a row of three cards
// with drawn pictures (look colours) and hovers the middle one.
// Sources: MengTo/Skills web-design/animation-systems + cinematic-gsap-lenis-motion-system (MIT).
ML.define({
  id: "ui.hover-lift",
  category: "ui",
  name: "Hover lift with glow",
  does: "A card rises a few pixels and its shadow and border glow strengthen when pointed at.",
  says: ["focus", "choice"],
  energy: 2,
  targets: ["card", "image"],
  duration: [0.2, 1],
  params: {
    lift: { type: "number", range: [2, 8], default: 4, unit: "px" },
    image_zoom: { type: "number", range: [1, 1.08], default: 1.06 },
    colourise: { type: "bool", default: false },
    glow: { type: "bool", default: true },
    pointer: { type: "bool", default: true },
    release: { type: "bool", default: false },
  },
  pairs: ["ui.gradient-border", "ui.cursor-glide-click"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/animation-systems", license: "MIT", note: "image zoom + colourise from web-design/cinematic-gsap-lenis-motion-system (MIT)" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080, s = 2 * k;

    let card = ctx.el && ctx.el !== ctx.stage ? ctx.el : null, media = null, wrap = null, maxZoom = p.image_zoom;
    if (!card) {
      const R = f.pic;
      wrap = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;display:flex;align-items:center;justify-content:center;gap:${(28 * k).toFixed(1)}px;z-index:6;pointer-events:none;`, host);
      const cw = Math.min((R.w - 56 * k) / 3, 440 * k), ih = Math.min(cw * 1.05, R.h * 0.62);
      const items = rtl ? [["مجموعة الربيع", "12 قطعة"], ["رحلة الصحراء", "8 قطع"], ["ضوء المدينة", "15 قطعة"]] : [["Spring set", "12 pieces"], ["Desert trip", "8 pieces"], ["City light", "15 pieces"]];
      const cards = items.map(([title, sub], i) => {
        const c = mk("div", `position:relative;width:${cw.toFixed(1)}px;box-sizing:border-box;padding:${(14 * k).toFixed(1)}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:var(--x-radius);box-shadow:var(--x-shadow);font-family:var(--x-body-font);color:var(--x-ink);`, wrap);
        const frame = mk("div", `position:relative;height:${ih.toFixed(1)}px;overflow:hidden;border-radius:calc(var(--x-radius) * 0.7);`, c);
        const art = mk("div", `position:absolute;inset:0;transform-origin:50% 60%;background:linear-gradient(${150 + i * 25}deg, ${["var(--x-accent-2)", "var(--x-glow-1)", "var(--x-accent)"][i]}, color-mix(in srgb, ${["var(--x-accent)", "var(--x-bad)", "var(--x-ink)"][i]} 75%, var(--x-panel)));`, frame);
        const g = sv("svg", { viewBox: "0 0 100 100", preserveAspectRatio: "xMidYMid slice", style: "position:absolute;inset:0;width:100%;height:100%;" }, art);
        sv("circle", { cx: 30 + i * 18, cy: 30, r: 12, fill: "var(--x-panel)", "fill-opacity": 0.5 }, g);
        sv("path", { d: `M0 ${62 + i * 3} Q28 ${44 + i * 4} 52 ${60 - i * 2} T100 ${54 + i * 2} V100 H0 Z`, fill: "var(--x-ink)", "fill-opacity": 0.25 }, g);
        sv("path", { d: `M0 ${76 - i * 2} Q35 ${66} 64 ${74} T100 ${70} V100 H0 Z`, fill: "var(--x-ink)", "fill-opacity": 0.35 }, g);
        mk("div", `margin-top:${(16 * k).toFixed(1)}px;padding:0 ${(8 * k).toFixed(1)}px;font:600 ${(30 * k).toFixed(1)}px var(--x-body-font);`, c, title);
        mk("div", `padding:${(4 * k).toFixed(1)}px ${(8 * k).toFixed(1)}px ${(8 * k).toFixed(1)}px;font:var(--x-body-weight) ${(24 * k).toFixed(1)}px var(--x-body-font);color:var(--x-dim);`, c, sub);
        return { c, art };
      });
      card = cards[1].c; media = cards[1].art;
      if (p.colourise) cards.forEach((x) => (x.art.style.filter = "grayscale(1)"));
    } else {
      media = card.tagName === "IMG" ? null : card.querySelector("img, video, picture, [data-media]");
      if (card.tagName === "IMG") { card.style.overflow = "hidden"; }
      const img = media && media.tagName === "IMG" ? media : null;
      // never enlarge a picture past its own pixels
      if (img && img.naturalWidth) maxZoom = Math.max(1, Math.min(p.image_zoom, img.naturalWidth / (img.getBoundingClientRect().width / (ctx.stage.getBoundingClientRect().width / ctx.stage.offsetWidth || 1) || 1)));
      if (media && media.parentElement) media.parentElement.style.overflow = "hidden";
    }
    if (getComputedStyle(card).position === "static") card.style.position = "relative";
    const shadow0 = getComputedStyle(card).boxShadow === "none" ? "" : getComputedStyle(card).boxShadow;

    // timing: the pointer arrives on the card's word (or a beat after it shows); release before the end if asked
    const glide = p.pointer ? 0.45 : 0;
    const earliest = at + (wrap ? 0.35 : 0.05) + glide;
    let T = Math.max(earliest, ctx.word((card.textContent || "").trim().split(/\s+/)[0] || "", earliest));
    T = Math.min(T, Math.max(at + 0.05, end - 0.3));
    const out = p.release ? Math.max(T + 0.5, end - 0.45) : Infinity;
    ctx.sfx(T, "tap", 0.2);
    const cb = ctx.box(card), target = { x: cb.x + cb.w * (rtl ? 0.38 : 0.62), y: cb.y + cb.h * 0.55 };
    const start = { x: target.x + (rtl ? -1 : 1) * 220 * k, y: target.y + 260 * k };
    const p3 = (x) => 1 - Math.pow(1 - x, 4); // power3.out
    const layer = p.pointer ? mk("div", "position:absolute;inset:0;pointer-events:none;z-index:12;", host) : null;
    let cur = null;
    if (layer) {
      const cs = 54 * k;
      cur = sv("svg", { width: cs, height: cs, viewBox: "0 0 24 24", style: `position:absolute;left:0;top:0;overflow:visible;margin:${(-cs * 2 / 24).toFixed(1)}px 0 0 ${(-cs * 5 / 24).toFixed(1)}px;filter:drop-shadow(0 ${(3 * k).toFixed(1)}px ${(6 * k).toFixed(1)}px rgba(0,0,0,.25));` }, layer);
      sv("path", { d: "M5 2 L5 19 L9.5 15.5 L12.5 22 L15.5 20.5 L12.5 14 L18.5 14 Z", fill: "var(--x-pointer)", stroke: "var(--x-pointer-edge)", "stroke-width": 1.4, "stroke-linejoin": "round" }, cur);
    }

    return {
      draw(t) {
        const h = ML.out(t, T, T + 0.18) * (1 - ML.out(t, out, out + 0.2)); // micro: 180 ms ease-out
        const z = p3(ML.lin(t, T, T + 0.7)) * (1 - ML.out(t, out, out + 0.5));
        card.style.translate = h > 0.0005 ? `0 ${(-p.lift * s * h).toFixed(2)}px` : "none";
        const grow = h > 0.0005 ? `0 ${(14 * s * h).toFixed(1)}px ${(30 * s * h).toFixed(1)}px ${(-12 * s).toFixed(1)}px color-mix(in srgb, var(--x-ink) ${(22 * h).toFixed(1)}%, transparent)` : "";
        const glow = p.glow && h > 0.0005 ? `0 0 0 ${(1 * s).toFixed(2)}px color-mix(in srgb, var(--x-accent) ${(45 * h).toFixed(1)}%, transparent), 0 0 ${(24 * s).toFixed(1)}px ${(-4 * s).toFixed(1)}px color-mix(in srgb, var(--x-accent) ${(35 * h).toFixed(1)}%, transparent)` : "";
        card.style.boxShadow = [glow, grow, shadow0].filter(Boolean).join(", ") || "none";
        if (media) {
          media.style.scale = z > 0.0005 ? (1 + (maxZoom - 1) * z).toFixed(4) : "none";
          if (p.colourise) media.style.filter = `grayscale(${(1 - z).toFixed(4)})`;
        }
        if (cur) {
          const u = ML.ease(t, T - glide, T), leave = ML.ease(t, out, out + 0.4);
          const x = start.x + (target.x - start.x) * u + (start.x - target.x) * leave, y = start.y + (target.y - start.y) * u + (start.y - target.y) * leave + Math.sin(Math.PI * u) * -30 * k;
          cur.style.translate = `${x.toFixed(2)}px ${(y - p.lift * s * h).toFixed(2)}px`;
          cur.style.opacity = (ML.lin(t, T - glide, T - glide + 0.12) * (1 - leave)).toFixed(4);
        }
        const l = ML.clamp((t - (end - 0.25)) / 0.22);
        if (wrap) { const e = ML.out(t, at, at + 0.4); wrap.style.opacity = (t < at ? 0 : e * (1 - l)).toFixed(4); }
        if (layer) layer.style.opacity = (t < at ? 0 : 1 - l).toFixed(4);
      },
    };
  },
});

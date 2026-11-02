// Hero card on a dark wall: the picture becomes a framed landscape card (card_width of the picture region, 1 px light
// keyline, the look's shadow) hung on a dark panelled wall (vertical seams, or plain). A short headline sits top-left in
// light sans (~40 px at 1080, scaled with the card) over a soft top wash, a brand mark bottom-right. Across the shot the
// card pushes in 1 → push while the picture inside parallaxes 1 → inner_zoom: two rates give depth. RTL: the headline
// sits top-right and the mark bottom-left. 2D only; the inner zoom is capped at the picture's own pixels.
// Source: prompt-motion arjunsh1607-opus-5-5-on-ultracode (reference only: our own rebuild).
ML.define({
  id: "photo.hero-card-on-wall",
  category: "photo",
  name: "Hero card on a dark wall",
  does: "A wide landscape image with a short headline sits as a framed card on a dark panelled wall, slowly pushing in.",
  says: ["brand", "luxury", "proof"],
  energy: 2,
  targets: ["image", "card"],
  duration: [2, 8],
  params: {
    card_width: { type: "number", range: [0.5, 0.9], default: 0.7 },
    push: { type: "number", range: [1, 1.08], default: 1.04 },
    inner_zoom: { type: "number", range: [1, 1.12], default: 1.08 },
    wall: { type: "choice", options: ["panels", "plain"], default: "panels" },
    headline: { type: "text", default: "" },
    brand: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "photo.ken-burns"],
  avoid: ["urgency", "playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:arjunsh1607-opus-5-5-on-ultracode", license: "reference", note: "our own rebuild" },
  async setup(ctx) {
    const { el, p, at, end, f, rtl } = ctx;
    if (!el) return null;
    const scene = ctx.scene || ctx.stage;
    const own = el.tagName === "IMG" ? el : el.querySelector("img");
    if (!own) return null;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (parent) parent.append(e); return e; };
    // the look's dark and light tones (whichever of ground / ink is darker), so the wall is dark in any look
    const tone = (v) => { const d = mk("div", `position:absolute;visibility:hidden;color:${v}`, scene); const c = getComputedStyle(d).color; d.remove(); const m = (c.match(/[\d.]+/g) || [0, 0, 0]).map(Number); return { c, l: 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2] }; };
    const g = tone("var(--x-ground)"), i = tone("var(--x-ink)");
    const dark = g.l < i.l ? "var(--x-ground)" : "var(--x-ink)", light = g.l < i.l ? "var(--x-ink)" : "var(--x-ground)";

    // the region: the scene's picture area (the wall replaces it), else the target's own box
    const area = el.closest(".ml-pic") || el;
    const R = area === el ? ctx.box(el) : { x: f.pic.x, y: f.pic.y, w: f.pic.w, h: f.pic.h };
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;overflow:hidden;border-radius:var(--x-radius);visibility:hidden;pointer-events:none;z-index:3;isolation:isolate`, scene);
    // the wall: dark, with vertical panel seams (a darker groove + a faint lit edge) every ~1/5 of the wall
    const wallBg = `color-mix(in srgb, ${dark} 94%, ${light})`;
    const seam = Math.max(90, R.w / 5);
    layer.style.background = p.wall === "panels"
      ? `repeating-linear-gradient(90deg, transparent 0 ${seam - 3}px, ${dark} ${seam - 3}px ${seam - 1}px, color-mix(in srgb, ${light} 7%, transparent) ${seam - 1}px ${seam}px), linear-gradient(180deg, color-mix(in srgb, ${light} 5%, ${wallBg}), ${wallBg} 60%, color-mix(in srgb, ${dark} 60%, ${wallBg}))`
      : `radial-gradient(120% 90% at 50% 35%, color-mix(in srgb, ${light} 6%, ${wallBg}), ${wallBg} 70%)`;

    // the card: card_width of the wall, the picture's own aspect (landscape at least 16:10), never taller than 78% of it
    const natW = own.naturalWidth || 1200, natH = own.naturalHeight || 900;
    const aspect = Math.max(1.6, natW / natH);
    let cw = ML.clamp(p.card_width, 0.5, 0.9) * R.w, ch = cw / aspect;
    if (ch > R.h * 0.78) { ch = R.h * 0.78; cw = ch * aspect; }
    const card = mk("div", `position:absolute;left:${(R.w - cw) / 2}px;top:${(R.h - ch) / 2}px;width:${cw}px;height:${ch}px;overflow:hidden;border-radius:min(var(--x-pic-radius), ${(cw * 0.03).toFixed(1)}px);border:1px solid color-mix(in srgb, ${light} 22%, transparent);box-shadow:var(--x-shadow);box-sizing:border-box;background:${dark};transform-origin:50% 50%`, layer);
    const im = mk("img", "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;transform-origin:50% 50%;filter:var(--x-pic-filter)", card);
    im.decoding = "sync"; im.alt = ""; im.src = own.currentSrc || own.src;
    await im.decode().catch(() => {});
    // the picture's parallax never draws it past its own pixels
    const cover = Math.max(cw / natW, ch / natH);
    const zoom = Math.max(1, Math.min(ML.clamp(p.inner_zoom, 1, 1.12), 1 / cover));
    // the headline wash and type: light sans, top corner on the reading side
    const pad = cw * 0.06;
    mk("div", `position:absolute;inset:0 0 55% 0;background:linear-gradient(180deg, color-mix(in srgb, ${dark} 62%, transparent), transparent)`, card);
    const words = String(p.headline || own.getAttribute("alt") || scene.querySelector(".ml-title")?.textContent || "").trim();
    if (words) {
      const hd = mk("div", `position:absolute;top:${pad}px;${rtl ? "right" : "left"}:${pad}px;max-width:${cw * 0.62}px;font:var(--x-body-weight) ${Math.max(18, (40 * cw) / 700).toFixed(1)}px/1.15 var(--x-body-font);color:${light};letter-spacing:${rtl ? "0" : "-0.01em"};text-align:${rtl ? "right" : "left"};text-wrap:balance`, card);
      hd.setAttribute("dir", rtl ? "rtl" : "ltr");
      hd.textContent = words;
    }
    // the brand mark: the accent tile, with the brand's name when given
    const mark = mk("div", `position:absolute;bottom:${pad * 0.8}px;${rtl ? "left" : "right"}:${pad * 0.8}px;display:flex;align-items:center;gap:${(cw * 0.012).toFixed(1)}px;font:var(--x-label-weight) ${Math.max(12, cw * 0.022).toFixed(1)}px var(--x-label-font);letter-spacing:${rtl ? "0" : "var(--x-label-track)"};text-transform:var(--x-label-case);color:${light}`, card);
    mk("span", `display:block;width:${(cw * 0.032).toFixed(1)}px;height:${(cw * 0.032).toFixed(1)}px;border-radius:${(cw * 0.008).toFixed(1)}px;background:var(--x-accent)`, mark);
    if (p.brand) { const b = mk("span", "", mark); b.textContent = p.brand; }

    const push = ML.clamp(p.push, 1, 1.08);
    const span = Math.max(0.5, end - at);
    ctx.sfx(at, "whoosh.soft", 0.22);
    return {
      draw(t) {
        const on = t >= at - 1e-6;
        layer.style.visibility = on ? "visible" : "hidden";
        area.style.visibility = on ? "hidden" : "";
        if (!on) return;
        const u = ML.lin(t, at, at + span);
        const e = ML.out(t, at, at + 0.5);
        layer.style.opacity = ML.lin(t, at, at + 0.3).toFixed(4);
        card.style.translate = `0 ${((1 - e) * ch * 0.04).toFixed(2)}px`;
        card.style.scale = (1 + (push - 1) * u).toFixed(5);
        im.style.scale = (1 + (zoom - 1) * u).toFixed(5);
      },
    };
  },
});

// Glass tag on photo (MengTo/Skills skeuomorphic-ui): a frosted pill — light fill at 20 %, backdrop blur 12 px, a 1 px
// light edge at 30 %, fully round, 8 × 16 padding, a small line icon and a short light label 8 apart — anchored 24 px
// in from the photo's bottom-left corner (bottom-right in Arabic). It pops in 0.4 s after the photo lands: scale .85 → 1
// and opacity 0 → 1 in 0.35 s on back.out(1.6). Sizes follow the photo (the web's 12 px label on a ~400 px card).
// On a label target the label's words become the tag on the nearest photo; on an image target the tag sits on it.
// Source: MengTo/Skills agent-skills/web-design/skeuomorphic-ui/demo/index.html (MIT: the frosted photo tag).
ML.define({
  id: "element.glass-tag-pop",
  category: "element",
  name: "Glass tag on photo",
  does: "A frosted pill with a tiny icon and short label pops onto the corner of a photo after it lands.",
  says: ["playful", "focus"],
  energy: 2,
  targets: ["label", "image"],
  duration: [0.5, 1],
  params: {
    corner: { type: "choice", options: ["bottom-left", "bottom-right", "top-left", "top-right"], default: "bottom-left" },
    icon: { type: "bool", default: true },
    delay: { type: "number", range: [0.2, 0.8], default: 0.4, unit: "s" },
    glyph: { type: "choice", options: ["pin", "spark", "camera", "check"], default: "pin" },
    text: { type: "text", default: "" },
  },
  pairs: ["photo.ken-burns", "element.glass-panel-in"],
  avoid: ["urgency", "problem"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "MengTo/Skills:agent-skills/web-design/skeuomorphic-ui/demo/index.html", license: "MIT", note: "the frosted photo tag; timing from the master notes" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const isPic = own && own.tagName === "IMG";
    // the photo: the target itself, else the nearest picture in the scene, else the picture region
    const pic = isPic ? own : (host.querySelector("img") || null);
    const P = pic ? ctx.box(pic) : f.pic;
    const k = Math.min(f.W, f.H) / 1080;
    const txt = p.text || (!isPic && own ? (own.textContent || "").trim() : "") || (rtl ? "القاهرة" : "Lisbon");
    const fs = ML.clamp(Math.min(P.w, P.h) * 0.075, 18 * k, 34 * k);
    const off = fs * 1.8; // the web's 24 px beside a 12 px label
    const tag = mk("div", `position:absolute;display:inline-flex;align-items:center;gap:${fs * 0.66}px;padding:${fs * 0.66}px ${fs * 1.33}px;border-radius:999px;box-sizing:border-box;white-space:nowrap;direction:${rtl ? "rtl" : "ltr"};font:500 ${fs}px/1 var(--x-body-font);letter-spacing:${rtl ? 0 : "0.01em"};color:color-mix(in srgb, var(--x-panel) 15%, white);background:color-mix(in srgb, white 20%, transparent);border:${Math.max(1, k)}px solid color-mix(in srgb, white 30%, transparent);box-shadow:0 ${4 * k}px ${16 * k}px color-mix(in srgb, var(--x-device) 18%, transparent);pointer-events:none;z-index:8;`, host);
    if (p.icon) {
      const s = doc.createElementNS(NS, "svg"), d = fs * 1.16;
      s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("width", d); s.setAttribute("height", d);
      s.style.cssText = "flex:none;display:block;overflow:visible;";
      const G = {
        pin: ["M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z", "M12 12.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z"],
        spark: ["M12 3v4M12 17v4M3 12h4M17 12h4", "M12 8.5l1.2 2.3 2.3 1.2-2.3 1.2L12 15.5l-1.2-2.3L8.5 12l2.3-1.2Z"],
        camera: ["M4 8h3l1.6-2.4h6.8L17 8h3v11H4Z", "M12 16.4a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Z"],
        check: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M8 12.4l2.7 2.6L16.2 9.4"],
      }[p.glyph] || [];
      for (const dd of G) { const pa = doc.createElementNS(NS, "path"); pa.setAttribute("d", dd); pa.setAttribute("fill", "none"); pa.setAttribute("stroke", "currentColor"); pa.setAttribute("stroke-width", "1.8"); pa.setAttribute("stroke-linecap", "round"); pa.setAttribute("stroke-linejoin", "round"); s.append(pa); }
      tag.append(s);
    }
    mk("span", "", tag, txt);
    // the corner: left / right swap in Arabic (the tag leads from the reading side)
    let [v, h] = String(p.corner).split("-");
    if (rtl) h = h === "left" ? "right" : "left";
    const tw = Math.min(tag.offsetWidth, P.w - off * 2), th = tag.offsetHeight;
    if (tag.offsetWidth > P.w - off * 2) { tag.style.maxWidth = tw + "px"; tag.style.overflow = "hidden"; }
    const x = h === "left" ? P.x + off : P.x + P.w - off - tw;
    const y = v === "top" ? P.y + off : P.y + P.h - off - th;
    tag.style.left = ML.clamp(x, 8, f.W - tw - 8) + "px";
    tag.style.top = ML.clamp(y, 8, f.H - th - 8) + "px";
    tag.style.transformOrigin = `${h === "left" ? "0%" : "100%"} ${v === "top" ? "0%" : "100%"}`;

    const t0 = at + ML.clamp(p.delay, 0.2, 0.8);
    const leaveA = Math.max(t0 + 0.5, end - 0.25);
    ctx.sfx(t0 + 0.05, "pop.soft", 0.35);

    return {
      draw(t) {
        if (own && !isPic && own.style) { const o = t >= t0 ? "0" : ""; if (own.style.opacity !== o) own.style.opacity = o; }
        const leave = ML.clamp((t - leaveA) / 0.22);
        const u = ML.back(t, t0, t0 + 0.35, 1.6);
        const o = ML.lin(t, t0, t0 + 0.14) * (1 - leave);
        tag.style.visibility = o > 0.001 ? "visible" : "hidden";
        tag.style.opacity = o.toFixed(4);
        tag.style.transform = `scale(${Math.min(1.03, 0.85 + 0.15 * u).toFixed(4)})`;
        const bf = `blur(${(12 * k * ML.lin(t, t0, t0 + 0.2)).toFixed(2)}px)`;
        tag.style.backdropFilter = bf; tag.style.webkitBackdropFilter = bf;
      },
    };
  },
});

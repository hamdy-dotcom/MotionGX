// Edge-faded marquee: a clipping band holds ONE track with the item group in it twice or more (the group repeated until
// it is at least the frame's width), moved as a pure function of time x(t) = −((t / period) mod 1) · groupWidth — the
// CSS "translateX(0 → −50%) linear infinite" loop of MengTo's marquee-loop / animation-systems demos, made seekable.
// Widths are measured once in setup (fonts already loaded), so the loop never jumps. Edges fade with a mask
// (transparent → opaque → transparent) or two ground → transparent overlays. Four styles from the sources: label
// (mono caps, dots between), cells (bordered boxes), trust-bar (inverted ink band, ground text, a bottom rule) and
// statement (one big positioning line). 1–3 rows, odd rows run the other way; RTL runs to the right.
// Source: MengTo/Skills web-design/marquee-loop + animation-systems (.marquee, @keyframes marquee) (MIT), MotionGX
// live-engine recipes.js .tick rows, prompt-motion henkpoley ticker (reference).
ML.define({
  id: "kinetic.marquee",
  category: "kinetic",
  name: "Edge-faded marquee",
  does: "A strip (or a few rows) of words, labels, logos or one statement slides sideways forever without a seam, fading at both edges.",
  says: ["list", "ambient", "proof", "trust", "flow", "brand", "calm"],
  energy: 2,
  targets: ["list", "label", "logo", "word", "line", "stage"],
  duration: [2, 30],
  params: {
    style: { type: "choice", options: ["label", "cells", "trust-bar", "statement"], default: "label" },
    content: { type: "choice", options: ["words", "tags", "logos", "proof-points", "stats", "screenshots"], default: "words" },
    direction: { type: "choice", options: ["left", "right"], default: "left" },
    period: { type: "number", range: [10, 40], default: 20, unit: "s" },
    rows: { type: "number", range: [1, 3], default: 1 },
    separator: { type: "choice", options: ["dot", "slash", "star", "tilde", "none"], default: "dot" },
    edge: { type: "choice", options: ["mask", "overlay", "none"], default: "mask" },
    fade_width: { type: "number", range: [0.05, 0.2], default: 0.15, unit: "frame" },
    placement: { type: "choice", options: ["top", "bottom", "mid"], default: "bottom" },
    opacity: { type: "number", range: [0.3, 1], default: 0.8 },
    enter: { type: "choice", options: ["running", "fade"], default: "running" },
  },
  pairs: ["text-in.punchline", "kinetic.marquee-brake-hold"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:web-design/marquee-loop", license: "MIT", note: "also animation-systems .marquee, our recipes.js .tick, prompt-motion henkpoley ticker (reference)" },
  setup(ctx) {
    const { el, p, at, rtl } = ctx;
    const host = ctx.scene || ctx.stage, doc = host.ownerDocument;
    const W = ctx.f.W, H = ctx.f.H, k = Math.min(W, H) / 1080;
    const isStage = !el || el === ctx.stage;
    // ── what runs in the band ──
    const textOf = (n) => (n.textContent || "").replace(/\s+/g, " ").trim();
    let items = [];
    if (!isStage && el.children.length > 1 && [...el.children].every((c) => textOf(c))) items = [...el.children].map(textOf);
    else if (!isStage && textOf(el)) items = [textOf(el)];
    if (isStage || !items.length) {
      const pool = [...host.querySelectorAll(".ml-title, .ml-sub, .ml-label, [data-slot='list'] > *, [data-slot-sample='list'] > *")].map(textOf).filter(Boolean);
      items = pool.length ? pool : (ctx.words || []).map((w) => w.w);
    }
    if (p.content === "stats") { const nums = items.filter((x) => /\d/.test(x)); const extra = [...host.querySelectorAll("[data-slot='number'], [data-slot-sample='number']")].map(textOf); items = nums.length ? nums : extra.length ? extra.concat(items) : items; }
    // pictures: logos (the scene's logo marks, cloned) or screenshots (the scene's images, never enlarged)
    let pics = [];
    if (p.content === "logos") pics = [...(el && el.matches && el.matches("svg, img") ? [el] : []), ...host.querySelectorAll("[data-slot='logo'], [data-slot-sample='logo']")].filter((x, i, a) => a.indexOf(x) === i);
    if (p.content === "screenshots") pics = [...host.querySelectorAll("img")];
    if (!items.length && !pics.length) return null;
    const rows = Math.max(1, Math.min(3, Math.round(p.rows)));
    // ── the band ──
    const style = p.style;
    const fontPx = (style === "statement" ? 84 : style === "cells" ? 46 : style === "trust-bar" ? 32 : 26) * k;
    const band = doc.createElement("div");
    const bandStyle = { position: "absolute", left: "0", direction: "ltr", width: W + "px", overflow: "hidden", zIndex: "3", pointerEvents: "none", display: "grid", gap: (style === "cells" ? 0 : 14 * k) + "px" };
    Object.assign(band.style, bandStyle);
    if (style === "trust-bar") Object.assign(band.style, { background: "var(--x-ink)", color: "var(--x-ground)", borderBottom: `${3 * k}px solid var(--x-accent)`, padding: `${16 * k}px 0` });
    else if (style === "cells") Object.assign(band.style, { borderTop: "1px solid var(--x-line)", borderBottom: "1px solid var(--x-line)" });
    else Object.assign(band.style, { borderTop: "1px solid color-mix(in srgb, var(--x-line) 60%, transparent)", borderBottom: "1px solid color-mix(in srgb, var(--x-line) 60%, transparent)", padding: `${14 * k}px 0` });
    const fw = (p.fade_width * 100).toFixed(1);
    if (p.edge === "mask") { const m = `linear-gradient(90deg, transparent, #000 ${fw}%, #000 ${(100 - p.fade_width * 100).toFixed(1)}%, transparent)`; band.style.maskImage = m; band.style.webkitMaskImage = m; }
    host.append(band);
    const sepChar = { slash: "/", star: "✦", tilde: "~" }[p.separator];
    const makeSep = () => {
      if (p.separator === "none") return null;
      const s = doc.createElement("span");
      if (p.separator === "dot") Object.assign(s.style, { display: "inline-block", width: 6 * k + "px", height: 6 * k + "px", borderRadius: "50%", background: style === "trust-bar" ? "currentColor" : "var(--x-dim)", opacity: "0.7", flex: "none" });
      else { s.textContent = sepChar; Object.assign(s.style, { color: style === "trust-bar" ? "currentColor" : "var(--x-accent)", opacity: "0.8", flex: "none" }); }
      return s;
    };
    const makeItem = (txt, pic) => {
      const it = doc.createElement("span");
      Object.assign(it.style, { display: "inline-flex", alignItems: "center", flex: "none", whiteSpace: "nowrap" });
      if (pic) {
        const c = pic.cloneNode(true);
        c.removeAttribute("data-slot"); c.removeAttribute("data-slot-sample"); c.removeAttribute("id");
        Object.assign(c.style, { opacity: "1", visibility: "visible", translate: "none", scale: "none", filter: "none", transform: "none" });
        if (pic.tagName === "IMG") { const hh = Math.min(fontPx * 3.2, pic.naturalHeight || fontPx * 3.2); Object.assign(c.style, { height: hh + "px", width: "auto", maxWidth: "none", objectFit: "cover", borderRadius: "var(--x-pic-radius)" }); }
        else { c.setAttribute("height", String(fontPx * 1.8)); c.removeAttribute("width"); c.style.height = fontPx * 1.8 + "px"; c.style.width = "auto"; }
        it.append(c);
      } else it.textContent = txt;
      if (style === "cells") Object.assign(it.style, { minWidth: 220 * k * 1.6 + "px", justifyContent: "center", padding: `${34 * k}px`, borderInlineEnd: "1px solid var(--x-line)", fontFamily: "var(--x-head-font)", fontSize: fontPx + "px", fontWeight: "700", letterSpacing: rtl ? "0" : "-0.04em", color: "var(--x-ink)" });
      else if (p.content === "tags" && !pic) Object.assign(it.style, { padding: `${8 * k}px ${22 * k}px`, border: "var(--x-edge) solid var(--x-edge-color)", borderRadius: "var(--x-radius-s)", background: "var(--x-panel)" });
      if (p.content === "stats" && !pic && style !== "cells") Object.assign(it.style, { fontFamily: "var(--x-mono-font)", fontWeight: "600" });
      return it;
    };
    const rowEls = [];
    for (let r = 0; r < rows; r++) {
      const track = doc.createElement("div");
      Object.assign(track.style, { display: "flex", width: "max-content", whiteSpace: "nowrap", willChange: "transform", direction: "ltr" });
      const group = doc.createElement("div");
      const gap = (style === "cells" ? 0 : (style === "statement" ? 56 : 44) * k) + "px";
      Object.assign(group.style, { display: "flex", alignItems: "center", gap, paddingInlineEnd: gap, flex: "none", direction: rtl ? "rtl" : "ltr" });
      if (style === "label") Object.assign(group.style, { fontFamily: "var(--x-label-font)", fontWeight: "var(--x-label-weight)", fontSize: fontPx + "px", textTransform: rtl ? "none" : "uppercase", letterSpacing: rtl ? "0" : "0.1em", color: "var(--x-dim)" });
      else if (style === "trust-bar") Object.assign(group.style, { fontFamily: "var(--x-body-font)", fontWeight: "600", fontSize: fontPx + "px", textTransform: rtl ? "none" : "uppercase", letterSpacing: rtl ? "0" : "0.06em" });
      else if (style === "statement") Object.assign(group.style, { fontFamily: "var(--x-head-font)", fontWeight: "var(--x-head-weight)", fontSize: fontPx + "px", lineHeight: "1.1", letterSpacing: rtl ? "0" : "var(--x-head-track)", color: "var(--x-ink)" });
      // each row starts at a different item so stacked rows never line up
      const list = pics.length ? pics.map((x) => [null, x]) : items.map((x) => [x, null]);
      const rot = list.slice(r % list.length).concat(list.slice(0, r % list.length));
      const fill = () => rot.forEach(([txt, pic]) => { group.append(makeItem(txt, pic)); if (style !== "cells") { const s = makeSep(); if (s) group.append(s); } });
      fill();
      track.append(group);
      band.append(track);
      // repeat the list until one group is at least the frame wide
      let guard = 0;
      while (group.offsetWidth < W && guard++ < 40) fill();
      const gw = group.offsetWidth;
      const copies = Math.ceil(W / gw) + 1;
      for (let c = 0; c < copies; c++) { const g = group.cloneNode(true); g.setAttribute("aria-hidden", "true"); track.append(g); }
      rowEls.push({ track, gw });
    }
    // overlays: two ground → transparent strips over the band's ends
    const overlays = [];
    if (p.edge === "overlay") for (const side of ["left", "right"]) {
      const o = doc.createElement("div");
      Object.assign(o.style, { position: "absolute", top: "0", bottom: "0", [side]: "0", width: Math.max(96 * k, W * p.fade_width * 0.7) + "px", zIndex: "2", background: `linear-gradient(${side === "left" ? "90deg" : "270deg"}, ${style === "trust-bar" ? "var(--x-ink)" : "var(--x-ground)"}, transparent)` });
      band.append(o); overlays.push(o);
    }
    // where it sits
    const bh = band.offsetHeight, safe = ctx.f.safe;
    const y = p.placement === "top" ? safe.y * 0.55 : p.placement === "mid" ? (H - bh) / 2 : H - safe.y * 0.55 - bh;
    band.style.top = Math.max(0, Math.min(H - bh, y)).toFixed(1) + "px";
    // the items now run in the band: the source slot steps aside
    const hideSource = !isStage && el !== ctx.scene;
    // direction: left by default, right for RTL (a "right" request flips it)
    const base = (p.direction === "right" ? -1 : 1) * (rtl ? -1 : 1); // +1 runs to the left
    const from = ctx.from ?? 0;
    if (p.enter === "fade") ctx.sfx(at, "whoosh.soft", 0.15);
    return {
      draw(t) {
        const show = p.enter === "fade" ? ML.ease(t, at, at + 0.3) : t >= from - 1e-6 ? 1 : 0;
        band.style.opacity = (show * (style === "trust-bar" ? 1 : p.opacity)).toFixed(4);
        band.style.visibility = show > 0 ? "visible" : "hidden";
        const u = t - from + p.period * 0.37; // already running when the scene opens
        rowEls.forEach(({ track, gw }, r) => {
          const dir = r % 2 ? -base : base;
          const ph = ((u / p.period) % 1 + 1) % 1; // x(t) = −(t / period mod 1) · groupWidth
          const x = dir > 0 ? -ph * gw : -(1 - ph) * gw;
          track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
        });
        if (hideSource) el.style.opacity = show > 0 ? "0" : "";
      },
    };
  },
});

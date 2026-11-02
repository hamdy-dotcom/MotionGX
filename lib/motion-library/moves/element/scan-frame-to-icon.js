// Scan corners capture a word and become the app icon. Over the chosen word (kept whole — Arabic-safe) a rounded tile
// (radius 22 %) grows 0.6 → 1 on back.out in 0.3 s, semi-transparent so the word shows through; four corner brackets
// (multicolour, or all the brand accent) slide in from outside to the tile's corners in 0.25 s and snap. The rest of
// the copy fades (text also blurs) while the tile flies up and narrows to icon size (0.4 s expo.inOut), the brackets
// riding its corners. Inside, the word gives way to the icon's mark (the scene's logo mark if there is one, else the
// word's first letter) and a check draws in a badge (stroke, 0.25 s). The app name fades in below, then the tagline,
// then a small badge pill. The tile morphs by its own width and height (never scaled up); a picture target is only
// ever shrunk. Times compress a little when the move is given less room.
// Source: prompt-motion "mehul4795-used-the-below-one" (reference only — rebuilt as our own code).
ML.define({
  id: "element.scan-frame-to-icon",
  category: "element",
  name: "Scan corners capture a word and become the app icon",
  does: "Scan brackets close around a word, a rounded tile forms behind it, and the tile flies up to become the app icon with its own mark.",
  says: ["reveal", "brand", "result", "change"],
  energy: 4,
  targets: ["word", "logo"],
  duration: [1.5, 3],
  params: {
    target: { type: "choice", options: ["word", "image"], default: "word" },
    bracket_colours: { type: "choice", options: ["brand", "multicolour"], default: "multicolour" },
    word: { type: "text", default: "" },
    name: { type: "text", default: "" },
    tagline: { type: "text", default: "" },
    badge: { type: "text", default: "" },
    icon_size: { type: "number", range: [0.14, 0.3], default: 0.22 },
  },
  pairs: ["text-in.punchline", "element.app-icon-reveal", "background.mesh-gradient"],
  avoid: ["calm", "problem"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "snap",
  source: { from: "prompt-motion:mehul4795-used-the-below-one", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const isPicEl = (e) => e && (e.tagName === "IMG" || e.tagName.toLowerCase() === "svg");
    const imageMode = own && (p.target === "image" || isPicEl(own));

    // what gets captured: a whole word of the slot (the asked one, else the longest), or the picture itself
    let cap = null, words = [];
    if (own && !imageMode) {
      words = ML.split(own, "words");
      const want = ML.plain(p.word || "");
      cap = (want && words.find((w) => ML.plain(w.textContent).includes(want))) || words.slice().sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0] || null;
    } else if (imageMode) cap = own;
    const B = cap ? ctx.box(cap) : { x: f.W / 2 - 160 * k, y: f.H * 0.55, w: 320 * k, h: 90 * k };
    const capText = cap && !imageMode ? cap.textContent.replace(/[.,،؛؟?!…:«»"'()]/g, "") : "";

    const layer = mk("div", `position:absolute;left:0;top:0;width:${f.W}px;height:${f.H}px;pointer-events:none;z-index:7;`, host);
    // the tile: starts as the word's box padded, ends as a square icon
    const padX = imageMode ? B.h * 0.08 : B.h * 0.32, padY = imageMode ? B.h * 0.08 : B.h * 0.18;
    const T0 = { x: B.x - padX, y: B.y - padY, w: B.w + padX * 2, h: B.h + padY * 2 };
    const S = Math.min(f.W, f.H) * ML.clamp(p.icon_size, 0.14, 0.3);
    const tile = mk("div", "position:absolute;box-sizing:border-box;overflow:hidden;display:flex;align-items:center;justify-content:center;", layer);
    let clone = null, cw = 0, ch = 0;
    if (cap && !imageMode) {
      const cs = getComputedStyle(cap);
      clone = mk("span", `position:absolute;left:50%;top:50%;white-space:nowrap;font:${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily};letter-spacing:${cs.letterSpacing};color:var(--x-ink);transform-origin:50% 50%;`, tile, capText);
      cw = B.w; ch = B.h;
    } else if (cap) {
      const c = cap.cloneNode(true); c.removeAttribute("data-slot");
      c.style.cssText = "position:absolute;left:50%;top:50%;margin:0;transform-origin:50% 50%;" + (cap.tagName === "IMG" ? `width:${B.w}px;height:${B.h}px;object-fit:cover;border-radius:0;` : `width:${B.w}px;height:${B.h}px;`);
      tile.append(c); clone = c; cw = B.w; ch = B.h;
    }
    // the icon's mark: the scene's logo mark (its lettering dropped), else the captured word's first letter
    const mark = mk("div", "position:absolute;inset:16%;display:flex;align-items:center;justify-content:center;", tile);
    const logo = host.querySelector('[data-slot="logo"], [data-slot-sample="logo"]');
    if (logo && logo !== cap && logo.tagName.toLowerCase() === "svg") {
      const sv = logo.cloneNode(true); sv.removeAttribute("data-slot"); sv.removeAttribute("data-slot-sample"); sv.removeAttribute("width"); sv.removeAttribute("height");
      sv.style.cssText = "width:100%;height:100%;display:block;overflow:visible;"; mark.append(sv);
      sv.querySelectorAll("text").forEach((x) => x.remove());
      // frame the mark alone: the union of the logo's non-text shapes
      try {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const c of logo.querySelectorAll("path, rect, circle, ellipse, polygon, polyline, line, image, use")) { if (c.closest("text")) continue; const b = c.getBBox(); if (!b.width && !b.height) continue; x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height); }
        if (x1 > x0) { const m = Math.max(x1 - x0, y1 - y0); sv.setAttribute("viewBox", `${(x0 + x1) / 2 - m / 2} ${(y0 + y1) / 2 - m / 2} ${m} ${m}`); }
      } catch (e) { /* not laid out: keep its viewBox */ }
    } else mk("div", `font:var(--x-head-weight) ${S * 0.46}px/1 var(--x-head-font);color:var(--x-accent);`, mark, Array.from(capText || (rtl ? "ت" : "A"))[0]);
    // the check badge on the icon's corner (bottom-trailing)
    const bs = S * 0.3;
    const badgeC = mk("div", `position:absolute;width:${bs}px;height:${bs}px;border-radius:50%;background:var(--x-good);box-shadow:0 0 0 ${Math.max(3, S * 0.025)}px var(--x-ground);display:flex;align-items:center;justify-content:center;`, layer);
    const ck = doc.createElementNS(NS, "svg"); ck.setAttribute("viewBox", "0 0 24 24"); ck.style.cssText = "width:62%;height:62%;overflow:visible;";
    const ckp = doc.createElementNS(NS, "path"); ckp.setAttribute("d", "M5 12.5l4.2 4.2L19 7"); ckp.setAttribute("fill", "none"); ckp.setAttribute("stroke-width", "3"); ckp.setAttribute("stroke-linecap", "round"); ckp.setAttribute("stroke-linejoin", "round"); ckp.style.stroke = "var(--x-accent-ink)";
    ck.append(ckp); badgeC.append(ck);
    const ckLen = 22; ckp.setAttribute("stroke-dasharray", `${ckLen} ${ckLen}`);

    // brackets: four corners
    const bc = p.bracket_colours === "brand" ? ["var(--x-accent)", "var(--x-accent)", "var(--x-accent)", "var(--x-accent)"] : ["var(--x-accent)", "var(--x-accent-2)", "var(--x-good)", "var(--x-bad)"];
    const bw = Math.max(4, 6 * k);
    const brackets = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy], i) => ({ sx, sy, e: mk("div", `position:absolute;left:0;top:0;box-sizing:border-box;border-color:${bc[i]};border-style:solid;border-width:${sy < 0 ? bw : 0}px ${sx > 0 ? bw : 0}px ${sy > 0 ? bw : 0}px ${sx < 0 ? bw : 0}px;border-${sy < 0 ? "top" : "bottom"}-${sx < 0 ? "left" : "right"}-radius:${bw * 2}px;`, layer) }));

    // the app name, tagline and badge pill, laid out under the icon's final place
    const nm = mk("div", `position:absolute;left:0;width:${f.W}px;text-align:center;white-space:nowrap;font:var(--x-head-weight) ${S * 0.3}px/1.15 var(--x-head-font);letter-spacing:${rtl ? 0 : "-0.01em"};color:var(--x-ink);`, layer, String(p.name || capText || (rtl ? "تطبيقك" : "Your app")));
    const tagText = String(p.tagline || (own && !imageMode ? own.textContent.trim() : "")).trim();
    const tg = tagText ? mk("div", `position:absolute;left:${(f.W - f.safe.w * 0.86) / 2}px;width:${f.safe.w * 0.86}px;text-align:center;text-wrap:balance;font:var(--x-body-weight) ${Math.max(22 * k, S * 0.15)}px/1.3 var(--x-body-font);color:var(--x-dim);`, layer, tagText) : null;
    const pillText = String(p.badge || (rtl ? "جديد" : "New")).trim();
    const pillRow = mk("div", `position:absolute;left:0;width:${f.W}px;display:flex;justify-content:center;`, layer);
    const pill = mk("div", `padding:${S * 0.04}px ${S * 0.1}px;border-radius:var(--x-radius-s);background:color-mix(in srgb, var(--x-accent) 14%, var(--x-panel));color:var(--x-accent);font:var(--x-label-weight) ${Math.max(16 * k, S * 0.095)}px/1.3 var(--x-label-font);letter-spacing:${rtl ? 0 : "0.12em"};text-transform:${rtl ? "none" : "uppercase"};border:var(--x-edge) solid color-mix(in srgb, var(--x-accent) 35%, transparent);`, pillRow, pillText);
    const gap1 = S * 0.24, gap2 = S * 0.08, gap3 = S * 0.18;
    const nh = nm.offsetHeight, th = tg ? tg.offsetHeight : 0, ph = pill.offsetHeight;
    const groupH = S + gap1 + nh + (tg ? gap2 + th : 0) + gap3 + ph;
    const top = ML.clamp(f.safe.y + (f.safe.h - groupH) / 2, f.safe.y, f.safe.y + f.safe.h - groupH);
    const T1 = { x: (f.W - S) / 2, y: top, w: S, h: S };
    nm.style.top = top + S + gap1 + "px";
    if (tg) tg.style.top = top + S + gap1 + nh + gap2 + "px";
    pillRow.style.top = top + S + gap1 + nh + (tg ? gap2 + th : 0) + gap3 + "px";
    badgeC.style.left = (rtl ? T1.x - bs * 0.3 : T1.x + S - bs * 0.7) + "px";
    badgeC.style.top = T1.y + S - bs * 0.7 + "px";

    // the rest of the copy that fades away: everything in the scene but this layer and the captured word
    const fades = [];
    const collect = (root) => { for (const c of root.children) { if (c === layer || c.tagName === "CANVAS") continue; if (own && c !== own && c.contains(own)) collect(c); else if (c !== own) fades.push({ e: c, blur: !c.querySelector("img") && c.tagName !== "IMG" }); } };
    collect(host);
    const others = words.filter((w) => w !== cap);

    // times (compressed when the move has less room)
    const sp = ML.clamp((end - at - 0.35) / 2.05, 0.65, 1), T = (x) => at + x * sp;
    const g0 = T(0), g1 = T(0.3), b0 = T(0.15), b1 = T(0.4), c0 = T(0.55), c1 = T(0.85), f0 = T(0.6), f1 = T(1.0);
    const m0 = T(0.92), k0 = T(1.05), n0 = T(1.25), l0 = T(1.45), q0 = T(1.65), x0 = Math.max(q0 + 0.35, end - 0.3);
    ctx.sfx(b1, "snap", 0.4);
    ctx.sfx(f0, "whoosh.soft", 0.25);
    ctx.sfx(f1, "pop", 0.35);
    ctx.sfx(n0, "tap", 0.2);
    const expoInOut = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2);
    const rise = (e, t, a) => { const u = ML.out(t, a, a + 0.35); e.style.opacity = u.toFixed(4); e.style.translate = `0 ${((1 - u) * S * 0.1).toFixed(2)}px`; };

    return {
      draw(t) {
        layer.style.visibility = t < at ? "hidden" : "visible";
        layer.style.opacity = (1 - ML.ease(t, x0, x0 + 0.3)).toFixed(4);
        // the original word hands over to the tile's copy of it
        if (cap && cap.style) cap.style.opacity = t >= at ? "0" : "";
        const fl = expoInOut(ML.lin(t, f0, f1));
        const R = { x: T0.x + (T1.x - T0.x) * fl, y: T0.y + (T1.y - T0.y) * fl, w: T0.w + (T1.w - T0.w) * fl, h: T0.h + (T1.h - T0.h) * fl };
        const g = ML.back(t, g0, g1, 1.7), gs = 0.6 + 0.4 * g;
        tile.style.left = R.x.toFixed(2) + "px"; tile.style.top = R.y.toFixed(2) + "px";
        tile.style.width = R.w.toFixed(2) + "px"; tile.style.height = R.h.toFixed(2) + "px";
        tile.style.borderRadius = (Math.min(R.w, R.h) * 0.22).toFixed(2) + "px";
        tile.style.background = `color-mix(in srgb, var(--x-panel) ${(62 + 38 * fl).toFixed(1)}%, transparent)`;
        tile.style.boxShadow = fl > 0.01 ? "var(--x-shadow)" : "none";
        tile.style.border = `var(--x-edge) solid var(--x-edge-color)`;
        tile.style.transform = Math.abs(gs - 1) > 1e-4 ? `scale(${gs.toFixed(4)})` : "none";
        // the word inside: shrinks with the tile (never past its own size), then gives way to the mark
        if (clone) {
          const fit = Math.min(1, (R.w * 0.86) / cw, (R.h * 0.8) / ch);
          clone.style.transform = `translate(-50%, -50%) scale(${fit.toFixed(4)})`;
          clone.style.opacity = (1 - ML.lin(t, m0 - 0.12, m0 + 0.08)).toFixed(4);
        }
        const mk2 = ML.out(t, m0, m0 + 0.22);
        mark.style.opacity = mk2.toFixed(4);
        mark.style.transform = `scale(${(0.7 + 0.3 * mk2).toFixed(4)})`;
        // brackets: slide in from outside onto the corners, ride the tile, then go
        const bu = ML.out(t, b0, b1), bo = 1 - ML.lin(t, f1, f1 + 0.2);
        const L = Math.max(14 * k, Math.min(R.w, R.h) * 0.3) * gs, off = (1 - bu) * L * 1.4 + bw * 0.6;
        const cx = R.x + R.w / 2, cy = R.y + R.h / 2, hw = (R.w / 2) * gs, hh = (R.h / 2) * gs;
        for (const b of brackets) {
          const x = cx + b.sx * (hw + off) - (b.sx > 0 ? L : 0), y = cy + b.sy * (hh + off) - (b.sy > 0 ? L : 0);
          b.e.style.width = L.toFixed(2) + "px"; b.e.style.height = L.toFixed(2) + "px";
          b.e.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
          b.e.style.opacity = t < b0 ? "0" : (Math.min(1, bu * 2) * bo).toFixed(4);
        }
        // the check badge draws
        const kb = ML.back(t, k0, k0 + 0.25, 1.6);
        badgeC.style.opacity = t < k0 ? "0" : "1";
        badgeC.style.transform = `scale(${Math.max(0, kb).toFixed(4)})`;
        ckp.setAttribute("stroke-dashoffset", (ckLen * (1 - ML.ease(t, k0 + 0.05, k0 + 0.3))).toFixed(2));
        // the rest of the copy fades and blurs away
        const cf = ML.ease(t, c0, c1);
        for (const x of fades) { x.e.style.opacity = (1 - cf).toFixed(4); x.e.style.filter = x.blur && cf > 0.01 ? `blur(${(cf * 8).toFixed(2)}px)` : "none"; }
        for (const w of others) { w.style.opacity = (1 - cf).toFixed(4); w.style.filter = cf > 0.01 ? `blur(${(cf * 8).toFixed(2)}px)` : "none"; }
        // name, tagline, pill
        rise(nm, t, n0);
        if (tg) rise(tg, t, l0);
        rise(pillRow, t, q0);
      },
    };
  },
});

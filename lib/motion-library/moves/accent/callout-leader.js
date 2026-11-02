// Leader-line callout labels: small labels appear beside an object, each tied to a point on it by a thin leader.
// Per callout: an anchor dot on the object, the leader drawing out from it (straight, elbow = diagonal then level, or
// a curve; solid or dashed — a dashed one stays dashed while it draws, because the path itself grows rather than a
// dash offset), then the label fading in and sliding 8 px away from the line end (a mono chip, a glass box with a
// small mono caption over a title, or a diagnostic pill), typed on with a block caret when asked. Callouts stagger
// `stagger` apart; before the end each leader retracts into its dot and the labels fade. The dimension-bracket label
// is the spec variant: a measured bracket along the object's top with end ticks and a mono "W 640 / H 260" label.
// Track: the anchors are re-measured every frame, so labels follow an object another move is moving (labels stay flat).
// RTL: "right" means the inline end — labels go left of the object — and the elbow runs the other way.
// Sources: MengTo/Skills (MIT) html-reel demo (tags: 6 px rise on cubic-out, leader grown from the tag edge toward
// the anchor, dot when it arrives), html-explainer-video film.js hook (labels pinned to layer corners), editorial-tech
// + globe-particles dashed leaders and boxes, technical-wireframe-info-layout routed lines + diagnostic pill;
// prompt-motion shneural-after-opus-5-5-it and levabashidze-i-made-this-15 (reference only: type-on, dimension variant).
ML.define({
  id: "accent.callout-leader",
  category: "accent",
  name: "Leader-line callout labels",
  does: "Small labels appear beside an object, each tied to a point on it by a thin drawn leader line.",
  says: ["precision", "tech", "proof", "connection", "reveal", "focus", "list"],
  energy: 2,
  targets: ["label", "card", "shape", "chart", "screen", "image"],
  duration: [1, 6],
  params: {
    count: { type: "number", range: [1, 4], default: 2 },
    side: { type: "choice", options: ["right", "left", "auto"], default: "right" },
    route: { type: "choice", options: ["straight", "elbow", "curve"], default: "straight" },
    line: { type: "choice", options: ["solid", "dashed"], default: "solid" },
    label: { type: "choice", options: ["mono-chip", "glass-box", "pill", "dimension-bracket", "none"], default: "mono-chip" },
    anchor_dot: { type: "bool", default: true },
    type_on: { type: "bool", default: false },
    stagger: { type: "number", range: [0.1, 0.3], default: 0.2, unit: "s" },
    track: { type: "bool", default: false },
  },
  pairs: ["accent.corner-brackets", "accent.corner-markers", "camera.push-in"],
  avoid: ["playful", "celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:media/html-reel", license: "MIT", note: "with html-explainer-video's corner-pinned labels, editorial-tech / globe-particles dashed callouts, technical-wireframe-info-layout routed lines; prompt-motion shneural-after-opus-5-5-it + levabashidze-i-made-this-15 as reference" },
  setup(ctx) {
    const { el, p, at, end, rtl, stage, f } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    // each SVG piece on its own layer: a piece re-drawn next to another never changes how that one rasterises
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v); if (parent) parent.append(e); if (tag !== "svg") e.style.willChange = "transform"; return e; };
    const setA = (e, k, v) => { if (e.getAttribute(k) !== v) e.setAttribute(k, v); };
    const u = Math.min(f.W, f.H) / 1080;
    const SW = Math.max(1.5, 2 * u), DOT = 5 * u;

    // the object: the target's box, else a plain panel built over the picture region
    let obj = el && el !== stage ? el : null;
    if (!obj) {
      const w = f.pic.w * 0.5, h = Math.min(f.pic.h * 0.5, w * 0.75);
      obj = mk("div", `position:absolute;left:${f.pic.x + (f.pic.w - w) / 2}px;top:${f.pic.y + (f.pic.h - h) / 2}px;width:${w}px;height:${h}px;box-sizing:border-box;z-index:20;visibility:hidden`, stage);
      obj.className = "ml-panel";
      obj.dataset.mlBuilt = "1";
    }
    const built = obj.dataset.mlBuilt === "1";

    const layer = mk("div", "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:30;visibility:hidden", stage);
    const svg = sv("svg", { width: f.W, height: f.H, viewBox: `0 0 ${f.W} ${f.H}`, style: "position:absolute;left:0;top:0;overflow:visible;will-change:transform" }, layer); // its own layer: the frame under it rasterises the same every time

    const N = Math.round(ML.clamp(+p.count || 2, 1, 4));
    // anchor points on the object (shares of its box) and which side each label goes
    const ANCH = [[0.22, 0.22], [0.26, 0.78], [0.14, 0.62], [0.12, 0.38]]; // [depth in from the label's side, down]
    const endSide = rtl ? -1 : 1; // +1 = right
    const sideOf = (i) => (p.side === "auto" ? (i % 2 === 0 ? 1 : -1) * endSide : p.side === "left" ? -endSide : endSide);
    const TXT = rtl
      ? [["عقدة ٠١", "طبقة الإدخال"], ["الإشارة", "موثّقة"], ["الاستجابة", "١٢ ملّي ث"], ["الحالة", "جاهز"]]
      : [["NODE_01", "Input layer"], ["SIGNAL", "Verified"], ["LATENCY", "12 ms"], ["STATUS", "OBJ_COMPILED"]];
    const st = ML.clamp(+p.stagger || 0.2, 0.05, 0.5);
    const dim = p.label === "dimension-bracket";

    const fs = Math.round(22 * u), fsS = Math.round(17 * u);
    const items = [];
    const count = dim ? 1 : N;
    for (let i = 0; i < count; i++) {
      const g = sv("g", {}, svg);
      const path = sv("path", { fill: "none", style: `stroke:color-mix(in srgb, var(--x-ink) 55%, transparent);stroke-width:${SW};stroke-linejoin:bevel;stroke-linecap:round${p.line === "dashed" ? `;stroke-dasharray:${(7 * u).toFixed(1)} ${(6 * u).toFixed(1)}` : ""}` }, g);
      const dot = p.anchor_dot ? sv("circle", { r: DOT.toFixed(1), style: "fill:var(--x-accent)" }, g) : null;
      const ring = p.anchor_dot ? sv("circle", { r: DOT.toFixed(1), style: `fill:none;stroke:var(--x-accent);stroke-width:${SW}` }, g) : null;
      const end2 = sv("rect", { width: (7 * u).toFixed(1), height: (7 * u).toFixed(1), style: "fill:var(--x-ink)" }, g); // the far-end square
      let tag = null, title = null, caret = null, full = "";
      if (p.label !== "none") {
        const [cap, ttl] = TXT[i % TXT.length];
        tag = mk("div", `position:absolute;left:0;top:0;white-space:nowrap;box-sizing:border-box;visibility:hidden;will-change:opacity, translate`, layer);
        if (dim) {
          tag.style.cssText += `font:600 ${fs}px var(--x-mono-font);color:var(--x-ink);direction:ltr;unicode-bidi:isolate;background:var(--x-ground);padding:${2 * u}px ${8 * u}px`;
          title = mk("span", "", tag);
        } else if (p.label === "glass-box") {
          tag.style.cssText += `background:color-mix(in srgb, var(--x-panel) 82%, transparent);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * .35);box-shadow:var(--x-shadow);padding:${14 * u}px ${18 * u}px;display:flex;flex-direction:column;gap:${6 * u}px`;
          const c = mk("div", `font-size:${fsS}px`, tag, cap); c.className = "ml-label";
          title = mk("div", `font:500 ${fs}px var(--x-body-font);color:var(--x-ink)`, tag);
        } else if (p.label === "pill") {
          tag.style.cssText += `background:var(--x-ink);border:1px solid color-mix(in srgb, var(--x-ground) 25%, transparent);border-radius:${3 * u}px;padding:${9 * u}px ${14 * u}px;display:flex;flex-direction:column;gap:${3 * u}px`;
          const c = mk("div", `font:300 ${fsS}px var(--x-body-font);color:var(--x-ground);${rtl ? "" : "letter-spacing:.2em;text-transform:uppercase"}`, tag, ttl);
          void c;
          title = mk("div", `font:500 ${fsS}px var(--x-mono-font);color:color-mix(in srgb, var(--x-ground) 60%, transparent)`, tag);
        } else {
          tag.style.cssText += `background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:var(--x-radius-s);box-shadow:var(--x-shadow);padding:${9 * u}px ${18 * u}px;font:600 ${fs}px var(--x-mono-font);color:var(--x-ink)`;
          title = mk("span", "", tag);
        }
        full = dim ? "" : p.label === "pill" ? cap : p.label === "glass-box" ? ttl : `${cap} · ${ttl}`;
        if (title) title.textContent = full;
        if (p.type_on && title) { caret = mk("span", `display:inline-block;width:.55em;height:1em;vertical-align:-.12em;margin-inline-start:.12em;background:currentColor`, title); }
      }
      items.push({ g, path, dot, ring, end2, tag, title, caret, full, side: sideOf(i), a: ANCH[i % ANCH.length], t0: at + 0.1 + i * st });
    }

    // dimension bracket: a measured line along the object's top
    const dimG = dim ? sv("g", {}, svg) : null;
    const dimLines = dim ? [0, 1, 2, 3].map(() => sv("line", { style: `stroke:var(--x-ink);stroke-width:${SW}` }, dimG)) : [];

    // geometry of a route from the anchor A to the label end E, as a sampler s ∈ [0, 1] → point
    const routeOf = (A, E, side) => {
      if (p.route === "elbow") {
        const K = { x: E.x - side * 40 * u, y: E.y }; // diagonal to a knee, then level into the label
        const l1 = Math.hypot(K.x - A.x, K.y - A.y), l2 = Math.hypot(E.x - K.x, E.y - K.y), L = l1 + l2 || 1;
        return { L, at: (s) => { const d = s * L; if (d <= l1) { const k = l1 ? d / l1 : 1; return { x: A.x + (K.x - A.x) * k, y: A.y + (K.y - A.y) * k }; } const k = l2 ? (d - l1) / l2 : 1; return { x: K.x + (E.x - K.x) * k, y: K.y + (E.y - K.y) * k }; }, kneeS: l1 / L };
      }
      if (p.route === "curve") {
        const C = { x: A.x + (E.x - A.x) * 0.15, y: E.y };
        const at2 = (s) => ({ x: (1 - s) * (1 - s) * A.x + 2 * (1 - s) * s * C.x + s * s * E.x, y: (1 - s) * (1 - s) * A.y + 2 * (1 - s) * s * C.y + s * s * E.y });
        let L = 0, pr = A; for (let k = 1; k <= 24; k++) { const q = at2(k / 24); L += Math.hypot(q.x - pr.x, q.y - pr.y); pr = q; }
        return { L, at: at2 };
      }
      return { L: Math.hypot(E.x - A.x, E.y - A.y), at: (s) => ({ x: A.x + (E.x - A.x) * s, y: A.y + (E.y - A.y) * s }) };
    };
    const partial = (R, k) => {
      if (k <= 0) return "";
      const n = p.route === "curve" ? 24 : p.route === "elbow" ? 0 : 1;
      const pts = [R.at(0)];
      if (p.route === "elbow") { if (k > R.kneeS) pts.push(R.at(R.kneeS)); pts.push(R.at(k)); }
      else for (let j = 1; j <= n; j++) pts.push(R.at((j / n) * k));
      return "M" + pts.map((q) => `${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(" L");
    };

    // measure the tags once (their size doesn't change while typing: measured with the full text)
    for (const it of items) if (it.tag) { it.tw = it.tag.offsetWidth; it.th = it.tag.offsetHeight; }
    // per side, the labels stack evenly beside the object in the order of their anchors (never crossing)
    const geom = (b) => {
      const out = items.map((it) => ({ A: { x: b.x + b.w * (it.side > 0 ? 1 - it.a[0] : it.a[0]), y: b.y + b.h * it.a[1] } }));
      const margin = 16 * u, reach = Math.max(70 * u, Math.min(150 * u, b.w * 0.25));
      for (const sd of [1, -1]) {
        const idx = items.map((_, i) => i).filter((i) => items[i].side === sd).sort((i, j) => out[i].A.y - out[j].A.y);
        const n = idx.length; if (!n) continue;
        const th = Math.max(...idx.map((i) => items[i].th || 30 * u)), step = Math.max(th + 28 * u, n > 1 ? Math.min(b.h, 200 * u * n) / n : 0);
        const cy = b.y + b.h / 2;
        idx.forEach((i, j) => {
          const it = items[i], tw = it.tw || 0, A = out[i].A;
          let ex = sd > 0 ? b.x + b.w + reach : b.x - reach;
          // keep the label on the frame: if it doesn't fit beside the object, it sits over its edge
          if (sd > 0 && ex + 14 * u + tw > f.W - margin) ex = f.W - margin - tw - 14 * u;
          if (sd < 0 && ex - 14 * u - tw < margin) ex = margin + tw + 14 * u;
          let ey = n === 1 ? A.y - Math.min(70 * u, b.h * 0.3 + 24 * u) : cy + (j - (n - 1) / 2) * step;
          ey = ML.clamp(ey, (it.th || 0) / 2 + margin, f.H - (it.th || 0) / 2 - margin);
          out[i].E = { x: ex, y: ey };
        });
      }
      return out;
    };
    const b0 = ctx.box(obj);
    const G0 = geom(b0);

    items.forEach((it, i) => i % 2 === 0 && ctx.sfx(it.t0, "tap", 0.2));
    const outA = end - 0.45;

    return {
      draw(t) {
        const vis = t >= at - 1e-6 && t < end;
        layer.style.visibility = vis ? "visible" : "hidden";
        if (built) obj.style.visibility = vis ? "visible" : "hidden";
        if (!vis) return;
        if (built) ML.show(obj, t, at - 0.2, end - 0.25);
        const G = p.track ? geom(ctx.box(obj)) : G0;
        const leave = ML.ease(t, outA, outA + 0.25);
        if (dim) {
          const b = p.track ? ctx.box(obj) : b0, y = b.y - 34 * u, k = ML.out(t, at + 0.1, at + 0.5), cx = b.x + b.w / 2, half = (b.w / 2) * k * (1 - leave);
          const [l1, l2, tk1, tk2] = dimLines;
          setA(l1, "x1", (cx - half).toFixed(1)); setA(l1, "x2", cx.toFixed(1)); setA(l1, "y1", y.toFixed(1)); setA(l1, "y2", y.toFixed(1));
          setA(l2, "x1", cx.toFixed(1)); setA(l2, "x2", (cx + half).toFixed(1)); setA(l2, "y1", y.toFixed(1)); setA(l2, "y2", y.toFixed(1));
          for (const [tk, x] of [[tk1, cx - half], [tk2, cx + half]]) { setA(tk, "x1", x.toFixed(1)); setA(tk, "x2", x.toFixed(1)); setA(tk, "y1", (y - 9 * u).toFixed(1)); setA(tk, "y2", (y + 9 * u).toFixed(1)); }
          dimG.style.opacity = (k > 0 ? 1 - leave : 0).toFixed(3);
        }
        items.forEach((it, i) => {
          const { A, E } = G[i];
          if (dim) {
            const b = p.track ? ctx.box(obj) : b0;
            const x0 = b.x + b.w / 2, y0 = b.y - 34 * u, o = ML.ease(t, at + 0.35, at + 0.6) * (1 - leave);
            if (it.title) { const v = `W ${Math.round(b.w / u)} / H ${Math.round(b.h / u)}`; const shown = p.type_on ? ML.typed(v, t, at + 0.4, at + 0.4 + v.length / 30) : v; if (it.title.textContent !== shown) it.title.textContent = shown; }
            it.tag.style.visibility = o > 0 ? "visible" : "hidden";
            it.tag.style.opacity = o.toFixed(3);
            it.tag.style.translate = `${(x0 - it.tag.offsetWidth / 2).toFixed(1)}px ${(y0 - it.tag.offsetHeight / 2).toFixed(1)}px`;
            it.g.style.visibility = "hidden";
            if (it.caret) it.caret.style.opacity = String(ML.blink(t - at, 0.6));
            return;
          }
          const R = routeOf(A, E, it.side);
          const k = ML.out(t, it.t0, it.t0 + 0.4);
          const back = ML.ease(t, outA - (count - 1 - i) * 0.05, outA + 0.2 - (count - 1 - i) * 0.05); // retract into the dot
          const shown = k * (1 - back);
          it.g.style.visibility = t >= it.t0 ? "visible" : "hidden";
          setA(it.path, "d", partial(R, shown));
          if (it.dot) {
            const pop = ML.back(t, it.t0 - 0.08, it.t0 + 0.14, 2) * (1 - leave);
            setA(it.dot, "cx", A.x.toFixed(1)); setA(it.dot, "cy", A.y.toFixed(1));
            setA(it.dot, "r", (DOT * Math.max(0, pop)).toFixed(2));
            // one pulse ring as the label arrives
            const pu = ML.lin(t, it.t0 + 0.4, it.t0 + 0.9);
            setA(it.ring, "cx", A.x.toFixed(1)); setA(it.ring, "cy", A.y.toFixed(1));
            setA(it.ring, "r", (DOT * (1 + pu * 2.4)).toFixed(2));
            const ro = pu > 0 && pu < 1 ? (1 - pu) * 0.8 : 0;
            setA(it.ring, "opacity", ro.toFixed(3));
            setA(it.ring, "display", ro > 0 ? "inline" : "none");
          }
          const fe = shown > 0.98 ? 1 - leave : 0;
          setA(it.end2, "x", (E.x - 3.5 * u).toFixed(1)); setA(it.end2, "y", (E.y - 3.5 * u).toFixed(1));
          setA(it.end2, "opacity", (p.label === "none" ? fe : 0).toFixed(2));
          if (!it.tag) return;
          const ta = it.t0 + 0.32;
          const o = ML.ease(t, ta, ta + 0.2) * (1 - leave);
          const slide = 8 * u * (1 - ML.out(t, ta, ta + 0.35));
          const left = it.side > 0 ? E.x + 14 * u + slide : E.x - 14 * u - it.tw - slide;
          it.tag.style.visibility = o > 0.001 ? "visible" : "hidden";
          it.tag.style.opacity = o.toFixed(4);
          it.tag.style.translate = `${left.toFixed(1)}px ${(E.y - it.th / 2).toFixed(1)}px`;
          if (p.type_on && it.title) {
            // Latin types at ~30 chars / s; Arabic word by word (its letters join)
            let v;
            if (rtl) { const ws = it.full.split(" "); v = ws.slice(0, Math.round(ws.length * ML.lin(t, ta, ta + ws.length * 0.12))).join(" "); }
            else v = ML.typed(it.full, t, ta, ta + it.full.length / 30);
            const node = it.title.firstChild && it.title.firstChild.nodeType === 3 ? it.title.firstChild : null;
            if (node) { if (node.textContent !== v) node.textContent = v; } else it.title.prepend(doc.createTextNode(v));
            if (it.caret) it.caret.style.opacity = String(ML.blink(t - ta, 0.6) * (t < ta + it.full.length / 30 + 0.9 ? 1 : 0)); // the caret goes once the line is typed
          }
        });
      },
    };
  },
});

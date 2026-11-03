// Outline draws, then fills: an object or a logo draws itself as a hand-made outline, then its fill comes in.
//  · a logo / shape target (SVG): its own geometry, copied, is stroked (fill off) and drawn by dash-offset —
//    silhouette first, then its inner parts — then its own fills return (0 → 40 % while the stroke thickens, then 100 %);
//    with end "dock" it is drawn 1.6× large and 60 px low, then settles to its own spot and size (0.5 s power3.inOut;
//    vector, no 3D, so it stays sharp);
//  · a picture target: a hand-drawn frame round it plus a little sketch of a picture (horizon, sun) draw on, then the
//    picture itself is the fill (0 → 40 % → 100 %) while the sketch lines fade (never blurred, never enlarged);
//  · anything else: a drawn object (a parcel) or a drawn brand mark, filled in the look's accent.
// Sketchy style: every stroke is drawn twice, the second a hair off and a beat behind, ends left open — the
// hand-made look; clean: one even stroke. Order fill-first: a pale fill rect fades to 50 % before the stroke (0.3 s).
// Silhouette 0.55 of the run power2.inOut, inner lines 0.25 s each after it, then the fill. The run tightens when the
// scene is short, and a logo of many parts shares the same window: it never runs past its fill.
// Source: prompt-motion "sarut0bisasuke-opus-5-5-is-cracked" + "elliot-garreffa-alright-opus-5-5-is" (reference only
// — rebuilt as our own code).
ML.define({
  id: "element.outline-draw-fill",
  category: "element",
  name: "Outline draws, then fills",
  does: "An object or logo draws itself as a hand-made outline, then its fill fades in (and a logo can shrink up into its header spot).",
  says: ["story", "step", "calm", "brand", "arrival", "playful"],
  energy: 2,
  targets: ["image", "shape", "logo"],
  duration: [1.2, 3],
  params: {
    target: { type: "choice", options: ["object", "logo"], default: "object" },
    order: { type: "choice", options: ["stroke-first", "fill-first"], default: "stroke-first" },
    style: { type: "choice", options: ["sketchy", "clean"], default: "sketchy" },
    end: { type: "choice", options: ["hold", "dock"], default: "hold" },
    duration: { type: "number", range: [0.8, 2], default: 1.2, unit: "s" },
  },
  pairs: ["text-in.punchline", "text-emphasis.underline-draw"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:sarut0bisasuke-opus-5-5-is-cracked", license: "reference", note: "also elliot-garreffa-alright-opus-5-5-is; stroke-draw then fill rebuilt as our own code; every frame from t" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const NS = "http://www.w3.org/2000/svg";
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const k = Math.min(f.W, f.H) / 1080;
    // the run fits the scene: fill (0.6 s) and dock (1.15 s) included
    const lead = p.order === "fill-first" ? 0.3 : 0, room = end - at - lead - 0.6 - (p.end === "dock" ? 1.15 : 0);
    const D = Math.max(0.5, Math.min(ML.clamp(p.duration, 0.8, 2), room / 0.88));
    const sketchy = p.style === "sketchy";
    const sw = (sketchy ? 2 : 1.8) * k * 1.6;
    const t0 = at + lead;
    const silA = t0, silB = t0 + 0.55 * D;
    const fillA = t0 + 0.88 * D;
    const mkSvg = (w, h, vb) => { const s = doc.createElementNS(NS, "svg"); s.setAttribute("viewBox", vb || `0 0 ${w} ${h}`); s.setAttribute("width", w); s.setAttribute("height", h); s.style.cssText = "position:absolute;left:0;top:0;overflow:visible;pointer-events:none;"; return s; };
    const strokes = []; // { e, L, a, b }
    const addStroke = (e, L, a, b, twin) => { const base = parseFloat(e.getAttribute("stroke-width")) || sw; e.setAttribute("stroke-dasharray", `${L} ${L}`); strokes.push({ e, L, a, b, base }); if (twin) { twin.setAttribute("stroke-dasharray", `${L} ${L}`); strokes.push({ e: twin, L, a: a + 0.06, b: b + 0.06, base }); } };
    const fills = []; // { e, to } fill-opacity targets
    let pic = null, wrap, dockable = false, pale = null;
    const B = own ? ctx.box(own) : null;

    if (own && own.tagName.toLowerCase() === "svg") {
      // ── the logo / shape's own geometry
      dockable = true;
      wrap = doc.createElement("div");
      wrap.style.cssText = `position:absolute;left:${B.x}px;top:${B.y}px;width:${B.w}px;height:${B.h}px;pointer-events:none;z-index:6;direction:ltr;`;
      host.append(wrap);
      const c = own.cloneNode(true); c.removeAttribute("data-slot"); c.setAttribute("width", B.w); c.setAttribute("height", B.h);
      c.style.cssText = "position:absolute;left:0;top:0;overflow:visible;";
      wrap.append(c);
      const parts = [...c.querySelectorAll("path,rect,circle,ellipse,polygon,polyline,line,text")];
      const scale = B.w / (c.viewBox && c.viewBox.baseVal && c.viewBox.baseVal.width ? c.viewBox.baseVal.width : B.w);
      const partGap = Math.min(0.18, (0.33 * D) / Math.max(1, parts.length - 1));
      parts.forEach((e, i) => {
        const fill = e.getAttribute("fill") || "var(--x-ink)";
        let L = 400;
        try { L = e.tagName === "text" ? e.getComputedTextLength() * 5 : e.getTotalLength(); } catch (_) {}
        e.setAttribute("stroke", fill === "none" ? "var(--x-ink)" : fill);
        e.setAttribute("stroke-width", String(sw / scale)); e.setAttribute("stroke-linecap", "round"); e.setAttribute("stroke-linejoin", "round");
        e.setAttribute("fill-opacity", "0");
        let twin = null;
        if (sketchy) { twin = e.cloneNode(true); twin.setAttribute("transform", `translate(${(1.2 / scale).toFixed(2)} ${(-0.8 / scale).toFixed(2)})`); twin.setAttribute("stroke-opacity", "0.45"); twin.setAttribute("fill", "none"); e.after(twin); }
        const a = i === 0 ? silA : silB - 0.05 + (i - 1) * partGap, b = i === 0 ? silB : a + 0.25 * Math.max(1, D / 1.2) + (e.tagName === "text" ? 0.25 : 0);
        addStroke(e, L, a, b, twin);
        if (fill !== "none") fills.push(e);
      });
    } else if (own && own.tagName === "IMG") {
      // ── a picture: a drawn frame and sketch, then the picture is the fill
      pic = own;
      wrap = doc.createElement("div");
      wrap.style.cssText = `position:absolute;left:${B.x}px;top:${B.y}px;width:${B.w}px;height:${B.h}px;pointer-events:none;z-index:6;`;
      host.append(wrap);
      const s = mkSvg(B.w, B.h); wrap.append(s);
      const r = Math.min(parseFloat(getComputedStyle(own).borderTopLeftRadius) || 0, B.h / 2);
      const o = sketchy ? 3 * k : 0;
      const frameD = `M${r + o} ${-o} H${B.w - r} Q${B.w + o} ${-o} ${B.w} ${r} V${B.h - r} Q${B.w} ${B.h + o} ${B.w - r - o} ${B.h} H${r} Q${-o} ${B.h} ${-o} ${B.h - r} V${r + o} Q${0} ${0} ${r + o * 3} ${-o * 0.5}`;
      const mx = (x) => (rtl ? B.w - x : x);
      const hz = `M${mx(B.w * 0.04)} ${B.h * 0.82} L${mx(B.w * 0.3)} ${B.h * 0.48} L${mx(B.w * 0.46)} ${B.h * 0.66} L${mx(B.w * 0.62)} ${B.h * 0.4} L${mx(B.w * 0.96)} ${B.h * 0.84}`;
      const sr = Math.min(B.w, B.h) * 0.11, sx = mx(B.w * 0.78), sy = B.h * 0.26;
      const sun = `M${sx + sr} ${sy} A${sr} ${sr} 0 1 1 ${sx + sr - 0.01} ${sy - 1.5 * k}`;
      // the frame starts on the reading side: mirrored in Arabic (the sketch inside is already placed by mx)
      const frameG = doc.createElementNS(NS, "g"); if (rtl) frameG.setAttribute("transform", `translate(${B.w} 0) scale(-1 1)`); s.append(frameG);
      [frameD, hz, sun].forEach((d, i) => {
        const e = doc.createElementNS(NS, "path"); e.setAttribute("d", d); e.setAttribute("fill", "none"); e.setAttribute("stroke", "var(--x-ink)");
        e.setAttribute("stroke-width", String(sw)); e.setAttribute("stroke-linecap", "round"); e.setAttribute("stroke-linejoin", "round"); (i ? s : frameG).append(e);
        const L = e.getTotalLength();
        let twin = null;
        if (sketchy) { twin = e.cloneNode(true); twin.setAttribute("transform", `translate(${1.5 * k} ${-1.2 * k}) rotate(${i ? 0 : 0.25} ${B.w / 2} ${B.h / 2})`); twin.setAttribute("stroke-opacity", "0.4"); (i ? s : frameG).append(twin); }
        const a = i === 0 ? silA : silB - 0.05 + (i - 1) * 0.2, b = i === 0 ? silB : a + 0.25 * Math.max(1, D / 1.2);
        addStroke(e, L, a, b, twin);
        if (i) e.dataset.inner = "1", twin && (twin.dataset.inner = "1");
      });
      if (p.order === "fill-first") { pale = doc.createElement("div"); pale.style.cssText = `position:absolute;inset:0;border-radius:${r}px;background:var(--x-panel-2);`; wrap.prepend(pale); }
    } else {
      // ── a drawn object or brand mark, centred in the target (or the picture area)
      dockable = true;
      const R = B && B.w > 40 ? B : f.pic;
      const size = Math.min(R.w, R.h) * (B && B.w > 40 && B.w < f.W * 0.4 ? 0.95 : 0.55);
      wrap = doc.createElement("div");
      wrap.style.cssText = `position:absolute;left:${R.x + (R.w - size) / 2}px;top:${R.y + (R.h - size) / 2}px;width:${size}px;height:${size}px;pointer-events:none;z-index:6;`;
      host.append(wrap);
      const s = mkSvg(size, size, "0 0 200 200"); wrap.append(s);
      const sc = size / 200;
      const set = p.target === "logo"
        ? [["M52 28 H148 Q172 28 172 52 V148 Q172 172 148 172 H52 Q28 172 28 148 V52 Q28 28 52 28 Z", "var(--x-accent)"], ["M100 62 A36 36 0 1 0 100.01 62", "var(--x-accent-ink)"], ["M70 142 H130", null]]
        : [["M30 70 L100 40 L170 70 L170 150 L100 180 L30 150 Z", "color-mix(in srgb, var(--x-accent) 55%, var(--x-panel))"], ["M30 70 L100 100 L170 70", null], ["M100 100 L100 180", null], ["M65 55 L135 85 L135 115", null]];
      set.forEach(([d, fill], i) => {
        const e = doc.createElementNS(NS, "path"); e.setAttribute("d", d); e.setAttribute("fill", fill || "none"); e.setAttribute("fill-opacity", "0");
        e.setAttribute("stroke", p.target === "logo" && i === 2 ? "var(--x-accent-ink)" : "var(--x-ink)"); e.setAttribute("stroke-width", String(sw / sc)); e.setAttribute("stroke-linecap", "round"); e.setAttribute("stroke-linejoin", "round");
        s.append(e);
        const L = e.getTotalLength();
        let twin = null;
        if (sketchy) { twin = e.cloneNode(true); twin.setAttribute("fill", "none"); twin.setAttribute("transform", `translate(${1.4 / sc} ${-1 / sc})`); twin.setAttribute("stroke-opacity", "0.45"); s.append(twin); }
        const a = i === 0 ? silA : silB - 0.05 + (i - 1) * 0.18, b = i === 0 ? silB : a + 0.25 * Math.max(1, D / 1.2);
        addStroke(e, L, a, b, twin);
        if (fill) fills.push(e);
      });
      if (p.order === "fill-first") { pale = doc.createElement("div"); pale.style.cssText = `position:absolute;inset:${size * 0.14}px;border-radius:${size * 0.12}px;background:var(--x-panel-2);`; wrap.prepend(pale); }
    }
    const dock = dockable && p.end === "dock";
    const dockA = fillA + 0.65;
    if (own && !pic) own.style.opacity = "0";
    ctx.sfx(silA, "whoosh.soft", 0.2);
    ctx.sfx(fillA, "pop.soft", 0.3);
    if (dock) ctx.sfx(dockA, "land.light", 0.3);
    const p2io = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    return {
      draw(t) {
        wrap.style.visibility = t < at - 1e-6 ? "hidden" : "visible";
        if (own && !pic) own.style.opacity = "0";
        if (pale) pale.style.opacity = (0.5 * ML.ease(t, at, at + 0.3) * (1 - ML.lin(t, fillA, fillA + 0.3))).toFixed(4);
        strokes.forEach((s) => { const u = p2io(ML.lin(t, s.a, s.b)); s.e.setAttribute("stroke-dashoffset", (s.L * (1 - u)).toFixed(2)); s.e.style.visibility = t < s.a ? "hidden" : "visible"; });
        // the fill: 0 → 40 % while the stroke thickens, then 100 %
        const tint = ML.out(t, fillA, fillA + 0.3), full = ML.ease(t, fillA + 0.3, fillA + 0.6), fo = 0.4 * tint + 0.6 * full;
        const thick = 1 + 0.6 * tint * (1 - full * 0.5);
        strokes.forEach((s) => { s.e.setAttribute("stroke-width", (s.base * thick).toFixed(3)); });
        fills.forEach((e) => e.setAttribute("fill-opacity", fo.toFixed(4)));
        if (pic) {
          pic.style.opacity = fo.toFixed(4); // the picture is the fill: it arrives with it
          strokes.forEach((s) => { if (s.e.dataset.inner) s.e.style.opacity = (1 - full).toFixed(4); });
        }
        if (dock) {
          const u = 1 - ML.ease(t, dockA, dockA + 0.5);
          wrap.style.transformOrigin = "50% 50%";
          wrap.style.transform = `translateY(${(60 * k * u).toFixed(2)}px) scale(${(1 + 0.6 * u).toFixed(4)})`;
        }
      },
    };
  },
});

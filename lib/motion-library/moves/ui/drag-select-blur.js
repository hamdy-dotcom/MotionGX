// Drag a box to blur: the pointer presses at one corner of part of a line and drags a dashed selection rectangle to the
// other corner (0.35 s power2.out). On release the region inside turns frosted — a backdrop blur 0 → amount over
// 0.3 s with a slight tint (or a growing pixel mosaic, or a marker highlight) — and the dashed edge fades. A tool pill
// ("Blur & Annotate") sits below the line, and a small chip confirms once it's done. The selection starts on the
// reading side (RTL: from the right) and covers the line's end, its start, its middle or all of it.
// Source: prompt-motion jhylee95-opus-5-5-max-is (reference only — our own rebuild).
ML.define({
  id: "ui.drag-select-blur",
  category: "ui",
  name: "Drag a box to blur part of the content",
  does: "The cursor drags a selection rectangle over part of a line, and the selected region turns frosted-blurred (or pixelated, or highlighted) while a small chip confirms.",
  says: ["tech", "precision", "change"],
  energy: 2,
  targets: ["word", "screen", "cursor"],
  duration: [1, 2],
  params: {
    effect: { type: "choice", options: ["blur", "pixelate", "highlight"], default: "blur" },
    amount: { type: "number", range: [6, 20], default: 14, unit: "px" },
    part: { type: "choice", options: ["end", "start", "middle", "all"], default: "end" },
    button: { type: "bool", default: true },
    chip: { type: "bool", default: true },
  },
  pairs: ["ui.drag-move", "ui.cursor-free-path"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "snap",
  source: { from: "prompt-motion:jhylee95-opus-5-5-max-is", license: "reference", note: "our own rebuild; cursor arrow + click squash after product-film-skill templates/kit/cursor.tsx (MIT)" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const k = Math.min(f.W, f.H) / 1080, px = (v) => (v * k).toFixed(1) + "px";
    const mk = (tag, css, parent, html) => { const e = doc.createElement(tag); e.style.cssText = css; if (html != null) e.innerHTML = html; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const layer = mk("div", "position:absolute;inset:0;pointer-events:none;z-index:8;", host);
    const dir = rtl ? -1 : 1;

    // the content: the target line, else a line of our own in the picture region
    let el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    if (!el) {
      const R = f.pic;
      el = mk("div", `position:absolute;left:${R.x}px;top:${(R.y + R.h * 0.4).toFixed(1)}px;width:${R.w}px;text-align:center;font:var(--x-head-weight) ${px(80)} / 1.2 var(--x-head-font);color:var(--x-ink);`, layer, rtl ? "رقم الكارت 4821 7730" : "Card number 4821 7730");
    }
    // wrap the chosen part of the line in one inline box: the selection, the effect and the frame all live inside it,
    // so they follow the set type whatever the font measures
    const words = ML.split(el, "words");
    const n = words.length;
    const half = Math.max(1, Math.ceil(n / 2));
    const range = p.part === "all" || n < 2 ? [0, n - 1] : p.part === "start" ? [0, half - 1] : p.part === "middle" ? [Math.floor(n / 4), Math.max(Math.floor(n / 4), Math.ceil((3 * n) / 4) - 1)] : [n - half, n - 1];
    const first = words[range[0]], last = words[range[1]];
    const wrap = doc.createElement("span");
    wrap.style.cssText = "position:relative;display:inline-block;";
    if (first && last && first.parentNode === last.parentNode) {
      first.before(wrap);
      let node = first;
      while (node) { const next = node.nextSibling; wrap.append(node); if (node === last) break; node = next; }
    } else { while (el.firstChild) wrap.append(el.firstChild); el.append(wrap); }
    // the words themselves sit in an inner span: the effect filters them, never the frame or the pane
    const inner = doc.createElement("span");
    inner.style.display = "inline-block";
    while (wrap.firstChild) inner.append(wrap.firstChild);
    const size = parseFloat(getComputedStyle(el).fontSize) || 56;
    const pad = Math.max(8 * k, size * 0.16);
    // the glass: a clip the size of the selection, so the blur stays inside the frosted pane
    const glass = doc.createElement("span");
    glass.style.cssText = `display:inline-block;vertical-align:top;overflow:hidden;padding:${pad.toFixed(1)}px;margin:${(-pad).toFixed(1)}px;border-radius:${px(10)};`;
    glass.append(inner);
    wrap.append(glass);
    const side = rtl ? "right" : "left";
    // the effect
    let fx = null, pixel = null, pixF = null;
    if (p.effect === "blur") fx = mk("div", `position:absolute;inset:${(-pad).toFixed(1)}px;border-radius:${px(10)};box-sizing:border-box;border:${px(1.5)} solid transparent;`, wrap);
    else if (p.effect === "highlight") fx = mk("div", `position:absolute;inset:${(-pad * 0.5).toFixed(1)}px ${(-pad * 0.5).toFixed(1)}px;border-radius:${px(8)};background:color-mix(in srgb, var(--x-accent) 32%, transparent);mix-blend-mode:multiply;transform-origin:${side} center;scale:0 1;`, wrap);
    else {
      // a mosaic: an SVG filter on the selected words, its cell growing from 1 px to `amount`
      const id = "ml-px-" + Math.round(ML.rnd(at * 100 + n, 7) * 1e9);
      const svgF = doc.createElementNS(NS, "svg");
      svgF.setAttribute("width", "0"); svgF.setAttribute("height", "0"); svgF.style.position = "absolute";
      svgF.innerHTML = `<filter id="${id}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="0" result="b"/><feComponentTransfer in="b" result="c"><feFuncA type="linear" slope="2.6"/></feComponentTransfer><feFlood x="0" y="0" width="1" height="1"/><feComposite width="2" height="2"/><feTile result="a"/><feComposite in="c" in2="a" operator="in"/><feMorphology operator="dilate" radius="1"/></filter>`;
      layer.append(svgF);
      pixF = svgF.querySelector("filter");
      pixel = id;
      inner.style.cssText += `padding:${(pad * 0.4).toFixed(1)}px;margin:${(-pad * 0.4).toFixed(1)}px;`;
    }
    // the dashed selection, growing from the reading-side top corner
    const rect = mk("div", `position:absolute;top:${(-pad).toFixed(1)}px;${side}:${(-pad).toFixed(1)}px;box-sizing:border-box;border:${px(2.5)} dashed color-mix(in srgb, var(--x-ink) 55%, transparent);background:color-mix(in srgb, var(--x-accent) 6%, transparent);border-radius:${px(4)};width:0;height:0;`, wrap);

    // the tool pill below the line, and the confirming chip
    const ICON = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3" stroke-dasharray="3 3"/><path d="M8 15l3-3 2 2 3-3"/></svg>';
    const TICK = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    const pillTxt = p.effect === "pixelate" ? (rtl ? "تشويش وتعليق" : "Pixelate & Annotate") : p.effect === "highlight" ? (rtl ? "تظليل وتعليق" : "Highlight & Annotate") : (rtl ? "تمويه وتعليق" : "Blur & Annotate");
    const pill = p.button ? mk("div", `position:absolute;left:0;top:0;will-change:transform;display:flex;align-items:center;gap:${px(12)};padding:${px(16)} ${px(28)};border-radius:var(--x-radius-s);background:var(--x-ink);color:var(--x-ground);font:600 ${px(28)} var(--x-body-font);white-space:nowrap;box-shadow:var(--x-shadow);opacity:0;`, layer, `${ICON}<span>${pillTxt}</span>`) : null;
    const chipTxt = p.effect === "highlight" ? (rtl ? "تم التظليل" : "Marked") : (rtl ? "تم الإخفاء" : "Hidden");
    const chip = p.chip ? mk("div", `position:absolute;left:0;top:0;will-change:transform;display:flex;align-items:center;gap:${px(8)};padding:${px(8)} ${px(16)};border-radius:var(--x-radius-s);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);color:var(--x-ink);font:600 ${px(22)} ${rtl ? "var(--x-body-font)" : "var(--x-label-font)"};letter-spacing:${rtl ? 0 : ".06em"};white-space:nowrap;box-shadow:var(--x-shadow);opacity:0;`, layer, `<span style="color:var(--x-good)">${TICK}</span><span>${chipTxt}</span>`) : null;

    // the pointer
    const cs = 56 * k;
    const cur = mk("div", "position:absolute;left:0;top:0;", layer);
    const svg = doc.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("width", cs.toFixed(1)); svg.setAttribute("height", cs.toFixed(1));
    svg.style.cssText = `position:absolute;left:${(-5 / 24 * cs).toFixed(1)}px;top:${(-2 / 24 * cs).toFixed(1)}px;overflow:visible;transform-origin:${(5 / 24 * cs).toFixed(1)}px ${(2 / 24 * cs).toFixed(1)}px;filter:drop-shadow(0 ${px(4)} ${px(6)} color-mix(in srgb, var(--x-ink) 30%, transparent));`;
    svg.innerHTML = '<path d="M5 2 L5 19 L9.5 15.5 L12.5 22 L15.5 20.5 L12.5 14 L18.5 14 Z" fill="var(--x-pointer)" stroke="var(--x-pointer-edge)" stroke-width="1.4" stroke-linejoin="round"/>';
    cur.append(svg);

    // timing
    const span = Math.max(1, end - at - 0.3), sc = Math.min(1, span / 1.6);
    const tDown = at + 0.5 * sc, tUp = tDown + 0.35, tFx = tUp + 0.3;
    const glide = ML.bezier(0.42, 0, 0.12, 1);
    const pw2 = (t, a, b) => { const x = ML.lin(t, a, b); return 1 - (1 - x) * (1 - x); };
    ctx.sfx(tDown, "click", 0.4);
    ctx.sfx(tUp, "snap", 0.45);
    if (chip) ctx.sfx(tFx + 0.1, "pop.soft", 0.25);
    const start = { x: rtl ? f.safe.x + f.safe.w * 0.1 : f.safe.x + f.safe.w * 0.9, y: f.safe.y + f.safe.h * 0.75 };

    return {
      draw(t) {
        const on = ML.clamp((t - at) / 0.2), leave = ML.clamp((t - (end - 0.3)) / 0.25);
        const vis = on * (1 - leave);
        el.style.opacity = leave > 0 ? (1 - leave).toFixed(4) : "";
        const w = ctx.box(wrap), A = { x: rtl ? w.x + w.w + pad : w.x - pad, y: w.y - pad }, B = { x: rtl ? w.x - pad : w.x + w.w + pad, y: w.y + w.h + pad };
        // the selection grows with the drag, its edge fades once the effect is on
        const u = t < tDown ? 0 : pw2(t, tDown, tUp);
        rect.style.width = ((w.w + pad * 2) * u).toFixed(2) + "px";
        rect.style.height = ((w.h + pad * 2) * u).toFixed(2) + "px";
        rect.style.opacity = (u > 0 ? 1 - ML.lin(t, tUp + 0.05, tFx + 0.1) : 0).toFixed(4);
        // the effect
        const e = ML.out(t, tUp, tFx);
        if (p.effect === "blur") {
          const b = e * p.amount * k;
          // frosted: the words under the glass blur (a backdrop-filter is not frame-stable in the renderer), a pale
          // pane with a fine edge sits over them
          inner.style.filter = `blur(${b.toFixed(2)}px)`; // always a filter layer, so its raster never depends on the frame before
          fx.style.borderColor = `color-mix(in srgb, var(--x-panel) ${(e * 70).toFixed(1)}%, transparent)`;
          fx.style.background = `color-mix(in srgb, var(--x-panel) ${(e * 30).toFixed(1)}%, transparent)`;
        } else if (p.effect === "highlight") fx.style.scale = `${e.toFixed(4)} 1`;
        else {
          const cell = Math.max(1, Math.round(1 + e * (p.amount * k - 1)));
          if (e > 0) {
            const [gb, , flood, comp, , , morph] = pixF.children;
            gb.setAttribute("stdDeviation", (cell * 0.45).toFixed(2));
            flood.setAttribute("x", String(Math.floor(cell / 2))); flood.setAttribute("y", String(Math.floor(cell / 2)));
            comp.setAttribute("width", String(cell)); comp.setAttribute("height", String(cell));
            morph.setAttribute("radius", String(Math.max(1, Math.floor(cell / 2))));
            inner.style.filter = `url(#${pixel})`;
          } else inner.style.filter = "none";
        }
        // pointer: glide to the first corner, drag to the far one, drift a little after the release
        let c;
        if (t < tDown) { const g = glide(ML.lin(t, tDown - 0.46 * sc, tDown)); c = { x: start.x + (A.x - start.x) * g, y: start.y + (A.y - start.y) * g }; }
        else c = { x: A.x + (B.x - A.x) * u, y: A.y + (B.y - A.y) * u };
        if (t > tUp + 0.15) { const v = ML.out(t, tUp + 0.15, tUp + 0.7); c = { x: c.x + dir * 50 * k * v, y: c.y + 70 * k * v }; }
        cur.style.transform = `translate(${Math.round(c.x)}px, ${Math.round(c.y)}px)`;
        cur.style.opacity = vis.toFixed(4);
        let s = 1;
        if (t >= tDown && t < tUp) s = 0.88;
        if (t >= tUp && t < tUp + 0.12) s = 0.88 + 0.12 * ML.out(t, tUp, tUp + 0.12);
        svg.style.transform = s === 1 ? "none" : `scale(${s.toFixed(4)})`;
        // the pill below the line, the chip at the selection's far top corner
        if (pill || chip) {
          const lb = ctx.box(el), rowY = lb.y + lb.h + pad * 2;
          let px0 = lb.x + lb.w / 2, pw = 0, ph = 0;
          if (pill) {
            const pv = ML.out(t, at + 0.05, at + 0.4);
            pw = pill.offsetWidth; ph = pill.offsetHeight;
            px0 = Math.min(f.W - f.m - pw, Math.max(f.m, lb.x + lb.w / 2 - pw / 2));
            // whole pixels: a soft shadow on a fractional offset rasterises differently frame to frame
            pill.style.transform = `translate(${Math.round(px0)}px, ${Math.round(rowY + 14 * k * (1 - pv))}px)`;
            pill.style.opacity = (pv * vis).toFixed(4);
          }
          if (chip) {
            // the confirming chip: beside the pill on its far side (or under the line when there is no pill)
            const cv = ML.back(t, tFx + 0.05, tFx + 0.4, 2), ch = chip.offsetHeight, cw = chip.offsetWidth, gap = 14 * k;
            let x = pill ? (rtl ? px0 - gap - cw : px0 + pw + gap) : lb.x + lb.w / 2 - cw / 2;
            x = Math.min(f.W - f.m - cw, Math.max(f.m, x));
            const y = pill ? rowY + (ph - ch) / 2 : rowY;
            chip.style.transformOrigin = rtl ? "right center" : "left center";
            chip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) scale(${Math.max(0, cv).toFixed(4)})`;
            chip.style.opacity = (t >= tFx + 0.05 ? vis : 0).toFixed(4);
          }
        }
      },
    };
  },
});

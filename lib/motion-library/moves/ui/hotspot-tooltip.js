// Pulsing hotspot opens a tooltip card — a product-tour step. A hotspot dot breathes a ring (scale 1 → 2.2, opacity
// 0.5 → 0, a 1 s loop); a pointer glides in on an arc and clicks it; on the click frame a tooltip pops from the dot
// (scale 0.9 → 1, opacity 0 → 1, y −6 px → 0, transform-origin at the dot, 0.25 s back.out(1.4)): accent ground,
// radius 8, accent-ink 12 px text with the product word in bold, a "1 of 4" counter and a small Next button, with a
// tiny arrow nub pointing back at the dot. position "right" is the second step: the card opens beside the word
// (after it in reading order, so to the left in Arabic) with Back / Next and "2 of 4". Web px grow ×2 at 1080.
// On a target the director gives (a word, a card), the hotspot sits just past that element's inline end (inside
// it when there is no room on the frame), and the card flips side rather than leave the frame or cover the dot; alone it builds a small
// product screen whose headline names the product.
// Rebuilt as our own code from a prompt-motion reference (reference only: no pixels or code copied).
ML.define({
  id: "ui.hotspot-tooltip",
  category: "ui",
  name: "Pulsing hotspot opens a tooltip card",
  does: "A dot pulses, the cursor clicks it and a tooltip card ('Click to explore Orbit. 1 of 4  Next') pops out beneath.",
  says: ["step", "tech", "focus"],
  energy: 2,
  targets: ["card", "word", "cursor"],
  duration: [1, 2.5],
  params: {
    position: { type: "choice", options: ["below", "right"], default: "below" },
    counter: { type: "bool", default: true },
    cursor: { type: "bool", default: true },
    product: { type: "text", default: "Orbit" },
  },
  pairs: ["ui.cursor-glide-click", "camera.push-in"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "prompt-motion:jhylee95-opus-5-5-max-is", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080, s = 2 * k;
    const product = p.product || "Orbit";
    const right = p.position === "right";

    // what the hotspot marks: the director's target, else a product screen of our own
    let anchor = ctx.el && ctx.el !== ctx.stage ? ctx.el : null, wrap = null;
    if (!anchor) {
      const R = f.pic;
      wrap = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;display:grid;place-items:${right ? "center" : "start center"};padding-top:${right ? 0 : (R.h * 0.08).toFixed(1)}px;box-sizing:border-box;z-index:6;pointer-events:none;`, host);
      const scr = mk("div", `width:${Math.min(R.w * 0.92, 980 * k).toFixed(1)}px;box-sizing:border-box;padding:${(26 * k).toFixed(1)}px ${(40 * k).toFixed(1)}px ${(64 * k).toFixed(1)}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:var(--x-radius);box-shadow:var(--x-shadow);font-family:var(--x-body-font);color:var(--x-ink);`, wrap);
      const nav = mk("div", `display:flex;align-items:center;gap:${(26 * k).toFixed(1)}px;padding-bottom:${(22 * k).toFixed(1)}px;border-bottom:${k.toFixed(2)}px solid var(--x-line);font:var(--x-body-weight) ${(24 * k).toFixed(1)}px var(--x-body-font);color:var(--x-dim);`, scr);
      mk("span", `width:${(34 * k).toFixed(1)}px;height:${(34 * k).toFixed(1)}px;border-radius:50%;background:conic-gradient(from 40deg, var(--x-accent), var(--x-accent-2), var(--x-accent));flex:none;`, nav);
      mk("b", "color:var(--x-ink);font-weight:700;", nav, product);
      for (const x of rtl ? ["المنتج", "الأسعار", "المساعدة"] : ["Product", "Pricing", "Docs"]) mk("span", "", nav, x);
      const hero = mk("div", `margin-top:${(48 * k).toFixed(1)}px;font:var(--x-head-weight) ${(64 * k).toFixed(1)}px/1.1 var(--x-head-font);letter-spacing:var(--x-head-track);`, scr);
      hero.append(rtl ? "اكتشف " : "Meet ");
      anchor = mk("span", "color:var(--x-accent);", hero, product);
      mk("div", `margin-top:${(16 * k).toFixed(1)}px;font:var(--x-body-weight) ${(28 * k).toFixed(1)}px var(--x-body-font);color:var(--x-dim);`, scr, rtl ? "كل مهامك في مدار واحد." : "Every task, in one orbit.");
    }
    const layer = mk("div", "position:absolute;inset:0;pointer-events:none;z-index:12;", host);
    // a text target is measured by its text, not its box: a headline's block runs the whole column, past where its words end
    let b = ctx.box(anchor);
    if (!anchor.querySelector("img, svg, video, canvas, div")) {
      const r = doc.createRange(); r.selectNodeContents(anchor);
      const q = r.getBoundingClientRect(), st = ctx.stage.getBoundingClientRect(), z = st.width / (ctx.stage.offsetWidth || 1) || 1;
      if (q.width > 0) b = { x: (q.left - st.left) / z, y: (q.top - st.top) / z, w: q.width / z, h: q.height / z };
    }
    // the dot: just past the word's inline end, level with it (under the word it would land on the next line of text)
    const side0 = 30 * k, edge = f.m * 0.5;
    let dotX = rtl ? b.x - side0 : b.x + b.w + side0;
    if (dotX < edge + 12 * k || dotX > f.W - edge - 12 * k) dotX = rtl ? b.x + side0 : b.x + b.w - side0;
    const dotY = b.y + b.h * 0.5;
    const dr = 9 * s * 0.75;
    const ringD = dr * 2 * 2.2;
    const ring = mk("div", `position:absolute;left:${dotX.toFixed(1)}px;top:${dotY.toFixed(1)}px;width:${ringD.toFixed(1)}px;height:${ringD.toFixed(1)}px;margin:${(-ringD / 2).toFixed(1)}px 0 0 ${(-ringD / 2).toFixed(1)}px;border-radius:50%;background:var(--x-accent);`, layer);
    const dot = mk("div", `position:absolute;left:${dotX.toFixed(1)}px;top:${dotY.toFixed(1)}px;width:${(dr * 2).toFixed(1)}px;height:${(dr * 2).toFixed(1)}px;margin:${(-dr).toFixed(1)}px 0 0 ${(-dr).toFixed(1)}px;border-radius:50%;background:var(--x-accent);box-shadow:0 0 0 ${(2.5 * k).toFixed(1)}px var(--x-panel);`, layer);

    // the tooltip
    const tip = mk("div", `position:absolute;width:max-content;max-width:${Math.min(f.W * 0.8, 300 * s).toFixed(1)}px;box-sizing:border-box;padding:${(12 * s).toFixed(1)}px ${(14 * s).toFixed(1)}px;border-radius:${(8 * s).toFixed(1)}px;background:var(--x-accent);color:var(--x-accent-ink);font:var(--x-body-weight) ${(12 * s).toFixed(1)}px/1.4 var(--x-body-font);box-shadow:0 ${(10 * s).toFixed(1)}px ${(26 * s).toFixed(1)}px ${(-10 * s).toFixed(1)}px color-mix(in srgb, var(--x-accent) 60%, transparent);`, layer);
    tip.dir = rtl ? "rtl" : "ltr";
    const line = mk("div", "", tip);
    line.append(rtl ? "اضغط لتستكشف " : "Click to explore ");
    mk("b", "font-weight:700;", line, product);
    line.append(rtl ? "." : ".");
    const row = mk("div", `display:flex;align-items:center;gap:${(10 * s).toFixed(1)}px;margin-top:${(10 * s).toFixed(1)}px;`, tip);
    const step = right ? 2 : 1;
    mk("span", `opacity:.75;font-size:${(11 * s).toFixed(1)}px;font-variant-numeric:tabular-nums;${p.counter ? "" : "visibility:hidden;"}`, row, rtl ? `${step} من 4` : `${step} of 4`);
    mk("span", "flex:1;", row);
    const btnCss = `padding:${(4 * s).toFixed(1)}px ${(10 * s).toFixed(1)}px;border-radius:${(6 * s).toFixed(1)}px;font-weight:600;font-size:${(11 * s).toFixed(1)}px;`;
    if (right) mk("span", btnCss + `border:${(1 * k).toFixed(2)}px solid color-mix(in srgb, var(--x-accent-ink) 45%, transparent);`, row, rtl ? "السابق" : "Back");
    mk("span", btnCss + "background:var(--x-accent-ink);color:var(--x-accent);", row, rtl ? "التالي" : "Next");
    const nub = mk("div", `position:absolute;width:${(10 * s).toFixed(1)}px;height:${(10 * s).toFixed(1)}px;background:var(--x-accent);rotate:45deg;`, tip);
    // place it (measured once); keep it on the frame
    const tw = tip.offsetWidth, th = tip.offsetHeight, gap = 12 * s, nb = 10 * s;
    let tx, ty, ox, oy, rise = -1;
    if (!right) {
      const above = dotY + dr + gap + th > f.H - edge;
      tx = ML.clamp(dotX - (rtl ? tw - 28 * s : 28 * s), edge, f.W - edge - tw); ty = above ? dotY - dr - gap - th : Math.max(dotY + dr + gap, b.y + b.h + gap * 0.4); // never over the word it points at
      nub.style.left = `${ML.clamp(dotX - tx - nb / 2, 6 * s, tw - nb - 6 * s).toFixed(1)}px`; nub.style.top = `${(above ? th - nb / 2 : -nb / 2).toFixed(1)}px`;
      ox = dotX - tx; oy = above ? th + gap : dotY - ty; if (above) rise = 1;
    } else {
      let dir = rtl ? -1 : 1;
      if (dir > 0 && dotX + dr + gap + tw > f.W - edge) dir = -1; else if (dir < 0 && dotX - dr - gap - tw < edge) dir = 1;
      tx = ML.clamp(dir > 0 ? dotX + dr + gap : dotX - dr - gap - tw, edge, f.W - edge - tw); ty = ML.clamp(dotY - th / 2, edge, f.H - edge - th);
      nub.style.top = `${ML.clamp(dotY - ty - nb / 2, 6 * s, th - nb - 6 * s).toFixed(1)}px`; nub.style.left = `${(dir > 0 ? -nb / 2 : tw - nb / 2).toFixed(1)}px`;
      ox = dir > 0 ? -gap : tw + gap; oy = dotY - ty;
    }
    tip.style.left = `${tx.toFixed(1)}px`; tip.style.top = `${ty.toFixed(1)}px`;
    tip.style.transformOrigin = `${ox.toFixed(1)}px ${oy.toFixed(1)}px`;

    // the pointer
    const cs = 54 * k;
    const cur = sv("svg", { width: cs, height: cs, viewBox: "0 0 24 24", style: `position:absolute;left:0;top:0;overflow:visible;margin:${(-cs * 2 / 24).toFixed(1)}px 0 0 ${(-cs * 5 / 24).toFixed(1)}px;filter:drop-shadow(0 ${(3 * k).toFixed(1)}px ${(6 * k).toFixed(1)}px color-mix(in srgb, var(--x-device) 35%, transparent));` }, layer);
    sv("path", { d: "M5 2 L5 19 L9.5 15.5 L12.5 22 L15.5 20.5 L12.5 14 L18.5 14 Z", fill: "var(--x-pointer)", stroke: "var(--x-pointer-edge)", "stroke-width": 1.4, "stroke-linejoin": "round" }, cur);

    // timing: pulse from at, click on the product word when spoken, tooltip on the click frame
    const glide = 0.55, earliest = at + 0.35 + glide;
    let T = Math.max(earliest, ctx.word(product, earliest));
    T = Math.min(T, Math.max(at + 0.3, end - 0.6));
    const g0 = T - glide;
    ctx.sfx(T - 0.011, "click", 0.4); ctx.sfx(T + 0.03, "pop.soft", 0.35);
    const backOut = (x, c = 1.4) => { const y = x - 1; return 1 + (c + 1) * y * y * y + c * y * y; };
    const ringEnd = at + Math.ceil(T + 1 - at); // the ring stops at the end of a loop (faded out), never mid-pulse
    const start = { x: rtl ? dotX - 260 * k : dotX + 260 * k, y: dotY + 300 * k };

    return {
      draw(t) {
        const vis = t >= at;
        layer.style.visibility = vis ? "visible" : "hidden";
        if (!vis) { if (wrap) wrap.style.opacity = "0"; return; }
        // ring pulse: 1 s loop before the click, one last ring after
        const ph = ((t - at) % 1 + 1) % 1, pulsing = t < ringEnd;
        ring.style.scale = (1 / 2.2 + (1 - 1 / 2.2) * ML.out(ph, 0, 1)).toFixed(4);
        ring.style.opacity = pulsing ? (0.5 * (1 - ph)).toFixed(4) : "0";
        const press = t >= T && t < T + 0.16 ? 1 - 0.18 * Math.sin((Math.PI * (t - T)) / 0.16) : 1;
        dot.style.scale = (ML.out(t, at, at + 0.25) * press).toFixed(4);
        // tooltip
        const x = ML.lin(t, T, T + 0.25);
        tip.style.visibility = t < T ? "hidden" : "visible";
        tip.style.opacity = Math.min(1, x * 1.6).toFixed(4);
        tip.style.scale = (0.9 + 0.1 * backOut(x)).toFixed(4);
        tip.style.translate = `0 ${(rise * 6 * s * (1 - backOut(x))).toFixed(2)}px`;
        // pointer: arc to the dot, press, rest
        if (p.cursor) {
          const u = ML.ease(t, g0, T), dx = dotX - start.x, dy = dotY - start.y, len = Math.hypot(dx, dy) || 1, bulge = Math.sin(Math.PI * u) * Math.min(50 * k, 0.1 * len) * (rtl ? -1 : 1);
          const cx = start.x + dx * u - (dy / len) * bulge, cy = start.y + dy * u + (dx / len) * bulge;
          const sq = t >= T && t < T + 0.16 ? 1 - 0.12 * Math.sin((Math.PI * (t - T)) / 0.16) : 1;
          cur.style.translate = `${cx.toFixed(2)}px ${cy.toFixed(2)}px`;
          cur.style.scale = sq.toFixed(4);
          cur.style.opacity = (ML.lin(t, g0, g0 + 0.15) * (1 - ML.lin(t, T + 0.7, T + 0.95))).toFixed(4);
        } else cur.style.display = "none";
        const l = ML.clamp((t - (end - 0.25)) / 0.22);
        layer.style.opacity = (1 - l).toFixed(4);
        if (wrap) { const e = ML.out(t, at, at + 0.4); wrap.style.opacity = (e * (1 - l)).toFixed(4); }
      },
    };
  },
});

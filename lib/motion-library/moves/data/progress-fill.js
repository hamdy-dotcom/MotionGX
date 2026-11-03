// Progress fill: a thin bar fills from the reading-start side to its value (power3.out over `duration`) while its
// readout counts from the same driver, so the two always agree (tabular). Styles, after the MengTo demos:
//   slim      a full-round track (ink 10 %) with a soft tone gradient fill and a glare tip at the leading edge
//   inset     a recessed dark track (inset shadow) with a gradient fill lit by a 1 px top highlight
//   underline a 2 px line along a card's bottom edge (tone 20 %) that fills and glows (0 0 8 px tone 80 %)
//   hatched   a square track with a 1 px border, the fill 45° stripes (2 px on, 2 px off) with a 1 px leading border
//   hairline  a 1 px rule filled by a solid ink line
// Readout: a caption row (caps label at the start, value at the end) — a big two-digit serif percent padded "00" when
// one meter, a value ("12.4M"), or a three-decimal mono value. Several meters stagger 0.15 s, every other one darker.
// The glare tip pulses 1 → .5 over 2 s. Vertical meters fill from the bottom. Underline on a card target runs along
// that card's own bottom edge and leaves its content alone; every other case builds its own block.
// Source: MengTo/Skills web-design book-serif-index, globe-particles, editorial-tech, technical-wireframe-info-layout,
// scroll-scrubbed-visual-sequence demos (MIT) — the meter styles ported to look variables.
ML.define({
  id: "data.progress-fill",
  category: "data",
  name: "Progress bar fills to a value",
  does: "A thin bar fills to its value while its number counts in sync, styled as a glowing slim bar, a recessed track with a glare tip, a card underline or a striped meter.",
  says: ["growth", "proof", "result", "time", "precision"],
  energy: 2,
  targets: ["chart", "number", "card"],
  duration: [0.8, 3],
  params: {
    value: { type: "number", range: [0, 1], default: 0.84 },
    duration: { type: "number", range: [0.6, 1.5], default: 1, unit: "s" },
    style: { type: "choice", options: ["slim", "inset", "underline", "hatched", "hairline"], default: "slim" },
    thickness: { type: "number", range: [2, 12], default: 6, unit: "px" },
    tip_glow: { type: "bool", default: true },
    readout: { type: "choice", options: ["none", "percent", "value", "decimal"], default: "percent" },
    tone: { type: "choice", options: ["accent", "success", "warning"], default: "accent" },
    meters: { type: "number", range: [1, 4], default: 1 },
    orientation: { type: "choice", options: ["horizontal", "vertical"], default: "horizontal" },
    labels: { type: "text", default: "" },
    total: { type: "number", range: [1, 1000], default: 14.8 },
    unit: { type: "text", default: "M" },
  },
  pairs: ["data.odometer", "data.ringed-stat"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "MengTo/Skills:web-design/book-serif-index/demo/index.html", license: "MIT", note: "meter styles ported from the book-serif-index, globe-particles, editorial-tech, technical-wireframe and scroll-scrubbed demos" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, text, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const parent = ctx.scene || ctx.stage;
    const asBox = el && el !== ctx.stage && el.offsetHeight > 260 * k && el.offsetWidth > 360 * k;
    if (asBox && getComputedStyle(el).position === "static") el.style.position = "relative";
    const onCard = asBox && p.style === "underline";
    if (onCard) el.style.overflow = "hidden";
    const host = onCard ? null : asBox
      ? mk("div", "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:4;background:var(--x-ground);border-radius:inherit", null, el)
      : mk("div", "position:absolute;left:var(--pic-x);top:var(--pic-y);width:var(--pic-w);height:var(--pic-h);z-index:4;background:var(--x-ground);display:flex;align-items:center;justify-content:center", null, parent);
    const BW = asBox ? el.clientWidth : f.pic.w, BH = asBox ? el.clientHeight : f.pic.h;
    const n = onCard ? 1 : Math.round(ML.clamp(p.meters, 1, 4)), vert = !onCard && p.orientation === "vertical", st = p.style;
    const WARN = "color-mix(in oklch, var(--x-bad) 55%, var(--x-good))";
    const base = p.tone === "success" ? "var(--x-good)" : p.tone === "warning" ? WARN : "var(--x-accent)";
    const shares = [1, 0.72, 0.86, 0.58];
    const given = String(p.labels || "").split("|").map((s) => s.trim()).filter(Boolean);
    const names = rtl ? ["التقدّم", "المزامنة", "الفهرسة", "الذاكرة"] : ["Progress", "Sync", "Index", "Cache"];
    const startSide = rtl ? "right" : "left", endSide = rtl ? "left" : "right";
    const thick = Math.max(1, st === "hairline" ? 1.5 * k : st === "underline" ? Math.max(2, 2.4 * k) : p.thickness * k * (vert ? 2.6 : 1.6));
    const one = !onCard && n === 1 && !vert && p.readout !== "none" && p.readout !== "value";
    const label = `font:var(--x-label-weight) ${(30 * k).toFixed(1)}px var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:var(--x-label-case);color:var(--x-dim);white-space:nowrap`;
    const num = "direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums;white-space:nowrap";
    const wrap = onCard ? null : mk("div", vert
      ? `display:flex;gap:${(64 * k).toFixed(1)}px;align-items:flex-end;justify-content:center;height:${Math.min(BH * 0.78, 760 * k).toFixed(1)}px`
      : `display:flex;flex-direction:column;gap:${(st === "underline" ? 26 : 44) * k}px;width:${Math.min(BW * 0.86, 1100 * k).toFixed(1)}px`, null, host);
    const meters = Array.from({ length: n }, (_, i) => {
      const tone = i % 2 ? `color-mix(in srgb, ${base} 72%, var(--x-ink))` : base;
      const v = ML.clamp(p.value * shares[i]);
      const name = given[i] || names[i];
      // the block: a card for the underline style, a bare column / row otherwise
      const block = onCard ? mk("div", "position:absolute;inset:0;pointer-events:none;z-index:4", null, el) : mk("div", st === "underline"
        ? `position:relative;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:min(var(--x-radius), ${(20 * k).toFixed(1)}px);box-shadow:var(--x-shadow);padding:${(28 * k).toFixed(1)}px ${((vert ? 20 : 32) * k).toFixed(1)}px ${(34 * k).toFixed(1)}px;overflow:hidden;${vert ? "width:" + (280 * k).toFixed(1) + "px;height:100%;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between" : ""}`
        : vert ? "display:flex;flex-direction:column;align-items:center;gap:" + (18 * k).toFixed(1) + "px;height:100%" : "display:flex;flex-direction:column", null, wrap);
      let big = null, small = null;
      if (one) {
        big = mk("div", p.readout === "decimal" ? `font:500 ${(72 * k).toFixed(1)}px/1 var(--x-mono-font);color:var(--x-ink);${num}` : `font:400 ${(150 * k).toFixed(1)}px/0.9 var(--x-serif-font);letter-spacing:-0.04em;color:var(--x-ink);${num}`, "00", block);
        big.style.alignSelf = "flex-start";
        mk("div", label + `;margin:${(14 * k).toFixed(1)}px 0 ${(22 * k).toFixed(1)}px`, name, block);
      } else {
        const cap = mk("div", vert ? `display:flex;flex-direction:column;align-items:center;gap:${(6 * k).toFixed(1)}px` : `display:flex;justify-content:space-between;align-items:baseline;margin-bottom:${(16 * k).toFixed(1)}px;gap:${(20 * k).toFixed(1)}px`, null, block);
        if (onCard) { cap.style.cssText = `position:absolute;inset-inline-end:${(28 * k).toFixed(1)}px;bottom:${(thick + 14 * k).toFixed(1)}px`; } // only the value: the card keeps its own words
        else if (!vert || st === "underline") mk("span", label, name, cap);
        small = p.readout === "none" ? null : mk("span", `font:600 ${(38 * k).toFixed(1)}px var(--x-mono-font);color:var(--x-ink);${num}`, "", cap);
        if (vert && st !== "underline") mk("span", label + `;order:2`, name, block);
      }
      // the track
      const lane = mk("div", vert
        ? `position:relative;flex:1;width:${thick.toFixed(1)}px`
        : `position:relative;height:${thick.toFixed(1)}px;width:100%`, null, block);
      if (vert && st !== "underline") lane.style.order = "1";
      let track;
      if (st === "underline") {
        // along the card's bottom edge
        lane.style.cssText = vert ? `position:absolute;${startSide}:0;top:0;bottom:0;width:${thick.toFixed(1)}px` : `position:absolute;left:0;right:0;bottom:0;height:${thick.toFixed(1)}px`;
        track = mk("div", `position:absolute;inset:0;background:color-mix(in srgb, ${tone} 20%, transparent)`, null, lane);
      } else {
        const css = {
          slim: `background:color-mix(in srgb, var(--x-ink) 10%, transparent);border-radius:999px`,
          inset: `background:color-mix(in srgb, var(--x-ink) 88%, var(--x-ground));border-radius:999px;box-shadow:inset 0 ${(1.5 * k).toFixed(1)}px ${(4 * k).toFixed(1)}px color-mix(in srgb, var(--x-ink) 80%, transparent), 0 1px 0 color-mix(in srgb, var(--x-panel) 6%, transparent)`,
          hatched: `background:color-mix(in srgb, var(--x-ink) 6%, var(--x-ground));border:1px solid var(--x-line);border-radius:0`,
          hairline: `background:var(--x-line);border-radius:0`,
        }[st];
        track = mk("div", `position:absolute;inset:0;overflow:hidden;${css}`, null, lane);
      }
      const dirTo = vert ? "to top" : `to ${endSide}`;
      const fillCss = {
        slim: `background:linear-gradient(${dirTo}, color-mix(in srgb, ${tone} 45%, transparent), ${tone});border-radius:999px`,
        inset: `background:linear-gradient(${dirTo}, color-mix(in srgb, ${tone} 60%, var(--x-ink)), ${tone});border-radius:999px;box-shadow:inset 0 1px 0 color-mix(in srgb, var(--x-accent-ink) 30%, transparent)`,
        underline: `background:${tone};box-shadow:0 0 ${(8 * k).toFixed(1)}px color-mix(in srgb, ${tone} 80%, transparent)`,
        hatched: `background:repeating-linear-gradient(45deg, ${tone} 0 ${(2 * k).toFixed(1)}px, transparent ${(2 * k).toFixed(1)}px ${(4 * k).toFixed(1)}px);${vert ? "border-top" : "border-" + endSide}:1px solid ${tone}`,
        hairline: `background:var(--x-ink)`,
      }[st];
      const fill = mk("div", vert ? `position:absolute;left:0;right:0;bottom:0;height:0;${fillCss}` : `position:absolute;top:0;bottom:0;${startSide}:0;width:0;${fillCss}`, null, st === "underline" ? lane : track);
      // the glare at the leading edge (outside the track's clip)
      const tipOn = p.tip_glow && (st === "slim" || st === "inset" || st === "hatched");
      const tw = 14 * k, tho = Math.max(thick * 1.8, 8 * k);
      const tip = tipOn ? mk("div", vert
        ? `position:absolute;left:50%;bottom:0;width:${tho.toFixed(1)}px;height:${tw.toFixed(1)}px;margin:0 0 ${(-tw / 2).toFixed(1)}px ${(-tho / 2).toFixed(1)}px;border-radius:50%;background:color-mix(in srgb, var(--x-accent-ink) 55%, transparent);filter:blur(2px)`
        : `position:absolute;top:50%;${startSide}:0;width:${tw.toFixed(1)}px;height:${tho.toFixed(1)}px;margin-top:${(-tho / 2).toFixed(1)}px;margin-${startSide}:${(-tw / 2).toFixed(1)}px;border-radius:50%;background:color-mix(in srgb, var(--x-accent-ink) 55%, transparent);filter:blur(2px)`, null, lane) : null;
      const t0 = at + 0.25 + i * 0.15, dur = Math.max(0.3, Math.min(p.duration, end - 0.25 - t0)); // a short slot still lands
      return { block, fill, tip, big, small, v, t0, dur };
    });
    const read = (x) => (p.readout === "percent" ? `${String(Math.round(x * 100)).padStart(2, "0")}%` : p.readout === "decimal" ? x.toFixed(3) : p.readout === "value" ? `${(x * p.total).toFixed(1)}${p.unit}` : "");
    ctx.sfx(meters[0].t0, "tap", 0.25);
    ctx.sfx(meters[n - 1].t0 + meters[n - 1].dur * 0.85, "blip", 0.3);
    return {
      draw(t) {
        if (host) ML.show(host, t, at, end - 0.22);
        const gone = host ? 1 : 1 - ML.lin(t, end - 0.22, end);
        meters.forEach((m, i) => {
          const o = ML.out(t, at + i * 0.15, at + 0.3 + i * 0.15);
          m.block.style.opacity = (o * gone).toFixed(4);
          const x = ML.lin(t, m.t0, m.t0 + m.dur), u = 1 - Math.pow(1 - x, 4), val = m.v * u; // power3.out
          if (vert) m.fill.style.height = (val * 100).toFixed(3) + "%"; else m.fill.style.width = (val * 100).toFixed(3) + "%";
          if (m.tip) {
            m.tip.style[vert ? "bottom" : startSide] = (val * 100).toFixed(3) + "%";
            m.tip.style.opacity = val > 0.01 ? (0.75 + 0.25 * Math.cos(Math.PI * Math.max(0, t - m.t0))).toFixed(4) : "0";
          }
          if (m.big) m.big.textContent = read(val);
          if (m.small) m.small.textContent = read(val);
        });
      },
    };
  },
});

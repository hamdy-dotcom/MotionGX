// Measurement scale: a small ruler with labelled ticks fades in beside an object to show amounts (2oz / 4oz …),
// optionally with a fill level rising inside the object up to one tick. A 1 px hairline (scaled to the stage) grows
// from the base, then its ticks (6 px long, 8 px labels on a 360 px reference) fade in base-to-top, 0.08 s apart, 0.3 s
// each; the fill rises on power2.out over 0.8 s. Vertical sits at the object's reading-end edge (right in English, left
// in Arabic); horizontal sits under it and counts in the reading direction.
// Source: prompt-motion "sarut0bisasuke-opus-5-5-is-cracked" (reference only: rebuilt as our own code).
ML.define({
  id: "data.measure-scale-ticks",
  category: "data",
  name: "Measurement scale beside an object",
  does: "A small ruler with labelled ticks fades in beside an object to show amounts, optionally with a fill level rising to a tick.",
  says: ["precision", "step"],
  energy: 2,
  targets: ["image", "number"],
  duration: [0.8, 3],
  params: {
    orientation: { type: "choice", options: ["vertical", "horizontal"], default: "vertical" },
    ticks: { type: "number", range: [3, 8], default: 5 },
    fill_level: { type: "bool", default: false },
    fill_to: { type: "number", range: [0.2, 1], default: 0.6 },
    step: { type: "number", range: [0.5, 1000], default: 2 },
    unit: { type: "text", default: "oz" },
  },
  pairs: ["data.odometer"],
  avoid: ["energy", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:sarut0bisasuke-opus-5-5-is-cracked", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    if (!el) return null;
    const NS = "http://www.w3.org/2000/svg";
    const svgEl = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const b = ctx.box(el), sb = ctx.box(host);
    const ox = b.x - sb.x, oy = b.y - sb.y;
    const k = Math.min(f.W, f.H) / 360; // the technique's px are on a 360 px-wide reference
    const n = Math.round(ML.clamp(p.ticks, 3, 8));
    const vert = p.orientation !== "horizontal";
    const tickLen = 6 * k, fs = 8 * k, gap = 5 * k, lw = Math.max(1, k * 0.6);
    const fmt = (v) => `${+v.toFixed(2)}${p.unit || ""}`;
    // the ruler's own box: beside the object at its reading-end edge (flipped when that edge has no room), or under it
    const labW = fs * 0.62 * Math.max(...Array.from({ length: n }, (_, i) => fmt((i + 1) * p.step).length)) + 2;
    let side = rtl ? -1 : 1;
    if (vert) {
      if (side > 0 && b.x + b.w + gap + tickLen + labW + 8 > f.W) side = -1;
      else if (side < 0 && b.x - gap - tickLen - labW - 8 < 0) side = 1;
    }
    const W = vert ? tickLen + gap + labW + 4 : b.w, H = vert ? b.h : tickLen + gap + fs * 1.4;
    let left = vert ? (side > 0 ? ox + b.w + gap : ox - gap - W) : ox;
    let top = vert ? oy : oy + b.h + gap;
    if (!vert && b.y + b.h + gap + H > f.H) top = oy - gap - H;
    const svg = svgEl("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
    svg.style.cssText = `position:absolute;left:${left.toFixed(1)}px;top:${top.toFixed(1)}px;overflow:visible;pointer-events:none;z-index:6`;
    host.append(svg);
    // hairline: on the side touching the object; it grows from the base (or from the reading start when horizontal)
    const lx = vert ? (side > 0 ? 0 : W) : 0;
    const line = vert ? svgEl("line", { x1: lx, y1: H, x2: lx, y2: 0 }, svg) : svgEl("line", { x1: 0, y1: 0, x2: W, y2: 0 }, svg);
    line.setAttribute("style", `stroke:var(--x-ink);stroke-width:${lw}px;stroke-linecap:round`);
    const len = vert ? H : W;
    line.style.strokeDasharray = `${len} ${len}`;
    const ticks = [];
    for (let i = 0; i < n; i++) {
      const u = (i + 1) / n; // the first tick sits one step up from the base, the last at the top / far end
      const g = svgEl("g", {}, svg);
      let tl, tx;
      if (vert) {
        const y = H - u * H + (i === n - 1 ? lw / 2 : 0);
        tl = svgEl("line", { x1: lx, y1: y, x2: lx + side * tickLen, y2: y }, g);
        tx = svgEl("text", { x: lx + side * (tickLen + gap * 0.6), y: y + fs * 0.35, "text-anchor": side > 0 ? "start" : "end" }, g);
      } else {
        const x = rtl ? W - u * W : u * W;
        tl = svgEl("line", { x1: x, y1: 0, x2: x, y2: tickLen }, g);
        tx = svgEl("text", { x, y: tickLen + gap + fs * 0.8, "text-anchor": "middle" }, g);
      }
      tl.setAttribute("style", `stroke:var(--x-ink);stroke-width:${lw}px`);
      tx.setAttribute("style", `fill:var(--x-dim);font:var(--x-label-weight) ${fs.toFixed(1)}px var(--x-mono-font);direction:ltr;unicode-bidi:isolate`);
      tx.textContent = fmt((i + 1) * p.step);
      ticks.push(g);
    }
    // the fill level: a translucent accent band rising inside the object to a tick, its top edge a hairline
    let fill = null, fillTop = null;
    if (p.fill_level) {
      fill = document.createElement("div");
      fill.style.cssText = `position:absolute;left:${ox.toFixed(1)}px;top:${oy.toFixed(1)}px;width:${b.w.toFixed(1)}px;height:${b.h.toFixed(1)}px;pointer-events:none;z-index:5;overflow:hidden;border-radius:${getComputedStyle(el).borderRadius}`;
      fillTop = document.createElement("div");
      fillTop.style.cssText = `position:absolute;left:0;right:0;bottom:0;background:color-mix(in srgb, var(--x-accent) 28%, transparent);border-top:${lw}px solid var(--x-accent)`;
      fill.append(fillTop);
      host.append(fill);
    }
    const level = Math.round(ML.clamp(p.fill_to) * n) / n || 1 / n;
    const T = { line: at, tick0: at + 0.18, fill: at + 0.18 + n * 0.08 + 0.1 };
    ctx.sfx(at, "tap", 0.25);
    if (fill) ctx.sfx(T.fill, "tap", 0.2);
    const pow2out = (t, a, d) => 1 - Math.pow(1 - ML.lin(t, a, a + d), 3);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        const vis = t >= at - 1e-6 ? 1 - leave : 0;
        svg.style.opacity = vis.toFixed(4);
        line.style.strokeDashoffset = (len * (1 - pow2out(t, T.line, 0.3))).toFixed(2);
        ticks.forEach((g, i) => {
          const u = ML.ease(t, T.tick0 + i * 0.08, T.tick0 + i * 0.08 + 0.3);
          g.style.opacity = u.toFixed(4);
          g.setAttribute("transform", vert ? `translate(0 ${((1 - u) * fs * 0.4).toFixed(2)})` : `translate(${((1 - u) * fs * 0.4 * (rtl ? 1 : -1)).toFixed(2)} 0)`);
        });
        if (fill) {
          const u = pow2out(t, T.fill, 0.8);
          fill.style.opacity = vis.toFixed(4);
          if (vert) { fillTop.style.height = (b.h * level * u).toFixed(2) + "px"; fillTop.style.width = ""; }
          else {
            fillTop.style.top = "0"; fillTop.style.borderTop = "none";
            fillTop.style.width = (b.w * level * u).toFixed(2) + "px";
            fillTop.style[rtl ? "left" : "right"] = "auto";
            fillTop.style[rtl ? "borderLeft" : "borderRight"] = `${lw}px solid var(--x-accent)`;
          }
        }
      },
    };
  },
});

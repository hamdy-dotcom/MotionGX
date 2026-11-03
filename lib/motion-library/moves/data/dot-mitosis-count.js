// Dot mitosis: one dot divides into two, four, eight… Each split step every interval I (~0.35–0.55 s): every dot
// spawns a twin from its centre, the pair separates along the line between their next places (back.out over 0.5 I),
// then the whole group re-lays itself out (power3.out over the last 0.7 I) — on a ring whose radius grows with the
// count (0 → full), on a grid, or as a phyllotaxis cluster. A small mono caps counter in the reading-end top corner
// reads the new count with a bump on each split; optional faint rings expand behind each split (0.6 s fade). After the
// last split the ring / cluster turns slowly (+30°/s). A non-numeric way to show growth or incoming items.
// Every position is closed form in t (level k = splits passed; a child's start is its parent's settled place).
// Source: prompt-motion "leadnotifi-opus-5-5-i-made" (reference only: rebuilt as our own code).
ML.define({
  id: "data.dot-mitosis-count",
  category: "data",
  name: "Dot splits and multiplies",
  does: "One dot divides into two, four, then eight that arrange on a ring while a small counter reads the new count.",
  says: ["growth", "scale", "energy"],
  energy: 3,
  targets: ["shape", "number"],
  duration: [1.6, 3],
  params: {
    steps: { type: "number", range: [2, 4], default: 3 },
    layout: { type: "choice", options: ["ring", "grid", "cluster"], default: "ring" },
    counter: { type: "bool", default: true },
    echo_rings: { type: "bool", default: false },
    label: { type: "text", default: "" },
  },
  pairs: ["data.odometer", "data.event-tally"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "prompt-motion:leadnotifi-opus-5-5-i-made", license: "reference", note: "our own rebuild: closed-form split / re-layout per step" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v); if (parent) parent.append(e); return e; };
    const host = ctx.scene || stage;
    const u = Math.min(f.W, f.H) / 1080;
    const steps = Math.round(ML.clamp(p.steps, 2, 4)), N = 1 << steps;
    const isNum = !!(el && /\d/.test(el.textContent || "") && el.childElementCount === 0);

    // where the dots live: the target's own box when it has room, else the picture region
    let R = el && !isNum ? ctx.box(el) : null;
    if (!R || R.w < 300 * u || R.h < 300 * u) R = f.pic;
    const cx = R.x + R.w / 2, cy = R.y + R.h / 2;
    const rd = (steps === 4 ? 17 : 22) * u;
    const Rmax = Math.min(R.w, R.h, 900 * u) * 0.36;

    // the settled place of dot j at level k (2^k dots), relative to the centre
    const layout = (k) => {
      const n = 1 << k, out = [];
      for (let j = 0; j < n; j++) {
        if (n === 1) { out.push([0, 0]); continue; }
        if (p.layout === "grid") {
          const cols = 1 << Math.ceil(k / 2), rows = 1 << Math.floor(k / 2), g = rd * 4.2;
          out.push([((j % cols) - (cols - 1) / 2) * g, (Math.floor(j / cols) - (rows - 1) / 2) * g]);
        } else if (p.layout === "cluster") {
          const a = j * 2.39996323, r = rd * 2.5 * Math.sqrt(j + 0.5);
          out.push([Math.cos(a) * r, Math.sin(a) * r]);
        } else {
          const r = Rmax * (0.35 + 0.65 * (k / steps)), a = -Math.PI / 2 + (2 * Math.PI * (j + 0.5)) / n;
          out.push([Math.cos(a) * r, Math.sin(a) * r]);
        }
      }
      return out;
    };
    const L = Array.from({ length: steps + 1 }, (_, k) => layout(k));

    // timing: the splits fill the run, one interval each
    const t0 = at + 0.3;
    const I = ML.clamp((end - 0.5 - t0) / (steps + 0.6), 0.2, 0.55); // a short run splits faster: the last split always shows
    const T = Array.from({ length: steps + 1 }, (_, k) => t0 + (k - 1) * I); // T[k]: split into level k (k ≥ 1)
    const tDone = T[steps] + I;
    const backOut = (x, c = 1.7) => { const y = ML.clamp(x) - 1; return 1 + (c + 1) * y * y * y + c * y * y; };
    const p3 = (x) => 1 - Math.pow(1 - ML.clamp(x), 3);

    // the drawing
    const svg = sv("svg", { width: R.w, height: R.h, viewBox: `${-R.w / 2} ${-R.h / 2} ${R.w} ${R.h}` });
    svg.style.cssText = `position:absolute;left:${R.x}px;top:${R.y}px;overflow:visible;pointer-events:none;z-index:20;will-change:transform`;
    host.append(svg);
    const rot = sv("g", {}, svg);
    const echoes = [];
    if (p.echo_rings) for (let k = 1; k <= steps; k++) for (let q = 0; q < 1 << (k - 1); q++) {
      const c = sv("circle", { r: rd, fill: "none" }, rot);
      c.style.stroke = "var(--x-accent-2)"; c.style.strokeWidth = String(2 * u);
      echoes.push({ k, q, c });
    }
    const dots = Array.from({ length: N }, () => { const c = sv("circle", { r: rd }, rot); c.style.fill = "var(--x-accent)"; return c; });

    // the counter: mono caps in the reading-end top corner (and the number slot itself, when that is the target)
    let counter = null, cVal = null;
    if (p.counter) {
      const lab = p.label || (rtl ? "عملاء جدد" : "NEW LEADS");
      counter = mk("div", `position:absolute;top:${R.y + 12 * u}px;display:flex;gap:${10 * u}px;align-items:baseline;font:var(--x-label-weight) ${(f.tall ? 32 : 24) * u}px/1 var(--x-mono-font);letter-spacing:var(--x-label-track);text-transform:var(--x-label-case);color:var(--x-dim);white-space:nowrap;z-index:21;pointer-events:none`, host);
      if (rtl) { counter.style.left = `${R.x + 12 * u}px`; counter.style.right = "auto"; counter.style.letterSpacing = "0"; }
      else counter.style.right = `${f.W - (R.x + R.w) + 12 * u}px`;
      mk("span", "", counter, lab);
      cVal = mk("span", "display:inline-block;color:var(--x-accent);direction:ltr;font-variant-numeric:tabular-nums", counter, "+1");
    }
    const ownText = isNum ? el.textContent : "";
    for (let k = 1; k <= steps; k++) ctx.sfx(T[k], "pop", 0.32);

    const levelAt = (t) => { let k = 0; for (let q = 1; q <= steps; q++) if (t >= T[q]) k = q; return k; };
    const posAt = (k, j, t) => {
      if (k === 0) return L[0][0];
      const P = L[k - 1][j >> 1], Q = L[k][j], tw = L[k][j ^ 1];
      let dx = Q[0] - tw[0], dy = Q[1] - tw[1];
      const len = Math.hypot(dx, dy) || 1;
      const sep = Math.min(150 * u, len * 0.6) / 2;
      dx /= len; dy /= len;
      const a = backOut((t - T[k]) / (0.5 * I)), e = p3((t - T[k] - 0.3 * I) / (0.7 * I));
      const sx = P[0] + dx * sep * a, sy = P[1] + dy * sep * a;
      return [sx + (Q[0] - sx) * e, sy + (Q[1] - sy) * e];
    };

    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        const enter = backOut((t - at) / 0.35, 2.2);
        svg.style.opacity = (ML.clamp((t - at) / 0.12) * (1 - leave)).toFixed(4);
        const k = levelAt(t), n = 1 << k;
        const spin = p.layout === "grid" ? 0 : Math.max(0, t - tDone) * 30;
        rot.setAttribute("transform", `rotate(${(rtl ? -spin : spin).toFixed(3)})`);
        dots.forEach((c, j) => {
          if (j >= n) { c.setAttribute("visibility", "hidden"); c.setAttribute("cx", "0"); c.setAttribute("cy", "0"); c.setAttribute("r", "0"); return; }
          c.setAttribute("visibility", "visible");
          const [x, y] = posAt(k, j, t);
          const born = k > 0 && j % 2 === 1 ? ML.clamp((t - T[k]) / 0.12) : 1;
          c.setAttribute("cx", x.toFixed(2)); c.setAttribute("cy", y.toFixed(2));
          c.setAttribute("r", (rd * (k === 0 ? Math.max(0, enter) : born)).toFixed(2));
        });
        for (const e of echoes) {
          const age = t - T[e.k];
          if (age < 0 || age > 0.6) { e.c.setAttribute("visibility", "hidden"); e.c.setAttribute("cx", "0"); e.c.setAttribute("cy", "0"); e.c.setAttribute("r", "0"); e.c.style.opacity = "0"; continue; }
          const P = L[e.k - 1][e.q], g = 1 - Math.pow(1 - age / 0.6, 2);
          e.c.setAttribute("visibility", "visible");
          e.c.setAttribute("cx", P[0].toFixed(2)); e.c.setAttribute("cy", P[1].toFixed(2));
          e.c.setAttribute("r", (rd + 60 * u * g).toFixed(2));
          e.c.style.opacity = (0.55 * (1 - age / 0.6)).toFixed(3);
        }
        const count = n;
        const bump = k > 0 ? 1 + 0.25 * ML.pulse(t, T[k] + 0.04, 0.03, 0.12) : 1;
        if (counter) {
          counter.style.opacity = (ML.clamp((t - at) / 0.25) * (1 - leave)).toFixed(4);
          cVal.textContent = "+" + count;
          cVal.style.scale = bump.toFixed(4);
        }
        if (isNum) {
          el.textContent = t < at ? ownText : String(count);
          el.style.display = "inline-block";
          el.style.scale = bump === 1 ? "none" : (1 + (bump - 1) * 0.4).toFixed(4);
        }
      },
    };
  },
});

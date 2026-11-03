// Cut-out image swap rhythm: ink line-art cut-outs replace one another in place on a steady beat — each one in with
// scale 0.96 → 1 and opacity 0 → 1 over 0.2 s, out on a hard cut — while one small accent dot holds still through
// every swap as the continuity anchor. The cut-outs are our own drawings generated in setup (never third-party
// engravings): wireframe solids (cube, tetra-, octa-, icosahedron, cuboctahedron on a stand), six-fold flakes and
// rosettes, in the look's ink. Single, a pair (the two halves swap on alternate beats) or a grid (one cell per beat,
// the change walking round the grid, reading order following RTL); optional measurement lines; with the picture
// target, the last beat cuts to the picture itself. Several picture targets swap as the cut-outs themselves.
// Source: prompt-motion lexnlin-claude-opus-5-5-made (reference only — our own code and drawings).
ML.define({
  id: "photo.cut-out-swap-rhythm",
  category: "photo",
  name: "Cut-out image swap rhythm",
  does: "Line-art cut-outs (wireframe solids, flakes, rosettes) replace one another in place on a steady rhythm while a small accent dot holds continuity.",
  says: ["story", "time", "luxury", "list"],
  energy: 3,
  targets: ["image"],
  duration: [1.5, 5],
  params: {
    pace: { type: "number", range: [0.3, 0.8], default: 0.5, unit: "s" },
    layout: { type: "choice", options: ["single", "pair", "grid"], default: "single" },
    anchor_dot: { type: "bool", default: true },
    measure_lines: { type: "bool", default: false },
    set: { type: "choice", options: ["mixed", "solids", "flakes", "rosettes"], default: "mixed" },
    end_on_image: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "photo.colorize"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:lexnlin-claude-opus-5-5-made", license: "reference", note: "our own generated line art; no third-party images" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const host = el.offsetParent || el.parentElement;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    const W = el.offsetWidth, H = el.offsetHeight;
    if (!W || !H) return null;
    const L = el.offsetLeft, T = el.offsetTop;
    // ── the drawings (viewBox 0 0 100 100, centred on 50,50 so the anchor dot sits at every drawing's heart) ──
    const R = ML.rnd, f1 = (x) => x.toFixed(2);
    const PHI = (1 + Math.sqrt(5)) / 2;
    const perms = (a) => { const o = []; for (const s0 of [-1, 1]) for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) { const v = [a[0] * s0, a[1] * s1, a[2] * s2]; o.push(v, [v[1], v[2], v[0]], [v[2], v[0], v[1]]); } return o; };
    const uniq = (vs) => vs.filter((v, i) => vs.findIndex((w) => Math.hypot(v[0] - w[0], v[1] - w[1], v[2] - w[2]) < 1e-6) === i);
    const SOLIDS = [
      uniq(perms([1, 1, 1])), // cube
      [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]], // tetrahedron
      uniq(perms([1, 0, 0])), // octahedron
      uniq(perms([0, 1, PHI])), // icosahedron
      uniq(perms([1, 1, 0])), // cuboctahedron
    ];
    function solid(seed) {
      const vs = SOLIDS[Math.floor(R(seed, 1) * SOLIDS.length)];
      let mn = Infinity; for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) mn = Math.min(mn, Math.hypot(vs[i][0] - vs[j][0], vs[i][1] - vs[j][1], vs[i][2] - vs[j][2]));
      const ax = 0.35 + R(seed, 2) * 0.6, ay = R(seed, 3) * Math.PI;
      const rad = Math.max(...vs.map((v) => Math.hypot(...v)));
      const pr = vs.map(([x, y, z]) => { const x1 = x * Math.cos(ay) + z * Math.sin(ay), z1 = -x * Math.sin(ay) + z * Math.cos(ay), y1 = y * Math.cos(ax) - z1 * Math.sin(ax), z2 = y * Math.sin(ax) + z1 * Math.cos(ax); return [50 + (x1 / rad) * 26, 44 + (y1 / rad) * 26, z2]; });
      let d = "", back = "";
      for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) {
        if (Math.abs(Math.hypot(vs[i][0] - vs[j][0], vs[i][1] - vs[j][1], vs[i][2] - vs[j][2]) - mn) > 1e-3) continue;
        const seg = `M${f1(pr[i][0])} ${f1(pr[i][1])}L${f1(pr[j][0])} ${f1(pr[j][1])}`;
        if (pr[i][2] + pr[j][2] < -0.2) back += seg; else d += seg;
      }
      // the stand: a stem and a stepped foot, like a cabinet model
      const stand = `M50 71V82M43 82H57M40 86H60M46 78H54`;
      return `<path d="${back}" stroke-dasharray="1.6 1.6" opacity=".55"/><path d="${d}"/><path d="${stand}"/>`;
    }
    function flake(seed) {
      const arm = 38, br = 2 + Math.floor(R(seed, 4) * 3);
      let one = `M0 0V${-arm}`;
      for (let b = 0; b < br; b++) { const y = -arm * (0.3 + 0.6 * (b / br) + 0.08 * R(seed, 10 + b)), len = arm * (0.38 - 0.25 * (b / br)) * (0.7 + 0.5 * R(seed, 20 + b)); one += `M0 ${f1(y)}l${f1(len * 0.866)} ${f1(-len * 0.5)}M0 ${f1(y)}l${f1(-len * 0.866)} ${f1(-len * 0.5)}`; }
      if (R(seed, 5) > 0.4) one += `M-3 ${-arm + 4}L0 ${-arm}L3 ${-arm + 4}`;
      let s = "";
      for (let k = 0; k < 6; k++) s += `<path transform="translate(50 50) rotate(${k * 60})" d="${one}"/>`;
      const hx = 6 + R(seed, 6) * 6;
      s += `<path transform="translate(50 50)" d="${Array.from({ length: 6 }, (_, k) => `${k ? "L" : "M"}${f1(hx * Math.cos((k * Math.PI) / 3 + Math.PI / 6))} ${f1(hx * Math.sin((k * Math.PI) / 3 + Math.PI / 6))}`).join("")}Z"/>`;
      return s;
    }
    function rosette(seed) {
      const n = 6 + 2 * Math.floor(R(seed, 7) * 5), r1 = 12 + R(seed, 8) * 8, r2 = 30 + R(seed, 9) * 8;
      let s = `<circle cx="50" cy="50" r="${f1(r2 + 4)}"/><circle cx="50" cy="50" r="${f1(r1 * 0.55)}"/>`;
      for (let k = 0; k < n; k++) { const a = (k * 360) / n; s += `<ellipse transform="translate(50 50) rotate(${f1(a)})" cx="0" cy="${f1(-(r1 + r2) / 2)}" rx="${f1(Math.PI * r1 / n * 0.9)}" ry="${f1((r2 - r1) / 2)}"/>`; }
      for (let k = 0; k < n * 2; k++) { const a = (k * Math.PI) / n; s += `<path d="M${f1(50 + Math.cos(a) * (r2 + 4))} ${f1(50 + Math.sin(a) * (r2 + 4))}L${f1(50 + Math.cos(a) * (r2 + 8))} ${f1(50 + Math.sin(a) * (r2 + 8))}"/>`; }
      return s;
    }
    const kinds = p.set === "solids" ? [solid] : p.set === "flakes" ? [flake] : p.set === "rosettes" ? [rosette] : [solid, flake, rosette];
    const measure = (seed) => {
      const v = (12 + R(seed, 30) * 80).toFixed(1);
      return `<g stroke="var(--x-dim)" stroke-width=".5"><path d="M18 92H82M18 89.5V94.5M82 89.5V94.5M92 18V82M89.5 18H94.5M89.5 82H94.5"/></g><text x="50" y="98.6" text-anchor="middle" font-size="4" fill="var(--x-dim)" stroke="none" font-family="var(--x-mono-font)">${v}</text>`;
    };
    const pictures = ctx.els.filter((e) => e.tagName === "IMG");
    // several pictures swap as the cut-outs, in the first one's box: the others leave their own places
    if (pictures.length > 1) pictures.forEach((e) => { if (e !== el) e.style.visibility = "hidden"; });
    // ── the layer over the picture, its cells ──
    const layer = document.createElement("div");
    layer.style.cssText = `position:absolute;left:${L}px;top:${T}px;width:${W}px;height:${H}px;border-radius:${getComputedStyle(el).borderRadius};overflow:hidden;background:var(--x-panel);pointer-events:none;display:grid`;
    let cols = 1, rows = 1;
    if (p.layout === "pair") { if (W >= H) cols = 2; else rows = 2; }
    if (p.layout === "grid") { const r = W / H; cols = r > 2.2 ? 4 : r > 1.2 ? 3 : 2; rows = r > 2.2 ? 1 : 2; if (r < 0.7) { cols = 2; rows = 3; } }
    layer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`; layer.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    layer.style.direction = ctx.rtl ? "rtl" : "ltr";
    const nCells = cols * rows;
    const cells = Array.from({ length: nCells }, () => { const c = document.createElement("div"); c.style.cssText = "position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden"; layer.append(c); return c; });
    el.after(layer);
    // ── the beats: cell (j mod cells) takes cut-out j ──
    const beats = [];
    // when the picture ends it, its beat leaves it time to be seen before the cut (else it would only flash)
    const hold = p.end_on_image && el.tagName === "IMG" ? Math.min(1, Math.max(0.15, (end - at) * 0.25)) : 0.15;
    for (let j = 0; at + j * p.pace < end - hold && j < 64; j++) beats.push(at + j * p.pace);
    const lastIsPicture = p.end_on_image && el.tagName === "IMG" && beats.length > nCells;
    const cw = W / cols, chh = H / rows, side = Math.min(cw, chh) * 0.88;
    const shown = beats.map((b, j) => {
      const cell = cells[j % nCells];
      const node = document.createElement("div");
      node.style.cssText = `position:absolute;left:${(cw - side) / 2}px;top:${(chh - side) / 2}px;width:${side}px;height:${side}px;visibility:hidden`;
      if (pictures.length > 1) {
        const im = pictures[j % pictures.length].cloneNode(false); im.removeAttribute("data-slot");
        im.style.cssText = `width:100%;height:100%;object-fit:contain;filter:grayscale(1) contrast(1.2)`; node.append(im);
      } else {
        const draw = kinds[j % kinds.length];
        node.innerHTML = `<svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" stroke="var(--x-ink)" stroke-width="${f1(Math.max(0.6, 110 / side))}" stroke-linecap="round" stroke-linejoin="round">${draw(j * 7 + 3)}${p.measure_lines ? measure(j) : ""}</svg>`;
      }
      cell.append(node);
      return { node, cell: j % nCells, b };
    });
    // the anchor: one accent dot, centred in the first cell, through every swap
    const dot = document.createElement("div"), dr = Math.max(5, side * 0.022);
    const c0x = ctx.rtl ? W - cw / 2 : cw / 2, c0y = chh / 2;
    dot.style.cssText = `position:absolute;left:${L + c0x - dr}px;top:${T + c0y - dr}px;width:${dr * 2}px;height:${dr * 2}px;border-radius:50%;background:var(--x-accent);pointer-events:none;z-index:1`;
    if (p.anchor_dot) layer.after(dot);
    const lastB = lastIsPicture ? beats[beats.length - 1] : Infinity;
    beats.forEach((b, j) => ctx.sfx(b, "tap", j === beats.length - 1 ? 0.3 : 0.18));
    return {
      draw(t) {
        const on = t >= at && t < lastB;
        layer.style.visibility = on ? "visible" : "hidden";
        dot.style.visibility = t >= at ? "visible" : "hidden";
        // per cell: the newest cut-out whose beat has come shows; every older one is cut
        const cur = new Array(nCells).fill(-1);
        shown.forEach((s, j) => { if (t >= s.b && (!lastIsPicture || j < shown.length - 1)) cur[s.cell] = j; });
        shown.forEach((s, j) => {
          const vis = on && cur[s.cell] === j;
          s.node.style.visibility = vis ? "visible" : "hidden";
          if (vis) { const u = ML.out(t, s.b, s.b + 0.2); s.node.style.opacity = u.toFixed(4); s.node.style.scale = (0.96 + 0.04 * u).toFixed(4); }
        });
        // the picture: in on the last beat the same way
        if (lastIsPicture) {
          const u = ML.out(t, lastB, lastB + 0.2);
          el.style.opacity = t >= lastB ? u.toFixed(4) : "0"; // the pay-off is not shown before its beat
          el.style.scale = t >= lastB && u < 1 ? (0.96 + 0.04 * u).toFixed(4) : "none";
        }
      },
    };
  },
});

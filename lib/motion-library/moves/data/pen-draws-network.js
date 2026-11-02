// Pen draws a network: a marker pen draws straight lines one after another, fanning out from nodes, so a network
// diagram builds live. Each line A → B is a thin stroke drawn by its dash offset (0.25 s linear, 0.05 s apart, both
// shortened to fit the move's span when there are many lines), coloured by the sign of its value (the look's accent
// for positive, its "bad" red for negative) or all in ink; the pen sprite rides the drawing end and lifts across to the
// next line's start in the gaps; nodes pop in as dots the first time a line touches them. The pen keeps drawing from
// nodes it already touched (a hub fans 2–4 lines before the pen moves on), so the graph grows outward.
// Source: prompt-motion "tak3sh8-since-everyone-seems-to" (reference only: rebuilt as our own code).
ML.define({
  id: "data.pen-draws-network",
  category: "data",
  name: "Pen draws a network",
  does: "A marker pen draws straight coloured lines fanning from nodes, building a network diagram live.",
  says: ["connection", "step", "tech"],
  energy: 2,
  targets: ["chart", "shape"],
  duration: [1.5, 5],
  params: {
    lines: { type: "number", range: [5, 60], default: 20 },
    colour_coding: { type: "bool", default: true },
    pen: { type: "bool", default: true },
    negative_share: { type: "number", range: [0, 1], default: 0.45 },
    seed: { type: "number", range: [1, 99], default: 7 },
  },
  pairs: ["data.onion-skin-motion-study", "data.playhead-ruler"],
  avoid: ["luxury", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:tak3sh8-since-everyone-seems-to", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const NS = "http://www.w3.org/2000/svg";
    const S = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.append(e); return e; };
    const parent = ctx.scene || ctx.stage, pb = ctx.box(parent);
    let bx = f.pic.x - pb.x, by = f.pic.y - pb.y, w = f.pic.w, h = f.pic.h;
    if (el) { const b = ctx.box(el); bx = b.x - pb.x; by = b.y - pb.y; w = b.w; h = b.h; }
    const host = document.createElement("div");
    host.style.cssText = `position:absolute;left:${bx}px;top:${by}px;width:${w}px;height:${h}px;z-index:4;${el ? "" : "background:var(--x-ground);"}`;
    parent.append(host);
    const svg = S("svg", { width: w, height: h, viewBox: `0 0 ${w} ${h}` }, host);
    svg.style.cssText = "display:block;overflow:visible";
    const m = Math.min(w, h), pad = m * 0.1, seed = p.seed;
    const R = (i, k) => ML.rnd(i + seed * 13.7, k);
    const nL = Math.round(ML.clamp(p.lines, 5, 60));
    // nodes: a jittered grid, picked by the seed
    const nN = Math.round(ML.clamp(nL / 2.4 + 3, 5, 26));
    const cols = Math.max(2, Math.round(Math.sqrt((nN * 1.6 * w) / h))), rows = Math.max(2, Math.ceil((nN * 1.6) / cols));
    const cells = Array.from({ length: cols * rows }, (_, i) => i).sort((a, b) => R(a, 3) - R(b, 3)).slice(0, nN);
    const cw = (w - 2 * pad) / cols, ch = (h - 2 * pad) / rows;
    const nodes = cells.map((c, i) => {
      const cx = c % cols, cy = Math.floor(c / cols);
      const x = pad + (cx + 0.2 + 0.6 * R(i, 5)) * cw;
      return { x: rtl ? w - x : x, y: pad + (cy + 0.2 + 0.6 * R(i, 7)) * ch, touch: Infinity };
    });
    // start at the node nearest the reading-start top corner
    const startI = nodes.reduce((bi, n, i) => ((rtl ? w - n.x : n.x) + n.y < (rtl ? w - nodes[bi].x : nodes[bi].x) + nodes[bi].y ? i : bi), 0);
    const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
    const touched = [startI], edges = new Set(), lines = [];
    let guard = 0, hub = startI, fan = 0, fanMax = 2 + Math.floor(R(0, 9) * 3);
    for (let i = 0; i < nL; i++) {
      if (fan >= fanMax) { hub = touched[Math.floor(R(i, 11) * touched.length)]; fan = 0; fanMax = 2 + Math.floor(R(i, 13) * 3); }
      const untouched = nodes.map((_, j) => j).filter((j) => !touched.includes(j));
      let to;
      if (untouched.length && (R(i, 17) < 0.7 || touched.length < 3)) {
        to = untouched.sort((a, b) => d2(nodes[a], nodes[hub]) - d2(nodes[b], nodes[hub]))[Math.floor(R(i, 19) * Math.min(3, untouched.length))];
      } else {
        const opts = nodes.map((_, j) => j).filter((j) => j !== hub && !edges.has(Math.min(j, hub) + "-" + Math.max(j, hub)));
        if (!opts.length) { hub = touched[(touched.indexOf(hub) + 1) % touched.length]; i--; if (++guard > 400) break; continue; }
        to = opts[Math.floor(R(i, 23) * opts.length)];
      }
      edges.add(Math.min(to, hub) + "-" + Math.max(to, hub));
      if (!touched.includes(to)) touched.push(to);
      lines.push({ a: hub, b: to, neg: R(i, 29) < p.negative_share });
      fan++;
    }
    // timing: 0.25 s draw + 0.05 s gap each, squeezed to fit the span
    const t0 = at + 0.15, avail = Math.max(0.5, end - 0.45 - t0);
    const slot = Math.min(0.3, avail / lines.length), drawD = slot * (0.25 / 0.3);
    const lw = Math.max(1.5, m * 0.0035), nr = Math.max(3, m * 0.009);
    const lineEls = lines.map((L, i) => {
      const A = nodes[L.a], B = nodes[L.b], len = Math.sqrt(d2(A, B));
      L.t = t0 + i * slot; L.len = len;
      A.touch = Math.min(A.touch, L.t); B.touch = Math.min(B.touch, L.t + drawD);
      const col = p.colour_coding ? (L.neg ? "var(--x-bad)" : "var(--x-accent)") : "var(--x-ink)";
      L.col = col;
      return S("line", { x1: A.x, y1: A.y, x2: B.x, y2: B.y, style: `stroke:${col};stroke-width:${lw}px;stroke-linecap:round;stroke-dasharray:${len.toFixed(2)} ${(len + 10).toFixed(2)};stroke-dashoffset:${len.toFixed(2)}` }, svg);
    });
    const dots = nodes.map((n) => S("circle", { cx: n.x, cy: n.y, r: 0, style: "fill:var(--x-ink)" }, svg));
    // the pen: a marker drawn tip-at-origin, body up and away from the reading start (a right hand; a left one in Arabic)
    let pen = null, penTip = null;
    if (p.pen) {
      const L = m * 0.17, bw = L * 0.16, dir = rtl ? -1 : 1;
      pen = S("g", {}, svg);
      const body = S("g", { transform: `rotate(${dir * -50}) ` }, pen);
      penTip = S("path", { d: `M0 0 L${bw * 0.32} ${-L * 0.1} L${-bw * 0.32} ${-L * 0.1} Z`, style: "fill:var(--x-accent)" }, body);
      S("path", { d: `M${-bw * 0.5} ${-L * 0.1} L${bw * 0.5} ${-L * 0.1} L${bw * 0.5} ${-L * 0.2} L${-bw * 0.5} ${-L * 0.2} Z`, style: "fill:var(--x-dim)" }, body);
      S("rect", { x: -bw / 2, y: -L, width: bw, height: L * 0.8, rx: bw * 0.18, style: "fill:var(--x-ink)" }, body);
      S("rect", { x: -bw / 2, y: -L * 0.45, width: bw, height: L * 0.07, style: "fill:var(--x-panel);opacity:.55" }, body);
      // body sits right-ish of its tip; rotate turns it to lean like a held marker
      body.setAttribute("transform", `rotate(${dir * 40})`);
    }
    const every = Math.max(1, Math.round(0.9 / slot));
    lines.forEach((L, i) => { if (i % every === 0) ctx.sfx(L.t, "tap", 0.18); });
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        host.style.opacity = (t >= at - 1e-6 ? 1 - leave : 0).toFixed(4);
        lines.forEach((L, i) => {
          const u = ML.lin(t, L.t, L.t + drawD);
          lineEls[i].style.strokeDashoffset = (L.len * (1 - u)).toFixed(2);
        });
        nodes.forEach((n, i) => { const u = n.touch === Infinity ? 0 : ML.clamp(ML.back(t, n.touch, n.touch + 0.14, 2.2), 0, 1.4); dots[i].setAttribute("r", (nr * u).toFixed(2)); });
        if (pen) {
          // where the drawing end is now: on a line while it draws, travelling to the next start in the gaps
          let x, y, lift = 0, col = lines[0].col;
          const k = ML.clamp(Math.floor((t - t0) / slot), 0, lines.length - 1), L = lines[k], A = nodes[L.a], B = nodes[L.b];
          const u = ML.lin(t, L.t, L.t + drawD);
          if (t < t0) { x = A.x; y = A.y; lift = 1; }
          else if (u < 1 || k === lines.length - 1) { x = A.x + (B.x - A.x) * u; y = A.y + (B.y - A.y) * u; col = L.col; }
          else {
            const N = lines[k + 1], NA = nodes[N.a], v = ML.ease(t, L.t + drawD, L.t + slot);
            x = B.x + (NA.x - B.x) * v; y = B.y + (NA.y - B.y) * v; lift = Math.sin(v * Math.PI); col = N.col;
          }
          const fin = ML.lin(t, lines[lines.length - 1].t + drawD, lines[lines.length - 1].t + drawD + 0.3);
          const enter = ML.lin(t, at, t0);
          lift = Math.max(lift * 0.6, 1 - enter, fin);
          pen.setAttribute("transform", `translate(${x.toFixed(2)} ${(y - lift * m * 0.02).toFixed(2)})`);
          pen.style.opacity = (enter * (1 - fin)).toFixed(3);
          penTip.style.fill = col;
        }
      },
    };
  },
});

// Exploded isometric layer diagram: flat isometric planes stack on a dashed centre axis — storage at the bottom (three
// cylinders SRC_01–03), a node graph in the middle (nodes, solid and dotted edges, META_REF, and the INDEX_CORE: a
// filled dot in a dashed ring and a thin ring), process glyphs on top (a diamond with a square, two panels) — linked by
// dashed quadratic streams, with one solid bright stream up the axis. Each plane is a rhombus with a dashed inset copy
// and crosshair lines. Build (ported from the source's GSAP timeline, here seeked from t): the layers stack in bottom-up
// (y +40 → 0, scale .95 → 1, fade; power3.out, stagger 0.2 s), the streams draw on (through masks, so the dashes stay
// dashes), then routed callout lines draw (power2.inOut, stagger 0.15 s) and their pills fade in; idle, the whole
// diagram drifts a hair in 3D (rotateY 1°, rotateX 0.5°, y −4, 6 s sine yoyo). 2–4 layers (a cache plane joins at 4);
// "custom" keeps the planes and callouts only. Mirrored for Arabic (callouts swap sides; codes stay Latin).
// Colours: the source's zinc-on-black mapped onto the look's ink / panel / accent.
// Source: MengTo/Skills web-design/technical-wireframe-info-layout, demo/index.html (MIT: the SVG geometry and timeline).
ML.define({
  id: "data.exploded-layer-diagram",
  category: "data",
  name: "Exploded isometric layer diagram",
  does: "Flat isometric planes stack on a dashed axis — storage at the bottom, a node graph in the middle, process icons on top — linked by dashed streams.",
  says: ["tech", "scale", "proof", "connection"],
  energy: 2,
  targets: ["chart", "stage"],
  duration: [2, 6],
  params: {
    layers: { type: "number", range: [2, 4], default: 3 },
    content: { type: "choice", options: ["storage-graph-process", "custom"], default: "storage-graph-process" },
    labels: { type: "bool", default: true },
    idle_drift: { type: "bool", default: true },
    callouts: { type: "text", default: "" },
  },
  pairs: ["camera.analytical-drift", "data.spec-rows"],
  avoid: ["playful", "celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "land.light",
  source: { from: "MengTo/Skills:web-design/technical-wireframe-info-layout", license: "MIT", note: "demo/index.html (base64 srcdoc, decoded): SVG geometry and GSAP build timeline" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (parent) parent.append(e); return e; };
    const sv = (tag, attrs, parent, style) => { const e = doc.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v); if (style) e.style.cssText = style; if (parent) parent.append(e); return e; };
    const u = Math.min(f.W, f.H) / 1080;
    const uid = "mlxld" + doc.querySelectorAll("[data-ml-xld]").length;
    const n = Math.round(ML.clamp(p.layers, 2, 4));
    const custom = p.content === "custom";
    const X = (x) => (rtl ? 1000 - x : x); // mirrored for Arabic
    const ink = (pct) => `color-mix(in srgb, var(--x-ink) ${pct}%, transparent)`;
    const TK = f.wide ? 1.15 : f.tall ? 1.7 : 1.5; // type sized for the frame
    const SP = f.wide ? 1 : f.tall ? 1.4 : 1.15; // a narrower frame explodes the layers further apart (its pills sit between them)
    const Y = (y) => 465 + (y - 465) * SP;

    // the region and the svg
    let R = el ? ctx.box(el) : null;
    if (!R || R.w < 400 * u || R.h < 300 * u) R = f.pic;
    const wrap = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;z-index:20;pointer-events:none;will-change:transform`, ctx.scene || stage);
    wrap.dataset.mlXld = uid;
    const back = mk("div", `position:absolute;inset:0;border-radius:var(--x-radius);background:var(--x-ground)`, wrap); // its own ground over the region
    const svg = sv("svg", { width: R.w, height: R.h, preserveAspectRatio: "xMidYMid meet" }, wrap, "position:relative;overflow:visible;display:block");
    const defs = sv("defs", {}, svg);
    const root = sv("g", {}, svg);

    // the layers: kind, centre y, half sizes (the source's three, a cache plane added at 4)
    const KINDS = { 2: ["storage", "process"], 3: ["storage", "graph", "process"], 4: ["storage", "graph", "cache", "process"] }[n];
    const SIZE = { storage: [300, 100], graph: [350, 110], cache: [320, 100], process: [250, 70] };
    const ys = (n === 3 ? [680, 450, 250] : n === 2 ? [660, 300] : [690, 520, 370, 225]).map(Y);
    // the centre axis
    sv("line", { x1: 500, y1: ys[n - 1] - 130, x2: 500, y2: ys[0] + 50 }, root, `stroke:${ink(22)};stroke-width:1;stroke-dasharray:2 4`);
    const shrink = n === 4 ? 0.82 : 1;
    const text = (parent, x, y, s, size, fill, anchor = "middle", extra = "") => { const e = sv("text", { x, y, "text-anchor": anchor }, parent, `font:500 ${size * TK}px var(--x-mono-font);fill:${fill};direction:ltr;${extra}`); e.textContent = s; return e; };
    const layers = KINDS.map((kind, i) => {
      const cy = ys[i], [hw0, hh0] = SIZE[kind], hw = hw0 * shrink, hh = hh0 * shrink;
      const g = sv("g", {}, root);
      const rh = (w, h) => `${X(500 - w)},${cy} ${X(500)},${cy + h} ${X(500 + w)},${cy} ${X(500)},${cy - h}`;
      sv("polygon", { points: rh(hw, hh) }, g, `fill:${ink([5, 3, 4, 2][i] || 3)};stroke:${ink(30 + i * 8)};stroke-width:1`);
      sv("polygon", { points: rh(hw * 0.91, hh * 0.9) }, g, `fill:none;stroke:${ink(20)};stroke-width:${i === 0 ? 1 : 0.5};stroke-dasharray:${i === n - 1 ? "1 2" : "2 2"}`);
      sv("line", { x1: X(500), y1: cy - hh, x2: X(500), y2: cy + hh }, g, `stroke:${ink(25)};stroke-width:0.5;stroke-dasharray:1 3`);
      sv("line", { x1: X(500 - hw), y1: cy, x2: X(500 + hw), y2: cy }, g, `stroke:${ink(25)};stroke-width:0.5;stroke-dasharray:1 3`);
      const k = shrink, P = (dx, dy) => [X(500 + dx * k), cy + dy * k];
      let anchors = [P(-80, -10), P(0, 0), P(80, -10)];
      if (!custom && kind === "storage") {
        [[-150, -30, "SRC_01"], [0, 30, "SRC_02"], [150, -30, "SRC_03"]].forEach(([dx, dy, lab]) => {
          const [x, y] = P(dx, dy), c = sv("g", { transform: `translate(${x}, ${y})` }, g);
          sv("path", { d: "M-20,-20 v20 a20,10 0 0,0 40,0 v-20" }, c, `fill:var(--x-panel);stroke:${ink(55)};stroke-width:1`);
          sv("ellipse", { cx: 0, cy: -20, rx: 20, ry: 10 }, c, `fill:var(--x-panel);stroke:${ink(55)};stroke-width:1`);
          if (p.labels) text(c, 0, 24 + 6 * TK, lab, 13, "var(--x-dim)");
        });
        anchors = [P(-150, -50), P(0, 0), P(150, -50)];
      }
      if (!custom && kind === "graph") {
        const N = { A: [-160, -30, 4], B: [-80, -10, 6], C: [80, -10, 6], D: [160, -30, 4], M: [0, -60, 4], core: [0, 20, 0] };
        const at2 = (key) => P(N[key][0], N[key][1]);
        const edge = (a, b, dash) => { const [x1, y1] = at2(a), [x2, y2] = at2(b); sv("line", { x1, y1, x2, y2 }, g, `stroke:${ink(40)};stroke-width:1${dash ? ";stroke-dasharray:1 3" : ""}`); };
        edge("A", "B"); edge("B", "core"); edge("core", "C"); edge("C", "D"); edge("B", "M"); edge("C", "M"); edge("A", "M", true); edge("D", "M", true);
        for (const key of ["A", "B", "C", "D", "M"]) {
          const [x, y] = at2(key), r = N[key][2];
          sv("circle", { cx: x, cy: y, r }, g, `fill:var(--x-panel);stroke:${ink(r > 4 ? 75 : 60)};stroke-width:1`);
          if (p.labels) text(g, x, key === "M" ? y - 15 : y + (r > 4 ? 25 : 20) + 4 * TK, key === "M" ? "META_REF" : `NODE_${key}`, 12, "var(--x-dim)");
        }
        const [cx, cyy] = at2("core"), core = sv("g", { transform: `translate(${cx}, ${cyy})` }, g);
        sv("circle", { r: 8 }, core, "fill:var(--x-accent)");
        sv("circle", { r: 14 }, core, `fill:none;stroke:${ink(55)};stroke-width:1;stroke-dasharray:2 2`);
        sv("circle", { r: 22 }, core, `fill:none;stroke:${ink(30)};stroke-width:0.5`);
        if (p.labels) text(core, 0, 36 + 6 * TK, "INDEX_CORE", 13, "var(--x-ink)");
        anchors = [at2("B"), at2("core"), at2("C")];
      }
      if (!custom && kind === "cache") {
        [[-120, 10], [-40, -10], [40, -10], [120, 10]].forEach(([dx, dy], j) => {
          const [x, y] = P(dx, dy), c = sv("g", { transform: `translate(${x}, ${y})` }, g);
          sv("rect", { x: -16, y: -10, width: 32, height: 20 }, c, `fill:var(--x-panel);stroke:${ink(55)};stroke-width:1`);
          sv("line", { x1: -10, y1: 0, x2: 10, y2: 0 }, c, `stroke:${ink(35)};stroke-width:1`);
          if (p.labels && (j === 0 || j === 3)) text(c, 0, 26 + 6 * TK, `SHARD_${"ABCD"[j]}`, 12, "var(--x-dim)");
        });
        anchors = [P(-40, -10), P(0, 0), P(40, -10)];
      }
      if (!custom && kind === "process") {
        const [ax, ay] = P(-60, 10), a = sv("g", { transform: `translate(${ax}, ${ay})` }, g);
        sv("rect", { x: -15, y: -10, width: 30, height: 20 }, a, `fill:var(--x-panel);stroke:${ink(60)};stroke-width:1`);
        sv("line", { x1: -10, y1: -2, x2: 10, y2: -2 }, a, `stroke:${ink(35)};stroke-width:1`);
        sv("line", { x1: -10, y1: 2, x2: 5, y2: 2 }, a, `stroke:${ink(35)};stroke-width:1`);
        const [dx, dy] = P(0, 30), d = sv("g", { transform: `translate(${dx}, ${dy})` }, g);
        sv("polygon", { points: "0,-15 15,0 0,15 -15,0" }, d, `fill:var(--x-panel);stroke:var(--x-ink);stroke-width:1`);
        sv("rect", { x: -3, y: -3, width: 6, height: 6 }, d, "fill:var(--x-accent)");
        sv("line", { x1: 0, y1: -15, x2: 0, y2: -25 }, d, "stroke:var(--x-ink);stroke-width:1");
        if (p.labels) text(d, 0, 32 + 6 * TK, "PROCESS_ENGINE", 13, "var(--x-ink)");
        const [bx, by] = P(60, 10), b = sv("g", { transform: `translate(${bx}, ${by})` }, g);
        sv("rect", { x: -15, y: -10, width: 30, height: 20 }, b, `fill:var(--x-panel);stroke:${ink(60)};stroke-width:1`);
        sv("path", { d: `M${rtl ? 10 : -10},5 L${rtl ? 5 : -5},0 L0,3 L${rtl ? -10 : 10},-5` }, b, `fill:none;stroke:${ink(60)};stroke-width:1`);
        anchors = [P(-60, 10), P(0, 30), P(60, 10)];
      }
      return { g, cy, hw, hh, kind, anchors };
    });
    // layers draw over the streams below them: streams go in first, under each upper layer
    const streams = [];
    for (let i = 0; i < n - 1; i++) {
      const lo = layers[i], hi = layers[i + 1], top = i === n - 2;
      const sg = sv("g", {}, root);
      root.insertBefore(sg, hi.g);
      lo.anchors.forEach((a, j) => {
        const b = hi.anchors[j], solid = top && j === 1;
        const d = j === 1 ? `M${a[0]},${a[1] - 20} L${b[0]},${b[1] + 30}` : `M${a[0]},${a[1]} Q${b[0] + (b[0] - a[0]) * 0.07},${a[1] - (a[1] - b[1]) * 0.42} ${b[0]},${b[1]}`;
        const id = `${uid}-m${i}-${j}`;
        const m = sv("mask", { id, maskUnits: "userSpaceOnUse", x: -2000, y: -2000, width: 5000, height: 5000 }, defs);
        const mp = sv("path", { d, pathLength: 1 }, m, "fill:none;stroke:#fff;stroke-width:8;stroke-dasharray:1 1;stroke-dashoffset:1");
        sv("path", { d, mask: `url(#${id})` }, sg, solid ? "fill:none;stroke:var(--x-accent);stroke-width:1.5" : `fill:none;stroke:${ink(top ? 50 : 40)};stroke-width:1;stroke-dasharray:${top ? "2 6" : "2 4"}`);
        streams.push({ mp, i, j });
      });
    }

    // callouts: routed lines to pills, alternating sides from the top
    const titles = String(p.callouts || "").split("|").map((s) => s.trim()).filter(Boolean);
    const DEF = { process: ["Runtime Output", "OBJ_COMPILED", "مخرجات التشغيل"], graph: ["Graph Resolution", "EDGE_MAPPING", "ربط العلاقات"], cache: ["Hot Cache", "SHARD_SYNC", "ذاكرة سريعة"], storage: ["Physical Storage", "PARTITION_LOCK", "التخزين الفعلي"] };
    const ANCH = { process: [20, 20], graph: [-170, -30], cache: [130, 10], storage: [170, -30] };
    const callouts = [];
    if (p.labels) layers.slice().reverse().forEach((L, r) => {
      const i = n - 1 - r, s = r % 2 === 0 ? 1 : -1, d0 = DEF[L.kind];
      const [ox, oy] = ANCH[L.kind];
      const ax = 500 + s * Math.abs(ox) * shrink, ay = L.cy + oy * shrink, dy = f.wide ? (i === 0 ? 50 : -70) : i === 0 ? 110 : -80;
      const rk = f.wide ? 1 : 0.42; // routes kept short off a wide frame, the pills above or below them, so the drawing can be larger
      const pts = [[ax, ay], [ax + s * 140 * rk, ay], [ax + s * 190 * rk, ay + dy], [ax + s * 260 * rk, ay + dy]].map(([x, y]) => [X(x), y]);
      const g = sv("g", {}, root);
      const line = sv("path", { d: "M" + pts.map((q) => q.join(" ")).join(" L "), pathLength: 1 }, g, `fill:none;stroke:${ink(55 - r * 5)};stroke-width:1;stroke-linejoin:bevel;stroke-dasharray:1 1;stroke-dashoffset:1`);
      const bits = sv("g", {}, g);
      sv("circle", { cx: pts[0][0], cy: pts[0][1], r: 2.5 }, bits, "fill:var(--x-ink)");
      sv("rect", { x: pts[3][0] - 2, y: pts[3][1] - 2, width: 4, height: 4 }, bits, `fill:${ink(55)}`);
      const title = titles[r] || (rtl ? d0[2] : d0[0]), code = d0[1];
      const fsT = 17 * TK, fsC = 13 * TK, ph = fsT + fsC + 20;
      const physRight = rtl ? s < 0 : s > 0, anchor = physRight ? "start" : "end";
      const rect = sv("rect", { height: ph, rx: 3 }, bits, `fill:var(--x-panel);stroke:${ink(22)};stroke-width:1`);
      const t1 = sv("text", { "text-anchor": anchor }, bits, `font:300 ${fsT}px var(--x-body-font);letter-spacing:${rtl ? 0 : "0.12em"};text-transform:uppercase;fill:var(--x-ink);direction:ltr`);
      t1.textContent = title;
      const t2 = text(bits, 0, 0, code, 13, "var(--x-dim)", anchor);
      const pw = Math.max(t1.getComputedTextLength(), t2.getComputedTextLength()) + 28; // measured: any title, any face
      // beside the line's end on a wide frame (growing away from the diagram); above or below it otherwise, inside the drawing's width
      const px = f.wide ? (physRight ? pts[3][0] + 10 : pts[3][0] - 10 - pw) : ML.clamp(pts[3][0] - pw / 2, 110, Math.max(110, 890 - pw));
      const py = f.wide ? pts[3][1] - ph / 2 : dy < 0 ? pts[3][1] - ph : pts[3][1];
      const tx = physRight ? px + 14 : px + pw - 14;
      rect.setAttribute("x", px); rect.setAttribute("y", py); rect.setAttribute("width", pw);
      t1.setAttribute("x", tx); t1.setAttribute("y", py + 8 + fsT * 0.85);
      t2.setAttribute("x", tx); t2.setAttribute("y", py + 12 + fsT + fsC * 0.85);
      callouts.push({ line, bits, r });
    });

    // fit the drawing to the region
    const bb = root.getBBox(), padB = 16;
    svg.setAttribute("viewBox", `${bb.x - padB} ${bb.y - padB} ${bb.width + padB * 2} ${bb.height + padB * 2}`);

    // the timeline (seeked from t)
    const LS = (i) => at + 0.1 + i * 0.2, LD = 0.7;
    const lastLand = LS(n - 1) + LD;
    // the build runs in full on a long move and tightens to fit a short one: every callout is read before the move leaves
    const K = Math.min(1, (end - at - 0.55) / Math.max(lastLand - at - 0.3 + (n - 1) * 0.15 + 0.95, LS(n - 1) + 1.1 - at));
    const scaled = (x) => at + (x - at) * K;
    const p3 = (x) => 1 - Math.pow(1 - ML.clamp(x), 3);
    const io1 = (x) => { x = ML.clamp(x); return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
    const sIn = (x) => -(Math.cos(Math.PI * ML.clamp(x)) - 1) / 2;
    ctx.sfx(scaled(LS(0) + 0.15), "land.light", 0.3);
    ctx.sfx(scaled(LS(n - 1) + 0.15), "land.light", 0.3);
    if (callouts.length) ctx.sfx(scaled(lastLand - 0.1), "tap", 0.2);

    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        wrap.style.opacity = (1 - leave).toFixed(4);
        back.style.opacity = (0.94 * ML.out(t, at - 0.1, at + 0.3)).toFixed(4);
        const T = at + (t - at) / K; // the build's own clock
        layers.forEach((L, i) => {
          const e = p3((T - LS(i)) / LD), y = (1 - e) * 40, s = 0.95 + 0.05 * e;
          L.g.setAttribute("transform", `translate(0 ${y.toFixed(3)}) translate(500 ${L.cy}) scale(${s.toFixed(4)}) translate(-500 ${-L.cy})`);
          L.g.style.opacity = e.toFixed(4);
        });
        for (const S of streams) {
          const a = LS(S.i + 1) + 0.3 + S.j * 0.1;
          S.mp.style.strokeDashoffset = (1 - io1((T - a) / 0.6)).toFixed(4);
        }
        for (const C of callouts) {
          const a = lastLand - 0.3 + C.r * 0.15;
          C.line.style.strokeDashoffset = (1 - io1((T - a) / 0.8)).toFixed(4);
          C.bits.style.opacity = ML.clamp((T - a - 0.45) / 0.5).toFixed(4);
        }
        if (p.idle_drift) {
          const x = sIn(((Math.max(0, t - at) / 6) % 2 < 1 ? (Math.max(0, t - at) / 6) % 1 : 1 - ((Math.max(0, t - at) / 6) % 1)));
          svg.style.transform = `perspective(${(1400 * u).toFixed(0)}px) rotateY(${(x * (rtl ? -1 : 1)).toFixed(4)}deg) rotateX(${(x * 0.5).toFixed(4)}deg) translateY(${(-4 * u * x).toFixed(3)}px)`;
        }
      },
    };
  },
});

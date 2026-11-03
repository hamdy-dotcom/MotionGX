// Rough sketch snaps to clean geometry: a wobbly hand-drawn line draws itself in, a "Clean up drawing" pill is pressed
// (it turns the accent colour), and every point of the rough polyline snaps to its target on the clean one (point-
// matched arrays: the clean path is sampled with its corners kept, the rough one is that sampling pushed along its
// normals by seeded low-frequency wobble) over 0.35 s back.out(1.3). The stroke turns from ink to the accent with a glow
// (drop-shadow 0 0 8px), node rings pop in at the vertices 0.06 s apart, and angle labels (90°) and length labels fade in
// beside them — measured from the real clean geometry. Targets: straight lines, a curve (an arc, labelled by radius) or a
// closed shape. Mirrored in Arabic (it draws from the right).
// Source: prompt-motion "adamdesgns-wtf-made-with-single" (reference only — rebuilt as our own code).
ML.define({
  id: "element.sketch-to-clean-snap",
  category: "element",
  name: "Rough sketch snaps to clean geometry",
  does: "A wobbly drawn line instantly straightens into crisp accent-coloured segments with node circles and angle labels.",
  says: ["change", "before-after", "precision", "simplicity"],
  energy: 3,
  targets: ["shape"],
  duration: [0.8, 2],
  params: {
    target: { type: "choice", options: ["lines", "curves", "shapes"], default: "lines" },
    labels: { type: "bool", default: true },
    button: { type: "bool", default: true },
    backdrop: { type: "bool", default: true },
  },
  pairs: ["element.shape-morph", "text-emphasis.accent-word"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "snap",
  source: { from: "prompt-motion:adamdesgns-wtf-made-with-single", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const host = ctx.scene || ctx.stage;
    // a drawn shape slot can host it; anything else, the drawing gets its own room
    const own = ctx.el && ctx.el !== ctx.stage && (ctx.el.tagName.toLowerCase() === "svg" || !(ctx.el.textContent || "").trim()) ? ctx.el : null;
    const ob = own ? ctx.box(own) : null;
    const R = ob && ob.w > f.W * 0.3 && ob.h > f.H * 0.15 ? ob : f.pic;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;`, host);
    // backdrop: what the drawing replaces fades away (a painted sheet would show its edge on a textured ground and let shadows leak past it)
    const under = !p.backdrop ? [] : R === ob ? [own] : [...host.querySelectorAll(":scope > .ml-pic, :scope > .ml-safe")];
    const svg = doc.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${R.w} ${R.h}`);
    svg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;overflow:visible;";
    layer.append(svg);
    const el = (tag, attrs, parent = svg) => { const e = doc.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent.append(e); return e; };

    const pillH = p.button ? Math.max(44, Math.min(R.h * 0.09, 76)) : 0;
    const D = Math.min(R.w * 0.78, (R.h - pillH * 1.8) * 0.8), cx = R.w / 2, cy = (R.h - pillH * 1.6) / 2 + pillH * 0.1;
    const mx = rtl ? -1 : 1, U = D / 1, k = D / 700;
    const P = (x, y) => [cx + x * U * mx, cy + y * U];

    // ── the clean geometry: vertices (and, for a curve, a dense arc) ──
    let verts, closed = false, curve = false, arc = null;
    if (p.target === "shapes") { verts = [P(-0.42, 0.34), P(-0.42, -0.34), P(0.42, 0.34)]; closed = true; }
    else if (p.target === "curves") {
      curve = true; const r = 0.46;
      arc = { c: P(0, 0.22), r: r * U };
      verts = Array.from({ length: 49 }, (_, i) => { const a = Math.PI + (i / 48) * Math.PI; return P(Math.cos(a) * r, 0.22 + Math.sin(a) * r * 0.95); });
    } else verts = [P(-0.46, 0.34), P(-0.46, -0.3), P(0.12, -0.3), P(0.46, 0.34)];
    // sample with the corners kept: points per segment by length
    const N = 96, segs = [];
    const ring = closed ? [...verts, verts[0]] : verts;
    for (let i = 0; i < ring.length - 1; i++) segs.push([ring[i], ring[i + 1], Math.hypot(ring[i + 1][0] - ring[i][0], ring[i + 1][1] - ring[i][1])]);
    const total = segs.reduce((s, x) => s + x[2], 0), clean = [];
    segs.forEach(([a, b, l]) => { const m = Math.max(2, Math.round((N * l) / total)); for (let j = 0; j < m; j++) clean.push([a[0] + ((b[0] - a[0]) * j) / m, a[1] + ((b[1] - a[1]) * j) / m]); });
    clean.push(ring[ring.length - 1].slice());
    // the rough one: pushed along its normals by seeded wobble (low frequency + a little tremor), ends overshooting
    const ph = [ML.rnd(1, 3) * 6.28, ML.rnd(2, 3) * 6.28, ML.rnd(3, 3) * 6.28], amp = D * 0.045;
    let acc = 0;
    const rough = clean.map((q, i) => {
      const a = clean[Math.max(0, i - 1)], b = clean[Math.min(clean.length - 1, i + 1)];
      const tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl;
      if (i) acc += Math.hypot(q[0] - clean[i - 1][0], q[1] - clean[i - 1][1]);
      const s = acc / total;
      const w = Math.sin(s * 7.1 + ph[0]) * 0.6 + Math.sin(s * 15.3 + ph[1]) * 0.3 + Math.sin(s * 31 + ph[2]) * 0.08 + (ML.rnd(i, 9) - 0.5) * 0.04;
      const end0 = !closed && (i === 0 || i === clean.length - 1) ? (i === 0 ? -1 : 1) * D * 0.03 : 0;
      return [q[0] + nx * w * amp + (tx / tl) * end0, q[1] + ny * w * amp + (ty / tl) * end0];
    });

    const sw = Math.max(3, D * 0.009);
    const path = el("path", { fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-width": sw.toFixed(2) });
    const dOf = (pts) => "M" + pts.map((q) => `${q[0].toFixed(2)} ${q[1].toFixed(2)}`).join("L") + (closed ? "Z" : "");
    path.setAttribute("d", dOf(rough));
    const len = path.getTotalLength() + sw * 2;
    path.setAttribute("stroke-dasharray", `${len.toFixed(1)} ${len.toFixed(1)}`);

    // nodes (vertices; for a curve its two ends and its apex) and labels
    const nodePts = curve ? [verts[0], verts[24], verts[48]] : verts;
    const nr = Math.max(8, 12 * k);
    const nodes = nodePts.map((q) => el("circle", { cx: q[0].toFixed(2), cy: q[1].toFixed(2), r: nr.toFixed(2), "stroke-width": Math.max(2, sw * 0.8).toFixed(2), style: "fill:var(--x-ground);stroke:color-mix(in srgb, var(--x-accent-2) 55%, var(--x-accent));", "transform-origin": `${q[0].toFixed(2)} ${q[1].toFixed(2)}` }));
    const ctr = verts.reduce((s, q) => [s[0] + q[0] / verts.length, s[1] + q[1] / verts.length], [0, 0]);
    const labels = [];
    const fs = Math.max(18, 30 * k);
    const label = (x, y, txt, accent) => {
      const d = mk("div", `position:absolute;left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;translate:-50% -50%;white-space:nowrap;font:var(--x-label-weight) ${fs.toFixed(1)}px var(--x-mono-font);color:${accent ? "var(--x-accent)" : "var(--x-dim)"};opacity:0;`, layer, txt);
      d.dir = "ltr"; labels.push(d); return d;
    };
    const away = (q, dist) => { const dx = q[0] - ctr[0], dy = q[1] - ctr[1], l = Math.hypot(dx, dy) || 1; return [q[0] + (dx / l) * dist, q[1] + (dy / l) * dist]; };
    if (p.labels) {
      const scale = 480 / D; // lengths read as if the drawing were 480 units across
      if (curve) {
        label(...away(verts[24], fs * 1.6), `R ${Math.round(arc.r * scale)}`, true);
        const [rt, lt] = verts[0][0] > verts[48][0] ? [verts[0], verts[48]] : [verts[48], verts[0]]; // 0° on the right, as drawn
        label(...away(rt, fs * 1.8), "0°", false); label(...away(lt, fs * 1.8), "180°", false);
      } else {
        const L = verts.length;
        verts.forEach((q, i) => {
          if (!closed && (i === 0 || i === L - 1)) return;
          const a = verts[(i - 1 + L) % L], b = verts[(i + 1) % L];
          const ang = Math.abs((Math.atan2(a[1] - q[1], a[0] - q[0]) - Math.atan2(b[1] - q[1], b[0] - q[0])) * 180 / Math.PI);
          label(...away(q, fs * 1.9), `${Math.round(ang > 180 ? 360 - ang : ang)}°`, true);
        });
        segs.forEach(([a, b, l]) => { const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; label(...away(m, fs * 1.5), String(Math.round(l * scale)), false); });
      }
    }
    // the pill
    let pill = null;
    if (p.button) {
      pill = mk("div", `position:absolute;left:50%;bottom:${(pillH * 0.35).toFixed(1)}px;translate:-50% 0;height:${pillH.toFixed(1)}px;padding:0 ${(pillH * 0.5).toFixed(1)}px;display:flex;align-items:center;gap:${(pillH * 0.22).toFixed(1)}px;border-radius:var(--x-radius-s);white-space:nowrap;font:600 ${(pillH * 0.38).toFixed(1)}px var(--x-body-font);background:var(--x-panel);color:var(--x-ink);border:1px solid var(--x-line);box-shadow:var(--x-shadow);`, layer);
      const ic = doc.createElementNS(NS, "svg"); ic.setAttribute("viewBox", "0 0 24 24"); ic.setAttribute("width", (pillH * 0.42).toFixed(0)); ic.setAttribute("height", (pillH * 0.42).toFixed(0));
      ic.innerHTML = '<path d="M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4z" fill="currentColor"/>';
      pill.append(ic);
      mk("span", "", pill, rtl ? "نظّف الرسمة" : "Clean up drawing");
    }

    // timing
    const span = Math.max(0.8, end - at), q = ML.clamp(span / 2.2, 0.45, 1);
    const drawEnd = at + 0.75 * q, press = drawEnd + 0.2 * q, T = press + 0.1;
    ctx.sfx(press, "tap", 0.3);
    ctx.sfx(T, "snap", 0.4);
    const nodeT = (i) => T + 0.2 * q + i * 0.06, labT = (i) => T + 0.35 * q + i * 0.06;

    return {
      draw(t) {
        layer.style.visibility = t < at ? "hidden" : "visible";
        under.forEach((e) => { e.style.opacity = (1 - ML.lin(t, at, at + 0.25)).toFixed(4); });
        const dr = ML.out(t, at, drawEnd);
        path.setAttribute("stroke-dashoffset", (len * (1 - dr)).toFixed(2));
        const w = t < T ? 0 : ML.back(t, T, T + 0.35, 1.3), c = ML.clamp(w);
        path.setAttribute("d", dOf(rough.map((r, i) => [r[0] + (clean[i][0] - r[0]) * w, r[1] + (clean[i][1] - r[1]) * w])));
        path.style.stroke = `color-mix(in srgb, var(--x-accent) ${(c * 100).toFixed(1)}%, var(--x-ink))`;
        path.style.filter = c > 0.01 ? `drop-shadow(0 0 ${(8 * c).toFixed(2)}px color-mix(in srgb, var(--x-accent) ${(c * 80).toFixed(1)}%, transparent))` : "none";
        nodes.forEach((n, i) => { const s = t < nodeT(i) ? 0 : ML.clamp(ML.back(t, nodeT(i), nodeT(i) + 0.25, 1.7), 0, 1.3); n.style.scale = s.toFixed(4); n.style.opacity = s > 0 ? "1" : "0"; });
        labels.forEach((l, i) => { l.style.opacity = ML.ease(t, labT(i), labT(i) + 0.25).toFixed(4); });
        if (pill) {
          const on = ML.ease(t, press, press + 0.15);
          pill.style.background = `color-mix(in srgb, var(--x-accent) ${(on * 100).toFixed(1)}%, var(--x-panel))`;
          pill.style.color = `color-mix(in srgb, var(--x-accent-ink) ${(on * 100).toFixed(1)}%, var(--x-ink))`;
          pill.style.scale = (1 - 0.05 * Math.sin(Math.PI * ML.lin(t, press - 0.06, press + 0.12))).toFixed(4);
          pill.style.opacity = ML.ease(t, at, at + 0.3).toFixed(4);
        }
      },
    };
  },
});

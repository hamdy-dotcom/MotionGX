// Shape morph sequence: one filled SVG path, point-matched (every outline resampled to the same count by arc length,
// all starting at the top and running clockwise — flubber-style), grows from a small dot (scale 0.2 → 1 on a spring),
// then morphs circle → square → triangle → star (or eye, squircle, hexagon, diamond) — each morph cubic-bezier(0.65, 0,
// 0.35, 1) with a +rotation step and a 0.9 scale dip, then a hold. The fill alternates the look's two colours. Options:
// a design-tool transform box (1 px rect + 8 handles turning with the shape, mono readouts ROT 015.3° / SHAPE TRIANGLE
// / W × H updating live), faint concentric guide rings behind, and an edge wobble (feTurbulence displacement that
// lives only while a morph runs).
// Sources: prompt-motion "raphaelaubryy-gave-opus-5-5-a", "sudiyasa-celerating-100-eyezonbot-users",
// "ghinaiya-nirmal-motion-designers-are-cooked", "rendesr-love-claude-opus-5-5" (reference only — our own code).
ML.define({
  id: "element.shape-morph",
  category: "element",
  name: "Shape morph sequence",
  does: "One filled shape morphs through circle, square, triangle, star (the sequence also takes squircle, soft-star, hexagon, diamond, eye), optionally inside a rotating design-tool bounding box with a live readout; on a logo it resolves into the logo.",
  says: ["change", "playful", "choice", "tech", "precision"],
  energy: 3,
  targets: ["shape", "logo"],
  duration: [1.5, 4],
  params: {
    sequence: { type: "text", default: "circle,square,triangle,star" },
    hold: { type: "number", range: [0.2, 0.6], default: 0.35, unit: "s" },
    box: { type: "bool", default: false },
    rotation: { type: "number", range: [0, 45], default: 30, unit: "deg" },
    edge_wobble: { type: "bool", default: false },
    morph: { type: "number", range: [0.35, 0.6], default: 0.42, unit: "s" },
    guides: { type: "bool", default: true },
    backdrop: { type: "bool", default: true },
  },
  pairs: ["element.scattered-strokes-to-ring", "text-in.punchline"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:ghinaiya-nirmal-motion-designers-are-cooked", license: "reference", note: "with raphaelaubryy-gave-opus-5-5-a, sudiyasa-celerating-100-eyezonbot-users, rendesr-love-claude-opus-5-5; technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const ob = own ? ctx.box(own) : null;
    const big = ob && ob.w > f.W * 0.3 && ob.h > f.H * 0.15, small = own && !big; // a small target (a logo): the morph runs on it
    const R = own ? ob : f.pic;
    const layer = doc.createElement("div");
    layer.style.cssText = `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;`;
    host.append(layer);
    // backdrop: what the drawing replaces fades away (a painted sheet would show its edge on a textured ground and let shadows leak past it)
    const under = p.backdrop && !own ? [...host.querySelectorAll(":scope > .ml-pic, :scope > .ml-safe")] : [];
    const svg = doc.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${R.w} ${R.h}`);
    svg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;overflow:visible;will-change:transform;";
    layer.append(svg);
    const el = (tag, attrs, parent = svg) => { const e = doc.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent.append(e); return e; };

    // ── outlines: dense polylines from the top, clockwise; resampled to N by arc length ──
    const N = 120; // divides every polygon's equal sides, so each corner stays a sample and no tip is cut
    const poly = (pts) => { const out = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; for (let k = 0; k < 24; k++) out.push([a[0] + (b[0] - a[0]) * (k / 24), a[1] + (b[1] - a[1]) * (k / 24)]); } return out; };
    const curve = (fn) => Array.from({ length: 360 }, (_, i) => fn(((i / 360) * 2 - 0.5) * Math.PI));
    const star = (k, inner) => Array.from({ length: k * 2 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / k, r = i % 2 ? inner : 1; return [Math.cos(a) * r, Math.sin(a) * r]; });
    const OUT = {
      circle: () => curve((a) => [Math.cos(a), Math.sin(a)]),
      square: () => poly([[0, -0.86], [0.86, -0.86], [0.86, 0.86], [-0.86, 0.86], [-0.86, -0.86]]),
      squircle: () => curve((a) => { const c = Math.cos(a), s = Math.sin(a); return [Math.sign(c) * Math.pow(Math.abs(c), 0.5) * 0.9, Math.sign(s) * Math.pow(Math.abs(s), 0.5) * 0.9]; }),
      triangle: () => poly([[0, -1], [0.98, 0.697], [-0.98, 0.697]]), // equilateral
      star: () => poly(star(5, 0.46)),
      "soft-star": () => curve((a) => { const r = 0.82 + 0.16 * Math.cos(8 * (a + Math.PI / 2)); return [Math.cos(a) * r, Math.sin(a) * r]; }),
      hexagon: () => poly(Array.from({ length: 6 }, (_, i) => [Math.cos(-Math.PI / 2 + (i * Math.PI) / 3), Math.sin(-Math.PI / 2 + (i * Math.PI) / 3)])),
      diamond: () => poly([[0, -1], [0.78, 0], [0, 1], [-0.78, 0]]),
      eye: () => curve((a) => [Math.cos(a), 0.62 * Math.sin(a) * Math.abs(Math.sin(a))]),
    };
    const resample = (pts) => {
      const L = [0]; for (let i = 1; i <= pts.length; i++) { const a = pts[i - 1], b = pts[i % pts.length]; L.push(L[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
      const total = L[L.length - 1], out = []; let j = 0;
      for (let i = 0; i < N; i++) { const d = (i / N) * total; while (L[j + 1] < d) j++; const a = pts[j], b = pts[(j + 1) % pts.length], u = (d - L[j]) / (L[j + 1] - L[j] || 1); out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); }
      return out;
    };
    let names = String(p.sequence || "").split(/[,\s→>]+/).map((s) => s.trim().toLowerCase()).filter((s) => OUT[s]);
    if (names.length < 2) names = ["circle", "square", "triangle", "star"];
    const shapes = names.map((n) => resample(OUT[n]()));

    // ── the scene ──
    const cx = R.w / 2, cy = R.h / 2, S = Math.min(R.w, R.h), r = small ? Math.max(S * 0.48, Math.min(f.W, f.H) * 0.05) : S * 0.24, dir = rtl ? -1 : 1;
    // the guide rings live on their own layer, so the moving shape never re-rasters them (stable pixels per t)
    const gsvg = doc.createElementNS(NS, "svg");
    gsvg.setAttribute("viewBox", `0 0 ${R.w} ${R.h}`);
    gsvg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;overflow:visible;will-change:transform;";
    layer.insertBefore(gsvg, svg);
    const guides = p.guides && !small ? [0.36, 0.52, 0.68, 0.84].map((k) => el("circle", { cx, cy, r: (S * k * 0.5).toFixed(1), fill: "none", style: `stroke:var(--x-ink);stroke-opacity:.14;stroke-width:${Math.max(1, S * 0.002).toFixed(2)};` }, gsvg)) : [];
    let filt = null, disp = null;
    const wobId = `ml-sm-wob-${Math.round(at * 1000)}`; // one per instance: each drives its own displacement
    if (p.edge_wobble) {
      const defs = el("defs", {});
      filt = el("filter", { id: wobId, x: "-20%", y: "-20%", width: "140%", height: "140%" }, defs);
      el("feTurbulence", { type: "fractalNoise", baseFrequency: (0.02 * (120 / r)).toFixed(4), numOctaves: "2", seed: "7", result: "n" }, filt);
      disp = el("feDisplacementMap", { in: "SourceGraphic", in2: "n", scale: "0", xChannelSelector: "R", yChannelSelector: "G" }, filt);
    }
    const g = el("g", {});
    const path = el("path", { "fill-rule": "nonzero" }, g);
    const hasBox = p.box && !small;
    const boxG = hasBox ? el("g", {}, g) : null;
    const boxR = boxG ? el("rect", { fill: "none", style: "stroke:var(--x-accent);stroke-width:1.5;", "vector-effect": "non-scaling-stroke" }, boxG) : null;
    const hs = Math.max(6, S * 0.014);
    const handles = boxG ? Array.from({ length: 8 }, () => el("rect", { width: hs, height: hs, style: "fill:var(--x-panel);stroke:var(--x-accent);stroke-width:1.5;" }, boxG)) : [];
    const mono = (txt) => { const d = doc.createElement("div"); d.dir = "ltr"; d.style.cssText = `position:absolute;white-space:nowrap;font:var(--x-label-weight) ${Math.max(14, S * 0.03).toFixed(1)}px var(--x-mono-font);letter-spacing:0.06em;color:var(--x-dim);opacity:0;`; d.textContent = txt; layer.append(d); return d; };
    const rot = hasBox ? mono("ROT 000.0°") : null, nameT = hasBox ? mono("SHAPE") : null, size = hasBox ? mono("W 0 × H 0") : null;
    if (hasBox) {
      const y0 = cy + r * 1.45, pad = (R.w - S) / 2 + S * 0.05; // the readouts sit with the shape, however wide the room
      rot.style.top = nameT.style.top = `${(cy - r * 1.45 - S * 0.06).toFixed(1)}px`;
      rot.style[rtl ? "right" : "left"] = `${pad}px`; nameT.style[rtl ? "left" : "right"] = `${pad}px`;
      size.style.top = `${y0.toFixed(1)}px`; size.style.left = `${cx}px`; size.style.translate = "-50% 0";
      size.style.padding = `${(S * 0.008).toFixed(1)}px ${(S * 0.02).toFixed(1)}px`; size.style.borderRadius = "var(--x-radius-s)"; size.style.background = "var(--x-panel)"; size.style.border = "1px solid var(--x-line)";
    }

    // ── timing, squeezed into the window ──
    const grow = 0.45, need = grow + (shapes.length - 1) * (p.morph + p.hold) + (own ? 0.25 : 0), room = Math.max(0.8, end - at - 0.2), k = Math.min(1, room / need);
    const mD = p.morph * k, hD = p.hold * k, gD = grow * k;
    const starts = shapes.slice(1).map((_, i) => at + gD + hD * 0.6 + i * (mD + hD));
    const cb = ML.bezier(0.65, 0, 0.35, 1);
    ctx.sfx(at, "pop.soft", 0.3);
    starts.forEach((s, i) => ctx.sfx(s + mD * 0.5, i === starts.length - 1 ? "pop" : "blip", 0.22));
    const COLS = ["var(--x-accent)", "var(--x-ink)"];
    // the rotation steps land the last shape on one of its own symmetries (a star upright, a triangle on its base)
    const SYM = { square: 90, squircle: 90, triangle: 120, star: 72, "soft-star": 45, hexagon: 60, diamond: 180, eye: 180 };
    const turn = (() => { const total = p.rotation * starts.length, sym = SYM[names[names.length - 1]]; return (sym ? Math.round(total / sym) * sym || total : total) / starts.length; })();
    const rv = starts[starts.length - 1] + mD + hD * 0.5; // a target underneath takes over here

    return {
      draw(t) {
        // which morph we're in
        let i = 0, u = 0;
        for (let j = 0; j < starts.length; j++) { if (t >= starts[j]) { i = j; u = cb(ML.lin(t, starts[j], starts[j] + mD)); } }
        const a = t >= starts[0] ? shapes[i] : shapes[0], b = t >= starts[0] ? shapes[i + 1] : shapes[0];
        const w = t >= starts[0] ? u : 0, idx = t >= starts[0] ? i : -1;
        const pts = a.map((q, j) => [q[0] + (b[j][0] - q[0]) * w, q[1] + (b[j][1] - q[1]) * w]);
        path.setAttribute("d", "M" + pts.map((q) => `${(q[0] * r).toFixed(2)} ${(q[1] * r).toFixed(2)}`).join("L") + "Z");
        const ca = COLS[Math.max(0, idx) % 2], cbb = COLS[(Math.max(0, idx) + 1) % 2];
        path.style.fill = idx < 0 ? COLS[0] : `color-mix(in srgb, ${ca} ${((1 - w) * 100).toFixed(1)}%, ${cbb})`;
        // rotation: one step per morph; scale: spring from a dot, then a 0.9 dip mid-morph
        const done = starts.filter((s) => t >= s + mD).length, steps = done + (idx >= 0 && t < starts[idx] + mD ? w : 0);
        const ang = dir * turn * steps;
        const g0 = ML.step(t - at, ML.SPRING.pop), sc = (0.2 + 0.8 * g0) * (idx >= 0 ? 1 - 0.1 * Math.sin(Math.PI * w) : 1);
        g.setAttribute("transform", `translate(${cx} ${cy}) rotate(${ang.toFixed(3)}) scale(${Math.max(0.0001, sc).toFixed(4)})`);
        const vis = t >= at ? 1 : 0;
        under.forEach((e) => { e.style.opacity = (1 - ML.lin(t, at, at + 0.25)).toFixed(4); });
        if (own) { const q = ML.ease(t, rv, rv + 0.2); own.style.opacity = q.toFixed(4); layer.style.opacity = (1 - q).toFixed(4); }
        g.style.opacity = String(vis * Math.min(1, ML.lin(t, at, at + 0.08)));
        guides.forEach((c, j) => { c.style.opacity = ML.ease(t, at + j * 0.05, at + 0.35 + j * 0.05).toFixed(4); });
        if (disp) {
          const live = idx >= 0 && t < starts[idx] + mD ? Math.sin(Math.PI * w) : 0;
          disp.setAttribute("scale", (6 * (r / 120) * live).toFixed(3));
          path.setAttribute("filter", live > 0.01 ? `url(#${wobId})` : "");
        }
        if (boxG) {
          let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
          for (const q of pts) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
          const pad = 0.08;
          [x0, y0, x1, y1] = [(x0 - pad) * r, (y0 - pad) * r, (x1 + pad) * r, (y1 + pad) * r];
          boxR.setAttribute("x", x0.toFixed(2)); boxR.setAttribute("y", y0.toFixed(2)); boxR.setAttribute("width", (x1 - x0).toFixed(2)); boxR.setAttribute("height", (y1 - y0).toFixed(2));
          const xm = (x0 + x1) / 2, ym = (y0 + y1) / 2, hk = hs / Math.max(0.2, sc);
          [[x0, y0], [xm, y0], [x1, y0], [x1, ym], [x1, y1], [xm, y1], [x0, y1], [x0, ym]].forEach(([x, y], j) => {
            handles[j].setAttribute("x", (x - hk / 2).toFixed(2)); handles[j].setAttribute("y", (y - hk / 2).toFixed(2));
            handles[j].setAttribute("width", hk.toFixed(2)); handles[j].setAttribute("height", hk.toFixed(2));
          });
          const bo = ML.ease(t, at + gD * 0.6, at + gD + 0.15);
          boxG.style.opacity = bo.toFixed(4);
          const deg = ((ang % 360) + 360) % 360;
          rot.textContent = `ROT ${deg.toFixed(1).padStart(5, "0")}°`;
          nameT.textContent = `SHAPE ${names[w > 0.5 && idx >= 0 ? idx + 1 : Math.max(0, idx)].toUpperCase()}`;
          size.textContent = `W ${Math.round((x1 - x0) * sc)} × H ${Math.round((y1 - y0) * sc)}`;
          [rot, nameT, size].forEach((d) => { d.style.opacity = bo.toFixed(4); });
        }
      },
    };
  },
});

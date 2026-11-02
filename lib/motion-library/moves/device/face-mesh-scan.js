// Face landmark mesh scan: over a portrait, 60–80 landmark points (3 px, light) pop in with a 0.008 s stagger, placed on
// the face's real features — jaw contour, hairline, brows, eyes, nose bridge and nostrils, outer and inner lips, cheek
// and forehead anchors — then connecting lines (1 px, 50 %) draw between neighbours (stroke-dashoffset, 0.4 s). Then
// 6–8 soft blobs (radial gradient) fade in on the zones being corrected, with a slow pulse; the mesh fades out 0.3 s
// after (unless kept). The face box is a param (shares of the picture), so the mesh sits on the actual face; with no
// picture, a flat portrait in the look's colours stands in. The picture itself is never scaled or blurred.
// Source: prompt-motion "oliahmed205-just-tried-opus-5-5" (reference only: rebuilt as our own code).
ML.define({
  id: "device.face-mesh-scan",
  category: "device",
  name: "Face landmark mesh scan",
  does: "Dots and lines of a face-tracking mesh draw over a portrait inside the screen, then soft highlights mark the zones being corrected.",
  says: ["tech", "precision", "proof"],
  energy: 3,
  targets: ["image", "screen"],
  duration: [1.2, 3],
  params: {
    density: { type: "number", range: [30, 120], default: 70 },
    highlights: { type: "number", range: [0, 10], default: 7 },
    highlight_color: { type: "text", default: "" }, // empty: a soft pink mixed from the look's warning colour
    keep_mesh: { type: "bool", default: false },
    face_x: { type: "number", range: [0, 1], default: 0.5 }, // the face's centre, as a share of the picture's width
    face_y: { type: "number", range: [0, 1], default: 0.47 }, // … and of its height
    face_size: { type: "number", range: [0.2, 1], default: 0.6 }, // the face's height (hairline to chin), as a share of the picture's height
  },
  pairs: ["camera.push-in", "ui.agent-windows-streaming"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:oliahmed205-just-tried-opus-5-5", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { p, at, end } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, text, parent) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (parent) parent.append(e); return e; };
    const layer = ctx.scene || ctx.stage;
    let pic = ctx.el && ctx.el.tagName === "IMG" ? ctx.el : null;
    let room, radius = "0px";
    let fx = p.face_x, fy = p.face_y, fsz = p.face_size;
    if (pic) {
      room = ctx.box(pic);
      radius = getComputedStyle(pic).borderRadius || "0px";
    } else {
      // no picture: a portrait card in the look's colours (head, hair, neck, shoulders)
      const host = mk("div", "position:absolute;left:var(--pic-x);top:var(--pic-y);width:var(--pic-w);height:var(--pic-h);z-index:4;display:flex;align-items:center;justify-content:center;background:var(--x-ground)", null, layer);
      const HW = ctx.f.pic.w, HH = ctx.f.pic.h, CH = Math.round(Math.min(HH * 0.92, HW * 1.1)), CW = Math.round(Math.min(HW * 0.9, CH * 0.82));
      const card = mk("div", `position:relative;width:${CW}px;height:${CH}px;overflow:hidden;border-radius:var(--x-radius);box-shadow:var(--x-shadow);background:linear-gradient(160deg, var(--x-panel-2), color-mix(in srgb, var(--x-accent-2) 35%, var(--x-panel-2)))`, null, host);
      const s = sv("svg", { viewBox: "0 0 100 120", preserveAspectRatio: "xMidYMid slice", width: CW, height: CH }, card);
      s.style.display = "block";
      const skin = "color-mix(in srgb, var(--x-accent-2) 22%, var(--x-panel))", shade = "color-mix(in srgb, var(--x-accent-2) 34%, var(--x-panel))", hair = "color-mix(in srgb, var(--x-ink) 82%, var(--x-accent))";
      sv("path", { d: "M14 120 C16 96 32 90 50 90 C68 90 84 96 86 120 Z", fill: "color-mix(in srgb, var(--x-accent) 70%, var(--x-ink))" }, s);
      sv("path", { d: "M42 74 L42 92 C46 96 54 96 58 92 L58 74 Z", fill: shade }, s);
      sv("path", { d: "M27 46 C26 30 36 20 50 20 C64 20 74 30 73 46 C73 62 64 78 50 79 C36 78 27 62 27 46 Z", fill: skin }, s);
      sv("path", { d: "M25 48 C21 26 34 13 51 14 C69 14 80 28 75 49 C73 38 68 31 60 29 C52 34 38 33 31 30 C27 35 26 41 25 48 Z", fill: hair }, s);
      sv("path", { d: "M36 44 q4 -2.5 8 0 M56 44 q4 -2.5 8 0", stroke: hair, "stroke-width": 1.2, fill: "none", "stroke-linecap": "round" }, s);
      sv("ellipse", { cx: 40, cy: 49, rx: 2.4, ry: 1.3, fill: hair }, s); sv("ellipse", { cx: 60, cy: 49, rx: 2.4, ry: 1.3, fill: hair }, s);
      sv("path", { d: "M50 50 L48 60 Q50 62 52 60", stroke: shade, "stroke-width": 1, fill: "none", "stroke-linecap": "round" }, s);
      sv("path", { d: "M44 67 Q50 70.5 56 67", stroke: "color-mix(in srgb, var(--x-bad) 45%, var(--x-panel))", "stroke-width": 1.6, fill: "none", "stroke-linecap": "round" }, s);
      room = ctx.box(card); radius = getComputedStyle(card).borderRadius;
      // the drawn face, hairline (y 30) to chin (y 79), in a 100 × 120 box shown with "slice"
      const k = Math.max(CW / 100, CH / 120), ox = (CW - 100 * k) / 2, oy = (CH - 120 * k) / 2;
      fx = (ox + 50 * k) / CW; fy = (oy + 54.5 * k) / CH; fsz = (49 * k) / CH;
    }
    const wrap = mk("div", `position:absolute;left:${room.x}px;top:${room.y}px;width:${room.w}px;height:${room.h}px;overflow:hidden;border-radius:${radius};z-index:6;pointer-events:none;background:linear-gradient(transparent, transparent);background-size:100% 101%`, null, layer);
    const svg = sv("svg", { width: room.w, height: room.h, viewBox: `0 0 ${room.w} ${room.h}` }, wrap);
    svg.style.cssText = "position:absolute;inset:0;overflow:visible";
    // the face box in px: height fh (hairline to chin), width 0.86 fh
    const fh = room.h * fsz, fw = fh * 0.86, cx = room.w * fx, cy = room.h * fy;
    const P = (x, y) => [cx + (x * fw) / 2, cy + (y * fh) / 2];
    // landmarks on the face's features (x, y in −1…1 of the face box), grouped; closed groups loop
    const groups = [];
    const G = (name, pts, closed = false, prio = 1) => groups.push({ name, pts, closed, prio });
    G("jaw", Array.from({ length: 17 }, (_, i) => { const a = (Math.PI * i) / 16; return [-Math.cos(a) * 0.92 * (1 - 0.22 * Math.sin(a)), -0.12 + Math.sin(a) * 1.07]; }), false, 0);
    G("hairline", Array.from({ length: 9 }, (_, i) => { const a = (Math.PI * (i + 1)) / 10; return [-Math.cos(a) * 0.86, -0.12 - Math.sin(a) * 0.8]; }), false, 2);
    for (const s of [-1, 1]) G("brow", Array.from({ length: 5 }, (_, j) => [s * (0.14 + 0.12 * j), -0.36 - 0.075 * Math.sin((Math.PI * (j + 0.5)) / 5)]), false, 0);
    for (const s of [-1, 1]) G("eye", Array.from({ length: 6 }, (_, j) => { const a = (Math.PI * 2 * j) / 6; return [s * 0.35 + Math.cos(a) * 0.16, -0.2 + Math.sin(a) * (j > 0 && j < 3 ? 0.055 : 0.075)]; }), true, 0);
    G("bridge", [[0, -0.22], [0, -0.08], [0, 0.06], [0, 0.2]], false, 1);
    G("nose", [[-0.17, 0.27], [-0.09, 0.33], [0, 0.35], [0.09, 0.33], [0.17, 0.27]], false, 0);
    G("lips", Array.from({ length: 12 }, (_, j) => { const a = (Math.PI * 2 * j) / 12; return [Math.cos(a) * 0.3, 0.58 + Math.sin(a) * (Math.sin(a) < 0 ? 0.1 : 0.13)]; }), true, 0);
    G("mouth", Array.from({ length: 8 }, (_, j) => { const a = (Math.PI * 2 * j) / 8; return [Math.cos(a) * 0.2, 0.58 + Math.sin(a) * 0.035]; }), true, 1);
    G("anchors", [[-0.62, 0.08], [0.62, 0.08], [-0.48, 0.34], [0.48, 0.34], [-0.3, 0.8], [0.3, 0.8], [-0.3, -0.62], [0.3, -0.62], [0, -0.66], [-0.58, -0.5], [0.58, -0.5], [-0.24, 0.08], [0.24, 0.08], [-0.74, -0.24], [0.74, -0.24], [0, 0.82], [-0.4, 0.58], [0.4, 0.58], [-0.12, -0.42], [0.12, -0.42]], false, 2);
    const total = groups.reduce((n, g) => n + g.pts.length, 0);
    const want = Math.round(ML.clamp(p.density, 30, 120));
    const r = Math.min(1, want / total);
    const points = []; // { x, y, g }
    const kept = groups.map((g, gi) => {
      // contours keep more of their points than anchors when thinned
      const share = g.prio === 0 ? Math.min(1, r * 1.25) : g.prio === 1 ? r : r * 0.75;
      const n = Math.max(g.closed ? 4 : 2, Math.round(g.pts.length * share));
      const idx = Array.from({ length: Math.min(n, g.pts.length) }, (_, j) => Math.round((j * (g.pts.length - (g.closed ? 0 : 1))) / Math.max(1, n - (g.closed ? 0 : 1))) % g.pts.length);
      return [...new Set(idx)].map((j) => { const [x, y] = P(...g.pts[j]); points.push({ x, y, g: gi }); return points.length - 1; });
    });
    // above the structured set: seeded fill points inside the face oval
    for (let i = 0; points.length < want && i < 400; i++) {
      const x = ML.rnd(i, 41) * 2 - 1, y = ML.rnd(i, 43) * 2 - 1;
      if ((x * x) / 0.7 + ((y - 0.05) * (y - 0.05)) / 0.85 > 1) continue;
      const [px, py] = P(x, y);
      if (points.some((q) => Math.hypot(q.x - px, q.y - py) < fw * 0.07)) continue;
      points.push({ x: px, y: py, g: -1 });
    }
    // edges: along each group's contour, then every point to its two nearest points of other groups
    const edges = new Set();
    const add = (a, b) => { if (a !== b) edges.add(a < b ? `${a}-${b}` : `${b}-${a}`); };
    kept.forEach((ids, gi) => { for (let j = 1; j < ids.length; j++) add(ids[j - 1], ids[j]); if (groups[gi].closed && ids.length > 2) add(ids[ids.length - 1], ids[0]); });
    points.forEach((q, i) => {
      const near = points.map((o, j) => ({ j, d: o.g === q.g && q.g !== -1 ? Infinity : Math.hypot(o.x - q.x, o.y - q.y) })).filter((o) => o.j !== i).sort((a, b) => a.d - b.d).slice(0, 2);
      near.forEach((o) => { if (o.d < fw * 0.42) add(i, o.j); });
    });
    const ink = "var(--x-pointer-edge)";
    const hl = p.highlight_color || "color-mix(in srgb, var(--x-bad) 55%, var(--x-pointer-edge))";
    // blobs first (under the mesh): zones on cheeks, forehead, chin, nose sides, under the eyes
    const zones = [[-0.5, 0.18], [0.52, 0.22], [0.08, -0.56], [-0.2, -0.5], [0.1, 0.86], [-0.24, 0.24], [0.28, 0.3], [0.42, -0.04], [-0.4, -0.06], [0.2, -0.62]];
    const nh = Math.round(ML.clamp(p.highlights, 0, 10));
    const gid = "fm" + Math.round(ML.rnd(room.w, room.h) * 1e6);
    const defs = sv("defs", {}, svg);
    const rg = sv("radialGradient", { id: gid }, defs);
    sv("stop", { offset: 0, "stop-color": hl, "stop-opacity": 0.85 }, rg); sv("stop", { offset: 0.55, "stop-color": hl, "stop-opacity": 0.35 }, rg); sv("stop", { offset: 1, "stop-color": hl, "stop-opacity": 0 }, rg);
    const blobs = zones.slice(0, nh).map(([x, y], i) => { const [bx, by] = P(x + (ML.rnd(i, 51) - 0.5) * 0.08, y + (ML.rnd(i, 53) - 0.5) * 0.08); const rr = fw * (0.06 + 0.05 * ML.rnd(i, 55)); return { e: sv("circle", { cx: bx.toFixed(1), cy: by.toFixed(1), r: rr.toFixed(1), fill: `url(#${gid})`, opacity: 0 }, svg), i }; });
    const mesh = sv("g", {}, svg);
    const lw = Math.max(1, fw * 0.0035);
    const lines = [...edges].map((k, i) => { const [a, b] = k.split("-").map(Number); return { e: sv("line", { x1: points[a].x.toFixed(1), y1: points[a].y.toFixed(1), x2: points[b].x.toFixed(1), y2: points[b].y.toFixed(1), stroke: ink, "stroke-opacity": 0.5, "stroke-width": lw.toFixed(2), pathLength: 1, "stroke-dasharray": 1, "stroke-dashoffset": 1 }, mesh), i, o: Math.min(a, b) }; });
    const pr = Math.max(1.5, fw * 0.008);
    const dots = points.map((q) => sv("circle", { cx: q.x.toFixed(1), cy: q.y.toFixed(1), r: 0, fill: ink }, mesh));
    // timing
    const st = 0.008;
    const lineA = at + points.length * st * 0.6;
    const hA = lineA + 0.55;
    const meshOut = hA + 0.3 + Math.max(0, nh - 1) * 0.06;
    ctx.sfx(at, "blip", 0.3);
    ctx.sfx(lineA + 0.1, "blip", 0.2);
    if (nh) ctx.sfx(hA, "pop.soft", 0.25);
    const leave = Math.max(meshOut + 0.5, end - 0.3);
    return {
      draw(t) {
        const gone = ML.ease(t, leave, leave + 0.25);
        wrap.style.opacity = (1 - gone).toFixed(4);
        // repaint the overlay whole every frame, so its sub-pixel dots never depend on which tiles the last frame touched
        wrap.style.backgroundPosition = `0 ${(ML.rnd(Math.round(t * 1000), 3) * 0.01).toFixed(4)}%`;
        const mo = p.keep_mesh ? 1 : 1 - ML.ease(t, meshOut, meshOut + 0.3);
        mesh.setAttribute("opacity", mo.toFixed(4));
        dots.forEach((d, i) => { const a = at + i * st; d.setAttribute("r", (pr * Math.max(0, ML.back(t, a, a + 0.18, 2.2)) * (t >= a ? 1 : 0)).toFixed(2)); });
        lines.forEach((l) => { const a = lineA + (l.o / Math.max(1, points.length)) * 0.25; l.e.setAttribute("stroke-dashoffset", (1 - ML.ease(t, a, a + 0.4)).toFixed(4)); });
        blobs.forEach(({ e, i }) => { const a = hA + i * 0.06, v = ML.ease(t, a, a + 0.3); const pulse = 0.82 + 0.18 * Math.sin(((t - a) / 0.9) * Math.PI * 2); e.setAttribute("opacity", (v * (t > a ? pulse : 1)).toFixed(4)); });
      },
    };
  },
});

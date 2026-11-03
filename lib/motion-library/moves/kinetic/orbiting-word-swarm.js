// Orbiting word swarm: words in mixed faces (italic serif, the headline sans, mono, hand) and 3–4 look colours sit on
// circular orbits of radius 15–55% of the frame around its centre, each rotated along its path (so it passes upside
// down at the bottom) and orbiting at ±(0.6–1.6)·spin deg/s, seeded per word. A new word spawns one per beat
// (0.6 → 1, back-out over 0.3 s), the count growing to `count` — thoughts multiplying. Behind: expanding rings and / or
// a rotating wireframe cube (projected per frame). Every position is a closed function of t.
// Source: our own rebuild of prompt-motion "gizakdag-overthinking-a-film-by" — reference only.
ML.define({
  id: "kinetic.orbiting-word-swarm",
  category: "kinetic",
  name: "Orbiting word swarm",
  does: "Words in mixed fonts and colours accumulate and spin around a centre on circular paths, crowding the frame as thoughts multiply.",
  says: ["problem", "energy", "story"],
  energy: 4,
  targets: ["word", "list", "stage"],
  duration: [2, 8],
  params: {
    count: { type: "number", range: [5, 30], default: 20 },
    spin: { type: "number", range: [10, 45], default: 25, unit: "deg/s" },
    fonts: { type: "choice", options: ["mixed", "single"], default: "mixed" },
    seed: { type: "number", range: [1, 9999], default: 3 },
    backdrop: { type: "choice", options: ["rings", "cube", "both", "none"], default: "both" },
    keep_target: { type: "bool", default: true },
    layer: { type: "choice", options: ["front", "behind"], default: "front" },
  },
  pairs: ["text-in.punchline", "background.film-grain"],
  avoid: ["calm", "luxury", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "riser",
  source: { from: "prompt-motion:gizakdag-overthinking-a-film-by", license: "reference", note: "our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    const host = ctx.scene || ctx.stage, doc = host.ownerDocument;
    const W = ctx.f.W, H = ctx.f.H, m = Math.min(W, H), k = m / 1080;
    const isStage = !el || el === ctx.stage;
    const textOf = (n) => (n.textContent || "").replace(/\s+/g, " ").trim();
    let pool = [];
    if (!isStage && el.children.length > 1) pool = [...el.children].map(textOf).filter(Boolean);
    else if (!isStage) pool = textOf(el).split(" ");
    if (pool.length < 4) pool = pool.concat([...host.querySelectorAll(".ml-title, .ml-sub, .ml-label")].flatMap((n) => textOf(n).split(" ")));
    if (pool.length < 2) pool = pool.concat((ctx.words || []).map((w) => w.w));
    pool = [...new Set(pool.map((w) => w.replace(/[.,،؛!?؟:]+$/, "")).filter(Boolean))];
    if (!pool.length) return null;
    const n = Math.max(5, Math.min(30, Math.round(p.count)));
    const layer = doc.createElement("div");
    Object.assign(layer.style, { position: "absolute", inset: "0", overflow: "hidden", pointerEvents: "none", zIndex: p.layer === "front" ? "4" : "0", direction: "ltr" });
    // front: the swarm crowds over the scene, the target word kept above it; behind: under the scene's own content
    if (p.layer === "front") {
      host.append(layer);
      if (!isStage && p.keep_target) { if (getComputedStyle(el).position === "static") el.style.position = "relative"; el.style.zIndex = "5"; }
    } else host.prepend(layer);
    const cx = W / 2, cy = H / 2;
    // backdrop: expanding rings, a wireframe cube
    const rings = [];
    if (p.backdrop === "rings" || p.backdrop === "both") for (let i = 0; i < 4; i++) {
      const r = doc.createElement("div");
      Object.assign(r.style, { position: "absolute", left: cx + "px", top: cy + "px", width: "0", height: "0", boxSizing: "border-box", borderRadius: "50%", border: `${Math.max(2, 3 * k)}px solid ${i % 2 ? "var(--x-accent-2)" : "var(--x-accent)"}` });
      layer.append(r); rings.push(r);
    }
    let cube = null;
    const NS = "http://www.w3.org/2000/svg";
    if (p.backdrop === "cube" || p.backdrop === "both") {
      cube = doc.createElementNS(NS, "svg");
      cube.setAttribute("width", String(W)); cube.setAttribute("height", String(H));
      Object.assign(cube.style, { position: "absolute", left: "0", top: "0" });
      layer.append(cube);
    }
    const edges = [[0, 1], [1, 3], [3, 2], [2, 0], [4, 5], [5, 7], [7, 6], [6, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    const lines = cube ? edges.map(() => { const l = doc.createElementNS(NS, "line"); l.style.stroke = "var(--x-accent)"; l.setAttribute("stroke-width", String(Math.max(1, 2 * k))); l.setAttribute("opacity", "0.55"); cube.append(l); return l; }) : [];
    // the words
    const FACES = ["var(--x-serif-font)", "var(--x-head-font)", "var(--x-mono-font)", "var(--x-hand-font)"];
    const INKS = ["var(--x-ink)", "var(--x-accent)", "var(--x-accent-2)", "var(--x-dim)"];
    const S = p.seed;
    // one spawn per beat across the first ~60% of the move, so every word gets on however short the move is
    const beat = Math.min(0.5, ((end - at) * 0.6) / n);
    const ws = [];
    for (let i = 0; i < n; i++) {
      const w = doc.createElement("span");
      w.textContent = pool[i % pool.length];
      const face = p.fonts === "mixed" ? Math.floor(ML.rnd(i, S + 1) * FACES.length) : 1;
      const size = (0.03 + 0.06 * ML.rnd(i, S + 2)) * m;
      Object.assign(w.style, { position: "absolute", left: "0", top: "0", whiteSpace: "nowrap", fontFamily: FACES[face], fontStyle: face === 0 && !rtl ? "italic" : "normal", fontWeight: face === 1 ? "700" : "400", fontSize: size.toFixed(1) + "px", color: INKS[Math.floor(ML.rnd(i, S + 3) * INKS.length)], direction: rtl ? "rtl" : "ltr", willChange: "transform" });
      layer.append(w);
      ws.push({
        w, hw: w.offsetWidth / 2, hh: w.offsetHeight / 2,
        r: (0.15 + 0.4 * Math.pow(ML.rnd(i, S + 4), 1.4)) * ((W + H) / 2), // 15–55% of the frame: the orbits reach its long side too
        a0: ML.rnd(i, S + 5) * 360,
        om: (ML.rnd(i, S + 6) > 0.5 ? 1 : -1) * p.spin * (0.6 + ML.rnd(i, S + 7)),
        born: at + i * beat,
      });
    }
    ctx.sfx(at, "riser", 0.3);
    ws.forEach((x, i) => i % 4 === 0 && ctx.sfx(x.born, "pop.soft", 0.15));
    const hideTarget = !isStage && !p.keep_target;
    return {
      draw(t) {
        const leave = ML.ease(t, end - 0.35, end - 0.05);
        layer.style.visibility = t >= at - 1e-6 && leave < 1 ? "visible" : "hidden";
        layer.style.opacity = (1 - leave).toFixed(4);
        for (const x of ws) {
          const a = ML.lin(t, x.born, x.born + 0.3);
          const sc = t < x.born ? 0.6 : 0.6 + 0.4 * ML.back(t, x.born, x.born + 0.3, 1.7);
          const th = ((x.a0 + x.om * (t - at)) * Math.PI) / 180;
          const px = cx + x.r * Math.cos(th) - x.hw, py = cy + x.r * Math.sin(th) - x.hh;
          // tangent to the orbit: the word's baseline follows the circle, upside down at the bottom
          const rot = (th * 180) / Math.PI + 90;
          x.w.style.transform = `translate(${px.toFixed(2)}px, ${py.toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
          x.w.style.opacity = a.toFixed(4);
        }
        rings.forEach((r, i) => {
          const u = (((t - at) / 2.4 + i / rings.length) % 1 + 1) % 1, d = u * Math.hypot(W, H) * 1.05;
          Object.assign(r.style, { width: d + "px", height: d + "px", marginLeft: -d / 2 + "px", marginTop: -d / 2 + "px", opacity: ((1 - u) * 0.7 * ML.lin(t, at, at + 0.4)).toFixed(4) });
        });
        if (cube) {
          const s = m * 0.2, ay = (t - at) * 0.7, ax = 0.5 + (t - at) * 0.35;
          const P = [];
          for (let v = 0; v < 8; v++) {
            let X = v & 1 ? s : -s, Y = v & 2 ? s : -s, Z = v & 4 ? s : -s;
            [X, Z] = [X * Math.cos(ay) + Z * Math.sin(ay), -X * Math.sin(ay) + Z * Math.cos(ay)];
            [Y, Z] = [Y * Math.cos(ax) - Z * Math.sin(ax), Y * Math.sin(ax) + Z * Math.cos(ax)];
            const f = 900 * k / (900 * k + Z + s * 3);
            P.push([cx + X * f, cy + Y * f]);
          }
          edges.forEach(([i, j], e) => { const l = lines[e]; l.setAttribute("x1", P[i][0].toFixed(1)); l.setAttribute("y1", P[i][1].toFixed(1)); l.setAttribute("x2", P[j][0].toFixed(1)); l.setAttribute("y2", P[j][1].toFixed(1)); });
        }
        if (hideTarget) el.style.opacity = t >= at ? "0" : "";
      },
    };
  },
});

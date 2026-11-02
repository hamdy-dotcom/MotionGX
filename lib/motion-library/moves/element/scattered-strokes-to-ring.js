// Scattered strokes converge into a ring: hand-drawn open curves (U / bracket shapes, thin, dim ink at 80 %) wait at
// seeded spots and angles, fade in one by one (0.1 s apart), then each travels to its slot — a ring (angle i·360/n,
// turned to face the centre), a grid or a line — over 1.2 s power3.inOut while its points boil (±2 px at 6 Hz, seeded
// per beat of the boil so a frame is still a pure function of t). Then the whole ring tightens (r 140 → 100) and turns
// 20° (the other way in Arabic). Separate pieces become one system.
// Source: prompt-motion "micheleharmonic-i-made-this-with" (reference only — rebuilt as our own code).
ML.define({
  id: "element.scattered-strokes-to-ring",
  category: "element",
  name: "Scattered strokes converge into a ring",
  does: "Hand-drawn curved strokes drift in from scattered positions and arrange into an evenly spaced circle.",
  says: ["connection", "story", "change"],
  energy: 2,
  targets: ["shape"],
  duration: [1.5, 3],
  params: {
    count: { type: "number", range: [5, 16], default: 10 },
    arrangement: { type: "choice", options: ["ring", "grid", "line"], default: "ring" },
    boil: { type: "bool", default: true },
    backdrop: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "element.shape-morph"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:micheleharmonic-i-made-this-with", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const ob = own ? ctx.box(own) : null;
    const R = ob && ob.w > f.W * 0.3 && ob.h > f.H * 0.15 ? ob : f.pic;
    const layer = doc.createElement("div");
    layer.style.cssText = `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;`;
    host.append(layer);
    if (p.backdrop) {
      const b = doc.createElement("div");
      b.style.cssText = "position:absolute;inset:0;border-radius:var(--x-radius);background:var(--x-ground);";
      layer.append(b);
    }
    const svg = doc.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${R.w} ${R.h}`);
    svg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;overflow:visible;";
    layer.append(svg);

    const n = Math.round(ML.clamp(p.count, 5, 16));
    const cx = R.w / 2, cy = R.h / 2, S = Math.min(R.w, R.h);
    const r0 = S * 0.34, r1 = r0 * (100 / 140); // the technique's 140 → 100, relative to the room
    const len = Math.min(S * 0.13, ((2 * Math.PI * r0) / n) * 0.62); // each stroke's span
    const sw = Math.max(2, S * 0.008), dir = rtl ? -1 : 1;
    const jit = Math.max(2, S * 0.004); // ±2 px boil at 1080, relative to the room

    // slots: ring / grid / line (centre-relative), each with the angle its stroke faces
    const slots = [];
    if (p.arrangement === "grid") {
      const cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols), gap = Math.min((R.w * 0.7) / cols, (R.h * 0.7) / rows);
      for (let i = 0; i < n; i++) { const c = i % cols, r = Math.floor(i / cols); slots.push({ x: dir * (c - (cols - 1) / 2) * gap, y: (r - (rows - 1) / 2) * gap, a: 0 }); }
    } else if (p.arrangement === "line") {
      const gap = Math.min((R.w * 0.86) / n, len * 1.25);
      for (let i = 0; i < n; i++) slots.push({ x: dir * (i - (n - 1) / 2) * gap, y: 0, a: i % 2 ? 180 : 0 });
    } else {
      for (let i = 0; i < n; i++) { const ang = (i * 360) / n - 90; const rad = (ang * Math.PI) / 180; slots.push({ x: Math.cos(rad) * r0, y: Math.sin(rad) * r0, a: ang - 90 }); }
    }
    // the strokes: an open U / bracket curve each, a little different in depth and lean
    const strokes = slots.map((s, i) => {
      const path = doc.createElementNS(NS, "path");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("style", `stroke:var(--x-dim);stroke-opacity:.8;stroke-width:${sw.toFixed(2)};`);
      svg.append(path);
      const w = len / 2, h = len * (0.28 + ML.rnd(i, 3) * 0.22), lean = (ML.rnd(i, 4) - 0.5) * len * 0.12;
      const pts = [[-w, -h * 0.4], [-w * 0.95 + lean, h], [w * 0.95 + lean, h], [w, -h * 0.4]];
      // scattered start: anywhere in the room away from the centre, any angle
      const sa = ML.rnd(i, 7) * Math.PI * 2, sd = S * (0.25 + ML.rnd(i, 8) * 0.25);
      return { path, pts, x0: Math.cos(sa) * sd * (R.w / S), y0: Math.sin(sa) * sd * (R.h / S), a0: (ML.rnd(i, 9) - 0.5) * 300, ...s };
    });

    // timing, squeezed if the window is short
    const span = Math.max(1.2, end - at), k = ML.clamp(span / 2.8, 0.55, 1);
    const fadeGap = Math.min(0.1, (0.9 * k) / n), travel0 = at + 0.2 * k, travel = 1.2 * k, gap = Math.min(0.04, 0.4 / n);
    const settle0 = travel0 + travel + gap * (n - 1), settle = 0.8 * k;
    const p3io = (x) => (x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2);
    ctx.sfx(travel0, "whoosh.soft", 0.3);
    ctx.sfx(settle0, "land.light", 0.25);
    const g = doc.createElementNS(NS, "g");
    svg.append(g);
    strokes.forEach((s) => g.append(s.path));

    return {
      draw(t) {
        const beat = p.boil ? Math.floor(t * 6) : 0;
        const q = p3io(ML.lin(t, settle0, settle0 + settle));
        const ringS = p.arrangement === "ring" ? 1 + (r1 / r0 - 1) * q : 1 - 0.12 * q;
        const ringR = (p.arrangement === "ring" ? 20 : 0) * q * dir;
        g.setAttribute("transform", `translate(${cx} ${cy}) rotate(${ringR.toFixed(3)}) scale(${ringS.toFixed(4)})`);
        strokes.forEach((s, i) => {
          const o = ML.ease(t, at + i * fadeGap, at + i * fadeGap + 0.3);
          const u = p3io(ML.lin(t, travel0 + i * gap, travel0 + i * gap + travel));
          // drift while waiting, then travel to the slot
          const drift = (1 - u) * Math.sin((t - at) * 1.3 + i) * S * 0.01;
          const x = s.x0 + (s.x - s.x0) * u, y = s.y0 + (s.y - s.y0) * u + drift, a = s.a0 + (s.a - s.a0) * u;
          const d = s.pts.map(([px, py], j) => {
            const jx = p.boil ? (ML.rnd(i * 13 + j, beat) - 0.5) * 2 * jit : 0, jy = p.boil ? (ML.rnd(i * 17 + j, beat + 0.5) - 0.5) * 2 * jit : 0;
            return [(px + jx).toFixed(2), (py + jy).toFixed(2)];
          });
          s.path.setAttribute("d", `M${d[0][0]} ${d[0][1]} C${d[1][0]} ${d[1][1]} ${d[2][0]} ${d[2][1]} ${d[3][0]} ${d[3][1]}`);
          s.path.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${a.toFixed(2)})`);
          s.path.style.opacity = o.toFixed(4);
        });
        layer.style.opacity = t < at - 0.01 ? "0" : "1";
      },
    };
  },
});

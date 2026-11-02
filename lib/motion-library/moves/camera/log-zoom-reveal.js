// Log zoom reveal: from one small element (the seed) the camera keeps zooming out at a constant perceived speed across
// a world canvas, while frames and pieces appear around it, until the whole board is in view (or the reverse: dives
// from the whole board into the seed). The scale runs in log space, s(t) = s0·(s1/s0)^e(p) with e = power2.inOut, over
// `range` (2–50×) in `duration` seconds — so the speed feels the same at every scale. Anchor: "seed" keeps the seed's
// centre fixed on screen; "centre" starts it in the middle of the frame and lets it drift to its place; "corner"
// starts it in the top reading corner. With build_in every piece (the scene's own blocks plus a board of thin frames
// with cell labels and rulers) pops in (opacity 0 → 1 in 0.2 s) as the widening view reaches it, staggered by its
// distance from the seed. Frame strokes stay one screen pixel at every scale (non-scaling stroke, recomputed per frame);
// a picture stays hidden while the zoom would enlarge it past its own pixels. zoom_indicator: a live % in a corner.
// Source: prompt-motion kikelopezdesign-lol-i-asked-opus + ddryo-loos-bgm-opus-5-5-lism-css (reference only: our own rebuild).
ML.define({
  id: "camera.log-zoom-reveal",
  category: "camera",
  name: "Continuous log zoom out (or in) across a growing world",
  does: "From one tiny element the camera keeps zooming out at a constant perceived speed across a canvas while frames and larger pieces appear, until the whole board or structure is visible.",
  says: ["scale", "growth", "reveal", "proof"],
  energy: 3,
  targets: ["stage", "scene", "card"],
  duration: [1.2, 5],
  params: {
    direction: { type: "choice", options: ["out", "in"], default: "out" },
    range: { type: "number", range: [2, 50], default: 12, unit: "x" },
    duration: { type: "number", range: [1, 4], default: 1.5, unit: "s" },
    anchor: { type: "choice", options: ["seed", "centre", "corner"], default: "seed" },
    build_in: { type: "bool", default: true },
    zoom_indicator: { type: "bool", default: false },
  },
  pairs: ["text-in.soft-rise", "camera.impact-shake"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:kikelopezdesign-lol-i-asked-opus", license: "reference", note: "our own rebuild; also prompt-motion:ddryo-loos-bgm-opus-5-5-lism-css" },
  setup(ctx) {
    const { el, p, at, stage, f } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, unit = Math.min(W, H) / 1080;
    // the world: every part of the scene moves into one wrapper the camera scales
    const world = document.createElement("div");
    world.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;transform-origin:0 0";
    while (host.firstChild) world.append(host.firstChild);
    host.append(world);

    // the seed: the target card, else the richest small block in the picture region (measured by its content, so a
    // wide block holding a short number counts as the number), else the headline
    const contentBox = (n) => {
      if (n.tagName === "IMG" || n.tagName === "svg" || n.tagName === "SVG" || n.children.length) return ctx.box(n);
      const r = document.createRange(); r.selectNodeContents(n);
      const s0 = stage.getBoundingClientRect(), k = s0.width / (stage.offsetWidth || 1) || 1, b = r.getBoundingClientRect();
      return b.width ? { x: (b.left - s0.left) / k, y: (b.top - s0.top) / k, w: b.width / k, h: b.height / k } : ctx.box(n);
    };
    let seed = el && el !== stage && el !== host ? el : null;
    let sb = seed ? contentBox(seed) : null;
    if (!seed) {
      let best = null;
      for (const n of host.querySelectorAll(".ml-pic *")) {
        if (n.closest("svg") && n.tagName.toLowerCase() !== "svg") continue;
        const b = contentBox(n), a = b.w * b.h;
        if (a < (W * H) / 400 || a > (W * H) / 12) continue;
        const score = a * Math.sqrt(Math.min(b.w, b.h) / Math.max(b.w, b.h)); // compact blocks make the best seeds
        if (!best || score > best.score) best = { n, b, score };
      }
      if (best) { seed = best.n; sb = best.b; }
    }
    if (!seed) { seed = host.querySelector(".ml-head") || null; sb = seed ? contentBox(seed) : null; }
    if (!sb) sb = { x: W / 2 - 60, y: H / 2 - 60, w: 120, h: 120 };
    const S = { x: sb.x + sb.w / 2, y: sb.y + sb.h / 2 };

    // the board: thin cell frames tiling the safe area, with labels, and rulers along two edges
    const board = document.createElement("div");
    board.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:0";
    world.insertBefore(board, world.firstChild);
    const cols = f.wide ? 6 : 4, rows = f.wide ? 4 : f.tall ? 7 : 5;
    const gx = f.safe.x - f.m * 0.5, gy = f.safe.y - f.m * 0.5, gw = f.safe.w + f.m, gh = f.safe.h + f.m;
    const frames = [];
    const pieces = []; // { node, d } with d = distance from the seed's centre
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const x = gx + (i / cols) * gw, y = gy + (j / rows) * gh, w = gw / cols, h = gh / rows;
      const c = document.createElement("div");
      c.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;box-sizing:border-box;border:1px solid var(--x-line)`;
      const lab = document.createElement("div");
      lab.className = "ml-label";
      lab.textContent = `${String.fromCharCode(65 + (ctx.rtl ? cols - 1 - i : i))}${j + 1}`;
      lab.style.cssText = `position:absolute;${ctx.rtl ? "right" : "left"}:8px;top:6px;font-size:${(14 * unit).toFixed(1)}px;opacity:0.55;direction:ltr`;
      c.append(lab);
      board.append(c);
      frames.push(c);
      pieces.push({ node: c, d: Math.hypot(x + w / 2 - S.x, y + h / 2 - S.y) });
    }
    // the scene's own blocks are pieces too (the seed and whatever holds it stay on from the first frame)
    const blocks = [...world.querySelectorAll(".ml-head > *, .ml-pic > *, .ml-pic > * > *, .ml-safe > *")].filter((n) => n !== seed && !n.contains(seed) && !seed?.contains(n));
    for (const n of blocks) { const b = ctx.box(n); pieces.push({ node: n, d: Math.hypot(b.x + b.w / 2 - S.x, b.y + b.h / 2 - S.y) }); }
    // pictures: never shown enlarged past their pixels
    const pics = [...world.querySelectorAll("img")].map((img) => { const b = ctx.box(img); return { img, max: img.naturalWidth && b.w ? img.naturalWidth / b.w : 1 }; });

    let ind = null;
    if (p.zoom_indicator) {
      ind = document.createElement("div");
      ind.className = "ml-label";
      ind.style.cssText = `position:absolute;${ctx.rtl ? "left" : "right"}:${f.m}px;bottom:${Math.max(40, H - f.safe.y - f.safe.h - 40)}px;z-index:8;padding:8px 14px;border-radius:var(--x-radius-s);background:var(--x-panel);color:var(--x-ink);border:var(--x-edge) solid var(--x-edge-color);direction:ltr;font-variant-numeric:tabular-nums`;
      host.append(ind);
    }

    // the deepest zoom: `range`, but never past the point where the seed alone overfills the frame (it stays readable)
    const R = Math.max(1.5, Math.min(ML.clamp(p.range, 2, 50), 0.8 * Math.min(W / Math.max(1, sb.w), H / Math.max(1, sb.h))));
    const D = ML.clamp(p.duration, 1, 4);
    const out = p.direction !== "in";
    const p2 = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    // where the seed's centre sits on screen at the zoomed-in end of the move
    const start = p.anchor === "centre" ? { x: W / 2, y: H / 2 } : p.anchor === "corner" ? { x: ctx.rtl ? W * 0.68 : W * 0.32, y: H * 0.3 } : { x: S.x, y: S.y };
    const half = Math.hypot(W, H) / 2;
    ctx.sfx(at, "whoosh.soft", 0.3);
    ctx.sfx(at + D * 0.85, "land.light", 0.18);
    return {
      draw(t) {
        const e = p2(ML.lin(t, at, at + D));
        const q = out ? e : 1 - e; // 0 = zoomed in on the seed, 1 = the whole board
        const s = Math.pow(R, 1 - q); // log-space: R → 1
        const P = { x: start.x + (S.x - start.x) * q, y: start.y + (S.y - start.y) * q };
        world.style.transform = `translate(${(P.x - s * S.x).toFixed(2)}px, ${(P.y - s * S.y).toFixed(2)}px) scale(${s.toFixed(5)})`;
        // non-scaling stroke on the frames
        const bw = (1 / s).toFixed(4) + "px";
        for (const c of frames) c.style.borderWidth = bw;
        if (p.build_in) {
          // the view's reach around the seed in world units; a piece comes in 0.2 s after the view reaches it
          for (const pc of pieces) {
            // when (in q) the reach half/s first covers this piece: s = half/d → q = 1 − log(half/d)/log(R)
            const qIn = pc.d <= half / R ? 0 : ML.clamp(1 - Math.log(half / pc.d) / Math.log(R));
            // map q back to time on the eased clock, then fade over 0.2 s (in "in" mode the pieces leave in reverse)
            const tIn = at + D * invEase(out ? qIn : 1 - qIn);
            const o = out ? ML.lin(t, tIn, tIn + 0.2) : 1 - ML.lin(t, tIn - 0.2, tIn);
            pc.node.style.opacity = o.toFixed(4);
          }
        }
        for (const pi of pics) if (s > pi.max * 1.001) pi.img.style.visibility = "hidden"; else pi.img.style.visibility = "";
        if (ind) ind.textContent = `${Math.round(35 * s)}%`;
      },
    };
    function invEase(y) {
      // the inverse of power2.inOut
      y = ML.clamp(y);
      return y < 0.5 ? Math.sqrt(y / 2) : 1 - Math.sqrt((1 - y) / 2);
    }
  },
});

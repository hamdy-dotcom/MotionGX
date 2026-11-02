// Tangle straightens: chaos to order. A scribble — N tangled strands drawn as one knot on a dark ground, trembling a
// little — pulls taut into N evenly spaced horizontal lines (point-for-point path interpolation, every strand resampled
// to the same number of points as its line, so the morph has no jumps) over 0.4 s on cubic-bezier(0.7, 0, 0.2, 1),
// while the ground crossfades dark -> pale (the look's ink to its ground) in the same time and the strokes turn from
// pale to dark. Then the lines converge to one y over 0.3 s — the headline's baseline when the scene has one, which it
// underlines as the scene's own content comes up with the light — or stay as a ruled block that fades. Strokes
// scale with the frame. On a shape target, it plays inside that shape's box and leaves the scene alone.
// Source: prompt-motion 1littlecoder-this-is-crazy-i (reference only: our own rebuild).
ML.define({
  id: "transition.tangle-straighten-to-lines",
  category: "transition",
  name: "Tangle straightens",
  does: "A scribble pulls taut into a set of horizontal lines as the background flips light, then they merge into one baseline.",
  says: ["simplicity", "relief", "change", "transition"],
  energy: 3,
  targets: ["scene", "shape"],
  duration: [1, 1.7],
  params: {
    lines: { type: "number", range: [3, 8], default: 5 },
    end: { type: "choice", options: ["one-baseline", "stay"], default: "one-baseline" },
  },
  pairs: ["text-in.punchline", "text-emphasis.underline-draw"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:1littlecoder-this-is-crazy-i", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const onShape = !!(ctx.el && ctx.el !== stage && ctx.el !== scene);
    const W = f.W, H = f.H, k = Math.min(W, H) / 1080;
    const N = Math.round(ML.clamp(+p.lines || 5, 3, 8));
    const M = 64; // points per strand / line
    // the box it plays in: the shape's, else the middle of the safe region
    const bx = onShape ? ctx.box(ctx.el) : { x: f.safe.x + f.safe.w * 0.08, y: f.safe.y + f.safe.h * 0.3, w: f.safe.w * 0.84, h: f.safe.h * 0.4 };
    // where the lines converge: under the headline when the scene has one
    const head = !onShape && scene.querySelector(".ml-title");
    const hb = head ? ctx.box(head) : null;
    let baseY = bx.y + bx.h / 2, baseX0 = bx.x, baseX1 = bx.x + bx.w;
    if (hb) {
      // the headline's last line: measure its text, not its block
      const r = document.createRange(); r.selectNodeContents(head);
      const rs = [...r.getClientRects()], s = stage.getBoundingClientRect(), kk = s.width / (stage.offsetWidth || 1) || 1;
      if (rs.length) {
        const last = rs.reduce((a, b) => (b.bottom > a.bottom + 1 ? b : a), rs[0]);
        const row = rs.filter((x) => Math.abs(x.bottom - last.bottom) < 2);
        baseX0 = (Math.min(...row.map((x) => x.left)) - s.left) / kk;
        baseX1 = (Math.max(...row.map((x) => x.right)) - s.left) / kk;
        baseY = (last.bottom - s.top) / kk + 10 * k;
      } else { baseY = hb.y + hb.h + 10 * k; baseX0 = hb.x; baseX1 = hb.x + hb.w; }
    }
    // the knot: each strand a seeded random walk of loops around the box's middle, smoothed, resampled to M points
    const cx = bx.x + bx.w / 2, cy = bx.y + bx.h / 2, rx = bx.w * 0.42, ry = Math.min(bx.h * 0.48, bx.w * 0.42);
    const strands = [];
    for (let s = 0; s < N; s++) {
      const pts = [];
      const loops = 2.2 + ML.rnd(s, 3) * 1.6, ph = ML.rnd(s, 4) * Math.PI * 2;
      for (let i = 0; i < M; i++) {
        const u = i / (M - 1), a = ph + u * Math.PI * 2 * loops;
        const wob = 0.55 + 0.45 * Math.sin(u * 9.0 + s * 1.7) * (ML.rnd(s * 100 + i, 5) * 0.4 + 0.6);
        pts.push([cx + Math.cos(a * (1 + 0.3 * ML.rnd(s, 6))) * rx * wob + (ML.rnd(s * 100 + i, 7) - 0.5) * rx * 0.25,
                  cy + Math.sin(a * 1.3) * ry * wob + (ML.rnd(s * 100 + i, 8) - 0.5) * ry * 0.25]);
      }
      strands.push(pts);
    }
    // the lines: N evenly spaced across the box, left to right in reading order (right to left in Arabic, so the morph
    // pulls each strand taut toward its reading end)
    const gap = bx.h / (N + 1);
    const lineAt = (s, i) => {
      const u = i / (M - 1), x = ctx.rtl ? bx.x + bx.w * (1 - u) : bx.x + bx.w * u;
      return [x, bx.y + gap * (s + 1)];
    };
    const NS = "http://www.w3.org/2000/svg";
    const layer = document.createElement("div");
    layer.dataset.mlFx = "1";
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:6";
    const ground = document.createElement("div");
    ground.style.cssText = "position:absolute;inset:0;background:var(--x-ink)";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", String(W)); svg.setAttribute("height", String(H)); svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.style.cssText = "position:absolute;left:0;top:0;overflow:visible";
    const paths = strands.map(() => {
      const pa = document.createElementNS(NS, "path");
      pa.setAttribute("fill", "none"); pa.setAttribute("stroke-linecap", "round"); pa.setAttribute("stroke-linejoin", "round");
      pa.setAttribute("stroke-width", (Math.max(2, 5 * k)).toFixed(2));
      svg.append(pa);
      return pa;
    });
    if (!onShape) layer.append(ground);
    layer.append(svg);
    scene.append(layer);
    const content = onShape ? [] : [...scene.children].filter((c) => !c.dataset.mlFx);

    // a smooth path through points (Catmull-Rom as cubic Béziers)
    const d = (pts) => {
      let s = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
        s += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
      }
      return s;
    };
    const curve = ML.bezier(0.7, 0, 0.2, 1);
    const hold = 0.25, mA = at + hold, mB = mA + 0.4, vA = mB + 0.05, vB = vA + 0.3, fadeA = vB + 0.35, fadeB = fadeA + 0.3;
    const keepBase = p.end !== "stay";
    ctx.sfx(mA, "whoosh.soft", 0.35);
    return {
      draw(t) {
        const m = curve(ML.lin(t, mA, mB));
        const v = keepBase ? ML.ease(t, vA, vB) : 0;
        // the strands: knot (trembling a little until pulled) -> lines -> one baseline
        const tremble = (1 - m) * 3 * k;
        strands.forEach((pts, s) => {
          const out = pts.map((q, i) => {
            const l = lineAt(s, i);
            const jx = Math.sin(t * 23 + i * 0.7 + s) * tremble, jy = Math.cos(t * 19 + i * 0.9 + s * 2) * tremble;
            let x = q[0] + jx + (l[0] - q[0] - jx) * m, y = q[1] + jy + (l[1] - q[1] - jy) * m;
            if (v > 0) {
              const u = i / (M - 1), bxp = ctx.rtl ? baseX1 - (baseX1 - baseX0) * u : baseX0 + (baseX1 - baseX0) * u;
              x += (bxp - x) * v; y += (baseY - y) * v;
            }
            return [x, y];
          });
          paths[s].setAttribute("d", d(out));
          // pale on dark -> dark on pale; the converged baseline in the accent
          paths[s].style.stroke = `color-mix(in srgb, var(--x-accent) ${(v * 100).toFixed(1)}%, color-mix(in srgb, var(--x-ink) ${(m * 100).toFixed(1)}%, var(--x-ground)))`;
        });
        ground.style.opacity = (1 - m).toFixed(4);
        // after the lines: the baseline stays under the headline; a ruled block fades
        const gone = keepBase ? (hb ? 0 : ML.lin(t, fadeA, fadeB)) : ML.lin(t, fadeA, fadeB);
        svg.style.opacity = (1 - gone).toFixed(4);
        layer.style.visibility = gone >= 1 ? "hidden" : "visible";
        // the scene's own content comes up with the light
        const c = ML.out(t, mA + 0.2, vB);
        for (const el of content) el.style.opacity = c >= 1 ? "" : c.toFixed(4);
      },
    };
  },
});

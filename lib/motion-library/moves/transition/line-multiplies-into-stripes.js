// Line multiplies into stripes: a 2 px glowing line draws out to the full width at 50 % height (0.15 s, from the
// centre), then duplicates into N lines (9 by default, 5-15) that each glide to their final evenly spaced height over
// 0.4 s expo.out, staggered 0.03 s from the centre outward. The lines then become the cut edges of a sliced exit: each
// band of the scene between two lines slides away sideways (alternate bands in opposite directions, first band toward
// the reading end) in 0.35 s power3.in, staggered from the centre, revealing the ground for the next scene, and the
// lines fade. "none" keeps the scene whole under the stripes (the lines alone, as an accent).
// Colours from the look: the line is a look name / --x- variable (accent by default: white only reads on a dark look),
// its glow the same colour.
// Source: prompt-motion lukasersil-ten-claudeai-me-neprestava (reference only: our own rebuild).
ML.define({
  id: "transition.line-multiplies-into-stripes",
  category: "transition",
  name: "Line multiplies into stripes",
  does: "A single glowing horizontal line splits into many parallel lines that spread out to fill the frame, then cut the scene into slices that slide away.",
  says: ["transition", "tech", "flow"],
  energy: 3,
  targets: ["scene", "shape"],
  duration: [0.7, 1.3],
  params: {
    count: { type: "number", range: [5, 15], default: 9 },
    glow: { type: "bool", default: true },
    slice: { type: "choice", options: ["out", "none"], default: "out" },
    colour: { type: "text", default: "accent" },
  },
  pairs: ["text-in.band-slide", "transition.line-open"],
  avoid: ["playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:lukasersil-ten-claudeai-me-neprestava", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const W = f.W, H = f.H, k = Math.min(W, H) / 1080, rtl = !!ctx.rtl;
    const c = String(p.colour || "accent").trim();
    const col = c.startsWith("--x-") ? `var(${c})` : /^(accent|accent-2|accent-ink|ink|dim|good|bad|panel)$/.test(c) ? `var(--x-${c})` : "var(--x-accent)";
    const N = Math.round(ML.clamp(+p.count || 9, 5, 15));
    const lw = Math.max(2, 2 * k);
    // final heights: evenly spaced through the frame (an odd count keeps one line on the centre)
    const ys = Array.from({ length: N }, (_, i) => (H * (i + 0.5)) / N);
    const mid = (N - 1) / 2;
    const rank = ys.map((_, i) => Math.round(Math.abs(i - mid) + (i < mid ? 0.1 : 0)));
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:9;overflow:hidden;visibility:hidden";
    const glow = p.glow ? `0 0 ${(6 * k).toFixed(1)}px ${(1 * k).toFixed(1)}px color-mix(in srgb, ${col} 85%, transparent), 0 0 ${(22 * k).toFixed(1)}px ${(4 * k).toFixed(1)}px color-mix(in srgb, ${col} 45%, transparent)` : "none";
    const lines = ys.map(() => {
      const d = document.createElement("div");
      d.style.cssText = `position:absolute;left:0;width:100%;top:0;height:${lw}px;margin-top:${-lw / 2}px;background:${col};box-shadow:${glow};transform-origin:50% 50%`;
      return d;
    });

    // the slices: N+1 bands of the scene between the lines' final heights, each a copy clipped to its band
    const slices = [];
    if (p.slice === "out" && scene !== stage) {
      const edges = [0, ...ys, H];
      for (let i = 0; i < edges.length - 1; i++) {
        const copy = scene.cloneNode(true);
        copy.removeAttribute("id");
        for (const e of copy.querySelectorAll("[id]")) e.removeAttribute("id");
        for (const e of [copy, ...copy.querySelectorAll("[data-slot]")]) if (e.dataset.slot) { e.dataset.slotCopy = e.dataset.slot; delete e.dataset.slot; }
        for (const im of copy.querySelectorAll("img")) im.decoding = "sync"; // a band shows its picture on its first frame
        copy.style.cssText += `;display:block;position:absolute;inset:0;visibility:hidden;opacity:1;clip-path:inset(${edges[i].toFixed(1)}px 0 ${(H - edges[i + 1]).toFixed(1)}px 0)`;
        layer.append(copy);
        const m = (edges[i] + edges[i + 1]) / 2;
        slices.push({ el: copy, dir: (i % 2 === 0 ? 1 : -1) * (rtl ? -1 : 1), rank: Math.abs(m - H / 2) / (H / N) });
      }
    }
    layer.append(...lines);
    stage.append(layer);
    const lk = scene.getAttribute("data-look"); if (lk) layer.setAttribute("data-look", lk); // a scene's own look reaches the layer on the stage
    const tDraw = at, tSplit = at + 0.15, spread = 0.4, st = 0.03;
    const tSettle = tSplit + spread + Math.ceil(mid) * st;
    const tSlice = tSettle - 0.12, sliceDur = 0.35;
    const tEnd = tSlice + sliceDur + Math.ceil(N / 2) * 0.025;
    const p3in = (x) => x * x * x * x; // GSAP's power3 is a quartic
    ctx.sfx(tSplit, "whoosh.soft", 0.35);
    if (slices.length) ctx.sfx(tSlice, "whoosh.heavy", 0.25);
    // a piece's explicit visibility beats a hidden parent: a layer that is off is off by display, on any seek
    const showLayer = (on) => { layer.style.visibility = on ? "visible" : "hidden"; layer.style.display = on ? "" : "none"; };
    return {
      draw(t) {
        if (t < at) { showLayer(false); scene.style.visibility = ""; return; }
        showLayer(t < ctx.end);
        // the scene's slices take over from the scene the moment they start to move
        const sliced = slices.length && t >= tSlice;
        scene.style.visibility = sliced ? "hidden" : "";
        slices.forEach((s) => {
          const u = p3in(ML.lin(t, tSlice + s.rank * 0.025, tSlice + s.rank * 0.025 + sliceDur));
          s.el.style.visibility = sliced ? "visible" : "hidden";
          s.el.style.translate = `${(s.dir * u * W * 1.05).toFixed(2)}px 0`;
        });
        // the line: draws out from the centre, then multiplies
        const draw = ML.out(t, tDraw, tSplit);
        const fade = slices.length ? 1 - ML.lin(t, tSlice + sliceDur * 0.6, tEnd + 0.1) : 1;
        lines.forEach((d, i) => {
          const e = ML.expo(t, tSplit + rank[i] * st, tSplit + rank[i] * st + spread);
          const y = H / 2 + (ys[i] - H / 2) * e;
          d.style.top = y.toFixed(2) + "px";
          d.style.scale = `${draw.toFixed(4)} 1`;
          // before the split every copy sits on the one line: show just the centre one
          d.style.opacity = (t < tSplit && i !== Math.round(mid) ? 0 : fade).toFixed(4);
        });
      },
    };
  },
});

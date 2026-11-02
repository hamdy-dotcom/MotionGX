// Eye opens: a thin glowing line opens into an almond-shaped eye that reveals the picture inside, while echo contours
// of the same almond ripple outward. The mask is an almond built from two arcs (cubic curves meeting at sharp corners)
// whose vertical opening h runs 0 → full over `duration` (easeInOutCubic), starting as a 2 px glowing line. 6–10 echo
// contours, each scaled 1.1^n, 1 px, coloured from the look (accent, accent-2, good in turn), their opacity falling with
// n, expand outward as it opens and then keep breathing (scale ±2 % over a 3 s sine). Shapes: eye (pointed almond),
// lens (rounded ellipse), slit (a vertical cat's-eye that opens sideways). The picture itself is only clipped (never
// enlarged or blurred); the glow is on the vector contour.
// Source: prompt-motion monokern-holy-shii-gave-opus (reference only: our own rebuild).
ML.define({
  id: "mask.eye-open-reveal",
  category: "mask",
  name: "Eye opens",
  does: "A thin glowing line opens into an almond-shaped eye revealing what is inside, with outline echoes rippling outward.",
  says: ["reveal", "focus", "arrival"],
  energy: 3,
  targets: ["image", "logo", "scene"],
  duration: [1, 3],
  params: {
    shape: { type: "choice", options: ["eye", "lens", "slit"], default: "eye" },
    echoes: { type: "number", range: [0, 10], default: 8 },
    duration: { type: "number", range: [0.8, 1.8], default: 1.2, unit: "s" },
    breathe: { type: "bool", default: true },
  },
  pairs: ["background.glow-field", "text-in.soft-rise"],
  avoid: ["urgency", "playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:monokern-holy-shii-gave-opus", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, stage } = ctx;
    if (!el) return null;
    const host = ctx.scene || stage;
    const target = el === stage ? host : el;
    const NS = "http://www.w3.org/2000/svg";
    const b = target === host ? { x: 0, y: 0, w: ctx.f.W, h: ctx.f.H } : ctx.box(target);
    const W = b.w, H = b.h, cx = W / 2, cy = H / 2, dur = ML.clamp(+p.duration, 0.8, 1.8), N = Math.round(ML.clamp(+p.echoes, 0, 10));
    const slit = p.shape === "slit";
    // the almond fills the target: for the eye and lens its full opening is the box height (never wider than tall*3
    // looks wrong, so a very wide box gets a slightly narrower eye), the slit opens sideways to ~55 % of the width
    const halfW = slit ? Math.min(W * 0.5, H * 0.32) : W / 2, halfH = slit ? H / 2 : Math.min(H / 2, W * 0.42);
    // the outline of the shape at opening u (0 = a line, 1 = full), in the target's own px
    const shapePath = (u, k = 1) => {
      const line = 1; // never fully closed: the 2 px line
      if (p.shape === "lens") {
        const rx = halfW * k, ry = Math.max(line, halfH * u) * k;
        return `M${(cx - rx).toFixed(2)},${cy.toFixed(2)} A${rx.toFixed(2)},${ry.toFixed(2)} 0 1 0 ${(cx + rx).toFixed(2)},${cy.toFixed(2)} A${rx.toFixed(2)},${ry.toFixed(2)} 0 1 0 ${(cx - rx).toFixed(2)},${cy.toFixed(2)}Z`;
      }
      if (slit) {
        const o = Math.max(line, halfW * u * 1.333) * k, y0 = cy - halfH * k, y1 = cy + halfH * k;
        return `M${cx.toFixed(2)},${y0.toFixed(2)} C${(cx + o).toFixed(2)},${(cy - halfH * 0.42 * k).toFixed(2)} ${(cx + o).toFixed(2)},${(cy + halfH * 0.42 * k).toFixed(2)} ${cx.toFixed(2)},${y1.toFixed(2)} C${(cx - o).toFixed(2)},${(cy + halfH * 0.42 * k).toFixed(2)} ${(cx - o).toFixed(2)},${(cy - halfH * 0.42 * k).toFixed(2)} ${cx.toFixed(2)},${y0.toFixed(2)}Z`;
      }
      // eye: two arcs (as cubics) meeting at pointed corners; control height 4/3 of the wanted opening
      const o = Math.max(line, halfH * u * 1.333) * k, x0 = cx - halfW * k, x1 = cx + halfW * k, c1 = cx - halfW * 0.42 * k, c2 = cx + halfW * 0.42 * k;
      return `M${x0.toFixed(2)},${cy.toFixed(2)} C${c1.toFixed(2)},${(cy - o).toFixed(2)} ${c2.toFixed(2)},${(cy - o).toFixed(2)} ${x1.toFixed(2)},${cy.toFixed(2)} C${c2.toFixed(2)},${(cy + o).toFixed(2)} ${c1.toFixed(2)},${(cy + o).toFixed(2)} ${x0.toFixed(2)},${cy.toFixed(2)}Z`;
    };

    // the contours: an SVG over the target (in the scene, so it leaves with it), above the picture
    if (target !== host) { const cs = getComputedStyle(target); if (cs.position === "static") target.style.position = "relative"; target.style.zIndex = target.style.zIndex || "1"; }
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", W); svg.setAttribute("height", H);
    svg.style.cssText = `position:absolute;left:${b.x}px;top:${b.y}px;width:${W}px;height:${H}px;overflow:visible;pointer-events:none;z-index:2`;
    const colours = ["var(--x-accent)", "var(--x-accent-2)", "var(--x-good)"];
    const echoes = [];
    for (let n = 1; n <= N; n++) {
      const e = document.createElementNS(NS, "path");
      e.setAttribute("fill", "none"); e.setAttribute("vector-effect", "non-scaling-stroke");
      e.style.stroke = colours[(n - 1) % colours.length]; e.style.strokeWidth = "1px";
      svg.append(e); echoes.push(e);
    }
    const rim = document.createElementNS(NS, "path");
    rim.setAttribute("fill", "none");
    rim.style.stroke = "color-mix(in srgb, var(--x-accent-2) 45%, var(--x-panel))";
    rim.style.filter = "drop-shadow(0 0 6px var(--x-accent)) drop-shadow(0 0 14px var(--x-accent-2))";
    svg.append(rim);
    host.append(svg);
    ctx.sfx(at, "swell", 0.45);

    return {
      draw(t) {
        const u = ML.ease(t, at, at + dur), on = t >= at - 1e-6;
        svg.style.visibility = on ? "visible" : "hidden";
        // the picture shows only inside the opening (hidden before the move starts)
        const clip = `path("${shapePath(on ? u : 0)}")`;
        target.style.clipPath = on ? clip : "inset(50%)";
        rim.setAttribute("d", shapePath(u));
        rim.style.strokeWidth = (2 - 0.8 * u).toFixed(2) + "px";
        rim.style.opacity = (on ? 1 - 0.35 * ML.ease(t, at + dur, at + dur + 0.8) : 0).toFixed(3);
        const breath = p.breathe ? 1 + 0.02 * Math.sin(((t - at - dur) / 3) * Math.PI * 2) * ML.lin(t, at + dur * 0.6, at + dur + 0.6) : 1;
        echoes.forEach((e, i) => {
          const n = i + 1, grow = ML.out(t, at + dur * 0.25 + n * 0.05, at + dur + n * 0.06);
          const k = 1 + (Math.pow(1.1, n) - 1) * grow, s = k * breath;
          e.setAttribute("d", shapePath(Math.max(u, 0.02), s));
          e.style.opacity = (grow * 0.85 * (1 - n / (N + 2))).toFixed(3);
        });
      },
    };
  },
});

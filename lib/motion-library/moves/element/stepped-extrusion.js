// Pop-art extrusion grows out: a solid ink extrusion builds out behind the target, stepped one unit at a time (the
// source draws k copies of the shape, each translate(i, i), BEFORE the face). Depth grows 0 → `depth` over 0.3 s on a
// back-out (overshooting by 1–2 units) while the face moves up-left by the same amount, so the block "rises off the
// page" with its far edge staying put. Press: on a click the depth collapses to 0 in 0.08 s and springs back.
// How the copies are made follows the target: a boxed element (background / border / picture) gets stacked box-shadows,
// an inline SVG gets ink copies of its own shapes stepped in its own units, plain type gets stacked text-shadows.
// Units are the source artboard's (480 px) scaled to the stage's short side; the direction mirrors in RTL.
// Source: MengTo/Skills illustration/illustration-bold-pop scripts/pop.mjs p.ext() (MIT): navy depth extrusion, k copies
// stepped (1, 1), drawn before the face; depth by size (windows 8, phones 7, panels 4–5, bubbles 3–4, buttons 2.5–3).
ML.define({
  id: "element.stepped-extrusion",
  category: "element",
  name: "Pop-art extrusion grows out",
  does: "A card, button or shape pops forward as a solid dark extrusion builds out behind it down-right, making it a chunky block.",
  says: ["playful", "arrival", "energy", "simplicity"],
  energy: 3,
  targets: ["headline", "card", "label", "logo", "shape"],
  duration: [0.3, 0.8],
  params: {
    depth: { type: "number", range: [2, 8], default: 4, unit: "px" },
    direction: { type: "choice", options: ["down-right", "down", "down-left"], default: "down-right" },
    press: { type: "bool", default: false },
  },
  pairs: ["element.pop-in", "text-in.punchline"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "MengTo/Skills:agent-skills/illustration/illustration-bold-pop", license: "MIT", note: "scripts/pop.mjs p.ext(): k copies stepped (1,1) in ink before the face" },
  setup(ctx) {
    const { el, p, at, end, f, rtl } = ctx;
    if (!el) return null;
    const U = Math.min(f.W, f.H) / 480; // one source artboard unit in stage px
    const D = ML.clamp(p.depth, 2, 8) * U;
    let dir = p.direction === "down" ? [0, 1] : p.direction === "down-left" ? [-1, 1] : [1, 1];
    if (rtl && dir[0]) dir = [-dir[0], 1];
    const cs = getComputedStyle(el);
    const boxed = /^(IMG|VIDEO|CANVAS)$/.test(el.tagName) || !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor) || (cs.backgroundImage || "none") !== "none" || parseFloat(cs.borderTopWidth) > 0;
    const svg = el.tagName.toLowerCase() === "svg" ? el : null;
    const INK = "var(--x-ink)";
    const shadowBase = cs.boxShadow && cs.boxShadow !== "none" ? cs.boxShadow : "";
    // SVG: ink copies of its shapes, stepped in viewBox units, inserted before the face
    let copies = [], svgK = 1;
    if (svg) {
      const vb = svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width ? svg.viewBox.baseVal : null;
      svgK = vb ? vb.width / (ctx.box(svg).w || 1) : 1;
      svg.style.overflow = "visible";
      const face = [...svg.children].filter((c) => !/^(defs|title|desc|style)$/i.test(c.tagName));
      const N = Math.ceil(ML.clamp(p.depth, 2, 8)) + 2;
      for (let i = N; i >= 1; i--) {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("aria-hidden", "true");
        for (const c of face) {
          const k = c.cloneNode(true);
          for (const n of [k, ...k.querySelectorAll("*")]) { if (n.style) { n.style.fill = INK; n.style.stroke = INK; n.style.strokeWidth = String(1.4 * svgK); n.style.strokeLinejoin = "round"; } }
          g.append(k);
        }
        svg.insertBefore(g, face[0] || null);
        copies.push({ g, i, N });
      }
    }
    const rise = 0.3, overshoot = 1.5 / ML.clamp(p.depth, 2, 8) + 1; // +1–2 units past the target depth
    const press = p.press ? at + Math.min(1.0, Math.max(0.5, (end - at) * 0.45)) : Infinity;
    ctx.sfx(at, "pop", 0.4);
    if (press < end) ctx.sfx(press, "click", 0.45);
    const depthAt = (t) => {
      if (t < at) return 0;
      let d = ML.back(t, at, at + rise, overshoot * 1.2);
      if (t >= press) {
        const down = ML.out(t, press, press + 0.08);
        const up = ML.step(t - press - 0.08, ML.SPRING.pop);
        d = d * (1 - down) + down * up;
      }
      return Math.max(0, d) * D;
    };
    return {
      draw(t) {
        const d = depthAt(t);
        el.style.translate = d > 0.01 ? `${(-dir[0] * d).toFixed(2)}px ${(-dir[1] * d).toFixed(2)}px` : "none";
        if (svg) {
          for (const c of copies) {
            const s = (d * svgK * c.i) / c.N;
            c.g.setAttribute("transform", `translate(${(dir[0] * s).toFixed(3)},${(dir[1] * s).toFixed(3)})`);
            c.g.style.visibility = d > 0.01 ? "visible" : "hidden";
          }
          return;
        }
        const n = Math.max(1, Math.ceil(d / Math.max(1, U * 0.5)));
        const parts = [];
        for (let i = 1; i <= n && d > 0.01; i++) {
          const s = (d * i) / n;
          parts.push(boxed ? `${(dir[0] * s).toFixed(2)}px ${(dir[1] * s).toFixed(2)}px 0 0 ${INK}` : `${(dir[0] * s).toFixed(2)}px ${(dir[1] * s).toFixed(2)}px 0 ${INK}`);
        }
        if (boxed) {
          el.style.boxShadow = parts.length ? parts.join(", ") + (shadowBase ? ", " + shadowBase : "") : shadowBase || "none";
          el.style.outline = d > 0.01 ? `${(0.9 * U).toFixed(2)}px solid ${INK}` : "none";
        } else el.style.textShadow = parts.length ? parts.join(", ") : "none";
      },
    };
  },
});

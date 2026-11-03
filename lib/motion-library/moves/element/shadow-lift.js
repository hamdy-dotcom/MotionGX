// Lift with deepening shadow: a card, button or UI fragment rises a few pixels off its surface while its layered
// shadow deepens, as if picked up. The stacks are MengTo's exact layers —
//   sm: 0 2 3 -1 /.1, 0 1 0 /.02, 0 0 0 1 /.08        md: 0 0 0 1 /.06 + 0 1 / 3 / 6 / 12 / 24 blurs at .06
//   lg: 0 2.8 2.2 /.034, 6.7 5.3 /.048, 12.5 10 /.06, 22.3 17.9 /.072, 41.8 33.4 /.086, 100 80 /.12
// interpolated layer by layer (sm → md or md → lg) over 0.3 s power2.out while the element lifts (translateY, or
// translateZ on a tilted plane over 0.5 s power3.out, compensated so nothing is enlarged under 3D). Optional entrance
// (y 12 → 0 + fade 0.7 s power3.out, stagger), a top highlight that fades in after landing ("light catches the edge"),
// icon chips that grow 1 → 1.1 and a ±4 px float. Shadows stay neutral: the look's ink on light grounds, a darkened
// ground on dark ones (alphas raised there, as the source's dark variant does).
// Source: MengTo/Skills web-design/beautiful-shadows + high-contrast-skeuomorphic-clean (MIT); prompt-motion
// "pankajstwt-49978ed" (reference) for the tilted-plane lift.
ML.define({
  id: "element.shadow-lift",
  category: "element",
  name: "Lift with deepening shadow",
  does: "A card, button or UI fragment lifts a few pixels off its surface while its layered shadow deepens, as if picked up.",
  says: ["focus", "choice", "luxury", "trust", "precision", "tech"],
  energy: 1,
  targets: ["card", "label", "image", "screen"],
  duration: [0.3, 1.2],
  params: {
    from_to: { type: "choice", options: ["sm-md", "md-lg"], default: "sm-md" },
    lift: { type: "number", range: [2, 60], default: 8, unit: "px" },
    plane: { type: "choice", options: ["flat", "tilted"], default: "flat" },
    highlight: { type: "bool", default: false },
    stagger: { type: "number", range: [0.05, 0.2], default: 0.1, unit: "s" },
    entrance: { type: "bool", default: true },
    chips: { type: "bool", default: false },
    float: { type: "bool", default: false },
  },
  pairs: ["element.skeuo-paper-card", "ui.label-pill-press"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "MengTo/Skills:agent-skills/web-design/beautiful-shadows", license: "MIT", note: "shadow stacks from the demo; tilted lift after prompt-motion pankajstwt-49978ed (reference), our own code" },
  setup(ctx) {
    const { p, at, end } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    let els = ctx.els.filter((e) => e && e !== ctx.stage);
    // no card slot in the scene: lift the scene's own panels (outer first, then the ones inside it)
    if (!els.length) els = [...host.querySelectorAll(".ml-panel")].slice(0, 6);
    if (!els.length) return null;

    // the ground's lightness decides the shadow's base (neutral either way)
    const bg = getComputedStyle(ctx.stage).backgroundColor.match(/[\d.]+/g) || ["255", "255", "255"];
    const lum = (0.2126 * +bg[0] + 0.7152 * +bg[1] + 0.0722 * +bg[2]) / 255;
    const dark = lum < 0.42, lightEdge = dark ? "color-mix(in srgb, var(--x-ink) 45%, var(--x-panel))" : "var(--x-panel)", base = dark ? "color-mix(in oklab, var(--x-ground) 22%, black)" : "var(--x-ink)", aK = dark ? 3.2 : 1;
    // [x, y, blur, spread, alpha]
    const SM = [[0, 2, 3, -1, 0.1], [0, 1, 0, 0, 0.02], [0, 0, 0, 1, 0.08]];
    const MD = [[0, 0, 0, 1, 0.06], [0, 1, 1, 0, 0.06], [0, 3, 3, 0, 0.06], [0, 6, 6, 0, 0.06], [0, 12, 12, 0, 0.06], [0, 24, 24, 0, 0.06]];
    const LG = [[0, 2.8, 2.2, 0, 0.034], [0, 6.7, 5.3, 0, 0.048], [0, 12.5, 10, 0, 0.06], [0, 22.3, 17.9, 0, 0.072], [0, 41.8, 33.4, 0, 0.086], [0, 100, 80, 0, 0.12]];
    const [A, B] = p.from_to === "md-lg" ? [MD, LG] : [SM, MD];
    const L = Math.max(A.length, B.length), Z = [0, 0, 0, 0, 0];
    const shadowAt = (u, k) => Array.from({ length: L }, (_, i) => {
      const a = A[i] || Z, b = B[i] || Z, v = a.map((x, j) => x + (b[j] - x) * u);
      if (v[4] <= 0.0005) return null;
      return `${(v[0] * k).toFixed(2)}px ${(v[1] * k).toFixed(2)}px ${(v[2] * k).toFixed(2)}px ${(v[3] * k).toFixed(2)}px color-mix(in srgb, ${base} ${Math.min(100, v[4] * aK * 100).toFixed(2)}%, transparent)`;
    }).filter(Boolean).join(", ");

    const p2o = (x) => 1 - Math.pow(1 - x, 3), p3o = (x) => 1 - Math.pow(1 - x, 4);
    const tilted = p.plane === "tilted", P = 1400, tilt = 24;
    const span = Math.max(0.4, end - at), stag = Math.min(p.stagger, (span * 0.4) / Math.max(1, els.length));
    const items = els.map((el, i) => {
      const b = ctx.box(el), k = ML.clamp(Math.min(b.w, b.h) / 260, 0.6, 2.2);
      const t0 = at + i * stag, lift0 = p.entrance ? t0 + Math.min(0.45, span * 0.3) : t0;
      const own = getComputedStyle(el).boxShadow;
      const img = el.tagName === "IMG" || el.tagName === "VIDEO" || el.tagName === "CANVAS";
      // the highlight: a 1 px line across the top edge (not on a picture)
      let hl = null;
      if (p.highlight && !img && el.tagName.toLowerCase() !== "svg") {
        if (getComputedStyle(el).position === "static") el.style.position = "relative";
        hl = doc.createElement("i");
        hl.style.cssText = `position:absolute;left:8%;right:8%;top:0;height:1px;pointer-events:none;opacity:0;background:linear-gradient(90deg, transparent, ${lightEdge}, transparent);`;
        el.append(hl);
      }
      const chips = p.chips && !tilted ? [...el.querySelectorAll("svg")].filter((s) => s !== el).slice(0, 4) : [];
      chips.forEach((c) => { c.style.transformOrigin = "50% 50%"; });
      if (tilted && el.parentElement) el.style.transformOrigin = "50% 100%";
      return { el, k, t0, lift0, own: own && own !== "none" ? own : "", hl, chips, img };
    });
    ctx.sfx(items[0].lift0, "pop.soft", 0.22);

    return {
      draw(t) {
        items.forEach((it, i) => {
          const { el, k } = it;
          const e = p.entrance ? p3o(ML.lin(t, it.t0, it.t0 + 0.7)) : 1;
          const dur = tilted ? 0.5 : 0.3;
          const u = tilted ? p3o(ML.lin(t, it.lift0, it.lift0 + dur)) : p2o(ML.lin(t, it.lift0, it.lift0 + dur));
          const fl = p.float ? Math.sin((t - it.lift0 - dur) * 2.4 + i) * 4 * k * ML.lin(t, it.lift0 + dur, it.lift0 + dur + 0.4) : 0;
          el.style.opacity = p.entrance ? Math.min(1, e * 1.2).toFixed(4) : "";
          const sh = shadowAt(u, k);
          el.style.boxShadow = it.img ? sh : [sh, it.own].filter(Boolean).join(", ");
          if (tilted) {
            const z = p.lift * k * u, c = (P - z) / P; // compensate the perspective so nothing grows past 1
            const lean = tilt * p3o(ML.lin(t, it.t0, it.t0 + 0.5)); // the plane tips as it starts, never a cut
            el.style.translate = "none";
            el.style.transform = `perspective(${P}px) translateY(${((1 - e) * 12 * k + fl).toFixed(2)}px) rotateX(${lean.toFixed(3)}deg) translateZ(${z.toFixed(2)}px) scale(${c.toFixed(4)})`;
          } else {
            el.style.translate = `0 ${((1 - e) * 12 * k - p.lift * k * u + fl).toFixed(2)}px`;
          }
          if (it.hl) it.hl.style.opacity = ML.ease(t, it.lift0 + dur, it.lift0 + dur + 0.3).toFixed(4);
          it.chips.forEach((c) => { c.style.scale = (1 + 0.1 * u).toFixed(4); });
        });
      },
    };
  },
});

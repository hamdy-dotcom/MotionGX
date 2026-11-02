// Alpha edge fade: the edges of a strip, picture, card or the whole scene dissolve into the ground instead of ending
// at a hard cut. mask-image (+ -webkit-mask-image) = linear-gradient(to right, transparent, black d%, black (100-d)%,
// transparent) — "to bottom" for vertical, both gradients with mask-composite: intersect for a vignette card. depth =
// the d stops (5–40 %); strength < 1 softens the edge (rgba(0,0,0,1-strength) instead of transparent). Motion: the stops
// run 0 %/100 % → d/(100-d) over 0.6 s (fade-in-edges, as a list starts to scroll) or 50 %/50 % → d/(100-d) so the
// content blooms open from the centre line. A list becomes a seamless marquee drifting under the mask (scroll: auto),
// reading direction from ctx.rtl. On the stage the mask goes on the scene, so the look's ground shows at the edges.
// Source: MengTo/Skills agent-skills/web-design/css-alpha-masking (SKILL.md + demo/index.html .marquee/.showcase, MIT).
ML.define({
  id: "mask.edge-fade-mask",
  category: "mask",
  name: "Alpha edge fade",
  does: "The edges of a strip, image or scrolling list dissolve smoothly into the background instead of ending at a hard cut, optionally blooming open from the centre line.",
  says: ["calm", "flow", "simplicity"],
  energy: 1,
  targets: ["list", "image", "card", "stage"],
  duration: [0.4, 8],
  params: {
    direction: { type: "choice", options: ["horizontal", "vertical", "both"], default: "horizontal" },
    depth: { type: "number", range: [5, 40], default: 15, unit: "%" },
    strength: { type: "number", range: [0, 1], default: 1 },
    animate: { type: "choice", options: ["static", "fade-in-edges", "open-from-centre"], default: "static" },
    scroll: { type: "choice", options: ["auto", "none", "marquee"], default: "auto" },
    speed: { type: "number", range: [10, 200], default: 60, unit: "px/s" },
  },
  pairs: ["element.card-rail-advance", "camera.horizontal-track"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:agent-skills/web-design/css-alpha-masking", license: "MIT", note: "demo/index.html .marquee + .showcase masks; the stop animation and marquee are ours, driven by t" },
  setup(ctx) {
    const { el, p, at, stage } = ctx;
    if (!el) return null;
    const node = el === stage ? ctx.scene || stage : el;
    const d = ML.clamp(+p.depth, 5, 40), edge = `rgba(0,0,0,${(1 - ML.clamp(+p.strength)).toFixed(3)})`;

    // a list scrolls as a seamless marquee under the mask: its items move into a track, the track is doubled
    let track = null, span = 0;
    const isList = el !== stage && el.tagName !== "IMG" && el.children.length > 1;
    if (p.scroll === "marquee" || (p.scroll === "auto" && isList)) {
      const cs = getComputedStyle(el), gap = parseFloat(cs.columnGap) || parseFloat(cs.gap) || 0;
      track = document.createElement("div");
      track.style.cssText = `display:flex;flex-wrap:nowrap;gap:${gap}px;width:max-content;align-items:center;will-change:translate`;
      const items = [...el.childNodes];
      el.textContent = "";
      const a = document.createElement("div"), b = document.createElement("div");
      for (const h of [a, b]) h.style.cssText = `display:flex;flex-wrap:nowrap;gap:${gap}px;flex:none;align-items:center`;
      items.forEach((n) => a.append(n));
      [...a.childNodes].forEach((n) => b.append(n.cloneNode(true)));
      b.setAttribute("aria-hidden", "true");
      track.append(a, b);
      el.append(track);
      el.style.overflow = "hidden";
      el.style.minWidth = "0";
      el.style.display = "flex";
      el.style.width = el.style.width || "100%";
      span = a.getBoundingClientRect().width / ((stage.getBoundingClientRect().width / (stage.offsetWidth || 1)) || 1) + gap;
    }

    const grad = (dir, a, b) => `linear-gradient(${dir}, ${edge} ${a.toFixed(2)}%, #000 ${b.toFixed(2)}%, #000 ${(100 - b).toFixed(2)}%, ${edge} ${(100 - a).toFixed(2)}%)`;
    const apply = (a, b) => {
      // a: where the fade starts (0 = the edge), b: where it is fully opaque
      const h = grad("to right", a, b), v = grad("to bottom", a, b);
      const img = p.direction === "vertical" ? v : p.direction === "both" ? `${h}, ${v}` : h;
      node.style.webkitMaskImage = img;
      node.style.maskImage = img;
      if (p.direction === "both") { node.style.webkitMaskComposite = "source-in"; node.style.maskComposite = "intersect"; }
    };
    return {
      draw(t) {
        let a = 0, b = d;
        if (p.animate === "fade-in-edges") { const u = ML.ease(t, at, at + 0.6); b = Math.max(0.01, d * u); }
        else if (p.animate === "open-from-centre") { const u = ML.out(t, at, at + 0.6); b = 50 - (50 - d) * u; a = Math.max(0, b - d * u); }
        b = Math.min(b, 50); a = Math.min(a, b - 0.01);
        if (b >= 49.999 && p.animate === "open-from-centre") { node.style.webkitMaskImage = node.style.maskImage = `linear-gradient(${edge}, ${edge})`; }
        else apply(Math.max(0, a), b);
        if (track) {
          const x = span ? ((Math.max(0, t - at) * p.speed) % span) : 0;
          track.style.translate = `${(ctx.rtl ? x : -x).toFixed(2)}px 0`;
        }
      },
    };
  },
});

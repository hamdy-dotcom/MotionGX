// Hard drop shadow slides out: the object lands (drops a little and settles from 0.96) and a flat, unblurred shadow —
// its own silhouette in deep accent or ink, never blurred — slides out from under it down-right (down-left in Arabic)
// from offset 0 to full over 0.38 s ease-out, so the object reads as anchored on the page. Float mode: the object keeps
// a slow bob and the offset grows by exactly what it rises (the shadow stays on the ground), the way the teal spot illustrations
// float their props. The shadow is a CSS drop-shadow with 0 blur (it follows the silhouette: rounded corners, an SVG
// mark's letters, a cut-out picture's alpha), a 0.6 px self-stroke closing the seam on SVG marks.
// Source: MengTo/Skills illustration-teal-spot (MIT: flat offset shadows, 8.5 / 7.6 offsets on floating items) —
// the motion is our own code.
ML.define({
  id: "element.hard-offset-shadow",
  category: "element",
  name: "Hard drop shadow slides out",
  does: "An object lands and a flat, unblurred shadow of its own silhouette slides out from under it on the reading side, anchoring it; in float mode it keeps bobbing over that shadow.",
  says: ["arrival", "simplicity", "focus"],
  energy: 2,
  targets: ["image", "logo", "card", "shape", "label"],
  duration: [0.7, 6],
  params: {
    offset: { type: "number", range: [6, 20], default: 9, unit: "px" },
    colour: { type: "choice", options: ["deep-accent", "ink"], default: "ink" },
    mode: { type: "choice", options: ["land", "float"], default: "land" },
    direction: { type: "choice", options: ["down-right", "down"], default: "down-right" },
    slide: { type: "number", range: [0.3, 0.45], default: 0.38, unit: "s" },
  },
  pairs: ["element.pop-in", "element.idle-float", "element.corner-mark"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "land.light",
  source: { from: "MengTo/Skills:agent-skills/illustration/illustration-teal-spot", license: "MIT", note: "flat silhouette offsets from the illustration style; the land / slide / float timing is our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent) => { const e = doc.createElement(tag); e.style.cssText = css; parent.append(e); return e; };
    let el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const k = Math.min(f.W, f.H) / 1080;
    if (!el) {
      // nothing given: a flat card stand-in in the picture region
      const host = ctx.scene || ctx.stage;
      const holder = mk("div", `position:absolute;left:${f.pic.x}px;top:${f.pic.y}px;width:${f.pic.w}px;height:${f.pic.h}px;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:6;`, host);
      el = mk("div", `width:${Math.min(f.pic.w * 0.6, 520 * k)}px;aspect-ratio:4/3;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:var(--x-radius);`, holder);
    }
    // the shadow's size follows the object: the card's px are for a ~400 px object, scaled with it (never under the range)
    const b = ctx.box(el);
    const scale = ML.clamp(Math.sqrt(b.w * b.h) / 400, 0.8, 3.2) * Math.max(0.6, k);
    const off = p.offset * scale;
    const dx = p.direction === "down" ? 0 : rtl ? -1 : 1;
    const ink = p.colour === "deep-accent" ? "color-mix(in srgb, var(--x-accent) 62%, var(--x-ink))" : "var(--x-ink)";
    // an SVG mark: a hairline of its own colour closes the seam between the face and the shadow
    if (el.tagName && el.tagName.toLowerCase() === "svg") el.querySelectorAll("path, rect, circle, polygon, text, ellipse").forEach((n) => { if (!n.getAttribute("stroke") && n.getAttribute("fill") !== "none") { n.setAttribute("stroke", n.getAttribute("fill") || "currentColor"); n.setAttribute("stroke-width", "0.6"); } });
    const drop = 0.32; // the object's fall, s
    const lands = at + drop;
    ctx.sfx(lands, "land.light", 0.4);
    const fall = Math.max(10, 24 * k);
    return {
      draw(t) {
        if (t < at) { el.style.opacity = "0"; el.style.filter = "none"; return; }
        const u = ML.out(t, at, lands); // the drop
        const leave = ML.ease(t, end - 0.25, end);
        el.style.opacity = (Math.min(1, ML.lin(t, at, at + 0.14)) * (1 - leave)).toFixed(4);
        let y = -(1 - u) * fall, lift = 0;
        const s = 0.96 + 0.04 * u, grow = ML.out(t, lands - 0.06, lands - 0.06 + p.slide);
        if (p.mode === "float") {
          // after landing it bobs: up is negative y; the shadow keeps its place on the ground, so its offset grows by the lift
          const w = ML.ease(t, lands, lands + 0.8), rise = w * (0.5 - 0.5 * Math.cos((2 * Math.PI * (t - lands)) / 3.2));
          lift = rise * off * 0.9;
          y -= lift;
        }
        el.style.translate = Math.abs(y) < 0.01 ? "none" : `0 ${y.toFixed(2)}px`;
        el.style.scale = s >= 0.9999 ? "none" : s.toFixed(4);
        const oy = off * grow + lift, ox = dx * oy * (p.mode === "float" ? 8.5 / 7.6 : 1); // 8.5 / 7.6: floating props' oblique
        el.style.filter = grow > 0.002 ? `drop-shadow(${ox.toFixed(2)}px ${oy.toFixed(2)}px 0 ${ink})` : "none";
      },
    };
  },
});

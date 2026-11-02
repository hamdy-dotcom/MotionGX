// Edge-gathered grain: a flat or photographic shape gets a fine dark gouache / riso speckle that thickens toward its
// edges and into its shadows. Port of MengTo/Skills illustration-grainy-gouache gouache.mjs grainFilter(): an SVG
// filter on the shape — feTurbulence (fixed seed) as the speckle, coloured the ink, alpha 1.08 - 2*noise; the edge
// weight from the shape's own alpha blurred (inner falloff 6-14 px) and composited k2 2.0 / k3 -1.8; the shadow weight
// from the shape's darkness (-.66R -1.3G -.24B + 1.82); the two combined (k1 1.9, k3 .15 strong; .75 / .06 weak, the
// source's "grainL" for big light planes), kept inside the shape and multiplied over it. Under it, the soft radial
// shading the style paints every form with (light 0, mid .5, shade .82, edge 1; centre .44, .32). Ink: the look's ink,
// or a brand dark (accent into ink). Grain is static; boil re-seeds it at 10 fps (by seed bucket of t) when asked for.
// The grained copy settles in over the plain shape; the picture is never blurred (only its alpha, for the edge mask).
// Source: MengTo/Skills illustration/illustration-grainy-gouache scripts/gouache.mjs (MIT).
ML.define({
  id: "photo.edge-grain",
  category: "photo",
  name: "Edge-gathered grain",
  does: "A flat or photographic shape gets a fine dark gouache/riso grain that thickens toward its edges and into its shadows.",
  says: ["calm", "story", "luxury", "playful"],
  energy: 1,
  targets: ["image", "shape", "card", "logo"],
  duration: [1, 20],
  params: {
    grain: { type: "choice", options: ["fine", "coarse"], default: "fine" },
    edge_gather: { type: "choice", options: ["weak", "strong"], default: "strong" },
    ink: { type: "choice", options: ["dark", "brand"], default: "dark" },
    boil: { type: "bool", default: false },
    shading: { type: "bool", default: true },
  },
  pairs: ["photo.flat-posterize-black", "photo.halftone"],
  avoid: ["urgency", "tech"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:illustration/illustration-grainy-gouache/scripts/gouache.mjs", license: "MIT" },
  async setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const host = ctx.scene || ctx.stage;
    if (el.tagName === "IMG") { try { await el.decode(); } catch (e) { /* as it is */ } }
    const b = ctx.box(el);
    if (b.w < 4 || b.h < 4) return null;
    const mk = (tag, css, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (parent) parent.append(e); return e; };
    const NS = "http://www.w3.org/2000/svg";
    const cs = getComputedStyle(el), radius = cs.borderRadius || "0px";
    // the ink as numbers for the colour matrix
    const probe = mk("span", `color:${p.ink === "brand" ? "color-mix(in srgb, var(--x-accent) 40%, var(--x-ink))" : "var(--x-ink)"}`, host);
    const pc = document.createElement("canvas"); pc.width = pc.height = 1; const pg = pc.getContext("2d");
    pg.fillStyle = getComputedStyle(probe).color; pg.fillRect(0, 0, 1, 1); probe.remove();
    const [ir, ig, ib] = pg.getImageData(0, 0, 1, 1).data;
    // the source works on a 480-wide card; scale its pixel numbers to this shape
    const s = ML.clamp(Math.min(b.w, b.h * 1.33) / 480, 0.5, 4);
    const strong = p.edge_gather === "strong";
    const dens = strong ? 1.08 : 1.0, k1 = strong ? 1.9 : 0.75, k3 = strong ? 0.15 : 0.06;
    const fall = ML.clamp(3.2 * s * (strong ? 1.6 : 1), 3, 7); // stdDeviation: an inner falloff of ~6-14 px
    const freq = (p.grain === "coarse" ? 0.95 : 2.1) / Math.max(1, s * 1.1);
    const id = "mlgrain" + Math.round(ML.rnd(b.x + b.y * 7, b.w) * 1e8);
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
    svg.innerHTML = `<filter id="${id}" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="${freq.toFixed(4)}" numOctaves="1" seed="5" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 ${(ir / 255).toFixed(4)}  0 0 0 0 ${(ig / 255).toFixed(4)}  0 0 0 0 ${(ib / 255).toFixed(4)}  0 -2.0 0 0 ${dens}" result="dk"/>
      <feGaussianBlur in="SourceAlpha" stdDeviation="${fall.toFixed(2)}" result="b"/>
      <feComposite in="SourceAlpha" in2="b" operator="arithmetic" k1="0" k2="2.0" k3="-1.8" k4="0" result="w"/>
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -0.66 -1.3 -0.24 0 1.82" result="dw"/>
      <feComposite in="w" in2="dw" operator="arithmetic" k1="${k1}" k2="0" k3="${k3}" k4="0" result="wt"/>
      <feComposite in="wt" in2="SourceAlpha" operator="in" result="wm"/>
      <feComposite in="dk" in2="wm" operator="in" result="g"/>
      <feBlend in="g" in2="SourceGraphic" mode="multiply"/>
    </filter>`;
    host.append(svg);
    const turb = svg.querySelector("feTurbulence");
    // the grained copy over the plain shape
    const wrap = mk("div", `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;pointer-events:none;visibility:hidden;z-index:3`, host);
    const inner = mk("div", `position:absolute;inset:0;border-radius:${radius};overflow:hidden;filter:url(#${id})`, wrap);
    const copy = el.cloneNode(true);
    copy.removeAttribute("data-slot"); copy.removeAttribute("data-slot-sample");
    copy.style.position = "absolute"; copy.style.left = "0"; copy.style.top = "0"; copy.style.width = b.w + "px"; copy.style.height = b.h + "px"; copy.style.margin = "0"; copy.style.maxWidth = "none";
    inner.append(copy);
    if (p.shading) {
      // soft radial shading (light 0, mid .5, shade .82, edge 1) centred up-left, in the ink, multiplied
      mk("div", `position:absolute;inset:0;mix-blend-mode:multiply;background:radial-gradient(75% 80% at 44% 32%, transparent 0%, color-mix(in srgb, var(--x-ink) 10%, transparent) 50%, color-mix(in srgb, var(--x-ink) 26%, transparent) 82%, color-mix(in srgb, var(--x-ink) 38%, transparent) 100%)`, inner);
    }
    const settle = 0.45;
    return {
      draw(t) {
        const on = t >= at - 1e-6 && t < end;
        wrap.style.visibility = on ? "visible" : "hidden";
        el.style.visibility = on ? "hidden" : "";
        if (!on) return;
        if (p.boil) turb.setAttribute("seed", String(5 + Math.floor(Math.max(0, t - at) * 10)));
        // the grain settles over the plain shape: the plain copy is the target itself, so fade the grained one in
        el.style.visibility = ML.ease(t, at, at + settle) < 1 ? "" : "hidden";
        inner.style.opacity = (ML.ease(t, at, at + settle) * (1 - ML.lin(t, end - 0.25, end))).toFixed(4);
        if (t >= end - 0.25) el.style.visibility = "";
      },
    };
  },
});

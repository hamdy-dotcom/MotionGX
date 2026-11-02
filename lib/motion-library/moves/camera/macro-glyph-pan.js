// Macro glyph pan: the camera sits so close to the word that one stroke fills the frame, slides 20–40% of the frame
// past it on power2.inOut (0.3–0.5 s), then pulls out 8x → 1x on expo.inOut in log space so the whole word resolves in
// its own slot (or hard-cuts to it). The word is a vector copy laid out at its own size and scaled in 2D only, so the
// strokes are re-rasterised crisp at every scale (never a bitmap blown up); its scale is the param or, for small type,
// whatever it takes for one stroke to fill the frame's short side. The word is never split, so joined Arabic stays
// joined; the pan follows the reading direction (mirrored in RTL).
// Source: prompt-motion majin-appsheet "Claude Code / Opus PV" (reference only — rebuilt as our own code).
ML.define({
  id: "camera.macro-glyph-pan",
  category: "camera",
  name: "Extreme close-up pan across a giant glyph",
  does: "The camera is so close to a giant character that only a stroke fragment fills the frame, sliding past before the full word resolves.",
  says: ["reveal", "focus", "energy"],
  energy: 4,
  targets: ["word", "logo"],
  duration: [0.6, 1.6],
  params: {
    direction: { type: "choice", options: ["left", "right", "up"], default: "left" },
    scale: { type: "number", range: [6, 8], default: 7, unit: "x" },
    travel: { type: "number", range: [0.2, 0.4], default: 0.3, unit: "frame" },
    end: { type: "choice", options: ["resolve-to-word", "cut"], default: "resolve-to-word" },
  },
  pairs: ["camera.snap-zoom", "camera.push-in", "text-in.punchline"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.heavy",
  source: { from: "prompt-motion:majin-appsheet-claude-code-opus-5-5-pv-ai", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { el, p, at, end, stage, f } = ctx;
    if (!el) return null;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H;
    const hb = host.getBoundingClientRect(), k = hb.width / (host.offsetWidth || 1) || 1;
    const r = el.getBoundingClientRect();
    const b = { x: (r.left - hb.left) / k, y: (r.top - hb.top) / k, w: r.width / k, h: r.height / k };
    const isSvg = el instanceof SVGElement;

    // the macro copy: the same vector content, with the look's type copied over, in a layer over the scene
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:40;visibility:hidden";
    const ground = document.createElement("div");
    ground.style.cssText = "position:absolute;inset:0;background:var(--x-ground);background-image:var(--x-ground-image)";
    const c = el.cloneNode(true);
    c.removeAttribute("data-slot"); c.removeAttribute("id");
    c.querySelectorAll("[data-slot],[id]").forEach((n) => { n.removeAttribute("data-slot"); n.removeAttribute("id"); });
    const cs = getComputedStyle(el);
    if (!isSvg) {
      for (const prop of ["fontFamily", "fontSize", "fontWeight", "fontStyle", "lineHeight", "letterSpacing", "wordSpacing", "color", "textTransform", "textAlign", "direction", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft"]) c.style[prop] = cs[prop];
      c.style.boxSizing = "border-box";
    } else { c.setAttribute("width", String(b.w)); c.setAttribute("height", String(b.h)); }
    c.style.position = "absolute"; c.style.left = "0"; c.style.top = "0"; c.style.margin = "0";
    c.style.width = b.w + "px"; c.style.height = b.h + "px";
    c.style.transformOrigin = "0 0"; c.style.opacity = "1"; c.style.translate = "none"; c.style.scale = "none"; c.style.filter = "none";
    layer.append(ground, c);
    host.append(layer);

    // how big: the param, or enough for one stroke to fill the short side of the frame
    const glyph = isSvg ? b.h * 0.8 : parseFloat(cs.fontSize) * 0.72;
    const S = ML.clamp(Math.max(p.scale, (1.1 * Math.min(W, H)) / Math.max(4, glyph)), 1.5, 40);
    const lnS = Math.log(S);
    // where the camera looks: a stroke near the word's start in reading order, on the first line
    const dir0 = p.direction === "up" ? "up" : ctx.rtl ? (p.direction === "left" ? "right" : "left") : p.direction;
    const lineH = isSvg ? b.h : Math.min(b.h, parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2);
    // the first word as set (a centred line leaves empty space in the box): its own box, from a text range
    let wb = { x: 0, y: 0, w: b.w, h: lineH };
    if (!isSvg) {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let tn = walker.nextNode();
      while (tn && !tn.textContent.trim()) tn = walker.nextNode();
      if (tn) {
        const s0 = tn.textContent.search(/\S/), m = tn.textContent.slice(s0).match(/^\S+/);
        const rg = document.createRange(); rg.setStart(tn, s0); rg.setEnd(tn, s0 + (m ? m[0].length : 1));
        const q = rg.getBoundingClientRect();
        if (q.width > 0) wb = { x: (q.left - r.left) / k, y: (q.top - r.top) / k, w: q.width / k, h: q.height / k };
      }
    }
    const Fx = wb.x + wb.w * (isSvg ? (dir0 === "left" ? 0.28 : dir0 === "right" ? 0.72 : 0.38) : 0.5);
    const Fy = isSvg ? lineH * 0.55 : wb.y + wb.h * 0.58;
    const d = dir0 === "left" ? [-1, 0] : dir0 === "right" ? [1, 0] : [0, -1];
    const span = (dir0 === "up" ? H : W) * ML.clamp(p.travel, 0.2, 0.4);

    const T = Math.max(0.4, end - at);
    const panD = ML.clamp(T * 0.4, 0.3, 0.5);
    const tR = at + panD + 0.06;
    const resD = ML.clamp(T - panD - 0.12, 0.25, 0.7);
    const p2 = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    const expoIO = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2);
    const cut = p.end === "cut";
    const done = cut ? tR : tR + resD;
    ctx.sfx(at, "whoosh.heavy", 0.42);
    ctx.sfx(tR, cut ? "hit" : "whoosh.soft", cut ? 0.3 : 0.22);
    const opac0 = el.style.opacity;

    return {
      draw(t) {
        if (t < at) { layer.style.visibility = "hidden"; el.style.opacity = "0"; return; }
        if (t >= done) { layer.style.visibility = "hidden"; el.style.opacity = opac0; return; }
        layer.style.visibility = "visible";
        el.style.opacity = "0";
        // the pan: the stroke slides past the centre of the frame
        const u = p2(ML.lin(t, at, at + panD));
        const px = W / 2 - d[0] * span * (0.5 - u), py = H / 2 - d[1] * span * (0.5 - u);
        // the resolve: back to 1x in log space while the stroke travels home to its place in the word
        const e = cut ? 0 : expoIO(ML.lin(t, tR, tR + resD));
        const s = Math.exp(lnS * (1 - e));
        const qx = px + (b.x + Fx - px) * e, qy = py + (b.y + Fy - py) * e;
        c.style.transform = `translate(${(qx - s * Fx).toFixed(2)}px, ${(qy - s * Fy).toFixed(2)}px) scale(${s.toFixed(4)})`;
        ground.style.opacity = (1 - ML.ease(e, 0.15, 0.85)).toFixed(4);
      },
    };
  },
});

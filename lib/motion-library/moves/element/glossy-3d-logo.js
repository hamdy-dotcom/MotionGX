// Glossy 3D logo glows in: the brand mark built as a bevelled, extruded shape out of layered masks of the mark itself
// (an SVG logo masks through an inline <mask>, so its wordmark keeps the brand's real typeface)
// (no 3D engine): an outer glow (the mark blurred 60 px in the brand colour), a stack of darker copies for the
// extrusion that shifts sideways as the mark turns, a light rim up-left and a shadow rim down-right for the bevel, the
// emissive face (glass: translucent with a bright top and a hard inner highlight; plastic: saturated, soft sheen; metal:
// banded greys tinted by the brand), and a specular sweep — a bright skewed band that crosses the face in 1.2 s.
// The mark turns rotateY ±8° as a 2D foreshortening (scaleX = cos θ, never above 1) with the extrusion revealed on the
// turning side, on a radial gradient from the brand colour to the device black.
// Source: prompt-motion "arjunsh1607-opus-5-5-on-ultracode" (reference only — rebuilt as our own code).
ML.define({
  id: "element.glossy-3d-logo",
  category: "element",
  name: "Glossy 3D logo glows in",
  does: "The brand mark rendered as glossy rounded 3D glass glows on a dark gradient while a light sweeps across it.",
  says: ["brand", "luxury", "tech"],
  energy: 3,
  targets: ["logo"],
  duration: [1.5, 4],
  params: {
    material: { type: "choice", options: ["glass", "plastic", "metal"], default: "glass" },
    sweep: { type: "bool", default: true },
    turn: { type: "number", range: [0, 12], default: 8, unit: "deg" },
    depth: { type: "number", range: [0.02, 0.08], default: 0.045 },
    size: { type: "number", range: [0.25, 0.6], default: 0.42 },
  },
  pairs: ["element.app-icon-reveal", "transition.logo-through-dissolve"],
  avoid: ["problem", "playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:arjunsh1607-opus-5-5-on-ultracode", license: "reference", note: "layered-mask extrusion, bevel and sweep are our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const ob = own ? ctx.box(own) : null;
    const big = ob && ob.w > f.W * 0.4 && ob.h > f.H * 0.18;
    const R = big ? ob : f.pic;
    const k = Math.min(f.W, f.H) / 1080;
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;overflow:hidden;border-radius:var(--x-radius);`, host);
    const back = mk("div", "position:absolute;inset:0;background:radial-gradient(closest-side, color-mix(in srgb, var(--x-accent) 55%, var(--x-device)), color-mix(in srgb, var(--x-accent) 12%, var(--x-device)) 60%, var(--x-device));", layer);

    // the mark as a mask: the logo's own SVG (inline, below), its picture, or a rounded tile with an initial
    let url = null, aspect = 1;
    const tag = own && own.tagName ? own.tagName.toLowerCase() : "";
    if (tag === "svg") {
      const vb = (own.getAttribute("viewBox") || `0 0 ${ob.w} ${ob.h}`).split(/[\s,]+/).map(Number);
      aspect = vb[2] / vb[3] || 1;
    } else if (tag === "img" && own.src) {
      aspect = (own.naturalWidth || ob.w) / (own.naturalHeight || ob.h) || 1;
      url = `url("${own.src}")`;
    } else {
      const ch = (Array.from(((own && own.textContent) || "").trim())[0] || (rtl ? "ع" : "B")).replace(/[<&>"]/g, "");
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><mask id="m"><rect width="100" height="100" rx="24" fill="#fff"/><text x="50" y="68" font-size="54" font-weight="700" text-anchor="middle" font-family="sans-serif" fill="#000">${ch}</text></mask></defs><rect width="100" height="100" rx="24" fill="#000" mask="url(#m)"/></svg>`;
      url = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
    }
    // size: a share of the region, never past the picture's own pixels
    let H = Math.min(R.h * ML.clamp(p.size, 0.25, 0.6), (R.w * 0.7) / aspect);
    if (tag === "img" && own.naturalHeight) H = Math.min(H, own.naturalHeight);
    const W = H * aspect;
    const cx = R.w / 2, cy = R.h / 2;
    const rig = mk("div", `position:absolute;left:${cx - W / 2}px;top:${cy - H / 2}px;width:${W}px;height:${H}px;`, layer);
    let maskCss = `-webkit-mask:${url} center / contain no-repeat;mask:${url} center / contain no-repeat;`;
    if (tag === "svg") {
      // an alpha <mask> holding a clone of the logo in the page, where its web fonts and var() colours resolve
      const NS = "http://www.w3.org/2000/svg", id = `ml-glossy-mark-${doc.querySelectorAll("[data-ml-glossy-mark]").length}`;
      const defs = doc.createElementNS(NS, "svg");
      defs.setAttribute("data-ml-glossy-mark", "1"); defs.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;";
      const m = doc.createElementNS(NS, "mask");
      for (const [a, v] of Object.entries({ id, maskUnits: "userSpaceOnUse", maskContentUnits: "userSpaceOnUse", x: 0, y: 0, width: W, height: H })) m.setAttribute(a, v);
      m.style.maskType = "alpha";
      const c = own.cloneNode(true);
      c.removeAttribute("data-slot"); c.removeAttribute("style");
      c.setAttribute("width", W); c.setAttribute("height", H); c.setAttribute("preserveAspectRatio", "xMidYMid meet");
      m.append(c); defs.append(m); layer.append(defs);
      maskCss = `-webkit-mask:url(#${id});mask:url(#${id});`;
    }
    const masked = (css, parent = rig) => mk("div", `position:absolute;inset:0;${maskCss}${css}`, parent);

    // outer glow, 60 px (a shape, never a picture): blurred outside the mask, so it spills past the mark
    const glow = mk("div", `position:absolute;inset:0;filter:blur(${60 * k}px);`, rig);
    masked("background:var(--x-accent);", glow);
    // the extrusion: darker copies stepping back
    const N = 12;
    const dep = H * ML.clamp(p.depth, 0.02, 0.08);
    const ext = Array.from({ length: N }, (_, i) => masked(`background:color-mix(in srgb, var(--x-accent) ${Math.round(62 - (i / N) * 30)}%, var(--x-device));`));
    ext.reverse(); // the deepest first, under the rest
    for (const e of ext) rig.append(e);
    const mat = p.material;
    // bevel rims
    const rimLight = masked(`background:color-mix(in srgb, var(--x-accent) ${mat === "metal" ? 10 : 35}%, var(--x-pointer-edge));`);
    const rimDark = masked(`background:color-mix(in srgb, var(--x-accent) 45%, var(--x-device));`);
    // the face
    const FACE = {
      glass: "linear-gradient(170deg, color-mix(in srgb, var(--x-accent) 45%, var(--x-pointer-edge)) 0%, color-mix(in srgb, var(--x-accent) 88%, transparent) 46%, color-mix(in srgb, var(--x-accent) 85%, var(--x-device)) 70%, color-mix(in srgb, var(--x-accent-2) 75%, var(--x-accent)) 100%)",
      plastic: "linear-gradient(160deg, color-mix(in srgb, var(--x-accent) 75%, var(--x-pointer-edge)) 0%, var(--x-accent) 45%, color-mix(in srgb, var(--x-accent) 80%, var(--x-device)) 100%)",
      metal: "linear-gradient(180deg, color-mix(in srgb, var(--x-accent) 8%, var(--x-pointer-edge)) 0%, color-mix(in srgb, var(--x-accent) 14%, var(--x-dim)) 34%, color-mix(in srgb, var(--x-accent) 10%, color-mix(in srgb, var(--x-dim) 15%, var(--x-pointer-edge))) 52%, color-mix(in srgb, var(--x-accent) 18%, color-mix(in srgb, var(--x-dim) 60%, var(--x-device))) 78%, color-mix(in srgb, var(--x-accent) 12%, color-mix(in srgb, var(--x-dim) 35%, var(--x-pointer-edge))) 100%)",
    }[mat] || "";
    const face = masked(`background:${FACE};`);
    // glass: a hard inner highlight on the upper half; all: a soft top sheen
    const sheen = masked(mat === "glass"
      ? "background:linear-gradient(180deg, color-mix(in srgb, var(--x-pointer-edge) 55%, transparent) 0%, color-mix(in srgb, var(--x-pointer-edge) 30%, transparent) 47%, transparent 48%);"
      : `background:linear-gradient(180deg, color-mix(in srgb, var(--x-pointer-edge) ${mat === "metal" ? 35 : 30}%, transparent) 0%, transparent 60%);`);
    const hard = mat === "glass" ? masked("background:linear-gradient(180deg, transparent 6%, color-mix(in srgb, var(--x-pointer-edge) 35%, transparent) 7%, transparent 22%);") : null;
    // the specular sweep: a skewed bright band crossing the face
    const sweep = p.sweep ? masked(`background:linear-gradient(${rtl ? 75 : 105}deg, transparent 0%, transparent 40%, color-mix(in srgb, var(--x-pointer-edge) 80%, transparent) 50%, transparent 60%, transparent 100%);background-size:300% 100%;background-repeat:no-repeat;mix-blend-mode:screen;`) : null;

    // times
    const tIn = at, dIn = 0.8, tSw = at + 0.45, dSw = 1.2;
    const leaveA = Math.max(tSw + dSw, end - 0.35);
    const amp = (ML.clamp(p.turn, 0, 12) * Math.PI) / 180;
    ctx.sfx(at, "swell", 0.4);
    if (sweep) ctx.sfx(tSw + 0.3, "whoosh.soft", 0.18);

    return {
      draw(t) {
        const leave = ML.clamp((t - leaveA) / 0.3);
        layer.style.visibility = t < at - 0.15 ? "hidden" : "visible";
        layer.style.opacity = (1 - leave).toFixed(4);
        if (own && own.style) { const o = t >= at ? "0" : ""; if (own.style.opacity !== o) own.style.opacity = o; }
        back.style.opacity = ML.out(t, at - 0.15, at + 0.4).toFixed(4);
        const e = ML.out(t, tIn, tIn + dIn);
        // a slow turn: rotateY ±amp as foreshortening, the extrusion shows on the far side
        const th = amp * Math.sin((t - at) * 1.6 + 0.4) * (0.3 + 0.7 * e);
        const sx = Math.cos(th), off = Math.sin(th) * dep * 2.2;
        rig.style.opacity = e.toFixed(4);
        rig.style.transform = `translateY(${((1 - e) * 16 * k).toFixed(2)}px) scale(${((0.92 + 0.08 * e) * sx).toFixed(4)}, ${(0.92 + 0.08 * e).toFixed(4)})`;
        ext.forEach((x, i) => { const d = ((N - i) / N) * dep; x.style.transform = `translate(${(-Math.sin(th) * d * 2.2).toFixed(2)}px, ${d.toFixed(2)}px)`; });
        rimLight.style.transform = `translate(${(-1.6 * k).toFixed(2)}px, ${(-1.6 * k).toFixed(2)}px)`;
        rimDark.style.transform = `translate(${(1.2 * k).toFixed(2)}px, ${(1.6 * k).toFixed(2)}px)`;
        face.style.opacity = mat === "glass" ? "0.92" : "1";
        glow.style.opacity = (0.75 * ML.ease(t, tIn, tIn + 1) * (0.85 + 0.15 * Math.sin((t - at) * 2.2))).toFixed(4);
        sheen.style.transform = `translateX(${(off * 0.6).toFixed(2)}px)`;
        if (hard) hard.style.transform = sheen.style.transform;
        if (sweep) {
          const u = ML.ease(t, tSw, tSw + dSw);
          sweep.style.backgroundPosition = `${(rtl ? u * 100 : 100 - u * 100).toFixed(2)}% 0`;
          sweep.style.opacity = u > 0 && u < 1 ? "1" : "0";
        }
      },
    };
  },
});

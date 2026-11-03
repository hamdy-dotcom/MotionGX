// Hatched shadow band: instead of soft shading, the shadow side of a shape or photo is filled with fine ink hatching
// or a dot pattern. Port of MengTo/Skills illustration-bold-pop pop.mjs's texture vocabulary — hatch (1.25 on 5, 45°),
// dots (r 1.15 on 7), fine dots (r .75 on 4.6), grid (9), 45° stripes (7 on 14), checker (4.5 on 9) — scaled with the
// target. Where: the right 20-30 % band of the shape (light from the top-left; mirrored in RTL), or on a photo the
// shadow side read from its luminance (an SVG luminance mask of the picture itself, thresholded at the picture's own
// darker tones). Ink-sketch variant (a negative angle, -48..-58°): lines 1-1.15 at 2-3.2 spacing, ends jittered.
// Draw-on: the hatch lines draw across the band one after another (stagger .01-.02 s, the whole sweep held under
// about 0.7 s); other patterns sweep in from the lit side. The angle is pop.mjs's patternTransform rotate() in both
// draw-on and tiled hatch, mirrored in RTL with the light. An inline SVG logo is hatched in its own shape, not its box.
// SVG pattern + clipPath / mask, all from t.
// Source: MengTo/Skills illustration/illustration-bold-pop scripts/pop.mjs (MIT).
ML.define({
  id: "photo.hatch-shadow-band",
  category: "photo",
  name: "Hatched shadow band",
  does: "Instead of soft shading, the shadow side of each shape is filled with fine ink hatching or a dot pattern.",
  says: ["playful", "story", "simplicity"],
  energy: 2,
  targets: ["image", "shape", "card", "logo"],
  duration: [0.5, 20],
  params: {
    pattern: { type: "choice", options: ["hatch", "dots", "fine-dots", "stripe", "grid", "checker"], default: "hatch" },
    band: { type: "number", range: [0.2, 0.3], default: 0.25 },
    angle: { type: "number", range: [-58, 45], default: 45, unit: "deg" },
    draw_on: { type: "bool", default: true },
    side: { type: "choice", options: ["auto", "band", "luminance"], default: "auto" },
    colour: { type: "choice", options: ["ink", "accent", "ground"], default: "ink" },
    stagger: { type: "number", range: [0.01, 0.02], default: 0.015, unit: "s" },
  },
  pairs: ["photo.halftone", "element.outline-draw-fill"],
  avoid: ["luxury", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:illustration/illustration-bold-pop/scripts/pop.mjs", license: "MIT" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const host = ctx.scene || ctx.stage;
    const b = ctx.box(el);
    if (b.w < 8 || b.h < 8) return null;
    const NS = "http://www.w3.org/2000/svg";
    const S = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v); if (parent) parent.append(e); return e; };
    const uid = "hsb" + Math.round(ML.rnd(b.x + b.y * 7 + b.w, 3) * 1e6);
    const cs = getComputedStyle(el);
    const rx = Math.min(parseFloat(cs.borderTopLeftRadius) || 0, b.w / 2, b.h / 2);
    const pic = el.tagName === "IMG" ? el : el.querySelector && el.querySelector("img");
    const mode = p.side === "auto" ? (pic ? "luminance" : "band") : p.side === "luminance" && !pic ? "band" : p.side;
    const u = Math.max(1.2, b.w / 480); // the source's 480-wide drawing scale
    const ink = p.colour === "accent" ? "var(--x-accent)" : p.colour === "ground" ? "var(--x-ground)" : "var(--x-ink)";
    const svg = S("svg", { width: b.w, height: b.h, viewBox: `0 0 ${b.w} ${b.h}` });
    svg.style.cssText = `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;overflow:hidden;pointer-events:none;visibility:hidden;z-index:3`;
    host.append(svg);
    const defs = S("defs", {}, svg);
    // ── the region: a band clipped to the shape, or the picture's own shadows ──
    const lightRight = ctx.rtl; // light from the top-left (top-right in RTL): the shadow band sits on the far side
    const bw = b.w * ML.clamp(p.band, 0.2, 0.3);
    const regionX = lightRight ? 0 : b.w - bw;
    const clip = S("clipPath", { id: uid + "c" }, defs);
    S("rect", { x: 0, y: 0, width: b.w, height: b.h, rx, ry: rx }, clip);
    const angDeg = ctx.rtl ? -p.angle : p.angle; // the hatch follows the light
    let maskRef = "", bandOnly = mode === "band";
    if (mode === "luminance") {
      // the shadow map, read once from the picture as laid out (object-fit cover): white where it is darker than its
      // own 40th percentile, with a soft edge; a raster mask, so every frame is the same
      const mask = S("mask", { id: uid + "m", maskUnits: "userSpaceOnUse", x: 0, y: 0, width: b.w, height: b.h }, defs);
      let href = "";
      try {
        const mw = Math.max(8, Math.round(b.w / (3 * u))), mh = Math.max(8, Math.round(b.h / (3 * u)));
        const c = document.createElement("canvas"); c.width = mw; c.height = mh;
        const g = c.getContext("2d", { willReadFrequently: true });
        const nw = pic.naturalWidth || mw, nh = pic.naturalHeight || mh;
        const sc = (cs.objectFit || "cover") === "contain" ? Math.min(b.w / nw, b.h / nh) : Math.max(b.w / nw, b.h / nh);
        const cw = b.w / sc, ch = b.h / sc;
        g.drawImage(pic, (nw - cw) / 2, (nh - ch) / 2, cw, ch, 0, 0, mw, mh);
        const img = g.getImageData(0, 0, mw, mh), d = img.data, L = new Float32Array(mw * mh);
        for (let i = 0; i < L.length; i++) L[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
        const sorted = Array.from(L).sort((a, c2) => a - c2), q = (x) => sorted[Math.floor((sorted.length - 1) * x)], thr = q(0.4);
        const edge = Math.max(0.006, (q(0.9) - q(0.1)) * 0.12); // the soft edge follows the picture's own tonal spread
        for (let i = 0; i < L.length; i++) { const v = Math.round(255 * ML.clamp((thr - L[i]) / edge + 0.5)); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
        g.putImageData(img, 0, 0);
        href = c.toDataURL("image/png");
      } catch (e) { href = ""; }
      if (href) {
        const im = S("image", { x: 0, y: 0, width: b.w, height: b.h, preserveAspectRatio: "none" }, mask);
        im.setAttribute("href", href);
      } else {
        // an unreadable picture: the shadow band instead
        bandOnly = true;
        S("rect", { x: regionX, y: 0, width: bw, height: b.h, fill: "#fff" }, mask);
      }
      maskRef = `url(#${uid}m)`;
    } else {
      const mask = S("mask", { id: uid + "m", maskUnits: "userSpaceOnUse", x: 0, y: 0, width: b.w, height: b.h }, defs);
      S("rect", { x: regionX, y: 0, width: bw, height: b.h, fill: "#fff" }, mask);
      maskRef = `url(#${uid}m)`;
    }
    const g0 = S("g", { "clip-path": `url(#${uid}c)` }, svg);
    if (el.tagName.toLowerCase() === "svg") {
      // an SVG logo or shape: the hatch stays inside its own drawing
      const m2 = S("mask", { id: uid + "o", maskUnits: "userSpaceOnUse", x: 0, y: 0, width: b.w, height: b.h }, defs);
      const cl = el.cloneNode(true), from = [el, ...el.querySelectorAll("*")], to = [cl, ...cl.querySelectorAll("*")];
      from.forEach((e, i) => { const s = getComputedStyle(e); if (i === 0) return; if (s.fill !== "none") to[i].style.fill = "#fff"; if (s.stroke !== "none") to[i].style.stroke = "#fff"; });
      cl.removeAttribute("data-slot"); cl.removeAttribute("data-slot-sample"); cl.style.cssText = ""; cl.setAttribute("x", 0); cl.setAttribute("y", 0); cl.setAttribute("width", b.w); cl.setAttribute("height", b.h);
      m2.append(cl);
      g0.setAttribute("mask", `url(#${uid}o)`);
    }
    const region = S("g", { mask: maskRef }, g0);
    region.style.color = ink;
    // the region's extent in x (where the sweep runs)
    const x0 = bandOnly ? regionX : 0, x1 = bandOnly ? regionX + bw : b.w;
    const sketch = p.angle < 0;
    const lines = [];
    let sweep = null;
    if (p.pattern === "hatch" && p.draw_on) {
      // individual lines at the angle, ordered from the lit side, each drawing on
      const ang = (angDeg * Math.PI) / 180, gap = (sketch ? 2.6 : 4.5) * u, wdt = (sketch ? 1.1 : 1.15) * u;
      const dx = Math.cos(ang), dy = Math.sin(ang); // the line's normal
      const vx = -Math.sin(ang), vy = Math.cos(ang); // along the line: a vertical line turned by the angle, as the source's tile
      const cx = (x0 + x1) / 2, cy = b.h / 2, half = Math.hypot(x1 - x0, b.h) / 2 + gap;
      const count = Math.ceil((half * 2) / gap);
      for (let i = 0; i < count; i++) {
        const o = -half + i * gap, mx = cx + dx * o, my = cy + dy * o;
        const j0 = sketch ? (ML.rnd(i, 31) - 0.5) * half * 0.25 : 0, j1 = sketch ? (ML.rnd(i, 32) - 0.5) * half * 0.25 : 0;
        const a = { x: mx - vx * (half + j0), y: my - vy * (half + j0) }, c = { x: mx + vx * (half + j1), y: my + vy * (half + j1) };
        if (Math.max(a.x, c.x) < x0 - gap || Math.min(a.x, c.x) > x1 + gap) continue;
        const ln = S("line", { x1: a.x.toFixed(2), y1: a.y.toFixed(2), x2: c.x.toFixed(2), y2: c.y.toFixed(2), "stroke-linecap": "round" }, region);
        ln.style.stroke = "currentColor"; ln.style.strokeWidth = wdt.toFixed(2) + "px";
        const L = Math.hypot(c.x - a.x, c.y - a.y);
        ln.style.strokeDasharray = `${L.toFixed(1)} ${L.toFixed(1)}`;
        lines.push({ ln, L, key: (mx - x0) / Math.max(1, x1 - x0) });
      }
      // lit side first
      lines.sort((A, B) => (lightRight ? B.key - A.key : A.key - B.key));
    } else {
      // pattern tiles (pop.mjs's defs), scaled; drawn-on as a sweep from the lit side
      const pt = S("pattern", { id: uid + "p", patternUnits: "userSpaceOnUse" }, defs);
      const T = (w, h, rot) => { pt.setAttribute("width", w * u); pt.setAttribute("height", h * u); pt.setAttribute("patternTransform", rot ? `rotate(${rot})` : ""); };
      const fillC = (e) => { e.style.fill = ink; return e; }, strokeC = (e, w) => { e.style.stroke = ink; e.style.strokeWidth = w * u + "px"; e.style.fill = "none"; return e; };
      const ang = angDeg;
      switch (p.pattern) {
        case "hatch": T(sketch ? 2.6 : 5, sketch ? 2.6 : 5, ang); strokeC(S("line", { x1: (sketch ? 1.3 : 2.5) * u, y1: -u, x2: (sketch ? 1.3 : 2.5) * u, y2: (sketch ? 3.6 : 6) * u }, pt), sketch ? 1.1 : 1.25); break;
        case "dots": T(7, 7); fillC(S("circle", { cx: 3.5 * u, cy: 3.5 * u, r: 1.15 * u }, pt)); break;
        case "fine-dots": T(4.6, 4.6); fillC(S("circle", { cx: 2.3 * u, cy: 2.3 * u, r: 0.75 * u }, pt)); break;
        case "grid": T(9, 9); strokeC(S("path", { d: `M${9 * u},${0.6 * u} H${0.6 * u} V${9 * u}` }, pt), 1.2); break;
        case "stripe": T(14, 14, ctx.rtl ? -45 : 45); fillC(S("rect", { width: 7 * u, height: 14 * u }, pt)); break;
        default: T(9, 9); fillC(S("rect", { width: 4.5 * u, height: 4.5 * u }, pt)); fillC(S("rect", { x: 4.5 * u, y: 4.5 * u, width: 4.5 * u, height: 4.5 * u }, pt));
      }
      const sclip = S("clipPath", { id: uid + "s" }, defs);
      sweep = S("rect", { x: x0, y: 0, width: 0, height: b.h }, sclip);
      S("rect", { x: 0, y: 0, width: b.w, height: b.h, fill: `url(#${uid}p)`, "clip-path": `url(#${uid}s)` }, region);
    }
    const st = lines.length ? Math.min(ML.clamp(p.stagger, 0.01, 0.02), 0.55 / lines.length) : 0;
    const drawDur = 0.18;
    const sweepDur = 0.6;
    ctx.sfx(at, "tap", 0.2);
    if (lines.length > 20) ctx.sfx(at + st * lines.length * 0.5, "tap", 0.12);
    return {
      draw(t) {
        const on = t >= at - 1e-6 && t < end;
        svg.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        svg.style.opacity = (1 - ML.lin(t, end - 0.25, end)).toFixed(4);
        if (lines.length) {
          for (let i = 0; i < lines.length; i++) {
            const q = lines[i], v = ML.out(t, at + i * st, at + i * st + drawDur);
            q.ln.style.strokeDashoffset = (q.L * (1 - v)).toFixed(2);
            q.ln.style.visibility = v > 0 ? "visible" : "hidden";
          }
        } else if (sweep) {
          const v = p.draw_on ? ML.ease(t, at, at + sweepDur) : 1;
          const w = (x1 - x0) * v;
          sweep.setAttribute("x", (lightRight ? x1 - w : x0).toFixed(2));
          sweep.setAttribute("width", w.toFixed(2));
          if (!p.draw_on) region.style.opacity = ML.ease(t, at, at + 0.3).toFixed(4);
        }
      },
    };
  },
});

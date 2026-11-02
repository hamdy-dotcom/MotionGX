// Macro logo pull-back: the camera skims close and low along a huge dark extruded mark while short light streaks run
// along its edges, then pulls back until the whole mark sits small and centred. The mark is the logo's own vector
// content stacked into an extrusion (a dozen copies stepped in depth, shaded from the look's ink), seen through a 2D
// camera: scale start_scale → 1 on expo.inOut in log space, roll rotate° → 0, and a low-angle squash (scaleY 0.78 → 1)
// that opens as the camera rises. The pivot travels from a lit edge of the mark to its centre, so the frame begins on
// an edge and ends on the whole. Edge lights: 0–3 short segments (accent → a core in the panel colour, glow 8 px) run
// along the shapes' outlines at ~600 px/s on screen, fading in and out. A warm volumetric glow (radial, ~20%) sits near
// the lit edge. Vector at every scale (a raster logo is never taken past its own pixels).
// Source: prompt-motion robj3d3 "Opus max effort" (reference only — rebuilt as our own code).
ML.define({
  id: "camera.macro-logo-pullback",
  category: "camera",
  name: "Macro along a 3D logo, pull back to reveal",
  does: "The camera skims close along a huge dark extruded logo as light streaks run along its edges, then pulls back until the whole mark sits small and centred.",
  says: ["luxury", "reveal", "brand"],
  energy: 3,
  targets: ["logo"],
  duration: [2, 4],
  params: {
    start_scale: { type: "number", range: [6, 14], default: 12, unit: "x" },
    rotate: { type: "number", range: [0, 40], default: 25, unit: "deg" },
    duration: { type: "number", range: [1.8, 3.5], default: 2.5, unit: "s" },
    edge_lights: { type: "number", range: [0, 3], default: 2 },
  },
  pairs: ["camera.macro-glyph-pan", "text-in.punchline"],
  avoid: ["urgency", "playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:robj3d3-opus-5-5-max-effort", license: "reference", note: "technique rebuilt as our own code (2D vector camera over a stacked extrusion)" },
  setup(ctx) {
    const { el, p, at, end, stage, f } = ctx;
    if (!el) return null;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H;
    const hb = host.getBoundingClientRect(), k = hb.width / (host.offsetWidth || 1) || 1;
    const r = el.getBoundingClientRect();
    const b = { w: Math.max(1, r.width / k), h: Math.max(1, r.height / k) };
    const isSvg = el instanceof SVGElement;
    const NS = "http://www.w3.org/2000/svg";
    const uid = "mlp" + Math.floor(ML.rnd(b.w + b.h * 7, 3) * 1e6);

    // a clean copy of the mark (no slots, no ids, the look's type copied over for an HTML mark)
    const cs = getComputedStyle(el);
    const copy = () => {
      const c = el.cloneNode(true);
      c.removeAttribute("data-slot"); c.removeAttribute("id");
      c.querySelectorAll("[data-slot],[id]").forEach((n) => { n.removeAttribute("data-slot"); n.removeAttribute("id"); });
      if (isSvg) { c.setAttribute("width", String(b.w)); c.setAttribute("height", String(b.h)); c.style.overflow = "visible"; }
      else for (const prop of ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "color", "textAlign", "direction"]) c.style[prop] = cs[prop];
      c.style.cssText += `;position:absolute;left:0;top:0;margin:0;width:${b.w}px;height:${b.h}px;opacity:1;transform:none;translate:none;scale:none;filter:none;box-sizing:border-box`;
      return c;
    };

    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:40;visibility:hidden;background:var(--x-ground);background-image:var(--x-ground-image)";
    const style = document.createElement("style");
    // the extrusion's sides: the look's ink, a touch darker the deeper they go
    // (an svg mark: its shapes only; an HTML mark: its boxes too)
    style.textContent = (isSvg ? `.${uid}-side * { fill: var(--c) !important; stroke: var(--c) !important; }`
      : `.${uid}-side, .${uid}-side * { color: var(--c) !important; background-color: var(--c) !important; border-color: var(--c) !important; fill: var(--c) !important; }`) + `
.${uid}-light * { fill: none !important; }`;
    const glow = document.createElement("div");
    glow.style.cssText = "position:absolute;inset:0;background:radial-gradient(ellipse 55% 42% at 38% 40%, color-mix(in srgb, var(--x-accent) 55%, var(--x-panel)), transparent 70%);mix-blend-mode:screen";
    const vig = document.createElement("div");
    vig.style.cssText = "position:absolute;inset:0;background:radial-gradient(ellipse 80% 70% at 50% 50%, transparent 45%, color-mix(in srgb, var(--x-ink) 22%, transparent))";
    const rig = document.createElement("div");
    rig.style.cssText = `position:absolute;left:0;top:0;width:${b.w}px;height:${b.h}px;transform-origin:0 0`;
    const K = 12, sides = [];
    for (let i = K; i >= 1; i--) {
      const s = copy();
      s.classList.add(`${uid}-side`);
      s.style.setProperty("--c", `color-mix(in srgb, var(--x-ink) ${(100 - (i / K) * 18).toFixed(1)}%, var(--x-dim))`);
      rig.append(s); sides.push({ s, i });
    }
    const face = copy();
    // a bevel: the face's rim catches a thin line of light
    const rim = copy();
    rim.classList.add(`${uid}-side`);
    rim.style.setProperty("--c", "color-mix(in srgb, var(--x-dim) 70%, var(--x-panel))");
    rig.append(rim, face);

    // edge lights: the mark's outlines as stroked copies with one short dash each, travelling
    const lights = [];
    const nL = Math.round(ML.clamp(p.edge_lights, 0, 3));
    const lightSvg = () => {
      if (isSvg) { const c = copy(); c.classList.add(`${uid}-light`); return c; }
      const s = document.createElementNS(NS, "svg");
      s.setAttribute("width", String(b.w)); s.setAttribute("height", String(b.h));
      s.style.cssText = `position:absolute;left:0;top:0;overflow:visible`;
      const rr = document.createElementNS(NS, "rect");
      rr.setAttribute("width", String(b.w)); rr.setAttribute("height", String(b.h));
      rr.setAttribute("rx", String(Math.min(b.w, b.h) * 0.12));
      s.append(rr); s.classList.add(`${uid}-light`);
      return s;
    };
    for (let i = 0; i < nL; i++) {
      for (const core of [false, true]) {
        const s = lightSvg();
        s.style.filter = core ? "none" : "drop-shadow(0 0 8px var(--x-accent))";
        rig.append(s);
        const shapes = [...s.querySelectorAll("rect,path,circle,ellipse,polygon,polyline,line,text")];
        lights.push({ i, core, shapes, root: s });
      }
    }
    layer.append(style, glow, rig, vig);
    host.append(layer);
    // outline lengths (measured once laid out)
    for (const L of lights) L.len = L.shapes.map((n) => {
      try { if (n.getTotalLength && n.tagName !== "text") return Math.max(1, n.getTotalLength()); } catch (e) { /* not a geometry */ }
      const bb = n.getBBox ? n.getBBox() : { width: b.w, height: b.h }; return Math.max(1, 2.6 * (bb.width + bb.height));
    });
    // in user units: the svg's own viewBox scale
    const vb = isSvg && el.viewBox && el.viewBox.baseVal && el.viewBox.baseVal.width ? b.w / el.viewBox.baseVal.width : 1;

    // the camera
    const fit = Math.min((0.42 * W) / b.w, (0.2 * H) / b.h, 6);
    const lnS = Math.log(ML.clamp(p.start_scale, 6, 14));
    const D = ML.clamp(p.duration, 1.8, 3.5);
    const t1 = Math.min(end - 0.15, at + D);
    const mir = ctx.rtl ? -1 : 1;
    const rot0 = ML.clamp(p.rotate, 0, 40) * mir;
    const expoIO = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2);
    // the lit edge the camera starts on: the mark's upper-leading edge
    const E = { x: b.w * (ctx.rtl ? 0.8 : 0.2), y: b.h * 0.12 }, C = { x: b.w / 2, y: b.h / 2 };
    ctx.sfx(at, "swell", 0.4);
    ctx.sfx(Math.max(at, t1 - 0.25), "land.light", 0.22);
    const vis0 = el.style.visibility;

    return {
      draw(t) {
        if (t < at || t >= end) { layer.style.visibility = "hidden"; el.style.visibility = vis0; return; }
        layer.style.visibility = "visible";
        el.style.visibility = "hidden";
        const e = expoIO(ML.lin(t, at, t1));
        const z = Math.exp(lnS * (1 - e)), s = fit * z;
        const rot = rot0 * (1 - e), sq = 0.78 + 0.22 * e;
        const px = E.x + (C.x - E.x) * e, py = E.y + (C.y - E.y) * e;
        rig.style.transform = `translate(${W / 2}px, ${H / 2}px) scale(1, ${sq.toFixed(4)}) rotate(${rot.toFixed(3)}deg) scale(${s.toFixed(4)}) translate(${(-px).toFixed(3)}px, ${(-py).toFixed(3)}px)`;
        // the extrusion: deep while the camera is low, a shallow step once it faces the mark
        const depth = b.h * (0.06 + 0.1 * (1 - e));
        const ang = (58 + 22 * (1 - e)) * (Math.PI / 180);
        for (const { s: n, i } of sides) n.style.transform = `translate(${((Math.cos(ang) * depth * i * mir) / K).toFixed(3)}px, ${((Math.sin(ang) * depth * i) / K).toFixed(3)}px)`;
        rim.style.transform = `translate(${(-0.012 * b.h * mir).toFixed(3)}px, ${(-0.012 * b.h).toFixed(3)}px)`;
        // edge lights: ~600 px/s on screen, so slower in the mark's units while it is huge
        const tau = t - at;
        for (const L of lights) {
          const a0 = at + L.i * 0.35, a1 = Math.max(a0 + 0.6, t1 - 0.2 + L.i * 0.1);
          const env = Math.sin(Math.PI * ML.clamp((t - a0) / (a1 - a0)));
          const travel = (600 * tau) / (fit * Math.exp(lnS * (1 - e * 0.5))) / vb;
          L.shapes.forEach((n, j) => {
            const len = L.len[j];
            const seg = Math.max(2, len * 0.14);
            n.style.stroke = L.core ? "color-mix(in srgb, var(--x-panel) 92%, var(--x-accent))" : "var(--x-accent)";
            n.style.strokeWidth = String(((L.core ? 1.2 : 2.6) / Math.max(0.5, s * vb)) * Math.min(6, 1 + z * 0.3));
            n.style.strokeLinecap = "round";
            n.style.strokeDasharray = `${seg.toFixed(2)} ${(len * 2).toFixed(2)}`;
            n.style.strokeDashoffset = (-((travel + len * (L.i * 0.47 + j * 0.31)) % (len * 1.0))).toFixed(2);
          });
          L.root.style.opacity = env.toFixed(4);
        }
        glow.style.opacity = (0.5 - 0.22 * e).toFixed(4);
      },
    };
  },
});

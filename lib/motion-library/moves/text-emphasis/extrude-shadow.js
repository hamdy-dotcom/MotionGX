// Extrude shadow: a solid extrusion grows diagonally out from behind the flat word — one copy of the word per pixel of
// depth (6–24) stacked behind it, each offset (i·cos a, i·sin a) along the extrusion angle, the far copies shading a
// little deeper. The offsets scale 0 → 1 over 0.3 s power2.out. Colour: the look's dark ink on light looks (front face
// turns panel off-white, the classic block letter); on dark looks the extrusion takes a dark accent tone and the face
// keeps its ink. 3D variant: the group swings rotateY −15° rotateX 10° over 0.5 s power2.out over a soft floor shadow.
// Optional group tilt. Works on words, headlines, logos and pictures (copies are clones of the target's content).
// RTL mirrors the angle so the depth falls away from the reading start.
// Source: prompt-motion:sahildesigner23-ok-opus-5-5-max + web3wesley-this-took-opus-5-5 (reference) — our own rebuild.
ML.define({
  id: "text-emphasis.extrude-shadow",
  category: "text-emphasis",
  name: "Word grows a 3D extrusion",
  does: "A solid extrusion grows diagonally out from behind the flat word, optionally as it swings slightly in 3D.",
  says: ["energy", "brand", "playful"],
  energy: 3,
  targets: ["word", "logo", "headline"],
  duration: [0.5, 3],
  params: {
    depth: { type: "number", range: [6, 24], default: 14, unit: "px" },
    angle: { type: "number", range: [0, 360], default: 45, unit: "deg" },
    colour: { type: "text", default: "ink" },
    face: { type: "choice", options: ["auto", "keep", "panel", "accent"], default: "auto" },
    tilt3d: { type: "bool", default: false },
    tilt: { type: "number", range: [-8, 8], default: 0, unit: "deg" },
    grow: { type: "number", range: [0.2, 0.6], default: 0.3, unit: "s" },
  },
  pairs: ["text-in.punchline", "text-emphasis.font-style-morph"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "prompt-motion:sahildesigner23-ok-opus-5-5-max", license: "reference", note: "our own rebuild; also web3wesley-this-took-opus-5-5" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const VARS = ["accent", "accent-2", "accent-ink", "ink", "dim", "ground", "panel", "panel-2", "good", "bad", "line", "ring"];
    const name = (v, d) => { v = String(v || d).trim().replace(/^var\(--x-|\)$/g, "").replace(/^--x-|^x-/, ""); return VARS.includes(v) ? v : d; };
    const lum = (v) => {
      const pr = document.createElement("i"); pr.style.color = `var(--x-${v})`; pr.style.display = "none"; el.parentElement.append(pr);
      const m = getComputedStyle(pr).color.match(/[\d.]+/g) || [0, 0, 0]; pr.remove();
      const [r, g, b] = m.slice(0, 3).map((x) => +x / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const darkLook = lum("ground") < 0.4;
    let cname = name(p.colour, "ink"), ext = `var(--x-${cname})`, face = null;
    // dark look + dark-ink extrusion would vanish into the ground: a dark accent tone instead, face keeps its ink
    if (cname === "ink" && darkLook) ext = "color-mix(in srgb, var(--x-accent) 55%, var(--x-ground))";
    if (p.face === "panel") face = "var(--x-panel)";
    else if (p.face === "accent") face = "var(--x-accent)";
    else if (p.face === "auto" && cname === "ink" && !darkLook) face = "var(--x-panel)";
    const isSvg = el.tagName.toLowerCase() === "svg", isImg = el.tagName === "IMG";
    const W = el.offsetWidth || el.getBoundingClientRect().width, H = el.offsetHeight || el.getBoundingClientRect().height;
    const fs = parseFloat(getComputedStyle(el).fontSize) || 56;
    const u = isSvg || isImg ? Math.max(0.6, Math.min(2, H / 80)) : Math.max(0.6, Math.min(2.2, fs / 90)); // depth px read right at ~90 px type
    const N = Math.round(p.depth), step = u;
    const ang = ((rtl ? 180 - p.angle : p.angle) * Math.PI) / 180, dx = Math.cos(ang) * step, dy = Math.sin(ang) * step;
    // the stack: copies behind the target, inside a wrapper so the group can tilt as one
    let host = el, copies = [];
    if (isSvg || isImg) {
      // replaced elements: wrap them, copies are sibling clones in the wrapper
      const wrap = document.createElement("span");
      Object.assign(wrap.style, { position: "relative", display: "inline-block", width: W + "px", height: H + "px", isolation: "isolate", verticalAlign: getComputedStyle(el).verticalAlign });
      el.replaceWith(wrap); wrap.append(el);
      el.style.position = "relative"; el.style.zIndex = "1"; el.style.display = "block";
      for (let i = N; i >= 1; i--) {
        const c = el.cloneNode(true); c.removeAttribute("data-slot"); c.removeAttribute("id"); c.setAttribute("aria-hidden", "true");
        Object.assign(c.style, { position: "absolute", left: "0", top: "0", zIndex: "0", margin: "0" });
        // a flat silhouette in the extrusion colour: brightness(0) then the colour laid over by drop-shadow is lossy, so
        // svg copies are recoloured directly and pictures are darkened to a silhouette
        if (isSvg) c.querySelectorAll("*").forEach((n) => { if (n.getAttribute && (n.getAttribute("fill") || n.tagName === "text" || n.tagName === "rect" || n.tagName === "path" || n.tagName === "circle")) { n.setAttribute("fill", ext); n.style.fill = ext; } });
        else c.style.filter = "brightness(0)";
        wrap.insertBefore(c, el);
        copies.push({ c, i });
      }
      host = wrap;
    } else {
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      el.style.isolation = "isolate";
      const html = el.innerHTML;
      for (let i = N; i >= 1; i--) {
        const c = document.createElement("div");
        c.innerHTML = html; c.setAttribute("aria-hidden", "true");
        c.querySelectorAll("[data-slot],[id]").forEach((n) => { n.removeAttribute("data-slot"); n.removeAttribute("id"); });
        Object.assign(c.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", zIndex: "-1", color: ext, pointerEvents: "none", padding: getComputedStyle(el).padding, boxSizing: "border-box" });
        c.querySelectorAll("*").forEach((n) => { n.style.color = ext; });
        el.append(c);
        copies.push({ c, i });
      }
      if (face) el.style.color = face;
    }
    // the far copies a touch deeper, so the extrusion reads as a solid with a shaded end
    for (const { c, i } of copies) if (i > N * 0.6 && !isImg) c.style.filter = `brightness(${(1 - ((i - N * 0.6) / (N * 0.4)) * 0.25).toFixed(3)})`;
    let floor = null;
    if (p.tilt3d) {
      floor = document.createElement("div");
      Object.assign(floor.style, { position: "absolute", left: "8%", width: "84%", top: "100%", height: (H * 0.22).toFixed(1) + "px", marginTop: (N * Math.abs(dy) + H * 0.05).toFixed(1) + "px", borderRadius: "50%", background: "radial-gradient(closest-side, color-mix(in srgb, var(--x-ink) 22%, transparent), transparent)", zIndex: "-2", opacity: "0", pointerEvents: "none" });
      host.append(floor);
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
    }
    host.style.transformOrigin = "50% 60%";
    const p2 = (t, a, b) => { const x = ML.lin(t, a, b); return 1 - (1 - x) * (1 - x); };
    const t1 = at + p.grow;
    ctx.sfx(at, "pop", 0.35);
    return {
      draw(t) {
        const g = p2(t, at, t1), lv = ML.ease(t, end - 0.3, end - 0.05);
        const s = g * (1 - lv);
        for (const { c, i } of copies) {
          c.style.translate = `${(dx * i * s).toFixed(2)}px ${(dy * i * s).toFixed(2)}px`;
          c.style.opacity = s > 0.002 ? "1" : "0";
        }
        const r = p2(t, at, at + 0.5) * (1 - lv);
        let tf = "";
        if (p.tilt3d) tf += `perspective(${(Math.max(W, H) * 3).toFixed(0)}px) rotateY(${(-15 * r * (rtl ? -1 : 1)).toFixed(3)}deg) rotateX(${(10 * r).toFixed(3)}deg)`;
        if (p.tilt) tf += ` rotate(${(p.tilt * r * (rtl ? -1 : 1)).toFixed(3)}deg)`;
        host.style.transform = tf.trim() || "none";
        if (floor) floor.style.opacity = r.toFixed(4);
      },
    };
  },
});

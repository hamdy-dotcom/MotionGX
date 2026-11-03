// Ring strokes on, logo appears inside. A disc sits centred; a 4 px ring around it draws on (stroke-dashoffset
// full → 0 over 0.6 s power2.inOut) starting at ~7 o'clock (start_angle, clockwise from 12; mirrored and drawn
// anticlockwise in Arabic), its stroke a gradient from the accent to the second accent, glowing. A radial halo behind
// pulses 0 → 0.6 with it. The logo then fades in at the centre, scale 0.8 → 1 in 0.3 s; a tiny tracked caption
// fades in below (the caption param, else the logo's own alt / aria-label; never a repeat of its lettering). Exit: the
// lockup shrinks to 0.75 and fades in 0.4 s. A short run compresses all of it to end on time. backdrop clears the
// picture region while the lockup holds the frame. The logo is laid out at its full size and only scaled down (sharp);
// a picture logo is never enlarged past its pixels.
// Source: prompt-motion "ceowinkz-wtf-ai-just-made" (reference only — rebuilt as our own code).
ML.define({
  id: "element.ring-stroke-logo-reveal",
  category: "element",
  name: "Ring strokes on, logo appears inside",
  does: "A glowing ring draws around a disc, then the logo fades in at its centre with a soft halo.",
  says: ["brand", "tech", "arrival"],
  energy: 3,
  targets: ["logo"],
  duration: [1, 2],
  params: {
    start_angle: { type: "number", range: [0, 360], default: 210, unit: "deg" },
    exit: { type: "bool", default: true },
    draw: { type: "number", range: [0.4, 1], default: 0.6, unit: "s" },
    size: { type: "number", range: [0.2, 0.45], default: 0.32 },
    caption: { type: "text", default: "" },
    backdrop: { type: "bool", default: true },
  },
  pairs: ["background.mesh-gradient", "text-in.punchline"],
  avoid: ["problem", "playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:ceowinkz-wtf-ai-just-made", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const big = own && ctx.box(own).w > f.W * 0.45 && ctx.box(own).h > f.H * 0.2;
    const R = big ? ctx.box(own) : f.pic;
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;`, host);
    const back = p.backdrop ? (own && own.closest(".ml-pic")) || host.querySelector(".ml-pic") : null;

    // the lockup: halo, disc, ring, logo, caption — centred, the caption below
    const D = Math.min(Math.min(f.W, f.H) * ML.clamp(p.size, 0.2, 0.45), R.w * 0.7, R.h * 0.6);
    const capSize = Math.max(16, D * 0.075);
    const name = (own && (own.getAttribute("aria-label") || own.getAttribute("alt") || "").trim()) || "";
    const capText = String(p.caption || name || "").trim();
    const capH = capText ? capSize * 2.6 : 0;
    const lock = mk("div", `position:absolute;left:${(R.w - D) / 2}px;top:${(R.h - D - capH) / 2}px;width:${D}px;height:${D + capH}px;transform-origin:50% ${D / 2}px;`, layer);
    const halo = mk("div", `position:absolute;left:${-D * 0.45}px;top:${-D * 0.45}px;width:${D * 1.9}px;height:${D * 1.9}px;border-radius:50%;background:radial-gradient(closest-side, color-mix(in srgb, var(--x-accent) 70%, transparent), color-mix(in srgb, var(--x-accent-2) 35%, transparent) 55%, transparent);`, lock);
    const disc = mk("div", `position:absolute;left:${D * 0.07}px;top:${D * 0.07}px;width:${D * 0.86}px;height:${D * 0.86}px;border-radius:50%;background:var(--x-panel);box-shadow:var(--x-shadow);`, lock);
    const sw = Math.max(3, D * 0.014);
    const r = D / 2 - sw * 2, C = 2 * Math.PI * r;
    const sv = doc.createElementNS(NS, "svg");
    sv.setAttribute("viewBox", `0 0 ${D} ${D}`);
    sv.style.cssText = `position:absolute;left:0;top:0;width:${D}px;height:${D}px;overflow:visible;`;
    const gid = "ml-ring-" + Math.round(ML.rnd(at * 3.1 + D, 5) * 1e6);
    sv.innerHTML = `<defs><linearGradient id="${gid}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" style="stop-color:var(--x-accent)"/><stop offset="1" style="stop-color:var(--x-accent-2)"/></linearGradient><filter id="${gid}-g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${(sw * 1.6).toFixed(2)}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
    const ring = doc.createElementNS(NS, "circle");
    ring.setAttribute("cx", D / 2); ring.setAttribute("cy", D / 2); ring.setAttribute("r", r);
    ring.setAttribute("fill", "none"); ring.setAttribute("stroke", `url(#${gid})`); ring.setAttribute("stroke-width", sw); ring.setAttribute("stroke-linecap", "round");
    ring.setAttribute("filter", `url(#${gid}-g)`);
    ring.setAttribute("stroke-dasharray", `${C} ${C}`);
    // SVG circles start at 3 o'clock; start_angle counts clockwise from 12 (mirrored, and drawn anticlockwise, in Arabic)
    const a0 = (rtl ? 360 - p.start_angle : p.start_angle) - 90;
    ring.setAttribute("transform", `rotate(${a0} ${D / 2} ${D / 2})${rtl ? ` translate(0 ${D}) scale(1 -1)` : ""}`);
    sv.append(ring); lock.append(sv);

    // the logo inside the disc: a clone of the slot (vector scales freely; a picture only down)
    const inner = mk("div", `position:absolute;left:${D * 0.2}px;top:${D * 0.2}px;width:${D * 0.6}px;height:${D * 0.6}px;display:flex;align-items:center;justify-content:center;`, lock);
    if (own && own.tagName && own.tagName.toLowerCase() === "svg") {
      const c = own.cloneNode(true); c.removeAttribute("data-slot"); c.removeAttribute("width"); c.removeAttribute("height");
      c.style.cssText = "width:100%;height:100%;display:block;overflow:visible;"; inner.append(c);
    } else if (own && own.tagName === "IMG") {
      const c = own.cloneNode(true); c.removeAttribute("data-slot");
      const nw = own.naturalWidth || D, nh = own.naturalHeight || D, s = Math.min(1, (D * 0.6) / nw, (D * 0.6) / nh);
      c.style.cssText = `width:${nw * s}px;height:${nh * s}px;object-fit:contain;display:block;border-radius:0;`; inner.append(c);
    } else if (own) {
      const c = own.cloneNode(true); c.removeAttribute("data-slot");
      c.style.cssText += ";margin:0;max-width:100%;"; inner.append(c);
    } else mk("div", "width:55%;height:55%;border-radius:calc(var(--x-radius) * .6);background:var(--x-accent);", inner);
    const cap = capText ? mk("div", `position:absolute;left:${-D * 0.5}px;width:${D * 2}px;top:${D + capSize * 0.9}px;text-align:center;white-space:nowrap;font:var(--x-label-weight) ${capSize}px/1.2 var(--x-label-font);letter-spacing:${rtl ? 0 : "0.32em"};text-transform:${rtl ? "none" : "uppercase"};color:var(--x-dim);`, lock, capText) : null;

    // times
    const dr0 = ML.clamp(p.draw, 0.4, 1);
    const sp = p.exit ? ML.clamp((end - at) / (dr0 * 0.75 + 1.1), 0.6, 1) : 1; // a short run compresses everything
    const dr = dr0 * sp, lgD = 0.3 * sp, xD = 0.4 * sp;
    const r1 = at + dr, l0 = at + dr * 0.75, c0 = l0 + lgD;
    const x0 = Math.max(c0 + 0.4 * sp, end - xD - 0.05);
    ctx.sfx(at, "swell", 0.4);
    ctx.sfx(l0 + 0.1, "pop.soft", 0.25);
    const inOut2 = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2); // power2.inOut (cubic)

    return {
      draw(t) {
        layer.style.visibility = t < at - 0.2 ? "hidden" : "visible";
        const d = inOut2(ML.lin(t, at, r1));
        ring.setAttribute("stroke-dashoffset", (C * (1 - d)).toFixed(2));
        ring.style.opacity = t < at ? "0" : "1";
        disc.style.opacity = ML.out(t, at - 0.1, at + 0.25).toFixed(4);
        // halo: rises 0 → .6 with the ring, then breathes softly
        const h = 0.6 * ML.ease(t, at, r1) * (0.88 + 0.12 * Math.cos((t - r1) * 3.2 * (t > r1 ? 1 : 0)));
        halo.style.opacity = h.toFixed(4);
        const lg = ML.out(t, l0, l0 + lgD);
        inner.style.opacity = lg.toFixed(4);
        inner.style.transform = `scale(${(0.8 + 0.2 * lg).toFixed(4)})`;
        if (cap) { const c = ML.out(t, c0, c0 + 0.35 * sp); cap.style.opacity = c.toFixed(4); cap.style.translate = `0 ${((1 - c) * capSize * 0.6).toFixed(2)}px`; }
        // exit: shrink to .75 and fade in 0.4 s
        const x = p.exit ? ML.ease(t, x0, x0 + xD) : 0;
        if (own && own.style) own.style.opacity = t < at - 0.2 || x >= 1 ? "" : x.toFixed(4); // the lockup carries the logo, and hands it back on the way out
        lock.style.transform = x > 0 ? `scale(${(1 - 0.25 * x).toFixed(4)})` : "none";
        lock.style.opacity = (1 - x).toFixed(4);
        if (back) back.style.opacity = (1 - ML.out(t, at - 0.2, at + 0.1) * (1 - x)).toFixed(4);
      },
    };
  },
});

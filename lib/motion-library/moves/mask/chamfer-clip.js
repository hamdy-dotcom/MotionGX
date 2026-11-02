// Chamfered panel corners: the panel's corners are cut like an engineered hardware plate — clip-path
// polygon(0 c, c 0, 100% 0, 100% calc(100% − c), calc(100% − c) 100%, 0 100%), c = 14 px (8–24, scaled with the frame),
// on the top-left + bottom-right corners or on all four. Shutter: the polygon opens from a horizontal line at
// mid-height (every y at 50 %) to the full chamfered shape over 0.7 s power3.inOut, so the panel opens vertically with
// its cut corners intact. A thin 1 px border-gradient frame (accent → clear → light → clear → accent at 135°, as in
// the framed-tech design system's ::before) traces the same polygon for the hardware read. open "none" = a static look
// accent from `at`. The chamfer replaces the panel's rounded corners while it runs. Arabic: the cut corners mirror
// (top-right + bottom-left), so the leading corner follows the reading direction.
// Source: MengTo/Skills agent-skills/web-design/framed-tech-dark-border-gradient (demo/index.html, MIT).
ML.define({
  id: "mask.chamfer-clip",
  category: "mask",
  name: "Chamfered panel corners",
  does: "Panels get cut corners like engineered hardware plates, and can open like a shutter from a line while keeping the chamfers.",
  says: ["tech", "precision"],
  energy: 2,
  targets: ["image", "card", "screen"],
  duration: [0.4, 1],
  params: {
    chamfer: { type: "number", range: [8, 24], default: 14, unit: "px" },
    corners: { type: "choice", options: ["tl-br", "all"], default: "tl-br" },
    open: { type: "choice", options: ["none", "shutter"], default: "shutter" },
    duration: { type: "number", range: [0.4, 1], default: 0.7, unit: "s" },
    frame: { type: "bool", default: true },
  },
  pairs: ["background.tech-grid", "text-in.scramble"],
  avoid: ["playful", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "snap",
  source: { from: "MengTo/Skills:agent-skills/web-design/framed-tech-dark-border-gradient", license: "MIT", note: "demo/index.html clip-path polygon + border-gradient ::before; the shutter open is our own" },
  setup(ctx) {
    const { el, p, at, stage } = ctx;
    if (!el) return null;
    const host = ctx.scene || stage;
    const NS = "http://www.w3.org/2000/svg";
    const target = el === stage ? host : el;
    const b = target === host ? { x: 0, y: 0, w: ctx.f.W, h: ctx.f.H } : ctx.box(target);
    const k = Math.min(ctx.f.W, ctx.f.H) / 1080;
    const c = Math.min(ML.clamp(+p.chamfer, 8, 24) * k, b.w / 3, b.h / 3), dur = ML.clamp(+p.duration, 0.4, 1);
    const W = b.w, H = b.h, all = p.corners === "all";
    // the full shape, clockwise from the top-left: two points per cut corner, one per square corner
    let pts = [];
    pts.push([0, c], [c, 0]); // top-left
    if (all) pts.push([W - c, 0], [W, c]); else pts.push([W, 0]); // top-right
    pts.push([W, H - c], [W - c, H]); // bottom-right
    if (all) pts.push([c, H], [0, H - c]); else pts.push([0, H]); // bottom-left
    if (ctx.rtl && !all) pts = pts.map(([x, y]) => [W - x, y]).reverse(); // mirrored: top-right + bottom-left cut
    const shaped = (u) => pts.map(([x, y]) => [x, H / 2 + (y - H / 2) * u]);

    if (target !== host) { target.style.borderRadius = "0"; target.style.overflow = target.style.overflow || "hidden"; }
    let svg = null, poly = null;
    if (p.frame) {
      svg = document.createElementNS(NS, "svg");
      svg.setAttribute("width", W); svg.setAttribute("height", H);
      svg.style.cssText = `position:absolute;left:${b.x}px;top:${b.y}px;width:${W}px;height:${H}px;overflow:visible;pointer-events:none;z-index:3`;
      const defs = document.createElementNS(NS, "defs"), grad = document.createElementNS(NS, "linearGradient");
      const id = `ml-chamfer-${document.querySelectorAll("[id^=ml-chamfer-]").length + 1}`;
      grad.setAttribute("id", id); grad.setAttribute("gradientUnits", "userSpaceOnUse");
      grad.setAttribute("x1", 0); grad.setAttribute("y1", 0); grad.setAttribute("x2", Math.max(W, H)); grad.setAttribute("y2", Math.max(W, H));
      [[0, "var(--x-accent)", 1], [0.36, "var(--x-accent)", 0], [0.55, "var(--x-panel)", 0.6], [0.76, "var(--x-accent)", 0], [1, "var(--x-accent)", 1]].forEach(([o, col, a]) => {
        const s = document.createElementNS(NS, "stop");
        s.setAttribute("offset", o); s.style.stopColor = col; s.style.stopOpacity = a;
        grad.append(s);
      });
      defs.append(grad); svg.append(defs);
      poly = document.createElementNS(NS, "polygon");
      poly.setAttribute("fill", "none"); poly.setAttribute("stroke", `url(#${id})`); poly.setAttribute("stroke-width", Math.max(1, k).toFixed(2));
      poly.setAttribute("stroke-linejoin", "miter");
      svg.append(poly);
      host.append(svg);
    }
    ctx.sfx(at, p.open === "shutter" ? "snap" : "tap", 0.35);
    const css = (a) => `polygon(${a.map(([x, y]) => `${x.toFixed(2)}px ${y.toFixed(2)}px`).join(", ")})`;
    const inner = (a) => a.map(([x, y]) => [ML.clamp(x, 0.5, W - 0.5), ML.clamp(y, 0.5, H - 0.5)]);
    return {
      draw(t) {
        const on = t >= at - 1e-6;
        const u = p.open === "shutter" ? ML.ease(t, at, at + dur) : 1;
        if (!on) { target.style.clipPath = p.open === "shutter" ? css(shaped(0)) : "none"; if (svg) svg.style.visibility = "hidden"; return; }
        const a = shaped(u);
        target.style.clipPath = css(a);
        if (svg) {
          svg.style.visibility = "visible";
          poly.setAttribute("points", inner(a).map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" "));
          poly.style.opacity = (p.open === "shutter" ? ML.lin(u, 0, 0.15) : ML.lin(t, at, at + 0.25)).toFixed(3);
        }
      },
    };
  },
});

// Camera-aperture iris reveal: shutter blades inside a dark circle rotate open and uncover the picture (or logo) behind
// them. Built as SVG polygons, crisp and deterministic: N blades (5–8) tile everything outside a regular N-gon opening
// as a pinwheel — blade i runs along opening edge i and out along the extensions of edges i and i−1 — so as the
// opening's radius grows 0 → past the circle and the blades turn 0 → 35° together (power3.inOut, 0.5 s), the hole
// opens exactly the way a lens iris does. Blades are dark grey from the look's device colour with 1 px lighter edges;
// a small accent dot sits at the centre while closed and goes as the blades part. The picture settles 1.15 → 1 over
// the same span (it is only clipped, never blurred). "window": the picture stays a round lens of `radius` (scaled with
// the frame) inside a dark rim; otherwise the iris fills the target and clears it completely. direction "close"
// plays it in reverse, for a cut. Arabic: the blades turn the other way.
// Source: prompt-motion twoclipping-opus-5-5-is-the (reference only: our own rebuild).
ML.define({
  id: "mask.aperture-iris-reveal",
  category: "mask",
  name: "Camera-aperture iris reveal",
  does: "Camera shutter blades rotate open inside a dark circle, uncovering a photo or logo behind them.",
  says: ["reveal", "tech", "focus"],
  energy: 3,
  targets: ["image", "logo"],
  duration: [0.5, 1.2],
  params: {
    blades: { type: "number", range: [5, 8], default: 6 },
    duration: { type: "number", range: [0.35, 0.9], default: 0.5, unit: "s" },
    radius: { type: "number", range: [48, 240], default: 64, unit: "px" },
    direction: { type: "choice", options: ["open", "close"], default: "open" },
    centre_dot: { type: "bool", default: true },
    window: { type: "bool", default: false },
    turn: { type: "number", range: [15, 60], default: 35, unit: "deg" },
  },
  pairs: ["camera.push-in", "text-in.punchline"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "snap",
  source: { from: "prompt-motion:twoclipping-opus-5-5-is-the", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, stage } = ctx;
    if (!el) return null;
    const host = ctx.scene || stage;
    const NS = "http://www.w3.org/2000/svg";
    // puts a picture in an overflow-hidden frame of its own laid-out size, so it can be clipped and scaled inside it
    const frameOf = (m) => {
      const cs = getComputedStyle(m), bx = ctx.box(m), f = document.createElement("div");
      f.style.cssText = `position:relative;overflow:hidden;flex:none;display:${cs.display === "inline" ? "inline-block" : cs.display};width:${bx.w}px;height:${bx.h}px;border-radius:${cs.borderRadius};margin:${cs.margin};align-self:${cs.alignSelf};vertical-align:${cs.verticalAlign}`;
      m.replaceWith(f); f.append(m);
      m.style.width = "100%"; m.style.height = "100%"; m.style.margin = "0"; m.style.display = "block"; m.style.transformOrigin = "50% 50%";
      return f;
    };
    const whole = el === stage || el === host;
    const media = !whole && /^(img|video|canvas|svg|picture)$/i.test(el.tagName);
    const frame = whole ? host : media ? frameOf(el) : el;
    const inner = media ? el : null;
    const b = whole ? { x: 0, y: 0, w: ctx.f.W, h: ctx.f.H } : ctx.box(frame);
    const k = Math.min(ctx.f.W, ctx.f.H) / 1080;
    const N = Math.round(ML.clamp(+p.blades, 5, 8)), dur = ML.clamp(+p.duration, 0.35, 0.9);
    const turn = (ML.clamp(+p.turn, 15, 60) * Math.PI) / 180 * (ctx.rtl ? -1 : 1);
    const lens = !!p.window, cx = b.w / 2, cy = b.h / 2, half = Math.hypot(b.w, b.h) / 2;
    // the iris circle: a lens of `radius` (window), or big enough to cover the whole target
    const R = lens ? Math.max(12, Math.min(+p.radius * k, Math.min(b.w, b.h) / 2)) : Math.max(+p.radius * k, half);
    const far = R * 6, full = (R / Math.cos(Math.PI / N)) * 1.06; // opening circumradius whose inradius clears R
    const radius = parseFloat(getComputedStyle(frame).borderTopLeftRadius) || 0;

    if (!whole && getComputedStyle(frame).position === "static") frame.style.position = "relative";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", b.w); svg.setAttribute("height", b.h);
    svg.style.cssText = `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;overflow:visible;pointer-events:none;z-index:3`;
    const id = `ml-iris-${document.querySelectorAll("[id^=ml-iris-]").length + 1}`;
    const defs = document.createElementNS(NS, "defs"), cp = document.createElementNS(NS, "clipPath");
    cp.setAttribute("id", id);
    let shape;
    if (lens) { shape = document.createElementNS(NS, "circle"); shape.setAttribute("cx", cx); shape.setAttribute("cy", cy); shape.setAttribute("r", R); }
    else { shape = document.createElementNS(NS, "rect"); shape.setAttribute("width", b.w); shape.setAttribute("height", b.h); shape.setAttribute("rx", radius); }
    cp.append(shape); defs.append(cp); svg.append(defs);
    const g = document.createElementNS(NS, "g");
    g.setAttribute("clip-path", `url(#${id})`);
    const blades = [];
    for (let i = 0; i < N; i++) {
      const poly = document.createElementNS(NS, "polygon");
      poly.style.fill = `color-mix(in srgb, var(--x-device) ${i % 2 ? 84 : 91}%, var(--x-panel))`;
      poly.style.stroke = "color-mix(in srgb, var(--x-device) 58%, var(--x-panel))";
      poly.style.strokeWidth = "1px";
      poly.setAttribute("stroke-linejoin", "round");
      g.append(poly); blades.push(poly);
    }
    const dot = document.createElementNS(NS, "circle");
    dot.setAttribute("cx", cx); dot.setAttribute("cy", cy); dot.setAttribute("r", Math.max(3, Math.min(R * 0.06, 14 * k)));
    dot.style.fill = "var(--x-accent)";
    g.append(dot);
    svg.append(g);
    // the dark rim of the lens (window mode)
    let rim = null;
    if (lens) {
      rim = document.createElementNS(NS, "circle");
      rim.setAttribute("cx", cx); rim.setAttribute("cy", cy); rim.setAttribute("r", R);
      rim.setAttribute("fill", "none");
      rim.style.stroke = "color-mix(in srgb, var(--x-device) 80%, var(--x-panel))";
      rim.style.strokeWidth = Math.max(3, R * 0.07).toFixed(2) + "px";
      svg.append(rim);
    }
    host.append(svg);
    if (lens) frame.style.clipPath = `circle(${R.toFixed(2)}px at ${cx.toFixed(2)}px ${cy.toFixed(2)}px)`;
    ctx.sfx(at, "snap", 0.45);

    const pt = (x, y) => `${x.toFixed(2)},${y.toFixed(2)}`;
    return {
      draw(t) {
        const e = ML.ease(t, at, at + dur), u = p.direction === "close" ? 1 - e : e;
        const a = u * full, rot = -Math.PI / 2 + u * turn;
        const V = [], D = [];
        for (let i = 0; i < N; i++) {
          const phi = rot + (2 * Math.PI * i) / N * (ctx.rtl ? -1 : 1);
          V.push([cx + a * Math.cos(phi), cy + a * Math.sin(phi)]);
        }
        // edge i runs V_i → V_(i+1); its direction is known even when the opening is a point
        for (let i = 0; i < N; i++) {
          const phi = rot + (2 * Math.PI * i) / N * (ctx.rtl ? -1 : 1), s = ctx.rtl ? -1 : 1;
          const ang = phi + s * (Math.PI / N + Math.PI / 2);
          D.push([Math.cos(ang), Math.sin(ang)]);
        }
        const open = u >= 0.999;
        for (let i = 0; i < N; i++) {
          const v0 = V[i], v1 = V[(i + 1) % N], d = D[i], dp = D[(i - 1 + N) % N];
          blades[i].setAttribute("points", [pt(v0[0], v0[1]), pt(v1[0], v1[1]), pt(v1[0] + d[0] * far, v1[1] + d[1] * far), pt(v0[0] + dp[0] * far, v0[1] + dp[1] * far)].join(" "));
        }
        g.style.visibility = open ? "hidden" : "visible";
        svg.style.visibility = open && !lens ? "hidden" : "visible";
        dot.style.opacity = p.centre_dot ? (1 - ML.lin(u, 0, 0.18)).toFixed(3) : "0";
        if (inner) inner.style.scale = (1 + 0.15 * (1 - u)).toFixed(4);
      },
    };
  },
});

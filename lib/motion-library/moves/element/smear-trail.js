// Smear-frame trail: a dot skids along a gentle quadratic arc (or a straight line) on expo.out, and every 0.05 s
// (3 frames) a ghost ellipse is stamped where the dot is: stretched along its velocity (scaleX 1 + speed / 800, capped at
// `squash`; scaleY down to 0.6 at full stretch), turned to the motion tangent, opacity 0.95 fading to 0 over 0.4 s — the
// row of smear frames an animator draws. Ghost i is a closed-form function of its stamp time, so nothing is carried
// between frames. The dot travels from the start side to the end side (mirrored in Arabic) and lands with a small squash.
// With a target shape, the shape itself is the dot and skids into its own place.
// Source: prompt-motion stephanlivera-opus-5-5-on-max + roundtablespace-opus-5-5-on-max (reference only: our own rebuild).
ML.define({
  id: "element.smear-trail",
  category: "element",
  name: "Smear-frame trail",
  does: "A dot skids or arcs across the frame leaving a row of stretched, tilted elliptical ghosts like animation smear frames.",
  says: ["speed", "playful", "flow", "tech"],
  energy: 3,
  targets: ["shape"],
  duration: [0.6, 1.5],
  params: {
    path: { type: "choice", options: ["arc", "line"], default: "arc" },
    trail: { type: "number", range: [4, 20], default: 10 },
    squash: { type: "number", range: [1.2, 2], default: 1.6 },
    size: { type: "number", range: [8, 40], default: 24, unit: "px" },
    travel: { type: "number", range: [0.4, 1.2], default: 0.6, unit: "s" },
  },
  pairs: ["text-in.punchline", "element.slide-in"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:stephanlivera-opus-5-5-on-max", license: "reference", note: "also roundtablespace-opus-5-5-on-max; the smear-frame trail rebuilt as our own SVG, every ghost from its stamp time" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const k = Math.min(f.W, f.H) / 1080;
    const svg = doc.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${f.W} ${f.H}`);
    svg.style.cssText = `position:absolute;left:0;top:0;width:${f.W}px;height:${f.H}px;pointer-events:none;z-index:6;overflow:visible;`;
    host.append(svg);

    // the path: start side → end side (right → left in Arabic), a gentle arc over the pic region or a straight skid
    const sx = rtl ? -1 : 1;
    const R = f.pic;
    let E, S, r;
    if (own) {
      const b = ctx.box(own);
      r = Math.max(6, Math.min(b.w, b.h) / 2);
      E = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
      const run = Math.min(R.w * 0.7, f.W * 0.55);
      S = { x: ML.clamp(E.x - sx * run, f.safe.x + b.w / 2, f.safe.x + f.safe.w - b.w / 2), y: E.y + (p.path === "arc" ? R.h * 0.12 : 0) };
    } else {
      r = p.size * k;
      const cy = R.y + R.h * 0.58;
      S = { x: R.x + R.w * (rtl ? 0.88 : 0.12), y: cy + (p.path === "arc" ? R.h * 0.1 : 0) };
      E = { x: R.x + R.w * (rtl ? 0.12 : 0.88), y: cy };
    }
    const lift = p.path === "arc" ? Math.min(R.h * 0.32, Math.abs(E.x - S.x) * 0.45) : 0;
    const C = { x: (S.x + E.x) / 2, y: Math.min(S.y, E.y) - lift };
    const quad = (u) => ({ x: (1 - u) * (1 - u) * S.x + 2 * (1 - u) * u * C.x + u * u * E.x, y: (1 - u) * (1 - u) * S.y + 2 * (1 - u) * u * C.y + u * u * E.y });
    const travel = Math.min(p.travel, Math.max(0.3, end - at - 0.4));
    const prog = (t) => ML.expo(t, at, at + travel);
    const pos = (t) => quad(prog(t));
    const vel = (t) => { const h = 1 / 120, a = pos(t - h), b = pos(t + h); return { x: (b.x - a.x) / (2 * h), y: (b.y - a.y) / (2 * h) }; };

    // ghosts: one per stamp, every 0.05 s (spread to fit `trail` over the travel when it is short)
    const n = Math.round(ML.clamp(p.trail, 4, 20));
    const every = Math.min(0.05, (travel * 0.85) / n);
    const ghosts = Array.from({ length: n }, (_, i) => {
      const e = doc.createElementNS(NS, "ellipse");
      e.setAttribute("rx", r.toFixed(2)); e.setAttribute("ry", r.toFixed(2));
      e.setAttribute("fill", i % 3 === 2 ? "var(--x-accent-2)" : "var(--x-accent)");
      e.style.opacity = "0";
      svg.append(e);
      return { e, ts: at + 0.02 + i * every };
    });
    let dot = null;
    if (!own) {
      dot = doc.createElementNS(NS, "circle");
      dot.setAttribute("r", r.toFixed(2)); dot.setAttribute("fill", "var(--x-ink)");
      svg.append(dot);
    }
    const stretch = (v) => {
      const speed = Math.hypot(v.x, v.y) / k;
      const sxv = Math.min(p.squash, 1 + speed / 800);
      const amt = (sxv - 1) / Math.max(0.01, p.squash - 1);
      const ang = (Math.atan2(v.y, v.x) * 180) / Math.PI;
      return { sx: sxv, sy: 1 - 0.4 * amt, ang, amt, flat: ((((ang + 90) % 180) + 180) % 180) - 90 };
    };
    ctx.sfx(at, "whoosh.soft", 0.35);
    ctx.sfx(at + travel * 0.55, "tap", 0.2);
    const leave = Math.max(at + travel + 0.4, end - 0.25);

    return {
      draw(t) {
        const gone = ML.clamp((t - leave) / 0.22);
        const on = t >= at - 1e-6;
        svg.style.opacity = (1 - gone).toFixed(4);
        svg.style.visibility = on ? "visible" : "hidden";
        // the ghosts: stamped at ts, fading over 0.4 s from 0.95
        for (const g of ghosts) {
          const age = t - g.ts;
          if (age < 0 || age > 0.4) { g.e.style.opacity = "0"; continue; }
          const at0 = pos(g.ts), st = stretch(vel(g.ts));
          g.e.setAttribute("transform", `translate(${at0.x.toFixed(2)} ${at0.y.toFixed(2)}) rotate(${st.ang.toFixed(2)}) scale(${st.sx.toFixed(4)} ${st.sy.toFixed(4)})`);
          g.e.style.opacity = (0.95 * (1 - age / 0.4)).toFixed(4);
        }
        // the dot: stretched along its path too, a small squash as it lands, then still
        const c = pos(t), st = stretch(vel(t));
        const landed = t - (at + travel * 0.5);
        const wob = landed > 0 ? Math.exp(-landed * 7) * Math.sin(landed * 26) * 0.12 : 0;
        if (dot) {
          dot.setAttribute("transform", `translate(${c.x.toFixed(2)} ${c.y.toFixed(2)}) rotate(${st.ang.toFixed(2)}) scale(${(st.sx + wob).toFixed(4)} ${(st.sy - wob).toFixed(4)})`);
          dot.style.opacity = on ? "1" : "0";
        } else {
          own.style.visibility = on ? "visible" : "hidden";
          own.style.translate = `${(c.x - E.x).toFixed(2)}px ${(c.y - E.y).toFixed(2)}px`;
          own.style.rotate = `${(st.flat * Math.min(1, st.amt * 1.5)).toFixed(2)}deg`; // an element never turns upside down: it leans along the path only while it is fast
          own.style.scale = `${(st.sx + wob).toFixed(4)} ${(st.sy - wob).toFixed(4)}`;
          if (prog(t) > 0.999 && Math.abs(wob) < 1e-3) { own.style.rotate = "none"; own.style.scale = "none"; }
        }
      },
    };
  },
});

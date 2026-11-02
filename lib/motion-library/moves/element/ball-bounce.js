// Bouncing ball with squash, stretch and ghosts: a ball (look accent, soft highlight) drops onto a ground line and
// bounces — closed-form parabolas per bounce (y = ½ g t², ~0.5 s first fall), stretched 1.3 tall while falling fast,
// squashed 1.4 × 0.6 on each contact for ~3 frames, each rebound reaching `restitution` of the last height, with
// optional sideways travel per bounce (towards the reading direction). Its path stays on screen as onion-skin ghosts
// (a 1 px outline stamped every 2 frames at 25–50 %, kept), dashed ghosts, or four motion copies trailing it while
// it falls; an optional height-tracking shadow ellipse on the ground grows and darkens as it descends. Ground: a hairline
// drawn first (dash offset, 0.5 s), a thin ring that flashes on each hit, or a ruler with ticks and frame numbers;
// optional keyframe diamonds pop at contacts with tiny mono labels. All SVG drawn from t; ellipses are drawn at
// their size (rx / ry), never scaled up.
// Source: prompt-motion "ik-builds-i-was-quoted-3000", "m1n9-k7-this-is-insane-opus", "levabashidze-i-made-this-15",
// "crazyalphaaa-wtf-made-with-claude" (reference only — rebuilt as our own code).
ML.define({
  id: "element.ball-bounce",
  category: "element",
  name: "Bouncing ball with squash, stretch and ghosts",
  does: "A ball drops onto a ground line and bounces with squash and stretch, its path shown by onion-skin ghosts, a motion trail or a height-tracking shadow.",
  says: ["playful", "energy", "precision", "step", "story"],
  energy: 3,
  targets: ["shape"],
  duration: [1.2, 3],
  params: {
    bounces: { type: "number", range: [1, 5], default: 3 },
    restitution: { type: "number", range: [0.4, 0.7], default: 0.55 },
    trail: { type: "choice", options: ["ghosts", "dashed-ghosts", "motion-copies", "none"], default: "ghosts" },
    shadow: { type: "bool", default: false },
    ground: { type: "choice", options: ["line", "ring", "ruler"], default: "line" },
    travel: { type: "number", range: [0, 120], default: 60, unit: "px" },
    labels: { type: "bool", default: false },
    fade_ghosts: { type: "bool", default: false },
    backdrop: { type: "bool", default: true },
  },
  pairs: ["data.playhead-ruler", "data.onion-skin-motion-study", "text-in.punchline"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "land.light",
  source: { from: "prompt-motion:ik-builds-i-was-quoted-3000", license: "reference", note: "also m1n9-k7-this-is-insane-opus, levabashidze-i-made-this-15, crazyalphaaa-wtf-made-with-claude; technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl, el } = ctx;
    const doc = document;
    const NS = "http://www.w3.org/2000/svg";
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = el && el !== ctx.stage ? el : null;
    const R = own && ctx.box(own).w > f.W * 0.3 && ctx.box(own).h > f.H * 0.15 ? ctx.box(own) : f.pic;
    const svg = doc.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${R.w} ${R.h}`);
    svg.style.cssText = `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;overflow:visible;pointer-events:none;z-index:6;`;
    host.append(svg);
    if (own) own.style.opacity = "0"; // the ball takes its place

    // geometry: the ground near the bottom, the ball dropping from near the top
    const u0 = Math.min(f.W, f.H);
    const r = ML.clamp(u0 * 0.03, 16, 40), dir = rtl ? -1 : 1;
    const gy = R.h * 0.82, gw = Math.min(R.w * 0.86, u0 * 0.95), gx0 = (R.w - gw) / 2;
    const H0 = Math.min(R.h * 0.62, gy - r * 2 - R.h * 0.06);
    const n = Math.round(ML.clamp(p.bounces, 1, 5)), e = ML.clamp(p.restitution, 0.4, 0.7);
    const T0 = 0.5, g = (2 * H0) / (T0 * T0);
    const trav = ML.clamp(p.travel, 0, 120) * (u0 / 1080) * 1.6;
    const totalTravel = trav * n;
    const x0 = R.w / 2 - (dir * totalTravel) / 2;
    // segments: fall, then n bounces (up + down)
    const t0 = at + 0.45; // the ground draws first
    const segs = [{ a: t0, b: t0 + T0, h: H0, kind: "fall", xa: x0, xb: x0 }];
    let tt = t0 + T0, xx = x0;
    for (let i = 1; i <= n; i++) { const h = H0 * Math.pow(e, i), d = 2 * Math.sqrt((2 * h) / g); segs.push({ a: tt, b: tt + d, h, kind: "bounce", xa: xx, xb: xx + dir * trav }); tt += d; xx += dir * trav; }
    const rest = tt, xEnd = xx;
    const contacts = segs.map((s) => s.b);
    function at_(t) { // the ball's centre (height above the ground, x) and its vertical speed share at time t
      if (t <= t0) return { h: H0, x: x0, v: 0 };
      for (const s of segs) if (t < s.b) {
        const u = t - s.a;
        if (s.kind === "fall") return { h: s.h - 0.5 * g * u * u, x: s.xa, v: (g * u) / (g * T0) };
        const d = s.b - s.a, vy = Math.sqrt(2 * g * s.h);
        return { h: vy * u - 0.5 * g * u * u, x: s.xa + (s.xb - s.xa) * (u / d), v: (g * u - vy) / (g * T0) };
      }
      return { h: 0, x: xEnd, v: 0 };
    }

    // a ground under the study: whatever the region held clears away
    const back = p.backdrop ? sv("rect", { x: 0, y: 0, width: R.w, height: R.h, rx: Math.min(R.w, R.h) * 0.04, fill: "var(--x-ground)" }, svg) : null;
    // ground
    const groundG = sv("g", {}, svg);
    const line = sv("line", { x1: gx0, y1: gy, x2: gx0 + gw, y2: gy, stroke: "var(--x-ink)", "stroke-opacity": 0.55, "stroke-width": Math.max(1.5, u0 / 900), pathLength: 1, "stroke-dasharray": "1 1" }, groundG);
    if (rtl) line.setAttribute("transform", `translate(${2 * gx0 + gw} 0) scale(-1 1)`);
    const ticks = [];
    if (p.ground === "ruler") {
      const nt = 24;
      for (let i = 0; i <= nt; i++) {
        const x = rtl ? gx0 + gw - (gw * i) / nt : gx0 + (gw * i) / nt, major = i % 4 === 0;
        const tk = sv("line", { x1: x, y1: gy, x2: x, y2: gy + (major ? r * 0.9 : r * 0.45), stroke: "var(--x-dim)", "stroke-width": 1.5 }, groundG);
        const lb = major ? sv("text", { x, y: gy + r * 2, "text-anchor": "middle", "font-size": r * 0.75, fill: "var(--x-dim)", "font-family": "var(--x-mono-font)" }, groundG) : null;
        if (lb) lb.textContent = String(i * 2).padStart(2, "0");
        ticks.push([tk, lb, i / nt]);
      }
    }
    const ringE = p.ground === "ring" ? sv("ellipse", { cx: x0, cy: gy, rx: r * 4.5, ry: r * 0.75, fill: "none", stroke: "var(--x-accent)", "stroke-width": 1.5 }, svg) : null;
    const shadow = p.shadow ? sv("ellipse", { cx: x0, cy: gy, rx: r, ry: r * 0.25, fill: "none", stroke: "var(--x-ink)", "stroke-width": 1.2 }, svg) : null;

    // ghosts: one stamp every 2 frames (1/15 s) from the drop to the rest, drawn when their moment has passed
    const ghosts = [];
    if (p.trail === "ghosts" || p.trail === "dashed-ghosts") {
      for (let tg = t0; tg <= rest + 1e-6; tg += 1 / 15) {
        const s = at_(tg);
        const c = sv("circle", { cx: s.x, cy: gy - r - s.h, r, fill: "none", stroke: "var(--x-ink)", "stroke-width": 1.2 }, svg);
        if (p.trail === "dashed-ghosts") c.setAttribute("stroke-dasharray", `${r * 0.35} ${r * 0.25}`);
        ghosts.push([c, tg]);
      }
    }
    const copies = p.trail === "motion-copies" ? [4, 3, 2, 1].map((i) => [sv("ellipse", { rx: r, ry: r, fill: "var(--x-accent)" }, svg), i]) : [];
    // keyframe diamonds + labels at contacts
    const marks = p.labels ? contacts.map((c, i) => {
      const s = at_(c - 1e-4), gG = sv("g", { transform: `translate(${s.x} ${gy + r * 1.1})` }, svg);
      const dm = sv("path", { d: `M0 ${-r * 0.4} L${r * 0.4} 0 L0 ${r * 0.4} L${-r * 0.4} 0Z`, fill: "var(--x-accent)" }, gG);
      const tx = sv("text", { y: r * 1.4, "text-anchor": "middle", "font-size": r * 0.62, fill: "var(--x-dim)", "font-family": "var(--x-mono-font)" }, gG);
      tx.textContent = "F" + String(Math.round((c - t0) * 30)).padStart(2, "0");
      return [gG, dm, c];
    }) : [];

    // the ball, drawn at its size with a highlight
    const ball = sv("ellipse", { rx: r, ry: r, fill: "var(--x-accent)" }, svg);
    // the highlight: a flat soft spot (a gradient fill dithers differently from one repaint to the next)
    const hi = sv("ellipse", { rx: r * 0.38, ry: r * 0.3, fill: "var(--x-panel)", opacity: 0.55 }, svg);

    contacts.forEach((c, i) => ctx.sfx(c, i === 0 ? "land.light" : "tap", i === 0 ? 0.45 : Math.max(0.1, 0.35 * Math.pow(e, i))));
    const leaveA = Math.max(rest + 0.4, end - 0.3);
    function squash(t) { let q = 0; contacts.forEach((c, i) => { const x = (t - c + 0.02) / 0.1; if (x >= 0 && x < 1) q = Math.max(q, Math.sin(Math.PI * x) * Math.pow(0.8, i)); }); return q; }

    return {
      draw(t) {
        const leave = ML.clamp((t - leaveA) / 0.25);
        // the whole drawing repaints on every new t (an invisible 1e-4 opacity step), so a frame never depends on
        // which parts the frame before it had dirtied
        svg.style.opacity = ((1 - leave) * (0.9999 - 0.0001 * ((t * 30) % 1))).toFixed(6);
        if (back) back.setAttribute("opacity", ML.out(t, at - 0.2, at + 0.1).toFixed(4));
        svg.style.visibility = t < at - 0.2 ? "hidden" : "visible";
        line.setAttribute("stroke-dashoffset", (1 - ML.ease(t, at, at + 0.5)).toFixed(4));
        ticks.forEach(([tk, lb, k]) => { const o = ML.lin(t, at + k * 0.5, at + k * 0.5 + 0.1).toFixed(3); tk.setAttribute("opacity", o); if (lb) lb.setAttribute("opacity", o); });
        const s = at_(t), q = squash(t);
        const stretch = Math.min(1, Math.abs(s.v)) * (s.h > r * 0.5 ? 1 : 0);
        // squash 1.4 × 0.6 at contact, stretch 0.85 × 1.3 at speed (ellipse radii, never a scale)
        const rx = r * (1 + 0.4 * q - 0.15 * stretch), ry = r * (1 - 0.4 * q + 0.3 * stretch);
        const vis = t >= t0 - 0.05 ? 1 : 0;
        ball.setAttribute("cx", s.x.toFixed(2)); ball.setAttribute("cy", (gy - ry - Math.max(0, s.h)).toFixed(2));
        ball.setAttribute("rx", rx.toFixed(2)); ball.setAttribute("ry", ry.toFixed(2));
        ball.setAttribute("opacity", String(vis * ML.lin(t, t0 - 0.05, t0 + 0.05)));
        hi.setAttribute("cx", (s.x - rx * 0.32).toFixed(2)); hi.setAttribute("cy", (gy - ry - Math.max(0, s.h) - ry * 0.36).toFixed(2));
        hi.setAttribute("rx", (rx * 0.38).toFixed(2)); hi.setAttribute("ry", (ry * 0.3).toFixed(2));
        hi.setAttribute("opacity", (0.55 * vis * ML.lin(t, t0 - 0.05, t0 + 0.05)).toFixed(3));
        ghosts.forEach(([c, tg], i) => {
          let o = t >= tg + 1 / 15 ? 0.25 + 0.25 * ((i % 2) ? 0.4 : 1) : 0;
          if (p.fade_ghosts) o *= 1 - ML.lin(t, tg + 0.8, tg + 1.1);
          c.setAttribute("opacity", o.toFixed(3));
        });
        copies.forEach(([c, i]) => {
          const tc = t - i * 0.03, sc = at_(tc), falling = sc.v > 0.05 && tc > t0;
          c.setAttribute("cx", sc.x.toFixed(2)); c.setAttribute("cy", (gy - r - Math.max(0, sc.h)).toFixed(2));
          c.setAttribute("opacity", falling ? (0.32 - i * 0.07).toFixed(3) : "0");
        });
        if (shadow) {
          const k = 1 - ML.clamp(s.h / H0);
          shadow.setAttribute("cx", s.x.toFixed(2)); shadow.setAttribute("rx", (r * (0.7 + 2.6 * k)).toFixed(2)); shadow.setAttribute("ry", (r * (0.18 + 0.5 * k)).toFixed(2));
          shadow.setAttribute("stroke-opacity", (0.15 + 0.6 * k).toFixed(3)); shadow.setAttribute("opacity", vis ? "1" : "0");
        }
        if (ringE) {
          let fl = 0; contacts.forEach((c) => { if (t >= c) fl = Math.max(fl, Math.exp(-(t - c) / 0.18)); });
          ringE.setAttribute("cx", s.x.toFixed(2));
          ringE.setAttribute("stroke-opacity", (0.3 + 0.7 * fl).toFixed(3)); ringE.setAttribute("stroke-width", (1.5 + 2 * fl).toFixed(2));
          ringE.setAttribute("opacity", ML.lin(t, at, at + 0.4).toFixed(3));
        }
        marks.forEach(([gG, dm, c]) => { const u = t < c ? 0 : ML.back(t, c, c + 0.25, 2); gG.setAttribute("opacity", t >= c ? "1" : "0"); dm.setAttribute("transform", `scale(${Math.max(0, Math.min(1, u)).toFixed(3)})`); });
      },
    };
  },
});

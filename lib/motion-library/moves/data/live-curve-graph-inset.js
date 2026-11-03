// Live position graph inset: a small corner graph (≈ 28% × 16% of the short side, 1 px axes) plots an object's height
// over time as it moves — a 1.5 px accent line drawn from the motion's own y(t) up to the current t (re-sampled from
// t every frame, nothing remembered), with an accent dot and a tiny mono time label ("T.312") under the baseline at
// each contact. The object is a ball dropping and bouncing (restitution 0.62, contacts until it rests), drawn in the
// picture region when `object` is on, so the graph and the thing it measures move together; with `object` off the
// inset stands alone over another move's motion. The time axis runs with the reading direction (leftwards in Arabic),
// and the corner mirrors in Arabic (bottom-right becomes bottom-left).
// Source: prompt-motion "ghinaiya-nirmal-motion-designers-are-cooked" (reference only: rebuilt as our own code).
ML.define({
  id: "data.live-curve-graph-inset",
  category: "data",
  name: "Live position graph inset",
  does: "A small corner graph plots an object's height over time in real time as it moves, with markers under each contact.",
  says: ["precision", "tech", "proof"],
  energy: 2,
  targets: ["chart"],
  duration: [1.5, 8],
  params: {
    metric: { type: "text", default: "height" },
    position: { type: "choice", options: ["bottom-right", "bottom-left", "top-right", "top-left"], default: "bottom-right" },
    markers: { type: "bool", default: true },
    object: { type: "bool", default: true },
    restitution: { type: "number", range: [0.4, 0.8], default: 0.62 },
  },
  pairs: ["data.live-readout", "data.timecode-hud"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "land.light",
  source: { from: "prompt-motion:ghinaiya-nirmal-motion-designers-are-cooked", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { p, at, end, rtl, f, stage } = ctx;
    const el = ctx.el === stage ? null : ctx.el; // on the stage it builds its own place, and never touches what's there
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const sv = (tag, attrs, parent, style) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, String(v)); if (style) e.style.cssText = style; if (parent) parent.append(e); return e; };
    const u = Math.min(f.W, f.H) / 1080;
    const scene = ctx.scene || stage, hb = ctx.box(scene);
    // the motion: a ball dropped at t0, bouncing with restitution e; y(t) is 0 on the ground, 1 at the drop height
    const t0 = at + 0.25, e = ML.clamp(p.restitution, 0.4, 0.8);
    const fall = 0.55; // seconds from the drop height to the first contact
    const contacts = [t0 + fall];
    let half = fall * e; // a bounce's rise time
    while (half > 0.06 && contacts.length < 12) { contacts.push(contacts[contacts.length - 1] + 2 * half); half *= e; }
    const y = (t) => {
      if (t <= t0) return 1;
      if (t < contacts[0]) { const x = (t - t0) / fall; return 1 - x * x; }
      let h = fall * e;
      for (let i = 0; i < contacts.length - 1; i++) {
        if (t < contacts[i + 1]) { const x = (t - contacts[i] - h) / h; return Math.pow(e, 2 * (i + 1)) * (1 - x * x); }
        h *= e;
      }
      return 0;
    };
    // the object (optional): a ball in the picture region
    let ball = null, ground = null, groundY = 0, dropH = 0, ballX = 0, ballR = 0;
    if (p.object) {
      const R = el ? ctx.box(el) : f.pic;
      ballR = Math.min(R.w, R.h) * 0.07;
      dropH = R.h * 0.55; groundY = R.y + R.h * 0.78; ballX = R.x + R.w * 0.5;
      ball = mk("div", `position:absolute;left:${(ballX - ballR - hb.x).toFixed(1)}px;top:0;width:${(ballR * 2).toFixed(1)}px;height:${(ballR * 2).toFixed(1)}px;border-radius:50%;background:var(--x-accent);z-index:19;visibility:hidden;will-change:transform`, scene);
      ground = mk("div", `position:absolute;left:${(ballX - ballR * 2.4 - hb.x).toFixed(1)}px;top:${(groundY - hb.y).toFixed(1)}px;width:${(ballR * 4.8).toFixed(1)}px;height:2px;background:color-mix(in srgb, var(--x-ink) 30%, transparent);z-index:18;visibility:hidden`, scene);
    }
    // the inset
    const W = Math.round(300 * u), H = Math.round(170 * u), m = 40 * u, below = 48 * u;
    let pos = p.position;
    if (rtl) pos = pos.includes("right") ? pos.replace("right", "left") : pos.replace("left", "right");
    const S = f.safe;
    const left = pos.includes("right") ? S.x + S.w - W - m * 0.3 : S.x + m * 0.3;
    const top = pos.includes("bottom") ? S.y + S.h - H - below - 10 * u : S.y + 20 * u;
    const inset = mk("div", `position:absolute;left:${(left - hb.x).toFixed(1)}px;top:${(top - hb.y).toFixed(1)}px;width:${W}px;height:${H + below}px;z-index:21;visibility:hidden;will-change:opacity`, scene);
    mk("div", `position:absolute;inset:${(-10 * u).toFixed(1)}px;border-radius:${(12 * u).toFixed(1)}px;background:color-mix(in srgb, var(--x-panel) 82%, transparent)`, inset);
    const metric = p.metric && p.metric !== "height" ? p.metric : rtl ? "الارتفاع" : "height", metricAr = ML.ARABIC.test(metric);
    mk("div", `position:absolute;top:${(-2 * u).toFixed(1)}px;${rtl ? "right" : "left"}:${(14 * u).toFixed(1)}px;font:var(--x-label-weight) ${(18 * u).toFixed(1)}px var(--x-label-font);letter-spacing:${metricAr ? "0" : "var(--x-label-track)"};text-transform:${metricAr ? "none" : "var(--x-label-case)"};color:var(--x-dim)`, inset, metric);
    const svg = sv("svg", { width: W, height: H + below, viewBox: `0 0 ${W} ${H + below}` }, inset, "position:absolute;left:0;top:0;overflow:visible");
    const ox = rtl ? W - 6 * u : 6 * u, base = H, plotW = W - 16 * u, top0 = 26 * u, plotH = base - top0 - 4 * u;
    sv("path", { d: `M${ox} ${top0} L${ox} ${base} L${rtl ? ox - plotW : ox + plotW} ${base}` }, svg, `fill:none;stroke:var(--x-ink);stroke-opacity:.55;stroke-width:${Math.max(1, u).toFixed(2)}`);
    const line = sv("polyline", { points: "" }, svg, `fill:none;stroke:var(--x-accent);stroke-width:${(2.4 * u).toFixed(2)};stroke-linejoin:round;stroke-linecap:round`);
    const head = sv("circle", { r: 4 * u }, svg, "fill:var(--x-accent)");
    // the time axis covers the bounce and a short rest after it (then the plot holds), within the run
    const span = ML.clamp(contacts[contacts.length - 1] - t0 + 0.8, 1, Math.max(1, end - 0.3 - t0));
    const X = (t) => ox + (rtl ? -1 : 1) * plotW * ML.clamp((t - t0) / span);
    const Y = (v) => base - 2 * u - v * plotH;
    // a dot under every contact; a time label only where it has room (two rows, the fast late bounces go unlabelled)
    const lastX = [-1e9, -1e9], fsT = 16 * u, room = fsT * 3.5;
    const marks = (p.markers ? contacts.filter((c) => c < t0 + span) : []).map((c) => {
      const g = sv("g", {}, svg), cx = X(c), row = lastX.findIndex((x) => Math.abs(cx - x) >= room);
      sv("circle", { cx, cy: base, r: 3.6 * u }, g, "fill:var(--x-accent)");
      if (row >= 0) {
        lastX[row] = cx;
        const tx = sv("text", { x: ML.clamp(cx, room / 2, W - room / 2), y: base + 20 * u + row * 20 * u, "text-anchor": "middle" }, g, `font:500 ${fsT.toFixed(1)}px var(--x-mono-font);fill:var(--x-dim);direction:ltr;unicode-bidi:isolate`);
        tx.textContent = "T." + String(Math.round((c - at) * 1000)).padStart(3, "0");
      }
      return { g, c };
    });
    contacts.slice(0, 5).forEach((c, i) => ctx.sfx(c, "land.light", 0.3 * Math.pow(0.7, i)));
    return {
      draw(t) {
        if (t < at - 1e-6) { inset.style.visibility = "hidden"; if (ball) ball.style.visibility = ground.style.visibility = "hidden"; return; }
        inset.style.visibility = "visible";
        const leave = ML.clamp((t - (end - 0.25)) / 0.2), en = ML.out(t, at, at + 0.3);
        inset.style.opacity = (en * (1 - leave)).toFixed(4);
        // the curve up to now: sampled from y(t) fresh every frame
        const tt = Math.min(t, t0 + span), pts = [];
        if (tt > t0) { const n = Math.max(2, Math.ceil((tt - t0) * 90)); for (let i = 0; i <= n; i++) { const s = t0 + ((tt - t0) * i) / n; pts.push(X(s).toFixed(2) + "," + Y(y(s)).toFixed(2)); } }
        else pts.push(X(t0).toFixed(2) + "," + Y(1).toFixed(2));
        line.setAttribute("points", pts.join(" "));
        head.setAttribute("cx", X(tt).toFixed(2)); head.setAttribute("cy", Y(y(tt)).toFixed(2));
        marks.forEach((mk2) => { mk2.g.style.opacity = t >= mk2.c ? ML.out(t, mk2.c, mk2.c + 0.15).toFixed(4) : "0"; });
        if (ball) {
          ball.style.visibility = ground.style.visibility = "visible";
          ball.style.opacity = ground.style.opacity = (en * (1 - leave)).toFixed(4);
          const v = y(t);
          let squash = 0;
          contacts.forEach((c, i) => { squash = Math.max(squash, 0.2 * Math.pow(e, i) * Math.max(0, 1 - Math.abs(t - c) / 0.07)); });
          const top = groundY - ballR * 2 - v * dropH;
          // squashes from its base (the origin below), so it stays on the ground
          ball.style.transform = `translate(0px, ${(top - hb.y).toFixed(2)}px) scale(${(1 + squash * 0.6).toFixed(4)}, ${(1 - squash).toFixed(4)})`;
          ball.style.transformOrigin = "50% 100%";
        }
      },
    };
  },
});

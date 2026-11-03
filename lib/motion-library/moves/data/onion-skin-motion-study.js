// Onion-skin motion study: an accent ball drops and bounces (closed-form gravity, restitution 0.62, squash at each
// contact, stretch with speed) beside a ruler axis while it drifts along a timeline axis, leaving faint outlined ghosts
// of where it was: one stamped every N frames (at 30 fps), each starting at 40% and fading to 0 over 0.5 s. A mono
// readout pinned beside the ball updates ("— position 0.42   stretch 1.12"); an inset graph in the top corner draws the
// move's curve (height over time) with a dot riding it at the current moment. Mirrored for Arabic (ruler on the right,
// time running right to left).
// Source: prompt-motion "blue-clarity-ok-so-seeing-lots" (reference only: rebuilt as our own code).
ML.define({
  id: "data.onion-skin-motion-study",
  category: "data",
  name: "Ball drop with onion-skin ghosts and easing graph",
  does: "An accent-coloured ball drops and bounces beside a ruler axis, leaving faint outlined ghosts of its past positions, while a small graph in the corner traces the easing curve.",
  says: ["precision", "tech", "time", "step"],
  energy: 3,
  targets: ["shape", "chart"],
  duration: [1.5, 4],
  params: {
    ghost_spacing: { type: "number", range: [1, 4], default: 2, unit: "frames" },
    trail: { type: "choice", options: ["outline", "filled-fade"], default: "outline" },
    inset_graph: { type: "bool", default: true },
    bounce: { type: "number", range: [0.3, 0.8], default: 0.62 },
    drop: { type: "number", range: [0.35, 0.9], default: 0.55, unit: "s" },
  },
  pairs: ["data.measure-scale-ticks", "data.playhead-ruler"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "land.light",
  source: { from: "prompt-motion:blue-clarity-ok-so-seeing-lots", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const NS = "http://www.w3.org/2000/svg";
    const S = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.append(e); return e; };
    const parent = ctx.scene || ctx.stage;
    // the study's box: the target's own box when it has one, else the picture region (covered with the ground)
    let bx = f.pic.x, by = f.pic.y, w = f.pic.w, h = f.pic.h;
    if (el) { const b = ctx.box(el), pb = ctx.box(parent); bx = b.x - pb.x; by = b.y - pb.y; w = b.w; h = b.h; }
    else { const pb = ctx.box(parent); bx -= pb.x; by -= pb.y; }
    const host = document.createElement("div");
    host.style.cssText = `position:absolute;left:${bx}px;top:${by}px;width:${w}px;height:${h}px;z-index:4;${el ? "" : "background:var(--x-ground);"}`;
    parent.append(host);
    const svg = S("svg", { width: w, height: h, viewBox: `0 0 ${w} ${h}` }, host);
    svg.style.cssText = "display:block;overflow:visible";
    // the moving parts on a layer of their own, so the static axes are never re-rasterised under them
    const live = S("svg", { width: w, height: h, viewBox: `0 0 ${w} ${h}` }, host);
    live.style.cssText = "position:absolute;left:0;top:0;overflow:visible;will-change:transform";
    const X = (x) => (rtl ? w - x : x);
    const m = Math.min(w, h), pad = m * 0.07, fs = Math.max(20, m * 0.028), lw = Math.max(1, m * 0.0016);
    const R = m * 0.055;
    const rulerX = pad + fs * 2.4, floorY = h - pad - fs * 2.2;
    const y0 = pad + R + fs, yF = floorY - R, D = yF - y0;
    // the readout: one line where the box is wide, two where it is narrow; the drift stops where it still fits
    const twoLine = w < fs * 42, readW = fs * 0.92 * 0.6 * (twoLine ? 16 : 35);
    const xL = rulerX + R * 2.2, xR = Math.max(xL + m * 0.15, w - pad * 0.5 - R * 1.5 - readW);
    // the bounce, closed form: fall T0, then flights of 2·T0·eᵏ, peaks D·e²ᵏ
    const T0 = p.drop, e = ML.clamp(p.bounce, 0.3, 0.8), g = (2 * D) / (T0 * T0);
    const contacts = [T0];
    for (let k = 1; k < 12; k++) { const Tk = 2 * T0 * Math.pow(e, k); if (Tk < 0.03) break; contacts.push(contacts[k - 1] + Tk); }
    const restAt = contacts[contacts.length - 1];
    const Ts = at + 0.3, Trun = Math.max(1, end - 0.35 - Ts);
    const yAt = (tau) => {
      if (tau <= 0) return y0;
      if (tau < T0) return y0 + 0.5 * g * tau * tau;
      if (tau >= restAt) return yF;
      for (let k = 1; k < contacts.length; k++) {
        if (tau < contacts[k]) { const s = tau - contacts[k - 1], v = g * T0 * Math.pow(e, k); return yF - (v * s - 0.5 * g * s * s); }
      }
      return yF;
    };
    const xAt = (tau) => xL + (xR - xL) * ML.clamp(tau / Trun);
    const vmax = g * T0;
    /** the ball's shape at tau: squash in the 50 ms around a contact, stretch along its speed in flight */
    const shape = (tau) => {
      const v = (yAt(tau + 0.004) - yAt(tau - 0.004)) / 0.008;
      let near = null;
      contacts.forEach((c, k) => { if (Math.abs(tau - c) < 0.05 && (near === null || Math.abs(tau - c) < Math.abs(tau - near.c))) near = { c, k }; });
      // w blends flight into contact, so the ball never jumps to the floor or snaps out of its stretch at the 50 ms edge
      const w = near && tau > 0 ? 1 - Math.abs(tau - near.c) / 0.05 : 0, a = near ? w * 0.28 * Math.pow(e, near.k) : 0;
      const st = tau > 0 && tau < restAt ? (1 - w) * Math.min(0.16, (Math.abs(v) / vmax) * 0.16) : 0;
      return { x: xAt(tau), y: yAt(tau) * (1 - w) + (yF + R * a) * w, rx: R * (1 + a - st * 0.6), ry: R * (1 - a + st) };
    };
    const axes = S("g", {}, svg);
    const st = `stroke:var(--x-dim);stroke-width:${lw}px`, tx = `fill:var(--x-dim);font:var(--x-label-weight) ${fs.toFixed(1)}px var(--x-mono-font);direction:ltr`;
    // the ruler (height, 0 at the floor) and the timeline (seconds) — ticks every tenth / quarter second
    S("line", { x1: X(rulerX), y1: y0 - R, x2: X(rulerX), y2: floorY, style: st }, axes);
    for (let i = 0; i <= 10; i++) {
      const y = yF - (D * i) / 10, big = i % 5 === 0;
      S("line", { x1: X(rulerX), y1: y, x2: X(rulerX - (big ? fs * 0.8 : fs * 0.45)), y2: y, style: st }, axes);
      if (big) { const t = S("text", { x: X(rulerX - fs * 1.1), y: y + fs * 0.35, "text-anchor": rtl ? "start" : "end", style: tx }, axes); t.textContent = (i / 10).toFixed(1); }
    }
    S("line", { x1: X(rulerX), y1: floorY, x2: X(w - pad), y2: floorY, style: st }, axes);
    for (let s = 0, i = 0; s <= Trun + 1e-6; s += 0.25, i++) {
      const x = xAt(s) - xL + rulerX + R * 2.2;
      if (x > w - pad) break;
      S("line", { x1: X(x), y1: floorY, x2: X(x), y2: floorY + (i % 4 === 0 ? fs * 0.8 : fs * 0.4), style: st }, axes);
      if (i % 4 === 0) { const t = S("text", { x: X(x), y: floorY + fs * 2, "text-anchor": "middle", style: tx }, axes); t.textContent = rtl ? `${i / 4}ث` : `${i / 4}s`; if (rtl) t.style.direction = "rtl"; }
    }
    // the ghosts (a pool sized to 0.5 s of stamps) under the ball
    const dt = Math.round(ML.clamp(p.ghost_spacing, 1, 4)) / 30, life = 0.5;
    const nG = Math.ceil(life / dt) + 1;
    const ghosts = Array.from({ length: nG }, () => S("ellipse", { cx: -999, cy: -999, rx: R, ry: R, style: p.trail === "outline" ? `fill:none;stroke:var(--x-accent-2);stroke-width:${Math.max(1.5, lw * 1.5)}px` : "fill:var(--x-accent-2);stroke:none" }, live));
    const ball = S("ellipse", { rx: R, ry: R, style: "fill:var(--x-accent)" }, live);
    const readout = S("text", { "text-anchor": "start", style: `fill:var(--x-ink);font:var(--x-label-weight) ${(fs * 0.92).toFixed(1)}px var(--x-mono-font);white-space:pre;direction:${rtl ? "rtl" : "ltr"};unicode-bidi:isolate` }, live);
    const read1 = S("tspan", {}, readout), read2 = S("tspan", {}, readout);
    // the inset graph: the move's curve (height over its run), a traced part, and a dot at now
    let graph = null, gBox = null;
    if (p.inset_graph) {
      const gw = Math.min(w * 0.3, m * 0.42), gh = gw / 2, gx = w - pad - gw, gy = pad * 0.6;
      const G = S("g", {}, svg), G2 = S("g", {}, live);
      S("rect", { x: rtl ? w - gx - gw : gx, y: gy, width: gw, height: gh, rx: Math.min(8, gh * 0.08), style: `fill:var(--x-panel);stroke:var(--x-line);stroke-width:${lw}px` }, G);
      const ip = gh * 0.14, pt = (u) => { const hgt = (yF - yAt(u * Trun)) / D; return [X(gx + ip + (gw - 2 * ip) * u), gy + gh - ip - (gh - 2 * ip) * hgt]; };
      const N = 90, pts = Array.from({ length: N + 1 }, (_, i) => pt(i / N));
      S("path", { d: "M" + pts.map((q) => q[0].toFixed(1) + " " + q[1].toFixed(1)).join(" L"), style: `fill:none;stroke:var(--x-line);stroke-width:${lw * 1.5}px` }, G);
      const traced = S("path", { d: "", style: `fill:none;stroke:var(--x-ink);stroke-width:${lw * 1.6}px;stroke-linejoin:round` }, G2);
      const dot = S("circle", { r: Math.max(3, gh * 0.06), style: "fill:var(--x-accent)" }, G2);
      const cap = S("text", { x: X(gx + gw - ip), y: gy + ip + fs * 0.7, "text-anchor": rtl ? "start" : "end", style: tx.replace(fs.toFixed(1) + "px", (fs * 0.8).toFixed(1) + "px") }, G);
      cap.textContent = "y(t)";
      graph = { G, G2, traced, dot, pts, pt, N };
      gBox = { a: rtl ? w - gx - gw : gx, b: rtl ? w - gx : gx + gw, bottom: gy + gh };
    }
    contacts.slice(0, 3).forEach((c, k) => ctx.sfx(Ts + c, "land.light", 0.35 * Math.pow(0.7, k)));
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        host.style.opacity = (ML.out(t, at, at + 0.3) * (1 - leave)).toFixed(4);
        const tau = Math.max(0, t - Ts);
        const b = shape(tau);
        ball.setAttribute("cx", X(b.x).toFixed(2)); ball.setAttribute("cy", b.y.toFixed(2));
        ball.setAttribute("rx", b.rx.toFixed(2)); ball.setAttribute("ry", b.ry.toFixed(2));
        ball.style.opacity = ML.lin(t, at + 0.1, at + 0.3).toFixed(3);
        // ghosts: stamps at k·dt in the past, fading over `life`
        const last = Math.floor(tau / dt + 1e-9) * dt;
        ghosts.forEach((gEl, j) => {
          const gt = last - (j + 1) * dt + dt, age = tau - gt;
          if (t < Ts || gt < 0 || age <= dt * 0.5 || age >= life) { gEl.style.display = "none"; return; }
          const s = shape(gt);
          gEl.style.display = "";
          gEl.setAttribute("cx", X(s.x).toFixed(2)); gEl.setAttribute("cy", s.y.toFixed(2));
          gEl.setAttribute("rx", s.rx.toFixed(2)); gEl.setAttribute("ry", s.ry.toFixed(2));
          gEl.style.opacity = (0.4 * (1 - age / life)).toFixed(3);
        });
        const pos = (yF - yAt(tau)) / D, stretch = b.ry / R;
        read1.textContent = `${rtl ? "— الموضع" : "— position"} ${pos.toFixed(2)}`;
        read2.textContent = `${twoLine ? "" : "   "}${rtl ? "التمدد" : "stretch"} ${stretch.toFixed(2)}`;
        // pinned beside the ball; while the ball is level with the inset graph and the words would reach it, just under it
        const rx0 = X(b.x + R * 1.5), rx1 = rtl ? rx0 - readW : rx0 + readW, clash = gBox && Math.max(rx0, rx1) > gBox.a && Math.min(rx0, rx1) < gBox.b;
        const ry = clash ? Math.max(b.y + fs * 0.35, gBox.bottom + fs * 1.2) : b.y + fs * 0.35;
        readout.setAttribute("x", rx0.toFixed(2));
        readout.setAttribute("y", ry.toFixed(2));
        if (twoLine) { read2.setAttribute("x", rx0.toFixed(2)); read2.setAttribute("dy", "1.2em"); }
        readout.style.opacity = ML.lin(t, Ts, Ts + 0.2).toFixed(3);
        if (graph) {
          const u = ML.clamp(tau / Trun), n = Math.max(2, Math.floor(u * graph.N) + 1);
          const pts = graph.pts.slice(0, n);
          graph.traced.setAttribute("d", "M" + pts.map((q) => q[0].toFixed(1) + " " + q[1].toFixed(1)).join(" L"));
          const d = graph.pt(u);
          graph.dot.setAttribute("cx", Math.round(d[0])); graph.dot.setAttribute("cy", Math.round(d[1]));
          graph.G.style.opacity = graph.G2.style.opacity = ML.lin(t, at + 0.15, at + 0.45).toFixed(3);
        }
      },
    };
  },
});

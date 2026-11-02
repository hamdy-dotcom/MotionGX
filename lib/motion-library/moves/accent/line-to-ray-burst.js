// Line spins into a ray burst: one long hairline splits into 24–48 tapered rays that fan out around the centre
// (each turning to i·360/N with a 6 ms stagger, power3.out 0.4 s) while the whole burst spins +40°/s. Each ray is a
// quad 1 px wide at the centre and ~10 px at the tip, its length randomised ±20 %, fading to the tip, with two ghost
// copies 2° behind it (30 % / 15 %) for a drawn motion blur. Optional sparks fly out 0 → 400 px (power2.out 0.8 s).
// At 0.8 s the burst contracts (×0.6) and an optional small mono title fades in at the centre; then each ray retracts
// toward its tip (power2.in 0.25 s) and leaves a ring of ticks that holds until the move leaves. Around a logo the rays
// start outside the mark, so it works as a logo-reveal burst behind it.
// Source: prompt-motion teslachartz (reference only) — rebuilt as our own SVG code.
ML.define({
  id: "accent.line-to-ray-burst",
  category: "accent",
  name: "Line spins into a ray burst",
  does: "A horizontal line multiplies and fans around the centre into a dense starburst of tapered rays that spin, then retract into a ring of ticks.",
  says: ["energy", "arrival", "celebration"],
  energy: 4,
  targets: ["shape", "stage", "logo"],
  duration: [1, 2.5],
  params: {
    rays: { type: "choice", options: ["36", "24", "48"], default: "36" },
    spin: { type: "choice", options: ["cw", "ccw", "none"], default: "cw" },
    sparks: { type: "bool", default: false },
    centre_label: { type: "choice", options: ["none", "title"], default: "none" },
    title: { type: "text", default: "" },
  },
  pairs: ["accent.mote-burst", "element.logo-reveal"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:teslachartz-claude-opus-5-5-leaves", license: "reference", note: "our own SVG rebuild of the technique" },
  setup(ctx) {
    const { p, at, end, f, stage, el } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, m = Math.min(W, H), k = m / 1080;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); if (parent) parent.append(e); return e; };

    // the centre: the target's middle (a logo or shape), else the picture region's
    let cx = f.pic.x + f.pic.w / 2, cy = f.pic.y + f.pic.h / 2, inner = 0;
    if (el && el !== stage) { const b = ctx.box(el); cx = b.x + b.w / 2; cy = b.y + b.h / 2; inner = Math.max(b.w, b.h) * 0.55; }
    const N = parseInt(p.rays, 10) || 36;
    const dirSpin = p.spin === "none" ? 0 : (p.spin === "ccw" ? -1 : 1) * (ctx.rtl ? -1 : 1);
    const lineHalf = Math.min(375 * k * 1.35, W * 0.42);

    // timing, compressed when the move is short
    const D = Math.max(0.6, end - at), ts = Math.min(1, D / 1.6);
    const T = { line: 0.12 * ts, fan: 0.15 * ts, fanDur: 0.4 * ts, contract: 0.8 * ts, contractDur: 0.25 * ts, retract: 1.15 * ts, retractDur: 0.25 * ts };

    const svg = mk("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
    svg.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:6;visibility:hidden;will-change:transform" // its own layer: the frame under it rasterises the same every time;
    host.append(svg);
    const defs = mk("defs", {}, svg);
    const grad = mk("linearGradient", { id: `ml-ray-${Math.round(cx)}-${Math.round(cy)}`, x1: "0", y1: "0", x2: "1", y2: "0" }, defs);
    mk("stop", { offset: "0", style: "stop-color:var(--x-ink);stop-opacity:0.7" }, grad);
    mk("stop", { offset: "0.65", style: "stop-color:var(--x-ink);stop-opacity:0.45" }, grad);
    mk("stop", { offset: "1", style: "stop-color:var(--x-ink);stop-opacity:0" }, grad);
    const fill = `url(#${grad.id})`;
    const root = mk("g", {}, svg);
    const line = mk("rect", { x: -lineHalf, y: -1 * k, width: lineHalf * 2, height: 2 * Math.max(1, k), style: "fill:var(--x-ink)" }, root);

    // the rays: three copies each (the ray and two ghosts behind it)
    const rays = [];
    for (let i = 0; i < N; i++) {
      const L = (220 + 140 * ML.rnd(i, 1)) * k * 1.35 * (0.8 + 0.4 * ML.rnd(i, 2));
      const target = (i * 360) / N;
      // each ray starts on the horizontal line (pointing right or left), then turns to its own angle
      const start = target <= 90 ? 0 : target < 270 ? 180 : 360;
      const g = mk("g", {}, root);
      const parts = [1, 0.3, 0.15].map((o) => mk("polygon", { fill, opacity: o }, g));
      rays.push({ g, parts, L, target, start, delay: i * 0.006 * ts });
    }
    // the tick ring the rays leave behind
    const ticks = mk("g", {}, root);
    rays.forEach((ray) => mk("rect", { x: inner + ray.L * 0.6 - 10 * k, y: -1.2 * k, width: 10 * k, height: 2.4 * k, transform: `rotate(${ray.target})`, style: "fill:var(--x-ink);opacity:0.7" }, ticks));
    // sparks
    const sparks = [];
    if (p.sparks) for (let i = 0; i < 30; i++) {
      const c = mk("circle", { r: (1 + ML.rnd(i, 7)) * k * 1.6, style: "fill:var(--x-ink)" }, root);
      sparks.push({ c, a: ML.rnd(i, 8) * Math.PI * 2, R: (0.55 + 0.45 * ML.rnd(i, 9)) * 400 * k * 1.3, d: ML.rnd(i, 10) * 0.12 * ts });
    }
    // the centre title (the given text, else the target's own words, else the scene headline)
    let label = null;
    if (p.centre_label === "title") {
      let text = (p.title || "").trim();
      if (!text && el && el !== stage && !(el instanceof SVGElement)) text = el.textContent.trim();
      if (!text) { const h = host.querySelector(".ml-label, .ml-title"); text = h ? h.textContent.trim() : ""; }
      if (text) {
        label = document.createElement("div");
        label.className = "ml-label";
        label.textContent = text;
        label.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;translate:-50% -50%;white-space:nowrap;font-size:${Math.round(20 * k * 1.3)}px;letter-spacing:0.2em;color:var(--x-ink);pointer-events:none;z-index:7;opacity:0`;
        host.append(label);
      }
    }
    const quad = (len, from = 0) => {
      const a = Math.max(from, 0), w0 = 0.5 * k + (a / Math.max(1, len)) * 4.5 * k;
      return `${inner + a},${-w0} ${inner + len},${-5 * k} ${inner + len},${5 * k} ${inner + a},${w0}`;
    };
    const p3 = (x) => 1 - Math.pow(1 - x, 3), p2in = (x) => x * x;
    ctx.sfx(at + T.fan, "whoosh.soft", 0.35);
    if (label) ctx.sfx(at + T.contract, "tap", 0.2);

    return {
      draw(t) {
        const r = t - at;
        const leave = ML.lin(t, end - 0.3, end);
        const on = r >= 0 && leave < 1;
        svg.style.visibility = on ? "visible" : "hidden";
        if (label) label.style.opacity = "0";
        if (!on) return;
        root.setAttribute("opacity", (1 - leave).toFixed(3));
        const spinA = dirSpin * 40 * Math.min(r, T.retract + T.retractDur);
        root.setAttribute("transform", `translate(${cx} ${cy}) rotate(${spinA.toFixed(3)})`);
        // the single line: grows in, then hands over to the rays
        const lineIn = ML.out(r, 0, T.line), lineOut = ML.lin(r, T.fan, T.fan + 0.08 * ts);
        line.setAttribute("transform", `scale(${lineIn.toFixed(4)} 1)`);
        line.setAttribute("opacity", (1 - lineOut).toFixed(3));
        const contract = 1 - 0.4 * ML.out(r, T.contract, T.contract + T.contractDur);
        const retract = p2in(ML.lin(r, T.retract, T.retract + T.retractDur));
        rays.forEach((ray) => {
          const u = p3(ML.lin(r, T.fan + ray.delay, T.fan + ray.delay + T.fanDur));
          const show = r >= T.fan;
          ray.g.style.display = show ? "" : "none";
          if (!show) return;
          const ang = ray.start + (ray.target - ray.start) * u;
          const len = ray.L * contract;
          const from = (len - 10 * k) * retract;
          const pts = quad(len, from);
          // the ghosts trail behind the spin (and behind the fan's own turn)
          const turn = Math.sign(ray.target - ray.start) || 1, lag = dirSpin !== 0 ? -dirSpin : -turn;
          ray.parts.forEach((q, j) => {
            q.setAttribute("points", pts);
            q.setAttribute("transform", `rotate(${(ang + lag * 2 * j).toFixed(3)})`);
            q.style.display = j > 0 && retract >= 1 ? "none" : "";
          });
        });
        // tick ring: the retracted rays' tips, solid
        ticks.setAttribute("opacity", retract >= 1 ? "1" : "0");
        sparks.forEach((s) => {
          const u = ML.lin(r, T.fan + s.d, T.fan + s.d + 0.8 * ts), e = 1 - Math.pow(1 - u, 2);
          const rr = inner + s.R * e;
          s.c.setAttribute("cx", (Math.cos(s.a) * rr).toFixed(2));
          s.c.setAttribute("cy", (Math.sin(s.a) * rr).toFixed(2));
          s.c.setAttribute("opacity", (u > 0 && u < 1 ? (1 - u) * 0.9 : 0).toFixed(3));
        });
        if (label) label.style.opacity = (ML.ease(r, T.contract, T.contract + 0.3 * ts) * (1 - leave)).toFixed(3);
      },
    };
  },
});

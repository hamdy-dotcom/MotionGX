// Heartbeat pulse line: a glowing flat line across the frame at the target's middle (or half height).
// travelling-pulse: a pulse (P-QRS-T, sine or step, ~160 px wide at 1080) is born at the line's start every 60/bpm s
// and travels across at ~400 px/s (faster on a wide line so it crosses in ~1.6 s); the first is small (1/6 of the
// amplitude), the rest full; behind each head the line is flat again and a short bright trail fades out behind it.
// draw-on: the line draws itself (stroke-dashoffset, 1.2 s power1.inOut) — flat, one beat, then a raised flat — led by
// a bright point with a soft glow. flare: when the line is done, the point flares into a 4-point star with a long
// horizontal streak (0.3 s). Pulses travel right to left in Arabic. Colour: the look's accent or ink; glow from --x-glow-2.
// Source: prompt-motion loicrambo-just-one-shot-the + marouanegazouzi-omg-the-15-second-motion (reference only: our own
// rebuild).
ML.define({
  id: "accent.ecg-heartbeat-line",
  category: "accent",
  name: "Heartbeat pulse line",
  does: "A glowing flat line runs across the frame and a heartbeat spike pulses along it (or a light point draws the pulse, ending in a star flare).",
  says: ["story", "time", "arrival", "energy"],
  energy: 2,
  targets: ["shape", "line", "scene"],
  duration: [1, 3],
  params: {
    amplitude: { type: "number", range: [15, 120], default: 90, unit: "px" },
    bpm: { type: "number", range: [40, 140], default: 72 },
    draw: { type: "choice", options: ["travelling-pulse", "draw-on"], default: "travelling-pulse" },
    flare: { type: "bool", default: false },
    shape: { type: "choice", options: ["heartbeat", "sine", "step"], default: "heartbeat" },
    colour: { type: "choice", options: ["accent", "ink"], default: "accent" },
  },
  pairs: [],
  avoid: ["playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:marouanegazouzi-omg-the-15-second-motion", license: "reference", note: "our own rebuild; also loicrambo-just-one-shot-the" },
  setup(ctx) {
    const { p, at, end, f, stage, el, rtl } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, k = Math.min(W, H) / 1080, dir = rtl ? -1 : 1;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); parent.append(e); return e; };
    // where the line runs: across the target (a line / shape) or the whole frame at half height
    let x0 = 0, x1 = W, y = H * 0.5;
    if (el && el !== stage) { const b = ctx.box(el); y = b.y + b.h / 2; if (b.w > W * 0.3) { x0 = b.x; x1 = b.x + b.w; } }
    const lineW = x1 - x0, amp = p.amplitude * k * 1.4, pw = 160 * k * (p.shape === "step" ? 0.8 : 1);
    const col = p.colour === "ink" ? "var(--x-ink)" : "var(--x-accent)", glow = "var(--x-glow-2)";
    // one beat, u ∈ [0, 1] across its width → height (1 = the amplitude, up)
    const gs = (u, c, w, a) => a * Math.exp(-Math.pow((u - c) / w, 2));
    const beat = (u) => {
      if (u <= 0 || u >= 1) return 0;
      if (p.shape === "sine") return Math.sin(u * Math.PI * 2) * Math.sin(u * Math.PI);
      if (p.shape === "step") return ML.clamp((u - 0.1) / 0.05) * ML.clamp((0.9 - u) / 0.05) * (1 - 0.15 * ML.clamp((u - 0.15) / 0.7));
      return gs(u, 0.16, 0.05, 0.12) + gs(u, 0.39, 0.018, -0.16) + gs(u, 0.45, 0.022, 1) + gs(u, 0.51, 0.02, -0.32) + gs(u, 0.72, 0.07, 0.24);
    };
    const xs = (a) => (dir > 0 ? x0 + a : x1 - a); // distance along the line → stage x
    const STEP = 4 * k;

    const svg = mk("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}` }, host);
    svg.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;overflow:visible;z-index:6;visibility:hidden";
    const id = "mlecg" + Math.round(ML.rnd(at * 3.1, y) * 1e8);
    const defs = mk("defs", {}, svg);
    const flt = mk("filter", { id: id + "g", x: "-20%", y: "-50%", width: "140%", height: "200%" }, defs);
    mk("feGaussianBlur", { stdDeviation: (6 * k).toFixed(1) }, flt);
    const glowPath = mk("path", { fill: "none", stroke: glow, "stroke-width": 9 * k, "stroke-linejoin": "round", "stroke-linecap": "round", filter: `url(#${id}g)`, opacity: 0.55 }, svg);
    const mainPath = mk("path", { fill: "none", stroke: col, "stroke-width": 3 * k, "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);
    const headGlow = mk("circle", { r: 26 * k, fill: glow, filter: `url(#${id}g)`, opacity: 0 }, svg);
    const head = mk("circle", { r: 6 * k, fill: col, opacity: 0 }, svg);
    const star = mk("g", { opacity: 0 }, svg);
    const streakH = mk("rect", { fill: col }, star), streakV = mk("rect", { fill: col }, star);
    const starCore = mk("circle", { r: 9 * k, fill: col }, star), starGlow = mk("circle", { r: 40 * k, fill: glow, filter: `url(#${id}g)`, opacity: 0.8 }, star);
    const setStar = (sx, sy, u) => {
      // a 4-point lens flare: long horizontal streak, short vertical, fading over 0.3 s
      const a = u <= 0 || u >= 1 ? 0 : Math.sin(u * Math.PI) * (u < 0.3 ? 1 : 1 - (u - 0.3) / 0.7 * 0.6);
      star.setAttribute("opacity", a.toFixed(3));
      if (a <= 0) return;
      const L = 400 * k * (0.4 + 0.6 * ML.out(u, 0, 0.5)), V = 110 * k * (0.4 + 0.6 * ML.out(u, 0, 0.4)), th = 3 * k;
      streakH.setAttribute("x", (sx - L / 2).toFixed(1)); streakH.setAttribute("y", (sy - th / 2).toFixed(1)); streakH.setAttribute("width", L.toFixed(1)); streakH.setAttribute("height", th.toFixed(1)); streakH.setAttribute("rx", th / 2);
      streakV.setAttribute("x", (sx - th / 2).toFixed(1)); streakV.setAttribute("y", (sy - V / 2).toFixed(1)); streakV.setAttribute("width", th.toFixed(1)); streakV.setAttribute("height", V.toFixed(1)); streakV.setAttribute("rx", th / 2);
      for (const c of [starCore, starGlow]) { c.setAttribute("cx", sx.toFixed(1)); c.setAttribute("cy", sy.toFixed(1)); }
    };

    const period = 60 / p.bpm, speed = Math.max(400 * k, lineW / 1.6);
    const travel = (lineW + pw) / speed;
    // travelling mode: pulses born every period while the move runs, trails fading behind their heads
    const births = [];
    if (p.draw !== "draw-on") for (let b = at; b < end - 0.2; b += period) births.push(b);
    const trails = births.map((_, i) => {
      const gid = `${id}t${i}`;
      const lg = mk("linearGradient", { id: gid, gradientUnits: "userSpaceOnUse", y1: 0, y2: 0 }, defs);
      const s0 = mk("stop", { offset: 0, "stop-color": glow, "stop-opacity": 0 }, lg), s1 = mk("stop", { offset: 1, "stop-color": glow, "stop-opacity": 0.95 }, lg);
      return { lg, path: mk("path", { fill: "none", stroke: `url(#${gid})`, "stroke-width": 5 * k, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg), s0, s1 };
    });
    const ampOf = (i) => (i === 0 && births.length > 1 ? amp / 6 : amp);
    // draw-on mode: flat, one beat centred, then a raised flat (the source's step up)
    const raise = p.shape === "step" ? 0 : amp * 0.35;
    const drawY = (a) => { const c = lineW * 0.42, u = (a - c) / (pw * 1.6); return y - amp * beat(u) - raise * ML.ease(a, c + pw * 1.2, c + pw * 1.7); };
    let drawLen = 0;
    if (p.draw === "draw-on") {
      let d = "";
      for (let a = 0; a <= lineW; a += STEP) d += `${a ? "L" : "M"}${xs(a).toFixed(1)} ${drawY(a).toFixed(1)}`;
      mainPath.setAttribute("d", d); glowPath.setAttribute("d", d);
      drawLen = mainPath.getTotalLength();
      for (const e of [mainPath, glowPath]) e.setAttribute("stroke-dasharray", `${drawLen.toFixed(1)} ${(drawLen + 10).toFixed(1)}`);
    }
    const drawDur = Math.min(1.2, Math.max(0.6, (end - at) * 0.6)), doneAt = at + drawDur;
    const p1 = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2); // power1.inOut
    // when the first full pulse reaches the far end (travelling flare)
    const flareAt = p.draw === "draw-on" ? doneAt : births.length > 1 ? births[1] + (lineW - pw * 0.55) / speed : births.length ? births[0] + (lineW - pw * 0.55) / speed : Infinity;

    if (p.draw === "draw-on") { ctx.sfx(at, "whoosh.soft", 0.2); if (p.flare) ctx.sfx(doneAt, "blip", 0.3); }
    else births.forEach((b, i) => { const hitAt = b + (lineW * 0.5) / speed; if (hitAt < end) ctx.sfx(hitAt, "blip", i === 0 ? 0.1 : 0.2); });
    if (p.flare && p.draw !== "draw-on" && flareAt < end) ctx.sfx(flareAt, "swell", 0.2);

    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.25, end);
        const on = t >= at && leave < 1;
        svg.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        svg.style.opacity = ((1 - leave) * ML.lin(t, at, at + 0.15)).toFixed(4);
        if (p.draw === "draw-on") {
          const u = p1(ML.lin(t, at, doneAt));
          for (const e of [mainPath, glowPath]) e.setAttribute("stroke-dashoffset", (drawLen * (1 - u)).toFixed(1));
          const pt = mainPath.getPointAtLength(drawLen * u);
          const ho = u > 0 && u < 1 ? 1 : 1 - ML.lin(t, doneAt, doneAt + 0.3);
          for (const c of [head, headGlow]) { c.setAttribute("cx", pt.x.toFixed(1)); c.setAttribute("cy", pt.y.toFixed(1)); }
          head.setAttribute("opacity", ho.toFixed(3)); headGlow.setAttribute("opacity", (ho * 0.9).toFixed(3));
          if (p.flare) setStar(pt.x, pt.y, ML.lin(t, doneAt, doneAt + 0.3));
          return;
        }
        // travelling pulses: the height at each point is the sum of the live pulses' shapes
        const live = births.map((b, i) => ({ i, lead: (t - b) * speed, a: ampOf(i) })).filter((q) => q.lead > 0 && q.lead < lineW + pw);
        let d = "";
        for (let a = 0; a <= lineW + 0.1; a += STEP) {
          let h = 0;
          for (const q of live) h += q.a * beat((a - (q.lead - pw)) / pw);
          d += `${a ? "L" : "M"}${xs(a).toFixed(1)} ${(y - h).toFixed(1)}`;
        }
        mainPath.setAttribute("d", d); glowPath.setAttribute("d", d);
        trails.forEach((tr, i) => {
          const q = live.find((z) => z.i === i);
          if (!q) { tr.path.setAttribute("d", ""); return; }
          const a1 = Math.min(q.lead, lineW), a0 = Math.max(0, q.lead - pw - 260 * k);
          let td = "";
          for (let a = a0; a <= a1; a += STEP) td += `${td ? "L" : "M"}${xs(a).toFixed(1)} ${(y - q.a * beat((a - (q.lead - pw)) / pw)).toFixed(1)}`;
          tr.path.setAttribute("d", td);
          tr.lg.setAttribute("x1", xs(a0).toFixed(1)); tr.lg.setAttribute("x2", xs(a1).toFixed(1));
        });
        // the head of the newest pulse carries the bright point
        const top = live.length ? live[live.length - 1] : null;
        if (top && top.lead < lineW) { const hx = xs(top.lead); for (const c of [head, headGlow]) { c.setAttribute("cx", hx.toFixed(1)); c.setAttribute("cy", y.toFixed(1)); } head.setAttribute("opacity", "1"); headGlow.setAttribute("opacity", "0.7"); }
        else { head.setAttribute("opacity", "0"); headGlow.setAttribute("opacity", "0"); }
        if (p.flare) setStar(xs(lineW - 40 * k), y, ML.lin(t, flareAt, flareAt + 0.3));
      },
    };
  },
});

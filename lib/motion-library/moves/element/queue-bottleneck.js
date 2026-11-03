// Work queue piles at a bottleneck. A hairline baseline crosses the region; an obstacle pops onto it (hourglass: two
// opposing triangles apex-to-apex, 60×80 each; or a funnel, or a wall with a slot — scale 0 → 1, back.out(1.6),
// 0.35 s). Tasks (14×4 dashes with 6 px gaps, dots, or small cards) spawn at the start edge and travel ~300 px/s;
// near the bottleneck the gaps shrink to 1 px and each eases to v = 0, forming a dense pile; a soft smear
// (20 %) trails the moving front; a tiny mono label above counts the pile. A few leak through one by one, turning
// into accent dots. Modelled as a queue in closed form — arrival_i = spawn_i + travel, departure_i =
// max(arrival_i, departure_(i−1) + service) — so every frame is a function of t alone. The flow runs right to left in
// Arabic. Sizes scale with the stage (the spec's px are for a 720 px short side). However short the run or wide the
// frame, the stream reaches the neck within 40 % of it: it starts already in flight rather than arriving too late.
// The picture region clears as the diagram arrives (clear), and comes back as it leaves. throttle = how long the neck
// holds each task, in arrival gaps: higher lets fewer through.
// Source: prompt-motion "prasad-pilla-wtf-made-entirely-with" (reference only — rebuilt as our own code).
ML.define({
  id: "element.queue-bottleneck",
  category: "element",
  name: "Work queue piles at a bottleneck",
  does: "A dashed line of tasks streams in from the side and bunches up, compressing, at an hourglass shape, a few leaking through.",
  says: ["problem", "flow", "time"],
  energy: 3,
  targets: ["shape", "scene"],
  duration: [2, 5],
  params: {
    queue: { type: "choice", options: ["dashes", "dots", "cards"], default: "dashes" },
    obstacle: { type: "choice", options: ["hourglass", "funnel", "wall"], default: "hourglass" },
    speed: { type: "number", range: [150, 500], default: 300, unit: "px/s" },
    throttle: { type: "number", range: [2, 6], default: 3 },
    clear: { type: "bool", default: true },
    label: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "data.counter-roll"],
  avoid: ["calm", "luxury", "relief"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "prompt-motion:prasad-pilla-wtf-made-entirely-with", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const NS = "http://www.w3.org/2000/svg";
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const s = (Math.min(f.W, f.H) / 720); // the spec's px → the stage
    const Rg = own ? ctx.box(own) : { x: 0, y: f.pic.y, w: f.W, h: f.pic.h };
    if (own) own.style.visibility = "hidden";
    const L = Rg.w, lineY = Rg.y + Rg.h * 0.55;
    const X = (u) => (rtl ? Rg.x + Rg.w - u : Rg.x + u); // along the flow → stage x
    const ob = L * 0.64; // the bottleneck
    const kind = p.queue;
    const len = (kind === "cards" ? 34 : kind === "dots" ? 8 : 14) * s, hi = (kind === "cards" ? 22 : kind === "dots" ? 8 : 4) * s;
    const gap = (kind === "cards" ? 10 : 6) * s, tight = len + 1 * s, pitch = len + gap;
    const v = ML.clamp(p.speed, 150, 500) * s;
    const neckGap = 6 * s, front = ob - neckGap - len * 0.6; // the pile's head sits just before the neck

    const sv = doc.createElementNS(NS, "svg");
    sv.setAttribute("viewBox", `0 0 ${f.W} ${f.H}`);
    sv.style.cssText = `position:absolute;left:0;top:0;width:${f.W}px;height:${f.H}px;overflow:visible;pointer-events:none;z-index:6;will-change:transform;`; // its own layer: its repaints never re-raster the scene under it
    host.append(sv);
    const el = (tag, attrs, parent = sv) => { const e = doc.createElementNS(NS, tag); for (const [a, b] of Object.entries(attrs)) e.setAttribute(a, b); parent.append(e); return e; };
    const fid = "ml-qb-" + Math.round(ML.rnd(at * 5.7 + L, 2) * 1e6);
    // the smear: a soft gradient streak (a fixed-geometry gradient, not a raster blur, so each frame paints the same)
    const grad = el("linearGradient", { id: fid, x1: rtl ? "1" : "0", x2: rtl ? "0" : "1", y1: "0", y2: "0" }, el("defs", {}));
    el("stop", { offset: "0", style: "stop-color:var(--x-ink);stop-opacity:0" }, grad);
    el("stop", { offset: "0.7", style: "stop-color:var(--x-ink);stop-opacity:1" }, grad);
    el("stop", { offset: "1", style: "stop-color:var(--x-ink);stop-opacity:0" }, grad);
    const base = el("line", { x1: X(0), x2: X(L), y1: lineY, y2: lineY, style: `stroke:var(--x-ink);stroke-opacity:.28;stroke-width:${Math.max(1, 0.8 * s)}` });
    const smear = el("rect", { y: lineY - hi * 1.2, height: hi * 2.4, rx: hi * 1.2, style: `fill:url(#${fid});opacity:0` });

    // the obstacle, popping in about the neck
    const og = el("g", {});
    const ox = X(ob), dirS = rtl ? -1 : 1;
    if (p.obstacle === "hourglass") {
      const tw = 60 * s, th = 80 * s, n = Math.max(neckGap, hi * 0.9 + 2 * s);
      el("path", { d: `M${ox - tw / 2} ${lineY - n - th} L${ox + tw / 2} ${lineY - n - th} L${ox} ${lineY - n}Z`, style: "fill:var(--x-accent)" }, og);
      el("path", { d: `M${ox - tw / 2} ${lineY + n + th} L${ox + tw / 2} ${lineY + n + th} L${ox} ${lineY + n}Z`, style: "fill:var(--x-accent)" }, og);
    } else if (p.obstacle === "funnel") {
      const fw = 90 * s, fh = 80 * s, n = Math.max(neckGap, hi * 0.9 + 2 * s), w = 7 * s;
      for (const sg of [-1, 1]) el("path", { d: `M${ox - dirS * fw} ${lineY + sg * fh} L${ox} ${lineY + sg * n} L${ox} ${lineY + sg * (n + w)} L${ox - dirS * fw} ${lineY + sg * (fh + w)}Z`, style: "fill:var(--x-accent)" }, og);
    } else {
      const ww = 12 * s, wh = 100 * s, n = Math.max(neckGap, hi * 0.9 + 2 * s);
      el("rect", { x: ox - ww / 2, y: lineY - n - wh, width: ww, height: wh, rx: ww / 3, style: "fill:var(--x-accent)" }, og);
      el("rect", { x: ox - ww / 2, y: lineY + n, width: ww, height: wh, rx: ww / 3, style: "fill:var(--x-accent)" }, og);
    }

    // the queue in closed form
    const interval = pitch / v, travel = (front + len) / v;
    const span = Math.max(0.6, end - at - 0.6), head = Math.max(0, travel - span * 0.4); // the head start
    const t0 = at + 0.3 - head;
    const n = Math.max(4, Math.min(130, Math.floor((span + head) / interval)));
    const maxPile = Math.floor((front * 0.82) / tight);
    const spanArr = (n - 1) * interval;
    const service = Math.max(interval * 1.5, Math.min(interval * ML.clamp(p.throttle, 2, 6), spanArr / Math.max(1, n - maxPile)));
    const ts = [], arr = [], dep = [];
    for (let i = 0; i < n; i++) { ts[i] = t0 + i * interval; arr[i] = ts[i] + travel; dep[i] = i ? Math.max(arr[i], dep[i - 1] + service) : arr[i]; }
    const items = ts.map((_, i) => el(kind === "dots" ? "circle" : "rect", kind === "dots" ? { r: Math.round(len / 2), cy: Math.round(lineY), style: "fill:var(--x-ink)" } : { height: Math.max(2, Math.round(hi)), y: Math.round(lineY - hi / 2), rx: kind === "cards" ? 4 * s : hi / 2, style: "fill:var(--x-ink)" }));
    const label = el("text", { y: lineY - 110 * s, "text-anchor": "middle", style: `font:var(--x-label-weight) ${Math.max(22, 16 * s)}px var(--x-label-font);letter-spacing:${rtl ? 0 : "0.14em"};fill:var(--x-dim);` });
    const word = String(p.label || (rtl ? "قيد الانتظار" : "QUEUED")).trim();

    const D = pitch * 1.4;
    /** where item i sits along the flow at t (and whether it is through) */
    function uAt(i, t) {
      const free = -len + (t - ts[i]) * v;
      const ahead = (tt) => { let a = 0; for (let j = 0; j < i; j++) a += 1 - ML.ease(tt, dep[j], dep[j] + 0.22); return a; };
      const held = (tt, fr) => { const target = front - ahead(tt) * tight; const knee = target - D; return fr < knee ? fr : target - D * Math.exp(-(fr - knee) / D); };
      if (t < dep[i]) return { u: held(t, free), through: false, moving: free < front - ahead(t) * tight - D * 0.6 };
      const ud = held(dep[i], -len + (dep[i] - ts[i]) * v), tau = t - dep[i], acc = 0.15, vv = v * 0.8;
      const run = tau < acc ? (vv * tau * tau) / (2 * acc) : (vv * acc) / 2 + vv * (tau - acc);
      return { u: ud + run, through: true, moving: true };
    }
    const pic = p.clear && !own ? host.querySelector(".ml-pic") : null;
    ctx.sfx(at, "pop.soft", 0.35);
    dep.slice(0, 3).forEach((d, i) => d < end && ctx.sfx(d + 0.12, "blip", 0.15 + i * 0.03));

    return {
      draw(t) {
        sv.style.visibility = t < at - 0.05 ? "hidden" : "visible";
        const lv = 1 - ML.ease(t, end - 0.25, end);
        sv.style.opacity = lv.toFixed(4);
        if (pic) pic.style.opacity = (1 - ML.out(t, at - 0.1, at + 0.2) * lv).toFixed(4);
        const inO = ML.out(t, at - 0.05, at + 0.25); // a stream already in flight fades on
        base.style.strokeOpacity = (0.28 * ML.out(t, at - 0.05, at + 0.25)).toFixed(3);
        const sc = ML.back(t, at, at + 0.35, 1.6);
        og.setAttribute("transform", `translate(${ox} ${lineY}) scale(${Math.max(0, sc).toFixed(4)}) translate(${-ox} ${-lineY})`);
        let piled = 0, mMin = Infinity, mMax = -Infinity;
        items.forEach((it, i) => {
          if (t < ts[i]) { it.style.opacity = "0"; it.style.fill = "var(--x-ink)"; if (kind === "dots") it.setAttribute("cx", X(-len).toFixed(2)); else { it.setAttribute("x", X(-len).toFixed(2)); it.setAttribute("width", len.toFixed(2)); } return; }
          const { u, through, moving } = uAt(i, t);
          const past = through && u > ob + len;
          const w = past ? Math.max(hi, len * (1 - ML.clamp((u - ob) / (40 * s)) * 0.6)) : len;
          const fade = through ? 1 - ML.clamp((u - (L - 60 * s)) / (50 * s)) : 1;
          const onIn = ML.clamp((u + len) / (len * 1.5));
          it.style.opacity = (fade * onIn * inO).toFixed(3);
          it.style.fill = past ? "var(--x-accent)" : "var(--x-ink)";
          const cx = X(u + len / 2);
          // whole pixels: thin marks on fractional pixels can antialias differently between repaints
          if (kind === "dots") { it.setAttribute("cx", String(Math.round(cx))); }
          else { it.setAttribute("x", String(Math.round(cx - w / 2))); it.setAttribute("width", String(Math.max(1, Math.round(w)))); }
          if (!through && !moving && u > 0) piled++;
          if (!through && moving && u > -len) { mMin = Math.min(mMin, u); mMax = Math.max(mMax, u + len); }
        });
        // the smear behind the moving front
        if (mMax > mMin) { const a = X(Math.max(0, mMin - 30 * s)), b = X(mMax); smear.setAttribute("x", Math.min(a, b).toFixed(2)); smear.setAttribute("width", Math.abs(b - a).toFixed(2)); smear.style.opacity = "0.2"; }
        else { smear.setAttribute("x", X(0).toFixed(2)); smear.setAttribute("width", "0"); smear.style.opacity = "0"; }
        // the label over the pile, counting it
        const pileMid = front - (piled * tight) / 2;
        label.setAttribute("x", X(Math.max(60 * s, pileMid)).toFixed(2));
        label.textContent = piled > 0 ? `${word} · ${piled}` : word;
        label.style.opacity = ML.out(t, at + 0.4, at + 0.8).toFixed(3);
      },
    };
  },
});

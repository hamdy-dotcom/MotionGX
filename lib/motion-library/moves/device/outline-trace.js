// Outline trace: glowing points of light run along a device's outline and meet with a flash.
//   notch           — an open, rounded U (a phone's notch seen close): two points start at its two ends and run toward
//                     the bottom of the U (path.getPointAtLength), 0.8 s power2.inOut; behind each a stroke draws
//                     (dash offset), 1.5 px white at 70 %. Each point: a 6 px white core in a 20 px glow.
//   phone / card / browser-window — a closed rounded rect: the stroke (1 px, 60 % white) starts at top centre and draws
//                     both ways at once, the two heads meeting at bottom centre; a soft highlight travels with each
//                     head. The browser window's URL pill fades in at top centre after, and its content dims slightly.
// On meeting: a merge flash (the point grows ×2 in a glow burst) and a horizontal lens-flare line across the frame
// (width 0 → 100 % in 0.2 s, fading over 0.4 s). One dot runs the whole path from its start instead.
// `outline` picks the shape (it adds browser-window); `shape` is the same choice kept for older compositions — the
// first one set away from "notch" wins. Works over the target's box or on a device built in the picture region.
// Source: rebuilt as our own code from prompt-motion references (jazzen-chen "someone on reddit asked",
// madebyjmayala "opus 5.5 is actually") — reference only, nothing copied.
ML.define({
  id: "device.outline-trace",
  category: "device",
  name: "Light dots trace a device outline",
  does: "Glowing dots trace a device outline (notch, card, phone edge) and meet with a flash.",
  says: ["tech", "precision", "arrival"],
  energy: 3,
  targets: ["screen", "shape"],
  duration: [0.8, 2],
  params: {
    shape: { type: "choice", options: ["notch", "card", "phone"], default: "notch" },
    dots: { type: "choice", options: ["1", "2"], default: "2" },
    flare: { type: "bool", default: true },
    outline: { type: "choice", options: ["notch", "phone", "card", "browser-window"], default: "notch" },
  },
  pairs: ["device.phone-frame", "device.window-enter"],
  avoid: ["calm", "playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "prompt-motion:jazzen-chen-someone-on-reddit-asked", license: "reference", note: "also madebyjmayala-opus-5-5-is-actually; our own rebuild of the technique" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); parent.append(e); return e; };
    const px = (v) => v.toFixed(2) + "px";
    const rr = (v) => `calc(var(--x-radius) * ${(v / 30).toFixed(4)})`, dr = (v) => `calc(var(--x-device-radius) * ${(v / 74).toFixed(4)})`; // radii scale with the look's
    const lookV = (name) => parseFloat(getComputedStyle(ctx.stage).getPropertyValue(name)) || 0;
    const T = (en, ar) => (rtl ? ar : en);
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    const kind = p.outline !== "notch" ? p.outline : p.shape;
    const two = String(p.dots) !== "1";
    // the look's brightest colour (a screen's light stays light in a dark look, whose panel is dark)
    const brightest = () => {
      let best = "var(--x-panel)", top = -1;
      for (const v of ["--x-panel", "--x-ink", "--x-accent-ink"]) {
        const e = mk("i", `color:var(${v});`, ctx.scene || ctx.stage), c = getComputedStyle(e).color, a = (c.match(/[\d.]+/g) || []).map(Number);
        e.remove();
        const [r, g, b] = c.startsWith("color(") ? a.map((x) => x * 255) : a, l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (l > top) { top = l; best = `var(${v})`; }
      }
      return best;
    };
    // light on our own dark device; on a real target (often a light UI) the accent, so the trace always shows
    const WHITE = el ? "var(--x-accent)" : brightest();

    // ── what gets traced: the target's box, or a device we build ──
    let B, rad, dim = null, pill = null;
    const R = f.pic;
    if (el) {
      B = ctx.box(el);
      rad = Math.min(B.w, B.h) * 0.08;
      const r = parseFloat(getComputedStyle(el).borderTopLeftRadius); if (Number.isFinite(r) && r > 0) rad = r;
    } else if (kind === "notch") {
      // a phone seen close at its top: the dark screen with the notch cut out of its top edge
      const w = Math.min(R.w * 0.96, R.h * 1.3), h = Math.min(R.h * 0.8, w * 0.62);
      B = { x: R.x + (R.w - w) / 2, y: R.y + (R.h - h) / 2, w, h };
      const ph = mk("div", `position:absolute;left:${px(B.x)};top:${px(B.y)};width:${px(w)};height:${px(h)};border-radius:${dr(w * 0.12)} ${dr(w * 0.12)} 0 0;background:var(--x-device);box-shadow:var(--x-shadow);z-index:5;pointer-events:none;overflow:hidden;-webkit-mask-image:linear-gradient(#000 62%, transparent);mask-image:linear-gradient(#000 62%, transparent);`, host); // seen close: it dissolves downward, no cut edge
      const scr = mk("div", `position:absolute;left:${px(w * 0.035)};top:${px(w * 0.035)};right:${px(w * 0.035)};bottom:0;border-radius:${dr(w * 0.09)} ${dr(w * 0.09)} 0 0;background:linear-gradient(170deg, color-mix(in srgb, var(--x-accent) 30%, var(--x-device)), var(--x-device) 70%);`, ph);
      const bar = mk("div", `position:absolute;top:${px(w * 0.04)};left:${px(w * 0.08)};right:${px(w * 0.08)};display:flex;justify-content:space-between;color:${WHITE};font:600 ${px(w * 0.04)} var(--x-body-font);direction:ltr;`, scr);
      mk("span", "", bar, T("9:41", "٩:٤١")); mk("span", `width:${px(w * 0.07)};height:${px(w * 0.032)};border-radius:${rr(w * 0.01)};border:${px(w * 0.004)} solid currentColor;`, bar);
      for (let i = 0; i < 3; i++) mk("div", `position:absolute;left:${px(w * 0.08)};top:${px(w * (0.24 + i * 0.1))};height:${px(w * 0.045)};width:${(60 - i * 15)}%;border-radius:var(--x-radius-s);background:color-mix(in srgb, ${WHITE} ${i ? 12 : 22}%, transparent);`, scr);
      rad = 0;
    } else {
      const ratio = kind === "phone" ? 0.48 : kind === "card" ? 1.58 : 1.45;
      let w = Math.min(R.w * 0.86, R.h * 0.86 * ratio), h = w / ratio;
      if (kind === "phone") { h = Math.min(R.h * 0.92, (R.w * 0.8) / ratio); w = h * ratio; }
      B = { x: R.x + (R.w - w) / 2, y: R.y + (R.h - h) / 2, w, h };
      rad = kind === "phone" ? w * 0.16 * (lookV("--x-device-radius") / 74) : (kind === "card" ? w * 0.05 : w * 0.025) * (lookV("--x-radius") / 30);
      const box = mk("div", `position:absolute;left:${px(B.x)};top:${px(B.y)};width:${px(w)};height:${px(h)};border-radius:${px(rad)};background:${kind === "card" ? "linear-gradient(135deg, color-mix(in srgb, var(--x-accent) 40%, var(--x-device)), var(--x-device))" : "var(--x-device)"};box-shadow:var(--x-shadow);z-index:5;pointer-events:none;overflow:hidden;color:${WHITE};font-family:var(--x-body-font);`, host);
      box.dir = rtl ? "rtl" : "ltr";
      const u = w / 400;
      if (kind === "phone") {
        mk("i", `position:absolute;left:50%;top:${px(18 * u)};width:${px(110 * u)};height:${px(30 * u)};margin-left:${px(-55 * u)};border-radius:var(--x-radius-s);background:color-mix(in srgb, var(--x-ink) 60%, var(--x-device));`, box);
        for (let i = 0; i < 5; i++) mk("div", `position:absolute;inset-inline:${px(26 * u)};top:${px((110 + i * 90) * u)};height:${px(66 * u)};border-radius:${rr(18 * u)};background:color-mix(in srgb, ${WHITE} ${i === 0 ? 14 : 7}%, transparent);`, box);
      } else if (kind === "card") {
        mk("div", `position:absolute;top:${px(34 * u)};inset-inline-start:${px(30 * u)};width:${px(52 * u)};height:${px(40 * u)};border-radius:${rr(8 * u)};background:color-mix(in srgb, var(--x-accent-2) 60%, ${WHITE});opacity:.8;`, box);
        mk("div", `position:absolute;bottom:${px(70 * u)};inset-inline-start:${px(30 * u)};font:500 ${px(22 * u)} var(--x-mono-font);letter-spacing:0.12em;direction:ltr;opacity:.85;`, box, "•••• •••• •••• 4821");
        mk("div", `position:absolute;bottom:${px(30 * u)};inset-inline-start:${px(30 * u)};font:600 ${px(16 * u)} var(--x-body-font);opacity:.7;`, box, T("YOUR NAME", "اسمك"));
      } else {
        const content = mk("div", `position:absolute;inset:${px(56 * u)} ${px(22 * u)} ${px(22 * u)};display:grid;grid-template-columns:1fr 1fr 1fr;gap:${px(14 * u)};`, box);
        for (let i = 0; i < 6; i++) mk("div", `border-radius:${rr(10 * u)};background:color-mix(in srgb, ${i === 1 ? "var(--x-accent)" : WHITE} ${i === 1 ? 50 : 10}%, transparent);`, content);
        dim = mk("div", `position:absolute;inset:0;background:var(--x-device);opacity:0;`, box);
        pill = mk("div", `position:absolute;left:50%;top:${px(14 * u)};translate:-50% 0;padding:${px(6 * u)} ${px(22 * u)};border-radius:var(--x-radius-s);background:color-mix(in srgb, ${WHITE} 14%, transparent);font:500 ${px(13 * u)} var(--x-mono-font);direction:ltr;opacity:0;white-space:nowrap;`, box, "studio.app");
      }
    }

    // ── the path, in stage px; starts where the trace starts ──
    let d;
    if (kind === "notch" && !el) {
      const cx = B.x + B.w / 2, nw = B.w * 0.36, nh = B.w * 0.07, r = nh * 0.9, top = B.y + B.w * 0.035 - 1, x0 = cx - nw / 2, x1 = cx + nw / 2, s = nh * 0.5;
      // a notch: shoulders curve down into a rounded U and back up (open path, end to end)
      d = `M ${x0 - s * 2} ${top} Q ${x0} ${top} ${x0} ${top + s} L ${x0} ${top + nh - r} Q ${x0} ${top + nh} ${x0 + r} ${top + nh} L ${x1 - r} ${top + nh} Q ${x1} ${top + nh} ${x1} ${top + nh - r} L ${x1} ${top + s} Q ${x1} ${top} ${x1 + s * 2} ${top}`;
    } else if (kind === "notch") {
      const x0 = B.x, x1 = B.x + B.w, y0 = B.y, y1 = B.y + B.h, r = Math.min(B.w, B.h) * 0.3;
      d = `M ${x0} ${y0} L ${x0} ${y1 - r} Q ${x0} ${y1} ${x0 + r} ${y1} L ${x1 - r} ${y1} Q ${x1} ${y1} ${x1} ${y1 - r} L ${x1} ${y0}`;
    } else {
      const x0 = B.x, x1 = B.x + B.w, y0 = B.y, y1 = B.y + B.h, r = Math.min(rad, B.w / 2, B.h / 2), cx = B.x + B.w / 2;
      // closed, clockwise from top centre (in RTL counter-clockwise, so the leading head runs the reading way)
      const cw = `M ${cx} ${y0} L ${x1 - r} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y0 + r} L ${x1} ${y1 - r} A ${r} ${r} 0 0 1 ${x1 - r} ${y1} L ${x0 + r} ${y1} A ${r} ${r} 0 0 1 ${x0} ${y1 - r} L ${x0} ${y0 + r} A ${r} ${r} 0 0 1 ${x0 + r} ${y0} Z`;
      const ccw = `M ${cx} ${y0} L ${x0 + r} ${y0} A ${r} ${r} 0 0 0 ${x0} ${y0 + r} L ${x0} ${y1 - r} A ${r} ${r} 0 0 0 ${x0 + r} ${y1} L ${x1 - r} ${y1} A ${r} ${r} 0 0 0 ${x1} ${y1 - r} L ${x1} ${y0 + r} A ${r} ${r} 0 0 0 ${x1 - r} ${y0} Z`;
      d = rtl ? ccw : cw;
    }
    const closed = /Z$/.test(d);
    const svg = sv("svg", { width: f.W, height: f.H, viewBox: `0 0 ${f.W} ${f.H}`, style: "position:absolute;left:0;top:0;overflow:visible;z-index:8;pointer-events:none;will-change:transform;" }, host);
    const defs = sv("defs", {}, svg);
    const gid = "ml-ot-" + Math.round(ML.rnd(B.x, B.y) * 1e8);
    const grad = sv("radialGradient", { id: gid }, defs);
    sv("stop", { offset: "0", "stop-color": WHITE, "stop-opacity": "0.95" }, grad);
    sv("stop", { offset: "0.35", "stop-color": "var(--x-accent-2)", "stop-opacity": "0.55" }, grad);
    sv("stop", { offset: "1", "stop-color": "var(--x-accent-2)", "stop-opacity": "0" }, grad);
    const fgid = gid + "f";
    const fg = sv("linearGradient", { id: fgid, x1: "0", x2: "1", y1: "0", y2: "0" }, defs);
    sv("stop", { offset: "0", "stop-color": "var(--x-accent-2)", "stop-opacity": "0" }, fg);
    sv("stop", { offset: "0.5", "stop-color": WHITE, "stop-opacity": "1" }, fg);
    sv("stop", { offset: "1", "stop-color": "var(--x-accent-2)", "stop-opacity": "0" }, fg);
    if (kind === "notch" && !el) sv("path", { d: d + " Z", fill: "var(--x-device)" }, svg); // the notch itself: the bezel's dark
    const sw = (kind === "notch" ? 1.5 : 1) * Math.max(1, k * 1.6);
    const mkStroke = () => sv("path", { d, fill: "none", stroke: WHITE, "stroke-opacity": kind === "notch" ? "0.7" : "0.6", "stroke-width": sw.toFixed(2), "stroke-linecap": "round" }, svg);
    const sA = mkStroke(), sB = two ? mkStroke() : null;
    const L = sA.getTotalLength();
    // sampled once: the path's points (draw reads the table, never the DOM)
    const N = 600, pts = [];
    for (let i = 0; i <= N; i++) { const q = sA.getPointAtLength((L * i) / N); pts.push([q.x, q.y]); }
    const ptAt = (s) => { const u = ML.clamp(s / L) * N, i = Math.min(N - 1, Math.floor(u)), r = u - i; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * r, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * r]; };
    const G = 10 * k * 1.6, C = 3 * k * 1.6;
    const mkDot = () => { const g = sv("g", {}, svg); sv("circle", { r: G.toFixed(2), fill: `url(#${gid})` }, g); sv("circle", { r: C.toFixed(2), fill: WHITE }, g); return g; };
    const dA = mkDot(), dB = two ? mkDot() : null;
    // the highlight riding the head (closed shapes): a short, brighter, wider stroke segment
    const hA = closed ? sv("path", { d, fill: "none", stroke: "var(--x-accent-2)", "stroke-opacity": "0.35", "stroke-width": (sw * 4).toFixed(2), "stroke-linecap": "butt" }, svg) : null;
    const hB = closed && two ? sv("path", { d, fill: "none", stroke: "var(--x-accent-2)", "stroke-opacity": "0.35", "stroke-width": (sw * 4).toFixed(2), "stroke-linecap": "butt" }, svg) : null;
    const goal = two ? L / 2 : L;
    const meet = ptAt(goal);
    const burst = sv("circle", { cx: meet[0].toFixed(2), cy: meet[1].toFixed(2), r: (G * 2).toFixed(2), fill: `url(#${gid})`, opacity: "0" }, svg);
    const flare = p.flare ? sv("rect", { x: "0", y: (meet[1] - sw).toFixed(2), width: "0", height: (sw * 2).toFixed(2), fill: `url(#${fgid})`, opacity: "0" }, svg) : null;
    const flareGlow = p.flare ? sv("ellipse", { cx: meet[0].toFixed(2), cy: meet[1].toFixed(2), rx: "0", ry: (sw * 7).toFixed(2), fill: `url(#${gid})`, opacity: "0" }, svg) : null;

    // ── timing ──
    const dur = ML.clamp(end - at - 0.35, 0.45, 0.8), t1 = at + dur; // the flash lands inside the move's room
    ctx.sfx(at, "whoosh.soft", 0.2);
    ctx.sfx(t1, "hit", 0.45);
    const seg = L * 0.06;

    return {
      draw(t) {
        const on = t >= at;
        svg.style.visibility = on ? "visible" : "hidden";
        const s = goal * ML.ease(t, at, t1); // power2.inOut
        // A: [0, s]; B: [L - s, L]  (dash s, gap L; B shifted by s − L)
        sA.setAttribute("stroke-dasharray", `${s.toFixed(2)} ${(L + 1).toFixed(2)}`);
        sA.setAttribute("stroke-dashoffset", "0");
        if (sB) { sB.setAttribute("stroke-dasharray", `${s.toFixed(2)} ${(L + 1).toFixed(2)}`); sB.setAttribute("stroke-dashoffset", (s - L).toFixed(2)); }
        if (t >= t1) { sA.setAttribute("stroke-dasharray", "none"); if (sB) sB.style.display = "none"; } // traced: one whole stroke
        else if (sB) sB.style.display = "";
        const glowHead = (h, from) => { if (!h) return; const a = Math.max(0, from - seg); h.setAttribute("stroke-dasharray", `0 ${a.toFixed(2)} ${(from - a).toFixed(2)} ${(L * 2).toFixed(2)}`); h.style.opacity = (1 - ML.lin(t, t1, t1 + 0.3)).toFixed(3); };
        glowHead(hA, s);
        if (hB) { const a = Math.max(0, s - seg); hB.setAttribute("stroke-dasharray", `0 ${(L - s).toFixed(2)} ${(s - a).toFixed(2)} ${(L * 2).toFixed(2)}`); hB.style.opacity = (1 - ML.lin(t, t1, t1 + 0.3)).toFixed(3); }
        const fadeDots = 1 - ML.lin(t, t1, t1 + 0.15);
        const qa = ptAt(s);
        dA.setAttribute("transform", `translate(${qa[0].toFixed(2)} ${qa[1].toFixed(2)})`);
        dA.style.opacity = (Math.min(1, ML.lin(t, at, at + 0.06)) * fadeDots).toFixed(4);
        if (dB) { const qb = ptAt(L - s); dB.setAttribute("transform", `translate(${qb[0].toFixed(2)} ${qb[1].toFixed(2)})`); dB.style.opacity = dA.style.opacity; }
        // the meeting: a merge flash, a lens-flare line across the frame
        const fl = t >= t1 ? 1 : 0;
        const b = ML.out(t, t1, t1 + 0.2);
        burst.setAttribute("opacity", (fl * (1 - ML.lin(t, t1 + 0.05, t1 + 0.45))).toFixed(4));
        burst.setAttribute("r", (G * (1 + b)).toFixed(2));
        if (flare) {
          const w = 2 * Math.max(meet[0], f.W - meet[0]) * b, x = meet[0] - w / 2, o = fl * (1 - ML.lin(t, t1 + 0.2, t1 + 0.6));
          flare.setAttribute("x", x.toFixed(2)); flare.setAttribute("width", w.toFixed(2)); flare.setAttribute("opacity", o.toFixed(4));
          flareGlow.setAttribute("rx", (w * 0.35).toFixed(2)); flareGlow.setAttribute("opacity", (o * 0.5).toFixed(4));
        }
        if (pill) pill.style.opacity = ML.ease(t, t1 + 0.1, t1 + 0.4).toFixed(4);
        for (const e of [hA, hB, flare, flareGlow, burst, dA, dB]) if (e) { const o = parseFloat(e.style.opacity || e.getAttribute("opacity") || "1"); e.style.display = o <= 0.001 ? "none" : ""; }
        if (dim) dim.style.opacity = (0.22 * ML.ease(t, t1 + 0.1, t1 + 0.4)).toFixed(4);
      },
    };
  },
});

// Dashboard emerges from a glowing tile in 3D tilt: a deep card (radius 14, perspective 1400, rotateY −12° rotateX 6°)
// starts as a blurred blob — blur 30 px, scale 0.7, a warm radial glow inside — and sharpens to blur 0, scale 1 in
// 0.6 s power3.out. Then its content cascades in: the headline number writes on (counts up), chips, axis labels, the
// chart line draws itself and its area fills, the KPI row fades in staggered 0.05 s. The card's ink is the look's,
// inverted (ink as ground, ground as ink), its glow and line the look's accents; tilted, it is only ever scaled ≤ 1.
// Source: prompt-motion "daniel-haida-claude-code-opus-5-5" (reference only: rebuilt as our own code).
ML.define({
  id: "device.dashboard-emerge-3d",
  category: "device",
  name: "Dashboard emerges from a glowing tile in 3D tilt",
  does: "A blurred glowing tile sharpens into a full dashboard panel tilted in perspective; the headline number writes on and the chart draws.",
  says: ["proof", "tech", "result", "money"],
  energy: 3,
  targets: ["screen", "card", "chart"],
  duration: [2.2, 5],
  params: {
    tilt_y: { type: "number", range: [-20, 0], default: -12, unit: "deg" },
    tilt_x: { type: "number", range: [0, 12], default: 6, unit: "deg" },
    start_blur: { type: "number", range: [10, 40], default: 30, unit: "px" },
    start_scale: { type: "number", range: [0.5, 0.9], default: 0.7 },
    glow: { type: "bool", default: true },
    stagger: { type: "number", range: [0.03, 0.1], default: 0.05, unit: "s" },
    value: { type: "number", range: [0, 1000000000], default: 128450 }, // the headline number; the axis scales to it
    prefix: { type: "text", default: "" }, // a currency sign before it, if any
  },
  pairs: ["data.count-up", "camera.push-in"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:daniel-haida-claude-code-opus-5-5", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { p, at, end, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, text, parent) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (parent) parent.append(e); return e; };
    const given = ctx.el && ctx.el.tagName !== "IMG" ? ctx.el : null;
    const room = given ? ctx.box(given) : { x: ctx.f.pic.x, y: ctx.f.pic.y, w: ctx.f.pic.w, h: ctx.f.pic.h };
    const host = mk("div", `position:absolute;left:${room.x}px;top:${room.y}px;width:${room.w}px;height:${room.h}px;z-index:4;display:flex;align-items:center;justify-content:center;background:var(--x-ground)`, null, ctx.scene || ctx.stage);
    if (given) given.style.visibility = "hidden";
    const tall = room.h > room.w * 1.05;
    let PW = tall ? room.w * 0.94 : Math.min(room.w * 0.82, room.h * 0.94 * 1.5), PH = tall ? Math.min(room.h * 0.9, PW * 1.2) : PW / 1.5;
    PW = Math.round(PW); PH = Math.round(PH);
    const k = PW / 900; // the card is designed 900 wide (radius 14, perspective 1400 at that size)
    host.style.perspective = Math.round(1400 * k * 1.4) + "px";
    const fs = PW / (tall ? 26 : 34);
    const ink = "var(--x-ground)", dim = "color-mix(in srgb, var(--x-ground) 58%, transparent)", rule = "color-mix(in srgb, var(--x-ground) 12%, transparent)";
    const panel = mk("div", `position:relative;width:${PW}px;height:${PH}px;box-sizing:border-box;border-radius:${Math.round(14 * k * 1.3)}px;overflow:hidden;` +
      `background:linear-gradient(180deg, color-mix(in srgb, var(--x-ink) 84%, var(--x-accent) 16%), color-mix(in srgb, var(--x-ink) 92%, var(--x-accent) 8%));background-size:100% 101%;color:${ink};font-family:var(--x-body-font);font-size:${fs.toFixed(2)}px;` +
      `box-shadow:0 ${Math.round(40 * k)}px ${Math.round(90 * k)}px -${Math.round(30 * k)}px color-mix(in srgb, var(--x-ink) 55%, transparent), inset 0 1px 0 color-mix(in srgb, var(--x-ground) 14%, transparent);direction:${rtl ? "rtl" : "ltr"}`, null, host);
    const glow = mk("div", "position:absolute;inset:-10%;pointer-events:none;background:radial-gradient(closest-side at 50% 50%, color-mix(in srgb, var(--x-accent-2) 85%, transparent), color-mix(in srgb, var(--x-accent) 35%, transparent) 55%, transparent)", null, panel);
    const body = mk("div", `position:absolute;inset:0;padding:1.3em 1.5em;display:flex;flex-direction:column;gap:${tall ? 0.9 : 0.7}em`, null, panel);
    const T = rtl
      ? { kick: "الإيراد · آخر ٣٠ يوم", chip: ["+18.4%", "٣٠ يوم"], months: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو"], kpis: [["عملاء جدد", "2,310"], ["متوسط الطلب", "86"], ["الاحتفاظ", "92%"], ["الاسترداد", "0.8%"]] }
      : { kick: "Revenue · last 30 days", chip: ["+18.4%", "30D"], months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], kpis: [["New customers", "2,310"], ["Avg. order", "86"], ["Retention", "92%"], ["Refunds", "0.8%"]] };
    const items = []; // the cascade, in order: [el, kind]
    const head = mk("div", "display:flex;align-items:center;gap:0.6em;flex-wrap:wrap", null, body);
    const kick = mk("div", `font:var(--x-label-weight) 0.72em var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:${rtl ? "none" : "var(--x-label-case)"};color:${dim};margin-inline-end:auto`, T.kick, head);
    items.push(kick);
    T.chip.forEach((c, i) => { const ch = mk("span", `font:600 0.72em var(--x-mono-font);padding:0.3em 0.7em;border-radius:var(--x-radius-s);${i === 0 ? "color:var(--x-good);background:color-mix(in srgb, var(--x-good) 18%, transparent)" : `color:${dim};border:1px solid ${rule}`}`, c, head); ch.dir = "ltr"; items.push(ch); });
    const num = mk("div", "font:900 3.2em/1 var(--x-head-font);letter-spacing:var(--x-hero-track);font-variant-numeric:tabular-nums;unicode-bidi:isolate", "", body);
    num.dir = "ltr"; num.style.textAlign = rtl ? "right" : "left";
    items.push(num);
    // the chart: grid, axis labels, a rising line and its area
    const chartBox = mk("div", "position:relative;flex:1;min-height:0", null, body);
    // the KPI row, first: what's left of the card (at the number's full height) is the chart's
    const fmt = (v) => p.prefix + Math.round(v).toLocaleString("en-US");
    const kpiRow = mk("div", `display:grid;grid-template-columns:repeat(${tall ? 2 : 4}, 1fr);gap:0.6em`, null, body);
    const kpis = T.kpis.map(([l, v]) => { const c = mk("div", `padding:0.6em 0.8em;border-radius:${Math.round(10 * k)}px;background:color-mix(in srgb, var(--x-ground) 7%, transparent);border:1px solid ${rule}`, null, kpiRow); mk("div", `font-size:0.66em;color:${dim};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`, l, c); const vv = mk("div", "font:700 1.25em var(--x-head-font);font-variant-numeric:tabular-nums", v, c); vv.dir = "ltr"; vv.style.textAlign = rtl ? "right" : "left"; return c; });
    num.textContent = fmt(p.value);
    const CW = PW - fs * 3, CH = Math.max(fs * 4, chartBox.clientHeight);
    const svg = sv("svg", { width: CW, height: CH, viewBox: `0 0 ${CW} ${CH}` }, chartBox);
    svg.style.cssText = "position:absolute;inset:0;overflow:visible;direction:ltr";
    const padL = fs * 2.6, padB = fs * 1.5, gw = CW - padL, gh = CH - padB - fs * 0.4;
    const axis = [];
    // round ticks that reach past the value (it sits near the top of the chart)
    const stepOf = (v) => { const m = Math.pow(10, Math.floor(Math.log10(Math.max(v, 1)))), r = v / m; return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10) * m; };
    const tickStep = stepOf((p.value / 0.86) / 3);
    const tick = (i) => { const v = i * tickStep; return v >= 1e6 ? `${+(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${+(v / 1e3).toFixed(1)}k` : String(v); };
    for (let i = 0; i <= 3; i++) {
      const y = fs * 0.4 + gh * (1 - i / 3);
      axis.push(sv("line", { x1: padL, x2: CW, y1: y, y2: y, stroke: "currentColor", "stroke-opacity": 0.12, "stroke-width": 1 }, svg));
      const tx = sv("text", { x: padL - fs * 0.5, y: y + fs * 0.25, "text-anchor": "end", "font-size": fs * 0.62, fill: "currentColor", "fill-opacity": 0.55, "font-family": "var(--x-mono-font)" }, svg);
      tx.textContent = tick(i); axis.push(tx);
    }
    T.months.forEach((m, i) => { const tx = sv("text", { x: padL + (gw * (i + 0.5)) / T.months.length, y: CH - fs * 0.3, "text-anchor": "middle", "font-size": fs * 0.62, fill: "currentColor", "fill-opacity": 0.55, "font-family": "var(--x-body-font)" }, svg); tx.textContent = m; axis.push(tx); });
    const N = 14, pts = [];
    for (let i = 0; i < N; i++) { const v = 0.18 + 0.68 * (i / (N - 1)) + (ML.rnd(i, 21) - 0.5) * 0.16; pts.push([padL + (gw * i) / (N - 1), fs * 0.4 + gh * (1 - ML.clamp(v, 0.05, 0.95))]); }
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < N; i++) { // Catmull-Rom tangents: one smooth line, not a staircase of flat steps
      const a = pts[Math.max(0, i - 2)], b = pts[i - 1], c = pts[i], e = pts[Math.min(N - 1, i + 1)];
      d += ` C${(b[0] + (c[0] - a[0]) / 6).toFixed(1)},${(b[1] + (c[1] - a[1]) / 6).toFixed(1)} ${(c[0] - (e[0] - b[0]) / 6).toFixed(1)},${(c[1] - (e[1] - b[1]) / 6).toFixed(1)} ${c[0].toFixed(1)},${c[1].toFixed(1)}`;
    }
    const gid = "dg" + Math.round(ML.rnd(PW, PH) * 1e6);
    const defs = sv("defs", {}, svg), lg = sv("linearGradient", { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    sv("stop", { offset: 0, "stop-color": "var(--x-accent-2)", "stop-opacity": 0.42 }, lg); sv("stop", { offset: 1, "stop-color": "var(--x-accent-2)", "stop-opacity": 0 }, lg);
    const area = sv("path", { d: `${d} L${CW},${fs * 0.4 + gh} L${padL},${fs * 0.4 + gh} Z`, fill: `url(#${gid})`, opacity: 0 }, svg);
    const line = sv("path", { d, fill: "none", stroke: "var(--x-accent-2)", "stroke-width": Math.max(2, fs * 0.16), "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": 1, "stroke-dashoffset": 1 }, svg);
    const dot = sv("circle", { cx: pts[N - 1][0], cy: pts[N - 1][1], r: fs * 0.3, fill: "var(--x-accent-2)", opacity: 0 }, svg);
    const ringC = sv("circle", { cx: pts[N - 1][0], cy: pts[N - 1][1], r: fs * 0.3, fill: "none", stroke: "var(--x-accent-2)", "stroke-width": 2, opacity: 0 }, svg);
    const p3 = (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), 4); // power3.out
    const c0 = at + 0.55;
    const lineA = c0 + 0.3, lineB = lineA + 0.75;
    const kpiA = lineA + 0.35;
    ctx.sfx(at, "swell", 0.4);
    ctx.sfx(c0 + 0.1, "tap", 0.3);
    ctx.sfx(kpiA, "pop.soft", 0.25);
    const leave = Math.max(kpiA + 0.6, end - 0.3);
    return {
      draw(t) {
        // the tile: a glowing blur that sharpens and grows into the tilted card
        const u = p3(t, at, at + 0.6), gone = ML.ease(t, leave, leave + 0.25);
        const sc = p.start_scale + (1 - p.start_scale) * u, bl = (1 - u) * p.start_blur;
        panel.style.transform = `rotateY(${(p.tilt_y * (rtl ? -1 : 1)).toFixed(2)}deg) rotateX(${p.tilt_x.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
        // a tilted card is rastered as one piece: repaint it whole every frame so a frame never depends on the one before
        panel.style.backgroundPosition = `0 ${(ML.rnd(Math.round(t * 1000), 3) * 0.01).toFixed(4)}%`;
        panel.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : "none";
        host.style.visibility = t < at ? "hidden" : "visible"; // its ground only covers the room from the moment it arrives
        host.style.opacity = (ML.clamp((t - at) / 0.2) * (1 - gone)).toFixed(4);
        glow.style.opacity = p.glow ? ((1 - ML.ease(t, at + 0.35, at + 0.95)) * 0.95).toFixed(4) : "0";
        // the cascade
        const reveal = (el, a) => { const v = ML.expo(t, a, a + 0.4); el.style.opacity = ML.clamp(v * 1.4).toFixed(4); el.style.translate = `0 ${((1 - v) * fs * 0.5).toFixed(2)}px`; };
        items.forEach((el, i) => reveal(el, c0 + i * p.stagger));
        num.textContent = fmt(p.value * ML.out(t, c0 + 0.1, c0 + 1.0));
        axis.forEach((el, i) => el.setAttribute("opacity", ML.ease(t, c0 + 0.15 + i * p.stagger * 0.4, c0 + 0.45 + i * p.stagger * 0.4).toFixed(4)));
        line.setAttribute("stroke-dashoffset", (1 - ML.ease(t, lineA, lineB)).toFixed(4));
        area.setAttribute("opacity", ML.ease(t, lineB - 0.2, lineB + 0.3).toFixed(4));
        const dv = ML.out(t, lineB, lineB + 0.25);
        dot.setAttribute("opacity", dv.toFixed(4));
        const rp = ((t - lineB) % 1.2) / 1.2;
        ringC.setAttribute("r", (fs * 0.3 + fs * 0.9 * rp).toFixed(2));
        ringC.setAttribute("opacity", t > lineB ? ((1 - rp) * 0.7).toFixed(4) : "0");
        kpis.forEach((el, i) => reveal(el, kpiA + i * p.stagger));
      },
    };
  },
});

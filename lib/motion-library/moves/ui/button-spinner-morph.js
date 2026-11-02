// Button morphs to spinner, then check: a cursor tip glides onto an ink pill and presses it (0.96 for 0.08 s); the label
// blurs (or fades) away, the pill's width closes onto its height — a circle — on a spring (stiffness 300, damping 26) or
// 0.35 s power3.inOut; a 270° arc spins one turn per `spinner_turn` while its length breathes 90° ↔ 270°, completes to a
// full ring and sweeps into a check (or a cross) drawn with stroke-dashoffset in 0.25 s power2.out, with a 1 → 1.1 → 1 pop.
// Sources: prompt-motion demonugc / twoclipping "opus 5.5 is f-cking" (reference only — our own rebuild).
ML.define({
  id: "ui.button-spinner-morph",
  category: "ui",
  name: "Button morphs to spinner, then check",
  does: "A pill button is clicked, its label blurs away, it shrinks into a circle with a spinning arc, and the arc resolves into a check mark.",
  says: ["step", "result", "relief", "tech"],
  energy: 2,
  targets: ["card", "shape", "cursor"],
  duration: [1.2, 2.5],
  params: {
    end: { type: "choice", options: ["check", "cross"], default: "check" },
    spring: { type: "bool", default: true },
    spinner_turn: { type: "number", range: [0.5, 1], default: 0.7, unit: "s" },
    label_out: { type: "choice", options: ["fade", "blur"], default: "blur" },
    cursor: { type: "bool", default: true },
    label: { type: "text" },
  },
  pairs: ["ui.button-loading-keep-width", "ui.container-morph"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "success",
  source: { from: "prompt-motion:demonugc-opus-5-5-is-f-cking", license: "reference", note: "also twoclipping-opus-5-5-is-f-cking; our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const svg = (w, h, parent, css = "") => { const s = doc.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 100 100"); s.setAttribute("width", w); s.setAttribute("height", h); s.style.cssText = css; parent.append(s); return s; };
    const path = (s, d, attrs) => { const e = doc.createElementNS(NS, "path"); e.setAttribute("d", d); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); s.append(e); return e; };
    const own = !ctx.el || ctx.el === ctx.stage;
    const host = own ? ctx.scene || ctx.stage : ctx.el;
    if (!own && getComputedStyle(host).position === "static") host.style.position = "relative";
    const R = own ? f.pic : { x: 0, y: 0, w: host.clientWidth, h: host.clientHeight };
    const k = Math.min(f.W, f.H) / 1080;
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;`, host);

    // the pill (180 × 56, r 28 in the reference, ×2.2 on a 1080 stage), its label measured to size the width
    const H = Math.min(124 * k, R.h * 0.3);
    const label = p.label || (rtl ? "ادفع الآن" : "Pay now");
    const pill = mk("div", `position:absolute;left:50%;top:50%;height:${H.toFixed(1)}px;border-radius:${(H / 2).toFixed(1)}px;background:var(--x-ink);box-shadow:0 ${(10 * k).toFixed(1)}px ${(30 * k).toFixed(1)}px color-mix(in srgb, var(--x-ink) 18%, transparent);overflow:hidden;`, layer);
    const lab = mk("div", `position:absolute;inset:0;display:grid;place-items:center;white-space:nowrap;color:var(--x-panel);font:600 ${(H * 0.34).toFixed(1)}px var(--x-body-font);`, pill, label);
    const meas = mk("span", `position:absolute;visibility:hidden;white-space:nowrap;font:600 ${(H * 0.34).toFixed(1)}px var(--x-body-font);`, layer, label);
    const W0 = Math.min(R.w * 0.9, Math.max(H * 3.2, meas.offsetWidth + H * 1.4));
    meas.remove();

    // spinner (arc on a pathLength-360 circle) and the end mark
    const S = H * 0.56;
    const spinWrap = mk("div", `position:absolute;left:50%;top:50%;width:${S}px;height:${S}px;margin:${-S / 2}px 0 0 ${-S / 2}px;`, pill);
    const sp = svg(S, S, spinWrap, "display:block;overflow:visible");
    const arc = doc.createElementNS(NS, "circle");
    for (const [a, v] of Object.entries({ cx: 50, cy: 50, r: 42, fill: "none", stroke: "currentColor", "stroke-width": 9, "stroke-linecap": "round", pathLength: 360 })) arc.setAttribute(a, v);
    sp.append(arc); spinWrap.style.color = "var(--x-panel)";
    const markWrap = mk("div", `position:absolute;left:50%;top:50%;width:${S}px;height:${S}px;margin:${-S / 2}px 0 0 ${-S / 2}px;color:var(--x-panel);`, pill);
    const mk2 = svg(S, S, markWrap, "display:block;overflow:visible");
    const strokeA = { fill: "none", stroke: "currentColor", "stroke-width": 11, "stroke-linecap": "round", "stroke-linejoin": "round", pathLength: 1, "stroke-dasharray": 1, "stroke-dashoffset": 1 };
    const marks = p.end === "cross" ? [path(mk2, "M28 28 L72 72", strokeA), path(mk2, "M72 28 L28 72", strokeA)] : [path(mk2, "M22 52 L42 72 L78 30", strokeA)];

    // cursor (a pointer tip in the look's pointer colours)
    const C = 64 * k;
    const cur = mk("div", `position:absolute;left:0;top:0;width:${C}px;height:${C}px;`, layer);
    const cs = svg(C, C, cur, "display:block;overflow:visible");
    path(cs, "M18 8 L18 86 L38 68 L52 96 L64 90 L50 62 L78 62 Z", { fill: "var(--x-pointer)", stroke: "var(--x-pointer-edge)", "stroke-width": 6, "stroke-linejoin": "round" });
    if (!p.cursor) cur.style.display = "none";

    // timing
    const tA = at, tP = tA + 0.42, tL = tP + 0.04, tM = tP + 0.14;
    const morphDur = 0.35, tS = tM + 0.22;
    const room = end - 0.45 - tS - 0.15 - 0.25;
    const spinDur = ML.clamp(room, 0.5, 1);
    const tC = tS + spinDur, tK = tC + 0.15; // ring completes, then the mark draws
    const cx = R.w / 2, cy = R.h / 2;
    const c0 = { x: cx + (rtl ? -1 : 1) * R.w * 0.36, y: cy + R.h * 0.32 }, c1 = { x: cx + (rtl ? -0.1 : 0.1) * W0, y: cy + H * 0.12 };
    const quart = (t, a, b) => { const x = ML.lin(t, a, b); return x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2; };
    const p2out = (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), 2);
    ctx.sfx(tP, "click", 0.4);
    ctx.sfx(tK, p.end === "cross" ? "pop" : "success", 0.45);

    return {
      draw(t) {
        const appear = ML.show(layer, t, tA - 0.05, end - 0.3);
        if (!appear && t < tA) return;
        // cursor in (power2.inOut 0.4 s), presses, then drifts off and fades
        const ci = ML.ease(t, tA, tA + 0.4), co = ML.ease(t, tM + 0.1, tM + 0.5);
        const x = c0.x + (c1.x - c0.x) * ci + (rtl ? -1 : 1) * co * R.w * 0.12, y = c0.y + (c1.y - c0.y) * ci + co * R.h * 0.1;
        const press = ML.lin(t, tP, tP + 0.08) * (1 - ML.lin(t, tP + 0.08, tP + 0.2));
        cur.style.transform = `translate(${(x - C * 0.18).toFixed(2)}px, ${(y - C * 0.08).toFixed(2)}px) scale(${(1 - 0.12 * press).toFixed(4)})`;
        cur.style.opacity = (Math.min(1, ML.lin(t, tA, tA + 0.12)) * (1 - co)).toFixed(4);
        // width closes onto height
        const m = p.spring ? ML.step(t - tM, { stiffness: 300, damping: 26 }) : quart(t, tM, tM + morphDur);
        const w = W0 + (H - W0) * m;
        const pop = t < tK ? 0 : Math.sin(Math.PI * ML.lin(t, tK, tK + 0.3)) * 0.1;
        pill.style.width = w.toFixed(2) + "px";
        pill.style.marginLeft = (-w / 2).toFixed(2) + "px";
        pill.style.marginTop = (-H / 2).toFixed(2) + "px";
        pill.style.scale = ((1 - 0.04 * press) * (1 + pop)).toFixed(4);
        // label leaves
        const lo = ML.lin(t, tL, tL + 0.14);
        lab.style.opacity = (1 - lo).toFixed(4);
        lab.style.filter = p.label_out === "blur" && lo > 0 && lo < 1 ? `blur(${(lo * 10 * k).toFixed(2)}px)` : "none";
        // spinner: rotates, breathes, completes to a full ring, gives way to the mark
        const sIn = ML.lin(t, tS, tS + 0.12), sOut = ML.lin(t, tK, tK + 0.12);
        spinWrap.style.opacity = (sIn * (1 - sOut)).toFixed(4);
        const run = Math.max(0, t - tS);
        const breathe = 180 - 90 * Math.cos((run / (p.spinner_turn * 1.4)) * Math.PI * 2);
        const full = ML.ease(t, tC, tK);
        const len = breathe + (360 - breathe) * full;
        arc.setAttribute("stroke-dasharray", `${len.toFixed(2)} 360`);
        spinWrap.style.transform = `rotate(${(((run / p.spinner_turn) * 360) % 360 - 90).toFixed(2)}deg)`;
        markWrap.style.opacity = t >= tK ? "1" : "0";
        marks.forEach((e, i) => e.setAttribute("stroke-dashoffset", (1 - p2out(t, tK + i * 0.08, tK + i * 0.08 + 0.25)).toFixed(4)));
      },
    };
  },
});

// Handwrite on: a script / hand / italic word writes itself on in the writing direction. Methods:
//   clip — each line is revealed from its start side by a feathered mask edge at ~rate chars/s (lines in turn); the
//          default, and what Arabic always uses (the joined line is never split, just uncovered right → left);
//   per-letter-clip — Latin letters uncovered strictly one after another (1/rate s each), each fading in over 0.05 s
//          with a slight seeded baseline jitter;
//   stroke-path — each word is drawn as an SVG outline (stroke-dashoffset length → 0, power1.inOut) and then filled.
// A small accent pen dot can lead the tip. Finished by an underline drawn with stroke-dashoffset — a swish, a wobbly
// hand-drawn line, or a loose circle round the text — after `underline_delay`; optional dim to 0.6 at the end.
// Faces: var(--x-script-font) / var(--x-hand-font) / var(--x-serif-font) when a look sets them, else the head font.
// Source: prompt-motion handwrite family (sarut0bisasuke, ajith-io, m1n9-k7, ndhabarde11) — our own rebuild.
ML.define({
  id: "text-in.handwrite",
  category: "text-in",
  name: "Handwrite on",
  does: "A script or italic word writes itself on in the writing direction as if by hand, often finished with a hand-drawn underline swish.",
  says: ["story", "calm", "playful", "luxury", "focus"],
  energy: 2,
  targets: ["headline", "word", "line", "label"],
  duration: [0.5, 3],
  params: {
    method: { type: "choice", options: ["stroke-path", "clip", "per-letter-clip"], default: "clip" },
    rate: { type: "number", range: [6, 20], default: 14, unit: "chars/s" },
    duration: { type: "number", range: [0.3, 2], default: 0.6, unit: "s" },
    feather: { type: "number", range: [0, 30], default: 20, unit: "px" },
    pen_dot: { type: "bool", default: false },
    underline: { type: "choice", options: ["none", "swish", "wobbly", "circle"], default: "wobbly" },
    underline_delay: { type: "number", range: [0.1, 0.4], default: 0.2, unit: "s" },
    font: { type: "choice", options: ["script", "hand", "italic-serif"], default: "script" },
    dim_after: { type: "bool", default: false },
  },
  pairs: ["text-emphasis.circle", "text-in.fade-up"],
  avoid: ["urgency", "tech"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:sarut0bisasuke-opus-5-5-is-cracked", license: "reference", note: "our own rebuild of the handwrite family" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const SVG = "http://www.w3.org/2000/svg";
    const arabic = ML.ARABIC.test(el.textContent || "");
    // the face
    el.style.fontFamily = p.font === "hand" ? "var(--x-hand-font, var(--x-head-font))" : p.font === "italic-serif" ? "var(--x-serif-font, var(--x-head-font))" : "var(--x-script-font, var(--x-head-font))";
    if (!arabic && p.font !== "hand") el.style.fontStyle = "italic";
    el.style.position = "relative";
    const method = arabic && p.method === "per-letter-clip" ? "clip" : p.method;
    const words = ML.split(el, method === "per-letter-clip" ? "chars" : "words");
    const wordSpans = method === "per-letter-clip" ? [...el.querySelectorAll(".ml-w")] : words;
    const eb = ctx.box(el), fs = parseFloat(getComputedStyle(el).fontSize);
    const rel = (n) => { const b = ctx.box(n); return { x: b.x - eb.x, y: b.y - eb.y, w: b.w, h: b.h }; };
    // lines (by row), each with its word boxes, in reading order
    const rows = [];
    for (const w of wordSpans) { const b = rel(w); const r = rows.find((x) => Math.abs(x.y - b.y) < 4); if (r) { r.ws.push({ w, b }); } else rows.push({ y: b.y, ws: [{ w, b }] }); }
    rows.sort((a, b) => a.y - b.y);
    for (const r of rows) { r.x0 = Math.min(...r.ws.map((x) => x.b.x)); r.x1 = Math.max(...r.ws.map((x) => x.b.x + x.b.w)); r.h = Math.max(...r.ws.map((x) => x.b.h)); r.chars = r.ws.reduce((a, x) => a + Array.from(x.w.textContent).length, 0) + r.ws.length - 1; }
    const total = rows.reduce((a, r) => a + r.chars, 0);
    const T = Math.max(p.duration, total / p.rate);
    let acc = 0;
    for (const r of rows) { r.a = at + (acc / total) * T; acc += r.chars; r.b = at + (acc / total) * T; }
    const writeEnd = at + T;
    const pw = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2); // power1.inOut-ish
    // the pen front of a row at t, in el px (start side → end side)
    const front = (r, t) => { const u = ML.lin(t, r.a, r.b), w = r.x1 - r.x0; return rtl ? r.x1 - u * (w + p.feather) : r.x0 + u * (w + p.feather); };
    // per-letter timing
    const letters = method === "per-letter-clip" ? words : [];
    const lt = letters.map((_, i) => at + (i / Math.max(1, letters.length)) * T);
    const jitter = letters.map((_, i) => (ML.rnd(i, 21) * 2 - 1) * 0.03);
    // stroke-path: an SVG outline per word
    const strokes = [];
    if (method === "stroke-path") {
      const svg = document.createElementNS(SVG, "svg");
      Object.assign(svg.style, { position: "absolute", left: "0", top: "0", width: eb.w + "px", height: eb.h + "px", overflow: "visible", pointerEvents: "none" });
      svg.setAttribute("viewBox", `0 0 ${eb.w} ${eb.h}`);
      el.append(svg);
      let k = 0;
      for (const r of rows) for (const { w, b } of r.ws) {
        const cs = getComputedStyle(w), tx = document.createElementNS(SVG, "text");
        tx.textContent = w.textContent;
        tx.setAttribute("x", rtl ? b.x + b.w : b.x); tx.setAttribute("y", b.y + b.h * 0.78);
        tx.setAttribute("text-anchor", rtl ? "end" : "start");
        tx.setAttribute("direction", rtl ? "rtl" : "ltr");
        Object.assign(tx.style, { font: `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, letterSpacing: cs.letterSpacing, fill: "currentColor", stroke: "currentColor", strokeWidth: Math.max(1, fs * 0.012) + "px" });
        svg.append(tx);
        const len = Array.from(w.textContent).length * fs * 3.2;
        tx.style.strokeDasharray = `${len} ${len}`;
        const share = (Array.from(w.textContent).length + 1) / (total + 1);
        const a = at + (k / (total + 1)) * T; k += Array.from(w.textContent).length + 1;
        strokes.push({ tx, w, len, a, b: a + share * T });
      }
    }
    // pen dot
    let dot = null;
    if (p.pen_dot) { dot = document.createElement("i"); const d = Math.max(6, fs * 0.09); Object.assign(dot.style, { position: "absolute", width: d + "px", height: d + "px", marginLeft: -d / 2 + "px", marginTop: -d / 2 + "px", borderRadius: "50%", background: "var(--x-accent)", pointerEvents: "none" }); el.append(dot); }
    // underline / circle
    let ul = null, ulLen = 0;
    const ulAt = writeEnd + p.underline_delay, ulDur = p.underline === "circle" ? 0.4 : 0.32;
    if (p.underline !== "none" && rows.length) {
      const last = rows[rows.length - 1], sw = Math.max(2, fs * 0.045);
      const svg = document.createElementNS(SVG, "svg");
      Object.assign(svg.style, { position: "absolute", left: "0", top: "0", width: eb.w + "px", height: eb.h + "px", overflow: "visible", pointerEvents: "none" });
      svg.setAttribute("viewBox", `0 0 ${eb.w} ${eb.h}`);
      const path = document.createElementNS(SVG, "path");
      let d;
      const xa = rtl ? last.x1 : last.x0, xb = rtl ? last.x0 : last.x1, y = last.y + last.h * 0.98, L = xb - xa;
      if (p.underline === "circle") {
        const cx = eb.w / 2, cy = eb.h / 2, rx = eb.w / 2 + fs * 0.25, ry = eb.h / 2 + fs * 0.15;
        const pts = [];
        for (let i = 0; i <= 40; i++) { const a = -Math.PI * 0.6 + (i / 40) * Math.PI * 2.15, k = 1 + (ML.rnd(i, 41) - 0.5) * 0.04; pts.push(`${(cx + Math.cos(a) * rx * k).toFixed(1)} ${(cy + Math.sin(a) * ry * k).toFixed(1)}`); }
        d = "M" + pts.join(" L");
      } else if (p.underline === "swish") {
        d = `M${xa.toFixed(1)} ${(y + fs * 0.06).toFixed(1)} Q${(xa + L * 0.55).toFixed(1)} ${(y - fs * 0.06).toFixed(1)} ${(xb + L * 0.06).toFixed(1)} ${(y - fs * 0.14).toFixed(1)}`;
      } else {
        const pts = [];
        for (let i = 0; i <= 12; i++) pts.push(`${(xa + (L * i) / 12).toFixed(1)} ${(y + Math.sin(i * 1.3) * fs * 0.025 + (ML.rnd(i, 77) - 0.5) * fs * 0.03 + (i / 12) * fs * 0.03).toFixed(1)}`);
        d = "M" + pts.join(" L");
      }
      path.setAttribute("d", d);
      Object.assign(path.style, { fill: "none", stroke: "var(--x-accent)", strokeWidth: sw + "px", strokeLinecap: "round", strokeLinejoin: "round" });
      svg.append(path); el.append(svg);
      ulLen = path.getTotalLength();
      path.style.strokeDasharray = `${ulLen} ${ulLen}`;
      ul = path;
      ctx.sfx(ulAt, "whoosh.soft", 0.2);
    }
    ctx.sfx(at, "swell", 0.2);
    const maskOf = (fx, bx, bw) => {
      // a word's mask: the pen front in its own px, feathered (start side solid)
      const local = rtl ? bx + bw - fx : fx - bx, f = Math.max(0.5, p.feather);
      const side = rtl ? "to left" : "to right";
      return `linear-gradient(${side}, #000 ${(local - f).toFixed(1)}px, transparent ${local.toFixed(1)}px)`;
    };
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        const dim = p.dim_after ? 1 - 0.4 * ML.ease(t, end - 0.9, end - 0.5) : 1;
        el.style.opacity = ((1 - leave) * dim).toFixed(4);
        let tip = null;
        if (method === "clip") {
          for (const r of rows) {
            const fx = front(r, t);
            for (const { w, b } of r.ws) { const m = t >= r.b + 0.05 ? "none" : maskOf(fx, b.x, b.w); w.style.maskImage = m; w.style.webkitMaskImage = m; }
            if (t >= r.a && t < r.b) tip = { x: rtl ? fx + p.feather * 0.5 : fx - p.feather * 0.5, y: r.y + r.h * 0.62 };
          }
        } else if (method === "per-letter-clip") {
          const step = T / Math.max(1, letters.length);
          letters.forEach((c, i) => {
            const u = ML.lin(t, lt[i], lt[i] + step);
            const m = u >= 1 ? "none" : `linear-gradient(${rtl ? "to left" : "to right"}, #000 ${(u * 100 - 8).toFixed(1)}%, transparent ${(u * 100).toFixed(1)}%)`;
            c.style.maskImage = m; c.style.webkitMaskImage = m;
            c.style.opacity = ML.lin(t, lt[i], lt[i] + 0.05).toFixed(4);
            c.style.translate = `0 ${jitter[i].toFixed(3)}em`;
            if (u > 0 && u < 1) { const b = rel(c); tip = { x: b.x + (rtl ? (1 - u) : u) * b.w, y: b.y + b.h * 0.62 }; }
          });
        } else {
          for (const s of strokes) {
            const u = pw(ML.lin(t, s.a, s.b));
            s.tx.style.strokeDashoffset = ((1 - u) * s.len).toFixed(2);
            s.tx.style.opacity = t >= s.a ? "1" : "0";
            const fill = ML.lin(t, s.b - 0.05, s.b + 0.25);
            s.tx.style.fillOpacity = fill.toFixed(4);
            s.tx.style.strokeOpacity = (1 - fill * 0.6).toFixed(4);
            s.w.style.opacity = "0";
          }
          for (const r of rows) if (t >= r.a && t < r.b) tip = { x: front(r, t), y: r.y + r.h * 0.62 };
        }
        if (dot) {
          dot.style.opacity = tip ? "1" : "0";
          if (tip) { dot.style.left = tip.x.toFixed(1) + "px"; dot.style.top = tip.y.toFixed(1) + "px"; }
        }
        if (ul) {
          const x = ML.lin(t, ulAt, ulAt + ulDur), u = p.underline === "circle" ? pw(x) : 1 - Math.pow(1 - x, 2);
          ul.style.strokeDashoffset = ((1 - u) * ulLen).toFixed(2);
          ul.style.opacity = x > 0 ? "1" : "0";
        }
      },
    };
  },
});

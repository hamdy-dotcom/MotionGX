// Strike-through: a line crosses out a word or stat at its x-height centre, reaching `overshoot` px past both sides
// (≤ 110 % of the word), rotated `angle` deg (−2 reads human), round caps, `thickness` px (read at a 60 px word, so it
// scales with the text) in the look's alert / accent / ink / panel colour, optionally glowing. It draws from the
// reading edge (by script: right-to-left for Arabic) in `draw` s — power3.out straight, power2.inOut hand-drawn (a
// wobbly SVG path, seeded) — by stroke-dashoffset, while the struck text drops to `dim-to`. One pass per line of text,
// each a little after the last. Then it holds: no exit (a replacement or a cut follows). Reads as negation.
// Source: prompt-motion:kmasiff-prompt-opus-5-5-high + reyzostyle-opus-5-5-literally-one + sudo-kiran-i-have-asked-opus
// (reference) — our own rebuild.
ML.define({
  id: "text-emphasis.strike-through",
  category: "text-emphasis",
  name: "Line strikes through a word or number",
  does: "A straight or hand-drawn line draws across a word or stat to cross it out, while the struck text dims.",
  says: ["problem", "change", "before-after"],
  energy: 3,
  targets: ["word", "number", "line", "label"],
  duration: [0.6, 2],
  params: {
    style: { type: "choice", options: ["straight", "hand-drawn"], default: "straight" },
    thickness: { type: "number", range: [1, 6], default: 3, unit: "px" },
    colour: { type: "text", default: "alert" },
    angle: { type: "number", range: [-6, 6], default: -2, unit: "deg" },
    direction: { type: "choice", options: ["ltr", "rtl", "by-script"], default: "by-script" },
    "dim-to": { type: "number", range: [0.35, 0.8], default: 0.5 },
    draw: { type: "number", range: [0.2, 0.4], default: 0.3, unit: "s" },
    overshoot: { type: "number", range: [0, 20], default: 10, unit: "px" },
    glow: { type: "bool", default: false },
  },
  pairs: ["text-emphasis.strike-replace", "data.count-up"],
  avoid: ["celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "snap",
  source: { from: "prompt-motion:kmasiff-prompt-opus-5-5-high", license: "reference", note: "our own rebuild; also reyzostyle-opus-5-5-literally-one, sudo-kiran-i-have-asked-opus" },
  setup(ctx) {
    const { el, p, at, rtl } = ctx;
    if (!el) return null;
    const COL = { alert: "var(--x-bad)", bad: "var(--x-bad)", red: "var(--x-bad)", pink: "var(--x-accent-2)", "accent-2": "var(--x-accent-2)", accent: "var(--x-accent)", brand: "var(--x-accent)", ink: "var(--x-ink)", white: "var(--x-panel)", light: "var(--x-panel)", good: "var(--x-good)", dim: "var(--x-dim)" };
    const raw = String(p.colour || "alert").trim();
    const colour = COL[raw.toLowerCase()] || (/^var\(--x-[a-z0-9-]+\)$/.test(raw) ? raw : "var(--x-bad)");
    const core = document.createElement("span");
    while (el.firstChild) core.append(el.firstChild);
    el.append(core);
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    const fs = parseFloat(getComputedStyle(el).fontSize) || 60;
    const s = ML.clamp(fs / 60, 0.6, 3);
    const k = el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1;
    const eb = el.getBoundingClientRect();
    const rows = [];
    for (const r of core.getClientRects()) {
      const x = (r.left - eb.left) / k, y = (r.top - eb.top) / k, w = r.width / k, h = r.height / k;
      if (w < 2) continue;
      const same = rows.find((q) => Math.abs(q.y - y) < h * 0.5);
      if (same) { const x2 = Math.max(same.x + same.w, x + w); same.x = Math.min(same.x, x); same.w = x2 - same.x; }
      else rows.push({ x, y, w, h });
    }
    const back = p.direction === "rtl" || (p.direction === "by-script" && rtl);
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    const W = el.offsetWidth, H = el.offsetHeight;
    svg.setAttribute("width", W); svg.setAttribute("height", H); svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    Object.assign(svg.style, { position: "absolute", left: "0", top: "0", overflow: "visible", pointerEvents: "none" });
    if (p.glow) svg.style.filter = `drop-shadow(0 0 ${(4 * s).toFixed(1)}px ${colour}) drop-shadow(0 0 ${(10 * s).toFixed(1)}px ${colour})`;
    el.append(svg);
    const sw = Math.max(1, p.thickness * s);
    const lines = rows.map((r, i) => {
      const over = Math.min(p.overshoot * s, r.w * 0.05);
      const x0 = r.x - over, x1 = r.x + r.w + over, y = r.y + r.h * 0.57, len = x1 - x0;
      const from = back ? x1 : x0, dir = back ? -1 : 1;
      let d;
      if (p.style === "hand-drawn") {
        const n = Math.max(8, Math.round(len / (fs * 0.35))), pts = [];
        for (let j = 0; j <= n; j++) {
          const u = j / n;
          const wob = Math.sin(u * Math.PI * (1.3 + ML.rnd(i, 3))) * r.h * 0.04 + (ML.rnd(i * 31 + j, 7) - 0.5) * r.h * 0.045;
          pts.push([from + dir * u * len, y + wob - (u - 0.5) * r.h * 0.05]);
        }
        // a curve through the midpoints: a pen line, never a polyline with corners
        d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
        for (let j = 1; j < n; j++) d += ` Q${pts[j][0].toFixed(1)} ${pts[j][1].toFixed(1)} ${((pts[j][0] + pts[j + 1][0]) / 2).toFixed(1)} ${((pts[j][1] + pts[j + 1][1]) / 2).toFixed(1)}`;
        d += ` L${pts[n][0].toFixed(1)} ${pts[n][1].toFixed(1)}`;
      } else d = `M${from.toFixed(1)} ${y.toFixed(1)} L${(from + dir * len).toFixed(1)} ${y.toFixed(1)}`;
      const pa = document.createElementNS(NS, "path");
      pa.setAttribute("d", d);
      pa.setAttribute("fill", "none"); pa.setAttribute("stroke-width", sw.toFixed(2));
      pa.setAttribute("stroke-linecap", "round"); pa.setAttribute("stroke-linejoin", "round");
      pa.style.stroke = colour;
      pa.setAttribute("transform", `rotate(${p.angle} ${((x0 + x1) / 2).toFixed(1)} ${y.toFixed(1)})`);
      svg.append(pa);
      const L = pa.getTotalLength() || 1;
      pa.style.strokeDasharray = `${L.toFixed(1)} ${(L + 10).toFixed(1)}`;
      return { pa, L, a: at + i * p.draw * 0.7 };
    });
    ctx.sfx(at, "snap", 0.4);
    const curve = p.style === "hand-drawn" ? (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2) : (x) => 1 - Math.pow(1 - x, 3);
    const last = lines.length ? lines[lines.length - 1].a + p.draw : at + p.draw;
    return {
      draw(t) {
        const dim = curve(ML.lin(t, at, last));
        core.style.opacity = (1 - (1 - p["dim-to"]) * dim).toFixed(4);
        for (const l of lines) {
          const u = curve(ML.lin(t, l.a, l.a + p.draw));
          l.pa.style.strokeDashoffset = (l.L * (1 - u)).toFixed(2);
          l.pa.style.opacity = u > 0.002 ? "1" : "0";
        }
      },
    };
  },
});

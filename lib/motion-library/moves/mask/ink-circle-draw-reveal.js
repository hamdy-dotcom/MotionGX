// Ink circle draws around an image: a thick hand-inked loop is drawn around the picture as it appears, from
// start_angle (0 = 12 o'clock) clockwise — counter-clockwise in Arabic — over `duration` (power2.inOut), overshooting its
// start a little the way a hand does, the stroke swelling in and tapering where it ends. "brush": the stroke is a
// filled ribbon whose width follows the hand (pressure envelope + seeded wobble), its edges roughened by seeded jitter and
// split into bristle strands that part toward the tail and end one by one (dry brush) — all geometry, no filter; "clean": an even round-capped stroke drawn by its dash. The picture fades in and settles 1.05 → 1 behind the
// stroke. accent_arc: a short accent arc sweeps around just outside the loop and leaves. Colour: a look token name
// ("ink", "accent", "accent-2", "dim", "good", "bad", or any --x-… variable).
// Source: prompt-motion lexnlin-claude-opus-5-5-made (reference only: our own rebuild).
ML.define({
  id: "mask.ink-circle-draw-reveal",
  category: "mask",
  name: "Ink circle draws around an image",
  does: "A thick hand-inked circle is drawn around a centred image as it appears, the stroke tapering where it ends.",
  says: ["focus", "reveal", "story"],
  energy: 2,
  targets: ["image", "logo"],
  duration: [0.6, 1.5],
  params: {
    stroke: { type: "choice", options: ["brush", "clean"], default: "brush" },
    colour: { type: "text", default: "ink" },
    start_angle: { type: "number", range: [0, 360], default: 0, unit: "deg" },
    duration: { type: "number", range: [0.4, 1], default: 0.6, unit: "s" },
    accent_arc: { type: "bool", default: false },
  },
  pairs: ["text-emphasis.hand-underline", "text-in.soft-rise"],
  avoid: ["tech", "precision"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:lexnlin-claude-opus-5-5-made", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, stage } = ctx;
    if (!el) return null;
    const host = ctx.scene || stage;
    const NS = "http://www.w3.org/2000/svg";
    const tok = String(p.colour || "ink").trim().replace(/^var\(|\)$/g, "");
    const colour = /^--x-[a-z0-9-]+$/.test(tok) ? `var(${tok})` : /^[a-z0-9-]+$/.test(tok) && tok !== "" ? `var(--x-${tok}, var(--x-ink))` : "var(--x-ink)";
    const b = ctx.box(el), unit = Math.min(ctx.f.W, ctx.f.H) / 1080;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    // the loop sits just outside the picture's box (an ellipse through its corners would be far too big for a wide one)
    const rx = b.w / 2 + Math.max(26, b.h * 0.16) * unit, ry = b.h / 2 + Math.max(30, b.h * 0.22) * unit;
    const thick = Math.max(8, Math.min(26, Math.min(b.w, b.h) * 0.06)) * unit;
    const dur = ML.clamp(+p.duration, 0.4, 1), dir = ctx.rtl ? -1 : 1, a0 = (+p.start_angle * Math.PI) / 180, SWEEP = Math.PI * 2 * 1.07;
    const seed = Math.round(at * 13 + b.w);
    // the centreline: a hand loop — radius breathing with two seeded low harmonics, and drifting outward a touch so the
    // end passes outside the start instead of meeting it
    const ph1 = ML.rnd(seed, 1) * 6.28, ph2 = ML.rnd(seed, 2) * 6.28;
    const at_ = (s) => { // s in [0, 1] along the stroke
      const a = a0 + dir * s * SWEEP;
      const k = 1 + 0.025 * Math.sin(2 * a + ph1) + 0.018 * Math.sin(3 * a + ph2) + 0.05 * s;
      return { x: cx + Math.sin(a) * rx * k, y: cy - Math.cos(a) * ry * k };
    };
    const SEG = 220;
    const pts = Array.from({ length: SEG + 1 }, (_, i) => at_(i / SEG));
    const width = (s) => { // pressure: swells in, holds, tapers to a point at the end; seeded wobble
      const env = Math.min(1, s / 0.06) * Math.pow(1 - Math.max(0, (s - 0.62) / 0.38), 1.3);
      return thick * (0.25 + 0.75 * env) * (1 + 0.14 * Math.sin(s * 37 + ph1) + 0.08 * Math.sin(s * 91 + ph2));
    };

    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    el.style.zIndex = el.style.zIndex || "1";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", ctx.f.W); svg.setAttribute("height", ctx.f.H);
    svg.style.cssText = "position:absolute;left:0;top:0;overflow:visible;pointer-events:none;z-index:2;will-change:transform"; // its own layer: redrawing the loop never re-rasters the text under it
    const ink = document.createElementNS(NS, "path");
    ink.style.fill = colour;
    if (p.stroke !== "brush") { ink.style.fill = "none"; ink.style.stroke = colour; ink.style.strokeWidth = thick * 0.7 + "px"; ink.style.strokeLinecap = "round"; ink.style.strokeLinejoin = "round"; }
    svg.append(ink);
    let arc = null;
    if (p.accent_arc) { arc = document.createElementNS(NS, "path"); arc.style.fill = "none"; arc.style.stroke = "var(--x-accent)"; arc.style.strokeWidth = Math.max(3, thick * 0.3) + "px"; arc.style.strokeLinecap = "round"; svg.append(arc); }
    host.append(svg);
    // the clean stroke: the whole centreline, drawn by its dash
    let len = 0;
    if (p.stroke !== "brush") { ink.setAttribute("d", "M" + pts.map((q) => `${q.x.toFixed(2)},${q.y.toFixed(2)}`).join("L")); for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); ink.style.strokeDasharray = `${len} ${len}`; }
    ctx.sfx(at, "whoosh.soft", 0.25);

    // the brush: strands across the width (fractions of it), parting a little after the middle of the stroke and each
    // ending at its own place near the tail; edges jittered by seeded noise along the stroke
    const STR = [[-0.5, -0.24], [-0.24, 0.02], [0.02, 0.26], [0.26, 0.5]].map(([f0, f1], j) => ({ f0, f1, last: 1 - 0.09 * ML.rnd(seed + j, 9) }));
    const rough = (s, j) => 0.06 * (ML.rnd(Math.floor(s * 160) + j * 1000, seed) - 0.5);
    const strand = (u, st, j) => {
      const top = Math.min(u, st.last), n = Math.max(2, Math.ceil(top * SEG)), L = [], R = [];
      if (top <= 0.002) return "";
      for (let i = 0; i <= n; i++) {
        const s = Math.min(top, i / SEG), q = at_(s), q2 = at_(Math.min(1, s + 0.002)), q0 = at_(Math.max(0, s - 0.002));
        let tx = q2.x - q0.x, ty = q2.y - q0.y; const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
        // the tip of what is drawn tapers like a moving pen; strands part after s = 0.5
        const w = width(s) * Math.min(1, (top - s) / 0.05 + 0.35), gap = 0.03 * ML.clamp((s - 0.5) / 0.4);
        const a = (st.f0 + (st.f0 > -0.5 ? gap : 0) + (st.f0 === -0.5 ? rough(s, j) : 0)) * w, b = (st.f1 - (st.f1 < 0.5 ? gap : 0) + (st.f1 === 0.5 ? rough(s, j + 7) : 0.004)) * w;
        L.push(`${(q.x - ty * a).toFixed(2)},${(q.y + tx * a).toFixed(2)}`); R.push(`${(q.x - ty * b).toFixed(2)},${(q.y + tx * b).toFixed(2)}`);
      }
      return "M" + L.join("L") + "L" + R.reverse().join("L") + "Z";
    };
    const ribbon = (u) => STR.map((st, j) => strand(u, st, j)).join("");
    return {
      draw(t) {
        const u = ML.ease(t, at, at + dur);
        svg.style.visibility = t >= at - 1e-6 ? "visible" : "hidden";
        if (p.stroke === "brush") ink.setAttribute("d", u > 0.002 ? ribbon(u) : "");
        else ink.style.strokeDashoffset = (len * (1 - u)).toFixed(2);
        // the picture fades and settles behind the stroke
        const v = ML.out(t, at, at + dur + 0.25);
        el.style.opacity = v.toFixed(4);
        el.style.scale = v < 1 ? (1.05 - 0.05 * v).toFixed(4) : "none";
        if (arc) {
          const s0 = ML.ease(t, at + 0.15, at + dur + 0.35), lead = Math.min(1, s0 * 1.6), tail = Math.max(0, s0 * 1.6 - 0.6);
          const R = 1.13, A = (s) => a0 + dir * s * Math.PI * 2;
          if (lead - tail > 0.004 && s0 < 1) {
            const pts2 = []; for (let i = 0; i <= 40; i++) { const s = tail + ((lead - tail) * i) / 40, a = A(s); pts2.push(`${(cx + Math.sin(a) * rx * R).toFixed(2)},${(cy - Math.cos(a) * ry * R).toFixed(2)}`); }
            arc.setAttribute("d", "M" + pts2.join("L")); arc.style.opacity = (1 - ML.lin(s0, 0.75, 1)).toFixed(3);
          } else arc.setAttribute("d", "");
        }
      },
    };
  },
});

// Orbiting arc segments: short arcs on 2–5 concentric circles spin around a centre dot at their own speeds, like a
// stylised loader. On each ring 1–2 arcs (30–110°, round caps, a 3–4 px stroke at the source's scale) in the look's
// colours (multi: ink / accent / good / bad / accent-2 — the source's white / blue / green / red / purple; brand: the
// accent family); each ring turns at its own rate (base = 360°/speed, ×0.6–2.4, alternating direction) and each arc's
// length breathes on a sine. The arcs expand outward from the centre as the dot grows in (back.out). Around a logo the
// rings orbit the mark instead of a dot. Optional small tracked mono label beneath.
// Source: prompt-motion sudo-kiran (reference only) — rebuilt as our own SVG code.
ML.define({
  id: "accent.orbit-arc-segments",
  category: "accent",
  name: "Orbiting arc segments",
  does: "Short coloured arcs on several concentric circles spin at different speeds around a dot, like a stylised loader.",
  says: ["tech", "time", "energy"],
  energy: 3,
  targets: ["shape", "logo"],
  duration: [1.5, 8],
  params: {
    rings: { type: "number", range: [2, 5], default: 3 },
    colours: { type: "choice", options: ["multi", "brand"], default: "multi" },
    speed: { type: "number", range: [4, 20], default: 8, unit: "s/turn" },
    text: { type: "text", default: "" },
  },
  pairs: ["accent.live-dot", "ui.skeleton-shimmer"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "prompt-motion:sudo-kiran-no-storyboard-no-detailed", license: "reference", note: "our own SVG rebuild of the technique" },
  setup(ctx) {
    const { p, at, end, f, stage, el } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, k = Math.min(W, H) / 1080;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); if (parent) parent.append(e); return e; };
    let cx = f.pic.x + f.pic.w / 2, cy = f.pic.y + f.pic.h / 2, r0 = 46 * k, logo = false;
    if (el && el !== stage) { const b = ctx.box(el); cx = b.x + b.w / 2; cy = b.y + b.h / 2; r0 = Math.hypot(b.w, b.h) * 0.5 + 18 * k; logo = true; }
    const n = Math.round(p.rings), gap = 36 * k;
    const palette = p.colours === "brand" ? ["var(--x-accent)", "var(--x-accent-2)", "var(--x-ink)"] : ["var(--x-ink)", "var(--x-accent)", "var(--x-good)", "var(--x-bad)", "var(--x-accent-2)"];

    const svg = mk("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
    svg.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:6;visibility:hidden;will-change:transform" // its own layer: the frame under it rasterises the same every time;
    host.append(svg);
    const root = mk("g", { transform: `translate(${cx} ${cy})` }, svg);
    const dot = logo ? null : mk("circle", { r: 9 * k, style: "fill:var(--x-ink)" }, root);
    const dir = ctx.rtl ? -1 : 1;
    const base = 360 / p.speed;
    const arcs = [];
    let ci = 0;
    for (let i = 0; i < n; i++) {
      const R = r0 + i * gap, C = 2 * Math.PI * R;
      const mult = 0.6 + 1.8 * ML.rnd(i, 1), sgn = (i % 2 ? -1 : 1) * dir;
      const count = ML.rnd(i, 2) > 0.45 ? 2 : 1;
      for (let j = 0; j < count; j++) {
        const len = 30 + 80 * ML.rnd(i * 3 + j, 3);
        const c = mk("circle", { r: R, fill: "none", "stroke-width": (7 + 2 * ML.rnd(i, 4)) * k, "stroke-linecap": "round", style: `stroke:${palette[ci++ % palette.length]}` }, root);
        arcs.push({ c, R, C, len, a0: ML.rnd(i * 3 + j, 5) * 360 + j * 180, w: base * mult * sgn, br: ML.rnd(i * 3 + j, 6) * 6.28, i });
      }
    }
    let label = null;
    const text = (p.text || "").trim();
    if (text) {
      label = document.createElement("div");
      label.className = "ml-label";
      label.textContent = text;
      label.style.cssText = `position:absolute;left:${cx}px;top:${cy + r0 + n * gap + 34 * k}px;translate:-50% 0;white-space:nowrap;font-size:${Math.round(18 * k * 1.2)}px;letter-spacing:0.4em;pointer-events:none;z-index:6;opacity:0`;
      host.append(label);
    }
    ctx.sfx(at, "blip", 0.2);
    return {
      draw(t) {
        const r = t - at;
        const leave = ML.lin(t, end - 0.35, end);
        const on = r >= 0 && leave < 1;
        svg.style.visibility = on ? "visible" : "hidden";
        if (label) label.style.opacity = "0";
        if (!on) return;
        svg.style.opacity = (1 - leave).toFixed(3);
        const grow = Math.max(0, ML.back(r, 0, 0.45, 1.8));
        if (dot) dot.setAttribute("r", (9 * k * grow).toFixed(3));
        arcs.forEach((a) => {
          // the rings open outward with the dot, the inner ones first; never past their size
          const ex = ML.out(r, 0.05 + a.i * 0.06, 0.6 + a.i * 0.06);
          const R = a.R * (0.35 + 0.65 * ex) * (1 - 0.15 * leave);
          const C = 2 * Math.PI * R;
          const lenDeg = a.len * (1 + 0.3 * Math.sin(r * 2.2 + a.br)) * ex;
          const L = (lenDeg / 360) * C;
          a.c.setAttribute("r", R.toFixed(2));
          a.c.setAttribute("stroke-dasharray", `${L.toFixed(2)} ${(C - L + 1).toFixed(2)}`);
          a.c.setAttribute("transform", `rotate(${(a.a0 + a.w * r).toFixed(3)})`);
          a.c.setAttribute("opacity", ex > 0.01 ? "1" : "0");
        });
        if (label) label.style.opacity = (ML.ease(r, 0.4, 0.8) * (1 - leave)).toFixed(3);
      },
    };
  },
});

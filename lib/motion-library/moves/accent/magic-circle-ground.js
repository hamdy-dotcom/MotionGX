// Glowing rune circle on the ground: a flat ellipse (4 : 1) of dashed strokes lies under the caster — two dashed rings
// counter-rotating on their dash offsets, a band of small rune marks turning with the outer ring, an inner hex star —
// drawn with an additive-looking glow (a soft copy under the crisp strokes). It scales 0 → 1 in 0.3 s when the charge
// starts; small square motes (2 px) rise off it at ~20 px/s and fade. Drawn in a flat circle squashed by scale(1, .25)
// with non-scaling strokes, so the rings and runes turn in true perspective around the ellipse.
// Source: prompt-motion 0xevinho (reference only) — rebuilt as our own SVG code.
ML.define({
  id: "accent.magic-circle-ground",
  category: "accent",
  name: "Glowing rune circle on the ground",
  does: "A glowing ellipse of runes spins on the ground beneath the subject as power charges, motes rising off it.",
  says: ["energy", "tech", "arrival"],
  energy: 3,
  targets: ["shape", "image"],
  duration: [1.5, 6],
  params: {
    colour: { type: "choice", options: ["blue", "brand", "gold"], default: "blue" },
    size: { type: "number", range: [0.3, 1], default: 0.6, unit: "frame" },
    particles: { type: "bool", default: true },
  },
  pairs: ["accent.energy-orb", "accent.mote-burst"],
  avoid: ["calm", "trust", "money"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:0xevinho-opus-5-5-is-really", license: "reference", note: "our own SVG rebuild of the technique" },
  setup(ctx) {
    const { p, at, end, f, stage, el } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, k = Math.min(W, H) / 1080;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); if (parent) parent.append(e); return e; };
    // the colour: the look's accent, or the source's cyan / gold pulled toward the look's accent
    const col = p.colour === "brand" ? "var(--x-accent)" : p.colour === "gold" ? "color-mix(in oklab, var(--x-accent) 22%, #f2bd45)" : "color-mix(in oklab, var(--x-accent) 28%, #3cc8ff)";
    // the ground point: under the target (an image's foot), else low in the picture region
    let cx = f.pic.x + f.pic.w / 2, gy = f.pic.y + f.pic.h * 0.72, room = f.pic.w;
    if (el && el !== stage) { const b = ctx.box(el); cx = b.x + b.w / 2; gy = Math.min(H - 60 * k, b.y + b.h); room = Math.max(b.w * 1.2, f.pic.w * 0.5); }
    const R = Math.min(room, W - 40 * k) * p.size * 0.5, flat = 0.25;

    const svg = mk("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
    svg.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:6;visibility:hidden;will-change:transform" // its own layer: the frame under it rasterises the same every time;
    host.append(svg);
    const fid = `ml-mcg-${Math.round(cx)}-${Math.round(gy)}`;
    const defs = mk("defs", {}, svg);
    const filt = mk("filter", { id: fid, x: "-30%", y: "-120%", width: "160%", height: "340%" }, defs);
    mk("feGaussianBlur", { stdDeviation: 6 * k }, filt);
    const g0 = mk("g", { style: `color:${col}` }, svg);
    // the floor flare: a soft ellipse of light
    const rg = mk("radialGradient", { id: `${fid}-f` }, defs);
    mk("stop", { offset: "0", style: `stop-color:${col};stop-opacity:0.35` }, rg);
    mk("stop", { offset: "1", style: `stop-color:${col};stop-opacity:0` }, rg);
    const flare = mk("ellipse", { cx: 0, cy: 0, rx: R * 1.15, ry: R * 1.15 * flat, fill: `url(#${fid}-f)` }, g0);
    // the flat circle (squashed), drawn twice: the glow copy under the crisp copy
    const layers = [mk("g", { filter: `url(#${fid})`, opacity: "0.85" }, g0), mk("g", {}, g0)];
    const sw = (w) => ({ "stroke-width": w * k, "vector-effect": "non-scaling-stroke", fill: "none", stroke: "currentColor" });
    const C = (r) => 2 * Math.PI * r;
    const spinners = [];
    layers.forEach((L, li) => {
      const flatG = mk("g", { transform: `scale(1 ${flat})` }, L);
      const outer = mk("circle", { r: R, ...sw(li ? 2.5 : 6), "stroke-dasharray": `${C(R) / 48 * 0.62} ${C(R) / 48 * 0.38}` }, flatG);
      mk("circle", { r: R * 0.9, ...sw(li ? 1.2 : 3) }, flatG);
      const inner = mk("circle", { r: R * 0.74, ...sw(li ? 2 : 5), "stroke-dasharray": `${C(R * 0.74) / 20 * 0.2} ${C(R * 0.74) / 20 * 0.08} ${C(R * 0.74) / 20 * 0.5} ${C(R * 0.74) / 20 * 0.22}` }, flatG);
      // rune band between the outer rings: small seeded strokes, turning with the outer ring
      const runes = mk("g", {}, flatG);
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * 360, rr = R * 0.82, h = R * 0.06, v = Math.floor(ML.rnd(i, 4) * 4);
        const glyph = [`M0 ${-h} L0 ${h}`, `M${-h * 0.6} ${-h} L${h * 0.6} ${h} M${h * 0.6} ${-h} L${-h * 0.6} ${h}`, `M${-h * 0.6} ${-h} L0 ${h} L${h * 0.6} ${-h}`, `M${-h * 0.6} ${-h} L${h * 0.6} ${-h} L${-h * 0.6} ${h} L${h * 0.6} ${h}`][v];
        mk("path", { d: glyph, transform: `rotate(${a}) translate(${rr} 0) rotate(90)`, ...sw(li ? 1.4 : 3.5) }, runes);
      }
      // the inner star (two triangles) turning slowly the other way
      const star = mk("g", {}, flatG);
      const tri = (o) => [0, 1, 2].map((j) => { const a = ((j * 120 + o) * Math.PI) / 180; return `${(Math.cos(a) * R * 0.7).toFixed(2)},${(Math.sin(a) * R * 0.7).toFixed(2)}`; }).join(" ");
      mk("polygon", { points: tri(-90), ...sw(li ? 1.2 : 3) }, star);
      mk("polygon", { points: tri(90), ...sw(li ? 1.2 : 3) }, star);
      mk("circle", { r: R * 0.18, ...sw(li ? 1.2 : 3), "stroke-dasharray": `${C(R * 0.18) / 12 * 0.5} ${C(R * 0.18) / 12 * 0.5}` }, star);
      spinners.push({ outer, inner, runes, star, cO: C(R), cI: C(R * 0.74) });
    });
    // rising motes: 2 px squares lifting off the rim at ~20 px/s, re-born on a seeded cycle
    const motes = [];
    if (p.particles) for (let i = 0; i < 26; i++) {
      const q = mk("rect", { width: 3 * k, height: 3 * k, fill: "currentColor" }, g0);
      motes.push({ q, ang: ML.rnd(i, 1) * Math.PI * 2, rr: 0.55 + 0.45 * ML.rnd(i, 2), life: 1.4 + ML.rnd(i, 3) * 1.1, ph: ML.rnd(i, 5), sp: (18 + 14 * ML.rnd(i, 6)) * k * 2.4 });
    }
    const dir = ctx.rtl ? -1 : 1;
    ctx.sfx(at, "swell", 0.35);
    return {
      draw(t) {
        const r = t - at;
        const leave = ML.lin(t, end - 0.35, end);
        const on = r >= 0 && leave < 1;
        svg.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        // scale 0 → 1 in 0.3 s (≤ 1: never enlarged), a charge flicker on the glow
        const grow = ML.out(r, 0, 0.3);
        g0.setAttribute("transform", `translate(${cx} ${gy}) scale(${(grow * (1 - 0.15 * leave)).toFixed(4)})`);
        g0.setAttribute("opacity", (1 - leave).toFixed(3));
        layers[0].setAttribute("opacity", (0.65 + 0.2 * Math.sin(r * 9.3) * Math.sin(r * 3.1)).toFixed(3));
        flare.setAttribute("opacity", (0.8 + 0.2 * Math.sin(r * 4.7)).toFixed(3));
        spinners.forEach((s) => {
          // two rings counter-rotating on their dash offsets; the runes and star turn as wholes
          s.outer.setAttribute("stroke-dashoffset", ((-dir * r * s.cO) / 14).toFixed(2));
          s.inner.setAttribute("stroke-dashoffset", ((dir * r * s.cI) / 9).toFixed(2));
          s.runes.setAttribute("transform", `rotate(${(dir * r * 26).toFixed(3)})`);
          s.star.setAttribute("transform", `rotate(${(-dir * r * 14).toFixed(3)})`);
        });
        motes.forEach((m) => {
          const v = (Math.max(0, r) / m.life + m.ph) % 1, age = v * m.life;
          const x = Math.cos(m.ang + r * 0.4 * dir) * R * m.rr, y = Math.sin(m.ang + r * 0.4 * dir) * R * m.rr * flat - age * m.sp;
          m.q.setAttribute("x", x.toFixed(2)); m.q.setAttribute("y", y.toFixed(2));
          const a = Math.min(1, v / 0.12) * (1 - v) * grow;
          m.q.setAttribute("opacity", a.toFixed(3));
        });
      },
    };
  },
});

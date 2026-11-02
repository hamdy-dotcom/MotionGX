// Star flash: two overlapping four-pointed stars (the outer in the first colour, a white-hot inner one rotated 20deg)
// scale 0 -> 3 over 0.25 s expo.out turning `rotation` degrees; 0-16 thin radial streaks (alternating the look's
// second accent and a warm mix) shoot outward from 30 % of the half-diagonal; the whole frame's brightness flashes.
// The cut lands on the frame where the star covers the frame; the star holds until the next scene is there (when the
// move sits at the end of its scene) and fades off it.
// Colours: two look names (accent, accent-2, ink, good, bad, panel, white = accent ink…) or --x- variables, comma
// separated. (The master spec said "yellow, white": brand colours come from the look, so the default is "accent, white".)
// Source: prompt-motion gizakdag-overthinking-a-film-by (reference only: our own rebuild).
ML.define({
  id: "transition.four-point-star-flash",
  category: "transition",
  name: "Star flash",
  does: "A huge four-pointed star bursts open with a white-hot centre and radial streaks, flashing to the next scene.",
  says: ["transition", "energy", "reveal", "celebration"],
  energy: 5,
  targets: ["scene"],
  duration: [0.25, 0.4],
  params: {
    colours: { type: "text", default: "accent, white" },
    rotation: { type: "number", range: [0, 45], default: 15, unit: "deg" },
    streaks: { type: "number", range: [0, 16], default: 12 },
  },
  pairs: ["text-in.slam", "accent.confetti-burst", "transition.flash-cut"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "prompt-motion:gizakdag-overthinking-a-film-by", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const scene = ctx.scene || null;
    const W = f.W, H = f.H, diag = Math.hypot(W, H), k = Math.min(W, H) / 1080;
    const C = (c, fb) => {
      c = String(c || "").trim();
      if (c.startsWith("--x-")) return `var(${c})`;
      if (c === "white" || c === "light") return "var(--x-accent-ink)";
      if (c === "black" || c === "dark") return "var(--x-device)";
      if (/^(accent|accent-2|accent-ink|ink|good|bad|panel|panel-2|ground|dim|device|glow-1|glow-2)$/.test(c)) return `var(--x-${c})`;
      return fb;
    };
    const [c1, c2] = String(p.colours || "").split(",");
    const outer = C(c1, "var(--x-accent)"), inner = C(c2, "var(--x-accent-ink)");
    // a fat four-pointed star: inner radius 0.36 of the outer; at scale 3 its inner corners clear the frame's corners
    const r = (diag / 2 / 3) * 1.06, R = r / 0.36;
    const star = (Ro, ri) => {
      const pts = [];
      for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 4, rr = i % 2 ? ri : Ro; pts.push(`${(rr * Math.cos(a)).toFixed(1)},${(rr * Math.sin(a)).toFixed(1)}`); }
      return pts.join(" ");
    };
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W); svg.setAttribute("height", H);
    svg.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;z-index:8;visibility:hidden;overflow:visible";
    const g = document.createElementNS(NS, "g");
    const mk = (tag, attrs, parent = g) => { const e = document.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); parent.append(e); return e; };
    const sOuter = mk("polygon", { points: star(R, r) });
    sOuter.style.fill = outer;
    const gIn = mk("g", { transform: "rotate(20)" });
    const sInner = mk("polygon", { points: star(R * 0.46, r * 0.42) }, gIn);
    sInner.style.fill = inner;
    const defs = mk("defs", {}, svg);
    const grad = mk("radialGradient", { id: "mlStarCore" + Math.round(at * 1000) }, defs);
    [[0, 1], [0.35, 0.85], [1, 0]].forEach(([o, a]) => { const s = mk("stop", { offset: o }, grad); s.style.stopColor = inner; s.style.stopOpacity = a; });
    mk("circle", { r: (r * 0.45).toFixed(1), fill: `url(#${grad.id})` });
    svg.append(g);
    // radial streaks above the stars
    const n = Math.round(ML.clamp(+p.streaks || 0, 0, 16));
    const sg = document.createElementNS(NS, "g");
    svg.append(sg);
    const r0 = 0.3 * (diag / 2);
    const streaks = Array.from({ length: n }, (_, i) => {
      const a = (i / Math.max(1, n)) * Math.PI * 2 + (ML.rnd(i, 3) - 0.5) * 0.35;
      const e = mk("line", { "stroke-linecap": "round", "stroke-width": ((1.5 + ML.rnd(i, 4) * 2.5) * k * 1.6).toFixed(2) }, sg);
      e.style.stroke = i % 2 ? "var(--x-accent-2)" : "color-mix(in srgb, var(--x-bad) 60%, var(--x-accent-2))";
      return { e, a, len: diag * (0.18 + ML.rnd(i, 5) * 0.2), reach: diag * (0.45 + ML.rnd(i, 6) * 0.25), d: ML.rnd(i, 7) * 0.04 };
    });
    const glow = document.createElement("div");
    glow.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:9;visibility:hidden;background:var(--x-accent-ink)`;
    stage.append(svg, glow);
    // at the end of a scene the star holds to the scene's end, so the frame never shows the empty stage before the next one;
    // the kit stops drawing a move 0.5 s after its scene, so it is gone by then
    const grow = 0.25, fadeA = end - at <= 0.7 ? Math.max(at + grow, end) : at + grow, fadeB = Math.min(fadeA + 0.13, ctx.to + 0.5 - 2 / 30);
    const sc = (t) => 3 * ML.expo(t, at, at + grow);
    // the cut: the first frame the star covers the frame (scale reaches 3 / 1.06)
    let cut = at + grow;
    for (let x = 0; x <= 1; x += 0.005) if (3 * (1 - Math.pow(2, -10 * x)) >= 3 / 1.06) { cut = at + x * grow; break; }
    ctx.sfx(at, "hit", 0.5);
    return {
      draw(t) {
        const on = t >= at && t < fadeB;
        svg.style.visibility = on ? "visible" : "hidden";
        glow.style.visibility = on ? "visible" : "hidden";
        if (scene) scene.style.visibility = t >= cut ? "hidden" : "";
        if (!on) return;
        const s = Math.max(0.0001, sc(t)), rot = (+p.rotation || 0) * ML.expo(t, at, at + grow);
        g.setAttribute("transform", `translate(${W / 2} ${H / 2}) rotate(${rot.toFixed(2)}) scale(${s.toFixed(4)})`);
        sg.setAttribute("transform", `translate(${W / 2} ${H / 2})`);
        const fo = 1 - ML.ease(t, fadeA, fadeB);
        g.style.opacity = fo.toFixed(4);
        streaks.forEach((st) => {
          const u = ML.expo(t, at + st.d, at + st.d + grow), head = r0 + st.reach * u, tail = Math.max(r0, head - st.len * (0.4 + 0.6 * u));
          const cx = Math.cos(st.a), cy = Math.sin(st.a);
          st.e.setAttribute("x1", (cx * tail).toFixed(1)); st.e.setAttribute("y1", (cy * tail).toFixed(1));
          st.e.setAttribute("x2", (cx * head).toFixed(1)); st.e.setAttribute("y2", (cy * head).toFixed(1));
          st.e.style.opacity = (t < at + st.d ? 0 : fo).toFixed(4);
        });
        // the frame's brightness flash, peaking on the cut
        const fl = t < cut ? ML.lin(t, at, cut) : 1 - ML.out(t, cut, fadeB);
        glow.style.opacity = (0.4 * fl).toFixed(4);
      },
    };
  },
});

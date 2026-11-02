// Underline draw: one bar per emphasised run — only the key words, never the whole line — grows under (or above) them
// from the reading edge, a beat after the words land. Below sits ~.06 em under the baseline; "above" is a rule over the
// cap height, drawn while the words rise 20 px into place. Thickness 1 px (hairline) → 2–4 px → 8 px → up to .4 em (a
// low marker); rounded-bar gives it radius = half its height; hand-drawn is a slightly wavy SVG stroke with round caps
// drawn by dashoffset. Draw: scaleX 0 → 1 (never width) with the origin at the reading start (left LTR, right RTL,
// centre for centre-out), power2.out for a hairline / power3.inOut for a bar; two-phase: 0 → 60 % in 0.25 s power3.out,
// hold 0.3 s, then to full width + 4 px in 0.3 s power2.out. Optional: the words recolour to the accent in sync (0.3 s),
// a soft glow, an exit that draws out toward the far edge, and travel — one bar moving word to word (x / width,
// 0.35 s power3.inOut) on each word's spoken moment. Colours are the look's text ink or accent.
// Sources: MengTo/Skills dither-laser-dark-mode + number-details demos (MIT); MotionGX recipes.js hi-line (own);
// prompt-motion palashbagchi11, charlesmendez, heyiammallik, chatgptastra (curved 5 px stroke), marouanegazouzi
// (travelling underline) — reference, our own rebuild.
ML.define({
  id: "text-emphasis.underline-draw",
  category: "text-emphasis",
  name: "Underline draws under the key words",
  does: "A line or bar grows under (or above) the key words from one edge, landing the emphasis.",
  says: ["focus", "proof", "result", "precision"],
  energy: 2,
  targets: ["word", "line", "label", "headline"],
  duration: [0.6, 3],
  params: {
    position: { type: "choice", options: ["below", "above"], default: "below" },
    thickness: { type: "number", range: [1, 40], default: 4, unit: "px" },
    direction: { type: "choice", options: ["ltr", "rtl", "centre-out", "by-script"], default: "by-script" },
    style: { type: "choice", options: ["straight", "hand-drawn", "rounded-bar"], default: "straight" },
    colour: { type: "choice", options: ["text", "accent"], default: "accent" },
    phases: { type: "choice", options: ["1", "2"], default: "1" },
    delay: { type: "number", range: [0, 0.6], default: 0.2, unit: "s" },
    draw: { type: "number", range: [0.25, 0.6], default: 0.4, unit: "s" },
    "recolour-word": { type: "bool", default: false },
    glow: { type: "bool", default: false },
    exit: { type: "choice", options: ["hold", "draw-out"], default: "hold" },
    travel: { type: "bool", default: false },
    words: { type: "text", default: "" },
    pick: { type: "choice", options: ["last", "first", "longest", "all"], default: "last" },
    sync: { type: "choice", options: ["spoken", "at"], default: "spoken" },
  },
  pairs: ["text-in.punchline", "text-emphasis.accent-word"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/web-design/number-details/demo/index.html", license: "MIT", note: "also dither-laser-dark-mode (MIT), MotionGX recipes.js hi-line (own), prompt-motion chatgptastra + marouanegazouzi + palashbagchi11 + charlesmendez + heyiammallik (reference); our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const words = ML.split(el, "words");
    if (!words.length) return null;
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize) || 56, u = fs / 56;
    const col = p.colour === "text" ? "currentColor" : "var(--x-accent)";
    // the key words: named, else picked
    const named = String(p.words || "").split(",").map((s) => ML.plain(s)).filter(Boolean);
    let chosen = named.length ? words.filter((w) => named.some((n) => ML.plain(w.textContent).includes(n))) : [];
    if (!chosen.length) {
      if (p.pick === "first") chosen = [words[0]];
      else if (p.pick === "longest") chosen = [words.reduce((a, b) => (ML.plain(b.textContent).length > ML.plain(a.textContent).length ? b : a))];
      else if (p.pick === "all") chosen = words;
      else chosen = [words[words.length - 1]];
    }
    // travel visits word by word: with a single pick it walks the whole line and settles on the pick
    if (p.travel && chosen.length < 2) chosen = words.length > 1 ? words.slice(0, words.indexOf(chosen[0]) + 1).slice(-4) : chosen;
    if (!chosen.length) chosen = [words[words.length - 1]];
    // runs: consecutive chosen words share one bar (travel: one stop per word)
    let runs = [];
    if (p.travel) runs = chosen.map((w) => [w]);
    else { let run = []; words.forEach((w) => { if (chosen.includes(w)) run.push(w); else if (run.length) { runs.push(run); run = []; } }); if (run.length) runs.push(run); }
    if (cs.position === "static") el.style.position = "relative";
    const er = el.getBoundingClientRect(), k = er.width / (el.offsetWidth || 1) || 1;
    // one rect per line of a run, in el's own px (the ink box: from the glyph tops to the baseline)
    const rectsOf = (g) => {
      const rg = document.createRange(); rg.setStartBefore(g[0]); rg.setEndAfter(g[g.length - 1]);
      const out = [];
      for (const r of rg.getClientRects()) {
        if (r.width < 1) continue;
        const x = (r.left - er.left) / k - el.clientLeft, y = (r.top - er.top) / k - el.clientTop, w = r.width / k, h = r.height / k;
        const same = out.find((l) => Math.abs(l.y + l.h / 2 - (y + h / 2)) < h * 0.4);
        if (same) { const x1 = Math.max(same.x + same.w, x + w); same.x = Math.min(same.x, x); same.w = x1 - same.x; }
        else out.push({ x, y, w, h });
      }
      return out.sort((a, b) => a.y - b.y);
    };
    const thick = Math.min(Math.max(1, p.thickness * u), fs * 0.4);
    const barOf = (l) => {
      // baseline ≈ the middle of the line box + .3 em; cap height ≈ .7 em above the baseline
      const base = l.y + l.h / 2 + fs * 0.3;
      const y = p.position === "above" ? base - fs * 0.72 - 18 * u - thick : base + fs * 0.09;
      const extra = p.phases === "2" ? 4 * u : 0;
      return { x: l.x - extra / 2, y, w: l.w + extra, h: thick };
    };
    const goRtl = p.direction === "rtl" || (p.direction === "by-script" && rtl);
    const centre = p.direction === "centre-out";
    const origin = centre ? "50% 50%" : goRtl ? "100% 50%" : "0% 50%";
    const farOrigin = centre ? "50% 50%" : goRtl ? "0% 50%" : "100% 50%";
    const layer = document.createElement("div");
    Object.assign(layer.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" });
    el.append(layer);
    const NS = "http://www.w3.org/2000/svg";
    const glow = p.glow ? `drop-shadow(0 0 ${(6 * u).toFixed(1)}px color-mix(in srgb, ${col} 40%, transparent))` : "none";
    const mkBar = (b, seed) => {
      if (p.style === "hand-drawn") {
        const pad = thick * 2 + 6 * u;
        const svg = document.createElementNS(NS, "svg");
        const W = b.w + pad * 2, H = pad * 2 + thick;
        Object.assign(svg.style, { position: "absolute", left: (b.x - pad).toFixed(2) + "px", top: (b.y - pad).toFixed(2) + "px", width: W.toFixed(2) + "px", height: H.toFixed(2) + "px", overflow: "visible", filter: glow });
        svg.setAttribute("viewBox", `0 0 ${W.toFixed(2)} ${H.toFixed(2)}`);
        // a slightly wavy line, drawn from the reading start (two halves from the middle for centre-out)
        const n = 6, amp = Math.min(thick * 0.9 + 2 * u, fs * 0.06), cy = pad + thick / 2;
        const pts = Array.from({ length: n + 1 }, (_, i) => [pad + (b.w * i) / n, cy + (i === 0 || i === n ? 0 : (ML.rnd(seed * 17 + i, 3) - 0.5) * 2 * amp) - (amp * 0.5 * i) / n]);
        const curve = (ps) => ps.reduce((d, q, i) => (i === 0 ? `M${q[0].toFixed(2)} ${q[1].toFixed(2)}` : `${d} Q${((ps[i - 1][0] + q[0]) / 2).toFixed(2)} ${(ps[i - 1][1] + (q[1] - ps[i - 1][1]) * 0.2 + amp * 0.4).toFixed(2)} ${q[0].toFixed(2)} ${q[1].toFixed(2)}`), "");
        const halves = centre ? [pts.slice(0, n / 2 + 1).reverse(), pts.slice(n / 2)] : [goRtl ? pts.slice().reverse() : pts];
        const paths = halves.map((ps) => {
          const path = document.createElementNS(NS, "path");
          path.setAttribute("d", curve(ps)); path.setAttribute("pathLength", "1");
          Object.assign(path.style, { fill: "none", stroke: col, strokeWidth: Math.max(1.5, thick).toFixed(2), strokeLinecap: "round", strokeDasharray: "1 1", strokeDashoffset: "1" });
          svg.append(path); return path;
        });
        layer.append(svg);
        if (p.travel) { svg.setAttribute("preserveAspectRatio", "none"); paths.forEach((pa) => pa.setAttribute("vector-effect", "non-scaling-stroke")); }
        return { svg, paths, pad, set(sc, flip) { paths.forEach((pa) => { pa.style.strokeDashoffset = (flip ? -(1 - sc) : 1 - sc).toFixed(4); pa.style.opacity = sc > 0.001 ? "1" : "0"; }); } };
      }
      const d = document.createElement("div");
      const r = p.style === "rounded-bar" ? Math.max(thick / 2, fs * 0.045) : 0;
      const h = p.style === "rounded-bar" ? Math.max(thick, fs * 0.09) : thick;
      Object.assign(d.style, { position: "absolute", left: b.x.toFixed(2) + "px", top: (b.y - (h - thick) / 2).toFixed(2) + "px", width: b.w.toFixed(2) + "px", height: h.toFixed(2) + "px", background: col, borderRadius: r.toFixed(2) + "px", transformOrigin: origin, transform: "scaleX(0)", filter: glow });
      layer.append(d);
      return { d, set(sc, flip) { d.style.transformOrigin = flip ? farOrigin : origin; d.style.transform = sc >= 1 ? "none" : `scaleX(${sc.toFixed(4)})`; d.style.opacity = sc > 0.001 ? "1" : "0"; } };
    };
    // timing: each run a beat after its words land (their spoken word), runs at least .12 s apart
    const starts = [];
    runs.forEach((g, i) => {
      const said = p.sync === "spoken" ? ctx.word(g[0].textContent, at + i * 0.4) : at + i * 0.4;
      let s = Math.max(at, said) + (p.position === "above" ? 0 : p.delay);
      if (i > 0) s = Math.max(s, starts[i - 1] + (p.travel ? 0.45 : 0.12));
      starts.push(s);
    });
    const lastFit = Math.max(at + 0.1, end - (p.exit === "draw-out" ? 0.9 : 0.5) - p.draw);
    if (starts[starts.length - 1] > lastFit) { const sc = (lastFit - at) / Math.max(0.001, starts[starts.length - 1] - at); for (let i = 0; i < starts.length; i++) starts[i] = at + (starts[i] - at) * sc; }
    const hair = thick <= 2;
    const drawK = (t, s) => {
      if (p.phases === "2") {
        const a = 1 - Math.pow(1 - ML.lin(t, s, s + 0.25), 3);
        const b = 1 - Math.pow(1 - ML.lin(t, s + 0.55, s + 0.85), 2);
        return 0.6 * a + 0.4 * b;
      }
      const x = ML.lin(t, s, s + p.draw);
      return hair || p.style === "hand-drawn" ? 1 - (1 - x) * (1 - x) : x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    };
    const outAt = end - 0.15 - Math.min(0.35, p.draw);
    starts.forEach((s, i) => (!p.travel || i === 0) && ctx.sfx(s, "whoosh.soft", 0.28));
    const rec = p["recolour-word"] && p.colour === "accent";
    const lift = p.position === "above" ? chosen : [];
    let draw;
    if (p.travel) {
      // one bar that walks from word to word
      const stops = runs.map((g) => barOf(rectsOf(g)[0]));
      const bar = mkBar(stops[0], 1);
      if (bar.d) bar.d.style.transformOrigin = origin;
      const io3 = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
      draw = (t) => {
        let b = stops[0];
        for (let i = 1; i < stops.length; i++) {
          const m = io3(ML.lin(t, starts[i], starts[i] + 0.35));
          if (m > 0) b = { x: b.x + (stops[i].x - b.x) * m, y: b.y + (stops[i].y - b.y) * m, w: b.w + (stops[i].w - b.w) * m, h: b.h };
        }
        const sc = drawK(t, starts[0]) * (p.exit === "draw-out" ? 1 - ML.out(t, outAt, outAt + 0.35) : 1);
        if (bar.d) Object.assign(bar.d.style, { left: b.x.toFixed(2) + "px", top: b.y.toFixed(2) + "px", width: b.w.toFixed(2) + "px" });
        else Object.assign(bar.svg.style, { left: (b.x - bar.pad).toFixed(2) + "px", top: (b.y - bar.pad).toFixed(2) + "px", width: (b.w + bar.pad * 2).toFixed(2) + "px" });
        bar.set(sc, t >= outAt);
        if (rec) runs.forEach((g, i) => { const on = ML.lin(t, starts[i], starts[i] + 0.3) * (i < runs.length - 1 ? 1 - ML.lin(t, starts[i + 1], starts[i + 1] + 0.3) : 1); g.forEach((w) => (w.style.color = on > 0.001 ? `color-mix(in srgb, var(--x-accent) ${(on * 100).toFixed(1)}%, currentColor)` : "")); });
      };
    } else {
      const bars = runs.map((g, gi) => rectsOf(g).map((l, li) => mkBar(barOf(l), gi * 7 + li + 1)));
      draw = (t) => {
        bars.forEach((lines, gi) => {
          const per = (p.phases === "2" ? 0.85 : p.draw) / lines.length;
          lines.forEach((b, li) => {
            let sc = drawK(t, starts[gi] + li * per * 0.6);
            if (p.exit === "draw-out") sc *= 1 - ML.out(t, outAt, outAt + 0.35);
            b.set(sc, p.exit === "draw-out" && t >= outAt);
          });
          if (rec) { const on = ML.lin(t, starts[gi], starts[gi] + 0.3); runs[gi].forEach((w) => (w.style.color = on > 0.001 ? `color-mix(in srgb, var(--x-accent) ${(on * 100).toFixed(1)}%, currentColor)` : "")); }
        });
      };
    }
    return {
      draw(t) {
        draw(t);
        // the rule-above variant: the key words rise 20 px with the rule
        lift.forEach((w) => { const s = starts[runs.findIndex((g) => g.includes(w))] ?? starts[0]; const x = 1 - Math.pow(1 - ML.lin(t, s, s + p.draw), 2); w.style.translate = x >= 1 ? "none" : `0 ${((1 - x) * 20 * u).toFixed(2)}px`; w.style.opacity = x.toFixed(4); });
        layer.style.opacity = p.exit === "hold" ? (1 - ML.ease(t, end - 0.2, end - 0.03)).toFixed(4) : "1";
      },
    };
  },
});

// Hanging objects sway: each object turns about its hanging point by ±amplitude° on a sine.inOut swing (period 2.4 s);
// in a chain every next link adds its own ±6°·(amplitude / 4) swing with a 0.15 s phase delay, so the motion runs
// down the chain. Builds (SVG, look colours): a string of lanterns hung from the top edge on threads of seeded lengths,
// a branch reaching in from the leading top corner with leaves hanging off it, bunting — a catenary string across the
// top whose sag breathes ±3 px with pennants hanging along it, each swinging on its own — or the target itself (a
// picture or shape hung from a pin at its top centre; "auto" sways the target when it was given one, else lanterns).
// The build drops in on its strings (a short settle) and fades at the end. It keeps clear of the headline: it measures
// the head's text and hangs above it, or where a wide frame has no room above, in the columns beside it.
// Source: prompt-motion "hoyoyoda-opus-5-5-prompt" (reference only — rebuilt as our own SVG code).
ML.define({
  id: "element.pendulum-sway",
  category: "element",
  name: "Hanging objects sway",
  does: "Hanging objects - a branch, a string of lanterns or bunting - sway softly as if in a breeze.",
  says: ["calm", "ambient", "playful"],
  energy: 1,
  targets: ["shape", "image"],
  duration: [2, 30],
  params: {
    amplitude: { type: "number", range: [1, 8], default: 4, unit: "deg" },
    period: { type: "number", range: [1.5, 4], default: 2.4, unit: "s" },
    chain_delay: { type: "number", range: [0, 0.3], default: 0.15, unit: "s" },
    object: { type: "choice", options: ["auto", "lanterns", "bunting", "branch", "target"], default: "auto" },
    count: { type: "number", range: [3, 9], default: 5 },
    drop_in: { type: "bool", default: true },
  },
  pairs: ["element.idle-float", "text-in.punchline"],
  avoid: ["urgency", "speed"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "prompt-motion:hoyoyoda-opus-5-5-prompt", license: "reference", note: "pivoted sine sway with chain delay and a breathing catenary, rebuilt as our own SVG" },
  setup(ctx) {
    const { el, p, at, end, f, rtl, stage } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const host = ctx.scene || stage;
    const k = Math.min(f.W, f.H) / 1080;
    const amp = ML.clamp(p.amplitude, 1, 8), per = ML.clamp(p.period, 1.5, 4), dl = ML.clamp(p.chain_delay, 0, 0.3);
    const own = el && el !== stage ? el : null;
    // sine.inOut swing: a plain sine of time is exactly that ease played yoyo
    const swing = (t, ph) => Math.sin(((t - at - ph) / per) * Math.PI * 2);
    const leave = Math.max(at + 1, end - 0.4);
    const fade = (t) => ML.lin(t, at, at + 0.35) * (1 - ML.ease(t, leave, leave + 0.35));
    ctx.sfx(at, "pop.soft", 0.18);

    if (own && (p.object === "target" || p.object === "auto")) {
      const b = ctx.box(own), d = 13 * k;
      own.style.transformOrigin = "50% 0";
      // the pin it hangs from, so it reads as hung and not merely rocking
      const pin = doc.createElement("div");
      pin.style.cssText = `position:absolute;left:${b.x + b.w / 2 - d}px;top:${b.y - d}px;width:${d * 2}px;height:${d * 2}px;border-radius:50%;background:var(--x-ink);box-shadow:inset 0 0 0 ${d * 0.55}px var(--x-accent);pointer-events:none;z-index:7;opacity:0;`;
      host.append(pin);
      return { draw(t) { pin.style.opacity = fade(t).toFixed(4); own.style.rotate = `${(amp * swing(t, 0) * ML.lin(t, at, at + 0.6)).toFixed(3)}deg`; } };
    }
    const object = p.object === "auto" || p.object === "target" ? "lanterns" : p.object;

    const svg = doc.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${f.W} ${f.H}`);
    svg.style.cssText = `position:absolute;left:0;top:0;width:${f.W}px;height:${f.H}px;pointer-events:none;z-index:7;overflow:visible;visibility:hidden;`;
    host.append(svg);
    const E = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); (parent || svg).append(e); return e; };
    const n = Math.round(ML.clamp(p.count, 3, 9));
    const sw = Math.max(1.5, 2 * k);
    const nodes = []; // { g, x, y, depth, ph } — rotate g about (x, y)
    // the head's text, measured: what the build must not cover
    const S = stage.getBoundingClientRect(), sk = S.width / (stage.offsetWidth || 1) || 1;
    let tb = null;
    for (const h of host.querySelectorAll(".ml-head > *")) {
      const r = doc.createRange(); r.selectNodeContents(h); const q = r.getBoundingClientRect();
      if (!q.width) continue;
      const a = { x: (q.left - S.left) / sk, y: (q.top - S.top) / sk, r: (q.right - S.left) / sk, b: (q.bottom - S.top) / sk };
      tb = tb ? { x: Math.min(tb.x, a.x), y: Math.min(tb.y, a.y), r: Math.max(tb.r, a.r), b: Math.max(tb.b, a.b) } : a;
    }
    const headTop = tb && tb.y < f.H * 0.5;
    const roof = headTop ? tb.y - 14 * k : f.H * 0.24; // how far down the top band runs before the headline
    const room = roof >= 190 * k;
    // no room above (a wide frame): the free columns beside the headline, down to the picture region
    const cols = room || !headTop ? [] : [[f.m * 0.6, tb.x - 30 * k], [tb.r + 30 * k, f.W - f.m * 0.6]].filter((c) => c[1] - c[0] >= 90 * k);
    const band = cols.length ? f.pic.y - 12 * k : Math.max(40 * k, roof); // how far down things hang
    const colsW = cols.reduce((a, c) => a + c[1] - c[0], 0);
    const xAt = (u) => { // u 0–1 along the free width
      if (!cols.length) return f.m + (f.W - f.m * 2) * u;
      let d = u * colsW; for (const c of cols) { const w = c[1] - c[0]; if (d <= w) return c[0] + d; d -= w; } return cols[cols.length - 1][1];
    };

    if (object === "lanterns") {
      for (let i = 0; i < n; i++) {
        const s = Math.min((34 + ML.rnd(i, 2) * 18) * k * 1.4, band * 0.4);
        const x = xAt((i + 0.5) / n), len = (band - s * 1.75) * (0.45 + ML.rnd(i, 1) * 0.55);
        const g = E("g", {});
        // the thread runs on above the frame, so the settle never lifts it off the top edge
        E("line", { x1: x, y1: -band, x2: x, y2: len, stroke: "var(--x-dim)", "stroke-width": sw }, g);
        // the lantern hangs off its own short cord: a second link in the chain
        const g2 = E("g", {}, g);
        E("line", { x1: x, y1: len, x2: x, y2: len + s * 0.25, stroke: "var(--x-dim)", "stroke-width": sw }, g2);
        E("rect", { x: x - s * 0.22, y: len + s * 0.22, width: s * 0.44, height: s * 0.12, rx: s * 0.03, fill: "var(--x-ink)" }, g2);
        E("ellipse", { cx: x, cy: len + s * 0.85, rx: s * 0.5, ry: s * 0.55, fill: i % 2 ? "var(--x-accent-2)" : "var(--x-accent)" }, g2);
        for (const dx of [-0.25, 0, 0.25]) E("path", { d: `M${x + dx * s * 0.8} ${len + s * 0.32} Q${x + dx * s * 1.8} ${len + s * 0.85} ${x + dx * s * 0.8} ${len + s * 1.38}`, fill: "none", stroke: "color-mix(in srgb, var(--x-ink) 22%, transparent)", "stroke-width": sw * 0.8 }, g2);
        E("ellipse", { cx: x - s * 0.15, cy: len + s * 0.65, rx: s * 0.12, ry: s * 0.2, fill: "color-mix(in srgb, var(--x-panel) 45%, transparent)" }, g2);
        E("rect", { x: x - s * 0.18, y: len + s * 1.36, width: s * 0.36, height: s * 0.1, rx: s * 0.03, fill: "var(--x-ink)" }, g2);
        E("line", { x1: x, y1: len + s * 1.46, x2: x, y2: len + s * 1.75, stroke: i % 2 ? "var(--x-accent-2)" : "var(--x-accent)", "stroke-width": sw * 1.6, "stroke-linecap": "round" }, g2);
        const ph = ML.rnd(i, 3) * 0.6;
        nodes.push({ g, x, y: 0, depth: 0, ph, a: 1 }, { g: g2, x, y: len, depth: 1, ph, a: 1.5 });
      }
    } else if (object === "bunting") {
      // it can't step aside like the others, so it fits the band above the headline: more, smaller pennants on a wide frame
      const x0 = -f.W * 0.02, x1 = f.W * 1.02, y0 = f.H * 0.015, top = Math.max(40 * k, roof);
      const rope = E("path", { d: "", fill: "none", stroke: "var(--x-dim)", "stroke-width": sw });
      const fhMax = Math.max(36 * k, top * 0.62);
      const m = Math.round(ML.clamp(Math.max(n * 2 + 1, ((x1 - x0) * 0.82) / (fhMax * 0.8)), 3, 31)), flags = [];
      const fw = ((x1 - x0) / m) * 0.82, fh = Math.min(fhMax, fw * 1.25), sag0 = Math.max(8 * k, top - y0 - fh - 4 * k);
      for (let i = 0; i < m; i++) {
        const u = (i + 0.5) / m, g = E("g", {});
        const tri = E("path", { d: "", fill: i % 3 === 0 ? "var(--x-accent)" : i % 3 === 1 ? "var(--x-accent-2)" : "var(--x-panel)", stroke: "var(--x-edge-color)", "stroke-width": Math.max(1, k) }, g);
        flags.push({ g, tri, u, ph: i * dl * 0.5 + ML.rnd(i, 4) * 0.3 });
      }
      // catenary y(u) between the two ends; the sag breathes ±3 px
      const cosh = (x) => (Math.exp(x) + Math.exp(-x)) / 2, curve = (u, sag) => y0 + sag * (1 - (cosh((u - 0.5) * 2.4) - 1) / (cosh(1.2) - 1));
      return {
        draw(t) {
          const o = fade(t);
          svg.style.visibility = o > 0.001 ? "visible" : "hidden";
          svg.style.opacity = o.toFixed(4);
          const drop = p.drop_in ? ML.back(t, at, at + 0.7, 1.4) : 1;
          const sag = (sag0 + 3 * k * Math.sin(((t - at) / per) * Math.PI * 2)) * (0.4 + 0.6 * drop);
          let d = "";
          for (let s = 0; s <= 40; s++) { const u = s / 40; d += `${s ? "L" : "M"}${(x0 + (x1 - x0) * u).toFixed(1)} ${curve(u, sag).toFixed(1)}`; }
          rope.setAttribute("d", d);
          for (const fl of flags) {
            const x = x0 + (x1 - x0) * fl.u, y = curve(fl.u, sag);
            fl.tri.setAttribute("d", `M${(x - fw / 2).toFixed(1)} ${y.toFixed(1)}L${(x + fw / 2).toFixed(1)} ${y.toFixed(1)}L${x.toFixed(1)} ${(y + fh).toFixed(1)}Z`);
            fl.g.setAttribute("transform", `rotate(${(amp * 1.2 * swing(t, fl.ph)).toFixed(3)} ${x.toFixed(1)} ${y.toFixed(1)})`);
          }
        },
      };
    } else {
      // branch: from the leading top corner (right in Arabic), leaves on stems hang off it
      const dir = rtl ? -1 : 1, bx = rtl ? f.W + 10 * k : -10 * k, by = f.H * 0.02;
      // on a wide frame it stops short of the headline, in the free column on its own side
      const free = cols.length && tb ? (rtl ? f.W - tb.r : tb.x) - 30 * k : f.W * 0.62;
      const L = ML.clamp(free, f.W * 0.2, f.W * 0.62), ex = bx + dir * L, ey = by + band * 0.32;
      const g = E("g", {});
      E("path", { d: `M${bx} ${by} Q${bx + dir * L * 0.5} ${by + band * 0.4} ${ex} ${ey}`, fill: "none", stroke: "var(--x-ink)", "stroke-width": 9 * k, "stroke-linecap": "round" }, g);
      nodes.push({ g, x: bx, y: by, depth: 0, ph: 0, a: 0.35 });
      for (let i = 0; i < n + 2; i++) {
        const u = 0.2 + (0.78 * i) / (n + 1), q = 1 - u;
        const x = q * q * bx + 2 * q * u * (bx + dir * L * 0.5) + u * u * ex, y = q * q * by + 2 * q * u * (by + band * 0.4) + u * u * ey;
        const len = band * (0.06 + ML.rnd(i, 5) * 0.14), s = Math.min((30 + ML.rnd(i, 6) * 18) * k * 1.3, band * 0.26);
        const lg = E("g", {}, g);
        E("line", { x1: x, y1: y, x2: x, y2: y + len, stroke: "var(--x-ink)", "stroke-width": sw }, lg);
        E("path", { d: `M${x} ${y + len} C${x - s * 0.5} ${y + len + s * 0.4} ${x - s * 0.3} ${y + len + s * 1.1} ${x} ${y + len + s * 1.4} C${x + s * 0.3} ${y + len + s * 1.1} ${x + s * 0.5} ${y + len + s * 0.4} ${x} ${y + len}Z`, fill: i % 2 ? "var(--x-good)" : "var(--x-accent)" }, lg);
        E("line", { x1: x, y1: y + len + s * 0.15, x2: x, y2: y + len + s * 1.25, stroke: "color-mix(in srgb, var(--x-panel) 50%, transparent)", "stroke-width": sw * 0.7 }, lg);
        nodes.push({ g: lg, x, y, depth: 1, ph: i * dl, a: 1.5 });
      }
    }
    return {
      draw(t) {
        const o = fade(t);
        svg.style.visibility = o > 0.001 ? "visible" : "hidden";
        svg.style.opacity = o.toFixed(4);
        const drop = p.drop_in ? 1 - ML.back(t, at, at + 0.7, 1.4) : 0;
        svg.style.translate = `0 ${(-drop * band * 0.5).toFixed(2)}px`;
        for (const nd of nodes) {
          // the first link swings ±amp; each child adds its own ±6° (scaled with amp) a chain_delay later
          const a = nd.depth === 0 ? amp * nd.a * swing(t, nd.ph) : amp * nd.a * swing(t, nd.ph + dl * nd.depth);
          nd.g.setAttribute("transform", `rotate(${a.toFixed(3)} ${nd.x.toFixed(1)} ${nd.y.toFixed(1)})`);
        }
      },
    };
  },
});

// Per-letter easing showcase: the letters of a word all leave from above the frame (or below it) at the same instant
// and land on the baseline over the same 0.8 s, each on its own easing curve — linear, power2.inOut, expo.out,
// back.out(2), elastic.out(1,.4), bounce.out, cycling — so the word lands as a little lesson in timing. Under each
// letter a mini graph (≈ 40×24 at 1080, 1 px stroke) draws its curve with a dot tracing it in sync, and an italic
// serif label names it. Exit: the whole word slides out sideways under a horizontal motion blur (an SVG
// feGaussianBlur with stdDeviation "x 0", so only the motion axis smears). Easings are our own closed-form ports of
// GSAP's named eases (parsed from the `eases` text), so every frame stays a function of t.
// Source: prompt-motion:vanshwtfff-this-is-seriously-crazy (reference only — our own rebuild).
ML.define({
  id: "kinetic.per-letter-easing-showcase",
  category: "kinetic",
  name: "Per-letter easing showcase",
  does: "Letters of a word fall into place each with a different easing curve, with small labelled curve thumbnails tracing along.",
  says: ["playful", "precision", "energy"],
  energy: 4,
  targets: ["word", "headline"],
  duration: [1.5, 3.5],
  params: {
    eases: { type: "text", default: "linear,power2.inOut,expo.out,back.out(2),elastic.out(1,.4),bounce.out" },
    direction: { type: "choice", options: ["drop", "rise"], default: "drop" },
    curves: { type: "bool", default: true },
    labels: { type: "bool", default: true },
    duration: { type: "number", range: [0.5, 1.2], default: 0.8, unit: "s" },
    exit: { type: "bool", default: true },
  },
  pairs: ["kinetic.glyph-specimen", "camera.push-in"],
  avoid: ["calm", "luxury"],
  rtl: false,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "land",
  source: { from: "prompt-motion:vanshwtfff-this-is-seriously-crazy", license: "reference", note: "our own rebuild; eases ported from GSAP's documented curves" },
  setup(ctx) {
    const { el, p, at, end, f } = ctx;
    if (!el || !(el.textContent || "").trim()) return null;
    const host = ctx.scene || ctx.stage;

    // ── easing curves by GSAP name: "<name>[.in|.out|.inOut][(args)]" ──
    const B = (x) => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; };
    function easeOf(spec) {
      const m = /^\s*([a-z]+\d?)(?:\.(inOut|in|out))?\s*(?:\(([^)]*)\))?\s*$/i.exec(spec) || [];
      const name = (m[1] || "power2").toLowerCase(), kind = m[2] || "out", a = (m[3] || "").split(",").map(parseFloat).filter(Number.isFinite);
      const pw = { power0: 1, linear: 1, none: 1, power1: 2, quad: 2, power2: 3, cubic: 3, power3: 4, quart: 4, power4: 5, quint: 5, strong: 5 };
      let ein = null, eout = null;
      if (name in pw) { const k = pw[name]; if (k === 1) return { fn: (x) => x, name: spec.trim() }; ein = (x) => Math.pow(x, k); }
      else if (name === "expo") ein = (x) => (x <= 0 ? 0 : Math.pow(2, 10 * (x - 1)));
      else if (name === "sine") ein = (x) => 1 - Math.cos((x * Math.PI) / 2);
      else if (name === "circ") ein = (x) => 1 - Math.sqrt(Math.max(0, 1 - x * x));
      else if (name === "back") { const c = a[0] ?? 1.70158; ein = (x) => x * x * ((c + 1) * x - c); }
      else if (name === "elastic") {
        const amp = Math.max(1, a[0] ?? 1), per = a[1] ?? 0.3, s = (per / (2 * Math.PI)) * Math.asin(1 / amp);
        eout = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : amp * Math.pow(2, -10 * x) * Math.sin(((x - s) * 2 * Math.PI) / per) + 1);
      } else if (name === "bounce") eout = B;
      else ein = (x) => x * x * x;
      if (!ein) ein = (x) => 1 - eout(1 - x);
      if (!eout) eout = (x) => 1 - ein(1 - x);
      const fn = kind === "in" ? ein : kind === "inOut" ? (x) => (x < 0.5 ? ein(2 * x) / 2 : 1 - ein(2 * (1 - x)) / 2) : eout;
      return { fn: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : fn(x)), name: spec.trim() };
    }
    const specs = (String(p.eases || "").match(/[^,(]+(?:\([^)]*\))?/g) || []).map((s) => s.trim()).filter(Boolean);
    const eases = (specs.length ? specs : ["power2.out"]).map(easeOf);

    // ── the word: big heavy type fitted to the width it has, letters split ──
    Object.assign(el.style, { font: `max(var(--x-head-weight), 800) ${Math.round(Math.min(f.W * 0.15, f.H * 0.14))}px / 1.02 var(--x-head-font)`, letterSpacing: "-0.02em", whiteSpace: "nowrap", color: "var(--x-ink)" });
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    el.style.zIndex = "3"; // the graphs hang below the word: keep them over whatever sits under it
    ML.fit(el, Math.min(el.parentElement ? el.parentElement.clientWidth : f.W, f.W - f.m * 2));
    const letters = ML.split(el, "chars").filter((c) => c.textContent.trim());
    if (!letters.length) return null;
    // each letter on its own layer for the whole run: a letter crossing the frame edge otherwise re-rasterises with
    // whatever layer state the previous frame left (seen as 1-px edge differences on a re-seek)
    letters.forEach((L) => (L.style.willChange = "translate"));
    const fs = parseFloat(getComputedStyle(el).fontSize);
    const box = ctx.box(el);
    // start off the frame: above it (drop) or below it (rise)
    const from = p.direction === "rise" ? f.H - box.y + fs * 0.4 : -(box.y + box.h + fs * 0.4);

    // ── the graphs: one under each letter, a dot tracing the letter's own curve ──
    const NS = "http://www.w3.org/2000/svg";
    const row = document.createElement("div");
    Object.assign(row.style, { position: "absolute", left: "0", top: (el.offsetHeight + fs * 0.14).toFixed(1) + "px", width: "100%", height: "0", pointerEvents: "none", willChange: "transform" });
    // (its own layer: a tracing dot repainting over the scene otherwise re-rasterises the soft shadows beneath it)
    el.append(row);
    const items = letters.map((L, i) => {
      const e = eases[i % eases.length];
      const item = { L, e, g: null, dot: null };
      if (!p.curves) return item;
      const gw = Math.max(fs * 0.3, Math.min(L.offsetWidth * 0.9, fs * 0.42)), gh = gw * 0.6;
      const g = document.createElement("div");
      Object.assign(g.style, { position: "absolute", left: (L.offsetLeft + (L.offsetParent === el ? 0 : L.offsetParent.offsetLeft) + L.offsetWidth / 2 - gw / 2).toFixed(1) + "px", top: "0", width: gw.toFixed(1) + "px", display: "grid", justifyItems: "center", gap: (gh * 0.15).toFixed(1) + "px" });
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", "0 0 40 24");
      Object.assign(svg.style, { width: gw.toFixed(1) + "px", height: gh.toFixed(1) + "px", overflow: "visible" });
      const Y = (v) => 19 - v * 14; // 0 → 19, 1 → 5: room above and below for overshoot
      const frame = document.createElementNS(NS, "path");
      frame.setAttribute("d", "M0 19 H40 M0 5 H40");
      Object.assign(frame.style, { stroke: "var(--x-line)", strokeWidth: "1", fill: "none" });
      frame.setAttribute("vector-effect", "non-scaling-stroke");
      let d = "";
      for (let k = 0; k <= 48; k++) { const u = k / 48; d += (k ? "L" : "M") + (u * 40).toFixed(2) + " " + Y(e.fn(u)).toFixed(2); }
      const curve = document.createElementNS(NS, "path");
      curve.setAttribute("d", d);
      curve.setAttribute("vector-effect", "non-scaling-stroke");
      Object.assign(curve.style, { stroke: "var(--x-dim)", strokeWidth: "1", fill: "none" });
      const dot = document.createElementNS(NS, "circle");
      dot.setAttribute("r", "2.6");
      dot.style.fill = "var(--x-accent)";
      svg.append(frame, curve, dot);
      g.append(svg);
      if (p.labels) {
        const lab = document.createElement("div");
        lab.textContent = e.name;
        // odd letters drop their label a row lower, so long names never collide
        Object.assign(lab.style, { font: `italic 400 ${Math.max(11, fs * 0.09).toFixed(1)}px / 1 var(--x-serif-font)`, color: "var(--x-dim)", whiteSpace: "nowrap", letterSpacing: "0", marginTop: i % 2 ? (fs * 0.13).toFixed(1) + "px" : "0" });
        g.append(lab);
      }
      row.append(g);
      Object.assign(item, { g, dot, Y });
      return item;
    });

    // ── exit: a horizontal motion blur, one filter per move instance ──
    const fid = "ml-ple-" + Math.floor(ML.rnd(at * 13.7 + letters.length, 3) * 1e9);
    const fsvg = document.createElementNS(NS, "svg");
    fsvg.setAttribute("width", "0"); fsvg.setAttribute("height", "0");
    Object.assign(fsvg.style, { position: "absolute", width: "0", height: "0" });
    fsvg.innerHTML = `<filter id="${fid}" filterUnits="userSpaceOnUse" x="-6000" y="-4000" width="12000" height="8000"><feGaussianBlur stdDeviation="0 0"/></filter>`;
    host.append(fsvg);
    const blurNode = fsvg.querySelector("feGaussianBlur");

    const t0 = at, t1 = at + p.duration;
    const x0 = Math.max(t1 + 0.4, end - 0.5), x1 = Math.max(x0 + 0.2, end - 0.08);
    ctx.sfx(t0, "whoosh.soft", 0.2);
    ctx.sfx(t0 + p.duration * 0.62, "land", 0.4);
    if (p.exit && x0 < end) ctx.sfx(x0, "whoosh.soft", 0.3);
    return {
      draw(t) {
        const u = ML.lin(t, t0, t1);
        const ex = p.exit ? ML.lin(t, x0, x1) : 0, exE = ex * ex * ex; // power2.in-ish acceleration out
        const shift = exE * (f.W + box.w), blurX = Math.sin(Math.PI * Math.min(1, ex * 1.15)) * fs * 0.35;
        el.style.filter = blurX > 0.3 ? `url(#${fid})` : "none";
        blurNode.setAttribute("stdDeviation", `${blurX.toFixed(2)} 0`);
        for (const it of items) {
          const v = it.e.fn(u);
          // whole pixels: a glyph at a fractional offset rasterises differently once its layer state changes
          it.L.style.translate = `${Math.round(shift)}px ${Math.round((1 - v) * from)}px`;
          it.L.style.opacity = t < t0 ? "0" : "1";
          if (it.g) {
            it.g.style.opacity = (ML.lin(t, t0 - 0.05, t0 + 0.15) * (1 - ML.lin(t, x0 - 0.1, x0 + 0.1))).toFixed(4);
            it.g.style.translate = `${Math.round(shift)}px 0`;
            it.dot.setAttribute("cx", (u * 40).toFixed(2));
            it.dot.setAttribute("cy", it.Y(v).toFixed(2));
          }
        }
      },
    };
  },
});

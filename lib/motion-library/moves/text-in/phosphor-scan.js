// Phosphor scan: outline-only letters in a phosphor colour (a thin edge at 80%, glow from two soft copies) are scanned on in the reading direction like a CRT beam — a clip opens across the text over
// `scan` seconds (linear) with a bright scan bar riding its edge (or the whole word at once). In "words" sequence each
// word scans on in the same place, the outgoing word fading over `persistence` seconds as a ghost under the next, then
// the whole line scans on over the last ghost. A seeded flicker holds opacity between 0.92 and 1.
// The colour is a look variable (good / accent / accent-2 / ink) so the phosphor follows the brand. The outline is cut
// from the text's alpha by an SVG filter, not -webkit-text-stroke: a stroke draws every glyph's own contour, so joined
// Arabic letters (and overlapping Latin contours) show seams; the alpha edge is the one clean outline of the whole word.
// Source: prompt-motion rneayan "opus 5.5 oscilloscope style" (reference only — our own rebuild).
ML.define({
  id: "text-in.phosphor-scan",
  category: "text-in",
  name: "Phosphor scan",
  does: "Glowing outline letters are scanned on in the reading direction like a CRT beam, the previous word lingering as a fading ghost under the next.",
  says: ["tech", "precision", "story"],
  energy: 2,
  targets: ["word", "headline"],
  duration: [0.5, 3],
  params: {
    colour: { type: "choice", options: ["good", "accent", "accent-2", "ink"], default: "good" },
    sequence: { type: "choice", options: ["words", "line"], default: "words" },
    reveal: { type: "choice", options: ["scan", "instant"], default: "scan" },
    scan: { type: "number", range: [0.2, 0.6], default: 0.35, unit: "s" },
    persistence: { type: "number", range: [0.2, 1], default: 0.5, unit: "s" },
    flicker: { type: "bool", default: true },
  },
  pairs: ["text-in.dot-matrix-light", "text-in.scramble"],
  avoid: ["playful", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:rneayan-opus-5-5-oscilloscope-style", license: "reference", note: "our own rebuild (alpha-edge filter outline and glow, clip scan)" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const col = `var(--x-${p.colour})`;
    const words = ML.split(el, "words");
    const texts = words.map((w) => w.textContent);
    const fs = parseFloat(getComputedStyle(el).fontSize) || 100;
    // the phosphor: the text's alpha minus itself eroded = its edge; two blurred copies of the edge = the glow
    const fid = "ml-phosphor-" + document.querySelectorAll('filter[id^="ml-phosphor-"]').length;
    const fx = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    fx.setAttribute("aria-hidden", "true");
    Object.assign(fx.style, { position: "absolute", width: "0", height: "0", overflow: "hidden" });
    fx.innerHTML = `<filter id="${fid}" x="-10%" y="-60%" width="120%" height="220%" color-interpolation-filters="sRGB">
      <feMorphology in="SourceAlpha" operator="erode" radius="${Math.max(1, Math.round(fs * 0.018))}" result="core"/>
      <feComposite in="SourceGraphic" in2="core" operator="out" result="edge"/>
      <feGaussianBlur in="edge" stdDeviation="${(fs * 0.025).toFixed(2)}"/><feComponentTransfer result="near"><feFuncA type="linear" slope="1.5"/></feComponentTransfer>
      <feGaussianBlur in="edge" stdDeviation="${(fs * 0.07).toFixed(2)}"/><feComponentTransfer result="far"><feFuncA type="linear" slope="1.6"/></feComponentTransfer>
      <feComponentTransfer in="edge" result="line"><feFuncA type="linear" slope="0.85"/></feComponentTransfer>
      <feMerge><feMergeNode in="far"/><feMergeNode in="near"/><feMergeNode in="line"/></feMerge></filter>`;
    const phosphor = (n) => {
      n.style.color = col;
      n.style.webkitTextFillColor = col;
      n.style.filter = `url(#${fid})`;
    };
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    // the full line: el's own content, wrapped so the clip never cuts the scan bars
    const line = document.createElement("div");
    line.append(...el.childNodes);
    el.append(line, fx);
    phosphor(line);
    const al = getComputedStyle(el).textAlign;
    const just = al === "center" ? "center" : al === "start" ? "flex-start" : al === "end" ? "flex-end" : (al === "left") === !rtl ? "flex-start" : "flex-end";
    const layers = [];
    if (p.sequence === "words" && texts.length > 1) {
      for (const tx of texts) {
        const d = document.createElement("div");
        Object.assign(d.style, { position: "absolute", inset: "0", display: "flex", alignItems: "center", justifyContent: just, whiteSpace: "nowrap", pointerEvents: "none" });
        d.textContent = tx;
        el.append(d); phosphor(d);
        layers.push({ node: d });
      }
    }
    layers.push({ node: line, final: true });
    // each layer's text extent (el px) and its scan bar
    const eb = el.getBoundingClientRect(), sc = eb.width / (el.offsetWidth || 1) || 1; // the stage may be scaled on the page
    for (const L of layers) {
      const r = document.createRange(); r.selectNodeContents(L.node);
      const b = r.getBoundingClientRect(), lb = L.node.getBoundingClientRect();
      L.x0 = (b.left - lb.left) / sc; L.x1 = (b.right - lb.left) / sc; L.w = lb.width / sc; L.ox = (lb.left - eb.left) / sc; L.top = (b.top - eb.top) / sc; L.h = b.height / sc;
      const bar = document.createElement("div");
      Object.assign(bar.style, { position: "absolute", top: (L.top - L.h * 0.05).toFixed(1) + "px", height: (L.h * 1.1).toFixed(1) + "px", width: Math.max(2, fs * 0.02).toFixed(1) + "px", background: col, boxShadow: `0 0 ${(fs * 0.12).toFixed(1)}px ${col}`, pointerEvents: "none", opacity: "0" });
      el.append(bar); L.bar = bar;
    }
    // times: words on their spoken word (or a steady step), the full line after the last word; kept inside the run
    const gap = Math.max(p.scan, 0.2) + 0.3, room = Math.max(0.5, end - 0.6 - at);
    const nw = layers.length - 1;
    let times = layers.slice(0, nw).map((L, i) => Math.max(at, ctx.word(texts[i], at + i * gap)));
    for (let i = 1; i < times.length; i++) times[i] = Math.max(times[i], times[i - 1] + gap * 0.8);
    times.push((times.length ? times[times.length - 1] + gap : at));
    const last = times[times.length - 1] + p.scan;
    if (last - at > room) { const k = room / (last - at); times = times.map((x) => at + (x - at) * k); }
    layers.forEach((L, i) => { L.t = times[i]; L.next = i < layers.length - 1 ? times[i + 1] : Infinity; ctx.sfx(L.t, "blip", 0.25); });
    const scanDur = p.reveal === "instant" ? 0 : p.scan;
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        const fl = p.flicker ? 0.92 + 0.08 * ML.rnd(Math.floor(t * 30), 3) : 1;
        el.style.opacity = ((1 - leave) * fl).toFixed(4);
        for (const L of layers) {
          const u = scanDur ? ML.lin(t, L.t, L.t + scanDur) : t >= L.t ? 1 : 0;
          const ghost = L.final ? 1 : 1 - ML.lin(t, L.next, L.next + p.persistence);
          const vis = t >= L.t && ghost > 0;
          L.node.style.visibility = vis ? "visible" : "hidden";
          L.node.style.opacity = ghost.toFixed(4);
          const front = L.x0 + (L.x1 - L.x0) * u;
          const back = L.x1 - (L.x1 - L.x0) * u; // the front when reading right to left
          const cut = rtl ? `inset(-60% -10% -60% ${Math.max(0, back).toFixed(1)}px)` : `inset(-60% ${Math.max(0, L.w - front).toFixed(1)}px -60% -10%)`;
          L.node.style.clipPath = u >= 1 ? "none" : cut;
          const bx = rtl ? back : front;
          L.bar.style.left = (L.ox + bx).toFixed(1) + "px";
          L.bar.style.opacity = vis && u > 0 && u < 1 ? "1" : "0";
        }
      },
    };
  },
});

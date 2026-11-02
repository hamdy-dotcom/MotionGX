// Mask exit: every word of the phrase leaves through the same mask it came in by — never a fade. Each word sits in
// its own overflow-clipped slot (html-reel's .reel-mask); the inner word goes 0 -> -120% (up) or 0 -> +110% (down,
// optionally tilting 0 -> 4°, mirrored in RTL). Fast handoff: all together in 0.12-0.25 s on html-reel's ease(t,
// out - 0.16, out) and the box is hidden from `out`; sink-out: 0.5-0.6 s power3.in, staggered from the end (last in,
// first out), the start or the centre. Rule edge (techhalla reference): a thin rule under the words is the mask's
// edge; once they have sunk past it the rule slides up a line, ready for the next line to write on it. Whole words
// only, so Arabic stays joined.
// Source: MengTo/Skills (MIT) — media/html-reel demo draw() titles ("a phrase leaves up through the same masks just
// before the next one starts. Never a fade.") + web-design/masked-reveal; rule edge rebuilt from prompt-motion
// reference gdgtify-inspired-by-what-techhalla.
ML.define({
  id: "text-emphasis.mask-exit",
  category: "text-emphasis",
  name: "Words leave through their masks",
  does: "Every word of the phrase slides out of the same mask it entered through — up together, or sinking back down last-in first-out — clearing the line right before the next.",
  says: ["transition", "speed", "change"],
  energy: 3,
  targets: ["headline", "line", "word", "scene"],
  duration: [0.15, 0.8],
  params: {
    direction: { type: "choice", options: ["up", "down"], default: "up" },
    duration: { type: "number", range: [0.12, 0.6], default: 0.2, unit: "s" },
    order: { type: "choice", options: ["together", "from-end", "from-start", "centre"], default: "together" },
    stagger: { type: "number", range: [0, 0.05], default: 0, unit: "s" },
    tilt: { type: "bool", default: false },
    rule_edge: { type: "bool", default: false },
  },
  pairs: ["text-in.mask-rise", "text-in.punchline"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:media/html-reel (demo draw() titles, .reel-mask) + web-design/masked-reveal", license: "MIT", note: "rule-edge variant rebuilt from prompt-motion:gdgtify-inspired-by-what-techhalla (reference)" },
  setup(ctx) {
    const { el, p, at, end, rtl, stage } = ctx;
    if (!el) return null;
    const doc = el.ownerDocument;
    // a scene / stage target: its text slots leave together
    const roots = el === stage || el.tagName === "SECTION" || el.classList.contains("ml-scene") ? [...el.querySelectorAll(".ml-title, .ml-sub, .ml-hero")] : [el];
    if (!roots.length) return null;
    const units = [];
    for (const r of roots) {
      const cs = getComputedStyle(r), fs = parseFloat(cs.fontSize) || 100, lh = parseFloat(cs.lineHeight);
      const LH = Number.isFinite(lh) ? lh / fs : 1.15;
      const room = ML.clamp((1.1 - 1) * LH + 0.06, 0.06, 0.2);
      for (const w of ML.split(r, "words")) {
        // html-reel's mask: padding around the glyph so it never clips at rest, matching negative margin
        const m = doc.createElement("span");
        Object.assign(m.style, { display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: `0.14em 0.05em ${room}em`, margin: `-0.14em -0.05em -${room}em` });
        w.parentNode.insertBefore(m, w);
        m.append(w);
        units.push({ w, m, root: r });
      }
    }
    const n = units.length;
    const down = p.direction === "down";
    const sink = down || p.duration > 0.3;
    const stg = p.order === "together" ? 0 : p.stagger || 0.02;
    // the leaving order (index of each word in its turn)
    const turn = units.map((_, i) => (p.order === "from-end" ? n - 1 - i : p.order === "centre" ? Math.round(Math.abs(i - (n - 1) / 2)) : p.order === "from-start" ? i : 0));
    const maxTurn = Math.max(0, ...turn);
    const total = p.duration + maxTurn * stg;
    // leaving starts at `at`, finishing before the scene's end ("out" = the next phrase's first word - 0.03 s)
    const out0 = Math.max(Math.min(at, end - 0.03 - total), ctx.from ?? -Infinity);
    const out = out0 + total;
    const tiltDeg = p.tilt ? 4 * (rtl ? -1 : 1) : 0;
    if (p.tilt) units.forEach((u) => { u.w.style.transformOrigin = rtl ? "100% 100%" : "0% 100%"; });
    // the rule: the mask's lower edge, under each target
    const rules = [];
    if (p.rule_edge) for (const r of roots) {
      if (getComputedStyle(r).position === "static") r.style.position = "relative";
      const rule = doc.createElement("div");
      const wsR = units.filter((u) => u.root === r).map((u) => u.m.getBoundingClientRect());
      const rb = r.getBoundingClientRect(), k = rb.width / (r.offsetWidth || 1) || 1;
      const left = (Math.min(...wsR.map((b) => b.left)) - rb.left) / k, right = (Math.max(...wsR.map((b) => b.right)) - rb.left) / k;
      const bottom = (Math.max(...wsR.map((b) => b.bottom)) - rb.top) / k;
      const lh = parseFloat(getComputedStyle(r).lineHeight) || parseFloat(getComputedStyle(r).fontSize) * 1.15;
      Object.assign(rule.style, { position: "absolute", left: left + "px", width: right - left + "px", top: bottom + "px", height: "max(2px, 0.03em)", background: "var(--x-accent)", visibility: "visible" });
      r.append(rule);
      rules.push({ rule, lift: lh });
    }
    ctx.sfx(out0, "whoosh.soft", sink ? 0.3 : 0.22);
    return {
      draw(t) {
        const gone = t >= out;
        roots.forEach((r) => { r.style.visibility = gone ? "hidden" : ""; });
        units.forEach((u, i) => {
          const a = out0 + turn[i] * stg, b = a + p.duration;
          let e;
          if (sink) { const x = ML.lin(t, a, b); e = x * x * x; } // power3.in
          else e = ML.ease(t, b - Math.min(0.16, p.duration), b); // html-reel: ease(t, out - 0.16, out)
          const y = down ? 110 * e : -120 * e;
          u.w.style.transform = e > 0 ? `translateY(${y.toFixed(2)}%)${tiltDeg ? ` rotate(${(tiltDeg * e).toFixed(2)}deg)` : ""}` : "none";
        });
        // the rule stays, then slides up a line (power3.inOut) for the next line to write on
        for (const { rule, lift } of rules) {
          const e = ML.ease(t, out, out + 0.4);
          rule.style.transform = `translateY(${(-lift * e).toFixed(2)}px)`;
        }
      },
    };
  },
});

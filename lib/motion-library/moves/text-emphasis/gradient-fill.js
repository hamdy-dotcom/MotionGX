// Gradient fill: the payoff word or phrase filled with a brand gradient — background-clip:text, fill transparent, a
// linear-gradient (90° by default) between the look's colours (accent → accent-2, accent → ink at 45 %, a three-stop
// good → accent → accent-2, or any list of look colours). Static: the stops drift 0 → 10 % over the hold. Sweep: the
// background is 200 % wide — the ink half first, the gradient half after — and slides 100 % → 0 % over 0.8 s
// power2.out once the word has landed, so the colour arrives from the reading edge (RTL mirrors it). Wipe-in: the word
// itself appears through a 20 px feathered mask edge (0 → 100 % over 0.5 s power2.out) with a slight glow, then the
// gradient slides slowly through the hold. The phrase is filled whole — Arabic-safe.
// Source: MengTo/Skills web-design/beautiful-shadows (MIT: bg-clip-text gradient headline) + prompt-motion
// melvynx-this-is-insane-with, sudo-kiran-i-have-asked-opus (reference) — our own code.
ML.define({
  id: "text-emphasis.gradient-fill",
  category: "text-emphasis",
  name: "Word filled with a brand gradient",
  does: "The payoff word or phrase is filled with a brand gradient — static, sweeping across after it lands, or wiping in with the gradient.",
  says: ["focus", "brand", "result", "luxury", "reveal"],
  energy: 2,
  targets: ["word", "line", "headline"],
  duration: [0.6, 3],
  params: {
    stops: { type: "text", default: "brand" },
    reveal: { type: "choice", options: ["none", "sweep", "wipe-in"], default: "sweep" },
    direction: { type: "choice", options: ["ltr", "rtl", "by-script"], default: "by-script" },
    drift: { type: "bool", default: true },
    angle: { type: "number", range: [0, 180], default: 90, unit: "deg" },
    glow: { type: "bool", default: false },
    delay: { type: "number", range: [0, 0.6], default: 0.15, unit: "s" },
    sweep: { type: "number", range: [0.4, 1.4], default: 0.8, unit: "s" },
  },
  pairs: ["text-in.punchline", "text-emphasis.highlight-sweep"],
  avoid: ["problem"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:web-design/beautiful-shadows", license: "MIT", note: "bg-clip-text gradient headline; reveal variants rebuilt from prompt-motion melvynx-this-is-insane-with + sudo-kiran-i-have-asked-opus (reference)" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const VARS = ["accent", "accent-2", "accent-ink", "ink", "dim", "ground", "panel", "panel-2", "good", "bad", "line", "ring"];
    const v = (n) => { n = String(n).trim().replace(/^var\(|\)$/g, "").replace(/^--x-|^x-|^--/, ""); return VARS.includes(n) ? `var(--x-${n})` : null; };
    const PRESETS = {
      brand: ["var(--x-accent) 0%", "var(--x-accent-2) 100%"],
      "accent-ink": ["var(--x-accent) 0%", "var(--x-ink) 45%", "var(--x-ink) 100%"],
      spectrum: ["var(--x-good) 0%", "var(--x-accent) 50%", "var(--x-accent-2) 100%"],
      warm: ["var(--x-bad) 0%", "var(--x-accent) 100%"],
      ink: ["var(--x-ink) 0%", "var(--x-accent) 100%"],
    };
    let stops = PRESETS[String(p.stops || "brand").trim()];
    if (!stops) {
      const list = String(p.stops).split(/[,\s>]+/).map(v).filter(Boolean);
      stops = list.length >= 2 ? list.map((c, i) => `${c} ${((i / (list.length - 1)) * 100).toFixed(1)}%`) : PRESETS.brand;
    }
    const goRtl = p.direction === "rtl" || (p.direction === "by-script" && rtl);
    const ang = goRtl ? (360 - p.angle) % 360 : p.angle;
    // the stops squeezed into [a, b] % of the image
    const squeeze = (a, b) => stops.map((s) => { const m = s.match(/^(.*)\s([\d.]+)%$/); return `${m[1]} ${(a + (+m[2] / 100) * (b - a)).toFixed(2)}%`; }).join(", ");
    const sweep = p.reveal === "sweep";
    // sweep: [gradient | ink] laid out so the ink half shows first; drift: the gradient 10 % wider than the word
    const image = sweep
      ? `linear-gradient(${ang}deg, ${squeeze(0, 46)}, currentColor 54%, currentColor 100%)`
      : `linear-gradient(${ang}deg, ${squeeze(0, 100)})`;
    Object.assign(el.style, { backgroundImage: image, backgroundRepeat: "no-repeat", webkitBackgroundClip: "text", backgroundClip: "text", webkitTextFillColor: "transparent", });
    // inline-block children (split words, letters) keep the clip; make sure nothing inside repaints its own fill
    el.querySelectorAll("*").forEach((n) => { n.style.webkitTextFillColor = "transparent"; });
    const fs = parseFloat(getComputedStyle(el).fontSize) || 56;
    const t0 = at + p.delay, t1 = t0 + (p.reveal === "wipe-in" ? 0.5 : p.sweep);
    if (p.reveal !== "none") ctx.sfx(t0, "whoosh.soft", 0.3);
    const p2 = (t, a, b) => { const x = ML.lin(t, a, b); return 1 - (1 - x) * (1 - x); };
    // the gradient spans the text itself (a centred line inside a wide block would only see its middle)
    const er = el.getBoundingClientRect(), k = er.width / (el.offsetWidth || 1) || 1, rg = document.createRange(); rg.selectNodeContents(el);
    const tr = rg.getBoundingClientRect(), W = el.offsetWidth || 1;
    const tl = (tr.left - er.left) / k - el.clientLeft, tw = Math.max(1, tr.width / k);
    const feather = Math.min(20 * Math.max(1, fs / 100), tw * 0.2);
    el.style.backgroundSize = `${(sweep ? tw * 2 : p.drift || p.reveal === "wipe-in" ? tw * 1.1 : tw).toFixed(2)}px 100%`;
    return {
      draw(t) {
        const lv = ML.ease(t, end - 0.25, end - 0.05);
        el.style.opacity = (1 - lv).toFixed(4);
        const holdK = ML.lin(t, t1, Math.max(t1 + 0.5, end - 0.25)); // through the hold
        let x; // background-position x, px
        if (sweep) { const q = p2(t, t0, t1); x = goRtl ? tl - tw * q : tl - tw * (1 - q); } // the gradient half slides over the text from the reading edge
        else if (p.drift || p.reveal === "wipe-in") { const q = p.reveal === "wipe-in" ? holdK : ML.lin(t, at, end); x = goRtl ? tl - tw * 0.1 * q : tl - tw * 0.1 * (1 - q); }
        else x = tl;
        el.style.backgroundPosition = `${x.toFixed(2)}px 50%`;
        if (p.reveal === "wipe-in") {
          const w = p2(t, t0, t1);
          if (w >= 1) { el.style.webkitMaskImage = "none"; el.style.maskImage = "none"; }
          else {
            const edge = (goRtl ? W - tl - tw : tl) - feather + w * (tw + feather * 2);
            const dir = goRtl ? "to left" : "to right";
            const m = `linear-gradient(${dir}, #000 ${(edge - feather).toFixed(1)}px, transparent ${edge.toFixed(1)}px)`;
            el.style.webkitMaskImage = m; el.style.maskImage = m;
          }
        }
        const g = p.glow || p.reveal === "wipe-in" ? (p.glow ? 1 : 0.6) * (p.reveal === "wipe-in" ? 1 - 0.6 * ML.lin(t, t1, t1 + 0.4) : ML.lin(t, t0, t1)) : 0;
        el.style.filter = g > 0.01 ? `drop-shadow(0 0 ${(fs * 0.12 * g).toFixed(2)}px color-mix(in srgb, var(--x-accent) ${(45 * g).toFixed(1)}%, transparent))` : "none";
      },
    };
  },
});

// Scanner recolour pass: a translucent vertical scanner band sweeps across the hero object; everything it has passed
// turns iridescent (or the brand's colours, or a heatmap) and small readouts pop up at the points it "detects".
// Rebuilt from the technique: a band 12–18 % of the frame's width (accent-2 at 8 %, 1 px bright edges at 40 %) runs
// from just before the object to just past it over 1–2 s, cubic in-out. The object is twinned: the twin is
// recoloured (a ramp laid over it in the color blend mode, so the picture keeps its light and takes the ramp's hue —
// for iridescent the hue turns with the angle round the object's centre) and clipped to the side the band has passed,
// so the passed region stays recoloured. As the band's leading edge crosses three seeded anchors, small mono labels
// fade in over 0.2 s. Arabic: the sweep runs right to left (the direction param is the reading direction).
// Source: prompt-motion "ismailfahmi — bikin showreel 15 detik" (reference only; rebuilt as our own code).
ML.define({
  id: "mask.scanner-recolor-pass",
  category: "mask",
  name: "Scanner recolour pass",
  does: "A translucent vertical scanner band sweeps across the hero object and everything it has passed turns iridescent, with small labels popping up at detected points.",
  says: ["tech", "proof", "precision", "change"],
  energy: 3,
  targets: ["image", "shape", "stage", "screen"],
  duration: [1, 2.5],
  params: {
    direction: { type: "choice", options: ["ltr", "rtl"], default: "ltr" },
    recolour: { type: "choice", options: ["iridescent", "brand", "heatmap"], default: "iridescent" },
    band_width: { type: "number", range: [12, 18], default: 15, unit: "%" },
    duration: { type: "number", range: [1, 2], default: 1.4, unit: "s" },
    labels: { type: "bool", default: true },
    seed: { type: "number", range: [0, 9999], default: 3 },
  },
  pairs: ["mask.wire-led-scan", "data.count-up"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:ismailfahmi-bikin-showreel-15-detik", license: "reference", note: "our own rebuild: recoloured twin under a color-blend ramp, clipped to the band's passed side" },
  setup(ctx) {
    const { p, at, end, stage } = ctx;
    let el = ctx.el;
    if (!el) return null;
    if (el === stage) el = ctx.scene || stage;
    const host = ctx.scene || stage;
    const W = ctx.f.W, k = Math.min(ctx.f.W, ctx.f.H) / 1080;
    const b = ctx.box(el);
    const rtl = ctx.rtl ? p.direction === "ltr" : p.direction === "rtl";
    const bw = (ML.clamp(+p.band_width, 12, 18) / 100) * W;
    const span = Math.min(ML.clamp(+p.duration, 1, 2), Math.max(0.6, end - at - 0.1));
    const radius = el === host ? "0px" : getComputedStyle(el).borderRadius;

    // the recoloured twin, clipped to the passed side
    const wrap = document.createElement("div");
    wrap.setAttribute("aria-hidden", "true");
    wrap.style.cssText = `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;overflow:hidden;border-radius:${radius};isolation:isolate;pointer-events:none;z-index:3`;
    const twin = el.cloneNode(true);
    ["data-slot", "id"].forEach((a) => twin.removeAttribute(a));
    twin.querySelectorAll("[data-slot]").forEach((n) => n.removeAttribute("data-slot"));
    const TWIN = { iridescent: "saturate(1.25) contrast(1.05)", brand: "contrast(1.08)", heatmap: "grayscale(1) contrast(1.35)" };
    twin.style.cssText = (el.getAttribute("style") || "") + `;position:absolute;inset:0;width:100%;height:100%;margin:0;filter:${TWIN[p.recolour] || TWIN.iridescent};clip-path:none;mask-image:none;translate:none;scale:none;rotate:none;transform:none;opacity:1;visibility:visible`;
    const ramp = document.createElement("div");
    const RAMP = {
      iridescent: "conic-gradient(from 200deg at 50% 50%, var(--x-accent), var(--x-accent-2), var(--x-good), color-mix(in srgb, var(--x-accent-2) 50%, var(--x-bad)), var(--x-accent), var(--x-good), var(--x-accent-2), color-mix(in srgb, var(--x-accent) 50%, var(--x-bad)), var(--x-accent))",
      brand: "linear-gradient(120deg, var(--x-accent), var(--x-accent-2))",
      heatmap: "linear-gradient(0deg, var(--x-accent) 0%, var(--x-good) 45%, color-mix(in srgb, var(--x-good) 50%, var(--x-bad)) 70%, var(--x-bad) 100%)",
    };
    ramp.style.cssText = `position:absolute;inset:0;background:${RAMP[p.recolour] || RAMP.iridescent};mix-blend-mode:color`;
    wrap.append(twin, ramp);
    host.append(wrap);

    // the band: frame-relative width, the object's height and a little more
    const pad = b.h * 0.08;
    const band = document.createElement("div");
    const edge = Math.max(1, 1.5 * k);
    band.style.cssText = `position:absolute;left:0;top:${b.y - pad}px;width:${bw}px;height:${b.h + pad * 2}px;pointer-events:none;z-index:4;background:color-mix(in srgb, var(--x-accent-2) 8%, transparent);border-left:${edge}px solid color-mix(in srgb, var(--x-accent-2) 40%, transparent);border-right:${edge}px solid color-mix(in srgb, var(--x-accent-2) 40%, transparent);box-sizing:border-box;visibility:hidden`;
    host.append(band);
    // band x (its left edge, stage px) over the pass; the leading edge is its right edge (left in RTL)
    const x0 = rtl ? b.x + b.w : b.x - bw, x1 = rtl ? b.x - bw : b.x + b.w;
    const bandX = (t) => x0 + (x1 - x0) * ML.ease(t, at, at + span);
    const lead = (x) => (rtl ? x : x + bw);

    // the readouts at seeded anchors
    const labels = [];
    if (p.labels) {
      const fs = Math.max(14, 19 * k), s = +p.seed || 0;
      for (let i = 0; i < 3; i++) {
        const ax = 0.18 + 0.64 * ((i + 0.25 + 0.5 * ML.rnd(i, s + 1)) / 3), ay = 0.22 + 0.56 * ML.rnd(i, s + 7);
        const px = b.x + (rtl ? 1 - ax : ax) * b.w, py = b.y + ay * b.h;
        const node = document.createElement("div");
        node.setAttribute("aria-hidden", "true");
        node.style.cssText = `position:absolute;left:${px}px;top:${py}px;z-index:5;pointer-events:none;display:flex;align-items:center;gap:${8 * k}px;direction:ltr;visibility:hidden;${rtl ? "flex-direction:row-reverse;translate:-100% -50%" : "translate:0 -50%"}`;
        const dot = document.createElement("span");
        const d = Math.max(8, 12 * k);
        dot.style.cssText = `width:${d}px;height:${d}px;border-radius:50%;border:${edge}px solid var(--x-accent-ink);background:var(--x-accent);box-shadow:0 0 0 ${3 * k}px color-mix(in srgb, var(--x-accent) 25%, transparent);flex:none`;
        const tag = document.createElement("span");
        tag.textContent = `${(86 + 13 * ML.rnd(i, s + 13)).toFixed(1)}%`;
        tag.style.cssText = `font:var(--x-label-weight) ${fs}px var(--x-mono-font);letter-spacing:0.04em;color:var(--x-ink);background:color-mix(in srgb, var(--x-panel) 82%, transparent);border:${edge}px solid color-mix(in srgb, var(--x-accent-2) 40%, transparent);border-radius:${6 * k}px;padding:${3 * k}px ${8 * k}px;white-space:nowrap`;
        node.append(dot, tag);
        host.append(node);
        // when the leading edge crosses this anchor
        let tc = at + span * 0.5;
        for (let q = 0; q <= 200; q++) { const tt = at + (span * q) / 200; if ((rtl ? lead(bandX(tt)) <= px : lead(bandX(tt)) >= px)) { tc = tt; break; } }
        labels.push({ node, tc });
      }
      labels.sort((a, c) => a.tc - c.tc);
      if (labels[0]) ctx.sfx(labels[0].tc, "blip", 0.18);
    }
    ctx.sfx(at, "whoosh.soft", 0.35);
    return {
      draw(t) {
        const started = t >= at - 1e-6;
        const bx = bandX(t), L = lead(bx);
        band.style.visibility = started && t <= at + span ? "visible" : "hidden";
        band.style.translate = `${bx.toFixed(2)}px 0`;
        // the passed side of the object
        const cut = ML.clamp(rtl ? (L - b.x) / b.w : (b.x + b.w - L) / b.w) * 100;
        wrap.style.visibility = started ? "visible" : "hidden";
        wrap.style.clipPath = rtl ? `inset(0 0 0 ${cut.toFixed(3)}%)` : `inset(0 ${cut.toFixed(3)}% 0 0)`;
        for (const l of labels) {
          const o = ML.ease(t, l.tc, l.tc + 0.2);
          l.node.style.visibility = o > 0.002 ? "visible" : "hidden";
          l.node.style.opacity = o.toFixed(4);
        }
      },
    };
  },
});

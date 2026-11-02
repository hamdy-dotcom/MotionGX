// Fit-to-width big line: one line — the name, the web address, the one-word ask — sized so it spans the frame width
// exactly. Ported from MengTo/Skills' fit(el, max) (html-explainer-video explainer.js and html-reel reel-clock.js):
// the run's width is measured with a Range, inner transforms removed while measuring, nowrap, and the size scaled by
// max / width. Styles: "heavy" (the reel's one heavy size, widest line within max_width of the frame), "mono-chip"
// (the end card's address chip: mono, weight 600, −0.02em, padding .28em .5em, a small radius, inverted — ink ground,
// ground text — fitted with its padding), "condensed" (the ask keyword in a tall condensed cut). It enters with the
// look's own entrance ("look", 0.35 s) or a hard cut, and keeps moving while it holds (a slow drift) so the end is never
// a dead frame.
// Source: MengTo/Skills html-explainer-video scripts/explainer.js#fit + html-reel scripts/reel-clock.js#fit (MIT).
ML.define({
  id: "kinetic.fit-width-type",
  category: "kinetic",
  name: "Fit-to-width big line",
  does: "A single line — the name, the web address or the one-word ask — is sized so it exactly spans the frame width.",
  says: ["brand", "urgency", "result"],
  energy: 4,
  targets: ["headline", "word", "label", "logo"],
  duration: [1, 4],
  params: {
    style: { type: "choice", options: ["heavy", "mono-chip", "condensed"], default: "heavy" },
    max_width: { type: "number", range: [0.8, 0.96], default: 0.9, unit: "frame" },
    enter: { type: "choice", options: ["look", "cut"], default: "look" },
  },
  pairs: ["text-in.punchline", "camera.slow-push"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "land",
  source: { from: "MengTo/Skills:html-explainer-video/scripts/explainer.js#fit + html-reel/scripts/reel-clock.js#fit", license: "MIT" },
  setup(ctx) {
    const { el, p, at, end, stage, f } = ctx;
    if (!el) return null;
    const k = stage.getBoundingClientRect().width / (stage.offsetWidth || 1) || 1;
    const arabic = ML.ARABIC.test(el.textContent || "");
    const maxW = Math.min(ML.clamp(p.max_width, 0.8, 0.96), 0.96) * f.W;
    // the line becomes a nowrap run inside the target; the target spans maxW, centred on the stage
    const run = document.createElement("span");
    while (el.firstChild) run.append(el.firstChild);
    el.append(run);
    Object.assign(el.style, { display: "block", width: maxW + "px", maxWidth: "none", marginInlineStart: "0", marginInlineEnd: "0", textAlign: "center", whiteSpace: "nowrap", position: "relative" });
    el.style.alignSelf = "center";
    el.style.left = "0px";
    el.style.left = (f.W / 2 - maxW / 2 - ctx.box(el).x).toFixed(1) + "px"; // centred on the stage, wherever it sits
    Object.assign(run.style, { display: "inline-block", whiteSpace: "nowrap", lineHeight: "1" });
    let start; // a start size larger than any fit, capped by the height a single line may take
    if (p.style === "mono-chip") {
      Object.assign(run.style, { fontFamily: "var(--x-mono-font)", fontWeight: "600", letterSpacing: arabic ? "0" : "-0.02em", padding: "0.28em 0.5em", borderRadius: "min(var(--x-radius), 0.22em)", background: "var(--x-ink)", color: "var(--x-ground)" });
      start = Math.min(f.H * 0.14, f.W * 0.2);
    } else if (p.style === "condensed") {
      Object.assign(run.style, { fontFamily: "var(--x-head-font)", fontWeight: "max(var(--x-head-weight), 700)", fontStretch: "condensed", textTransform: arabic ? "none" : "uppercase", letterSpacing: arabic ? "0" : "-0.04em", lineHeight: "0.86", color: "var(--x-ink)" });
      start = Math.min(f.H * 0.3, f.W * 0.45);
    } else {
      Object.assign(run.style, { fontFamily: "var(--x-head-font)", fontWeight: "max(var(--x-head-weight), 800)", letterSpacing: arabic ? "0" : "var(--x-hero-track)", textTransform: "var(--x-head-case)", color: "var(--x-ink)" });
      start = Math.min(f.H * 0.24, f.W * 0.4);
    }
    run.style.fontSize = start.toFixed(1) + "px";
    // fit (reel-clock): width measured with every inner transform removed; the chip scales with its em padding
    const measure = () => {
      const moved = [...run.querySelectorAll("*")].filter((x) => x.style.transform || x.style.translate).map((x) => [x, x.style.transform, x.style.translate]);
      moved.forEach(([x]) => { x.style.transform = "none"; x.style.translate = "none"; });
      let w;
      if (p.style === "mono-chip") w = run.getBoundingClientRect().width / k;
      else { const r = document.createRange(); r.selectNodeContents(run); w = r.getBoundingClientRect().width / k; }
      moved.forEach(([x, tr, tl]) => { x.style.transform = tr; x.style.translate = tl; });
      return w;
    };
    let size = start;
    for (let i = 0; i < 3; i++) { const w = measure(); if (!w) break; size = (size * maxW) / w; run.style.fontSize = size.toFixed(2) + "px"; }
    const leave = Math.max(at + 0.5, end - 0.3);
    ctx.sfx(at, "land", 0.4);
    return {
      draw(t) {
        let v;
        if (p.enter === "cut") {
          v = t >= at && t < leave + 0.12 ? 1 : 0;
          run.style.visibility = v ? "visible" : "hidden";
        } else v = ML.show(run, t, at, leave, { dur: 0.35 });
        // keep the end moving: a slow drift while it holds
        const drift = ML.lin(t, at + 0.35, end) * f.H * 0.012;
        el.style.translate = v ? `0 ${(-drift).toFixed(2)}px` : "none";
      },
    };
  },
});

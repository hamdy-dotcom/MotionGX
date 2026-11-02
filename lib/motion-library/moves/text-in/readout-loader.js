// Readout loader: a restrained signal-acquisition state before the title. Centred on the target: a small spaced label
// ("ACQUIRING SIGNAL"), a zero-padded mono readout ("000550 HZ") counting 0 → target on power2 in-out (rounded each
// frame), and a hairline rule whose fill grows in step with the count. Release: label and readout fade up, the rule
// collapses to its centre, then the target decodes — each character resolving from a compressed, blurred mark to its
// shape in reading order (Arabic per word: its letters join). Short by design; it never blocks.
// Source: MengTo/Skills web-design/editorial-portfolio-chapters ARTICLE.md §1 "Signal Acquisition Loader Into a
// Decoded Hero" (MIT) — the technique as written there, our own code.
ML.define({
  id: "text-in.readout-loader",
  category: "text-in",
  name: "Readout loader",
  does: "A small 'acquiring signal' label and a zero-padded mono readout count up over a hairline progress rule, then release into the title.",
  says: ["tech", "time", "arrival", "precision"],
  energy: 2,
  targets: ["number", "label", "stage"],
  duration: [1.2, 3],
  params: {
    unit: { type: "choice", options: ["HZ", "%", "ms", "custom"], default: "HZ" },
    unit_text: { type: "text", default: "" },
    label: { type: "text", default: "" },
    digits: { type: "number", range: [3, 8], default: 6 },
    duration: { type: "number", range: [1, 2.5], default: 1.5, unit: "s" },
    target: { type: "number", range: [0, 999999], default: 550 },
    rule_width: { type: "number", range: [100, 300], default: 180, unit: "px" },
  },
  pairs: ["text-in.scramble", "text-in.dot-matrix-light"],
  avoid: ["playful", "celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "MengTo/Skills:web-design/editorial-portfolio-chapters", license: "MIT", note: "ARTICLE.md §1 signal acquisition loader; our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    const host = ctx.scene || ctx.stage, W = ctx.f.W, H = ctx.f.H;
    const isStage = !el || el === ctx.stage;
    const b = isStage ? { x: 0, y: 0, w: W, h: H } : ctx.box(el);
    const k = Math.min(W, H) / 1080;
    const readSize = 40 * k, labSize = 19 * k, ruleW = p.rule_width * (readSize / 22);
    // the loader, centred on the target
    const box = document.createElement("div");
    box.setAttribute("aria-hidden", "true");
    Object.assign(box.style, { position: "absolute", left: (b.x + b.w / 2).toFixed(1) + "px", top: (b.y + b.h / 2).toFixed(1) + "px", translate: "-50% -50%", display: "flex", flexDirection: "column", alignItems: "center", gap: (16 * k).toFixed(1) + "px", pointerEvents: "none", zIndex: "4", whiteSpace: "nowrap" });
    const label = document.createElement("div");
    label.textContent = p.label || (rtl ? "جاري الالتقاط" : "Acquiring signal");
    Object.assign(label.style, { font: `var(--x-label-weight) ${labSize.toFixed(1)}px var(--x-label-font)`, letterSpacing: rtl ? "0" : "0.35em", textTransform: rtl ? "none" : "uppercase", color: "var(--x-dim)" });
    const read = document.createElement("div");
    read.dir = "ltr";
    Object.assign(read.style, { font: `500 ${readSize.toFixed(1)}px var(--x-mono-font)`, letterSpacing: "0.35em", color: "var(--x-ink)", fontVariantNumeric: "tabular-nums" });
    const rule = document.createElement("div"), fill = document.createElement("div");
    Object.assign(rule.style, { width: ruleW.toFixed(1) + "px", height: Math.max(1, k).toFixed(1) + "px", background: "color-mix(in srgb, var(--x-ink) 15%, transparent)", position: "relative" });
    Object.assign(fill.style, { position: "absolute", inset: "0", background: "var(--x-accent)", transformOrigin: rtl ? "100% 50%" : "0 50%" });
    rule.append(fill);
    box.append(label, read, rule);
    host.append(box);
    const unit = p.unit === "custom" ? p.unit_text : p.unit;
    const target = Math.max(0, Math.round(p.target)), digits = Math.max(Math.round(p.digits), String(target).length);
    const inOut2 = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    const R = at + p.duration, D = R + 0.2;
    // the target's decode: characters (Latin) or words (Arabic) from compressed blurred marks
    let units = [];
    const isText = !isStage && !(el instanceof SVGElement) && el.tagName !== "IMG";
    if (isText) {
      units = ML.split(el, "chars");
      // a Latin word / number split into letters inside right-to-left text keeps its own left-to-right order
      for (const w of el.querySelectorAll(".ml-w")) if (!ML.ARABIC.test(w.textContent)) w.style.direction = "ltr";
    }
    else if (!isStage) units = [el];
    units.forEach((u) => (u.style.transformOrigin = "50% 60%"));
    const step = units.length > 1 ? Math.min(0.05, 0.45 / units.length) : 0;
    const dec = units.map((_, i) => D + i * step);
    ctx.sfx(at, "blip", 0.25);
    ctx.sfx(R, "blip", 0.3);
    if (units.length) ctx.sfx(D, "tap", 0.3);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        // loader
        const inA = ML.ease(t, at, at + 0.25), rel = ML.ease(t, R, R + 0.3);
        box.style.visibility = t >= at && rel < 1 ? "visible" : "hidden";
        const prog = inOut2(ML.lin(t, at, R));
        read.textContent = String(Math.round(target * prog)).padStart(digits, "0") + (unit ? " " + unit : "");
        const textA = inA * (1 - rel);
        label.style.opacity = read.style.opacity = textA.toFixed(4);
        label.style.translate = read.style.translate = `0 ${(-8 * k * rel).toFixed(2)}px`;
        rule.style.opacity = inA.toFixed(4);
        rule.style.scale = rel > 0 ? `${(1 - rel).toFixed(4)} 1` : "none";
        fill.style.scale = `${prog.toFixed(4)} 1`;
        // the target decodes after the release
        if (!isStage) el.style.opacity = (1 - leave).toFixed(4);
        units.forEach((u, i) => {
          const x = ML.out(t, dec[i], dec[i] + 0.32);
          u.style.opacity = ML.clamp(x * 1.6).toFixed(4);
          u.style.scale = x >= 1 ? "none" : `${(0.25 + 0.75 * x).toFixed(4)} 1`;
          u.style.filter = x >= 1 ? "none" : `blur(${((1 - x) * 8 * k).toFixed(2)}px)`;
        });
      },
    };
  },
});

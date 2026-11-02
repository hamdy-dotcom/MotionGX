// CTA button rise: the call-to-action button rises 60 px and fades in over 0.5 s at start + min(0.9, d·0.2); on scenes
// longer than 3 s it pulses (scale 1.06 → 1, power2 out) every 0.5 s from the beat nearest start + 1.5 to end − 1.5;
// the site address types out at start + min(1.3, d·0.25) over min(1, d·0.3), its box measured at full length first so
// nothing reflows while it types. A port of MotionGX's live-engine R.cta (recipes.js) onto one clock.
// Source: MotionGX lib/live-engine/worker/vendor/recipes.js#R.cta + kit.js K.pulse / K.type (own).
ML.define({
  id: "ui.cta-button-rise",
  category: "ui",
  name: "CTA button rises, URL types",
  does: "The call-to-action button rises in, pulses on the beat, and the site address types out.",
  says: ["urgency", "step", "brand"],
  energy: 3,
  targets: ["label", "line"],
  duration: [1.5, 6],
  params: {
    pulse: { type: "bool", default: true },
    url: { type: "text", default: "example.com" },
    button_style: { type: "choice", options: ["button", "as-is"], default: "button" },
    rise: { type: "number", range: [20, 100], default: 60, unit: "px" },
    caret: { type: "bool", default: false },
  },
  pairs: ["ui.cursor-glide-click", "element.logo-outro"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "own:lib/live-engine/worker/vendor/recipes.js#R.cta", license: "own" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el || el === ctx.stage) return null;
    const doc = document, d = end - at;
    // the button: the target, dressed as a pill in the look's accent unless asked to stay as it is
    if (p.button_style === "button") {
      el.style.display = "inline-block";
      el.style.justifySelf = el.style.alignSelf = "center";
      el.style.width = "fit-content";
      el.style.background = "var(--x-accent)";
      el.style.color = "var(--x-accent-ink)";
      el.style.borderRadius = "var(--x-radius-s)";
      el.style.padding = "0.55em 1.3em";
      el.style.boxShadow = "var(--x-shadow)";
      el.style.marginInline = "auto";
    }
    el.style.transformOrigin = "50% 50%";
    // the address under it, measured at full length so the line never grows while it types
    const text = String(p.url || "example.com");
    const url = doc.createElement("div");
    url.dir = "ltr";
    url.style.cssText = "font:var(--x-label-weight) calc(var(--x-body-size) * 1.1) var(--x-mono-font);color:var(--x-dim);white-space:pre;text-align:center;margin:0.6em auto 0;width:fit-content;unicode-bidi:isolate;";
    url.textContent = text;
    el.after(url);
    url.style.width = `calc(${Math.ceil(ctx.box(url).w + 1)}px + 0.15em)`;
    url.style.textAlign = "left";
    const typedSpan = doc.createElement("span"), caret = doc.createElement("span");
    caret.style.cssText = "display:inline-block;width:0.08em;height:1em;vertical-align:-0.12em;background:var(--x-accent);margin-left:0.04em;";
    url.textContent = ""; url.append(typedSpan, caret);

    const tBtn = at + Math.min(0.9, d * 0.2), tUrl = at + Math.min(1.3, d * 0.25), dUrl = Math.min(1, d * 0.3);
    const snap = (x) => Math.round(x / 0.5) * 0.5;
    const pulses = [];
    if (p.pulse && d > 3) for (let x = snap(at + 1.5); x < end - 1.5 - 1e-6; x += 0.5) pulses.push(x);
    ctx.sfx(tBtn, "pop", 0.45);
    ctx.sfx(tUrl, "key", 0.25);
    ctx.sfx(tUrl + dUrl * 0.6, "key", 0.2);
    const power2out = (x) => 1 - (1 - x) * (1 - x);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        // fromTo y 60 → 0, opacity 0 → 1, 0.5 s (GSAP's default power1.out)
        const x = ML.lin(t, tBtn, tBtn + 0.5), e = 1 - (1 - x) * (1 - x);
        let sc = 1;
        for (const pt of pulses) if (t >= pt && t < pt + 0.5) sc = 1.06 - 0.06 * power2out(ML.clamp((t - pt) / 0.425));
        el.style.opacity = (e * (1 - leave)).toFixed(4);
        el.style.translate = `0 ${((1 - e) * p.rise).toFixed(2)}px`;
        el.style.scale = sc === 1 ? "none" : sc.toFixed(4);
        typedSpan.textContent = ML.typed(text, t, tUrl, tUrl + dUrl);
        url.style.opacity = (t < tUrl ? 0 : 1 - leave).toFixed(4);
        const typing = t >= tUrl && t < tUrl + dUrl;
        caret.style.opacity = p.caret && t >= tUrl ? String(typing ? 1 : ML.blink(t - tUrl - dUrl, 1)) : "0";
      },
    };
  },
});

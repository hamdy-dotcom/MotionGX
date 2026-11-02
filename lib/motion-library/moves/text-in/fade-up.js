// Plain fade up: the text simply surfaces, no travel — stillness is the whole gesture. From transparency, from the
// dark (its colour climbs from the ground to the ink) or from grey (half opacity in the dim colour). Styles: plain;
// film-title (tracked caps whose tracking tightens as it fades, a short hairline rule drawing under the centre);
// caption (bold with a soft shadow, a 6 px blur clearing in 0.5 s); meme (heavy accent caps with a hard offset shadow
// and outline, settling from 1.08). It holds, then fades out the same way. Sits where asked inside its own region.
// Source: prompt-motion fade-up family (triglyceee, kamstudiolabs, anas0ra, leadnotifi, davidshulmanfl) — our own rebuild.
ML.define({
  id: "text-in.fade-up",
  category: "text-in",
  name: "Plain fade up",
  does: "Text simply surfaces out of darkness or transparency with no movement — film titles, story captions, corner taglines, meme titles.",
  says: ["calm", "story", "luxury", "time", "ambient"],
  energy: 1,
  targets: ["headline", "line", "label", "logo"],
  duration: [0.8, 4],
  params: {
    duration: { type: "number", range: [0.3, 1.5], default: 0.6, unit: "s" },
    ease: { type: "choice", options: ["sine.inOut", "power1.inOut", "ease-out"], default: "ease-out" },
    start: { type: "choice", options: ["transparent", "dark", "grey"], default: "transparent" },
    position: { type: "choice", options: ["center", "top", "bottom", "corner"], default: "center" },
    tracking: { type: "number", range: [0, 0.5], default: 0, unit: "em" },
    rule: { type: "bool", default: false },
    style: { type: "choice", options: ["plain", "film-title", "caption", "meme"], default: "plain" },
    hold: { type: "number", range: [0.5, 3], default: 1.5, unit: "s" },
  },
  pairs: ["background.grain", "camera.drift"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "prompt-motion:triglyceee-fascinant-ce-que-peut", license: "reference", note: "our own rebuild of the plain fade family" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const S = el.style;
    // where it sits: inside its own region only (the head band is a flex column)
    if (p.position === "top") { S.marginBottom = "auto"; }
    else if (p.position === "bottom") { S.marginTop = "auto"; }
    else if (p.position === "corner") { S.marginTop = "auto"; S.alignSelf = "flex-start"; S.textAlign = "start"; }
    // the style
    const size0 = parseFloat(getComputedStyle(el).fontSize);
    let track = p.tracking;
    if (p.style === "film-title") { if (!rtl) S.textTransform = "uppercase"; track = rtl ? 0 : Math.max(track, 0.3); S.fontSize = (size0 * 0.55).toFixed(1) + "px"; }
    if (p.style === "caption") { S.fontWeight = "700"; S.textShadow = "0 0.08em 0.3em color-mix(in srgb, var(--x-ink) 30%, transparent)"; }
    if (p.style === "meme") { S.fontWeight = "900"; if (!rtl) S.textTransform = "uppercase"; S.color = "var(--x-accent)"; S.webkitTextStroke = "max(2px, 0.02em) var(--x-ink)"; S.textShadow = "0.04em 0.04em 0 var(--x-ink)"; }
    if (rtl) track = 0; // tracking pulls Arabic joins apart
    const trackFrom = track > 0 ? track + 0.05 : 0;
    if (track > 0) S.letterSpacing = trackFrom + "em";
    const room = el.parentElement ? el.parentElement.clientWidth : 0;
    if (room) ML.fit(el, room * 0.98);
    const rule = p.rule || p.style === "film-title";
    let line = null;
    if (rule) {
      S.position = "relative";
      line = document.createElement("i");
      Object.assign(line.style, { position: "absolute", left: "35%", width: "30%", bottom: "-0.35em", height: "max(1px, 0.02em)", background: "color-mix(in srgb, var(--x-ink) 55%, transparent)", transformOrigin: "50% 50%", pointerEvents: "none" });
      el.append(line);
    }
    const D = p.duration;
    const curve = p.ease === "sine.inOut" ? (x) => -(Math.cos(Math.PI * x) - 1) / 2 : p.ease === "power1.inOut" ? (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2) : (x) => 1 - Math.pow(1 - x, 3);
    const outD = Math.min(0.6, D);
    const outAt = Math.max(at + D + 0.2, Math.min(at + D + p.hold, end - outD));
    if (p.style === "meme") ctx.sfx(at, "pop.soft", 0.3);
    return {
      draw(t) {
        const u = curve(ML.lin(t, at, at + D)), q = curve(ML.lin(t, outAt, outAt + outD)), v = u * (1 - q);
        let op = v, col = "";
        if (p.start === "dark") { op = ML.clamp(v * 3); col = `color-mix(in srgb, ${p.style === "meme" ? "var(--x-accent)" : "var(--x-ink)"} ${(v * 100).toFixed(1)}%, var(--x-ground))`; }
        else if (p.start === "grey") { op = t < at ? 0 : 0.5 + 0.5 * v; col = `color-mix(in srgb, ${p.style === "meme" ? "var(--x-accent)" : "var(--x-ink)"} ${(v * 100).toFixed(1)}%, var(--x-dim))`; if (q >= 1) op = 0; }
        S.opacity = op.toFixed(4);
        if (p.style === "meme") S.color = col || "var(--x-accent)"; else S.color = col;
        if (track > 0) S.letterSpacing = (trackFrom + (track - trackFrom) * u).toFixed(4) + "em";
        const blur = p.style === "caption" ? (1 - ML.lin(t, at, at + Math.min(0.5, D))) * 6 : 0;
        S.filter = blur > 0.05 && t >= at ? `blur(${blur.toFixed(2)}px)` : "none";
        S.scale = p.style === "meme" ? (1.08 - 0.08 * u).toFixed(4) : "none";
        if (line) line.style.scale = `${ML.out(t, at + D * 0.8, at + D * 0.8 + 0.5).toFixed(4)} 1`;
      },
    };
  },
});

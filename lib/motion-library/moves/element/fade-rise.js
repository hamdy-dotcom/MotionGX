// Fade rise — the workhorse calm entrance. Elements fade in while drifting a short distance and decelerate hard into
// place, one after another (a pure fade at distance 0). Ported from MengTo/Skills html-explainer-video
// scripts/explainer.js show() (MIT):
//   · "rise": p = expo-out 1 − 2^(−10x) over 0.55 s; opacity = min(1, 1.5 p) so it is opaque by ~⅔; translateY =
//     (1 − p) · 26 px; leaving: drifts up dist · 0.5 while it fades, cubic in-out 0.22 s;
//   · "fade": cubic in-out 0.6–0.8 s, translateY = (1 − p) · dist · 0.3 (~4 px), leaving a 0.22 s fade.
// The web / ads values from the MengTo web-design demos (agency-grid, mesh-gradient, number-details, dither-background):
// dist 12–36 px (0 for backdrops, 14–20 rows, 40–50 panels), 0.4–1.2 s on power2 / power3 / power4 / quart out,
// siblings staggered 0.05–0.25 s, an optional 6–8 px blur on supporting blocks (never on pictures); a header comes
// from above. Exit: drift-up, reverse (y 0 → 30, 0.6 s power3.in) or a fade. Small distances + hard deceleration
// keep it calm. Also MotionGX's own studio-engine scenes.js fadeIn.
ML.define({
  id: "element.fade-rise",
  category: "element",
  name: "Fade rise",
  does: "Elements fade in while drifting up a short distance and decelerate into place, one after another - the workhorse calm entrance (pure fade at distance 0).",
  says: ["arrival", "calm", "simplicity", "list", "luxury", "trust"],
  energy: 1,
  targets: ["headline", "line", "label", "card", "image", "screen", "list", "number", "logo"],
  duration: [0.4, 2],
  params: {
    preset: { type: "choice", options: ["rise", "fade"], default: "rise" },
    distance: { type: "number", range: [0, 50], default: 26, unit: "px" },
    duration: { type: "number", range: [0.3, 1.2], default: 0.6, unit: "s" },
    ease: { type: "choice", options: ["expo.out", "power2.out", "power3.out", "power4.out", "quart.out", "cubic-in-out"], default: "expo.out" },
    direction: { type: "choice", options: ["up", "down"], default: "up" },
    stagger: { type: "number", range: [0.05, 0.25], default: 0.1, unit: "s" },
    by: { type: "choice", options: ["auto", "whole", "children", "words"], default: "auto" },
    blur: { type: "number", range: [0, 8], default: 0, unit: "px" },
    exit: { type: "choice", options: ["drift-up", "reverse", "fade", "none"], default: "drift-up" },
  },
  pairs: ["text-in.punchline", "element.stagger-list", "camera.push-in"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:agent-skills/media/html-explainer-video/scripts/explainer.js#show", license: "MIT", note: "web values from MengTo/Skills agency-grid-layout-minimal, mesh-gradient-dark-blue-clean, number-details, dither-background demos; MotionGX studio-engine scenes.js#fadeIn" },
  setup(ctx) {
    const { p, at, end, f } = ctx;
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    if (!el) return null;
    const k = Math.min(f.W, f.H) / 1080;
    // what arrives: the whole element, its children one after another, or its words (Arabic words stay whole)
    const kids = [...el.children].filter((c) => c.offsetWidth > 0 || c.offsetHeight > 0);
    const by = p.by === "auto" ? (kids.length >= 2 && el.tagName !== "svg" ? "children" : "whole") : p.by;
    let items = by === "children" && kids.length ? kids : by === "words" ? ML.split(el, "words") : [el];
    if (!items.length) items = [el];
    const isPic = (e) => e.tagName === "IMG" || e.tagName === "VIDEO" || e.tagName === "CANVAS" || !!e.querySelector?.("img,video,canvas");
    const EASE = {
      "expo.out": (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
      "power2.out": (x) => 1 - Math.pow(1 - x, 3),
      "power3.out": (x) => 1 - Math.pow(1 - x, 4),
      "power4.out": (x) => 1 - Math.pow(1 - x, 5),
      "quart.out": (x) => 1 - Math.pow(1 - x, 4),
      "cubic-in-out": (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    };
    const fade = p.preset === "fade";
    const curve = EASE[fade && p.ease === "expo.out" ? "cubic-in-out" : p.ease] || EASE["expo.out"];
    const dur = ML.clamp(p.duration, 0.3, 1.2) * (fade && p.duration === 0.6 ? 1.2 : 1);
    const dist = ML.clamp(p.distance, 0, 50) * k * (fade ? 0.3 : 1) * (p.direction === "down" ? -1 : 1);
    const st = ML.clamp(p.stagger, 0.05, 0.25);
    const blur = ML.clamp(p.blur, 0, 8) * k;
    const times = items.map((_, i) => at + i * st);
    // leaving: the last arrival is done first; the next thing may start 0.22 s after the leave
    const exitDur = p.exit === "reverse" ? 0.6 : 0.22;
    const leave = p.exit === "none" || !Number.isFinite(end) ? Infinity : Math.max(times[times.length - 1] + dur, end - exitDur - 0.04);
    times.forEach((t, i) => i % 3 === 0 && ctx.sfx(t, "tap", 0.18));
    return {
      draw(t) {
        items.forEach((e, i) => {
          const a = times[i];
          if (t < a) { e.style.opacity = "0"; e.style.translate = `0 ${dist.toFixed(2)}px`; e.style.filter = "none"; return; }
          const x = ML.lin(t, a, a + dur), q = curve(x);
          let o = fade ? q : Math.min(1, 1.5 * q), y = (1 - q) * dist, b = blur && !isPic(e) ? (1 - q) * blur : 0;
          if (t >= leave) {
            const u = ML.lin(t, leave, leave + exitDur);
            if (p.exit === "drift-up") { const v = ML.ease(t, leave, leave + exitDur); o *= 1 - v; y -= v * Math.abs(dist || 26 * k) * 0.5; }
            else if (p.exit === "reverse") { const v = u * u * u * u; o *= 1 - v; y += v * 30 * k; }
            else o *= 1 - ML.ease(t, leave, leave + exitDur);
          }
          e.style.opacity = o.toFixed(4);
          e.style.translate = Math.abs(y) < 0.01 ? "none" : `0 ${y.toFixed(2)}px`;
          e.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : "none";
        });
      },
    };
  },
});

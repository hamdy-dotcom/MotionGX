// Underlay reveal: the next section is already sitting underneath; the current one slides away (y 0 -> -100% over
// 0.9-1.2 s power3.inOut) and uncovers it while it makes its own small counter-move — it rises the last `offset`
// (8-20 %, 12 default) of the way into place and goes autoAlpha .85 -> 1. That lag is what reads as a reveal rather
// than a push (the footer parallax of cinematic scroll storytelling: yPercent -12 -> 0 against the page scrolling up,
// which on a fixed frame is the underlay rising slower than the cover). The move goes on the incoming scene: the
// cover is the film's previous scene on the look's ground, or, on the first scene, a plate in the look's ink. Ideal into
// the end card. The cover is styled by a stylesheet rule that holds only while this scene is displayed, so nothing is
// left on another scene when a frame far from this one is drawn.
// Source: MengTo/Skills web-design/cinematic-scroll-storytelling SKILL.md (MIT: initFooterReveal).
ML.define({
  id: "transition.underlay-reveal",
  category: "transition",
  name: "Underlay reveal",
  does: "The next section is already sitting underneath; as the current scene slides away it is uncovered, itself rising slightly into place.",
  says: ["transition", "story", "result", "reveal"],
  energy: 2,
  targets: ["scene"],
  duration: [0.9, 1.4],
  params: {
    direction: { type: "choice", options: ["up", "down"], default: "up" },
    offset: { type: "number", range: [8, 20], default: 12, unit: "%" },
    duration: { type: "number", range: [0.9, 1.2], default: 1, unit: "s" },
  },
  pairs: ["transition.crossfade", "camera.push-in"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/web-design/cinematic-scroll-storytelling", license: "MIT", note: "initFooterReveal (yPercent -12 -> 0, autoAlpha .85 -> 1) as a scene reveal" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const D = ML.clamp(p.duration, 0.9, 1.2), off = ML.clamp(p.offset, 8, 20) / 100, sign = p.direction === "down" ? 1 : -1;
    const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2); // power3.inOut
    // the cover: the film's previous scene, else a plate (the look's ink, a hairline of accent on its trailing edge)
    let prev = scene !== stage ? scene.previousElementSibling : null;
    while (prev && !(prev.classList && prev.classList.contains("ml-scene"))) prev = prev.previousElementSibling;
    let plate = null;
    if (!prev) {
      plate = document.createElement("div");
      const edge = sign < 0 ? "bottom" : "top";
      plate.style.cssText = `position:absolute;left:0;top:0;width:${f.W}px;height:${f.H}px;pointer-events:none;z-index:8;background:var(--x-ink);border-${edge}:${Math.max(4, Math.round(f.H * 0.004))}px solid var(--x-accent);box-shadow:0 ${-sign * 30}px 80px -20px color-mix(in srgb, var(--x-device) 50%, transparent)`;
      stage.append(plate);
    }
    // the rule: while this scene is on, its cover sits above it and takes its offset from a variable draw(t) sets
    const uid = "ml-uc-" + Math.floor(ML.rnd(at * 97 + off, 5) * 1e9).toString(36);
    if (scene !== stage) {
      scene.setAttribute(`data-${uid}`, "");
      (prev || plate).setAttribute(`data-${uid}-cover`, "");
      const css = document.createElement("style");
      css.textContent = prev
        ? `[data-${uid}-cover]:has(~ [data-${uid}][style*="display: block"]) { display: block !important; opacity: 1 !important; z-index: 8; translate: 0 var(--${uid}-y) !important; background: var(--x-ground); background-image: var(--x-ground-image); box-shadow: 0 0 80px -20px color-mix(in srgb, var(--x-device) 50%, transparent); }`
        : `[data-${uid}][style*="display: block"] ~ [data-${uid}-cover] { display: block !important; }`;
      document.head.append(css);
      if (plate) plate.style.display = "none";
    }
    ctx.sfx(at, "whoosh.soft", 0.3);
    return {
      draw(t) {
        const u = io(ML.lin(t, at, at + D));
        // the underlay: from `offset` behind (below when the cover goes up) to its place, .85 -> 1
        const y = -sign * off * f.H * (1 - u);
        scene.style.translate = u < 1 ? `0 ${y.toFixed(2)}px` : "";
        // (at rest the kit's own opacity stands, so a dissolve into this scene still plays)
        if (u < 1 || scene === stage) scene.style.opacity = u < 1 ? (0.85 + 0.15 * u).toFixed(4) : "";
        // the cover slides the full frame away, above the underlay; gone once it has left
        if (prev) stage.style.setProperty(`--${uid}-y`, `${(sign * f.H * 1.02 * u).toFixed(2)}px`);
        else {
          plate.style.visibility = u < 1 ? "visible" : "hidden";
          plate.style.translate = `0 ${(sign * f.H * 1.02 * u).toFixed(2)}px`;
        }
      },
    };
  },
});

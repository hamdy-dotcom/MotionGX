// Light burst: a bright cream disc bursts from the centre (clip-path circle 0 -> past the corners in 0.35 s on
// cubic-bezier(0.2, 0.8, 0.2, 1)); its edge carries a 60 px warm radial-gradient rim and a slight chromatic fringe (a
// cool hairline just outside, a warm one just inside); faint concentric rings (1 px, violet at 20 %) expand inside it
// at a slower rate; the whole frame's exposure flashes +30 % for 2 frames at the start. Once the disc covers the frame
// the scene underneath is cut away and the cream holds for the next scene.
// Colours from the look: cream = the accent ink warmed with a touch of bad + good (a warm beige); the rim is a look name / --x-
// variable, or "warm orange" (bad lifted towards the accent ink); rings in accent-2.
// Source: prompt-motion eyishazyer-found-another-prompt-for (reference only: our own rebuild).
ML.define({
  id: "transition.light-burst",
  category: "transition",
  name: "Light burst",
  does: "A bright cream disc bursts from the centre with a warm glowing rim, flooding the frame with light.",
  says: ["celebration", "reveal", "energy", "transition"],
  energy: 5,
  targets: ["scene"],
  duration: [0.35, 0.6],
  params: {
    rim: { type: "text", default: "warm orange" },
    rings: { type: "bool", default: true },
    flash: { type: "number", range: [0, 0.5], default: 0.3 },
    speed: { type: "number", range: [0.25, 0.6], default: 0.35, unit: "s" },
  },
  pairs: ["text-in.pop-in", "accent.confetti-burst", "transition.flash-cut"],
  avoid: ["calm", "problem"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:eyishazyer-found-another-prompt-for", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const W = f.W, H = f.H, k = Math.min(W, H) / 1080, FR = 1 / 30;
    const name = String(p.rim || "").trim();
    const rim = name.startsWith("--x-") ? `var(${name})` : /^(accent|accent-2|ink|dim|good|bad|device)$/.test(name) ? `var(--x-${name})` : "color-mix(in srgb, var(--x-bad) 82%, var(--x-accent-ink))";
    const cream = "color-mix(in srgb, var(--x-accent-ink) 86%, color-mix(in srgb, var(--x-bad) 55%, var(--x-good)))";
    const cx = W / 2, cy = H / 2, R = Math.hypot(W, H) / 2 + 70 * k;
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:8;overflow:hidden;visibility:hidden";
    const disc = document.createElement("div");
    disc.style.cssText = "position:absolute;inset:0";
    layer.append(disc);
    const rings = Array.from({ length: p.rings ? 5 : 0 }, () => {
      const d = document.createElement("div");
      d.style.cssText = "position:absolute;left:0;top:0;border-radius:50%;box-sizing:border-box;border:1px solid color-mix(in srgb, var(--x-accent-2) 20%, transparent)";
      layer.append(d);
      return d;
    });
    stage.append(layer);
    const curve = ML.bezier(0.2, 0.8, 0.2, 1);
    const dur = ML.clamp(+p.speed || 0.35, 0.25, 0.6);
    const fl = ML.clamp(+p.flash, 0, 0.5);
    const rimW = 60 * k, fringe = 3 * k;
    ctx.sfx(Math.max(0, at - 0.12), "swell", 0.45);
    return {
      draw(t) {
        stage.style.filter = fl > 0 && t >= at && t < at + 2 * FR ? `brightness(${(1 + fl).toFixed(3)})` : "";
        if (t < at) { layer.style.visibility = "hidden"; scene.style.visibility = ""; return; }
        layer.style.visibility = "visible";
        const u = curve(ML.lin(t, at, at + dur)), r = R * u;
        const done = u >= 1;
        if (r < 0.5) { disc.style.background = "none"; }
        else {
          const ri = Math.max(0, r - rimW);
          // cream core, warm rim on the edge (fading in from the core), a warm hairline then a cool fringe at the edge
          disc.style.background = done ? cream : `radial-gradient(circle at ${cx}px ${cy}px, ${cream} 0px, ${cream} ${ri.toFixed(1)}px, color-mix(in srgb, ${rim} 70%, ${cream}) ${(r - fringe * 2).toFixed(1)}px, ${rim} ${(r - fringe).toFixed(1)}px, color-mix(in srgb, var(--x-accent-2) 60%, transparent) ${r.toFixed(1)}px, transparent ${(r + fringe).toFixed(1)}px)`;
        }
        // rings expanding inside at a slower rate (they trail the edge and fade as the cream settles)
        rings.forEach((d, i) => {
          const share = 0.22 + i * 0.15;
          const rr = R * share * ML.out(t, at, at + dur * 2.4);
          const o = 1 - ML.lin(t, at + dur, at + dur * 2.6);
          d.style.visibility = rr > 2 && rr < r - 4 && o > 0 ? "visible" : "hidden";
          d.style.left = (cx - rr).toFixed(2) + "px"; d.style.top = (cy - rr).toFixed(2) + "px";
          d.style.width = d.style.height = (2 * rr).toFixed(2) + "px";
          d.style.opacity = o.toFixed(4);
        });
        scene.style.visibility = done ? "hidden" : "";
      },
    };
  },
});

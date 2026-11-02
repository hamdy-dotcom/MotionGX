// Flash cut: the cut is punctuated by a flash. Strobe (strength under 0.9): at the cut a full-frame overlay at 35-100 %
// for 1-3 frames on the incoming frame, then a linear fade to 0 (0.05 s by default; a longer fade eases out), the
// incoming black level lifted (brightness 1.6) for the same frames — on cuts every 0.25-0.5 s it reads as an anime /
// title-card strobe. Full flash (strength 0.9+): the overlay rises 0 -> 1 in 2 frames, holds the frames, then fades
// 1 -> 0 over `fade` expo.out revealing the next scene, optionally leaving a radial bright spot at the centre (the source
// of the flash) that dies a little later. The scene is cut on the flash's peak: the next scene takes the frame.
// Colours from the look: white = the look's accent ink, grey = dim mixed into it, accent = the accent.
// Source: prompt-motion apoorvjain25-i-gave-claude-opus + majin-appsheet-claude-code-opus-5-5-pv-ai (reference only:
// our own rebuild).
ML.define({
  id: "transition.flash-cut",
  category: "transition",
  name: "Flash cut",
  does: "The cut is punctuated by a flash: the frame lifts to white (or grey or accent) for a frame or two and fades back on the new scene.",
  says: ["energy", "urgency", "transition", "reveal"],
  energy: 5,
  targets: ["scene"],
  duration: [0.05, 0.6],
  params: {
    colour: { type: "choice", options: ["white", "grey", "accent"], default: "white" },
    strength: { type: "number", range: [0.35, 1], default: 0.5 },
    frames: { type: "number", range: [1, 3], default: 2 },
    fade: { type: "number", range: [0.05, 0.6], default: 0.05, unit: "s" },
    glow_point: { type: "bool", default: false },
  },
  pairs: ["text-in.slam", "camera.snap-zoom", "transition.colour-field-cut"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "prompt-motion:apoorvjain25-i-gave-claude-opus", license: "reference", note: "with prompt-motion majin-appsheet-claude-code-opus-5-5-pv-ai; our own rebuild" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const scene = ctx.scene || null;
    const FR = 1 / 30;
    const col = p.colour === "accent" ? "var(--x-accent)" : p.colour === "grey" ? "color-mix(in srgb, var(--x-dim) 55%, var(--x-accent-ink))" : "var(--x-accent-ink)";
    const strength = ML.clamp(+p.strength || 0.5, 0.35, 1);
    const full = strength >= 0.9;
    const frames = Math.round(ML.clamp(+p.frames || 2, 1, 3));
    const fade = ML.clamp(+p.fade || 0.05, 0.05, 0.6);
    const flash = document.createElement("div");
    flash.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:8;visibility:hidden;opacity:0;background:${col}`;
    const R = Math.hypot(f.W, f.H) * 0.5;
    const spot = document.createElement("div");
    spot.style.cssText = `position:absolute;left:${f.W / 2 - R}px;top:${f.H / 2 - R}px;width:${2 * R}px;height:${2 * R}px;border-radius:50%;pointer-events:none;z-index:8;visibility:hidden;opacity:0;` +
      `background:radial-gradient(circle, ${col} 0%, color-mix(in srgb, ${col} 55%, transparent) 9%, color-mix(in srgb, ${col} 12%, transparent) 26%, transparent 46%)`;
    stage.append(flash, spot);
    // the flash's shape in time: rise (full flash only), hold, fade
    const rise = full ? 2 * FR : 0;
    const peak = at + rise, holdEnd = peak + frames * FR, gone = holdEnd + fade;
    const spotEnd = holdEnd + Math.max(0.25, fade * 1.6);
    const easeFade = (t) => (fade <= 0.12 ? 1 - ML.lin(t, holdEnd, gone) : 1 - ML.expo(t, holdEnd, gone));
    ctx.sfx(peak, "hit", full ? 0.55 : 0.4);
    return {
      draw(t) {
        let o = 0;
        if (t >= at && t < gone) o = t < peak ? strength * ML.lin(t, at, peak) : t < holdEnd ? strength : strength * easeFade(t);
        flash.style.visibility = o > 0.002 ? "visible" : "hidden";
        flash.style.opacity = o.toFixed(4);
        const so = p.glow_point && t >= at && t < spotEnd ? (t < holdEnd ? ML.lin(t, at, peak || at + FR) : 1 - ML.out(t, holdEnd, spotEnd)) : 0;
        spot.style.visibility = so > 0.002 ? "visible" : "hidden";
        spot.style.opacity = so.toFixed(4);
        spot.style.transform = `scale(${(0.8 + 0.4 * ML.lin(t, at, spotEnd)).toFixed(4)})`;
        // the incoming black level lifted for the flash frames
        stage.style.filter = t >= peak && t < holdEnd ? `brightness(${(1 + 0.6 * strength).toFixed(3)})` : "";
        // the cut on the peak: the scene is gone, the next one plays under the fading flash
        if (scene) scene.style.visibility = t >= peak ? "hidden" : "";
      },
    };
  },
});

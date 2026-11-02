// Hard cut: autoAlpha 1 up to the cut, 0 from it, no overlap — frame N is this scene, frame N+1 the next. The cut is
// placed on the beat grid (b(bar, beat) from the film's start, `bpm` beats a minute, 4 beats a bar), never on a raw
// frame number: "beat" takes the next beat at or after the asked time, "bar" the nearest bar line (never before the
// scene has shown), "downbeat" the next bar line strictly after it, "any" the asked time itself. Matched cut: the ground
// stays the same colour across the cut and the scene's accent shapes hold their place for one beat on the far side, so
// the next scene's accent lands where the eye already is and the two read as one film. Optional one-frame flash on the
// beat for chaotic tones.
// Source: MotionGX's own live-engine recipes.js (the "cut" transition family: tl.set(scene, { autoAlpha: 0 }, end) on a
// snapped beat) + product-film-skill reference/ingredients.md "Cuts on the beat" (MIT).
ML.define({
  id: "transition.hard-cut",
  category: "transition",
  name: "Hard cut",
  does: "The picture switches instantly to the next scene, exactly on a beat, with no transition frames.",
  says: ["speed", "energy", "transition"],
  energy: 3,
  targets: ["scene"],
  duration: [0, 0.1],
  params: {
    on: { type: "choice", options: ["any", "beat", "bar", "downbeat"], default: "beat" },
    bpm: { type: "number", range: [60, 180], default: 120, unit: "bpm" },
    match: { type: "bool", default: true },
    flash: { type: "bool", default: false },
  },
  pairs: ["transition.flash-cut", "transition.colour-field-cut"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "own:lib/live-engine/worker/vendor/recipes.js", license: "own", note: "with product-film-skill reference/ingredients.md (Cuts on the beat, MIT)" },
  setup(ctx) {
    const { p, at, stage } = ctx;
    const scene = ctx.scene || null;
    const from = ctx.from ?? 0;
    const beat = 60 / ML.clamp(+p.bpm || 120, 60, 180), bar = beat * 4, eps = 1e-6;
    // the cut on the grid (grid from the film's start: scene code never holds frame numbers)
    let cut = at;
    if (p.on === "beat") cut = Math.ceil(at / beat - eps) * beat;
    else if (p.on === "bar") { cut = Math.round(at / bar) * bar; if (cut < from + beat) cut = Math.ceil((from + beat) / bar - eps) * bar; }
    else if (p.on === "downbeat") cut = (Math.floor(at / bar + eps) + 1) * bar;
    // the film leaves this scene at its end whatever the grid says: the sound lands on the real cut
    if (ctx.to != null) cut = Math.min(cut, ctx.to);
    cut = +cut.toFixed(4);
    // the layer sits on the stage over the next scene and stops being drawn 0.5 s after this scene: the hold ends before
    const holdTo = Math.min(cut + beat, (ctx.to ?? Infinity) + 0.45);
    const FR = 1 / 30;
    // matched cut: the scene's accent shapes, held in place for a beat after the cut
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:7;visibility:hidden";
    const plates = [];
    if (p.match && scene) {
      const probe = document.createElement("span");
      probe.style.cssText = "display:none;color:var(--x-accent)";
      stage.append(probe);
      const accent = getComputedStyle(probe).color;
      probe.remove();
      const seen = [];
      for (const e of scene.querySelectorAll("*")) {
        const cs = getComputedStyle(e);
        const isFill = e instanceof SVGElement && cs.fill === accent && e.tagName.toLowerCase() !== "svg" && e.tagName.toLowerCase() !== "text";
        const isBg = !(e instanceof SVGElement) && cs.backgroundColor === accent;
        if (!isFill && !isBg) continue;
        const b = ctx.box(e);
        if (b.w < 4 || b.h < 4 || seen.some((s) => Math.abs(s.x - b.x) < 2 && Math.abs(s.y - b.y) < 2)) continue;
        seen.push(b);
        const rx = isFill ? parseFloat(e.getAttribute("rx") || "0") * (b.w / (parseFloat(e.getAttribute("width")) || b.w)) : parseFloat(cs.borderTopLeftRadius) || 0;
        const d = document.createElement("div");
        d.style.cssText = `position:absolute;left:${b.x.toFixed(2)}px;top:${b.y.toFixed(2)}px;width:${b.w.toFixed(2)}px;height:${b.h.toFixed(2)}px;border-radius:${rx.toFixed(2)}px;background:var(--x-accent)`;
        layer.append(d);
        plates.push(d);
        if (plates.length >= 6) break;
      }
    }
    const flash = document.createElement("div");
    flash.style.cssText = "position:absolute;inset:0;background:var(--x-accent-ink);opacity:0.85;visibility:hidden";
    layer.append(flash);
    stage.append(layer);
    if (scene) { const lk = scene.getAttribute("data-look"); if (lk) layer.setAttribute("data-look", lk); }
    ctx.sfx(cut, "hit", p.flash ? 0.55 : 0.3);
    return {
      draw(t) {
        const after = t >= cut;
        // autoAlpha: the scene is there up to the cut and gone from it, no frames in between
        if (scene) scene.style.visibility = after ? "hidden" : "";
        const holdOn = after && plates.length && t < holdTo;
        const flashOn = p.flash && after && t < cut + FR;
        layer.style.visibility = holdOn || flashOn ? "visible" : "hidden";
        flash.style.visibility = flashOn ? "visible" : "hidden";
        for (const d of plates) d.style.visibility = holdOn ? "" : "hidden";
      },
    };
  },
});

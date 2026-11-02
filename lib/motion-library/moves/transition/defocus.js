// Defocus: the scene loses focus as if the lens slipped — blur 0 -> `amount` px and brightness 1 -> 0.7 over 0.4 s
// power2.in, the text a beat (0.05 s) ahead of the rest. With reverse_in the scene arrives the other way first (blur
// `amount` -> 0, brightness 0.7 -> 1, power2.out, the text sharpening last) and loses focus at its cut, so two scenes
// that both carry it pass through one soft moment. Pictures are never blurred (the library's sharp rule): they dim and
// fade with the lens instead, while text, panels and shapes go soft.
// Source: prompt-motion aschapmann-i-couldn-t-resist-to (reference only: our own rebuild).
ML.define({
  id: "transition.defocus",
  category: "transition",
  name: "Defocus",
  does: "Text and background blur out together as if the lens lost focus; the next scene can focus back in.",
  says: ["transition", "calm", "focus"],
  energy: 2,
  targets: ["scene"],
  duration: [0.4, 1],
  params: {
    amount: { type: "number", range: [6, 20], default: 14, unit: "px" },
    reverse_in: { type: "bool", default: true },
    length: { type: "number", range: [0.3, 0.6], default: 0.4, unit: "s" },
  },
  pairs: ["camera.push-in", "transition.crossfade"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "prompt-motion:aschapmann-i-couldn-t-resist-to", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, end, stage } = ctx;
    const scene = ctx.scene || stage;
    // split the scene: pictures (never blurred), text, and the rest; a block holding a picture is walked into
    const PIC = /^(IMG|VIDEO|CANVAS|PICTURE|SVG)$/i;
    const hasPic = (e) => PIC.test(e.tagName) || !!e.querySelector("img,video,canvas,picture") || getComputedStyle(e).backgroundImage.includes("url(");
    const pics = [], text = [], rest = [];
    const walk = (n) => {
      for (const c of n.children) {
        if (PIC.test(c.tagName) && c.tagName.toUpperCase() !== "SVG") { pics.push(c); continue; }
        if (!hasPic(c)) { (c.closest(".ml-head") || /^(H\d|P|SPAN)$/.test(c.tagName) ? text : rest).push(c); continue; }
        walk(c);
      }
    };
    walk(scene);
    const L = ML.clamp(p.length, 0.3, 0.6), lead = 0.05;
    const p2in = (x) => x * x * x, p2out = (x) => 1 - Math.pow(1 - x, 3);
    // the soft amount at t (0 sharp … 1 fully soft), `shift` moves the text ahead (out) / behind (in)
    const outA = p.reverse_in ? Math.max(at + L + 0.1, end - L - 0.05) : at;
    const soft = (t, shift) => {
      let s = p2in(ML.lin(t, outA - shift, outA - shift + L));
      if (p.reverse_in) s = Math.max(s, 1 - p2out(ML.lin(t, at + shift, at + shift + L)));
      return s;
    };
    const set = (e, s, pic) => {
      if (s < 0.002) { e.style.filter = ""; if (pic) e.style.opacity = ""; return; }
      if (pic) { e.style.opacity = (1 - 0.6 * s).toFixed(4); return; }
      e.style.filter = `blur(${(p.amount * s).toFixed(2)}px)`;
    };
    // brightness 1 -> 0.7 for the whole frame (ground, panels and pictures alike): a dark veil over the scene
    const veil = document.createElement("div");
    veil.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:6;background:var(--x-device);opacity:0";
    scene.append(veil);
    if (p.reverse_in) ctx.sfx(at, "whoosh.soft", 0.18);
    return {
      draw(t) {
        const sText = soft(t, lead), sRest = soft(t, 0);
        text.forEach((e) => set(e, sText, false));
        rest.forEach((e) => set(e, sRest, false));
        pics.forEach((e) => set(e, sRest, true));
        veil.style.opacity = (0.3 * sRest).toFixed(4);
      },
    };
  },
});

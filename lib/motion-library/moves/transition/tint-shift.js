// Tint shift: the whole picture washes into another tone, holding it or easing back. Three ways, one read:
//  · overlay — a full-frame layer of the tint with mix-blend-mode color / overlay, opacity 0 -> strength over `in`, held
//    for `hold`, back over `out` (or hue-rotate on the scene itself: a colour filter, never a blur);
//  · background — the ground itself lifts toward the tint on the cut (instant to 0.08 s) so the punch line feels like a
//    raised voice; the headline lands scale 0.96 -> 1 in 0.3 s back.out(1.4); after `hold` it eases back over `out`;
//  · footage — the text fades out in 0.2 s, the footage wash A (the tint) crossfades to B (tint_to) over 0.5 s, then
//    the content comes back starting at opacity .6.
// `return` decides whether the tint holds or eases back. Colours are look names (accent, accent-2, ink, good, bad…), a
// --x- variable, or a brand hex the director passes.
// Source: prompt-motion 0xevinho-opus-5-5-is-really, reyzostyle-opus-5-5-literally-one, deifosv-i-asked-opus-5-5
// (reference only: our own rebuild).
ML.define({
  id: "transition.tint-shift",
  category: "transition",
  name: "Tint shift",
  does: "The whole picture washes into another tone (a cold tint, a lifted charcoal, a new footage colour), either holding it or easing back.",
  says: ["change", "energy", "focus", "urgency", "problem", "transition"],
  energy: 3,
  targets: ["scene", "image", "stage"],
  duration: [0.4, 2],
  params: {
    layer: { type: "choice", options: ["overlay", "background", "footage"], default: "overlay" },
    tint: { type: "text", default: "accent" },
    tint_to: { type: "text", default: "accent-2" },
    strength: { type: "number", range: [0.2, 0.8], default: 0.6 },
    blend: { type: "choice", options: ["color", "overlay", "hue-rotate"], default: "color" },
    in: { type: "number", range: [0, 0.5], default: 0.2, unit: "s" },
    hold: { type: "number", range: [0.3, 1.5], default: 0.6, unit: "s" },
    return: { type: "bool", default: true },
    out: { type: "number", range: [0.3, 0.8], default: 0.5, unit: "s" },
  },
  pairs: ["text-in.punchline", "transition.crossfade"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:0xevinho-opus-5-5-is-really", license: "reference", note: "our own rebuild; also reyzostyle-opus-5-5-literally-one, deifosv-i-asked-opus-5-5" },
  setup(ctx) {
    const { p, at, stage } = ctx;
    const scene = ctx.scene || stage;
    const colour = (v, fb) => {
      const c = String(v || fb).trim();
      if (c.startsWith("--x-")) return `var(${c})`;
      if (/^#[0-9a-f]{3,8}$/i.test(c)) return c;
      if (/^(accent|accent-2|ink|good|bad|panel|panel-2|ground|dim|device|accent-ink)$/.test(c)) return `var(--x-${c})`;
      return `var(--x-${fb})`;
    };
    const tint = colour(p.tint, "accent"), tint2 = colour(p.tint_to, "accent-2");
    const s = ML.clamp(p.strength, 0.2, 0.8), tin = ML.clamp(p.in, 0, 0.5), tout = ML.clamp(p.out, 0.3, 0.8);
    // when it eases back, it is back by the move's end
    const hold = p.return ? Math.min(ML.clamp(p.hold, 0.3, 1.5), Math.max(0, ctx.end - at - tin - tout)) : ML.clamp(p.hold, 0.3, 1.5);
    // the target: a picture tints alone, else the whole scene
    const own = ctx.el && ctx.el !== stage && ctx.el !== scene ? ctx.el : null;
    const frame = own || scene;
    const p2o = (x) => 1 - (1 - x) * (1 - x), p2io = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    const mk = (css, parent) => { const d = document.createElement("div"); d.style.cssText = "position:absolute;pointer-events:none;" + css; parent.append(d); return d; };

    if (p.layer === "background" && !own) {
      // the ground lifts: a layer at the back of the scene, the look's ground mixed toward the tint
      const lift = mk(`inset:0;background:color-mix(in srgb, ${tint} ${Math.round(s * 100)}%, var(--x-ground));opacity:0`, scene);
      scene.prepend(lift);
      const head = scene.querySelector(".ml-head") || scene.querySelector(".ml-title");
      const cut = Math.min(0.08, tin), backAt = at + cut + hold;
      ctx.sfx(at, "hit", 0.3);
      return {
        draw(t) {
          const up = cut ? ML.lin(t, at, at + cut) : t >= at ? 1 : 0, down = p.return ? p2io(ML.lin(t, backAt, backAt + tout)) : 0;
          lift.style.opacity = (up * (1 - down)).toFixed(4);
          if (head) { const sc = t < at ? 1 : 0.96 + 0.04 * ML.back(t, at, at + 0.3, 1.4); head.style.scale = sc === 1 ? "none" : sc.toFixed(4); }
        },
      };
    }

    if (p.layer === "footage" && !own) {
      // the footage: two washes behind the content (A the tint, B tint_to), text out, A -> B, content back from .6
      const wash = (c) => `radial-gradient(120% 90% at 30% 20%, color-mix(in srgb, ${c} 70%, var(--x-accent-ink)) 0%, ${c} 45%, color-mix(in srgb, ${c} 55%, var(--x-device)) 100%)`;
      const A = mk(`inset:0;background:${wash(tint)};opacity:0`, scene), B = mk(`inset:0;background:${wash(tint2)};opacity:0`, scene);
      scene.prepend(B); scene.prepend(A);
      const content = [...scene.children].filter((c) => c !== A && c !== B && c.tagName !== "CANVAS");
      const t1 = at + Math.max(0.2, tin), t2 = t1 + 0.5, t3 = t2 + 0.05;
      ctx.sfx(t1, "whoosh.soft", 0.25);
      return {
        draw(t) {
          const aOn = ML.lin(t, at, at + Math.max(0.12, tin)), x = ML.ease(t, t1, t2);
          A.style.opacity = (s * aOn * (1 - x)).toFixed(4);
          B.style.opacity = (s * x).toFixed(4);
          // text fades 0.2 s, then the new content returns from opacity .6, rising a touch
          const gone = ML.lin(t, at, at + 0.2), back = p2o(ML.lin(t, t3, t3 + 0.4));
          const o = t < t3 ? 1 - gone : 0.6 + 0.4 * back;
          content.forEach((c) => { c.style.opacity = o >= 0.999 ? "" : o.toFixed(4); c.style.translate = t >= t3 && back < 1 ? `0 ${((1 - back) * 14).toFixed(2)}px` : ""; });
          if (p.return) { const r = p2io(ML.lin(t, t3 + hold, t3 + hold + tout)); B.style.opacity = (s * x * (1 - r)).toFixed(4); }
        },
      };
    }

    // overlay: a full-frame tint blended over the frame, or hue-rotate on the frame itself
    const hue = p.blend === "hue-rotate";
    // color / overlay keep the backdrop's lightness, so a pale or near-black ground would barely move and only the
    // pictures would change: a thin plain wash under the veil makes the whole frame shift tone
    if (own && !hue && getComputedStyle(own.parentElement).position === "static") own.parentElement.style.position = "relative"; // before measuring: it becomes the offset parent
    const wash = hue ? null : mk(`inset:0;z-index:7;background:${tint};opacity:0`, own ? own.parentElement : scene);
    const veil = hue ? null : mk(`inset:0;z-index:7;background:${tint};mix-blend-mode:${p.blend === "overlay" ? "overlay" : "color"};opacity:0`, own ? own.parentElement : scene);
    if (veil && own) {
      // a picture: the layers sit exactly over it, with its corners
      const place = { inset: "auto", left: own.offsetLeft + "px", top: own.offsetTop + "px", width: own.offsetWidth + "px", height: own.offsetHeight + "px", borderRadius: getComputedStyle(own).borderRadius };
      Object.assign(veil.style, place); Object.assign(wash.style, place);
    }
    if (tin > 0.05) ctx.sfx(at, "whoosh.soft", 0.15);
    return {
      draw(t) {
        const up = tin ? p2o(ML.lin(t, at, at + tin)) : t >= at ? 1 : 0;
        const down = p.return ? p2io(ML.lin(t, at + tin + hold, at + tin + hold + tout)) : 0;
        const k = up * (1 - down);
        if (hue) frame.style.filter = k > 0.001 ? `hue-rotate(${(k * s * 300).toFixed(1)}deg) saturate(${(1 + 0.4 * k * s).toFixed(3)})` : "";
        else { veil.style.opacity = (k * s).toFixed(4); wash.style.opacity = (k * s * 0.22).toFixed(4); }
      },
    };
  },
});

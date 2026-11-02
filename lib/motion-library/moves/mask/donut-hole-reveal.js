// Colour field shrinks to a ring around a portrait: at `at` the frame cuts to the brand colour; the colour field
// contracts into a disc (from covering the whole frame down to final_radius, scaled with the frame) while a circular
// hole opens in it, 0 → final_radius − ring_width, showing the target picture as a round portrait. Both run together
// over `duration` on power3.inOut, and the disc travels from the frame's centre to its final spot (left third by
// default) as it shrinks — ending as a thin coloured ring around the portrait, with room for a name or a quote beside
// it. The picture is cropped to the portrait (object-fit: cover, never enlarged past its pixels, never blurred); its
// original place in the layout empties. Colours from the look (ring_colour names a look colour: accent, accent-2,
// good, ink…). Arabic: left / right thirds mirror, so the portrait sits at the start of the reading line.
// Source: prompt-motion blushpetal795-wtf-made-this-with (reference only: our own rebuild).
ML.define({
  id: "mask.donut-hole-reveal",
  category: "mask",
  name: "Colour field shrinks to a ring around a portrait",
  does: "The full-frame colour contracts into a disc while a hole opens in it to show a portrait, ending as a coloured ring framing the photo.",
  says: ["reveal", "story", "trust"],
  energy: 3,
  targets: ["image"],
  duration: [0.5, 1],
  params: {
    ring_colour: { type: "text", default: "accent" },
    ring_width: { type: "number", range: [6, 24], default: 10, unit: "px" },
    final_radius: { type: "number", range: [100, 260], default: 160, unit: "px" },
    position: { type: "choice", options: ["left-third", "centre", "right-third", "top"], default: "left-third" },
    duration: { type: "number", range: [0.45, 0.9], default: 0.6, unit: "s" },
  },
  pairs: ["text-in.punchline", "kinetic.quote-card"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:blushpetal795-wtf-made-this-with", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, stage } = ctx;
    if (!el) return null;
    const host = ctx.scene || stage;
    const W = ctx.f.W, H = ctx.f.H, k = Math.min(W, H) / 1080;
    const pic = /^img$/i.test(el.tagName) ? el : el.querySelector("img");
    const dur = ML.clamp(+p.duration, 0.45, 0.9);
    const R = ML.clamp(+p.final_radius, 100, 260) * k, ring = Math.min(ML.clamp(+p.ring_width, 6, 24) * k, R * 0.4), hole = R - ring;
    // the final spot (Arabic: the thirds mirror)
    let pos = p.position;
    if (ctx.rtl && (pos === "left-third" || pos === "right-third")) pos = pos === "left-third" ? "right-third" : "left-third";
    const safe = ctx.f.safe;
    const ex = pos === "left-third" ? Math.max(safe.x + R, W / 3 - R * 0.35) : pos === "right-third" ? Math.min(safe.x + safe.w - R, (W * 2) / 3 + R * 0.35) : W / 2;
    const ey = pos === "top" ? Math.max(safe.y + R, H * 0.3) : H / 2;
    const sx = W / 2, sy = H / 2, cover = Math.hypot(W, H) / 2 + 4;
    const name = String(p.ring_colour || "accent").replace(/[^a-z0-9-]/gi, "") || "accent";

    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:4";
    const disc = document.createElement("div");
    disc.style.cssText = `position:absolute;inset:0;background:var(--x-${name}, var(--x-accent))`;
    const face = document.createElement("div");
    face.style.cssText = `position:absolute;left:0;top:0;width:${2 * hole}px;height:${2 * hole}px;margin:${-hole}px 0 0 ${-hole}px;overflow:hidden;background:var(--x-pic-ground)`;
    if (pic) {
      const img = document.createElement("img");
      img.src = pic.currentSrc || pic.src;
      img.alt = "";
      const ocs = getComputedStyle(pic);
      img.style.cssText = `width:100%;height:100%;display:block;object-fit:cover;object-position:${ocs.objectPosition};filter:var(--x-pic-filter);mix-blend-mode:var(--x-pic-blend)`;
      face.append(img);
    }
    layer.append(disc, face);
    host.append(layer);
    ctx.sfx(at, "whoosh.soft", 0.4);
    ctx.sfx(at + dur, "land.light", 0.3);
    return {
      draw(t) {
        const on = t >= at - 1e-6;
        layer.style.visibility = on ? "visible" : "hidden";
        if (pic) pic.style.visibility = on ? "hidden" : "";
        if (!on) return;
        const e = ML.ease(t, at, at + dur);
        const cx = sx + (ex - sx) * e, cy = sy + (ey - sy) * e, rd = cover + (R - cover) * e, rh = hole * e;
        disc.style.clipPath = `circle(${rd.toFixed(2)}px at ${cx.toFixed(2)}px ${cy.toFixed(2)}px)`;
        face.style.translate = `${cx.toFixed(2)}px ${cy.toFixed(2)}px`;
        face.style.clipPath = `circle(${Math.max(0, rh).toFixed(2)}px at 50% 50%)`;
      },
    };
  },
});

// Image clip reveal with inner settle: the media frame is uncovered from one edge — clip-path inset(0 0 100% 0) →
// inset(0) (the direction picks the collapsed side) — while the picture inside settles from inner_scale (1.08) to rest
// and its opacity 0.75 → 1 over ~1.1× the reveal, both starting together. Cinematic: power4.out over `duration`
// (1.1 s in the source); editorial: cubic-bezier(.22, .61, .36, 1) over ≤ 0.76 s, the picture resting at 1.03 and
// drifting to 1.02 as a held emphasis. entrance "rise" is the subtle-panel alternative: translateY 8 % + opacity
// instead of the clip. Only the media layer reveals: captions inside the target (figcaption, [data-caption]) stay
// solid and stagger in 45–70 ms apart after it. What makes it read is the counter-scale inside the moving edge.
// Arabic: left / right mirror, so a sideways reveal runs in the reading direction.
// Source: MengTo/Skills agent-skills/web-design/cinematic-gsap-lenis-motion-system (SKILL.md initImageReveals) and
// editorial-portfolio-chapters (MIT).
ML.define({
  id: "mask.clip-reveal",
  category: "mask",
  name: "Image clip reveal with inner settle",
  does: "A picture is uncovered from one edge while the image inside settles from slightly zoomed to rest, so the frame opens and the photo breathes into place.",
  says: ["reveal", "luxury", "story", "proof"],
  energy: 3,
  targets: ["image", "screen", "card"],
  duration: [0.5, 1.4],
  params: {
    direction: { type: "choice", options: ["up", "down", "left", "right"], default: "down" },
    inner_scale: { type: "number", range: [1.04, 1.15], default: 1.08 },
    duration: { type: "number", range: [0.5, 1.2], default: 0.9, unit: "s" },
    ease: { type: "choice", options: ["power4.out", "editorial"], default: "power4.out" },
    caption_stagger: { type: "number", range: [0.045, 0.07], default: 0.06, unit: "s" },
    entrance: { type: "choice", options: ["clip", "rise"], default: "clip" },
  },
  pairs: ["text-in.punchline", "camera.push-in"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/web-design/cinematic-gsap-lenis-motion-system", license: "MIT", note: "SKILL.md initImageReveals; editorial variant from editorial-portfolio-chapters" },
  setup(ctx) {
    const { el, p, at, stage } = ctx;
    if (!el) return null;
    const host = ctx.scene || stage;
    const whole = el === stage || el === host;
    const isMedia = (n) => /^(img|video|canvas|svg|picture)$/i.test(n.tagName);
    // the media layer: the target if it is a picture, else the first picture inside it (else the whole target)
    const pic = whole ? null : isMedia(el) ? el : el.querySelector("img, video, canvas, picture");
    let frame = whole ? host : el, inner = null;
    if (pic) {
      const cs = getComputedStyle(pic), bx = ctx.box(pic), f = document.createElement("div");
      f.style.cssText = `position:relative;overflow:hidden;flex:none;display:${cs.display === "inline" ? "inline-block" : cs.display};width:${bx.w}px;height:${bx.h}px;border-radius:${cs.borderRadius};margin:${cs.margin};align-self:${cs.alignSelf};vertical-align:${cs.verticalAlign}`;
      pic.replaceWith(f); f.append(pic);
      pic.style.width = "100%"; pic.style.height = "100%"; pic.style.margin = "0"; pic.style.display = "block"; pic.style.transformOrigin = "50% 50%";
      frame = f; inner = pic;
    }
    const caps = whole || isMedia(el) ? [] : [...el.querySelectorAll("figcaption, [data-caption]")];
    const editorial = p.ease === "editorial";
    const dur = editorial ? Math.min(ML.clamp(+p.duration, 0.5, 1.2), 0.76) : ML.clamp(+p.duration, 0.5, 1.2);
    const curve = editorial ? ML.bezier(0.22, 0.61, 0.36, 1) : (x) => 1 - Math.pow(1 - x, 5); // power4.out
    const s0 = ML.clamp(+p.inner_scale, 1.04, 1.15), rest = editorial ? 1.03 : 1;
    let dir = p.direction;
    if (ctx.rtl && (dir === "left" || dir === "right")) dir = dir === "left" ? "right" : "left";
    // the inset of the still-covered side: "down" opens top → bottom (bottom collapsed), "right" opens left → right
    const clipAt = (c) => {
      const v = ((1 - c) * 100).toFixed(3) + "%";
      return dir === "down" ? `inset(0 0 ${v} 0)` : dir === "up" ? `inset(${v} 0 0 0)` : dir === "right" ? `inset(0 ${v} 0 0)` : `inset(0 0 0 ${v})`;
    };
    const capAt = at + dur * 0.55, stag = ML.clamp(+p.caption_stagger, 0.045, 0.07);
    ctx.sfx(at, "whoosh.soft", 0.35);
    return {
      draw(t) {
        const on = t >= at - 1e-6, c = curve(ML.lin(t, at, at + dur)), ci = curve(ML.lin(t, at, at + dur * 1.1));
        if (p.entrance === "rise") {
          frame.style.clipPath = "none";
          frame.style.opacity = on ? c.toFixed(4) : "0";
          frame.style.translate = `0 ${((1 - c) * 8).toFixed(3)}%`;
        } else {
          frame.style.clipPath = !on ? clipAt(0) : c >= 0.9999 ? "none" : clipAt(c);
        }
        if (inner) {
          const drift = editorial ? 0.01 * ML.ease(t, at + dur, at + dur + 2.4) : 0;
          inner.style.scale = (on ? s0 + (rest - s0) * ci - drift : s0).toFixed(4);
          inner.style.opacity = (on ? 0.75 + 0.25 * ci : 0.75).toFixed(4);
        }
        caps.forEach((cap, i) => {
          const u = ML.out(t, capAt + i * stag, capAt + i * stag + 0.4);
          cap.style.opacity = u.toFixed(4);
          cap.style.translate = `0 ${((1 - u) * 12).toFixed(2)}px`;
        });
      },
    };
  },
});

// Circle window peek / portal: a small window opens on the picture, centred on its subject. Peek ("full"): the window
// opens 0 → start_radius in 0.25 s (or starts there), holds `hold` s so the glimpse registers, then widens to cover the
// whole picture (≥ the distance to its farthest corner) over 0.7 s cubic-bezier(0.65, 0, 0.35, 1). Portal: it opens
// 0 → portal_size % of the frame's short side over 0.4 s back.out(1.4) and holds as a window while everything else
// keeps moving. The window is a circle, an eye (almond) or a rounded rectangle, drawn as one SVG path used as the
// clip-path; an optional 4 px rim (look colour, soft vector glow) follows its edge. The picture inside always
// counter-scales inner_scale → 1 for parallax (only clipped, never blurred). centre: "subject" (a little above the
// middle, where faces sit), "centre", or "x% y%" of the picture. Arabic-safe: a window has no direction.
// Source: prompt-motion jake11moran-session-story-created-a-skill, gizakdag-overthinking-a-film-by (reference only: our own rebuild).
ML.define({
  id: "mask.circle-window",
  category: "mask",
  name: "Circle window peek / portal",
  does: "A small circle opens on another picture — a peek at a face or detail — and either holds as a rimmed portal or widens to reveal the whole picture.",
  says: ["reveal", "story", "focus", "playful", "change"],
  energy: 3,
  targets: ["image", "scene"],
  duration: [0.6, 2],
  params: {
    end: { type: "choice", options: ["portal", "full"], default: "full" },
    start_radius: { type: "number", range: [0, 80], default: 40, unit: "px" },
    hold: { type: "number", range: [0, 1], default: 0.6, unit: "s" },
    portal_size: { type: "number", range: [15, 45], default: 30, unit: "%" },
    shape: { type: "choice", options: ["circle", "eye", "rounded-rect"], default: "circle" },
    rim: { type: "bool", default: false },
    rim_colour: { type: "text", default: "accent" },
    centre: { type: "text", default: "subject" },
    inner_scale: { type: "number", range: [1.05, 1.2], default: 1.15 },
  },
  pairs: ["text-in.punchline", "transition.iris-wipe"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:jake11moran-session-story-created-a-skill", license: "reference", note: "with gizakdag-overthinking-a-film-by; our own rebuild" },
  setup(ctx) {
    const { el, p, at, stage } = ctx;
    if (!el) return null;
    const host = ctx.scene || stage;
    const NS = "http://www.w3.org/2000/svg";
    const whole = el === stage || el === host;
    const media = !whole && /^(img|video|canvas|svg|picture)$/i.test(el.tagName);
    // a picture goes in an overflow-hidden frame of its own size, so the frame clips and the picture scales inside
    let frame = whole ? host : el, inner = null;
    if (media) {
      const cs = getComputedStyle(el), bx = ctx.box(el), f = document.createElement("div");
      f.style.cssText = `position:relative;overflow:hidden;flex:none;display:${cs.display === "inline" ? "inline-block" : cs.display};width:${bx.w}px;height:${bx.h}px;border-radius:${cs.borderRadius};margin:${cs.margin};align-self:${cs.alignSelf};vertical-align:${cs.verticalAlign}`;
      el.replaceWith(f); f.append(el);
      el.style.width = "100%"; el.style.height = "100%"; el.style.margin = "0"; el.style.display = "block";
      frame = f; inner = el;
    } else if (!whole) inner = el.querySelector("img, video, canvas");
    const b = whole ? { x: 0, y: 0, w: ctx.f.W, h: ctx.f.H } : ctx.box(frame);
    const k = Math.min(ctx.f.W, ctx.f.H) / 1080;
    // the window's centre in the picture
    const spec = String(p.centre || "subject").trim();
    const m = spec.match(/(-?[\d.]+)%?\s+(-?[\d.]+)%?/);
    const [fx, fy] = m ? [ML.clamp(+m[1] / 100), ML.clamp(+m[2] / 100)] : spec === "centre" || spec === "center" ? [0.5, 0.5] : [0.5, 0.42];
    const cx = b.w * fx, cy = b.h * fy;
    if (inner) inner.style.transformOrigin = `${(fx * 100).toFixed(1)}% ${(fy * 100).toFixed(1)}%`;
    const far = Math.max(Math.hypot(cx, cy), Math.hypot(b.w - cx, cy), Math.hypot(cx, b.h - cy), Math.hypot(b.w - cx, b.h - cy));
    const farX = Math.max(cx, b.w - cx), farY = Math.max(cy, b.h - cy);
    // r is the window's half-width; each shape's size that covers the whole picture
    const cover = p.shape === "eye" ? far * 2.1 : p.shape === "rounded-rect" ? Math.max(farX, farY / 0.8) + 2 : far + 2;
    const path = (r) => {
      if (r <= 0.01) return "M0 0Z";
      const f2 = (v) => v.toFixed(2);
      if (p.shape === "eye") {
        const o = r * 0.62 * 1.333; // almond: two arcs meeting at pointed corners, opening ≈ 0.62 r
        return `M${f2(cx - r)},${f2(cy)} C${f2(cx - r * 0.42)},${f2(cy - o)} ${f2(cx + r * 0.42)},${f2(cy - o)} ${f2(cx + r)},${f2(cy)} C${f2(cx + r * 0.42)},${f2(cy + o)} ${f2(cx - r * 0.42)},${f2(cy + o)} ${f2(cx - r)},${f2(cy)}Z`;
      }
      if (p.shape === "rounded-rect") {
        const hw = r, hh = r * 0.8, q = Math.min(hw, hh) * 0.32;
        return `M${f2(cx - hw + q)},${f2(cy - hh)} H${f2(cx + hw - q)} A${f2(q)},${f2(q)} 0 0 1 ${f2(cx + hw)},${f2(cy - hh + q)} V${f2(cy + hh - q)} A${f2(q)},${f2(q)} 0 0 1 ${f2(cx + hw - q)},${f2(cy + hh)} H${f2(cx - hw + q)} A${f2(q)},${f2(q)} 0 0 1 ${f2(cx - hw)},${f2(cy + hh - q)} V${f2(cy - hh + q)} A${f2(q)},${f2(q)} 0 0 1 ${f2(cx - hw + q)},${f2(cy - hh)}Z`;
      }
      return `M${f2(cx - r)},${f2(cy)} A${f2(r)},${f2(r)} 0 1 0 ${f2(cx + r)},${f2(cy)} A${f2(r)},${f2(r)} 0 1 0 ${f2(cx - r)},${f2(cy)}Z`;
    };
    const portal = p.end === "portal";
    const r0 = ML.clamp(+p.start_radius, 0, 80) * k, hold = ML.clamp(+p.hold, 0, 1);
    // the portal: a share of the frame's short side, kept whole inside the picture (with its rim)
    const fit = (p.shape === "eye" ? Math.min(b.w / 2, b.h / 2 / 0.62) : p.shape === "rounded-rect" ? Math.min(b.w / 2, b.h / 2 / 0.8) : Math.min(b.w, b.h) / 2) * 0.9;
    const rP = Math.min((ML.clamp(+p.portal_size, 15, 45) / 100) * Math.min(ctx.f.W, ctx.f.H), fit);
    const peekIn = r0 > 0 ? 0.25 : 0, open0 = at + peekIn + hold, open1 = open0 + 0.7, settle = portal ? at + 0.4 : open1;
    const inOut = ML.bezier(0.65, 0, 0.35, 1);
    const radiusAt = (t) => {
      if (portal) return rP * Math.max(0, ML.back(t, at, at + 0.4, 1.4));
      const peek = r0 * (peekIn ? ML.out(t, at, at + peekIn) : 1);
      return peek + (cover - peek) * inOut(ML.lin(t, open0, open1));
    };

    let svg = null, rim = null;
    if (p.rim) {
      const name = String(p.rim_colour || "accent").replace(/[^a-z0-9-]/gi, "");
      const col = `var(--x-${name || "accent"}, var(--x-accent))`;
      svg = document.createElementNS(NS, "svg");
      svg.setAttribute("width", b.w); svg.setAttribute("height", b.h);
      svg.style.cssText = `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;overflow:hidden;pointer-events:none;z-index:3`;
      rim = document.createElementNS(NS, "path");
      rim.setAttribute("fill", "none");
      rim.style.stroke = col; rim.style.strokeWidth = (4 * k).toFixed(2) + "px";
      rim.style.filter = `drop-shadow(0 0 ${(8 * k).toFixed(1)}px ${col})`;
      svg.append(rim);
      host.append(svg);
    }
    ctx.sfx(at, "whoosh.soft", 0.35);
    if (!portal) ctx.sfx(open0, "whoosh.soft", 0.45);
    return {
      draw(t) {
        const on = t >= at - 1e-6, r = on ? radiusAt(t) : 0, done = !portal && t >= open1;
        frame.style.clipPath = done ? "none" : `path("${path(r)}")`;
        if (inner) inner.style.scale = (1 + (ML.clamp(+p.inner_scale, 1.05, 1.2) - 1) * (1 - ML.out(t, at, settle))).toFixed(4);
        if (svg) {
          svg.style.visibility = on && !done && r > 0.5 ? "visible" : "hidden";
          rim.setAttribute("d", path(Math.max(r, 0.02)));
          rim.style.opacity = portal ? "1" : (1 - ML.lin(t, open0 + 0.35, open1)).toFixed(3);
        }
      },
    };
  },
});

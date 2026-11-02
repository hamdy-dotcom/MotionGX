// Edit applies in place: right after an edit request, a light shimmer sweeps the thing (0.9 s power2.inOut) and 0.4 s
// into it the change lands — the headline grows 1 -> 1.22 from its start corner on back.out(1.6) in 0.5 s ("bigger"),
// or its ground warms over 0.6 s, or its words are rewritten (old blur out, new blur in). The growth is clamped so the
// line never leaves the frame; the element keeps its slot (only its content scales, nothing reflows).
// Source: MotionGX's own lib/studio-engine/assets/scenes.js S.phone (the post that updates after the ask).
ML.define({
  id: "ui.live-edit-apply",
  category: "ui",
  name: "Edit applies in place",
  does: "Right after the request, the post itself changes: its headline grows, its background warms, or its words are rewritten.",
  says: ["change", "result"],
  energy: 2,
  targets: ["headline", "card"],
  duration: [0.5, 1.2],
  params: {
    change: { type: "choice", options: ["scale", "colour", "text"], default: "scale" },
    scale: { type: "number", range: [1.1, 1.3], default: 1.22 },
    shimmer: { type: "bool", default: true },
    new_text: { type: "text", default: "" },
  },
  pairs: ["ui.cursor-glide-click", "ui.processing-overlay"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "own:lib/studio-engine/assets/scenes.js#S.phone", license: "own" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const doc = document;
    const mk = (tag, css, parent) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (parent) parent.append(e); return e; };
    // a card keeps its own layout: its biggest text is what grows or is rewritten, the card itself is what warms
    const blockOf = (e) => /^(block|flex|grid|table|list-item)/.test(getComputedStyle(e).display);
    const isCard = /^(flex|grid)/.test(getComputedStyle(el).display) || [...el.children].some(blockOf);
    let lead = el;
    if (isCard) {
      let best = 0;
      for (const n of el.querySelectorAll("*")) {
        if (n.children.length || !n.textContent.trim() || n.closest("svg")) continue;
        const s = parseFloat(getComputedStyle(n).fontSize);
        if (s > best) { best = s; lead = n; }
      }
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
    }
    // the content in one inline box: it scales / tints / swaps while the slot itself stays put
    const box = mk("span", "position:relative;display:inline-block;border-radius:calc(var(--x-radius) * 0.4)");
    const old = mk("span", "display:inline", box);
    while (lead.firstChild) old.append(lead.firstChild);
    lead.append(box);
    const skin = isCard ? el : box; // what warms, fades and carries the shimmer
    // the change starts 0.4 s into the shimmer
    const tc = p.shimmer ? at + 0.4 : at;
    ctx.sfx(tc, "swell", 0.35);
    // growth from the start corner (centre when the line is centred), clamped to the stage
    const align = getComputedStyle(lead).textAlign;
    const ox = align === "center" || align === "left" || align === "right" ? align : (align === "end") !== rtl ? "left" : "right";
    box.style.transformOrigin = `${ox} top`;
    const r = ctx.box(box), sw = ctx.stage.offsetWidth || 1080, margin = sw * 0.03;
    const anchor = ox === "center" ? r.x + r.w / 2 : ox === "left" ? r.x : r.x + r.w;
    const room = ox === "center" ? Math.min(anchor - margin, sw - margin - anchor) * 2 : ox === "left" ? sw - margin - anchor : anchor - margin;
    const maxS = Math.max(1, room / Math.max(1, r.w));
    // and it keeps off what sits under it (the line box has air: a little touch of it is fine, never below a visible grow)
    const next = lead.nextElementSibling;
    const maxDown = next && next.textContent.trim() ? Math.max(1.12, (ctx.box(next).y - r.y) / Math.max(1, r.h)) : Infinity;
    const S = Math.min(p.scale, maxS, maxDown);
    // the rewrite
    let neu = null;
    if (p.change === "text") {
      const txt = p.new_text || (rtl ? "أوضح وأقرب ليك" : "Clearer, and yours");
      neu = mk("span", `position:absolute;inset:0;display:flex;align-items:center;justify-content:${ox};white-space:nowrap;opacity:0`, box);
      neu.textContent = txt;
      ML.fit(neu, room);
    }
    let sh = null;
    if (p.shimmer) {
      const clip = mk("span", `position:absolute;inset:${isCard ? "0" : "-0.1em"};overflow:hidden;pointer-events:none;border-radius:inherit`, skin);
      // on a bare line the band has no edge of its own: it melts out at the box, a sheen and never a tinted block
      if (!isCard) clip.style.cssText += ";-webkit-mask-image:linear-gradient(90deg, transparent, #000 14%, #000 86%, transparent), linear-gradient(transparent, #000 18%, #000 82%, transparent);-webkit-mask-composite:source-in;mask-composite:intersect";
      sh = mk("i", "position:absolute;top:0;bottom:0;width:60%;background:linear-gradient(100deg, transparent 0%, color-mix(in srgb, var(--x-accent-2) 45%, transparent) 50%, transparent 100%)", clip);
    }
    const warm = "color-mix(in srgb, var(--x-panel) 82%, var(--x-bad) 18%)";
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.2)) / 0.18);
        if (sh) {
          const u = ML.ease(t, at, at + 0.9), x = -120 + 360 * u; // -120% .. 240% of the band
          sh.style.left = rtl ? "auto" : `${(x * 0.6).toFixed(2)}%`;
          sh.style.right = rtl ? `${(x * 0.6).toFixed(2)}%` : "auto";
          sh.style.opacity = t > at && t < at + 0.9 ? "1" : "0";
        }
        if (p.change === "scale") {
          const u = ML.back(t, tc, tc + 0.5, 1.6);
          const s = 1 + (S - 1) * u;
          box.style.scale = s === 1 ? "none" : s.toFixed(4);
        } else if (p.change === "colour") {
          const u = ML.ease(t, tc, tc + 0.6);
          // a card warms from its own ground; a line gets a warm ground of its own, hugged by an even margin
          skin.style.background = u > 0 ? `color-mix(in srgb, ${warm} ${(u * 100).toFixed(1)}%, ${isCard ? "var(--x-panel)" : "transparent"})` : "";
          if (!isCard) box.style.boxShadow = u > 0 ? `0 0 0 0.18em color-mix(in srgb, ${warm} ${(u * 100).toFixed(1)}%, transparent)` : "none";
        } else if (neu) {
          const outU = ML.ease(t, tc, tc + 0.22), inU = ML.land(t, tc + 0.16, tc + 0.5);
          old.style.opacity = (1 - outU).toFixed(4);
          old.style.filter = outU > 0 && outU < 1 ? `blur(${(outU * 10).toFixed(2)}px)` : "none";
          neu.style.opacity = inU.toFixed(4);
          neu.style.filter = inU < 1 ? `blur(${((1 - inU) * 10).toFixed(2)}px)` : "none";
          neu.style.translate = `0 ${((1 - inU) * 0.15).toFixed(3)}em`;
        }
        skin.style.opacity = (1 - leave).toFixed(4);
      },
    };
  },
});

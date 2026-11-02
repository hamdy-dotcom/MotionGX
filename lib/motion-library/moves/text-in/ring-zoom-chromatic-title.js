// Ring zoom with chromatic title: one to three rings rush at the viewer from the title's centre (scale 0.3 → 1.6 of
// their base size over 0.5 s, expo out, alternating a glowing accent ring and a thin ink ring, fading as they pass),
// and the title appears in their centre split into two colour copies offset ±split px with a blur that sharpens and a
// 1.15 → 1 settle. Rings are resized (width / height), never scaled, so their edges stay crisp.
// Source: prompt-motion ayushunleashed "motion designers are about…" (reference only — our own rebuild).
ML.define({
  id: "text-in.ring-zoom-chromatic-title",
  category: "text-in",
  name: "Ring zoom with chromatic title",
  does: "A large ring rushes towards the viewer and a word appears in its centre with a two-colour fringe and a blur that sharpens.",
  says: ["arrival", "brand", "energy"],
  energy: 4,
  targets: ["headline", "logo"],
  duration: [0.6, 1.5],
  params: {
    rings: { type: "number", range: [1, 3], default: 2 },
    split: { type: "number", range: [2, 10], default: 6, unit: "px" },
    rush: { type: "number", range: [0.3, 0.9], default: 0.5, unit: "s" },
    blur: { type: "number", range: [0, 12], default: 6, unit: "px" },
    settle: { type: "number", range: [0.2, 0.6], default: 0.35, unit: "s" },
  },
  pairs: ["camera.push-in", "transition.flash-cut"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.heavy",
  source: { from: "prompt-motion:ayushunleashed-motion-designers-are-about", license: "reference", note: "our own code after the technique" },
  async setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    // a logo slot can be an <svg> or <img>: it is wrapped whole (its contents can't move into an HTML box)
    const svg = el instanceof SVGElement, img = el.tagName === "IMG";
    // measure with the real face: wait for the faces this text uses (a page's fonts can still be arriving)
    try { const cs = getComputedStyle(el); await document.fonts.load(`${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, el.textContent || "A"); await document.fonts.ready; } catch (e) { /* no font API: measure as is */ }
    const host = ctx.scene || ctx.stage;
    // the title's own content in one box, so the copies, blur and settle never move the slot itself
    const inner = document.createElement("span");
    inner.style.cssText = "display:inline-block;transform-origin:50% 50%";
    if (svg || img) { el.replaceWith(inner); inner.append(el); el.style.display = "block"; }
    else { while (el.firstChild) inner.append(el.firstChild); el.append(inner); }
    const b = ctx.box(inner), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const base = Math.max(b.w * 0.8, Math.min(ctx.f.W, ctx.f.H) * 0.55);
    const n = Math.round(ML.clamp(p.rings, 1, 3));
    const rings = [];
    for (let i = 0; i < n; i++) {
      const r = document.createElement("div");
      const glow = i % 2 === 0;
      r.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;border-radius:50%;pointer-events:none;box-sizing:border-box;visibility:hidden;` +
        (glow ? "border:8px solid var(--x-accent);box-shadow:0 0 28px var(--x-accent), inset 0 0 22px var(--x-accent);" : "border:2px solid var(--x-ink);");
      host.append(r);
      rings.push({ r, start: at + i * 0.08 });
    }
    const wordAt = at + p.rush * 0.3;
    ctx.sfx(at, "whoosh.heavy", 0.5);
    ctx.sfx(wordAt + p.settle * 0.5, "hit", 0.3);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.18);
        for (const { r, start } of rings) {
          const u = ML.expo(t, start, start + p.rush), s = 0.3 + 1.3 * u;
          const o = t < start ? 0 : (1 - ML.lin(t, start + p.rush * 0.45, start + p.rush * 1.15)) * Math.min(1, ML.lin(t, start, start + 0.06));
          if (o <= 0.002) { r.style.visibility = "hidden"; continue; }
          const d = base * s;
          r.style.visibility = "visible";
          r.style.width = r.style.height = d.toFixed(1) + "px";
          r.style.marginLeft = r.style.marginTop = (-d / 2).toFixed(1) + "px";
          r.style.opacity = o.toFixed(4);
        }
        const v = ML.expo(t, wordAt, wordAt + p.settle);
        const shown = t >= wordAt ? Math.min(1, ML.lin(t, wordAt, wordAt + 0.08)) : 0;
        el.style.opacity = (shown * (1 - leave)).toFixed(4);
        // a picture is never enlarged or blurred: it settles up from below its size, sharp
        inner.style.scale = (img ? 0.9 + 0.1 * v : 1.15 - 0.15 * v).toFixed(4);
        const bl = img ? 0 : (1 - v) * p.blur + leave * 10;
        const off = (1 - v) * p.split, dir = ctx.rtl ? -1 : 1;
        // text takes its fringe from text-shadow; an SVG's copies are drop-shadows
        const fringe = svg && off > 0.1 ? `drop-shadow(${(-off * dir).toFixed(2)}px 0 var(--x-bad)) drop-shadow(${(off * dir).toFixed(2)}px 0 var(--x-accent-2)) ` : "";
        inner.style.filter = fringe + (bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : "") || "none";
        inner.style.textShadow = off > 0.1
          ? `${(-off * dir).toFixed(2)}px 0 color-mix(in srgb, var(--x-bad) 85%, transparent), ${(off * dir).toFixed(2)}px 0 color-mix(in srgb, var(--x-accent-2) 85%, transparent)`
          : "none";
      },
    };
  },
});

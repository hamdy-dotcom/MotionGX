// Darkened blurred backdrop: a close-up photo fills the frame behind the text, heavily darkened and soft-focused, and
// drifts slowly. Full-bleed copy of the picture with a static filter blur(6px) brightness(.35) saturate(.9) (set once,
// so the drift stays cheap and seekable), a warm brown tint laid over it in multiply, and a slow scale 1.05 -> 1.05 +
// drift across the shot (linear or sine.inOut). The text sits on top with no box: it turns to the look's light ink
// with a soft shadow while the backdrop is up. The picture is only ever the soft backdrop (the point of the technique);
// the sharp target hides while its copy stands behind the words.
// Source: prompt-motion amitsingha89 "Opus 5.5 made this" (reference only: rebuilt as our own code).
ML.define({
  id: "photo.darkened-blur-backdrop",
  category: "photo",
  name: "Darkened blurred backdrop",
  does: "A close-up photo sits behind the text heavily darkened and soft-focused, slowly drifting.",
  says: ["luxury", "calm", "ambient"],
  energy: 1,
  targets: ["image", "stage"],
  duration: [2, 12],
  params: {
    blur: { type: "number", range: [2, 16], default: 6, unit: "px" },
    darkness: { type: "number", range: [0.2, 0.6], default: 0.35 },
    tint: { type: "text", default: "warm brown" },
    drift: { type: "number", range: [0, 0.08], default: 0.05 },
    ease: { type: "choice", options: ["none", "sine.inOut"], default: "none" },
    text: { type: "choice", options: ["light", "keep"], default: "light" },
  },
  pairs: ["text-in.punchline", "photo.frame-parallax"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:amitsingha89-opus-5-5-made-this", license: "reference", note: "rebuilt as our own code" },
  async setup(ctx) {
    const { el, p, at, end, f } = ctx;
    const host = ctx.scene || ctx.stage;
    const pic = el && (el.tagName === "IMG" ? el : el.querySelector && el.querySelector("img")) || host.querySelector("img");
    if (!pic) return null;
    try { await pic.decode(); } catch (e) { /* drawn as it is */ }
    const W = f.W, H = f.H, k = W / 1080;
    const mk = (tag, css, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (parent) parent.append(e); return e; };
    const layer = mk("div", "position:absolute;inset:0;overflow:hidden;pointer-events:none;visibility:hidden;background:var(--x-ink)");
    host.insertBefore(layer, host.firstChild); // behind every slot: the words stay in front
    const bl = p.blur * k;
    const copy = pic.cloneNode(true);
    copy.removeAttribute("data-slot"); copy.removeAttribute("data-slot-sample");
    // overscan the blur's soft edge, then the static filter (never changes per frame)
    copy.style.cssText = `position:absolute;left:${-bl * 2}px;top:${-bl * 2}px;width:${W + bl * 4}px;height:${H + bl * 4}px;max-width:none;margin:0;border-radius:0;object-fit:cover;transform-origin:50% 50%;` +
      `filter:blur(${bl.toFixed(1)}px) brightness(${ML.clamp(p.darkness, 0.1, 1)}) saturate(0.9)`;
    layer.append(copy);
    // the tint: words resolve to look colours, anything else is taken as a colour the brand gave
    const word = String(p.tint || "").trim().toLowerCase();
    const TINTS = {
      "warm brown": "color-mix(in srgb, var(--x-ink) 62%, var(--x-bad))", warm: "color-mix(in srgb, var(--x-ink) 62%, var(--x-bad))",
      brand: "color-mix(in srgb, var(--x-ink) 55%, var(--x-accent))", accent: "color-mix(in srgb, var(--x-ink) 55%, var(--x-accent))",
      cool: "color-mix(in srgb, var(--x-ink) 62%, var(--x-accent-2))", ink: "var(--x-ink)",
    };
    const tintCol = word === "none" || word === "" ? "" : TINTS[word] || p.tint;
    const tint = tintCol ? mk("div", `position:absolute;inset:0;background:${tintCol};mix-blend-mode:multiply;opacity:0.55`, layer) : null;
    // a gentle falloff so the words always read
    mk("div", "position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 45%, transparent 40%, color-mix(in srgb, var(--x-ink) 45%, transparent))", layer);
    const head = host.querySelector(".ml-head");
    const sharp = el && el !== ctx.stage && el !== host ? el : pic;
    const lift = 1.05, fade = Math.min(0.6, (end - at) * 0.25);
    ctx.sfx(at, "swell", 0.2);
    return {
      draw(t) {
        const on = t >= at - 1e-6 && t < end;
        layer.style.visibility = on ? "visible" : "hidden";
        sharp.style.visibility = on ? "hidden" : "";
        if (head && p.text === "light") { head.style.color = on ? "var(--x-accent-ink)" : ""; head.style.textShadow = on ? "0 1px 8px color-mix(in srgb, var(--x-ink) 35%, transparent)" : ""; }
        if (!on) return;
        const u = p.ease === "sine.inOut" ? 0.5 - Math.cos(Math.PI * ML.lin(t, at, end)) / 2 : ML.lin(t, at, end);
        copy.style.transform = `scale(${(lift + p.drift * u).toFixed(5)})`;
        const o = ML.ease(t, at, at + fade) * (1 - ML.lin(t, end - 0.3, end));
        layer.style.opacity = o.toFixed(4);
        if (tint) tint.style.opacity = "0.55";
      },
    };
  },
});

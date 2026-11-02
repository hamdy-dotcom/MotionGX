// Colour-field cut: on a chapter boundary the ground changes to a flat saturated field (instant cut, a 0.15 s fade, or
// a 0.6 s clip-path wipe of the new block, inset(100% 0 0 0) -> inset(0) from the bottom or from the reading side),
// with a subtle lighter radial centre; it holds empty for a beat (the reset), then the chapter's title enters on it
// with a masked word rise, its ink flipped to read on the field. The field's colour is a look name or a --x- variable.
// Source: MengTo/Skills editorial-portfolio-chapters demo (MIT: flat chapter fields, ink on field, the wipe) and
// prompt-motion devius-maximus-this-is-nuts-made (reference only).
ML.define({
  id: "transition.colour-field-cut",
  category: "transition",
  name: "Colour-field cut",
  does: "The frame snaps or wipes to a flat saturated colour field, holds it empty for a beat, then the next chapter's title enters on it.",
  says: ["transition", "brand", "story", "change", "energy", "relief"],
  energy: 4,
  targets: ["scene"],
  duration: [0.5, 1.4],
  params: {
    mode: { type: "choice", options: ["cut", "fade", "wipe-up", "wipe-left"], default: "cut" },
    colour: { type: "text", default: "accent" },
    empty_beat: { type: "number", range: [0, 0.8], default: 0.5, unit: "s" },
    title: { type: "text", default: "" },
  },
  pairs: ["text-in.mask-rise", "text-in.kicker-lead"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "MengTo/Skills:agent-skills/web-design/editorial-portfolio-chapters/demo/index.html", license: "MIT", note: "with prompt-motion devius-maximus-this-is-nuts-made (reference)" },
  async setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const c = String(p.colour || "accent").trim();
    const name = c.startsWith("--x-") ? c.slice(4) : c;
    const col = c.startsWith("--x-") ? `var(${c})` : /^(accent|accent-2|ink|good|bad|panel|ground|dim)$/.test(c) ? `var(--x-${c})` : "var(--x-accent)";
    // ink that reads on the field
    const ink = name === "ink" || name === "dim" ? "var(--x-ground)" : name === "panel" || name === "ground" || name === "panel-2" ? "var(--x-ink)" : "var(--x-accent-ink)";
    const field = document.createElement("div");
    field.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:6;visibility:hidden;` +
      `background:radial-gradient(ellipse 70% 60% at 50% 45%, color-mix(in srgb, ${col} 92%, var(--x-accent-ink)) 0%, ${col} 62%, color-mix(in srgb, ${col} 94%, var(--x-device)) 100%)`;
    host.append(field);
    // the chapter title: the scene's headline (or the given text), set on the field in its own place
    const head = host.querySelector(".ml-title") || host.querySelector(".ml-hero");
    const text = p.title || (head ? head.textContent.trim() : "");
    const title = document.createElement("div");
    title.className = head ? head.className : "ml-title";
    title.setAttribute("dir", ctx.rtl ? "rtl" : "ltr");
    if (head) {
      try { const cs = getComputedStyle(head); await document.fonts.load(`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, text || "A"); } catch (e) { /* measure as is */ }
      const b = ctx.box(head), hb = host === stage ? { x: 0, y: 0 } : ctx.box(host);
      title.style.cssText = `position:absolute;left:${(b.x - hb.x).toFixed(1)}px;top:${(b.y - hb.y).toFixed(1)}px;width:${b.w.toFixed(1)}px;min-height:${b.h.toFixed(1)}px;text-align:${getComputedStyle(head).textAlign}`;
    } else {
      title.style.cssText = `position:absolute;left:${f.safe.x}px;top:${f.H * 0.4}px;width:${f.safe.w}px;text-align:center`;
    }
    title.style.zIndex = "7";
    title.style.color = ink;
    title.style.pointerEvents = "none";
    title.textContent = text;
    host.append(title);
    const words = ML.split(title, "words");
    // each word rises inside its own mask (the line box clips it)
    const masks = words.map((w) => {
      const m = document.createElement("span");
      m.style.cssText = "display:inline-block;overflow:hidden;vertical-align:top;padding:0.06em 0.02em 0.14em;margin:-0.06em -0.02em -0.14em";
      w.replaceWith(m); m.append(w);
      return m;
    });
    const wipe = p.mode === "cut" ? 0 : p.mode === "fade" ? 0.15 : 0.6;
    const landed = at + wipe;
    const tIn = landed + p.empty_beat;
    const times = words.map((w, i) => tIn + i * 0.08);
    const leave = end; // the field holds to the cut
    const bez = ML.bezier(0.65, 0, 0.35, 1);
    ctx.sfx(p.mode === "cut" ? at : at + wipe * 0.6, "hit", 0.45);
    if (text) ctx.sfx(tIn + 0.05, "whoosh.soft", 0.25);
    void masks;
    return {
      draw(t) {
        const on = t >= at && t < leave + 0.2;
        field.style.visibility = on ? "visible" : "hidden";
        title.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        let op = 1, clip = "none";
        if (p.mode === "fade") op = ML.ease(t, at, at + wipe);
        else if (p.mode === "wipe-up") { const u = bez(ML.lin(t, at, at + wipe)); clip = `inset(${((1 - u) * 100).toFixed(3)}% 0 0 0)`; }
        else if (p.mode === "wipe-left") { const u = bez(ML.lin(t, at, at + wipe)), r = ((1 - u) * 100).toFixed(3); clip = ctx.rtl ? `inset(0 0 0 ${r}%)` : `inset(0 ${r}% 0 0)`; }
        const out = ML.lin(t, leave, leave + 0.2);
        field.style.opacity = (op * (1 - out)).toFixed(4);
        field.style.clipPath = clip;
        title.style.opacity = (1 - out).toFixed(4);
        words.forEach((w, i) => {
          const u = ML.expo(t, times[i], times[i] + 0.55);
          w.style.translate = `0 ${((1 - u) * 110).toFixed(2)}%`;
          w.style.opacity = t < times[i] ? "0" : "1";
        });
      },
    };
  },
});

// Tracking spread takeover: a name's letters spread apart and fade (letter-spacing 0 -> 0.5em, opacity 1 -> 0 over
// 0.4 s power2.in) while its round letter (an O, a 0, a dot) swells into a disc that covers the frame (0.5 s power3.in,
// a soft glow on its edge). The frame then holds the solid colour with a subtle radial vignette for `hold`, ready for
// the cut. The spread is drawn as each letter's offset from the round one (what tracking does to a centred line,
// without reflowing it), so the disc stays anchored on its letter. Latin only: tracking pulls joined letters apart.
// Colour is a look name (accent, accent-2, ink, good, bad…) or a --x- variable.
// Source: prompt-motion blushpetal795-wtf-made-this-with (reference only: our own rebuild).
ML.define({
  id: "transition.tracking-spread-circle-takeover",
  category: "transition",
  name: "Tracking spread takeover",
  does: "The name's letters spread apart and fade while its round letter or dot swells until it covers the frame.",
  says: ["transition", "energy", "brand"],
  energy: 4,
  targets: ["scene", "word", "logo"],
  duration: [0.5, 0.9],
  params: {
    colour: { type: "text", default: "accent" },
    hold: { type: "number", range: [0, 0.4], default: 0.2, unit: "s" },
    spread: { type: "number", range: [0.2, 0.8], default: 0.5, unit: "em" },
  },
  pairs: ["transition.colour-field-cut", "text-in.punchline"],
  avoid: ["calm"],
  rtl: false,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:blushpetal795-wtf-made-this-with", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const c = String(p.colour || "accent").trim();
    const col = c.startsWith("--x-") ? `var(${c})` : /^(accent|accent-2|ink|good|bad|panel|ground|dim|device)$/.test(c) ? `var(--x-${c})` : "var(--x-accent)";
    // the name: the target word / logo text, else the scene's headline
    const own = ctx.el && ctx.el !== stage && ctx.el !== scene ? ctx.el : null;
    const isText = own && !/^(svg|img|video|canvas|picture)$/i.test(own.tagName);
    const word = isText ? own : scene.querySelector(".ml-title, .ml-hero, [data-slot-sample='headline']");
    // a logo in a scene with no line of text: the logo itself is the round thing that swells
    const chars = word ? ML.split(word, "chars") : own ? [own] : [];
    if (!chars.length) return null;
    // the round letter: an O / o / 0 / Q / period first, else the middle letter
    const ROUND = /^[Oo0Q.•·]$/;
    let iR = chars.findIndex((ch) => ROUND.test(ch.textContent));
    if (iR < 0) iR = chars.findIndex((ch) => /^[DGCdbpqeacgUu]$/.test(ch.textContent));
    if (iR < 0) iR = Math.floor(chars.length / 2);
    const round = chars[iR];
    const fs = parseFloat(getComputedStyle(word || own).fontSize) || 100;
    // lines: letters grouped by their top, so each line spreads around its own centre (the round one's line around it)
    const tops = chars.map((ch) => Math.round(ch.offsetTop));
    const lineOf = new Map();
    chars.forEach((ch, i) => { const k = tops[i]; if (!lineOf.has(k)) lineOf.set(k, []); lineOf.get(k).push(i); });
    const anchor = chars.map((_, i) => {
      const line = lineOf.get(tops[i]);
      return line.includes(iR) ? line.indexOf(iR) : (line.length - 1) / 2;
    });
    const posIn = chars.map((_, i) => lineOf.get(tops[i]).indexOf(i));
    // the disc: takes over from the round letter at its size (the letter turns the disc's colour first), grows from its centre
    const b = ctx.box(round), cx = b.x + b.w / 2, cy = b.y + b.h * (round.textContent === "." ? 0.78 : 0.58);
    const r0 = round.textContent === "." ? fs * 0.07 : Math.min(b.w, b.h) * 0.36;
    const R = Math.hypot(Math.max(cx, f.W - cx), Math.max(cy, f.H - cy)) * 1.08;
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:7;overflow:hidden";
    scene.append(layer);
    const disc = document.createElement("div");
    disc.style.cssText = `position:absolute;border-radius:50%;background:radial-gradient(circle, ${col} 0%, ${col} 62%, color-mix(in srgb, ${col} 82%, var(--x-device)) 100%);box-shadow:0 0 ${(fs * 0.4).toFixed(0)}px ${(fs * 0.12).toFixed(0)}px color-mix(in srgb, ${col} 55%, transparent)`;
    layer.append(disc);
    const vig = document.createElement("div");
    vig.style.cssText = `position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%, transparent 45%, color-mix(in srgb, var(--x-device) 22%, transparent) 100%);opacity:0`;
    layer.append(vig);
    const p2in = (x) => x * x, p3in = (x) => x * x * x;
    const sp = ML.clamp(p.spread, 0.2, 0.8), K = ML.clamp((ctx.end - at) / 0.5, 0.4, 1); // a short slot plays it faster, never cut off
    ctx.sfx(at, "whoosh.soft", 0.35);
    return {
      draw(t) {
        const a = p2in(ML.lin(t, at, at + 0.4 * K)), g = p3in(ML.lin(t, at, at + 0.5 * K));
        chars.forEach((ch, i) => {
          if (i === iR) {
            const c1 = ML.lin(t, at, at + 0.08), c2 = ML.lin(t, at + 0.08, at + 0.14);
            ch.style.color = c1 > 0 ? `color-mix(in srgb, ${col} ${(c1 * 100).toFixed(1)}%, currentColor)` : "";
            ch.style.opacity = c2 > 0 ? (1 - c2).toFixed(4) : "";
            return;
          }
          const dx = (posIn[i] - anchor[i]) * sp * fs * a;
          ch.style.translate = a > 0 ? `${dx.toFixed(2)}px 0` : "";
          ch.style.opacity = a > 0 ? (1 - a).toFixed(4) : "";
        });
        if (t < at) { layer.style.visibility = "hidden"; return; }
        layer.style.visibility = "visible";
        disc.style.opacity = ML.lin(t, at + 0.06, at + 0.12).toFixed(4);
        const r = r0 + (R - r0) * g;
        Object.assign(disc.style, { left: (cx - r).toFixed(2) + "px", top: (cy - r).toFixed(2) + "px", width: (2 * r).toFixed(2) + "px", height: (2 * r).toFixed(2) + "px" });
        // full cover: the disc's edge leaves the frame, the vignette settles in for the hold
        vig.style.opacity = ML.lin(t, at + 0.45 * K, at + 0.5 * K + Math.max(0.05, p.hold)).toFixed(4);
      },
    };
  },
});

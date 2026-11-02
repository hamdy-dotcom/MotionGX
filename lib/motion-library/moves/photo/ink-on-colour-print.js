// Ink print on a colour ground: the picture becomes high-contrast black ink printed onto a flat colour, like a
// screen-print poster or a phosphor screen. Its frame gets its own stacking context (isolation:isolate) on the ground
// colour (the look's accent by default, or another look colour), and the picture goes grayscale(1) contrast(1.2–1.4)
// brightness(1.08) in mix-blend multiply, so its whites take the ground and its darks print as ink. Paper variant
// (mode "sepia"): sepia(.14) saturate(.9) multiplied onto a cream paper ground. Never a blur. It animates in from
// the colour picture to the print over 0.4–0.6 s (the colour copy fades off the print), or holds as the treatment.
// Works on a picture or a logo.
// Source: MengTo/Skills media/html-explainer-video demo looks poster.css + terminal.css + film.css (MIT):
// --x-pic-filter grayscale(1) contrast(1.25/1.2) brightness(1.08/1.1), --x-pic-blend multiply, --x-pic-ground,
// and film.css's isolated picture frames.
ML.define({
  id: "photo.ink-on-colour-print",
  category: "photo",
  name: "Ink print on a colour ground",
  does: "Photos become high-contrast black ink printed onto a flat colour, like a screen-print poster or phosphor screen.",
  says: ["brand", "playful", "tech"],
  energy: 2,
  targets: ["image", "logo"],
  duration: [0.5, 20],
  params: {
    ground: { type: "text", default: "look accent" },
    contrast: { type: "number", range: [1.1, 1.4], default: 1.2 },
    mode: { type: "choice", options: ["multiply", "sepia"], default: "multiply" },
    reveal: { type: "choice", options: ["animate", "hold"], default: "animate" },
    speed: { type: "number", range: [0.4, 0.6], default: 0.5, unit: "s" },
  },
  pairs: ["photo.halftone", "photo.ken-burns"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "snap",
  source: { from: "MengTo/Skills:agent-skills/media/html-explainer-video", license: "MIT", note: "demo/looks/poster.css + terminal.css picture print, demo/film.css isolated frames" },
  async setup(ctx) {
    const { el, p, at } = ctx;
    if (!el) return null;
    // the ground: a look colour by name ("look accent", "accent-2", "panel", "pic-ground", "--x-…"), the accent otherwise
    const g = String(p.ground || "").trim().toLowerCase().replace(/^look\s+/, "");
    const named = { accent: "var(--x-accent)", "accent-2": "var(--x-accent-2)", accent2: "var(--x-accent-2)", panel: "var(--x-panel)", "panel-2": "var(--x-panel-2)", ground: "var(--x-ground)", "pic-ground": "var(--x-pic-ground)", good: "var(--x-good)", bad: "var(--x-bad)" };
    const sepia = p.mode === "sepia";
    const ground = sepia && (g === "" || g === "accent") ? "color-mix(in srgb, var(--x-panel-2) 88%, var(--x-accent-2) 12%)" // cream paper from the look
      : g.startsWith("--x-") ? `var(${g})` : named[g] || "var(--x-accent)";
    const c = ML.clamp(p.contrast, 1.1, 1.4);
    const print = sepia ? `sepia(0.14) saturate(0.9) contrast(${c.toFixed(3)})` : `grayscale(1) contrast(${c.toFixed(3)}) brightness(1.08)`;

    // the frame: a box in the picture's place with its own stacking context on the ground colour
    const isImg = el.tagName === "IMG";
    const cs = getComputedStyle(el), b = ctx.box(el);
    const frame = document.createElement("div");
    frame.dataset.mlPic = "1";
    frame.style.cssText = `position:relative;overflow:hidden;isolation:isolate;flex:none;display:${cs.display === "inline" ? "inline-block" : cs.display === "none" ? "block" : cs.display};width:${b.w}px;height:${b.h}px;border-radius:${cs.borderRadius};margin:${cs.margin};align-self:${cs.alignSelf};vertical-align:middle`;
    el.parentNode.insertBefore(frame, el);
    frame.append(el);
    Object.assign(el.style, { width: "100%", height: "100%", display: "block", margin: "0" });
    const bg = document.createElement("div");
    bg.style.cssText = `position:absolute;inset:0;background:${ground};z-index:-1`;
    frame.prepend(bg);
    // the colour copy laid over the print, fading off as the print comes in
    let colour = null;
    if (p.reveal === "animate") {
      colour = el.cloneNode(true);
      colour.removeAttribute("data-slot"); colour.removeAttribute("id");
      colour.style.position = "absolute"; colour.style.inset = "0"; colour.style.filter = "var(--x-pic-filter)"; colour.style.mixBlendMode = "normal";
      frame.append(colour);
      if (isImg) await colour.decode?.().catch(() => {});
    }
    const dur = ML.clamp(p.speed, 0.4, 0.6);
    if (colour) ctx.sfx(at + dur * 0.5, "snap", 0.2);
    return {
      draw(t) {
        const on = t >= at - 1e-6;
        bg.style.opacity = on ? "1" : "0";
        el.style.filter = on ? print : "";
        el.style.mixBlendMode = on ? "multiply" : "";
        if (colour) {
          colour.style.visibility = on ? "visible" : "hidden";
          const u = ML.ease(t, at, at + dur);
          colour.style.opacity = (1 - u).toFixed(4);
          bg.style.opacity = on ? u.toFixed(4) : "0";
        }
      },
    };
  },
});

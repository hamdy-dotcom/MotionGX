// Serif italic accent: one word of a sans line is reset in the look's serif (italic, light, at 90 % ink or in the
// accent; Arabic gets the serif's Naskh face upright instead of a slant), same size and baseline, and it is revealed
// last — on its spoken word — by a crossfade from the sans (0.4 s, the word's box easing from the sans width to the
// serif's, both faces on one baseline), a rise out of a mask, or a clip wiping from the reading edge (0.4 s); optionally a slightly wavy hand-drawn underline (1.5 px stroke) draws under it in 0.4 s
// power2.out. Which word: the last, the first, or (any) the longest.
// Source: MengTo/Skills web-design/blue-cloudy-clean-modern (MIT: the one italic-serif word in a sans headline)
// + prompt-motion:blushpetal795-wtf-made-this-with (reference) — our own code.
ML.define({
  id: "text-emphasis.serif-italic-accent",
  category: "text-emphasis",
  name: "Key word in italic serif",
  does: "One word of a sans line is set in a contrasting italic serif (often in accent), revealed last, optionally with a hand-drawn underline.",
  says: ["luxury", "calm", "focus", "result", "brand"],
  energy: 2,
  targets: ["word", "headline"],
  duration: [0.5, 3],
  params: {
    position: { type: "choice", options: ["last", "first", "any"], default: "last" },
    reveal: { type: "choice", options: ["none", "crossfade", "mask-rise", "clip-wipe"], default: "clip-wipe" },
    colour: { type: "choice", options: ["ink", "accent"], default: "accent" },
    underline: { type: "bool", default: false },
    face: { type: "choice", options: ["serif", "script", "hand"], default: "serif" },
  },
  pairs: ["text-in.punchline", "text-emphasis.highlight-sweep"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:web-design/blue-cloudy-clean-modern", license: "MIT", note: "the italic-serif accent word; reveal and underline are our own (prompt-motion:blushpetal795-wtf-made-this-with, reference)" },
  setup(ctx) {
    const { el, p, at, rtl } = ctx;
    if (!el) return null;
    const words = ML.split(el, "words");
    if (!words.length) return null;
    const pick = p.position === "first" ? words[0] : p.position === "any" ? words.reduce((a, b) => (b.textContent.length > a.textContent.length ? b : a)) : words[words.length - 1];
    const text = pick.textContent, ar = ML.ARABIC.test(text);
    const fam = String(p.face || "serif").toLowerCase();
    const font = /script/.test(fam) ? "var(--x-script-font)" : /hand/.test(fam) ? "var(--x-hand-font)" : "var(--x-serif-font)";
    const colour = p.colour === "ink" ? "color-mix(in srgb, var(--x-ink) 90%, transparent)" : "var(--x-accent)";
    const fs = parseFloat(getComputedStyle(pick).fontSize) || 100;
    // the word: a box holding the serif (in flow) and, for a crossfade, the sans on top
    pick.textContent = "";
    Object.assign(pick.style, { position: "relative", verticalAlign: "baseline" });
    const serif = document.createElement("span");
    serif.textContent = text;
    Object.assign(serif.style, { display: "inline-block", fontFamily: font, fontStyle: ar ? "normal" : "italic", fontWeight: ar ? "400" : "300", color: colour, letterSpacing: ar ? "0" : "-0.01em", paddingInline: ar ? "0" : "0.04em" });
    // the mask is a clip, not overflow: overflow would drop the word's baseline and cut off its underline
    const mask = document.createElement("span");
    mask.style.display = "inline-block";
    if (p.reveal === "mask-rise") mask.style.clipPath = "inset(-0.4em -0.3em -0.14em -0.3em)";
    mask.append(serif);
    pick.append(mask);
    const sans = document.createElement("span");
    sans.textContent = text;
    sans.setAttribute("aria-hidden", "true");
    Object.assign(sans.style, { display: "inline-block", whiteSpace: "pre", opacity: "0", pointerEvents: "none" });
    let sansW = 0, serifW = 0;
    if (p.reveal === "crossfade") {
      // both faces in one grid cell, centred and on one baseline; the cell's width is eased in draw
      pick.append(sans);
      Object.assign(pick.style, { display: "inline-grid", gridTemplateColumns: "minmax(0, 1fr)" });
      for (const n of [mask, sans]) Object.assign(n.style, { gridArea: "1 / 1", justifySelf: "center", alignSelf: "baseline" });
      sansW = sans.offsetWidth; serifW = mask.offsetWidth;
    }
    // the underline: a wavy stroke drawn along the reading direction
    let path = null;
    if (p.underline) {
      const w = mask.offsetWidth || fs * 2, h = Math.max(8, fs * 0.16);
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", `0 0 ${w.toFixed(1)} ${h.toFixed(1)}`);
      svg.setAttribute("aria-hidden", "true");
      Object.assign(svg.style, { position: "absolute", left: "50%", transform: "translateX(-50%)", width: w + "px", height: h + "px", bottom: (-h * 0.55).toFixed(1) + "px", overflow: "visible", pointerEvents: "none" });
      const pts = [];
      for (let i = 0; i <= 8; i++) { const x = (i / 8) * w, y = h * (0.5 + 0.28 * Math.sin(i * 1.7 + 0.6) * (0.6 + 0.4 * ML.rnd(i, 3))); pts.push([x, y]); }
      if (rtl) pts.reverse();
      let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; d += ` Q${x0.toFixed(1)} ${y0.toFixed(1)} ${((x0 + x1) / 2).toFixed(1)} ${((y0 + y1) / 2).toFixed(1)}`; }
      d += ` L${pts[pts.length - 1][0].toFixed(1)} ${pts[pts.length - 1][1].toFixed(1)}`;
      svg.innerHTML = `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${Math.max(1.5, fs * 0.02).toFixed(2)}" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/>`;
      pick.append(svg);
      path = svg.querySelector("path");
    }
    // revealed last: on its spoken word when the voice says it
    const a = p.reveal === "none" ? at : Math.max(at + 0.2, ctx.word(text, at + 0.4));
    const D = 0.4, line = a + (p.reveal === "none" ? 0 : D * 0.75);
    if (p.reveal !== "none") ctx.sfx(a, "whoosh.soft", 0.15);
    return {
      draw(t) {
        const u = ML.ease(t, a, a + D);
        if (p.reveal === "crossfade") {
          serif.style.opacity = u.toFixed(4);
          sans.style.opacity = (1 - u).toFixed(4);
          pick.style.width = (sansW + (serifW - sansW) * u).toFixed(2) + "px";
        } else if (p.reveal === "mask-rise") {
          const v = ML.land(t, a, a + D + 0.1);
          serif.style.transform = `translateY(${((1 - v) * 125).toFixed(2)}%)`;
          serif.style.opacity = t >= a ? "1" : "0";
        } else if (p.reveal === "clip-wipe") {
          const r = ((1 - u) * 100).toFixed(2);
          serif.style.clipPath = u >= 1 ? "none" : rtl ? `inset(-20% 0 -20% ${r}%)` : `inset(-20% ${r}% -20% 0)`;
        }
        if (path) {
          path.setAttribute("stroke-dashoffset", Math.pow(1 - ML.lin(t, line, line + 0.4), 2).toFixed(4));
          path.style.opacity = t > line ? "1" : "0"; // a round cap would leave a dot before the stroke starts
        }
      },
    };
  },
});

// Offset outline echo lockup: a thin outline copy of the word (1 px stroke in a darker accent shade, no fill) sits
// offset ~10 px right / 8 px down behind the solid word. On each beat it steps ±6 px to a new seeded offset — stepped,
// no tween — while the solid word pulses to 1.02 and back. Beats are the spoken words inside the move (beat_sync) or a
// steady 120 bpm. The copy slides out from under the word when the move starts and tucks back in at its end.
// Source: our own rebuild of prompt-motion "safarkhanshuvo-this-is-insane-claude" — reference only.
ML.define({
  id: "kinetic.offset-outline-echo-lockup",
  category: "kinetic",
  name: "Offset outline echo lockup",
  does: "A solid word holds with a thin outline copy offset behind it that shifts slightly on each beat.",
  says: ["energy", "brand"],
  energy: 3,
  targets: ["word", "headline", "line"],
  duration: [1, 4],
  params: {
    offset: { type: "number", range: [4, 16], default: 10, unit: "px" },
    step: { type: "number", range: [2, 10], default: 6, unit: "px" },
    beat_sync: { type: "bool", default: true },
    pulse: { type: "number", range: [1, 1.05], default: 1.02 },
    bpm: { type: "number", range: [60, 180], default: 120 },
    colour: { type: "choice", options: ["accent", "ink"], default: "accent" },
  },
  pairs: ["text-in.slam", "rhythm.beat-pulse"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:safarkhanshuvo-this-is-insane-claude", license: "reference", note: "our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const doc = el.ownerDocument;
    const fs = parseFloat(getComputedStyle(el).fontSize) || 100;
    const k = Math.max(0.6, Math.min(2.2, fs / 100)); // offsets are given at ~100 px type
    // the echo: an exact copy of the word laid over it, behind it, stroke only
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    el.style.isolation = "isolate";
    const echo = doc.createElement("span");
    echo.setAttribute("aria-hidden", "true");
    echo.innerHTML = el.innerHTML;
    echo.querySelectorAll("[data-slot],[data-slot-sample]").forEach((n) => { n.removeAttribute("data-slot"); n.removeAttribute("data-slot-sample"); });
    // a text stroke draws every contour, so joined Arabic letters and a variable font's overlaps show seams inside the
    // glyph; this ring is cut from the glyph's silhouette (grown, minus the glyph), clean on any backdrop
    const outlineFilter = (px) => {
      const id = "ml-outline-" + Math.round(px * 100);
      if (!doc.getElementById(id)) {
        const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.setAttribute("aria-hidden", "true"); svg.style.position = "absolute";
        svg.innerHTML = `<filter id="${id}" x="-30%" y="-60%" width="160%" height="220%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="${(px / 1.2).toFixed(2)}"/><feComponentTransfer result="fat"><feFuncA type="linear" slope="8" intercept="-0.4"/></feComponentTransfer><feComposite in="fat" in2="SourceGraphic" operator="out"/></filter>`;
        ctx.stage.append(svg);
      }
      return `url(#${id})`;
    };
    const shade = p.colour === "accent" ? "color-mix(in srgb, var(--x-accent) 72%, var(--x-ink))" : "var(--x-ink)";
    Object.assign(echo.style, { position: "absolute", inset: "0", zIndex: "-1", pointerEvents: "none", color: shade, filter: outlineFilter(Math.max(1, fs / 110)), textAlign: "inherit", whiteSpace: "inherit" });
    echo.querySelectorAll("*").forEach((n) => { n.style.color = "inherit"; });
    el.prepend(echo);
    // beats: the spoken words that fall inside the move, else a steady tempo
    const span = [at + 0.25, end - 0.3];
    let beats = p.beat_sync ? (ctx.words || []).map((w) => w.t).filter((x) => x >= span[0] && x <= span[1]) : [];
    if (beats.length < 2) { beats = []; for (let x = span[0]; x <= span[1]; x += 60 / p.bpm) beats.push(x); }
    beats.forEach((b, i) => i % 2 === 0 && ctx.sfx(b, "tap", 0.18));
    ctx.sfx(at, "whoosh.soft", 0.2);
    // the copy sits to the reading end of the word (mirrored in RTL), a little down
    const sx = rtl ? -1 : 1, ox = p.offset * k * sx, oy = p.offset * 0.8 * k, st = p.step * k;
    // per beat a stepped offset: the base offset plus ±step on each axis; each beat takes a different corner from the
    // last (seeded), so every beat visibly steps
    const CORNERS = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
    const seq = [];
    beats.forEach((_, i) => seq.push(((i ? seq[i - 1] : 0) + 1 + Math.floor(ML.rnd(i, 3) * 3)) % 4));
    const pos = (i) => { if (i < 0) return [ox, oy]; const [a, b] = CORNERS[seq[i]]; return [ox + a * st, oy + b * st * 0.8]; };
    return {
      draw(t) {
        const inn = ML.out(t, at, at + 0.25), outE = ML.ease(t, end - 0.3, end - 0.05);
        const vis = inn * (1 - outE);
        let bi = -1;
        for (let i = 0; i < beats.length; i++) if (t >= beats[i]) bi = i;
        const [x, y] = pos(bi);
        echo.style.translate = `${(x * vis).toFixed(2)}px ${(y * vis).toFixed(2)}px`;
        echo.style.opacity = vis.toFixed(4);
        echo.style.visibility = vis > 0.001 ? "visible" : "hidden";
        const pl = Math.max(bi >= 0 ? ML.pulse(t, beats[bi], 0.03, 0.14) : 0, bi + 1 < beats.length ? ML.pulse(t, beats[bi + 1], 0.03, 0.14) : 0);
        el.style.scale = pl > 0.001 && t >= at ? (1 + (p.pulse - 1) * pl).toFixed(4) : "none";
      },
    };
  },
});

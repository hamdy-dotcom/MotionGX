// Ring letters drawn as arcs: the round letters of a word (O by default — any listed in `shape_letters`) are
// replaced by thick accent rings that draw themselves around (an SVG circle stroke, stroke-dashoffset 1 → 0 over
// 0.4 s power2.inOut, each starting at a different angle), while every other letter slides down into place from above
// with a blur (stems may drop all the way from off-frame). Letters stagger 0.08 s. Each ring sits exactly on its
// glyph: its ink box and the font's stem weight are measured with canvas text metrics in the live face, so the
// stroke width matches the letter's own stem and the ring keeps the letter's slot.
// Source: prompt-motion:topi-003-opus5-5-15 (reference only — our own rebuild).
ML.define({
  id: "kinetic.ring-letter-arc-build",
  category: "kinetic",
  name: "Ring letters drawn as arcs",
  does: "The O's of a word are thick accent rings that draw around as arcs while the other letters slide in.",
  says: ["brand", "precision", "playful"],
  energy: 3,
  targets: ["headline", "word"],
  duration: [1, 3],
  params: {
    shape_letters: { type: "text", default: "O" },
    stagger: { type: "number", range: [0.04, 0.15], default: 0.08, unit: "s" },
    draw: { type: "number", range: [0.25, 0.8], default: 0.4, unit: "s" },
    entry: { type: "choice", options: ["slide", "wipe"], default: "slide" },
    stems_drop: { type: "bool", default: true },
    blur: { type: "number", range: [0, 20], default: 10, unit: "px" },
  },
  pairs: ["kinetic.glyph-specimen", "accent.underline-draw"],
  avoid: ["problem"],
  rtl: false,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:topi-003-opus5-5-15", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, f } = ctx;
    if (!el || !(el.textContent || "").trim()) return null;
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    const letters = ML.split(el, "chars").filter((c) => c.textContent.trim());
    if (!letters.length) return null;
    const want = new Set(Array.from(String(p.shape_letters || "O")).filter((c) => c.trim()).flatMap((c) => [c.toLowerCase(), c.toUpperCase()]));
    const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize);
    // canvas metrics in the live face: ink boxes and the stem weight
    const cv = document.createElement("canvas").getContext("2d");
    cv.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const stemM = cv.measureText("l"), stem = Math.max(fs * 0.06, (stemM.actualBoundingBoxRight + stemM.actualBoundingBoxLeft) || fs * 0.12);
    const base = cv.measureText("H"); // baseline-to-cap reference
    const box = ctx.box(el), drop = box.y + box.h + fs * 0.3;
    const NS = "http://www.w3.org/2000/svg";
    const seq = letters.map((L, i) => {
      const ch = L.textContent;
      const it = { L, i, ring: null, stem: /[Iil1|!]/.test(ch) && p.stems_drop };
      if (want.has(ch)) {
        const m = cv.measureText(ch);
        const inkW = m.actualBoundingBoxLeft + m.actualBoundingBoxRight, inkH = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
        // where the ink sits inside the letter's box: the baseline is the box's ascent line
        const lineAscent = base.fontBoundingBoxAscent ?? fs * 0.8, boxH = L.offsetHeight, contentTop = (boxH - ((base.fontBoundingBoxAscent ?? fs * 0.8) + (base.fontBoundingBoxDescent ?? fs * 0.2))) / 2;
        const cx = -m.actualBoundingBoxLeft + inkW / 2, cy = contentTop + lineAscent - m.actualBoundingBoxAscent + inkH / 2;
        const d = Math.min(inkW, inkH), sw = Math.min(stem, d * 0.32), r = (d - sw) / 2;
        const svg = document.createElementNS(NS, "svg");
        Object.assign(svg.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" });
        const c = document.createElementNS(NS, "circle");
        c.setAttribute("cx", cx.toFixed(2)); c.setAttribute("cy", cy.toFixed(2)); c.setAttribute("r", Math.max(1, r).toFixed(2));
        c.setAttribute("pathLength", "1");
        // each ring starts its stroke at its own angle
        c.setAttribute("transform", `rotate(${(-90 + ML.rnd(i, 7) * 360).toFixed(1)} ${cx.toFixed(2)} ${cy.toFixed(2)})`);
        Object.assign(c.style, { fill: "none", stroke: "var(--x-accent)", strokeWidth: sw.toFixed(2), strokeDasharray: "1 1", strokeLinecap: "butt" });
        svg.append(c);
        L.style.position = "relative";
        L.style.color = "transparent"; // the slot stays; the ring is the letter
        L.append(svg);
        it.ring = c;
      }
      return it;
    });
    const t0 = (i) => at + i * p.stagger;
    const p2 = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2); // power2.inOut
    seq.forEach((it) => { if (it.ring) ctx.sfx(t0(it.i), "whoosh.soft", 0.22); });
    ctx.sfx(at, "tap", 0.2);
    const lastT = t0(seq.length - 1) + Math.max(0.45, p.draw);
    if (seq.some((x) => x.ring)) ctx.sfx(lastT, "land.light", 0.3);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        for (const it of seq) {
          const s = t0(it.i);
          if (it.ring) {
            const u = p2(ML.lin(t, s, s + p.draw));
            it.ring.style.strokeDashoffset = (1 - u).toFixed(4);
            it.ring.style.opacity = t < s ? "0" : (1 - leave).toFixed(4);
            continue;
          }
          const dur = it.stem ? 0.42 : 0.36, u = ML.expo(t, s, s + dur);
          const from = it.stem ? drop : fs * 0.55;
          it.L.style.opacity = (Math.min(1, ML.lin(t, s, s + 0.12)) * (1 - leave)).toFixed(4);
          if (p.entry === "wipe") {
            // a wipe from above: the letter is uncovered top-down as it settles a little
            it.L.style.clipPath = u < 1 ? `inset(0 0 ${((1 - u) * 100).toFixed(2)}% 0)` : "none";
            it.L.style.translate = `0 ${(-(1 - u) * fs * 0.15 - leave * fs * 0.1).toFixed(2)}px`;
          } else it.L.style.translate = `0 ${(-(1 - u) * from - leave * fs * 0.1).toFixed(2)}px`;
          const b = (1 - u) * p.blur + leave * 8;
          it.L.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : "none";
        }
      },
    };
  },
});

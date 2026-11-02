// Letter lens: the round letter of a word (its O) is hidden and a ring of the same ink bounds takes its place — a
// conic gradient (accent → accent-2 → the warm "bad" red → accent) over a dark inner disc at 45 % of its radius, like a
// lens or an aperture. It enters with a sweep 0 → 360° in 0.4 s power2.out and a pop 0.9 → 1 (back.out), then the
// gradient keeps turning at `spin` °/s. The ring can instead be filled with a picture (the scene's own, or `src`) or
// carry the brand's logo in its centre. An optional gradient subline fades up 12 px under the word. The glyph's ink
// box is measured from the font (canvas measureText) so the ring sits exactly where the letter was.
// Source: prompt-motion:oliahmed205-just-tried-opus-5-5 (reference) — our own rebuild.
ML.define({
  id: "text-emphasis.letter-lens",
  category: "text-emphasis",
  name: "A round letter becomes a coloured lens",
  does: "The O of a word is replaced by a rotating conic-gradient ring like a lens or aperture, making the letter the product's mark.",
  says: ["brand", "focus", "reveal"],
  energy: 3,
  targets: ["word", "logo"],
  duration: [1, 3],
  params: {
    letter: { type: "text", default: "O" },
    fill: { type: "choice", options: ["conic", "photo", "logo"], default: "conic" },
    spin: { type: "number", range: [0, 180], default: 90, unit: "deg/s" },
    src: { type: "text", default: "" },
    subline: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "text-emphasis.gradient-fill"],
  avoid: ["problem"],
  rtl: false,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:oliahmed205-just-tried-opus-5-5", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, stage } = ctx;
    if (!el) return null;
    ML.split(el, "chars");
    const cs = [...el.querySelectorAll(".ml-c")];
    if (!cs.length) return null;
    const want = String(p.letter || "O").toLowerCase();
    const round = ["o", "0", "q", "ο", "о"];
    const L = cs.find((c) => c.textContent.toLowerCase() === want) || cs.find((c) => round.includes(c.textContent.toLowerCase())) || cs[0];
    const st = getComputedStyle(L);
    const fs = parseFloat(st.fontSize) || 56;
    const u = fs / 72;
    // the glyph's ink box against its baseline
    const cv = document.createElement("canvas").getContext("2d");
    cv.font = `${st.fontStyle} ${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
    const m = cv.measureText(L.textContent);
    const inkL = -m.actualBoundingBoxLeft, inkR = m.actualBoundingBoxRight, asc = m.actualBoundingBoxAscent, desc = m.actualBoundingBoxDescent;
    const lb = ctx.box(L);
    const probe = document.createElement("span");
    Object.assign(probe.style, { display: "inline-block", width: "0", height: "0", verticalAlign: "baseline" });
    L.prepend(probe);
    const baseY = ctx.box(probe).y - lb.y, x0 = ctx.box(probe).x - lb.x;
    probe.remove();
    const D = Math.max(asc + desc, inkR - inkL, fs * 0.3);
    const cx = x0 + (inkL + inkR) / 2, cy = baseY - (asc - desc) / 2;
    // the lens, laid over the letter's slot
    Object.assign(L.style, { position: "relative" });
    const glyph = document.createElement("span");
    glyph.textContent = L.textContent; L.textContent = "";
    glyph.style.display = "inline-block";
    L.append(glyph);
    const lens = document.createElement("span");
    Object.assign(lens.style, { position: "absolute", left: (cx - D / 2).toFixed(2) + "px", top: (cy - D / 2).toFixed(2) + "px", width: D.toFixed(2) + "px", height: D.toFixed(2) + "px", borderRadius: "50%", overflow: "hidden", pointerEvents: "none" });
    const ring = document.createElement("span");
    Object.assign(ring.style, { position: "absolute", inset: "0", borderRadius: "50%" });
    const scenePic = (ctx.scene || stage).querySelector("img");
    const pic = p.src || (scenePic && scenePic.getAttribute("src")) || "";
    if (p.fill === "photo" && pic) Object.assign(ring.style, { inset: "-21%", backgroundImage: `url("${pic.replace(/"/g, "%22")}")`, backgroundSize: "cover", backgroundPosition: "center", borderRadius: "0" });
    const inner = document.createElement("span");
    Object.assign(inner.style, { position: "absolute", left: "27.5%", top: "27.5%", width: "45%", height: "45%", borderRadius: "50%", background: "var(--x-device)", display: "grid", placeItems: "center", overflow: "hidden" });
    if (p.fill === "logo") {
      const logo = (ctx.scene || stage).querySelector('[data-slot="logo"], [data-slot-sample="logo"]');
      if (logo) {
        const mark = logo.querySelector("rect, circle, path") ? logo.cloneNode(true) : null;
        if (mark) {
          mark.removeAttribute("data-slot"); mark.removeAttribute("data-slot-sample");
          // the logo's mark (its first shape) fills the centre
          const shape = mark.querySelector("rect, circle, path");
          const bb = logo.querySelector("rect, circle, path").getBBox();
          mark.setAttribute("viewBox", `${bb.x} ${bb.y} ${bb.width} ${bb.height}`);
          [...mark.children].forEach((ch) => ch !== shape && ch.tagName.toLowerCase() !== "defs" && ch.remove());
          Object.assign(mark.style, { width: "64%", height: "64%" });
          mark.removeAttribute("width"); mark.removeAttribute("height");
          inner.style.background = "var(--x-panel)";
          inner.append(mark);
        }
      }
    }
    lens.append(ring, inner);
    L.append(lens);
    let sub = null;
    if (p.subline) {
      sub = document.createElement("div");
      sub.textContent = p.subline;
      Object.assign(sub.style, { font: `var(--x-sub-weight) ${(fs * 0.36).toFixed(1)}px var(--x-body-font)`, marginTop: (fs * 0.2).toFixed(1) + "px", backgroundImage: "linear-gradient(90deg, var(--x-accent), var(--x-accent-2), var(--x-bad))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", opacity: "0" });
      el.after(sub);
    }
    const tSub = at + 0.55;
    ctx.sfx(at, "swell", 0.3);
    ctx.sfx(at + 0.4, "pop.soft", 0.35);
    return {
      draw(t) {
        const sw = 360 * (1 - Math.pow(1 - ML.lin(t, at, at + 0.4), 2)); // power2.out
        const pop = t < at ? 0.9 : 0.9 + 0.1 * ML.back(t, at + 0.05, at + 0.45, 1.7);
        const on = t >= at;
        glyph.style.opacity = on ? (1 - ML.lin(t, at, at + 0.1)).toFixed(4) : "1";
        lens.style.opacity = on ? "1" : "0";
        lens.style.scale = pop.toFixed(4);
        const turn = p.spin * Math.max(0, t - at - 0.4);
        if (p.fill === "photo" && pic) ring.style.rotate = `${turn.toFixed(2)}deg`;
        else ring.style.background = `conic-gradient(from ${(turn - 90).toFixed(2)}deg, var(--x-accent), var(--x-accent-2), var(--x-bad), var(--x-accent))`;
        const mask = sw >= 359.9 ? "none" : `conic-gradient(from -90deg, #000 ${sw.toFixed(2)}deg, transparent ${sw.toFixed(2)}deg)`;
        lens.style.webkitMaskImage = mask; lens.style.maskImage = mask;
        inner.style.scale = (0.6 + 0.4 * ML.out(t, at + 0.1, at + 0.45)).toFixed(4);
        if (sub) {
          const s = ML.out(t, tSub, tSub + 0.4);
          sub.style.opacity = s.toFixed(4);
          sub.style.translate = `0 ${((1 - s) * 12 * u).toFixed(2)}px`;
        }
      },
    };
  },
});

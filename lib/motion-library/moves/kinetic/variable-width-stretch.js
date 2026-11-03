// Variable-axis stretch: the landed word is tuned through its font's axes — width (wdth from → to), weight, or a slant —
// over a short expo.inOut, smeared by a horizontal-only blur (an SVG feGaussianBlur "x 0") while it changes, held, then
// tuned back. When the look's face has no such axis (measured once in setup: does font-stretch change the width?), the
// width is drawn instead as a centred scaleX (never past what fits the frame). Weight tunes wght where the face has it
// and steps through the loaded weights with a matching stroke where it does not; slant is always a skew (an slnt axis
// on top would lean it twice). The word stays centred on its own middle throughout. Arabic words are kept whole.
// Source: prompt-motion web3wesley-this-took-opus-5-5 (reference only — our own rebuild).
ML.define({
  id: "kinetic.variable-width-stretch",
  category: "kinetic",
  name: "Variable-axis stretch",
  does: "The landed word widens and narrows through its font's width axis, briefly blurred, as if being tuned.",
  says: ["playful", "precision", "change"],
  energy: 3,
  targets: ["word"],
  duration: [0.8, 3],
  params: {
    axis: { type: "choice", options: ["width", "weight", "slant"], default: "width" },
    from: { type: "number", range: [25, 100], default: 75 },
    to: { type: "number", range: [100, 150], default: 125 },
    duration: { type: "number", range: [0.2, 0.8], default: 0.4, unit: "s" },
  },
  pairs: ["text-in.punchline", "kinetic.fit-width-type"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:web3wesley-this-took-opus-5-5", license: "reference", note: "our own code; variable-axis tween with horizontal blur" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el || el === ctx.stage) return null;
    const doc = el.ownerDocument, NS = "http://www.w3.org/2000/svg";
    const W = ctx.f.W, host = ctx.scene || ctx.stage;
    // a horizontal-only blur
    const id = "ml-vws-" + Math.round(ML.rnd(at * 13.7 + el.textContent.length, 3) * 1e9);
    const svg = doc.createElementNS(NS, "svg");
    svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.style.position = "absolute";
    svg.innerHTML = `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0 0"/></filter>`;
    host.append(svg);
    const blurNode = svg.querySelector("feGaussianBlur");
    // the word is tuned inside its own span, so the slot's box never moves
    const word = doc.createElement("span");
    Object.assign(word.style, { display: "inline-block", transformOrigin: "50% 50%" });
    while (el.firstChild) word.append(el.firstChild);
    el.append(word);
    // does the face really have the axis? (font-stretch 75% vs 125% changes the width only if it does)
    const textW = () => word.getBoundingClientRect().width / ((ctx.stage.getBoundingClientRect().width / (ctx.stage.offsetWidth || 1)) || 1);
    const base = textW();
    word.style.fontStretch = "75%"; const narrow = textW();
    word.style.fontStretch = "125%"; const wide = textW();
    word.style.fontStretch = "";
    const realWidth = Math.abs(wide - narrow) > base * 0.02;
    // never wider than the frame allows (scaleX keeps it centred on its middle)
    const room = (W - ctx.f.m * 2) / Math.max(1, base);
    if (realWidth && p.axis === "width") { // a real axis grows the type itself: shrink once so its widest setting fits
      word.style.fontStretch = p.to + "%";
      const widest = textW();
      word.style.fontStretch = "";
      if (widest > W - ctx.f.m * 2) word.style.fontSize = ((parseFloat(getComputedStyle(word).fontSize) * (W - ctx.f.m * 2)) / widest).toFixed(2) + "px";
    }
    const lo = p.from, hi = p.to, d = p.duration;
    const a1 = at, a2 = at + d, b1 = Math.max(a2 + 0.25, end - 0.35 - d), b2 = b1 + d;
    const expoInOut = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2);
    ctx.sfx(a1, "whoosh.soft", 0.2);
    if (b2 < end) ctx.sfx(b1, "whoosh.soft", 0.12);
    return {
      draw(t) {
        const go = expoInOut(ML.lin(t, a1, a2)), back = expoInOut(ML.lin(t, b1, b2));
        const v = lo + (hi - lo) * go - (hi - lo) * back; // axis value
        // blur only while changing: strongest mid-tween
        const moving = Math.sin(Math.PI * ML.lin(t, a1, a2)) + Math.sin(Math.PI * ML.lin(t, b1, b2));
        const bx = moving * 9;
        blurNode.setAttribute("stdDeviation", `${bx.toFixed(2)} 0`);
        word.style.filter = bx > 0.05 ? `url(#${id})` : "none";
        let sx = 1, skew = 0, stroke = 0;
        if (p.axis === "width") {
          if (realWidth) { word.style.fontStretch = v.toFixed(2) + "%"; word.style.fontVariationSettings = `"wdth" ${v.toFixed(2)}`; }
          else sx = Math.min(room, v / 100);
        } else if (p.axis === "weight") {
          const wght = 400 + (v - 75) * 6; // 75 → 400 … 150 → 850
          word.style.fontVariationSettings = `"wght" ${Math.max(100, Math.min(900, wght)).toFixed(0)}`;
          word.style.fontWeight = String(Math.max(100, Math.min(900, Math.round(wght / 100) * 100)));
          stroke = Math.max(0, (v - 100) / 50) * 0.025; // smooths the steps between loaded weights
        } else {
          skew = (v - 100) * -0.24; // 75 → +6°, 125 → −6°
        }
        word.style.transform = sx !== 1 || skew ? `scaleX(${sx.toFixed(4)}) skewX(${skew.toFixed(3)}deg)` : "none";
        word.style.webkitTextStroke = stroke > 0.001 ? `${stroke.toFixed(4)}em currentColor` : "";
        const leave = ML.ease(t, end - 0.25, end);
        el.style.opacity = (1 - leave).toFixed(4);
      },
    };
  },
});

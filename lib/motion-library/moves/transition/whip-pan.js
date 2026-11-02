// Whip pan: the camera whips — the scene smears sideways with a directional motion blur and the next one whips in from
// the other side. Out: x 0 -> -dir * distance * W (0.55 W in the live engine), a directional blur 0 -> `blur` px (SVG
// feGaussianBlur stdDeviation "n 0"), scaleX 1 -> 1.06, autoAlpha -> 0, power3.in over the last 0.25 s before the
// scene's end. In: from +dir * distance * W, blur -> 0, power3.out over 0.35 s from the scene's start (two scenes that
// both carry it meet in one whip). dir follows the reading direction (-1 in RTL); up / down whip vertically.
// exit-only: just the out. text-states: the target line whips out at `at` and the next text (`next`, data-next, or
// the line after it) whips in on the same spot. Pictures are never blurred (the library's sharp rule): they travel
// with the scene, the smear is on the type, panels and shapes.
// Source: MotionGX lib/live-engine/worker/vendor/recipes.js R.scene "whip" (own); prompt-motion ajith-io-wtf-made-with-
// claude, polydao-claude-opus-5-5-is, adamdesgns-wtf-made-with-single (reference only).
ML.define({
  id: "transition.whip-pan",
  category: "transition",
  name: "Whip pan",
  does: "The whole scene smears sideways with heavy motion blur into the next shot, which whips in from the other side.",
  says: ["speed", "energy", "transition"],
  energy: 4,
  targets: ["scene", "headline", "stage"],
  duration: [0.3, 0.6],
  params: {
    direction: { type: "choice", options: ["reading", "left", "right", "up", "down"], default: "reading" },
    blur: { type: "number", range: [12, 30], default: 18, unit: "px" },
    distance: { type: "number", range: [0.4, 1.2], default: 0.55 },
    mode: { type: "choice", options: ["push", "exit-only"], default: "push" },
    between: { type: "choice", options: ["scenes", "text-states"], default: "scenes" },
    next: { type: "text", default: "" },
  },
  pairs: ["transition.zoom-through", "camera.impact-shake"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "own:lib/live-engine/worker/vendor/recipes.js", license: "own", note: "R.scene whip; prompt-motion ajith-io-wtf-made-with-claude, polydao-claude-opus-5-5-is, adamdesgns-wtf-made-with-single as reference" },
  setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const vertical = p.direction === "up" || p.direction === "down";
    // dir: the way content leaves (−dir), the way the next arrives (+dir)
    const dir = p.direction === "left" || p.direction === "up" ? 1 : p.direction === "right" || p.direction === "down" ? -1 : ctx.rtl ? -1 : 1;
    const span = (vertical ? f.H : f.W) * ML.clamp(p.distance, 0.4, 1.2), B = ML.clamp(p.blur, 12, 30);
    const p3in = (x) => x * x * x, p3out = (x) => 1 - Math.pow(1 - x, 3);
    // one directional blur filter per instance (stdDeviation along the travel only)
    const id = "ml-whip-" + Math.floor(ML.rnd(at * 97 + span, 3) * 1e9).toString(36);
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.style.position = "absolute";
    const flt = document.createElementNS(NS, "filter");
    flt.setAttribute("id", id); flt.setAttribute("x", "-50%"); flt.setAttribute("y", "-50%"); flt.setAttribute("width", "200%"); flt.setAttribute("height", "200%");
    flt.setAttribute("color-interpolation-filters", "sRGB");
    const gb = document.createElementNS(NS, "feGaussianBlur");
    gb.setAttribute("stdDeviation", "0 0");
    flt.append(gb); svg.append(flt); stage.append(svg);
    const setBlur = (els, b) => {
      gb.setAttribute("stdDeviation", vertical ? `0 ${(b / 2).toFixed(2)}` : `${(b / 2).toFixed(2)} 0`);
      els.forEach((e) => { e.style.filter = b > 0.3 ? `url(#${id})` : ""; });
    };
    const move = (el, d, s) => {
      el.style.translate = Math.abs(d) < 0.01 ? "" : vertical ? `0 ${d.toFixed(2)}px` : `${d.toFixed(2)}px 0`;
      el.style.scale = s === 1 ? "" : vertical ? `1 ${s.toFixed(4)}` : `${s.toFixed(4)} 1`;
    };

    const own = ctx.el && ctx.el !== stage && ctx.el !== scene ? ctx.el : null;
    if (p.between === "text-states" && own) {
      // two text states on one anchor: the line whips out, the next whips in from the other side
      const sib = own.nextElementSibling;
      const text = p.next || own.dataset.next || (sib ? sib.textContent.trim() : own.textContent.trim());
      const inc = own.cloneNode(false);
      inc.removeAttribute("data-slot"); inc.removeAttribute("id");
      inc.textContent = text;
      Object.assign(inc.style, { position: "absolute", left: own.offsetLeft + "px", top: own.offsetTop + "px", width: own.offsetWidth + "px", margin: "0", pointerEvents: "none" });
      (own.offsetParent || own.parentElement).append(inc);
      const span2 = Math.min(span, (vertical ? f.H : f.W) * 0.4), oA = at, oB = at + 0.12, iA = oB, iB = iA + 0.18; // ajith-io: 0.12 s out, 0.18 s in
      ctx.sfx(oA, "whoosh.soft", 0.35);
      return {
        draw(t) {
          const o = p3in(ML.lin(t, oA, oB)), i = p3out(ML.lin(t, iA, iB));
          move(own, -dir * span2 * o, 1 + 0.06 * o);
          own.style.opacity = t >= oB ? "0" : "";
          inc.style.opacity = t < iA ? "0" : "";
          move(inc, dir * span2 * (1 - i), 1 + 0.06 * (1 - i));
          // one filter, one moving thing at a time
          const live = t < iA ? [own] : [inc], b = t < iA ? B * o : B * (1 - i);
          setBlur(t < iA ? [inc] : [own], 0); setBlur(live, b);
        },
      };
    }

    // scenes: smear the type, panels and shapes; pictures travel sharp
    const PIC = /^(IMG|VIDEO|CANVAS|PICTURE)$/i;
    const hasPic = (e) => PIC.test(e.tagName) || !!e.querySelector("img,video,canvas,picture");
    const soft = [];
    const walk = (n) => { for (const c of n.children) { if (c === svg || PIC.test(c.tagName)) continue; if (!hasPic(c)) soft.push(c); else walk(c); } };
    walk(scene);
    const exitOnly = p.mode === "exit-only";
    const inA = ctx.from, inB = inA + 0.35, outB = Math.max(end, at + 0.4), outA = outB - 0.25;
    if (!exitOnly && inA > 0.01) ctx.sfx(inA, "whoosh.soft", 0.3);
    ctx.sfx(outA, "whoosh.soft", 0.35);
    return {
      draw(t) {
        let d = 0, b = 0, s = 1, o = 1;
        if (!exitOnly && t < inB) { const i = p3out(ML.lin(t, inA, inB)); d = dir * span * (1 - i); b = B * (1 - i); }
        if (t > outA) { const x = p3in(ML.lin(t, outA, outB)); d = -dir * span * x; b = B * x; s = 1 + 0.06 * x; o = 1 - x; }
        move(scene, d, s);
        scene.style.opacity = o < 1 ? o.toFixed(4) : "";
        setBlur(soft, b);
      },
    };
  },
});
